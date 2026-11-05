#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartWard AI — Step G3: Export FP16 and Selective MatMul INT8 Models
Exports:
1. bkai_finetuned_fp16.onnx (using onnxconverter_common)
2. bkai_finetuned_matmul_int8.onnx (selective MatMul dynamic quantization)
"""

import os
import sys
import onnx
from onnxconverter_common import float16
from onnxruntime.quantization import quantize_dynamic, QuantType

sys.stdout.reconfigure(encoding='utf-8')

def main():
    src_onnx = "ml/models/bkai_finetuned.onnx"
    fp16_onnx = "ml/models/bkai_finetuned_fp16.onnx"
    matmul_int8_onnx = "ml/models/bkai_finetuned_matmul_int8.onnx"
    
    print(f"Loading base FP32 ONNX model: {src_onnx} ({os.path.getsize(src_onnx)/(1024*1024):.2f} MB)...")
    
    # 1. Export FP16
    if not os.path.exists(fp16_onnx):
        print("\nConverting to FP16 via onnxconverter_common...")
        model_proto = onnx.load(src_onnx)
        model_fp16 = float16.convert_float_to_float16(model_proto, keep_io_types=True)
        onnx.save(model_fp16, fp16_onnx)
        print(f"  [OK] Saved FP16 ONNX: {fp16_onnx} ({os.path.getsize(fp16_onnx)/(1024*1024):.2f} MB)")
    else:
        print(f"  [EXISTS] {fp16_onnx} ({os.path.getsize(fp16_onnx)/(1024*1024):.2f} MB)")
        
    # 2. Export Selective MatMul INT8
    if not os.path.exists(matmul_int8_onnx):
        print("\nQuantizing selective MatMul INT8...")
        quantize_dynamic(
            model_input=src_onnx,
            model_output=matmul_int8_onnx,
            weight_type=QuantType.QInt8,
            op_types_to_quantize=['MatMul']
        )
        print(f"  [OK] Saved MatMul INT8 ONNX: {matmul_int8_onnx} ({os.path.getsize(matmul_int8_onnx)/(1024*1024):.2f} MB)")
    else:
        print(f"  [EXISTS] {matmul_int8_onnx} ({os.path.getsize(matmul_int8_onnx)/(1024*1024):.2f} MB)")

if __name__ == '__main__':
    main()
