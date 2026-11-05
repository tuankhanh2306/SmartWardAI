#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Dataset Statistics & Strict Leakage Audit (TF-IDF & Embedding Cosine)
1. Reports exact dataset statistics:
   - n by Intent, Sub-intent, Source, Style tags
   - Unique group_id count per split
2. Strict Leakage Audit:
   - Identifies any text pairs across Train, Dev, Heldout with TF-IDF cosine > 0.85
   - Identifies any text pairs across Train, Dev, Heldout with Embedding cosine > 0.85
   - Verifies zero group_id leakage across splits
"""

import sys
import json
from collections import Counter, defaultdict
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

sys.stdout.reconfigure(encoding='utf-8')

def load_data(split_name: str):
    with open(f'ml/data/{split_name}.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def run_stats():
    train = load_data('train')
    dev = load_data('dev')
    heldout = load_data('heldout')
    
    splits = {'train': train, 'dev': dev, 'heldout': heldout}
    stats = {}
    
    print("="*60)
    print("DATASET COMPREHENSIVE STATISTICS (AFTER ALIAS & STYLE REFINEMENT)")
    print("="*60)
    
    all_group_ids = defaultdict(set)
    
    for name, data in splits.items():
        n_samples = len(data)
        intent_cnt = Counter(s['intent'] for s in data)
        sub_intent_cnt = Counter(s.get('sub_intent', 'N/A') for s in data)
        source_cnt = Counter(s.get('source', 'unknown') for s in data)
        
        style_cnt = Counter()
        group_ids = set()
        for s in data:
            style_cnt.update(s.get('style_tags', []))
            group_ids.add(s['group_id'])
            all_group_ids[name].add(s['group_id'])
            
        stats[name] = {
            "n_samples": n_samples,
            "n_groups": len(group_ids),
            "intents": dict(intent_cnt),
            "sub_intents": dict(sub_intent_cnt),
            "sources": dict(source_cnt),
            "styles": dict(style_cnt)
        }
        
        print(f"\n[{name.upper()}] Total: {n_samples} samples | Independent Groups: {len(group_ids)}")
        print(f"  Intents: {dict(intent_cnt)}")
        print(f"  Sources: {dict(source_cnt)}")
        print(f"  Styles:  {dict(style_cnt)}")
        
    # Group leakage check
    print("\n--- GROUP_ID LEAKAGE CHECK ---")
    tr_dev_overlap = all_group_ids['train'].intersection(all_group_ids['dev'])
    tr_ho_overlap = all_group_ids['train'].intersection(all_group_ids['heldout'])
    dev_ho_overlap = all_group_ids['dev'].intersection(all_group_ids['heldout'])
    
    print(f"  Train & Dev group_id overlap:     {len(tr_dev_overlap)}")
    print(f"  Train & Heldout group_id overlap: {len(tr_ho_overlap)}")
    print(f"  Dev & Heldout group_id overlap:   {len(dev_ho_overlap)}")
    assert len(tr_dev_overlap) == 0 and len(tr_ho_overlap) == 0 and len(dev_ho_overlap) == 0, "ERROR: Group ID leakage found!"

    # --------------------------------------------------------------------------
    # 2. TF-IDF & EMBEDDING SIMILARITY LEAKAGE AUDIT (THRESHOLD > 0.85)
    # --------------------------------------------------------------------------
    print("\n" + "="*60)
    print("CROSS-SPLIT SIMILARITY AUDIT (TF-IDF & EMBEDDINGS > 0.85)")
    print("="*60)
    
    # TF-IDF Vectorizer (char n-grams 3-5 + word n-grams 1-2)
    tfidf = TfidfVectorizer(ngram_range=(1, 3), analyzer='word', sublinear_tf=True)
    all_texts = [s['text'] for s in train + dev + heldout]
    tfidf.fit(all_texts)
    
    train_tfidf = tfidf.transform([s['text'] for s in train])
    dev_tfidf = tfidf.transform([s['text'] for s in dev])
    heldout_tfidf = tfidf.transform([s['text'] for s in heldout])
    
    # Embedding model
    print("Loading embedding model for semantic similarity audit...")
    emb_model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
    train_embs = emb_model.encode([s['text'] for s in train], convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    dev_embs = emb_model.encode([s['text'] for s in dev], convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    heldout_embs = emb_model.encode([s['text'] for s in heldout], convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    pairs_to_check = [
        ("Train", "Dev", train, dev, train_tfidf, dev_tfidf, train_embs, dev_embs),
        ("Train", "Heldout", train, heldout, train_tfidf, heldout_tfidf, train_embs, heldout_embs),
        ("Dev", "Heldout", dev, heldout, dev_tfidf, heldout_tfidf, dev_embs, heldout_embs)
    ]
    
    audit_results = {}
    
    for name_a, name_b, data_a, data_b, tf_a, tf_b, emb_a, emb_b in pairs_to_check:
        print(f"\n--- Checking {name_a} vs {name_b} ---")
        
        # TF-IDF Cosine
        sim_tfidf = cosine_similarity(tf_a, tf_b)
        # Embedding Cosine
        sim_emb = np.dot(emb_a, emb_b.T)
        
        flagged_tfidf = []
        flagged_emb = []
        
        for i in range(len(data_a)):
            for j in range(len(data_b)):
                t_score = sim_tfidf[i, j]
                e_score = sim_emb[i, j]
                
                if t_score > 0.85:
                    flagged_tfidf.append({
                        "score": round(float(t_score), 4),
                        "item_a": {"id": data_a[i]['id'], "text": data_a[i]['text'], "intent": data_a[i]['intent'], "proc": data_a[i].get('procedure_code')},
                        "item_b": {"id": data_b[j]['id'], "text": data_b[j]['text'], "intent": data_b[j]['intent'], "proc": data_b[j].get('procedure_code')}
                    })
                if e_score > 0.85:
                    flagged_emb.append({
                        "score": round(float(e_score), 4),
                        "item_a": {"id": data_a[i]['id'], "text": data_a[i]['text'], "intent": data_a[i]['intent'], "proc": data_a[i].get('procedure_code')},
                        "item_b": {"id": data_b[j]['id'], "text": data_b[j]['text'], "intent": data_b[j]['intent'], "proc": data_b[j].get('procedure_code')}
                    })
                    
        print(f"  Flagged pairs TF-IDF Cosine > 0.85: {len(flagged_tfidf)}")
        print(f"  Flagged pairs Embedding Cosine > 0.85: {len(flagged_emb)}")
        
        audit_results[f"{name_a}_vs_{name_b}"] = {
            "n_flagged_tfidf": len(flagged_tfidf),
            "flagged_tfidf_samples": flagged_tfidf[:5],
            "n_flagged_emb": len(flagged_emb),
            "flagged_emb_samples": flagged_emb[:5]
        }
        
    full_report = {
        "dataset_statistics": stats,
        "group_id_leakage": {
            "train_dev_overlap": len(tr_dev_overlap),
            "train_heldout_overlap": len(tr_ho_overlap),
            "dev_heldout_overlap": len(dev_ho_overlap)
        },
        "similarity_audit": audit_results
    }
    
    with open('ml/runs/dataset_audit_leakage_detailed.json', 'w', encoding='utf-8') as f:
        json.dump(full_report, f, ensure_ascii=False, indent=2)
        
    print("\nAudit report saved to ml/runs/dataset_audit_leakage_detailed.json")
    return full_report

if __name__ == '__main__':
    run_stats()
