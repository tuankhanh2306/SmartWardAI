#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
diff.py - Knowledge Pipeline Human-in-the-Loop Diff Gate (BƯỚC 4)
Compares normalized scraped procedures with existing seed JSON procedures.
Generates comprehensive diff_report.md with drift detection (🚨 HIGH_DRIFT).
Updates seed JSON files ONLY upon explicit operator approval.
"""

import os
import sys
import json
import difflib
import hashlib
import argparse
from datetime import datetime, timezone
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent
ROOT_DIR = PIPELINE_DIR.parent.parent
NORMALIZED_DIR = ROOT_DIR / "data-pipeline" / "out" / "normalized"
SEED_DIR = ROOT_DIR / "backend" / "src" / "main" / "resources" / "db" / "seed" / "procedures"
OUT_DIR = ROOT_DIR / "data-pipeline" / "out"
REPORT_FILE = OUT_DIR / "diff_report.md"


def calculate_sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def parse_normalized_markdown(md_text: str) -> dict:
    lines = md_text.splitlines()
    title = ""
    for line in lines:
        if line.startswith("# ") and not title:
            title = line[2:].strip()
            break

    sections = {}
    current_sec = None
    buf = []

    for line in lines:
        if line.startswith("## "):
            if current_sec:
                sections[current_sec] = "\n".join(buf).strip()
            current_sec = line[3:].strip()
            buf = []
        elif current_sec:
            buf.append(line)

    if current_sec:
        sections[current_sec] = "\n".join(buf).strip()

    return {"title": title, "sections": sections}


def compare_procedure(code: str) -> dict:
    norm_md_file = NORMALIZED_DIR / f"{code}.md"
    seed_json_file = SEED_DIR / f"{code}.json"

    if not norm_md_file.exists():
        return {"code": code, "status": "MISSING_NORMALIZED"}

    norm_text = norm_md_file.read_text(encoding="utf-8")
    norm_data = parse_normalized_markdown(norm_text)

    if not seed_json_file.exists():
        return {
            "code": code,
            "status": "NEW_PROCEDURE",
            "title": norm_data["title"],
            "drift_score": 1.0,
            "sections": norm_data["sections"]
        }

    with open(seed_json_file, "r", encoding="utf-8") as f:
        seed_data = json.load(f)

    # Compare section texts
    section_diffs = {}
    total_sim = 0.0
    sec_count = 0

    section_map = {
        "Trình tự thực hiện": seed_data.get("process", ""),
        "Thời hạn và lệ phí": f"{seed_data.get('processingTime', '')}\nLệ phí: {seed_data.get('fee', '')}",
        "Cơ quan thực hiện": seed_data.get("agency", ""),
    }

    for sec_name, old_content in section_map.items():
        new_content = norm_data["sections"].get(sec_name, "")
        matcher = difflib.SequenceMatcher(None, old_content.strip(), new_content.strip())
        sim = matcher.ratio()
        total_sim += sim
        sec_count += 1

        if sim < 0.98:
            diff = list(difflib.unified_diff(
                old_content.splitlines(),
                new_content.splitlines(),
                fromfile="current_seed",
                tofile="new_scraped",
                lineterm=""
            ))
            section_diffs[sec_name] = {
                "similarity": round(sim, 3),
                "diff_lines": diff[:15]  # Sample first 15 diff lines
            }

    avg_sim = total_sim / sec_count if sec_count > 0 else 1.0
    drift_level = "IDENTICAL" if avg_sim >= 0.98 else ("HIGH_DRIFT" if avg_sim < 0.60 else "MODERATE_DRIFT")

    return {
        "code": code,
        "status": drift_level,
        "title": norm_data["title"],
        "avg_similarity": round(avg_sim, 3),
        "section_diffs": section_diffs,
        "norm_data": norm_data,
        "seed_data": seed_data
    }


def generate_diff_report(comparisons: list) -> str:
    md_lines = [
        "# BÁO CÁO ĐỐI SOÁT THỦ TỤC HÀNH CHÍNH (DIFF REPORT)",
        f"*Thời điểm tạo: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}*",
        "",
        "## 1. Tổng quan Trạng thái Đối soát",
        "",
        "| Mã TTHC | Tên thủ tục | Độ tương đồng | Trạng thái | Đánh giá |",
        "| :--- | :--- | :--- | :--- | :--- |"
    ]

    high_drifts = 0
    mod_drifts = 0
    identical = 0
    new_procs = 0

    for c in comparisons:
        code = c["code"]
        st = c["status"]
        if st == "IDENTICAL":
            identical += 1
            md_lines.append(f"| `{code}` | {c.get('title', '')} | 100% | ✅ Giữ nguyên | Không thay đổi |")
        elif st == "MODERATE_DRIFT":
            mod_drifts += 1
            sim = int(c.get("avg_similarity", 0) * 100)
            md_lines.append(f"| `{code}` | {c.get('title', '')} | {sim}% | ⚠️ Cập nhật | Có thay đổi nhỏ |")
        elif st == "HIGH_DRIFT":
            high_drifts += 1
            sim = int(c.get("avg_similarity", 0) * 100)
            md_lines.append(f"| `{code}` | {c.get('title', '')} | {sim}% | 🚨 BIẾN ĐỘNG LỚN | Cần rà soát kỹ |")
        elif st == "NEW_PROCEDURE":
            new_procs += 1
            md_lines.append(f"| `{code}` | {c.get('title', '')} | 0% | 🆕 Thủ tục mới | Chưa có trong CSDL |")

    md_lines.extend([
        "",
        f"**Thống kê:** {len(comparisons)} thủ tục đối soát | {identical} Giữ nguyên | {mod_drifts} Thay đổi vừa | {high_drifts} Cờ đỏ High Drift | {new_procs} Mới",
        "",
        "## 2. Chi tiết Biến động theo từng Thủ tục",
        ""
    ])

    for c in comparisons:
        if c["status"] in ("MODERATE_DRIFT", "HIGH_DRIFT"):
            code = c["code"]
            md_lines.append(f"### `{code}`: {c['title']} ({c['status']})")
            for sec, d in c["section_diffs"].items():
                md_lines.append(f"- **Mục:** `{sec}` (Tương đồng: {int(d['similarity'] * 100)}%)")
                if d["diff_lines"]:
                    md_lines.append("```diff")
                    md_lines.extend(d["diff_lines"])
                    md_lines.append("```")
            md_lines.append("")

    report_content = "\n".join(md_lines)
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        f.write(report_content)

    print(f"📄 Generated Diff Report: {REPORT_FILE}")
    return report_content


def approve_and_sync_seed(code: str):
    norm_md_file = NORMALIZED_DIR / f"{code}.md"
    norm_meta_file = NORMALIZED_DIR / f"{code}.meta.json"
    seed_json_file = SEED_DIR / f"{code}.json"

    if not norm_md_file.exists():
        print(f"❌ Normalized file not found for [{code}]")
        return False

    norm_text = norm_md_file.read_text(encoding="utf-8")
    norm_data = parse_normalized_markdown(norm_text)
    meta = {}
    if norm_meta_file.exists():
        with open(norm_meta_file, "r", encoding="utf-8") as mf:
            meta = json.load(mf)

    if meta.get("needs_manual_review"):
        print(f"⛔ [BLOCKED] Procedure [{code}] is flagged needs_manual_review=True. Approval rejected.")
        return False

    seed_data = {}
    if seed_json_file.exists():
        with open(seed_json_file, "r", encoding="utf-8") as f:
            seed_data = json.load(f)

    sections = norm_data["sections"]
    seed_data["procedureCode"] = code
    seed_data["procedureName"] = norm_data["title"]
    seed_data["process"] = sections.get("Trình tự thực hiện", seed_data.get("process", ""))
    seed_data["processingTime"] = sections.get("Thời hạn và lệ phí", seed_data.get("processingTime", ""))
    seed_data["agency"] = sections.get("Cơ quan thực hiện", seed_data.get("agency", ""))
    seed_data["lastApprovedAt"] = datetime.now(timezone.utc).isoformat()
    seed_data["contentHash"] = meta.get("normalized_sha256", calculate_sha256(norm_text))

    # Update or append chunks with header_path
    chunks = []
    chunk_idx = 0
    for sec_name, sec_content in sections.items():
        chunk_idx += 1
        chunks.append({
            "chunkId": f"{code}_HCHK_{chunk_idx:03d}",
            "chunkType": "GENERAL_SECTION",
            "title": f"{norm_data['title']} - {sec_name}",
            "headerPath": f"{code} > {sec_name}",
            "content": sec_content,
            "contentHash": calculate_sha256(sec_content),
            "sourceUrl": meta.get("source_url", ""),
            "pipelineVersion": "1.0"
        })

    seed_data["chunks"] = chunks

    with open(seed_json_file, "w", encoding="utf-8") as f:
        json.dump(seed_data, f, ensure_ascii=False, indent=2)

    print(f"✅ [APPROVED & SYNCED] Updated seed JSON for [{code}]: {seed_json_file.name}")
    return True


def main():
    parser = argparse.ArgumentParser(description="SmartWard AI Human-in-the-Loop Diff Gate")
    parser.add_argument("--codes", type=str, help="Comma-separated procedure codes")
    parser.add_argument("--approve", type=str, help="Approve and write specified procedure code to seed JSON")
    parser.add_argument("--approve-all", action="store_true", help="Approve all valid procedures into seed JSON")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SEED_DIR.mkdir(parents=True, exist_ok=True)

    if args.approve:
        target_code = args.approve.strip()
        approve_and_sync_seed(target_code)
        return

    normalized_files = sorted(NORMALIZED_DIR.glob("*.md")) if NORMALIZED_DIR.exists() else []
    if args.codes:
        targets = [c.strip() for c in args.codes.split(",") if c.strip()]
        normalized_files = [f for f in normalized_files if f.stem in targets]

    print("==========================================================")
    print(" [SmartWard AI] Running Knowledge Diff Analysis (Bước 4)")
    print(f" Targets: {len(normalized_files)} procedures")
    print("==========================================================")

    comparisons = []
    for f in normalized_files:
        res = compare_procedure(f.stem)
        comparisons.append(res)

    generate_diff_report(comparisons)

    if args.approve_all:
        print("\n🚀 [Approve-All] Synchronizing all verified procedures to seed JSON...")
        approved_count = 0
        for c in comparisons:
            if c["status"] != "MISSING_NORMALIZED":
                if approve_and_sync_seed(c["code"]):
                    approved_count += 1
        print(f"✅ Approved and synchronized {approved_count} procedures.")


if __name__ == "__main__":
    main()
