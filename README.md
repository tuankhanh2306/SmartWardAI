# SmartWard AI — Nền Tảng Hỗ Trợ Thủ Tục Hành Chính & Phân Luồng Phản Ánh Cấp Phường/Xã

> **Đề tài:** Báo cáo Thực tập Doanh nghiệp & Đồ án Tốt nghiệp Kỹ sư CNTT – Viện Đào tạo Chất lượng cao, Trường Đại học Giao thông Vận tải TP. Hồ Chí Minh (UTH)  
> **Sinh viên thực hiện:** Nguyễn Minh Tuấn Khanh (MSSV: `089205023490` • Lớp: `CN2301CLCB`)  
> **Giảng viên hướng dẫn:** TS. Lê Văn Quốc Anh (UTH)  
> **Đơn vị thực tập:** Viettel An Giang – Chi nhánh Tập đoàn Công nghiệp – Viễn thông Quân đội  
> **Kiến trúc kỹ thuật:** Modular Monolith (`Spring Boot 3.3.5` + `Java 21`) & Feature-Sliced Web PWA (`React 18` + `TypeScript` + `Vite 6`)  
> **Ràng buộc hạ tầng:** Zero-Cost Architecture (Toàn bộ 6 container Docker vận hành $\le 2048\text{ MiB}$ RAM, chi phí bản quyền 0 VNĐ)

---

## 1. Giới Thiệu Hệ Thống (System Overview)

**SmartWard AI** là nền tảng số hóa hành chính công cấp cơ sở, được thiết kế chuyên biệt cho **Bộ phận Tiếp nhận và Trả kết quả (Bộ phận Một cửa)** và công tác điều hành trật tự đô thị tại **96 Xã, Phường và Đặc khu thuộc tỉnh An Giang**.

Hệ thống giải quyết trực diện **2 điểm nghẽn lớn nhất** tại chính quyền cấp xã/phường hiện nay:
1. **Hồ sơ hành chính bị trả lại nhiều lần do lỗi kê khai:** Người dân thường lúng túng trước các biểu mẫu pháp lý, ghi sai cấu trúc 12 số CCCD, lệch thông tin giữa Tờ khai khai sinh và Giấy chứng sinh, chưa đủ tuổi kết hôn theo ngày sinh, hoặc ghi mục đích xác nhận tình trạng hôn nhân quá chung chung.
2. **Quá tải, trùng lặp và lệch địa bàn khi tiếp nhận phản ánh dân sinh:** Nhiều người dân cùng báo một sự cố (sạt lở, hư đường, ngập nước, mất điện chiếu sáng) làm ngập hàng đợi cán bộ, hoặc người dân đi ngang qua địa bàn xã khác gặp sự cố nhưng gửi nhầm về UBND nơi cư trú.

### 4 Phân Hệ Nghiệp Vụ Cốt Lõi
* **Phân hệ 1 — Trợ lý Pháp lý AI RAG & Chốt chặn Chống ảo giác (Legal RAG & Abstention Guardrail):**
  Tư vấn chính xác **40 thủ tục hành chính (TTHC)** cấp xã theo cấu trúc 5 mục chuẩn hóa (Cơ quan thực hiện, Thành phần hồ sơ, Trình tự, Thời hạn & Lệ phí, Căn cứ pháp lý). Áp dụng cơ chế ngưỡng tin cậy hai tầng ($\theta = 0.78$ và $\theta_{\text{lower}} = 0.42$): tự động trả lời khi độ tương đồng cao, chuyển vào hàng đợi cán bộ kiểm duyệt (**HITL Gray-Zone Queue**) khi nằm trong vùng xám, và từ chối an toàn khi câu hỏi nằm ngoài thẩm quyền cấp xã.
* **Phân hệ 2 — Tiền kiểm định Tờ khai Đa biểu mẫu & AI Thị giác (Multi-Form Precheck & Vision OCR):**
  Kết hợp quét mã QR thẻ CCCD gắn chip, nhận diện quang học (Tesseract.js WASM + Vision OCR) và **Động cơ quy tắc tất định (GoF Strategy Pattern)** để rà soát lỗi logic trên 4 nhóm tờ khai trọng tâm:
  1. **`CT01` (Thay đổi thông tin cư trú – TT 66/2023/TT-BCA & TT 116/2026/TT-BCA):** Gửi trực tiếp Công an cấp xã; kiểm tra 12 số ĐDCN, tự động đồng bộ thông tin khi người khai là Chủ hộ, kiểm tra tuổi chủ hộ $\ge 18$ và miễn bản sao giấy tờ khi đã xác thực qua VNeID/QR (NĐ 309/2026/NĐ-CP).
  2. **`TK-KS` (Đăng ký khai sinh – TT 04/2020/TT-BTP):** Đối chiếu chéo (Cross-check) từng trường với **Giấy chứng sinh bệnh viện** và tự động kích hoạt danh mục thủ tục ghép *Nhận cha, mẹ, con* nếu cha mẹ chưa đăng ký kết hôn.
  3. **`TK-KH` (Đăng ký kết hôn & Xác nhận tình trạng hôn nhân – Luật HN&GĐ 2014):** Kiểm tra độ tuổi kết hôn hợp pháp tính đến từng ngày (Nam $\ge 20$, Nữ $\ge 18$), kiểm tra quyết định ly hôn/giấy chứng tử và chặn các mục đích xác nhận độc thân mơ hồ.
  4. **`TK-BTXH` (Trợ cấp Bảo trợ xã hội – NĐ 20/2021/NĐ-CP & Luật BHXH 2024):** Kiểm tra mốc tuổi hưởng trợ cấp hưu trí xã hội ($\ge 75$ tuổi, hoặc $\ge 70$ tuổi với hộ nghèo/cận nghèo), mức độ khuyết tật và tài khoản nhận chi trả an sinh Đề án 06.
* **Phân hệ 3 — Định vị Sự cố Hiện trường GIS ($R = 25\text{m}$) & Gom cụm 2 Pha (Spatial-Semantic Triage):**
  Tự động định vị GPS hiện trường, định tuyến liên xã/phường (**Cross-Ward Jurisdiction Routing**) về đúng UBND nơi phát sinh sự cố dựa trên dữ liệu ranh giới GIS đã xác minh, và gom cụm các tin báo trùng điểm trong bán kính $R = 25\text{m}$ (Redis GEO) kết hợp độ tương đồng ngữ nghĩa $\tau \ge 0.82$.
* **Phân hệ 4 — Kho Tài liệu Mật Zero-Trust OTT Vault & Bàn Điều hành Cán bộ Tập trung:**
  Tài liệu nhạy cảm của công dân được kiểm tra chống tràn bộ nhớ ảnh (Anti-Pixel-Flood), đóng dấu mờ bảo mật (**Java2D Dynamic Watermark**), mã hóa **AES-256-GCM** trên MinIO và cấp mã xem **1 lần duy nhất (One-Time Token)** tự hủy nguyên tử qua lệnh Redis `GETDEL` (trả về `HTTP 410 GONE` ở lần mở thứ hai), tuân thủ nghiêm ngặt Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.

---

## 2. Lợi Ích Mang Lại (Key Benefits & Impact)

| Đối tượng thụ hưởng | Lợi ích thực tiễn mang lại |
| :--- | :--- |
| **👨‍👩‍👧‍👦 Người dân (Công dân 96 Xã/Phường)** | • **Không còn cảnh đi lại nhiều lần:** Biết ngay tờ khai sai ở mục nào trước khi bước chân đến UBND hoặc Công an xã.<br>• **Tiện lợi cho mọi lứa tuổi:** Hỗ trợ nhập liệu bằng giọng nói tiếng Việt, đọc to văn bản (TTS), phóng to chữ `A++`, quét mã QR CCCD điền tự động 100% các ô.<br>• **Đúng biểu mẫu nhà nước:** Xem trước bản mẫu đã điền ví dụ minh họa và tải về bản **mẫu trắng chuẩn A4 (`.docx` / `.pdf`)** để in ký.<br>• **Nhận lịch hẹn miễn phí:** Nhận **Phiếu hẹn điện tử có mã QR** qua Email hoàn toàn miễn phí (không tốn phí SMS/Zalo) và tra cứu tiến độ SLA mọi lúc. |
| **🏛️ Cán bộ Một cửa & UBND Cấp xã** | • **Giảm 70–80% áp lực kiểm tra thủ công:** Hồ sơ gửi lên đã qua chốt chặn độ nét ảnh (Laplacian Sharpness Gate) và kiểm tra logic tự động.<br>• **Chống quá tải tin báo sự cố:** Hàng chục tin báo trùng một ổ gà hay điểm ngập trong bán kính $25\text{m}$ được gom tự động thành **1 cụm sự cố duy nhất** trên bản đồ.<br>• **An toàn pháp lý & bảo mật:** Mọi thao tác duyệt hồ sơ, mở ảnh Vault hay cập nhật quy trình đều được ghi vết vào bảng `audit_log` bất biến (Immutable Audit Trail). |
| **💻 Đơn vị Vận hành & Chuyển đổi số** | • **Chi phí hạ tầng tối thiểu (Zero-Cost):** Toàn bộ 6 container chạy mượt mà trong gói **2.0 GB RAM**, triển khai được ngay trên máy chủ sẵn có tại địa phương.<br>• **Chịu lỗi cao (Resilient Fallback):** Khi đứt cáp hoặc hết hạn mức Gemini API, hệ thống tự động chuyển sang cơ chế trích xuất tất định và mô hình cục bộ mà không làm gián đoạn dịch vụ công. |

---

## 3. Kiến Trúc & Cấu Trúc Dự Án Chuẩn Hóa (Project Architecture)

```text
SmartWardAI/
├── backend/                        # Spring Boot 3.3.5 (Java 21) — Modular Monolith theo Domain
│   └── src/main/
│       ├── java/vn/edu/uth/smartward/
│       │   ├── ai/                 # Gemini AI Client, Sidecar Client & Deterministic Fallback
│       │   ├── audit/              # Immutable Audit Trail (ghi vết mọi tác vụ nhạy cảm)
│       │   ├── common/             # GlobalExceptionHandler, RateLimiter, QueryCache, ApiResponse
│       │   ├── config/             # Cấu hình WebMvc, CORS, OpenAPI, Security Interceptors
│       │   ├── dossier/            # Quản lý hồ sơ Một cửa, SLA & gói con dossier/dto/
│       │   ├── evaluation/         # Động cơ thực nghiệm khoa học trả lời RQ1, RQ2, RQ3
│       │   ├── formcheck/          # OCR Precheck & gói formcheck/strategy/ (GoF Strategy Pattern)
│       │   ├── geo/                # Kiểm chứng tọa độ GIS 96 xã/phường An Giang
│       │   ├── rag/                # Hybrid Search (BM25 + Vector), HITL Queue & Procedure Governance
│       │   ├── security/           # Xác thực JWT HMAC-SHA256, RBAC Cán bộ/Admin, Brute-force Lockout
│       │   ├── triage/             # Phân luồng sự cố 2 pha (Redis GEO R=25m + Semantic Clustering)
│       │   └── vault/              # Zero-Trust Vault (AES-256-GCM, Java2D Watermark, Redis GETDEL OTT)
│       └── resources/
│           └── db/
│               ├── migration/      # Flyway DDL Schema & Triggers (V1, V3, V4, V6, V7, V9, V10)
│               └── seed/           # Flyway Seed Data tách biệt (V2 160 chunks, V5 40 TTHC, V8 96 xã)
├── frontend/                       # React 18 + TypeScript + Vite 6 + Tailwind CSS
│   ├── src/
│   │   ├── api/                    # Barrel client.ts + 6 module miền nghiệp vụ trong api/modules/
│   │   ├── components/             # UI Components dùng chung (Navbar, A4DocumentModal, CccdQrScanner...)
│   │   ├── context/                # WardContext (96 xã), RoleContext (5-phút Citizen / Standing Officer)
│   │   ├── data/                   # Barrel a4FormTemplates.ts (data/templates/) & anGiangWards.ts (data/wards/)
│   │   ├── features/               # Feature-Sliced UI (citizen-forms, civic-incident, dossier-tracking, officer-dashboard)
│   │   ├── pages/                  # Các trang điều phối chính (Onboarding, CitizenPortal, FormAndIssue, Dashboard...)
│   │   ├── services/               # Tesseract OCR WASM, Gemini Client, Intent Classifier, Diacritics Restorer
│   │   └── utils/                  # CCCD QR Parser, GIS Polygon Validator, DOCX/PDF Generator
│   └── scripts/                    # Bộ 12 Suite Regression Guard (run_all_tests.mjs) & E2E Tests
├── ml/                             # PhoBERT ONNX INT8 Sidecar (FastAPI) & kịch bản huấn luyện
├── data-pipeline/                  # Pipeline thu thập, chuẩn hóa 40 TTHC & đồng bộ Single Source of Truth
├── evaluation/                     # Bộ dữ liệu kiểm định, kịch bản đối kháng & biểu đồ thực nghiệm
├── scripts/                        # Script sao lưu/phục hồi DB & kiểm tra Governance tài liệu
├── docs/                           # Toàn bộ tài liệu kiến trúc, đặc tả API, báo cáo tuần & Sprint Board
└── docker-compose.yml              # Cấu hình 6 container khống chế tổng RAM <= 2048 MiB
```

---

## 4. Hướng Dẫn Cài Đặt & Khởi Chạy (Installation & Quickstart)

### Yêu cầu môi trường
* **Chạy bằng Docker (Khuyên dùng):** Docker Desktop / Docker Engine $\ge 24.0$ và Docker Compose v2.
* **Chạy trực tiếp trên máy (Local Dev):** JDK 21, Node.js $\ge 20$, Maven (đã tích hợp sẵn wrapper `./mvnw`).

### Cách 1: Khởi chạy trọn gói bằng Docker Compose (1 lệnh duy nhất)
```bash
# 1. Tạo tệp biến môi trường từ mẫu chuẩn
cp .env.example .env

# 2. Khởi dựng và chạy toàn bộ 6 container dưới nền
docker compose up --build -d

# 3. Kiểm tra trạng thái hoạt động và mức tiêu thụ RAM (< 2048 MiB)
docker compose ps
docker stats --no-stream
```

### Cách 2: Khởi chạy Môi trường Phát triển Cục bộ (Local Development)
```bash
# Bước 1: Bật các container cơ sở dữ liệu nền (PostgreSQL + pgvector, Redis, MinIO)
docker compose up -d postgres redis minio minio-init

# Bước 2: Chạy Backend Spring Boot (Cổng 8080)
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Bước 3: Mở terminal mới và chạy Frontend Vite (Cổng 3000)
cd frontend
npm install
npm run dev
```

---

## 5. Hướng Dẫn Sử Dụng Chi Tiết Theo Vai Trò (Step-by-Step Usage Guide)

Sau khi khởi động hệ thống, mở trình duyệt tại **`http://localhost:3000`**:

### A. Dành cho Người dân (Cổng Dịch vụ Công dân — Phiên làm việc an toàn 5 phút)

1. **Bước 1 — Chọn địa bàn & Vai trò (`/onboarding`):**
   * Tại màn hình chào mừng, chọn **Xã / Phường / Đặc khu** nơi bạn đang sinh sống hoặc cần làm thủ tục (trong danh mục 96 đơn vị hành chính tỉnh An Giang), sau đó bấm **"Tôi là Người dân"**.
2. **Bước 2 — Hỏi đáp Thủ tục Hành chính với AI RAG (`/citizen`):**
   * Nhập câu hỏi tự nhiên (hỗ trợ cả tiếng Việt không dấu/viết tắt như *"lam khai sinh can gi"*, *"dk ket hon mat bao lau"*) hoặc bấm **biểu tượng Micro** để nói trực tiếp.
   * Hệ thống trả về hướng dẫn chuẩn 5 mục kèm trích dẫn điều khoản pháp lý và các nút gợi ý hỏi tiếp theo ngữ cảnh (*"còn lệ phí bao nhiêu?"*, *"nộp ở đâu?"*). Bấm nút **Đọc to** nếu cần nghe phát âm hoặc nút **`A++`** trên thanh công cụ để tăng cỡ chữ cho người lớn tuổi.
3. **Bước 3 — Xem mẫu, Tải mẫu A4 & Tiền kiểm định Tờ khai bằng AI (`/citizen/form#form`):**
   * Chọn 1 trong 4 nhóm biểu mẫu (`Mẫu CT01 Cư trú`, `TK-KS Khai sinh`, `TK-KH Kết hôn`, `TK-BTXH Bảo trợ xã hội`).
   * **Xem & Tải mẫu A4:** Bấm **"Xem & Tải Mẫu A4"**. Bản xem trước trên màn hình hiển thị dữ liệu ví dụ mẫu để bạn biết cách điền; khi bấm **"Tải Mẫu Word (.docx)"** hoặc **"Tải File PDF (.pdf)"**, hệ thống xuất ra **biểu mẫu trống 100%** đúng thể thức Nghị định 30/2020/NĐ-CP để bạn tự điền.
   * **Quét AI OCR / Mã QR CCCD:** Tải ảnh chụp tờ khai/tệp `.docx` lên hoặc bấm **"Quét Mã QR CCCD"**. AI sẽ kiểm tra độ sắc nét của ảnh, tự động trích xuất và điền đầy đủ 100% các ô thông tin ở Bước 2 (kèm huy hiệu xanh `[✓ Đã map đúng ...]`).
   * **Kiểm tra & Gửi sơ duyệt:** Nhập địa chỉ Email nhận kết quả và bấm **"Kiểm Tra & Gửi Sơ Duyệt Cán Bộ"**. Hệ thống đối soát toàn bộ quy tắc pháp lý và cấp **Mã số hồ sơ** (ví dụ: `HS-20261118-LONGXUYEN-0001`).
4. **Bước 4 — Tra cứu Tiến độ Hồ sơ & Nhận Phiếu hẹn QR (`/citizen/form#tracking`):**
   * Chuyển sang tab **"Tra Cứu Hồ Sơ"**, nhập **Mã số hồ sơ** và **4 số cuối CCCD** để xem trạng thái xử lý thời gian thực, thời hạn cam kết SLA và tải về **Phiếu hẹn điện tử có mã QR** ngay khi cán bộ phê duyệt.
5. **Bước 5 — Báo cáo Sự cố Hiện trường định vị GPS $R=25\text{m}$ (`/citizen/form#incident`):**
   * Chuyển sang tab **"Phản Ánh Sự Cố"**, bấm **"Lấy Lại Vị Trí GPS"** hoặc kéo ghim đỏ trên bản đồ tới đúng vị trí ổ gà/ngập nước.
   * Hệ thống tự động xác định đúng UBND xã/phường quản lý tọa độ đó (hoặc yêu cầu chọn tay nếu tọa độ thuộc vùng chưa xác minh GIS), chọn mức độ khẩn cấp và gửi báo cáo.

---

### B. Dành cho Cán bộ Một cửa & Quản trị viên (`/officer/ward/:wardCode`)

1. **Đăng nhập xác thực công chức:**
   * Từ màn hình `/onboarding` hoặc nút chuyển vai trò trên thanh điều hướng, chọn **"Cán bộ Ủy ban"** và đăng nhập bằng tài khoản công chức mẫu:
     * **Mã thẻ công chức (`Badge ID`):** `CC-AG-8942` (Cán bộ Tư pháp – Hộ tịch) hoặc `ADMIN-AG-0001` (Quản trị viên)
     * **Mã PIN bảo mật:** `2026`
2. **Sơ duyệt Hồ sơ Một cửa & Mở Kho Zero-Trust Vault (Tab `Sơ Duyệt Hồ Sơ`):**
   * Bấm vào một hồ sơ trong danh sách để mở **Ngăn thẩm định (Slide-over Drawer)** bên phải.
   * Xem kết quả tiền kiểm tra AI, bấm **"Mở Bản Chụp (1 Lần)"** để giải mã tài liệu từ MinIO kèm dấu mờ *`CHỈ DÙNG ĐỂ SƠ DUYỆT HỒ SƠ TẠI UBND`*. Ngay sau khi đóng, token tự hủy vĩnh viễn trên Redis (`HTTP 410 GONE`).
   * Bấm **"Duyệt Hợp Lệ & Gửi Email + Mã QR"** để cấp mã lịch hẹn tự động hoặc **"Yêu Cầu Bổ Sung"** kèm lý do cụ thể.
3. **Phê duyệt Câu hỏi Vùng xám (Tab `Duyệt Câu Hỏi AI - HITL`):**
   * Xem các câu hỏi của người dân có độ tin cậy nằm trong vùng xám $[0.42, 0.78)$, hiệu chỉnh câu trả lời gợi ý và bấm **"Phê Duyệt Hướng Dẫn"** để nạp vào bộ nhớ đệm phục vụ các lượt hỏi sau.
4. **Điều phối Cụm Sự cố & Bản đồ Điểm nóng (Tab `Sự Cố Dân Sinh` & `Bản Đồ GIS`):**
   * Theo dõi các cụm sự cố đã được gom tự động trong bán kính $25\text{m}$, bấm gọi trực tiếp SĐT người báo tin để xác minh và chuyển trạng thái từ *Chờ tiếp nhận* $\rightarrow$ *Đang xử lý* $\rightarrow$ *Đã khắc phục xong*.

---

## 6. Kiểm Thử Tự Động & Đảm Bảo Chất Lượng (Testing & Verification)

Hệ thống được bảo vệ bởi **12 bộ kiểm thử Regression Guard** ở Frontend và **hơn 420 bài kiểm thử đơn vị / đối kháng JUnit 5** ở Backend:

```bash
# 1. Chạy toàn bộ 12 bộ kiểm thử chấp nhận, đối kháng, build Vite & JUnit RAG (Khuyên dùng)
cd frontend
npm run test:all

# 2. Kiểm tra kiểu tĩnh TypeScript (0 lỗi)
npm run lint

# 3. Chạy toàn bộ bộ kiểm thử JUnit 5 & Adversarial Harness ở Backend
cd ../backend
./mvnw test -B

# 4. Kiểm tra quy chuẩn quản trị tài liệu thư mục gốc (Docs Governance Gate)
cd ..
powershell -ExecutionPolicy Bypass -File scripts/check-docs-governance.ps1
```

---

## 7. Ngân Sách Tài Nguyên Zero-Cost ($\le 2048\text{ MiB}$ RAM)

| Container | Image / Nguồn | Trần RAM (`mem_limit`) | Vai trò trong kiến trúc |
| :--- | :--- | :---: | :--- |
| **`smartward-postgres`** | `pgvector/pgvector:pg16` | **448 MiB** | CSDL quan hệ ACID (Flyway `db/migration` & `db/seed`) + HNSW Vector Index |
| **`smartward-redis`** | `redis:7-alpine` | **128 MiB** | Chỉ mục không gian GEO $R=25\text{m}$, Rate Limiter, Cache & One-Time Token (`GETDEL`) |
| **`smartward-minio`** | `minio/minio:latest` | **256 MiB** | Lưu trữ đối tượng mã hóa AES-256-GCM cho tài liệu công dân (vòng đời tự xóa 7 ngày) |
| **`smartward-ai-sidecar`** | `./ml/sidecar/Dockerfile` | **384 MiB** | Dịch vụ AI cục bộ FastAPI (PhoBERT ONNX INT8 lượng tử hóa) |
| **`smartward-backend`** | `./backend/Dockerfile` | **768 MiB** | Máy chủ ứng dụng Spring Boot 3.3.5 (Java 21, JVM Heap `-Xmx512m`) |
| **`smartward-frontend`** | `./frontend/Dockerfile` | **64 MiB** | Máy chủ Nginx Alpine phân phối giao diện tĩnh PWA & Reverse Proxy |
| **TỔNG CỘNG** | **6 Containers** | **`2048 MiB` (2.0 GiB)** | **Tuân thủ tuyệt đối ngân sách phần cứng $\le 2.0\text{ GiB}$ RAM** |

---

## 8. Bản Đồ Tài Liệu Chuyên Sâu (Documentation Map)

Toàn bộ tài liệu thiết kế, đặc tả kỹ thuật và báo cáo thực tập được quy hoạch chuẩn hóa trong thư mục [`docs/`](docs/README.md):

* 🗺️ **Mục lục điều hướng tài liệu:** [`docs/README.md`](docs/README.md)
* 📋 **Đặc tả toàn diện yêu cầu & tính năng (R1–R5, F1–F18):** [`docs/project/PROJECT.md`](docs/project/PROJECT.md)
* ⚙️ **Đặc tả kỹ thuật REST API, Lược đồ CSDL & Rule Engine:** [`docs/architecture/SYSTEM_SPECIFICATION.md`](docs/architecture/SYSTEM_SPECIFICATION.md)
* 🔄 **Sơ đồ kiến trúc & Luồng tuần tự (Sequence Diagrams):** [`docs/architecture/ARCHITECTURE_AND_FLOWS.md`](docs/architecture/ARCHITECTURE_AND_FLOWS.md)
* 🔒 **Ràng buộc kỹ thuật & Bảo vệ dữ liệu Nghị định 13/2023/NĐ-CP:** [`docs/architecture/PROJECT_CONSTRAINTS.md`](docs/architecture/PROJECT_CONSTRAINTS.md)
* 🌿 **Quy chuẩn phân nhánh Git & Quy tắc đóng góp:** [`AGENTS.md`](AGENTS.md) & [`docs/architecture/GIT_WORKFLOW.md`](docs/architecture/GIT_WORKFLOW.md)
* 🧪 **Báo cáo sẵn sàng kiểm thử (Test Readiness):** [`docs/testing/TEST_READY.md`](docs/testing/TEST_READY.md)
* 🏢 **Báo cáo kỹ thuật gửi Mentor Viettel An Giang & Giảng viên UTH:** [`docs/reports/MENTOR_TECHNICAL_BRIEFING.md`](docs/reports/MENTOR_TECHNICAL_BRIEFING.md)
* 📝 **Bảng theo dõi tiến độ Sprint Board:** [`docs/TODO_SPRINT_BOARD.md`](docs/TODO_SPRINT_BOARD.md)
