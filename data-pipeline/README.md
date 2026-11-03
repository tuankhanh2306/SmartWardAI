# Quy Trình Thu Thập Dữ Liệu Bán Tự Động (Semi-Automated Data Pipeline)
**Dự án:** SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã  
**Đơn vị:** Trường Đại học Giao thông vận tải TP.HCM (UTH)  

---

## 1. TỔNG QUAN CHIẾN LƯỢC (PHILOSOPHY)
Để phục vụ đồ án tốt nghiệp với một người phát triển duy nhất, toàn bộ dữ liệu của hệ thống được thu thập và tạo lập theo mô hình **Bán tự động (Semi-Automated Data Pipeline)**:
1. **Máy tự động hóa (80–100%):** Tìm kiếm, gửi request tới API Cổng Dịch vụ công Quốc gia, lưu trữ tệp gốc, băm nhỏ cấu trúc văn bản (Legal Chunking), tính mã băm SHA-256 truy vết, sinh biến thể phản ánh và định dạng JSON.
2. **Con người kiểm soát (Human-in-the-loop):** Đối chiếu tính pháp lý, xác nhận ngày hiệu lực, kiểm tra ground-truth cho RAG và phân cụm phản ánh.
3. **Truy vết nguồn gốc (Data Provenance & Auditability):** Mọi văn bản đều ghi nhận `sourceUrl`, `portalId`, `collectedAt`, mã băm `fileHash`, và trạng thái `verificationStatus` phục vụ bảo vệ đồ án trước Hội đồng UTH.

---

## 2. KIẾN TRÚC 4 PIPELINE DỮ LIỆU

| Nhóm dữ liệu | Mục tiêu | Phương pháp thu thập | Vị trí lưu trữ |
| :--- | :---: | :--- | :--- |
| **Pipeline 1: Thủ tục hành chính (TTHC)** | 40 văn bản | Crawler kết nối API Cổng DVC Quốc gia + Legal Chunker | `data-pipeline/procedure-crawler/` |
| **Pipeline 2: Câu hỏi đánh giá RAG** | 80 câu | 40 câu trực tiếp + 25 câu tự nhiên + 15 out-of-scope | `data-pipeline/rag-dataset/` |
| **Pipeline 3: Phản ánh hiện trường** | 150 phản ánh | 30 sự cố gốc × 5 biến thể + GPS jittering | `data-pipeline/civic-reports/` |
| **Pipeline 4: Ảnh tờ khai hành chính** | 40 ảnh | 20 ảnh in + 20 ảnh viết tay (chủ động tạo lỗi) | `data-pipeline/form-dataset/` |

---

## 3. CƠ CHẾ KIỂM ĐỊNH CHẤT LƯỢNG 3 TẦNG (3-TIER VALIDATION)

```
[Cổng DVC Quốc Gia]
       │
       ▼
 [1. originals/]  ──> (Lưu JSON/HTML/PDF nguyên bản kèm SHA-256 fileHash)
       │
       ▼
  [2. parsed/]    ──> (Băm nhỏ Chương/Điều/Khoản, trích xuất hồ sơ, lệ phí, thời hạn)
       │
       ▼
 [TẦNG 1: Code Validator] ──> Kiểm tra tự động 9 tiêu chuẩn chất lượng (Validator.py)
       │
       ▼
 [TẦNG 2: Human Review]   ──> Đối chiếu văn bản gốc (ngày hiệu lực, căn cứ pháp lý)
       │
       ▼
 [TẦNG 3: Usability/RAG]  ──> Đánh giá truy hồi pgvector & đối chiếu Ground Truth
       │
       ▼
 [3. verified/]   ──> Copy sang Backend Spring Boot (src/main/resources/db/seed/)
```

---

## 4. CẤU TRÚC THƯ MỤC CHI TIẾT

```
SmartWardAI/data-pipeline/
├── procedure-crawler/
│   ├── source-list.csv             # Danh sách 40 thủ tục, mã portal ID, trạng thái
│   ├── originals/                  # Tệp JSON/PDF nguyên bản tải về từ Cổng DVC (*.raw.json)
│   ├── parsed/                     # JSON đã chuẩn hóa và tạo Legal Chunks
│   └── verified/                   # JSON sạch đã kiểm tra, sẵn sàng nạp CSDL
├── rag-dataset/
│   ├── direct.json                 # 40 câu hỏi tra cứu trực tiếp
│   ├── natural.json                # 25 câu hỏi ngôn ngữ tự nhiên
│   ├── out-of-scope.json           # 15 câu hỏi ngoài phạm vi kiểm thử Guardrail
│   └── ground-truth.json           # Đáp án chuẩn và trích dẫn Điều/Khoản
├── civic-reports/
│   ├── original-events.csv         # 30 sự cố gốc
│   ├── generated-reports.csv       # 150 phản ánh (biến thể câu chữ + tọa độ nhiễu)
│   └── ground-truth.csv            # Nhãn cụm sự cố chuẩn (clusterId)
├── form-dataset/
│   ├── templates/                  # Biểu mẫu trắng chuẩn
│   ├── printed/                    # 20 tờ khai in (chứa lỗi cố ý)
│   ├── handwritten/                # 20 tờ khai viết tay
│   └── annotations.json            # Ground truth nhãn trường và lỗi OCR
├── scripts/
│   ├── run_pipeline.py             # Script tổng điều phối toàn bộ pipeline
│   ├── fetch_procedures.py         # Crawler kết nối API Cổng DVC Quốc gia
│   ├── parse_and_chunk.py          # Chuẩn hóa & băm Điều/Khoản cho RAG
│   ├── validator.py                # Bộ kiểm tra chất lượng dữ liệu tự động
│   ├── generate_rag_dataset.py     # Sinh bộ 80 câu hỏi RAG benchmark
│   └── generate_civic_reports.py   # Sinh 150 phản ánh hiện trường + GPS noise
└── reports/
    └── data_quality_report.json    # Báo cáo tỷ lệ đạt chuẩn và phân tích lỗi
```

---

## 5. HƯỚNG DẪN CHẠY CÁC PIPELINE

### A. Pipeline 1: Dữ liệu Thủ tục Hành chính (40 TTHC)
```bash
# Chạy toàn bộ luồng thu thập & kiểm định 40 thủ tục:
python data-pipeline/scripts/run_pipeline.py
```

### B. Pipeline 2: Bộ dữ liệu kiểm thử RAG (80 Câu hỏi)
```bash
python data-pipeline/scripts/generate_rag_dataset.py
```

### C. Pipeline 3: Phản ánh Hiện trường & Gom cụm 2 Pha (150 Phản ánh)
```bash
python data-pipeline/scripts/generate_civic_reports.py
```

### D. Pipeline 4: Bộ ảnh tờ khai hành chính & Form Rule Engine (40 Tờ khai)
```bash
python data-pipeline/scripts/generate_form_dataset.py
```
