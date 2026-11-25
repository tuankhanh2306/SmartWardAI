# SmartWard AI — Nền Tảng Hỗ Trợ Thủ Tục Hành Chính & Phân Luồng Phản Ánh Cấp Phường/Xã

> **Kiến trúc kỹ thuật:** Modular Monolith (`Spring Boot 3.3.5` + `Java 21`), Feature-Sliced Web PWA (`React 18` + `TypeScript` + `Vite 6`), Native Mobile App (`React Native 0.88.1` + `Expo SDK 58`) & AI Sidecar (`FastAPI` + `PhoBERT ONNX INT8`)  
> **Ràng buộc hạ tầng:** Zero-Cost Architecture (Toàn bộ 6 container Docker vận hành `<= 2048 MiB` RAM, chi phí bản quyền 0 VNĐ)  
> **Tình trạng kiểm chứng gần nhất (`develop`, 23/11/2026 — sau Pha A + Pha B):** `554` JUnit Tests (`553` PASS gồm Testcontainers `pgvector`/Redis + `1` skip pre-existing, `0` fail) • `11/11` Frontend Suites & Vite Build PASS • `77/77` Mobile Vitest PASS • `6/6` Docker Containers Healthy (`975.68 / 2048 MiB` idle, `1,075.60 / 2048 MiB` sau 10-worker AI stress, `0` OOM) • `sync-shared-catalogs --check` PASS

---

## 1. Giới Thiệu Hệ Thống (System Overview)

**SmartWard AI** là nền tảng hỗ trợ số hóa hành chính công cấp cơ sở (đóng vai trò lớp đệm tiền kiểm trước khi tiếp nhận), được thiết kế cho **Bộ phận Tiếp nhận và Trả kết quả (Bộ phận Một cửa)** và điều phối phản ánh hiện trường tại **96 đơn vị hành chính cấp xã tỉnh An Giang** (`14` Phường, `79` Xã, `3` Đặc khu) với **40 thủ tục hành chính (TTHC)** trọng tâm.

Hệ thống tập trung giải quyết **2 điểm nghẽn phổ biến** ở cấp xã/phường:
1. **Hồ sơ hành chính bị trả lại nhiều lần do sai sót kê khai:** Người dân dễ nhầm lẫn cấu trúc 12 số CCCD/ĐDCN, lệch dữ liệu giữa Tờ khai khai sinh và Giấy chứng sinh, chưa đủ tuổi kết hôn theo ngày sinh hoặc ghi mục đích xác nhận tình trạng hôn nhân chung chung.
2. **Quá tải, trùng lặp và lệch địa bàn khi tiếp nhận phản ánh dân sinh:** Nhiều người dân báo trùng cùng một sự cố làm dày hàng đợi cán bộ, hoặc đứng ở khu vực giáp ranh/địa bàn khác dẫn đến gửi nhầm về UBND không phụ trách.

### 4 Phân Hệ Nghiệp Vụ Cốt Lõi

* **Phân hệ 1 — Trợ lý Pháp lý AI RAG & Chốt chặn Tin cậy Hai Ngưỡng (`Legal RAG`):**
  * Tra cứu và trả lời **40 TTHC cấp xã** theo cấu trúc chuẩn hóa 5 mục (Cơ quan thực hiện, Thành phần hồ sơ, Trình tự thực hiện, Thời hạn & Lệ phí, Căn cứ pháp lý).
  * Áp dụng cơ chế ngưỡng tương đồng hai tầng ($\theta = 0.78$ và $\theta_{\text{lower}} = 0.42$) kết hợp lọc hiệu lực văn bản và hậu kiểm trích dẫn để **giảm thiểu rủi ro trả lời sai/ảo giác** (không tuyên bố triệt tiêu 100% ảo giác, do bộ dữ liệu thực tế vẫn cần cán bộ rà soát theo luồng Maker-Checker):
    * $S_{\max} \ge 0.78$: trả lời có trích dẫn.
    * $0.42 \le S_{\max} < 0.78$: từ chối trả lời tự do và đẩy vào hàng đợi thẩm định của cán bộ (`hitl_gray_zone_queue` lưu bền vững trên PostgreSQL).
    * $S_{\max} < 0.42$: từ chối an toàn (Safe Abstention).
* **Phân hệ 2 — Tiền kiểm Định Tờ khai, QR CCCD/OCR & Xuất Phôi A4 (`Multi-Form Precheck`):**
  * Kết hợp quét mã QR thẻ CCCD gắn chip, nhận diện quang học (`Tesseract.js WASM` + Vision OCR) và động cơ quy tắc tất định (`GoF Strategy Pattern`) trên 4 nhóm biểu mẫu chính:
    1. **`CT01` (Thay đổi thông tin cư trú — TT 66/2023/TT-BCA & sửa đổi bổ sung):** Kiểm tra 12 số ĐDCN, đồng bộ thông tin Chủ hộ và điều kiện độ tuổi chủ hộ $\ge 18$.
    2. **`TK-KS` (Đăng ký khai sinh — TT 04/2020/TT-BTP & TT 04/2024/TT-BTP):** Đối chiếu chéo thông tin với Giấy chứng sinh và gợi ý thủ tục ghép *Nhận cha, mẹ, con* khi cha mẹ chưa đăng ký kết hôn.
    3. **`TK-KH` (Đăng ký kết hôn & Xác nhận tình trạng hôn nhân — Luật HN&GĐ 2014):** Kiểm tra tuổi kết hôn hợp pháp theo từng ngày (Nam $\ge 20$, Nữ $\ge 18$), giấy tờ ly hôn/chứng tử và tính cụ thể của mục đích sử dụng.
    4. **`TK-BTXH` (Bảo trợ xã hội — NĐ 20/2021/NĐ-CP & Luật BHXH 2024):** Kiểm tra mốc tuổi hưởng trợ cấp ($\ge 75$ tuổi diện thường, $\ge 70$ tuổi hộ nghèo/cận nghèo), mức độ khuyết tật và thông tin tài khoản chi trả không dùng tiền mặt.
  * Giao diện Web tách lazy-load `A4DocumentModal` (`React.lazy` + `<React.Suspense>`) để giảm tải bundle khởi đầu, xuất tệp `.docx` / `.pdf` chuẩn Nghị định 30/2020/NĐ-CP.
  * **Nguyên tắc SLA trung thực:** Khi trường `admin_procedures.sla_working_days` là `NULL` (chưa xác minh pháp lý cho thủ tục đó), Backend lưu và trả `slaDeadline = NULL`; Web và Mobile hiển thị **`"Chưa xác định (chờ cán bộ Một cửa xác nhận)"`**, không tự suy diễn thời hạn mặc định.
* **Phân hệ 3 — Định vị Sự cố Hiện trường GIS ($R = 25\text{m}$), Gom cụm 2 Pha & Offline Idempotency:**
  * Định vị GPS hiện trường (Mobile/Web), đối soát ranh giới **96 xã/phường/đặc khu** (`Cross-Ward Jurisdiction Routing`), chặn tọa độ chưa xác nhận (`WARD_DEFAULT`).
  * Gom cụm 2 pha: **Pha 1** truy vấn ứng viên không gian trong bán kính $R = 25\text{m}$ trên `Redis GEO`, **Pha 2** chuẩn hóa 5 danh mục (`ROAD_DAMAGE`, `FLOODING`, `LIGHTING_ELECTRICAL`, `ENVIRONMENT`, `ORDER_SECURITY`) và so khớp Cosine ngữ nghĩa ($\tau \ge 0.82$).
  * **Bảo mật & Chống trùng lặp:** API công khai (`/api/v1/issues/clusters`) làm tròn tọa độ `%.3f` và ẩn địa chỉ chi tiết/sai số/nguồn; API cán bộ (`/api/v1/issues/officer/clusters`) chỉ trả chi tiết trong đúng địa bàn cán bộ (`SEC-09`). Đồng bộ hàng đợi offline từ Mobile (`offline_incident_queue`) gửi kèm `local_id` qua header `Idempotency-Key` (khử trùng 24 giờ trên Redis + fallback cache `<= 1000`).
* **Phân hệ 4 — Kho Tài liệu Zero-Trust Vault, Xác thực & Audit:**
  * Ảnh tài liệu nhạy cảm được kiểm tra chống tràn pixel (Anti-Pixel-Flood), đóng dấu mờ động (`Java2D Dynamic Watermark`), mã hóa **AES-256-GCM** trên MinIO và cấp One-Time Token (OTT) **chỉ tiêu thụ trên Redis sau khi đọc MinIO và giải mã thành công**, trả về `HTTP 410 GONE` từ lần mở thứ hai (hướng tới tuân thủ Luật Bảo vệ dữ liệu cá nhân `91/2025/QH15` và Nghị định `356/2025/NĐ-CP` hiệu lực từ `01/01/2026`, thay thế NĐ `13/2023/NĐ-CP`; lưu ý đây là định hướng đối chiếu theo văn bản thay thế mới, chưa đối soát từng điều khoản gốc).
  * Khóa đăng nhập cán bộ sai PIN trên Redis theo cặp `(badgeId, clientIp)` (tối đa 5 lần / 15 phút) để tránh kẻ xấu lợi dụng khóa DoS tài khoản quầy Một cửa; `audit_log` ghi IP thật qua `ClientIpResolver` (chỉ ghi thêm theo quy ước ứng dụng).

---

## 2. Lợi Ích Mang Lại (Key Benefits)

| Đối tượng | Giá trị thực tế |
| :--- | :--- |
| **Người dân** | Giảm tình trạng đi lại nhiều lần nhờ tiền kiểm sai sót trước khi nộp; hỗ trợ giọng nói/TTS tiếng Việt, cỡ chữ lớn, quét QR CCCD điền tự động, tải phôi A4 trống và lưu **Ví Phiếu hẹn QR Offline** trên Mobile không tốn phí SMS/Zalo. |
| **Cán bộ Một cửa & UBND xã** | Giảm thao tác nhập lại và kiểm tra thủ công; tự động gom các phản ánh trùng trong bán kính $25\text{m}$ và chuyển đúng xã; duyệt câu hỏi vùng xám HITL và quy trình cập nhật 40 TTHC theo chế độ **Maker-Checker** (chống tự duyệt). |
| **Đơn vị Vận hành** | Đóng gói gọn trong **6 container Docker $\le 2048\text{ MiB}$ RAM**, không phụ thuộc phần mềm trả phí, có fallback khi offline hoặc không dùng Gemini API (`mock-offline-mode`), kèm script đồng bộ danh mục từ một nguồn sự thật duy nhất (SSOT). |

---

## 3. Kiến Trúc & Cấu Trúc Dự Án

```text
SmartWardAI/
├── backend/                        # Spring Boot 3.3.5 (Java 21) — Modular Monolith
│   └── src/main/
│       ├── java/vn/edu/uth/smartward/
│       │   ├── ai/                 # Gemini Client, AI Sidecar Client & Deterministic Fallback
│       │   ├── audit/              # Audit Trail (append-only theo quy ước ứng dụng)
│       │   ├── common/             # ExceptionHandler, RateLimiter, ClientIpResolver, ApiResponse
│       │   ├── config/             # WebMvc, CORS, OpenAPI, Security Filters
│       │   ├── dossier/            # Hồ sơ Một cửa, SLA nullable & cache giới hạn <= 1000
│       │   ├── evaluation/         # Bộ thí nghiệm thực nghiệm RAG/Triage
│       │   ├── formcheck/          # OCR Precheck & GoF Strategy cho CT01/TK-KS/TK-KH/TK-BTXH
│       │   ├── geo/                # Đối soát ranh giới GIS 96 xã/phường An Giang
│       │   ├── rag/                # Hybrid Search (BM25 + pgvector), HITL PostgreSQL & Governance
│       │   ├── security/           # JWT HMAC-SHA256, RBAC SEC-09, Redis lockout theo (badgeId, IP)
│       │   ├── triage/             # Gom cụm sự cố 2 pha (Redis GEO R=25m + Cosine) & Idempotency-Key
│       │   └── vault/              # Zero-Trust Vault (AES-256-GCM, Java2D Watermark, Redis OTT)
│       └── resources/
│           ├── db/migration/       # 11 Flyway SQL migrations (V1, V3, V4, V6, V7, V9–V14)
│           ├── db/seed/procedures/ # 40 tệp JSON chuẩn 40 TTHC (SSOT)
│           └── geo/wards.geo.json  # GeoJSON 96 đơn vị hành chính An Giang (SSOT)
├── frontend/                       # React 18 + TypeScript + Vite 6 + Tailwind CSS
│   ├── src/
│   │   ├── api/                    # client.ts & modules nghiệp vụ (api/modules/)
│   │   ├── components/             # UI dùng chung (A4DocumentModal lazy-loaded, CccdQrScannerModal...)
│   │   ├── context/                # WardContext (96 xã), RoleContext (Citizen / Officer / Admin)
│   │   ├── data/                   # anGiangWardsCatalog.ts & proceduresCatalog.ts (sinh từ SSOT)
│   │   ├── features/               # citizen-forms, civic-incident, dossier-tracking, officer-dashboard
│   │   ├── pages/                  # RoleGateway, CitizenPortal, FormAndIssueReporting, PerWardDashboard...
│   │   ├── services/               # Tesseract OCR WASM, Gemini Client, Intent Classifier
│   │   └── utils/                  # CCCD QR Parser, GIS Polygon Validator, DOCX/PDF Exporter
│   └── scripts/                    # Bộ kiểm thử hồi quy (run_all_tests.mjs — 10 suites + Vite build)
├── mobile/                         # React Native 0.88.1 + Expo SDK 58 + TypeScript + Vitest
│   └── src/
│       ├── api/                    # Axios client (Idempotency-Key), offlineSyncManager.ts
│       ├── core/                   # 40 TTHC offline, angiangWardsCatalog.ts, formValidators, QR/PDF pass
│       ├── storage/                # SQLite offline (cached_procedures, wallet_qr_passes, offline_incident_queue)
│       ├── screens/                # Citizen, Dossier & QR Wallet, Incident Reporting, Officer Workspace
│       └── __tests__/              # 9 file Vitest (77 unit/integration tests)
├── ml/                             # AI Sidecar FastAPI (PhoBERT ONNX INT8 & Piper TTS) + training scripts
├── data/                           # Bản phản chiếu wards.geo.json (đồng bộ qua scripts/sync-shared-catalogs.mjs)
├── data-pipeline/                  # Pipeline thu thập & chuẩn hóa dữ liệu TTHC
├── evaluation/                     # Dữ liệu đánh giá & kịch bản kiểm thử
├── scripts/                        # start-smartward-demo.*, sync-shared-catalogs.mjs, backup/restore DB, docs check
├── docs/                           # Tài liệu thiết kế, đặc tả API, SYSTEM_OVERVIEW.md & báo cáo
└── docker-compose.yml              # Điều phối 6 container (tổng trần RAM 2048 MiB)
```

---

## 4. Hướng Dẫn Cài Đặt & Khởi Chạy (Installation & Setup)

### Yêu cầu môi trường
* **Chạy bằng Docker (Khuyên dùng):** Docker Desktop / Docker Engine $\ge 24.0$ và Docker Compose v2 (`>= 2 GiB` RAM khả dụng cho stack SmartWard).
* **Phát triển Local (không đóng gói Docker cho App):** JDK 21, Node.js $\ge 20$, Maven wrapper có sẵn trong `backend/` (`./mvnw` hoặc `.\mvnw.cmd`).
* **Mobile App:** Thiết bị cài ứng dụng **Expo Go** (Android/iOS cùng mạng Wi-Fi) hoặc trình duyệt Web (`expo start --web`).

---

### Bước 1 — Clone mã nguồn & Tạo cấu hình `.env`

```bash
git clone <repository-url> SmartWardAI
cd SmartWardAI
cp .env.example .env
```
*(Trên Windows PowerShell: `Copy-Item .env.example .env`)*

Kiểm tra các biến quan trọng trong `.env` (chi tiết xem thêm tại [`.env.example`](.env.example)):

| Biến môi trường | Giá trị mẫu / Yêu cầu | Ghi chú |
| :--- | :--- | :--- |
| `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`, `REDIS_PASSWORD` | Chuỗi mật khẩu tùy chọn (đổi khi chạy thật) | `POSTGRES_PASSWORD` & `MINIO_ROOT_PASSWORD` bắt buộc khai báo trong `.env`. `REDIS_PASSWORD` mặc định `smartward_redis_secret` nếu bỏ trống trong Compose. |
| `VAULT_ENCRYPTION_KEY`, `JWT_SECRET` | **Bắt buộc độ dài $\ge 32$ bytes (256-bit)** | Dùng cho mã hóa AES-256-GCM và ký JWT cán bộ. |
| `GEMINI_API_KEY` | Mặc định `mock-offline-mode` | Giữ `mock-offline-mode` để chạy hoàn toàn nội bộ không gửi dữ liệu ra Gemini. |
| `POSTGRES_PORT`, `REDIS_PORT`, `MINIO_PORT`, `MINIO_CONSOLE_PORT`, `SERVER_PORT` | Mặc định `5432`, `6379`, `9000`, `9001`, `8080` | Có thể đổi (ví dụ `6380`, `9005`, `8082`) nếu máy host đang chạy dự án Docker khác chiếm port mặc định. |
| `MINIO_IMAGE` | Tùy chọn (mặc định `minio/minio:latest`) | Xem mục **Khắc phục sự cố** bên dưới nếu máy mới không pull được tag cũ/mặc định của MinIO. |

---

### Cách 1: Khởi chạy Tự động 1-Click phục vụ Demo (Khuyên dùng)

Script tự kiểm tra khóa `.env`, build/khởi động Docker Compose và kiểm tra sức khỏe dịch vụ:

```powershell
# Windows PowerShell:
.\scripts\start-smartward-demo.ps1           # Khởi chạy toàn hệ thống
.\scripts\start-smartward-demo.ps1 -Rebuild  # Build lại image và khởi chạy
.\scripts\start-smartward-demo.ps1 -Status   # Xem trạng thái container & RAM thực tế
.\scripts\start-smartward-demo.ps1 -Stop     # Dừng toàn bộ 6 container
```

```bash
# Linux / macOS:
bash ./scripts/start-smartward-demo.sh
```

---

### Cách 2: Khởi chạy Thủ công bằng Docker Compose (6 Containers)

```bash
# 1. Dựng image và bật toàn bộ 6 dịch vụ dưới nền
docker compose up -d --build

# 2. Kiểm tra trạng thái healthy của 6 container
docker compose ps

# 3. Kiểm tra endpoint sức khỏe (thay 8080 bằng SERVER_PORT nếu bạn đổi trong .env)
curl http://127.0.0.1:8080/api/v1/health
curl -I http://127.0.0.1:3000/health

# 4. Kiểm tra mức RAM thực tế (giới hạn tổng <= 2048 MiB)
docker stats --no-stream smartward-postgres smartward-redis smartward-minio smartward-ai-sidecar smartward-backend smartward-frontend
```

* Giao diện Web PWA: `http://localhost:3000`
* API Backend & Swagger (khi profile cho phép): `http://localhost:8080` (hoặc cổng `SERVER_PORT` trong `.env`)
* MinIO Console: `http://localhost:9001` (hoặc `MINIO_CONSOLE_PORT` trong `.env`)

---

### Cách 3: Phát triển Cục bộ (Local Development — Backend + Web)

```bash
# 1. Chỉ bật 3 container hạ tầng dữ liệu
docker compose up -d postgres redis minio

# 2. Chạy Backend (Java 21, profile dev)
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
# (Windows PowerShell dùng: .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev")

# 3. Terminal mới — Cài thư viện & chạy Frontend Vite (http://localhost:5173 hoặc proxy cấu hình)
cd frontend
npm install
npm run dev
# (Trên Windows PowerShell nếu bị chặn npm.ps1 do ExecutionPolicy, thay npm bằng npm.cmd)
```

---

### Cách 4: Cài đặt & Chạy Ứng dụng Di động (`mobile/` — Expo SDK 58 / RN 0.88.1)

```bash
cd mobile
npm install --legacy-peer-deps

# Chạy Metro Bundler để quét QR bằng Expo Go trên điện thoại
npx expo start

# Hoặc chạy giả lập/xem nhanh trên trình duyệt / Android / iOS
npm run web        # npx expo start --web
npm run android    # npx expo start --android
npm run ios        # npx expo start --ios
```

> **Lưu ý khi dùng Mobile kết nối Backend trên máy tính:** Thiết bị thật cần trỏ địa chỉ API về IP LAN của máy chạy Backend thay vì `localhost`. Ở màn hình rớt mạng, hàng đợi sự cố lưu vào SQLite (`offline_incident_queue`) và đồng bộ tự động kèm `Idempotency-Key` khi có sóng trở lại.

---

### Khắc phục sự cố thường gặp (Troubleshooting)

1. **`minio` lỗi `pull access denied` / `unauthorized`:** Image `minio/minio` trên một số môi trường registry công cộng có thể hạn chế pull tag cũ. [docker-compose.yml](docker-compose.yml) đã cấu hình `pull_policy: if_not_present` với mặc định `minio/minio:latest`. Nếu chạy trên máy/CI hoàn toàn mới chưa có cache cục bộ, hãy đặt biến `MINIO_IMAGE` trong `.env` trỏ tới mirror hoặc S3-compatible image nội bộ truy cập được.
2. **Windows PowerShell chặn lệnh `npm` (`UnauthorizedAccess` với `npm.ps1`):** Chạy `npm.cmd` (ví dụ `npm.cmd run test:all`) thay cho `npm`.
3. **Trùng cổng Docker với dự án khác trên máy (`8080`, `6379`, `9000`):** Sửa `SERVER_PORT`, `REDIS_PORT`, `MINIO_PORT`, `MINIO_CONSOLE_PORT`, `POSTGRES_PORT` ngay trong `.env` mà không cần sửa code.
4. **Trình duyệt chặn GPS ngoài `localhost`:** `navigator.geolocation` yêu cầu ngữ cảnh an toàn (`https://` hoặc `http://localhost`). Khi triển khai cho người dân hoặc test qua IP LAN/tên miền, bắt buộc cấu hình Reverse Proxy (Nginx/Caddy) dùng TLS/HTTPS.

---

## 5. Hướng Dẫn Sử Dụng Theo Vai Trò (Usage Guide)

Mở `http://localhost:3000` sau khi khởi động Web:

### A. Dành cho Công dân (`/onboarding`, `/citizen`, `/citizen/form`)
1. **Chọn đơn vị hành chính (`/onboarding`):** Chọn 1 trong **96 Xã / Phường / Đặc khu** tỉnh An Giang và chọn vai trò **Người dân** (phiên làm việc công dân có bộ đếm cảnh báo hết phiên).
2. **Hỏi đáp Pháp lý AI RAG (`/citizen`):** Đặt câu hỏi tiếng Việt (hỗ trợ không dấu, gõ tắt, nhập giọng nói hoặc bấm đọc to TTS). Hệ thống trả lời 5 mục kèm căn cứ pháp lý; câu hỏi độ tin cậy thấp sẽ từ chối an toàn hoặc chuyển vào hàng đợi cán bộ duyệt (HITL).
3. **Kê khai, Tiền kiểm & Xuất Mẫu A4 (`/citizen/form#form`):** Chọn `CT01`, `TK-KS`, `TK-KH` hoặc `TK-BTXH`; dùng **Quét QR CCCD** / **OCR** để tự điền; xem và tải phôi A4 `.docx` / `.pdf` chuẩn NĐ 30/2020 qua modal; bấm kiểm tra & gửi sơ duyệt để nhận mã hồ sơ (`HS-YYYYMMDD-...`).
4. **Tra cứu Tiến độ Hồ sơ (`/citizen/form#tracking`):** Nhập Mã hồ sơ và **4 số cuối CCCD** để xem trạng thái, hạn SLA (hiển thị *"Chưa xác định (chờ cán bộ Một cửa xác nhận)"* nếu chưa có `sla_working_days`) và mã QR phiếu hẹn.
5. **Phản ánh Sự cố Hiện trường (`/citizen/form#incident`):** Định vị GPS hoặc kéo ghim bản đồ tới vị trí chính xác (tọa độ `WARD_DEFAULT` chưa xác nhận sẽ bị chặn), chọn 1 trong 5 danh mục sự cố để hệ thống tự định tuyến về đúng UBND phụ trách và gom cụm trong bán kính $25\text{m}$.

### B. Dành cho Cán bộ Một cửa & Quản trị viên (`/officer/ward/:wardCode`)
1. **Xác thực tài khoản công chức:**
   * **Môi trường `dev` / `test` (`DevTestOfficerSeeder`):** Tự động nạp các tài khoản mẫu gồm `CC-AG-8942` (Cán bộ Tư pháp - Hộ tịch, `AG_P_LONGXUYEN`), `CC-AG-1001` (`AG_P_LONGXUYEN`), `ADM-AG-0001` và `ADM-AG-0002` (`AG_PROVINCE`, role `ADMIN`). Mã PIN phát triển mặc định là `SmartWardDev2026!` (có thể đổi qua `smartward.dev-seed.pin`); nút đăng nhập nhanh trên giao diện **chỉ xuất hiện khi `import.meta.env.DEV === true`** và bị loại bỏ khỏi bản build production.
   * **Môi trường `prod`:** Không chạy `DevTestOfficerSeeder`; khởi tạo tài khoản quản trị ban đầu có kiểm soát qua `AdminBootstrapRunner` (`SMARTWARD_BOOTSTRAP_INIT=true`).
2. **Nghiệp vụ tại Bàn làm việc Cán bộ:**
   * **Sơ duyệt Hồ sơ & Zero-Trust Vault:** Mở xem bản chụp giấy tờ 1 lần (OTT tự hủy trên Redis **sau khi** giải mã & stream thành công, lần mở sau trả `HTTP 410 GONE`); duyệt cấp mã hẹn QR (`LH-...`) hoặc yêu cầu bổ sung.
   * **Duyệt Câu hỏi Vùng xám (HITL):** Thẩm định các câu hỏi từ bảng `hitl_gray_zone_queue`.
   * **Điều phối Cụm Sự cố (`SEC-09`):** Chỉ xem và cập nhật trạng thái (`OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`) cho các cụm thuộc đúng địa bàn được phân công; quản trị viên tỉnh xem qua cổng giám sát chỉ đọc.
   * **Quản trị Tri thức 40 TTHC (`Maker-Checker`):** Đề xuất chỉnh sửa (`DRAFT` $\rightarrow$ `PENDING_REVIEW`), xem Diff và phê duyệt (`APPROVE` chống tự duyệt).

---

## 6. Kiểm Thử, Đồng Bộ Catalog SSOT & Quy Trình Git

### Kiểm thử Toàn hệ thống
```bash
# 1. Backend JUnit 5 + Testcontainers (chạy cả RealDatabaseAndRedisBootSmokeTest nếu Docker đang bật)
cd backend
./mvnw test -B                              # Windows: .\mvnw.cmd test -B
./mvnw test -Dtest=RealDatabaseAndRedisBootSmokeTest -B

# 2. Web Frontend (10 regression suites với endpoints mock + tsc -b && vite build)
cd ../frontend
CI_FRONTEND_ONLY=true npm run test:all
# Windows PowerShell: $env:CI_FRONTEND_ONLY='true'; npm.cmd run test:all
npm run lint

# 3. Mobile App (TypeScript check + 9 Vitest test files / 77 tests)
cd ../mobile
npm run typecheck && npm test
```

### Đồng bộ Danh mục từ Một Nguồn Duy Nhất (SSOT) & Governance Tài liệu
Khi cập nhật danh mục hành chính (`backend/src/main/resources/geo/wards.geo.json`) hoặc dữ liệu TTHC (`backend/src/main/resources/db/seed/procedures/*.json`):
```bash
# Sinh lại dữ liệu cho data/, frontend/ và kiểm tra parity 40/40 với mobile/legalKnowledgeBase.ts
node scripts/sync-shared-catalogs.mjs

# Chế độ kiểm tra drift (exit code 1 nếu có sai lệch, phù hợp đưa vào CI)
node scripts/sync-shared-catalogs.mjs --check

# Kiểm tra kỷ luật tài liệu ở thư mục gốc (chỉ cho phép README.md và AGENTS.md)
powershell -ExecutionPolicy Bypass -File scripts/check-docs-governance.ps1
# (Linux/macOS: bash scripts/check-docs-governance.sh)
```

### Quy chuẩn Phân nhánh Git (Bắt buộc theo [`AGENTS.md`](AGENTS.md))
**Không commit hoặc phát triển trực tiếp lên nhánh `main`.**

| Nhánh | Mục đích | Tách từ | Hợp nhất (`--no-ff`) vào |
| :--- | :--- | :---: | :---: |
| `main` | Production (ổn định) | Khởi tạo | Chỉ nhận merge từ `develop` sau kiểm thử hoặc `hotfix/*` |
| `develop` | Nhánh tích hợp chính | `main` | `main` khi phát hành |
| `feature/*` | Tính năng mới | `develop` | `develop` |
| `bugfix/*` | Sửa lỗi thường | `develop` | `develop` |
| `hotfix/*` | Vá khẩn cấp Production | `main` | `main` **và** `develop` |

---

## 7. Ngân Sách Tài Nguyên Zero-Cost ($\le 2048\text{ MiB}$ RAM)

| Container | Image / Nguồn (`docker-compose.yml`) | Trần RAM (`mem_limit`) | RAM Idle đo thực tế (`23/11/2026`)* | Vai trò trong hệ thống |
| :--- | :--- | :---: | :---: | :--- |
| **`smartward-postgres`** | `pgvector/pgvector:pg16` | **320 MiB** | `28.23 MiB` (`8.82%`) | CSDL quan hệ ACID, Flyway migrations & HNSW Vector Index |
| **`smartward-redis`** | `redis:7.2.5-alpine` (`--appendonly yes`, `maxmemory 100mb`, `noeviction`) | **128 MiB** | `8.91 MiB` (`6.96%`) | Redis GEO $R=25\text{m}$, Rate Limit, Auth Lockout, Cache, Idempotency & OTT Vault |
| **`smartward-minio`** | `${MINIO_IMAGE:-minio/minio:latest}` (`pull_policy: if_not_present`) | **256 MiB** | `110.30 MiB` (`43.07%`) | Lưu trữ đối tượng mã hóa AES-256-GCM cho hồ sơ Vault |
| **`smartward-ai-sidecar`** | `./ml/sidecar/Dockerfile` | **512 MiB** | `444.80 MiB` (`86.88%`) | Dịch vụ AI cục bộ FastAPI (PhoBERT ONNX INT8 & Piper TTS) |
| **`smartward-backend`** | `./backend/Dockerfile` (`Xmx 512m`) | **768 MiB** | `367.90 MiB` (`47.91%`) | API Spring Boot 3.3.5 (Java 21) |
| **`smartward-frontend`** | `./frontend/Dockerfile` (Nginx Alpine) | **64 MiB** | `15.54 MiB` (`24.27%`) | Phân phối Web PWA tĩnh & Reverse Proxy |
| **TỔNG CỘNG** | **6 Containers** | **`2048 MiB` (2.0 GiB)** | **`975.68 MiB` (idle)** | *Sau stress 10-worker AI Sidecar đạt peak `1,075.60 / 2048 MiB` (`0` OOM / `0` Restart).* |

*\*Số liệu RAM idle/stress đo bằng `docker stats --no-stream` trên `bugfix/qa-phase-a-b-hardening` sau khi rebuild đầy đủ 6 container Docker.*

---

## 8. Bản Đồ Tài Liệu Chuyên Sâu (`docs/`)

Toàn bộ tài liệu kiến trúc, vận hành và báo cáo thực tế nằm trong thư mục [`docs/`](docs/README.md):

* **Tổng quan hệ thống trung thực & nhật ký rủi ro / kiểm thử mới nhất:** [`docs/project/SYSTEM_OVERVIEW.md`](docs/project/SYSTEM_OVERVIEW.md)
* **Mục lục điều hướng tài liệu:** [`docs/README.md`](docs/README.md)
* **Đặc tả yêu cầu & tính năng:** [`docs/project/PROJECT.md`](docs/project/PROJECT.md)
* **Đặc tả kỹ thuật REST API, CSDL & Rule Engine:** [`docs/architecture/SYSTEM_SPECIFICATION.md`](docs/architecture/SYSTEM_SPECIFICATION.md)
* **Sơ đồ kiến trúc & Luồng tuần tự:** [`docs/architecture/ARCHITECTURE_AND_FLOWS.md`](docs/architecture/ARCHITECTURE_AND_FLOWS.md)
* **Ràng buộc kỹ thuật & An toàn dữ liệu:** [`docs/architecture/PROJECT_CONSTRAINTS.md`](docs/architecture/PROJECT_CONSTRAINTS.md)
* **Quy chuẩn phân nhánh Git & Tiêu chuẩn bắt buộc:** [`AGENTS.md`](AGENTS.md) & [`docs/architecture/GIT_WORKFLOW.md`](docs/architecture/GIT_WORKFLOW.md)
* **Tài liệu kiểm thử & Báo cáo thực tập:** [`docs/testing/TEST_READY.md`](docs/testing/TEST_READY.md) & [`docs/reports/MENTOR_TECHNICAL_BRIEFING.md`](docs/reports/MENTOR_TECHNICAL_BRIEFING.md)
* **Kịch bản Demo & Bộ câu hỏi Bảo vệ:** [`docs/reports/KICH_BAN_DEMO_LIVE_BAO_VE.md`](docs/reports/KICH_BAN_DEMO_LIVE_BAO_VE.md) & [`docs/reports/BO_CAU_HOI_VA_BIEN_HO_BAO_VE_DO_AN.md`](docs/reports/BO_CAU_HOI_VA_BIEN_HO_BAO_VE_DO_AN.md)
* **Sprint Boards & Kế hoạch Mobile:** [`docs/TODO_SPRINT_BOARD.md`](docs/TODO_SPRINT_BOARD.md), [`docs/roadmap/MOBILE_TODO_SPRINT_BOARD.md`](docs/roadmap/MOBILE_TODO_SPRINT_BOARD.md), [`docs/roadmap/MOBILE_DEVELOPMENT_PLAN.md`](docs/roadmap/MOBILE_DEVELOPMENT_PLAN.md), [`docs/specs/MOBILE_APP_SPEC.md`](docs/specs/MOBILE_APP_SPEC.md)
