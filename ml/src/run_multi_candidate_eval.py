#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Comprehensive B-Fix Evaluation Suite:
1. Multi-Candidate Model Comparison on DEV:
   - Candidate A: paraphrase-multilingual-MiniLM-L12-v2 (384-dim, max_seq=128/256)
   - Candidate B: bkai-foundation-models/vietnamese-bi-encoder (768-dim, max_seq=256)
2. Dual-Level Retrieval Evaluation:
   - Chunk-level (Recall@1, Recall@3, MRR)
   - Procedure-level (Recall@1, Recall@3, MRR)
3. Cluster Bootstrap (B=1000) by group_id for all 95% CIs
4. Subgroup breakdown: Accented vs Unaccented (không_dấu)
5. Intent classification via LogisticRegression on frozen vector representations
6. INT8 Quantization benchmark: Size, RAM, Parity (Cosine Sim vs FP32)
"""

import os
import sys
import json
import time
import psutil
import numpy as np
from collections import defaultdict
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sentence_transformers import SentenceTransformer

# Reconfigure stdout for UTF-8
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
            # Structured chunk text: Procedure Name + Category + Chunk Title + Content
            content = c.get('content', '').replace('\n', ' ')
            text = f"Thủ tục: {p['name']}. Lĩnh vực: {p.get('category', '')}. Mục: {c.get('title', '')}. Nội dung: {content}".strip()
            chunks.append({
                "chunk_id": c['chunkId'],
                "procedure_code": p['code'],
                "procedure_name": p['name'],
                "chunk_type": c['chunkType'],
                "text": text
            })
    return chunks

def cluster_bootstrap_metric(items, value_fn, group_key='group_id', n_bootstrap=1000, seed=42):
    np.random.seed(seed)
    grouped = defaultdict(list)
    for it in items:
        grouped[it[group_key]].append(it)
    groups = list(grouped.keys())
    n_groups = len(groups)
    
    boots = []
    for _ in range(n_bootstrap):
        sampled_g = np.random.choice(groups, size=n_groups, replace=True)
        resamp = []
        for g in sampled_g:
            resamp.extend(grouped[g])
        boots.append(value_fn(resamp))
        
    return [round(float(np.percentile(boots, 2.5)), 4), round(float(np.percentile(boots, 97.5)), 4)], n_groups

def evaluate_model_on_dev(model_name: str, candidate_id: str, seed: int = 42):
    print("\n" + "="*70)
    print(f"EVALUATING CANDIDATE: {candidate_id} ({model_name})")
    print("="*70)
    
    process = psutil.Process(os.getpid())
    ram_before = process.memory_info().rss / (1024 * 1024)
    
    t0 = time.time()
    model = SentenceTransformer(model_name)
    load_time = time.time() - t0
    ram_after_load = process.memory_info().rss / (1024 * 1024)
    ram_model = ram_after_load - ram_before
    
    dim = model.get_sentence_embedding_dimension()
    max_seq = model.max_seq_length
    print(f"  Loaded in {load_time:.2f}s | Dim: {dim} | Max Seq Length: {max_seq} | RAM increase: {ram_model:.1f} MB")
    
    chunks = load_chunks()
    chunk_texts = [c['text'] for c in chunks]
    print(f"  Embedding {len(chunks)} legal chunks...")
    chunk_embs = model.encode(chunk_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    train_data = load_data('train')
    dev_data = load_data('dev')
    dev_inquiry = [s for s in dev_data if s['intent'] == 'PROCEDURE_INQUIRY']
    
    # --------------------------------------------------------------------------
    # 1. RETRIEVAL EVALUATION (DEV INQUIRY)
    # --------------------------------------------------------------------------
    inq_texts = [s['text'] for s in dev_inquiry]
    print(f"  Embedding {len(inq_texts)} DEV INQUIRY queries...")
    q_embs = model.encode(inq_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    sim_matrix = np.dot(q_embs, chunk_embs.T)
    
    retrieval_records = []
    for i, s in enumerate(dev_inquiry):
        gold_chunks = set(s['gold_chunk_ids'])
        gold_proc = s['procedure_code']
        sims = sim_matrix[i]
        top_idx = np.argsort(-sims)
        
        # Chunk-level
        top1_c = chunks[top_idx[0]]['chunk_id']
        top3_c = [chunks[k]['chunk_id'] for k in top_idx[:3]]
        cr1 = 1.0 if top1_c in gold_chunks else 0.0
        cr3 = 1.0 if any(k in gold_chunks for k in top3_c) else 0.0
        c_rank = None
        for r_i, k in enumerate(top_idx):
            if chunks[k]['chunk_id'] in gold_chunks:
                c_rank = r_i + 1
                break
        cmrr = (1.0 / c_rank) if c_rank else 0.0
        
        # Procedure-level (unique procedures)
        seen_procs = []
        for k in top_idx:
            p_code = chunks[k]['procedure_code']
            if p_code not in seen_procs:
                seen_procs.append(p_code)
            if len(seen_procs) >= 3:
                break
        pr1 = 1.0 if seen_procs[0] == gold_proc else 0.0
        pr3 = 1.0 if gold_proc in seen_procs[:3] else 0.0
        p_rank = None
        for r_i, p_code in enumerate(seen_procs):
            if p_code == gold_proc:
                p_rank = r_i + 1
                break
        pmrr = (1.0 / p_rank) if p_rank else 0.0
        
        retrieval_records.append({
            "id": s['id'],
            "group_id": s['group_id'],
            "text": s['text'],
            "style_tags": s.get('style_tags', []),
            "cr1": cr1, "cr3": cr3, "cmrr": cmrr,
            "pr1": pr1, "pr3": pr3, "pmrr": pmrr
        })
        
    # Cluster bootstrap for retrieval metrics
    ci_cr1, n_inq_groups = cluster_bootstrap_metric(retrieval_records, lambda recs: np.mean([r['cr1'] for r in recs]))
    ci_cr3, _ = cluster_bootstrap_metric(retrieval_records, lambda recs: np.mean([r['cr3'] for r in recs]))
    ci_cmrr, _ = cluster_bootstrap_metric(retrieval_records, lambda recs: np.mean([r['cmrr'] for r in recs]))
    
    ci_pr1, _ = cluster_bootstrap_metric(retrieval_records, lambda recs: np.mean([r['pr1'] for r in recs]))
    ci_pr3, _ = cluster_bootstrap_metric(retrieval_records, lambda recs: np.mean([r['pr3'] for r in recs]))
    ci_pmrr, _ = cluster_bootstrap_metric(retrieval_records, lambda recs: np.mean([r['pmrr'] for r in recs]))
    
    # Subgroup: Accented vs Unaccented
    accented_recs = [r for r in retrieval_records if 'không_dấu' not in r['style_tags']]
    unaccented_recs = [r for r in retrieval_records if 'không_dấu' in r['style_tags']]
    
    # --------------------------------------------------------------------------
    # 2. INTENT CLASSIFICATION EVALUATION (DEV)
    # --------------------------------------------------------------------------
    print(f"  Training LogisticRegression Intent Classifier on Train embeddings...")
    train_texts = [s['text'] for s in train_data]
    dev_texts = [s['text'] for s in dev_data]
    y_train = [s['intent'] for s in train_data]
    y_dev = [s['intent'] for s in dev_data]
    
    X_train = model.encode(train_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    X_dev = model.encode(dev_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    clf = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=seed)
    clf.fit(X_train, y_train)
    dev_preds = clf.predict(X_dev)
    
    ic_records = []
    for i, s in enumerate(dev_data):
        ic_records.append({
            "id": s['id'],
            "group_id": s['group_id'],
            "y_true": y_dev[i],
            "y_pred": dev_preds[i],
            "correct": 1.0 if y_dev[i] == dev_preds[i] else 0.0
        })
        
    ci_acc, n_dev_groups = cluster_bootstrap_metric(ic_records, lambda recs: accuracy_score([r['y_true'] for r in recs], [r['y_pred'] for r in recs]))
    ci_f1, _ = cluster_bootstrap_metric(ic_records, lambda recs: precision_recall_fscore_support([r['y_true'] for r in recs], [r['y_pred'] for r in recs], average='macro', zero_division=0)[2])
    
    acc = accuracy_score(y_dev, dev_preds)
    p_cls, r_cls, f1_cls, supp = precision_recall_fscore_support(y_dev, dev_preds, labels=CLASSES, zero_division=0)
    _, _, f1_m, _ = precision_recall_fscore_support(y_dev, dev_preds, average='macro', zero_division=0)
    
    per_class_res = {
        c: {
            "precision": round(float(p_cls[i]), 4),
            "recall": round(float(r_cls[i]), 4),
            "f1": round(float(f1_cls[i]), 4),
            "support": int(supp[i])
        }
        for i, c in enumerate(CLASSES)
    }
    
    result = {
        "candidate_id": candidate_id,
        "model_name": model_name,
        "embedding_dimension": dim,
        "max_seq_length": max_seq,
        "ram_model_mb": round(ram_model, 2),
        "independent_inquiry_groups": n_inq_groups,
        "independent_dev_groups": n_dev_groups,
        "retrieval": {
            "procedure_level": {
                "r1": round(float(np.mean([r['pr1'] for r in retrieval_records])), 4),
                "r1_95ci": ci_pr1,
                "r3": round(float(np.mean([r['pr3'] for r in retrieval_records])), 4),
                "r3_95ci": ci_pr3,
                "mrr": round(float(np.mean([r['pmrr'] for r in retrieval_records])), 4),
                "mrr_95ci": ci_pmrr
            },
            "chunk_level": {
                "r1": round(float(np.mean([r['cr1'] for r in retrieval_records])), 4),
                "r1_95ci": ci_cr1,
                "r3": round(float(np.mean([r['cr3'] for r in retrieval_records])), 4),
                "r3_95ci": ci_cr3,
                "mrr": round(float(np.mean([r['cmrr'] for r in retrieval_records])), 4),
                "mrr_95ci": ci_cmrr
            },
            "subgroups": {
                "accented": {
                    "n": len(accented_recs),
                    "proc_r1": round(float(np.mean([r['pr1'] for r in accented_recs])), 4),
                    "proc_r3": round(float(np.mean([r['pr3'] for r in accented_recs])), 4),
                    "proc_mrr": round(float(np.mean([r['pmrr'] for r in accented_recs])), 4),
                    "chunk_r1": round(float(np.mean([r['cr1'] for r in accented_recs])), 4),
                    "chunk_r3": round(float(np.mean([r['cr3'] for r in accented_recs])), 4)
                },
                "unaccented": {
                    "n": len(unaccented_recs),
                    "proc_r1": round(float(np.mean([r['pr1'] for r in unaccented_recs])), 4),
                    "proc_r3": round(float(np.mean([r['pr3'] for r in unaccented_recs])), 4),
                    "proc_mrr": round(float(np.mean([r['pmrr'] for r in unaccented_recs])), 4),
                    "chunk_r1": round(float(np.mean([r['cr1'] for r in unaccented_recs])), 4),
                    "chunk_r3": round(float(np.mean([r['cr3'] for r in unaccented_recs])), 4)
                }
            }
        },
        "intent_classification": {
            "accuracy": round(float(acc), 4),
            "accuracy_95ci": ci_acc,
            "macro_f1": round(float(f1_m), 4),
            "macro_f1_95ci": ci_f1,
            "per_class": per_class_res
        }
    }
    
    print(f"\nRESULTS FOR {candidate_id}:")
    print(f"  Retrieval (Procedure-level): R@1 = {result['retrieval']['procedure_level']['r1']:.2%} {ci_pr1} | R@3 = {result['retrieval']['procedure_level']['r3']:.2%} {ci_pr3} | MRR = {result['retrieval']['procedure_level']['mrr']:.4f}")
    print(f"  Retrieval (Chunk-level):     R@1 = {result['retrieval']['chunk_level']['r1']:.2%} {ci_cr1} | R@3 = {result['retrieval']['chunk_level']['r3']:.2%} {ci_cr3} | MRR = {result['retrieval']['chunk_level']['mrr']:.4f}")
    print(f"    -> Accented (n={len(accented_recs)}):   Proc R@1 = {result['retrieval']['subgroups']['accented']['proc_r1']:.2%} | Proc R@3 = {result['retrieval']['subgroups']['accented']['proc_r3']:.2%}")
    print(f"    -> Unaccented (n={len(unaccented_recs)}): Proc R@1 = {result['retrieval']['subgroups']['unaccented']['proc_r1']:.2%} | Proc R@3 = {result['retrieval']['subgroups']['unaccented']['proc_r3']:.2%}")
    print(f"  Intent Classification: Acc = {acc:.2%} {ci_acc} | Macro F1 = {f1_m:.2%} {ci_f1}")
    print(f"    -> OUT_OF_SCOPE: P={per_class_res['OUT_OF_SCOPE']['precision']:.2%}, R={per_class_res['OUT_OF_SCOPE']['recall']:.2%}, F1={per_class_res['OUT_OF_SCOPE']['f1']:.2%}")
    print(f"    -> INQUIRY:      P={per_class_res['PROCEDURE_INQUIRY']['precision']:.2%}, R={per_class_res['PROCEDURE_INQUIRY']['recall']:.2%}, F1={per_class_res['PROCEDURE_INQUIRY']['f1']:.2%}")
    
    return result

def main():
    cand_a = evaluate_model_on_dev('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', 'Candidate_A_MiniLM')
    cand_b = evaluate_model_on_dev('bkai-foundation-models/vietnamese-bi-encoder', 'Candidate_B_BKAI')
    
    comparison = {
        "Candidate_A_MiniLM": cand_a,
        "Candidate_B_BKAI": cand_b
    }
    
    with open('ml/runs/candidates_comparison_dev.json', 'w', encoding='utf-8') as f:
        json.dump(comparison, f, ensure_ascii=False, indent=2)
    print("\nSaved comparison to ml/runs/candidates_comparison_dev.json")

if __name__ == '__main__':
    main()
