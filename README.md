# SmartWard AI: Nền Tảng Hỗ Trợ Thủ Tục Hành Chính & Phân Luồng Phản Ánh Cấp Phường/Xã

> **Đề tài:** Báo cáo Thực tập Doanh nghiệp & Đồ án Tốt nghiệp Kỹ sư CNTT – Viện Đào tạo Chất lượng cao, Trường ĐH Giao thông vận tải TP.HCM (UTH)  
> **Sinh viên thực hiện:** Trịnh Tuấn Khánh (MSSV: 089205023490 - Lớp: CN2301CLCB)  
> **Giáo viên hướng dẫn:** TS. Lê Văn Quốc Anh (UTH)  
> **Đơn vị tiếp nhận thực tập:** Viettel An Giang – Chi nhánh Tập đoàn Công nghiệp – Viễn thông Quân đội  
> **Mô hình kiến trúc:** Modular Monolith (Spring Boot 3.3.5 + Java 21) & Web Responsive / PWA (React 18 + Vite)  
> **Ràng buộc hạ tầng:** Zero-Cost Architecture (Toàn bộ Docker Stack $\le 2048\text{ MiB}$ RAM, 0 VNĐ chi phí vận hành)

---

## 1. Tóm Tắt Nhanh Dự Án (Executive Summary)

**SmartWard AI** giải quyết 2 bài toán nhức nhối trong xử lý thông tin tại Bộ phận Tiếp nhận và Trả kết quả (Bộ phận Một cửa) và quản lý trật tự đô thị tại **96 Xã, Phường và Đặc khu thuộc tỉnh An Giang**:
1. **Sai sót hồ sơ hành chính:** Người dân thường khai sai cấu trúc 12 số CCCD, mâu thuẫn ngày tháng trên Giấy chứng sinh, chưa đủ tuổi kết hôn theo Luật HN&GĐ hoặc ghi mục đích xác nhận độc thân chung chung dẫn đến hồ sơ bị trả về bổ sung nhiều lần.
2. **Quá tải, trùng lặp & lệch địa bàn phản ánh dân sinh:** Nhiều người dân cùng phản ánh một sự cố hiện trường (hư đường, ngập nước, cháy đèn đường) hoặc đi ngang qua xã/phường khác gặp sự cố nhưng không biết gửi về đâu, GPS lệch trong hẻm hoặc thiếu số điện thoại liên hệ xác minh.

### 4 Module Nghiệp Vụ Cốt Lõi:
* **Module 1 – Legal RAG & Abstention Guardrail:** Tư vấn pháp lý chuẩn xác dựa trên **40 thủ tục hành chính (TTHC)** cấp xã chuẩn hóa theo quy định mới nhất 2026 của UBND tỉnh An Giang. Nếu điểm tương đồng cosine cao nhất $S_{\max} < \theta$ ($\theta = 0.78$), hệ thống **bắt buộc từ chối sinh chữ tự do** để triệt tiêu hoàn toàn ảo giác pháp lý.
* **Module 2 – Multi-Form Deterministic Validation Engine (4 Nhóm Tờ Khai Trọng Tâm):** Kết hợp Multimodal Vision OCR, quét mã QR mặt trước CCCD và **Động cơ quy tắc tất định (Java + TypeScript Rule Engine)** kiểm tra 4 nhóm biểu mẫu cốt lõi:
  1. **`CT01` (Tờ khai thay đổi thông tin cư trú - TT 116/2026/TT-BCA):** Kiểm tra cấu trúc 12 số CCCD người kê khai và chủ hộ, tuổi chủ hộ $\ge 18$, cờ xác nhận qua VNeID (`vneidHostConfirmed`), và cơ chế miễn nộp lại giấy tờ đã số hóa (`VERIFIED_VIA_VNEID_QR` theo NĐ 309/2026/NĐ-CP).
  2. **`TK-KS` (Tờ khai Đăng ký khai sinh - Thông tư 04/2020/TT-BTP):** Đối chiếu chéo (Cross-check) Tờ khai với **Giấy chứng sinh** và quy tắc pháp lý khi cha mẹ chưa đăng ký kết hôn.
  3. **`TK-KH` (Tờ khai Đăng ký kết hôn & Xác nhận tình trạng hôn nhân):** Kiểm tra độ tuổi kết hôn hợp pháp tính chính xác đến từng ngày (Nam $\ge 20$ tuổi, Nữ $\ge 18$ tuổi) và chặn các mục đích xác nhận độc thân mơ hồ.
  4. **`TK-BTXH` (Tờ khai Trợ cấp Bảo trợ xã hội - Mẫu 01 NĐ 20/2021/NĐ-CP & NĐ 335/2026/NĐ-CP):** Kiểm tra điều kiện người cao tuổi / khuyết tật nặng và tài khoản chi trả không dùng tiền mặt Đề án 06.
* **Module 3 – High-Precision 25m GPS, Auto-Mapping & Cross-Ward Triage:**
  - **Quét GPS chính xác cao ($R = 25\text{m}$) & Tự động điền ô vị trí/nội dung:** Tự động bắt GPS hiện trường, hỗ trợ chỉnh sửa tay và bắt buộc SĐT liên hệ khẩn cấp (`reporterPhone`).
  - **Định tuyến liên xã/phường tự động (`Cross-Ward Jurisdiction Routing`):** Dựa trên địa chỉ để gửi báo cáo về đúng UBND Xã/Phường nơi xảy ra sự cố.
  - **Gom cụm 2 pha (Spatial-Semantic):** Pha 1 lọc bán kính địa lý $R = 25\text{m}$ bằng Redis GEO (`GEOSEARCH`); Pha 2 lọc danh mục nghiệp vụ và so khớp vector ngữ nghĩa $\tau = 0.82$ bằng pgvector cosine.
* **Module 4 – Zero-Trust Document Vault & 1-Dashboard Officer Workspace:**
  - **Phân quyền giao diện nghiêm ngặt (Role-Based Partitioning):** Cổng Công dân và Bàn Cán bộ tách biệt hoàn toàn (`/officer/ward/:wardCode`). Che mờ số CCCD dạng `********1234` bảo vệ quyền riêng tư theo Nghị định 13/2023/NĐ-CP.
  - **Bảo vệ dữ liệu cá nhân:** Tự động đóng dấu mờ chéo (Dynamic Watermark), chống Pixel Flood OOM (tối đa 4096px, 16M pixels), mã hóa AES-256-GCM trước khi lưu MinIO, băm SHA-256 mã token trong DB và cấp link xem 1 lần duy nhất qua One-Time Token tự hủy trên Redis (`GETDEL`).

---

## 2. Kiến Trúc Hệ Thống (Modular Monolith)

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
              │ + pgvector (448MB)  │ │ (128MB)      │ │ (256MB)       │ │ Gemini / Mock   │
              │ - Relational Tables │ │ - GEO R=25m  │ │ - AES-256-GCM │ │ - Embedding 768 │
              │ - HNSW Vector Index │ │ - 1-Time Tok │ │ - 7-day ILM   │ │ - Vision OCR    │
              └─────────────────────┘ └──────────────┘ └───────────────┘ └─────────────────┘
```

---

## 3. Hướng Dẫn Khởi Chạy Nhanh (Quickstart)

### Cách 1: Đóng gói Toàn diện Docker Compose (Khuyến nghị triển khai Production/Demo)
```bash
# 1. Tạo file cấu hình từ template
cp .env.example .env

# 2. Xây dựng và khởi động toàn bộ cụm dịch vụ
docker compose up --build -d

# 3. Kiểm tra trạng thái sức khỏe các container
docker compose ps
```

#### Danh mục Đường dẫn Giao diện (Routes) theo Phân quyền:
* 📍 **Cổng Chọn Địa Bàn (96 Xã/Phường An Giang):** `http://localhost:3000/onboarding`
* 🌐 **Cổng Dịch Vụ Công Dân (Hỏi đáp AI 40 TTHC):** `http://localhost:3000/citizen`
* 📝 **Tiền Kiểm Định Tờ Khai & Báo Sự Cố (GPS 25m):** `http://localhost:3000/citizen/form`
* 🛡️ **Bàn Điều Hành Cán Bộ Xã:** `http://localhost:3000/officer/ward/AG_P_LONGXUYEN`
* 📑 **API Documentation (Swagger UI):** `http://localhost:8080/swagger-ui.html`
* 💓 **Endpoint Kiểm tra Sức khỏe:** `http://localhost:8080/api/v1/health`

### Cách 2: Chạy Từng Phân Hệ ở Môi Trường Cục Bộ (Local Development)
```bash
# Bước 1: Khởi động hạ tầng CSDL
docker compose up -d postgres redis minio minio-init

# Bước 2: Khởi động Backend Spring Boot (Java 21)
cd backend
./mvnw clean test           # Chạy toàn bộ 420 unit & integration tests
./mvnw spring-boot:run      # Profile dev (offline mock AI tự động)

# Bước 3: Khởi động Frontend Vite Dev Server
cd frontend
npm install
npm run dev                 # Truy cập http://localhost:3000
```

---

## 4. Ngân Sách Tài Nguyên Zero-Cost ($\le 2048\text{ MiB}$ RAM)

| Phân hệ / Container | Image / Dockerfile | Giới hạn Cứng (`mem_limit`) | Vai trò nghiệp vụ |
| :--- | :--- | :---: | :--- |
| **`smartward-postgres`** | `pgvector/pgvector:pg16` | **448 MiB** | CSDL quan hệ ACID (Flyway V1–V5) & Chỉ mục HNSW 768 chiều |
| **`smartward-redis`** | `redis:7-alpine` | **128 MiB** | Bộ lọc GEO $R=25\text{m}$, Cache đa địa phương & One-Time Token |
| **`smartward-minio`** | `minio/minio:latest` | **256 MiB** | Lưu trữ tài liệu scan mã hóa AES-256-GCM (tự hủy sau 7 ngày) |
| **`smartward-ai-sidecar`**| `./ml/sidecar/Dockerfile` | **384 MiB** | FastAPI Local AI Sidecar (PhoBERT ONNX INT8 + Lifespan) |
| **`smartward-backend`** | `./backend/Dockerfile` | **768 MiB** | Spring Boot 3.3.5 (Java 21, JVM Heap `-Xmx512m`) |
| **`smartward-frontend`**| `./frontend/Dockerfile` | **64 MiB** | Nginx Alpine phục vụ Web PWA tĩnh & Reverse Proxy API |
| **TỔNG CỘNG** | **6 Containers Thường Trực** | **`2048 MiB` (2.0 GiB)** | **Đạt 100% cam kết ngân sách RAM $\le 2.0\text{ GiB}$** |

---

## 5. Bản Đồ Tài Liệu Dự Án (Documentation Map)

> 💡 **Mọi tài liệu chi tiết đã được quy hoạch vào thư mục [`docs/`](docs/README.md) theo chuẩn cấu trúc dự án chuyên nghiệp:**

| Nhóm Tài liệu | Đường dẫn chi tiết | Nội dung & Mục đích tra cứu |
| :--- | :--- | :--- |
| **🗺️ Mục Lục Điều Hướng** | [`docs/README.md`](docs/README.md) | Bản đồ tra cứu toàn diện và chỉ mục nhanh toàn dự án. |
| **📋 Đặc Tả Toàn Diện Dự Án**| [`docs/project/PROJECT.md`](docs/project/PROJECT.md) | Bối cảnh, Yêu cầu gốc R1–R5, Bảng tính năng F1–F18 & Milestone M1–M4. |
| **⚙️ Đặc Tả Kỹ Thuật API/DB** | [`docs/architecture/SYSTEM_SPECIFICATION.md`](docs/architecture/SYSTEM_SPECIFICATION.md) | Đặc tả 10 REST APIs, cấu trúc Entity, HNSW, quy tắc Rule Engine. |
| **🔄 Kiến Trúc & Luồng Dữ Liệu**| [`docs/architecture/ARCHITECTURE_AND_FLOWS.md`](docs/architecture/ARCHITECTURE_AND_FLOWS.md) | Sơ đồ tuần tự (Sequence Diagram), luồng RAG, Triage 2 pha, Vault OTT. |
| **🔒 Ràng Buộc Hệ Thống** | [`docs/architecture/PROJECT_CONSTRAINTS.md`](docs/architecture/PROJECT_CONSTRAINTS.md) | Quy định trần RAM $\le 2048\text{MB}$, Zero-Cost 0 VNĐ, bảo vệ dữ liệu NĐ 13. |
| **🌿 Quy Trình Git Phân Nhánh** | [`docs/architecture/GIT_WORKFLOW.md`](docs/architecture/GIT_WORKFLOW.md) | Quy chuẩn Conventional Commits, phân nhánh `develop`/`feature`, release. |
| **🚀 Lộ Trình Triển Khai** | [`docs/roadmap/ROADMAP.md`](docs/roadmap/ROADMAP.md) | Bảng trạng thái M1–M4 (100% Hoàn thành) & Kế hoạch đưa lên Production. |
| **📱 Đặc Tả Ứng Dụng Mobile** | [`docs/mobile.md`](docs/mobile.md) | Kiến trúc React Native + Expo SDK 52, 6 màn hình chuyên biệt. |
| **🧪 Sẵn Sàng Kiểm Thử** | [`docs/testing/TEST_READY.md`](docs/testing/TEST_READY.md) | Báo cáo 420/420 Backend tests PASS, 44 Frontend acceptance tests PASS. |
| **🏢 Báo Cáo Doanh Nghiệp** | [`docs/reports/MENTOR_TECHNICAL_BRIEFING.md`](docs/reports/MENTOR_TECHNICAL_BRIEFING.md) | Báo cáo kỹ thuật dành cho Mentor Viettel An Giang và Giảng viên UTH. |
| **📝 Kế Hoạch 12 Tuần** | [`docs/TODO.md`](docs/TODO.md) | Sprint board và nhật ký công việc chi tiết qua 12 tuần thực hiện. |

---

## 6. Ghi Chú Cấu Hình Đám Mây (Cloud Deployment)
- Hệ thống hỗ trợ triển khai cấu hình tĩnh Frontend lên VNeID/Web Gateway hoặc Vercel thông qua tệp cấu hình chuẩn [`vercel.json`](vercel.json).
- Vận hành cụm máy chủ Backend/Database sử dụng tập lệnh tự động hóa [`deploy.sh`](deploy.sh) trên môi trường VPS Ubuntu/Linux hoặc cụm máy chủ Docker Compose nội bộ.
