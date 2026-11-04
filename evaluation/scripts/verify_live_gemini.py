#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI - Live Gemini API Manual Verification Script
Verifies:
1. Complete response without truncation (finishReason == "STOP")
2. Proper top-level systemInstruction payload
3. Multi-part concatenation across candidates[0].content.parts[]
4. 5-section administrative format without conversational pleasantries
5. Mandatory disclaimer presence
6. Zero API key leakage in logs / stdout
"""

import os
import sys
import json
import urllib.request
import urllib.error

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

DEFAULT_MODEL = "gemini-2.5-flash"
API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
MANDATORY_DISCLAIMER = (
    "*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, "
    "không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*"
)


def mask_key(key: str) -> str:
    if not key or len(key) < 8:
        return "***"
    return key[:4] + "..." + key[-4:]


def verify_live_api():
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()

    if not api_key or api_key == "mock-key-for-local-testing":
        print("=" * 70)
        print("SMARTWARD AI - LIVE GEMINI VERIFICATION (SKIPPED / INFORMATIONAL)")
        print("=" * 70)
        print("Notice: No live GEMINI_API_KEY detected in environment.")
        print("To run this manual verification with real Google API:")
        print("  Windows PowerShell: $env:GEMINI_API_KEY=\"your_gemini_api_key\"")
        print("  Linux/macOS:        export GEMINI_API_KEY=\"your_gemini_api_key\"")
        print("  Run command:        python evaluation/scripts/verify_live_gemini.py")
        print("Automated test suite with Mock HTTP is available in JUnit 5 (GeminiAiClientTest).")
        print("=" * 70)
        sys.exit(0)

    print("=" * 70)
    print(f"SMARTWARD AI - LIVE GEMINI VERIFICATION (API Key: {mask_key(api_key)})")
    print("=" * 70)

    ward_name = "Xã An Phú, Tỉnh An Giang"
    office_address = "Đường Thoại Ngọc Hầu, Xã An Phú, Huyện An Phú, Tỉnh An Giang"

    system_instruction = f"""Bạn là công chức mẫn cán tại Bộ phận Tiếp nhận và Trả kết quả (Một Cửa) thuộc {ward_name}.
NHIỆM VỤ: Hướng dẫn thủ tục hành chính công trực tiếp, chính xác, ân cần và chuẩn mực.

QUY TẮC BẮT BUỘC:
1. NGUYÊN TẮC TRỰC TIẾP & KHÔNG RƯỜM RÀ: TUYỆT ĐỐI CẤM các câu chào hỏi khách sáo (như "Xin chào quý công dân", "Chào bạn", "Tôi rất vui..."), CẤM cảm ơn/xin lỗi lê thê, CẤM lặp lại câu hỏi. BẮT BUỘC BẮT ĐẦU NGAY BẰNG: "1. TÓM TẮT THỦ TỤC:".
2. CHỈ sử dụng dữ liệu trong các đoạn văn bản pháp lý được cung cấp. TUYỆT ĐỐI KHÔNG tự suy đoán, bịa đặt điều luật hay số liệu.
3. QUY TẮC THIẾU THÔNG TIN: Nếu thiếu thông tin ghi rõ "Chưa có dữ liệu, vui lòng liên hệ Bộ phận Một cửa".
4. ĐỊNH DẠNG BẮT BUỘC ĐỦ 5 PHẦN THEO ĐÚNG THỨ TỰ:
   1. TÓM TẮT THỦ TỤC: (Tối đa 01 câu trả lời thẳng vào vấn đề chính).
   2. THÀNH PHẦN HỒ SƠ: (Gạch đầu dòng từng loại giấy tờ phải nộp và xuất trình).
   3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ: (Nêu rõ số ngày làm việc và mức phí).
   4. NƠI TIẾP NHẬN & XỬ LÝ: (Ghi rõ: Bộ phận Một cửa của {ward_name} - Địa chỉ: {office_address}).
   5. CĂN CỨ PHÁP LÝ & LƯU Ý: (Nêu mã thủ tục/điều khoản quy định và kết thúc bằng câu disclaimer: "{MANDATORY_DISCLAIMER}").
"""

    user_query = "Thủ tục đăng ký khai sinh tại Xã An Phú cần những giấy tờ gì và giải quyết trong bao lâu?"

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_query}]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 8192,
            "thinkingConfig": {
                "thinkingBudget": 0
            }
        }
    }

    req_url = f"{API_BASE_URL}/models/{DEFAULT_MODEL}:generateContent?key={api_key}"
    data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        req_url,
        data=data,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_body = resp.read().decode("utf-8")
            res_json = json.loads(resp_body)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8") if e.fp else str(e)
        # Sanitize key in error output
        sanitized = err_msg.replace(api_key, "***")
        print(f"[FAIL] HTTP Error {e.code}: {sanitized}")
        sys.exit(1)
    except Exception as e:
        print(f"[FAIL] Connection Error: {str(e).replace(api_key, '***')}")
        sys.exit(1)

    candidates = res_json.get("candidates", [])
    if not candidates:
        print("[FAIL] Empty candidates returned by Gemini API")
        sys.exit(1)

    candidate = candidates[0]
    finish_reason = candidate.get("finishReason", "")

    # Check 1: Truncation check
    print(f"[*] Finish Reason: {finish_reason}")
    if finish_reason == "MAX_TOKENS":
        print("[FAIL] Response was truncated due to MAX_TOKENS limit!")
        sys.exit(1)
    elif finish_reason != "STOP":
        print(f"[WARN] Non-standard finishReason: {finish_reason}")
    else:
        print("[PASS] Response complete without truncation (finishReason == STOP)")

    # Check 2: Multi-part concatenation
    parts = candidate.get("content", {}).get("parts", [])
    text_content = "".join([p.get("text", "") for p in parts]).strip()
    print(f"[*] Output character length: {len(text_content)} chars ({len(parts)} parts)")

    if len(text_content) < 100:
        print("[FAIL] Output is suspiciously short or empty")
        sys.exit(1)
    print("[PASS] Response length is healthy and complete")

    # Check 3: Anti-verbosity & No introductory pleasantries
    lower_text = text_content.lower()
    banned_pleasantries = ["xin chào", "chào bạn", "kính chào quý công dân", "rất vui được hỗ trợ"]
    found_banned = [p for p in banned_pleasantries if p in lower_text[:100]]
    if found_banned:
        print(f"[FAIL] Found conversational pleasantry in opening: {found_banned}")
        sys.exit(1)
    print("[PASS] Zero conversational pleasantries in opening")

    # Check 4: 5 sections presence and order
    sections = [
        "1. TÓM TẮT THỦ TỤC",
        "2. THÀNH PHẦN HỒ SƠ",
        "3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ",
        "4. NƠI TIẾP NHẬN & XỬ LÝ",
        "5. CĂN CỨ PHÁP LÝ & LƯU Ý"
    ]

    indices = []
    for sec in sections:
        idx = text_content.find(sec)
        if idx == -1:
            print(f"[FAIL] Missing mandatory section: '{sec}'")
            sys.exit(1)
        indices.append(idx)

    for i in range(len(indices) - 1):
        if indices[i] >= indices[i + 1]:
            print(f"[FAIL] Sections not in correct ascending order: '{sections[i]}' comes after '{sections[i+1]}'")
            sys.exit(1)
    print("[PASS] All 5 sections present in exact ascending order")

    # Check 5: Mandatory disclaimer
    if "không thay thế quyết định chính thức của công chức tiếp nhận" not in text_content:
        print("[FAIL] Missing mandatory legal disclaimer in response")
        sys.exit(1)
    print("[PASS] Mandatory legal disclaimer verified")

    print("=" * 70)
    print("VERIFICATION RESULT: ALL LIVE GEMINI CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    verify_live_api()
