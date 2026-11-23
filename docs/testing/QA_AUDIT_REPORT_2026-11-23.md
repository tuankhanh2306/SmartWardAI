# Báo Cáo Kiểm Thử Toàn Diện & Lộ Trình Cải Thiện Tối Đa (`2026-11-23`)

> **Phạm vi kiểm thử:** Nhánh `develop` tại commit `15152d4` (Docker Compose 6 containers rebuild mới hoàn toàn; cấu hình `.env` trên host hiện tại đang đặt `SPRING_PROFILES_ACTIVE=dev`, cổng Backend `8082`, Web Frontend `3000`).  
> **Nguyên tắc thực thi:** Thực hiện kiểm thử hộp đen & hộp trắng xuyên suốt **Tầng 1–6** mà **không sửa mã nguồn ứng dụng** trong lúc đo đạc, chỉ ghi nhận số liệu quan sát trực tiếp từ tool/container.

---

## 1. Bảng Điểm Tổng Hợp 6 Tầng Kiểm Thử

| Tầng kiểm thử | Công cụ / Phạm vi | Kết quả đo thực tế | Trạng thái |
| :--- | :--- | :--- | :---: |
| **Pre-Flight (Docker Stack)** | `docker compose up -d --build` (6 services) | `6/6 Up (healthy)`, `/api/v1/health = UP`, Web `/health = 200`, `OOMKilled = false`, `Restarts = 0` | ✅ **PASS** |
| **Tầng 1 — Static & Contracts** | `sync-shared-catalogs.mjs --check`, `check-docs-governance.ps1` | `IN_SYNC` 5/5 (`96` xã + `40/40` TTHC); Docs Governance `PASS` | ✅ **PASS** |
| **Tầng 1 — Backend Unit & Testcontainers** | `mvnw.cmd test -B` | `550 tests run, 0 failures, 0 errors, 1 skipped` (`RealDatabaseAndRedisBootSmokeTest` **chạy thật & PASS**; `1` skip pre-existing ở [ChallengerM3AdversarialTest.java](file:///e:/SmartWardAI/backend/src/test/java/vn/edu/uth/smartward/challenge/ChallengerM3AdversarialTest.java#L105)) | ✅ **PASS** |
| **Tầng 1 — Web Frontend** | `tsc --noEmit`, `CI_FRONTEND_ONLY=true npm.cmd run test:all` | `0` lỗi TS; `11/11` suites PASS; `A4DocumentModal-*.js` tách thành `403.88 kB` + `pdfExporter-*.js` `593.92 kB` | ✅ **PASS** |
| **Tầng 1 — Mobile Expo** | `tsc --noEmit`, `vitest run` | `0` lỗi TS; `9/9` files / `77/77` tests PASS | ✅ **PASS** |
| **Tầng 2 & 3 — Kiến trúc, Chaos & RBAC Live** | `qa_live_probe.mjs` trên Docker `8082` | Anonymous bị chặn `401` (`6/6` API + unknown route); CORS xấu trả `403`; SLA `TTHC-CT-01 = null`; brute-force `/dossiers/track` trả `[404×5, 429]`; `WARD_DEFAULT` & tọa độ Hà Nội bị chặn `400`; Redis AOF & DB PostgreSQL nguyên vẹn sau `docker compose restart backend redis` **NHƯNG** `/issues/report` lỗi **`500`** (SQL pgvector cast), `/vault/upload` lỗi **`503`** (Redis `NOAUTH` ở profile `dev`), Swagger mở `200`, Rate Limit `/rag/ask` fail-open (`0/25` bị `429`) | ⚠️ **PARTIAL FAIL (2 lỗi P0)** |
| **Tầng 4 — 161 Live E2E Tests** | `run_all_e2e_tests.mjs --tier=1,2,3,4,5` (`127.0.0.1:8082`) | **`107 / 161 PASS (66.5%)`**, `54 FAIL` (Tier 1: `50/65`, Tier 2: `48/65`, Tier 3: `5/15`, Tier 4: `1/8`, Tier 5: `3/8`) — nguyên nhân gồm Vault `503` thật, lệch contract `ApiResponse`/auth trong bộ test cũ và `2` gap HTTP (`400` vs `413`, `404` lowercase) | ❌ **FAIL** |
| **Tầng 5 — Web UI, Lazy Chunk & A11y** | Playwright Edge headless (`3000`) + `@axe-core/playwright` | `RoleGateway` không lộ PIN `'8942'` hay nút Quick Login; `A4DocumentModal` tải lazy đúng lúc bấm nút; `0` `pageerror`, `0` HTTP `5xx`; **NHƯNG** Nginx CSP gây **22 console errors**, Nginx `Permissions-Policy` khóa camera/mic/GPS, `/citizen/form` tràn ngang `9px` ở `320×568`, `/onboarding` có vi phạm Axe WCAG (`serious`) và `test_ui_a11y_snapshots.mjs` timeout do selector cũ | ⚠️ **PARTIAL FAIL (P1 + P2)** |
| **Tầng 6 — Latency SLO & AI Sidecar Stress** | `qa_live_probe.mjs` + `10`-worker stress nội bộ `ai-sidecar` | `12/12` concurrent calls tới Sidecar đều HTTP `200`, `OOMKilled = false`, tổng RAM peak `1,099.20 / 2048 MiB`; **NHƯNG** Sidecar `/tts` mất `1,970–2,018 ms` (sát timeout `2000ms` của Backend) và TOCTOU 10-way race chưa test hoàn chỉnh do Vault `503` / Triage `500` | ⚠️ **CONDITIONAL PASS** |

---

## 2. Số Liệu Tốc Độ Vận Hành (Latency SLO) & Ngân Sách RAM (`<= 2048 MiB`)

### 2.1. Độ trễ Endpoint & Thời gian tải Web thực tế (`127.0.0.1`)

| Endpoint / Chỉ số | Mẫu đo | p50 | p95 | Max | Ngưỡng SLO | Đánh giá |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET /api/v1/health` | 30 | `10.22 ms` | `12.80 ms` | `13.06 ms` | `< 50 ms` | ✅ PASS |
| `GET /api/v1/procedures` | 20 | `21.40 ms` | `26.18 ms` | `26.18 ms` | `< 150 ms` | ✅ PASS |
| `GET /api/v1/issues/clusters?status=OPEN` | 20 | `13.18 ms` | `15.59 ms` | `15.59 ms` | `< 150 ms` | ✅ PASS |
| `POST /api/v1/rag/ask` (truy vấn lần đầu) | 5 | `57.95 ms` | `60.23 ms` | `60.23 ms` | `< 1,200 ms` | ✅ PASS |
| `POST /api/v1/rag/ask` (lặp lại)* | 10 | `56.62 ms` | `68.99 ms` | `68.99 ms` | `< 100 ms` | ⚠️ Cache miss do Redis NOAUTH |
| `POST /api/v1/issues/report` | 10 | — | — | — | `< 800 ms` | ❌ Lỗi HTTP `500` |
| `POST /api/v1/vault/upload` (fail-closed) | 5 | `63.35 ms` | `97.66 ms` | `97.66 ms` | `< 1,500 ms` | ❌ Trả `503` (Redis NOAUTH) |
| Web Frontend `/` (`domContentLoaded` / `load` / `FCP`) | Playwright | `128.6–133.9 ms` | `136.4 ms` (load) | `612 ms` (FCP) | FCP `< 1.5s` | ✅ PASS |

### 2.2. Sidecar 10-Worker Concurrency & Ngân sách RAM 6 Container

| Container | Trần RAM (`mem_limit`) | Idle (`14:32`) | Sau Stress (`14:37`) | `OOMKilled` / `Restarts` |
| :--- | :---: | :---: | :---: | :---: |
| `smartward-postgres` | `448 MiB` | `53.76 MiB` (`12.00%`) | `78.78 MiB` (`17.58%`) | `false` / `0` |
| `smartward-redis` | `128 MiB` | `13.99 MiB` (`10.93%`) | `14.36 MiB` (`11.22%`) | `false` / `0` |
| `smartward-minio` | `256 MiB` | `113.60 MiB` (`44.38%`) | `114.00 MiB` (`44.54%`) | `false` / `0` |
| `smartward-ai-sidecar` | `384 MiB` | `374.40 MiB` (`97.50%`) | `369.80 MiB` (`96.29%`) | `false` / `0` |
| `smartward-backend` | `768 MiB` | `366.80 MiB` (`47.75%`) | `506.30 MiB` (`65.93%`) | `false` / `0` |
| `smartward-frontend` | `64 MiB` | `15.23 MiB` (`23.79%`) | `15.96 MiB` (`24.95%`) | `false` / `0` |
| **TỔNG CỘNG** | **`2,048 MiB`** | **`937.78 MiB` (`45.79%`)** | **`1,099.20 MiB` (`53.67%`)** | **`0` OOM / `0` Restart** |

*Chi tiết 12 request đồng thời (`max_workers=10`) nội bộ `smartward-ai-sidecar` (tất cả trả `200 OK`):* `/embed` (x4): `321.9–350.8 ms`; `/classify` (x4): `1,251.5–1,276.4 ms`; `/pipeline` (x2): `1,262.4–1,270.5 ms`; `/tts` (x2): `1,970.1–2,018.0 ms`.

---

## 3. Sổ Đăng Ký Lỗi Thực Tế (Defect Register: `P0 → P3`)

### 🔴 P0 — Blocker (Phải sửa ngay, làm hỏng tính năng cốt lõi trên Docker thật)

1. **[BUG-QA-01] `POST /api/v1/issues/report` lỗi `HTTP 500` trên PostgreSQL thật do cast `pgvector`:**
   * **Bằng chứng log:** `org.postgresql.util.PSQLException: ERROR: column "center_embedding" is of type vector but expression is of type character varying (Position: 190)` khi JPA `IssueClusterRepository.save()` chèn/cập nhật [IssueCluster.java](file:///e:/SmartWardAI/backend/src/main/java/vn/edu/uth/smartward/triage/IssueCluster.java). Lỗi tương tự cũng xuất hiện ở [ProcedureDataSeeder.java](file:///e:/SmartWardAI/backend/src/main/java/vn/edu/uth/smartward/rag/ProcedureDataSeeder.java) trên cột `legal_chunks.embedding`.
   * **Tại sao test cũ lọt:** Unit test mock `IssueClusterRepository`, còn `RealDatabaseAndRedisBootSmokeTest` chỉ test boot + `POST /dossiers` mà chưa test `POST /api/v1/issues/report` hay update embedding trên Postgres thật.
2. **[BUG-QA-02] `application-dev.yml` thiếu `spring.data.redis.password`, làm gãy Vault (`503`), RateLimiter & Cache khi Docker chạy theo `.env`:**
   * **Bằng chứng:** `.env.example` & `.env` đặt `SPRING_PROFILES_ACTIVE=dev`; `docker-compose.yml` bật Redis `--requirepass`; nhưng [application-dev.yml](file:///e:/SmartWardAI/backend/src/main/resources/application-dev.yml#L34-L38) thiếu `password: ${REDIS_PASSWORD:}` (chỉ có trong [application-prod.yml](file:///e:/SmartWardAI/backend/src/main/resources/application-prod.yml#L35)). Hậu quả trên Docker:
     * Mọi request `POST /api/v1/vault/upload` lỗi **`HTTP 503`** (`SW_503_STORAGE`) dù vẫn upload được file rác mồ côi `.enc` lên MinIO trước khi fail Redis!
     * `RedisRateLimiter` bắt lỗi `Unable to connect to Redis` và **fail-open** (`0/25` request burst `/rag/ask` bị chặn `429`).
     * `QueryCacheService` không ghi/đọc được cache RAG.

### 🟠 P1 — Critical (Khóa tính năng phần cứng Web, rò rỉ bề mặt hoặc rủi ro timeout/race)

3. **[BUG-QA-03] `frontend/nginx.conf` chặn Camera, Micro và GPS toàn trang Web:**
   * **Bằng chứng:** [nginx.conf](file:///e:/SmartWardAI/frontend/nginx.conf#L14) thiết lập `add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;` $\rightarrow$ trình duyệt tắt quyền dùng Camera (quét QR CCCD), Micro (Voice STT) và GPS (`navigator.geolocation` báo sự cố) trên môi trường Docker production.
4. **[BUG-QA-04] Sidecar AI chạy sát trần RAM (`97.5%` idle) & `/tts` chạm ngưỡng timeout `2000ms`:**
   * **Bằng chứng:** `smartward-ai-sidecar` dùng `374.4–380.1 / 384 MiB` lúc rỗi; `/tts` dưới tải nhẹ mất `1,970.1–2,018.0 ms` trong khi [application.yml](file:///e:/SmartWardAI/backend/src/main/resources/application.yml#L63) đặt `SIDECAR_TIMEOUT_MS=2000`.
5. **[BUG-QA-05] Upload Vault tạo file rác trên MinIO khi Redis lỗi & Endpoint `GET /vault/view/{token}` đặt `permitAll()`:**
   * **Bằng chứng:** Log `07:39:58.280` upload thành công `DOC_...enc` lên MinIO rồi mới lỗi Redis `07:39:58.283`, không có cơ chế rollback/xóa object trên MinIO nếu ghi DB/Redis thất bại. Ngoài ra [OfficerSecurityConfig.java](file:///e:/SmartWardAI/backend/src/main/java/vn/edu/uth/smartward/security/OfficerSecurityConfig.java#L93) mở `permitAll()` cho `GET /api/v1/vault/view/**` (phụ thuộc bảo mật chỉ vào độ dài OTT, không yêu cầu JWT cán bộ); Swagger cũng mở `200` khi Docker chạy profile `dev` từ `.env`.

### 🟡 P2 — Major (UI/UX, A11y, Contract HTTP & Test Harness Drift)

6. **[BUG-QA-06] Nginx CSP chặn Google Fonts (22 console errors):** [nginx.conf](file:///e:/SmartWardAI/frontend/nginx.conf#L13) chỉ cho `style-src 'self' 'unsafe-inline'` và `font-src 'self' data:`, chặn CSS/Font của `fonts.googleapis.com` khiến Edge/Chromium báo 22 lỗi console.
7. **[BUG-QA-07] Lỗi Responsive `320×568` & 3 vi phạm Axe WCAG 2.1 AA:**
   * `/citizen/form` tràn ngang **`9px`** (`329px` vs `320px`) tại thanh nút chọn chế độ nhập (`Tải ảnh PC / Camera / Nhập tay` dùng `inline-flex shrink-0` + `whitespace-nowrap`).
   * `/onboarding` bị `@axe-core/playwright` gắn lỗi `aria-command-name` (`.leaflet-marker-icon`), `scrollable-region-focusable` (`.overflow-y-auto` thiếu `tabIndex={0}`) và `color-contrast` ở `320px` (`.text-[#16A34A]`, `.text-[#64748B]`).
8. **[BUG-QA-08] Chi tiết REST & HSTS/Multipart Contract:**
   * Upload file `> 5 MB` trả `HTTP 400` thay vì `HTTP 413 Payload Too Large` (`T5_ADV_05`).
   * `GET /api/v1/procedures/tthc-ht-01` (chữ thường) trả `404` (`T2_F02_04`).
   * `T1_F13_03` báo `JWT_SECRET` rỗng do fallback kiểm tra cấu hình mặc định.
9. **[BUG-QA-09] Bộ E2E (`161` cases) & `test_ui_a11y_snapshots.mjs` bị lệch hợp đồng code mới:**
   * [api_client.mjs](file:///e:/SmartWardAI/frontend/scripts/e2e/helpers/api_client.mjs#L145) trả `{ status, data: ApiResponse }` không bóc lớp `.data`, làm toàn bộ `15/15` test `F4` đọc `res.data.overallValid` (`undefined`) bị fail dù API trả `200` hợp lệ.
   * Các kịch bản `F11`/`F12` còn gọi endpoint cũ `GET /api/v1/dossiers/track` (đã thay bằng `POST /track` vì `SEC-04`) và dùng PIN cũ `'8942'` thay vì `SmartWardDev2026!` + quy trình `mustChangePin=true`.
   * [test_ui_a11y_snapshots.mjs](file:///e:/SmartWardAI/frontend/scripts/milestones/test_ui_a11y_snapshots.mjs#L94) timeout tại nút cũ `"Đăng nhập với tư cách Cán bộ"`.

### 🔵 P3 — Minor (Nợ kỹ thuật & Làm sạch)

10. **[BUG-QA-10]:** `@Disabled` tại [ChallengerM3AdversarialTest.java](file:///e:/SmartWardAI/backend/src/test/java/vn/edu/uth/smartward/challenge/ChallengerM3AdversarialTest.java#L105) (`TextNormalizationUtils` chưa tách điều khoản ngày/năm); `7` tên TTHC & `2` category trong seed JSON gốc vẫn mang câu chữ nguồn; `spring.jpa.open-in-view` & Hibernate `PostgreSQLDialect` deprecation warning ở startup log; test labels trong `mobile/src/__tests__/` còn chữ `"NĐ 13"`.

---

## 4. Lộ Trình Gợi Ý Phát Triển & Cải Thiện Tối Đa (Ưu Tiên Theo Tác Động)

### Pha A — Khắc phục khẩn cấp P0/P1 (Ưu tiên #1 — Làm cho hệ thống chạy thật 100% trên Docker)
1. **Sửa triệt để ánh xạ `pgvector` trong Hibernate/JDBC (`BUG-QA-01`):** Tạo custom Hibernate `UserType` (hoặc `@JdbcTypeCode` / native SQL `CAST(:embedding AS vector)`) cho `IssueCluster.centerEmbedding` và `LegalChunk.embedding`; bổ sung bài test Testcontainers chạy thật `POST /api/v1/issues/report` và `update` `legal_chunks` trong `RealDatabaseAndRedisBootSmokeTest` để không bao giờ tái phát.
2. **Chuẩn hóa `application.yml` & `docker-compose.yml` (`BUG-QA-02`, `BUG-QA-05`):** Đưa `spring.data.redis.password: ${REDIS_PASSWORD:}` về `application.yml` dùng chung cho mọi profile; khóa mặc định `docker-compose.yml` dùng `SPRING_PROFILES_ACTIVE=prod` (bắt buộc không lấy nhầm `dev` từ `.env` ngoài ý muốn); xóa object MinIO bù trừ (compensating delete) nếu bước lưu Redis/DB Vault thất bại; bật `ROLE_OFFICER` cho `GET /api/v1/vault/view/**` (Frontend fetch qua Axios + Blob URL thay cho `<img src>` mở tự do) và đặt `REDIS SET NX` khóa 5 giây khi giải mã để bịt khe hở TOCTOU song song.
3. **Sửa `frontend/nginx.conf` & Self-host Fonts (`BUG-QA-03`, `BUG-QA-06`):**
   * Sửa `Permissions-Policy` thành `camera=(self), microphone=(self), geolocation=(self)`.
   * Cài `@fontsource/be-vietnam-pro` + local SVG/Material icons (từ Lucide đã có) để bỏ gọi `fonts.googleapis.com` $\rightarrow$ chạy offline 100%, tốc độ render nhanh hơn và **0 lỗi CSP console**.

### Pha B — Tối ưu Hiệu năng, RAM `<= 2048 MiB` & Độ ổn định Sidecar (`P1/P2`)
4. **Tái cân đối ngân sách RAM `2048 MiB` & Timeout Sidecar (`BUG-QA-04`):**
   * `postgres` thực tế mới dùng `78.78 / 448 MiB` (dư ~`369 MiB`) $\rightarrow$ điều chỉnh lại `postgres: 320m`, `backend: 704m`, nâng `ai-sidecar` từ `384m` lên **`512m`** (vẫn giữ tổng đúng **`128 + 256 + 320 + 512 + 704 + 64 = 1,984 MiB <= 2,048 MiB`** và dư `64 MiB` đệm an toàn!).
   * Nâng timeout riêng cho HTTP client `/tts` lên `4,000 ms` và chuẩn hóa uppercase `procedureCode` trong `ProcedureController` + trả `413` chuẩn cho `MaxUploadSizeExceededException` trong `GlobalExceptionHandler`.

### Pha C — Nâng cấp UI/A11y, Giải耦 Kiến trúc & Đóng bộ Test E2E (`P2/P3`)
5. **Dứt điểm UI Overflow & WCAG 2.2 AA (`BUG-QA-07`):** Cho phép thanh chọn chế độ nhập ở `FormAndIssueReporting` xuống dòng (`flex-wrap`) ở màn `< 360px`; thêm `title`/`alt` cho Leaflet marker, `tabIndex={0}` cho danh sách xã ở `WardOnboarding`, tăng tương phản màu chữ xanh/xám lên tối thiểu `4.5:1`.
6. **Cập nhật bộ E2E `161` cases & Playwright A11y (`BUG-QA-09`):** Sửa `api_client.mjs`/assertions khớp `ApiResponse<T>`, dùng `POST /dossiers/track`, dùng tài khoản seeder/đổi PIN chuẩn thay cho `'8942'`, và cập nhật selector mới trong `test_ui_a11y_snapshots.mjs` để CI chặn tự động mọi hồi quy.
7. **Tách dần 2 God Files & Chuẩn hóa dài hạn:**
   * Chia nhỏ `RagQueryService` (`1,440 LOC`) thành `RagGreetingRouter`, `VectorHybridRetriever`, `CitationPostVerifier`, `HitlQueueService`.
   * Chia `FormAndIssueReporting` (`3,756 LOC`) và cấu hình `manualChunks` trong Vite cho `jspdf`/`html2canvas`/`docx` (`pdfExporter` đang `593.92 kB`).
   * Khắc phục những mục kiến trúc còn mở trong Mục 5 [SYSTEM_OVERVIEW.md](file:///e:/SmartWardAI/docs/project/SYSTEM_OVERVIEW.md): thêm `key_id` xoay khóa Vault, `index_status` bất đồng bộ khi publish TTHC, thay JWT tự viết bằng `nimbus-jose-jwt`, và tách rate limit theo JWT/session thay vì thuần IP (tránh chặn cả quầy UBND sau NAT).
