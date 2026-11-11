# Project: SmartWard AI — Hệ Thống Hỗ Trợ Rà Soát & Đối Soát TTHC Cấp Xã Chuẩn Production

## Architecture
- **Backend Architecture**: Spring Boot 3.3.5 (Java 21) REST API + PostgreSQL 16 (pgvector) + MinIO Object Storage + Redis Cache & OTT.
  - `vn.edu.uth.smartward.rag`:
    - `ProcedureController`: Cung cấp `GET /api/v1/procedures` và `GET /api/v1/procedures/{code}` truy vấn động từ bảng `admin_procedures`.
    - `ProcedureService`: Quản lý danh mục 40 TTHC sạch, lọc theo 4 nhóm lĩnh vực chuẩn cấp xã.
    - `ProcedureDataSeeder`: Nạp và đồng bộ upsert 40 file seed JSON vào `admin_procedures`, loại bỏ bản ghi trùng lặp.
    - `RagQueryService`: Xóa bỏ text hardcode trong `buildProcedureCatalogResponse()`, sinh câu trả lời danh mục động từ database.
  - `vn.edu.uth.smartward.formcheck`:
    - `FormPrecheckService`: Rà soát chuyên sâu 4 biểu mẫu cốt lõi (CT01, TK-KS, TK-KH, TK-BTXH) và động cơ OCR đối soát chéo đa loại giấy tờ (Giấy chứng sinh, Giấy báo tử, Sổ hộ nghèo/Giấy xác nhận khuyết tật, GCN QSDĐ) phân loại rõ `MATCH`, `WARNING`, `CONFLICT`.
  - `vn.edu.uth.smartward.vault`:
    - `VaultController` & `ZeroTrustVaultService`: Mã hóa AES-256-GCM, đóng dấu watermark chống sao chép, lưu MinIO, cấp One-Time Token (OTT) qua Redis với cơ chế tự hủy atomic 410 GONE theo Nghị định 13/2023/NĐ-CP.
  - `vn.edu.uth.smartward.dossier` (NEW):
    - `CitizenDossier`, `CitizenDossierRepository`, `CitizenDossierService`, `CitizenDossierController`: Quản lý vòng đời hồ sơ công dân nộp lên UBND cấp xã, tra cứu tiến độ bằng `dossier_code` + 4 số cuối CCCD, cán bộ phê duyệt tiếp nhận hoặc yêu cầu bổ sung.
  - `vn.edu.uth.smartward.security`:
    - `OfficerAuthInterceptor` & `OfficerSecurityConfig`: Sửa pattern URL sang `/api/v1/rag/hitl-queue/**`, bảo vệ các endpoint nghiệp vụ `/api/v1/forms/submissions`, `/api/v1/vault/**`, `/api/v1/dossiers/**`. Hỗ trợ alias `/api/v1/officer/login`.
- **Frontend Architecture**: React 18 + TypeScript + TailwindCSS + Vite.
  - `FormAndIssueReporting.tsx`:
    - Tích hợp bộ quét camera trực tiếp và tải ảnh giải mã QR CCCD (chuỗi 7 trường chuẩn BCA).
    - Cập nhật đầy đủ các trường và validation cho CT01, TK-KS, TK-KH (tách 2 mode), TK-BTXH (tuổi $\ge 75$).
    - Tải tài liệu qua Zero-Trust Vault API `uploadVaultDocument`.
    - Nộp hồ sơ qua API `POST /api/v1/dossiers` và tra cứu tiến độ bằng mã hồ sơ + 4 số cuối CCCD.
  - `A4DocumentModal.tsx`:
    - Xóa bỏ dữ liệu mock `NGUYỄN VĂN HÒA`, render dữ liệu thực tế từ hồ sơ/CCCD.
    - Mở rộng hỗ trợ toàn bộ danh mục TTHC: Chứng thực `CT-01..08` (lời chứng ký trực tiếp trước mặt cán bộ & người làm chứng/phiên dịch), Đất đai `DC-01/02` (Mẫu 22/25), Xây dựng `XD-01/02` (Mẫu 01), Khai tử liên thông `CR-02` (Mẫu 02), Mai táng phí `BT-02` (Mẫu 03) & Người có công, Môi trường `MT-01`.
  - `ProceduresCatalogPage.tsx`: Chuyển sang gọi API `getProcedures()` động từ backend, tích hợp Smart Checklist điều kiện và cảnh báo miễn 100% lệ phí.
  - `PerWardDashboard.tsx`: Chuyển đổi quản lý hồ sơ từ `localStorage` sang API cơ sở dữ liệu (`getOfficerDossiers`, `reviewOfficerDossier`), hiển thị ảnh xem trước tài liệu có watermark thật từ `viewVaultDocument(token)`.
  - `RoleContext.tsx` & `OfficerAuthModal.tsx`: Đồng bộ đăng nhập cán bộ với `/api/v1/officer/login`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Seed JSON Standardization | Làm sạch 40 file seed JSON: xóa 3 file trùng lặp (`BT-06`, `CR-05`, `CT-03`), sửa category cho 5 file (`CR-10`, `CT-05`, `CT-06`, `XD-01`, `XD-02`), chuẩn hóa agency cấp xã, bổ sung 3 TTHC thiếu (`HT-13`, `MT-01`, `NCC-01/BT-06`). | M1 | R1 |
| F2 | Admin Procedures REST API | Xây dựng `ProcedureController` & `ProcedureService` cung cấp `GET /api/v1/procedures` và `GET /api/v1/procedures/{code}` truy vấn từ PostgreSQL `admin_procedures`. | M1 | R1 |
| F3 | Procedure Hardcode Removal | Xóa bỏ các nguồn hardcode danh mục thủ tục lệch nhau (`RagQueryService.buildProcedureCatalogResponse()`, `intentClassifier.ts`, `proceduresCatalog.ts`, `legalKnowledgeBase.ts`). | M1 | R1 |
| F4 | Enhanced Form Precheck Engine | Bổ sung đầy đủ trường và validator cho 4 biểu mẫu cốt lõi (CT01 thuê/mượn/ở nhờ, TK-KS chi tiết, TK-KH tách 2 chế độ & phối ngẫu, TK-BTXH mốc tuổi $\ge 75$ & giám hộ) ở cả Backend và Frontend. | M2 | R2 |
| F5 | Dynamic A4 Form Modal | Mở rộng `A4DocumentModal.tsx` cho toàn bộ danh mục thủ tục cấp xã (CT-01..08 kèm cam kết ký trực tiếp, DC-01/02 Mẫu 22/25, XD-01/02 Mẫu 01, CR-02 Mẫu 02, BT-02..05 Mẫu 03, MT-01), xóa bỏ mock `NGUYỄN VĂN HÒA`. | M2 | R2 |
| F6 | Smart Checklist & Exemption Warning | Checklist thông minh rẽ nhánh điều kiện (ghép thủ tục Nhận cha mẹ con khi chưa kết hôn, nộp bản án ly hôn) và gắn huy hiệu cảnh báo miễn 100% lệ phí theo Luật Phí và Lệ phí. | M2 | R2 |
| F7 | Real QR CCCD Scanner & Decoder | Tích hợp quét Camera trực tiếp và tải ảnh giải mã QR CCCD (chuỗi 7 trường BCA) thay thế nút mock `sampleQrRaw`, tự động điền form và đối soát sai lệch. | M3 | R3 |
| F8 | Multi-Document OCR Cross-Check | Mở rộng `FormPrecheckService.java` đối soát chéo Giấy chứng sinh, Giấy báo tử, Sổ hộ nghèo/Khuyết tật, GCN QSDĐ so với tờ khai; phân loại `MATCH`, `WARNING`, `CONFLICT`. | M3 | R3 |
| F9 | Zero-Trust Vault UI Integration | Kết nối `uploadVaultDocument` khi nộp hồ sơ (mã hóa AES-GCM tại MinIO) và `viewVaultDocument(token)` tại `PerWardDashboard.tsx` hiển thị ảnh có watermark bảo mật qua Redis OTT 24h, xóa khối HTML mock. | M3 | R3 |
| F10 | Database Persistence & Flyway V4 | Viết migration `V4__create_citizen_dossiers.sql`, xây dựng backend package `vn.edu.uth.smartward.dossier` (Entity, Repository, Service, Controller). | M4 | R4 |
| F11 | Dossier Tracking & Management | Chuyển đổi toàn bộ quy trình nộp hồ sơ, tra cứu tiến độ bằng mã hồ sơ + 4 số cuối CCCD, và phê duyệt cán bộ trên `PerWardDashboard.tsx` từ `localStorage` sang API database. | M4 | R4 |
| F12 | Security & Officer RBAC Enforcement | Sửa pattern URL sang `/api/v1/rag/hitl-queue/**` trong `OfficerAuthInterceptor` & `OfficerSecurityConfig`, bảo vệ các endpoint `/api/v1/forms/submissions`, `/api/v1/vault/**`, `/api/v1/dossiers/**`, đồng bộ đăng nhập cán bộ. | M4 | R4 |
| F13 | Technical & Quality Compliance | Đảm bảo quy tắc phân nhánh Git (`feature/*` từ `develop`), ngân sách RAM 6 container Docker $\le 2048$ MiB, khóa bảo mật $\ge 32$ bytes, giữ nguyên ngưỡng RAG $\theta=0.78, \theta_{lower}=0.42$, 100% test passing. | M4 | R5 |
| F14 | Comprehensive E2E Testing & Hardening | Bộ kiểm thử E2E độc lập bao quát Tiers 1–4 (Feature, Boundary, Combinatorial, Real-world) và Tier 5 Adversarial Coverage Hardening. | M5 | R5 / E2E Track |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Chuẩn hóa Nguồn dữ liệu TTHC & REST API | F1, F2, F3 | none | DONE (Commit 75ccb16, 40 seed JSON clean, REST API /api/v1/procedures, 143/143 tests pass, Gate PASS) |
| M2 | Động cơ Rà soát Tờ khai & Dynamic A4 Modal & Smart Checklist | F4, F5, F6 | M1 | DONE (Commits 05d0890/253bacd, 29 DTO fields, 7 A4 layouts, 40 procedures fee oracle, 18/18 Precheck tests, 48 adversarial tests, Gate PASS) |
| M3 | Công cụ Kiểm chứng Thông tin: QR CCCD Thật, OCR Đối soát & Zero-Trust Vault | F7, F8, F9 | M2 | DONE (Commit d0af231, QR CCCD Scanner BCA, 4-doc OCR cross-check, Zero-Trust Vault UI, Gate PASS) |
| M4 | Lưu trữ Hồ sơ DB, Quản lý Tiến độ, Phân quyền RBAC & Tuân thủ Kỹ thuật | F10, F11, F12, F13 | M1, M2, M3 | IN_PROGRESS |
| M5 | Nghiệm thu E2E Test Suite & Adversarial Hardening (Tiers 1-5) | F14 | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### 1. Procedures API (`GET /api/v1/procedures`, `GET /api/v1/procedures/{code}`)
- **Request (`GET /api/v1/procedures?category=...&keyword=...`)**: Public endpoint.
- **Response**:
  ```json
  {
    "status": 200,
    "message": "SUCCESS",
    "data": [
      {
        "procedureCode": "TTHC-HT-01",
        "procedureName": "Đăng ký khai sinh",
        "category": "Hộ tịch",
        "agency": "Ủy ban nhân dân cấp xã / phường",
        "processingTime": "Trong ngày làm việc",
        "fee": "Miễn phí"
      }
    ]
  }
  ```

### 2. Citizen Dossiers API (`/api/v1/dossiers`)
- **Submit Dossier (`POST /api/v1/dossiers`)**: Public endpoint.
  - Request:
    ```json
    {
      "procedureCode": "TTHC-CR-01",
      "wardCode": "WARD_BEN_NGHE",
      "citizenCccd": "089205023490",
      "formData": { "fullName": "Nguyễn Văn A", ... },
      "precheckReport": { "status": "VALID", "warnings": [] },
      "vaultDocIds": ["DOC_66a7b8c9d0e1"]
    }
    ```
  - Response:
    ```json
    {
      "status": 201,
      "message": "DOSSIER_SUBMITTED",
      "data": {
        "dossierCode": "HS-20261111-BENNGHE-0001",
        "slaDeadline": "2026-11-14T17:00:00Z",
        "status": "PENDING"
      }
    }
    ```
- **Track Dossier (`GET /api/v1/dossiers/track?dossierCode=...&last4Cccd=...`)**: Public endpoint.
  - Response:
    ```json
    {
      "status": 200,
      "data": {
        "dossierCode": "HS-20261111-BENNGHE-0001",
        "procedureName": "Đăng ký thường trú",
        "status": "PENDING",
        "slaDeadline": "2026-11-14T17:00:00Z",
        "officerFeedback": null,
        "appointmentCode": null
      }
    }
    ```
- **Officer Review (`PUT /api/v1/dossiers/{dossierCode}/review`)**: Officer Role Required (`Authorization: Bearer <token>`).
  - Request:
    ```json
    {
      "status": "APPROVED" | "SUPPLEMENT_REQUIRED" | "REJECTED",
      "officerFeedback": "Hồ sơ hợp lệ, hẹn công dân mang bản chính đến đối chiếu vào ngày 13/11/2026.",
      "appointmentCode": "LH-20261113-0930"
    }
    ```

### 3. QR CCCD Format (BCA Standard)
- Format chuỗi: `CCCD_12_DIGITS|OLD_ID_9_DIGITS|FULL_NAME|DOB_DDMMYYYY|GENDER|ADDRESS|ISSUE_DATE_DDMMYYYY`
- Parser chuyển đổi sang object:
  ```typescript
  interface DecodedCccdQr {
    cccdNumber: string;
    oldIdNumber?: string;
    fullName: string;
    dateOfBirth: string; // ISO yyyy-MM-dd
    gender: 'Nam' | 'Nữ';
    address: string;
    issueDate: string; // ISO yyyy-MM-dd
  }
  ```

## Code Layout
- Exclusive Worker File Ownership:
  - **Milestone 1**:
    - `backend/src/main/resources/db/seed/procedures/*.json`
    - `backend/src/main/java/vn/edu/uth/smartward/rag/ProcedureDataSeeder.java`
    - `backend/src/main/java/vn/edu/uth/smartward/rag/ProcedureController.java` (NEW)
    - `backend/src/main/java/vn/edu/uth/smartward/rag/ProcedureService.java` (NEW)
    - `backend/src/main/java/vn/edu/uth/smartward/rag/dto/ProcedureDto.java` (NEW)
    - `backend/src/main/java/vn/edu/uth/smartward/rag/dto/ProcedureDetailDto.java` (NEW)
    - `backend/src/main/java/vn/edu/uth/smartward/rag/RagQueryService.java`
    - `frontend/src/api/client.ts`
    - `frontend/src/pages/ProceduresCatalogPage.tsx`
    - `frontend/src/services/intentClassifier.ts`
    - `frontend/src/data/proceduresCatalog.ts`
    - `frontend/src/services/legalKnowledgeBase.ts`
  - **Milestone 2**:
    - `backend/src/main/java/vn/edu/uth/smartward/formcheck/FormPrecheckService.java`
    - `backend/src/main/java/vn/edu/uth/smartward/formcheck/dto/StructuredFormPrecheckRequest.java`
    - `frontend/src/pages/FormAndIssueReporting.tsx`
    - `frontend/src/components/A4DocumentModal.tsx`
  - **Milestone 3**:
    - `frontend/src/components/CccdQrScannerModal.tsx` (NEW)
    - `backend/src/main/java/vn/edu/uth/smartward/formcheck/OcrExtractionClient.java`
    - `backend/src/main/java/vn/edu/uth/smartward/formcheck/dto/DocumentCrossCheckResult.java` (NEW)
    - `frontend/src/pages/FormAndIssueReporting.tsx` (Vault upload integration)
    - `frontend/src/pages/PerWardDashboard.tsx` (Vault view OTT integration)
  - **Milestone 4**:
    - `backend/src/main/resources/db/migration/V4__create_citizen_dossiers.sql` (NEW)
    - `backend/src/main/java/vn/edu/uth/smartward/dossier/*` (NEW package: Entity, Repo, Service, Controller, DTOs)
    - `backend/src/main/java/vn/edu/uth/smartward/security/OfficerAuthInterceptor.java`
    - `backend/src/main/java/vn/edu/uth/smartward/security/OfficerSecurityConfig.java`
    - `backend/src/main/java/vn/edu/uth/smartward/security/OfficerAuthController.java`
    - `docker-compose.yml`
    - `frontend/src/pages/PerWardDashboard.tsx`
    - `frontend/src/context/RoleContext.tsx`
