#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step P2.1: Precompute 768-dim Legal Chunk Embeddings
Embeds all 179 legal chunks using the fine-tuned PhoBERT Bi-Encoder (bkai_pho_bert_ft_v1).
1. Updates backend/src/main/resources/db/seed/procedures/*.json with precomputed pgvector embeddings.
2. Generates backend/src/main/resources/db/migration/V2__seed_legal_chunks.sql for instant DB initialization.
"""

import os
import sys
import glob
import json
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

sys.stdout.reconfigure(encoding='utf-8')

def main():
    print("="*80)
    print("STEP P2.1: PRECOMPUTING 768-DIM LEGAL CHUNK EMBEDDINGS (PHOBERT FT)")
    print("="*80)
    
    model_dir = "ml/models/fine_tuned_biencoder"
    onnx_path = "ml/models/bkai_finetuned.onnx"
    seed_dir = "backend/src/main/resources/db/seed/procedures"
    sql_out_path = "backend/src/main/resources/db/migration/V2__seed_legal_chunks.sql"
    
    print(f"Loading tokenizer from: {model_dir}")
    tok = AutoTokenizer.from_pretrained(model_dir)
    print(f"Loading ONNX model from: {onnx_path}")
    sess = ort.InferenceSession(onnx_path, providers=['CPUExecutionProvider'])
    
    seed_files = sorted(glob.glob(os.path.join(seed_dir, "*.json")))
    print(f"Found {len(seed_files)} seed procedure files in {seed_dir}")
    
    all_chunks = []
    
    # 1. Collect all chunks and their canonical text
    for fpath in seed_files:
        with open(fpath, 'r', encoding='utf-8') as f:
            pdata = json.load(f)
            
        p_code = pdata.get('procedureCode') or pdata.get('code')
        p_name = pdata.get('procedureName') or pdata.get('name')
        p_cat = pdata.get('category', 'Hành chính công')
        
        for c in pdata.get('chunks', []):
            cid = c.get('chunkId')
            title = c.get('title', '')
            content = c.get('content', '').replace('\n', ' ')
            
            # Canonical prefix representation optimized during fine-tuning
            text = f"Thủ tục: {p_name}. Lĩnh vực: {p_cat}. Mục: {title}. Nội dung: {content}".strip()
            all_chunks.append({
                "file_path": fpath,
                "procedure_code": p_code,
                "procedure_name": p_name,
                "category": p_cat,
                "chunk_id": cid,
                "chunk_type": c.get('chunkType', 'OVERVIEW'),
                "title": title,
                "content": c.get('content', ''),
                "legal_reference": c.get('legalReference', ''),
                "embed_text": text
            })
            
    print(f"Total chunks to embed: {len(all_chunks)}")
    
    # 2. Batch embedding
    texts = [c['embed_text'] for c in all_chunks]
    batch_size = 32
    all_embs = []
    
    for i in range(0, len(texts), batch_size):
        b = texts[i:i+batch_size]
        enc = tok(b, padding=True, truncation=True, max_length=256, return_tensors="np")
        feed = {'input_ids': enc['input_ids'], 'attention_mask': enc['attention_mask']}
        out = sess.run(None, feed)[0]
        # L2 normalize
        norms = np.linalg.norm(out, axis=1, keepdims=True)
        norms = np.clip(norms, 1e-9, None)
        all_embs.append(out / norms)
        print(f"  Embedded {min(i+batch_size, len(texts))}/{len(texts)} chunks...")
        
    embeddings_matrix = np.vstack(all_embs)
    print(f"Computed embeddings shape: {embeddings_matrix.shape}")
    
    # 3. Update seed JSON files
    chunk_emb_map = {}
    for i, c in enumerate(all_chunks):
        vec_str = "[" + ", ".join(f"{x:.6f}" for x in embeddings_matrix[i]) + "]"
        chunk_emb_map[(c['file_path'], c['chunk_id'])] = vec_str
        
    for fpath in seed_files:
        with open(fpath, 'r', encoding='utf-8') as f:
            pdata = json.load(f)
            
        for c in pdata.get('chunks', []):
            cid = c.get('chunkId')
            key = (fpath, cid)
            if key in chunk_emb_map:
                c['embedding'] = chunk_emb_map[key]
                
        with open(fpath, 'w', encoding='utf-8') as f:
            json.dump(pdata, f, ensure_ascii=False, indent=2)
            
    print(f"[OK] Updated all {len(seed_files)} seed JSON files with precomputed embeddings.")
    
    # 4. Generate V2 Migration SQL
    print(f"Generating Flyway migration script: {sql_out_path}")
    sql_lines = [
        "-- =====================================================================",
        "-- SmartWard AI - Database Migration V2: Pre-seeded Legal Chunks & Embeddings",
        "-- Automatically generated from bkai_pho_bert_ft_v1 (768-dim normalized vectors)",
        "-- =====================================================================\n"
    ]
    
    # Insert procedures
    for fpath in seed_files:
        with open(fpath, 'r', encoding='utf-8') as f:
            p = json.load(f)
        p_code = p.get('procedureCode', '')
        portal_code = p.get('officialPortalCode', '')
        name = p.get('procedureName', '').replace("'", "''")
        cat = p.get('category', 'Hành chính công').replace("'", "''")
        agency = p.get('agency', 'Ủy ban nhân dân cấp xã / phường').replace("'", "''")
        proc_time = p.get('processingTime', 'Theo quy định').replace("'", "''")
        fee = p.get('fee', 'Theo quy định').replace("'", "''")
        source = p.get('sourceUrl', '').replace("'", "''")
        
        sql_lines.append(
            f"INSERT INTO admin_procedures (procedure_code, portal_code, procedure_name, category, agency, processing_time, fee, source_url, status) "
            f"VALUES ('{p_code}', '{portal_code}', '{name}', '{cat}', '{agency}', '{proc_time}', '{fee}', '{source}', 'ACTIVE') "
            f"ON CONFLICT (procedure_code) DO UPDATE SET procedure_name = EXCLUDED.procedure_name;\n"
        )
        
        # Insert chunks for this procedure
        for c in p.get('chunks', []):
            cid = c.get('chunkId', '')
            ctype = c.get('chunkType', 'OVERVIEW')
            title = c.get('title', '').replace("'", "''")
            content = c.get('content', '').replace("'", "''")
            lref = c.get('legalReference', '').replace("'", "''")
            emb = c.get('embedding', '[]')
            
            sql_lines.append(
                f"INSERT INTO legal_chunks (procedure_id, chunk_code, chunk_type, title, content, legal_reference, embedding, status) "
                f"SELECT id, '{cid}', '{ctype}', '{title}', '{content}', '{lref}', '{emb}'::vector, 'ACTIVE' "
                f"FROM admin_procedures WHERE procedure_code = '{p_code}' "
                f"ON CONFLICT (chunk_code) DO UPDATE SET embedding = EXCLUDED.embedding, content = EXCLUDED.content;\n"
            )
            
    with open(sql_out_path, 'w', encoding='utf-8') as f:
        f.writelines(sql_lines)
        
    print(f"[OK] Generated {sql_out_path} ({os.path.getsize(sql_out_path)/(1024*1024):.2f} MB)")
    print("STEP P2.1 COMPLETE!")

if __name__ == '__main__':
    main()
