#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step C2: INT8 vs FP32 End-to-End Accuracy & Real Batch RAM Benchmark
Measures on DEV:
1. Intent Classification Accuracy & Macro F1 (FP32 vs INT8)
2. Retrieval Recall@1, Recall@3, MRR at Procedure & Chunk level (FP32 vs INT8)
3. Real Process RSS Memory during full batch inference (all 179 chunks + 228 queries)
"""

import os
import sys
import json
import time
import psutil
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

sys.stdout.reconfigure(encoding='utf-8')

CLASSES = ['GREETING', 'PROCEDURE_CATALOG', 'COMMUNE_INFO', 'OUT_OF_SCOPE', 'AMBIGUOUS', 'PROCEDURE_INQUIRY']

def load_data(split_name: str):
    with open(f'ml/data/{split_name}.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_chunks():
    with open('ml/data/legal_inventory.json', 'r', encoding='utf-8') as f:
        inventory = json.load(f)
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
    return chunks

def run_batch_inference_onnx(session, tokenizer, texts, batch_size=32):
    all_embs = []
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i+batch_size]
        enc = tokenizer(batch_texts, padding=True, truncation=True, max_length=128, return_tensors="np")
        feed = {
            'input_ids': enc['input_ids'],
            'attention_mask': enc['attention_mask']
        }
        embs = session.run(None, feed)[0]
        # Normalize
        norms = np.linalg.norm(embs, axis=1, keepdims=True)
        norms = np.clip(norms, 1e-9, None)
        all_embs.append(embs / norms)
    return np.vstack(all_embs)

def evaluate_session(session_path: str, session_name: str, chunks, train_data, dev_data, tokenizer):
    print(f"\n--- Evaluating {session_name} ({session_path}) ---")
    proc = psutil.Process(os.getpid())
    
    mem_before = proc.memory_info().rss / (1024 * 1024)
    t0 = time.time()
    session = ort.InferenceSession(session_path, providers=['CPUExecutionProvider'])
    mem_load = proc.memory_info().rss / (1024 * 1024)
    
    # 1. Batch embed chunks
    chunk_texts = [c['text'] for c in chunks]
    chunk_embs = run_batch_inference_onnx(session, tokenizer, chunk_texts)
    
    # 2. Batch embed train & dev
    train_texts = [s['text'] for s in train_data]
    dev_texts = [s['text'] for s in dev_data]
    
    t_batch_start = time.time()
    train_embs = run_batch_inference_onnx(session, tokenizer, train_texts)
    dev_embs = run_batch_inference_onnx(session, tokenizer, dev_texts)
    t_batch_total = time.time() - t_batch_start
    
    mem_peak = proc.memory_info().rss / (1024 * 1024)
    ram_used = mem_peak - mem_before
    
    # Intent Classification
    y_train = [s['intent'] for s in train_data]
    y_dev = [s['intent'] for s in dev_data]
    clf = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
    clf.fit(train_embs, y_train)
    preds = clf.predict(dev_embs)
    
    acc = accuracy_score(y_dev, preds)
    p_m, r_m, f1_m, _ = precision_recall_fscore_support(y_dev, preds, average='macro', zero_division=0)
    
    # Retrieval on DEV INQUIRY
    dev_inquiry = [s for s in dev_data if s['intent'] == 'PROCEDURE_INQUIRY']
    inq_indices = [idx for idx, s in enumerate(dev_data) if s['intent'] == 'PROCEDURE_INQUIRY']
    inq_embs = dev_embs[inq_indices]
    
    sim_mat = np.dot(inq_embs, chunk_embs.T)
    
    pr1_list, pr3_list, pmrr_list = [], [], []
    cr1_list, cr3_list, cmrr_list = [], [], []
    
    for i, s in enumerate(dev_inquiry):
        gold_chunks = set(s['gold_chunk_ids'])
        gold_proc = s['procedure_code']
        scores = sim_mat[i]
        top_idx = np.argsort(-scores)
        
        # Chunk
        top1_c = chunks[top_idx[0]]['chunk_id']
        top3_c = [chunks[k]['chunk_id'] for k in top_idx[:3]]
        cr1_list.append(1.0 if top1_c in gold_chunks else 0.0)
        cr3_list.append(1.0 if any(k in gold_chunks for k in top3_c) else 0.0)
        c_rank = None
        for r_i, k in enumerate(top_idx):
            if chunks[k]['chunk_id'] in gold_chunks:
                c_rank = r_i + 1
                break
        cmrr_list.append((1.0 / c_rank) if c_rank else 0.0)
        
        # Procedure
        seen_procs = []
        for k in top_idx:
            p_code = chunks[k]['procedure_code']
            if p_code not in seen_procs:
                seen_procs.append(p_code)
            if len(seen_procs) >= 3:
                break
        pr1_list.append(1.0 if seen_procs[0] == gold_proc else 0.0)
        pr3_list.append(1.0 if gold_proc in seen_procs[:3] else 0.0)
        p_rank = None
        for r_i, p_code in enumerate(seen_procs):
            if p_code == gold_proc:
                p_rank = r_i + 1
                break
        pmrr_list.append((1.0 / p_rank) if p_rank else 0.0)
        
    res = {
        "session_name": session_name,
        "file_size_mb": round(os.path.getsize(session_path) / (1024 * 1024), 2),
        "peak_ram_rss_mb": round(mem_peak, 1),
        "batch_inference_time_sec": round(t_batch_total, 2),
        "intent_accuracy": round(float(acc), 4),
        "intent_macro_f1": round(float(f1_m), 4),
        "proc_recall_at_1": round(float(np.mean(pr1_list)), 4),
        "proc_recall_at_3": round(float(np.mean(pr3_list)), 4),
        "proc_mrr": round(float(np.mean(pmrr_list)), 4),
        "chunk_recall_at_1": round(float(np.mean(cr1_list)), 4),
        "chunk_recall_at_3": round(float(np.mean(cr3_list)), 4),
        "chunk_mrr": round(float(np.mean(cmrr_list)), 4)
    }
    
    print(f"  Accuracy: {res['intent_accuracy']:.2%} | Macro F1: {res['intent_macro_f1']:.2%}")
    print(f"  Procedure Retrieval: R@1 = {res['proc_recall_at_1']:.2%} | R@3 = {res['proc_recall_at_3']:.2%} | MRR = {res['proc_mrr']:.4f}")
    print(f"  Chunk Retrieval:     R@1 = {res['chunk_recall_at_1']:.2%} | R@3 = {res['chunk_recall_at_3']:.2%} | MRR = {res['chunk_mrr']:.4f}")
    print(f"  File Size: {res['file_size_mb']} MB | Peak RSS RAM: {res['peak_ram_rss_mb']} MB | Batch time: {res['batch_inference_time_sec']}s")
    return res

def main():
    print("="*75)
    print("STEP C2: INT8 vs FP32 ACCURACY, RETRIEVAL & PEAK RAM BENCHMARK")
    print("="*75)
    
    tokenizer = AutoTokenizer.from_pretrained("ml/models/tokenizer")
    chunks = load_chunks()
    train_data = load_data('train')
    dev_data = load_data('dev')
    
    fp32_res = evaluate_session("ml/models/biencoder_base.onnx", "FP32_ONNX", chunks, train_data, dev_data, tokenizer)
    int8_res = evaluate_session("ml/models/biencoder_base_int8.onnx", "INT8_Dynamic_ONNX", chunks, train_data, dev_data, tokenizer)
    
    # Delta
    delta = {
        "intent_acc_diff_p": round((int8_res['intent_accuracy'] - fp32_res['intent_accuracy']) * 100, 2),
        "intent_f1_diff_p": round((int8_res['intent_macro_f1'] - fp32_res['intent_macro_f1']) * 100, 2),
        "proc_r1_diff_p": round((int8_res['proc_recall_at_1'] - fp32_res['proc_recall_at_1']) * 100, 2),
        "proc_r3_diff_p": round((int8_res['proc_recall_at_3'] - fp32_res['proc_recall_at_3']) * 100, 2),
        "size_reduction_pct": round((1 - int8_res['file_size_mb'] / fp32_res['file_size_mb']) * 100, 2),
        "ram_saved_mb": round(fp32_res['peak_ram_rss_mb'] - int8_res['peak_ram_rss_mb'], 1)
    }
    
    print("\n" + "="*75)
    print("INT8 vs FP32 DELTA SUMMARY:")
    print("="*75)
    print(f"  File size reduction:   {delta['size_reduction_pct']}% ({fp32_res['file_size_mb']} MB -> {int8_res['file_size_mb']} MB)")
    print(f"  Peak RAM reduction:    {delta['ram_saved_mb']} MB ({fp32_res['peak_ram_rss_mb']} MB -> {int8_res['peak_ram_rss_mb']} MB)")
    print(f"  Intent Accuracy diff:  {delta['intent_acc_diff_p']:+.2f} %p ({fp32_res['intent_accuracy']:.2%} vs {int8_res['intent_accuracy']:.2%})")
    print(f"  Intent Macro F1 diff:  {delta['intent_f1_diff_p']:+.2f} %p ({fp32_res['intent_macro_f1']:.2%} vs {int8_res['intent_macro_f1']:.2%})")
    print(f"  Proc Recall@3 diff:    {delta['proc_r3_diff_p']:+.2f} %p ({fp32_res['proc_recall_at_3']:.2%} vs {int8_res['proc_recall_at_3']:.2%})")
    
    report = {
        "fp32": fp32_res,
        "int8": int8_res,
        "delta": delta
    }
    with open('ml/runs/c2_int8_accuracy_benchmark.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print("\nSaved C2 report to ml/runs/c2_int8_accuracy_benchmark.json")

if __name__ == '__main__':
    main()
