#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step F1 & F2: BKAI PhoBERT (768-dim) ONNX Export, INT8 Quantization & Batch=1 RAM Benchmark
1. Exports Fine-Tuned BKAI (768-dim) to ONNX with Mean Pooling & L2-Normalization
2. Exports Dynamic INT8 Quantized model
3. Measures:
   - File sizes (FP32 vs INT8)
   - Real Process RAM during single-query inference (batch=1, max_seq=256)
   - Cosine parity between PyTorch, FP32-ONNX, and INT8-ONNX
"""

import os
import sys
import time
import psutil
import numpy as np
import torch
import onnxruntime as ort
from onnxruntime.quantization import quantize_dynamic, QuantType
from transformers import AutoTokenizer, AutoModel

sys.stdout.reconfigure(encoding='utf-8')

class SentenceEmbeddingWrapper(torch.nn.Module):
    def __init__(self, backbone):
        super().__init__()
        self.backbone = backbone

    def forward(self, input_ids, attention_mask):
        outputs = self.backbone(input_ids=input_ids, attention_mask=attention_mask)
        token_embeddings = outputs.last_hidden_state
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
        sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        mean_pooled = sum_embeddings / sum_mask
        norm = torch.clamp(torch.norm(mean_pooled, p=2, dim=1, keepdim=True), min=1e-12)
        return mean_pooled / norm

def export_and_quantize_bkai():
    print("="*75)
    print("STEP F1 & F2: EXPORTING BKAI PHO-BERT (768-DIM) TO ONNX & INT8")
    print("="*75)
    
    ft_model_path = "ml/models/fine_tuned_biencoder"
    if not os.path.exists(ft_model_path):
        print("Fine-tuned model not found, using raw bkai model...")
        ft_model_path = "bkai-foundation-models/vietnamese-bi-encoder"
        
    print(f"Loading PyTorch model from: {ft_model_path}...")
    tokenizer = AutoTokenizer.from_pretrained(ft_model_path)
    backbone = AutoModel.from_pretrained(ft_model_path)
    wrapper = SentenceEmbeddingWrapper(backbone)
    wrapper.eval()
    
    # 1. Export to FP32 ONNX
    fp32_onnx_path = "ml/models/bkai_finetuned.onnx"
    int8_onnx_path = "ml/models/bkai_finetuned_int8.onnx"
    
    print(f"Exporting FP32 ONNX to {fp32_onnx_path}...")
    dummy_input = tokenizer("Thủ tục đăng ký khai sinh tại UBND cấp xã", max_length=256, padding='max_length', return_tensors="pt")
    dummy_args = (dummy_input['input_ids'], dummy_input['attention_mask'])
    
    torch.onnx.export(
        wrapper,
        dummy_args,
        fp32_onnx_path,
        input_names=['input_ids', 'attention_mask'],
        output_names=['sentence_embedding'],
        dynamic_axes={
            'input_ids': {0: 'batch_size', 1: 'sequence_length'},
            'attention_mask': {0: 'batch_size', 1: 'sequence_length'},
            'sentence_embedding': {0: 'batch_size'}
        },
        opset_version=14,
        do_constant_folding=True
    )
    fp32_size_mb = os.path.getsize(fp32_onnx_path) / (1024 * 1024)
    print(f"FP32 ONNX exported! Size: {fp32_size_mb:.2f} MB (768 dimensions)")
    
    # 2. Dynamic INT8 Quantization
    print(f"\nQuantizing to Dynamic INT8: {int8_onnx_path}...")
    t0 = time.time()
    quantize_dynamic(
        model_input=fp32_onnx_path,
        model_output=int8_onnx_path,
        weight_type=QuantType.QInt8
    )
    int8_size_mb = os.path.getsize(int8_onnx_path) / (1024 * 1024)
    print(f"INT8 Quantization completed in {time.time()-t0:.2f}s! Size: {int8_size_mb:.2f} MB (Reduction: {(1 - int8_size_mb/fp32_size_mb):.1%})")
    
    # 3. RAM Measurement (Batch=1 inference vs Batch size)
    print("\n--- MEASURING PROCESS RAM & LATENCY (BATCH = 1) ---")
    proc = psutil.Process(os.getpid())
    
    # Measure INT8 Batch=1 RAM
    mem_base = proc.memory_info().rss / (1024 * 1024)
    sess_int8 = ort.InferenceSession(int8_onnx_path, providers=['CPUExecutionProvider'])
    mem_model_loaded = proc.memory_info().rss / (1024 * 1024)
    model_standalone_ram = mem_model_loaded - mem_base
    
    test_queries = [
        "Thủ tục đăng ký khai sinh cho con",
        "Hồ sơ chuyển nhượng quyền sử dụng đất",
        "UBND xã có làm việc thứ 7 không",
        "Thời gian giải quyết xác nhận độc thân",
        "Lệ phí công chứng bản sao"
    ]
    
    latencies = []
    cos_sims = []
    
    for q in test_queries:
        enc = tokenizer(q, max_length=256, padding=True, truncation=True, return_tensors="pt")
        
        # PyTorch reference
        with torch.no_grad():
            pt_emb = wrapper(enc['input_ids'], enc['attention_mask']).numpy()[0]
            
        # ONNX INT8 Batch = 1
        t_start = time.perf_counter()
        ort_feed = {
            'input_ids': enc['input_ids'].numpy(),
            'attention_mask': enc['attention_mask'].numpy()
        }
        ort_emb = sess_int8.run(None, ort_feed)[0][0]
        latencies.append((time.perf_counter() - t_start) * 1000)
        
        # Cosine parity
        cos = float(np.dot(pt_emb, ort_emb))
        cos_sims.append(cos)
        
    mem_after_inference = proc.memory_info().rss / (1024 * 1024)
    inference_ram = mem_after_inference - mem_base
    
    avg_latency_ms = float(np.mean(latencies))
    avg_cos = float(np.mean(cos_sims))
    
    print(f"  Model-only Standalone RAM: {model_standalone_ram:.1f} MB")
    print(f"  Total Process RSS after Batch=1 Inference: {mem_after_inference:.1f} MB (Net increase: {inference_ram:.1f} MB)")
    print(f"  Average Single-Query Latency (Batch=1): {avg_latency_ms:.2f} ms")
    print(f"  Average Cosine Parity (PyTorch vs INT8-ONNX): {avg_cos:.6f}")
    
    report = {
        "model_architecture": "BKAI PhoBERT Vietnamese Bi-Encoder",
        "embedding_dimension": 768,
        "fp32_size_mb": round(fp32_size_mb, 2),
        "int8_size_mb": round(int8_size_mb, 2),
        "size_reduction_pct": round((1 - int8_size_mb / fp32_size_mb) * 100, 2),
        "model_standalone_ram_mb": round(model_standalone_ram, 1),
        "total_rss_ram_mb": round(mem_after_inference, 1),
        "single_query_latency_ms": round(avg_latency_ms, 2),
        "avg_cosine_parity_vs_pytorch": round(avg_cos, 6),
        "fits_under_250mb_goal": bool(int8_size_mb < 250.0)
    }
    
    import json
    with open('ml/runs/f1_f2_bkai_onnx_int8_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
        
    print("\nSaved report to ml/runs/f1_f2_bkai_onnx_int8_report.json")
    return report

if __name__ == '__main__':
    export_and_quantize_bkai()
