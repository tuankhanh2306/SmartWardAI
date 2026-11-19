#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Offline Piper TTS Vietnamese Model Downloader.
Downloads vi_VN-vais1000-medium ONNX weights and config from Hugging Face.
"""

import sys
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ONNX_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/vi/vi_VN/vais1000/medium/vi_VN-vais1000-medium.onnx"
JSON_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/vi/vi_VN/vais1000/medium/vi_VN-vais1000-medium.onnx.json"

ONNX_FILE = BASE_DIR / "vi_VN-vais1000-medium.onnx"
JSON_FILE = BASE_DIR / "vi_VN-vais1000-medium.onnx.json"

def download_file(url: str, dest: Path):
    if dest.exists() and dest.stat().st_size > 1000:
        print(f"[EXISTS] {dest.name} ({dest.stat().st_size} bytes)")
        return
    print(f"[DOWNLOADING] {dest.name} from {url}...")
    urllib.request.urlretrieve(url, dest)
    print(f"[DONE] {dest.name} saved ({dest.stat().st_size} bytes).")

def main():
    print("Checking Piper TTS Vietnamese model files...")
    download_file(JSON_URL, JSON_FILE)
    download_file(ONNX_URL, ONNX_FILE)
    print("Piper TTS Vietnamese model is ready for offline inference.")

if __name__ == "__main__":
    main()
