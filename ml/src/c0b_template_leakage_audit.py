#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step C0b: Template Leakage & Prefix Artifact Audit
1. Measures classifier accuracy & Macro F1 using ONLY the first N words (N=1, 2, 3)
   to detect if intent classification is artificially relying on template prefix cues.
2. For every held-out sample (n=228), finds the nearest train sample (using TF-IDF lexical similarity)
   and checks whether they share identical phrasing/template structure.
"""

import sys
import json
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sklearn.metrics.pairwise import cosine_similarity

sys.stdout.reconfigure(encoding='utf-8')

CLASSES = ['GREETING', 'PROCEDURE_CATALOG', 'COMMUNE_INFO', 'OUT_OF_SCOPE', 'AMBIGUOUS', 'PROCEDURE_INQUIRY']

def load_data(split_name: str):
    with open(f'ml/data/{split_name}.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def run_prefix_artifact_check():
    print("="*75)
    print("STEP C0b: TEMPLATE LEAKAGE & PREFIX ARTIFACT AUDIT")
    print("="*75)
    
    train = load_data('train')
    dev = load_data('dev')
    heldout = load_data('heldout')
    
    y_train = [s['intent'] for s in train]
    y_dev = [s['intent'] for s in dev]
    
    # --------------------------------------------------------------------------
    # 1. CLASSIFIER USING ONLY FIRST N WORDS
    # --------------------------------------------------------------------------
    print("\n--- 1. CLASSIFIER ACCURACY USING ONLY FIRST N WORDS ---")
    prefix_results = {}
    
    for n_words in [1, 2, 3]:
        train_prefixes = [" ".join(s['text'].strip().split()[:n_words]).lower() for s in train]
        dev_prefixes = [" ".join(s['text'].strip().split()[:n_words]).lower() for s in dev]
        
        vec = CountVectorizer(ngram_range=(1, n_words), binary=True)
        X_tr = vec.fit_transform(train_prefixes)
        X_dv = vec.transform(dev_prefixes)
        
        clf = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
        clf.fit(X_tr, y_train)
        preds = clf.predict(X_dv)
        
        acc = accuracy_score(y_dev, preds)
        _, _, macro_f1, _ = precision_recall_fscore_support(y_dev, preds, average='macro', zero_division=0)
        
        prefix_results[f"first_{n_words}_words"] = {
            "accuracy": round(float(acc), 4),
            "macro_f1": round(float(macro_f1), 4)
        }
        print(f"  Only First {n_words} word(s): Accuracy = {acc:.2%} | Macro F1 = {macro_f1:.2%}")
        
    # Full sentence lexical for comparison
    vec_full = CountVectorizer(ngram_range=(1, 2), binary=True)
    X_tr_full = vec_full.fit_transform([s['text'].lower() for s in train])
    X_dv_full = vec_full.transform([s['text'].lower() for s in dev])
    clf_full = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
    clf_full.fit(X_tr_full, y_train)
    preds_full = clf_full.predict(X_dv_full)
    acc_full = accuracy_score(y_dev, preds_full)
    _, _, f1_full, _ = precision_recall_fscore_support(y_dev, preds_full, average='macro', zero_division=0)
    print(f"  Full text (Bag-of-words):   Accuracy = {acc_full:.2%} | Macro F1 = {f1_full:.2%}")

    # --------------------------------------------------------------------------
    # 2. NEAREST TRAIN MATCH FOR EVERY HELDOUT QUERY
    # --------------------------------------------------------------------------
    print("\n--- 2. NEAREST TRAIN SAMPLE FOR HELDOUT SAMPLES (TF-IDF LEXICAL) ---")
    tfidf = TfidfVectorizer(ngram_range=(1, 3), sublinear_tf=True)
    all_texts = [s['text'] for s in train + heldout]
    tfidf.fit(all_texts)
    
    train_mat = tfidf.transform([s['text'] for s in train])
    heldout_mat = tfidf.transform([s['text'] for s in heldout])
    
    sims = cosine_similarity(heldout_mat, train_mat)
    
    identical_template_count = 0
    nearest_records = []
    
    for h_idx, h_item in enumerate(heldout):
        scores = sims[h_idx]
        best_tr_idx = int(np.argmax(scores))
        best_score = float(scores[best_tr_idx])
        tr_item = train[best_tr_idx]
        
        # Check template similarity
        same_intent = (h_item['intent'] == tr_item['intent'])
        same_proc = (h_item.get('procedure_code') == tr_item.get('procedure_code'))
        
        # Check word overlap pattern
        h_words = set(h_item['text'].lower().split())
        tr_words = set(tr_item['text'].lower().split())
        jaccard = len(h_words.intersection(tr_words)) / len(h_words.union(tr_words))
        
        is_near_clone = (best_score > 0.80 and jaccard > 0.70)
        if is_near_clone:
            identical_template_count += 1
            
        nearest_records.append({
            "heldout_id": h_item['id'],
            "heldout_text": h_item['text'],
            "heldout_intent": h_item['intent'],
            "heldout_proc": h_item.get('procedure_code'),
            "nearest_train_id": tr_item['id'],
            "nearest_train_text": tr_item['text'],
            "nearest_train_intent": tr_item['intent'],
            "nearest_train_proc": tr_item.get('procedure_code'),
            "tfidf_similarity": round(best_score, 4),
            "jaccard_similarity": round(jaccard, 4),
            "is_near_clone": is_near_clone
        })
        
    print(f"  Total Held-out samples: {len(heldout)}")
    print(f"  Samples with TF-IDF sim > 0.80 & Jaccard > 0.70 to Train: {identical_template_count} / {len(heldout)} ({identical_template_count/len(heldout):.2%})")
    
    # Sort by similarity to inspect top nearest pairs
    nearest_records.sort(key=lambda x: -x['tfidf_similarity'])
    print("\nTop 5 Closest Heldout-Train Pairs:")
    for r in nearest_records[:5]:
        print(f"  [Sim: {r['tfidf_similarity']:.4f} | Jaccard: {r['jaccard_similarity']:.4f}]")
        print(f"    Heldout ({r['heldout_id']}): {r['heldout_text']}")
        print(f"    Train   ({r['nearest_train_id']}): {r['nearest_train_text']}")
        
    report = {
        "prefix_classifier_leakage": prefix_results,
        "full_text_bow": {
            "accuracy": round(float(acc_full), 4),
            "macro_f1": round(float(f1_full), 4)
        },
        "heldout_train_overlap": {
            "total_heldout": len(heldout),
            "near_clones_count": identical_template_count,
            "near_clones_pct": round(identical_template_count / len(heldout) * 100, 2),
            "top_closest_pairs": nearest_records[:20]
        }
    }
    
    with open('ml/runs/c0b_template_leakage_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
        
    print("\nSaved C0b report to ml/runs/c0b_template_leakage_report.json")

if __name__ == '__main__':
    run_prefix_artifact_check()
