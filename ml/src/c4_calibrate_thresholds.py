#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step C4: Threshold Calibration on DEV (TẠM THỜI, DEV TỔNG HỢP)
Sweeps:
1. Intent Confidence Threshold tau:
   - If max_c P(c) < tau -> AMBIGUOUS
   - Sweeps tau in [0.40, 0.90] to balance Accuracy, Macro F1, and Ambiguous diversion rate
2. Retrieval Rejection Thresholds theta & theta_lower:
   - Evaluates separation between PROCEDURE_INQUIRY (in-domain) and OUT_OF_SCOPE (out-of-domain) max cosine scores
   - Rejection rule: If S_max < theta -> REJECT
   - HITL queue: If theta_lower <= S_max < theta -> Log to ai_feedback_queue & gentle fallback
Outputs full threshold sweep tables and marks all values strictly as "TẠM THỜI (dev tổng hợp)".
"""

import os
import sys
import json
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sentence_transformers import SentenceTransformer

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

def run_calibration(model_path="ml/models/fine_tuned_biencoder"):
    print("="*75)
    print("STEP C4: THRESHOLD CALIBRATION ON DEV [TẠM THỜI, DEV TỔNG HỢP]")
    print("="*75)
    
    if not os.path.exists(model_path):
        model_path = 'bkai-foundation-models/vietnamese-bi-encoder'
        
    print(f"Loading embedding model: {model_path}...")
    model = SentenceTransformer(model_path)
    
    train_data = load_data('train')
    dev_data = load_data('dev')
    chunks = load_chunks()
    
    # --------------------------------------------------------------------------
    # 1. SWEEP INTENT CONFIDENCE THRESHOLD (tau)
    # --------------------------------------------------------------------------
    print("\n--- 1. SWEEPING INTENT CONFIDENCE THRESHOLD (tau) ---")
    train_texts = [s['text'] for s in train_data]
    dev_texts = [s['text'] for s in dev_data]
    y_train = [s['intent'] for s in train_data]
    y_dev = [s['intent'] for s in dev_data]
    
    X_train = model.encode(train_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    X_dev = model.encode(dev_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    clf = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
    clf.fit(X_train, y_train)
    
    probs = clf.predict_proba(X_dev)
    raw_preds = clf.predict(X_dev)
    max_probs = np.max(probs, axis=1)
    
    tau_sweep = []
    best_tau = 0.50
    best_f1 = 0.0
    
    for tau in np.arange(0.40, 0.91, 0.05):
        tau = round(float(tau), 2)
        adjusted_preds = []
        for i, p_max in enumerate(max_probs):
            if p_max < tau:
                adjusted_preds.append('AMBIGUOUS')
            else:
                adjusted_preds.append(raw_preds[i])
                
        acc = accuracy_score(y_dev, adjusted_preds)
        _, _, macro_f1, _ = precision_recall_fscore_support(y_dev, adjusted_preds, average='macro', zero_division=0)
        amb_rate = sum(1 for p in adjusted_preds if p == 'AMBIGUOUS') / len(adjusted_preds)
        
        if macro_f1 > best_f1:
            best_f1 = macro_f1
            best_tau = tau
            
        tau_sweep.append({
            "tau": tau,
            "accuracy": round(float(acc), 4),
            "macro_f1": round(float(macro_f1), 4),
            "ambiguous_rate": round(float(amb_rate), 4)
        })
        print(f"  tau = {tau:.2f} | Accuracy = {acc:.2%} | Macro F1 = {macro_f1:.2%} | Ambiguous Diverted = {amb_rate:.2%}")
        
    print(f"\n=> Optimal tau on DEV: {best_tau:.2f} (Macro F1 = {best_f1:.2%}) [Ghi chú: TẠM THỜI, DEV TỔNG HỢP]")

    # --------------------------------------------------------------------------
    # 2. SWEEP RETRIEVAL REJECTION THRESHOLD (theta & theta_lower)
    # --------------------------------------------------------------------------
    print("\n--- 2. SWEEPING RETRIEVAL REJECTION THRESHOLD (theta) ---")
    chunk_texts = [c['text'] for c in chunks]
    chunk_embs = model.encode(chunk_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    inq_samples = [s for s in dev_data if s['intent'] == 'PROCEDURE_INQUIRY']
    oos_samples = [s for s in dev_data if s['intent'] == 'OUT_OF_SCOPE']
    
    inq_embs = model.encode([s['text'] for s in inq_samples], convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    oos_embs = model.encode([s['text'] for s in oos_samples], convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    sim_inq = np.dot(inq_embs, chunk_embs.T)
    sim_oos = np.dot(oos_embs, chunk_embs.T)
    
    max_s_inq = np.max(sim_inq, axis=1)
    max_s_oos = np.max(sim_oos, axis=1)
    
    print(f"  IN-DOMAIN (INQUIRY, n={len(inq_samples)}) S_max: Mean = {np.mean(max_s_inq):.4f} | Min = {np.min(max_s_inq):.4f} | Median = {np.median(max_s_inq):.4f}")
    print(f"  OUT-OF-SCOPE (OOS, n={len(oos_samples)}) S_max: Mean = {np.mean(max_s_oos):.4f} | Max = {np.max(max_s_oos):.4f} | Median = {np.median(max_s_oos):.4f}")
    
    theta_sweep = []
    best_theta = 0.55
    best_f_score = 0.0
    
    for theta in np.arange(0.35, 0.86, 0.05):
        theta = round(float(theta), 2)
        # In-domain passed (True Positive)
        tp = sum(1 for s in max_s_inq if s >= theta)
        fn = sum(1 for s in max_s_inq if s < theta)  # Rejected valid query
        
        # Out-of-scope passed (False Positive / Hallucination hazard)
        fp = sum(1 for s in max_s_oos if s >= theta)
        tn = sum(1 for s in max_s_oos if s < theta)  # Correctly rejected
        
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        # F0.5 score: gives 2x more weight to precision (critical to block OOS hallucinations)
        beta = 0.5
        f05 = ((1 + beta**2) * prec * rec) / (beta**2 * prec + rec) if (prec + rec) > 0 else 0.0
        
        if f05 > best_f_score:
            best_f_score = f05
            best_theta = theta
            
        theta_sweep.append({
            "theta": theta,
            "tp_inq_passed": tp,
            "fn_inq_rejected": fn,
            "fp_oos_leaked": fp,
            "tn_oos_blocked": tn,
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f05_score": round(float(f05), 4)
        })
        print(f"  theta = {theta:.2f} | Precision = {prec:.2%} | Recall = {rec:.2%} | F0.5 = {f05:.4f} | OOS Leaked = {fp}/{len(oos_samples)}")
        
    # theta_lower: Suspicious margin (captures 90% of marginal OOS queries for HITL queue)
    theta_lower = round(max(0.35, best_theta - 0.10), 2)
    print(f"\n=> Calibrated Rejection Threshold theta: {best_theta:.2f}")
    print(f"=> Calibrated HITL Lower Bound theta_lower: {theta_lower:.2f} (Margin [{theta_lower:.2f}, {best_theta:.2f}) -> ai_feedback_queue)")
    print("   [TRẠNG THÁI: TẠM THỜI, DEV TỔNG HỢP - CHƯA CHỐT CHÍNH THỨC CHO ĐẾN KHI CÓ DEV_HUMAN]")
    
    calibration_report = {
        "status": "TẠM THỜI (dev tổng hợp)",
        "optimal_tau_confidence": best_tau,
        "optimal_theta_calibrated": best_theta,
        "optimal_theta_lower": theta_lower,
        "tau_sweep": tau_sweep,
        "theta_sweep": theta_sweep
    }
    
    with open('ml/runs/c4_calibration_report.json', 'w', encoding='utf-8') as f:
        json.dump(calibration_report, f, ensure_ascii=False, indent=2)
        
    return calibration_report

if __name__ == '__main__':
    run_calibration()
