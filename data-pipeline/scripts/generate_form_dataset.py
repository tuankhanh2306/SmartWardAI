#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI - Semi-Automated Data Pipeline
Pipeline 4: Administrative Form Dataset Generator (40 Declaration Form Images)
Generates:
 - 20 Printed Forms (data-pipeline/form-dataset/printed/)
 - 20 Simulated Handwritten Forms (data-pipeline/form-dataset/handwritten/)
 - Ground Truth Annotations (data-pipeline/form-dataset/annotations.json)
Targeting Form Rule Engine validation:
 - 12-digit CCCD checksum & decoding (Province, Century, Gender, Year)
 - Date logic ordering (birthDate < issueDate <= today, age >= 14)
 - Mandatory field presence
 - Ground truth control baseline (16 VALID, 24 with deliberate synthetic errors)
"""

import os
import sys
import json
import random
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding='utf-8')

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../form-dataset"))
PRINTED_DIR = os.path.join(OUTPUT_DIR, "printed")
HANDWRITTEN_DIR = os.path.join(OUTPUT_DIR, "handwritten")

# Fonts
FONT_REGULAR = "C:/Windows/Fonts/times.ttf"
FONT_BOLD = "C:/Windows/Fonts/timesbd.ttf" if os.path.exists("C:/Windows/Fonts/timesbd.ttf") else FONT_REGULAR
FONT_HAND = "C:/Windows/Fonts/comic.ttf"

# Synthetic Citizen Pool (100% Mock Data)
FIRST_NAMES = ["NGUYỄN", "TRẦN", "LÊ", "PHẠM", "HOÀNG", "HUỲNH", "PHAN", "VŨ", "VÕ", "ĐẶNG"]
MIDDLE_NAMES_MALE = ["VĂN", "MINH", "QUỐC", "ĐỨC", "HỮU", "THANH", "TIẾN"]
MIDDLE_NAMES_FEMALE = ["THỊ", "KIM", "NGỌC", "MAI", "PHƯƠNG", "THU"]
LAST_NAMES_MALE = ["AN", "BÌNH", "CƯỜNG", "DŨNG", "HẢI", "LONG", "PHÚC", "QUÂN", "THẮNG", "TUẤN"]
LAST_NAMES_FEMALE = ["ANH", "CHI", "DUNG", "HƯƠNG", "LAN", "LINH", "MAI", "TRANG", "THẢO", "YẾN"]

PROVINCE_CODES = {
    "001": "Hà Nội",
    "079": "TP. Hồ Chí Minh",
    "048": "Đà Nẵng",
    "031": "Hải Phòng",
    "092": "Cần Thơ",
    "075": "Đồng Nai",
    "074": "Bình Dương"
}


def generate_synthetic_profile(idx: int, form_type: str, inject_error_type: str = None) -> dict:
    """Generates synthetic persona with specified deliberate error injection."""
    gender = "Nam" if idx % 2 == 0 else "Nữ"
    fn = random.choice(FIRST_NAMES)
    mn = random.choice(MIDDLE_NAMES_MALE if gender == "Nam" else MIDDLE_NAMES_FEMALE)
    ln = random.choice(LAST_NAMES_MALE if gender == "Nam" else LAST_NAMES_FEMALE)
    full_name = f"{fn} {mn} {ln}"

    birth_year = random.randint(1975, 2006)
    birth_month = random.randint(1, 12)
    birth_day = random.randint(1, 28)
    birth_date_str = f"{birth_day:02d}/{birth_month:02d}/{birth_year}"

    # CCCD decoding rules:
    # 3 digits province (e.g. 079 - TP.HCM)
    prov_code = random.choice(list(PROVINCE_CODES.keys()))
    # 1 digit century/gender:
    # 1900-1999: Male 0, Female 1
    # 2000-2099: Male 2, Female 3
    if birth_year < 2000:
        century_gender_digit = "0" if gender == "Nam" else "1"
    else:
        century_gender_digit = "2" if gender == "Nam" else "3"

    year_two_digits = str(birth_year)[2:]
    random_serial = f"{random.randint(100000, 999999):06d}"
    cccd_number = f"{prov_code}{century_gender_digit}{year_two_digits}{random_serial}"

    issue_year = max(birth_year + 15, 2018)
    issue_date_str = f"15/06/{issue_year}"

    permanent_addr = f"Số {random.randint(10, 290)} Võ Oanh, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh"
    current_addr = permanent_addr
    request_content = "Đăng ký thường trú về cùng hộ gia đình"

    expected_errors = []
    is_valid = True

    # Inject specific errors
    if inject_error_type == "INVALID_CCCD_LENGTH":
        is_valid = False
        cccd_number = cccd_number[:9]  # 9 digits (old ID style)
        expected_errors.append({
            "field": "cccdNumber",
            "errorType": "INVALID_CCCD_LENGTH",
            "message": "Số Căn cước công dân phải đủ 12 chữ số (hiện tại có 9 chữ số)"
        })
    elif inject_error_type == "INVALID_CCCD_PROVINCE":
        is_valid = False
        cccd_number = "999" + cccd_number[3:]  # 999 is invalid province
        expected_errors.append({
            "field": "cccdNumber",
            "errorType": "INVALID_CCCD_PROVINCE",
            "message": "Mã tỉnh/thành phố '999' trên CCCD không tồn tại theo danh mục Bộ Công an"
        })
    elif inject_error_type == "INVALID_CCCD_CENTURY_GENDER":
        is_valid = False
        # Invert century/gender code
        bad_digit = "0" if century_gender_digit in ["2", "3"] else "2"
        cccd_number = cccd_number[:3] + bad_digit + cccd_number[4:]
        expected_errors.append({
            "field": "cccdNumber",
            "errorType": "INVALID_CCCD_CENTURY_GENDER",
            "message": f"Chữ số thế kỷ/giới tính '{bad_digit}' không khớp với năm sinh {birth_year} và giới tính {gender}"
        })
    elif inject_error_type == "INVALID_CCCD_YEAR":
        is_valid = False
        bad_year = "88" if year_two_digits != "88" else "77"
        cccd_number = cccd_number[:4] + bad_year + cccd_number[6:]
        expected_errors.append({
            "field": "cccdNumber",
            "errorType": "INVALID_CCCD_YEAR",
            "message": f"Hai chữ số năm sinh trên CCCD '{bad_year}' không khớp với năm sinh {birth_year}"
        })
    elif inject_error_type == "MISSING_MANDATORY_FIELD":
        is_valid = False
        if idx % 2 == 0:
            full_name = ""
            expected_errors.append({
                "field": "fullName",
                "errorType": "MISSING_MANDATORY_FIELD",
                "message": "Họ và tên người kê khai là trường bắt buộc không được để trống"
            })
        else:
            permanent_addr = ""
            expected_errors.append({
                "field": "permanentAddress",
                "errorType": "MISSING_MANDATORY_FIELD",
                "message": "Nơi thường trú là trường bắt buộc không được để trống"
            })
    elif inject_error_type == "INVALID_DATE_LOGIC":
        is_valid = False
        # Issue date before birth date
        issue_date_str = f"10/05/{birth_year - 2}"
        expected_errors.append({
            "field": "issueDate",
            "errorType": "INVALID_DATE_LOGIC",
            "message": f"Ngày cấp thẻ ({issue_date_str}) không thể xảy ra trước ngày sinh ({birth_date_str})"
        })

    return {
        "fullName": full_name,
        "birthDate": birth_date_str,
        "gender": gender,
        "cccdNumber": cccd_number,
        "issueDate": issue_date_str,
        "issuePlace": "Cục Cảnh sát QLHC về TTXH",
        "ethnicity": "Kinh",
        "nationality": "Việt Nam",
        "permanentAddress": permanent_addr,
        "currentAddress": current_addr,
        "requestContent": request_content,
        "isValid": is_valid,
        "expectedErrors": expected_errors
    }


def draw_form_image(profile: dict, form_id: str, is_handwritten: bool, output_path: str):
    """Renders synthetic administrative declaration form as PNG."""
    width, height = 1200, 1600
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Fonts
    font_header_bold = ImageFont.truetype(FONT_BOLD, 22)
    font_header_sub = ImageFont.truetype(FONT_REGULAR, 20)
    font_title = ImageFont.truetype(FONT_BOLD, 28)
    font_label = ImageFont.truetype(FONT_BOLD, 19)
    font_value_printed = ImageFont.truetype(FONT_REGULAR, 20)
    font_value_hand = ImageFont.truetype(FONT_HAND, 21)

    # Color palette
    border_color = (0, 0, 0)
    header_color = (0, 0, 0)
    field_color = (15, 15, 120) if is_handwritten else (0, 0, 0)  # Blue ink for handwriting, black for printed

    # Outer decorative border
    draw.rectangle([(40, 40), (width - 40, height - 40)], outline=border_color, width=2)
    draw.rectangle([(45, 45), (width - 45, height - 45)], outline=border_color, width=1)

    # 1. National Emblem & Header
    draw.text((width // 2, 80), "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", fill=header_color, font=font_header_bold, anchor="mm")
    draw.text((width // 2, 115), "Độc lập - Tự do - Hạnh phúc", fill=header_color, font=font_header_bold, anchor="mm")
    draw.line([(width // 2 - 120, 135), (width // 2 + 120, 135)], fill=header_color, width=2)

    # 2. Form Title
    draw.text((width // 2, 185), "TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ", fill=header_color, font=font_title, anchor="mm")
    draw.text((width // 2, 225), "(Mẫu CT01 ban hành kèm theo Thông tư số 55/2021/TT-BCA)", fill=(80, 80, 80), font=ImageFont.truetype(FONT_REGULAR, 17), anchor="mm")
    draw.text((width // 2, 260), "Kính gửi: Công an Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh", fill=header_color, font=font_header_sub, anchor="mm")

    # Form metadata tag
    badge_text = f"MÃ HỒ SƠ: {form_id} | HÌNH THỨC: {'VIẾT TAY' if is_handwritten else 'BẢN IN'}"
    draw.text((70, 290), badge_text, fill=(120, 120, 120), font=ImageFont.truetype(FONT_REGULAR, 15))

    # 3. Body Form Fields
    y_start = 330
    line_spacing = 70

    fields = [
        ("1. Họ, chữ đệm và tên:", profile["fullName"]),
        ("2. Ngày, tháng, năm sinh:", profile["birthDate"]),
        ("3. Giới tính:", profile["gender"]),
        ("4. Số định danh cá nhân / CCCD:", profile["cccdNumber"]),
        ("5. Ngày cấp thẻ CCCD:", profile["issueDate"]),
        ("6. Nơi cấp:", profile["issuePlace"]),
        ("7. Dân tộc:", profile["ethnicity"]),
        ("8. Quốc tịch:", profile["nationality"]),
        ("9. Nơi thường trú:", profile["permanentAddress"]),
        ("10. Nơi ở hiện nay:", profile["currentAddress"]),
        ("11. Nội dung đề nghị:", profile["requestContent"])
    ]

    font_val = font_value_hand if is_handwritten else font_value_printed

    for idx, (label, val) in enumerate(fields):
        curr_y = y_start + (idx * line_spacing)

        # Draw label
        draw.text((80, curr_y), label, fill=border_color, font=font_label)

        # Draw dotted guideline line
        line_x_start = 420
        line_x_end = width - 80
        draw.line([(line_x_start, curr_y + 25), (line_x_end, curr_y + 25)], fill=(180, 180, 180), width=1)

        # Draw value
        if val:
            # Add slight organic jitter for handwriting
            x_offset = random.randint(-2, 3) if is_handwritten else 0
            y_offset = random.randint(-2, 2) if is_handwritten else 0
            draw.text((line_x_start + 10 + x_offset, curr_y - 2 + y_offset), str(val), fill=field_color, font=font_val)

    # 4. Signature Section
    sig_y = height - 280
    date_declaration = f"Phường 25, ngày 03 tháng 11 năm 2026"
    draw.text((width - 320, sig_y), date_declaration, fill=header_color, font=ImageFont.truetype(FONT_REGULAR, 18), anchor="mm")
    draw.text((width - 320, sig_y + 35), "NGƯỜI KÊ KHAI", fill=header_color, font=font_header_bold, anchor="mm")
    draw.text((width - 320, sig_y + 65), "(Ký, ghi rõ họ tên)", fill=(100, 100, 100), font=ImageFont.truetype(FONT_REGULAR, 16), anchor="mm")

    # Draw simulated signature if not missing
    if profile["fullName"]:
        sig_name = profile["fullName"].split()[-1]
        sig_font = ImageFont.truetype(FONT_HAND, 28)
        draw.text((width - 320, sig_y + 130), sig_name, fill=field_color, font=sig_font, anchor="mm")

    img.save(output_path, "PNG")


def run_generate_form_dataset():
    os.makedirs(PRINTED_DIR, exist_ok=True)
    os.makedirs(HANDWRITTEN_DIR, exist_ok=True)

    print("[*] Starting Pipeline 4: Generating 40 Administrative Declaration Forms...")

    # Distribution:
    # 20 Printed: 8 VALID, 12 INVALID (2 of each error type)
    # 20 Handwritten: 8 VALID, 12 INVALID (2 of each error type)
    error_types = [
        "INVALID_CCCD_LENGTH",
        "INVALID_CCCD_PROVINCE",
        "INVALID_CCCD_CENTURY_GENDER",
        "INVALID_CCCD_YEAR",
        "MISSING_MANDATORY_FIELD",
        "INVALID_DATE_LOGIC"
    ]

    annotations = []

    # 1. Generate 20 Printed Forms
    for i in range(1, 21):
        form_id = f"FORM_P{i:03d}"
        img_name = f"{form_id}.png"
        img_path = os.path.join(PRINTED_DIR, img_name)
        rel_path = f"printed/{img_name}"

        # 8 valid, 12 with deliberate errors
        if i <= 8:
            err = None
        else:
            err = error_types[(i - 9) % len(error_types)]

        profile = generate_synthetic_profile(i, "PRINTED", err)
        draw_form_image(profile, form_id, is_handwritten=False, output_path=img_path)

        annotations.append({
            "imageId": form_id,
            "imagePath": rel_path,
            "formType": "PRINTED",
            "formTemplate": "CT01_RESIDENCE_DECLARATION",
            "fields": {
                "fullName": profile["fullName"],
                "birthDate": profile["birthDate"],
                "gender": profile["gender"],
                "cccdNumber": profile["cccdNumber"],
                "issueDate": profile["issueDate"],
                "issuePlace": profile["issuePlace"],
                "permanentAddress": profile["permanentAddress"]
            },
            "expectedStatus": "VALID" if profile["isValid"] else "INVALID",
            "expectedErrors": profile["expectedErrors"]
        })

    print(f" [+] Generated 20 Printed forms: {PRINTED_DIR}")

    # 2. Generate 20 Handwritten Forms
    for i in range(1, 21):
        form_id = f"FORM_H{i:03d}"
        img_name = f"{form_id}.png"
        img_path = os.path.join(HANDWRITTEN_DIR, img_name)
        rel_path = f"handwritten/{img_name}"

        if i <= 8:
            err = None
        else:
            err = error_types[(i - 9) % len(error_types)]

        profile = generate_synthetic_profile(i + 20, "HANDWRITTEN", err)
        draw_form_image(profile, form_id, is_handwritten=True, output_path=img_path)

        annotations.append({
            "imageId": form_id,
            "imagePath": rel_path,
            "formType": "HANDWRITTEN",
            "formTemplate": "CT01_RESIDENCE_DECLARATION",
            "fields": {
                "fullName": profile["fullName"],
                "birthDate": profile["birthDate"],
                "gender": profile["gender"],
                "cccdNumber": profile["cccdNumber"],
                "issueDate": profile["issueDate"],
                "issuePlace": profile["issuePlace"],
                "permanentAddress": profile["permanentAddress"]
            },
            "expectedStatus": "VALID" if profile["isValid"] else "INVALID",
            "expectedErrors": profile["expectedErrors"]
        })

    print(f" [+] Generated 20 Handwritten forms: {HANDWRITTEN_DIR}")

    # Save master annotations.json
    annotations_path = os.path.join(OUTPUT_DIR, "annotations.json")
    with open(annotations_path, "w", encoding="utf-8") as f:
        json.dump({
            "datasetName": "SmartWard AI - Form Precheck Benchmark (40 Forms)",
            "unit": "Trường Đại học Giao thông vận tải TP.HCM (UTH)",
            "totalForms": len(annotations),
            "distribution": {
                "printedCount": 20,
                "handwrittenCount": 20,
                "validCount": sum(1 for a in annotations if a["expectedStatus"] == "VALID"),
                "invalidCount": sum(1 for a in annotations if a["expectedStatus"] == "INVALID")
            },
            "ruleEngineChecklist": [
                "CccdValidator: 12-digit length, 63 province codes, century/gender matching, birth year match",
                "DateLogicValidator: birthDate < issueDate <= today, citizenAge >= 14 at issuance",
                "MandatoryFieldValidator: non-empty fullName, permanentAddress, cccdNumber"
            ],
            "annotations": annotations
        }, f, ensure_ascii=False, indent=2)

    print(f" [+] Saved master annotations: {annotations_path}")
    print("\n" + "=" * 60)
    print("PIPELINE 4 - ADMINISTRATIVE FORMS DATASET COMPLETE:")
    print(" - Total forms: 40 (20 printed, 20 handwritten)")
    print(" - Ground Truth Balance: 16 VALID (Control), 24 INVALID (Deliberate Errors)")
    print(" - 100% Synthetic Citizen Data - zero PII violation.")
    print("=" * 60)


if __name__ == "__main__":
    run_generate_form_dataset()
