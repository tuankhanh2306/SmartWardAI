#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step C0: Structural Retrieval Enhancements (Pre-Fine-Tuning)
Tests and compares on DEV (120 INQUIRY across 40 groups):
  Baseline: Pre-trained BKAI (768-dim) on raw chunks
  (a) Chunk splitting (<= 200 tokens with procedure title prefix)
  (b) 2-Stage Hierarchical Retrieval (Procedure-level vector -> Sub-intent chunk selector)
  (c) Hybrid Search: Reciprocal Rank Fusion (BM25/TF-IDF + Dense Vector)
  (d) Dual-form diacritic normalization (Accented + Unaccented representation)
  Combinations: Best hybrid pipeline (b + c + d)
Measures both Procedure-level (Recall@1, Recall@3, MRR) and Chunk-level (Recall@1, Recall@3, MRR).
"""

import sys
import json
import re
import unicodedata
import numpy as np
from collections import defaultdict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

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

# ------------------------------------------------------------------------------
# 1. PREPARE REPRESENTATIONS
# ------------------------------------------------------------------------------

def prepare_procedure_catalog(inventory):
    """
    Procedure profile for Level-1 search: Name, Category, Common Aliases, Overview description
    """
    procs = []
    # Common conversational aliases for commune procedures
    alias_map = {
        "TTHC-HT-01": "khai sinh, đăng ký khai sinh, làm giấy khai sinh cho con",
        "TTHC-HT-02": "kết hôn, đăng ký kết hôn, làm giấy hôn thú",
        "TTHC-HT-03": "khai tử, đăng ký khai tử, chứng tử",
        "TTHC-HT-04": "xác nhận tình trạng hôn nhân, giấy chứng nhận độc thân",
        "TTHC-HT-05": "cấp bản sao trích lục hộ tịch, xin trích lục khai sinh kết hôn",
        "TTHC-HT-06": "nhận cha mẹ con, nhận con ngoài giá thú",
        "TTHC-HT-07": "nuôi con nuôi, đăng ký nhận nuôi con",
        "TTHC-HT-08": "giám hộ, đăng ký giám hộ cử người giám hộ",
        "TTHC-HT-09": "chấm dứt giám hộ",
        "TTHC-HT-10": "thay đổi cải chính hộ tịch, sửa thông tin khai sinh",
        "TTHC-CT-01": "chứng thực bản sao, công chứng bản sao từ bản chính, sao y",
        "TTHC-CT-02": "chứng thực chữ ký, công chứng chữ ký giấy ủy quyền",
        "TTHC-CT-03": "chứng thực hợp đồng giao dịch mua bán chuyển nhượng tặng cho",
        "TTHC-CT-04": "chứng thực di chúc, lập di chúc tại xã",
        "TTHC-CT-05": "chứng thực văn bản thỏa thuận phân chia di sản thừa kế",
        "TTHC-DC-01": "chuyển nhượng đất nông nghiệp, sang tên đất nông nghiệp, mua bán đất ruộng",
        "TTHC-DC-02": "đăng ký biến động đất đai, sang tên sổ đỏ, biến động tài sản gắn liền với đất",
        "TTHC-DC-03": "tách thửa đất, hợp thửa đất, chia tách sổ đỏ cho con",
        "TTHC-DC-04": "cấp sổ đỏ lần đầu, cấp giấy chứng nhận quyền sử dụng đất lần đầu",
        "TTHC-DC-05": "đăng ký biện pháp bảo đảm bằng quyền sử dụng đất thế chấp",
        "TTHC-DC-06": "hòa giải tranh chấp đất đai tại xã",
        "TTHC-DC-07": "chuyển đổi mục đích sử dụng đất sang đất ở thổ cư",
        "TTHC-DC-08": "gia hạn thời hạn sử dụng đất nông nghiệp",
        "TTHC-XD-01": "giấy phép xây dựng nhà ở riêng lẻ nông thôn đô thị",
        "TTHC-XD-02": "sửa chữa cải tạo nhà ở riêng lẻ",
        "TTHC-XD-03": "cung cấp thông tin quy hoạch xây dựng",
        "TTHC-BT-01": "trợ cấp xã hội hàng tháng cho người cao tuổi",
        "TTHC-BT-02": "trợ cấp xã hội cho người khuyết tật nặng",
        "TTHC-BT-03": "hỗ trợ mai táng phí cho đối tượng bảo trợ xã hội",
        "TTHC-BT-04": "xác định mức độ khuyết tật và cấp giấy chứng nhận khuyết tật",
        "TTHC-BT-05": "chế độ mai táng phí cho người có công cách mạng liệt sĩ",
        "TTHC-BT-06": "trợ cấp một lần cho thanh niên xung phong người hoạt động kháng chiến",
        "TTHC-BT-07": "ưu đãi giáo dục đào tạo cho con thương binh bệnh binh",
        "TTHC-BT-08": "hỗ trợ tiền điện cho hộ nghèo hộ chính sách",
        "TTHC-NC-01": "tiếp công dân, lịch tiếp dân của chủ tịch xã",
        "TTHC-NC-02": "khiếu nại quyết định hành chính hành vi hành chính",
        "TTHC-NC-03": "tố cáo hành vi vi phạm pháp luật của cán bộ xã",
        "TTHC-NC-04": "phản ánh kiến nghị về quy định hành chính thủ tục hành chính",
        "TTHC-VP-01": "cung cấp thông tin theo yêu cầu của công dân tại xã",
        "TTHC-VP-02": "đăng ký hẹn giờ giải quyết thủ tục hành chính tại một cửa"
    }
    
    for p in inventory:
        aliases = alias_map.get(p['code'], '')
        # Overview chunk
        overview = next((c['content'] for c in p['chunks'] if c['chunkType'] == 'OVERVIEW'), '')
        text_accented = f"Thủ tục: {p['name']}. Từ khóa thường gọi: {aliases}. Lĩnh vực: {p.get('category', '')}. Tổng quan: {overview}"
        text_unaccented = remove_accents(text_accented)
        # Combined dual text
        dual_text = f"{text_accented} | {text_unaccented}"
        
        procs.append({
            "code": p['code'],
            "name": p['name'],
            "category": p.get('category', ''),
            "aliases": aliases,
            "text_accented": text_accented,
            "dual_text": dual_text
        })
    return procs

def prepare_subchunks(inventory, max_words=100, overlap=25):
    """
    Splits long chunks into sub-chunks of <= ~150-200 tokens
    """
    subchunks = []
    for p in inventory:
        for c in p['chunks']:
            content = c.get('content', '').replace('\n', ' ')
            words = content.split()
            
            if len(words) <= max_words:
                text = f"Thủ tục: {p['name']}. Mục: {c.get('title', '')}. Nội dung: {content}"
                subchunks.append({
                    "subchunk_id": f"{c['chunkId']}_0",
                    "chunk_id": c['chunkId'],
                    "procedure_code": p['code'],
                    "chunk_type": c['chunkType'],
                    "text": text,
                    "dual_text": f"{text} | {remove_accents(text)}"
                })
            else:
                # Sliding window
                start = 0
                idx = 0
                while start < len(words):
                    end = min(start + max_words, len(words))
                    slice_words = " ".join(words[start:end])
                    text = f"Thủ tục: {p['name']}. Mục: {c.get('title', '')}. Nội dung ({idx+1}): {slice_words}"
                    subchunks.append({
                        "subchunk_id": f"{c['chunkId']}_{idx}",
                        "chunk_id": c['chunkId'],
                        "procedure_code": p['code'],
                        "chunk_type": c['chunkType'],
                        "text": text,
                        "dual_text": f"{text} | {remove_accents(text)}"
                    })
                    if end == len(words):
                        break
                    start += (max_words - overlap)
                    idx += 1
    return subchunks

# ------------------------------------------------------------------------------
# 2. EVALUATION HELPER
# ------------------------------------------------------------------------------

def evaluate_retrieval(procedure_rankings, chunk_rankings, dev_inquiry):
    """
    procedure_rankings: list of list of procedure_codes in sorted rank order for each query
    chunk_rankings: list of list of chunk_ids in sorted rank order for each query
    """
    pr1, pr3, pmrr = [], [], []
    cr1, cr3, cmrr = [], [], []
    
    accented_pr1, accented_pr3 = [], []
    unaccented_pr1, unaccented_pr3 = [], []
    
    for i, s in enumerate(dev_inquiry):
        gold_proc = s['procedure_code']
        gold_chunks = set(s['gold_chunk_ids'])
        is_unaccented = ('không_dấu' in s.get('style_tags', []))
        
        p_ranks = procedure_rankings[i]
        c_ranks = chunk_rankings[i] if chunk_rankings else []
        
        # Procedure metrics
        r1_p = 1.0 if p_ranks and p_ranks[0] == gold_proc else 0.0
        r3_p = 1.0 if any(p == gold_proc for p in p_ranks[:3]) else 0.0
        rank_p = (p_ranks.index(gold_proc) + 1) if gold_proc in p_ranks else None
        mrr_p = (1.0 / rank_p) if rank_p else 0.0
        
        pr1.append(r1_p)
        pr3.append(r3_p)
        pmrr.append(mrr_p)
        
        if is_unaccented:
            unaccented_pr1.append(r1_p)
            unaccented_pr3.append(r3_p)
        else:
            accented_pr1.append(r1_p)
            accented_pr3.append(r3_p)
            
        # Chunk metrics
        if c_ranks:
            r1_c = 1.0 if c_ranks and c_ranks[0] in gold_chunks else 0.0
            r3_c = 1.0 if any(c in gold_chunks for c in c_ranks[:3]) else 0.0
            rank_c = None
            for r_idx, c in enumerate(c_ranks):
                if c in gold_chunks:
                    rank_c = r_idx + 1
                    break
            mrr_c = (1.0 / rank_c) if rank_c else 0.0
            cr1.append(r1_c)
            cr3.append(r3_c)
            cmrr.append(mrr_c)
            
    return {
        "proc_r1": np.mean(pr1),
        "proc_r3": np.mean(pr3),
        "proc_mrr": np.mean(pmrr),
        "chunk_r1": np.mean(cr1) if cr1 else 0.0,
        "chunk_r3": np.mean(cr3) if cr3 else 0.0,
        "chunk_mrr": np.mean(cmrr) if cmrr else 0.0,
        "accented_proc_r1": np.mean(accented_pr1),
        "accented_proc_r3": np.mean(accented_pr3),
        "unaccented_proc_r1": np.mean(unaccented_pr1),
        "unaccented_proc_r3": np.mean(unaccented_pr3)
    }

# ------------------------------------------------------------------------------
# 3. RUN STRATEGIES
# ------------------------------------------------------------------------------

def main():
    print("="*75)
    print("STEP C0: STRUCTURAL RETRIEVAL ENHANCEMENTS EVALUATION ON DEV")
    print("="*75)
    
    inventory = load_inventory()
    dev_data = load_data('dev')
    dev_inquiry = [s for s in dev_data if s['intent'] == 'PROCEDURE_INQUIRY']
    query_texts = [s['text'] for s in dev_inquiry]
    
    print(f"Loaded DEV: {len(dev_inquiry)} INQUIRY queries (80 accented, 40 unaccented).")
    
    print("Loading BKAI Vietnamese Bi-Encoder backbone...")
    model = SentenceTransformer('bkai-foundation-models/vietnamese-bi-encoder')
    
    # --------------------------------------------------------------------------
    # CONFIG 0: Raw Chunks Baseline (from Phase B-fix)
    # --------------------------------------------------------------------------
    # --------------------------------------------------------------------------
    # STRATEGY A: Chunk Splitting (<= 200 tokens)
    # --------------------------------------------------------------------------
    print("\n[Strategy A] Evaluating Sub-chunk Splitting (<= 200 tokens)...")
    subchunks = prepare_subchunks(inventory, max_words=100, overlap=25)
    print(f"  Generated {len(subchunks)} sub-chunks from 179 legal chunks.")
    
    subchunk_texts = [sc['text'] for sc in subchunks]
    subchunk_embs = model.encode(subchunk_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    q_embs = model.encode(query_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    sim_subchunks = np.dot(q_embs, subchunk_embs.T)
    
    strat_a_proc_ranks = []
    strat_a_chunk_ranks = []
    for i in range(len(dev_inquiry)):
        scores = sim_subchunks[i]
        sorted_sub_idx = np.argsort(-scores)
        
        seen_procs = []
        seen_chunks = []
        for idx in sorted_sub_idx:
            p_code = subchunks[idx]['procedure_code']
            c_id = subchunks[idx]['chunk_id']
            if p_code not in seen_procs:
                seen_procs.append(p_code)
            if c_id not in seen_chunks:
                seen_chunks.append(c_id)
        strat_a_proc_ranks.append(seen_procs)
        strat_a_chunk_ranks.append(seen_chunks)
        
    res_a = evaluate_retrieval(strat_a_proc_ranks, strat_a_chunk_ranks, dev_inquiry)
    print(f"  Result A: Proc R@1: {res_a['proc_r1']:.2%} | Proc R@3: {res_a['proc_r3']:.2%} | Chunk R@1: {res_a['chunk_r1']:.2%} | Chunk R@3: {res_a['chunk_r3']:.2%}")
    print(f"    -> Accented Proc R@3: {res_a['accented_proc_r3']:.2%} | Unaccented Proc R@3: {res_a['unaccented_proc_r3']:.2%}")

    # --------------------------------------------------------------------------
    # STRATEGY B: 2-Stage Hierarchical Retrieval (Procedure Profile -> Chunk)
    # --------------------------------------------------------------------------
    print("\n[Strategy B] Evaluating 2-Stage Hierarchical Retrieval...")
    procs = prepare_procedure_catalog(inventory)
    proc_texts = [p['text_accented'] for p in procs]
    proc_embs = model.encode(proc_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    sim_procs = np.dot(q_embs, proc_embs.T)
    strat_b_proc_ranks = []
    strat_b_chunk_ranks = []
    
    # Sub-intent keyword rules to pick chunk within procedure
    for i, s in enumerate(dev_inquiry):
        scores = sim_procs[i]
        top_p_indices = np.argsort(-scores)
        p_ranks = [procs[idx]['code'] for idx in top_p_indices]
        strat_b_proc_ranks.append(p_ranks)
        
        # Level 2: Chunk selector based on query cues
        q_lower = s['text'].lower()
        if any(w in q_lower for w in ['hồ sơ', 'giấy tờ', 'chuẩn bị', 'cần mang', 'ho so', 'giay to']):
            preferred_type = 'REQUIRED_DOCUMENTS'
        elif any(w in q_lower for w in ['lệ phí', 'tiền', 'phí', 'bao nhiêu ngày', 'thời hạn', 'thời gian', 'le phi', 'mat bao lau']):
            preferred_type = 'FEE_AND_TIME'
        elif any(w in q_lower for w in ['trình tự', 'các bước', 'quy trình', 'thủ tục', 'nop o dau', 'nộp ở đâu']):
            preferred_type = 'PROCESS_STEPS'
        else:
            preferred_type = 'OVERVIEW'
            
        c_ranks = []
        for p_code in p_ranks[:5]:
            p_obj = next(p for p in inventory if p['code'] == p_code)
            # Find preferred chunk
            pref_chunk = next((c['chunkId'] for c in p_obj['chunks'] if c['chunkType'] == preferred_type), None)
            other_chunks = [c['chunkId'] for c in p_obj['chunks'] if c['chunkType'] != preferred_type]
            if pref_chunk:
                c_ranks.append(pref_chunk)
            c_ranks.extend(other_chunks)
        strat_b_chunk_ranks.append(c_ranks)
        
    res_b = evaluate_retrieval(strat_b_proc_ranks, strat_b_chunk_ranks, dev_inquiry)
    print(f"  Result B: Proc R@1: {res_b['proc_r1']:.2%} | Proc R@3: {res_b['proc_r3']:.2%} | Chunk R@1: {res_b['chunk_r1']:.2%} | Chunk R@3: {res_b['chunk_r3']:.2%}")
    print(f"    -> Accented Proc R@3: {res_b['accented_proc_r3']:.2%} | Unaccented Proc R@3: {res_b['unaccented_proc_r3']:.2%}")

    # --------------------------------------------------------------------------
    # STRATEGY C: Reciprocal Rank Fusion (BM25/TF-IDF + Vector) on Procedure Profiles
    # --------------------------------------------------------------------------
    print("\n[Strategy C] Evaluating Hybrid Lexical + Dense (RRF)...")
    tfidf = TfidfVectorizer(ngram_range=(1, 3), sublinear_tf=True)
    proc_tfidf = tfidf.fit_transform([p['text_accented'] for p in procs])
    q_tfidf = tfidf.transform(query_texts)
    sim_proc_lexical = cosine_similarity(q_tfidf, proc_tfidf)
    
    strat_c_proc_ranks = []
    k_rrf = 60
    for i in range(len(dev_inquiry)):
        dense_scores = sim_procs[i]
        lex_scores = sim_proc_lexical[i]
        
        dense_ranks = np.argsort(-dense_scores)
        lex_ranks = np.argsort(-lex_scores)
        
        rrf_scores = defaultdict(float)
        for rank, idx in enumerate(dense_ranks):
            rrf_scores[idx] += 1.0 / (k_rrf + rank + 1)
        for rank, idx in enumerate(lex_ranks):
            rrf_scores[idx] += 1.0 / (k_rrf + rank + 1)
            
        sorted_indices = sorted(rrf_scores.keys(), key=lambda x: -rrf_scores[x])
        strat_c_proc_ranks.append([procs[idx]['code'] for idx in sorted_indices])
        
    res_c = evaluate_retrieval(strat_c_proc_ranks, strat_b_chunk_ranks, dev_inquiry)
    print(f"  Result C (Hybrid RRF): Proc R@1: {res_c['proc_r1']:.2%} | Proc R@3: {res_c['proc_r3']:.2%} | Chunk R@1: {res_c['chunk_r1']:.2%} | Chunk R@3: {res_c['chunk_r3']:.2%}")
    print(f"    -> Accented Proc R@3: {res_c['accented_proc_r3']:.2%} | Unaccented Proc R@3: {res_c['unaccented_proc_r3']:.2%}")

    # --------------------------------------------------------------------------
    # STRATEGY D: Dual-form Diacritic Normalization (Accented + Unaccented representation)
    # --------------------------------------------------------------------------
    print("\n[Strategy D] Evaluating Dual-Form Normalization on Hybrid Pipeline (b + c + d)...")
    proc_dual_texts = [p['dual_text'] for p in procs]
    proc_dual_embs = model.encode(proc_dual_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    # Query dual representation: "query | unaccented_query"
    query_dual_texts = [f"{q} | {remove_accents(q)}" for q in query_texts]
    q_dual_embs = model.encode(query_dual_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    sim_dual_dense = np.dot(q_dual_embs, proc_dual_embs.T)
    
    tfidf_dual = TfidfVectorizer(ngram_range=(1, 3), sublinear_tf=True)
    proc_dual_tfidf = tfidf_dual.fit_transform(proc_dual_texts)
    q_dual_tfidf = tfidf_dual.transform(query_dual_texts)
    sim_dual_lex = cosine_similarity(q_dual_tfidf, proc_dual_tfidf)
    
    strat_d_proc_ranks = []
    strat_d_chunk_ranks = []
    for i, s in enumerate(dev_inquiry):
        dense_scores = sim_dual_dense[i]
        lex_scores = sim_dual_lex[i]
        
        dense_ranks = np.argsort(-dense_scores)
        lex_ranks = np.argsort(-lex_scores)
        
        rrf_scores = defaultdict(float)
        for rank, idx in enumerate(dense_ranks):
            rrf_scores[idx] += 1.0 / (k_rrf + rank + 1)
        for rank, idx in enumerate(lex_ranks):
            rrf_scores[idx] += 1.0 / (k_rrf + rank + 1)
            
        sorted_indices = sorted(rrf_scores.keys(), key=lambda x: -rrf_scores[x])
        p_ranks = [procs[idx]['code'] for idx in sorted_indices]
        strat_d_proc_ranks.append(p_ranks)
        
        # Chunk selector
        q_lower = s['text'].lower()
        if any(w in q_lower for w in ['hồ sơ', 'giấy tờ', 'chuẩn bị', 'cần mang', 'ho so', 'giay to']):
            preferred_type = 'REQUIRED_DOCUMENTS'
        elif any(w in q_lower for w in ['lệ phí', 'tiền', 'phí', 'bao nhiêu ngày', 'thời hạn', 'thời gian', 'le phi', 'mat bao lau']):
            preferred_type = 'FEE_AND_TIME'
        elif any(w in q_lower for w in ['trình tự', 'các bước', 'quy trình', 'thủ tục', 'nop o dau', 'nộp ở đâu']):
            preferred_type = 'PROCESS_STEPS'
        else:
            preferred_type = 'OVERVIEW'
            
        c_ranks = []
        for p_code in p_ranks[:5]:
            p_obj = next(p for p in inventory if p['code'] == p_code)
            pref_chunk = next((c['chunkId'] for c in p_obj['chunks'] if c['chunkType'] == preferred_type), None)
            other_chunks = [c['chunkId'] for c in p_obj['chunks'] if c['chunkType'] != preferred_type]
            if pref_chunk:
                c_ranks.append(pref_chunk)
            c_ranks.extend(other_chunks)
        strat_d_chunk_ranks.append(c_ranks)
        
    res_d = evaluate_retrieval(strat_d_proc_ranks, strat_d_chunk_ranks, dev_inquiry)
    print(f"  Result D (Dual Hybrid Pipeline):")
    print(f"    Procedure-level: Recall@1: {res_d['proc_r1']:.2%} | Recall@3: {res_d['proc_r3']:.2%} | MRR: {res_d['proc_mrr']:.4f}")
    print(f"    Chunk-level:     Recall@1: {res_d['chunk_r1']:.2%} | Recall@3: {res_d['chunk_r3']:.2%} | MRR: {res_d['chunk_mrr']:.4f}")
    print(f"    -> Accented (n=80):   Proc R@1 = {res_d['accented_proc_r1']:.2%} | Proc R@3 = {res_d['accented_proc_r3']:.2%}")
    print(f"    -> Unaccented (n=40): Proc R@1 = {res_d['unaccented_proc_r1']:.2%} | Proc R@3 = {res_d['unaccented_proc_r3']:.2%}")
    
    summary = {
        "strategy_a_subchunks": res_a,
        "strategy_b_hierarchical": res_b,
        "strategy_c_hybrid_rrf": res_c,
        "strategy_d_dual_hybrid": res_d
    }
    
    with open('ml/runs/c0_structural_retrieval_report.json', 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
        
    print("\nSaved C0 report to ml/runs/c0_structural_retrieval_report.json")

if __name__ == '__main__':
    main()
