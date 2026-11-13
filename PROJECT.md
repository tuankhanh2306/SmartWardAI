# Project: SmartWard AI — An Giang 2026 Security, Benchmarks & TTHC Hardening

## Architecture
- **Architecture Pattern**: Modular Monolith (Spring Boot 3.3.5 Java 21 + PostgreSQL 16 pgvector + Redis + MinIO + Python Sidecar + React 18/Vite).
- **Hard Constraints**:
  - Tổng RAM 6 container Docker $\le 2048$ MiB.
  - Ngưỡng AI: $\theta = 0.78, \theta_{lower} = 0.42$.
  - Khóa bảo mật: `VAULT_ENCRYPTION_KEY` $\ge 32$ bytes, `JWT_SECRET` $\ge 32$ bytes.
  - Git Branching: Tuyệt đối không commit trực tiếp lên `main`. Rẽ nhánh từ `develop`.
    - Nhánh 1: `bugfix/security-pii-and-vault-hardening`
    - Nhánh 2: `bugfix/honest-benchmarks-and-validators`
    - Nhánh 3: `feature/an-giang-2026-tthc-and-ct01-sync`
  - Flyway Checksum: Tuyệt đối không sửa `V1`..`V4`. Migration mới là `V5__sync_an_giang_2026_procedures.sql`.
  - Kiểm thử: 100% backend `./mvnw test` và frontend `npm run build` pass trước khi merge.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | CCCD Masking & Log PII Redaction | Mask CCCD in `CitizenDossierService.mapToOfficerDto()` to `********XXXX`; remove PII from logs in `CitizenDossierController` and `RagController.sanitizeForLog()`. | M1 | R2 |
| F2 | Redis JWT Revocation & Ward Code | Inject `StringRedisTemplate` into `OfficerAuthService` with TTL revocation `smartward:auth:revoked:{jti}`; fallback `ConcurrentHashMap`; set default wardCode `AG_P_LONGXUYEN`. | M1 | R2 |
| F3 | Proxy Headers & Rate-Limit Spoofing Defense | Set `server.forward-headers-strategy: NATIVE` in application yml; use `request.getRemoteAddr()` in `RagController.extractClientIp()`. | M1 | R2 |
| F4 | CORS Hardening | Restrict CORS in `CorsConfig.java` from property `smartward.cors.allowed-origins`, remove `*`. | M1 | R2 |
| F5 | Anti-OOM Pixel Flood Protection | Inspect dimensions via `ImageReader` before decoding in `ImageWatermarkService` (max 4096px, max 16M pixels); call `flush()`. | M1 | R2 |
| F6 | Vault Token Hashing & Magic Bytes | Hash one-time token with `sha256Hex(token)` in `ZeroTrustVaultService`; sniff magic bytes for PDF/JPEG/PNG in `VaultController.viewDocumentOnce()`. | M1 | R2 |
| F7 | Live Dynamic RAG & Triage Benchmarks | Implement live dynamic benchmark calculations in `ExperimentRunnerService` measuring real `System.nanoTime()`, top-3 retrieval, MRR, Recall@3, out-of-scope abstention, and 2-phase triage clustering. | M2 | R3 |
| F8 | Backward-Compatible Constructor Overloading | Overload constructors in `OfficerAuthService` and `ExperimentRunnerService` to guarantee 100% compatibility with existing unit tests. | M2 | R3, R5 |
| F9 | Date & CCCD Validators Normalization | Strict resolution in `DateLogicValidator` (dd/MM/uuuu, uuuu-MM-dd) with year < 1900 check; warning `CANNOT_VERIFY_CCCD_YEAR_GENDER` in `CccdValidator`. | M2 | R3 |
| F10 | Multi-Locality Query Cache | Overload `QueryCacheService.buildCacheKey(query, wardName, category)` using SHA-256 hash. | M2 | R3 |
| F11 | N+1 Elimination & API Alignment | Single-query chunk counts via `countChunksByProcedure()` in `LegalChunkRepository`; wrap `FormCheckController.precheckStructuredForm()` in `ApiResponse`. | M2 | R3 |
| F12 | NLP Precompiled Regex & Sidecar Lifespan | Precompile regex map in `VietnameseTextNormalizer`; migrate `ml/sidecar/serve.py` to FastAPI `lifespan` with robust `BASE_DIR`. | M2 | R3 |
| F13 | 40 TTHC An Giang 2026 Legal Sync | Update 40 seed JSONs and `ground-truth.json` replacing Đà Nẵng with An Giang 2026 authority and 2026 Decrees/Decisions. | M3 | R4 |
| F14 | Civic Triage Category Harmonization | Harmonize categories across `CivicReportRequest` and `generated-reports.csv`: `ROAD_DAMAGE`, `FLOODING`, `ENVIRONMENT`, `LIGHTING_ELECTRICAL`, `ORDER_SECURITY`. | M3 | R4 |
| F15 | Frontend Legal KB & UI Build Sync | Align `frontend/src/services/legalKnowledgeBase.ts` with 2026 TTHC codes, names, SLA (TTHC-BT-02 = 03 days), fees, An Giang 2-level administration; clean `App.css`. | M3 | R4 |
| F16 | Rule Engine TT 116 (CT01) & NĐ 309 (VNeID QR) | Validate CT01 `hostCccdNumber` and age $\ge 18$; support `vneidHostConfirmed`; tag `VERIFIED_VIA_VNEID_QR` with exemption notice. | M3 | R4 |
| F17 | Flyway Migration V5 | Create `V5__sync_an_giang_2026_procedures.sql` without modifying `V1`..`V4`. | M3 | R4, R5 |
| F18 | Final Verification, Quality Gate & Forensic Audit | Pass 100% `./mvnw test` and `npm run build`; verify key endpoints; enforce binary Forensic Audit veto. | M4 | R1, R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Security, PII & Vault Hardening (`bugfix/security-pii-and-vault-hardening`) | F1, F2, F3, F4, F5, F6 | none | DONE (Commit a865acb, 73 unit tests + 50 challenger tests pass, Gate PASS) |
| M2 | Honest Benchmarks, Validators & Performance (`bugfix/honest-benchmarks-and-validators`) | F7, F8, F9, F10, F11, F12 | M1 | DONE (327 backend tests pass, frontend build passes, honest dynamic calculations verified) |
| M3 | An Giang 2026 TTHC, CT01 & Rule Engine Sync (`feature/an-giang-2026-tthc-and-ct01-sync`) | F13, F14, F15, F16, F17 | M2 | PLANNED |
| M4 | Final Integration, Verification & Forensic Audit | F18 | M1, M2, M3 | PLANNED |

## Code Layout & Write Boundaries
- **Milestone 1**:
  - `backend/src/main/java/vn/edu/uth/smartward/dossier/CitizenDossierService.java`
  - `backend/src/main/java/vn/edu/uth/smartward/dossier/CitizenDossierController.java`
  - `backend/src/main/java/vn/edu/uth/smartward/rag/RagController.java`
  - `backend/src/main/java/vn/edu/uth/smartward/security/OfficerAuthService.java`
  - `backend/src/main/resources/application.yml`
  - `backend/src/main/resources/application-prod.yml`
  - `backend/src/main/java/vn/edu/uth/smartward/config/CorsConfig.java`
  - `backend/src/main/java/vn/edu/uth/smartward/vault/ImageWatermarkService.java`
  - `backend/src/main/java/vn/edu/uth/smartward/vault/ZeroTrustVaultService.java`
  - `backend/src/main/java/vn/edu/uth/smartward/vault/VaultController.java`
  - `backend/src/test/java/vn/edu/uth/smartward/security/OfficerAuthServiceTest.java`
  - `backend/src/test/java/vn/edu/uth/smartward/dossier/CitizenDossierAdversarialTest.java`
  - `backend/src/test/java/vn/edu/uth/smartward/vault/ZeroTrustVaultServiceTest.java`
  - `backend/src/test/java/vn/edu/uth/smartward/rag/RagControllerTest.java`
- **Milestone 2**:
  - `backend/src/main/java/vn/edu/uth/smartward/benchmark/ExperimentRunnerService.java`
  - `backend/src/test/java/vn/edu/uth/smartward/benchmark/ExperimentRunnerServiceTest.java`
  - `backend/src/main/java/vn/edu/uth/smartward/formcheck/validator/DateLogicValidator.java`
  - `backend/src/main/java/vn/edu/uth/smartward/formcheck/validator/CccdValidator.java`
  - `backend/src/main/java/vn/edu/uth/smartward/rag/QueryCacheService.java`
  - `backend/src/main/java/vn/edu/uth/smartward/rag/RagQueryService.java`
  - `backend/src/test/java/vn/edu/uth/smartward/rag/RagQueryServiceTest.java`
  - `backend/src/main/java/vn/edu/uth/smartward/rag/ProcedureService.java`
  - `backend/src/main/java/vn/edu/uth/smartward/rag/LegalChunkRepository.java`
  - `backend/src/main/java/vn/edu/uth/smartward/formcheck/FormCheckController.java`
  - `frontend/src/api/client.ts`
  - `backend/src/main/java/vn/edu/uth/smartward/rag/VietnameseTextNormalizer.java`
  - `ml/sidecar/serve.py`
- **Milestone 3**:
  - `backend/src/main/resources/db/seed/procedures/*.json`
  - `backend/src/main/resources/benchmark/rag/ground-truth.json`
  - `backend/src/main/java/vn/edu/uth/smartward/civic/dto/CivicReportRequest.java`
  - `backend/src/main/java/vn/edu/uth/smartward/civic/dto/IssueClusterDto.java`
  - `backend/src/main/resources/benchmark/civic-reports/generated-reports.csv`
  - `frontend/src/services/legalKnowledgeBase.ts`
  - `frontend/src/App.css`
  - `backend/src/main/java/vn/edu/uth/smartward/formcheck/FormPrecheckService.java`
  - `backend/src/main/java/vn/edu/uth/smartward/formcheck/dto/StructuredFormPrecheckResponse.java`
  - `backend/src/main/resources/db/migration/V5__sync_an_giang_2026_procedures.sql`
- **Milestone 4**:
  - Verification & E2E suite validation.

## Interface Contracts
- **Vault View API**:
  `GET /api/v1/vault/view/{token}` returns file binary with magic bytes Content-Type (`application/pdf`, `image/jpeg`, or `image/png`).
- **Benchmark Evaluation API**:
  `POST /api/v1/evaluation/run-benchmarks` returns dynamically calculated benchmark results (`ragBenchmark` with latency, recall@3, mrr, outOfScopeAbstained; `triageBenchmark` with cluster metrics and processing time).
- **Officer Dossier List**:
  `GET /api/v1/dossiers/officer/list` returns citizen CCCD masked as `********XXXX`.
- **Form Precheck API**:
  `POST /api/v1/forms/precheck-structured` returns `ApiResponse<StructuredFormPrecheckResponse>`.
