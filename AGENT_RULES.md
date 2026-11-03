# AI AGENT EXECUTION RULES & STRICT CONSTRAINTS (`AGENT_RULES.md`)
**Project:** `smartward-ai` (Ward-level Legal RAG, Form Rule Engine & Spatial-Semantic Issue Triage)

You are an autonomous AI Software Engineer working on a solo 3-month thesis & internship project. You MUST strictly obey all architectural, resource, security, and algorithmic constraints below. Any violation of these rules is considered a critical build failure.

---

## 1. INFRASTRUCTURE & ZERO-COST RESOURCE CONSTRAINTS (CRITICAL)
- **NO Over-Engineering:** 
  - DO NOT add Apache Kafka, RabbitMQ, Zookeeper, Elasticsearch, or Microservices. 
  - Keep the backend as a single **Modular Monolith** in Spring Boot 3.3+ (Java 21).
  - Use Spring's built-in `@Async` (`ThreadPoolTaskExecutor` with `corePoolSize=2`, `maxPoolSize=4`, `queueCapacity=50`) for background tasks.
- **Docker Compose Memory Guardrails (< 2.0 GB Total):**
  - `postgres` (`pgvector/pgvector:pg16`): Must set `mem_limit: 512m`.
  - `redis` (`redis:7-alpine`): Must set `mem_limit: 128m` and command `redis-server --maxmemory 100mb --maxmemory-policy volatile-lru`.
  - `minio` (`minio/minio`): Must set `mem_limit: 256m`.
  - Include a `minio-init` (`minio/mc`) container that automatically creates bucket `smartward-vault`, enforces a hard **5GB quota** (`mc quota set`), and sets a **7-day auto-expiry lifecycle policy** (`mc ilm rule add --expire-days 7`).
- **Database & Upload Limits (`application.yml`):**
  - HikariCP: `maximum-pool-size: 10`, `minimum-idle: 2`.
  - Multipart file size: `max-file-size: 5MB`, `max-request-size: 5MB`.

---

## 2. FREE-TIER AI API & MOCK FALLBACK CONSTRAINTS
- **Rate Limiting:** External LLM/OCR APIs (Gemini Free Tier) have strict rate limits (15 RPM). You MUST implement a Redis-based Rate Limiter allowing max `5 requests/minute/IP` and cache identical RAG questions in Redis for 1 hour.
- **Offline / Zero-Key Testability (`MockAiProvider`):**
  - Always create an interface `AiModelClient` with two implementations:
    1. `GeminiAiClient` (`@Profile("prod")`): Calls the real Gemini API for Embeddings (`768` dims), Vision OCR, and RAG generation.
    2. `DeterministicMockAiClient` (`@Profile("dev | test")`): Works 100% offline without API keys so automated tests and evaluation benchmarks never fail due to quota exhaustion.

---

## 3. ALGORITHMIC & ACADEMIC BOUNDARIES (DO NOT DELEGATE EVERYTHING TO LLM)
To satisfy thesis defense criteria, core validation and deduplication logic MUST be implemented deterministically in Java, NOT by asking the LLM to "guess":

1. **Module 1 - Legal RAG & Abstention Guardrail (`vn.edu.utc.smartward.rag`):**
   - Chunk legal texts strictly by structure (`Article -> Clause`), storing `effective_date` and `status = 'ACTIVE'`.
   - Query `pgvector` using Cosine Distance (`<=>`).
   - **Hard Rule:** If `max_similarity < threshold` (configurable, default `0.78`), DO NOT call LLM generation. Immediately return the abstention response with `abstained = true`.
   - Every response DTO MUST include a `legalDisclaimer` field and `citedReferences` list.

2. **Module 2 - Deterministic Form Rule Engine (`vn.edu.utc.smartward.formcheck`):**
   - Vision OCR is ONLY allowed to extract raw JSON fields (`fullName`, `cccdNumber`, `birthDate`, `issueDate`, `address`, `ocrConfidence`).
   - You MUST write pure Java classes (`CccdValidator`, `DateLogicValidator`, `MandatoryFieldValidator`) to validate:
     - 12-digit Vietnamese CCCD regex, valid 3-digit province code, valid gender/century digit (`0-9` corresponding to 20th/21st century), and matching 2-digit birth year.
     - Logical date order: `birthDate < issueDate <= LocalDate.now()` and age >= 14 for CCCD issue date.
     - Flag any field with `ocrConfidence < 0.70` as `MANUAL_REVIEW_REQUIRED`.

3. **Module 3 - Two-Stage Spatial-Semantic Triage (`vn.edu.utc.smartward.triage`):**
   - **Stage 1 (Spatial):** Execute Redis `GEOSEARCH` within radius `R` meters (configurable parameter).
   - **Stage 2 (Category + Semantic):** Among candidate clusters within radius `R` that are `OPEN` and created within the last `72 hours`, filter by exact `category` match AND `pgvector` Cosine Similarity $\ge \tau$.
   - Expose `R` and $\tau$ as method parameters so the EvaluationRunner can execute grid searches over $R \in \{25, 50, 75, 100, 150\}$ and $\tau \in \{0.70, 0.75, 0.80, 0.85, 0.90\}$.

4. **Module 4 - Zero-Trust Document Vault (`vn.edu.utc.smartward.vault`):**
   - Use pure Java `Graphics2D` to draw a semi-transparent diagonal watermark (`"CHỈ DÙNG ĐỂ SƠ DUYỆT HỒ SƠ TẠI UBND - [TIMESTAMP]"`) onto uploaded images.
   - Encrypt the watermarked bytes using `AES/GCM/NoPadding` (256-bit key) before uploading to MinIO.
   - Store the one-time access token in Redis with a 24-hour TTL. When viewed via `GET /api/v1/vault/view/{token}`, atomically fetch and delete the key using Redis `GETDEL` (or Lua script). Second access MUST return HTTP `410 Gone`.

---

## 4. CODING STANDARDS & DATA PRIVACY RULES
- **Strict Synthetic Data Only:** Never hardcode or commit real citizen names, real CCCD numbers, or sensitive personal data in seed files or tests. Use clearly synthetic test data.
- **Clean Code:** Use Java 21 features (`record` for DTOs, pattern matching), Constructor Injection (`@RequiredArgsConstructor`), global exception handling (`@RestControllerAdvice`), and Flyway migrations (`V1__init_schema.sql`).
- **Built-in Thesis Evaluation Endpoint:** Always maintain `POST /api/v1/evaluation/run-benchmarks` to automatically output Precision, Recall, F1-Score, and Hallucination Rate tables in JSON/CSV format for the thesis report.
