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
import io
import wave
from pathlib import Path
from contextlib import asynccontextmanager
import joblib
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer
from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field
import uvicorn

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(BASE_DIR / 'ml' / 'src'))
from enhanced_pipeline import VietnameseTextNormalizer, CLASSES
from tts_normalizer import normalize_text_for_tts

class TextInput(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000, description="Input text to process (max 2000 characters)")

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
    global tokenizer, ort_session, intent_classifier, normalizer, piper_voice, active_tts_model_name
    print("Loading PhoBERT Bi-Encoder & Intent Classifier into Sidecar...")
    model_dir = str(BASE_DIR / "ml" / "models" / "fine_tuned_biencoder")
    onnx_path = str(BASE_DIR / "ml" / "models" / "bkai_finetuned_int8.onnx")
    clf_path = str(BASE_DIR / "ml" / "models" / "intent_classifier.joblib")
    
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 4
    opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    ort_session = ort.InferenceSession(onnx_path, opts, providers=['CPUExecutionProvider'])
    
    clf_dict = joblib.load(clf_path)
    intent_classifier = clf_dict['classifier']
    normalizer = VietnameseTextNormalizer()

    # Load Piper TTS Vietnamese Model (prefer Southern Male voice vietthao3886, then VPBank, fallback to vais1000)
    vietthao_model_path = BASE_DIR / "ml" / "models" / "tts" / "vietthao3886.onnx"
    vpbank_model_path = BASE_DIR / "ml" / "models" / "tts" / "vi_VN-csa-voice-piper-v3-medium.onnx"
    vais_model_path = BASE_DIR / "ml" / "models" / "tts" / "vi_VN-vais1000-medium.onnx"
    
    selected_model_path = None
    for candidate in [vietthao_model_path, vpbank_model_path, vais_model_path]:
        if candidate.exists():
            selected_model_path = candidate
            break

    if selected_model_path is not None:
        try:
            from piper.voice import PiperVoice
            piper_voice = PiperVoice.load(str(selected_model_path))
            active_tts_model_name = selected_model_path.stem
            print(f"Piper TTS Vietnamese Southern Male model '{active_tts_model_name}' loaded successfully!")
        except Exception as e:
            print(f"Warning: Failed to load Piper TTS model: {e}")
            piper_voice = None
            active_tts_model_name = None
    else:
        print("Note: Piper TTS model file not found, TTS endpoint will be disabled.")
        piper_voice = None
        active_tts_model_name = None

    print("Sidecar models loaded successfully!")

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_models()
    yield

app = FastAPI(
    title="SmartWard AI Sidecar",
    description="Local Bi-Encoder, Intent Classification & Piper TTS Service for SmartWard AI",
    version="1.1.0",
    lifespan=lifespan
)

# Global model state
tokenizer = None
ort_session = None
intent_classifier = None
normalizer = None
piper_voice = None
active_tts_model_name = None

@app.get("/health")
def health():
    return {
        "status": "UP",
        "service": "SmartWard AI Sidecar",
        "model": "bkai_pho_bert_ft_v1",
        "embedding_dim": 768,
        "quantization": "Dynamic INT8",
        "supported_intents": CLASSES,
        "tts_enabled": piper_voice is not None,
        "tts_model": active_tts_model_name
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

@app.post("/tts")
def tts_endpoint(payload: TextInput):
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    if piper_voice is None:
        raise HTTPException(status_code=503, detail="TTS model is not loaded in sidecar")
    
    try:
        from piper.config import SynthesisConfig
        
        # 1. Expand administrative acronyms & insert natural prosody breathing pauses
        spoken_text = normalize_text_for_tts(payload.text)
        if not spoken_text.strip():
            spoken_text = payload.text.strip()
            
        # 2. Synthesize with natural cadence (length_scale=1.05) and emotion variance
        buf = io.BytesIO()
        speaker_id = 0 if getattr(piper_voice.config, 'num_speakers', 1) > 1 else None
        syn = SynthesisConfig(speaker_id=speaker_id, length_scale=1.05, noise_scale=0.667)
        with wave.open(buf, "wb") as wav_file:
            piper_voice.synthesize_wav(spoken_text, wav_file, syn_config=syn)
        return Response(content=buf.getvalue(), media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis error: {str(e)}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--host', type=str, default='127.0.0.1')
    args = parser.parse_args()
    
    print(f"Starting SmartWard AI Sidecar on http://{args.host}:{args.port}...")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")
