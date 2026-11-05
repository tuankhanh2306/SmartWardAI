#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step G5: Rigorous Ablation Study on Fine-Tuned Model
Evaluates incremental components on DEV (120 INQUIRY queries across 40 groups):
1. dense_raw: Dense direct retrieval on raw chunks (179 chunks)
2. dense_subchunks: (+) Sub-chunking (<= 200 tokens)
3. hybrid_rrf: (+) Reciprocal Rank Fusion (Dense + TF-IDF)
4. dual_unaccented: (+) Dual-form unaccented normalization
5. layer2_rules: (+) Layer-2 heuristic rules (catalog keywords & section routing)

Reports:
- Accented queries (n=80) vs Unaccented queries (n=40) vs Combined (n=120)
- Procedure Recall@1, Recall@3, MRR
- Chunk Recall@1, Chunk Recall@3, Chunk MRR
- 95% Cluster Bootstrap Confidence Intervals (grouped by group_id)
"""

import sys
import json
import re
import unicodedata
import numpy as np
from collections import defaultdict
from sklearn.feature_extraction.text import TfidfVectorizer
import onnxruntime as ort
from transformers import AutoTokenizer

sys.stdout.reconfigure(encoding='utf-8')

def remove_accents(input_str: str) -> str:
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    res = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    return res.replace('đ', 'd').replace('Đ', 'D')

def load_data(split_name: str):
    with open(f'ml/data/{split_name}.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_inventory():
    with open('ml/data/legal_inventory.json', 'r', encoding='utf-8') as f:
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
    print("="*85)
    print("STEP G5: RIGOROUS ABLATION STUDY ON FINE-TUNED BI-ENCODER (DEV N=120)")
    print("="*85)
    
    tok = AutoTokenizer.from_pretrained("ml/models/fine_tuned_biencoder")
    sess = ort.InferenceSession("ml/models/bkai_finetuned.onnx", providers=['CPUExecutionProvider'])
    
    dev_data = load_data('dev')
    dev_inquiry = [s for s in dev_data if s['intent'] == 'PROCEDURE_INQUIRY']
    inventory = load_inventory()
    
    # 1. Prepare Raw Chunks (179 chunks)
    raw_chunks = []
    for p in inventory:
        for c in p['chunks']:
            content = c.get('content', '').replace('\n', ' ')
            text = f"Thủ tục: {p['name']}. Lĩnh vực: {p.get('category', '')}. Mục: {c.get('title', '')}. Nội dung: {content}".strip()
            raw_chunks.append({
                "chunk_id": c['chunkId'],
                "procedure_code": p['code'],
                "chunk_type": c.get('chunkType', ''),
                "text": text,
                "text_unaccented": remove_accents(text)
            })
            
    # 2. Prepare Sub-chunks (splitting long chunks <= 200 tokens)
    sub_chunks = []
    for c in raw_chunks:
        words = c['text'].split()
        if len(words) <= 150:
            sub_chunks.append(c)
        else:
            prefix = " ".join(words[:15]) # keep prefix
            step = 120
            for start_idx in range(0, len(words), step):
                end_idx = min(start_idx + 140, len(words))
                sub_text = (prefix + " ... " if start_idx > 0 else "") + " ".join(words[start_idx:end_idx])
                sub_chunks.append({
                    "chunk_id": c['chunk_id'],
                    "procedure_code": c['procedure_code'],
                    "chunk_type": c['chunk_type'],
                    "text": sub_text,
                    "text_unaccented": remove_accents(sub_text)
                })
                if end_idx >= len(words):
                    break

    print(f"Loaded {len(raw_chunks)} raw chunks -> {len(sub_chunks)} sub-chunks.")
    
    # Query subsets
    accented_idx = [i for i, s in enumerate(dev_inquiry) if s.get('is_unaccented') is not True and not (s['text'] == remove_accents(s['text']) and any(c in 'aeouid' for c in s['text']))]
    # More robust: check if original text equals unaccented version
    unaccented_idx = [i for i, s in enumerate(dev_inquiry) if s['text'].lower() == remove_accents(s['text'].lower())]
    accented_idx = [i for i in range(len(dev_inquiry)) if i not in unaccented_idx]
    
    print(f"Dev Inquiry split: Accented = {len(accented_idx)} | Unaccented = {len(unaccented_idx)} | Total = {len(dev_inquiry)}")
    
    # Pre-embed queries
    q_texts = [s['text'] for s in dev_inquiry]
    q_embs_dense = run_onnx(sess, tok, q_texts)
    
    # Dual unaccented query embs
    q_texts_dual = [f"{s['text']} {remove_accents(s['text'])}" for s in dev_inquiry]
    q_embs_dual = run_onnx(sess, tok, q_texts_dual)

    # Pre-embed chunk corpuses
    raw_chunk_embs = run_onnx(sess, tok, [c['text'] for c in raw_chunks])
    sub_chunk_embs = run_onnx(sess, tok, [c['text'] for c in sub_chunks])
    sub_chunk_dual_embs = run_onnx(sess, tok, [f"{c['text']} {c['text_unaccented']}" for c in sub_chunks])
    
    # TF-IDF Vectorizer
    tfidf_vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
    tfidf_corpus = [f"{c['text']} {c['text_unaccented']}" for c in sub_chunks]
    tfidf_matrix = tfidf_vectorizer.fit_transform(tfidf_corpus)
    tfidf_q = tfidf_vectorizer.transform(q_texts_dual)
    tfidf_sims = (tfidf_q * tfidf_matrix.T).toarray()

    # Define Evaluation Function
    def evaluate_ranks(rankings, name="Config"):
        # rankings: list of list of chunk_id ordered by rank for each query
        all_metrics = {"ALL": {}, "ACC": {}, "UNACC": {}}
        subsets = {
            "ALL": list(range(len(dev_inquiry))),
            "ACC": accented_idx,
            "UNACC": unaccented_idx
        }
        
        chunk_map = {c['chunk_id']: c['procedure_code'] for c in raw_chunks}
        
        for sname, s_indices in subsets.items():
            pr1, pr3, pmrr = [], [], []
            cr1, cr3, cmrr = [], [], []
            eval_items = []
            
            for i in s_indices:
                s = dev_inquiry[i]
                gold_chunks = set(s['gold_chunk_ids'])
                gold_proc = s['procedure_code']
                ranked_c = rankings[i]
                
                # Deduplicate procedures in ranking
                seen_procs = []
                for cid in ranked_c:
                    pcode = chunk_map.get(cid)
                    if pcode and pcode not in seen_procs:
                        seen_procs.append(pcode)
                        
                top1_p = seen_procs[0] if seen_procs else None
                top3_p = seen_procs[:3]
                p_r1 = 1.0 if top1_p == gold_proc else 0.0
                p_r3 = 1.0 if gold_proc in top3_p else 0.0
                p_rank = (seen_procs.index(gold_proc) + 1) if gold_proc in seen_procs else None
                p_mrr = (1.0 / p_rank) if p_rank else 0.0
                
                top1_c = ranked_c[0] if ranked_c else None
                top3_c = ranked_c[:3]
                c_r1 = 1.0 if top1_c in gold_chunks else 0.0
                c_r3 = 1.0 if any(k in gold_chunks for k in top3_c) else 0.0
                c_rank = None
                for r_i, cid in enumerate(ranked_c):
                    if cid in gold_chunks:
                        c_rank = r_i + 1
                        break
                c_mrr = (1.0 / c_rank) if c_rank else 0.0
                
                pr1.append(p_r1); pr3.append(p_r3); pmrr.append(p_mrr)
                cr1.append(c_r1); cr3.append(c_r3); cmrr.append(c_mrr)
                eval_items.append({
                    'group_id': s['group_id'],
                    'pr1': p_r1, 'pr3': p_r3, 'pmrr': p_mrr,
                    'cr1': c_r1, 'cr3': c_r3, 'cmrr': c_mrr
                })
                
            ci_pr3 = cluster_bootstrap_ci(eval_items, lambda sm: np.mean([it['pr3'] for it in sm]))
            ci_cmrr = cluster_bootstrap_ci(eval_items, lambda sm: np.mean([it['cmrr'] for it in sm]))
            
            all_metrics[sname] = {
                "proc_r1": round(float(np.mean(pr1)), 4),
                "proc_r3": round(float(np.mean(pr3)), 4),
                "proc_r3_95_ci": ci_pr3,
                "proc_mrr": round(float(np.mean(pmrr)), 4),
                "chunk_r1": round(float(np.mean(cr1)), 4),
                "chunk_r3": round(float(np.mean(cr3)), 4),
                "chunk_mrr": round(float(np.mean(cmrr)), 4),
                "chunk_mrr_95_ci": ci_cmrr
            }
        return all_metrics

    results = {}
    
    # --------------------------------------------------------------------------
    # 1. DENSE RAW (Baseline Dense)
    # --------------------------------------------------------------------------
    print("\nEvaluating 1. Dense Raw Chunks...")
    sim_raw = np.dot(q_embs_dense, raw_chunk_embs.T)
    rankings_1 = []
    for i in range(len(dev_inquiry)):
        top_idx = np.argsort(-sim_raw[i])
        rankings_1.append([raw_chunks[k]['chunk_id'] for k in top_idx])
    results["1_dense_raw"] = evaluate_ranks(rankings_1, "1_dense_raw")
    
    # --------------------------------------------------------------------------
    # 2. DENSE + SUB-CHUNKING
    # --------------------------------------------------------------------------
    print("Evaluating 2. Dense + Sub-chunking...")
    sim_sub = np.dot(q_embs_dense, sub_chunk_embs.T)
    rankings_2 = []
    for i in range(len(dev_inquiry)):
        scores = sim_sub[i]
        top_idx = np.argsort(-scores)
        # Deduplicate chunk_ids keeping best score
        seen_c = []
        for k in top_idx:
            cid = sub_chunks[k]['chunk_id']
            if cid not in seen_c:
                seen_c.append(cid)
        rankings_2.append(seen_c)
    results["2_dense_subchunks"] = evaluate_ranks(rankings_2, "2_dense_subchunks")

    # --------------------------------------------------------------------------
    # 3. (+) HYBRID SEARCH (RRF Dense + TF-IDF)
    # --------------------------------------------------------------------------
    print("Evaluating 3. (+) Hybrid Search RRF...")
    k_rrf = 60
    rankings_3 = []
    for i in range(len(dev_inquiry)):
        dense_scores = sim_sub[i]
        dense_rank = np.argsort(-dense_scores)
        tfidf_scores = tfidf_sims[i]
        tfidf_rank = np.argsort(-tfidf_scores)
        
        rrf_scores = defaultdict(float)
        for r, idx in enumerate(dense_rank[:100]):
            rrf_scores[idx] += 1.0 / (k_rrf + r + 1)
        for r, idx in enumerate(tfidf_rank[:100]):
            rrf_scores[idx] += 1.0 / (k_rrf + r + 1)
            
        sorted_sub = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
        seen_c = []
        for k in sorted_sub:
            cid = sub_chunks[k]['chunk_id']
            if cid not in seen_c:
                seen_c.append(cid)
        rankings_3.append(seen_c)
    results["3_hybrid_rrf"] = evaluate_ranks(rankings_3, "3_hybrid_rrf")

    # --------------------------------------------------------------------------
    # 4. (+) DUAL-FORM UNACCENTED NORMALIZATION
    # --------------------------------------------------------------------------
    print("Evaluating 4. (+) Dual-form Unaccented Normalization...")
    sim_dual = np.dot(q_embs_dual, sub_chunk_dual_embs.T)
    rankings_4 = []
    for i in range(len(dev_inquiry)):
        dense_scores = sim_dual[i]
        dense_rank = np.argsort(-dense_scores)
        tfidf_scores = tfidf_sims[i]
        tfidf_rank = np.argsort(-tfidf_scores)
        
        rrf_scores = defaultdict(float)
        for r, idx in enumerate(dense_rank[:100]):
            rrf_scores[idx] += 1.0 / (k_rrf + r + 1)
        for r, idx in enumerate(tfidf_rank[:100]):
            rrf_scores[idx] += 1.0 / (k_rrf + r + 1)
            
        sorted_sub = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
        seen_c = []
        for k in sorted_sub:
            cid = sub_chunks[k]['chunk_id']
            if cid not in seen_c:
                seen_c.append(cid)
        rankings_4.append(seen_c)
    results["4_dual_unaccented"] = evaluate_ranks(rankings_4, "4_dual_unaccented")

    # --------------------------------------------------------------------------
    # 5. (+) LAYER-2 HEURISTIC RULES (Section routing: hồ sơ, lệ phí, thời hạn)
    # --------------------------------------------------------------------------
    print("Evaluating 5. (+) Layer-2 Heuristic Rules...")
    section_keywords = {
        'REQUIRED_DOCUMENTS': ['giấy tờ', 'hồ sơ', 'mang theo', 'cần những gì', 'chuẩn bị gì', 'bản sao', 'nộp gì'],
        'FEES': ['bao nhiêu tiền', 'lệ phí', 'phí', 'mất phí', 'chi phí', 'tiền'],
        'TIMELINES_AND_RESULTS': ['mất bao lâu', 'thời hạn', 'bao nhiêu ngày', 'khi nào có', 'trả kết quả'],
        'LEGAL_BASIS': ['căn cứ', 'luật nào', 'nghị định', 'thông tư']
    }
    
    rankings_5 = []
    for i in range(len(dev_inquiry)):
        base_c = list(rankings_4[i])
        q_low = dev_inquiry[i]['text'].lower()
        
        # Detect target chunkType
        target_type = None
        for ctype, kws in section_keywords.items():
            if any(kw in q_low for kw in kws):
                target_type = ctype
                break
                
        if target_type:
            # Boost chunks of target_type within top-5 candidate procedures
            boosted = []
            rest = []
            chunk_type_map = {c['chunk_id']: c['chunk_type'] for c in raw_chunks}
            for cid in base_c:
                if chunk_type_map.get(cid) == target_type:
                    boosted.append(cid)
                else:
                    rest.append(cid)
            # Interleave boosted to front of each procedure
            rankings_5.append(boosted + rest)
        else:
            rankings_5.append(base_c)
            
    results["5_layer2_rules"] = evaluate_ranks(rankings_5, "5_layer2_rules")

    # Print Summary Table
    print("\n" + "="*95)
    print("ABLATION STUDY SUMMARY (PROCEDURE R@3 & CHUNK MRR)")
    print("="*95)
    print(f"{'Ablation Step':<28} | {'ALL Proc R@3':<14} | {'ACC Proc R@3':<14} | {'UNACC Proc R@3':<14} | {'ALL Chunk MRR'}")
    print("-" * 95)
    for step_key, metrics in results.items():
        all_m = metrics["ALL"]
        acc_m = metrics["ACC"]
        unacc_m = metrics["UNACC"]
        print(f"{step_key:<28} | {all_m['proc_r3']:<14.2%} | {acc_m['proc_r3']:<14.2%} | {unacc_m['proc_r3']:<14.2%} | {all_m['chunk_mrr']:.4f}")
        
    with open("ml/runs/g5_ablation_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print("\n[OK] Results written to ml/runs/g5_ablation_results.json")

if __name__ == '__main__':
    main()
