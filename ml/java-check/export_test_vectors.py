#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Exports 105 test sentences with Python token IDs and Python ONNX embeddings
for the Java-check test harness.
"""

import os
import sys
import json
import unicodedata
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append('ml/src')
from verify_tokenizer_cross_runtime import TEST_SENTENCES

def main():
    tok_dir = "ml/models/tokenizer"
    onnx_path = "ml/models/biencoder_base.onnx"
    
    tokenizer = AutoTokenizer.from_pretrained(tok_dir)
    ort_session = ort.InferenceSession(onnx_path, providers=['CPUExecutionProvider'])
    
    records = []
    print(f"Exporting {len(TEST_SENTENCES)} sentences for Java test harness...")
    
    for idx, text in enumerate(TEST_SENTENCES):
        # 1. Standard NFC
        enc_nfc = tokenizer(text, padding=False, truncation=True, max_length=128)
        # 2. NFD variant
        text_nfd = unicodedata.normalize('NFD', text)
        enc_nfd = tokenizer(text_nfd, padding=False, truncation=True, max_length=128)
        
        # 3. Embedding from ONNX
        enc_padded = tokenizer(text, padding=True, truncation=True, max_length=128, return_tensors="np")
        feed = {
            'input_ids': enc_padded['input_ids'],
            'attention_mask': enc_padded['attention_mask']
        }
        emb = ort_session.run(None, feed)[0][0]
        # ensure normalized
        emb = emb / np.linalg.norm(emb)
        
        records.append({
            "id": idx + 1,
            "text": text,
            "text_nfd": text_nfd,
            "token_ids": enc_nfc['input_ids'],
            "token_ids_nfd": enc_nfd['input_ids'],
            "embedding": [round(float(v), 7) for v in emb]
        })
        
    out_path = "ml/java-check/test_suite_105.json"
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
        
    print(f"Exported {len(records)} test cases to {out_path}!")

if __name__ == '__main__':
    main()
