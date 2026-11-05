#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Saves the trained Intent Classifier to ml/models/intent_classifier.joblib
for instant startup of the AI Sidecar microservice.
"""

import os
import sys
import json
import joblib
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer
from sklearn.linear_model import LogisticRegression

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append('ml/src')
from enhanced_pipeline import VietnameseTextNormalizer, CLASSES, remove_accents

def main():
    print("Training and serializing Intent Classifier...")
    model_dir = "ml/models/fine_tuned_biencoder"
    onnx_path = "ml/models/bkai_finetuned_int8.onnx"
    out_path = "ml/models/intent_classifier.joblib"
    
    tok = AutoTokenizer.from_pretrained(model_dir)
    sess_opts = ort.SessionOptions()
    sess_opts.intra_op_num_threads = 4
    sess = ort.InferenceSession(onnx_path, sess_opts, providers=['CPUExecutionProvider'])
    
    with open('ml/data/train.json', 'r', encoding='utf-8') as f:
        train_data = json.load(f)
        
    normalizer = VietnameseTextNormalizer()
    
    # Preprocess train texts with unaccented augmentation
    train_texts = []
    y_train = []
    for s in train_data:
        norm_res = normalizer.normalize(s['text'])
        n_sub = norm_res['substantive'] or norm_res['normalized']
        train_texts.append(n_sub)
        y_train.append(s['intent'])
        
        # Unaccented augmentation
        unacc = remove_accents(n_sub)
        if unacc != n_sub:
            train_texts.append(unacc)
            y_train.append(s['intent'])
        
    # Embed train texts
    batch_size = 32
    embs = []
    for i in range(0, len(train_texts), batch_size):
        b = train_texts[i:i+batch_size]
        enc = tok(b, padding=True, truncation=True, max_length=256, return_tensors="np")
        feed = {'input_ids': enc['input_ids'], 'attention_mask': enc['attention_mask']}
        out = sess.run(None, feed)[0]
        norms = np.linalg.norm(out, axis=1, keepdims=True)
        norms = np.clip(norms, 1e-9, None)
        embs.append(out / norms)
        
    X_train = np.vstack(embs)
    
    clf = LogisticRegression(max_iter=1000, class_weight='balanced', C=1.0, random_state=42)
    clf.fit(X_train, y_train)
    
    joblib.dump({
        "classifier": clf,
        "classes": clf.classes_.tolist()
    }, out_path)
    print(f"[OK] Saved Intent Classifier to {out_path} ({os.path.getsize(out_path)/(1024):.2f} KB)")

if __name__ == '__main__':
    main()
