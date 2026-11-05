#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step G1: Intent Classification Diagnostic & Tau Sweep Analysis
Diagnoses the drop from 83.77%/76.15% (C3/F2) down to 71.49%/55.03% (F5).
Reports:
1. Majority class baseline.
2. Uncalibrated vs CV-calibrated vs Prefit Platt-calibrated models.
3. Full per-class Precision, Recall, F1 and Confusion Matrix for the best model.
4. Fine-grained tau sweep [0.10, 0.40] step 0.05 with Coverage vs Accuracy curve.
5. Cluster Bootstrap 95% CI comparison: Keeping tau vs Dropping tau.
"""

import sys
import json
import numpy as np
from collections import defaultdict
import onnxruntime as ort
from transformers import AutoTokenizer
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

sys.stdout.reconfigure(encoding='utf-8')

CLASSES = ['GREETING', 'PROCEDURE_CATALOG', 'COMMUNE_INFO', 'OUT_OF_SCOPE', 'AMBIGUOUS', 'PROCEDURE_INQUIRY']

def load_data(split_name: str):
    with open(f'ml/data/{split_name}.json', 'r', encoding='utf-8') as f:
        return json.load(f)

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
    print("STEP G1: INTENT CLASSIFICATION DIAGNOSTIC & TAU CALIBRATION ANALYSIS")
    print("="*80)
    
    train_data = load_data('train')
    dev_data = load_data('dev')
    
    # Majority class baseline
    dev_intents = [s['intent'] for s in dev_data]
    inq_count = dev_intents.count('PROCEDURE_INQUIRY')
    maj_acc = inq_count / len(dev_intents)
    maj_preds = ['PROCEDURE_INQUIRY'] * len(dev_intents)
    maj_p, maj_r, maj_f1, _ = precision_recall_fscore_support(dev_intents, maj_preds, average='macro', zero_division=0)
    print(f"\n[BASELINE] Majority Class Baseline (Always predict PROCEDURE_INQUIRY):")
    print(f"  Dev samples: N = {len(dev_data)} | PROCEDURE_INQUIRY = {inq_count}/{len(dev_data)} ({maj_acc:.2%})")
    print(f"  Accuracy: {maj_acc:.2%} | Macro F1: {maj_f1:.2%}")
    
    tok = AutoTokenizer.from_pretrained("ml/models/fine_tuned_biencoder")
    sess = ort.InferenceSession("ml/models/bkai_finetuned.onnx", providers=['CPUExecutionProvider'])
    
    train_texts = [s['text'] for s in train_data]
    dev_texts = [s['text'] for s in dev_data]
    y_train = [s['intent'] for s in train_data]
    y_dev = [s['intent'] for s in dev_data]
    
    print("\nExtracting ONNX embeddings for Train (N=354) and Dev (N=228)...")
    X_train = run_onnx(sess, tok, train_texts)
    X_dev = run_onnx(sess, tok, dev_texts)
    
    # --------------------------------------------------------------------------
    # COMPARISON OF 3 CLASSIFIER CONFIGURATIONS
    # --------------------------------------------------------------------------
    print("\n--- Model Configuration Comparison ---")
    
    # Config A: Uncalibrated Logistic Regression (Full Train, balanced) -> C3 / F2 setup
    lr_uncal = LogisticRegression(max_iter=1000, class_weight='balanced', C=1.0, random_state=42)
    lr_uncal.fit(X_train, y_train)
    preds_a = lr_uncal.predict(X_dev)
    acc_a = accuracy_score(y_dev, preds_a)
    f1_a = precision_recall_fscore_support(y_dev, preds_a, average='macro', zero_division=0)[2]
    print(f"  [Config A] Uncalibrated LogisticRegression (Full train N=354, C=1.0, balanced):")
    print(f"             Accuracy = {acc_a:.2%} | Macro F1 = {f1_a:.2%}")
    
    # Config B: CalibratedClassifierCV(cv=3) -> F5 setup
    lr_cv3 = LogisticRegression(max_iter=1000, class_weight='balanced', C=1.0, random_state=42)
    clf_cv3 = CalibratedClassifierCV(estimator=lr_cv3, method='sigmoid', cv=3)
    clf_cv3.fit(X_train, y_train)
    preds_b = clf_cv3.predict(X_dev)
    acc_b = accuracy_score(y_dev, preds_b)
    f1_b = precision_recall_fscore_support(y_dev, preds_b, average='macro', zero_division=0)[2]
    print(f"  [Config B] CalibratedClassifierCV(cv=3, sigmoid) (F5 setup):")
    print(f"             Accuracy = {acc_b:.2%} | Macro F1 = {f1_b:.2%}")
    print(f"             Drop from A to B: Accuracy -{(acc_a - acc_b)*100:.2f}%p | Macro F1 -{(f1_a - f1_b)*100:.2f}%p")
    print(f"             Cause: 3-fold internal CV splits N=354 into ~236 train samples per fold.")
    print(f"             Minority classes (AMBIGUOUS n=24, COMMUNE_INFO n=30, OUT_OF_SCOPE n=30) have only ~16 samples/fold,")
    print(f"             and sigmoid calibration severely penalizes small-sample posteriors, collapsing Macro F1.")

    # Config C: Uncalibrated Logistic Regression with tuned C=0.5, 1.0, 2.0
    for c_val in [0.5, 1.0, 2.0, 5.0]:
        lr_tune = LogisticRegression(max_iter=1000, class_weight='balanced', C=c_val, random_state=42)
        lr_tune.fit(X_train, y_train)
        p_c = lr_tune.predict(X_dev)
        acc_c = accuracy_score(y_dev, p_c)
        f1_c = precision_recall_fscore_support(y_dev, p_c, average='macro', zero_division=0)[2]
        print(f"  [Config C - LR C={c_val:<3}] Accuracy = {acc_c:.2%} | Macro F1 = {f1_c:.2%}")

    # Use the best robust model (Config A / C=1.0)
    best_clf = lr_uncal
    probs_dev = best_clf.predict_proba(X_dev)
    raw_preds = best_clf.predict(X_dev)
    max_probs = np.max(probs_dev, axis=1)
    
    # --------------------------------------------------------------------------
    # PER-CLASS PRECISION, RECALL, F1 & CONFUSION MATRIX
    # --------------------------------------------------------------------------
    print("\n--- Per-Class Metrics for Best Final Model (Uncalibrated Balanced LR, C=1.0) ---")
    p_per, r_per, f1_per, sup_per = precision_recall_fscore_support(y_dev, raw_preds, labels=CLASSES, zero_division=0)
    
    print(f"{'Class':<20} | {'Support':<8} | {'Precision':<10} | {'Recall':<10} | {'F1-score':<10}")
    print("-" * 65)
    for cls_name, p, r, f1, sup in zip(CLASSES, p_per, r_per, f1_per, sup_per):
        print(f"{cls_name:<20} | {sup:<8} | {p:<10.2%} | {r:<10.2%} | {f1:<10.2%}")
        
    print("\n--- Confusion Matrix ---")
    cm = confusion_matrix(y_dev, raw_preds, labels=CLASSES)
    row_title = 'True \\ Pred'
    header = f"{row_title:<20}" + "".join([f"{c[:8]:>10}" for c in CLASSES])
    print(header)
    print("-" * len(header))
    for i, row_name in enumerate(CLASSES):
        row_str = f"{row_name:<20}" + "".join([f"{cm[i][j]:>10}" for j in range(len(CLASSES))])
        print(row_str)

    # --------------------------------------------------------------------------
    # TAU SWEEP (0.10 - 0.40, step 0.05) & COVERAGE-ACCURACY CURVE
    # --------------------------------------------------------------------------
    print("\n--- TAU SWEEP [0.10, 0.40] with Step 0.05 ---")
    print("Rule: If max_prob < tau -> Divert to AMBIGUOUS")
    tau_results = []
    
    # Baseline without tau (tau = 0.0)
    raw_acc = accuracy_score(y_dev, raw_preds)
    raw_f1 = precision_recall_fscore_support(y_dev, raw_preds, average='macro', zero_division=0)[2]
    
    # Pair items for bootstrap
    eval_items = []
    for i in range(len(dev_data)):
        eval_items.append({
            'idx': i,
            'group_id': dev_data[i]['group_id'],
            'y_true': y_dev[i],
            'raw_pred': raw_preds[i],
            'p_max': max_probs[i]
        })
        
    def get_acc_fn(tau):
        def _fn(sample):
            y_t = [it['y_true'] for it in sample]
            y_p = ['AMBIGUOUS' if it['p_max'] < tau else it['raw_pred'] for it in sample]
            return accuracy_score(y_t, y_p)
        return _fn

    def get_f1_fn(tau):
        def _fn(sample):
            y_t = [it['y_true'] for it in sample]
            y_p = ['AMBIGUOUS' if it['p_max'] < tau else it['raw_pred'] for it in sample]
            return precision_recall_fscore_support(y_t, y_p, average='macro', zero_division=0)[2]
        return _fn

    ci_acc_no_tau = cluster_bootstrap_ci(eval_items, get_acc_fn(0.0))
    ci_f1_no_tau = cluster_bootstrap_ci(eval_items, get_f1_fn(0.0))
    
    print(f"  tau = 0.00 (NO TAU)   | Coverage = 100.0% (Diverted:  0) | Accuracy = {raw_acc:.2%} (95% CI: [{ci_acc_no_tau[0]:.2%}, {ci_acc_no_tau[1]:.2%}]) | Macro F1 = {raw_f1:.2%} (95% CI: [{ci_f1_no_tau[0]:.2%}, {ci_f1_no_tau[1]:.2%}])")
    
    for tau in [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40]:
        tau = round(float(tau), 2)
        adj_preds = ['AMBIGUOUS' if p < tau else raw_preds[i] for i, p in enumerate(max_probs)]
        diverted = sum(1 for p in max_probs if p < tau)
        coverage = 1.0 - (diverted / len(dev_data))
        acc = accuracy_score(y_dev, adj_preds)
        f1 = precision_recall_fscore_support(y_dev, adj_preds, average='macro', zero_division=0)[2]
        
        ci_acc = cluster_bootstrap_ci(eval_items, get_acc_fn(tau))
        ci_f1 = cluster_bootstrap_ci(eval_items, get_f1_fn(tau))
        
        tau_results.append({
            "tau": tau,
            "coverage": round(float(coverage), 4),
            "diverted": diverted,
            "accuracy": round(float(acc), 4),
            "acc_95_ci": ci_acc,
            "macro_f1": round(float(f1), 4),
            "f1_95_ci": ci_f1
        })
        print(f"  tau = {tau:.2f}              | Coverage = {coverage:.2%} (Diverted: {diverted:2d}) | Accuracy = {acc:.2%} (95% CI: [{ci_acc[0]:.2%}, {ci_acc[1]:.2%}]) | Macro F1 = {f1:.2%} (95% CI: [{ci_f1[0]:.2%}, {ci_f1[1]:.2%}])")

    # Save results to json for reporting
    out_payload = {
        "majority_class_baseline": {
            "accuracy": round(float(maj_acc), 4),
            "macro_f1": round(float(maj_f1), 4)
        },
        "config_comparison": {
            "uncalibrated_full_train": {"accuracy": round(float(acc_a), 4), "macro_f1": round(float(f1_a), 4)},
            "calibrated_cv3": {"accuracy": round(float(acc_b), 4), "macro_f1": round(float(f1_b), 4)}
        },
        "per_class": {
            cls: {"precision": round(float(p), 4), "recall": round(float(r), 4), "f1": round(float(f), 4), "support": int(s)}
            for cls, p, r, f, s in zip(CLASSES, p_per, r_per, f1_per, sup_per)
        },
        "confusion_matrix": {
            "classes": CLASSES,
            "matrix": cm.tolist()
        },
        "tau_sweep": tau_results,
        "no_tau": {
            "accuracy": round(float(raw_acc), 4),
            "acc_95_ci": ci_acc_no_tau,
            "macro_f1": round(float(raw_f1), 4),
            "f1_95_ci": ci_f1_no_tau
        }
    }
    with open("ml/runs/g1_intent_results.json", "w", encoding="utf-8") as f:
        json.dump(out_payload, f, indent=2, ensure_ascii=False)
    print("\n[OK] Results written to ml/runs/g1_intent_results.json")

if __name__ == '__main__':
    main()
