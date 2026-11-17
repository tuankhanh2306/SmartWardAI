# PROJECT SPECIFICATION: SMARTWARD AI (CIVIC GOVERNANCE & LEGAL RAG PLATFORM)

> **Cập nhật:** Tháng 11/2026 — Đã tích hợp đầy đủ các tiêu chuẩn Bảo mật NĐ 13/2023/NĐ-CP, Chống OOM, Benchmark Thực nghiệm Thật và Đồng bộ 40 TTHC tỉnh An Giang 2026.

---

## 1. System Overview & Architecture Constraints
`smartward-ai` is a modular full-stack web application designed for ward/commune-level e-government support across **96 administrative units (wards, communes, and special zones) of An Giang Province** and academic evaluation.

- **Strict Resource Constraints (Zero-Cost / Local Docker):**
  - Total Docker stack memory $\le 2.0\text{ GB}$ (2048 MiB) RAM across all 6 active containers.
  - NO Apache Kafka (uses Spring `@Async` and `ApplicationEventPublisher` for background tasks to avoid over-engineering).
  - PostgreSQL 16 with `pgvector` extension (`mem_limit: 448m`, HikariCP `maximum-pool-size: 10`).
  - Redis 7 (`mem_limit: 128m`, `maxmemory 100mb`, `volatile-lru`).
  - MinIO Object Storage (`mem_limit: 256m`, hard bucket quota `5GB` on bucket `smartward-vault`, auto-expire objects after `7 days`).
  - Python AI Sidecar (`mem_limit: 384m`, PhoBERT ONNX INT8 + FastAPI async lifespan).
  - Backend Spring Boot (`mem_limit: 768m`, `-XX:+UseSerialGC -XX:MaxRAMPercentage=70.0 -Xss512k`).
  - Frontend Nginx (`mem_limit: 64m`).

---

## 2. Tech Stack & Frontend Routing Partitioning
- **Backend:** Java 21, Spring Boot 3.3.x, Spring Data JPA, Spring Data Redis, Spring Validation, PostgreSQL Driver, `pgvector` support, MinIO Java SDK (`io.minio:minio:8.5.12`), Java2D (`Graphics2D` for dynamic diagonal image watermarking), OpenAPI/Swagger UI.
- **AI Integration:** REST Client configured for Gemini 2.5 Flash API (with automatic `DeterministicMockAiClient` offline fallback) for Text Embeddings (768 dims), Multimodal OCR extraction, and grounded 5-part legal answer generation.
- **Frontend (Role-Partitioned SPA/PWA):** Vite + React (TypeScript) + TailwindCSS + Leaflet (OpenStreetMap):
  - **Citizen Routes (`role = citizen`):**
    - `/onboarding`: 96 An Giang Wards/Communes/Special Zones selector & GPS auto-locator.
    - `/citizen`: Legal RAG Chatbot (40 administrative procedures, clean 5-part response, Vietnamese TTS voice reader, font scale `A / A+ / A++`).
    - `/citizen/form`: Multi-Form Precheck (4 core forms + CCCD QR scanner + VNeID QR exemption badge) & High-Precision `R = 25m` GPS Field Incident Reporting with cross-ward routing.
  - **Officer Route (`role = officer`, authenticated via `OfficerAuthModal`):**
    - `/officer/ward/:wardCode`: Single Unified Officer Command Dashboard (`PerWardDashboard`) featuring Progressive Disclosure (Slide-Over Drawers for Incident Triage & Zero-Trust Form Audit with `********1234` masked CCCD, plus on-demand Collapsible GIS Map).

---

## 3. Package Structure (`vn.edu.uth.smartward`)
- `config/`: `AsyncConfig`, `RedisConfig`, `MinioConfig`, `OpenApiConfig`, `CorsConfig` (no wildcard allowed origins, reads from configuration), `SecurityConfig` (native forward-headers-strategy).
- `common/`: `ApiResponse`, `GlobalExceptionHandler`, `BusinessException`, `ErrorCode`.
- `rag/` (**Module 1 — Legal RAG & Abstention Guardrail**):
  - `AdminProcedure`, `LegalChunk` entities.
  - `LegalChunkingService` (splits legal text by Article/Clause with metadata).
  - `RagQueryService`: Computes cosine similarity via `pgvector`, enforces abstention threshold $\theta = 0.78$ and gray-zone threshold $\theta_{lower} = 0.42$, sanitizes citizen IDs from logs (`***REDACTED_ID***`), verifies citations, and integrates multi-locality cache with SHA-256 keys.
  - `QueryCacheService`: Multi-locality caching combining normalized query text, ward code, and procedure category.
- `formcheck/` (**Module 2 — Multi-Form Deterministic Validation Engine**):
  - `FormSubmission` entity, `FormPrecheckRequest`, `FormPrecheckResponse`, `StructuredFormPrecheckRequest`, `StructuredFormPrecheckResponse`.
  - `DateLogicValidator`: `ResolverStyle.STRICT` date validation, rejecting invalid dates (e.g., Feb 31) and birth dates before 1900.
  - `CccdValidator`: Full 12-digit structure validation, emitting `CANNOT_VERIFY_CCCD_YEAR_GENDER` warning on unparseable birth dates.
  - `FormPrecheckService` & `DeterministicFormRuleEngine` supporting **4 Core Administrative Forms**:
    1. **`CT01` (Tờ khai thay đổi thông tin cư trú - TT 116/2026/TT-BCA):** 12-digit CCCD validation, date logic, household head consent verification, host CCCD validation (`hostCccdNumber`), host age check ($\ge 18$), and VNeID host confirmation support (`vneidHostConfirmed == true`).
    2. **`TK-KS` (Tờ khai Đăng ký khai sinh - Thông tư 04/2020/TT-BTP):** Cross-checks declaration fields against Hospital Birth Certificate (`Giấy chứng sinh`) and enforces paternity recognition rules when parents are unmarried.
    3. **`TK-KH` (Tờ khai Đăng ký kết hôn & Xác nhận tình trạng hôn nhân - Luật HN&GĐ 2014):** Exact day-level legal marriage age verification (Male $\ge 20$, Female $\ge 18$) and blocks vague marital status certificate purposes (`VAGUE_MARITAL_PURPOSE`).
    4. **`TK-BTXH` (Tờ khai Trợ cấp Bảo trợ xã hội - Mẫu 01 NĐ 20/2021/NĐ-CP & NĐ 335/2026/NĐ-CP):** Validates elderly age threshold ($\ge 80$ without pension, or $\ge 75$ under social pension rules) or severe disability certificate, plus mandatory bank account number for cashless social security payout under Project 06.
  - **Quy tắc Miễn nộp lại giấy tờ đã số hóa (NĐ 309/2026/NĐ-CP):** Tự động phát hiện QR CCCD hoặc xác thực VNeID để gắn nhãn `VERIFIED_VIA_VNEID_QR`, miễn yêu cầu nộp bản photo/chứng thực CCCD và giấy xác nhận cư trú CT07.
- `triage/` (**Module 3 — High-Precision 25m Spatial-Semantic Triage & Cross-Ward Routing**):
  - `IssueCluster`, `CivicReport` entities, `CivicReportRequest`, `CivicReportResponse`.
  - `TwoStageTriageService`:
    - **Stage 1 (Spatial Filter):** Redis `GEOSEARCH` within high-precision radius **`R = 25.0m`**.
    - **Stage 2 (Semantic & Category Match):** Unified categories (`ROAD_DAMAGE`, `FLOODING`, `ENVIRONMENT`, `LIGHTING_ELECTRICAL`, `ORDER_SECURITY`) + `pgvector` cosine similarity $\ge \tau$ ($\tau = 0.82$).
    - **Emergency Contact & Cross-Ward Jurisdiction Routing:** Captures mandatory citizen phone number (`reporterPhone`), editable location box (`addressText`), and routes reports to the target `wardCode` / `wardName` determined by the location box.
- `vault/` (**Module 4 — Zero-Trust Document Vault**):
  - `VaultDocument` entity.
  - `ImageWatermarkService`: Pixel flood OOM protection (checks image dimensions before decoding, max 4096px and 16M pixels, invokes native `flush()`), draws dynamic diagonal timestamp + officer/purpose watermark.
  - `ZeroTrustVaultService`: AES-256-GCM encryption, MinIO upload, stores SHA-256 digest of One-Time Token (OTT), Redis atomic `GETDEL` token verification.
  - `VaultController`: Streams decrypted document with magic bytes detection (`%PDF` $\rightarrow$ `application/pdf`, `\xFF\xD8\xFF` $\rightarrow$ `image/jpeg`, default `image/png`).
- `dossier/`:
  - `CitizenDossier` entity, `CitizenDossierController`, `CitizenDossierService`.
  - Sanitized logging (removes raw citizen CCCD from logs), masks CCCD as `********1234` in officer responses.
- `security/`:
  - `OfficerAuthService`: Manages officer authentication with default ward code `AG_P_LONGXUYEN`, stores revoked JWT IDs in Redis with remaining token TTL, fallback to local memory.
- `evaluation/` (**Academic Benchmark Runner**):
  - `EvaluationController` & `ExperimentRunnerService`:
    - Authentic live vector retrieval and cosine similarity evaluation against 80 ground-truth questions.
    - Two-Pass Bipartite Majority Alignment clustering evaluation on 150 civic reports (`generated-reports.csv`) with genuine boundary separation metrics (`COLOCATED_DIFFERENT_CATEGORY`, `SAME_CATEGORY_DISTANT_LOCATION`).

---

## 4. Core REST APIs
1. `POST /api/v1/rag/ask` — Input: `{ "question": "...", "threshold": 0.78 }`. Returns grounded 5-part legal answer, cited clauses, similarity score, abstention flag, and legal disclaimer. Log output is sanitized of citizen IDs.
2. `POST /api/v1/forms/precheck` — Validates citizen form data (`formType`: `CT01` | `TK-KS` | `TK-KH` | `TK-BTXH`). Returns deterministic field-by-field validation issues, pass/fail status, and `VERIFIED_VIA_VNEID_QR` exemption label.
3. `POST /api/v1/triage/reports` — Submits a field incident (`category`, `title`, `description`, `latitude`, `longitude`, `reporterPhone`, `addressText`, `wardCode`, `wardName`). Executes 2-stage Spatial-Semantic deduplication (`R = 25m`, $\tau = 0.82$) and routes to the target ward's dashboard.
4. `GET /api/v1/triage/clusters` — Returns active issue clusters for the Officer Dashboard & GIS Map.
5. `POST /api/v1/vault/upload` — Applies dynamic watermark to sensitive citizen document, checks pixel bounds (max 4096px), encrypts with AES-256-GCM, stores in MinIO, hashes token with SHA-256, and returns a one-time access token.
6. `GET /api/v1/vault/view/{token}` — Atomically consumes token in Redis (`GETDEL`), decrypts image/PDF from MinIO, detects magic bytes for Content-Type, and streams it once. Subsequent calls return `404/410`.
7. `POST /api/v1/evaluation/run-benchmarks` — Runs authentic academic evaluation suite on seed datasets with live execution measurements.
8. `POST /api/v1/officer/login` — Authenticates ward officer and returns JWT token.
9. `POST /api/v1/officer/logout` — Revokes current JWT on Redis until expiry.
10. `GET /api/v1/dossiers/officer/list` — Lists citizen dossiers with CCCDs safely masked as `********1234`.
