# PROJECT SPECIFICATION: SMARTWARD AI (CIVIC GOVERNANCE & LEGAL RAG PLATFORM)

## 1. System Overview & Architecture Constraints
Build a clean, modular full-stack web application named `smartward-ai` designed for ward/commune-level e-government support and academic evaluation.
- **Strict Resource Constraints (Zero-Cost / Local Docker):**
  - Total Docker stack memory < 2.0 GB RAM.
  - NO Apache Kafka (use Spring `@Async` and `ApplicationEventPublisher` for background tasks to avoid over-engineering).
  - PostgreSQL 16 with `pgvector` extension (`mem_limit: 512m`, HikariCP `maximum-pool-size: 10`).
  - Redis 7 (`mem_limit: 128m`, `maxmemory 100mb`, `volatile-lru`).
  - MinIO Object Storage (`mem_limit: 256m`, hard bucket quota `5GB` on bucket `smartward-vault`, auto-expire objects after `7 days`).

## 2. Tech Stack
- **Backend:** Java 21, Spring Boot 3.3.x, Spring Data JPA, Spring Data Redis, Spring Validation, PostgreSQL Driver, `pgvector` support, MinIO Java SDK (`io.minio:minio:8.5.12`), Apache PDFBox / Java2D (for dynamic image watermarking), OpenAPI/Swagger UI.
- **AI Integration:** REST Client / Spring AI configured for Gemini 2.5 Flash API (or local Ollama fallback) for Text Embeddings (`text-embedding-004` / 768 dims), Multimodal OCR extraction, and grounded answer generation.
- **Frontend:** Vite + React (TypeScript) + TailwindCSS + Leaflet (OpenStreetMap) + Chart.js.

## 3. Package Structure (`vn.edu.utc.smartward`)
- `config/`: `AsyncConfig`, `RedisConfig`, `MinioConfig`, `OpenApiConfig`, `CorsConfig`
- `common/`: `ApiResponse`, `GlobalExceptionHandler`, `BusinessException`
- `rag/`:
  - `AdminProcedure`, `LegalChunk` entities
  - `LegalChunkingService` (splits legal text by Article/Clause with metadata)
  - `RagQueryService` (computes cosine similarity via `pgvector`, enforces abstention threshold `theta`, verifies citations)
- `formcheck/`:
  - `FormSubmission` entity
  - `OcrExtractionClient` (extracts structured JSON from uploaded form image)
  - `DeterministicFormRuleEngine` (validates mandatory fields per procedure, validates 12-digit Vietnamese CCCD structure: province code, gender/century digit, birth year, and cross-checks date logic `birthDate < issueDate <= today`)
- `triage/`:
  - `IssueCluster`, `CivicReport` entities
  - `SpatialSemanticTriageService` (Stage 1: Redis `GEOSEARCH` within radius `R` meters; Stage 2: Category match + `pgvector` cosine similarity `>= tau`; merges into existing cluster or creates new cluster)
- `vault/`:
  - `VaultDocument` entity
  - `ImageWatermarkService` (overlays diagonal timestamp + purpose watermark onto CCCD/document images using `Graphics2D`)
  - `ZeroTrustVaultService` (AES-256 encryption, MinIO upload, Redis Lua script / `GETDEL` one-time token verification)
- `evaluation/` (CRITICAL FOR THESIS METRICS):
  - `EvaluationController` & `ExperimentRunnerService`: Endpoints to run automated benchmarks on test datasets and output JSON/CSV tables for:
    1. RAG Recall@K, MRR, Citation Accuracy, and Abstention Accuracy across varying thresholds `theta`.
    2. Spatial-Semantic Deduplication Precision, Recall, and F1-Score across a grid of `R` (25m, 50m, 75m, 100m) and `tau` (0.70, 0.75, 0.80, 0.85, 0.90).

## 4. Core REST APIs to Implement
1. `POST /api/v1/rag/ask` - Input: `{ "question": "...", "threshold": 0.78 }`. Returns grounded answer, cited legal clauses, similarity score, abstention flag, and mandatory legal disclaimer.
2. `POST /api/v1/forms/precheck` - Multipart upload of administrative form image + `procedureCode`. Runs OCR + `DeterministicFormRuleEngine` and returns field-by-field validation report.
3. `POST /api/v1/issues/report` - Submit civic issue (`description`, `lat`, `lng`, `image`). Executes 2-stage Spatial-Semantic deduplication and returns assigned `clusterId` and merge status.
4. `GET /api/v1/issues/clusters` - Returns active issue clusters for the Officer Leaflet Map Dashboard.
5. `POST /api/v1/vault/upload` - Applies dynamic watermark to sensitive citizen document, encrypts with AES-256, stores in MinIO, and returns a one-time access URL.
6. `GET /api/v1/vault/view/{oneTimeToken}` - Atomically consumes token in Redis (`GETDEL`), decrypts image from MinIO, and streams it once. Subsequent calls return `410 Gone`.
7. `POST /api/v1/evaluation/run-grid-search` - Runs the deduplication benchmark on the seed dataset and returns the Precision-Recall-F1 matrix for thesis charts.
