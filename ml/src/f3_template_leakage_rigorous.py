#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step F3: Rigorous Template Leakage & Prefix Artifact Audit
Addresses:
1. Majority Class Baseline (predicting PROCEDURE_INQUIRY on DEV):
   - Accuracy: 52.63%
   - Macro F1: 11.49%
2. Clarification on Prefix Classifiers:
   - Unweighted vs Balanced class weighting comparison (resolving the < 52.6% paradox)
3. Template-Group Cross-Validation Leakage Check:
   - Disjoint group split (Train on 60% template groups, Test on 40% unseen template groups)
"""

import sys
import json
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

CLASSES = ['GREETING', 'PROCEDURE_CATALOG', 'COMMUNE_INFO', 'OUT_OF_SCOPE', 'AMBIGUOUS', 'PROCEDURE_INQUIRY']

def load_data(split_name: str):
    with open(f'ml/data/{split_name}.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def run_f3():
    print("="*75)
    print("STEP F3: RIGOROUS TEMPLATE LEAKAGE & BASELINE AUDIT")
    print("="*75)
    
    train = load_data('train')
    dev = load_data('dev')
    
    y_train = [s['intent'] for s in train]
    y_dev = [s['intent'] for s in dev]
    
    # --------------------------------------------------------------------------
    # 1. MAJORITY CLASS BASELINE (DUMMY CLASSIFIER)
    # --------------------------------------------------------------------------
    print("\n--- 1. MAJORITY CLASS BASELINE ON DEV ---")
    dev_counts = Counter(y_dev)
    majority_class = dev_counts.most_common(1)[0][0]
    majority_count = dev_counts.most_common(1)[0][1]
    majority_acc = majority_count / len(y_dev)
    
    dummy_preds = [majority_class] * len(y_dev)
    _, _, dummy_f1, _ = precision_recall_fscore_support(y_dev, dummy_preds, average='macro', zero_division=0)
    
    print(f"  Total DEV samples: {len(y_dev)}")
    print(f"  Distribution: {dict(dev_counts)}")
    print(f"  Majority Class: '{majority_class}' ({majority_count}/{len(y_dev)} = {majority_acc:.2%})")
    print(f"  Majority Baseline Accuracy: {majority_acc:.2%}")
    print(f"  Majority Baseline Macro F1: {dummy_f1:.2%}")

    # --------------------------------------------------------------------------
    # 2. RESOLVING THE PREFIX CLASSIFIER PARADOX: UNWEIGHTED vs BALANCED
    # --------------------------------------------------------------------------
    print("\n--- 2. PREFIX CLASSIFIERS (UNWEIGHTED vs BALANCED) ---")
    prefix_results = {}
    
    for n_words in [1, 2, 3]:
        train_prefixes = [" ".join(s['text'].strip().split()[:n_words]).lower() for s in train]
        dev_prefixes = [" ".join(s['text'].strip().split()[:n_words]).lower() for s in dev]
        
        vec = CountVectorizer(ngram_range=(1, n_words), binary=True)
        X_tr = vec.fit_transform(train_prefixes)
        X_dv = vec.transform(dev_prefixes)
        
        # Mode A: Unweighted (Standard empirical risk minimization)
        clf_unweighted = LogisticRegression(max_iter=1000, random_state=42)
        clf_unweighted.fit(X_tr, y_train)
        preds_unw = clf_unweighted.predict(X_dv)
        acc_unw = accuracy_score(y_dev, preds_unw)
        f1_unw = precision_recall_fscore_support(y_dev, preds_unw, average='macro', zero_division=0)[2]
        
        # Mode B: Balanced (Penalizes majority class by ~6x)
        clf_balanced = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
        clf_balanced.fit(X_tr, y_train)
        preds_bal = clf_balanced.predict(X_dv)
        acc_bal = accuracy_score(y_dev, preds_bal)
        f1_bal = precision_recall_fscore_support(y_dev, preds_bal, average='macro', zero_division=0)[2]
        
        prefix_results[f"prefix_{n_words}_words"] = {
            "unweighted_accuracy": round(float(acc_unw), 4),
            "unweighted_macro_f1": round(float(f1_unw), 4),
            "balanced_accuracy": round(float(acc_bal), 4),
            "balanced_macro_f1": round(float(f1_bal), 4)
        }
        
        print(f"  First {n_words} word(s):")
        print(f"    - Unweighted: Accuracy = {acc_unw:.2%} (vs Majority {majority_acc:.2%}) | Macro F1 = {f1_unw:.2%}")
        print(f"    - Balanced:   Accuracy = {acc_bal:.2%} (Penalized majority) | Macro F1 = {f1_bal:.2%}")

    # --------------------------------------------------------------------------
    # 3. TEMPLATE-GROUP DISJOINT SPLIT CHECK
    # --------------------------------------------------------------------------
    print("\n--- 3. TEMPLATE-GROUP DISJOINT EXPERIMENT ---")
    # All train + dev
    all_samples = train + dev
    groups = list(set(s['group_id'] for s in all_samples))
    np.random.seed(42)
    np.random.shuffle(groups)
    
    split_idx = int(len(groups) * 0.70)
    train_groups = set(groups[:split_idx])
    test_groups = set(groups[split_idx:])
    
    tr_subset = [s for s in all_samples if s['group_id'] in train_groups]
    te_subset = [s for s in all_samples if s['group_id'] in test_groups]
    
    tfidf = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)
    X_tr_disjoint = tfidf.fit_transform([s['text'] for s in tr_subset])
    X_te_disjoint = tfidf.transform([s['text'] for s in te_subset])
    
    y_tr_d = [s['intent'] for s in tr_subset]
    y_te_d = [s['intent'] for s in te_subset]
    
    clf_d = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
    clf_d.fit(X_tr_disjoint, y_tr_d)
    preds_d = clf_d.predict(X_te_disjoint)
    
    acc_d = accuracy_score(y_te_d, preds_d)
    f1_d = precision_recall_fscore_support(y_te_d, preds_d, average='macro', zero_division=0)[2]
    
    print(f"  Train on {len(train_groups)} groups ({len(tr_subset)} samples) -> Test on {len(test_groups)} UNSEEN groups ({len(te_subset)} samples):")
    print(f"  Disjoint Group Test Accuracy: {acc_d:.2%} | Macro F1: {f1_d:.2%}")

    report = {
        "majority_class_baseline": {
            "majority_class": majority_class,
            "majority_count": majority_count,
            "total_dev": len(y_dev),
            "accuracy": round(float(majority_acc), 4),
            "macro_f1": round(float(dummy_f1), 4)
        },
        "prefix_leakage_audit": prefix_results,
        "disjoint_template_experiment": {
            "n_train_groups": len(train_groups),
            "n_test_groups": len(test_groups),
            "n_train_samples": len(tr_subset),
            "n_test_samples": len(te_subset),
            "disjoint_accuracy": round(float(acc_d), 4),
            "disjoint_macro_f1": round(float(f1_d), 4)
        }
    }
    
    with open('ml/runs/f3_template_leakage_audit.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
        
    print("\nSaved F3 report to ml/runs/f3_template_leakage_audit.json")

if __name__ == '__main__':
    run_f3()
