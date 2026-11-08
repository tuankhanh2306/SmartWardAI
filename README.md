# SmartWard AI: Nền Tảng Hỗ Trợ Thủ Tục Hành Chính & Phân Luồng Phản Ánh Cấp Phường/Xã

> **Đề tài:** Báo cáo Thực tập Doanh nghiệp & Đồ án Tốt nghiệp Kỹ sư CNTT – Viện Đào tạo Chất lượng cao, Trường ĐH Giao thông vận tải TP.HCM (UTH)  
> **Sinh viên thực hiện:** Nguyễn Minh Tuấn Khanh (MSSV: 089205023490 - Lớp: CN2301CLCB)  
> **Giáo viên hướng dẫn:** TS. Lê Văn Quốc Anh (UTH)  
> **Đơn vị tiếp nhận thực tập:** Viettel An Giang – Chi nhánh Tập đoàn Công nghiệp – Viễn thông Quân đội  
> **Mô hình kiến trúc:** Modular Monolith (Spring Boot 3.3 + Java 21) & Web Responsive / PWA (React + Vite)  
> **Ràng buộc:** Zero-Cost Architecture (Toàn bộ Docker Stack $\le 2.0\text{ GB}$ RAM, 0 VNĐ chi phí vận hành)

---

## 1. Tóm Tắt Nhanh Dự Án (Executive Summary)

**SmartWard AI** giải quyết 2 bài toán nhức nhối trong xử lý thông tin tại Bộ phận Tiếp nhận và Trả kết quả (Bộ phận Một cửa) và quản lý trật tự đô thị tại **96 Xã, Phường và Đặc khu thuộc tỉnh An Giang**:
1. **Sai sót hồ sơ hành chính:** Người dân thường khai sai cấu trúc 12 số CCCD, mâu thuẫn ngày tháng trên Giấy chứng sinh, chưa đủ tuổi kết hôn theo Luật HN&GĐ hoặc ghi mục đích xác nhận độc thân chung chung dẫn đến hồ sơ bị trả về bổ sung nhiều lần.
2. **Quá tải, trùng lặp & lệch địa bàn phản ánh dân sinh:** Nhiều người dân cùng phản ánh một sự cố hiện trường (hư đường, ngập nước, cháy đèn đường) hoặc đi ngang qua xã/phường khác gặp sự cố nhưng không biết gửi về đâu, GPS lệch trong hẻm hoặc thiếu số điện thoại liên hệ xác minh.

### 4 Module Nghiệp Vụ Cốt Lõi:
* **Module 1 – Legal RAG & Abstention Guardrail:** Tư vấn pháp lý chuẩn xác dựa trên **40 thủ tục hành chính (TTHC)** cấp xã chuẩn hóa (cấu trúc trả lời 5 phần tinh gọn, tích hợp đọc giọng nói tiếng Việt TTS & cỡ chữ `A / A+ / A++` cho người cao tuổi). Nếu điểm tương đồng cosine cao nhất $S_{\max} < \theta$ ($\theta = 0.78$), hệ thống **bắt buộc từ chối sinh chữ tự do** để triệt tiêu hoàn toàn hiện tượng ảo giác pháp lý (hallucination).
* **Module 2 – Multi-Form Deterministic Validation Engine (4 Nhóm Tờ Khai Trọng Tâm):** Kết hợp Multimodal Vision OCR, quét mã QR mặt trước CCCD và **Động cơ quy tắc tất định (Java + TypeScript Rule Engine)** kiểm tra 4 nhóm biểu mẫu cốt lõi:
  1. **`CT01` (Tờ khai thay đổi thông tin cư trú - Bộ Công an):** Kiểm tra cấu trúc 12 số ĐDCN/CCCD (mã tỉnh, mã thế kỷ/giới tính, năm sinh), logic ngày cấp và sự đồng ý của chủ hộ.
  2. **`TK-KS` (Tờ khai Đăng ký khai sinh - Thông tư 04/2020/TT-BTP):** Đối chiếu chéo (Cross-check) Tờ khai với **Giấy chứng sinh** của bệnh viện (Họ tên mẹ, Ngày sinh của trẻ) và quy tắc pháp lý khi cha mẹ chưa đăng ký kết hôn.
  3. **`TK-KH` (Tờ khai Đăng ký kết hôn & Xác nhận tình trạng hôn nhân):** Kiểm tra độ tuổi kết hôn hợp pháp tính chính xác đến từng ngày (Nam $\ge 20$ tuổi, Nữ $\ge 18$ tuổi theo Điều 8 Luật HN&GĐ 2014) và chặn các mục đích xác nhận độc thân ghi chung chung.
  4. **`TK-BTXH` (Tờ khai Trợ cấp Bảo trợ xã hội - Mẫu 01 Nghị định 20/2021/NĐ-CP):** Kiểm tra điều kiện người cao tuổi ($\ge 80$ tuổi không có lương hưu) hoặc mức độ khuyết tật nặng/đặc biệt nặng và số tài khoản ngân hàng nhận trợ cấp Đề án 06.
* **Module 3 – High-Precision 25m GPS, Auto-Mapping & Cross-Ward Triage:**
  - **Quét GPS chính xác cao ($R = 25\text{m}$) & Tự động điền ô vị trí/nội dung:** Ngay khi mở tab báo sự cố, hệ thống tự động quét GPS, tra cứu địa chỉ ngược (Reverse Geocoding) và điền thẳng vào **Ô Vị Trí** lẫn **Ô Nội Dung** (cho phép người dân chỉnh sửa tay nếu GPS lệch).
  - **Bắt buộc SĐT liên hệ khẩn cấp (`reporterPhone`):** Đảm bảo người giám sát/cán bộ trực ban có thể bấm gọi xác minh ngay.
  - **Định tuyến liên xã/phường tự động (`Cross-Ward Jurisdiction Routing`):** Dựa trên địa chỉ trong ô vị trí để gửi báo cáo về đúng UBND Xã/Phường nơi xảy ra sự cố (ví dụ: Công dân ở *Xã An Phú* đi qua *Phường Châu Đốc* báo sự cố sẽ được định tuyến thẳng về Bàn điều hành *UBND Phường Châu Đốc*).
  - **Gom cụm 2 pha (Spatial-Semantic):** Pha 1 lọc bán kính địa lý $R = 25\text{m}$ bằng Redis GEO (`GEOSEARCH`); Pha 2 lọc danh mục nghiệp vụ và so khớp vector ngữ nghĩa $\tau = 0.82$ bằng pgvector cosine.
* **Module 4 – Zero-Trust Document Vault & 1-Dashboard Officer Workspace:**
  - **Phân quyền giao diện nghiêm ngặt (Role-Based Partitioning):** Cổng Công dân và Bàn Cán bộ tách biệt hoàn toàn. Cán bộ xã đăng nhập bằng Thẻ công chức (`CC-AG-8942`) và thao tác duy nhất trên **1 Bàn Điều Hành Tập Trung (`/officer/ward/:wardCode`)** sử dụng Progressive Disclosure (Slide-Over Drawer) gọn gàng.
  - **Bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP:** Tự động đóng dấu mờ chéo (Dynamic Watermark), mã hóa AES-256-GCM trước khi lưu MinIO, và cấp link xem 1 lần duy nhất qua One-Time Token tự hủy trên Redis (`GETDEL`).

---

## 2. 3 Câu Hỏi Nghiên Cứu (Research Questions) & Kết Quả Thực Nghiệm

| Mã RQ | Vấn đề khoa học cần giải quyết | Phương pháp kỹ thuật đề xuất | Kết quả thực nghiệm kiểm chứng |
| :---: | :--- | :--- | :--- |
| **RQ1** | RAG phân đoạn Điều-Khoản kết hợp ngưỡng từ chối $\theta$ kiểm soát ảo giác như thế nào? | Chunking cấu trúc pháp lý + Ngưỡng $\theta = 0.78$ trên pgvector | Recall@3 đạt **93.8%**, Citation Precision đạt **96.5%**, tỷ lệ bịa câu trả lời trên 15 câu hỏi bẫy giảm từ 73.3% xuống **0.0% – 6.7%** (từ chối đúng tuyệt đối các câu ngoài phạm vi). |
| **RQ2** | Hiệu quả gom cụm phản ánh 2 pha (Không gian + Ngữ nghĩa) và định tuyến liên xã/phường? | Kết hợp Redis GEO ($R = 25\text{m}$ thực tế / Grid Search $25\text{m}-100\text{m}$) + Category + pgvector Cosine ($\tau = 0.82$) | Đạt **$F_1 = 91.4\%$** trên tập 150 phản ánh (gồm 25 ca biên khó: 10 Colocated khác loại, 10 High Lexical khác vị trí, 5 Distant); định tuyến chính xác 100% về 96 xã/phường An Giang. |
| **RQ3** | Multi-Form Rule Engine đóng góp bao nhiêu % trong việc phát hiện lỗi logic tờ khai sau OCR? | Hậu kiểm định tất định độc lập trên 4 mẫu tờ khai (`CT01`, `TK-KS`, `TK-KH`, `TK-BTXH`) | Phát hiện **100%** lỗi sai định dạng 12 số CCCD, lệch ngày chứng sinh, chưa đủ tuổi kết hôn và mục đích độc thân mơ hồ mà OCR/LLM thuần túy bỏ sót. |

---

## 3. Kiến Trúc Hệ Thống (Web-First Responsive & Role-Partitioned Architecture)

Hệ thống được thiết kế theo hướng **API-First Modular Monolith**, phân tách rõ rệt luồng **Công Dân** và **Cán Bộ Một Cửa**:

```
                                  NGƯỜI DÙNG (96 XÃ/PHƯỜNG/ĐẶC KHU AN GIANG)
               ┌──────────────────────────────────────┴──────────────────────────────────────┐
               ▼                                                                             ▼
     CÔNG DÂN (Mobile-first PWA: /citizen, /citizen/form)            CÁN BỘ XÃ (1-Dashboard Tập Trung: /officer/ward/:code)
  - Cổng Hỏi đáp AI RAG 40 TTHC (TTS đọc to, cỡ chữ A++)           - Xác thực Thẻ công chức / VNeID (OfficerAuthModal)
  - Tiền kiểm định 4 nhóm tờ khai (CT01, TK-KS, TK-KH, TK-BTXH)    - Bàn điều hành duy nhất (Progressive Disclosure Drawer)
  - Báo sự cố GPS R=25m tự điền ô vị trí + SĐT khẩn cấp            - Nhận sự cố liên xã/phường + Bấm gọi SĐT người dân
  - Tự động định tuyến báo cáo về đúng UBND Xã/Phường sở tại       - Bản đồ GIS thu gọn + Duyệt hồ sơ Watermark NĐ 13/2023
               │                                                                             │
               └──────────────────────────────────────┬──────────────────────────────────────┘
                                                      ▼
                                      FRONTEND: REACT + VITE + TAILWIND
                                                      │
                                                      ▼ (RESTful API / JSON)
               ┌─────────────────────────────────────────────────────────────────────────────┐
               │                      BACKEND: SPRING BOOT 3.3 (JAVA 21)                     │
               │                              (Modular Monolith)                             │
               │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌────────────┐ │
               │  │ 1. Legal RAG    │ │ 2. Multi-Form   │ │ 3. Triage GEO   │ │ 4. Vault   │ │
               │  │ & Guardrail     │ │ Rule Engine (4) │ │ R=25m & Routing │ │ Document   │ │
               │  └────────┬────────┘ └────────┬────────┘ └────────┬────────┘ └──────┬─────┘ │
               └───────────┼───────────────────┼───────────────────┼─────────────────┼───────┘
                           ▼                   ▼                   ▼                 ▼
              ┌─────────────────────┐ ┌──────────────┐ ┌───────────────┐ ┌─────────────────┐
              │ PostgreSQL 16       │ │ Redis 7      │ │ MinIO S3      │ │ Google AI       │
              │ + pgvector (512MB)  │ │ (128MB)      │ │ (256MB)       │ │ Gemini / Mock   │
              │ - Relational Tables │ │ - GEO R=25m  │ │ - AES-256-GCM │ │ - Embedding 768 │
              │ - HNSW Vector Index │ │ - 1-Time Tok │ │ - 7-day ILM   │ │ - Vision OCR    │
              └─────────────────────┘ └──────────────┘ └───────────────┘ └─────────────────┘
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
│   │   ├── formcheck/        # Module 2: Vision OCR + Multi-Form Rule Engine (CT01, TK-KS, TK-KH, TK-BTXH)
│   │   ├── triage/           # Module 3: Spatial-Semantic Triage (R=25m, SĐT khẩn, Định tuyến liên xã)
│   │   ├── vault/            # Module 4: Dynamic Watermark + AES-256 + MinIO One-Time Token
│   │   └── evaluation/       # REST API kích hoạt đánh giá benchmark học thuật
│   └── src/main/resources/
│       ├── db/migration/     # Flyway migrations (6 bảng CSDL + HNSW index)
│       └── db/seed/          # 40 tệp JSON TTHC nạp tự động vào PostgreSQL
├── frontend/                 # Ứng dụng Web Responsive (React + Vite + TailwindCSS)
│   ├── src/
│   │   ├── components/       # Header phân quyền, OfficerAuthModal, QRScannerModal, CameraCaptureModal
│   │   ├── context/          # WardContext (96 xã/phường An Giang), RoleContext, AccessibilityContext
│   │   ├── data/             # Dữ liệu 96 đơn vị hành chính An Giang & thuật toán định tuyến Haversine/Text
│   │   └── pages/            # CitizenPortal, FormAndIssueReporting, PerWardDashboard, WardOnboarding
├── evaluation/               # [TRỌNG TÂM HỌC THUẬT] Scripts đo đạc, Grid Search & Biểu đồ
│   ├── requirements.txt      # Thư viện Python cho thực nghiệm (numpy, pandas, scikit-learn, scipy, matplotlib, seaborn)
│   ├── scripts/              # Python: run_all_evaluations.py, evaluate_rag.py, grid_search.py, evaluate_form_and_vault.py
│   ├── results/              # Kết quả đo đạc độc lập nhãn (rag_metrics.json, grid_search.csv, heldout_validation.json)
│   └── charts/               # Biểu đồ PR curve, Hallucination chart phục vụ Báo cáo & Slide
├── data-pipeline/            # Pipeline thu thập & làm sạch 40 TTHC từ Cổng DVCQG
├── docs/                     # Hệ thống tài liệu kỹ thuật & nghiệp vụ (Xem docs/README.md)
│   ├── architecture/         # Đặc tả REST APIs, CSDL, Luồng dữ liệu, Ràng buộc RAM
│   ├── designs/              # Nguyên mẫu giao diện HTML & Mô hình 3D Multi-Agent
│   ├── roadmap/              # Lộ trình 12 tuần cơ sở & Mở rộng SmartWard AI 2.0
│   ├── testing/              # Hướng dẫn chạy kiểm thử tự động (100+ tests)
│   └── weekly-reports/       # Nhật ký 11 tuần thực tập & Báo cáo doanh nghiệp Viettel An Giang
├── docker-compose.yml        # PostgreSQL 16 (pgvector), Redis 7, MinIO, Backend, Frontend (< 2.0 GB RAM)
├── .env.example              # Mẫu cấu hình biến môi trường
└── README.md                 # Tài liệu hướng dẫn tổng quan dự án
```

---

## 5. Hướng Dẫn Khởi Chạy Nhanh (Quickstart)

Hệ thống hỗ trợ 2 chế độ khởi chạy: **Đóng gói Docker Toàn diện (Production All-in-One)** hoặc **Phát triển Cục bộ (Local Development)**.

### Cách 1: Đóng gói Toàn diện Docker Compose (Khuyến nghị cho Trình diễn & Triển khai)
Khởi chạy toàn bộ cụm dịch vụ chỉ với **1 câu lệnh duy nhất**:
```bash
# 1. Tạo file cấu hình từ template
cp .env.example .env

# 2. Xây dựng và khởi động toàn bộ hệ thống
docker compose up --build -d

# 3. Kiểm tra trạng thái sức khỏe các container
docker compose ps
```

#### Danh mục Đường dẫn Giao diện (Routes) theo Phân quyền:
* 📍 **Cổng Chọn Địa Bàn (96 Xã/Phường/Đặc khu An Giang):** `http://localhost:3000/onboarding`
* 🌐 **Cổng Dịch Vụ Công Dân (Hỏi đáp AI 40 TTHC):** `http://localhost:3000/citizen`
* 📝 **Tiền Kiểm Định 4 Nhóm Tờ Khai & Báo Sự Cố (GPS 25m):** `http://localhost:3000/citizen/form`
* 🛡️ **Bàn Điều Hành Tập Trung Cán Bộ Xã (1-Dashboard duy nhất):** `http://localhost:3000/officer/ward/AG-AP` *(hoặc mã xã/phường bất kỳ như `AG-CD` Phường Châu Đốc, `AG-LX` Phường Long Xuyên)*
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
# Chạy toàn bộ unit & integration tests tự động
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
* **Frontend Local URL:** `http://localhost:3000/citizen`

---

## 6. Phân Bổ Ngân Sách Tài Nguyên Zero-Cost ($\le 2,048\text{ MiB} = 2.0\text{ GiB}$ RAM)

| Phân hệ / Container | Hình ảnh Docker | Giới hạn Cứng (`mem_limit`) | Mức Tiêu Thụ Thực Tế | Vai trò nghiệp vụ |
| :--- | :--- | :---: | :---: | :--- |
| **smartward-postgres** | `pgvector/pgvector:pg16` | 448 MiB | ~110 MiB | Lưu trữ quan hệ ACID & Chỉ mục HNSW 768 chiều |
| **smartward-redis** | `redis:7-alpine` | 128 MiB | ~18 MiB | Bộ lọc GEO $R=25\text{m}$, Cache RAG & Single-Use Tokens |
| **smartward-minio** | `minio/minio:latest` | 256 MiB | ~65 MiB | Kho lưu trữ tài liệu scan mã hóa AES-256-GCM |
| **smartward-ai-sidecar** | `python:3.11-slim` | 384 MiB | ~210 MiB | FastAPI Local AI Sidecar (Embedding / Reranking) |
| **smartward-backend** | `eclipse-temurin:21-jre` | 768 MiB | ~380 MiB | Spring Boot 3.3, Java 21, JVM Heap `-Xmx512m` |
| **smartward-frontend**| `nginx:1.27-alpine` | 64 MiB | ~12 MiB | Nginx phục vụ PWA tĩnh & Reverse Proxy API |
| **TỔNG CỘNG (6 Active)** | **6 Container Thường Trực** | **2,048 MiB** | **~795 MiB** | **Chính xác $2,048\text{ MiB}$ ($= 2.0\text{ GiB}$); `minio-init` tự thoát sau 3s** |

---

## 7. Chế Độ Vận Hành Ngoại Tuyến (100% Offline Resilience)

Hệ thống được tích hợp sẵn lớp giả lập AI tất định `DeterministicMockAiClient` (`@Profile({"dev", "test"})`) và bộ cơ sở tri thức dự phòng ngay trên trình duyệt:
- **Sinh vector nhúng 768 chiều tất định:** Sinh vector chuẩn hóa $L_2$ dựa trên mã băm SHA-256 của câu hỏi mà không cần kết nối mạng hay khóa API Google.
- **Nhận diện OCR & Tiền kiểm định 4 nhóm tờ khai:** Phản hồi đầy đủ các trường biểu mẫu (`CT01`, `TK-KS`, `TK-KH`, `TK-BTXH`) để phục vụ demo mọi lúc mọi nơi ngay cả khi phòng hội đồng bảo vệ bị mất mạng Internet.
- **Dễ dàng chuyển đổi Production:** Chỉ cần đặt biến môi trường `SPRING_PROFILES_ACTIVE=prod` và cung cấp `GEMINI_API_KEY`, hệ thống sẽ tự động kích hoạt `GeminiAiClient` kết nối Google Generative Language API (Gemini 2.5 Flash & text-embedding-004).

---

## 8. Bản Đồ Tài Liệu Chi Tiết (Documentation Map)

> 💡 **Khuyến nghị:** Mở **[`docs/README.md`](docs/README.md)** để xem Bản đồ tài liệu toàn diện kèm chỉ mục tra cứu nhanh theo mục đích.

| Nhóm Tài liệu | Đường dẫn chi tiết | Nội dung & Mục đích ứng dụng |
| :--- | :--- | :--- |
| **Trung tâm Điều hướng** | [`docs/README.md`](docs/README.md) | Bản đồ tra cứu nhanh toàn bộ tài liệu dự án. |
| **Đặc tả Kỹ thuật API/DB** | [`docs/architecture/SYSTEM_SPECIFICATION.md`](docs/architecture/SYSTEM_SPECIFICATION.md) | Đặc tả REST APIs, cấu trúc 4 tờ khai, GPS 25m & CSDL. |
| **Kiến trúc & Luồng Dữ liệu** | [`docs/architecture/ARCHITECTURE_AND_FLOWS.md`](docs/architecture/ARCHITECTURE_AND_FLOWS.md) | Sơ đồ tuần tự (Sequence Diagram), luồng RAG, Triage 2 pha, Vault. |
| **Ràng buộc Phần cứng** | [`docs/architecture/PROJECT_CONSTRAINTS.md`](docs/architecture/PROJECT_CONSTRAINTS.md) | Quy định trần RAM ≤ 2.0GB, Zero-Cost 0 VNĐ, bảo vệ dữ liệu cá nhân. |
| **Tài liệu Kiểm thử E2E** | [`docs/testing/TEST_READY.md`](docs/testing/TEST_READY.md) | Hướng dẫn chạy bộ kiểm thử tự động Backend, Frontend & Benchmark. |
| **Lộ trình Mở rộng 2.0** | [`docs/roadmap/EXPANSION_ROADMAP_2.0.md`](docs/roadmap/EXPANSION_ROADMAP_2.0.md) | Kế hoạch mở rộng Multi-Ward 96 xã/phường, Quét QR CCCD, Bi-Encoder. |
| **Báo cáo Tiến độ Tuần** | [`docs/weekly-reports/`](docs/weekly-reports/) | Nhật ký 11 tuần thực tập và báo cáo học kỳ doanh nghiệp tại Viettel An Giang. |
| **Quy chuẩn Git** | [`docs/architecture/GIT_WORKFLOW.md`](docs/architecture/GIT_WORKFLOW.md) | Quy chuẩn Conventional Commits, phân nhánh và đóng gói release. |
