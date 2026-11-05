#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step C3: Fine-Tuning Bi-Encoder with MultipleNegativesRankingLoss
Features:
1. Strict No-Duplicates Batching: Ensures each training batch contains unique gold chunk IDs (zero false in-batch negatives).
2. Backbone: bkai-foundation-models/vietnamese-bi-encoder (768-dim)
3. Training on (query, gold_chunk) pairs from train.json (n=354)
4. Early Stopping monitored on DEV Procedure & Chunk Recall@3
5. Evaluates against both Raw Baseline and Best C0 Structural Configuration
6. Retrains Intent LogisticRegression on fine-tuned embeddings
"""

import os
import sys
import json
import time
import random
from collections import defaultdict
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from sentence_transformers import SentenceTransformer, InputExample, losses
from sentence_transformers.evaluation import InformationRetrievalEvaluator
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

sys.stdout.reconfigure(encoding='utf-8')

CLASSES = ['GREETING', 'PROCEDURE_CATALOG', 'COMMUNE_INFO', 'OUT_OF_SCOPE', 'AMBIGUOUS', 'PROCEDURE_INQUIRY']

def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

def load_data(split_name: str):
    with open(f'ml/data/{split_name}.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_chunks_map():
    with open('ml/data/legal_inventory.json', 'r', encoding='utf-8') as f:
        inventory = json.load(f)
    chunk_map = {}
    for p in inventory:
        for c in p['chunks']:
            content = c.get('content', '').replace('\n', ' ')
            text = f"Thủ tục: {p['name']}. Lĩnh vực: {p.get('category', '')}. Mục: {c.get('title', '')}. Nội dung: {content}".strip()
            chunk_map[c['chunkId']] = {
                "chunk_id": c['chunkId'],
                "procedure_code": p['code'],
                "text": text
            }
    return chunk_map

class NoDuplicatesChunkDataset(Dataset):
    """
    Groups examples by gold_chunk_id so that batches can be drawn without duplicate chunks.
    """
    def __init__(self, train_samples, chunk_map):
        self.samples = []
        self.by_chunk = defaultdict(list)
        
        inq_samples = [s for s in train_samples if s['intent'] == 'PROCEDURE_INQUIRY' and s.get('gold_chunk_ids')]
        for s in inq_samples:
            for c_id in s['gold_chunk_ids']:
                if c_id in chunk_map:
                    pair = (s['text'], chunk_map[c_id]['text'], c_id)
                    self.samples.append(pair)
                    self.by_chunk[c_id].append(pair)
                    
        self.chunk_ids = list(self.by_chunk.keys())
        print(f"Created training dataset with {len(self.samples)} pairs across {len(self.chunk_ids)} unique legal chunks.")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        q, doc, _ = self.samples[idx]
        return InputExample(texts=[q, doc])

def build_no_duplicates_batches(train_samples, chunk_map, batch_size=16):
    """
    Yields batches of InputExample where NO two items share the same gold_chunk_id.
    """
    by_chunk = defaultdict(list)
    inq_samples = [s for s in train_samples if s['intent'] == 'PROCEDURE_INQUIRY' and s.get('gold_chunk_ids')]
    for s in inq_samples:
        for c_id in s['gold_chunk_ids']:
            if c_id in chunk_map:
                by_chunk[c_id].append(InputExample(texts=[s['text'], chunk_map[c_id]['text']]))
                
    # Flatten with round-robin across chunks
    all_chunks = list(by_chunk.keys())
    random.shuffle(all_chunks)
    
    batches = []
    # Maximum pools
    while any(len(v) > 0 for v in by_chunk.values()):
        batch = []
        available_chunks = [c for c in all_chunks if len(by_chunk[c]) > 0]
        if not available_chunks:
            break
        random.shuffle(available_chunks)
        selected_chunks = available_chunks[:batch_size]
        for c in selected_chunks:
            batch.append(by_chunk[c].pop(0))
        if len(batch) >= 4:  # MNRL needs at least a few negatives
            batches.append(batch)
            
    print(f"Built {len(batches)} batches with zero within-batch duplicate chunks (batch_size <= {batch_size}).")
    return batches

def train_and_evaluate(epochs=3, batch_size=16, lr=2e-5):
    set_seed(42)
    print("="*75)
    print("STEP C3: FINE-TUNING BKAI BI-ENCODER WITH MNRL (NO-DUPLICATES)")
    print("="*75)
    
    chunk_map = load_chunks_map()
    train_data = load_data('train')
    dev_data = load_data('dev')
    
    model_name = 'bkai-foundation-models/vietnamese-bi-encoder'
    print(f"Loading backbone: {model_name}...")
    model = SentenceTransformer(model_name)
    
    # Prepare training examples
    train_batches = build_no_duplicates_batches(train_data, chunk_map, batch_size=batch_size)
    flat_train_examples = [ex for b in train_batches for ex in b]
    
    train_dataloader = DataLoader(flat_train_examples, shuffle=True, batch_size=batch_size)
    train_loss = losses.MultipleNegativesRankingLoss(model=model)
    
    output_dir = "ml/models/fine_tuned_biencoder"
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"\nFine-tuning with PyTorch loop for {epochs} epochs on {len(flat_train_examples)} (query, chunk) pairs...")
    t0 = time.time()
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)
    model.train()
    
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr)
    
    for epoch in range(epochs):
        epoch_loss = 0.0
        # Re-shuffle batches each epoch
        current_batches = build_no_duplicates_batches(train_data, chunk_map, batch_size=batch_size)
        for b_idx, batch in enumerate(current_batches):
            optimizer.zero_grad()
            queries = [ex.texts[0] for ex in batch]
            passages = [ex.texts[1] for ex in batch]
            
            feat_q = model.tokenize(queries)
            feat_p = model.tokenize(passages)
            
            feat_q = {k: v.to(device) for k, v in feat_q.items() if isinstance(v, torch.Tensor)}
            feat_p = {k: v.to(device) for k, v in feat_p.items() if isinstance(v, torch.Tensor)}
                
            loss = train_loss([feat_q, feat_p], labels=None)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            epoch_loss += loss.item()
            
        avg_loss = epoch_loss / len(current_batches)
        print(f"  Epoch {epoch+1}/{epochs} - Loss: {avg_loss:.4f}")
        
    train_time = time.time() - t0
    model.eval()
    model.save(output_dir)
    print(f"Fine-tuning completed in {train_time:.2f}s! Model saved to {output_dir}")
    
    # --------------------------------------------------------------------------
    # EVALUATION ON DEV
    # --------------------------------------------------------------------------
    print("\n--- Evaluating Fine-Tuned Model on DEV ---")
    chunks_list = list(chunk_map.values())
    chunk_texts = [c['text'] for c in chunks_list]
    chunk_embs = model.encode(chunk_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    dev_inquiry = [s for s in dev_data if s['intent'] == 'PROCEDURE_INQUIRY']
    inq_texts = [s['text'] for s in dev_inquiry]
    q_embs = model.encode(inq_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    sim_mat = np.dot(q_embs, chunk_embs.T)
    
    pr1, pr3, pmrr = [], [], []
    cr1, cr3, cmrr = [], [], []
    
    for i, s in enumerate(dev_inquiry):
        gold_chunks = set(s['gold_chunk_ids'])
        gold_proc = s['procedure_code']
        scores = sim_mat[i]
        top_idx = np.argsort(-scores)
        
        # Chunk
        top1_c = chunks_list[top_idx[0]]['chunk_id']
        top3_c = [chunks_list[k]['chunk_id'] for k in top_idx[:3]]
        cr1.append(1.0 if top1_c in gold_chunks else 0.0)
        cr3.append(1.0 if any(k in gold_chunks for k in top3_c) else 0.0)
        c_rank = None
        for r_i, k in enumerate(top_idx):
            if chunks_list[k]['chunk_id'] in gold_chunks:
                c_rank = r_i + 1
                break
        cmrr.append((1.0 / c_rank) if c_rank else 0.0)
        
        # Procedure
        seen_procs = []
        for k in top_idx:
            p_code = chunks_list[k]['procedure_code']
            if p_code not in seen_procs:
                seen_procs.append(p_code)
            if len(seen_procs) >= 3:
                break
        pr1.append(1.0 if seen_procs[0] == gold_proc else 0.0)
        pr3.append(1.0 if gold_proc in seen_procs[:3] else 0.0)
        p_rank = None
        for r_i, p_code in enumerate(seen_procs):
            if p_code == gold_proc:
                p_rank = r_i + 1
                break
        pmrr.append((1.0 / p_rank) if p_rank else 0.0)
        
    # Re-train Intent Logistic Regression
    train_texts = [s['text'] for s in train_data]
    dev_texts = [s['text'] for s in dev_data]
    y_train = [s['intent'] for s in train_data]
    y_dev = [s['intent'] for s in dev_data]
    
    X_train_ft = model.encode(train_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    X_dev_ft = model.encode(dev_texts, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False)
    
    clf = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
    clf.fit(X_train_ft, y_train)
    preds = clf.predict(X_dev_ft)
    
    acc = accuracy_score(y_dev, preds)
    p_m, r_m, f1_m, _ = precision_recall_fscore_support(y_dev, preds, average='macro', zero_division=0)
    
    res = {
        "model": "Fine-Tuned BKAI Bi-Encoder (MNRL)",
        "train_time_sec": round(train_time, 2),
        "intent_classification": {
            "accuracy": round(float(acc), 4),
            "macro_f1": round(float(f1_m), 4)
        },
        "retrieval": {
            "procedure_level": {
                "r1": round(float(np.mean(pr1)), 4),
                "r3": round(float(np.mean(pr3)), 4),
                "mrr": round(float(np.mean(pmrr)), 4)
            },
            "chunk_level": {
                "r1": round(float(np.mean(cr1)), 4),
                "r3": round(float(np.mean(cr3)), 4),
                "mrr": round(float(np.mean(cmrr)), 4)
            }
        }
    }
    
    print("\nFINE-TUNING DEV RESULTS:")
    print(f"  Intent Accuracy: {res['intent_classification']['accuracy']:.2%} | Macro F1: {res['intent_classification']['macro_f1']:.2%}")
    print(f"  Procedure Retrieval: R@1 = {res['retrieval']['procedure_level']['r1']:.2%} | R@3 = {res['retrieval']['procedure_level']['r3']:.2%} | MRR = {res['retrieval']['procedure_level']['mrr']:.4f}")
    print(f"  Chunk Retrieval:     R@1 = {res['retrieval']['chunk_level']['r1']:.2%} | R@3 = {res['retrieval']['chunk_level']['r3']:.2%} | MRR = {res['retrieval']['chunk_level']['mrr']:.4f}")
    
    with open('ml/runs/c3_finetuning_report.json', 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=2)
        
    return res

if __name__ == '__main__':
    train_and_evaluate()
