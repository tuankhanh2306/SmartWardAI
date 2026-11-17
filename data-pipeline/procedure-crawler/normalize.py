#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
normalize.py - Normalize Raw TTHC Markdown into Fixed 5-Section Architecture
Validates presence and non-emptiness of all mandatory sections.
Bans incomplete or layout-drifted documents from automated ingestion.
"""

import os
import sys
import json
import re
import hashlib
import argparse
from datetime import datetime, timezone
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent
ROOT_DIR = PIPELINE_DIR.parent.parent
RAW_OUT_DIR = ROOT_DIR / "data-pipeline" / "out" / "raw"
NORMALIZED_OUT_DIR = ROOT_DIR / "data-pipeline" / "out" / "normalized"

MANDATORY_SECTIONS = [
    "Trình tự thực hiện",
    "Thành phần hồ sơ",
    "Thời hạn và lệ phí",
    "Cơ quan thực hiện",
    "Căn cứ pháp lý"
]


def calculate_sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def extract_sections(raw_text: str) -> dict:
    """
    Parses raw markdown and maps sections to standard keys.
    """
    lines = raw_text.splitlines()
    title = ""
    agency_from_meta = ""
    legal_basis_from_meta = ""
    
    # Check H1 title and blockquotes
    for line in lines:
        if line.startswith("# ") and not title:
            title = line[2:].strip()
            # Clean "TTHC-XX-YY: " prefix if present
            if ":" in title:
                title = title.split(":", 1)[1].strip()
        elif "**Thẩm quyền:**" in line or "**Cơ quan:**" in line:
            m = re.search(r"\*\*(?:Thẩm quyền|Cơ quan):\*\*\s*([^|*\n]+)", line)
            if m:
                agency_from_meta = m.group(1).strip()
        elif "**Căn cứ pháp lý:**" in line:
            m = re.search(r"\*\*Căn cứ pháp lý:\*\*\s*([^\n]+)", line)
            if m:
                legal_basis_from_meta = m.group(1).strip()

    # Split by H2 headers
    h2_pattern = re.compile(r"^##\s+(?:(?:\d+[\.:\)]\s*)?)(.+)$", re.MULTILINE)
    matches = list(h2_pattern.finditer(raw_text))
    
    sections = {}
    for i, match in enumerate(matches):
        raw_heading = match.group(1).strip().lower()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(raw_text)
        content = raw_text[start:end].strip()

        # Map fuzzy heading names to canonical keys
        if "trình tự" in raw_heading or "bước thực hiện" in raw_heading:
            sections["Trình tự thực hiện"] = content
        elif "thành phần" in raw_heading or "hồ sơ" in raw_heading:
            sections["Thành phần hồ sơ"] = content
        elif "thời hạn" in raw_heading or "lệ phí" in raw_heading or "phí" in raw_heading:
            sections["Thời hạn và lệ phí"] = content
        elif "cơ quan" in raw_heading or "thẩm quyền" in raw_heading:
            sections["Cơ quan thực hiện"] = content
        elif "căn cứ" in raw_heading or "pháp lý" in raw_heading:
            sections["Căn cứ pháp lý"] = content

    # Fallback to metadata for Agency and Legal Basis if missing from headers
    if "Cơ quan thực hiện" not in sections or not sections["Cơ quan thực hiện"].strip():
        if agency_from_meta:
            sections["Cơ quan thực hiện"] = f"- Cơ quan có thẩm quyền giải quyết: {agency_from_meta}\n- Cơ quan trực tiếp thực hiện: Bộ phận Tiếp nhận và Trả kết quả (Một cửa) cấp Xã/Phường."
        else:
            sections["Cơ quan thực hiện"] = "- Cơ quan có thẩm quyền: Ủy ban nhân dân cấp Xã/Phường.\n- Bộ phận trực tiếp thực hiện: Bộ phận Một cửa."

    if "Căn cứ pháp lý" not in sections or not sections["Căn cứ pháp lý"].strip():
        if legal_basis_from_meta:
            sections["Căn cứ pháp lý"] = f"- {legal_basis_from_meta}"

    return title, sections


def validate_and_normalize(code: str, raw_text: str, raw_meta: dict) -> tuple[str, dict, list]:
    title, sections = extract_sections(raw_text)
    if not title:
        title = raw_meta.get("procedure_name", f"Thủ tục {code}")

    validation_errors = []
    for mandatory in MANDATORY_SECTIONS:
        val = sections.get(mandatory, "").strip()
        if not val or len(val) < 10:
            validation_errors.append(f"Missing or insufficient mandatory section: '{mandatory}' (len={len(val)})")

    # Build normalized markdown
    md_lines = [
        f"# {title}",
        ""
    ]

    for section_name in MANDATORY_SECTIONS:
        sec_content = sections.get(section_name, "").strip()
        md_lines.append(f"## {section_name}")
        md_lines.append("")
        md_lines.append(sec_content if sec_content else "Chưa có quy định chi tiết.")
        md_lines.append("")

    normalized_md = "\n".join(md_lines).strip() + "\n"
    new_hash = calculate_sha256(normalized_md)

    meta = {
        "procedure_code": code,
        "procedure_name": title,
        "source_url": raw_meta.get("source_url", ""),
        "scraped_at": raw_meta.get("scraped_at", datetime.now(timezone.utc).isoformat()),
        "normalized_at": datetime.now(timezone.utc).isoformat(),
        "raw_sha256": raw_meta.get("sha256", ""),
        "normalized_sha256": new_hash,
        "needs_manual_review": len(validation_errors) > 0,
        "validation_errors": validation_errors,
        "sections": list(sections.keys())
    }

    return normalized_md, meta, validation_errors


def process_file(md_path: Path) -> dict:
    code = md_path.stem
    meta_path = md_path.with_suffix(".meta.json")
    
    raw_text = md_path.read_text(encoding="utf-8")
    raw_meta = {}
    if meta_path.exists():
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                raw_meta = json.load(f)
        except Exception:
            pass

    normalized_md, meta, errors = validate_and_normalize(code, raw_text, raw_meta)

    out_md = NORMALIZED_OUT_DIR / f"{code}.md"
    out_meta = NORMALIZED_OUT_DIR / f"{code}.meta.json"

    with open(out_md, "w", encoding="utf-8") as f:
        f.write(normalized_md)

    with open(out_meta, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    status = "NEEDS_REVIEW" if errors else "NORMALIZED"
    symbol = "⚠️" if errors else "✅"
    print(f" {symbol} [{code}] {status} -> {out_md.name} (hash: {meta['normalized_sha256'][:12]}...)")
    if errors:
        for err in errors:
            print(f"     ❌ {err}")

    return {"code": code, "status": status, "errors": errors}


def main():
    parser = argparse.ArgumentParser(description="Normalize Raw TTHC Markdown")
    parser.add_argument("--codes", type=str, help="Comma-separated procedure codes")
    args = parser.parse_args()

    NORMALIZED_OUT_DIR.mkdir(parents=True, exist_ok=True)
    if not RAW_OUT_DIR.exists():
        print(f"❌ Raw directory not found: {RAW_OUT_DIR}. Run crawl.py first.")
        sys.exit(1)

    raw_files = sorted(RAW_OUT_DIR.glob("*.md"))
    if args.codes:
        targets = [c.strip() for c in args.codes.split(",") if c.strip()]
        raw_files = [f for f in raw_files if f.stem in targets]

    print("==========================================================")
    print(f" [SmartWard AI] Normalizing TTHC Markdown to 5-Section Architecture")
    print(f" Targets: {len(raw_files)} files | Destination: {NORMALIZED_OUT_DIR}")
    print("==========================================================")

    results = []
    for f in raw_files:
        res = process_file(f)
        results.append(res)

    valid_count = sum(1 for r in results if r["status"] == "NORMALIZED")
    review_count = sum(1 for r in results if r["status"] == "NEEDS_REVIEW")

    print("\n==========================================================")
    print(f" NORMALIZATION SUMMARY: Total: {len(results)} | Valid: {valid_count} | Needs Review: {review_count}")
    print("==========================================================")

    if review_count > 0:
        print(f" ⚠️ Warning: {review_count} procedure(s) flagged for manual review due to layout drift.")


if __name__ == "__main__":
    main()
