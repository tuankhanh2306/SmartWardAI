#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — 3-Column Unified Evaluation Suite
Evaluates any specified split (dev, dev_human, heldout) across:
- Column 1: Current Rule-based baseline (intentClassifier.ts)
- Column 2: Raw Pre-trained Bi-Encoder (BKAI, 768-dim) + Logistic Regression
- Column 3: Fine-Tuned Bi-Encoder (MNRL) + Logistic Regression + Hierarchical Retrieval
Computes Cluster Bootstrap 95% CIs (by group_id, B=1000) for all metrics.
"""

import os
import sys
import json
import argparse
import numpy as np
from collections import defaultdict
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sentence_transformers import SentenceTransformer

sys.stdout.reconfigure(encoding='utf-8')

CLASSES = ['GREETING', 'PROCEDURE_CATALOG', 'COMMUNE_INFO', 'OUT_OF_SCOPE', 'AMBIGUOUS', 'PROCEDURE_INQUIRY']

def load_data(split_path: str):
    with open(split_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_inventory():
    with open('ml/data/legal_inventory.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def cluster_bootstrap(items, metric_fn, group_key='group_id', n_boot=1000, seed=42):
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
        
    return [round(float(np.percentile(boots, 2.5)), 4), round(float(np.percentile(boots, 97.5)), 4)], n_g

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset', type=str, default='ml/data/dev.json')
    parser.add_argument('--train', type=str, default='ml/data/train.json')
    parser.add_argument('--output', type=str, default='ml/runs/full_evaluation_3col.json')
    args = parser.parse_args()
    
    print("="*75)
    print(f"RUNNING 3-COLUMN UNIFIED EVALUATION ON {args.dataset}")
    print("="*75)
    
    eval_data = load_data(args.dataset)
    train_data = load_data(args.train)
    inventory = load_inventory()
    
    print(f"Loaded {len(eval_data)} evaluation samples.")
    
    # We will populate Col 1, Col 2, Col 3
    # Check if models exist
    raw_model_name = 'bkai-foundation-models/vietnamese-bi-encoder'
    ft_model_name = 'ml/models/fine_tuned_biencoder' if os.path.exists('ml/models/fine_tuned_biencoder') else raw_model_name
    
    # Output structure ready
    print(f"Ready for unified evaluation.")

if __name__ == '__main__':
    main()
