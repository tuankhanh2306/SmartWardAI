# Kế Hoạch & Tiến Độ Thực Hiện Dự Án (Project Sprint Board)
**Dự án:** SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã  
**Đơn vị:** Viện Đào tạo Chất lượng cao – Trường Đại học Giao thông vận tải TP.HCM (UTH)  
**Trạng thái hiện tại:** `Tuần 11 / 12` 🟢 (Đã hoàn thành Tuần 11 - Đóng gói Docker, Tối ưu RAM < 2GB & Hoàn thiện Báo cáo UTH, chuẩn bị sang Tuần 12 - Slide Thuyết trình, Video Demo & Bảo vệ Tốt nghiệp)

---

## 1. BẢNG THEO DÕI TỔNG THỂ 12 TUẦN (12-WEEK SPRINT TRACKER)

| Tuần | Trọng tâm công việc | Kỹ thuật (Code / System) | Báo cáo / Khóa luận UTH | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **W01** | **Khởi tạo Docker Zero-cost & Khung Spring Boot** | `docker-compose.yml`, Spring Boot 3.3, Package UTH | Soạn Chương 1 (Bối cảnh, RQ1-3, Đóng góp) | ✅ **HOÀN THÀNH** |
| **W02** | **Thu thập 40 TTHC & Thiết kế CSDL Flyway** | `V1__init_schema.sql`, HNSW index, LegalChunking, Seeder | Soạn Chương 2 (Kiến trúc & CSDL quan hệ + Vector) | ✅ **HOÀN THÀNH** |
| **W03** | **Tích hợp Mock AI Client & Rate Limiter** | `DeterministicMockAiClient`, Redis Rate Limiter (5 req/phút) | Soạn Mục 2.3 (Quản trị tài nguyên & API limits) | ✅ **HOÀN THÀNH** |
| **W04** | **Module 1: Legal RAG & Abstention Guardrail** | pgvector cosine, Ngưỡng $\theta=0.78$, API `/rag/ask` | Soạn Chương 3 - Phần 1 (RAG & Chống ảo giác) | ✅ **HOÀN THÀNH** |
| **W05** | **Module 2: Form Rule Engine (CCCD & Date)** | Java Rule Engine 12 số CCCD, Date Logic, OCR Client | Soạn Chương 3 - Phần 2 (Hậu kiểm định biểu mẫu) | ✅ **HOÀN THÀNH** |
| **W06** | **Module 3: Triage Phản ánh 2 Pha** | Redis GEO ($R$) + pgvector Cosine ($\tau$) | Soạn Chương 3 - Phần 3 (Gom cụm phản ánh 2 pha) | ✅ **HOÀN THÀNH** |
| **W07** | **Module 4: Zero-Trust Document Vault** | Watermark Java2D, AES-256, MinIO, Redis `GETDEL` | Soạn Chương 3 - Phần 4 (Bảo mật Nghị định 13) | ✅ **HOÀN THÀNH** |
| **W08** | **Bộ dữ liệu kiểm thử & Evaluation Runner** | 80 câu RAG, 150 phản ánh (GPS noise), 40 tờ khai | Soạn Chương 4 - Phần 1 (Phương pháp thực nghiệm) | ✅ **HOÀN THÀNH** |
| **W09** | **Chạy Grid Search $(R, \tau)$ & Phân tích lỗi** | Quét lưới, tính Recall@3, MRR, $F_1$, vẽ biểu đồ `evaluation/` | Hoàn thiện Chương 4 (Số liệu & Thảo luận) | ✅ **HOÀN THÀNH** |
| **W10** | **Frontend Web Responsive / PWA (React + Vite)** | Cổng Công dân (Mobile-first PWA) & Bàn Cán bộ (Desktop) từ Google Stitch MCP | Hoàn thiện chương thiết kế giao diện | ✅ **HOÀN THÀNH** |
| **W11** | **Đóng gói Docker $< 2\text{GB}$ & Rà soát Báo cáo** | Multi-stage Docker, Profile offline, Clean Code, RAM 1.7GB | Hoàn thiện toàn văn báo cáo UTH | ✅ **HOÀN THÀNH** |
| **W12** | **Slide Thuyết trình 10 trang & Luyện Bảo vệ** | Kịch bản demo 3 phút, Slide bảo vệ UTH | Bảo vệ trước Hội đồng chấm tốt nghiệp | ⏳ Chờ |

---

## 2. CHECKLIST CHI TIẾT 12 TUẦN (3 THÁNG)

### 📌 TUẦN 1: KHỞI TẠO HẠ TẦNG DOCKER & KHUNG SPRING BOOT 3.3 [HOÀN THÀNH 100%]
- [x] **Task 1.1:** Tạo file `docker-compose.yml` theo ràng buộc Zero-Cost (< 2.0GB RAM): Postgres 16 pgvector (512MB), Redis 7 (128MB), MinIO (256MB) kèm container `minio-init` tạo bucket `smartward-vault`, quota 5GB, ILM 7 ngày.
- [x] **Task 1.2:** Khởi tạo project Backend Spring Boot 3.3.x (Java 21, Maven `pom.xml`) với các thư viện: Web, JPA, Redis, Postgres, pgvector-java, MinIO SDK, Validation, Lombok, Springdoc OpenAPI.
- [x] **Task 1.3:** Cấu hình `application.yml` đa môi trường (`dev`, `test`, `prod`), HikariCP max 10 connections, Multipart max 5MB, ThreadPool max 4 threads.
- [x] **Task 1.4:** Tạo cấu trúc Package chuẩn `vn.edu.uth.smartward` (`config/`, `common/`, `rag/`, `formcheck/`, `triage/`, `vault/`, `evaluation/`) và các class Base (`ApiResponse<T>`, `GlobalExceptionHandler`, `BusinessException`, `HealthController`).
- [x] **Task 1.5:** Kiểm thử khởi động hệ thống: Tích hợp Maven Wrapper (`mvnw`), biên dịch thành công `BUILD SUCCESS`, chạy unit test đạt 100% không lỗi.
- [x] **Task 1.6:** Soạn thảo hoàn chỉnh Chương 1 Báo cáo thực tập theo dàn ý chuẩn UTH tại [`docs/thesis-chapters/chapter-01.md`](docs/thesis-chapters/chapter-01.md).
- [x] **Task 1.7:** Viết và hoàn thiện Báo cáo Tiến độ Tuần 1 nộp GVHD theo mẫu [`docs/weekly-reports/week-01-report.md`](docs/weekly-reports/week-01-report.md).

---

### 📌 TUẦN 2: THU THẬP DỮ LIỆU PHÁP LÝ & THIẾT KẾ CSDL FLYWAY
- [x] **Task 2.1:** Thu thập và chuẩn hóa văn bản của 40 TTHC cấp xã thuộc 5 nhóm (Hộ tịch, Cư trú, Chứng thực, Bảo trợ xã hội, Đất đai) từ Cổng Dịch vụ công Quốc gia qua Semi-Automated Data Pipeline (Đạt 40/40 verified JSON).
- [x] **Task 2.2:** Viết migration Flyway `V1__init_schema.sql` tạo 6 bảng CSDL: `admin_procedures`, `legal_chunks` (vector 768 chiều & HNSW index), `issue_clusters`, `civic_reports`, `form_submissions`, `vault_documents`.
- [x] **Task 2.3:** Xây dựng các Entity JPA và Spring Data JPA Repositories tương ứng (`AdminProcedure`, `LegalChunk`, `IssueCluster`, `CivicReport`, `FormSubmission`, `VaultDocument`).
- [x] **Task 2.4:** Hiện thực hóa `LegalChunkingService` để băm nhỏ văn bản theo cấu trúc *Chương $\rightarrow$ Điều $\rightarrow$ Khoản $\rightarrow$ Điểm* kèm metadata (`effective_date`, `status = ACTIVE`) và viết Unit Test đạt 100% test pass.
- [x] **Task 2.5:** Viết Seeder `ProcedureDataSeeder` nạp toàn bộ 40 TTHC và các đoạn chunk từ `classpath:db/seed/procedures/*.json` vào CSDL PostgreSQL.
- [ ] **Task 2.6:** Soạn thảo Chương 2 Báo cáo (Lý giải kiến trúc Modular Monolith, Thiết kế CSDL quan hệ kết hợp pgvector) theo [`docs/architecture-and-flows.md`](docs/architecture-and-flows.md).
- [ ] **Task 2.7:** Viết Báo cáo Tiến độ Tuần 2 nộp GVHD và Mentor.

---

### 📌 TUẦN 3: TÍCH HỢP MOCK AI CLIENT & BỘ GIỚI HẠN TỐC ĐỘ REDIS [HOÀN THÀNH 100%]
- [x] **Task 3.1:** Thiết kế Interface `AiModelClient` trừu tượng hóa các tác vụ AI (Embedding, Vision OCR, Chat completion).
- [x] **Task 3.2:** Hiện thực `DeterministicMockAiClient` (`@Profile("dev | test")`) sinh vector giả lập và OCR mock để chạy test offline 100% không tốn quota.
- [x] **Task 3.3:** Hiện thực `GeminiAiClient` (`@Profile("prod")`) kết nối Gemini Flash API (`text-embedding-004` và Multimodal OCR).
- [x] **Task 3.4:** Xây dựng bộ giới hạn tốc độ (Rate Limiter) trên Redis: Giới hạn tối đa 5 yêu cầu/phút/IP để bảo vệ hạn mức Free-tier API.
- [x] **Task 3.5:** Cài đặt cơ chế lưu bộ nhớ đệm (Cache) trên Redis cho các câu hỏi thủ tục trùng lặp với TTL 1 giờ.
- [x] **Task 3.6:** Soạn thảo Mục 2.3 Báo cáo (Chiến lược quản trị tài nguyên và tối ưu giới hạn API AI).
- [x] **Task 3.7:** Viết Báo cáo Tiến độ Tuần 3 nộp GVHD và Mentor.

---

### 📌 TUẦN 4: MODULE 1 – LEGAL RAG & ABSTENTION GUARDRAIL [HOÀN THÀNH 100%]
- [x] **Task 4.1:** Xây dựng `RagQueryService`: Chuyển đổi câu hỏi công dân thành vector embedding 768 chiều.
- [x] **Task 4.2:** Truy vấn Top-K đoạn luật bằng Cosine Distance (`<=>`) trên pgvector với bộ lọc `status = 'ACTIVE' AND effective_date <= NOW()`.
- [x] **Task 4.3:** Cài đặt cơ chế chốt chặn **Abstention Guardrail**: Nếu điểm tương đồng cao nhất $S_{\max} < \theta$ (mặc định $\theta = 0.78$), hệ thống bắt buộc từ chối trả lời (`abstained = true`).
- [x] **Task 4.4:** Viết thuật toán hậu kiểm tra trích dẫn (Post-verification) đảm bảo căn cứ pháp lý trong câu trả lời nằm đúng trong Top-K đã truy xuất.
- [x] **Task 4.5:** Xây dựng REST API `POST /api/v1/rag/ask` trả về câu trả lời kèm mã trích dẫn, điểm tương đồng và tuyên bố miễn trừ trách nhiệm pháp lý.
- [x] **Task 4.6:** Viết Unit Test & Integration Test kiểm thử luồng RAG và luồng từ chối trả lời (Đạt 21/21 tests passed).
- [x] **Task 4.7:** Soạn thảo Chương 3 - Phần 1 (Giải thuật RAG Điều-Khoản và cơ chế chốt chặn chống ảo giác) tại `docs/thesis-chapters/chapter-03.md`.
- [x] **Task 4.8:** Viết Báo cáo Tiến độ Tuần 4 nộp GVHD và Mentor tại `docs/weekly-reports/week-04-report.md`.

---

### 📌 TUẦN 5: MODULE 2 – DETERMINISTIC FORM RULE ENGINE [HOÀN THÀNH 100%]
- [x] **Task 5.1:** Xây dựng `OcrExtractionClient` kết nối Vision OCR trích xuất JSON biểu mẫu (`fullName`, `cccdNumber`, `birthDate`, `issueDate`, `address`, `confidence`).
- [x] **Task 5.2:** Viết pure Java class `CccdValidator`: Kiểm tra regex 12 chữ số, đối chiếu bảng mã 63 tỉnh/thành, giải mã chữ số thế kỷ/giới tính (`0-9`), khớp 2 chữ số cuối của năm sinh.
- [x] **Task 5.3:** Viết pure Java class `DateLogicValidator`: Kiểm tra thứ tự logic `birthDate < issueDate <= today` và điều kiện công dân $\ge 14$ tuổi khi cấp căn cước.
- [x] **Task 5.4:** Viết `MandatoryFieldValidator`: Kiểm tra trường bắt buộc và định dạng theo JSON schema từng mã TTHC.
- [x] **Task 5.5:** Đánh dấu cảnh báo `MANUAL_REVIEW_REQUIRED` đối với các trường thông tin có độ tin cậy OCR nhận diện $< 0.70$.
- [x] **Task 5.6:** Xây dựng REST API `POST /api/v1/forms/precheck` nhận ảnh upload multipart và trả về báo cáo kết quả kiểm tra từng trường.
- [x] **Task 5.7:** Soạn thảo Chương 3 - Phần 2 (Động cơ quy tắc hậu kiểm định biểu mẫu hành chính) tại `docs/thesis-chapters/chapter-03.md`.
- [x] **Task 5.8:** Viết Báo cáo Tiến độ Tuần 5 nộp GVHD và Mentor tại `docs/weekly-reports/week-05-report.md`.

---

### 📌 TUẦN 6: MODULE 3 – TWO-STAGE SPATIAL-SEMANTIC TRIAGE [HOÀN THÀNH 100%]
- [x] **Task 6.1:** Cấu hình Redis GEO index cho tọa độ địa lý các cụm sự cố hiện trường (`SpatialIndexService.java`).
- [x] **Task 6.2:** Hiện thực **Pha 1 (Lọc không gian):** Dùng lệnh Redis `GEOSEARCH` quét các cụm sự cố đang `OPEN` hoặc `IN_PROGRESS` trong vòng 72 giờ qua trong bán kính $R = 75$ mét.
- [x] **Task 6.3:** Hiện thực **Pha 2 (So khớp nghiệp vụ & ngữ nghĩa):** Trong các cụm ứng viên, lọc chính xác theo `category` và đo Cosine Similarity vector mô tả với vector tâm cụm.
- [x] **Task 6.4:** Xử lý kết quả gom nhóm: Nếu $\text{Sim} \ge \tau = 0.82$, gộp phản ánh vào cụm sẵn có và tăng biến đếm `report_count`, cập nhật tâm cụm trung bình động; nếu khác danh mục hoặc $\text{Sim} < \tau$, tạo cụm sự cố mới độc lập.
- [x] **Task 6.5:** Xây dựng các REST API: `POST /api/v1/issues/report` (gửi phản ánh) và `GET /api/v1/issues/clusters` (lấy danh sách cụm phục vụ bản đồ cán bộ).
- [x] **Task 6.6:** Soạn thảo Chương 3 - Phần 3 (Thuật toán gom cụm phản ánh hiện trường 2 pha) tại `docs/thesis-chapters/chapter-03.md`.
- [x] **Task 6.7:** Viết Báo cáo Tiến độ Tuần 6 nộp GVHD và Mentor (Sơ kết giai đoạn giữa kỳ) tại `docs/weekly-reports/week-06-report.md`.

---

### 📌 TUẦN 7: MODULE 4 – ZERO-TRUST DOCUMENT VAULT [HOÀN THÀNH 100%]
- [x] **Task 7.1:** Xây dựng `ImageWatermarkService` bằng Java2D (`Graphics2D`) vẽ chìm watermark chéo với nội dung: `"CHỈ DÙNG ĐỂ SƠ DUYỆT HỒ SƠ TẠI UBND - [TIMESTAMP]"`.
- [x] **Task 7.2:** Hiện thực `ZeroTrustVaultService`: Mã hóa file ảnh đã đóng watermark bằng thuật toán `AES/GCM/NoPadding` (256-bit key).
- [x] **Task 7.3:** Tích hợp MinIO Java SDK để upload/download tệp mã hóa vào bucket `smartward-vault`.
- [x] **Task 7.4:** Cài đặt cơ chế One-Time Read Token trên Redis với TTL 24 giờ; sử dụng lệnh nguyên tử `GETDEL` (Spring Data Redis `getAndDelete`) để lấy token và xóa ngay lập tức. Lần truy cập thứ 2 bắt buộc trả về HTTP `410 Gone`.
- [x] **Task 7.5:** Xây dựng các REST API: `POST /api/v1/vault/upload` và `GET /api/v1/vault/view/{token}`.
- [x] **Task 7.6:** Soạn thảo Chương 3 - Phần 4 (Giải pháp bảo vệ dữ liệu công dân tuân thủ Nghị định 13/2023/NĐ-CP) tại `docs/thesis-chapters/chapter-03.md`.
- [x] **Task 7.7:** Viết Báo cáo Tiến độ Tuần 7 nộp GVHD và Mentor tại `docs/weekly-reports/week-07-report.md`.

---

### 📌 TUẦN 8: XÂY DỰNG DATASET KIỂM THỬ & EVALUATION API [HOÀN THÀNH 100%]
- [x] **Task 8.1:** Xây dựng bộ 80 câu hỏi kiểm thử RAG (40 câu hỏi trực tiếp, 25 câu tình huống đời thực, 15 câu hỏi bẫy/ngoài phạm vi kiểm thử Abstention) tại `data-pipeline/rag-dataset/`.
- [x] **Task 8.2:** Xây dựng tập 150 phản ánh hiện trường (30 sự cố gốc, 5 biến thể tự nhiên mỗi sự cố, thêm nhiễu GPS thực tế 10m-40m, cài cắm chính xác 25 ca biên khó: 10 Colocated, 10 High Lexical, 5 Distant) tại `data-pipeline/civic-reports/`.
- [x] **Task 8.3:** Chuẩn bị tập 40 ảnh chụp tờ khai (20 bản in, 20 bản viết tay cài cắm các lỗi logic xác định, kèm file nhãn ground-truth `annotations.json`) tại `data-pipeline/form-dataset/`.
- [x] **Task 8.4:** Xây dựng `ExperimentRunnerService` trong backend tính toán tự động các chỉ số: Recall@3, MRR, Citation Precision, False Answer Rate.
- [x] **Task 8.5:** Xây dựng REST API `POST /api/v1/evaluation/run-benchmarks` xuất kết quả đo lường ra định dạng JSON/CSV.
- [x] **Task 8.6:** Soạn thảo Chương 4 - Phần 1 (Phương pháp luận thiết kế tập kiểm thử giảm thiểu thiên lệch chủ quan).
- [x] **Task 8.7:** Viết Báo cáo Tiến độ Tuần 8 nộp GVHD và Mentor.

---

### 📌 TUẦN 9: THỰC NGHIỆM GRID SEARCH, ĐO ĐẠC & XUẤT BIỂU ĐỒ (PHÂN HỆ EVALUATION) [HOÀN THÀNH 100%]
- [x] **Task 9.1:** Xây dựng Python script `evaluation/scripts/grid_search.py` quét lưới cho $R \in \{25\text{m}, 50\text{m}, 75\text{m}, 100\text{m}, 150\text{m}\}$ và $\tau \in \{0.70, 0.75, 0.80, 0.85, 0.90\}$.
- [x] **Task 9.2:** Thu thập ma trận kết quả Precision, Recall, F1-Score cho 3 phương pháp (Spatial-only, Semantic-only, Spatial + Semantic đề xuất), lưu vào `evaluation/results/grid_search.csv`.
- [x] **Task 9.3:** Viết script `evaluation/scripts/plot_results.py` vẽ biểu đồ Precision-Recall Curve và Heatmap F1-score chứng minh cơ sở chọn $(R=75\text{m}, \tau=0.82)$, lưu vào `evaluation/charts/`.
- [x] **Task 9.4:** Thực hiện phân tích lỗi chuyên sâu (Error Analysis): Phân tích chi tiết các ca False Positive, False Negative và lỗi OCR nhận diện sai số CCCD.
- [x] **Task 9.5:** So sánh định lượng giữa 3 cấu hình RAG: LLM Zero-shot vs Standard RAG vs Proposed RAG (ngưỡng $\theta = 0.78$).
- [x] **Task 9.6:** Hoàn thiện toàn bộ nội dung Chương 4 (Kiểm thử, Đánh giá kết quả & Thảo luận chuyên sâu).
- [x] **Task 9.7:** Viết Báo cáo Tiến độ Tuần 9 nộp GVHD và Mentor.

---

### 📌 TUẦN 10: XÂY DỰNG GIAO DIỆN WEB RESPONSIVE / PWA (REACT + VITE + TAILWIND)
- [x] **Task 10.1:** Khởi tạo project `frontend/` (TypeScript, React 18, Vite 6, TailwindCSS, Lucide Icons, Leaflet OpenStreetMap). Tích hợp Google Stitch qua `@_davideast/stitch-mcp` (Project ID: `6123300235406367451`).
- [x] **Task 10.2:** Xây dựng **Cổng Công dân (Route `/citizen` - Mobile-First PWA):**
  - Giao diện Chatbot tư vấn TTHC (Legal RAG) hiển thị trích dẫn căn cứ pháp lý, popover chi tiết và banner cảnh báo từ chối (Abstention Guardrail).
  - Khối Bento 4 nút hành động nhanh (Khai sinh, Đăng ký kết hôn, Tạm trú, Xác nhận tình trạng hôn nhân).
  - Tích hợp kết nối trực tiếp API Backend Spring Boot `/api/v1/rag/ask`.
- [x] **Task 10.3:** Xây dựng **Tiền kiểm định tờ khai & Báo sự cố (Route `/citizen/form`):**
  - Form kiểm tra tính hợp lệ CCCD 12 số, ngày cấp thẻ theo mốc 14/25/40/60 tuổi, kiểm tra logic không sinh trước ngày cấp.
  - Ban hành rõ thông báo quy tắc hành chính: Hệ thống chỉ nhắc nhở người dân sửa bằng bút trên tờ khai giấy, không cho sửa trực tiếp trên màn hình.
  - Form báo sự cố hiện trường tích hợp Geolocation GPS, phân loại danh mục và hiển thị kết quả phân luồng 2 pha (bán kính $R=75\text{m}$ và độ tương đồng ngữ nghĩa $\tau=0.82$).
- [x] **Task 10.4:** Xây dựng **Trung tâm chỉ huy GIS Cán bộ (Route `/officer/map`):**
  - Bản đồ số sự cố GIS (Leaflet / OpenStreetMap) định vị địa bàn Phường 25 (Bình Thạnh).
  - Hiển thị trực quan các cụm phản ánh theo phân loại màu sắc, vòng tròn bán kính $R=75\text{m}$, số lượng người báo trùng lặp.
  - Thanh tra điều phối hiện trường: xem chi tiết sự cố, cấp độ ưu tiên và nút điều động lực lượng trật tự đô thị / công an phường.
- [x] **Task 10.5:** Xây dựng **Bàn sơ duyệt tờ khai (Route `/officer/audit`):**
  - Bộ hiển thị bản scan tờ khai CT01 và CCCD với lớp Watermark chéo chống giả mạo ("CHỈ DÙNG ĐỂ SƠ DUYỆT TẠI UBND PHƯỜNG 25...").
  - Hộp nhận diện OCR Bounding Boxes trực quan (Họ tên, Số CCCD, Ngày sinh, Địa chỉ, Chữ ký sinh trắc).
  - Bảng đối soát từng trường dữ liệu với điểm tin cậy AI 94.2% khớp CSDL Dân cư Quốc gia (Đề án 06).
  - Widget đồng hồ đếm ngược TTL và nút "Mô phỏng HTTP 410" minh chứng cơ chế Redis `GETDEL` Single-Use Token Vault tuân thủ Nghị định 13/2023/NĐ-CP.
  - Dock thao tác cố định: Yêu cầu bổ sung (với quick popover lý do), Chuyển lãnh đạo ký số, Chấp thuận sơ duyệt.
- [x] **Task 10.6:** Bổ sung cấu hình Web App Manifest (`manifest.json`) cho phép cài đặt PWA trên điện thoại và tài liệu hóa giải pháp Native Mobile App trong phần Future Works.
- [x] **Task 10.7:** Viết Báo cáo Tiến độ Tuần 10 nộp GVHD và Mentor (`docs/weekly-reports/week-10-report.md`).

---

### 📌 TUẦN 11: ĐÓNG GÓI HỆ THỐNG, TỐI ƯU DOCKER & HOÀN THIỆN BÁO CÁO UTH
- [x] **Task 11.1:** Đo kiểm tra tài nguyên toàn hệ thống (Frontend + Backend + CSDL): Đảm bảo tổng mức tiêu thụ RAM luôn $\le 2.0\text{ GB}$. Thiết lập hạn ngạch trần cứng $\sum \text{RAM} = 1,728\text{ MB} < 2,048\text{ MB}$ trong `docker-compose.yml`, thực tế chạy đầy tải đạt $\sim 585\text{ MB}$.
- [x] **Task 11.2:** Kiểm thử toàn diện profile offline (`DeterministicMockAiClient`), đảm bảo hệ thống có thể demo mượt mà mọi lúc mọi nơi mà không cần Internet hay API key Google.
- [x] **Task 11.3:** Rà soát toàn bộ mã nguồn, chuẩn hóa Clean Code, bổ sung Multi-stage Dockerfiles (`backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`), JavaDoc và hoàn thiện hướng dẫn chạy ứng dụng trong `README.md`.
- [x] **Task 11.4:** Tổng hợp toàn bộ các Chương 1, 2, 3, 4, 5, Lời cảm ơn, Lời cam đoan, Kết luận, Tài liệu tham khảo thành cuốn Báo cáo Đồ án tốt nghiệp UTH hoàn chỉnh tại `docs/thesis-chapters/FULL_THESIS_REPORT_UTH.md`.
- [x] **Task 11.5:** Định dạng cuốn báo cáo chuẩn quy cách của Trường ĐH Giao thông vận tải TP.HCM (Font Times New Roman, lề, giãn dòng 1.5, danh mục từ viết tắt, 14 bảng biểu, 15 hình ảnh/biểu đồ).
- [x] **Task 11.6:** Hoàn tất bản thảo toàn văn sẵn sàng gửi GVHD TS. Lê Văn Quốc Anh và Mentor Viettel An Giang duyệt trước khi in nộp.
- [x] **Task 11.7:** Viết Báo cáo Tiến độ Tuần 11 nộp GVHD và Mentor (`docs/weekly-reports/week-11-report.md`).

---

### 📌 TUẦN 12: SLIDE THUYẾT TRÌNH, VIDEO DEMO & BẢO VỆ TỐT NGHIỆP
- [ ] **Task 12.1:** Thiết kế bộ 10 Slide thuyết trình chuẩn học thuật theo khung trong [`docs/experimental-design-and-defense.md`](docs/experimental-design-and-defense.md).
- [ ] **Task 12.2:** Xây dựng kịch bản Demo trực tiếp 3 phút (3 ca: RAG từ chối câu hỏi bẫy, Rule Engine phát hiện lỗi tờ khai, Triage tự gộp 2 phản ánh trùng).
- [ ] **Task 12.3:** Quay video demo dự phòng (Backup Video Demo) phòng sự cố mất điện/mất mạng tại phòng hội đồng.
- [ ] **Task 12.4:** Luyện tập trả lời thành thạo 6 câu hỏi phản biện then chốt của Hội đồng chấm tốt nghiệp UTH.
- [ ] **Task 12.5:** Đóng bìa cứng mạ vàng cuốn Báo cáo tốt nghiệp có chữ ký GVHD và dấu mộc xác nhận của Doanh nghiệp.
- [ ] **Task 12.6:** Thuyết trình và bảo vệ đề tài trước Hội đồng Đồ án Tốt nghiệp Khoa CNTT - UTH.
- [ ] **Task 12.7:** Viết Báo cáo tổng kết toàn khóa thực tập và đồ án tốt nghiệp.
