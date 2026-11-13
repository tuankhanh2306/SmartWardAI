# Original User Request

## Initial Request — 2026-11-13T07:42:32Z

Sửa lỗi, gia cố bảo mật và nâng cấp nghiệp vụ SmartWard AI phục vụ môi trường production theo quy định An Giang 2026, bao gồm bảo vệ PII/CCCD, thu hồi JWT qua Redis, chống OOM/pixel flood, thực nghiệm benchmark thật, chuẩn hóa validator và đồng bộ 40 TTHC cấp xã.

Working directory: e:\SmartWardAI
Integrity mode: development

## Requirements

### R1. Ràng buộc kiến trúc & Quy trình phát triển
- Giữ nguyên kiến trúc Modular Monolith (Spring Boot 3 + PostgreSQL pgvector + Redis + MinIO + Python Sidecar + React/Vite). Tuyệt đối không thêm Kafka, RabbitMQ, Elasticsearch.
- Tổng RAM 6 container <= 2048 MiB.
- Giữ nguyên ngưỡng AI & Bảo mật: θ = 0.78, θ_lower = 0.42; VAULT_ENCRYPTION_KEY và JWT_SECRET >= 32 bytes.
- Tuyệt đối không commit trực tiếp lên main. Tách nhánh từ develop theo 3 nhóm công việc:
  - Nhánh 1: bugfix/security-pii-and-vault-hardening
  - Nhánh 2: bugfix/honest-benchmarks-and-validators
  - Nhánh 3: feature/an-giang-2026-tthc-and-ct01-sync
- Commit theo chuẩn Conventional Commits (fix(security): ..., fix(rag): ..., feat(an-giang-2026): ...).
- Sau mỗi nhóm, bắt buộc chạy `./mvnw test` (Backend) và `npm run build` (Frontend) đạt 100% pass trước khi merge.

### R2. Gia cố bảo mật, Quyền riêng tư NĐ 13/2023 & Chống OOM (Nhánh 1)
- Che mờ CCCD & loại bỏ PII khỏi Log:
  - Trong `CitizenDossierService.mapToOfficerDto()`: Đổi thành `.citizenCccd(maskCccd(dossier.getCitizenCccd()))` để luôn trả về dạng ********1234 (tái sử dụng hàm maskCccd đã có sẵn trong class).
  - Trong `CitizenDossierController.trackDossier()`: Xóa `citizenCccd` khỏi câu lệnh `log.info(...)`, chỉ log `dossierCode` và trạng thái có/không có `last4Cccd`.
  - Trong `RagController.askQuestion()`: Tạo hàm helper `sanitizeForLog(String text)` thay thế mọi chuỗi 9–12 chữ số liên tiếp bằng `***REDACTED_ID***` và cắt gọn tối đa 60 ký tự trước khi ghi log.
- Thu hồi JWT Cán bộ trên Redis & Đồng bộ wardCode:
  - Tiêm `StringRedisTemplate` vào `OfficerAuthService` (giữ `ConcurrentHashMap` làm fallback dự phòng khi Redis mất kết nối).
  - Trong `revokeToken()`: Lưu key `smartward:auth:revoked:{jti}` vào Redis với Duration.ofSeconds(Math.max(1, principal.expiresAtEpochSec() - Instant.now().getEpochSecond())).
  - Trong `verifyToken()`: Kiểm tra `Boolean.TRUE.equals(stringRedisTemplate.hasKey("smartward:auth:revoked:" + jti))`.
  - Cập nhật wardCode mặc định của 2 tài khoản cán bộ mẫu (CC-AG-8942, CC-AG-1001) sang "AG_P_LONGXUYEN" và cập nhật các test liên quan trong `OfficerAuthServiceTest` / `CitizenDossierAdversarialTest`.
- Chống Spoofing Rate-Limit & Siết chặt CORS:
  - Trong `application.yml` & `application-prod.yml`: Thêm `server.forward-headers-strategy: NATIVE` (để Tomcat/Spring tự xử lý proxy header từ reverse proxy tin cậy).
  - Trong `RagController.extractClientIp()`: Loại bỏ việc tự parse `X-Forwarded-For` thủ công, trả về `request.getRemoteAddr()`.
  - Trong `CorsConfig.java`: Đọc danh sách origin từ `@Value("${smartward.cors.allowed-origins:http://localhost:3000,http://localhost:5173}") List<String> allowedOrigins`, xóa bỏ "*" khỏi `setAllowedOriginPatterns`.
- Chống OOM (Pixel Flood) & Băm Token trong Zero-Trust Vault:
  - Trong `ImageWatermarkService.applyWatermark()`: Dùng `ImageIO.createImageInputStream(...)` + `ImageIO.getImageReaders(...)` đọc `reader.getWidth(0)` và `reader.getHeight(0)` trước khi decode. Nếu width > 4096 || height > 4096 || (long) width * height > 16_777_216L, ném `BusinessException(ErrorCode.INVALID_REQUEST, "Kích thước ảnh vượt quá giới hạn cho phép (tối đa 4096x4096 px).")`. Gọi `original.flush()` và `watermarked.flush()` sau khi xuất byte array.
  - Trong `ZeroTrustVaultService`: Tạo hàm `sha256Hex(String token)` và lưu bản băm vào trường `oneTimeToken` của `VaultDocument` (khi truy vấn fallback DB cũng tra cứu theo sha256Hex(oneTimeToken)).
  - Trong `VaultController.viewDocumentOnce()`: Nhận diện magic bytes đầu file sau khi giải mã (%PDF -> application/pdf, \xFF\xD8\xFF -> image/jpeg, mặc định image/png) để trả đúng Content-Type và đuôi file.

### R3. Đánh giá Thực nghiệm Thật, Chuẩn hóa Validator & Tối ưu Hiệu năng (Nhánh 2)
- Thực thi đánh giá thực nghiệm thật trong `ExperimentRunnerService.java`:
  - Tiêm `RagQueryService`, `LegalChunkRepository`, `AiModelClient`, và `TwoStageTriageService` (hoặc tạo instance `TwoStageTriageService` chạy trên bộ nhớ đối với tập test CSV để không làm bẩn DB production) vào `ExperimentRunnerService`.
  - Trong `evaluateRagBenchmark()`: Với từng câu hỏi trong `benchmark/rag/ground-truth.json`:
    - Đo thời gian thực bằng `long t0 = System.nanoTime()`.
    - Vector hóa câu hỏi qua `aiModelClient.generateEmbedding(question)` và truy vấn top-3 qua `legalChunkRepository.findTopKSimilarChunksWithMetadata(...)` (hoặc gọi `ragQueryService.askQuestion` với chế độ bypass LLM chat generation để không tốn quota Gemini).
    - So sánh maxSimilarity với θ = 0.78: nếu isInScope == false và hệ thống từ chối (maxSim < 0.78), tăng outOfScopeAbstained. Nếu isInScope == true, kiểm tra xem procedureCode kỳ vọng có nằm trong Top-3 chunks trả về không để tính Recall@3 và tính 1 / rank thực tế cho MRR. Tính averageLatencyMs trung bình thật từ các lần đo `System.nanoTime()`.
  - Trong `evaluateTriageBenchmark()`: Đọc 150 dòng từ `benchmark/civic-reports/generated-reports.csv`, chạy qua logic phân cụm 2 pha thực tế (lọc bán kính R = 75m + kiểm tra trùng khớp category + Cosine Similarity >= τ = 0.82), đối chiếu clusterId gán được với expectedClusterId, tính tỷ lệ tách ca biên (COLOCATED_DIFFERENT_CATEGORY, SAME_CATEGORY_DISTANT_LOCATION) và đo averageProcessingTimeMs thật.
  - Cập nhật `ExperimentRunnerServiceTest.java` tương ứng với các dependency mới.
- Khắc phục lỗi ngày tháng & Cache đa địa phương:
  - Trong `DateLogicValidator`: Đổi sang `DateTimeFormatter.ofPattern("dd/MM/uuuu").withResolverStyle(ResolverStyle.STRICT)` và `DateTimeFormatter.ofPattern("uuuu-MM-dd").withResolverStyle(ResolverStyle.STRICT)`. Bổ sung kiểm tra `birthDate.getYear() < 1900` -> báo lỗi `INVALID_DATE_LOGIC`.
  - Trong `CccdValidator`: Nếu birthDateStr không rỗng nhưng extractBirthYear trả null, thêm cảnh báo `CANNOT_VERIFY_CCCD_YEAR_GENDER` (severity WARNING) thay vì im lặng cho qua.
  - Trong `QueryCacheService`: Nạp chồng `buildCacheKey(String query, String wardName, String category)` để đưa cả wardName và category đã chuẩn hóa vào chuỗi băm SHA-256; cập nhật lời gọi trong `RagQueryService`.
- Xóa truy vấn N+1, chuẩn hóa API & Tối ưu NLP/Sidecar:
  - Sửa N+1 ở `ProcedureService.getProcedures()`: Thêm query `@Query("SELECT c.procedure.id, COUNT(c) FROM LegalChunk c GROUP BY c.procedure.id") List<Object[]> countChunksByProcedure();` vào `LegalChunkRepository` để map số lượng chunk trong 1 lần truy vấn thay vì gọi `findByProcedureId` trong vòng lặp.
  - Chuẩn hóa `FormCheckController.precheckStructuredForm()`: Kiểm tra `frontend/src/api/client.ts` — nếu frontend đang đọc thẳng response phẳng thì giữ nguyên hoặc hỗ trợ cả hai, hoặc bọc `ApiResponse<StructuredFormPrecheckResponse>` đồng bộ với toàn bộ controller khác.
  - Tiền biên dịch Regex ở `VietnameseTextNormalizer.java`: Biên dịch sẵn toàn bộ Pattern trong khối `static {}` vào `Map<Pattern, String>` thay vì gọi `String.replaceAll()` hơn 50 lần mỗi request.
  - Nâng cấp `ml/sidecar/serve.py`: Thay `@app.on_event("startup")` bằng `asynccontextmanager` lifespan của FastAPI, và tính đường dẫn model bằng `BASE_DIR = Path(__file__).resolve().parents[2]` để chạy được từ mọi thư mục làm việc.

### R4. Chuẩn hóa 40 TTHC UBND Tỉnh An Giang 2026 & Nâng cấp Nghiệp vụ (Nhánh 3)
- Chuẩn hóa nguồn dữ liệu 40 TTHC cấp xã theo quy định mới nhất của UBND Tỉnh An Giang (2026):
  - Cập nhật 40 file JSON trong `backend/src/main/resources/db/seed/procedures/` và `backend/src/main/resources/benchmark/rag/ground-truth.json`:
    - Chuyển đổi toàn bộ các thủ tục có nhãn (Thành phố Đà Nẵng) sang thẩm quyền UBND xã, phường, đặc khu thuộc tỉnh An Giang và Chủ tịch UBND cấp xã tỉnh An Giang theo các văn bản hiệu lực 2026:
      - Hộ tịch & Liên thông điện tử: QĐ 408/QĐ-UBND (29/01/2026) của UBND tỉnh An Giang; NĐ 301/2026/NĐ-CP & QĐ 1868/QĐ-BTP (liên thông 4 thủ tục Khai sinh – Thường trú – BHYT – Thẻ Căn cước trẻ dưới 6 tuổi trong 24h; liên thông 4 thủ tục Khai tử – Xóa thường trú – Mai táng phí – Tử tuất).
      - Cư trú: Thông tư 116/2026/TT-BCA (Mẫu CT01 mới hiệu lực từ 01/07/2026) & NĐ 154/2024/NĐ-CP.
      - Bảo trợ xã hội & Hưu trí xã hội: Nghị định 335/2026/NĐ-CP (21/08/2026) & QĐ 4595/QĐ-UBND (07/10/2026) của UBND tỉnh An Giang (thời hạn hỗ trợ mai táng: 03 ngày làm việc, Mẫu số 03; trợ cấp xã hội hàng tháng: 10 ngày làm việc, Mẫu số 01).
      - Đất đai cấp xã: Nghị định 49/2026/NĐ-CP (31/01/2026) & QĐ 3828/QĐ-UBND, QĐ 5025/QĐ-UBND (2026) của UBND tỉnh An Giang (Mẫu số 18 đăng ký biến động đất đai; thẩm quyền Chủ tịch UBND cấp xã cấp Giấy chứng nhận lần đầu).
      - Chứng thực & Một cửa phi địa giới: Nghị định 18/2026/NĐ-CP, Nghị định 23/2015/NĐ-CP, và Nghị định 309/2026/NĐ-CP (sửa đổi NĐ 118/2025/NĐ-CP — tiếp nhận phi địa giới hành chính toàn tỉnh An Giang, miễn nộp lại giấy tờ đã có trên CSDLQG về dân cư/VNeID).
  - Cập nhật thống nhất mã danh mục sự cố Triage giữa `CivicReportRequest.java` và `generated-reports.csv` (ROAD_DAMAGE, FLOODING, ENVIRONMENT, LIGHTING_ELECTRICAL, ORDER_SECURITY).
  - Đồng bộ `frontend/src/services/legalKnowledgeBase.ts`:
    - Cập nhật đúng mã TTHC-*, tên thủ tục, thời hạn giải quyết, lệ phí và căn cứ pháp lý 2026 khớp 100% với Backend (TTHC-BT-02 = 03 ngày làm việc, NĐ 335/2026/NĐ-CP; Đăng ký khai tử = TTHC-HT-03; Khai báo tạm vắng = TTHC-CR-07).
    - Chuyển đổi các từ khóa gợi ý từ "quận/huyện" sang mô hình chính quyền 2 cấp tỉnh An Giang (Tỉnh An Giang -> Xã / Phường / Đặc khu).
- Nâng cấp Rule Engine biểu mẫu theo TT 116/2026/TT-BCA & NĐ 309/2026/NĐ-CP:
  - Quy tắc Mẫu CT01 mới (TT 116/2026/TT-BCA): Nếu trường `hostCccdNumber` (Số CCCD chủ hộ/chủ sở hữu chỗ ở hợp pháp) được nhập, chạy kiểm tra hợp lệ 12 chữ số qua `CccdValidator` (mã tỉnh 63 tỉnh/thành, năm sinh, giới tính) và kiểm tra độ tuổi chủ hộ >= 18 tuổi. Bổ sung hỗ trợ cờ xác nhận đồng ý của chủ hộ qua ứng dụng VNeID (`vneidHostConfirmed == true` thì miễn yêu cầu bản giấy ý kiến chủ hộ).
  - Quy tắc "Miễn nộp lại giấy tờ đã số hóa" (NĐ 309/2026/NĐ-CP): Khi công dân quét thành công mã QR trên thẻ CCCD gắn chip hoặc chọn xác thực VNeID, hệ thống tự động gắn nhãn thông tin `VERIFIED_VIA_VNEID_QR` trong `StructuredFormPrecheckResponse` và hiển thị thông báo hướng dẫn công dân không cần photo/chứng thực lại CCCD hoặc giấy xác nhận cư trú CT07.

### R5. Lưu ý tương thích ngược cho Test & Flyway (Bắt buộc)
- Endpoint xem tài liệu Vault chuẩn là `GET /api/v1/vault/view/{token}` (không đổi URL gốc).
- Trong `OfficerAuthService` và `ExperimentRunnerService`, nạp chồng (overload) constructor cũ bên cạnh constructor mới có thêm dependency (`StringRedisTemplate`, `LegalChunkRepository`, `AiModelClient`...) để tương thích ngược 100% với các unit test gọi `new ...()` trực tiếp. Nếu dependency mới là null, tự động fallback in-memory hoặc DeterministicMockAiClient để không làm gãy test hiện hữu.
- Trong `RagController.extractClientIp()`, chỉ đọc `request.getRemoteAddr()` (vì `server.forward-headers-strategy: NATIVE` sẽ tự động xử lý). Kiểm tra các file test xem có test nào mock `HttpServletRequest.getHeader("X-Forwarded-For")` trực tiếp không để cập nhật sang `getRemoteAddr()`.
- Tuyệt đối không sửa nội dung các file Flyway migration đã tồn tại (`V1` đến `V4`) để tránh lỗi Flyway Checksum Mismatch; nếu cần cập nhật dữ liệu SQL thì tạo migration mới `V5__sync_an_giang_2026_procedures.sql`.
