# Kế Hoạch & Tiến Độ Thực Hiện Dự Án (Project Sprint Board)
**Dự án:** SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã  
**Đơn vị:** Trường Đại học Giao thông vận tải TP.HCM (UTH) – Đồ án Tốt nghiệp & Thực tập 12 Tuần  
**Trạng thái hiện tại:** `Tuần 1 / 12` 🚀

---

## 1. Bảng Theo Dõi Tổng Thể 12 Tuần (12-Week Sprint Tracker)

| Tuần | Trọng tâm công việc | Kỹ thuật (Code/System) | Báo cáo / Khóa luận UTH | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **W01** | **Khởi tạo Docker Zero-cost & Khung Spring Boot** | `docker-compose.yml`, Spring Boot 3.3, Package UTH | Soạn Mục 1.1 & 1.2 (Bối cảnh, RQ1-3) | 🔄 **ĐANG LÀM** |
| **W02** | **Thu thập 40 TTHC & Thiết kế CSDL Flyway** | `V1__init_schema.sql`, HNSW index, LegalChunking | Soạn Mục 2.1 & 2.2 (Kiến trúc & CSDL) | ⏳ Chờ |
| **W03** | **Tích hợp Mock AI Client & Rate Limiter** | `DeterministicMockAiClient`, Redis Rate Limiter | Soạn Mục 2.3 (Tối ưu giới hạn API) | ⏳ Chờ |
| **W04** | **Module 1: Legal RAG & Abstention Guardrail** | pgvector cosine, Ngưỡng $\theta=0.78$, API `/rag/ask` | Thuật toán RAG & Lưu đồ chống ảo giác | ⏳ Chờ |
| **W05** | **Module 2: Form Rule Engine (CCCD & Date)** | Java Rule Engine 12 số CCCD, Date Logic, OCR API | Quy chuẩn hậu kiểm định biểu mẫu | ⏳ Chờ |
| **W06** | **Module 3: Triage Phản ánh 2 Pha** | Redis GEO ($R$) + pgvector Cosine ($\tau$) | Thuật toán gom cụm 2 pha & lưu đồ | ⏳ Chờ |
| **W07** | **Module 4: Zero-Trust Document Vault** | Watermark Java2D, AES-256, MinIO, Redis `GETDEL` | Bảo mật dữ liệu theo Nghị định 13 | ⏳ Chờ |
| **W08** | **Bộ dữ liệu kiểm thử & Evaluation Controller** | 80 câu RAG, 150 phản ánh (GPS noise), 40 tờ khai | Phương pháp luận thực nghiệm | ⏳ Chờ |
| **W09** | **Chạy Grid Search $(R, \tau)$ & Phân tích lỗi** | Xuất ma trận $F_1$, biểu đồ P-R, Error Analysis | Hoàn thiện Chương 4 (Số liệu & Thảo luận) | ⏳ Chờ |
| **W10** | **Frontend React/Tailwind/Leaflet** | Cổng Công dân & Bàn làm việc Cán bộ | Hoàn thiện chương thiết kế giao diện | ⏳ Chờ |
| **W11** | **Đóng gói Docker $< 2\text{GB}$ & Rà soát Báo cáo** | Profile offline, format clean code, test tải | Hoàn thiện bản thảo nộp GVHD/Mentor | ⏳ Chờ |
| **W12** | **Slide Thuyết trình 10 trang & Luyện Bảo vệ** | Kịch bản demo 3 phút, Slide bảo vệ UTH | Bảo vệ trước Hội đồng chấm tốt nghiệp | ⏳ Chờ |

---

## 2. Sprint Chi Tiết: TUẦN 1 (Week 1)
**Mục tiêu tuần:** Thiết lập hoàn chỉnh môi trường chạy Docker cục bộ $< 2.0\text{ GB}$ RAM, khởi tạo khung dự án Spring Boot 3.3.x với Java 21, cấu hình sẵn sàng các kết nối và soạn xong phần mở đầu báo cáo.

### Danh sách công việc Kỹ thuật (Engineering Tasks):
- [ ] **Task 1.1: Tạo file `docker-compose.yml` theo ràng buộc Zero-Cost**
  - PostgreSQL 16 + pgvector (`mem_limit: 512m`, cổng `5432`).
  - Redis 7 Alpine (`mem_limit: 128m`, `--maxmemory 100mb --maxmemory-policy volatile-lru`, cổng `6379`).
  - MinIO Storage (`mem_limit: 256m`, cổng `9000` & `9001`).
  - Container `minio-init` tự động tạo bucket `smartward-vault`, quota 5GB, ILM 7 ngày.
- [ ] **Task 1.2: Khởi tạo Project Backend Spring Boot 3.3.x (Java 21)**
  - Quản lý phụ thuộc bằng Maven (`pom.xml`).
  - Khai báo dependencies: Spring Web, Spring Data JPA, Spring Data Redis, PostgreSQL driver, `pgvector-java`, MinIO SDK (`io.minio:minio:8.5.12`), Validation, Lombok, Springdoc OpenAPI.
- [ ] **Task 1.3: Cấu hình `application.yml` đa môi trường (`dev`, `test`, `prod`)**
  - Cấu hình HikariCP: `maximum-pool-size: 10`, `minimum-idle: 2`.
  - Cấu hình Multipart: max file size `5MB`.
  - Cấu hình Async ThreadPool: `corePoolSize: 2`, `maxPoolSize: 4`, `queueCapacity: 50`.
- [ ] **Task 1.4: Tạo cấu trúc Package chuẩn `vn.edu.uth.smartward`**
  - `config/`, `common/`, `rag/`, `formcheck/`, `triage/`, `vault/`, `evaluation/`.
  - Tạo các class Base: `ApiResponse<T>`, `GlobalExceptionHandler`, `BusinessException`.
- [ ] **Task 1.5: Kiểm thử khởi động hệ thống**
  - Chạy `docker compose up -d` và đo kiểm tra RAM thực tế của cụm Docker ($\le 1.0\text{ GB}$).
  - Chạy Spring Boot và kiểm tra endpoint Swagger UI: `http://localhost:8080/swagger-ui.html`.

### Danh sách công việc Học thuật / Báo cáo (Academic & Thesis Tasks):
- [ ] **Task 1.6: Soạn thảo Chương 1 Báo cáo thực tập**
  - Trích xuất nội dung từ [`docs/business-and-research-plan.md`](file:///e:/SmartWardAI/docs/business-and-research-plan.md): Bối cảnh thực tiễn tại phường/xã, 2 hạn chế lớn ở bộ phận Một cửa.
  - Viết rõ 3 câu hỏi nghiên cứu RQ1, RQ2, RQ3 và mục tiêu đề tài.
- [ ] **Task 1.7: Viết Nhật ký thực tập Tuần 1**
  - Ghi nhận buổi làm việc đầu tiên với Mentor doanh nghiệp và Giảng viên hướng dẫn UTH (thống nhất đề tài, phạm vi và công nghệ).

---

## 3. Hướng Dẫn Làm Việc Nhanh Với AI Coding Assistant
* **Khi muốn bắt đầu làm bất kỳ task nào**, bạn chỉ cần nhắn:
  > *"Hãy thực hiện Task 1.1 trong TODO.md"* hoặc *"Làm tiếp task tiếp theo trong Tuần 1 đi"*.
* AI sẽ tự động đọc đặc tả trong [`docs/SPEC.md`](file:///e:/SmartWardAI/docs/SPEC.md), tuân thủ [`AGENT_RULES.md`](file:///e:/SmartWardAI/AGENT_RULES.md), viết code, kiểm tra và tự động cập nhật đánh dấu `[x]` vào file `TODO.md` này cho bạn.
