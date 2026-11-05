#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step G3: Rigorous Isolated Benchmark of FP32, FP16, MatMul INT8, and Full INT8
Runs each model in a CLEAN INDEPENDENT SUBPROCESS to prevent cross-run memory pollution.
Measures:
- Disk file size (MB)
- Process RSS RAM before and after ONNX session creation (MB)
- Latency (batch=1, max_seq=256, 5 warmup, 50 runs): P50, P95, Mean (ms)
- DEV Intent Classification: Accuracy, Macro F1
- DEV Retrieval (N=120 INQUIRY): Proc R@1, Proc R@3, Proc MRR, Chunk MRR
"""

import os
import sys
import json
import time
import subprocess
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

VARIANTS = [
    {
        "name": "FP32 (Base ONNX)",
        "path": "ml/models/bkai_finetuned.onnx",
        "type": "fp32"
    },
    {
        "name": "FP16 (Half Precision)",
        "path": "ml/models/bkai_finetuned_fp16.onnx",
        "type": "fp16"
    },
    {
        "name": "INT8 (Selective MatMul)",
        "path": "ml/models/bkai_finetuned_matmul_int8.onnx",
        "type": "matmul_int8"
    },
    {
        "name": "INT8 (Dynamic All Ops)",
        "path": "ml/models/bkai_finetuned_int8.onnx",
        "type": "full_int8"
    }
]

SUBPROCESS_WORKER = """
import os
import sys
import json
import time
import psutil
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

sys.stdout.reconfigure(encoding='utf-8')

model_path = sys.argv[1]
model_type = sys.argv[2]

process = psutil.Process(os.getpid())
ram_initial = process.memory_info().rss / (1024 * 1024)

# 1. Load Tokenizer & Session
tok = AutoTokenizer.from_pretrained("ml/models/fine_tuned_biencoder")
sess_opts = ort.SessionOptions()
sess_opts.intra_op_num_threads = 4
sess = ort.InferenceSession(model_path, sess_opts, providers=['CPUExecutionProvider'])

ram_after_model = process.memory_info().rss / (1024 * 1024)
ram_delta = ram_after_model - ram_initial

# 2. Benchmark Single-Item Latency (batch=1, max_seq=256)
dummy_text = "Tôi muốn làm thủ tục đăng ký khai sinh lại cho con thì cần những giấy tờ gì và nộp ở đâu?"
dummy_enc = tok([dummy_text], padding="max_length", truncation=True, max_length=256, return_tensors="np")
feed = {'input_ids': dummy_enc['input_ids'], 'attention_mask': dummy_enc['attention_mask']}

# Warmup 5 runs
for _ in range(5):
    _ = sess.run(None, feed)

# Measure 50 runs
latencies = []
for _ in range(50):
    t0 = time.perf_counter()
    _ = sess.run(None, feed)
    t1 = time.perf_counter()
    latencies.append((t1 - t0) * 1000.0)

p50 = float(np.percentile(latencies, 50))
p95 = float(np.percentile(latencies, 95))
mean_lat = float(np.mean(latencies))

# 3. Evaluate DEV Accuracy & Retrieval
with open('ml/data/train.json', 'r', encoding='utf-8') as f:
    train_data = json.load(f)
with open('ml/data/dev.json', 'r', encoding='utf-8') as f:
    dev_data = json.load(f)
with open('ml/data/legal_inventory.json', 'r', encoding='utf-8') as f:
    inv = json.load(f)

chunks = []
for p in inv:
    for c in p['chunks']:
        content = c.get('content', '').replace('\\n', ' ')
        text = f"Thủ tục: {p['name']}. Lĩnh vực: {p.get('category', '')}. Mục: {c.get('title', '')}. Nội dung: {content}".strip()
        chunks.append({
            "chunk_id": c['chunkId'],
            "procedure_code": p['code'],
            "text": text
        })

def embed_texts(texts, batch_size=32):
    embs = []
    for i in range(0, len(texts), batch_size):
        b = texts[i:i+batch_size]
        e = tok(b, padding=True, truncation=True, max_length=256, return_tensors="np")
        out = sess.run(None, {'input_ids': e['input_ids'], 'attention_mask': e['attention_mask']})[0]
        # normalize
        norms = np.linalg.norm(out, axis=1, keepdims=True)
        norms = np.clip(norms, 1e-9, None)
        embs.append(out / norms)
    return np.vstack(embs)

# Embed Train & Dev for Intent Classification
X_train = embed_texts([s['text'] for s in train_data])
X_dev = embed_texts([s['text'] for s in dev_data])
y_train = [s['intent'] for s in train_data]
y_dev = [s['intent'] for s in dev_data]

clf = LogisticRegression(max_iter=1000, class_weight='balanced', C=1.0, random_state=42)
clf.fit(X_train, y_train)
preds = clf.predict(X_dev)
acc = float(accuracy_score(y_dev, preds))
macro_f1 = float(precision_recall_fscore_support(y_dev, preds, average='macro', zero_division=0)[2])

# Retrieval evaluation on DEV INQUIRY
chunk_embs = embed_texts([c['text'] for c in chunks])
dev_inquiry = [s for s in dev_data if s['intent'] == 'PROCEDURE_INQUIRY']
inq_embs = embed_texts([s['text'] for s in dev_inquiry])

sim_mat = np.dot(inq_embs, chunk_embs.T)

pr1, pr3, pmrr = [], [], []
cr1, cr3, cmrr = [], [], []

for i, s in enumerate(dev_inquiry):
    gold_chunks = set(s['gold_chunk_ids'])
    gold_proc = s['procedure_code']
    scores = sim_mat[i]
    top_idx = np.argsort(-scores)
    
    # Chunk
    top1_c = chunks[top_idx[0]]['chunk_id']
    top3_c = [chunks[k]['chunk_id'] for k in top_idx[:3]]
    cr1.append(1.0 if top1_c in gold_chunks else 0.0)
    cr3.append(1.0 if any(k in gold_chunks for k in top3_c) else 0.0)
    c_rank = None
    for r_i, k in enumerate(top_idx):
        if chunks[k]['chunk_id'] in gold_chunks:
            c_rank = r_i + 1
            break
    cmrr.append((1.0 / c_rank) if c_rank else 0.0)
    
    # Procedure
    seen_procs = []
    for k in top_idx:
        p_code = chunks[k]['procedure_code']
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

res = {
    "ram_initial_mb": round(ram_initial, 2),
    "ram_after_model_mb": round(ram_after_model, 2),
    "ram_delta_mb": round(ram_delta, 2),
    "latency_p50_ms": round(p50, 2),
    "latency_p95_ms": round(p95, 2),
    "latency_mean_ms": round(mean_lat, 2),
    "intent_accuracy": round(acc, 4),
    "intent_macro_f1": round(macro_f1, 4),
    "proc_r1": round(float(np.mean(pr1)), 4),
    "proc_r3": round(float(np.mean(pr3)), 4),
    "proc_mrr": round(float(np.mean(pmrr)), 4),
    "chunk_r1": round(float(np.mean(cr1)), 4),
    "chunk_r3": round(float(np.mean(cr3)), 4),
    "chunk_mrr": round(float(np.mean(cmrr)), 4)
}
print(json.dumps(res))
"""

def main():
    print("="*85)
    print("STEP G3: STANDALONE BENCHMARK OF FP32, FP16, MATMUL INT8, AND FULL INT8")
    print("="*85)
    
    # Write worker script to scratch file
    worker_path = "ml/src/_g3_worker.py"
    with open(worker_path, "w", encoding="utf-8") as f:
        f.write(SUBPROCESS_WORKER)
        
    results = []
    
    for v in VARIANTS:
        name = v["name"]
        path = v["path"]
        vtype = v["type"]
        size_mb = os.path.getsize(path) / (1024 * 1024)
        
        print(f"\nBenchmarking [{name}] in a fresh subprocess...")
        print(f"  File: {path} ({size_mb:.2f} MB)")
        
        # Run clean subprocess
        cmd = [sys.executable, worker_path, path, vtype]
        proc = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        
        if proc.returncode != 0:
            print(f"  [ERROR] Process failed with returncode {proc.returncode}:")
            print(proc.stderr)
            continue
            
        try:
            # Parse last line as JSON
            output_lines = proc.stdout.strip().split('\n')
            data = json.loads(output_lines[-1])
            data["name"] = name
            data["file_path"] = path
            data["file_size_mb"] = round(size_mb, 2)
            results.append(data)
            
            print(f"  RAM Delta: {data['ram_delta_mb']} MB (Total: {data['ram_after_model_mb']} MB)")
            print(f"  Latency (batch=1): Mean = {data['latency_mean_ms']} ms | P50 = {data['latency_p50_ms']} ms | P95 = {data['latency_p95_ms']} ms")
            print(f"  Intent: Acc = {data['intent_accuracy']:.2%} | Macro F1 = {data['intent_macro_f1']:.2%}")
            print(f"  Retrieval: Proc R@1 = {data['proc_r1']:.2%} | Proc R@3 = {data['proc_r3']:.2%} | Chunk MRR = {data['chunk_mrr']:.4f}")
        except Exception as e:
            print(f"  [ERROR] Failed to parse output: {e}")
            print("Stdout:", proc.stdout)
            
    # Cleanup worker
    if os.path.exists(worker_path):
        os.remove(worker_path)
        
    # Print comparison table
    print("\n" + "="*85)
    print("QUANTIZATION BENCHMARK SUMMARY TABLE")
    print("="*85)
    header = f"{'Variant':<25} | {'Size (MB)':<10} | {'RAM (MB)':<10} | {'P50 (ms)':<10} | {'Proc R@3':<10} | {'Chunk MRR':<10} | {'Intent Acc'}"
    print(header)
    print("-" * len(header))
    for r in results:
        print(f"{r['name']:<25} | {r['file_size_mb']:<10.2f} | {r['ram_delta_mb']:<10.2f} | {r['latency_p50_ms']:<10.2f} | {r['proc_r3']:<10.2%} | {r['chunk_mrr']:<10.4f} | {r['intent_accuracy']:.2%}")
        
    with open("ml/runs/g3_benchmark_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print("\n[OK] Results written to ml/runs/g3_benchmark_results.json")

if __name__ == '__main__':
    main()
