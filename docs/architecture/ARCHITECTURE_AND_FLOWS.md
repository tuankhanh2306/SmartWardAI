# Kiến trúc Hệ thống, Luồng Xử lý & Cơ sở Dữ liệu
**Dự án:** SmartWard AI (Civic Governance & Legal RAG Platform)  
**Tài liệu tham khảo cho:** Báo cáo Học kỳ Doanh nghiệp & Đồ án Tốt nghiệp (Chương 2 & Chương 3)

---

## 1. Lý giải Lựa chọn Công nghệ (Tránh Over-engineering)

Trong quy mô đồ án tốt nghiệp và giai đoạn thực tập 3 tháng do 1 sinh viên thực hiện, kiến trúc hệ thống được tinh gọn thành **Modular Monolith** thay vì Microservices hay phân tán phức tạp:

* **Vì sao không dùng Apache Kafka?**  
  Với lưu lượng cấp phường/xã (vài trăm đến vài nghìn yêu cầu/ngày), việc duy trì và vận hành một cụm Kafka là dư thừa tài nguyên (Over-engineering) và tiêu tốn tối thiểu 1–2 GB RAM. Hệ thống tận dụng cơ chế `Spring ApplicationEvents` kết hợp `@Async ThreadPoolExecutor` và hàng đợi nhẹ trên Redis để xử lý các tác vụ nền (như gọi OCR API, sinh vector embedding) mà vẫn đảm bảo giao diện phản hồi mượt mà không bị block.
* **Vì sao chọn Web-First Responsive / PWA thay vì phát triển thêm Native Mobile App?**  
  Người dân khi đến làm thủ tục hành chính tại UBND rất ngại cài đặt thêm ứng dụng di động mới lên điện thoại cá nhân. Thay vào đó, giải pháp Web Responsive / PWA cho phép người dân chỉ cần quét mã QR tại quầy Một cửa để mở ứng dụng ngay trên trình duyệt di động: tận dụng trực tiếp HTML5 Camera API để chụp tờ khai và Geolocation API để bắt tọa độ GPS sự cố hiện trường mà không cần cài đặt. Điều này vừa tối ưu hóa trải nghiệm tiếp cận dịch vụ công, vừa loại bỏ rủi ro vỡ tiến độ khi 1 sinh viên phải duy trì 2 codebase giao diện độc lập trong 12 tuần (phân hệ Native App được quy hoạch là hướng phát triển mở rộng trong tương lai).
* **Vì sao dùng PostgreSQL kèm pgvector?**  
  Gộp chung dữ liệu quan hệ (thông tin thủ tục, hồ sơ, phản ánh hiện trường, người dùng) và dữ liệu vector (embedding điều khoản pháp luật, vector mô tả sự cố) vào cùng một hệ quản trị CSDL giúp đảm bảo toàn vẹn giao dịch (ACID). Điều này cho phép thực hiện các truy vấn kết hợp (Hybrid Search: lọc metadata SQL kết hợp đo khoảng cách cosine) trong một câu lệnh duy nhất mà không cần đồng bộ dữ liệu sang một Vector DB độc lập (như Milvus hay Pinecone).
* **Vì sao dùng Redis?**  
  Redis giải quyết hai bài toán chuyên biệt mà SQL truyền thống xử lý chậm hơn khi tần suất cao:  
  1. Truy vấn bán kính địa lý (`GEOSEARCH`) với độ trễ mili-giây.  
  2. Thao tác kiểm tra và xóa token truy cập một cách nguyên tử (`GETDEL` hoặc Redis Lua Script) để triển khai cơ chế kho tài liệu một lần xem (One-Time Token Vault) chống race conditions.
* **Vì sao dùng MinIO?**  
  Tách biệt hoàn toàn việc lưu trữ tệp nhị phân (ảnh chụp tờ khai, ảnh phản ánh hiện trường) khỏi CSDL PostgreSQL, giảm kích thước backup database, hỗ trợ Pre-signed URL và tận dụng chính sách vòng đời tệp (ILM - Lifecycle Policy) tự động hủy sau 7 ngày.

---

## 2. Sơ đồ Kiến trúc Hệ thống (System Architecture Diagram)

```mermaid
graph TD
    subgraph "Tầng Giao diện (Frontend - React/Vite + TailwindCSS)"
        Citizen_UI["Cổng Công dân (Mobile-first PWA: /citizen, /citizen/form)<br/>(Hỏi đáp AI RAG, Tiền kiểm 4 tờ khai, GPS R=25m liên xã)"]
        Officer_UI["Bàn Điều hành Cán bộ 1-Dashboard (/officer/ward/:code)<br/>(Slide-Over Drawer, Gọi xác minh SĐT, Bản đồ GIS, Vault NĐ13)"]
    end

    subgraph "Tầng Ứng dụng (Spring Boot 3.3 Modular Monolith)"
        API_Layer["REST Controllers & Security Filter"]
        
        subgraph "Core Modules (Phần tự phát triển)"
            RAG_Mod["1. Legal RAG & Guardrail Module<br/>(Legal Chunking, Hybrid Retrieval, Abstention θ=0.78)"]
            Form_Mod["2. Multi-Form Validation Engine<br/>(4 nhóm: CT01, TK-KS, TK-KH, TK-BTXH + CCCD 12 số)"]
            Triage_Mod["3. Spatial-Semantic Triage Module<br/>(GPS R=25m, SĐT khẩn, Định tuyến liên xã & 2-Stage Deduplication)"]
            Vault_Mod["4. Zero-Trust Document Vault<br/>(Dynamic Watermark, AES-256, One-Time Token)"]
        end
    end

    subgraph "Tầng Dữ liệu & Tích hợp (Data & External Services)"
        PG[("PostgreSQL 16 + pgvector<br/>(Relational Data + Embeddings)")]
        RD[("Redis 7 (Max 128MB)<br/>(GEO Index + Atomic One-Time Tokens)")]
        MO[("MinIO Storage (Max 5GB)<br/>(Encrypted Files & 7-day Lifecycle)")]
        LLM["LLM & Vision OCR API<br/>(Gemini API / Local Ollama)"]
    end

    Citizen_UI --> API_Layer
    Officer_UI --> API_Layer

    API_Layer --> RAG_Mod
    API_Layer --> Form_Mod
    API_Layer --> Triage_Mod
    API_Layer --> Vault_Mod

    RAG_Mod -->|Truy vấn Top-K + Metadata| PG
    RAG_Mod -->|Sinh câu trả lời có kiểm soát| LLM

    Form_Mod -->|Trích xuất JSON thô| LLM
    Form_Mod -->|Đối chiếu quy tắc biểu mẫu| PG

    Triage_Mod -->|Pha 1: Lọc bán kính R| RD
    Triage_Mod -->|Pha 2: So khớp Cosine & Phân loại| PG

    Vault_Mod -->|Kiểm tra & Hủy Token nguyên tử| RD
    Vault_Mod -->|Lưu/Đọc ảnh đã mã hóa| MO
```

---

## 3. Sơ đồ Tuần tự cho 3 Luồng Nghiệp vụ Lõi (Sequence Diagrams)

### Luồng 1: Hỏi đáp Thủ tục Hành chính với Cơ chế Từ chối Trả lời (RAG + Abstention Guardrail)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dân
    participant API as RAGService (Spring Boot)
    participant DB as PostgreSQL (pgvector)
    participant LLM as LLM Service

    User->>API: Gửi câu hỏi thủ tục hành chính (Q)
    API->>LLM: Tạo Vector Embedding cho câu hỏi E(Q)
    API->>DB: Truy vấn Top-K đoạn văn bản (Lọc: status = 'ACTIVE' AND effective_date <= NOW())
    DB-->>API: Trả về danh sách đoạn văn + Điểm tương đồng (Cosine Similarity Score S_max)

    alt Nếu S_max < Ngưỡng từ chối θ (Không tìm thấy căn cứ rõ ràng)
        API-->>User: Từ chối trả lời tự động: "Hệ thống chưa tìm thấy văn bản pháp lý chính xác cho trường hợp này. Vui lòng liên hệ trực tiếp quầy Một cửa."
    else Nếu S_max >= θ (Có căn cứ pháp lý hợp lệ)
        API->>LLM: Gửi Prompt gồm: Câu hỏi Q + Top-K đoạn luật + Yêu cầu bắt buộc trích dẫn mã Thủ tục/Điều khoản
        LLM-->>API: Trả về câu trả lời kèm mã trích dẫn [Mã TTHC / Điều khoản]
        API->>API: Hậu kiểm (Post-verification): Kiểm tra mã trích dẫn có nằm trong Top-K đã truy xuất không
        API-->>User: Hiển thị câu trả lời + Trích dẫn văn bản gốc + Tuyên bố miễn trừ trách nhiệm
    end
```

---

### Luồng 2: Phân loại và Gom nhóm Phản ánh Hiện trường 2 Pha (Spatial-Semantic Deduplication)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dân
    participant API as IssueTriageService
    participant Redis as Redis GEO
    participant LLM as Embedding/Classifier
    participant DB as PostgreSQL (pgvector)

    User->>API: Gửi phản ánh (Mô tả T, Tọa độ GPS lat/lng, SĐT liên hệ reporterPhone, Ô vị trí addressText, Xã/Phường đích wardCode)
    API->>LLM: Trích xuất danh mục sự cố (Category C) & Tạo Vector ngữ nghĩa V(T)
    API->>Redis: Pha 1: GEOSEARCH tìm các cụm sự cố (Cluster) đang mở trong bán kính chính xác R = 25m
    Redis-->>API: Danh sách Cluster_ID ứng viên trong bán kính R = 25m

    alt Không có Cluster nào trong bán kính R = 25m
        API->>DB: Tạo Cluster sự cố mới (Master Issue) + Lưu phản ánh kèm SĐT & Xã/Phường đích
        API->>Redis: GEOADD tọa độ Cluster mới vào Redis
    else Có danh sách Cluster ứng viên trong bán kính R = 25m
        API->>DB: Pha 2: Tính Cosine Similarity giữa V(T) và Vector tâm của các Cluster ứng viên CÙNG danh mục C
        DB-->>API: Trả về Cluster có độ tương đồng cao nhất (Sim_max)
        alt Nếu cùng danh mục C VÀ Sim_max >= Ngưỡng ngữ nghĩa τ (0.82)
            API->>DB: Gộp phản ánh vào Cluster sẵn có + Tăng biến đếm report_count (+1) + Cập nhật mức độ ưu tiên
        else Khác danh mục C (VD: Ổ gà vs Cháy đèn đường) HOẶC Sim_max < τ
            API->>DB: Tạo Cluster sự cố mới độc lập (Tránh gộp nhầm sự cố khác loại cùng hẻm)
            API->>Redis: GEOADD tọa độ Cluster mới vào Redis
        end
    end
    API-->>User: Trả về mã theo dõi phản ánh, Trạng thái gom nhóm (R=25m) & Đơn vị UBND Xã/Phường tiếp nhận
```

---

### Luồng 3: Tiền Kiểm Định Đa Biểu Mẫu Hành Chính (OCR + 4-Form Deterministic Rule Engine)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dân
    participant API as FormPrecheckService
    participant Vault as ZeroTrustVaultService
    participant OCR as Vision OCR / QR Scanner
    participant Rules as Multi-Form Java Rule Engine

    User->>API: Chọn 1 trong 4 nhóm tờ khai (CT01, TK-KS, TK-KH, TK-BTXH) + Tải ảnh / Quét QR CCCD / Nhập liệu
    API->>OCR: Trích xuất các trường văn bản từ tờ khai hoặc chuỗi QR CCCD sang cấu trúc JSON
    OCR-->>API: JSON các trường đã nhận diện + Điểm độ tin cậy nhận diện (Confidence Score)
    API->>Rules: Chạy bộ quy tắc kiểm tra logic tất định theo từng biểu mẫu:
    Note right of Rules: 1. CT01: Cấu trúc 12 số CCCD (Mã tỉnh, thế kỷ/giới tính, năm sinh) & ý kiến chủ hộ<br/>2. TK-KS: Đối chiếu chéo Tờ khai vs Giấy chứng sinh (Ngày sinh trẻ, Họ tên mẹ) & tình trạng hôn nhân cha mẹ<br/>3. TK-KH: Tuổi kết hôn hợp pháp tính đến từng ngày (Nam >= 20, Nữ >= 18) & chặn mục đích xác nhận độc thân chung chung<br/>4. TK-BTXH: Tuổi người cao tuổi >= 80 / mức độ khuyết tật & số tài khoản ngân hàng nhận trợ cấp Đề án 06
    Rules-->>API: Danh sách lỗi phát hiện (ValidationIssues) & Hướng dẫn sửa chi tiết
    
    opt Nếu người dân chọn gửi kèm giấy tờ để cán bộ xem trước
        API->>Vault: Đóng dấu mờ (Watermark) + Mã hóa AES-256 lưu vào MinIO + Tạo One-Time Token trên Redis
    end
    API-->>User: Hiển thị kết quả kiểm tra từng trường (Đạt / Lỗi cần sửa trước khi đi nộp)
```

---

## 4. Thiết kế Cơ sở Dữ liệu (ERD - 6 Bảng Cốt lõi trên PostgreSQL)

```mermaid
erDiagram
    ADMIN_PROCEDURES ||--o{ LEGAL_CHUNKS : "phân đoạn thành"
    ADMIN_PROCEDURES ||--o{ FORM_SUBMISSIONS : "áp dụng quy tắc cho"
    ISSUE_CLUSTERS ||--o{ CIVIC_REPORTS : "gom nhóm"
    FORM_SUBMISSIONS ||--o{ VAULT_DOCUMENTS : "đính kèm"

    ADMIN_PROCEDURES {
        uuid id PK
        varchar procedure_code UK "Mã TTHC Quốc gia"
        varchar title "Tên thủ tục hành chính"
        varchar department "Lĩnh vực: Hộ tịch, Cư trú, Đất đai..."
        jsonb mandatory_fields_schema "Quy tắc các trường bắt buộc & Regex"
        date effective_date "Ngày bắt đầu hiệu lực"
        varchar status "ACTIVE, SUPERSEDED"
    }

    LEGAL_CHUNKS {
        uuid id PK
        uuid procedure_id FK
        varchar legal_reference "Số hiệu văn bản, Điều, Khoản"
        text content "Nội dung điều khoản đã làm sạch"
        vector embedding "Vector 768 chiều (pgvector)"
        date updated_at
    }

    ISSUE_CLUSTERS {
        uuid id PK
        varchar category "INFRASTRUCTURE, ENVIRONMENT, SECURITY, LIGHTING"
        varchar summary_title "Tóm tắt cụm sự cố"
        double center_lat "Vĩ độ tâm cụm"
        double center_lng "Kinh độ tâm cụm"
        vector centroid_embedding "Vector ngữ nghĩa đại diện"
        int report_count "Số lượng người dân cùng báo cáo"
        varchar status "OPEN, IN_PROGRESS, RESOLVED"
        timestamp created_at
    }

    CIVIC_REPORTS {
        uuid id PK
        uuid cluster_id FK
        text raw_description "Nội dung người dân mô tả"
        double lat "Vĩ độ GPS gửi lên"
        double lng "Kinh độ GPS gửi lên"
        double similarity_score "Điểm tương đồng lúc gộp"
        varchar image_object_key "Đường dẫn ảnh trên MinIO"
        timestamp reported_at
    }

    FORM_SUBMISSIONS {
        uuid id PK
        uuid procedure_id FK
        jsonb extracted_fields "Dữ liệu trích xuất từ tờ khai"
        jsonb validation_errors "Danh sách lỗi do Rule Engine phát hiện"
        boolean is_valid "Kết quả kiểm tra sơ bộ"
        timestamp checked_at
    }

    VAULT_DOCUMENTS {
        uuid id PK
        uuid submission_id FK
        varchar token_hash UK "Băm SHA-256 của One-Time Token"
        varchar minio_object_key "File đã đóng watermark & mã hóa AES"
        boolean is_accessed "Trạng thái đã xem"
        timestamp expires_at "Thời điểm tự hủy (TTL)"
    }
```
