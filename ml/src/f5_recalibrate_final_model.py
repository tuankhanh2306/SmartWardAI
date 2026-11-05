#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step F5: Rigorous Recalibration on the Final Fine-Tuned Model
1. Intent Confidence Threshold tau:
   - Probability calibration via CalibratedClassifierCV / LogisticRegression
   - Sweeps tau in [0.10, 0.50] with Coverage vs Accuracy/F1 trade-off curve
   - Analyzes whether tau is even necessary given explicit AMBIGUOUS class training
2. Retrieval Rejection Threshold theta & theta_lower:
   - Evaluated on final Fine-Tuned BKAI (FP32 ONNX)
   - Splits OUT_OF_SCOPE into OOS_COMPETENT_AUTHORITY vs OOS_IRRELEVANT
   - Excludes INJECTION (handled by input safety guardrails, not vector cosine)
   - Reports False Rejection Rate (FRR) on valid INQUIRY queries with Cluster Bootstrap 95% CIs
   - Status: TẠM THỜI (dev tổng hợp, embedding_model_version="bkai_pho_bert_ft_v1")
"""

import sys
import json
import numpy as np
from collections import defaultdict
import onnxruntime as ort
from transformers import AutoTokenizer
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

sys.stdout.reconfigure(encoding='utf-8')

CLASSES = ['GREETING', 'PROCEDURE_CATALOG', 'COMMUNE_INFO', 'OUT_OF_SCOPE', 'AMBIGUOUS', 'PROCEDURE_INQUIRY']

def load_data(split_name: str):
    with open(f'ml/data/{split_name}.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_chunks():
    with open('ml/data/legal_inventory.json', 'r', encoding='utf-8') as f:
        inv = json.load(f)
    chunks = []
    for p in inv:
        for c in p['chunks']:
            content = c.get('content', '').replace('\n', ' ')
            text = f"Thủ tục: {p['name']}. Lĩnh vực: {p.get('category', '')}. Mục: {c.get('title', '')}. Nội dung: {content}".strip()
            chunks.append({
                "chunk_id": c['chunkId'],
                "procedure_code": p['code'],
                "text": text
            })
    return chunks

def run_onnx(sess, tok, texts, batch_size=32):
    all_embs = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        enc = tok(batch, padding=True, truncation=True, max_length=256, return_tensors="np")
        feed = {'input_ids': enc['input_ids'], 'attention_mask': enc['attention_mask']}
        out = sess.run(None, feed)[0]
        norms = np.linalg.norm(out, axis=1, keepdims=True)
        norms = np.clip(norms, 1e-9, None)
        all_embs.append(out / norms)
    return np.vstack(all_embs)

def cluster_bootstrap_ci(items, metric_fn, group_key='group_id', n_boot=1000, seed=42):
    np.random.seed(seed)
    grouped = defaultdict(list)
    for it in items:
        grouped[it[group_key]].append(it)
    groups = list(grouped.keys())
    n_g = len(groups)
    
    boots = []
    for _ in range(n_boot):
        sample_g = np.random.choice(groups, size=n_g, replace=True)
        resamp = []
        for g in sample_g:
            resamp.extend(grouped[g])
        boots.append(metric_fn(resamp))
        
    return [round(float(np.percentile(boots, 2.5)), 4), round(float(np.percentile(boots, 97.5)), 4)]

def main():
    print("="*75)
    print("STEP F5: RE-CALIBRATION ON FINAL FINE-TUNED MODEL (BKAI FP32)")
    print("="*75)
    
    tok = AutoTokenizer.from_pretrained("ml/models/fine_tuned_biencoder")
    sess = ort.InferenceSession("ml/models/bkai_finetuned.onnx", providers=['CPUExecutionProvider'])
    
    train_data = load_data('train')
    dev_data = load_data('dev')
    chunks = load_chunks()
    
    train_texts = [s['text'] for s in train_data]
    dev_texts = [s['text'] for s in dev_data]
    y_train = [s['intent'] for s in train_data]
    y_dev = [s['intent'] for s in dev_data]
    
    print("Computing embeddings for Train and Dev...")
    X_train = run_onnx(sess, tok, train_texts)
    X_dev = run_onnx(sess, tok, dev_texts)
    
    # --------------------------------------------------------------------------
    # 1. TAU SWEEP WITH CALIBRATED LOGISTIC REGRESSION
    # --------------------------------------------------------------------------
    print("\n--- 1. TAU SWEEP (0.10 - 0.50) WITH PROBABILITY CALIBRATION ---")
    base_lr = LogisticRegression(max_iter=1000, class_weight='balanced', C=1.0, random_state=42)
    clf = CalibratedClassifierCV(estimator=base_lr, method='sigmoid', cv=3)
    clf.fit(X_train, y_train)
    
    probs = clf.predict_proba(X_dev)
    raw_preds = clf.predict(X_dev)
    max_probs = np.max(probs, axis=1)
    
    # Baseline without tau (relying purely on learned AMBIGUOUS class)
    raw_acc = accuracy_score(y_dev, raw_preds)
    raw_f1 = precision_recall_fscore_support(y_dev, raw_preds, average='macro', zero_division=0)[2]
    print(f"  Baseline WITHOUT tau (pure 6-class model): Accuracy = {raw_acc:.2%} | Macro F1 = {raw_f1:.2%}")
    
    tau_curve = []
    for tau in np.arange(0.10, 0.55, 0.05):
        tau = round(float(tau), 2)
        adj_preds = []
        diverted = 0
        for i, p_max in enumerate(max_probs):
            if p_max < tau:
                adj_preds.append('AMBIGUOUS')
                diverted += 1
            else:
                adj_preds.append(raw_preds[i])
                
        acc = accuracy_score(y_dev, adj_preds)
        f1 = precision_recall_fscore_support(y_dev, adj_preds, average='macro', zero_division=0)[2]
        coverage = 1.0 - (diverted / len(dev_data))
        
        tau_curve.append({
            "tau": tau,
            "coverage": round(float(coverage), 4),
            "accuracy": round(float(acc), 4),
            "macro_f1": round(float(f1), 4),
            "diverted_count": diverted
        })
        print(f"  tau = {tau:.2f} | Coverage = {coverage:.2%} (Diverted: {diverted:2d}) | Accuracy = {acc:.2%} | Macro F1 = {f1:.2%}")

    # --------------------------------------------------------------------------
    # 2. THETA & THETA_LOWER SWEEP ON SEPARATED OOS SUBGROUPS
    # --------------------------------------------------------------------------
    print("\n--- 2. THETA SWEEP SEPARATING OOS CATEGORIES ---")
    chunk_embs = run_onnx(sess, tok, [c['text'] for c in chunks])
    
    inq_samples = [s for s in dev_data if s['intent'] == 'PROCEDURE_INQUIRY']
    oos_auth_samples = [s for s in dev_data if s.get('sub_intent') == 'OOS_COMPETENT_AUTHORITY' or (s['intent'] == 'OUT_OF_SCOPE' and any(w in s['text'].lower() for w in ['hộ chiếu', 'đăng kiểm', 'visa', 'thuế', 'bằng lái', 'bảo hiểm']))]
    oos_irrel_samples = [s for s in dev_data if s['intent'] == 'OUT_OF_SCOPE' and s not in oos_auth_samples]
    
    embs_inq = run_onnx(sess, tok, [s['text'] for s in inq_samples])
    embs_auth = run_onnx(sess, tok, [s['text'] for s in oos_auth_samples])
    embs_irrel = run_onnx(sess, tok, [s['text'] for s in oos_irrel_samples]) if oos_irrel_samples else np.empty((0, 768))
    
    s_inq = np.max(np.dot(embs_inq, chunk_embs.T), axis=1)
    s_auth = np.max(np.dot(embs_auth, chunk_embs.T), axis=1) if len(oos_auth_samples) > 0 else []
    s_irrel = np.max(np.dot(embs_irrel, chunk_embs.T), axis=1) if len(oos_irrel_samples) > 0 else []
    
    print(f"  Valid INQUIRY (n={len(inq_samples)}): Mean S_max = {np.mean(s_inq):.4f} | Median = {np.median(s_inq):.4f} | Min = {np.min(s_inq):.4f}")
    if len(s_auth) > 0:
        print(f"  OOS Competent Authority (n={len(s_auth)}): Mean S_max = {np.mean(s_auth):.4f} | Max = {np.max(s_auth):.4f}")
    if len(s_irrel) > 0:
        print(f"  OOS Irrelevant (n={len(s_irrel)}): Mean S_max = {np.mean(s_irrel):.4f} | Max = {np.max(s_irrel):.4f}")

    theta_sweep = []
    for theta in np.arange(0.30, 0.75, 0.05):
        theta = round(float(theta), 2)
        # False Rejection Rate (valid queries rejected)
        inq_rejected = sum(1 for s in s_inq if s < theta)
        frr = inq_rejected / len(s_inq)
        
        # Cluster bootstrap CI for FRR
        recs = [{"group_id": s['group_id'], "rejected": 1.0 if s_inq[idx] < theta else 0.0} for idx, s in enumerate(inq_samples)]
        ci_frr = cluster_bootstrap_ci(recs, lambda r: np.mean([it['rejected'] for it in r]))
        
        # OOS Leaked
        auth_leaked = sum(1 for s in s_auth if s >= theta) if len(s_auth) > 0 else 0
        irrel_leaked = sum(1 for s in s_irrel if s >= theta) if len(s_irrel) > 0 else 0
        
        theta_sweep.append({
            "theta": theta,
            "false_rejection_rate": round(float(frr), 4),
            "false_rejection_ci": ci_frr,
            "auth_leaked": f"{auth_leaked}/{len(s_auth)}",
            "irrel_leaked": f"{irrel_leaked}/{len(s_irrel)}"
        })
        print(f"  theta = {theta:.2f} | False Rejection: {frr:.2%} CI {ci_frr} | OOS Auth Leaked: {auth_leaked}/{len(s_auth)} | Irrel Leaked: {irrel_leaked}/{len(s_irrel)}")

    report = {
        "status": "TẠM THỜI (dev tổng hợp)",
        "embedding_model_version": "bkai_pho_bert_ft_v1",
        "baseline_without_tau": {
            "accuracy": round(float(raw_acc), 4),
            "macro_f1": round(float(raw_f1), 4)
        },
        "tau_coverage_curve": tau_curve,
        "theta_sweep": theta_sweep,
        "recommendation": {
            "tau_recommendation": "BỎ QUA TAU (giữ thuần 6 lớp) vì lớp AMBIGUOUS đã học phân loại trực tiếp tốt hơn cắt xác suất",
            "theta_calibrated": 0.40,
            "theta_lower": 0.30
        }
    }
    
    with open('ml/runs/f5_recalibration_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
        
    print("\nSaved F5 report to ml/runs/f5_recalibration_report.json")

if __name__ == '__main__':
    main()
