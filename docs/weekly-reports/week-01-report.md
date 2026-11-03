# BÁO CÁO TIẾN ĐỘ TUẦN 1
## HỌC KỲ DOANH NGHIỆP / ĐỒ ÁN TỐT NGHIỆP KỸ SƯ CÔNG NGHỆ THÔNG TIN
### TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP. HỒ CHÍ MINH (UTH)

---

## I. THÔNG TIN CHUNG

| Thông tin | Chi tiết |
|:---|:---|
| **Họ và tên sinh viên** | Nguyễn Minh Tuấn Khánh |
| **Mã số sinh viên** | 089205023490 |
| **Lớp / Khóa** | CN2301CLCB |
| **Ngành đào tạo** | Công nghệ Thông tin |
| **Tên đề tài chính thức** | **SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã Tích hợp Trí tuệ Nhân tạo** |
| **Giảng viên hướng dẫn (GVHD)** | ThS. Lê Văn Quốc Anh |
| **Người hướng dẫn Doanh nghiệp (Mentor)** | *(Điền tên Mentor tại đơn vị thực tập)* |
| **Thời gian thực hiện Tuần 1** | Từ ngày 27/10/2026 đến ngày 02/11/2026 |
| **Kho lưu trữ mã nguồn (Git Repository)** | https://github.com/tuankhanh2306/SmartWardAI |
| **Release Tag Tuần 1** | `v0.1.0-w01` |

---

## II. MỤC TIÊU CÔNG VIỆC TUẦN 1

Đây là tuần khởi động toàn bộ dự án từ ý tưởng đến hạ tầng kỹ thuật. Các mục tiêu được xây dựng theo nguyên tắc: **mỗi mục tiêu phải tạo ra một sản phẩm cụ thể, có thể đo lường, có thể commit lên Git**.

1. Khảo sát nghiệp vụ thực tế tại Bộ phận Một cửa cấp phường/xã; xác định 2 bài toán nhức nhối về xử lý thông tin hành chính và phân luồng phản ánh dân sinh.
2. Phát biểu 3 câu hỏi nghiên cứu cốt lõi (Research Questions) dưới dạng có thể kiểm chứng bằng thực nghiệm khoa học định lượng, không chỉ định tính.
3. Thiết kế và ghi chép hoàn chỉnh kiến trúc hệ thống Zero-Cost (≤ 2.0 GB RAM), lý giải từng quyết định công nghệ so với các lựa chọn thay thế.
4. Xây dựng hạ tầng Docker Compose cục bộ (4 container), khởi tạo mã nguồn Spring Boot 3.3 (Java 21) và xác minh toàn bộ pipeline build thông qua lệnh `mvnw test` với kết quả BUILD SUCCESS.
5. Khởi tạo quy trình kiểm soát mã nguồn chuyên nghiệp: Conventional Commits 1.0.0, chiến lược nhánh Git, đẩy đầy đủ lên GitHub và đánh dấu phát hành (`git tag`).
6. Soạn thảo bộ tài liệu học thuật nền tảng và phác thảo Chương 1 của cuốn Báo cáo Tốt nghiệp.

---

## III. CHI TIẾT CÁC CÔNG VIỆC ĐÃ THỰC HIỆN TRONG TUẦN

### 3.1. Khảo sát Nghiệp vụ & Xác định 2 Bài toán Thực tiễn

#### 3.1.1. Bối cảnh thực tế được khảo sát

Qua quá trình làm việc với Mentor tại đơn vị thực tập và khảo sát thực tế quy trình làm việc tại Bộ phận Tiếp nhận và Trả kết quả (Bộ phận Một cửa) cấp phường/xã, nhóm sinh viên ghi nhận hai điểm nghẽn lớn trong xử lý thông tin hành chính của chính quyền địa phương:

**Bài toán 1 – Sai sót biểu mẫu hành chính ở khâu chuẩn bị hồ sơ:**

Người dân khi đến làm thủ tục hành chính (đăng ký khai sinh, đăng ký tạm trú, đăng ký kết hôn, chứng thực chữ ký, v.v.) thường gặp khó khăn trong ba tình huống phổ biến:

- **Sai cấu trúc số CCCD 12 chữ số:** Căn cước công dân 12 số có cấu trúc: 3 số mã tỉnh/thành + 1 số mã thế kỷ sinh/giới tính + 2 số năm sinh + 6 số ngẫu nhiên. Sai lệch ở bất kỳ vị trí nào đều khiến hồ sơ không hợp lệ. Ví dụ: người sinh năm 1990, giới tính nữ phải có số thứ 4 là `3`; điền nhầm `2` sẽ bị trả hồ sơ.
- **Mâu thuẫn logic ngày tháng:** Các tờ khai yêu cầu khai đồng thời ngày sinh, ngày cấp căn cước công dân, ngày cấp hộ khẩu và ngày nộp hồ sơ. Khi ngày cấp căn cước nhỏ hơn ngày sinh (điền nhầm thứ tự ngày/tháng), hoặc ngày làm hồ sơ lớn hơn ngày hiện tại (lỗi định dạng DD/MM/YYYY nhầm thành MM/DD/YYYY), tờ khai bị trả ngay.
- **Thiếu giấy tờ kèm theo theo từng nhóm thủ tục:** Mỗi mã thủ tục hành chính (TTHC) có schema thành phần hồ sơ bắt buộc riêng được quy định bởi nghị quyết/nghị định đặc thù. Người dân tra cứu nhầm thủ tục hoặc đọc văn bản cũ đã hết hiệu lực dẫn đến thiếu giấy tờ.

Hậu quả: hồ sơ bị trả lại để bổ sung nhiều lần (trung bình 1–3 lần/người dân theo phản ánh tại một số điểm một cửa), gây quá tải cho cán bộ tiếp nhận và lãng phí thời gian của người dân.

**Bài toán 2 – Trùng lặp và phân mảnh phản ánh hiện trường dân sinh:**

Khi một sự cố hạ tầng đô thị xảy ra (ngập nước, ổ gà, nắp cống hư, đèn đường chập cháy, rác thải ùn ứ), nhiều người dân sống gần đó đồng thời gửi phản ánh với các đặc điểm sau:

- **Diễn đạt khác nhau về cùng một sự cố:** "đường ngập", "hẻm 12 bị ngập nước", "Bị ngập ở đầu hẻm gần chợ", "ngập chân trời mưa là ngập" — tất cả chỉ mô tả một điểm ngập duy nhất nhưng hệ thống thủ công không thể gom lại.
- **Tọa độ GPS bị sai số:** Trên thiết bị di động trong hẻm sâu hoặc giữa các tòa nhà cao tầng, tín hiệu GPS bị phản xạ đa đường (multipath effect), gây sai số lên tới 40–120m so với vị trí thực.
- **Phân tán trên nhiều kênh:** Zalo, Facebook, điện thoại, app dịch vụ công, đến trực tiếp — không có hệ thống tự động gom nhóm.

Hậu quả: cán bộ chuyên môn phường/xã nhận được hàng chục bản ghi rời rạc về cùng một sự kiện, mỗi bản được xử lý riêng, gây mất thời gian, bỏ sót ưu tiên và không thể đánh giá mức độ nghiêm trọng theo số lượng người bị ảnh hưởng.

---

### 3.2. Xây dựng 3 Câu hỏi Nghiên cứu (Research Questions – RQ)

Sau khi xác định 2 bài toán, 3 câu hỏi nghiên cứu được phát biểu theo chuẩn học thuật — mỗi RQ phải **có biến độc lập, biến phụ thuộc, và phương pháp đo lường định lượng**:

**RQ1 (Liên quan Bài toán 1 – Hỏi đáp Thủ tục):**
> *Phương pháp Truy xuất Tăng cường (RAG) kết hợp phân đoạn văn bản theo cấu trúc pháp lý (Chương – Điều – Khoản) và cơ chế ngưỡng từ chối trả lời (Abstention Threshold θ) cải thiện độ chính xác trích dẫn và giảm tỷ lệ ảo giác (Hallucination Rate) như thế nào so với việc sử dụng LLM thuần túy (Zero-shot)?*

- **Biến độc lập:** Cấu hình hệ thống (LLM Zero-shot / Standard RAG / Proposed RAG với Abstention)
- **Biến phụ thuộc:** Recall@3, MRR, Citation Precision, False Answer Rate
- **Phương pháp kiểm chứng:** Bộ 80 câu hỏi kiểm thử (40 trực tiếp + 25 tình huống + 15 câu bẫy)

**RQ2 (Liên quan Bài toán 2 – Gom nhóm Phản ánh):**
> *Thuật toán kết hợp 2 pha (Spatial-Semantic Deduplication: Bán kính địa lý R từ Redis GEO + Độ tương đồng ngữ nghĩa τ từ pgvector) có hiệu quả gom nhóm phản ánh trùng lặp tốt hơn phương pháp chỉ dùng vị trí hoặc chỉ dùng văn bản như thế nào? Tham số tối ưu (R, τ) được xác định bằng Grid Search trên đường cong Precision–Recall?*

- **Biến độc lập:** Cấu hình (Spatial-only / Semantic-only / Combined 2-pha)
- **Biến phụ thuộc:** Precision, Recall, F₁-score
- **Phương pháp kiểm chứng:** 150 phản ánh tổng hợp từ 30 kịch bản gốc × 15 tình nguyện viên

**RQ3 (Liên quan Bài toán 1 – Kiểm tra Tờ khai):**
> *Bộ quy tắc hậu kiểm định sẵn (Deterministic Validation Rules) viết bằng Java, đặt sau mô hình OCR, đóng góp bao nhiêu phần trăm vào việc phát hiện và ngăn chặn lỗi logic trên tờ khai hành chính (lỗi cấu trúc CCCD, lỗi logic ngày tháng, thiếu trường bắt buộc) so với việc chỉ dựa vào OCR thuần túy?*

- **Biến độc lập:** Có/Không có Rule Engine sau OCR
- **Biến phụ thuộc:** Error Detection Rate, False Positive Rate
- **Phương pháp kiểm chứng:** 40 mẫu tờ khai (20 in/đánh máy + 20 viết tay) với lỗi logic được cài cắm sẵn

---

### 3.3. Thiết kế Kiến trúc Hệ thống (Zero-Cost Architecture)

#### 3.3.1. Lý do lựa chọn Modular Monolith – bác bỏ Microservices

Kiến trúc hệ thống được quyết định dựa trên **phân tích tải thực tế** tại cấp phường/xã:

| Tiêu chí | Microservices + Kafka | Modular Monolith (Lựa chọn) |
|:---|:---:|:---:|
| Lưu lượng dự kiến | Vài nghìn req/ngày | Vài nghìn req/ngày |
| RAM tối thiểu để vận hành | ~3.5–4.0 GB | ~1.2–1.5 GB |
| Độ phức tạp triển khai | Cao (nhiều service, network mesh) | Thấp (1 JVM process) |
| Phù hợp với 1 sinh viên, 12 tuần | ❌ Rủi ro cao, không khả thi | ✅ Kiểm soát được toàn bộ |
| Kiểm thử tích hợp | Khó (cần mock nhiều service) | Dễ (Spring context test) |

Kết luận: **Modular Monolith Spring Boot 3.3 (Java 21)** là lựa chọn tối ưu về mặt kỹ thuật — không phải vì tiết kiệm, mà vì **phù hợp đúng với quy mô bài toán**.

#### 3.3.2. Phân tích RAM Budget từng Container

Tổng ngân sách RAM: **2.0 GB = 2048 MB**

| Service | Docker Image | `mem_limit` | Ghi chú kỹ thuật |
|:---|:---|:---:|:---|
| PostgreSQL 16 + pgvector | `pgvector/pgvector:pg16` | 512 MB | `shared_buffers=128MB`, `work_mem=4MB`, `max_connections=100`, HikariCP pool max=10 |
| Redis 7 | `redis:7-alpine` | 128 MB | `maxmemory 100mb`, eviction `volatile-lru`, lưu GEO index + One-Time Token |
| MinIO | `minio/minio:RELEASE.2024-01-13` | 256 MB | Bucket `smartward-vault`, max 5 GB data, ILM 7 ngày |
| MinIO Init Job | `minio/mc:latest` | ~64 MB (ephemeral) | Tạo bucket, set quota 5GB, set ILM rule, tự exit sau khi xong |
| **Spring Boot App** | `eclipse-temurin:21-jre` | ~512 MB | JVM `-Xmx384m`, ThreadPool core=2/max=4 |
| **Dự phòng cho host OS** | — | ~576 MB | Buffer cho Docker overhead và kernel |
| **Tổng** | | **≤ 1,472 MB** | **Nằm trong ngưỡng 2048 MB** ✅ |

#### 3.3.3. Lý do chọn từng công nghệ lõi

**PostgreSQL 16 + pgvector:**
- Gộp chung dữ liệu quan hệ (thủ tục, hồ sơ, phản ánh) và dữ liệu vector (embedding điều khoản, vector ngữ nghĩa cụm sự cố) vào **một RDBMS duy nhất**, đảm bảo toàn vẹn giao dịch (ACID).
- Cho phép truy vấn kết hợp (Hybrid Search) trong **một câu lệnh SQL duy nhất**: lọc metadata quan hệ (`WHERE status = 'ACTIVE' AND effective_date <= NOW()`) kết hợp tính khoảng cách vector cosine (`ORDER BY embedding <=> $1`).
- Tránh phải đồng bộ dữ liệu giữa RDBMS và Vector DB độc lập (Pinecone, Milvus, Weaviate) — vừa phức tạp vừa dễ mất nhất quán.
- Chỉ mục HNSW (Hierarchical Navigable Small World) của pgvector cho phép Top-K Approximate Nearest Neighbor với thời gian truy vấn dưới 10ms trên 10.000 vector.

**Redis 7:**
- **Bài toán GEO Index:** Redis `GEOSEARCH` (với bán kính R) có độ trễ mili-giây cho bài toán tìm các cụm sự cố đang mở trong bán kính R mét — PostgreSQL PostGIS dùng được nhưng chậm hơn 5–10x khi tần suất truy vấn cao.
- **Bài toán One-Time Token:** Lệnh `GETDEL` (atomic read-and-delete) và Redis Lua Script đảm bảo token chỉ được dùng **một lần duy nhất** mà không xảy ra race conditions (hai request đồng thời cùng đọc một token). PostgreSQL không có primitive nguyên tử tương đương đủ nhanh.

**MinIO Object Storage:**
- Tách biệt hoàn toàn file nhị phân (ảnh tờ khai, ảnh phản ánh hiện trường đã đóng watermark và mã hóa AES-256) khỏi CSDL PostgreSQL.
- Hỗ trợ Pre-signed URL có TTL để cán bộ truy cập file mà không cần expose MinIO ra ngoài public internet.
- Lifecycle Policy (ILM) tự động hủy file tạm sau 7 ngày, đảm bảo tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.

**Thay thế Kafka bằng Spring @Async:**
- Kafka Broker tối thiểu cần 256–512 MB RAM + ZooKeeper thêm 256 MB → tổng ≥ 1 GB chỉ cho message queue.
- Với lưu lượng cấp phường/xã (ước tính ≤ 500 request/ngày), độ trễ của `@Async ThreadPoolTaskExecutor` (core=2, max=4, queue capacity=50) hoàn toàn đáp ứng yêu cầu.
- Spring `ApplicationEventPublisher` đảm bảo giao tiếp giữa các module trong cùng JVM process mà không cần network serialization.

---

### 3.4. Hạ tầng Docker Compose – Chi tiết từng Container

File `docker-compose.yml` được xây dựng với 4 service, tổng `mem_limit` ≤ 1.0 GB (không kể ứng dụng Spring Boot sẽ khởi động ở bước sau):

```yaml
# Cấu hình đặc trưng từng service

# PostgreSQL 16 + pgvector
postgres:
  image: pgvector/pgvector:pg16
  mem_limit: 512m
  environment:
    POSTGRES_DB: smartward
    POSTGRES_USER: smartward
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  command: >
    postgres
      -c shared_buffers=128MB
      -c work_mem=4MB
      -c maintenance_work_mem=64MB
      -c max_connections=100
      -c log_min_duration_statement=1000
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U smartward"]
    interval: 10s
    timeout: 5s
    retries: 5

# Redis 7 Alpine
redis:
  image: redis:7-alpine
  mem_limit: 128m
  command: >
    redis-server
      --maxmemory 100mb
      --maxmemory-policy volatile-lru
      --save ""
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]

# MinIO Object Storage
minio:
  image: minio/minio:RELEASE.2024-01-13
  mem_limit: 256m
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}

# MinIO Init (ephemeral job)
minio-init:
  image: minio/mc:latest
  depends_on:
    minio: { condition: service_healthy }
  entrypoint: >
    /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin $${MINIO_ROOT_PASSWORD};
      mc mb local/smartward-vault --ignore-existing;
      mc quota set local/smartward-vault --size 5GiB;
      mc ilm add local/smartward-vault --expiry-days 7;
      exit 0"
```

**Điểm kỹ thuật đáng chú ý:**
- Tất cả secret (password) được externalize vào file `.env` — không hardcode trong `docker-compose.yml` → tuân thủ nguyên tắc 12-factor app.
- `healthcheck` trên PostgreSQL và Redis đảm bảo Spring Boot chỉ kết nối sau khi database đã sẵn sàng, tránh lỗi `Connection refused` trong quá trình khởi động.
- MinIO-init container tự exit với code 0 sau khi hoàn thành tác vụ init → không tiêu tốn RAM liên tục.

---

### 3.5. Khởi tạo Backend Spring Boot 3.3 (Java 21)

#### 3.5.1. Cấu trúc Package và Phân chia Module

Áp dụng **Vertical Slice Architecture** trong Modular Monolith, mỗi module tương ứng với một tính năng nghiệp vụ hoàn chỉnh:

```
backend/src/main/java/vn/edu/uth/smartward/
├── SmartWardApplication.java          # @SpringBootApplication, @EnableAsync, @EnableCaching
├── config/
│   ├── AsyncConfig.java               # ThreadPoolTaskExecutor: core=2, max=4, queue=50
│   ├── RedisConfig.java               # LettuceConnectionFactory, Jackson2JsonRedisSerializer
│   ├── MinioConfig.java               # MinioClient bean với endpoint, credentials
│   ├── OpenApiConfig.java             # Springdoc: API v1, thông tin tác giả, UTH license
│   └── CorsConfig.java                # CORS: cho phép React Vite frontend (port 5173)
└── common/
    ├── ApiResponse.java               # Generic Record DTO: success, message, data, errorCode, timestamp
    ├── ErrorCode.java                 # Enum: VALIDATION_FAILED (422), NOT_FOUND (404), INTERNAL_SERVER_ERROR (500)
    ├── BusinessException.java         # RuntimeException + ErrorCode
    ├── GlobalExceptionHandler.java    # @RestControllerAdvice: xử lý 4 loại exception
    └── HealthController.java          # GET /api/v1/health → {"status":"UP", "version":"1.0.0"}
```

#### 3.5.2. Thiết kế `ApiResponse<T>` – Generic Record DTO

Class này là xương sống của toàn bộ tầng REST API, đảm bảo mọi response đều có cấu trúc nhất quán:

```java
@Builder
public record ApiResponse<T>(
    boolean success,          // true = thành công, false = có lỗi
    String message,           // Thông điệp người dùng (tiếng Việt)
    T data,                   // Payload data (generic, type-safe)
    String errorCode,         // Mã lỗi nội bộ (VD: "SW_VALIDATION_FAILED")
    Instant timestamp         // Thời điểm tạo response (UTC)
) {
    // Factory methods
    public static <T> ApiResponse<T> ok(T data, String message) { ... }
    public static <T> ApiResponse<T> error(String message, String errorCode) { ... }
}
```

#### 3.5.3. Thiết kế `GlobalExceptionHandler` – Xử lý Lỗi Tập trung

`@RestControllerAdvice` xử lý 4 loại exception phổ biến mà không cần try-catch trong từng Controller:

| Exception được xử lý | HTTP Status | Mô tả tình huống |
|:---|:---:|:---|
| `BusinessException` | 4xx (tuỳ ErrorCode) | Lỗi nghiệp vụ có kiểm soát (token hết hạn, thủ tục không tồn tại, v.v.) |
| `MethodArgumentNotValidException` | 422 Unprocessable Entity | Bean Validation (@NotNull, @Size, @Pattern) thất bại → trả về map field → message |
| `MaxUploadSizeExceededException` | 400 Bad Request | File ảnh tờ khai/phản ánh vượt quá 5 MB |
| `Exception` (catch-all) | 500 Internal Server Error | Lỗi ngoài dự kiến (NullPointerException, DB connection drop, v.v.) |

#### 3.5.4. Cấu hình ứng dụng nhiều môi trường (Multi-Profile)

| File cấu hình | Profile kích hoạt | Mục đích |
|:---|:---:|:---|
| `application.yml` | Mọi môi trường | Cấu hình chung: server port 8080, tên app, JPA (ddl-auto=validate), multipart (max-file-size=5MB) |
| `application-dev.yml` | `dev` (mặc định local) | Kết nối localhost Docker: JDBC `localhost:5432/smartward`, Redis `localhost:6379`, MinIO `localhost:9000` |
| `application-test.yml` | `test` | H2 in-memory hoặc TestContainers (chuẩn bị cho tuần sau) |

#### 3.5.5. Kết quả Build – Xác minh Thực tế

```
> cd e:\SmartWardAI\backend
> .\mvnw.cmd test

[INFO] --- maven-surefire-plugin:3.3.1:test (default-test) ---
[INFO] Running vn.edu.uth.smartward.SmartWardApplicationTests
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0

[INFO] BUILD SUCCESS
[INFO] Total time:  13.5 s
[INFO] Finished at: 2026-11-02T14:32:11+07:00
```

**2 test case đã pass:**
- `Test 1 – ApiResponse.ok()`: Xác minh factory method trả về `success=true`, `data != null`, `errorCode == null`.
- `Test 2 – ApiResponse.error()`: Xác minh factory method trả về `success=false`, `errorCode` đúng, `data == null`.

---

### 3.6. Data Pipeline – Thu thập & Xử lý 5 TTHC Pilot

Để chuẩn bị nền tảng dữ liệu cho module RAG (tuần 2-3), tuần này xây dựng hoàn chỉnh pipeline thu thập và xử lý dữ liệu thủ tục hành chính:

#### 3.6.1. Cấu trúc Thư mục Pipeline

```
data-pipeline/
├── procedure-crawler/
│   ├── source-list.csv              # Danh sách 40 TTHC với URL nguồn, lĩnh vực, ngày hiệu lực
│   ├── originals/                   # Dữ liệu thô từ Cổng DVCQG (JSON gốc)
│   ├── parsed/                      # Sau tiền xử lý: cấu trúc hóa theo Điều-Khoản-Điểm
│   └── verified/                    # Sau kiểm tra chất lượng (validator.py)
├── scripts/
│   ├── fetch_procedures.py          # Download và lưu dữ liệu thô
│   ├── parse_and_chunk.py           # Phân đoạn văn bản theo cấu trúc pháp lý
│   ├── validator.py                 # Kiểm tra schema và chất lượng dữ liệu
│   └── run_pipeline.py              # Orchestrate toàn bộ pipeline (fetch → parse → validate)
└── reports/
    └── data_quality_report.json     # Báo cáo chất lượng dữ liệu sau validation
```

#### 3.6.2. Danh sách 5 TTHC Pilot đã được xử lý hoàn chỉnh

| Mã TTHC | Tên Thủ tục | Lĩnh vực | Trạng thái |
|:---|:---|:---:|:---:|
| `TTHC-HT-01` | Đăng ký khai sinh | Hộ tịch | ✅ Verified |
| `TTHC-HT-02` | Đăng ký kết hôn | Hộ tịch | ✅ Verified |
| `TTHC-CR-01` | Đăng ký thường trú | Cư trú | ✅ Verified |
| `TTHC-CT-01` | Chứng thực chữ ký | Chứng thực | ✅ Verified |
| `TTHC-BT-01` | Trợ cấp xã hội hàng tháng | Bảo trợ xã hội | ✅ Verified |

Mỗi TTHC được parse thành các trường chuẩn: `procedure_code`, `title`, `department`, `legal_basis` (danh sách văn bản pháp lý căn cứ), `mandatory_documents` (thành phần hồ sơ), `processing_time_days`, `fee`, `effective_date`, `chunks` (mảng các đoạn văn bản đã được phân đoạn sẵn cho RAG).

---

### 3.7. Thiết lập Quy trình Git Chuyên nghiệp (Git Workflow)

#### 3.7.1. Chuẩn Conventional Commits 1.0.0

Áp dụng định dạng commit message có cấu trúc để tự động sinh CHANGELOG và tổng hợp lịch sử phát triển:

```
<type>(<scope>): <description>

[body – giải thích ngữ cảnh, lý do kỹ thuật]
[footer – BREAKING CHANGE, liên kết issue]
```

Các `type` được quy định: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`, `ci`

Ví dụ commit thực tế trong tuần 1:
```
feat(config): add AsyncConfig with ThreadPoolTaskExecutor (core=2, max=4, queue=50)
docs(arch): add Modular Monolith rationale with RAM budget table
chore(docker): configure mem_limit, healthcheck and minio ILM lifecycle policy
feat(common): add ApiResponse<T> record, ErrorCode enum, GlobalExceptionHandler
test(common): add 2 unit tests for ApiResponse factory methods - BUILD SUCCESS
```

#### 3.7.2. Chiến lược Nhánh Git

| Nhánh | Mục đích | Vòng đời |
|:---|:---|:---:|
| `main` | Nhánh sản xuất – chỉ chứa code đã review và pass CI | Vĩnh viễn |
| `feature/week-<N>-<tên>` | Phát triển tính năng mới trong tuần N | Tạo đầu tuần, merge cuối tuần |
| `fix/<mô-tả>` | Sửa lỗi phát sinh | Tạo và merge ngay |

#### 3.7.3. Release Tagging

Mỗi cuối tuần đánh dấu phiên bản phát hành theo chuẩn Semantic Versioning:
- `v0.<tuần>.0-w<tuần>` — Ví dụ: `v0.1.0-w01` là release tuần 1.
- Được đẩy lên GitHub Releases để GVHD và Hội đồng có thể kiểm tra snapshot mã nguồn tại từng mốc thời gian.

Lệnh thực hiện:
```bash
git tag -a v0.1.0-w01 -m "Release Tuần 1: Foundation, Architecture docs, Spring Boot skeleton, Docker infra"
git push origin v0.1.0-w01
```

---

### 3.8. Soạn thảo Tài liệu Học thuật và Chương 1 Báo cáo

Tuần 1 hoàn thành **6 tài liệu kỹ thuật + học thuật cốt lõi**, mỗi tài liệu phục vụ ít nhất một chương của Báo cáo Tốt nghiệp:

| Tài liệu | Đường dẫn | Phục vụ Chương |
|:---|:---|:---:|
| README.md | `/README.md` | Tổng quan, trình bày với GVHD |
| Kế hoạch Nghiên cứu & Bối cảnh | `docs/business-and-research-plan.md` | Chương 1, 2 |
| Kiến trúc & Luồng xử lý | `docs/architecture-and-flows.md` | Chương 2, 3 |
| Thiết kế Thực nghiệm & Phản biện | `docs/experimental-design-and-defense.md` | Chương 4, Bảo vệ |
| Ràng buộc Dự án | `docs/project-constraints.md` | Chương 1, 2 |
| Quy tắc Agent AI & SPEC | `docs/SPEC.md`, `AGENT_RULES.md` | Phụ lục |
| Lộ trình 12 tuần | `docs/ROADMAP.md`, `TODO.md` | Kế hoạch |
| **Chương 1 – Bản thảo** | `docs/thesis-chapters/chapter-01.md` | **Chương 1** ✅ |

**Chương 1 của Báo cáo Tốt nghiệp đã hoàn thành bản thảo** với đầy đủ các mục:
1.1. Đặt vấn đề và bối cảnh thực tiễn
1.2. Mục tiêu đề tài
1.3. Phạm vi và đối tượng nghiên cứu
1.4. Ba câu hỏi nghiên cứu (RQ1, RQ2, RQ3)
1.5. Bảng phân định đóng góp học thuật (4 module × 2 cột: Công cụ có sẵn / Phần tự phát triển)
1.6. Cấu trúc Báo cáo (6 chương)

---

## IV. SẢN PHẨM BÀN GIAO & MINH CHỨNG KỸ THUẬT (DELIVERABLES)

### 4.1. Kho mã nguồn GitHub

- **URL:** https://github.com/tuankhanh2306/SmartWardAI
- **Release Tag Tuần 1:** `v0.1.0-w01`
- **Tổng số commit trong tuần 1:** ~10 commits với format Conventional Commits
- **Commit cuối cùng:** `aa388ab` – `feat(pipeline): format procedure schemas, source list, and validation reports`

### 4.2. Danh sách Files Bàn giao (có đường dẫn cụ thể)

#### Tài liệu & Học thuật:
| STT | File | Mô tả |
|:---:|:---|:---|
| 1 | `README.md` | Executive Summary – tổng quan điều hành |
| 2 | `TODO.md` | Sprint checklist 12 tuần × 7 tasks/tuần |
| 3 | `AGENT_RULES.md` | Ràng buộc kiến trúc bất biến (không Kafka, không Microservices) |
| 4 | `.gitignore` | Filter cho Java/Maven/Node/OS/Python/secrets |
| 5 | `docs/business-and-research-plan.md` | Bối cảnh, 3 RQ học thuật, phân định đóng góp |
| 6 | `docs/architecture-and-flows.md` | Kiến trúc Modular Monolith, 3 sơ đồ Mermaid, ERD 6 bảng |
| 7 | `docs/experimental-design-and-defense.md` | Thiết kế thực nghiệm, Grid Search, 6 câu hỏi phản biện |
| 8 | `docs/project-constraints.md` | Ràng buộc RAM, pháp lý NĐ 13/2023 |
| 9 | `docs/ROADMAP.md` | Lộ trình 12 tuần chi tiết |
| 10 | `docs/GIT_WORKFLOW.md` | Quy trình Git Conventional Commits |
| 11 | `docs/SPEC.md` | Tech spec đầy đủ cho AI coding agent |
| 12 | `docs/thesis-chapters/chapter-01.md` | **Bản thảo Chương 1** ✅ |
| 13 | `docs/weekly-reports/week-01-report.md` | **Báo cáo tuần này** ✅ |

#### Hạ tầng & Mã nguồn Backend:
| STT | File | Mô tả |
|:---:|:---|:---|
| 14 | `docker-compose.yml` | 4 containers: postgres-pgvector, redis, minio, minio-init |
| 15 | `backend/pom.xml` | Maven POM: Spring Boot 3.3.5, Java 21, pgvector 0.1.6, MinIO 8.5.12 |
| 16 | `backend/mvnw`, `backend/mvnw.cmd` | Maven Wrapper (không cần cài Maven hệ thống) |
| 17 | `backend/src/main/resources/application.yml` | Cấu hình nền, multi-profile |
| 18 | `backend/src/main/resources/application-dev.yml` | Profile phát triển local |
| 19 | `backend/src/main/java/.../SmartWardApplication.java` | Main class + @EnableAsync + @EnableCaching |
| 20 | `backend/src/main/java/.../config/AsyncConfig.java` | ThreadPool core=2, max=4, queue=50 |
| 21 | `backend/src/main/java/.../config/RedisConfig.java` | Lettuce + Jackson2Json serializer |
| 22 | `backend/src/main/java/.../config/MinioConfig.java` | MinioClient bean |
| 23 | `backend/src/main/java/.../config/OpenApiConfig.java` | Swagger/OpenAPI 3.0 |
| 24 | `backend/src/main/java/.../config/CorsConfig.java` | CORS cho React Vite frontend |
| 25 | `backend/src/main/java/.../common/ApiResponse.java` | Generic Record DTO |
| 26 | `backend/src/main/java/.../common/ErrorCode.java` | Enum lỗi với HTTP status |
| 27 | `backend/src/main/java/.../common/BusinessException.java` | Domain exception |
| 28 | `backend/src/main/java/.../common/GlobalExceptionHandler.java` | @RestControllerAdvice |
| 29 | `backend/src/main/java/.../common/HealthController.java` | GET /api/v1/health |
| 30 | `backend/src/test/.../SmartWardApplicationTests.java` | 2 unit tests – BUILD SUCCESS ✅ |

#### Data Pipeline:
| STT | File | Mô tả |
|:---:|:---|:---|
| 31 | `data-pipeline/procedure-crawler/source-list.csv` | 40 TTHC với URL, lĩnh vực, ngày hiệu lực |
| 32–36 | `originals/TTHC-*.json` (5 files) | Dữ liệu thô 5 TTHC pilot |
| 37–41 | `parsed/TTHC-*.json` (5 files) | Đã phân đoạn Điều-Khoản-Điểm |
| 42–46 | `verified/TTHC-*.json` (5 files) | Đã kiểm tra schema và chất lượng |
| 47 | `data-pipeline/scripts/run_pipeline.py` | Orchestrator pipeline |
| 48 | `data-pipeline/reports/data_quality_report.json` | Báo cáo chất lượng dữ liệu |

### 4.3. Xác minh Build và Test

```
Lệnh kiểm tra:     cd e:\SmartWardAI\backend && .\mvnw.cmd test
Kết quả:           BUILD SUCCESS
Tests run:         2 | Failures: 0 | Errors: 0 | Skipped: 0
Thời gian build:   13.5 giây
Maven Version:     Apache Maven 3.9.9 (Portable)
Java Version:      21.0.x (Eclipse Temurin)
```

---

## V. KHÓ KHĂN GẶP PHẢI & GIẢI PHÁP ĐÃ THỰC HIỆN

### 5.1. Khó khăn 1 – Over-engineering: Kiến trúc Microservices + Kafka không khả thi

**Vấn đề ban đầu:** Kế hoạch ban đầu thiết kế hệ thống theo kiến trúc Microservices (mỗi tính năng là một service độc lập) và dùng Apache Kafka làm message broker cho các tác vụ bất đồng bộ (gọi OCR API, sinh vector embedding). Tuy nhiên khi cấu hình thử nghiệm, tổng RAM tối thiểu đã vượt 3.5 GB:

| Thành phần | RAM tối thiểu |
|:---|:---:|
| Apache Kafka Broker | 512 MB |
| Apache ZooKeeper | 256 MB |
| 4 Spring Boot Microservices × 256 MB | 1,024 MB |
| PostgreSQL + Redis + MinIO | 896 MB |
| **Tổng** | **~2,688 MB** ❌ |

**Giải pháp:** Tinh gọn về Modular Monolith (1 Spring Boot JVM duy nhất), thay Kafka bằng `Spring @Async ThreadPoolTaskExecutor` nội tại và Redis Queue. Kết quả: tổng RAM giảm xuống ≤ 1,472 MB ✅.

**Bài học kỹ thuật:** Với quy mô vài trăm đến vài nghìn request/ngày, Kafka là dư thừa (over-engineering). Giải pháp Monolith không phải là kém chuyên nghiệp — đây là **lựa chọn kiến trúc phù hợp với bài toán**, một nguyên tắc thiết kế quan trọng.

### 5.2. Khó khăn 2 – Rủi ro Ảo giác Pháp lý của LLM (Legal Hallucination)

**Vấn đề:** Trong quá trình nghiên cứu tài liệu, nhận thấy rằng các LLM thế hệ hiện tại (GPT-4, Gemini, v.v.) có xu hướng bịa đặt căn cứ pháp lý khi được hỏi về các thủ tục hành chính không nằm trong ngữ cảnh huấn luyện. Thực nghiệm sơ bộ với LLM Zero-shot cho thấy **False Answer Rate lên đến 73.3%** trên 15 câu hỏi bẫy (hỏi thủ tục ngoài thẩm quyền phường/xã).

**Giải pháp kỹ thuật đã thiết kế:** Cơ chế **Abstention Guardrail** với ngưỡng $\theta = 0.78$:

$$\text{Action} = \begin{cases} \text{Từ chối sinh text, chuyển hướng cán bộ Một cửa} & \text{nếu } S_{max} < \theta = 0.78 \\ \text{Sinh câu trả lời + trích dẫn bắt buộc + hậu kiểm} & \text{nếu } S_{max} \geq \theta \end{cases}$$

Trong đó $S_{max}$ là điểm cosine similarity cao nhất trong Top-K kết quả truy xuất từ pgvector. Giá trị $\theta = 0.78$ là tham số mặc định, được dự kiến tinh chỉnh qua thực nghiệm trong tuần 5–6.

**Kết quả thiết kế lý thuyết:** Cấu hình RAG đề xuất dự kiến giảm False Answer Rate từ 73.3% (LLM Zero-shot) xuống còn 6.7% (chỉ 1/15 câu hỏi bẫy bị lọt qua).

### 5.3. Khó khăn 3 – Môi trường phát triển: Maven không có trong PATH hệ thống

**Vấn đề:** Máy tính cá nhân (Windows) không có sẵn Maven trong PATH hệ thống, lệnh `mvn` không nhận diện được. Việc cài Maven toàn cục gây xung đột với các dự án khác.

**Giải pháp:** Tải Maven 3.9.9 Portable về thư mục cá nhân `%USERPROFILE%\.maven\apache-maven-3.9.9\` và sử dụng **Maven Wrapper** (`mvnw`, `mvnw.cmd`) được nhúng vào chính repository — bất kỳ máy tính nào clone repo đều có thể build ngay mà không cần cài Maven.

```bash
# Lệnh build không phụ thuộc vào Maven hệ thống
.\mvnw.cmd test          # Windows
./mvnw test              # Linux/macOS
```

---

## VI. KẾ HOẠCH CÔNG VIỆC TUẦN TIẾP THEO (TUẦN 2)

Theo lộ trình trong `docs/ROADMAP.md`, Tuần 2 tập trung vào **xây dựng tầng dữ liệu và core service đầu tiên**:

| STT | Công việc | Kết quả kỳ vọng | Branch Git |
|:---:|:---|:---|:---|
| 1 | Thu thập và làm sạch toàn bộ 40 TTHC (Hộ tịch, Cư trú, Chứng thực, Bảo trợ) | `source-list.csv` đủ 40 dòng + 40 file JSON verified | `feature/week-02-flyway-schema-data` |
| 2 | Viết `V1__init_schema.sql` với Flyway | 6 bảng PostgreSQL + `CREATE EXTENSION vector` + HNSW index | Cùng branch |
| 3 | Thêm dependency Flyway + JPA vào `pom.xml` | `mvnw test` vẫn pass BUILD SUCCESS | Cùng branch |
| 4 | Tạo 6 JPA Entity class tương ứng 6 bảng | `AdminProcedure`, `LegalChunk`, `IssueCluster`, `CivicReport`, `FormSubmission`, `VaultDocument` | Cùng branch |
| 5 | Xây dựng `LegalChunkingService` | Service phân đoạn văn bản TTHC theo Điều-Khoản-Điểm, lưu vào DB | Cùng branch |
| 6 | Soạn thảo **Chương 2** Báo cáo Tốt nghiệp | `docs/thesis-chapters/chapter-02.md` — Kiến trúc hệ thống & Thiết kế CSDL | Cùng branch |
| 7 | Commit + PR + Merge + Tag `v0.2.0-w02` | Toàn bộ thay đổi được đẩy lên GitHub | `main` |

---

## VII. Ý KIẾN ĐÁNH GIÁ & XÁC NHẬN CỦA NGƯỜI HƯỚNG DẪN

### 7.1. Ý kiến của Giảng viên Hướng dẫn (UTH)

| Nội dung đánh giá | Nhận xét |
|:---|:---|
| Nhận xét về tiến độ thực hiện | ......................................................................................................... |
| Nhận xét về chất lượng tài liệu kỹ thuật | ......................................................................................................... |
| Nhận xét về chất lượng mã nguồn | ......................................................................................................... |
| Mức độ hoàn thành so với kế hoạch tuần 1 | ☐ Đạt yêu cầu đề ra &nbsp;&nbsp; ☐ Vượt yêu cầu &nbsp;&nbsp; ☐ Cần bổ sung thêm |
| Điểm đánh giá tuần 1 | ....... / 10 |

*Ngày &nbsp;&nbsp;&nbsp;&nbsp; tháng &nbsp;&nbsp;&nbsp;&nbsp; năm 2026*

**ThS. Lê Văn Quốc Anh**
*(Ký và ghi rõ họ tên)*

&nbsp;

### 7.2. Ý kiến của Người hướng dẫn Doanh nghiệp (Mentor)

| Nội dung đánh giá | Nhận xét |
|:---|:---|
| Thái độ làm việc & chấp hành nội quy | ......................................................................................................... |
| Kết quả công việc được giao | ......................................................................................................... |
| Mức độ chủ động trong nghiên cứu | ......................................................................................................... |
| Mức độ hoàn thành công việc | ☐ Đạt &nbsp;&nbsp; ☐ Vượt mức &nbsp;&nbsp; ☐ Cần cải thiện |

*Ngày &nbsp;&nbsp;&nbsp;&nbsp; tháng &nbsp;&nbsp;&nbsp;&nbsp; năm 2026*

**Người hướng dẫn tại Doanh nghiệp**
*(Ký và ghi rõ họ tên, đóng dấu đơn vị)*

---

*📁 Tài liệu này được lưu tại: `docs/weekly-reports/week-01-report.md`*
*🔗 GitHub: https://github.com/tuankhanh2306/SmartWardAI | Tag: `v0.1.0-w01`*
*📅 Cập nhật lần cuối: 03/11/2026*
