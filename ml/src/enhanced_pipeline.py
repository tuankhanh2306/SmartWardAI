#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Enhanced ML Pipeline
====================================
Generalized NLP Normalization, Robust Intent Classification, and
Dual-Diacritic Hybrid Dense-Lexical Retrieval for Vietnamese Public Administration.

Modules:
1. VietnameseTextNormalizer: Dialect harmonization, administrative acronym expansion,
   conversational greeting decoupling, and unaccented query handling.
2. ProceduralKnowledgeIndex: 40 Commune Procedures & 179 Legal Chunks with administrative
   aliases, dual-form diacritic indexing (Accented + Unaccented), and TF-IDF sparse matrix.
3. EnhancedIntentClassifier: Logistic Regression trained on train.json + unaccented augmentation,
   with conversational greeting guardrail.
4. HybridRetriever: Dense ONNX Bi-Encoder (L2-normalized) + Lexical TF-IDF fusion.
5. EnhancedPipeline: Unified evaluation interface supporting FP32 and INT8 models.
"""

import sys
import os
import json
import re
import time
import unicodedata
import numpy as np
from collections import defaultdict, Counter
import onnxruntime as ort
from transformers import AutoTokenizer
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

sys.stdout.reconfigure(encoding='utf-8')

CLASSES = [
    'PROCEDURE_INQUIRY',
    'OUT_OF_SCOPE',
    'AMBIGUOUS',
    'GREETING',
    'COMMUNE_INFO',
    'PROCEDURE_CATALOG'
]

# ------------------------------------------------------------------------------
# 1. TEXT NORMALIZATION & DIALECT / ABBREVIATION DICTIONARIES
# ------------------------------------------------------------------------------

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

GREETING_WORDS = {'chào', 'chao', 'hello', 'hi', 'alo', 'kính chào', 'kinh chao', 'bạn ơi', 'ban oi', 'ad ơi', 'ad oi'}

def remove_accents(input_str: str) -> str:
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    res = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    return res.replace('đ', 'd').replace('Đ', 'D')

def is_unaccented(text: str) -> bool:
    accented_chars = set('àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ')
    return not any(c in accented_chars for c in text.lower())

def contains_greeting(text: str) -> bool:
    t = text.lower()
    return any(re.search(r'\b' + re.escape(w) + r'\b', t) for w in GREETING_WORDS)

class VietnameseTextNormalizer:
    @staticmethod
    def normalize(text: str) -> dict:
        t = unicodedata.normalize('NFC', text.strip().lower())
        
        # 1. Dialect harmonization
        for pat, repl in DIALECT_MAP:
            t = re.sub(pat, repl, t, flags=re.IGNORECASE)
            
        # 2. Administrative abbreviation expansion
        for pat, repl in ABBREV_MAP:
            t = re.sub(pat, repl, t, flags=re.IGNORECASE)
            
        t = re.sub(r'\s+', ' ', t).strip()
        
        # 3. Greeting decoupling
        substantive = t
        has_greeting = False
        for pat in GREETING_PATTERNS:
            m = re.match(pat, substantive, flags=re.IGNORECASE)
            if m:
                has_greeting = True
                rem = m.group(2).strip()
                if len(rem.split()) >= 2:
                    substantive = rem
                    
        # 4. Keyword canonicalization for very short (cộc lốc) queries
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

# ------------------------------------------------------------------------------
# 2. PROCEDURAL ALIASES & KNOWLEDGE BASE
# ------------------------------------------------------------------------------

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

# ------------------------------------------------------------------------------
# 3. ENHANCED PIPELINE CLASS
# ------------------------------------------------------------------------------

class EnhancedPipeline:
    def __init__(self, model_path="ml/models/bkai_finetuned.onnx", tokenizer_path="ml/models/fine_tuned_biencoder"):
        print(f"Loading ONNX Model from: {model_path}")
        self.sess = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
        print(f"Loading Tokenizer from: {tokenizer_path}")
        self.tokenizer = AutoTokenizer.from_pretrained(tokenizer_path)
        
        self.normalizer = VietnameseTextNormalizer()
        self.chunks = []
        self.chunk_embs_acc = None
        self.chunk_embs_unacc = None
        self.tfidf = None
        self.tfidf_chunks = None
        self.clf = None
        self.classes_list = None
        self.greeting_idx = -1
        
    def fit(self, inventory_path="ml/data/legal_inventory.json", train_path="ml/data/train.json"):
        # 1. Load Chunks
        with open(inventory_path, 'r', encoding='utf-8') as f:
            inv = json.load(f)
            
        self.chunks = []
        for p in inv:
            for c in p['chunks']:
                content = c.get('content', '').replace('\n', ' ')
                text_acc = f"Thủ tục: {p['name']}. Lĩnh vực: {p.get('category', '')}. Mục: {c.get('title', '')}. Nội dung: {content}".strip()
                text_unacc = remove_accents(text_acc)
                self.chunks.append({
                    "chunk_id": c['chunkId'],
                    "procedure_code": p['code'],
                    "procedure_name": p['name'],
                    "text_acc": text_acc,
                    "text_unacc": text_unacc
                })
                
        print(f"Embedding {len(self.chunks)} chunks in accented & unaccented representations...")
        self.chunk_embs_acc = run_onnx_inference(self.sess, self.tokenizer, [c['text_acc'] for c in self.chunks])
        self.chunk_embs_unacc = run_onnx_inference(self.sess, self.tokenizer, [c['text_unacc'] for c in self.chunks])
        
        # TF-IDF Indexing for keyword grounding
        all_chunk_docs = [f"{c['text_acc']} {c['text_unacc']}" for c in self.chunks]
        self.tfidf = TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)
        self.tfidf_chunks = self.tfidf.fit_transform(all_chunk_docs)
        
        # 2. Train Intent Classifier with Unaccented Augmentation
        with open(train_path, 'r', encoding='utf-8') as f:
            train_data = json.load(f)
            
        train_texts = []
        train_labels = []
        for s in train_data:
            n_sub = self.normalizer.normalize(s['text'])['substantive']
            train_texts.append(n_sub)
            train_labels.append(s['intent'])
            unacc = remove_accents(n_sub)
            if unacc != n_sub:
                train_texts.append(unacc)
                train_labels.append(s['intent'])
                
        print(f"Training Intent Classifier on {len(train_texts)} samples (normalized & augmented train set)...")
        train_embs = run_onnx_inference(self.sess, self.tokenizer, train_texts)
        self.clf = LogisticRegression(C=1.0, max_iter=1000, class_weight='balanced', random_state=42)
        self.clf.fit(train_embs, train_labels)
        
        self.classes_list = list(self.clf.classes_)
        self.greeting_idx = self.classes_list.index('GREETING') if 'GREETING' in self.classes_list else -1
        print("Pipeline initialized successfully.")

    def evaluate(self, samples, split_name="eval_split", theta=0.50, theta_lower=0.42):
        """
        Runs comprehensive evaluation on a given split (dev, stress_dev, stress_frozen, heldout).
        Returns all metrics: Intent Accuracy, Macro F1, Procedure R@1, R@3, MRR, Chunk R@3, Rejection metrics.
        """
        print(f"\n{'='*75}\nEVALUATING ENHANCED PIPELINE ON: {split_name} (N = {len(samples)})\n{'='*75}")
        norm_info = [self.normalizer.normalize(s['text']) for s in samples]
        substantive_texts = [info['substantive'] for info in norm_info]
        y_true = [s['intent'] for s in samples]
        
        # 1. Inference Latency & Embeddings
        t0 = time.perf_counter()
        query_embs = run_onnx_inference(self.sess, self.tokenizer, substantive_texts)
        t1 = time.perf_counter()
        mean_lat_ms = (t1 - t0) * 1000.0 / len(samples)
        
        # 2. Intent Classification
        raw_y_pred = self.clf.predict(query_embs)
        y_prob = self.clf.predict_proba(query_embs)
        
        refined_y_pred = []
        for i in range(len(samples)):
            pred = raw_y_pred[i]
            # Guardrail: GREETING requires actual greeting words
            if pred == 'GREETING' and not norm_info[i]['has_greeting']:
                probs = y_prob[i].copy()
                if self.greeting_idx >= 0:
                    probs[self.greeting_idx] = -1.0
                pred = self.classes_list[np.argmax(probs)]
            refined_y_pred.append(pred)
            
        y_pred = np.array(refined_y_pred)
        
        acc = accuracy_score(y_true, y_pred)
        p_mac, r_mac, f1_mac, _ = precision_recall_fscore_support(y_true, y_pred, average='macro', zero_division=0)
        p_w, r_w, f1_w, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted', zero_division=0)
        p_cls, r_cls, f1_cls, supp_cls = precision_recall_fscore_support(y_true, y_pred, labels=CLASSES, zero_division=0)
        
        conf_mat = confusion_matrix(y_true, y_pred, labels=CLASSES).tolist()
        
        # 3. Hybrid Retrieval
        tfidf_queries = self.tfidf.transform([info['normalized'] for info in norm_info])
        lex_sim = (tfidf_queries * self.tfidf_chunks.T).toarray()
        
        pr1_list, pr3_list, pmrr_list = [], [], []
        cr1_list, cr3_list, cmrr_list = [], [], []
        s_max_all = []
        item_results = []
        
        for i, s in enumerate(samples):
            g_proc = s.get('procedure_code')
            g_chunks = set(s.get('gold_chunk_ids', []))
            info = norm_info[i]
            q_emb = query_embs[i]
            
            sim_acc = np.dot(self.chunk_embs_acc, q_emb)
            sim_unacc = np.dot(self.chunk_embs_unacc, q_emb)
            
            if info['is_unaccented']:
                dense_sim = np.maximum(sim_acc, sim_unacc)
                lex_norm = lex_sim[i] / (np.max(lex_sim[i]) + 1e-9) if np.max(lex_sim[i]) > 0 else np.zeros_like(lex_sim[i])
                hybrid_scores = dense_sim + 0.10 * lex_norm
            else:
                dense_sim = sim_acc
                hybrid_scores = dense_sim
            
            top_idx = np.argsort(-hybrid_scores)
            seen_procs = []
            for idx in top_idx:
                p_code = self.chunks[idx]['procedure_code']
                if p_code not in seen_procs:
                    seen_procs.append(p_code)
                if len(seen_procs) >= 5:
                    break
            top_chunks = [self.chunks[idx]['chunk_id'] for idx in top_idx[:5]]
            
            top_dense_sim = float(dense_sim[top_idx[0]])
            s_max_all.append(top_dense_sim)
            
            # Procedure metrics
            r1_p, r3_p, mrr_p = None, None, None
            if g_proc and g_proc not in ['UNMAPPED', 'N/A']:
                r1_p = 1.0 if seen_procs and seen_procs[0] == g_proc else 0.0
                r3_p = 1.0 if any(p == g_proc for p in seen_procs[:3]) else 0.0
                rank_p = (seen_procs.index(g_proc) + 1) if g_proc in seen_procs else None
                mrr_p = (1.0 / rank_p) if rank_p else 0.0
                pr1_list.append(r1_p)
                pr3_list.append(r3_p)
                pmrr_list.append(mrr_p)
                
            # Chunk metrics
            r1_c, r3_c, mrr_c = None, None, None
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
                
            item_results.append({
                "id": s.get('id'),
                "text": s.get('text'),
                "group_id": s.get('group_id'),
                "s_max": top_dense_sim,
                "gold_proc": g_proc,
                "gold_chunks": list(g_chunks),
                "top_procs": seen_procs[:3],
                "top_chunks": top_chunks[:3],
                "proc_r1": r1_p,
                "proc_r3": r3_p,
                "proc_mrr": mrr_p,
                "chunk_r1": r1_c,
                "chunk_r3": r3_c,
                "chunk_mrr": mrr_c
            })

        # 4. Rejection & Abstention Analysis
        s_max_all = np.array(s_max_all)
        inq_indices = [i for i, s in enumerate(samples) if s.get('intent') == 'PROCEDURE_INQUIRY']
        oos_indices = [i for i, s in enumerate(samples) if s.get('intent') == 'OUT_OF_SCOPE']
        
        inq_s_max = s_max_all[inq_indices] if inq_indices else np.array([])
        inq_preds = [y_pred[i] for i in inq_indices]
        oos_s_max = s_max_all[oos_indices] if oos_indices else np.array([])
        oos_preds = [y_pred[i] for i in oos_indices]
        
        frr_vec = float(np.mean(inq_s_max < theta)) if len(inq_s_max) > 0 else 0.0
        frr_two_stage = float(sum(1 for i, idx in enumerate(inq_indices) if inq_preds[i] == 'OUT_OF_SCOPE' or s_max_all[idx] < theta) / len(inq_indices)) if inq_indices else 0.0
        crr_two_stage = float(sum(1 for i, idx in enumerate(oos_indices) if oos_preds[i] == 'OUT_OF_SCOPE' or s_max_all[idx] < theta) / len(oos_indices)) if oos_indices else 0.0
        leakage_two_stage = float(sum(1 for i, idx in enumerate(oos_indices) if oos_preds[i] != 'OUT_OF_SCOPE' and s_max_all[idx] >= theta) / len(oos_indices)) if oos_indices else 0.0
        
        print(f"Results for {split_name}:")
        print(f"  Intent Accuracy:  {acc*100:.2f}% | Macro F1: {f1_mac*100:.2f}%")
        print(f"  Procedure R@1:    {np.mean(pr1_list)*100:.2f}% | R@3: {np.mean(pr3_list)*100:.2f}% | MRR: {np.mean(pmrr_list):.4f}")
        print(f"  Chunk R@3:        {np.mean(cr3_list)*100:.2f}% | MRR: {np.mean(cmrr_list):.4f}")
        print(f"  Two-Stage CRR:    {crr_two_stage*100:.2f}% | Leakage: {leakage_two_stage*100:.2f}%")
        print(f"  Mean Latency:     {mean_lat_ms:.2f} ms/query")
        
        return {
            "split_name": split_name,
            "n_samples": len(samples),
            "summary": {
                "accuracy": round(float(acc), 4),
                "macro_f1": round(float(f1_mac), 4),
                "macro_precision": round(float(p_mac), 4),
                "macro_recall": round(float(r_mac), 4),
                "weighted_f1": round(float(f1_w), 4),
                "proc_r1": round(float(np.mean(pr1_list)), 4) if pr1_list else None,
                "proc_r3": round(float(np.mean(pr3_list)), 4) if pr3_list else None,
                "proc_mrr": round(float(np.mean(pmrr_list)), 4) if pmrr_list else None,
                "chunk_r1": round(float(np.mean(cr1_list)), 4) if cr1_list else None,
                "chunk_r3": round(float(np.mean(cr3_list)), 4) if cr3_list else None,
                "chunk_mrr": round(float(np.mean(cmrr_list)), 4) if cmrr_list else None,
                "mean_latency_ms": round(float(mean_lat_ms), 2)
            },
            "intent_metrics": {
                cls: {
                    "precision": round(float(p_cls[i]), 4),
                    "recall": round(float(r_cls[i]), 4),
                    "f1": round(float(f1_cls[i]), 4),
                    "support": int(supp_cls[i])
                }
                for i, cls in enumerate(CLASSES)
            },
            "confusion_matrix": conf_mat,
            "rejection": {
                "theta": theta,
                "theta_lower": theta_lower,
                "frr_vector_only": round(frr_vec, 4),
                "frr_two_stage": round(frr_two_stage, 4),
                "crr_two_stage": round(crr_two_stage, 4),
                "leakage_two_stage": round(leakage_two_stage, 4)
            },
            "item_results": item_results,
            "predictions": [
                {
                    "id": s.get('id'),
                    "text": s.get('text'),
                    "true_intent": y_true[i],
                    "pred_intent": y_pred[i],
                    "is_correct": bool(y_true[i] == y_pred[i])
                }
                for i, s in enumerate(samples)
            ]
        }
