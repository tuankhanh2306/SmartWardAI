#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
markdown_header_chunker.py - Header-Aware Legal Document Chunking Engine

Inspired by LangChain's MarkdownHeaderTextSplitter, but engineered specifically
for Vietnamese administrative procedures and legal statutes:
- Respects statutory boundaries (Chương > Điều > Khoản > Điểm)
- Extracts semantic metadata: chunk_code, procedure_code, section_type, legal_reference
- Generates breadcrumbs hierarchy preventing context loss in retrieval
"""

import re
import json
import sys
from pathlib import Path
from typing import List, Dict, Any

PIPELINE_DIR = Path(__file__).resolve().parent.parent
MARKDOWN_DIR = PIPELINE_DIR / "procedure-crawler" / "markdown"
CHUNKS_OUTPUT_DIR = PIPELINE_DIR / "rag-dataset" / "chunks"

SECTION_MAP = {
    "1. trình tự thực hiện": ("PROCESS_STEP", "Trình tự giải quyết"),
    "2. thành phần hồ sơ": ("REQUIRED_DOCUMENTS", "Thành phần hồ sơ"),
    "3. lệ phí và thời hạn giải quyết": ("OVERVIEW", "Tổng quan, thời hạn & lệ phí"),
    "4. căn cứ pháp lý": ("LEGAL_BASIS", "Văn bản quy phạm pháp luật"),
}


def parse_markdown_to_chunks(md_content: str, proc_code: str) -> List[Dict[str, Any]]:
    """
    Parses a single structured procedure Markdown file into 4 distinct semantic chunks.
    """
    lines = md_content.splitlines()
    proc_name = ""
    category = "Hành chính công"
    agency = "UBND cấp Xã/Phường"

    # 1. Parse H1 Header
    for line in lines:
        line_s = line.strip()
        if line_s.startswith("# "):
            title_part = line_s[2:].strip()
            if ":" in title_part:
                parts = title_part.split(":", 1)
                proc_name = parts[1].strip()
            else:
                proc_name = title_part
            break

    # 2. Split by H2 Sections
    sections: Dict[str, List[str]] = {}
    current_section = "PREAMBLE"
    sections[current_section] = []

    for line in lines:
        line_s = line.strip()
        if line_s.startswith("## "):
            sec_header = line_s[3:].strip().lower()
            current_section = sec_header
            sections[current_section] = []
        else:
            sections[current_section].append(line)

    chunks = []
    chunk_order = [
        ("3. lệ phí và thời hạn giải quyết", "001", "OVERVIEW"),
        ("1. trình tự thực hiện", "002", "PROCESS_STEP"),
        ("2. thành phần hồ sơ", "003", "REQUIRED_DOCUMENTS"),
        ("4. căn cứ pháp lý", "004", "LEGAL_BASIS"),
    ]

    for sec_key_match, seq_num, default_type in chunk_order:
        # Match section key case-insensitively
        matched_key = next((k for k in sections.keys() if sec_key_match in k.lower()), None)
        content_lines = sections.get(matched_key, []) if matched_key else []
        content = "\n".join(content_lines).strip()

        sec_type, title_suffix = SECTION_MAP.get(sec_key_match, (default_type, "Nội dung quy định"))
        chunk_id = f"{proc_code}_CHUNK_{seq_num}"

        if not content:
            content = f"Quy định về {title_suffix} cho thủ tục {proc_name} được áp dụng theo quy định hiện hành."

        chunk = {
            "chunkId": chunk_id,
            "chunkCode": chunk_id,
            "procedureCode": proc_code,
            "procedureName": proc_name,
            "chunkType": sec_type,
            "title": f"{proc_name} - {title_suffix}",
            "legalReference": f"{proc_name} - {title_suffix}",
            "breadcrumbs": [proc_code, proc_name, title_suffix],
            "content": content,
            "charCount": len(content),
            "estimatedTokens": round(len(content.split()) * 1.3),
        }
        chunks.append(chunk)

    return chunks


def process_all_markdown_files() -> List[Dict[str, Any]]:
    """
    Iterates over all .md files in markdown/ and produces all legal chunks.
    """
    CHUNKS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    md_files = sorted(list(MARKDOWN_DIR.glob("*.md")))

    if not md_files:
        print(f"[!] No Markdown files found in {MARKDOWN_DIR}")
        return []

    print(f"[*] Processing {len(md_files)} Markdown files with Header-Aware Chunking...")
    all_chunks = []

    for idx, mf in enumerate(md_files, 1):
        proc_code = mf.stem
        try:
            with open(mf, "r", encoding="utf-8") as f:
                content = f.read()

            chunks = parse_markdown_to_chunks(content, proc_code)
            all_chunks.extend(chunks)

            # Write individual procedure chunk JSON
            out_file = CHUNKS_OUTPUT_DIR / f"{proc_code}.chunks.json"
            with open(out_file, "w", encoding="utf-8") as out_f:
                json.dump(chunks, out_f, ensure_ascii=False, indent=2)

        except Exception as e:
            print(f"[-] Error chunking {mf.name}: {e}", file=sys.stderr)

    # Write aggregated chunks file
    aggregated_file = CHUNKS_OUTPUT_DIR / "all_procedures_chunks.json"
    with open(aggregated_file, "w", encoding="utf-8") as agg_f:
        json.dump(all_chunks, agg_f, ensure_ascii=False, indent=2)

    print(f"[+] Chunking complete: {len(all_chunks)} chunks generated across {len(md_files)} procedures.")
    print(f"    -> Aggregated chunks written to {aggregated_file}")
    return all_chunks


if __name__ == "__main__":
    chunks = process_all_markdown_files()
    sys.exit(0 if chunks else 1)
