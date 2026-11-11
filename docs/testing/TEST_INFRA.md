# E2E Test Infra: SmartWard AI Comprehensive Test Infrastructure & 4-Tier Verification Matrix

## 1. Test Philosophy & Core Principles
- **Opaque-Box & Adversarial Verification**: Hệ thống kiểm thử độc lập, đối soát trực tiếp dựa trên đặc tả yêu cầu người dùng (`ORIGINAL_REQUEST.md`) và kiến trúc hệ thống (`PROJECT.md`). Không phụ thuộc vào giả định nội bộ của mã nguồn.
- **Tuân thủ Pháp lý & Chốt chặn An toàn**: Nghiêm ngặt kiểm chứng bảo mật theo Nghị định 13/2023/NĐ-CP (Zero-Trust Vault, token một lần 410 GONE, mã hóa AES-256-GCM) và các chốt chặn RAG Điều-Khoản ($\theta = 0.78$ từ chối an toàn, $\theta_{lower} = 0.42$ vùng xám HITL).
- **Zero-Tolerance for Regressions**: Đảm bảo 100% tỷ lệ PASS cho toàn bộ các bài kiểm thử JUnit Backend, kiểm thử Frontend, và toàn bộ 161+ test cases thuộc 4 Tiers E2E.
- **Khả năng Tự khép kín (Self-Contained Synthetic Test Harness)**: Sử dụng các bộ dữ liệu thử nghiệm giả lập (synthetic fixtures) cho QR CCCD 7 trường, ảnh chụp tờ khai, và OCR payload để kiểm thử có thể chạy offline hoặc trong môi trường CI/CD khép kín mà không phụ thuộc vào dịch vụ bên ngoài.

---

## 2. Verified Test Suites Matrix

| Test Suite | Location | Runner Command | Coverage Scope | Target Result |
| :--- | :--- | :--- | :--- | :---: |
| **Backend JUnit Test Suite** | `backend/src/test/java/...` | `cd backend && .\mvnw.cmd test` | Data Seeder, pgvector RAG, FormPrecheck, CccdValidator, DateLogicValidator, ZeroTrustVaultService, OfficerAuthService, CitizenDossierService | 100% PASS |
| **Frontend Production Build** | `frontend/` | `cd frontend && npm.cmd run build` | Bundle integrity, strict TypeScript type-checking, CSS compiling, asset packaging | 100% PASS (0 errors) |
| **Tier 1: Feature Coverage** | `frontend/scripts/e2e/tier1/` | `node frontend/scripts/e2e/tier1/run_tier1_tests.mjs` | Bao phủ 14 tính năng F1 - F14 ($\ge 5$ test cases/feature $\rightarrow$ 70 tests) | 70/70 PASS (100%) |
| **Tier 2: Boundary & Corner Cases** | `frontend/scripts/e2e/tier2/` | `node frontend/scripts/e2e/tier2/run_tier2_tests.mjs` | Điều kiện biên, góc hẹp, định dạng CCCD, mốc tuổi, token TTL, race conditions ($\ge 5$ tests/feature $\rightarrow$ 70 tests) | 70/70 PASS (100%) |
| **Tier 3: Cross-Feature Interactions** | `frontend/scripts/e2e/tier3/` | `node frontend/scripts/e2e/tier3/run_tier3_tests.mjs` | 14 tương tác chéo giữa các module (Seed $\rightarrow$ API $\rightarrow$ Form $\rightarrow$ OCR $\rightarrow$ Vault $\rightarrow$ DB $\rightarrow$ RBAC) | 14/14 PASS (100%) |
| **Tier 4: Real-World Life Scenarios** | `frontend/scripts/e2e/tier4/` | `node frontend/scripts/e2e/tier4/run_tier4_tests.mjs` | 7 kịch bản đời sống công dân phức tạp liên thông từ đầu đến cuối (E2E Citizen Journeys) | 7/7 PASS (100%) |
| **Unified Master E2E Runner** | `frontend/scripts/e2e/` | `node frontend/scripts/e2e/run_all_e2e_tests.mjs` | Tổng hợp toàn bộ 161+ test cases của 4 Tiers, xuất báo cáo tổng thể | 161/161 PASS (100%) |

---

## 3. Test Hierarchy & Tier Breakdown

### Tier 1: Feature Coverage Suite (Tối thiểu 70 Test Cases)
Bao quát 100% các chức năng danh mục F1 đến F14:
- **F1 (Seed JSON Standardization)**: 5 tests xác minh 40 file seed JSON, xóa bỏ 3 file trùng (`BT-06`, `CR-05`, `CT-03`), sửa category 5 file (`CR-10`, `CT-05`, `CT-06`, `XD-01`, `XD-02`), chuẩn hóa agency cấp xã, bổ sung 3 thủ tục (`HT-13`, `MT-01`, `NCC-01`).
- **F2 (Admin Procedures REST API)**: 5 tests kiểm tra `GET /api/v1/procedures` và `GET /api/v1/procedures/{code}`, lọc category, tìm kiếm keyword, xử lý mã 404.
- **F3 (Procedure Hardcode Removal)**: 5 tests đảm bảo câu trả lời danh mục từ RAG và Frontend Catalog được lấy động từ DB, xóa bỏ văn bản tĩnh lệch nhau.
- **F4 (Enhanced Form Precheck Engine)**: 5 tests sơ duyệt 4 biểu mẫu cốt lõi (CT01 diện ở nhờ, TK-KS chi tiết cha mẹ & GCS, TK-KH tách 2 chế độ đủ tuổi, TK-BTXH mốc 75 tuổi).
- **F5 (Dynamic A4 Form Modal)**: 5 tests xác minh hiển thị A4 cho Chứng thực (`CT-01..08`), Đất đai (`DC-01/02`), Xây dựng (`XD-01/02`), Khai tử (`CR-02`), Mai táng phí (`BT-02`), xóa bỏ hoàn toàn dữ liệu mock `NGUYỄN VĂN HÒA`.
- **F6 (Smart Checklist & Exemption Warning)**: 5 tests kiểm tra rẽ nhánh hồ sơ (cha mẹ chưa kết hôn, đã ly hôn) và gắn huy hiệu miễn 100% lệ phí theo quy định.
- **F7 (Real QR CCCD Scanner & Decoder)**: 5 tests giải mã QR CCCD 7 trường chuẩn BCA, tự động điền form và cảnh báo sai lệch giữa dữ liệu gõ tay và QR.
- **F8 (Multi-Document OCR Cross-Check)**: 5 tests đối soát chéo GCS, Giấy báo tử, Sổ nghèo/Khuyết tật, GCN QSDĐ phân loại `MATCH`, `WARNING`, `CONFLICT`.
- **F9 (Zero-Trust Vault UI Integration)**: 5 tests kiểm tra tải lên MinIO mã hóa AES-256-GCM, cấp token OTT Redis 24h, tự hủy khi xem (410 GONE), hiển thị ảnh watermark bảo mật trên Dashboard.
- **F10 (Database Persistence & Flyway V4)**: 5 tests kiểm tra migration `V4__create_citizen_dossiers.sql`, tính toàn vẹn bảng, khóa unique `dossier_code`, kiểu dữ liệu JSONB.
- **F11 (Dossier Tracking & Management)**: 5 tests nộp hồ sơ, tra cứu tiến độ bằng mã + 4 số cuối CCCD, cán bộ duyệt tiếp nhận hoặc yêu cầu bổ sung.
- **F12 (Security & Officer RBAC Enforcement)**: 5 tests bảo vệ endpoint `/api/v1/rag/hitl-queue/**`, `/api/v1/forms/submissions`, `/api/v1/vault/**`, `/api/v1/dossiers/**`, xác thực JWT cán bộ.
- **F13 (Technical & Quality Compliance)**: 5 tests kiểm tra ngân sách RAM Docker $\le 2048$ MiB, khóa bí mật $\ge 32$ bytes, ngưỡng RAG $\theta=0.78, \theta_{lower}=0.42$, phân nhánh Git.
- **F14 (Comprehensive E2E Testing & Hardening)**: 5 tests kiểm tra runner ESM, tính toàn vẹn gói build, zero skipped tests, độ trễ hệ thống.

### Tier 2: Boundary & Corner Cases Suite (Tối thiểu 70 Test Cases)
Thử thách hệ thống ở các điều kiện giới hạn cực đoan:
- Năm sinh thế kỷ 19 / 20 / 21 trong CCCD (người 128 tuổi, trẻ em mới sinh).
- Ngày 29/02 trong năm nhuận đối với kiểm tra logic ngày sinh.
- Mốc tuổi kết hôn chính xác từng ngày (đủ 20 tuổi hôm nay vs thiếu 1 ngày).
- Mốc tuổi bảo trợ xã hội đúng 75 tuổi 0 ngày theo Luật BHXH 2024.
- Mục đích cấp giấy xác nhận tình trạng hôn nhân mơ hồ ("bổ sung hồ sơ", "việc cá nhân") vs cụ thể.
- Chuỗi QR CCCD thiếu trường số CMND cũ (2 dấu gạch đứng liên tiếp `||`).
- File upload chạm ngưỡng 5.0 MB và vượt ngưỡng 5.1 MB.
- Hai truy vấn xem token OTT gửi đồng thời cùng mili-giây (Atomic `GETDEL` chống race condition).
- Tra cứu hồ sơ với 4 số cuối CCCD có chứa số 0 đứng đầu (`0123`).
- Điểm tương đồng RAG nằm đúng ranh giới chốt chặn: $S_{max} = 0.7800$, $S_{max} = 0.7799$, $S_{max} = 0.4200$, $S_{max} = 0.4199$.

### Tier 3: Cross-Feature Interactions Suite (14 Scenarios)
Kiểm tra tính tương thích và dòng chảy dữ liệu giữa các module:
1. `T3_INT_01`: Seed JSON Standardization $\rightarrow$ Admin Procedures REST API.
2. `T3_INT_02`: Procedures REST API $\rightarrow$ Frontend Dynamic Catalog Sync.
3. `T3_INT_03`: Quét QR CCCD $\rightarrow$ Tự động điền Form CT01 & Kích hoạt Precheck.
4. `T3_INT_04`: Form Precheck thành công $\rightarrow$ Hiển thị Modal A4 dữ liệu thực tế.
5. `T3_INT_05`: Smart Checklist rẽ nhánh $\rightarrow$ Ràng buộc Validator Form Precheck.
6. `T3_INT_06`: OCR Đối soát Giấy chứng sinh $\rightarrow$ Báo cáo Tiền kiểm định.
7. `T3_INT_07`: Form Precheck $\rightarrow$ Đính kèm tài liệu vào Zero-Trust Vault.
8. `T3_INT_08`: Zero-Trust Vault Documents $\rightarrow$ Citizen Dossier DB Record.
9. `T3_INT_09`: Lưu trữ Dossier DB $\rightarrow$ Tra cứu tiến độ công dân (mã + 4 số cuối CCCD).
10. `T3_INT_10`: Quản lý hồ sơ công dân $\rightarrow$ Phân quyền cán bộ Một cửa (RBAC Interceptor).
11. `T3_INT_11`: Cán bộ xem hồ sơ Dashboard $\rightarrow$ Tiêu thụ One-Time Token (OTT 410 GONE).
12. `T3_INT_12`: Đăng nhập cán bộ $\rightarrow$ Phê duyệt câu hỏi vùng xám nạp Cache RAG.
13. `T3_INT_13`: Smart Checklist Miễn phí $\rightarrow$ Tính toán SLA và Lệ phí trên Hồ sơ.
14. `T3_INT_14`: Khóa bảo mật 32-byte $\rightarrow$ Tính toàn vẹn mã hóa và giải mã Vault AES-256.

### Tier 4: Real-World Life Scenarios Suite (7 Scenarios)
Mô phỏng hành trình công dân thực tế từ đầu đến cuối:
1. `T4_LIFE_01`: Đăng ký Khai sinh cho con khi Cha Mẹ chưa đăng ký kết hôn (Thủ tục ghép Khai sinh + Nhận cha con).
2. `T4_LIFE_02`: Chuyển hộ khẩu đến nhà thuê và thay đổi thông tin cư trú Mẫu CT01 (Kê khai chủ hộ, diện tích sàn, hợp đồng thuê).
3. `T4_LIFE_03`: Người đã ly hôn xin Cấp Giấy xác nhận tình trạng hôn nhân để kết hôn mới (Chặn mục đích chung chung, đối chiếu bản án ly hôn).
4. `T4_LIFE_04`: Người cao tuổi đủ 75 tuổi không có lương hưu làm thủ tục Trợ cấp Xã hội (Luật BHXH 2024, tài khoản an sinh Đề án 06).
5. `T4_LIFE_05`: Khai tử liên thông và Giải quyết hỗ trợ chi phí Mai táng (Mẫu 02, Mẫu 03, đối soát Giấy báo tử, miễn phí).
6. `T4_LIFE_06`: Phát hiện và ngăn chặn mâu thuẫn dữ liệu giả mạo giấy tờ (Chống gian lận ngày sinh, sai chữ số CCCD thế kỷ).
7. `T4_LIFE_07`: Toàn trình Vòng đời Hồ sơ từ Nộp, Yêu cầu bổ sung đến Phê duyệt và Xem tài liệu Vault (Nộp $\rightarrow$ OTT-1 $\rightarrow$ Supplement $\rightarrow$ Bổ sung $\rightarrow$ OTT-2 $\rightarrow$ Approve $\rightarrow$ Hẹn đối chiếu).

---

## 4. Test Fixtures & Synthetic Harness

Tất cả các bộ fixture phục vụ kiểm thử được lưu trữ tại `frontend/scripts/e2e/fixtures/`:
- `fixtures/synthetic_cccd_qrs.json`: Danh mục các chuỗi QR CCCD hợp lệ và không hợp lệ (đủ 12 số, có CMND 9 số cũ, năm nhuận, người cao tuổi, format sai phân cách).
- `fixtures/synthetic_ocr_documents.json`: Dữ liệu OCR mô phỏng cho Giấy chứng sinh, Giấy báo tử, Sổ hộ nghèo, Giấy xác nhận khuyết tật, GCN QSDĐ (với các biến thể MATCH, WARNING, CONFLICT).
- `fixtures/sample_forms_payload.json`: Cấu trúc JSON mẫu cho 4 biểu mẫu CT01, TK-KS, TK-KH, TK-BTXH phục vụ sơ duyệt.
- `fixtures/sample_files/`: Ảnh mẫu PNG nhỏ (1x1 px, 100x100 px, 5MB boundary) phục vụ kiểm thử mã hóa Vault và Watermark.

---

## 5. Technical Compliance & Gate Verification

| Tiêu chuẩn Kỹ thuật | Ngưỡng Quy định | Phương pháp Kiểm tra | Kết quả Yêu cầu |
| :--- | :--- | :--- | :---: |
| **Ngân sách RAM Docker** | $\le 2048$ MiB cho 6 containers | Đọc `docker-compose.yml` tính tổng `mem_limit` | $448 + 128 + 256 + 384 + 768 + 64 = 2048$ MiB |
| **Độ dài khóa VAULT** | $\ge 32$ bytes (256-bit) | Kiểm tra `VAULT_ENCRYPTION_KEY` | $\ge 32$ bytes |
| **Độ dài khóa JWT** | $\ge 32$ bytes (256-bit) | Kiểm tra `JWT_SECRET` | $\ge 32$ bytes |
| **Chốt chặn RAG từ chối an toàn** | $\theta = 0.78$ | Test case RAG probe $S_{max} < 0.78$ | Từ chối trả lời an toàn (Abstained = true) |
| **Chốt chặn RAG vùng xám HITL** | $\theta_{lower} = 0.42$ | Test case RAG probe $0.42 \le S_{max} < 0.78$ | Chuyển Hàng đợi Cán bộ Một cửa |
| **Quy tắc phân nhánh Git** | Nhánh `feature/*` từ `develop` | `git status`, `git branch` | Không commit trực tiếp lên `main` |
| **Tỷ lệ vượt qua kiểm thử** | 100% PASS | Toàn bộ 4 Tiers + JUnit Backend + Build Frontend | 0 Failed, 0 Errored, 0 Skipped |

---

## 6. Lệnh Thực thi Kiểm thử Nhanh (Execution Quickstart)

```bash
# 1. Chạy toàn bộ bộ kiểm thử E2E 4 Tiers (Unified Master Runner):
cd frontend && node scripts/e2e/run_all_e2e_tests.mjs

# 2. Chạy riêng từng Tier:
node frontend/scripts/e2e/tier1/run_tier1_tests.mjs
node frontend/scripts/e2e/tier2/run_tier2_tests.mjs
node frontend/scripts/e2e/tier3/run_tier3_tests.mjs
node frontend/scripts/e2e/tier4/run_tier4_tests.mjs

# 3. Chạy kiểm thử Backend JUnit:
cd backend && .\mvnw.cmd test

# 4. Kiểm định bản build Production Frontend:
cd frontend && npm.cmd run build
```
