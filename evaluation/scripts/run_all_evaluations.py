#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI - Unified Evaluation Runner
Executes all leak-free empirical benchmarks (RQ1 Legal RAG, RQ2 Spatial-Semantic Triage,
and RQ3 Form Pre-check & Zero-Trust Vault) and outputs results to `evaluation/results/`.
"""

import os
import sys
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = [
    "evaluate_rag.py",
    "grid_search.py",
    "evaluate_forms.py",
]


def main():
    print("=" * 72)
    print("SMARTWARD AI - RUNNING ALL EMPIRICAL EVALUATIONS")
    print("=" * 72)
    for script_name in SCRIPTS:
        script_path = os.path.join(SCRIPT_DIR, script_name)
        if not os.path.exists(script_path):
            print(f"[!] Skipping missing script: {script_path}")
            continue
        print(f"\n>>> Executing {script_name} ...")
        result = subprocess.run([sys.executable, script_path], check=False)
        if result.returncode != 0:
            print(f"[ERROR] {script_name} exited with code {result.returncode}")
            sys.exit(result.returncode)
    print("\n[+] All evaluation pipelines completed successfully.")


if __name__ == "__main__":
    main()
