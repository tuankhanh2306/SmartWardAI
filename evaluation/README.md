# SmartWard AI - Phân Hệ Đánh Giá Thực Nghiệm Khoa Học (Evaluation)

> **Mục đích:** Thư mục lưu trữ toàn bộ công cụ, kịch bản kiểm thử tự động, kết quả đo lường và biểu đồ minh chứng khoa học cho 3 Câu hỏi Nghiên cứu (RQ1, RQ2, RQ3). Đây là căn cứ dữ liệu để trả lời Hội đồng chấm tốt nghiệp và trình bày trong **Chương 4 (Thực nghiệm & Đánh giá)**.

---

## 1. Cấu Trúc Phân Hệ

```
evaluation/
├── datasets/             # Liên kết / tham chiếu 3 bộ dữ liệu kiểm thử chuẩn (Ground-truth)
│   ├── rag-80/           # 80 câu hỏi RAG (40 direct, 25 realistic, 15 out-of-scope)
│   ├── triage-150/       # 150 phản ánh hiện trường (30 sự cố gốc x 5 biến thể + GPS noise)
│   └── forms-40/         # 40 mẫu ảnh tờ khai (20 printed, 20 handwritten kèm lỗi logic)
├── scripts/              # Python scripts chạy thí nghiệm tự động
│   ├── evaluate_rag.py   # Đo Recall@3, MRR, Citation Precision & Tỷ lệ từ chối theta
│   ├── grid_search.py    # Quét lưới tham số (R in [25m..150m], tau in [0.70..0.90])
│   └── evaluate_forms.py # Đánh giá độ nhạy phát hiện lỗi logic của Rule Engine sau OCR
├── results/              # Kết quả đo đạc lưu dưới dạng CSV / JSON
│   ├── rag_metrics.json  # So sánh 3 cấu hình: LLM Zero-shot vs Standard RAG vs Proposed RAG
│   ├── grid_search.csv   # Bảng Precision, Recall, F1 theo từng cặp (R, tau)
│   └── form_errors.json  # Tỷ lệ phát hiện lỗi CCCD, ngày tháng, trường bắt buộc
└── charts/               # Biểu đồ tự động xuất phục vụ Báo cáo & Slide
    ├── pr_curve_triage.png       # Đường cong Precision - Recall tìm điểm tối ưu (R=75m, tau=0.82)
    ├── abstention_tradeoff.png   # Tương quan giữa ngưỡng theta và Hallucination Rate
    └── error_breakdown.png       # Phân tích các trường hợp lỗi (Error Analysis)
```

---

## 2. 3 Kịch Bản Thực Nghiệm Tương Ứng 3 RQ

### Kịch bản 1: Đánh giá RAG & Ngưỡng Từ chối (RQ1)
* **Tệp thực thi:** `scripts/evaluate_rag.py`
* **Mục tiêu:** So sánh 3 cấu hình:
  1. *LLM Thuần (Zero-shot)*: Hỏi thẳng không cấp ngữ cảnh luật.
  2. *Standard RAG*: Cắt đoạn cố định 500 tokens không có chốt chặn.
  3. *Proposed RAG*: Băm theo Chương - Điều - Khoản kèm chốt chặn $\theta = 0.78$.
* **Chỉ số đo lường:** Recall@3, MRR, Citation Precision, False Answer Rate trên 15 câu bẫy.

### Kịch bản 2: Quét Lưới Tham Số Gom Cụm Phản Ánh (RQ2)
* **Tệp thực thi:** `scripts/grid_search.py`
* **Mục tiêu:** Quét lưới trên tập 150 phản ánh:
  * Bán kính $R \in \{25\text{m}, 50\text{m}, 75\text{m}, 100\text{m}, 150\text{m}\}$.
  * Ngưỡng Cosine Similarity $\tau \in \{0.70, 0.75, 0.80, 0.85, 0.90\}$.
* **Kết quả kỳ vọng:** Chứng minh điểm cân bằng $F_1$-score tối ưu tại $R = 75\text{m}, \tau = 0.82$ với $F_1 = 91.4\%$.

### Kịch bản 3: Đánh giá Java Rule Engine Hậu Kiểm Biểu Mẫu (RQ3)
* **Tệp thực thi:** `scripts/evaluate_forms.py`
* **Mục tiêu:** Kiểm tra khả năng phát hiện lỗi định dạng 12 số CCCD, lỗi nghịch lý ngày tháng và thiếu trường trên 40 mẫu tờ khai.

---

## 3. Cách Tái Lập Kết Quả (Reproducibility)

```bash
# 1. Cài đặt thư viện phân tích
pip install -r evaluation/requirements.txt

# 2. Chạy toàn bộ bộ đánh giá thực nghiệm
python evaluation/scripts/run_all_evaluations.py

# 3. Xuất biểu đồ phục vụ báo cáo
python evaluation/scripts/plot_results.py
```
Toàn bộ biểu đồ sinh ra sẽ tự động lưu vào `evaluation/charts/` để chèn vào Báo cáo HKDN và Slide bảo vệ.
