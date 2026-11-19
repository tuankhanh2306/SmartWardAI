# SMARTWARD AI MOBILE — KẾ HOẠCH PHÁT TRIỂN CHI TIẾT & QUY CHUẨN KỶ LUẬT KỸ THUẬT (MASTER MOBILE IMPLEMENTATION PLAN)

> **Mã tài liệu:** `SW-PLAN-MOBILE-2026`  
> **Vị trí quy hoạch chuẩn:** `docs/roadmap/MOBILE_DEVELOPMENT_PLAN.md` (tuân thủ quy ước tại [`docs/README.md`](../README.md))  
> **Đối tượng áp dụng:** Kỹ sư Phát triển & AI Agents thực thi phân hệ Di động (`e:\SmartWardAI\mobile\`)  
> **Nền tảng mục tiêu:** iOS & Android (React Native + Expo SDK 52 + TypeScript)  
> **Phạm vi nghiệp vụ:** 96 Xã, Phường và Đặc khu thuộc tỉnh An Giang — 40 Thủ tục hành chính (TTHC) chuẩn hóa 2026  
> **Ngân sách hạ tầng:** Giữ nguyên trần cứng Docker Server `<= 2048 MiB` RAM (0 container phát sinh)

---

## MỤC LỤC

1. [Kỷ Luật Thực Thi & 8 Nguyên Tắc Bất Biến (Non-Negotiable Rules)](#1-kỷ-luật-thực-thi--8-nguyên-tắc-bất-biến-non-negotiable-rules)
2. [Kiểm Toán Thực Tế Codebase: 5 Điểm Lệch Giữa Tài Liệu Cũ & Code Thật Cần Lưu Ý](#2-kiểm-toán-thực-tế-codebase-5-điểm-lệch-giữa-tài-liệu-cũ--code-thật-cần-lưu-ý)
3. [Kiến Trúc Thư Mục `mobile/` & Bản Đồ Ánh Xạ File-by-File Từ `frontend/`](#3-kiến-trúc-thư-mục-mobile--bản-đồ-ánh-xạ-file-by-file-từ-frontend)
4. [Hợp Đồng Giao Tiếp REST API Đã Xác Thực (Verified API Contracts)](#4-hợp-đồng-giao-tiếp-rest-api-đã-xác-thực-verified-api-contracts)
5. [Thiết Kế Cơ Sở Dữ Liệu Cục Bộ Offline (`expo-sqlite` & `SecureStore`)](#5-thiết-kế-cơ-sở-dữ-liệu-cục-bộ-offline-expo-sqlite--securestore)
6. [Quy Trình Triển Khai 6 Công Đoạn (Chặng 0 → Chặng 5) & Tiêu Chí Chốt Chặn (Quality Gates)](#6-quy-trình-triển-khai-6-công-đoạn-chặng-0--chặng-5--tiêu-chí-chốt-chặn-quality-gates)
7. [Danh Mục Những Điều Bắt Buộc Lưu Ý & Phòng Ngừa Lỗi (Critical Pitfalls & Edge Cases)](#7-danh-mục-những-điều-bắt-buộc-lưu-ý--phòng-ngừa-lỗi-critical-pitfalls--edge-cases)
8. [Kế Hoạch Kiểm Thử Toàn Diện (Unit, Integration & E2E Web ↔ Mobile Sync)](#8-kế-hoạch-kiểm-thử-toàn-diện-unit-integration--e2e-web--mobile-sync)

---

## 1. KỶ LUẬT THỰC THI & 8 NGUYÊN TẮC BẤT BIẾN (NON-NEGOTIABLE RULES)

Mọi dòng code viết trong thư mục `mobile/` và các bản vá đồng bộ trên `backend/` hoặc `frontend/` **bắt buộc tuân thủ tuyệt đối 8 quy tắc kỷ luật sau**:

1. **Kỷ luật Git Branching (`AGENTS.md` Mục 1):**
   - **CẤM TUYỆT ĐỐI** commit hoặc push trực tiếp lên nhánh `main`.
   - Trước khi viết bất kỳ dòng code Mobile nào, **bắt buộc** kiểm tra `git status`, chuyển về `develop`, kéo code mới nhất và tách nhánh `feature/mobile-*`:
     ```bash
     git checkout develop
     git pull origin develop
     git checkout -b feature/mobile-phase1-foundation
     ```
   - Mọi commit phải tuân thủ chuẩn Conventional Commits (`feat(mobile): ...`, `fix(mobile): ...`, `test(mobile): ...`).

2. **Kỷ luật Ngân sách RAM Server (`<= 2048 MiB`):**
   - Toàn bộ 6 container trong `docker-compose.yml` (`postgres: 448m`, `redis: 128m`, `minio: 256m`, `ai-sidecar: 384m`, `backend: 768m`, `frontend: 64m`) cộng lại đúng bằng **`2048 MiB`**.
   - **CẤM** thêm container mới vào `docker-compose.yml` cho Mobile. Ứng dụng Mobile biên dịch thành gói cài đặt native (`.apk` / `.ipa`) hoặc chạy qua Metro Bundler trên máy trạm phát triển và gọi trực tiếp vào cổng `:8080` của `smartward-backend`.

3. **Kỷ luật Ngưỡng Toán học & AI (Domain Thresholds — [`docs/designs/mobile/design-tokens.json`](../designs/mobile/design-tokens.json)):**
   - Ngưỡng trả lời trực tiếp Legal RAG: `θ = 0.78` (`ragDirectAnswerSimilarity`).
   - Ngưỡng vùng xám đẩy vào hàng đợi HITL: `θ_lower = 0.42` (`ragHitlLowerSimilarity`).
   - Ngưỡng độ sắc nét ảnh tờ khai (Laplacian Variance): `sharpnessScore >= 45` trên thang 100 (`visionMinSharpnessScore`).
   - Ngưỡng độ sáng ảnh tờ khai: `brightnessScore >= 55` trên thang 255 (`visionMinBrightnessScore`).
   - Bán kính gom cụm không gian pha 1 (Redis `GEOSEARCH`): `R = 25.0m` (`gpsClusterRadiusMeters`).
   - Ngưỡng tương đồng ngữ nghĩa pha 2 (`pgvector` Cosine): `τ = 0.82` (`semanticClusterThreshold`).

4. **Kỷ luật Bảo vệ Dữ liệu Cá nhân (Nghị định 13/2023/NĐ-CP):**
   - Số CCCD 12 số khi hiển thị trên danh sách tra cứu hoặc màn hình cán bộ (`OfficerMobileAuditScreen`) bắt buộc che mờ định dạng `********1234`.
   - Ảnh chụp giấy tờ tùy thân và tờ khai **không được lưu vĩnh viễn trong thư viện ảnh công cộng của máy**; sau khi upload lên Zero-Trust Vault (`POST /api/v1/vault/upload`), xóa ngay file tạm trong `FileSystem.cacheDirectory`.
   - Liên kết xem ảnh giấy tờ chỉ dùng One-Time Token (`OTT_...`) tự hủy nguyên tử qua lệnh Redis `GETDEL` (`GET /api/v1/vault/view/{token}`). Lần gọi thứ 2 bắt buộc nhận `HTTP 410 Gone`.

5. **Kỷ luật Chống Tràn Bộ Nhớ Ảnh (Anti-Pixel-Flood OOM):**
   - Camera điện thoại hiện đại chụp ảnh độ phân giải rất cao (4000x3000px = 12MP hoặc 48MP). Trong khi đó `ImageWatermarkService.java` trên Backend chặn cứng ảnh có cạnh `> 4096px` hoặc tổng điểm ảnh `> 16.777.216 pixels` và giới hạn Multipart là `5MB`.
   - Do đó, trên Mobile **bắt buộc** dùng `expo-image-manipulator` resize ảnh chụp về cạnh dài tối đa `1920px` (nén JPEG `compress: 0.82`, dung lượng `~350KB – 800KB`) **trước khi** chạy kiểm tra Laplacian và gửi lên `/api/v1/vault/upload` hoặc `/api/v1/forms/precheck`.

6. **Kỷ luật Chi phí Thông báo 0 VNĐ (Zero-Cost Notification):**
   - **CẤM TUYỆT ĐỐI** thiết kế giao diện hoặc luồng nghiệp vụ hứa hẹn gửi SMS OTP hay Zalo ZNS thu phí.
   - Chỉ sử dụng: **(1) Email miễn phí 100%** + **(2) Ví Phiếu Hẹn Điện Tử Có Mã QR lưu Offline (`expo-sqlite`)** + **(3) Hộp thư thông báo trong ứng dụng**.

7. **Kỷ luật Xuất Biểu mẫu (No Print Dialogs):**
   - **CẤM** dùng lệnh in `window.print()` hoặc nút "In biểu mẫu" trên giao diện công dân.
   - Công dân trên Mobile chỉ sử dụng 2 nút tải trực tiếp: **`📄 Tải Mẫu .DOCX`** và **`📥 Tải Mẫu .PDF`** (lưu về máy hoặc chia sẻ qua `expo-file-system` + `expo-sharing`), cùng nút **`📥 Tải Phiếu Hẹn Có Mã QR (.pdf) Về Máy`**.

8. **Kỷ luật Thiết kế & Trợ năng Người cao tuổi ([`docs/designs/mobile/DESIGN.md`](../designs/mobile/DESIGN.md) & [`docs/designs/mobile/design-tokens.json`](../designs/mobile/design-tokens.json)):**
   - Bảng màu chuẩn: Nền chính `#F8FAFC`, Thẻ `#FFFFFF`, Chữ chính `#0F172A`, Màu nhấn chủ đạo Civic Emerald `#00796B` (nhấn giữ `#00695C`, nền nhạt `#F0FDFA`, viền `#99F6E4`). Cấm dùng gradient tím/neon kiểu AI đại trà.
   - Kích thước vùng chạm tối thiểu cho mọi nút bấm, ô nhập liệu và tab: **`48x48dp`** (`minButtonHeight: 48`, `minInputHeight: 48`).
   - Hỗ trợ thanh chuyển cỡ chữ 3 mức ngay trên Header cố định: **`A` (`1.0x`)**, **`A+` (`1.15x`)**, **`A++` (`1.32x`)** và nút đọc giọng nói tiếng Việt 2 chế độ rõ ràng **`MỞ` / `TẮT`**.

---

## 2. KIỂM TOÁN THỰC TẾ CODEBASE: 5 ĐIỂM LỆCH GIỮA TÀI LIỆU CŨ & CODE THẬT CẦN LƯU Ý

Qua đối chiếu trực tiếp giữa các file tài liệu (`MOBILE_APP_SPEC.md`, `SMARTWARD_UNIFIED_AGENT_AND_MOBILE_SPEC.md`) và mã nguồn Java Spring Boot thực tế trong `backend/src/main/java/vn/edu/uth/smartward/`, có **5 điểm khác biệt quan trọng** mà lập trình viên Mobile **phải tuân theo Code thật của Backend**:

| STT | Hạng mục | Ghi trong tài liệu cũ (`MOBILE_APP_SPEC.md`) | Thực tế trong Code Backend (`backend/src/...`) | Quyết định kỹ thuật bắt buộc khi code Mobile |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Endpoint Báo cáo & Cụm sự cố GPS 25m** | Ghi là `POST /api/v1/triage/reports` và `GET /api/v1/triage/clusters` | Tại `TriageController.java` và `OfficerSecurityConfig.java`, đường dẫn thật là: **`POST /api/v1/issues/report`** và **`GET /api/v1/issues/clusters`** | Trong `mobile/src/api/client.ts`, bắt buộc gọi đúng **`/api/v1/issues/report`** và **`/api/v1/issues/clusters`** (giống `frontend/src/api/modules/incident.api.ts`). |
| **2** | **Payload Đăng nhập Cán bộ Một cửa** | Ghi là `{ "badgeId", "password", "wardCode" }` | Tại `OfficerAuthController.java`, record `OfficerLoginRequest` nhận trường **`pin`** (không phải `password`): `{ "badgeId": "CC-AG-8942", "pin": "8942", "wardCode": "AG_P_LONGXUYEN" }` | Gửi đúng khóa JSON **`pin`** vào `POST /api/v1/auth/officer/login` (hoặc `/api/v1/officer/login`). |
| **3** | **Payload Nộp hồ sơ trực tuyến (`POST /api/v1/dossiers`)** | Ghi có trường `citizenName` ở cấp ngoài cùng của body | Tại `dossier/dto/SubmitDossierRequest.java`, các trường cấp ngoài gồm: `dossierCode`, `procedureCode`, `wardCode`, `citizenCccd`, `formData`, `precheckReport`, `vaultDocIds`, `idempotencyKey`. Họ tên, SĐT, Email công dân được trích từ bên trong `formData` (`hoTen`, `fullName`, `citizenEmail`, `phoneNumber`). | Truyền đầy đủ `hoTen`, `fullName`, `citizenEmail`, `phoneNumber` vào trong object `formData` VÀ truyền `procedureCode`, `wardCode`, `citizenCccd`, `vaultDocIds`, `idempotencyKey` ở cấp ngoài. |
| **4** | **API Quét QR Phiếu hẹn tại quầy của Cán bộ** | Đề cập `POST /api/v1/dossiers/officer/verify-qr` | Trong `CitizenDossierController.java` hiện mới có 4 endpoint: `POST /api/v1/dossiers`, `POST & GET /api/v1/dossiers/track`, `GET /api/v1/dossiers/officer/list`, `PUT /api/v1/dossiers/{dossierCode}/review`. Chưa có `/officer/verify-qr`. | Ở **Chặng 0**, bổ sung thêm endpoint `GET /api/v1/dossiers/officer/by-qr?code=...` (hoặc lọc trực tiếp từ `GET /api/v1/dossiers/officer/list` theo `appointmentCode` / `dossierCode`) để hỗ trợ quét cả mã `LH-YYYYMMDD-XXXX` lẫn `HS-...`. |
| **5** | **Đồng bộ Hồ sơ & Thông báo Email giữa Web và Mobile** | Trong `frontend/src/api/modules/dossier.api.ts` vẫn còn nhánh fallback lưu hồ sơ vào `window.localStorage` (`smartward_live_dossiers_v1`) | `localStorage` của trình duyệt máy tính hoàn toàn cô lập với điện thoại di động. | Mọi thao tác nộp hồ sơ trên Mobile (`POST /api/v1/dossiers`), tra cứu (`POST /api/v1/dossiers/track`) và duyệt hồ sơ (`PUT /api/v1/dossiers/{code}/review`) **bắt buộc đi qua PostgreSQL Backend** làm nguồn chân lý duy nhất; SQLite trên Mobile chỉ đóng vai trò bộ đệm Offline (Offline Read/Mutation Cache). |

---

## 3. KIẾN TRÚC THƯ MỤC `mobile/` & BẢN ĐỒ ÁNH XẠ FILE-BY-FILE TỪ `frontend/`

### 3.1. Cấu trúc Cây Thư mục Chuẩn (`e:\SmartWardAI\mobile\`)

```text
e:\SmartWardAI\mobile\
├── app.json                                  # Cấu hình Expo SDK 52, quyền Camera, GPS, Font, Bundle ID
├── package.json                              # Khai báo dependencies & scripts (start, android, ios, test, typecheck)
├── tsconfig.json                             # Cấu hình TypeScript strict mode
├── babel.config.js                           # Cấu hình Babel cho Expo
├── jest.config.js                            # Cấu hình Jest chạy Unit & Integration Tests cho Mobile
├── DESIGN.md                                 # Đồng bộ từ docs/designs/mobile/DESIGN.md
├── design-tokens.json                        # Đồng bộ từ docs/designs/mobile/design-tokens.json
└── src/
    ├── App.tsx                               # Entry point bọc Providers (QueryClient, Ward, Accessibility, Auth)
    ├── theme/
    │   └── tokens.ts                         # Đọc design-tokens.json, cung cấp hook useThemeTokens() & scale chữ
    ├── types/
    │   └── api.types.ts                      # Toàn bộ DTO interfaces đồng bộ 100% với Backend & Web
    ├── core/                                 # TẦNG LOGIC NGHIỆP VỤ DÙNG CHUNG (Kế thừa từ frontend/src/)
    │   ├── angiangWards.ts                   # 96 Xã/Phường/Đặc khu An Giang + Haversine & Cross-Ward Router
    │   ├── cccdQrParser.ts                   # Giải mã chuỗi 7 trường QR CCCD BCA + detectDiscrepancies()
    │   ├── formValidators.ts                 # Rule Engine tất định 4 mẫu: CT01, TK-KS, TK-KH, TK-BTXH
    │   ├── visionQualityGate.ts              # Chốt chặn AI Thị Giác 3 tiêu chí (Độ nét, Độ sáng, Khớp mẫu)
    │   ├── intentClassifier.ts               # Phân loại ý định câu hỏi & nhận diện từ khóa 40 TTHC
    │   └── legalKnowledgeBase.ts             # Kho tri thức 40 TTHC An Giang 2026 dự phòng khi mất mạng
    ├── storage/
    │   ├── sqliteDb.ts                       # Khởi tạo expo-sqlite: bảng cached_procedures, qr_passes, offline_queue
    │   └── secureAuthStorage.ts              # Lưu/xóa JWT Cán bộ an toàn bằng expo-secure-store
    ├── api/
    │   ├── client.ts                         # Axios instance + Interceptors (Bearer JWT, X-Ward-Code, Retry)
    │   └── offlineSyncManager.ts             # Quản lý hàng đợi Offline Mutation (tự đẩy báo cáo khi có mạng lại)
    ├── context/
    │   ├── WardContext.tsx                   # State xã/phường hiện tại (mặc định AG_P_LONGXUYEN) + AsyncStorage
    │   ├── AccessibilityContext.tsx          # State cỡ chữ (A / A+ / A++) + Trạng thái đọc TTS (MỞ / TẮT)
    │   └── OfficerAuthContext.tsx            # State phiên đăng nhập Cán bộ Một cửa (badgeId, wardCode, role)
    ├── components/
    │   ├── PersistentCivicHeader.tsx         # Thanh Header 56dp cố định: Pill đổi 96 xã + Nút chữ A/A+/A++
    │   ├── WardSelectorModal.tsx             # Bottom Sheet tìm kiếm 96 xã/phường + Nút định vị GPS 1 chạm
    │   ├── VoiceReaderToggle.tsx             # Nút TTS 2 chế độ: "🔊 Nghe đọc to [MỞ]" <-> "🔇 Đang đọc... [TẮT]"
    │   ├── VisionGateCard.tsx                # Thẻ 3 tiêu chí AI Thị Giác + Khóa nút gửi khi ảnh mờ/sai mẫu
    │   ├── CccdQrScannerModal.tsx            # Camera quét QR CCCD 60fps kèm tia laser quét (#2DD4BF)
    │   ├── ElectronicQrPassCard.tsx          # Thẻ Phiếu Hẹn Điện Tử Có Mã QR (SVG QR + Xuất file PDF)
    │   └── TemplateDownloadBar.tsx           # Cụm 2 nút "📄 Tải Mẫu .DOCX" & "📥 Tải Mẫu .PDF" (không có nút in)
    ├── navigation/
    │   └── BottomTabNavigator.tsx            # 5 Tab đáy (40 TTHC | Sơ Duyệt | Ví Mã QR | Sự Cố 25m | Cán Bộ)
    ├── screens/
    │   ├── OnboardingWardScreen.tsx          # Màn hình 1: Chọn 96 Xã/Phường An Giang & Định vị GPS
    │   ├── LegalRagChatScreen.tsx            # Màn hình 2 (Tab 1): Hỏi đáp 40 TTHC + TTS + Tải .docx/.pdf
    │   ├── SmartFormPrecheckScreen.tsx       # Màn hình 3 (Tab 2): Quét QR CCCD + AI Vision Gate + Nộp sơ duyệt
    │   ├── DossierAndQrPassScreen.tsx        # Màn hình 4 (Tab 3): Ví Mã Hẹn QR Offline + Hộp thư Email
    │   ├── FieldIncidentReportScreen.tsx     # Màn hình 5 (Tab 4): Báo sự cố GPS R=25m + Định tuyến liên xã
    │   └── OfficerMobileAuditScreen.tsx      # Màn hình 6 (Tab 5): Cán bộ quét QR Phiếu hẹn & Duyệt tại quầy
    └── __tests__/
        ├── cccdQrParser.test.ts              # Unit test giải mã QR CCCD & phát hiện sai lệch
        ├── visionQualityGate.test.ts         # Unit test 3 tiêu chí AI Thị Giác (GOOD / BLURRY / WRONG_TEMPLATE)
        ├── formValidators.test.ts            # Unit test 4 nhóm tờ khai (CT01, TK-KS, TK-KH, TK-BTXH)
        ├── crossWardRouting.test.ts          # Unit test định tuyến Haversine 96 xã/phường An Giang
        └── apiSyncContract.test.ts           # Integration test đồng bộ hồ sơ & phiếu hẹn QR
```

### 3.2. Bảng Ánh Xạ Chuyển Đổi Chi Tiết Từ `frontend/` Sang `mobile/`

| Tệp gốc trên Web (`frontend/src/`) | Tệp đích trên Mobile (`mobile/src/`) | Các thay đổi kỹ thuật bắt buộc khi chuyển sang React Native |
| :--- | :--- | :--- |
| `utils/cccdQrParser.ts` | `core/cccdQrParser.ts` | **Giữ nguyên 100%** hàm `parseCccdQrString()` và `detectDiscrepancies()` (Pure TypeScript, không phụ thuộc DOM). |
| `data/anGiangWards.ts` & `data/wards/anGiangWardsCatalog.ts` | `core/angiangWards.ts` | **Giữ nguyên 100%** mảng 96 đơn vị hành chính `AN_GIANG_WARDS` và hàm tính khoảng cách Haversine `resolveWardFromLocationBox()`. |
| `services/tesseractOcr.ts` | `core/visionQualityGate.ts` | Thay `document.createElement('canvas')` và `URL.createObjectURL(file)` (chỉ có trên trình duyệt) bằng pipeline xử lý ảnh native qua `expo-image-manipulator` + đọc metadata/byte stream để chấm điểm `sharpnessScore` (`>= 45`), `brightnessScore` (`>= 55`) và kiểm tra khớp mẫu `verifyTemplateMatch()`. |
| `services/legalKnowledgeBase.ts` & `data/proceduresCatalog.ts` | `core/legalKnowledgeBase.ts` | Giữ nguyên kho dữ liệu 40 TTHC An Giang 2026 làm fallback khi mất mạng; ưu tiên đồng bộ từ `GET /api/v1/procedures` lưu vào `expo-sqlite`. |
| `api/client.ts` & `api/modules/*.api.ts` | `api/client.ts` | 1. Thay `import.meta.env.VITE_API_BASE_URL` bằng `process.env.EXPO_PUBLIC_API_BASE_URL` (mặc định `http://10.0.2.2:8080/api/v1` cho Android Emulator hoặc IP LAN máy chủ).<br>2. Thay `window.localStorage` bằng `@react-native-async-storage/async-storage` và `expo-secure-store`.<br>3. Thay `window.dispatchEvent(new Event('smartward_auth_logout'))` bằng callback của `OfficerAuthContext`. |

---

## 4. HỢP ĐỒNG GIAO TIẾP REST API ĐÃ XÁC THỰC (VERIFIED API CONTRACTS)

Toàn bộ các lệnh gọi mạng từ `mobile/src/api/client.ts` phải khớp chính xác 100% với chữ ký (signature) của các Controller trong `backend/`:

### 4.1. Nhóm Công Dân (Public Endpoints — Không cần Bearer Token)

1. **Lấy danh sách 40 TTHC & Chi tiết thủ tục:**
   - `GET /api/v1/procedures?category=...&keyword=...`
   - `GET /api/v1/procedures/{procedureCode}`
   - Response chuẩn: `ApiResponse<List<ProcedureDto>>` / `ApiResponse<ProcedureDetailDto>`.

2. **Hỏi đáp Trợ lý Pháp lý AI (Module 1 — `RagController.java`):**
   - `POST /api/v1/rag/ask`
   - Request Body:
     ```json
     {
       "question": "Thủ tục đăng ký thường trú mẫu CT01 cần giấy tờ gì?",
       "wardName": "Phường Long Xuyên",
       "threshold": 0.78
     }
     ```
   - Response (`RagAskResponse`): `{ answer, abstained, abstentionReason, maxSimilarity, appliedThreshold, citations[], cached, responseTimeMs, disclaimer }`.

3. **Tiền kiểm định Tờ khai đa biểu mẫu (Module 2 — `FormCheckController.java`):**
   - **Chế độ JSON cấu trúc (4 biểu mẫu `CT01`, `TK-KS`, `TK-KH`, `TK-BTXH`):**
     - `POST /api/v1/forms/precheck` (`Content-Type: application/json`)
     - Request Body (`StructuredFormPrecheckRequest`): `{ formType, procedureCode, fields: { ... }, qrVerified: true }`.
   - **Chế độ Multipart Ảnh chụp OCR:**
     - `POST /api/v1/forms/precheck` (`Content-Type: multipart/form-data`, field `file` và `formType`).

4. **Tải ảnh giấy tờ lên Kho Zero-Trust Vault (Module 4 — `VaultController.java`):**
   - `POST /api/v1/vault/upload` (`Content-Type: multipart/form-data`)
   - FormData:
     - `file`: `{ uri, name: 'ct01_capture.jpg', type: 'image/jpeg' }` (đã resize `<= 1920px`, `< 5MB`).
     - `documentType`: `'CT01_FORM'` | `'CCCD_FRONT'` | `'BIRTH_CERT'` | `'MARRIAGE_FORM'`.
   - Response (`VaultUploadResponse`): `{ docId, oneTimeToken, viewUrl, expiresAt, watermarkApplied: true }`.

5. **Nộp hồ sơ sơ duyệt vào PostgreSQL (`CitizenDossierController.java`):**
   - `POST /api/v1/dossiers`
   - Request Body (`SubmitDossierRequest`):
     ```json
     {
       "procedureCode": "TTHC-CR-01",
       "wardCode": "AG_P_LONGXUYEN",
       "citizenCccd": "089205023490",
       "formData": {
         "formType": "CT01",
         "fullName": "NGUYỄN MINH TUẤN KHANH",
         "hoTen": "NGUYỄN MINH TUẤN KHANH",
         "cccdNumber": "089205023490",
         "dateOfBirth": "2005-06-23",
         "gender": "Nam",
         "address": "Số 18 Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang",
         "citizenEmail": "congdan.angiang@gmail.com",
         "phoneNumber": "0918234567",
         "vneidHostConfirmed": true,
         "verificationBadge": "VERIFIED_VIA_VNEID_QR"
       },
       "precheckReport": {
         "sharpnessScore": 96,
         "templateMatched": true,
         "valid": true
       },
       "vaultDocIds": ["OTT_..."],
       "idempotencyKey": "MOB-1731888000-089205023490"
     }
     ```
   - Response (`HTTP 201 Created`): `{ dossierCode: "HS-...", status: "PENDING", slaDeadline: "..." }`.

6. **Tra cứu Tiến độ Hồ sơ & Lấy Mã Hẹn QR (`CitizenDossierController.java`):**
   - Ưu tiên dùng **`POST /api/v1/dossiers/track`** (theo chuẩn bảo mật `SEC-04` không lộ số CCCD trên URL query log):
     ```json
     {
       "dossierCode": "HS-20261118-0001",
       "last4Cccd": "3490"
     }
     ```
   - Response (`DossierTrackingResponse`): `{ dossierCode, procedureCode, procedureName, wardCode, citizenCccd: "********3490", status, slaDeadline, officerFeedback, appointmentCode: "LH-20261118-8899", timeline[] }`.

7. **Gửi Báo cáo Sự cố Hiện trường GPS 25m (Module 3 — `TriageController.java`):**
   - `POST /api/v1/issues/report`
   - Request Body (`CivicReportRequest`):
     ```json
     {
       "category": "ROAD_DAMAGE",
       "title": "Sạt lở mặt đường và ổ gà lớn gây nguy hiểm",
       "description": "Ổ gà sâu khoảng 20cm ngay ngã tư gây nguy hiểm cho người đi xe máy ban đêm.",
       "latitude": 10.3812,
       "longitude": 105.4345,
       "addressText": "Đường Lê Triệu Kiết, Phường Long Xuyên, Tỉnh An Giang",
       "reporterPhone": "0918234567",
       "wardCode": "AG_P_LONGXUYEN",
       "wardName": "Phường Long Xuyên"
     }
     ```
   - Response (`CivicReportResponse`): `{ reportCode, clusterCode, mergedIntoExistingCluster, reportCountInCluster, spatialRadiusMeters: 25.0, semanticSimilarity, targetWardCode, targetWardName }`.

### 4.2. Nhóm Cán Bộ Một Cửa (Protected Endpoints — Bắt buộc Header `Authorization: Bearer <token>`)

1. **Đăng nhập Cán bộ (`OfficerAuthController.java`):**
   - `POST /api/v1/auth/officer/login`
   - Body: `{ "badgeId": "CC-AG-8942", "pin": "8942", "wardCode": "AG_P_LONGXUYEN" }`.
2. **Kiểm tra phiên & Đăng xuất thu hồi JWT trên Redis (`OfficerAuthController.java`):**
   - `GET /api/v1/auth/officer/me`
   - `POST /api/v1/auth/officer/logout`
3. **Lấy danh sách hồ sơ thuộc địa bàn cán bộ (`CitizenDossierController.java`):**
   - `GET /api/v1/dossiers/officer/list?wardCode=AG_P_LONGXUYEN&status=PENDING`
   - Lưu ý bảo mật `SEC-09`: Backend tự động ép `effectiveWardCode = principal.wardCode()`, chống lỗi IDOR xem hồ sơ xã khác.
4. **Duyệt / Yêu cầu bổ sung / Cấp Mã Hẹn QR (`CitizenDossierController.java`):**
   - `PUT /api/v1/dossiers/{dossierCode}/review`
   - Body (`OfficerReviewRequest`):
     ```json
     {
       "status": "APPROVED",
       "officerFeedback": "Hồ sơ CT01 hợp lệ 100%. Mời anh/chị mang CCCD gốc đến Quầy số 2 xuất trình mã QR.",
       "appointmentCode": "LH-20261118-8899"
     }
     ```
5. **Xem ảnh giấy tờ đính kèm 1 lần từ Zero-Trust Vault (`VaultController.java`):**
   - `GET /api/v1/vault/view/{token}` (Tiêu thụ token bằng Redis `GETDEL`, trả về mảng byte ảnh/PDF đã đóng dấu Watermark; gọi lần 2 trả về `410 Gone`).

---

## 5. THIẾT KẾ CƠ SỞ DỮ LIỆU CỤC BỘ OFFLINE (`expo-sqlite` & `SecureStore`)

Để đảm bảo người dân ở vùng sâu, vùng biên giới hoặc hải đảo (Đặc khu Phú Quốc, Kiên Hải, Thổ Châu) hoặc khi vào bên trong trụ sở UBND mất sóng 4G vẫn sử dụng được ứng dụng, `mobile/src/storage/sqliteDb.ts` phải khởi tạo **3 bảng SQLite cục bộ** sau:

```sql
-- 1. Bảng lưu đệm 40 Thủ tục hành chính An Giang 2026 (Tra cứu Offline 100%)
CREATE TABLE IF NOT EXISTS cached_procedures (
    procedure_code   TEXT PRIMARY KEY NOT NULL,
    procedure_name   TEXT NOT NULL,
    category         TEXT NOT NULL,
    processing_time  TEXT,
    fee_text         TEXT,
    required_docs    TEXT NOT NULL, -- JSON string
    legal_basis      TEXT,
    form_type        TEXT,
    updated_at       INTEGER NOT NULL
);

-- 2. Bảng Ví Phiếu Hẹn Điện Tử Có Mã QR & Hộp thư Email (Xuất trình tại quầy không cần 4G)
CREATE TABLE IF NOT EXISTS wallet_qr_passes (
    dossier_code      TEXT PRIMARY KEY NOT NULL,
    appointment_code  TEXT,                      -- Ví dụ: 'LH-20261118-8899'
    procedure_code    TEXT NOT NULL,
    procedure_name    TEXT NOT NULL,
    ward_code         TEXT NOT NULL,
    ward_name         TEXT NOT NULL,
    citizen_name      TEXT NOT NULL,
    citizen_cccd_mask TEXT NOT NULL,             -- '********3490'
    citizen_last4     TEXT NOT NULL,             -- '3490' (phục vụ tự động đồng bộ ngầm)
    citizen_email     TEXT,
    status            TEXT NOT NULL,             -- 'PENDING' | 'APPROVED' | 'SUPPLEMENT_REQUIRED' | 'REJECTED'
    officer_feedback  TEXT,
    sla_deadline      TEXT,
    qr_payload        TEXT NOT NULL,             -- 'SMARTWARD_PASS|HS-...|LH-...|AG_P_LONGXUYEN'
    synced_at         INTEGER NOT NULL
);

-- 3. Bảng Hàng đợi Gửi Phản ánh Sự cố Hiện trường khi mất sóng (Offline Mutation Queue)
CREATE TABLE IF NOT EXISTS offline_incident_queue (
    local_id           TEXT PRIMARY KEY NOT NULL,
    payload_json      TEXT NOT NULL,             -- Toàn bộ JSON CivicReportRequest
    retry_count       INTEGER DEFAULT 0,
    last_error        TEXT,
    created_at        INTEGER NOT NULL
);
```

---

## 6. QUY TRÌNH TRIỂN KHAI 6 CÔNG ĐOẠN (CHẶNG 0 → CHẶNG 5) & TIÊU CHÍ CHỐT CHẶN (QUALITY GATES)

Không được phép chuyển sang chặng tiếp theo nếu bất kỳ tiêu chí chốt chặn (**Gate Check**) nào của chặng hiện tại chưa đạt 100%.

---

### 🛠️ CÔNG ĐOẠN 0: Rà Soát Nhánh Git & Đồng Bộ Điểm Nối Backend Cho Mobile
* **Nhánh thực thi:** `feature/mobile-phase0-backend-sync` (tách từ `develop`).
* **Các bước thực hiện:**
  1. Kiểm tra trạng thái Git hiện tại, đảm bảo nhánh `develop` sạch sẽ và toàn bộ 420+ bài test Backend đang PASS.
  2. Kiểm tra `OfficerSecurityConfig.java`:
     - Lưu ý thứ tự ưu tiên của Spring Security giữa `GET /api/v1/vault/view/**` và `/api/v1/vault/**`.
     - Kiểm tra `corsConfigurationSource()` đảm bảo cho phép header `Authorization`, `Content-Type`, `X-Ward-Code`, `X-Correlation-Id` từ Mobile App.
  3. Kiểm tra `CitizenDossierController.java`:
     - Đảm bảo khi Cán bộ quét mã QR Phiếu hẹn trên điện thoại công dân (chứa chuỗi `LH-YYYYMMDD-XXXX` hoặc `SMARTWARD_PASS|HS-...|LH-...`), ứng dụng tách được `dossierCode` hoặc `appointmentCode` để lấy đúng hồ sơ đối chiếu.
* **Tiêu chí Chốt chặn (Gate 0):**
  - [ ] Chạy `./mvnw clean test` trong `backend/` đạt 100% PASS (0 errors, 0 failures).
  - [ ] Gọi thử `GET /api/v1/health` và `GET /api/v1/procedures` trả về HTTP 200.

---

### 🏗️ CÔNG ĐOẠN 1: Khởi Tạo Dự Án `mobile/`, Hệ Thống Token, Shared Core & Chọn 96 Xã/Phường
* **Nhánh thực thi:** `feature/mobile-phase1-foundation`
* **Các bước thực hiện:**
  1. Khởi tạo cấu trúc dự án chuẩn Expo SDK 52 + TypeScript tại `e:\SmartWardAI\mobile\`:
     - Tạo `package.json`, `app.json` (khai báo rõ quyền `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription` cho iOS và `CAMERA`, `ACCESS_FINE_LOCATION` cho Android), `tsconfig.json`, `babel.config.js`.
  2. Hiện thực `mobile/src/theme/tokens.ts`:
     - Đồng bộ và đọc từ [`docs/designs/mobile/design-tokens.json`](../designs/mobile/design-tokens.json).
     - Xây dựng hàm tính toán cỡ chữ động theo 3 chế độ `A_Standard` (`1.0x`), `A_Plus_Large` (`1.15x`), `A_PlusPlus_Elderly` (`1.32x`).
  3. Hiện thực trọn vẹn tầng `mobile/src/core/` (kế thừa từ `frontend/src/`):
     - `angiangWards.ts`: Đầy đủ 96 Xã, Phường, Đặc khu của tỉnh An Giang + hàm `resolveWardFromLocationBox()`.
     - `cccdQrParser.ts`: Hàm `parseCccdQrString()` giải mã 7 trường phân cách bằng `|` và hàm `detectDiscrepancies()`.
     - `formValidators.ts`: Toàn bộ quy tắc kiểm định tất định cho 4 biểu mẫu `CT01` (TT 116/2026/TT-BCA), `TK-KS` (TT 04/2020/TT-BTP), `TK-KH` (Luật HN&GĐ 2014), `TK-BTXH` (NĐ 20/2021 & NĐ 335/2026).
     - `visionQualityGate.ts`: Chốt chặn AI Thị Giác 3 tiêu chí (Độ sắc nét `>= 45`, Độ sáng `>= 55`, Khớp từ khóa biểu mẫu).
  4. Hiện thực `PersistentCivicHeader.tsx`, `WardSelectorModal.tsx` và `OnboardingWardScreen.tsx`:
     - Cho phép tìm kiếm không dấu/có dấu trong 96 xã/phường/đặc khu An Giang.
     - Nút **"📍 Định vị GPS tự động"** dùng `expo-location` tìm xã/phường gần nhất theo khoảng cách Haversine.
     - Nút chuyển đổi nhanh cỡ chữ **`A Cỡ chữ: Chuẩn / Lớn (A+) / Rất lớn (A++)`** ngay góc phải Header.
* **Tiêu chí Chốt chặn (Gate 1):**
  - [ ] Chạy `npx tsc --noEmit` trong `mobile/` đạt 0 lỗi biên dịch TypeScript.
  - [ ] Unit test cho `cccdQrParser`, `angiangWards`, `formValidators` đạt 100% PASS.
  - [ ] Thanh Header 56dp và thanh 5 Bottom Tabs (`64dp`) hiển thị đúng bảng màu `#00796B` / `#F8FAFC` / `#0F172A`, vùng chạm mọi nút `>= 48dp`.

---

### 💬 CÔNG ĐOẠN 2: Màn Hình 2 (Tab 1) — Trợ Lý Pháp Lý 40 TTHC, TTS 2 Chế Độ & Tải Mẫu `.DOCX`/`.PDF`
* **Nhánh thực thi:** `feature/mobile-phase2-legal-rag-tts`
* **Các bước thực hiện:**
  1. Xây dựng `LegalRagChatScreen.tsx`:
     - Tải danh mục 40 TTHC từ `GET /api/v1/procedures` (lưu đệm vào bảng `cached_procedures` trong `expo-sqlite`).
     - Hiển thị thanh lọc nhanh theo nhóm thủ tục (`Cư trú (CT01)`, `Hộ tịch (Khai sinh/Kết hôn)`, `Chứng thực`, `Bảo trợ XH & Đất đai`).
     - Kết nối `POST /api/v1/rag/ask` (kèm fallback thông minh sang `legalKnowledgeBase.ts` khi thiết bị mất mạng).
     - Hiển thị thẻ câu trả lời pháp lý 5 phần chuẩn hóa: *(1) Thành phần hồ sơ, (2) Thời hạn giải quyết, (3) Lệ phí & Miễn giảm, (4) Nơi tiếp nhận tại UBND xã/phường đang chọn, (5) Căn cứ pháp lý & Điểm tin cậy `S_max`*.
     - Khi `abstained == true` (`S_max < 0.78`), hiển thị rõ cảnh báo Chốt chặn chống ảo giác pháp lý và hướng dẫn liên hệ cán bộ Tư pháp - Hộ tịch.
  2. Xây dựng `VoiceReaderToggle.tsx` với `expo-speech`:
     - Chế độ `OFF` (mặc định): Nút nền trắng viền xanh `#A7F3D0`, chữ `#065F46` `🔊 Nghe đọc to` kèm badge xanh `#00796B` **`MỞ`**.
     - Chế độ `ON` (đang đọc): Nút nền đỏ nhạt `#FEF2F2` viền `#FCA5A5`, chữ `#DC2626` `🔇 Đang đọc...` kèm badge đỏ `#DC2626` **`TẮT`**.
     - Tự động gọi `Speech.stop()` khi người dân bấm `TẮT`, khi gửi câu hỏi mới, hoặc khi chuyển sang Tab khác (`useFocusEffect` cleanup).
  3. Xây dựng `TemplateDownloadBar.tsx`:
     - Hai nút **`📄 Tải Mẫu .DOCX`** và **`📥 Tải Mẫu .PDF`** tạo/tải tệp chuẩn Nghị định 30/2020/NĐ-CP vào `FileSystem.documentDirectory` và mở menu lưu/chia sẻ của hệ điều hành qua `Sharing.shareAsync()`.
     - **Tuyệt đối không có nút in (`window.print()`).**
* **Tiêu chí Chốt chặn (Gate 2):**
  - [ ] Tra cứu và hỏi đáp 40 TTHC hoạt động mượt cả khi Online (qua Backend `:8080`) và khi Offline (qua SQLite/KnowledgeBase).
  - [ ] Nút TTS chuyển đổi chính xác giữa 2 trạng thái `MỞ` / `TẮT` và dừng giọng đọc tức thì khi rời màn hình.
  - [ ] Tải file `.docx` và `.pdf` thành công trên điện thoại.

---

### 🛡️ CÔNG ĐOẠN 3: Màn Hình 3 (Tab 2) — Quét QR CCCD 60fps, AI Vision Gate 3 Tiêu Chí & Sơ Duyệt 4 Mẫu
* **Nhánh thực thi:** `feature/mobile-phase3-smart-form-vision`
* **Các bước thực hiện:**
  1. Xây dựng thanh chuyển 4 biểu mẫu trọng tâm (`1. CT01` | `2. Khai sinh` | `3. Kết hôn` | `4. Bảo trợ`).
  2. Xây dựng `CccdQrScannerModal.tsx` dùng `expo-camera`:
     - Khung ngắm vuông có hiệu ứng tia laser `#2DD4BF` quét dọc (`laserSweep`).
     - Khi quét trúng mã QR chuẩn Bộ Công an trên mặt trước thẻ CCCD gắn chip (`089205023490|352412345|NGUYỄN MINH TUẤN KHANH|23062005|Nam|...|15082021`), gọi `parseCccdQrString()` bóc tách 7 trường, điền tự động vào biểu mẫu trong `< 0.5 giây`, phát phản hồi rung nhẹ (Haptic/Vibration) và hiển thị huy hiệu **`VERIFIED_VIA_VNEID_QR` (Miễn nộp bản sao giấy tờ đã số hóa theo NĐ 309/2026/NĐ-CP)**.
     - Nếu người dân đã gõ tay trước đó mà khác với dữ liệu QR CCCD, gọi `detectDiscrepancies()` hiển thị cảnh báo đối soát (`WARNING` / `CONFLICT`).
  3. Xây dựng `VisionGateCard.tsx` (Chốt chặn AI Thị Giác 3 tiêu chí):
     - Cho phép chụp ảnh tờ khai bằng Camera, chọn ảnh từ máy, chọn file `.docx`/`.pdf`, **VÀ** tích hợp sẵn 3 nút kiểm thử mô phỏng nhanh ngay trên giao diện (`✓ Mẫu chuẩn rõ nét`, `✕ Thử ảnh mờ (AI Chặn)`, `⚠ Thử sai mẫu (AI Chặn)`) khớp 100% với bản mẫu [`smartward_mobile_app_prototype.html`](../designs/prototypes/smartward_mobile_app_prototype.html) để phục vụ demo hội đồng mọi lúc.
     - Hiển thị bảng 3 cột:
       1. `1. Độ sắc nét`: Điểm `sharpnessScore/100` (nếu `< 45` → báo đỏ `BỊ CHẶN — ẢNH MỜ`).
       2. `2. Khớp mẫu`: Kiểm tra đúng mã mẫu đang chọn (`CT01` / `TK-KS` / `TK-KH` / `TK-BTXH`; nếu lệch → báo đỏ `BỊ CHẶN — SAI MẪU`).
       3. `3. Chữ đã điền`: Số mục thông tin nhận diện rõ (`5/5 mục rõ`).
     - Khi bị chặn bởi tiêu chí 1 hoặc 2: Nút gửi sơ duyệt tự động đổi sang màu xám `#94A3B8`, vô hiệu hóa (`disabled = true`) và hiện nhãn **`🚫 AI Thị Giác Chặn Gửi (Chụp Lại Ảnh / Chọn Đúng Mẫu)`**.
  4. Xây dựng khối **Thông tin liên hệ & Email nhận kết quả miễn phí**:
     - Hiển thị rõ huy hiệu **`100% Miễn phí • Không SMS`**.
     - Kiểm tra hợp lệ định dạng Email (`citizenEmail`) và Số điện thoại (`phoneNumber`).
  5. Thực thi luồng gửi sơ duyệt khép kín:
     - Chạy bộ quy tắc tất định (`formValidators.ts` + `POST /api/v1/forms/precheck`).
     - Nếu có ảnh chụp tờ khai: Resize ảnh `<= 1920px` → Gọi `POST /api/v1/vault/upload` lấy `oneTimeToken` (`OTT_...`).
     - Gọi `POST /api/v1/dossiers` tạo hồ sơ trên PostgreSQL → Lưu hồ sơ vừa tạo vào bảng `wallet_qr_passes` trong `expo-sqlite` → Chuyển sang Tab 3 (`Ví Mã QR`).
* **Tiêu chí Chốt chặn (Gate 3):**
  - [ ] Quét chuỗi QR CCCD điền chính xác 100% các trường và bật cờ miễn giấy tờ số hóa `VERIFIED_VIA_VNEID_QR`.
  - [ ] Cả 4 biểu mẫu (`CT01`, `TK-KS`, `TK-KH`, `TK-BTXH`) bắt đúng các lỗi pháp lý (tuổi chủ hộ `< 18`, khai sinh lệch ngày Giấy chứng sinh, kết hôn Nam `< 20` / Nữ `< 18`, mục đích xác nhận độc thân mơ hồ, bảo trợ xã hội thiếu số tài khoản).
  - [ ] Chốt chặn AI Thị Giác khóa cứng nút gửi khi ảnh mờ (`< 45/100`) hoặc sai mẫu biểu.

---

### 🎫 CÔNG ĐOẠN 4: Màn Hình 4 (Tab 3) & Màn Hình 5 (Tab 4) — Ví Mã Hẹn QR Offline & Báo Sự Cố GPS 25m
* **Nhánh thực thi:** `feature/mobile-phase4-qr-wallet-and-gps`
* **Các bước thực hiện:**
  1. Xây dựng `DossierAndQrPassScreen.tsx` (Tab 3 — Ví Mã Hẹn QR & Hộp thư Email):
     - Cho phép công dân tra cứu bất kỳ hồ sơ nào (kể cả hồ sơ đã nộp trên máy tính Web tại nhà) bằng cách nhập **`Mã hồ sơ (HS-...)`** + **`4 số cuối CCCD`** (`POST /api/v1/dossiers/track`).
     - Tự động làm mới (poll/refresh) trạng thái các hồ sơ đang lưu trong `wallet_qr_passes` của `expo-sqlite`.
     - Hiển thị thẻ **`ElectronicQrPassCard.tsx` (PHIẾU HẸN SƠ DUYỆT ĐIỆN TỬ)** đóng khung viền xanh `#00796B` 2px:
       - Render mã QR sắc nét bằng `react-native-qrcode-svg` chứa payload chuẩn `SMARTWARD_PASS|{dossierCode}|{appointmentCode}|{wardCode}`.
       - Hiển thị rõ Mã hẹn (`LH-YYYYMMDD-XXXX`), Mã hồ sơ đồng bộ Web (`HS-...`), Họ tên công dân, Biểu mẫu & Thủ tục, Cán bộ duyệt sơ bộ, và hướng dẫn xuất trình tại Quầy ưu tiên.
       - Nút **`📥 Tải Phiếu Hẹn Có Mã QR (.pdf) Về Máy`** dùng `expo-print` (`Print.printToFileAsync`) kết hợp `expo-sharing` để lưu file `.pdf` hoàn chỉnh về điện thoại.
     - Hiển thị khối **`📬 Hộp Thư Thông Báo Email Từ Cán Bộ (Miễn phí 100%)`** phản ánh tức thì lời dặn của cán bộ (`officerFeedback`) khi hồ sơ chuyển sang `APPROVED` hoặc `SUPPLEMENT_REQUIRED`.
  2. Xây dựng `FieldIncidentReportScreen.tsx` (Tab 4 — Báo Sự Cố Hiện Trường GPS `R = 25m`):
     - Gọi `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation })` lấy tọa độ GPS phần cứng và độ sai số (`±m`).
     - Hiển thị bản đồ hiện trường kèm vòng tròn bán kính gom cụm **`R = 25m`** màu xanh `#00796B` và chấm đỏ tâm sự cố.
     - Tự động điền ô địa chỉ và chạy hàm `resolveWardFromLocationBox(addressText, lat, lon, currentWard)` để hiển thị rõ thẻ **`🏛️ Tự động định tuyến về: UBND <Tên Xã/Phường> (τ = 0.82)`** (Định tuyến liên xã/phường tự động dù người dân đang đứng ở xã khác).
     - Chọn danh mục sự cố (`ROAD_DAMAGE`, `FLOODING`, `LIGHTING_ELECTRICAL`, `ENVIRONMENT`, `ORDER_SECURITY`), nhập mô tả và **bắt buộc nhập Số điện thoại liên hệ xác minh khẩn cấp (`reporterPhone`)**.
     - Gửi lên `POST /api/v1/issues/report`. Nếu thiết bị đang mất kết nối mạng, tự động đẩy vào bảng `offline_incident_queue` trong `expo-sqlite` và đồng bộ ngầm ngay khi có mạng trở lại.
* **Tiêu chí Chốt chặn (Gate 4):**
  - [ ] Tắt mạng Wi-Fi/4G trên điện thoại, mở Tab 3 vẫn hiển thị đầy đủ thẻ Phiếu hẹn Mã QR đã lưu trong `expo-sqlite` và xuất được file `.pdf`.
  - [ ] Gửi 2 phản ánh sự cố cùng danh mục trong bán kính `25m` và mô tả tương đồng (`>= 0.82`) tự động gộp vào cùng 1 cụm (`mergedIntoExistingCluster = true`) trên Backend.

---

### 🏛️ CÔNG ĐOẠN 5: Màn Hình 6 (Tab 5) — Bàn Cán Bộ Di Động, Quét QR Tại Quầy & Kiểm Thử E2E
* **Nhánh thực thi:** `feature/mobile-phase5-officer-audit-e2e`
* **Các bước thực hiện:**
  1. Xây dựng `OfficerMobileAuditScreen.tsx` (Tab 5 — Dành cho Cán bộ Một cửa):
     - Nếu chưa đăng nhập: Hiển thị form xác thực Công chức (`Mã thẻ công chức` mặc định mẫu `CC-AG-8942`, `Mã PIN` `8942`, `Đơn vị` `AG_P_LONGXUYEN`) gọi `POST /api/v1/auth/officer/login` và lưu JWT vào `expo-secure-store`.
     - Sau khi đăng nhập:
       - **Khung Camera Quét Mã QR Phiếu Hẹn Công Dân:** Quét trực tiếp mã QR trên điện thoại hoặc bản PDF của người dân (`SMARTWARD_PASS|HS-...|LH-...` hoặc `LH-...`) → tự động mở ngay hồ sơ tương ứng lên màn hình cán bộ.
       - **Danh sách Hồ sơ chờ duyệt của Xã/Phường (`GET /api/v1/dossiers/officer/list`):** Hiển thị các hồ sơ công dân vừa nộp từ Mobile hoặc Web, số CCCD tự động che mờ dạng `********3490`.
       - **Trình xem Tài liệu Zero-Trust Vault 1 Lần (`One-Time View`):** Nút bấm mở xem ảnh tờ khai có đóng dấu Watermark chéo từ `GET /api/v1/vault/view/{token}` (hiển thị rõ trạng thái token tự hủy sau lần xem đầu tiên, bấm lần 2 báo `HTTP 410 Gone`).
       - **Khung Thẩm định & Phê duyệt 1 chạm:** Ô nhập lời dặn gửi qua Email cho công dân và 2 nút thao tác:
         - **`Yêu Cầu Bổ Sung`** (`status = 'SUPPLEMENT_REQUIRED'`)
         - **`✓ Duyệt & Gửi Mã QR`** (`status = 'APPROVED'`, tự động sinh mã hẹn `LH-YYYYMMDD-XXXX` gửi về `PUT /api/v1/dossiers/{dossierCode}/review`).
  2. Chạy toàn bộ bộ kiểm thử Unit Test, Integration Test và E2E Sync Test giữa Web ↔ Backend ↔ Mobile.
  3. Cập nhật tài liệu `docs/TODO_SPRINT_BOARD.md`, `docs/specs/MOBILE_APP_SPEC.md`, `README.md` và hợp nhất nhánh vào `develop` (`git merge --no-ff`).
* **Tiêu chí Chốt chặn (Gate 5 — Final Release Gate):**
  - [ ] Luồng liên thông 2 chiều hoạt động 100%: Công dân nộp đơn trên Mobile → Cán bộ duyệt trên Web (hoặc Tab 5 Mobile) → Công dân nhận ngay Mã hẹn QR `LH-...` trên Mobile → Cán bộ dùng Camera quét Mã QR đó mở đúng hồ sơ tại quầy.
  - [ ] 100% bài test Backend (`420+` JUnit tests), Frontend Web (`12` Regression Guard suites) và Mobile (`Jest` test suite) đều PASS.

---

## 7. DANH MỤC NHỮNG ĐIỀU BẮT BUỘC LƯU Ý & PHÒNG NGỪA LỖI (CRITICAL PITFALLS & EDGE CASES)

### 7.1. Lưu ý về Mạng LAN & Kết nối Thiết bị Thật (iOS/Android) tới Docker Backend
- Trên máy tính chạy Docker Compose, `localhost:8080` chỉ trỏ về chính thiết bị đang chạy.
- Khi chạy Mobile App trên:
  - **Android Emulator (AVD):** Phải gọi về `http://10.0.2.2:8080/api/v1`.
  - **iOS Simulator:** Gọi được `http://localhost:8080/api/v1`.
  - **Điện thoại thật (qua Expo Go cùng mạng Wi-Fi):** Phải gọi về địa chỉ IPv4 LAN của máy tính (ví dụ `http://192.168.1.x:8080/api/v1`).
- **Lưu ý cực kỳ quan trọng trong `docker-compose.yml`:**
  - Hiện tại `backend` đang cấu hình port binding là `"127.0.0.1:${SERVER_PORT:-8080}:8080"` để bảo mật, còn `frontend` (Nginx) mở cổng `"3000:80"` trên mọi interface (`0.0.0.0:3000`) và đã có sẵn Reverse Proxy `/api/` trỏ vào `http://backend:8080/api/`.
  - Do đó, khi kết nối từ **điện thoại thật qua mạng LAN Wi-Fi**, đặt `EXPO_PUBLIC_API_BASE_URL=http://<IP_LAN_MAY_TINH>:3000/api/v1` (đi qua cổng `3000` của Nginx reverse proxy) sẽ hoạt động ngay lập tức mà không cần mở cổng `8080` ra ngoài `127.0.0.1`!

### 7.2. Lưu ý về Chuỗi Ngày Tháng trên Mã QR Thẻ CCCD Gắn Chip
- Mã QR mặt trước thẻ CCCD của Bộ Công an lưu ngày sinh và ngày cấp theo định dạng **`ddMMyyyy`** không có dấu gạch chéo (ví dụ `23062005`).
- Trong khi đó, `DateLogicValidator.java` trên Backend (`ResolverStyle.STRICT`) yêu cầu định dạng chuẩn ISO `uuuu-MM-dd` (`2005-06-23`) hoặc `dd/MM/uuuu` (`23/06/2005`), và chặn mọi năm sinh `< 1900` hoặc ngày không tồn tại (như `31/02`).
- Hàm `parseCccdQrString()` trong `cccdQrParser.ts` đã chuẩn hóa sang `yyyy-MM-dd`, tuyệt đối không tự viết hàm cắt chuỗi thủ công khác ở từng màn hình để tránh lệch định dạng.

### 7.3. Lưu ý về Quản lý Vòng đời Giọng đọc AI (`expo-speech`)
- Nếu người cao tuổi bấm nút `🔊 Nghe đọc to [MỞ]` rồi lập tức bấm chuyển sang Tab khác mà không bấm `TẮT`, bộ phát âm thanh của hệ điều hành sẽ tiếp tục đọc ngầm gây khó chịu.
- **Bắt buộc** gắn hook lắng nghe sự kiện rời màn hình (`navigation.addListener('blur', () => Speech.stop())`) để tự động dừng đọc và trả trạng thái nút về `MỞ`.

### 7.4. Lưu ý về Quyền Riêng Tư & Bộ nhớ Đệm Khi Cán bộ Xem Ảnh Zero-Trust Vault
- Khi Cán bộ Một cửa mở xem ảnh tờ khai qua `GET /api/v1/vault/view/{token}`, phản hồi từ Backend có header `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`.
- Trên React Native, component `<Image>` mặc định có thể lưu cache ảnh xuống đĩa. Vì vậy, đối với ảnh lấy từ Zero-Trust Vault, **bắt buộc** tải qua Axios/Fetch với `responseType: 'arraybuffer'` (hoặc `base64` trong RAM) để hiển thị trực tiếp từ bộ nhớ RAM và xóa sạch biến chứa dữ liệu ngay khi đóng Modal xem ảnh.

---

## 8. KẾ HOẠCH KIỂM THỬ TOÀN DIỆN (UNIT, INTEGRATION & E2E WEB ↔ MOBILE SYNC)

Trước khi hợp nhất bất kỳ nhánh `feature/mobile-*` nào vào `develop`, bắt buộc chạy và vượt qua 100% 3 tầng kiểm thử sau:

### 8.1. Tầng 1 — Unit Tests trên Mobile (`cd mobile && npm test`)
1. **`cccdQrParser.test.ts`:**
   - Kiểm tra chuỗi QR CCCD 7 trường hợp lệ → trả về `valid: true`, đúng `cccdNumber` 12 số, ngày sinh `yyyy-MM-dd`, giới tính `Nam/Nữ`.
   - Kiểm tra chuỗi QR thiếu trường (`< 6` trường) hoặc CCCD không đủ 12 số → trả về `valid: false` kèm thông báo lỗi tiếng Việt rõ ràng.
   - Kiểm tra `detectDiscrepancies()` phát hiện chính xác `CONFLICT` khi họ tên/ngày sinh gõ tay khác với QR CCCD.
2. **`visionQualityGate.test.ts`:**
   - Kiểm tra ảnh đạt chuẩn (`sharpnessScore >= 45`, đúng mẫu `CT01`) → `canSubmit: true`.
   - Kiểm tra ảnh mờ (`sharpnessScore = 22 < 45`) → `isBlurry: true`, `canSubmit: false`.
   - Kiểm tra nộp nhầm mẫu (đang chọn tab `CT01` nhưng tải lên tờ khai Khai sinh `TK-KS`) → `templateMatched: false`, `canSubmit: false`.
3. **`formValidators.test.ts`:**
   - Kiểm tra đủ 4 mẫu `CT01` (tuổi chủ hộ `>= 18`, cờ `vneidHostConfirmed`), `TK-KS` (khớp Giấy chứng sinh), `TK-KH` (Nam `>= 20`, Nữ `>= 18`, chặn mục đích xác nhận độc thân chung chung), `TK-BTXH` (tuổi hưởng trợ cấp & số tài khoản ngân hàng).
4. **`crossWardRouting.test.ts`:**
   - Kiểm tra `resolveWardFromLocationBox()` định tuyến đúng về 1 trong 96 xã/phường/đặc khu An Giang theo cả tên địa chỉ (`TEXT_BOX`) lẫn tọa độ GPS Haversine (`GPS_COORDS`, bao gồm cả Đặc khu Phú Quốc, Kiên Hải, Thổ Châu).

### 8.2. Tầng 2 — Kiểm thử Hồi quy Backend & Frontend Web
- Chạy `./mvnw clean test` tại `backend/` (Đảm bảo 420+/420+ tests PASS).
- Chạy `npm run test:all` tại `frontend/` (Đảm bảo 12/12 suites & Vite build PASS).

### 8.3. Tầng 3 — Kịch bản Kiểm thử Liên thông Thực tế (End-to-End Cross-Platform Checklist)
1. **Kịch bản E2E 1 (Hỏi đáp & Tải biểu mẫu):** Mở Mobile chọn `Phường Long Xuyên` → Hỏi thủ tục Đăng ký thường trú `CT01` → Bấm `Nghe đọc to [MỞ]` rồi bấm `[TẮT]` → Bấm tải file `.DOCX` và `.PDF`.
2. **Kịch bản E2E 2 (Quét QR CCCD & Chốt chặn AI Thị Giác):** Chuyển sang Tab 2 → Quét QR CCCD tự điền 7 trường → Thử chế độ ảnh mờ (bị chặn gửi) → Chuyển sang ảnh rõ nét đúng mẫu `CT01` → Nhập Email miễn phí → Bấm gửi sơ duyệt → Nhận mã hồ sơ `HS-...`.
3. **Kịch bản E2E 3 (Đồng bộ sang Web Cán bộ & Cấp Phiếu hẹn QR):** Mở trình duyệt Web tại `/officer/ward/AG_P_LONGXUYEN` (hoặc Tab 5 Cán bộ trên Mobile) → Thấy ngay hồ sơ `HS-...` vừa nộp từ điện thoại → Bấm duyệt hợp lệ → Quay lại Tab 3 trên Mobile thấy ngay **Phiếu Hẹn Sơ Duyệt Điện Tử Có Mã QR (`LH-...`)** và thư thông báo trong Hộp thư Email.
4. **Kịch bản E2E 4 (Ví QR Offline & Quét QR tại quầy):** Tắt mạng trên điện thoại công dân → Mở Tab 3 vẫn hiển thị rõ Mã QR `LH-...` → Dùng Tab 5 (Chế độ Cán bộ Một cửa) quét Mã QR đó → Mở đúng hồ sơ công dân để đối chiếu bản chính.
5. **Kịch bản E2E 5 (Báo sự cố GPS 25m & Gom cụm 2 pha):** Mở Tab 4 gửi phản ánh ổ gà kèm tọa độ GPS bán kính `R = 25m` và SĐT khẩn cấp → Kiểm tra trên Bản đồ GIS của Cán bộ xã/phường tương ứng nhận đúng điểm nóng sự cố.
