#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Local AI Sidecar Microservice (FastAPI)
Provides high-performance (sub-10ms) local inference for:
1. 768-dim PhoBERT Bi-Encoder Vectorization (ONNX Dynamic INT8)
2. Robust 6-Class Intent Classification
3. Natural Language Preprocessing (Dialect harmonization, acronym decoding, greeting decoupling)

Usage:
  python ml/sidecar/serve.py --port 8000
"""

import os
import sys
import argparse
import joblib
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.abspath('ml/src'))
from enhanced_pipeline import VietnameseTextNormalizer, CLASSES

app = FastAPI(
    title="SmartWard AI Sidecar",
    description="Local Bi-Encoder & Intent Classification Service for SmartWard AI",
    version="1.0.0"
)

# Global model state
tokenizer = None
ort_session = None
intent_classifier = None
normalizer = None

class TextInput(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    embedding: list[float]
    pgvector_string: str

class ClassifyResponse(BaseModel):
    intent: str
    confidence: float
    probabilities: dict[str, float]

class PipelineResponse(BaseModel):
    original_text: str
    normalized_text: str
    substantive_text: str
    has_greeting: bool
    is_unaccented: bool
    intent: str
    confidence: float
    probabilities: dict[str, float]
    embedding: list[float]
    pgvector_string: str

def init_models():
    global tokenizer, ort_session, intent_classifier, normalizer
    print("Loading PhoBERT Bi-Encoder & Intent Classifier into Sidecar...")
    model_dir = "ml/models/fine_tuned_biencoder"
    onnx_path = "ml/models/bkai_finetuned_int8.onnx"
    clf_path = "ml/models/intent_classifier.joblib"
    
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 4
    opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    ort_session = ort.InferenceSession(onnx_path, opts, providers=['CPUExecutionProvider'])
    
    clf_dict = joblib.load(clf_path)
    intent_classifier = clf_dict['classifier']
    normalizer = VietnameseTextNormalizer()
    print("Sidecar models loaded successfully!")

@app.on_event("startup")
def startup_event():
    init_models()

@app.get("/health")
def health():
    return {
        "status": "UP",
        "service": "SmartWard AI Sidecar",
        "model": "bkai_pho_bert_ft_v1",
        "embedding_dim": 768,
        "quantization": "Dynamic INT8",
        "supported_intents": CLASSES
    }

def _embed(text: str) -> np.ndarray:
    enc = tokenizer([text], padding=True, truncation=True, max_length=256, return_tensors="np")
    feed = {'input_ids': enc['input_ids'], 'attention_mask': enc['attention_mask']}
    out = ort_session.run(None, feed)[0]
    norm = np.linalg.norm(out, axis=1, keepdims=True)
    norm = np.clip(norm, 1e-9, None)
    return (out / norm)[0]

def _to_pgvector(vec: np.ndarray) -> str:
    return "[" + ", ".join(f"{x:.6f}" for x in vec) + "]"

@app.post("/embed", response_model=EmbedResponse)
def embed_endpoint(payload: TextInput):
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    vec = _embed(payload.text.strip())
    return EmbedResponse(
        embedding=vec.tolist(),
        pgvector_string=_to_pgvector(vec)
    )

@app.post("/classify", response_model=ClassifyResponse)
def classify_endpoint(payload: TextInput):
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    norm_res = normalizer.normalize(payload.text)
    clean_t = norm_res['substantive'] or norm_res['normalized']
    
    vec = _embed(clean_t).reshape(1, -1)
    probs = intent_classifier.predict_proba(vec)[0]
    classes = intent_classifier.classes_
    prob_dict = {cls: float(p) for cls, p in zip(classes, probs)}
    best_idx = np.argmax(probs)
    best_intent = classes[best_idx]
    
    # Guardrail: GREETING requires actual greeting words
    if best_intent == 'GREETING' and not norm_res['has_greeting']:
        if 'GREETING' in classes:
            g_idx = list(classes).index('GREETING')
            p_copy = probs.copy()
            p_copy[g_idx] = -1.0
            best_idx = np.argmax(p_copy)
            best_intent = classes[best_idx]
            
    best_conf = float(probs[best_idx])
    
    return ClassifyResponse(
        intent=best_intent,
        confidence=round(best_conf, 4),
        probabilities={k: round(v, 4) for k, v in prob_dict.items()}
    )

@app.post("/pipeline", response_model=PipelineResponse)
def pipeline_endpoint(payload: TextInput):
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    raw = payload.text.strip()
    norm_res = normalizer.normalize(raw)
    clean_t = norm_res['substantive'] or norm_res['normalized']
    
    vec = _embed(clean_t)
    vec_2d = vec.reshape(1, -1)
    
    probs = intent_classifier.predict_proba(vec_2d)[0]
    classes = intent_classifier.classes_
    prob_dict = {cls: float(p) for cls, p in zip(classes, probs)}
    
    best_idx = np.argmax(probs)
    best_intent = classes[best_idx]
    
    # Guardrail: GREETING requires actual greeting words
    if best_intent == 'GREETING' and not norm_res['has_greeting']:
        if 'GREETING' in classes:
            g_idx = list(classes).index('GREETING')
            p_copy = probs.copy()
            p_copy[g_idx] = -1.0
            best_idx = np.argmax(p_copy)
            best_intent = classes[best_idx]
            
    best_conf = float(probs[best_idx])
    
    return PipelineResponse(
        original_text=raw,
        normalized_text=norm_res['normalized'],
        substantive_text=clean_t,
        has_greeting=norm_res['has_greeting'],
        is_unaccented=norm_res['is_unaccented'],
        intent=best_intent,
        confidence=round(best_conf, 4),
        probabilities={k: round(v, 4) for k, v in prob_dict.items()},
        embedding=vec.tolist(),
        pgvector_string=_to_pgvector(vec)
    )

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--host', type=str, default='127.0.0.1')
    args = parser.parse_args()
    
    print(f"Starting SmartWard AI Sidecar on http://{args.host}:{args.port}...")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")
