#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Retrieval Diagnostics & Multi-Model Evaluation
Investigates:
1. Measurement levels: Chunk-level vs Procedure-level on ALL columns
2. Root causes of low baseline retrieval:
   - Truncation analysis: max_seq_length (128 vs 256 vs 512) and token length distribution
   - Chunk text representation (full legal clutter vs structured header + content)
   - Accented vs Unaccented queries breakdown
3. BM25 & TF-IDF baselines as anchor sanity checks
4. Multi-model comparison on DEV:
   - Candidate A: paraphrase-multilingual-MiniLM-L12-v2 (384-dim)
   - Candidate B: bkai-foundation-models/vietnamese-bi-encoder (768-dim)
5. Cluster Bootstrap (by group_id) for accurate 95% Confidence Intervals
"""

import sys
import json
import time
import unicodedata
import numpy as np
from collections import defaultdict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

sys.stdout.reconfigure(encoding='utf-8')

CLASSES = ['GREETING', 'PROCEDURE_CATALOG', 'COMMUNE_INFO', 'OUT_OF_SCOPE', 'AMBIGUOUS', 'PROCEDURE_INQUIRY']

def load_data(split_name: str):
    with open(f'ml/data/{split_name}.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_inventory():
    with open('ml/data/legal_inventory.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def build_chunk_variants(inventory):
    """
    Variant 1: Raw concatenation (as previously used)
    Variant 2: Clean semantic header: Procedure Name + Category + Chunk Title + Content (pruned boilerplate citations)
    """
    v1_chunks = []
    v2_chunks = []
    for p in inventory:
        for c in p['chunks']:
            # V1: raw
            raw_text = f"{p['name']}. {c.get('title', '')}. {c.get('legalReference', '')}. {c.get('content', '')}".strip()
            v1_chunks.append({
                "chunk_id": c['chunkId'],
                "procedure_code": p['code'],
                "procedure_name": p['name'],
                "chunk_type": c['chunkType'],
                "text": raw_text
            })
            # V2: structured semantic representation
            content = c.get('content', '').replace('\n', ' ')
            v2_text = f"Thủ tục: {p['name']}. Phần: {c.get('title', '')}. Nội dung: {content}".strip()
            v2_chunks.append({
                "chunk_id": c['chunkId'],
                "procedure_code": p['code'],
                "procedure_name": p['name'],
                "chunk_type": c['chunkType'],
                "text": v2_text
            })
    return v1_chunks, v2_chunks

# ------------------------------------------------------------------------------
# RETRIEVAL EVALUATION HELPER (Computes both Chunk-level & Procedure-level)
# ------------------------------------------------------------------------------
def evaluate_retrieval_matrix(sim_matrix, queries_data, chunks):
    """
    sim_matrix: (n_queries, n_chunks)
    """
    chunk_r1, chunk_r3, chunk_mrr = [], [], []
    proc_r1, proc_r3, proc_mrr = [], [], []
    
    # Store indices for sub-analyses
    details = []

    for i, s in enumerate(queries_data):
        gold_chunks = set(s['gold_chunk_ids'])
        gold_proc = s['procedure_code']
        
        sims = sim_matrix[i]
        top_indices = np.argsort(-sims)
        
        # 1. Chunk-level
        top1_c = chunks[top_indices[0]]['chunk_id']
        top3_c = [chunks[idx]['chunk_id'] for idx in top_indices[:3]]
        cr1 = 1.0 if top1_c in gold_chunks else 0.0
        cr3 = 1.0 if any(c in gold_chunks for c in top3_c) else 0.0
        c_rank = None
        for r_idx, idx in enumerate(top_indices):
            if chunks[idx]['chunk_id'] in gold_chunks:
                c_rank = r_idx + 1
                break
        cmrr = (1.0 / c_rank) if c_rank else 0.0
        chunk_r1.append(cr1)
        chunk_r3.append(cr3)
        chunk_mrr.append(cmrr)
        
        # 2. Procedure-level
        top1_p = chunks[top_indices[0]]['procedure_code']
        # For Top-3 procedures, collect unique procedures in ranking order
        seen_procs = []
        for idx in top_indices:
            p_code = chunks[idx]['procedure_code']
            if p_code not in seen_procs:
                seen_procs.append(p_code)
            if len(seen_procs) >= 3:
                break
        pr1 = 1.0 if top1_p == gold_proc else 0.0
        pr3 = 1.0 if gold_proc in seen_procs[:3] else 0.0
        
        p_rank = None
        for r_idx, p_code in enumerate(seen_procs):
            if p_code == gold_proc:
                p_rank = r_idx + 1
                break
        pmrr = (1.0 / p_rank) if p_rank else 0.0
        proc_r1.append(pr1)
        proc_r3.append(pr3)
        proc_mrr.append(pmrr)
        
        details.append({
            "id": s['id'],
            "group_id": s['group_id'],
            "text": s['text'],
            "gold_proc": gold_proc,
            "top1_proc": top1_p,
            "gold_chunks": list(gold_chunks),
            "top1_chunk": top1_c,
            "style_tags": s.get('style_tags', []),
            "chunk_r1": cr1,
            "chunk_r3": cr3,
            "chunk_mrr": cmrr,
            "proc_r1": pr1,
            "proc_r3": pr3,
            "proc_mrr": pmrr
        })
        
    return {
        "chunk_level": {
            "r1": np.mean(chunk_r1),
            "r3": np.mean(chunk_r3),
            "mrr": np.mean(chunk_mrr),
            "r1_list": chunk_r1,
            "r3_list": chunk_r3,
            "mrr_list": chunk_mrr
        },
        "proc_level": {
            "r1": np.mean(proc_r1),
            "r3": np.mean(proc_r3),
            "mrr": np.mean(proc_mrr),
            "r1_list": proc_r1,
            "r3_list": proc_r3,
            "mrr_list": proc_mrr
        },
        "details": details
    }

# ------------------------------------------------------------------------------
# CLUSTER BOOTSTRAP (By group_id)
# ------------------------------------------------------------------------------
def cluster_bootstrap(items, metric_func, group_key='group_id', n_bootstrap=1000, seed=42):
    """
    Resamples clusters (group_id) with replacement.
    """
    np.random.seed(seed)
    # Group items by group_key
    grouped = defaultdict(list)
    for it in items:
        grouped[it[group_key]].append(it)
        
    groups = list(grouped.keys())
    n_groups = len(groups)
    
    boot_metrics = []
    for _ in range(n_bootstrap):
        sampled_groups = np.random.choice(groups, size=n_groups, replace=True)
        resampled_items = []
        for g in sampled_groups:
            resampled_items.extend(grouped[g])
        boot_metrics.append(metric_func(resampled_items))
        
    ci_low = float(np.percentile(boot_metrics, 2.5))
    ci_high = float(np.percentile(boot_metrics, 97.5))
    return [round(ci_low, 4), round(ci_high, 4)], n_groups

# ------------------------------------------------------------------------------
# 1. BM25 / TF-IDF BASELINE
# ------------------------------------------------------------------------------
def run_tfidf_baseline(queries, chunks):
    print("\n--- RUNNING TF-IDF / N-GRAM RETRIEVAL BASELINE ---")
    corpus = [c['text'] for c in chunks]
    vectorizer = TfidfVectorizer(ngram_range=(1, 3), max_features=10000, sublinear_tf=True)
    chunk_vecs = vectorizer.fit_transform(corpus)
    
    query_texts = [q['text'] for q in queries]
    query_vecs = vectorizer.transform(query_texts)
    
    sim_matrix = cosine_similarity(query_vecs, chunk_vecs)
    res = evaluate_retrieval_matrix(sim_matrix, queries, chunks)
    return res

# ------------------------------------------------------------------------------
# MAIN DIAGNOSTIC WORKFLOW
# ------------------------------------------------------------------------------
def main():
    inventory = load_inventory()
    v1_chunks, v2_chunks = build_chunk_variants(inventory)
    dev_data = load_data('dev')
    dev_inquiry = [s for s in dev_data if s['intent'] == 'PROCEDURE_INQUIRY']
    
    print(f"Loaded DEV: {len(dev_data)} samples total, {len(dev_inquiry)} PROCEDURE_INQUIRY.")
    
    # Check group distribution
    inq_groups = set(s['group_id'] for s in dev_inquiry)
    print(f"Independent group_ids in DEV INQUIRY: {len(inq_groups)} groups.")
    
    # --------------------------------------------------------------------------
    # 1. TF-IDF BASELINE on V1 vs V2 chunks
    # --------------------------------------------------------------------------
    tfidf_v1 = run_tfidf_baseline(dev_inquiry, v1_chunks)
    print(f"TF-IDF (V1 Raw Chunks):")
    print(f"  Procedure-Level: Recall@1 = {tfidf_v1['proc_level']['r1']:.2%} | Recall@3 = {tfidf_v1['proc_level']['r3']:.2%} | MRR = {tfidf_v1['proc_level']['mrr']:.4f}")
    print(f"  Chunk-Level:     Recall@1 = {tfidf_v1['chunk_level']['r1']:.2%} | Recall@3 = {tfidf_v1['chunk_level']['r3']:.2%} | MRR = {tfidf_v1['chunk_level']['mrr']:.4f}")
    
    tfidf_v2 = run_tfidf_baseline(dev_inquiry, v2_chunks)
    print(f"TF-IDF (V2 Structured Chunks):")
    print(f"  Procedure-Level: Recall@1 = {tfidf_v2['proc_level']['r1']:.2%} | Recall@3 = {tfidf_v2['proc_level']['r3']:.2%} | MRR = {tfidf_v2['proc_level']['mrr']:.4f}")
    print(f"  Chunk-Level:     Recall@1 = {tfidf_v2['chunk_level']['r1']:.2%} | Recall@3 = {tfidf_v2['chunk_level']['r3']:.2%} | MRR = {tfidf_v2['chunk_level']['mrr']:.4f}")
    
    # Breakdown TF-IDF by accent
    acc_items = [d for d in tfidf_v2['details'] if 'khong_dau' not in d['style_tags']]
    no_acc_items = [d for d in tfidf_v2['details'] if 'khong_dau' in d['style_tags']]
    print(f"\nTF-IDF V2 by Accent:")
    print(f"  Accented (n={len(acc_items)}):   Proc R@1 = {np.mean([d['proc_r1'] for d in acc_items]):.2%} | Proc R@3 = {np.mean([d['proc_r3'] for d in acc_items]):.2%}")
    print(f"  Unaccented (n={len(no_acc_items)}): Proc R@1 = {np.mean([d['proc_r1'] for d in no_acc_items]):.2%} | Proc R@3 = {np.mean([d['proc_r3'] for d in no_acc_items]):.2%}")

    # Save intermediate diagnostics
    diagnostics = {
        "n_dev_inquiry": len(dev_inquiry),
        "n_inquiry_groups": len(inq_groups),
        "tfidf_v1": {
            "proc_level": {"r1": tfidf_v1['proc_level']['r1'], "r3": tfidf_v1['proc_level']['r3'], "mrr": tfidf_v1['proc_level']['mrr']},
            "chunk_level": {"r1": tfidf_v1['chunk_level']['r1'], "r3": tfidf_v1['chunk_level']['r3'], "mrr": tfidf_v1['chunk_level']['mrr']}
        },
        "tfidf_v2": {
            "proc_level": {"r1": tfidf_v2['proc_level']['r1'], "r3": tfidf_v2['proc_level']['r3'], "mrr": tfidf_v2['proc_level']['mrr']},
            "chunk_level": {"r1": tfidf_v2['chunk_level']['r1'], "r3": tfidf_v2['chunk_level']['r3'], "mrr": tfidf_v2['chunk_level']['mrr']}
        }
    }
    
    with open('ml/runs/retrieval_diagnostics_tfidf.json', 'w', encoding='utf-8') as f:
        json.dump(diagnostics, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
