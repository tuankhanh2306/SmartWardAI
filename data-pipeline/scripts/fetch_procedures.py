#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI - Semi-Automated Data Pipeline
Stage 1: Official National Public Service Portal Crawler (Cổng DVC Quốc Gia)
Supports batch crawl for 40 procedures with smart keyword fallback and rate-limiting.
"""

import os
import sys
import csv
import json
import time
import hashlib
import datetime
import requests
import urllib3

urllib3.disable_warnings()
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://dichvucong.gov.vn/api/v1"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Content-Type": "application/json; charset=UTF-8",
    "Accept": "application/json"
}

ORIGINALS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../procedure-crawler/originals"))
SOURCE_CSV = os.path.abspath(os.path.join(os.path.dirname(__file__), "../procedure-crawler/source-list.csv"))


def compute_sha256(content_bytes: bytes) -> str:
    h = hashlib.sha256()
    h.update(content_bytes)
    return h.hexdigest()


def search_procedure(keyword: str):
    """Search for procedures using the official API."""
    url = f"{BASE_URL}/submitting/formality/list-all-public-formality-by-citizen"
    payload = {"limit": 10, "lastId": "", "q": keyword}
    try:
        res = requests.post(url, headers=HEADERS, json=payload, verify=False, timeout=15)
        if res.status_code in [200, 201]:
            data = res.json()
            return data.get("data", {}).get("items", [])
    except Exception as e:
        print(f"       [!] Error searching '{keyword}': {e}")
    return []


def fetch_procedure_detail(item_id: str):
    """Fetch full structured procedure detail by internal ID."""
    url = f"{BASE_URL}/configuring/formality/get-formality-by-citizen"
    payload = {"id": item_id}
    try:
        res = requests.post(url, headers=HEADERS, json=payload, verify=False, timeout=15)
        if res.status_code in [200, 201]:
            data = res.json()
            return data.get("data", {})
    except Exception as e:
        print(f"       [!] Error fetching detail {item_id}: {e}")
    return None


def run_crawler(force: bool = False):
    os.makedirs(ORIGINALS_DIR, exist_ok=True)
    if not os.path.exists(SOURCE_CSV):
        print(f"File not found: {SOURCE_CSV}")
        return

    rows = []
    with open(SOURCE_CSV, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            rows.append(row)

    print(f"[*] Processing {len(rows)} procedures from {SOURCE_CSV}")
    updated_rows = []

    for idx, row in enumerate(rows, 1):
        code = row.get("procedure_code")
        name = row.get("procedure_name")
        portal_id = row.get("portal_id", "").strip()
        current_status = row.get("status", "PENDING")
        out_path = os.path.join(ORIGINALS_DIR, f"{code}.raw.json")

        # Skip if already downloaded and not forced
        if not force and current_status == "DOWNLOADED" and os.path.exists(out_path):
            print(f"[{idx:02d}/{len(rows)}] [SKIP] {code} - {name} (Already downloaded)")
            updated_rows.append(row)
            continue

        print(f"\n[{idx:02d}/{len(rows)}] Fetching: [{code}] {name}")
        detail = None

        if portal_id:
            print(f"     Direct fetch via Portal UUID: {portal_id}...")
            detail = fetch_procedure_detail(portal_id)
        else:
            # Generate search queries
            queries_to_try = [name]
            # Strip prefixes
            for pfx in ["Thủ tục ", "Đăng ký ", "Thực hiện ", "Cấp "]:
                if name.startswith(pfx):
                    queries_to_try.append(name[len(pfx):])

            items = []
            for q in queries_to_try:
                print(f"     Searching API: '{q}'...")
                items = search_procedure(q)
                if items:
                    break
                time.sleep(0.3)

            if items:
                # Prioritize ward-level items
                selected_item = None
                for it in items:
                    it_name = it.get("name", "").lower()
                    if it.get("isWard", False) or "cấp xã" in it_name or "cấp phường" in it_name:
                        selected_item = it
                        break
                if not selected_item:
                    selected_item = items[0]

                portal_id = selected_item.get("id")
                row["portal_id"] = portal_id
                row["official_code"] = selected_item.get("code")
                detail = fetch_procedure_detail(portal_id)

        if not detail:
            print(f"     [!] FAILED to retrieve data for [{code}] {name}")
            row["status"] = "FAILED"
            updated_rows.append(row)
            continue

        official_code = detail.get("code") or row.get("official_code", "")
        official_name = detail.get("name") or name

        raw_wrapper = {
            "procedureCode": code,
            "officialPortalCode": official_code,
            "officialPortalId": portal_id,
            "procedureName": official_name,
            "category": row.get("category"),
            "level": row.get("level"),
            "sourceUrl": f"https://dichvucong.gov.vn (API ID: {portal_id})",
            "collectedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "rawPortalData": detail
        }

        raw_bytes = json.dumps(raw_wrapper, ensure_ascii=False, indent=2).encode("utf-8")
        file_hash = compute_sha256(raw_bytes)

        with open(out_path, "wb") as f_out:
            f_out.write(raw_bytes)

        print(f"     [+] Saved: {code}.raw.json | Official: [{official_code}] {official_name[:50]}...")
        row["status"] = "DOWNLOADED"
        row["official_code"] = official_code
        row["file_hash"] = file_hash
        updated_rows.append(row)
        time.sleep(0.2)  # Respectful crawling rate limit

    all_fields = list(fieldnames)
    if "file_hash" not in all_fields:
        all_fields.append("file_hash")

    with open(SOURCE_CSV, mode="w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=all_fields)
        writer.writeheader()
        writer.writerows(updated_rows)

    print("\n[V] Batch crawl completed.")


if __name__ == "__main__":
    force_mode = "--force" in sys.argv
    run_crawler(force=force_mode)
