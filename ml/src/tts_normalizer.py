#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Administrative Vietnamese TTS Text Normalizer.
Expands official civic acronyms, legal citations, dates, currencies,
and inserts prosodic pause punctuation for smooth, natural speech synthesis.
"""

import re

def normalize_text_for_tts(text: str) -> str:
    if not text:
        return ""

    t = text

    # 1. Remove markdown formatting, brackets, hashes, and internal chunk codes
    t = re.sub(r'\[[A-Za-z0-9_\-]+\]', '', t)
    t = re.sub(r'[*#_~`>]', ' ', t)
    t = re.sub(r'[\r\t]', ' ', t)

    # 2. Expand Legal Document & Citation Numbers
    # E.g. "01/07/2026" or "ngày 01/07/2026"
    t = re.sub(r'(?:ngày\s+)?\b(\d{1,2})/(\d{1,2})/(\d{4})\b', r'ngày \1 tháng \2 năm \3', t, flags=re.I)
    # E.g. "118/2025/NĐ-CP" -> "118 năm 2025 Nghị định Chính phủ"
    t = re.sub(r'(\d+)/(\d{4})/NĐ-CP', r'số \1 năm \2 Nghị định Chính phủ', t, flags=re.I)
    t = re.sub(r'(\d+)/(\d{4})/TT-BCA', r'số \1 năm \2 Thông tư Bộ Công an', t, flags=re.I)
    t = re.sub(r'(\d+)/(\d{4})/TT-BTP', r'số \1 năm \2 Thông tư Bộ Tư pháp', t, flags=re.I)
    t = re.sub(r'(\d+)/(\d{4})/QĐ-UBND', r'số \1 năm \2 Quyết định Ủy ban nhân dân', t, flags=re.I)
    t = re.sub(r'(\d+)/(\d{4})/QH(\d+)', r'số \1 năm \2 Quốc hội khóa \3', t, flags=re.I)

    # 3. Expand Civic Forms & Codes
    t = re.sub(r'\bCT0?1\b', 'Tờ khai thay đổi thông tin cư trú Cê Tê không một', t, flags=re.I)
    t = re.sub(r'\bCT0?7\b', 'Giấy xác nhận thông tin về cư trú Cê Tê không bảy', t, flags=re.I)
    t = re.sub(r'\bCT0?8\b', 'Thông báo kết quả giải quyết về cư trú Cê Tê không tám', t, flags=re.I)
    t = re.sub(r'\bCT(\d{1,2})\b', r'Biểu mẫu Cê Tê \1', t, flags=re.I)

    # 4. Expand Core Administrative Acronyms (Word boundary matching)
    replacements = [
        # Citizen identification & civil status
        (r'\bCCCD\b', 'Căn cước công dân'),
        (r'\bCMND\b', 'Chứng minh nhân dân'),
        (r'\bVNeID\b', 'Vê Nê Ai Đi'),
        (r'\bvneid\b', 'Vê Nê Ai Đi'),
        (r'\bBHYT\b', 'Bảo hiểm y tế'),
        (r'\bBHXH\b', 'Bảo hiểm xã hội'),
        (r'\bGCNQSDĐ\b', 'Giấy chứng nhận quyền sử dụng đất'),
        (r'\bGCN\b', 'Giấy chứng nhận'),
        (r'\bĐKKH\b', 'Đăng ký kết hôn'),
        (r'\bĐKKS\b', 'Đăng ký khai sinh'),
        (r'\bĐKKT\b', 'Đăng ký khai tử'),
        (r'\bĐK\b', 'Đăng ký'),

        # Administrative Agencies & Levels
        (r'\bUBND\b', 'Ủy ban nhân dân'),
        (r'\bHĐND\b', 'Hội đồng nhân dân'),
        (r'\bTTHC\b', 'Thủ tục hành chính'),
        (r'\bBộ phận TN&TKQ\b', 'Bộ phận Tiếp nhận và Trả kết quả'),
        (r'\bTN&TKQ\b', 'Tiếp nhận và Trả kết quả'),
        (r'\bBCA\b', 'Bộ Công an'),
        (r'\bBTP\b', 'Bộ Tư pháp'),
        (r'\bBYT\b', 'Bộ Y tế'),
        (r'\bBTNMT\b', 'Bộ Tài nguyên và Môi trường'),
        (r'\bBXD\b', 'Bộ Xây dựng'),
        (r'\bBNG\b', 'Bộ Ngoại giao'),
        (r'\bDVCQG\b', 'Dịch vụ công Quốc gia'),
        (r'\bDVC\b', 'Dịch vụ công'),
        (r'\bQLHC\b', 'Quản lý hành chính'),
        (r'\bPCCC\b', 'Phòng cháy chữa cháy'),
        (r'\bTAND\b', 'Tòa án nhân dân'),
        (r'\bVKSND\b', 'Viện kiểm sát nhân dân'),

        # Legal Terminology
        (r'\bNĐ-CP\b', 'Nghị định Chính phủ'),
        (r'\bNĐ\b', 'Nghị định'),
        (r'\bTT-BCA\b', 'Thông tư Bộ Công an'),
        (r'\bTT-BTP\b', 'Thông tư Bộ Tư pháp'),
        (r'\bQĐ-UBND\b', 'Quyết định Ủy ban nhân dân'),
        (r'\bQĐ\b', 'Quyết định'),
        (r'\bNQ-HĐND\b', 'Nghị quyết Hội đồng nhân dân'),
        (r'\bNQ\b', 'Nghị quyết'),

        # Place Prefixes
        (r'\bTP\.\s*', 'Thành phố '),
        (r'\bTp\.\s*', 'Thành phố '),
        (r'\bTX\.\s*', 'Thị xã '),
        (r'\bTx\.\s*', 'Thị xã '),
        (r'\bH\.\s*', 'Huyện '),
        (r'\bQ\.\s*', 'Quận '),
        (r'\bP\.\s*', 'Phường '),
        (r'\bX\.\s*', 'Xã '),
        (r'\bTT\.\s*', 'Thị trấn '),

        # Fee & Technical
        (r'\b0\s*(đ|đồng|VNĐ|VND)\b', 'Miễn phí, không thu tiền'),
        (r'(\d+)\s*(k|k\b|nghìn đồng|ngàn đồng)', r'\1 nghìn đồng'),
        (r'(\d+)\s*(đ|VNĐ|VND)\b', r'\1 đồng'),
        (r'\bSLA\b', 'Thời hạn giải quyết'),
        (r'\bHITL\b', 'Cán bộ chuyên môn kiểm tra'),
        (r'\bOTP\b', 'Mã xác thực ô tê pê'),
        (r'\bPIN\b', 'Mã pin'),
        (r'\bQR\b', 'Mã quy rờ'),
        (r'\bPDF\b', 'Tệp tài liệu pê đê ép')
    ]

    for pattern, repl in replacements:
        t = re.sub(pattern, repl, t)

    # 5. Natural Prosody & Breathing Pauses
    # Convert bullet points and dashes to commas or pauses
    t = re.sub(r'^\s*[-•]\s*', ', ', t, flags=re.MULTILINE)
    t = re.sub(r'\n+', '. ', t)
    # Convert colons and semicolons to pauses
    t = re.sub(r'[:;]', ', ', t)
    # Collapse multiple commas and dots
    t = re.sub(r',\s*,+', ', ', t)
    t = re.sub(r'\.\s*\.+', '. ', t)
    t = re.sub(r'\s+', ' ', t).strip()

    return t
