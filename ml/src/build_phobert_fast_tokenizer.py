#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Converts PhoBERT fairseq vocab.txt and bpe.codes into standard HuggingFace tokenizer.json
so it can be natively loaded by Java DJL (ai.djl.huggingface:tokenizers).
"""

import os
import sys
import json
from tokenizers import Tokenizer
from tokenizers.models import BPE
from tokenizers.pre_tokenizers import ByteLevel, WhitespaceSplit
from tokenizers.decoders import ByteLevel as ByteLevelDecoder
from tokenizers.processors import RobertaProcessing
from transformers import AutoTokenizer

sys.stdout.reconfigure(encoding='utf-8')

def build_phobert_fast_tokenizer(model_dir="ml/models/fine_tuned_biencoder", out_dir="ml/models/phobert_fast_tok"):
    os.makedirs(out_dir, exist_ok=True)
    hf_tok = AutoTokenizer.from_pretrained(model_dir)
    vocab = hf_tok.get_vocab()
    
    # 1. Save vocab.json
    vocab_json_path = os.path.join(out_dir, "vocab.json")
    with open(vocab_json_path, 'w', encoding='utf-8') as f:
        json.dump(vocab, f, ensure_ascii=False)
        
    # 2. Convert bpe.codes to standard merges.txt
    # bpe.codes lines: "token1 token2" or with counts
    bpe_codes_path = os.path.join(model_dir, "bpe.codes")
    merges_txt_path = os.path.join(out_dir, "merges.txt")
    with open(bpe_codes_path, 'r', encoding='utf-8') as fin, open(merges_txt_path, 'w', encoding='utf-8') as fout:
        for line in fin:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            parts = line.split()
            if len(parts) >= 2:
                fout.write(f"{parts[0]} {parts[1]}\n")
                
    print(f"Created vocab.json ({len(vocab)} entries) and merges.txt")
    
    # 3. Construct Tokenizer
    bpe_model = BPE.from_file(vocab_json_path, merges_txt_path, unk_token="<unk>")
    tokenizer = Tokenizer(bpe_model)
    tokenizer.pre_tokenizer = WhitespaceSplit()
    tokenizer.post_processor = RobertaProcessing(
        sep=("</s>", 2),
        cls=("<s>", 0),
        trim_offsets=True,
        add_prefix_space=False
    )
    
    tok_json_path = os.path.join(out_dir, "tokenizer.json")
    tokenizer.save(tok_json_path)
    print(f"Saved PhoBERT FastTokenizer to {tok_json_path}")
    
    # 4. Compare token IDs on sample sentences
    test_sentences = [
        "Thủ tục đăng ký khai sinh",
        "Hồ sơ chuyển nhượng đất",
        "UBND xã Phú Hựu",
        "dang ky ket hon can giay to gi",
        "12345"
    ]
    
    print("\nParity Check on sample sentences (HF Python PhobertTokenizer vs FastTokenizer):")
    all_match = True
    for s in test_sentences:
        py_ids = hf_tok.encode(s)
        fast_enc = tokenizer.encode(s)
        fast_ids = fast_enc.ids
        match = (py_ids == fast_ids)
        if not match:
            all_match = False
        print(f"Text: '{s}'")
        print(f"  HF PhoBERT:   {py_ids}")
        print(f"  FastTokenizer:{fast_ids} (Match: {match})")
        
    return all_match, tok_json_path

if __name__ == '__main__':
    build_phobert_fast_tokenizer()
