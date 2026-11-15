# Project: SmartWard AI — An Giang 2026 Security, Benchmarks & TTHC Hardening

> **Mục đích:** Tài liệu duy nhất đặc tả toàn diện dự án SmartWard AI: Bối cảnh, Yêu cầu gốc, Phạm vi triển khai, Bản đồ kiến trúc và Nhật ký tính năng.  
> Được gộp và chuẩn hóa từ `PROJECT.md`, `CONTEXT.md` và `ORIGINAL_REQUEST.md`.

---

## 1. Bối Cảnh & Mục Tiêu Dự Án (Context)

- **Đơn vị công tác:** Báo cáo Thực tập Doanh nghiệp & Đồ án Tốt nghiệp Kỹ sư CNTT — Viện Đào tạo Chất lượng cao, Trường ĐH Giao thông vận tải TP.HCM (UTH).
- **Đơn vị tiếp nhận thực tập:** Viettel An Giang — Chi nhánh Tập đoàn Công nghiệp – Viễn thông Quân đội.
- **Phạm vi địa bàn:** Hỗ trợ công tác hành chính công và tiếp nhận phản ánh hiện trường tại **96 Xã, Phường và Đặc khu thuộc tỉnh An Giang**.
- **Mô hình kiến trúc:** **Modular Monolith** (Spring Boot 3.3.5 / Java 21) + **React 18 / Vite / TailwindCSS PWA** + **Local AI Sidecar** (Python FastAPI, PhoBERT ONNX INT8).
- **Ràng buộc cốt lõi (Zero-Cost Architecture):** Tổng ngân sách RAM cho toàn bộ 6 container Docker $\le 2048\text{ MiB}$ (2.0 GiB), chi phí vận hành 0 VNĐ.

### Bảng tra cứu giá trị kỹ thuật cốt lõi (Magic Numbers):
| Tham số | Giá trị | Ý nghĩa nghiệp vụ |
| :--- | :---: | :--- |
| **Ngưỡng RAG trả lời** | $\theta = 0.78$ | Cosine similarity tối thiểu với chunk pháp lý để sinh câu trả lời. |
| **Ngưỡng RAG vùng xám** | $\theta_{\text{lower}} = 0.42$ | Đẩy vào hàng đợi `HITL Queue` cho cán bộ thẩm định nếu $\theta_{\text{lower}} \le S < \theta$. |
| **Ngưỡng gom cụm Triage** | $\tau = 0.82$ | Cosine similarity pha 2 để gộp sự cố đô thị cùng danh mục. |
| **Bán kính gom cụm GPS** | $R = 25\text{ m}$ / $72\text{ h}$ | Lọc không gian pha 1 bằng Redis `GEOSEARCH`. |
| **Kích thước vector** | $768$ chiều | Chuẩn nhúng văn bản tiếng Việt. |
| **Thuật toán mã hóa Vault** | `AES-256-GCM` | Mã hóa ảnh giấy tờ nhạy cảm trước khi lưu MinIO. |
| **Thời hạn Token OTT Vault**| Tự hủy nguyên tử (`GETDEL`) | Một lần duy nhất qua Redis OTT, lần 2 trả về HTTP 410. |
| **Thời hạn phiên Cán bộ** | $8\text{ giờ}$ | JWT TTL kèm cơ chế thu hồi (revocation) trên Redis. |
| **Trần RAM toàn bộ Stack** | $\le 2048\text{ MiB}$ | 6 containers: Postgres (448m), Redis (128m), MinIO (256m), Sidecar (384m), Backend (768m), Frontend (64m). |

---

## 2. Yêu Cầu Gốc & Đặc Tả Kỹ Thuật (Original Requirements R1–R5)

### R1. Ràng buộc kiến trúc & Quy trình phát triển
- Giữ nguyên kiến trúc Modular Monolith. Tuyệt đối không thêm Kafka, RabbitMQ, Elasticsearch.
- Quy trình Git: Tuyệt đối không commit trực tiếp lên `main`. Rẽ nhánh từ `develop`:
  - `bugfix/security-pii-and-vault-hardening`
  - `bugfix/honest-benchmarks-and-validators`
  - `feature/an-giang-2026-tthc-and-ct01-sync`
- Commit theo chuẩn Conventional Commits. Chạy `./mvnw test` và `npm run build` đạt 100% pass trước khi merge.

### R2. Gia cố bảo mật, Quyền riêng tư NĐ 13/2023 & Chống OOM
- **Che mờ CCCD:** Trả về `********1234` cho cán bộ trong `CitizenDossierService.mapToOfficerDto()`.
- **Khử PII khỏi Log:** Loại bỏ CCCD khỏi `CitizenDossierController.trackDossier()`; khử ID 9–12 số thành `***REDACTED_ID***` trong `RagController.sanitizeForLog()`.
- **Thu hồi JWT qua Redis:** Tiêm `StringRedisTemplate` vào `OfficerAuthService` lưu `smartward:auth:revoked:{jti}` theo TTL; đổi mã địa bàn mặc định sang `AG_P_LONGXUYEN`.
- **Chống Spoofing & CORS:** Bật `server.forward-headers-strategy: NATIVE`; đọc IP qua `request.getRemoteAddr()`; bỏ wildcard `*` trong `CorsConfig.java`.
- **Chống Pixel Flood OOM:** Đọc header ảnh trước khi decode (tối đa 4096px, 16M pixels) trong `ImageWatermarkService` và gọi `flush()`.
- **Băm Token Zero-Trust Vault:** Băm SHA-256 mã OTT trong DB; nhận diện magic bytes (%PDF, JPEG, PNG) trả đúng Content-Type.

### R3. Đánh giá Thực nghiệm Thật, Chuẩn hóa Validator & Tối ưu Hiệu năng
- **Thực nghiệm thật:** Triển khai thuật toán Two-Pass Bipartite Majority Alignment và kiểm tra phân tách ca biên thật trên 150 phản ánh dân sinh (`generated-reports.csv`) trong `ExperimentRunnerService`; đo thời gian thực `System.nanoTime()`, tính Recall@3, MRR động.
- **DateLogicValidator:** Chuyển sang `ResolverStyle.STRICT` (`dd/MM/uuuu`, `uuuu-MM-dd`), chặn năm sinh < 1900 (`INVALID_DATE_LOGIC`).
- **CccdValidator:** Gắn cờ cảnh báo `CANNOT_VERIFY_CCCD_YEAR_GENDER` khi chuỗi ngày sinh không đúng định dạng.
- **QueryCache đa địa phương:** Băm SHA-256 kết hợp giữa query, wardName và category.
- **Tối ưu hóa:** Bỏ truy vấn N+1 tại `ProcedureService`; tiền biên dịch regex trong `VietnameseTextNormalizer`; nâng cấp FastAPI `lifespan`.

### R4. Chuẩn hóa 40 TTHC tỉnh An Giang 2026 & Nâng cấp Rule Engine
- **Đồng bộ 40 TTHC An Giang:** Cập nhật 40 file seed JSON và `ground-truth.json` sang 100% thẩm quyền cấp xã tỉnh An Giang theo các văn bản 2026 (QĐ 408, NĐ 301, TT 116, NĐ 335, NĐ 49, NĐ 18/309; 0 vết tích Đà Nẵng).
- **Flyway Migration V5:** Tạo mới `V5__sync_an_giang_2026_procedures.sql` (bảo toàn 100% tính bất biến của `V1`..`V4`).
- **Rule Engine Mẫu CT01 (TT 116/2026/TT-BCA):** Kiểm tra CCCD và tuổi chủ hộ $\ge 18$; hỗ trợ cờ xác nhận qua VNeID `vneidHostConfirmed`.
- **Miễn nộp lại giấy tờ đã số hóa (NĐ 309/2026/NĐ-CP):** Tự động gắn nhãn `VERIFIED_VIA_VNEID_QR`.
- **Đồng bộ Frontend:** `legalKnowledgeBase.ts` khớp 100% với Backend và mô hình chính quyền 2 cấp tỉnh An Giang.

### R5. Lưu ý tương thích ngược cho Test & Flyway
- Endpoint xem tài liệu Vault chuẩn là `GET /api/v1/vault/view/{token}`.
- Nạp chồng constructor trong `OfficerAuthService` và `ExperimentRunnerService` để không làm gãy các unit test gọi trực tiếp `new ...()`.
- Giữ nguyên nội dung các migration `V1` đến `V4` để không lỗi checksum Flyway.

---

## 3. Bản Đồ File & Trách Nhiệm Module Cốt Lõi

```
e:\SmartWardAI\
├── backend/src/main/java/vn/edu/uth/smartward/
│   ├── ai/          → AiModelClient, GeminiAiClient (@Profile prod), DeterministicMockAiClient (@Profile dev|test)
│   ├── rag/         → RagController, RagQueryService (θ=0.78, θ_lower=0.42), LegalChunkingService
│   ├── formcheck/   → FormCheckController, FormPrecheckService, CccdValidator, DateLogicValidator
│   ├── triage/      → TriageController, TwoStageTriageService (R=25m, τ=0.82)
│   ├── vault/       → VaultController, ZeroTrustVaultService, ImageWatermarkService
│   ├── dossier/     → CitizenDossierController, CitizenDossierService (Masked CCCD)
│   ├── security/    → OfficerAuthService (Redis JWT Blacklist, AG_P_LONGXUYEN)
│   ├── evaluation/  → EvaluationController, ExperimentRunnerService (Two-Pass Bipartite Alignment)
│   ├── common/      → ApiResponse, GlobalExceptionHandler, RedisRateLimiter
│   └── config/      → CorsConfig, RedisConfig, MinioConfig, OpenApiConfig
├── backend/src/main/resources/
│   ├── db/migration/     → V1–V5 Flyway migrations (7 bảng vật lý + HNSW index)
│   └── db/seed/procedures/ → 40 file seed JSON chuẩn hóa An Giang 2026
├── frontend/src/
│   ├── pages/       → CitizenPortal, FormAndIssueReporting, PerWardDashboard, WardOnboarding
│   ├── components/  → Header, OfficerAuthModal, CccdQrScannerModal, OfficerGuard, A4DocumentModal
│   ├── api/         → client.ts (Axios base, toàn bộ kết nối backend)
│   ├── services/    → geminiClient, intentClassifier, legalKnowledgeBase (An Giang 2026)
│   └── utils/       → cccdQrParser.ts (chuỗi 7 trường BCA)
├── ml/sidecar/serve.py   → FastAPI, PhoBERT ONNX INT8, lifespan port 8000
└── docker-compose.yml    → 6 containers, tổng giới hạn cứng 2048 MiB RAM
```

---

## 4. Nhật Ký Tính Năng & Trạng Thái Hoàn Thành (Milestones)

| Milestone | Tên Milestone & Nhánh Git | Phạm vi tính năng | Trạng thái Nghiệm thu |
| :---: | :--- | :--- | :---: |
| **M1** | **Bảo mật, PII & Vault Hardening**<br>`bugfix/security-pii-and-vault-hardening` | Che mờ CCCD, khử PII khỏi log, Redis JWT revocation, chống OOM 4096px, băm SHA-256 OTT, magic bytes Vault | ✅ **MERGED develop**<br>(Commit `5a96ee0`) |
| **M2** | **Thực nghiệm thật & Validator STRICT**<br>`bugfix/honest-benchmarks-and-validators` | Two-Pass Bipartite Majority Alignment, đo thời gian thực, Date STRICT, CccdValidator, đa địa phương SHA-256, N+1 fix, lifespan | ✅ **MERGED develop**<br>(Commit `53738ea`) |
| **M3** | **40 TTHC An Giang 2026 & CT01 Sync**<br>`feature/an-giang-2026-tthc-and-ct01-sync` | 40 seed JSON An Giang 2026, Flyway V5, Rule Engine CT01 TT 116, miễn giấy tờ số hóa NĐ 309, sync Frontend | ✅ **MERGED develop**<br>(Commit `d1da674`) |
| **M4** | **Tích hợp Toàn diện & Post-Victory Audit** | 420/420 Backend tests PASS, Frontend build clean 0 errors, Forensic Audit chứng nhận | ✅ **VICTORY CONFIRMED**<br>(Commit `b6cdf25` & `cd02618`) |
