#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI - Master Semi-Automated Data Pipeline Runner
Executes Stage 1 (Fetch) -> Stage 2 (Parse & Chunk) -> Stage 3 (Validate)
"""

import subprocess
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))


def run_stage(script_name: str, stage_title: str):
    script_path = os.path.join(SCRIPTS_DIR, script_name)
    print("=" * 70)
    print(f"[*] RUNNING: {stage_title} ({script_name})")
    print("=" * 70)
    result = subprocess.run([sys.executable, script_path], check=False)
    if result.returncode != 0:
        print(f"\n[!] ERROR in {script_name} (Exit code: {result.returncode})")
        sys.exit(result.returncode)
    print("\n")


def main():
    print("""
    =======================================================
       SMARTWARD AI - SEMI-AUTOMATED DATA PIPELINE (UTH)
    =======================================================
    """)
    run_stage("fetch_procedures.py", "Stage 1: Fetch Raw Data from National DVC Portal")
    run_stage("parse_and_chunk.py", "Stage 2: Normalize & Legal Chunking for RAG")
    run_stage("validator.py", "Stage 3: Automated 3-Tier Quality Validation")
    print("=" * 70)
    print("[SUCCESS] Full pipeline execution completed successfully!")
    print("=" * 70)


if __name__ == "__main__":
    main()
