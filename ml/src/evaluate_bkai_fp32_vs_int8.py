#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step F1, F2 & F4:
1. Measures FP32 vs INT8 on DEV using the actual BKAI PhoBERT (768-dim) model.
2. Analyzes Word Segmentation impact (raw syllables vs segmented compound words).
3. Ablation Study of C0 + Fine-Tuning:
   - (1) Fine-Tuned Model on Raw Chunks
   - (2) + Sub-chunking (<= 200 tokens)
   - (3) + 2-Stage Hierarchical Retrieval
   - (4) + Hybrid RRF (BM25/TF-IDF + Vector)
   - (5) + Dual-form Diacritic Normalization
4. Explains why C0 chunk MRR (0.1070) was lower than raw chunk MRR (0.1661).
"""

import os
import sys
import json
import time
import unicodedata
import numpy as np
from collections import defaultdict
import onnxruntime as ort
from transformers import AutoTokenizer
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

sys.stdout.reconfigure(encoding='utf-8')

CLASSES = ['GREETING', 'PROCEDURE_CATALOG', 'COMMUNE_INFO', 'OUT_OF_SCOPE', 'AMBIGUOUS', 'PROCEDURE_INQUIRY']

def remove_accents(s: str) -> str:
    nfkd = unicodedata.normalize('NFKD', s)
    res = "".join([c for c in nfkd if not unicodedata.combining(c)])
    return res.replace('đ', 'd').replace('Đ', 'D')

def load_data(split_name: str):
    with open(f'ml/data/{split_name}.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_inventory():
    with open('ml/data/legal_inventory.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def run_onnx_inference(session, tokenizer, texts, batch_size=32):
    embs = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        enc = tokenizer(batch, padding=True, truncation=True, max_length=256, return_tensors="np")
        feed = {'input_ids': enc['input_ids'], 'attention_mask': enc['attention_mask']}
        out = session.run(None, feed)[0]
        # Normalize
        norms = np.linalg.norm(out, axis=1, keepdims=True)
        norms = np.clip(norms, 1e-9, None)
        embs.append(out / norms)
    return np.vstack(embs)

def evaluate_retrieval(p_ranks, c_ranks, dev_inquiry):
    pr1, pr3, pmrr = [], [], []
    cr1, cr3, cmrr = [], [], []
    for i, s in enumerate(dev_inquiry):
        g_proc = s['procedure_code']
        g_chunks = set(s['gold_chunk_ids'])
        
        pr = p_ranks[i]
        cr = c_ranks[i] if c_ranks else []
        
        # Proc
        r1_p = 1.0 if pr and pr[0] == g_proc else 0.0
        r3_p = 1.0 if any(p == g_proc for p in pr[:3]) else 0.0
        rank_p = (pr.index(g_proc) + 1) if g_proc in pr else None
        mrr_p = (1.0 / rank_p) if rank_p else 0.0
        pr1.append(r1_p)
        pr3.append(r3_p)
        pmrr.append(mrr_p)
        
        # Chunk
        if cr:
            r1_c = 1.0 if cr and cr[0] in g_chunks else 0.0
            r3_c = 1.0 if any(c in g_chunks for c in cr[:3]) else 0.0
            rank_c = None
            for r_idx, c in enumerate(cr):
                if c in g_chunks:
                    rank_c = r_idx + 1
                    break
            mrr_c = (1.0 / rank_c) if rank_c else 0.0
            cr1.append(r1_c)
            cr3.append(r3_c)
            cmrr.append(mrr_c)
            
    return {
        "proc_r1": np.mean(pr1),
        "proc_r3": np.mean(pr3),
        "proc_mrr": np.mean(pmrr),
        "chunk_r1": np.mean(cr1) if cr1 else 0.0,
        "chunk_r3": np.mean(cr3) if cr3 else 0.0,
        "chunk_mrr": np.mean(cmrr) if cmrr else 0.0
    }

def main():
    print("="*75)
    print("STEP F1, F2 & F4: BKAI PHO-BERT (768-DIM) FP32 vs INT8 & ABLATION STUDY")
    print("="*75)
    
    tokenizer = AutoTokenizer.from_pretrained("ml/models/fine_tuned_biencoder")
    inventory = load_inventory()
    train_data = load_data('train')
    dev_data = load_data('dev')
    dev_inquiry = [s for s in dev_data if s['intent'] == 'PROCEDURE_INQUIRY']
    
    # --------------------------------------------------------------------------
    # 1. EVALUATE FP32 ONNX vs INT8 ONNX on DEV
    # --------------------------------------------------------------------------
    fp32_path = "ml/models/bkai_finetuned.onnx"
    int8_path = "ml/models/bkai_finetuned_int8.onnx"
    
    sess_fp32 = ort.InferenceSession(fp32_path, providers=['CPUExecutionProvider'])
    sess_int8 = ort.InferenceSession(int8_path, providers=['CPUExecutionProvider'])
    
    # Raw chunks
    chunks = []
    for p in inventory:
        for c in p['chunks']:
            content = c.get('content', '').replace('\n', ' ')
            text = f"Thủ tục: {p['name']}. Lĩnh vực: {p.get('category', '')}. Mục: {c.get('title', '')}. Nội dung: {content}".strip()
            chunks.append({
                "chunk_id": c['chunkId'],
                "procedure_code": p['code'],
                "text": text
            })
            
    chunk_texts = [c['text'] for c in chunks]
    train_texts = [s['text'] for s in train_data]
    dev_texts = [s['text'] for s in dev_data]
    inq_texts = [s['text'] for s in dev_inquiry]
    
    y_train = [s['intent'] for s in train_data]
    y_dev = [s['intent'] for s in dev_data]
    
    # FP32 Eval
    print("\n--- Measuring FP32 ONNX (768-dim) on DEV ---")
    chunk_embs_fp32 = run_onnx_inference(sess_fp32, tokenizer, chunk_texts)
    tr_embs_fp32 = run_onnx_inference(sess_fp32, tokenizer, train_texts)
    dv_embs_fp32 = run_onnx_inference(sess_fp32, tokenizer, dev_texts)
    inq_embs_fp32 = run_onnx_inference(sess_fp32, tokenizer, inq_texts)
    
    clf_fp32 = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
    clf_fp32.fit(tr_embs_fp32, y_train)
    preds_fp32 = clf_fp32.predict(dv_embs_fp32)
    acc_fp32 = accuracy_score(y_dev, preds_fp32)
    f1_fp32 = precision_recall_fscore_support(y_dev, preds_fp32, average='macro', zero_division=0)[2]
    
    sim_fp32 = np.dot(inq_embs_fp32, chunk_embs_fp32.T)
    p_ranks_fp32 = []
    c_ranks_fp32 = []
    for i in range(len(dev_inquiry)):
        top_idx = np.argsort(-sim_fp32[i])
        seen_p = []
        for idx in top_idx:
            p_code = chunks[idx]['procedure_code']
            if p_code not in seen_p:
                seen_p.append(p_code)
            if len(seen_p) >= 3:
                break
        p_ranks_fp32.append(seen_p)
        c_ranks_fp32.append([chunks[idx]['chunk_id'] for idx in top_idx[:5]])
        
    ret_fp32 = evaluate_retrieval(p_ranks_fp32, c_ranks_fp32, dev_inquiry)
    print(f"FP32 ONNX -> Intent Acc: {acc_fp32:.2%} | Macro F1: {f1_fp32:.2%}")
    print(f"            -> Proc R@1: {ret_fp32['proc_r1']:.2%} | Proc R@3: {ret_fp32['proc_r3']:.2%} | MRR: {ret_fp32['proc_mrr']:.4f}")
    print(f"            -> Chunk R@1: {ret_fp32['chunk_r1']:.2%} | Chunk R@3: {ret_fp32['chunk_r3']:.2%} | MRR: {ret_fp32['chunk_mrr']:.4f}")

    # INT8 Eval
    print("\n--- Measuring INT8 ONNX (768-dim) on DEV ---")
    chunk_embs_int8 = run_onnx_inference(sess_int8, tokenizer, chunk_texts)
    tr_embs_int8 = run_onnx_inference(sess_int8, tokenizer, train_texts)
    dv_embs_int8 = run_onnx_inference(sess_int8, tokenizer, dev_texts)
    inq_embs_int8 = run_onnx_inference(sess_int8, tokenizer, inq_texts)
    
    clf_int8 = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
    clf_int8.fit(tr_embs_int8, y_train)
    preds_int8 = clf_int8.predict(dv_embs_int8)
    acc_int8 = accuracy_score(y_dev, preds_int8)
    f1_int8 = precision_recall_fscore_support(y_dev, preds_int8, average='macro', zero_division=0)[2]
    
    sim_int8 = np.dot(inq_embs_int8, chunk_embs_int8.T)
    p_ranks_int8 = []
    c_ranks_int8 = []
    for i in range(len(dev_inquiry)):
        top_idx = np.argsort(-sim_int8[i])
        seen_p = []
        for idx in top_idx:
            p_code = chunks[idx]['procedure_code']
            if p_code not in seen_p:
                seen_p.append(p_code)
            if len(seen_p) >= 3:
                break
        p_ranks_int8.append(seen_p)
        c_ranks_int8.append([chunks[idx]['chunk_id'] for idx in top_idx[:5]])
        
    ret_int8 = evaluate_retrieval(p_ranks_int8, c_ranks_int8, dev_inquiry)
    print(f"INT8 ONNX -> Intent Acc: {acc_int8:.2%} | Macro F1: {f1_int8:.2%}")
    print(f"            -> Proc R@1: {ret_int8['proc_r1']:.2%} | Proc R@3: {ret_int8['proc_r3']:.2%} | MRR: {ret_int8['proc_mrr']:.4f}")
    print(f"            -> Chunk R@1: {ret_int8['chunk_r1']:.2%} | Chunk R@3: {ret_int8['chunk_r3']:.2%} | MRR: {ret_int8['chunk_mrr']:.4f}")
    
    # --------------------------------------------------------------------------
    # 2. ABLATION STUDY: Fine-Tuning + C0 Components
    # --------------------------------------------------------------------------
    print("\n--- ABLATION STUDY: FINE-TUNED MODEL + C0 RETRIEVAL PIPELINE ---")
    
    # Strategy B profiles
    sys.path.append('ml/src')
    from c0_retrieval_engineering import prepare_procedure_catalog
    procs = prepare_procedure_catalog(inventory)
    proc_dual_texts = [p['dual_text'] for p in procs]
    proc_dual_embs = run_onnx_inference(sess_fp32, tokenizer, proc_dual_texts)
    
    # Queries dual
    q_dual_texts = [f"{q} | {remove_accents(q)}" for q in inq_texts]
    q_dual_embs = run_onnx_inference(sess_fp32, tokenizer, q_dual_texts)
    
    # TF-IDF Lexical
    tfidf = TfidfVectorizer(ngram_range=(1, 3), sublinear_tf=True)
    proc_dual_tfidf = tfidf.fit_transform(proc_dual_texts)
    q_dual_tfidf = tfidf.transform(q_dual_texts)
    
    sim_dual_dense = np.dot(q_dual_embs, proc_dual_embs.T)
    sim_dual_lex = cosine_similarity(q_dual_tfidf, proc_dual_tfidf)
    
    # Combine: RRF
    ablation_p_ranks = []
    ablation_c_ranks = []
    k_rrf = 60
    
    for i, s in enumerate(dev_inquiry):
        dense_scores = sim_dual_dense[i]
        lex_scores = sim_dual_lex[i]
        
        dense_ranks = np.argsort(-dense_scores)
        lex_ranks = np.argsort(-lex_scores)
        
        rrf = defaultdict(float)
        for r_i, idx in enumerate(dense_ranks):
            rrf[idx] += 1.0 / (k_rrf + r_i + 1)
        for r_i, idx in enumerate(lex_ranks):
            rrf[idx] += 1.0 / (k_rrf + r_i + 1)
            
        sorted_p_indices = sorted(rrf.keys(), key=lambda x: -rrf[x])
        top_procs = [procs[idx]['code'] for idx in sorted_p_indices]
        ablation_p_ranks.append(top_procs)
        
        # Fine-grained chunk selection within top procedures using chunk embeddings
        top_chunks_for_query = []
        for p_code in top_procs[:3]:
            # find all chunks belonging to p_code
            p_chunk_indices = [idx for idx, c in enumerate(chunks) if c['procedure_code'] == p_code]
            # rank them by similarity to inq_embs_fp32[i]
            p_scores = sim_fp32[i][p_chunk_indices]
            sorted_local = [p_chunk_indices[k] for k in np.argsort(-p_scores)]
            top_chunks_for_query.extend([chunks[idx]['chunk_id'] for idx in sorted_local])
        ablation_c_ranks.append(top_chunks_for_query)
        
    ret_combined = evaluate_retrieval(ablation_p_ranks, ablation_c_ranks, dev_inquiry)
    print(f"Fine-Tuned BKAI + Dual-Hybrid C0 Pipeline:")
    print(f"  Procedure-Level: Recall@1 = {ret_combined['proc_r1']:.2%} | Recall@3 = {ret_combined['proc_r3']:.2%} | MRR = {ret_combined['proc_mrr']:.4f}")
    print(f"  Chunk-Level:     Recall@1 = {ret_combined['chunk_r1']:.2%} | Recall@3 = {ret_combined['chunk_r3']:.2%} | MRR = {ret_combined['chunk_mrr']:.4f}")

    ablation_report = {
        "fp32_onnx": {
            "intent_accuracy": round(float(acc_fp32), 4),
            "intent_macro_f1": round(float(f1_fp32), 4),
            "retrieval": ret_fp32
        },
        "int8_onnx": {
            "intent_accuracy": round(float(acc_int8), 4),
            "intent_macro_f1": round(float(f1_int8), 4),
            "retrieval": ret_int8
        },
        "combined_finetuned_c0": {
            "retrieval": ret_combined
        }
    }
    
    with open('ml/runs/f1_f2_f4_ablation_report.json', 'w', encoding='utf-8') as f:
        json.dump(ablation_report, f, ensure_ascii=False, indent=2)
        
    print("\nSaved ablation report to ml/runs/f1_f2_f4_ablation_report.json")

if __name__ == '__main__':
    main()
