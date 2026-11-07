# PROJECT SPECIFICATION: SMARTWARD AI (CIVIC GOVERNANCE & LEGAL RAG PLATFORM)

## 1. System Overview & Architecture Constraints
`smartward-ai` is a modular full-stack web application designed for ward/commune-level e-government support across **96 administrative units (wards, communes, and special zones) of An Giang Province** and academic evaluation.

- **Strict Resource Constraints (Zero-Cost / Local Docker):**
  - Total Docker stack memory $\le 2.0\text{ GB}$ RAM.
  - NO Apache Kafka (uses Spring `@Async` and `ApplicationEventPublisher` for background tasks to avoid over-engineering).
  - PostgreSQL 16 with `pgvector` extension (`mem_limit: 512m`, HikariCP `maximum-pool-size: 10`).
  - Redis 7 (`mem_limit: 128m`, `maxmemory 100mb`, `volatile-lru`).
  - MinIO Object Storage (`mem_limit: 256m`, hard bucket quota `5GB` on bucket `smartward-vault`, auto-expire objects after `7 days`).

---

## 2. Tech Stack & Frontend Routing Partitioning
- **Backend:** Java 21, Spring Boot 3.3.x, Spring Data JPA, Spring Data Redis, Spring Validation, PostgreSQL Driver, `pgvector` support, MinIO Java SDK (`io.minio:minio:8.5.12`), Java2D (`Graphics2D` for dynamic diagonal image watermarking), OpenAPI/Swagger UI.
- **AI Integration:** REST Client configured for Gemini 2.5 Flash API (with automatic `DeterministicMockAiClient` offline fallback) for Text Embeddings (`text-embedding-004` / 768 dims), Multimodal OCR extraction, and grounded 5-part legal answer generation.
- **Frontend (Role-Partitioned SPA/PWA):** Vite + React (TypeScript) + TailwindCSS + Leaflet (OpenStreetMap):
  - **Citizen Routes (`role = citizen`):**
    - `/onboarding`: 96 An Giang Wards/Communes/Special Zones selector & GPS auto-locator.
    - `/citizen`: Legal RAG Chatbot (40 administrative procedures, clean 5-part response, Vietnamese TTS voice reader, font scale `A / A+ / A++`).
    - `/citizen/form`: Multi-Form Precheck (4 core forms + CCCD QR scanner) & High-Precision `R = 25m` GPS Field Incident Reporting with cross-ward routing.
  - **Officer Route (`role = officer`, authenticated via `OfficerAuthModal`):**
    - `/officer/ward/:wardCode`: Single Unified Officer Command Dashboard (`PerWardDashboard`) featuring Progressive Disclosure (Slide-Over Drawers for Incident Triage & Zero-Trust Form Audit, plus on-demand Collapsible GIS Map).

---

## 3. Package Structure (`vn.edu.uth.smartward`)
- `config/`: `AsyncConfig`, `RedisConfig`, `MinioConfig`, `OpenApiConfig`, `SecurityConfig`
- `common/`: `ApiResponse`, `GlobalExceptionHandler`, `BusinessException`, `ErrorCode`
- `rag/` (**Module 1 — Legal RAG & Abstention Guardrail**):
  - `AdminProcedure`, `LegalChunk` entities
  - `LegalChunkingService` (splits legal text by Article/Clause with metadata)
  - `RagQueryService` (computes cosine similarity via `pgvector`, enforces abstention threshold $\theta = 0.78$, verifies citations, strips conversational filler)
- `formcheck/` (**Module 2 — Multi-Form Deterministic Validation Engine**):
  - `FormSubmission` entity, `FormPrecheckRequest`, `FormPrecheckResponse`
  - `FormPrecheckService` & `DeterministicFormRuleEngine` supporting **4 Core Administrative Forms**:
    1. **`CT01` (Tờ khai thay đổi thông tin cư trú - Bộ Công an):** 12-digit CCCD structure validation (province code `001`–`096`, gender/century digit, birth year alignment), date logic (`birthDate < issueDate <= today`), household head consent (`hostName`, `hostCccd`, `relationshipToHost`).
    2. **`TK-KS` (Tờ khai Đăng ký khai sinh - Thông tư 04/2020/TT-BTP):** Cross-checks declaration fields against Hospital Birth Certificate (`Giấy chứng sinh`: `dateOfBirth == hospitalBirthDate`, `motherName == hospitalMotherName`) and enforces paternity recognition rules when parents are unmarried (`parentsMarried == "NO"`).
    3. **`TK-KH` (Tờ khai Đăng ký kết hôn & Xác nhận tình trạng hôn nhân - Luật HN&GĐ 2014):** Exact day-level legal marriage age verification (Male $\ge 20$, Female $\ge 18$) and blocks vague marital status certificate purposes (`VAGUE_MARITAL_PURPOSE`).
    4. **`TK-BTXH` (Tờ khai Trợ cấp Bảo trợ xã hội - Mẫu 01 NĐ 20/2021/NĐ-CP):** Validates elderly age threshold ($\ge 80$ without pension) or severe disability certificate, plus mandatory bank account number for cashless social security payout under Project 06.
- `triage/` (**Module 3 — High-Precision 25m Spatial-Semantic Triage & Cross-Ward Routing**):
  - `IssueCluster`, `CivicReport` entities, `CivicReportRequest`, `CivicReportResponse`
  - `TwoStageTriageService`:
    - **Stage 1 (Spatial Filter):** Redis `GEOSEARCH` within high-precision radius **`R = 25.0m`** (`smartward.triage.default-radius-meters: 25.0`).
    - **Stage 2 (Semantic & Category Match):** Category match + `pgvector` cosine similarity $\ge \tau$ ($\tau = 0.82$); merges into existing cluster or creates a new cluster.
    - **Emergency Contact & Cross-Ward Jurisdiction Routing:** Captures mandatory citizen phone number (`reporterPhone`), editable location box (`addressText`), and routes reports to the target `wardCode` / `wardName` determined by the location box (`resolveWardFromLocationBox`: `TEXT_BOX` priority first, then `GPS_COORDS` Haversine nearest ward).
- `vault/` (**Module 4 — Zero-Trust Document Vault**):
  - `VaultDocument` entity
  - `WatermarkService` (overlays diagonal timestamp + officer/purpose watermark onto CCCD/document images using `Graphics2D`)
  - `VaultService` (AES-256-GCM encryption, MinIO upload, Redis atomic `GETDEL` one-time token verification)
- `evaluation/` (**Academic Benchmark Runner**):
  - `EvaluationController` & `ExperimentRunnerService`: Endpoints to run automated benchmarks on test datasets and output JSON/CSV tables for RAG Recall@K, Abstention Accuracy, and Spatial-Semantic Deduplication Precision/Recall/F1.

---

## 4. Core REST APIs
1. `POST /api/v1/rag/ask` — Input: `{ "question": "...", "threshold": 0.78 }`. Returns grounded 5-part legal answer, cited clauses, similarity score, abstention flag, and legal disclaimer.
2. `POST /api/v1/forms/precheck` — Validates citizen form data (`formType`: `CT01` | `TK-KS` | `TK-KH` | `TK-BTXH`, personal/cross-check fields, or uploaded image). Returns deterministic field-by-field validation issues and pass/fail status.
3. `POST /api/v1/triage/reports` — Submits a field incident (`category`, `title`, `description`, `latitude`, `longitude`, `reporterPhone`, `addressText`, `wardCode`, `wardName`). Executes 2-stage Spatial-Semantic deduplication (`R = 25m`, $\tau = 0.82$) and routes to the target ward's dashboard.
4. `GET /api/v1/triage/clusters` — Returns active issue clusters for the Officer Dashboard & GIS Map.
5. `POST /api/v1/vault/upload` — Applies dynamic watermark to sensitive citizen document, encrypts with AES-256-GCM, stores in MinIO, and returns a one-time access token.
6. `GET /api/v1/vault/view/{token}` — Atomically consumes token in Redis (`GETDEL`), decrypts image from MinIO, and streams it once. Subsequent calls return `404/410`.
7. `POST /api/v1/evaluation/run` — Runs the academic evaluation suite on the seed datasets.
