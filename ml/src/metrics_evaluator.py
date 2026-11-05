#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Metrics Evaluator & Bootstrap Confidence Interval Computer
Calculates:
- Confusion Matrix
- Per-class Precision, Recall, F1
- Macro & Weighted F1
- Procedure Accuracy / Top-1 Recall on INQUIRY
- 95% Bootstrap Confidence Interval (B=1000 resamples)
- Error breakdown by style_tags
"""

import sys
import json
import numpy as np
from collections import defaultdict, Counter
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support, accuracy_score

CLASSES = [
    'GREETING',
    'PROCEDURE_CATALOG',
    'COMMUNE_INFO',
    'OUT_OF_SCOPE',
    'AMBIGUOUS',
    'PROCEDURE_INQUIRY'
]

def evaluate_predictions(pred_file_path: str, dataset_file_path: str = None, n_bootstrap: int = 1000, seed: int = 42):
    np.random.seed(seed)
    with open(pred_file_path, 'r', encoding='utf-8') as f:
        preds = json.load(f)
        
    meta_by_id = {}
    if dataset_file_path:
        with open(dataset_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            meta_by_id = {s['id']: s for s in data}
            
    y_true = [p['true_intent'] for p in preds]
    y_pred = [p['pred_intent'] for p in preds]
    n = len(y_true)
    
    # 1. Point metrics
    acc = accuracy_score(y_true, y_pred)
    p_cls, r_cls, f1_cls, supp = precision_recall_fscore_support(y_true, y_pred, labels=CLASSES, zero_division=0)
    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(y_true, y_pred, average='macro', zero_division=0)
    
    # Procedure accuracy on true INQUIRY
    inq_true = [p for p in preds if p['true_intent'] == 'PROCEDURE_INQUIRY']
    inq_acc = sum(1 for p in inq_true if p.get('correct_proc') is True) / len(inq_true) if inq_true else 0.0
    
    # 2. Bootstrap 95% CI (B=1000)
    boot_accs = []
    boot_f1_macros = []
    boot_inq_accs = []
    
    indices = np.arange(n)
    for _ in range(n_bootstrap):
        boot_idx = np.random.choice(indices, size=n, replace=True)
        b_true = [y_true[i] for i in boot_idx]
        b_pred = [y_pred[i] for i in boot_idx]
        
        b_acc = accuracy_score(b_true, b_pred)
        _, _, b_f1_m, _ = precision_recall_fscore_support(b_true, b_pred, average='macro', zero_division=0)
        boot_accs.append(b_acc)
        boot_f1_macros.append(b_f1_m)
        
        # Bootstrap inq
        b_inq_samples = [preds[i] for i in boot_idx if preds[i]['true_intent'] == 'PROCEDURE_INQUIRY']
        if b_inq_samples:
            b_inq_acc = sum(1 for p in b_inq_samples if p.get('correct_proc') is True) / len(b_inq_samples)
            boot_inq_accs.append(b_inq_acc)
            
    ci_acc = (np.percentile(boot_accs, 2.5), np.percentile(boot_accs, 97.5))
    ci_f1_macro = (np.percentile(boot_f1_macros, 2.5), np.percentile(boot_f1_macros, 97.5))
    ci_inq = (np.percentile(boot_inq_accs, 2.5), np.percentile(boot_inq_accs, 97.5)) if boot_inq_accs else (0, 0)
    
    # 3. Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=CLASSES)
    
    # 4. Error Analysis
    errors = []
    error_styles = Counter()
    for p in preds:
        if p['true_intent'] != p['pred_intent'] or (p['true_intent'] == 'PROCEDURE_INQUIRY' and not p.get('correct_proc')):
            sid = p['id']
            styles = meta_by_id.get(sid, {}).get('style_tags', [])
            for st in styles:
                error_styles[st] += 1
            errors.append({
                "id": sid,
                "text": p['text'],
                "true_intent": p['true_intent'],
                "pred_intent": p['pred_intent'],
                "true_proc": p.get('true_proc'),
                "pred_proc": p.get('pred_proc'),
                "style_tags": styles
            })
            
    report = {
        "n_samples": n,
        "n_bootstrap": n_bootstrap,
        "overall_accuracy": round(float(acc), 4),
        "overall_accuracy_95ci": [round(float(ci_acc[0]), 4), round(float(ci_acc[1]), 4)],
        "macro_f1": round(float(f1_macro), 4),
        "macro_f1_95ci": [round(float(ci_f1_macro[0]), 4), round(float(ci_f1_macro[1]), 4)],
        "procedure_match_accuracy": round(float(inq_acc), 4),
        "procedure_match_95ci": [round(float(ci_inq[0]), 4), round(float(ci_inq[1]), 4)],
        "per_class": {
            cls_name: {
                "precision": round(float(p_cls[i]), 4),
                "recall": round(float(r_cls[i]), 4),
                "f1": round(float(f1_cls[i]), 4),
                "support": int(supp[i])
            }
            for i, cls_name in enumerate(CLASSES)
        },
        "confusion_matrix": {
            "classes": CLASSES,
            "matrix": cm.tolist()
        },
        "total_errors": len(errors),
        "error_styles_distribution": dict(error_styles),
        "errors_sample": errors[:10]
    }
    
    return report

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    pred_path = sys.argv[1] if len(sys.argv) > 1 else 'ml/runs/col1_rule_dev_predictions.json'
    data_path = sys.argv[2] if len(sys.argv) > 2 else 'ml/data/dev.json'
    rep = evaluate_predictions(pred_path, data_path)
    
    print("="*60)
    print("EVALUATION METRICS & BOOTSTRAP 95% CONFIDENCE INTERVALS")
    print("="*60)
    print(f"File evaluated: {pred_path}")
    print(f"Total samples:  {rep['n_samples']}")
    print(f"Accuracy:       {rep['overall_accuracy']:.2%} (95% CI: [{rep['overall_accuracy_95ci'][0]:.2%}, {rep['overall_accuracy_95ci'][1]:.2%}])")
    print(f"Macro F1:       {rep['macro_f1']:.2%} (95% CI: [{rep['macro_f1_95ci'][0]:.2%}, {rep['macro_f1_95ci'][1]:.2%}])")
    print(f"Proc Match Acc: {rep['procedure_match_accuracy']:.2%} (95% CI: [{rep['procedure_match_95ci'][0]:.2%}, {rep['procedure_match_95ci'][1]:.2%}])")
    print("\nPer-Class Breakdown:")
    for c, m in rep['per_class'].items():
        print(f"  {c:20s} | P: {m['precision']:.2%} | R: {m['recall']:.2%} | F1: {m['f1']:.2%} | Support: {m['support']}")
    print("\nTotal Errors:", rep['total_errors'])
    print("Error Styles:", rep['error_styles_distribution'])
