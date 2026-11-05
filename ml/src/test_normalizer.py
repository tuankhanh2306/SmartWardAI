#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Enhanced Pipeline Experimentation
"""

import sys
import os
import json
import re
import unicodedata
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

CLASSES = [
    'PROCEDURE_INQUIRY',
    'OUT_OF_SCOPE',
    'AMBIGUOUS',
    'GREETING',
    'COMMUNE_INFO',
    'PROCEDURE_CATALOG'
]

def remove_accents(input_str: str) -> str:
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    res = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    return res.replace('đ', 'd').replace('Đ', 'D')

def is_unaccented(text: str) -> bool:
    accented_chars = set('àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ')
    return not any(c in accented_chars for c in text.lower())

DIALECT_MAP = [
    (r'\b(con|vợ|chồng|ba|má|anh|chị|em)\s+tui\b', r'\1 tôi'),
    (r'\btui\b', 'tôi'),
    (r'\b(mới|đi|đang)\s+sanh\b', r'\1 sinh'),
    (r'\bkhai\s+sanh\b', 'khai sinh'),
    (r'\bgiấy\s+sanh\b', 'giấy khai sinh'),
    (r'\bsanh\s+con\b', 'sinh con'),
    (r'\bhổng\b', 'không'),
    (r'\bhong\b', 'không'),
    (r'\bmần\b', 'làm'),
    (r'\bbận\b', 'lần'),
    (r'\b(hén|nghen|nhen|nè|nghe bạn|nhe bạn)\b', ''),
]

ABBREV_MAP = [
    (r'\b(đk|dk)\b', 'đăng ký'),
    (r'\btthc\b', 'thủ tục hành chính'),
    (r'\bcccd\b', 'căn cước công dân'),
    (r'\bcmnd\b', 'chứng minh nhân dân'),
    (r'\bgks\b', 'giấy khai sinh'),
    (r'\bubnd\b', 'ủy ban nhân dân'),
    (r'\bbhxh\b', 'bảo hiểm xã hội'),
    (r'\bbhyt\b', 'bảo hiểm y tế'),
    (r'\bgxn\b', 'giấy xác nhận'),
    (r'\b(ko|kô|k)\b', 'không'),
    (r'\b(đc|dc)\b', 'được'),
    (r'\bsao\s+y\b', 'chứng thực sao y bản chính'),
    (r'\bhộ\s*khẩu\b', 'hộ khẩu'),
    (r'\bhk\b', 'hộ khẩu'),
    (r'\bks\b', 'khai sinh'),
    (r'\bkt\b', 'khai tử'),
    (r'\bxn\b', 'xác nhận'),
    (r'\btt\b', 'thông tin'),
]

GREETING_PATTERNS = [
    r'^(xin chào|chào bạn|chào cán bộ|chào|hello|hi|alo|dạ chào|dạ kính chào|dạ|kính chào|bạn ơi|anh ơi|chị ơi)[,\.\s]+(.*)$',
    r'^(cho mình hỏi|cho em hỏi|cho tôi hỏi|bác cho hỏi|anh cho hỏi|chị cho hỏi|hỏi|xin hỏi)[,\.\s]+(.*)$'
]

def normalize_vietnamese_text(text: str) -> dict:
    t = unicodedata.normalize('NFC', text.strip().lower())
    
    # 1. Apply dialect normalization
    for pat, repl in DIALECT_MAP:
        t = re.sub(pat, repl, t, flags=re.IGNORECASE)
        
    # 2. Apply abbreviation normalization
    for pat, repl in ABBREV_MAP:
        t = re.sub(pat, repl, t, flags=re.IGNORECASE)
        
    # Clean whitespace
    t = re.sub(r'\s+', ' ', t).strip()
    
    # 3. Decouple greeting if present
    substantive = t
    has_greeting = False
    for pat in GREETING_PATTERNS:
        m = re.match(pat, substantive, flags=re.IGNORECASE)
        if m:
            has_greeting = True
            rem = m.group(2).strip()
            if len(rem.split()) >= 2:
                substantive = rem
                
    # 4. Short query expansion for common single-topic inquiries
    if len(t.split()) <= 2:
        if t in ['ket hon', 'kết hôn']:
            substantive = 'đăng ký kết hôn'
        elif t in ['khai sinh']:
            substantive = 'đăng ký khai sinh'
        elif t in ['khai tu', 'khai tử']:
            substantive = 'đăng ký khai tử'
        elif t in ['sao y']:
            substantive = 'chứng thực sao y bản sao'
        elif t in ['giay to', 'giấy tờ']:
            substantive = 'hồ sơ giấy tờ thủ tục hành chính'
        elif t in ['bao lau', 'bao lâu']:
            substantive = 'thời gian giải quyết bao lâu'
            
    return {
        "raw": text,
        "normalized": t,
        "substantive": substantive,
        "has_greeting": has_greeting,
        "is_unaccented": is_unaccented(text)
    }

print("Testing normalizer on stress examples:")
for s in [
    'con tui mới sanh, đi khai sanh ở xã cần giấy tờ gì vậy',
    'xin hoi lam giay khai sinh tre qua han 1 nam can ho so gi',
    'hi, xin hoi khai tu can giay to gi',
    'ket hon',
    'sao y',
    'co mat phi k',
    'xin chào, mình ở xã khác muốn làm giấy xác nhận độc thân thì sao'
]:
    res = normalize_vietnamese_text(s)
    print(f"Original: '{s}'")
    print(f" -> Norm: '{res['normalized']}'")
    print(f" -> Substantive: '{res['substantive']}' (Greeting: {res['has_greeting']}, Unaccented: {res['is_unaccented']})")
    print()
