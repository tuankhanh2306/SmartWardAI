#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Column 2: Raw Bi-Encoder + Logistic Regression Baseline
Evaluates on DEV split:
1. Retrieval Metrics: Recall@1, Recall@3, MRR on 179 legal_chunks
2. Intent Classification Metrics: Accuracy, Macro F1, Per-class P/R/F1 using Logistic Regression trained on raw embeddings
3. 95% Bootstrap Confidence Intervals
"""

import sys
import json
import time
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from sentence_transformers import SentenceTransformer

CLASSES = [
    'GREETING',
    'PROCEDURE_CATALOG',
    'COMMUNE_INFO',
    'OUT_OF_SCOPE',
    'AMBIGUOUS',
    'PROCEDURE_INQUIRY'
]

def load_data(split_name: str):
    with open(f'ml/data/{split_name}.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_legal_chunks():
    with open('ml/data/legal_inventory.json', 'r', encoding='utf-8') as f:
        inventory = json.load(f)
    chunks = []
    for p in inventory:
        for c in p['chunks']:
            text = f"{p['name']}. {c.get('title', '')}. {c.get('legalReference', '')}. {c.get('content', '')}"
            chunks.append({
                "chunk_id": c['chunkId'],
                "procedure_code": p['code'],
                "chunk_type": c['chunkType'],
                "text": text.strip()
            })
    return chunks

def run_evaluation(model_name: str = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', n_bootstrap: int = 1000, seed: int = 42, output_path: str = 'ml/runs/col2_biencoder_raw_dev_report.json'):
    print(f"Loading Bi-Encoder model: {model_name}...")
    t0 = time.time()
    model = SentenceTransformer(model_name)
    load_time = time.time() - t0
    print(f"Model loaded in {load_time:.2f}s.")
    
    train_data = load_data('train')
    dev_data = load_data('dev')
    chunks = load_legal_chunks()
    
    chunk_texts = [c['text'] for c in chunks]
    print(f"Embedding {len(chunks)} legal chunks...")
    chunk_embeddings = model.encode(chunk_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    # --------------------------------------------------------------------------
    # 1. RETRIEVAL EVALUATION ON DEV (INQUIRY queries)
    # --------------------------------------------------------------------------
    dev_inquiry = [s for s in dev_data if s['intent'] == 'PROCEDURE_INQUIRY']
    inq_texts = [s['text'] for s in dev_inquiry]
    
    print(f"Embedding {len(inq_texts)} DEV inquiry queries...")
    query_embeddings = model.encode(inq_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    # Similarity matrix: (n_queries, n_chunks)
    sim_matrix = np.dot(query_embeddings, chunk_embeddings.T)
    
    rec1_list = []
    rec3_list = []
    mrr_list = []
    
    proc_rec1_list = []
    proc_rec3_list = []
    proc_mrr_list = []
    
    for i, s in enumerate(dev_inquiry):
        gold_chunks = set(s['gold_chunk_ids'])
        gold_proc = s['procedure_code']
        
        sims = sim_matrix[i]
        top_indices = np.argsort(-sims)
        
        # Chunk-level retrieval
        top1_chunk = chunks[top_indices[0]]['chunk_id']
        top3_chunks = [chunks[idx]['chunk_id'] for idx in top_indices[:3]]
        
        r1 = 1.0 if top1_chunk in gold_chunks else 0.0
        r3 = 1.0 if any(c in gold_chunks for c in top3_chunks) else 0.0
        
        rank = None
        for r_idx, idx in enumerate(top_indices):
            if chunks[idx]['chunk_id'] in gold_chunks:
                rank = r_idx + 1
                break
        mrr = (1.0 / rank) if rank else 0.0
        
        rec1_list.append(r1)
        rec3_list.append(r3)
        mrr_list.append(mrr)
        
        # Procedure-level retrieval
        top1_proc = chunks[top_indices[0]]['procedure_code']
        top3_procs = [chunks[idx]['procedure_code'] for idx in top_indices[:3]]
        
        pr1 = 1.0 if top1_proc == gold_proc else 0.0
        pr3 = 1.0 if gold_proc in top3_procs else 0.0
        
        p_rank = None
        for r_idx, idx in enumerate(top_indices):
            if chunks[idx]['procedure_code'] == gold_proc:
                p_rank = r_idx + 1
                break
        p_mrr = (1.0 / p_rank) if p_rank else 0.0
        
        proc_rec1_list.append(pr1)
        proc_rec3_list.append(pr3)
        proc_mrr_list.append(p_mrr)

    # --------------------------------------------------------------------------
    # 2. INTENT CLASSIFICATION VIA LOGISTIC REGRESSION ON RAW EMBEDDINGS
    # --------------------------------------------------------------------------
    train_texts = [s['text'] for s in train_data]
    dev_texts = [s['text'] for s in dev_data]
    
    y_train = [s['intent'] for s in train_data]
    y_dev = [s['intent'] for s in dev_data]
    
    print("Embedding Train and Dev texts for Intent Classifier...")
    X_train = model.encode(train_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    X_dev = model.encode(dev_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    clf = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=seed)
    clf.fit(X_train, y_train)
    
    dev_preds = clf.predict(X_dev)
    dev_probs = clf.predict_proba(X_dev)
    
    acc = accuracy_score(y_dev, dev_preds)
    p_cls, r_cls, f1_cls, supp = precision_recall_fscore_support(y_dev, dev_preds, labels=CLASSES, zero_division=0)
    p_m, r_m, f1_m, _ = precision_recall_fscore_support(y_dev, dev_preds, average='macro', zero_division=0)
    
    # --------------------------------------------------------------------------
    # 3. BOOTSTRAP CONFIDENCE INTERVALS (B=1000)
    # --------------------------------------------------------------------------
    np.random.seed(seed)
    n_dev = len(y_dev)
    boot_accs = []
    boot_f1s = []
    
    for _ in range(n_bootstrap):
        b_idx = np.random.choice(np.arange(n_dev), size=n_dev, replace=True)
        b_true = [y_dev[i] for i in b_idx]
        b_pred = [dev_preds[i] for i in b_idx]
        boot_accs.append(accuracy_score(b_true, b_pred))
        _, _, bf1, _ = precision_recall_fscore_support(b_true, b_pred, average='macro', zero_division=0)
        boot_f1s.append(bf1)
        
    ci_acc = [round(float(np.percentile(boot_accs, 2.5)), 4), round(float(np.percentile(boot_accs, 97.5)), 4)]
    ci_f1 = [round(float(np.percentile(boot_f1s, 2.5)), 4), round(float(np.percentile(boot_f1s, 97.5)), 4)]
    
    # Bootstrap retrieval
    n_inq = len(dev_inquiry)
    boot_r1 = []
    boot_r3 = []
    boot_mrr = []
    for _ in range(n_bootstrap):
        b_idx = np.random.choice(np.arange(n_inq), size=n_inq, replace=True)
        boot_r1.append(np.mean([proc_rec1_list[i] for i in b_idx]))
        boot_r3.append(np.mean([proc_rec3_list[i] for i in b_idx]))
        boot_mrr.append(np.mean([proc_mrr_list[i] for i in b_idx]))
        
    ci_pr1 = [round(float(np.percentile(boot_r1, 2.5)), 4), round(float(np.percentile(boot_r1, 97.5)), 4)]
    ci_pr3 = [round(float(np.percentile(boot_r3, 2.5)), 4), round(float(np.percentile(boot_r3, 97.5)), 4)]
    ci_pmrr = [round(float(np.percentile(boot_mrr, 2.5)), 4), round(float(np.percentile(boot_mrr, 97.5)), 4)]
    
    cm = confusion_matrix(y_dev, dev_preds, labels=CLASSES)
    
    report = {
        "model_name": model_name,
        "n_dev_samples": n_dev,
        "n_dev_inquiry_samples": n_inq,
        "retrieval_procedure_level": {
            "recall_at_1": round(float(np.mean(proc_rec1_list)), 4),
            "recall_at_1_95ci": ci_pr1,
            "recall_at_3": round(float(np.mean(proc_rec3_list)), 4),
            "recall_at_3_95ci": ci_pr3,
            "mrr": round(float(np.mean(proc_mrr_list)), 4),
            "mrr_95ci": ci_pmrr
        },
        "retrieval_chunk_level": {
            "recall_at_1": round(float(np.mean(rec1_list)), 4),
            "recall_at_3": round(float(np.mean(rec3_list)), 4),
            "mrr": round(float(np.mean(mrr_list)), 4)
        },
        "intent_classification": {
            "accuracy": round(float(acc), 4),
            "accuracy_95ci": ci_acc,
            "macro_f1": round(float(f1_m), 4),
            "macro_f1_95ci": ci_f1,
            "per_class": {
                c: {
                    "precision": round(float(p_cls[i]), 4),
                    "recall": round(float(r_cls[i]), 4),
                    "f1": round(float(f1_cls[i]), 4),
                    "support": int(supp[i])
                }
                for i, c in enumerate(CLASSES)
            },
            "confusion_matrix": {
                "classes": CLASSES,
                "matrix": cm.tolist()
            }
        }
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
        
    return report

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Evaluate Bi-Encoder baseline on DEV")
    parser.add_argument('--model', type=str, default='sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
    parser.add_argument('--output', type=str, default='ml/runs/col2_biencoder_raw_dev_report.json')
    args = parser.parse_args()

    sys.stdout.reconfigure(encoding='utf-8')
    rep = run_evaluation(model_name=args.model, output_path=args.output)
    print("\n" + "="*60)
    print("COLUMN 2: RAW BI-ENCODER + LOGISTIC REGRESSION (DEV SPLIT)")
    print("="*60)
    print(f"Model: {rep['model_name']}")
    print("\n[RETRIEVAL - PROCEDURE LEVEL (40 TTHC)]")
    ret = rep['retrieval_procedure_level']
    print(f"  Recall@1: {ret['recall_at_1']:.2%} (95% CI: [{ret['recall_at_1_95ci'][0]:.2%}, {ret['recall_at_1_95ci'][1]:.2%}])")
    print(f"  Recall@3: {ret['recall_at_3']:.2%} (95% CI: [{ret['recall_at_3_95ci'][0]:.2%}, {ret['recall_at_3_95ci'][1]:.2%}])")
    print(f"  MRR:      {ret['mrr']:.4f} (95% CI: [{ret['mrr_95ci'][0]:.4f}, {ret['mrr_95ci'][1]:.4f}])")
    print("\n[INTENT CLASSIFICATION]")
    ic = rep['intent_classification']
    print(f"  Accuracy: {ic['accuracy']:.2%} (95% CI: [{ic['accuracy_95ci'][0]:.2%}, {ic['accuracy_95ci'][1]:.2%}])")
    print(f"  Macro F1: {ic['macro_f1']:.2%} (95% CI: [{ic['macro_f1_95ci'][0]:.2%}, {ic['macro_f1_95ci'][1]:.2%}])")
    print("\nPer-Class Breakdown:")
    for c, m in ic['per_class'].items():
        print(f"  {c:20s} | P: {m['precision']:.2%} | R: {m['recall']:.2%} | F1: {m['f1']:.2%} | Supp: {m['support']}")
