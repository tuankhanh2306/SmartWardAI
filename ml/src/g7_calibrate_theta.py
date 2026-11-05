#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step G2 & G7: Cosine Distribution Diagnostic & Rigorous Theta Calibration
1. Model Confirmation:
   - Model name: bkai-foundation-models/vietnamese-bi-encoder fine-tuned with MNRL (version: bkai_pho_bert_ft_v1).
   - Weights source: ml/models/bkai_finetuned.onnx (exported from ml/models/fine_tuned_biencoder).
   - Explains why C4 and F5 yielded identical 4-digit figures: C4 (PyTorch) and F5 (ONNX) evaluated the exact same model weights on the identical dev set and chunk corpus.
   - Explains why valid INQUIRY average cosine is ~0.57: Contrastive loss geometry in 768-dim space pushes positive relative rank contrast, not absolute dot product 1.0.
2. Theta & Theta_lower Calibration:
   - Evaluates separation between PROCEDURE_INQUIRY (in-domain) and OUT_OF_SCOPE subgroups:
     a) OOS_COMPETENT_AUTHORITY (hộ chiếu, bằng lái, đăng kiểm, thuế, bảo hiểm, v.v. - n=24)
     b) OOS_IRRELEVANT (công thức nấu ăn, thời tiết, giải trí, v.v. - n=6)
     c) Excludes PROMPT_INJECTION (handled by input safety guardrails, not vector cosine).
   - Sweeps theta in [0.35, 0.65] step 0.05.
   - Reports False Rejection Rate (FRR) on valid INQUIRY with Cluster Bootstrap 95% CIs.
   - Reports False Acceptance Rate (FAR / Leakage) on OOS_COMPETENT_AUTHORITY and OOS_IRRELEVANT.
   - Computes combined two-stage rejection (Intent Classifier OUT_OF_SCOPE + Vector Rejection theta).
   - Status: TẠM THỜI (dev tổng hợp, embedding_model_version="bkai_pho_bert_ft_v1").
"""

import sys
import json
import numpy as np
from collections import defaultdict
import onnxruntime as ort
from transformers import AutoTokenizer
from sklearn.linear_model import LogisticRegression

sys.stdout.reconfigure(encoding='utf-8')

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
    print("="*80)
    print("STEP G2 & G7: RIGOROUS THETA CALIBRATION & REJECTION TRADE-OFF ANALYSIS")
    print("="*80)
    
    tok = AutoTokenizer.from_pretrained("ml/models/fine_tuned_biencoder")
    sess = ort.InferenceSession("ml/models/bkai_finetuned.onnx", providers=['CPUExecutionProvider'])
    
    train_data = load_data('train')
    dev_data = load_data('dev')
    chunks = load_chunks()
    
    print("Embedding 179 legal chunks...")
    chunk_embs = run_onnx(sess, tok, [c['text'] for c in chunks])
    
    # 1. Categorize DEV samples
    inq_samples = [s for s in dev_data if s['intent'] == 'PROCEDURE_INQUIRY']
    
    # Subgroups of OUT_OF_SCOPE
    auth_keywords = ['hộ chiếu', 'đăng kiểm', 'visa', 'thuế', 'bằng lái', 'giấy phép lái xe', 'bảo hiểm xã hội', 'bhxh', 'sở giáo dục', 'công an tỉnh']
    oos_auth_samples = []
    oos_irrel_samples = []
    oos_other = []
    
    for s in dev_data:
        if s['intent'] == 'OUT_OF_SCOPE':
            t_low = s['text'].lower()
            if s.get('sub_intent') == 'OOS_COMPETENT_AUTHORITY' or any(k in t_low for k in auth_keywords):
                oos_auth_samples.append(s)
            elif s.get('sub_intent') == 'OOS_IRRELEVANT' or any(k in t_low for k in ['thời tiết', 'nấu', 'bánh mì', 'phim', 'bóng đá', 'thơ', 'hát', 'ca sĩ']):
                oos_irrel_samples.append(s)
            else:
                oos_auth_samples.append(s) # default administrative OOS
                
    print(f"Dev sample split:")
    print(f"  - Valid PROCEDURE_INQUIRY: N = {len(inq_samples)}")
    print(f"  - OOS Competent Authority (hộ chiếu, bằng lái, thuế, đăng kiểm...): N = {len(oos_auth_samples)}")
    print(f"  - OOS Irrelevant (thời tiết, giải trí, trò chuyện...): N = {len(oos_irrel_samples)}")
    
    # 2. Extract query embeddings
    inq_embs = run_onnx(sess, tok, [s['text'] for s in inq_samples])
    oos_auth_embs = run_onnx(sess, tok, [s['text'] for s in oos_auth_samples])
    oos_irrel_embs = run_onnx(sess, tok, [s['text'] for s in oos_irrel_samples]) if oos_irrel_samples else np.empty((0, 768))
    
    # 3. Compute S_max (max cosine similarity with legal chunks)
    sim_inq = np.dot(inq_embs, chunk_embs.T)
    max_s_inq = np.max(sim_inq, axis=1)
    
    sim_oos_auth = np.dot(oos_auth_embs, chunk_embs.T)
    max_s_oos_auth = np.max(sim_oos_auth, axis=1)
    
    max_s_oos_irrel = np.max(np.dot(oos_irrel_embs, chunk_embs.T), axis=1) if len(oos_irrel_samples) > 0 else np.array([])
    
    print("\n--- S_max Distribution Statistics ---")
    print(f"  Valid INQUIRY (N={len(inq_samples)}):")
    print(f"    Mean = {np.mean(max_s_inq):.4f} | Std = {np.std(max_s_inq):.4f} | Median = {np.median(max_s_inq):.4f}")
    print(f"    Min = {np.min(max_s_inq):.4f} | P10 = {np.percentile(max_s_inq, 10):.4f} | P25 = {np.percentile(max_s_inq, 25):.4f} | Max = {np.max(max_s_inq):.4f}")
    
    print(f"\n  OOS Competent Authority (N={len(oos_auth_samples)}):")
    print(f"    Mean = {np.mean(max_s_oos_auth):.4f} | Std = {np.std(max_s_oos_auth):.4f} | Median = {np.median(max_s_oos_auth):.4f}")
    print(f"    Min = {np.min(max_s_oos_auth):.4f} | P75 = {np.percentile(max_s_oos_auth, 75):.4f} | P90 = {np.percentile(max_s_oos_auth, 90):.4f} | Max = {np.max(max_s_oos_auth):.4f}")
    
    if len(max_s_oos_irrel) > 0:
        print(f"\n  OOS Irrelevant (N={len(oos_irrel_samples)}):")
        print(f"    Mean = {np.mean(max_s_oos_irrel):.4f} | Std = {np.std(max_s_oos_irrel):.4f} | Max = {np.max(max_s_oos_irrel):.4f}")

    # Train Classifier to measure two-stage rejection
    train_texts = [s['text'] for s in train_data]
    y_train = [s['intent'] for s in train_data]
    X_train = run_onnx(sess, tok, train_texts)
    clf = LogisticRegression(max_iter=1000, class_weight='balanced', C=1.0, random_state=42)
    clf.fit(X_train, y_train)
    
    # Predict on Dev OOS and INQUIRY
    clf_inq_preds = clf.predict(inq_embs)
    clf_oos_auth_preds = clf.predict(oos_auth_embs)
    clf_oos_irrel_preds = clf.predict(oos_irrel_embs) if len(oos_irrel_samples) > 0 else []

    # 4. Sweep Theta in [0.35, 0.65] step 0.05
    print("\n--- THETA SWEEP & TRADE-OFF CURVE ---")
    print(f"{'theta':<8} | {'FRR (Valid)':<18} | {'95% CI':<20} | {'FAR (Auth OOS)':<16} | {'FAR (Irrel OOS)':<16} | {'Two-Stage Leakage'}")
    print("-" * 105)
    
    # Attach metadata for cluster bootstrap
    inq_eval = [{'group_id': s['group_id'], 's_max': max_s_inq[i], 'clf_pred': clf_inq_preds[i]} for i, s in enumerate(inq_samples)]
    auth_eval = [{'group_id': s['group_id'], 's_max': max_s_oos_auth[i], 'clf_pred': clf_oos_auth_preds[i]} for i, s in enumerate(oos_auth_samples)]
    
    sweep_table = []
    
    for th in [0.35, 0.40, 0.45, 0.50, 0.52, 0.55, 0.58, 0.60, 0.65]:
        th = round(float(th), 2)
        # Vector-only FRR on valid INQUIRY (rejected because S_max < th)
        frr_vec = np.mean(max_s_inq < th)
        
        def frr_fn(sample):
            return np.mean([it['s_max'] < th for it in sample])
        ci_frr = cluster_bootstrap_ci(inq_eval, frr_fn)
        
        # Vector-only FAR on OOS (leaked because S_max >= th)
        far_auth_vec = np.mean(max_s_oos_auth >= th) if len(max_s_oos_auth) > 0 else 0.0
        far_irrel_vec = np.mean(max_s_oos_irrel >= th) if len(max_s_oos_irrel) > 0 else 0.0
        
        # Two-stage Leakage: An OOS query leaks to LLM ONLY IF:
        # 1. Intent classifier does NOT label it OUT_OF_SCOPE, AND
        # 2. Vector retrieval S_max >= theta
        leaked_auth_two_stage = sum(1 for i in range(len(oos_auth_samples)) if clf_oos_auth_preds[i] != 'OUT_OF_SCOPE' and max_s_oos_auth[i] >= th)
        rate_auth_two_stage = leaked_auth_two_stage / len(oos_auth_samples) if len(oos_auth_samples) > 0 else 0.0
        
        leaked_irrel_two_stage = sum(1 for i in range(len(oos_irrel_samples)) if clf_oos_irrel_preds[i] != 'OUT_OF_SCOPE' and max_s_oos_irrel[i] >= th)
        rate_irrel_two_stage = leaked_irrel_two_stage / len(oos_irrel_samples) if len(oos_irrel_samples) > 0 else 0.0
        
        sweep_table.append({
            "theta": th,
            "frr_valid": round(float(frr_vec), 4),
            "frr_95_ci": ci_frr,
            "far_auth_vector_only": round(float(far_auth_vec), 4),
            "far_irrel_vector_only": round(float(far_irrel_vec), 4),
            "leakage_two_stage_auth": round(float(rate_auth_two_stage), 4),
            "leakage_two_stage_irrel": round(float(rate_irrel_two_stage), 4)
        })
        
        print(f"{th:<8.2f} | {frr_vec:<18.2%} | [{ci_frr[0]:.2%}, {ci_frr[1]:.2%}]  | {far_auth_vec:<16.2%} | {far_irrel_vec:<16.2%} | Auth: {rate_auth_two_stage:.2%} | Irrel: {rate_irrel_two_stage:.2%}")

    # Analysis of theta_lower
    print("\n--- THETA_LOWER CALIBRATION (HITL / Gray-Zone Verification Queue) ---")
    print("If theta_lower <= S_max < theta: Send to ai_feedback_queue for officer review + gentle citizen guidance.")
    # Choose theta = 0.50 as balanced operating point, test theta_lower = 0.40 vs 0.45
    for th_low, th_high in [(0.40, 0.50), (0.42, 0.50), (0.45, 0.50), (0.45, 0.55)]:
        inq_gray = sum(1 for s in max_s_inq if th_low <= s < th_high)
        oos_gray = sum(1 for s in max_s_oos_auth if th_low <= s < th_high)
        print(f"  Range [{th_low:.2f}, {th_high:.2f}): Valid INQUIRY in gray zone: {inq_gray}/{len(inq_samples)} ({inq_gray/len(inq_samples):.2%}) | OOS Auth in gray zone: {oos_gray}/{len(oos_auth_samples)} ({oos_gray/len(oos_auth_samples):.2%})")

    # Save to file
    out_payload = {
        "status": "TẠM THỜI (dev tổng hợp, kiểm tra pipeline)",
        "embedding_model_version": "bkai_pho_bert_ft_v1",
        "model_file": "ml/models/bkai_finetuned.onnx",
        "in_domain_stats": {
            "n": len(inq_samples),
            "mean": round(float(np.mean(max_s_inq)), 4),
            "std": round(float(np.std(max_s_inq)), 4),
            "median": round(float(np.median(max_s_inq)), 4),
            "min": round(float(np.min(max_s_inq)), 4),
            "max": round(float(np.max(max_s_inq)), 4)
        },
        "oos_auth_stats": {
            "n": len(oos_auth_samples),
            "mean": round(float(np.mean(max_s_oos_auth)), 4),
            "std": round(float(np.std(max_s_oos_auth)), 4),
            "median": round(float(np.median(max_s_oos_auth)), 4),
            "min": round(float(np.min(max_s_oos_auth)), 4),
            "max": round(float(np.max(max_s_oos_auth)), 4)
        },
        "sweep_table": sweep_table,
        "recommended_thresholds": {
            "theta": 0.50,
            "theta_lower": 0.42,
            "frr_at_theta": round(float(np.mean(max_s_inq < 0.50)), 4),
            "two_stage_auth_leakage": round(float(sum(1 for i in range(len(oos_auth_samples)) if clf_oos_auth_preds[i] != 'OUT_OF_SCOPE' and max_s_oos_auth[i] >= 0.50) / len(oos_auth_samples)), 4)
        }
    }
    with open("ml/runs/g7_theta_calibration.json", "w", encoding="utf-8") as f:
        json.dump(out_payload, f, indent=2, ensure_ascii=False)
    print("\n[OK] Results written to ml/runs/g7_theta_calibration.json")

if __name__ == '__main__':
    main()
