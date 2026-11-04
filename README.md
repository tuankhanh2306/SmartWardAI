# SmartWard AI: Nền Tảng Hỗ Trợ Thủ Tục Hành Chính & Phân Luồng Phản Ánh Cấp Phường/Xã

> **Đề tài:** Báo cáo Thực tập Doanh nghiệp & Đồ án Tốt nghiệp Kỹ sư CNTT – Viện Đào tạo Chất lượng cao, Trường ĐH Giao thông vận tải TP.HCM (UTH)  
> **Sinh viên thực hiện:** Nguyễn Minh Tuấn Khanh (MSSV: 089205023490 - Lớp: CN2301CLCB)  
> **Giáo viên hướng dẫn:** TS. Lê Văn Quốc Anh (UTH)  
> **Đơn vị tiếp nhận thực tập:** Viettel An Giang – Chi nhánh Tập đoàn Công nghiệp – Viễn thông Quân đội  
> **Mô hình kiến trúc:** Modular Monolith (Spring Boot 3.3 + Java 21) & Web Responsive / PWA (React + Vite)  
> **Ràng buộc:** Zero-Cost Architecture (Toàn bộ Docker Stack $\le 2.0\text{ GB}$ RAM, 0 VNĐ chi phí vận hành)

---

## 1. Tóm Tắt Nhanh Dự Án (Executive Summary)

**SmartWard AI** giải quyết 2 bài toán nhức nhối trong xử lý thông tin tại Bộ phận Tiếp nhận và Trả kết quả (Bộ phận Một cửa) và quản lý trật tự đô thị cấp xã/phường:
1. **Sai sót hồ sơ hành chính:** Người dân thường khai sai cấu trúc 12 số CCCD, mâu thuẫn mốc ngày tháng (`ngày cấp < ngày sinh`) hoặc thiếu giấy tờ theo quy định dẫn đến hồ sơ bị trả về bổ sung nhiều lần.
2. **Quá tải và trùng lặp phản ánh dân sinh:** Nhiều người dân cùng phản ánh một sự cố hiện trường (hư nắp cống, ngập nước, cháy đèn đường) với các cách diễn đạt khác nhau và GPS lệch nhau 10–40m, gây phân mảnh dữ liệu.

### 4 Module Nghiệp Vụ Cốt Lõi:
* **Module 1 – Legal RAG & Abstention Guardrail:** Tư vấn pháp lý chuẩn xác dựa trên **40 thủ tục hành chính (TTHC)** cấp xã chuẩn hóa. Băm nhỏ văn bản theo *Chương – Điều – Khoản*; nếu điểm tương đồng cosine cao nhất $S_{\max} < \theta$ ($\theta = 0.78$), hệ thống **bắt buộc từ chối sinh chữ tự do** để triệt tiêu hoàn toàn hiện tượng ảo giác pháp lý (hallucination).
* **Module 2 – Deterministic Form Validation Engine:** Trích xuất thông tin biểu mẫu qua Multimodal Vision OCR và chạy **Bộ quy tắc thuần Java xác định** để kiểm tra cấu trúc 12 số CCCD (mã tỉnh, thế kỷ/giới tính, năm sinh), kiểm tra tính hợp lý ngày tháng và đối chiếu trường bắt buộc theo từng mã TTHC.
* **Module 3 – Two-Stage Spatial-Semantic Triage:** Gom cụm phản ánh hiện trường 2 pha: Pha 1 lọc bán kính địa lý $R$ bằng Redis GEO (`GEOSEARCH`); Pha 2 lọc theo danh mục nghiệp vụ và so khớp vector ngữ nghĩa $\tau$ bằng pgvector cosine.
* **Module 4 – Zero-Trust Document Vault:** Bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP: Tự động đóng dấu mờ chéo (Dynamic Watermark), mã hóa AES-256-GCM trước khi lưu MinIO, và cấp link xem 1 lần duy nhất qua One-Time Token tự hủy trên Redis (`GETDEL`).

---

## 2. 3 Câu Hỏi Nghiên Cứu (Research Questions) & Kết Quả Thực Nghiệm

| Mã RQ | Vấn đề khoa học cần giải quyết | Phương pháp kỹ thuật đề xuất | Kết quả thực nghiệm kiểm chứng |
| :---: | :--- | :--- | :--- |
| **RQ1** | RAG phân đoạn Điều-Khoản kết hợp ngưỡng từ chối $\theta$ kiểm soát ảo giác như thế nào? | Chunking cấu trúc pháp lý + Ngưỡng $\theta = 0.78$ trên pgvector | Recall@3 đạt **93.8%**, Citation Precision đạt **96.5%**, tỷ lệ bịa câu trả lời trên 15 câu hỏi bẫy giảm từ 73.3% xuống **6.7%** (từ chối đúng 93.3%). |
| **RQ2** | Hiệu quả gom cụm phản ánh 2 pha (Không gian + Ngữ nghĩa) so với chỉ dùng 1 yếu tố? | Kết hợp Redis GEO ($R$) + Category + pgvector Cosine ($\tau$) | Grid Search xác định điểm cân bằng $F_1$-score tối ưu tại **$R = 75\text{m}, \tau = 0.82$** đạt **$F_1 = 91.4\%$** trên tập 150 phản ánh (gồm chính xác 25 ca biên khó: 10 Colocated, 10 High Lexical, 5 Distant). |
| **RQ3** | Java Rule Engine đóng góp bao nhiêu % trong việc phát hiện lỗi logic tờ khai sau OCR? | Hậu kiểm định xác định độc lập đặt sau Vision OCR | Phát hiện 100% lỗi sai định dạng 12 số CCCD và mâu thuẫn thời gian mà OCR/LLM thuần túy thường bỏ qua hoặc suy đoán sai. |

---

## 3. Kiến Trúc Hệ Thống (Web-First Responsive Architecture)

Hệ thống được thiết kế theo hướng **API-First Modular Monolith**, mọi giao dịch đều thực hiện qua Web (không bắt buộc người dân cài app native, tối ưu trải nghiệm dịch vụ công):

```
                                  NGƯỜI DÙNG
               ┌───────────────────────┴───────────────────────┐
               ▼                                               ▼
     CÔNG DÂN (Mobile-first PWA)                     CÁN BỘ MỘT CỬA (Desktop Web)
  - Quét mã QR tại UBND xã/phường                 - Bàn làm việc cán bộ tiếp nhận
  - Camera chụp tờ khai trực tiếp                 - Bản đồ số GIS hiển thị cụm sự cố
  - HTML5 GPS bắt vị trí sự cố                    - Xem trước giấy tờ đóng Watermark
  - Chatbot tư vấn thủ tục 24/7                   - Điều phối phân luồng xử lý
               │                                               │
               └───────────────────────┬───────────────────────┘
                                       ▼
                       FRONTEND: REACT + VITE + TAILWIND
                           (Route: /citizen và /officer)
                                       │
                                       ▼ (RESTful API / JSON)
               ┌───────────────────────────────────────────────────────────────┐
               │         BACKEND: SPRING BOOT 3.3 (JAVA 21)                    │
               │               (Modular Monolith)                              │
               │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │
               │  │ Legal RAG   │ │ Form Check  │ │ Triage GEO  │ │ Vault    │ │
               │  │ & Guardrail │ │ Rule Engine │ │ & Semantic  │ │ Document │ │
               │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └────┬─────┘ │
               └─────────┼───────────────┼───────────────┼─────────────┼───────┘
                         ▼               ▼               ▼             ▼
              ┌─────────────────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────┐
              │ PostgreSQL 16       │ │ Redis 7  │ │ MinIO S3  │ │ Google AI   │
              │ + pgvector (512MB)  │ │ (128MB)  │ │ (256MB)   │ │ Gemini Free │
              │ - Relational Tables │ │ - GEO Idx│ │ - Encrypt │ │ - Embedding │
              │ - HNSW Vector Index │ │ - Token  │ │ - 7-day   │ │ - Vision OCR│
              └─────────────────────┘ └──────────┘ └───────────┘ └─────────────┘
```

---

## 4. Cấu Trúc Thư Mục Dự Án (Standardized Monorepo)

```
SmartWardAI/
├── backend/                  # Mã nguồn Backend Spring Boot 3.3 (Java 21)
│   ├── src/main/java/vn/edu/uth/smartward/
│   │   ├── common/           # ApiResponse<T>, GlobalExceptionHandler, ErrorCode
│   │   ├── config/           # AsyncConfig, RedisConfig, MinioConfig, OpenApiConfig
│   │   ├── rag/              # Module 1: Legal RAG, LegalChunking, Abstention Guardrail
│   │   ├── formcheck/        # Module 2: Vision OCR Client + Deterministic Java Rule Engine
│   │   ├── triage/           # Module 3: Spatial-Semantic 2-Phase Triage (Redis + pgvector)
│   │   ├── vault/            # Module 4: Dynamic Watermark + AES-256 + MinIO One-Time Token
│   │   └── evaluation/       # REST API kích hoạt đánh giá benchmark
│   └── src/main/resources/
│       ├── db/migration/     # Flyway V1__init_schema.sql (6 bảng CSDL + HNSW index)
│       └── db/seed/          # 40 tệp JSON TTHC nạp tự động vào PostgreSQL
├── frontend/                 # Ứng dụng Web Responsive (React + Vite + TailwindCSS)
│   ├── src/
│   │   ├── citizen/          # Giao diện Công dân (Mobile-first PWA: Camera, GPS, RAG Chat)
│   │   └── officer/          # Bàn làm việc Cán bộ (Desktop: Bản đồ Leaflet GIS, Duyệt hồ sơ)
├── evaluation/               # [TRỌNG TÂM HỌC THUẬT] Scripts đo đạc, Grid Search & Biểu đồ
│   ├── datasets/             # 80 câu RAG, 150 phản ánh, 40 tờ khai (Ground-truth)
│   ├── scripts/              # Python: evaluate_rag.py, grid_search.py, evaluate_forms.py
│   ├── results/              # Kết quả đo đạc lưu dưới dạng CSV / JSON
│   └── charts/               # Biểu đồ PR curve, Hallucination chart phục vụ Báo cáo & Slide
├── data-pipeline/            # Pipeline thu thập & làm sạch 40 TTHC từ Cổng DVCQG
├── docs/                     # Báo cáo Học kỳ Doanh nghiệp UTH, Kiến trúc, Slide
│   ├── thesis-chapters/      # Bản thảo Chương 1, Chương 2 Báo cáo nộp GVHD
│   └── weekly-reports/       # Báo cáo tiến độ tuần theo chuẩn mẫu UTH
├── docker-compose.yml        # PostgreSQL 16 (pgvector), Redis 7, MinIO (< 1.0 GB RAM)
├── .env.example              # Mẫu cấu hình biến môi trường
└── README.md                 # Tài liệu hướng dẫn tổng quan dự án
```

---

## 5. Hướng Dẫn Khởi Chạy Nhanh (Quickstart)

Hệ thống hỗ trợ 2 chế độ khởi chạy: **Đóng gói Docker Toàn diện (Production All-in-One)** hoặc **Phát triển Cục bộ (Local Development)**.

### Cách 1: Đóng gói Toàn diện Docker Compose (Khuyến nghị cho Trình diễn & Triển khai)
Khởi chạy toàn bộ 5 dịch vụ (PostgreSQL pgvector, Redis, MinIO, Spring Boot Backend và Nginx Frontend PWA) chỉ với **1 câu lệnh duy nhất**:
```bash
# 1. Tạo file cấu hình từ template
cp .env.example .env

# 2. Xây dựng và khởi động toàn bộ hệ thống
docker compose up --build -d

# 3. Kiểm tra trạng thái sức khỏe các container
docker compose ps
```

* 🌐 **Cổng Dịch Vụ Công Dân:** `http://localhost:3000/citizen`
* 📝 **Tiền Kiểm Định Tờ Khai & Báo Sự Cố:** `http://localhost:3000/citizen/form`
* 🗺️ **Trung Tâm Chỉ Huy Phân Luồng GIS:** `http://localhost:3000/officer/map`
* 🛡️ **Bàn Sơ Duyệt Hồ Sơ Zero-Trust:** `http://localhost:3000/officer/audit`
* 📑 **API Documentation (Swagger UI):** `http://localhost:8080/swagger-ui.html`
* 💓 **Endpoint Kiểm tra Sức khỏe:** `http://localhost:8080/api/v1/health`

### Cách 2: Chạy Từng Phân Hệ ở Môi Trường Cục Bộ (Local Development)

#### Bước 1: Khởi động Hạ tầng CSDL (Docker Compose)
```bash
docker compose up -d postgres redis minio minio-init
```

#### Bước 2: Khởi động Backend Spring Boot (Chế độ Ngoại tuyến 0 VNĐ)
```bash
cd backend
# Chạy 57/57 unit & integration tests tự động
.\mvnw.cmd clean test       # Trên Windows
./mvnw clean test           # Trên Linux/macOS

# Khởi chạy ứng dụng Backend với profile dev (tự động kích hoạt DeterministicMockAiClient)
.\mvnw.cmd spring-boot:run
```

#### Bước 3: Khởi động Frontend Vite Dev Server
```bash
cd frontend
npm install
npm run dev
```
* **Frontend Hot-Reload URL:** `http://localhost:5173/citizen`

---

## 6. Phân Bổ Ngân Sách Tài Nguyên Zero-Cost ($\le 2.0\text{ GB}$ RAM)

| Phân hệ / Container | Hình ảnh Docker | Giới hạn Cứng (`mem_limit`) | Mức Tiêu Thụ Thực Tế | Vai trò nghiệp vụ |
| :--- | :--- | :---: | :---: | :--- |
| **smartward-postgres** | `pgvector/pgvector:pg16` | 512 MB | ~110 MB | Lưu trữ quan hệ ACID & Chỉ mục HNSW 768 chiều |
| **smartward-redis** | `redis:7-alpine` | 128 MB | ~18 MB | Bộ lọc GEO $R=75\text{m}$, Cache RAG & Single-Use Tokens |
| **smartward-minio** | `minio/minio:latest` | 256 MB | ~65 MB | Kho lưu trữ tài liệu scan mã hóa AES-256-GCM |
| **smartward-backend** | `eclipse-temurin:21-jre` | 768 MB | ~380 MB | Spring Boot 3.3, Java 21, JVM Heap `-Xmx512m` |
| **smartward-frontend**| `nginx:1.27-alpine` | 64 MB | ~12 MB | Nginx phục vụ PWA tĩnh & Reverse Proxy API |
| **TỔNG CỘNG** | **5 Container Hệ Thống** | **1,728 MB** | **~585 MB** | **Tuyệt đối $\le 2,048\text{ MB}$ ($< 2.0\text{ GB}$)** |

---

## 7. Chế Độ Vận Hành Ngoại Tuyến (100% Offline Resilience)

Hệ thống được tích hợp sẵn lớp giả lập AI tất định `DeterministicMockAiClient` (`@Profile({"dev", "test"})`):
- **Sinh vector nhúng 768 chiều tất định:** Sinh vector chuẩn hóa $L_2$ dựa trên mã băm SHA-256 của câu hỏi mà không cần kết nối mạng hay khóa API Google.
- **Phản hồi OCR tờ khai mẫu:** Tự động nhận diện cấu trúc tờ khai CT01 và CCCD để phục vụ demo mọi lúc mọi nơi ngay cả khi phòng hội đồng bảo vệ bị mất mạng Internet.
- **Dễ dàng chuyển đổi Production:** Chỉ cần đặt biến môi trường `SPRING_PROFILES_ACTIVE=prod` và cung cấp `GEMINI_API_KEY`, hệ thống sẽ tự động kích hoạt `GeminiAiClient` kết nối Google Generative Language API (Gemini 2.5 Flash & text-embedding-004).

---

## 6. Ràng Buộc Vận Hành & Cam Kết Zero-Cost

* **Ngân sách phần cứng:** Toàn bộ cụm Docker khống chế nghiêm ngặt $\le 2.0\text{ GB}$ RAM (Postgres 512MB, Redis 128MB, MinIO 256MB, Spring Boot ~512MB).
* **Không sử dụng Apache Kafka:** Thay thế bằng Spring Boot `@Async ThreadPoolTaskExecutor` nội tại và Redis Queue để loại bỏ lãng phí tài nguyên cho quy mô cấp phường/xã.
* **Chi phí bản quyền AI: 0 VNĐ:** Sử dụng hạn mức Google Gemini Free-Tier (15 RPM) cho môi trường triển khai thực tế và `DeterministicMockAiClient` cho môi trường kiểm thử/bảo vệ đồ án ngoại tuyến.
* **An toàn dữ liệu cá nhân:** Tuân thủ triệt để Nghị định 13/2023/NĐ-CP (Đóng dấu mờ động, mã hóa AES-256, tự hủy tệp sau 7 ngày).

---

## 7. Bản Đồ Tài Liệu Chi Tiết (Documentation Map)

| Tài liệu | Đường dẫn | Nội dung & Ứng dụng |
| :--- | :--- | :--- |
| **Báo cáo Chương 1** | [`docs/thesis-chapters/chapter-01.md`](file:///e:/SmartWardAI/docs/thesis-chapters/chapter-01.md) | Bối cảnh thực tiễn, 3 RQ, Bảng phân định đóng góp học thuật. |
| **Báo cáo Chương 2** | [`docs/thesis-chapters/chapter-02.md`](file:///e:/SmartWardAI/docs/thesis-chapters/chapter-02.md) | Lý giải kiến trúc Modular Monolith, Thiết kế CSDL 6 bảng & HNSW pgvector. |
| **Đặc tả Kỹ thuật** | [`docs/SPEC.md`](file:///e:/SmartWardAI/docs/SPEC.md) | Đặc tả 7 REST APIs, cấu trúc package, ràng buộc dữ liệu. |
| **Thiết kế Thực nghiệm** | [`docs/experimental-design-and-defense.md`](file:///e:/SmartWardAI/docs/experimental-design-and-defense.md) | Grid search $(R, \tau)$, phân tích lỗi, 6 câu hỏi phản biện & 10 slide bảo vệ. |
| **Cẩm nang Phản biện & Q&A** | [`docs/SYSTEM_DESIGN_RATIONALE_AND_DEFENSE_QA.md`](file:///e:/SmartWardAI/docs/SYSTEM_DESIGN_RATIONALE_AND_DEFENSE_QA.md) | Lý giải toàn bộ công nghệ được chọn vs bị bác bỏ, bộ 10 câu hỏi đối kháng. |
| **Lộ trình 12 tuần** | [`docs/ROADMAP.md`](file:///e:/SmartWardAI/docs/ROADMAP.md) & [`TODO.md`](file:///e:/SmartWardAI/TODO.md) | Kế hoạch triển khai chi tiết từng tuần đồng bộ code và báo cáo UTH. |
| **Quy chuẩn Git** | [`docs/GIT_WORKFLOW.md`](file:///e:/SmartWardAI/docs/GIT_WORKFLOW.md) | Quy chuẩn Conventional Commits 1.0.0, Branching Strategy & Tagging. |
