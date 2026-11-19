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

# Primary: Southern Vietnamese Male voice (vietthao3886 - MC Việt Thảo, warm & natural Southern accent for An Giang)
VIETTHAO_ONNX_URL = "https://huggingface.co/doof-ferb/nghitts-copy/resolve/main/piper-tts/vietthao3886.onnx"
VIETTHAO_JSON_URL = "https://huggingface.co/doof-ferb/nghitts-copy/raw/main/piper-tts/config.json"
VIETTHAO_ONNX_FILE = BASE_DIR / "vietthao3886.onnx"
VIETTHAO_JSON_FILE = BASE_DIR / "vietthao3886.onnx.json"

# Secondary fallback: CakeByVPBank production conversational voice
VPBANK_ONNX_URL = "https://huggingface.co/CakeByVPBank/piper-pgl-v4-vi_VN-version39_epoch39/resolve/main/vi_VN-csa-voice-piper-v3-medium.onnx"
VPBANK_JSON_URL = "https://huggingface.co/CakeByVPBank/piper-pgl-v4-vi_VN-version39_epoch39/resolve/main/vi_VN-csa-voice-piper-v3-medium.onnx.json"
VPBANK_ONNX_FILE = BASE_DIR / "vi_VN-csa-voice-piper-v3-medium.onnx"
VPBANK_JSON_FILE = BASE_DIR / "vi_VN-csa-voice-piper-v3-medium.onnx.json"

# Tertiary fallback: rhasspy vais1000
VAIS_ONNX_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/vi/vi_VN/vais1000/medium/vi_VN-vais1000-medium.onnx"
VAIS_JSON_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/vi/vi_VN/vais1000/medium/vi_VN-vais1000-medium.onnx.json"
VAIS_ONNX_FILE = BASE_DIR / "vi_VN-vais1000-medium.onnx"
VAIS_JSON_FILE = BASE_DIR / "vi_VN-vais1000-medium.onnx.json"

def download_file(url: str, dest: Path):
    if dest.exists() and dest.stat().st_size > 1000:
        print(f"[EXISTS] {dest.name} ({dest.stat().st_size} bytes)")
        return
    print(f"[DOWNLOADING] {dest.name} from {url}...")
    urllib.request.urlretrieve(url, dest)
    print(f"[DONE] {dest.name} saved ({dest.stat().st_size} bytes).")

def main():
    print("Checking Piper TTS Vietnamese model files...")
    # Prioritize Southern Vietnamese Male voice (vietthao3886)
    download_file(VIETTHAO_JSON_URL, VIETTHAO_JSON_FILE)
    download_file(VIETTHAO_ONNX_URL, VIETTHAO_ONNX_FILE)
    print("Piper TTS Vietnamese Southern Male model is ready for offline inference.")

if __name__ == "__main__":
    main()
