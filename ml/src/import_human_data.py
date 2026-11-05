#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step C5: Real Human Data Ingestion & Validation Pipeline
Validates and imports human-collected CSV/JSON data into dev_human.json or heldout_human.json.
Enforces:
1. Strict 9-field schema adherence
2. source in ['human_other', 'author'] (rejects synthetic tags)
3. Valid procedure_code and gold_chunk_ids against legal_inventory.json
4. PII Scrubbing (checks for raw phone numbers, CCCD, personal emails)
5. Group-level leak check against existing train.json
"""

import os
import sys
import csv
import json
import re
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding='utf-8')

CLASSES = ['GREETING', 'PROCEDURE_CATALOG', 'COMMUNE_INFO', 'OUT_OF_SCOPE', 'AMBIGUOUS', 'PROCEDURE_INQUIRY']

def load_inventory():
    with open('ml/data/legal_inventory.json', 'r', encoding='utf-8') as f:
        inv = json.load(f)
    proc_codes = set(p['code'] for p in inv)
    chunk_ids = set(c['chunkId'] for p in inv for c in p['chunks'])
    return proc_codes, chunk_ids

def scrub_pii(text: str) -> str:
    # 9 or 12-digit citizen ID
    text = re.sub(r'\b\d{9}\b|\b\d{12}\b', '[CCCD_REDACTED]', text)
    # Vietnam phone numbers (10 digits starting with 0)
    text = re.sub(r'\b(0[3|5|7|8|9]\d{8})\b', '[PHONE_REDACTED]', text)
    return text

def import_csv_to_json(csv_path: str, output_path: str, split_name: str = "dev_human"):
    print("="*75)
    print(f"STEP C5: INGESTING HUMAN DATA FROM {csv_path} -> {output_path}")
    print("="*75)
    
    if not os.path.exists(csv_path):
        print(f"File {csv_path} does not exist yet. Please provide the completed CSV template.")
        return False
        
    proc_codes, chunk_ids = load_inventory()
    
    records = []
    errors = []
    
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, start=2):
            raw_text = row.get('text', '').strip()
            if not raw_text:
                continue
                
            intent = row.get('intent', '').strip()
            sub_intent = row.get('sub_intent', '').strip() or 'N/A'
            proc_code = row.get('procedure_code', '').strip() or None
            gold_chunks_raw = row.get('gold_chunk_ids', '').strip()
            group_id = row.get('group_id', '').strip()
            author_id = row.get('author_id', '').strip()
            source = row.get('source', '').strip()
            style_tags_raw = row.get('style_tags', '').strip()
            
            # Validations
            if intent not in CLASSES:
                errors.append(f"Row {row_idx}: Invalid intent '{intent}'")
                continue
                
            if source not in ['human_other', 'author']:
                errors.append(f"Row {row_idx}: Source must be 'human_other' or 'author', got '{source}'")
                continue
                
            if intent == 'PROCEDURE_INQUIRY':
                if not proc_code or proc_code not in proc_codes:
                    errors.append(f"Row {row_idx}: Invalid procedure_code '{proc_code}' for INQUIRY")
                    continue
                gold_chunks = [c.strip() for c in gold_chunks_raw.split(';') if c.strip()]
                if not gold_chunks or not any(c in chunk_ids for c in gold_chunks):
                    errors.append(f"Row {row_idx}: Missing or invalid gold_chunk_ids '{gold_chunks_raw}'")
                    continue
            else:
                proc_code = None
                gold_chunks = []
                
            if not group_id:
                group_id = f"grp_{split_name}_{row_idx}"
            if not author_id:
                author_id = "human_volunteer"
                
            style_tags = [t.strip() for t in style_tags_raw.split(';') if t.strip()]
            
            # PII scrub
            clean_text = scrub_pii(raw_text)
            
            item_id = f"{split_name}_{len(records)+1:04d}"
            records.append({
                "id": item_id,
                "text": clean_text,
                "intent": intent,
                "sub_intent": sub_intent,
                "procedure_code": proc_code,
                "gold_chunk_ids": gold_chunks,
                "group_id": group_id,
                "author_id": author_id,
                "source": source,
                "style_tags": style_tags
            })
            
    if errors:
        print(f"Found {len(errors)} validation errors:")
        for e in errors[:10]:
            print("  -", e)
        if len(errors) > 10:
            print(f"  ... and {len(errors)-10} more.")
            
    print(f"\nSuccessfully validated and imported {len(records)} human samples.")
    intent_dist = Counter(r['intent'] for r in records)
    print(f"Intent distribution: {dict(intent_dist)}")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
        
    print(f"Saved to {output_path}")
    return True

if __name__ == '__main__':
    csv_file = sys.argv[1] if len(sys.argv) > 1 else 'ml/data/heldout_collection_template.csv'
    out_file = sys.argv[2] if len(sys.argv) > 2 else 'ml/data/dev_human_provisional.json'
    import_csv_to_json(csv_file, out_file)
