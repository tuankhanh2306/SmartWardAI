#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tests the SmartWard AI Sidecar endpoints locally without opening a socket port.
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')
from serve import init_models, health, embed_endpoint, classify_endpoint, pipeline_endpoint, TextInput

def main():
    print("Testing Sidecar endpoints directly...")
    init_models()
    
    # 1. Health
    res_h = health()
    print("Health response:", res_h)
    assert res_h["status"] == "UP"
    
    # 2. Embed
    res_e = embed_endpoint(TextInput(text="Thủ tục đăng ký khai sinh"))
    emb = res_e.embedding
    assert len(emb) == 768
    print(f"Embedding length: {len(emb)}, first 3 values: {emb[:3]}")
    
    # 3. Classify
    test_queries = [
        ("Xin chào cán bộ xã", "GREETING"),
        ("UBND xã mở cửa mấy giờ", "COMMUNE_INFO"),
        ("Danh mục các thủ tục hành chính tại xã", "PROCEDURE_CATALOG"),
        ("Làm hộ chiếu ở đâu", "OUT_OF_SCOPE"),
        ("Hết bao nhiêu tiền", "AMBIGUOUS"),
        ("Tôi muốn làm giấy khai sinh cho con", "PROCEDURE_INQUIRY")
    ]
    
    print("\nTesting Intent Classification:")
    for query, expected in test_queries:
        res_c = classify_endpoint(TextInput(text=query))
        print(f"Query: '{query}' -> Intent: {res_c.intent} (Conf: {res_c.confidence:.2%}) [Expected: {expected}]")
        
    # 4. Pipeline
    res_p = pipeline_endpoint(TextInput(text="Chào cán bộ, dk khai sinh cho con can giay to gi"))
    print("\nPipeline test:")
    print("Original:", res_p.original_text)
    print("Substantive:", res_p.substantive_text)
    print("Has Greeting:", res_p.has_greeting)
    print("Intent:", res_p.intent)
    print("Confidence:", res_p.confidence)
    print("Pgvector string preview:", res_p.pgvector_string[:40] + "...")
    print("\nALL SIDECAR LOCAL TESTS PASSED!")

if __name__ == '__main__':
    main()
