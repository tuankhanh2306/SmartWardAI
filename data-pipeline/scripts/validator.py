#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI - Semi-Automated Data Pipeline
Stage 3: Automated Data Validator (Tầng 1 - Kiểm tra chất lượng dữ liệu tự động)
"""

import os
import sys
import json
import glob
import shutil
import datetime

sys.stdout.reconfigure(encoding='utf-8')

PARSED_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../procedure-crawler/parsed"))
VERIFIED_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../procedure-crawler/verified"))
REPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../reports"))


def validate_procedure(data: dict) -> dict:
    code = data.get("procedureCode", "UNKNOWN")
    issues = []
    warnings = []

    # Rule 1: Procedure Name
    name = data.get("procedureName", "").strip()
    if not name:
        issues.append("Tên thủ tục rỗng")

    # Rule 2: Procedure Code
    if not code or not code.startswith("TTHC-"):
        issues.append(f"Mã thủ tục không đúng quy ước: '{code}'")

    # Rule 3: Source URL
    source_url = data.get("sourceUrl", "").strip()
    if not source_url:
        issues.append("Thiếu thông tin URL nguồn")

    # Rule 4: Process description
    process = data.get("process", "").strip()
    if not process or len(process) < 30:
        issues.append("Trình tự thực hiện rỗng hoặc quá ngắn (< 30 ký tự)")

    # Rule 5: Required Documents
    docs = data.get("requiredDocuments", [])
    if not docs:
        issues.append("Không trích xuất được thành phần hồ sơ")

    # Rule 6: Processing Time
    proc_time = data.get("processingTime", "").strip()
    if not proc_time:
        warnings.append("Thiếu thời hạn giải quyết cụ thể")

    # Rule 7: Fee
    fee = data.get("fee", "").strip()
    if not fee:
        warnings.append("Thiếu thông tin phí/lệ phí")

    # Rule 8: Legal Basis
    legal = data.get("legalBasis", [])
    if not legal:
        issues.append("Không trích xuất được căn cứ pháp lý")

    # Rule 9: Chunks for RAG
    chunks = data.get("chunks", [])
    if not chunks or len(chunks) < 2:
        issues.append(f"Số lượng chunk quá ít ({len(chunks)} chunks), không đủ cấu trúc cho RAG")

    passed = len(issues) == 0
    return {
        "procedureCode": code,
        "procedureName": name,
        "passed": passed,
        "issues": issues,
        "warnings": warnings,
        "metrics": {
            "chunksCount": len(chunks),
            "docsCount": len(docs),
            "legalBasisCount": len(legal)
        }
    }


def run_validation():
    os.makedirs(VERIFIED_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    parsed_files = glob.glob(os.path.join(PARSED_DIR, "*.json"))
    print(f"[*] Validating {len(parsed_files)} procedures from {PARSED_DIR}...")

    results = []
    total_passed = 0
    total_failed = 0

    seen_codes = set()

    for file_path in parsed_files:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        code = data.get("procedureCode")
        val = validate_procedure(data)

        # Check for duplicate code
        if code in seen_codes:
            val["passed"] = False
            val["issues"].append("Trùng lặp mã thủ tục (duplicate procedure code)")
        else:
            seen_codes.add(code)

        results.append(val)

        if val["passed"]:
            total_passed += 1
            data["verificationStatus"] = "VERIFIED_TIER_1"
            data["validatedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            
            # Save verified copy
            dest_path = os.path.join(VERIFIED_DIR, f"{code}.json")
            with open(dest_path, "w", encoding="utf-8") as f_dest:
                json.dump(data, f_dest, ensure_ascii=False, indent=2)
            print(f" [PASS] {code} - {val['procedureName']} (Chunks: {val['metrics']['chunksCount']})")
        else:
            total_failed += 1
            print(f" [FAIL] {code} - Issues: {', '.join(val['issues'])}")

    report = {
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "totalAudited": len(parsed_files),
        "totalPassed": total_passed,
        "totalFailed": total_failed,
        "passRate": f"{(total_passed / len(parsed_files) * 100):.1f}%" if parsed_files else "0%",
        "details": results
    }

    report_path = os.path.join(REPORTS_DIR, "data_quality_report.json")
    with open(report_path, "w", encoding="utf-8") as f_rep:
        json.dump(report, f_rep, ensure_ascii=False, indent=2)

    print(f"\n[V] Validation Complete: {total_passed}/{len(parsed_files)} Passed ({report['passRate']}).")
    print(f"[*] Quality report saved to: {report_path}")


if __name__ == "__main__":
    run_validation()
