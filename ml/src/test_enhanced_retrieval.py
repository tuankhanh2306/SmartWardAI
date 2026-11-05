#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test Enhanced Retrieval & Intent Classifier on stress_dev.json
"""

import sys
import os
import json
import re
import unicodedata
import numpy as np
from collections import defaultdict
import onnxruntime as ort
from transformers import AutoTokenizer
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

sys.stdout.reconfigure(encoding='utf-8')

CLASSES = [
    'PROCEDURE_INQUIRY',
    'OUT_OF_SCOPE',
    'AMBIGUOUS',
    'GREETING',
    'COMMUNE_INFO',
    'PROCEDURE_CATALOG'
]

def remove_accents(input_str: str) -> str:
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    res = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    return res.replace('đ', 'd').replace('Đ', 'D')

def is_unaccented(text: str) -> bool:
    accented_chars = set('àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ')
    return not any(c in accented_chars for c in text.lower())

DIALECT_MAP = [
    (r'\b(con|vợ|chồng|ba|má|anh|chị|em)\s+tui\b', r'\1 tôi'),
    (r'\btui\b', 'tôi'),
    (r'\b(mới|đi|đang)\s+sanh\b', r'\1 sinh'),
    (r'\bkhai\s+sanh\b', 'khai sinh'),
    (r'\bgiấy\s+sanh\b', 'giấy khai sinh'),
    (r'\bsanh\s+con\b', 'sinh con'),
    (r'\bhổng\b', 'không'),
    (r'\bhong\b', 'không'),
    (r'\bmần\b', 'làm'),
    (r'\bbận\b', 'lần'),
    (r'\b(hén|nghen|nhen|nè|nghe bạn|nhe bạn)\b', ''),
]

ABBREV_MAP = [
    (r'\b(đk|dk)\b', 'đăng ký'),
    (r'\btthc\b', 'thủ tục hành chính'),
    (r'\bcccd\b', 'căn cước công dân'),
    (r'\bcmnd\b', 'chứng minh nhân dân'),
    (r'\bgks\b', 'giấy khai sinh'),
    (r'\bubnd\b', 'ủy ban nhân dân'),
    (r'\bbhxh\b', 'bảo hiểm xã hội'),
    (r'\bbhyt\b', 'bảo hiểm y tế'),
    (r'\bgxn\b', 'giấy xác nhận'),
    (r'\b(ko|kô|k)\b', 'không'),
    (r'\b(đc|dc)\b', 'được'),
    (r'\bsao\s+y\b', 'chứng thực sao y bản chính'),
    (r'\bhộ\s*khẩu\b', 'hộ khẩu'),
    (r'\bhk\b', 'hộ khẩu'),
    (r'\bks\b', 'khai sinh'),
    (r'\bkt\b', 'khai tử'),
    (r'\bxn\b', 'xác nhận'),
    (r'\btt\b', 'thông tin'),
]

GREETING_PATTERNS = [
    r'^(xin chào|chào bạn|chào cán bộ|chào|hello|hi|alo|dạ chào|dạ kính chào|dạ|kính chào|bạn ơi|anh ơi|chị ơi)[,\.\s]+(.*)$',
    r'^(cho mình hỏi|cho em hỏi|cho tôi hỏi|bác cho hỏi|anh cho hỏi|chị cho hỏi|hỏi|xin hỏi)[,\.\s]+(.*)$'
]

PROCEDURE_ALIASES = {
    "TTHC-HT-01": "khai sinh đăng ký khai sinh làm giấy khai sinh cho con mới sinh quá hạn trễ hạn",
    "TTHC-HT-02": "kết hôn đăng ký kết hôn làm giấy hôn thú lấy vợ lấy chồng",
    "TTHC-HT-03": "khai tử đăng ký khai tử giấy chứng tử người mất qua đời",
    "TTHC-HT-04": "xác nhận tình trạng hôn nhân giấy chứng nhận độc thân",
    "TTHC-HT-05": "cấp bản sao trích lục hộ tịch xin trích lục khai sinh kết hôn",
    "TTHC-HT-06": "nhận cha mẹ con nhận con ngoài giá thú",
    "TTHC-HT-07": "nuôi con nuôi đăng ký nhận nuôi con",
    "TTHC-HT-08": "giám hộ đăng ký giám hộ cử người giám hộ",
    "TTHC-HT-09": "chấm dứt giám hộ",
    "TTHC-HT-10": "thay đổi cải chính hộ tịch sửa thông tin khai sinh",
    "TTHC-HT-11": "xác nhận tình trạng hôn nhân giấy độc thân xin giấy độc thân làm hồ sơ",
    "TTHC-HT-12": "đăng ký khai sinh kết hợp nhận cha mẹ con",
    "TTHC-CT-01": "chứng thực bản sao công chứng bản sao từ bản chính sao y",
    "TTHC-CT-02": "chứng thực chữ ký công chứng chữ ký giấy ủy quyền",
    "TTHC-CT-03": "chứng thực hợp đồng giao dịch mua bán chuyển nhượng tặng cho",
    "TTHC-CT-04": "chứng thực di chúc lập di chúc tại xã",
    "TTHC-CT-05": "chứng thực văn bản thỏa thuận phân chia di sản thừa kế",
    "TTHC-CT-06": "chứng thực di bản từ chối nhận di sản thừa kế",
    "TTHC-DC-01": "đăng ký biến động quyền sử dụng đất thừa kế đất đai cho tặng thừa kế quyền sử dụng đất ba mất di chúc",
    "TTHC-DC-02": "chuyển nhượng đất nông nghiệp sang tên đất nông nghiệp",
    "TTHC-DC-03": "tách thửa đất hợp thửa đất chia tách sổ đỏ cho con anh em",
    "TTHC-DC-04": "cấp sổ đỏ lần đầu cấp giấy chứng nhận quyền sử dụng đất lần đầu",
    "TTHC-DC-05": "đăng ký biện pháp bảo đảm bằng quyền sử dụng đất thế chấp",
    "TTHC-DC-06": "hòa giải tranh chấp đất đai tại xã",
    "TTHC-DC-07": "chuyển đổi mục đích sử dụng đất sang đất ở thổ cư",
    "TTHC-DC-08": "gia hạn thời hạn sử dụng đất nông nghiệp",
    "TTHC-CR-01": "đăng ký thường trú chuyển khẩu nhập khẩu chuyển nhà sang xã khác",
    "TTHC-CR-02": "đăng ký tạm trú tạm vắng",
    "TTHC-CR-03": "tách hộ gia đình tách khẩu",
    "TTHC-CR-04": "xóa đăng ký thường trú",
    "TTHC-CR-05": "điều chỉnh thông tin về cư trú trong cơ sở dữ liệu về cư trú",
    "TTHC-CR-06": "xác nhận thông tin về cư trú",
    "TTHC-CR-07": "gia hạn tạm trú",
    "TTHC-CR-08": "xóa đăng ký tạm trú",
    "TTHC-CR-09": "cấp giấy xác nhận tình trạng cư trú",
    "TTHC-XD-01": "giấy phép xây dựng nhà ở riêng lẻ nông thôn đô thị",
    "TTHC-XD-02": "sửa chữa cải tạo nhà ở riêng lẻ",
    "TTHC-XD-03": "cung cấp thông tin quy hoạch xây dựng",
    "TTHC-BT-01": "trợ cấp xã hội hàng tháng bảo trợ xã hội người nghèo trẻ mồ côi người cao tuổi gia đình nghèo",
    "TTHC-BT-02": "trợ cấp xã hội cho người khuyết tật nặng",
    "TTHC-BT-03": "hỗ trợ mai táng phí cho đối tượng bảo trợ xã hội",
    "TTHC-BT-04": "xác định mức độ khuyết tật và cấp giấy chứng nhận khuyết tật",
    "TTHC-BT-05": "chế độ mai táng phí cho người có công cách mạng liệt sĩ",
    "TTHC-BT-06": "trợ cấp một lần cho thanh niên xung phong người hoạt động kháng chiến",
    "TTHC-BT-07": "ưu đãi giáo dục đào tạo cho con thương binh bệnh binh",
    "TTHC-BT-08": "hỗ trợ tiền điện cho hộ nghèo hộ chính sách",
    "TTHC-NC-01": "tiếp công dân lịch tiếp dân của chủ tịch xã",
    "TTHC-NC-02": "khiếu nại quyết định hành chính hành vi hành chính",
    "TTHC-NC-03": "tố cáo hành vi vi phạm pháp luật của cán bộ xã",
    "TTHC-NC-04": "phản ánh kiến nghị về quy định hành chính thủ tục hành chính",
    "TTHC-VP-01": "cung cấp thông tin theo yêu cầu của công dân tại xã",
    "TTHC-VP-02": "đăng ký hẹn giờ giải quyết thủ tục hành chính tại một cửa"
}

GREETING_WORDS = {'chào', 'chao', 'hello', 'hi', 'alo', 'kính chào', 'kinh chao', 'bạn ơi', 'ban oi', 'ad ơi', 'ad oi'}

def contains_greeting(text: str) -> bool:
    t = text.lower()
    return any(re.search(r'\b' + re.escape(w) + r'\b', t) for w in GREETING_WORDS)

def normalize_text(text: str) -> dict:
    t = unicodedata.normalize('NFC', text.strip().lower())
    for pat, repl in DIALECT_MAP:
        t = re.sub(pat, repl, t, flags=re.IGNORECASE)
    for pat, repl in ABBREV_MAP:
        t = re.sub(pat, repl, t, flags=re.IGNORECASE)
    t = re.sub(r'\s+', ' ', t).strip()
    
    substantive = t
    has_greeting = False
    for pat in GREETING_PATTERNS:
        m = re.match(pat, substantive, flags=re.IGNORECASE)
        if m:
            has_greeting = True
            rem = m.group(2).strip()
            if len(rem.split()) >= 2:
                substantive = rem
                
    # Normalize unaccented specific procedure terms if very short
    if len(t.split()) <= 2:
        if t in ['ket hon']:
            substantive = 'đăng ký kết hôn'
        elif t in ['khai sinh']:
            substantive = 'đăng ký khai sinh'
        elif t in ['khai tu']:
            substantive = 'đăng ký khai tử'
            
    return {
        "raw": text,
        "normalized": t,
        "substantive": substantive,
        "has_greeting": contains_greeting(text),
        "is_unaccented": is_unaccented(text)
    }

def run_onnx_inference(sess, tokenizer, texts, batch_size=32):
    all_embs = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        enc = tokenizer(batch, padding=True, truncation=True, max_length=256, return_tensors="np")
        feed = {
            'input_ids': enc['input_ids'].astype(np.int64),
            'attention_mask': enc['attention_mask'].astype(np.int64)
        }
        out = sess.run(None, feed)[0]
        norms = np.linalg.norm(out, axis=1, keepdims=True)
        norms = np.clip(norms, 1e-9, None)
        all_embs.append(out / norms)
    return np.vstack(all_embs)

def main():
    print("Initializing ONNX runtime and models...")
    sess = ort.InferenceSession("ml/models/bkai_finetuned.onnx", providers=['CPUExecutionProvider'])
    tokenizer = AutoTokenizer.from_pretrained("ml/models/fine_tuned_biencoder")
    
    with open('ml/data/train.json', 'r', encoding='utf-8') as f:
        train_data = json.load(f)
    with open('ml/data/legal_inventory.json', 'r', encoding='utf-8') as f:
        inv = json.load(f)
    with open('ml/data/stress_dev.json', 'r', encoding='utf-8') as f:
        stress_dev = json.load(f)
        
    # Prepare Chunks
    chunks = []
    for p in inv:
        aliases = PROCEDURE_ALIASES.get(p['code'], '')
        for c in p['chunks']:
            content = c.get('content', '').replace('\n', ' ')
            text_acc = f"Thủ tục: {p['name']}. Tên thường gọi: {aliases}. Lĩnh vực: {p.get('category', '')}. Mục: {c.get('title', '')}. Nội dung: {content}".strip()
            text_unacc = remove_accents(text_acc)
            chunks.append({
                "chunk_id": c['chunkId'],
                "procedure_code": p['code'],
                "text_acc": text_acc,
                "text_unacc": text_unacc
            })
            
    print(f"Embedding {len(chunks)} chunks in accented & unaccented representations...")
    chunk_embs_acc = run_onnx_inference(sess, tokenizer, [c['text_acc'] for c in chunks])
    chunk_embs_unacc = run_onnx_inference(sess, tokenizer, [c['text_unacc'] for c in chunks])
    
    # TF-IDF for Lexical Matching
    all_chunk_docs = [f"{c['text_acc']} {c['text_unacc']}" for c in chunks]
    tfidf = TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)
    tfidf_chunks = tfidf.fit_transform(all_chunk_docs)
    
    # Train Classifier with Data Augmentation (Train set + Train unaccented)
    train_texts = []
    train_labels = []
    for s in train_data:
        train_texts.append(s['text'])
        train_labels.append(s['intent'])
        # Add unaccented variant
        unacc_t = remove_accents(s['text'])
        if unacc_t != s['text']:
            train_texts.append(unacc_t)
            train_labels.append(s['intent'])
            
    print(f"Training Logistic Regression on augmented train set: {len(train_texts)} samples...")
    train_embs = run_onnx_inference(sess, tokenizer, train_texts)
    clf = LogisticRegression(C=1.0, max_iter=1000, class_weight='balanced', random_state=42)
    clf.fit(train_embs, train_labels)
    
    # Evaluate on stress_dev
    print("\nEvaluating on stress_dev (58 samples)...")
    dev_norm_info = [normalize_text(s['text']) for s in stress_dev]
    
    # For Intent Classification:
    # Use substantive text for embedding
    dev_substantive_texts = [info['substantive'] for info in dev_norm_info]
    dev_embs = run_onnx_inference(sess, tokenizer, dev_substantive_texts)
    y_true = [s['intent'] for s in stress_dev]
    raw_y_pred = clf.predict(dev_embs)
    y_prob = clf.predict_proba(dev_embs)
    classes_list = list(clf.classes_)
    greeting_idx = classes_list.index('GREETING') if 'GREETING' in classes_list else -1
    
    refined_y_pred = []
    for i in range(len(stress_dev)):
        pred = raw_y_pred[i]
        # If classifier predicted GREETING, but raw query does not contain any greeting word
        if pred == 'GREETING' and not dev_norm_info[i]['has_greeting']:
            probs = y_prob[i].copy()
            if greeting_idx >= 0:
                probs[greeting_idx] = -1.0
            pred = classes_list[np.argmax(probs)]
        refined_y_pred.append(pred)
    y_pred = np.array(refined_y_pred)
    
    acc = accuracy_score(y_true, y_pred)
    p_mac, r_mac, f1_mac, _ = precision_recall_fscore_support(y_true, y_pred, average='macro', zero_division=0)
    print(f"Enhanced Intent Accuracy: {acc*100:.2f}% (Baseline was 74.14%)")
    print(f"Enhanced Intent Macro F1: {f1_mac*100:.2f}% (Baseline was 70.93%)")
    print("\nINTENT MISCLASSIFICATIONS:")
    for i, s in enumerate(stress_dev):
        if y_true[i] != y_pred[i]:
            print(f"[{s['id']}] True: {y_true[i]:<18} | Pred: {y_pred[i]:<18} | Substantive: '{dev_substantive_texts[i]}' | Tags: {s.get('style_tags')}")
    print()
    
    # Retrieval Evaluation
    # For each query, compute hybrid score:
    # Dense: if unaccented, max(sim_acc, sim_unacc), else sim_acc
    # Lexical: tfidf similarity
    tfidf_queries = tfidf.transform([info['normalized'] for info in dev_norm_info])
    lex_sim = (tfidf_queries * tfidf_chunks.T).toarray() # shape (N_queries, N_chunks)
    
    pr1_list, pr3_list, pmrr_list = [], [], []
    cr1_list, cr3_list, cmrr_list = [], [], []
    
    for i, s in enumerate(stress_dev):
        g_proc = s.get('procedure_code')
        g_chunks = set(s.get('gold_chunk_ids', []))
        
        info = dev_norm_info[i]
        q_emb = dev_embs[i]
        
        sim_acc = np.dot(chunk_embs_acc, q_emb)
        sim_unacc = np.dot(chunk_embs_unacc, q_emb)
        
        if info['is_unaccented']:
            dense_sim = np.maximum(sim_acc, sim_unacc)
        else:
            dense_sim = sim_acc
            
        # Combine dense and lexical scores:
        # Normalize scores to [0, 1]
        dense_norm = (dense_sim - np.min(dense_sim)) / (np.max(dense_sim) - np.min(dense_sim) + 1e-9)
        lex_norm = lex_sim[i] / (np.max(lex_sim[i]) + 1e-9) if np.max(lex_sim[i]) > 0 else np.zeros_like(lex_sim[i])
        
        # Hybrid alpha: 0.70 dense + 0.30 lexical
        hybrid_scores = 0.70 * dense_norm + 0.30 * lex_norm
        
        top_idx = np.argsort(-hybrid_scores)
        seen_procs = []
        for idx in top_idx:
            p_code = chunks[idx]['procedure_code']
            if p_code not in seen_procs:
                seen_procs.append(p_code)
            if len(seen_procs) >= 5:
                break
                
        top_chunks = [chunks[idx]['chunk_id'] for idx in top_idx[:5]]
        
        if g_proc and g_proc not in ['UNMAPPED', 'N/A']:
            r1 = 1.0 if seen_procs and seen_procs[0] == g_proc else 0.0
            r3 = 1.0 if any(p == g_proc for p in seen_procs[:3]) else 0.0
            rank = (seen_procs.index(g_proc) + 1) if g_proc in seen_procs else None
            mrr = (1.0 / rank) if rank else 0.0
            pr1_list.append(r1)
            pr3_list.append(r3)
            pmrr_list.append(mrr)
            
        if g_chunks:
            r1_c = 1.0 if top_chunks and top_chunks[0] in g_chunks else 0.0
            r3_c = 1.0 if any(c in g_chunks for c in top_chunks[:3]) else 0.0
            rank_c = None
            for r_idx, c in enumerate(top_chunks):
                if c in g_chunks:
                    rank_c = r_idx + 1
                    break
            mrr_c = (1.0 / rank_c) if rank_c else 0.0
            cr1_list.append(r1_c)
            cr3_list.append(r3_c)
            cmrr_list.append(mrr_c)
            
    print(f"\nEnhanced Procedure Retrieval Metrics (N={len(pr1_list)}):")
    print(f"  Recall@1: {np.mean(pr1_list)*100:.2f}% (Baseline was 50.00%)")
    print(f"  Recall@3: {np.mean(pr3_list)*100:.2f}% (Baseline was 70.00%)")
    print(f"  MRR:      {np.mean(pmrr_list):.4f} (Baseline was 0.6133)")
    print(f"Enhanced Chunk Retrieval Metrics (N={len(cr1_list)}):")
    print(f"  Recall@1: {np.mean(cr1_list)*100:.2f}% (Baseline was 30.00%)")
    print(f"  Recall@3: {np.mean(cr3_list)*100:.2f}% (Baseline was 40.00%)")
    print(f"  MRR:      {np.mean(cmrr_list):.4f} (Baseline was 0.3725)")

if __name__ == '__main__':
    main()
