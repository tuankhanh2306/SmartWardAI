#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI - Semi-Automated Data Pipeline
Stage 2: Document Parser & Legal Chunker (Chuẩn hóa & Băm nhỏ văn bản cho RAG)
"""

import os
import sys
import json
import glob
import re

sys.stdout.reconfigure(encoding='utf-8')

ORIGINALS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../procedure-crawler/originals"))
PARSED_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../procedure-crawler/parsed"))


def clean_text(text: str) -> str:
    if not text:
        return ""
    # Remove HTML tags if present
    text = re.sub(r'<[^>]+>', ' ', text)
    # Normalize whitespaces
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def extract_process_steps(raw_data: dict) -> list:
    steps = []
    exec_steps = raw_data.get("executionSteps", [])
    if exec_steps:
        for s in exec_steps:
            desc = clean_text(s.get("description", ""))
            if desc:
                # Often steps are formatted with "- Bước 1:", "- Bước 2:" in a single block
                sub_steps = re.split(r'\n(?=- Bước \d+|- BƯỚC \d+)', desc)
                for sub in sub_steps:
                    sub_clean = sub.strip()
                    if sub_clean:
                        steps.append(sub_clean)
    return steps


def extract_required_documents(raw_data: dict) -> list:
    docs = []
    seen = set()
    cases = raw_data.get("executionCases", [])
    for c in cases:
        for p in c.get("profileComponents", []):
            name = clean_text(p.get("name", ""))
            # Filter out header labels like "- Người có yêu cầu...", "* Giấy tờ..."
            if not name or name.startswith("*") or len(name) < 5:
                continue
            name_key = name.lower()[:80]
            if name_key in seen:
                continue
            seen.add(name_key)
            
            docs.append({
                "documentName": name,
                "originalQty": p.get("originalQty", 0),
                "copyQty": p.get("copyQty", 0),
                "isRequired": p.get("required", False)
            })
    return docs


def extract_processing_time(raw_data: dict) -> str:
    methods = raw_data.get("executionMethods", [])
    times = []
    for m in methods:
        t = m.get("processingTime")
        unit = m.get("processingTimeUnit", "")
        desc = clean_text(m.get("description", ""))
        sub_type = m.get("submissionMethod", "")
        if desc:
            times.append(f"{sub_type}: {desc}")
        elif t is not None:
            unit_str = "ngày làm việc" if unit in ["DAY", "WORKING_DAY"] else ("giờ" if unit == "HOUR" else "ngày")
            times.append(f"{sub_type}: {t} {unit_str}")
    if times:
        return " | ".join(times)
    return "Giải quyết trong ngày làm việc hoặc theo quy định"


def extract_fees(raw_data: dict) -> str:
    methods = raw_data.get("executionMethods", [])
    fee_list = []
    for m in methods:
        for f in m.get("fees", []):
            val = f.get("value")
            desc = clean_text(f.get("description", ""))
            if desc:
                fee_list.append(desc)
            elif val == 0:
                fee_list.append("Miễn phí / Không thu lệ phí")
            elif val is not None:
                fee_list.append(f"{val:,} VNĐ")
    if fee_list:
        return list(set(fee_list))[0]
    return "Theo quy định của HĐND cấp tỉnh/thành phố"


def extract_legal_basis(raw_data: dict) -> list:
    basis = []
    for lb in raw_data.get("legalBasisesDetails", []):
        name = clean_text(lb.get("name", ""))
        code = clean_text(lb.get("code", ""))
        
        # Extract potential year/effective date from code or name
        year_match = re.search(r'/(20\d{2})/', code)
        year = year_match.group(1) if year_match else None
        
        basis.append({
            "documentNumber": code,
            "documentTitle": name,
            "year": year,
            "effectiveDate": f"{year}-01-01" if year else None  # Mark for manual review if exact date needed
        })
    return basis


def create_chunks_for_rag(procedure_code: str, procedure_name: str, process_steps: list, req_docs: list, legal_basis: list, agency: str, proc_time: str, fee: str) -> list:
    """Generate structured legal/administrative chunks for Vector RAG."""
    chunks = []
    chunk_index = 0

    # 1. Chunk: Tổng quan thủ tục & Thẩm quyền
    chunk_index += 1
    chunks.append({
        "chunkId": f"{procedure_code}_CHUNK_{chunk_index:03d}",
        "chunkType": "OVERVIEW",
        "title": f"Tổng quan & Thẩm quyền giải quyết {procedure_name}",
        "content": f"Thủ tục: {procedure_name}. Cơ quan có thẩm quyền giải quyết: {agency}. Thời hạn giải quyết: {proc_time}. Mức phí/lệ phí: {fee}.",
        "legalReference": procedure_name
    })

    # 2. Chunk: Trình tự thực hiện (Process)
    for idx, step in enumerate(process_steps, 1):
        chunk_index += 1
        chunks.append({
            "chunkId": f"{procedure_code}_CHUNK_{chunk_index:03d}",
            "chunkType": "PROCESS_STEP",
            "title": f"Trình tự thực hiện {procedure_name} - Bước {idx}",
            "content": step,
            "legalReference": f"{procedure_name} - Trình tự giải quyết"
        })

    # 3. Chunk: Thành phần hồ sơ (Required Documents)
    if req_docs:
        chunk_index += 1
        doc_lines = []
        for d in req_docs:
            orig = f"{d['originalQty']} bản chính" if d['originalQty'] > 0 else ""
            copy = f"{d['copyQty']} bản sao" if d['copyQty'] > 0 else ""
            qty = ", ".join(filter(None, [orig, copy]))
            qty_str = f" ({qty})" if qty else ""
            doc_lines.append(f"- {d['documentName']}{qty_str}")
        
        chunks.append({
            "chunkId": f"{procedure_code}_CHUNK_{chunk_index:03d}",
            "chunkType": "REQUIRED_DOCUMENTS",
            "title": f"Thành phần hồ sơ {procedure_name}",
            "content": f"Để thực hiện thủ tục {procedure_name}, công dân cần chuẩn bị các giấy tờ sau:\n" + "\n".join(doc_lines),
            "legalReference": f"{procedure_name} - Thành phần hồ sơ"
        })

    # 4. Chunk: Căn cứ pháp lý
    if legal_basis:
        chunk_index += 1
        legal_lines = [f"- {lb['documentNumber']}: {lb['documentTitle']}" for lb in legal_basis]
        chunks.append({
            "chunkId": f"{procedure_code}_CHUNK_{chunk_index:03d}",
            "chunkType": "LEGAL_BASIS",
            "title": f"Căn cứ pháp lý {procedure_name}",
            "content": f"Căn cứ pháp lý quy định thủ tục {procedure_name} bao gồm:\n" + "\n".join(legal_lines),
            "legalReference": "Văn bản quy phạm pháp luật"
        })

    return chunks


def run_parser():
    os.makedirs(PARSED_DIR, exist_ok=True)
    raw_files = glob.glob(os.path.join(ORIGINALS_DIR, "*.raw.json"))
    print(f"[*] Found {len(raw_files)} raw files in {ORIGINALS_DIR}")

    success_count = 0
    for file_path in raw_files:
        with open(file_path, "r", encoding="utf-8") as f:
            raw_wrapper = json.load(f)

        code = raw_wrapper.get("procedureCode")
        portal_code = raw_wrapper.get("officialPortalCode")
        name = raw_wrapper.get("procedureName")
        category = raw_wrapper.get("category", "")
        source_url = raw_wrapper.get("sourceUrl", "")
        collected_at = raw_wrapper.get("collectedAt")
        raw_data = raw_wrapper.get("rawPortalData", {})

        agency = raw_data.get("departmentPromulgateName") or "Ủy ban nhân dân cấp xã / phường"
        process_steps = extract_process_steps(raw_data)
        req_docs = extract_required_documents(raw_data)
        proc_time = extract_processing_time(raw_data)
        fee = extract_fees(raw_data)
        legal_basis = extract_legal_basis(raw_data)

        chunks = create_chunks_for_rag(code, name, process_steps, req_docs, legal_basis, agency, proc_time, fee)

        normalized = {
            "procedureCode": code,
            "officialPortalCode": portal_code,
            "procedureName": name,
            "category": category,
            "agency": agency,
            "process": "\n\n".join(process_steps) if process_steps else "Theo quy định tại Bộ phận Một cửa",
            "processStepsCount": len(process_steps),
            "requiredDocuments": req_docs,
            "requiredDocumentsCount": len(req_docs),
            "processingTime": proc_time,
            "fee": fee,
            "legalBasis": legal_basis,
            "legalBasisCount": len(legal_basis),
            "sourceUrl": source_url,
            "collectedAt": collected_at,
            "verificationStatus": "PENDING",  # Awaiting human / validator sign-off
            "chunks": chunks,
            "chunksCount": len(chunks)
        }

        out_path = os.path.join(PARSED_DIR, f"{code}.json")
        with open(out_path, "w", encoding="utf-8") as f_out:
            json.dump(normalized, f_out, ensure_ascii=False, indent=2)

        print(f" [+] Parsed {code}: {name} -> {len(chunks)} chunks, {len(req_docs)} docs, {len(legal_basis)} legal bases")
        success_count += 1

    print(f"\n[V] Parsing completed. Successfully parsed {success_count}/{len(raw_files)} procedures.")


if __name__ == "__main__":
    run_parser()
