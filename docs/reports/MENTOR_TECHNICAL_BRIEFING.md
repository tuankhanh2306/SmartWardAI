# BÁO CÁO KỸ THUẬT & ĐÁNH GIÁ HIỆU NĂNG DỰ ÁN SMARTWARD AI
**Kính gửi:** Cán bộ hướng dẫn Doanh nghiệp (Mentor) – Viettel An Giang & Giảng viên hướng dẫn  
**Sinh viên thực hiện:** Trịnh Tuấn Khánh – Trường ĐH Giao thông vận tải TP.HCM (UTH)  
**Cập nhật từ mã nguồn hiện tại:** `e:\SmartWardAI`

---

## 1. TỔNG QUAN DỰ ÁN & MỤC TIÊU ỨNG DỤNG
* **Tên hệ thống:** **SmartWard AI** – Nền tảng Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã.
* **Phạm vi triển khai mục tiêu:** 96 đơn vị hành chính (xã, phường, đặc khu) thuộc tỉnh An Giang; chuẩn hóa nghiệp vụ cho **40 thủ tục hành chính (TTHC)** cấp cơ sở và **4 nhóm tờ khai cốt lõi** (`CT01`, `TK-KS`, `TK-KH`, `TK-BTXH`).
* **Tiêu chuẩn kỹ thuật cốt lõi (Zero-Cost & Local First):**
  * Toàn bộ hệ thống (6 container Docker active) vận hành với tổng ngân sách RAM giới hạn cứng **$\le 2048\text{ MiB}$ (2.0 GiB)** để có thể triển khai trên máy chủ cấu hình khiêm tốn tại UBND cấp xã hoặc chạy demo offline hoàn toàn khi mất kết nối Internet.

---

## 2. THIẾT KẾ KIẾN TRÚC KỸ THUẬT CHI TIẾT

### 2.1. Mô hình Kiến trúc Tổng thể: Modular Monolith + Local AI Sidecar
Hệ thống được thiết kế theo kiến trúc **Modular Monolith** (Java 21 / Spring Boot 3.3.5) kết hợp **Local AI Sidecar** (Python FastAPI + ONNX Runtime INT8) và giao diện **Web-First PWA** (React 18 + TypeScript + TailwindCSS + Leaflet):

1. **Lý giải lựa chọn công nghệ (Tránh Over-engineering):**
   * **Không dùng Apache Kafka:** Lưu lượng cấp phường/xã (vài trăm–nghìn req/ngày) không cần cụm Kafka vốn tiêu tốn tối thiểu 1–2 GB RAM. Thay vào đó dùng `Spring ApplicationEventPublisher` + `@Async ThreadPoolExecutor` và Redis Queue.
   * **Web-First Responsive / PWA thay vì Native Mobile App:** Người dân đến UBND ngại cài app mới. Chỉ cần quét mã QR tại quầy Một cửa để mở trình duyệt di động, dùng trực tiếp HTML5 Camera (chụp tờ khai/CCCD) và Geolocation API (bắt GPS sự cố).
   * **PostgreSQL 16 + `pgvector`:** Hợp nhất dữ liệu quan hệ (ACID) và vector nhúng 768 chiều (chỉ mục HNSW) trong cùng một CSDL, cho phép thực hiện Hybrid Search (lọc SQL `status = 'ACTIVE' AND effective_date <= NOW()` kết hợp đo Cosine Distance) trong 1 truy vấn duy nhất.
   * **Redis 7 (`maxmemory 100mb`, `volatile-lru`):** Xử lý truy vấn bán kính địa lý `GEOSEARCH` độ trễ mili-giây, Rate Limiting (5 req/phút/IP), Cache câu hỏi (TTL 1 giờ) và khóa nguyên tử `GETDEL` cho liên kết xem tài liệu 1 lần.
   * **MinIO Object Storage:** Lưu trữ tệp ảnh đã mã hóa tách biệt khỏi DB, giới hạn bucket `smartward-vault` 5 GB và áp dụng Lifecycle Policy (ILM) tự động hủy sau 7 ngày.

### 2.2. Ngân sách Tài nguyên Hạ tầng (`docker-compose.yml`)
Hệ thống đóng gói trọn vẹn trong **6 container hoạt động + 1 job khởi tạo (`minio-init`)**:

| STT | Container | Công nghệ / Image | Giới hạn RAM (`mem_limit`) | Vai trò chính |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `postgres` | `pgvector/pgvector:pg16` | **448 MiB** | CSDL quan hệ (6 bảng Flyway) + Vector Embeddings (768d) |
| 2 | `redis` | `redis:7-alpine` | **128 MiB** | Spatial GEO index, One-Time Token (`GETDEL`), Cache, Rate Limit |
| 3 | `minio` | `minio/minio:latest` | **256 MiB** | Object Storage lưu trữ ảnh mã hóa AES-256-GCM (ILM 7 ngày) |
| 4 | `ai-sidecar` | FastAPI + PhoBERT ONNX INT8 | **384 MiB** | Suy luận cục bộ (768d Bi-Encoder + Phân loại 6 ý định) |
| 5 | `backend` | Spring Boot 3.3 (Java 21) | **768 MiB** | API Gateway, 4 Module lõi (`-Xmx512m`, user không đặc quyền) |
| 6 | `frontend` | Nginx Alpine + React PWA | **64 MiB** | Giao diện Công dân & Bàn làm việc Cán bộ (Gzip ~149 KB) |
| **∑** | **Tổng Active** | **6 Containers** | **2,048 MiB (2.0 GiB)** | **Đạt 100% tiêu chuẩn ngân sách RAM $\le 2048\text{ MiB}$** |

### 2.3. Thiết kế 4 Module Nghiệp vụ Lõi (`vn.edu.uth.smartward`)
1. **Module 1 – Legal RAG & Abstention Guardrail (`rag/`):**
   * `VietnameseTextNormalizer`: Chuẩn hóa chính tả, dấu, gõ Telex sai (vd: `"chaogf ban"`, `"tu van giup toi"`) và phương ngữ Tây Nam Bộ dưới 1ms bằng Java thuần.
   * `LegalChunkingService`: Băm văn bản quy phạm pháp luật theo cấu trúc *Chương $\rightarrow$ Điều $\rightarrow$ Khoản $\rightarrow$ Điểm* kèm metadata hiệu lực.
   * `RagQueryService`: Hỗ trợ bộ nhớ hội thoại multi-turn (3–5 lượt gần nhất) để viết lại câu hỏi nối tiếp; áp dụng chốt chặn **Abstention Guardrail** ($\theta = 0.78$, $\theta_{lower} = 0.42$) — nếu $S_{\max} < \theta$, từ chối an toàn (tối đa 1–2 câu kèm Quick Suggestion Chips), tuyệt đối không gọi LLM sinh chữ tự do; hậu kiểm trích dẫn Top-K.
   * Cơ chế AI Client 3 lớp: Local AI Sidecar (`ai-sidecar:8000`) $\leftrightarrow$ Gemini 2.5 Flash API $\leftrightarrow$ `DeterministicMockAiClient` (offline SHA-256 fallback).
2. **Module 2 – Deterministic Form Rule Engine (`formcheck/`):**
   * Tách bạch nhiệm vụ: Vision OCR chỉ trích xuất JSON thô + điểm tin cậy; toàn bộ quyết định đúng/sai do Java thuần (`DeterministicFormRuleEngine`) đảm nhiệm.
   * Hỗ trợ **4 mẫu tờ khai**:
     * `CT01` (Cư trú): Kiểm tra 12 số CCCD (mã tỉnh `001`–`096`, chữ số thế kỷ/giới tính, năm sinh), logic `birthDate < issueDate <= today`, đồng thuận chủ hộ, loại bỏ trường "ngày cấp CCCD" thừa.
     * `TK-KS` (Khai sinh): Đối chiếu chéo Giấy chứng sinh (`dateOfBirth`, `motherName`) và quy tắc nhận cha khi cha mẹ chưa kết hôn.
     * `TK-KH` (Kết hôn): Kiểm tra tuổi kết hôn chính xác theo từng ngày (Nam $\ge 20$, Nữ $\ge 18$), chặn mục đích xác nhận tình trạng hôn nhân mơ hồ.
     * `TK-BTXH` (Bảo trợ xã hội): Kiểm tra điều kiện tuổi ($\ge 80$ không lương hưu) / khuyết tật nặng và bắt buộc số tài khoản ngân hàng (Đề án 06).
   * Gắn cờ `MANUAL_REVIEW_REQUIRED` nếu OCR `confidence < 0.70`.
3. **Module 3 – Two-Stage Spatial-Semantic Triage (`triage/`):**
   * **Pha 1 (Lọc không gian):** Redis `GEOSEARCH` quét các cụm sự cố `OPEN` trong bán kính $R$ mét ($O(\log N)$).
   * **Pha 2 (So khớp nghiệp vụ & ngữ nghĩa):** Kiểm tra khớp `category` + đo Cosine Similarity qua `pgvector` ($\ge \tau$). Gộp cụm và tăng `report_count` nếu thỏa mãn, ngược lại tạo cụm mới.
   * **Định tuyến liên xã/phường:** Ưu tiên phân giải theo ô địa chỉ nhập tay (`TEXT_BOX`), sau đó fallback sang tọa độ GPS dùng công thức Haversine.
4. **Module 4 – Zero-Trust Document Vault (`vault/`):**
   * Tuân thủ Nghị định 13/2023/NĐ-CP: Ảnh giấy tờ được đóng dấu mờ chéo trên RAM (`Graphics2D`) với timestamp + mục đích sơ duyệt, mã hóa `AES/GCM/NoPadding` (256-bit) trước khi lưu MinIO.
   * Khi cán bộ mở xem ảnh (`GET /api/v1/vault/view/{token}`), hệ thống dùng lệnh nguyên tử Redis `GETDEL` để đọc và hủy token ngay lập tức chống Race Condition; mọi truy cập lần 2 đều trả về `HTTP 410 Gone`.

---

## 3. ĐÁNH GIÁ HIỆU NĂNG GIẢI PHÁP TRƯỚC KHI ỨNG DỤNG

### 3.1. Hiệu năng Mô hình AI Cục bộ (AI Sidecar: PhoBERT ONNX INT8)
Kết quả đo thực tế từ `ml/runs/int8_quantization_report.json`, `ml/runs/f1_f2_bkai_onnx_int8_report.json`, `ml/runs/phase_d_heldout_evaluation.json` (tập Held-out 228 mẫu độc lập, 0 rò rỉ từ tập Train/Dev) và `ml/runs/java_cross_runtime_check_report.json`:

| Chỉ tiêu đo lường | FP32 (`bkai_finetuned.onnx`) | INT8 (`bkai_finetuned_int8.onnx`) | Mức cải thiện / Ghi chú |
| :--- | :---: | :---: | :--- |
| **Kích thước file model** | `512.99 MB` | **`128.99 MB`** | **Giảm 74.86%** |
| **RAM model độc lập** | `460.99 MB` (bản gốc 448.5MB) | **`143.10 MB`** | **Đạt mục tiêu `< 250 MB`** |
| **Latency trung bình (228 mẫu)** | `14.14 ms` | **`6.13 ms`** | **Nhanh hơn 2.3x** |
| **Latency P95 / Throughput** | `16.23 ms` / `70.72 QPS` | **`8.05 ms` / `163.17 QPS`** | Đáp ứng thời gian thực |
| **Intent Accuracy (Held-out 228)** | `77.19%` | `73.68%` | Giảm 3.51% khi lượng tử hóa |
| **Procedure Recall@3 (Held-out)** | `80.00%` | `67.50%` | Giảm 12.5% khi nén INT8 |
| **Đồng bộ Tokenizer Java–Python** | — | **105 / 105 câu khớp 100%** | `mismatched_token_ids = 0`, Cosine = `1.0` |

* **Kiểm toán dữ liệu ML (`ml/data/dataset_audit_report.json`):** Tổng cộng **810 mẫu** (`354 train / 228 dev / 228 heldout`); rò rỉ dữ liệu giữa Held-out và Train/Dev bằng **0** (`exact_leak = 0`, `gid_leak = 0`).

### 3.2. Hiệu năng Pipeline Legal RAG & Chốt chặn Guardrail
Kiểm thử mù (blind retrieval) trên **80 câu hỏi** (65 trong phạm vi, 15 câu bẫy ngoài phạm vi) và **40 bộ thủ tục** (đạt `40/40 = 100%` kiểm toán chất lượng dữ liệu tại `data-pipeline/reports/data_quality_report.json`):

| Cấu hình thử nghiệm | Citation Precision | False-Answer Rate (Câu bẫy) | True Abstention Rate | Recall@3 / MRR |
| :--- | :---: | :---: | :---: | :---: |
| 1. LLM Zero-shot (Không RAG) | `32.5%` | `73.3%` | `26.7%` | N/A |
| 2. Standard RAG ($\theta = 0.42$) | `86.2%` | `100.0%` | `0.0%` | `86.2%` / `0.79` |
| **3. Proposed Legal RAG ($\theta = 0.78$)** | **`97.6%`** | **`6.7%`** | **`93.3%`** | **`86.2%` / `0.79`** |

### 3.3. Hiệu năng Thuật toán Gom cụm Phản ánh 2 Pha (`Triage`)
Thực nghiệm trên **150 phản ánh** (30 sự cố gốc $\times$ 15 người viết, nhiễu GPS $\sigma \in [10\text{m}, 40\text{m}]$, cài cắm **25 ca biên khó**: 10 Colocated, 10 High-Lexical, 5 Distant; chia theo thời gian **90 Dev / 60 Held-out**):

| Phương pháp / Tập đánh giá | Precision | Recall | F1-Score | Hard Cases Accuracy |
| :--- | :---: | :---: | :---: | :---: |
| Spatial-only ($R = 50\text{m}$) | `43.03%` | `92.67%` | `58.77%` | `96.0%` |
| Semantic-only ($\tau = 0.75$) | `98.36%` | `80.00%` | `88.24%` | `84.0%` |
| **Proposed 2-Phase ($R=50\text{m}, \tau=0.75$) – Toàn bộ / Dev** | **`100.0%`** | `80.00%` | **`88.89%`** | `84.0%` |
| **Held-out Test ($R=50\text{m}, \tau=0.75$)** | **`100.0%`** | **`70.00%`** | **`82.35%`** | **`66.67%`** |
| Held-out Test (Cấu hình cũ $R=25\text{m}, \tau=0.80$) | `100.0%` | `62.00%` | `76.54%` | `50.00%` |

* **Kết luận hiệu năng Triage:** Thuật toán 2 pha loại bỏ hoàn toàn lỗi gộp nhầm sự cố khác loại (Precision giữ vững **100%**). Đồng thời, thực nghiệm chứng minh cần cập nhật tham số từ $R=25\text{m}, \tau=0.80$ lên **$R=50\text{m}, \tau=0.75$** để cải thiện Recall và tăng **+5.81% F1-Score** trên tập dữ liệu mới.

### 3.4. Đảm bảo Chất lượng Phần mềm & Kiểm thử An toàn
* **Backend Test Suite (`TEST_READY.md`):** **100/100 bài test** tự động pass (`.\mvnw.cmd test` – `BUILD SUCCESS`), bao quát 8 kịch bản bắt buộc (retry `MAX_TOKENS`, ghép `parts[]`, xử lý lỗi HTTP 400–500 không lộ API key, 0 LLM calls khi abstention).
* **Frontend Verification:** `tsc -b && vite build` đạt 0 lỗi; có bộ script test đối kháng chatbox, phân loại ý định và RAG (`frontend/scripts/`).
* **Kiểm thử An toàn & Bộ nhớ (`evaluation/adversarial_tests/`):** Đã kiểm chứng `ImageWatermarkMemoryTest.java` (chống tràn RAM khi đóng dấu ảnh) và `StreamingAesGcmTest.java` (mã hóa/giải mã luồng an toàn).

---

## 4. CÁC HẠNG MỤC KHÁC ĐÃ HOÀN THIỆN
1. **Dữ liệu & Pipeline thu thập (`data-pipeline/`):** Bộ script tự động crawl, phân tách 40 TTHC, sinh bộ kiểm thử RAG, phản ánh dân sinh và kiểm toán chất lượng đạt 100%.
2. **Quản trị dự án chuẩn Agile trên Jira (`SWAI`):** Đã thiết lập Jira Project `SmartWard AI` (Key: `SWAI`) tại `ut-team-v1rret25.atlassian.net` với **12 Work Items (`SWAI-1` đến `SWAI-12`)** bám sát 4 module và kiểm thử; tuân thủ Git Flow (`main`, `develop`, `feature/*`, `bugfix/*`).
3. **Bộ tài liệu Báo cáo & Trình diễn:**
   * Báo cáo tiến độ Tuần 1–11 và bản thảo Báo cáo Tốt nghiệp UTH.
   * Bộ Slide bảo vệ **23 trang** (19 slide chính + 4 slide phụ lục chất vấn) ở cả định dạng **PowerPoint (`docs/slides/SmartWardAI_BaoVe.pptx`)** và **Web HTML tương tác (`docs/slides/index.html`)** có chế độ Dark/Light và Speaker Notes.

---

## 5. VẤN ĐỀ TỒN ĐỌNG & ĐIỂM CẦN XIN Ý KIẾN MENTOR TRƯỚC KHI ỨNG DỤNG
1. **Chốt tham số Triển khai thực tế cho Triage (`25m` vs `50m`):** Cấu hình trong code/spec đang đặt $R=25\text{m}$, tài liệu roadmap cũ ghi $R=75\text{m}$, còn thực nghiệm Held-out cho kết quả tốt nhất tại $R=50\text{m}, \tau=0.75$. Cần thống nhất tham số phù hợp với mật độ đô thị/hẻm thực tế tại An Giang và cập nhật đồng bộ tài liệu.
2. **Đánh đổi độ chính xác khi nén Sidecar INT8:** Ở phiên bản PhoBERT INT8 (`128.99 MB`, `6.13 ms`), độ chính xác `proc_r3` trên Held-out là `67.5%` (thấp hơn mức `80.0%` của bản FP32 `512.99 MB`). Đề xuất phương án Hybrid Routing: dùng Sidecar INT8 cho phân loại ý định/câu hỏi phổ thông và fallback sang Gemini Embedding cho câu hỏi pháp lý phức tạp khi có mạng.
3. **Đo lường định lượng cho Rule Engine (RQ3) trên ảnh thực địa:** Hiện mới có kiểm thử đơn vị (unit test) cho logic 4 biểu mẫu; chưa có file kết quả benchmark tổng hợp đo tỷ lệ OCR đọc đúng / Rule Engine bắt lỗi trên tập 40 ảnh chụp thực tế bằng điện thoại (ánh sáng yếu, chữ viết tay nối nét).
