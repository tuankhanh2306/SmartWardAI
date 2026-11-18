# 📱 BẢNG THEO DÕI CÔNG VIỆC CHI TIẾT PHÁT TRIỂN MOBILE APP (SMARTWARD AI MOBILE — EXPO SDK 52)

> **Quy chiếu Đặc tả:** [`docs/roadmap/MOBILE_DEVELOPMENT_PLAN.md`](MOBILE_DEVELOPMENT_PLAN.md) | [`docs/specs/MOBILE_APP_SPEC.md`](../specs/MOBILE_APP_SPEC.md) | [`docs/specs/SMARTWARD_UNIFIED_AGENT_AND_MOBILE_SPEC.md`](../specs/SMARTWARD_UNIFIED_AGENT_AND_MOBILE_SPEC.md) | [`docs/designs/mobile/DESIGN.md`](../designs/mobile/DESIGN.md) | [`docs/designs/mobile/design-tokens.json`](../designs/mobile/design-tokens.json)  
> **Phạm vi:** 96 Xã, Phường, Đặc khu tỉnh An Giang — 40 TTHC cấp xã chuẩn hóa 2026 — 6 Màn hình / 5 Bottom Tabs  
> **Ràng buộc kỷ luật (`AGENTS.md`):**
> 1. Không commit trực tiếp lên `main`. Mọi chặng phải tách nhánh `feature/mobile-*` từ `develop`.
> 2. Giữ nguyên trần cứng RAM Docker Server `<= 2048 MiB` (0 container mới).
> 3. Ngưỡng bất biến: Legal RAG `θ = 0.78`, `θ_lower = 0.42`; AI Vision Gate `sharpness >= 45/100`, `brightness >= 55/255`; GPS Triage `R = 25.0m`, `τ = 0.82`.
> 4. Bảo mật NĐ 13/2023/NĐ-CP: Che mờ CCCD `********1234`, mã hóa Vault `AES-256-GCM`, token xem 1 lần `GETDEL` (`HTTP 410 Gone` ở lần gọi thứ 2).
> 5. Tuyệt đối **0 nút In (`window.print()`)** và **0 phí SMS/Zalo** (chỉ dùng Email miễn phí + Ví Phiếu Hẹn Mã QR Offline).

---

## 🧭 TỔNG QUAN TIẾN ĐỘ 6 CHẶNG MOBILE (MOBILE SPRINT TRACKER)

| Chặng | Mã Nhánh Git (`from develop`) | Trọng tâm Kỹ thuật | Số lượng Tasks | Gate Kiểm thử | Trạng thái |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **Chặng M0** | `feature/mobile-phase0-backend-sync` | Chuẩn hóa nhánh Git, CORS LAN/Mobile, API tra cứu QR tại quầy & đồng bộ DB | **8 Tasks** (`MOB-0.1` → `0.8`) | `524` JUnit Tests PASS | ✅ Hoàn thành |
| **Chặng M1** | `feature/mobile-phase1-foundation` | Khởi tạo Expo SDK 52, Design Tokens `A/A+/A++`, Shared Core & Chọn 96 Xã | **14 Tasks** (`MOB-1.1` → `1.14`) | TypeScript `0 errors` + `36/36` Core Unit Tests PASS | ✅ Hoàn thành |
| **Chặng M2** | `feature/mobile-phase2-legal-rag-tts` | Tab 1 (`LegalRagChatScreen`): 40 TTHC Offline/Online, TTS `MỞ/TẮT`, Tải `.docx`/`.pdf` | **11 Tasks** (`MOB-2.1` → `2.11`) | RAG Guardrail & TTS Lifecycle (`45/45` Tests PASS) | ✅ Hoàn thành |
| **Chặng M3** | `feature/mobile-phase3-smart-form-vision` | Tab 2 (`SmartFormPrecheckScreen`): Quét QR CCCD 60fps, AI Vision Gate 3 tiêu chí, 4 mẫu đơn | **14 Tasks** (`MOB-3.1` → `3.14`) | Vision Gate + 4-Form Rule Engine (`57/57` Tests PASS) | ✅ Hoàn thành |
| **Chặng M4** | `feature/mobile-phase4-qr-wallet-and-gps` | Tab 3 (`DossierAndQrPassScreen` SQLite Offline + PDF) & Tab 4 (`FieldIncidentReportScreen` GPS 25m) | **11 Tasks** (`MOB-4.1` → `4.11`) | Offline Airplane Mode + GPS 25m Tests PASS | ⏳ Chờ thực hiện |
| **Chặng M5** | `feature/mobile-phase5-officer-audit-e2e` | Tab 5 (`OfficerMobileAuditScreen` Quét QR tại quầy + Vault OTT), E2E Sync Web ↔ Mobile | **10 Tasks** (`MOB-5.1` → `5.10`) | 100% E2E Cross-Platform & Merge `develop` | ⏳ Chờ thực hiện |

---

## 🛠️ CHẶNG M0: CHUẨN HÓA MÔI TRƯỜNG GIT & ĐỒNG BỘ ĐIỂM NỐI BACKEND CHO MOBILE
> **Mục tiêu:** Đảm bảo môi trường Git tuân thủ `AGENTS.md` và toàn bộ REST API trên Backend sẵn sàng nhận kết nối từ thiết bị di động thật / máy ảo qua mạng LAN.

- [x] **MOB-0.1 [Git Discipline]:** Kiểm tra nhánh hiện tại, kiểm tra `git status` để không sót thay đổi dở dang, chuyển về `develop`, kéo code mới nhất và tạo nhánh `feature/mobile-phase0-backend-sync`.
  - *Lưu ý:* Tuyệt đối không thao tác trên `main`.
- [x] **MOB-0.2 [RAM Budget Check]:** Kiểm tra lại `docker-compose.yml` đảm bảo 6 container (`postgres: 448m`, `redis: 128m`, `minio: 256m`, `ai-sidecar: 384m`, `backend: 768m`, `frontend: 64m`) giữ đúng tổng `2048 MiB` RAM; không thêm container thứ 7.
- [x] **MOB-0.3 [LAN Ingress & Reverse Proxy]:** Kiểm tra cấu hình Nginx tại `frontend/nginx.conf` (cổng `0.0.0.0:3000`) đảm bảo proxy `/api/v1/` chuyển tiếp đầy đủ headers (`Authorization`, `X-Ward-Code`, `X-Correlation-Id`, `Content-Type: multipart/form-data` với `client_max_body_size 10M`) vào `backend:8080` để điện thoại thật trong cùng Wi-Fi gọi được qua `http://<LAN_IP>:3000/api/v1`.
- [x] **MOB-0.4 [CORS Mobile Origins]:** Kiểm tra `OfficerSecurityConfig.java` và `CorsConfig.java` đảm bảo cho phép các origin từ Expo (`exp://...`, `http://localhost:8081`, `http://10.0.2.2:8081`, `http://192.168.*.*:*`) và expose header `X-Correlation-Id`.
- [x] **MOB-0.5 [API Tra cứu Hồ sơ theo Mã Hẹn QR cho Cán bộ]:** Tại `CitizenDossierController.java` và `CitizenDossierService.java`, kiểm tra/bổ sung khả năng tìm kiếm hồ sơ của cán bộ theo cả `dossierCode` (`HS-...`) lẫn `appointmentCode` (`LH-YYYYMMDD-XXXX`) khi quét mã QR tại quầy Một cửa, đồng thời vẫn giữ nguyên chốt chặn cô lập địa bàn `SEC-09` (`effectiveWardCode = principal.wardCode()`).
- [x] **MOB-0.6 [Xác thực Đường dẫn API Triage]:** Ghi chú và thống nhất toàn cục trong tài liệu + code Mobile sử dụng đúng endpoint thực tế của `TriageController.java`:
  - Gửi báo cáo sự cố: `POST /api/v1/issues/report` (thay vì `/api/v1/triage/reports`).
  - Lấy cụm sự cố: `GET /api/v1/issues/clusters` (thay vì `/api/v1/triage/clusters`).
  - Cập nhật trạng thái cụm: `PATCH /api/v1/issues/clusters/{clusterCode}/status`.
- [x] **MOB-0.7 [Xác thực Payload Đăng nhập Cán bộ]:** Thống nhất payload gọi `POST /api/v1/auth/officer/login` gửi đúng trường `pin` theo `OfficerAuthController.OfficerLoginRequest` (`{ "badgeId": "CC-AG-8942", "pin": "8942", "wardCode": "AG_P_LONGXUYEN" }`).
- [x] **MOB-0.8 [Gate 0 Verification]:** Chạy `./mvnw clean test` tại thư mục `backend/` — bắt buộc đạt 100% PASS (524 tests, 0 failures) trước khi commit `feat(backend): align mobile cors and qr lookup contracts` và chuyển sang Chặng M1.

---

## 🏗️ CHẶNG M1: KHỞI TẠO DỰ ÁN `mobile/`, HỆ THỐNG DESIGN TOKENS & TẦNG SHARED CORE
> **Mục tiêu:** Dựng bộ khung React Native + Expo SDK 52 hoàn chỉnh tại `e:\SmartWardAI\mobile\`, nạp bộ token thiết kế, tái sử dụng 100% thuật toán cốt lõi từ Web và hoàn thành luồng Chọn 96 Xã/Phường An Giang + Thanh Header cố định.

- [x] **MOB-1.1 [Khởi tạo `mobile/package.json` & Cấu hình TypeScript]:**
  - Khởi tạo `e:\SmartWardAI\mobile\package.json` với Expo SDK 52 (`expo`, `react`, `react-native`, `@react-navigation/native`, `@react-navigation/bottom-tabs`, `expo-camera`, `expo-location`, `expo-speech`, `expo-sqlite`, `expo-file-system`, `expo-sharing`, `expo-print`, `expo-image-picker`, `expo-document-picker`, `expo-image-manipulator`, `expo-secure-store`, `@react-native-async-storage/async-storage`, `@tanstack/react-query`, `axios`, `react-native-svg`, `react-native-qrcode-svg`, `react-native-maps`, `lucide-react-native`).
  - Tạo `mobile/tsconfig.json` bật `"strict": true` và `mobile/babel.config.js`.
- [x] **MOB-1.2 [Cấu hình Quyền Phần cứng trong `mobile/app.json`]:**
  - Khai báo đầy đủ quyền tiếng Việt rõ ràng cho người dân:
    - `NSCameraUsageDescription`: *"SmartWard AI cần quyền truy cập Camera để quét mã QR trên thẻ CCCD gắn chip và chụp ảnh tờ khai hành chính."*
    - `NSLocationWhenInUseUsageDescription`: *"SmartWard AI cần quyền định vị GPS độ chính xác cao (bán kính 25m) để tự động chọn UBND xã/phường gần nhất và định vị điểm sự cố đô thị."*
    - Quyền Android: `CAMERA`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`.
- [x] **MOB-1.3 [Hệ thống Theme & Cỡ chữ Người cao tuổi (`mobile/src/theme/tokens.ts`)]:**
  - Đọc trực tiếp từ `design-tokens.json` (đồng bộ từ [`docs/designs/mobile/design-tokens.json`](../designs/mobile/design-tokens.json)).
  - Xuất bảng màu chuẩn: `primary: '#00796B'`, `primaryPressed: '#00695C'`, `primarySubtle: '#F0FDFA'`, `primaryBorder: '#99F6E4'`, `canvas: '#F8FAFC'`, `card: '#FFFFFF'`, `textPrimary: '#0F172A'`, `textSecondary: '#334155'`, `textMuted: '#64748B'`, `borderDefault: '#CBD5E1'`, cùng bộ màu ngữ nghĩa (`success`, `warning`, `error`).
  - Xuất hàm `getTypographyStyles(mode: 'A' | 'A+' | 'A++')` trả về kích thước chữ nhân đúng hệ số `1.0` (`A`), `1.15` (`A+`), `1.32` (`A++`).
  - Xuất hằng số vùng chạm tối thiểu `MIN_TOUCH_TARGET = 48` (`48x48dp`).
- [x] **MOB-1.4 [Định nghĩa Toàn bộ Kiểu Dữ liệu API (`mobile/src/types/api.types.ts`)]:**
  - Định nghĩa đầy đủ TypeScript interfaces khớp 100% với DTO Java Backend: `ApiResponse<T>`, `LegalCitation`, `RagAskRequest`, `RagAskResponse`, `ProcedureItem`, `StructuredFormPrecheckRequest`, `StructuredFormPrecheckResponse`, `VaultUploadResponse`, `SubmitDossierRequest`, `DossierSubmissionResponse`, `DossierTrackingRequest`, `DossierTrackingResponse`, `OfficerDossierDto`, `OfficerReviewRequest`, `CivicReportRequest`, `CivicReportResponse`, `IssueClusterDto`, `OfficerLoginRequest`, `OfficerLoginResponse`.
- [x] **MOB-1.5 [Tầng Core 1 — Danh mục 96 Xã/Phường/Đặc khu An Giang (`mobile/src/core/angiangWards.ts`)]:**
  - Kế thừa toàn bộ 96 đơn vị hành chính tỉnh An Giang từ `frontend/src/data/wards/anGiangWardsCatalog.ts` (14 Phường, 79 Xã, 3 Đặc khu: Phú Quốc, Kiên Hải, Thổ Châu).
  - Hiện thực hàm `findNearestWardByGps(lat: number, lon: number): { ward: WardItem; distanceMeters: number }` dùng công thức Haversine.
  - Hiện thực hàm `resolveWardFromLocationBox(addressText: string, lat?: number, lon?: number, fallbackWardCode?: string)` ưu tiên 1 theo tên xã/phường trong ô địa chỉ (`TEXT_BOX`), ưu tiên 2 theo tọa độ GPS gần nhất (`GPS_COORDS`).
- [x] **MOB-1.6 [Tầng Core 2 — Bộ Giải Mã QR CCCD 7 Trường BCA (`mobile/src/core/cccdQrParser.ts`)]:**
  - Kế thừa nguyên vẹn `parseCccdQrString(rawQr: string): QrParseResult` và `detectDiscrepancies(qrData, formData): QrFieldDiscrepancy[]` từ `frontend/src/utils/cccdQrParser.ts`.
  - Hỗ trợ giải mã chuỗi `CCCD_12|CMND_9|HO_TEN|NGAY_SINH_DDMMYYYY|GIOI_TINH|DIA_CHI|NGAY_CAP_DDMMYYYY`, chuẩn hóa ngày sang `yyyy-MM-dd` và kiểm tra regex 12 chữ số.
- [x] **MOB-1.7 [Tầng Core 3 — Động cơ Kiểm định Tất định 4 Nhóm Tờ khai (`mobile/src/core/formValidators.ts`)]:**
  - Cài đặt đầy đủ quy tắc kiểm tra cục bộ (trước khi gọi `/api/v1/forms/precheck`) cho 4 biểu mẫu:
    1. **`CT01` (TT 116/2026/TT-BCA):** Kiểm tra 12 số CCCD người khai & chủ hộ (`hostCccdNumber`), kiểm tra tuổi người khai `>= 14`, tuổi chủ hộ `>= 18`, kiểm tra cờ xác nhận chủ hộ qua VNeID (`vneidHostConfirmed`), gắn nhãn miễn giấy tờ `VERIFIED_VIA_VNEID_QR` (NĐ 309/2026/NĐ-CP).
    2. **`TK-KS` (TT 04/2020/TT-BTP):** Kiểm tra ngày sinh trẻ không ở tương lai, cảnh báo quá hạn 60 ngày, đối chiếu chéo Họ tên mẹ / Ngày sinh trẻ với Giấy chứng sinh, kiểm tra quy tắc khi cha mẹ chưa đăng ký kết hôn.
    3. **`TK-KH` (Luật HN&GĐ 2014):** Kiểm tra tuổi kết hôn tính chính xác đến từng ngày (`Nam >= 20 tuổi`, `Nữ >= 18 tuổi`), 2 số CCCD không trùng nhau, và chặn mục đích xác nhận độc thân mơ hồ (`VAGUE_MARITAL_PURPOSE`).
    4. **`TK-BTXH` (NĐ 20/2021 & NĐ 335/2026):** Kiểm tra điều kiện tuổi người cao tuổi (`>= 80` hoặc `>= 75` diện hộ nghèo/cận nghèo) hoặc mức độ khuyết tật nặng/đặc biệt nặng, bắt buộc có số tài khoản ngân hàng nhận trợ cấp không dùng tiền mặt Đề án 06.
- [x] **MOB-1.8 [Tầng Core 4 — Chốt chặn AI Thị Giác 3 Tiêu chí (`mobile/src/core/visionQualityGate.ts`)]:**
  - Xây dựng hàm `evaluateDocumentVisionGate(input)` kiểm tra 3 tiêu chí:
    1. **Tiêu chí 1 (Độ sắc nét & Độ sáng):** Resize ảnh qua `expo-image-manipulator` về cạnh dài tối đa `1920px` (chống lỗi Pixel Flood OOM `> 4096px` trên Backend), tính điểm `sharpnessScore` (`0..100`, chặn nếu `< 45`) và `brightnessScore` (`0..255`, chặn nếu `< 55`).
    2. **Tiêu chí 2 (Khớp đúng mẫu đã chọn):** Hàm `verifyTemplateMatch(rawText, fileName, expectedFormType)` kiểm tra từ khóa đặc trưng của `CT01`, `TK-KS`, `TK-KH`, `TK-BTXH`. Nếu người dân đang ở tab `CT01` nhưng tải ảnh `TK-KS` → trả về `templateMatched: false` kèm thông báo cảnh báo rõ tên mẫu bị lệch.
    3. **Tiêu chí 3 (Số trường chữ nhận diện rõ):** Đếm số trường thông tin bắt buộc đã trích xuất thành công (`extractedFieldsCount / totalExpectedFields`).
  - Hỗ trợ chế độ mô phỏng kiểm thử nhanh (`GOOD` / `BLURRY` / `WRONG_TEMPLATE`) phục vụ demo hội đồng.
- [x] **MOB-1.9 [Tầng Lưu trữ Cục bộ (`mobile/src/storage/sqliteDb.ts` & `secureAuthStorage.ts`)]:**
  - Khởi tạo cơ sở dữ liệu `smartward_mobile.db` bằng `expo-sqlite` với 3 bảng: `cached_procedures`, `wallet_qr_passes`, `offline_incident_queue`.
  - Xây dựng `secureAuthStorage.ts` dùng `expo-secure-store` (fallback `AsyncStorage` khi chạy trên môi trường test/web) để lưu `smartward_officer_token`, `smartward_officer_profile`.
- [x] **MOB-1.10 [Tầng Kết nối API & Offline Sync (`mobile/src/api/client.ts` & `offlineSyncManager.ts`)]:**
  - Cấu hình Axios instance đọc `EXPO_PUBLIC_API_BASE_URL` (hỗ trợ đổi IP LAN máy chủ ngay trong Cài đặt nhanh nếu cần demo trên điện thoại thật).
  - Request Interceptor tự động gắn header `Authorization: Bearer <token>` và `X-Ward-Code: <currentWardCode>`.
  - Response Interceptor tự động xử lý `401 Unauthorized` khi JWT hết hạn (`payload.exp * 1000 < Date.now()`).
- [x] **MOB-1.11 [3 Context Quản lý Trạng thái Toàn cục (`mobile/src/context/`)]:**
  - `WardContext.tsx`: Lưu xã/phường đang chọn (mặc định `AG_P_LONGXUYEN` — Phường Long Xuyên), danh sách dịch vụ trực tuyến, giờ làm việc, hàm đổi xã/phường và định vị GPS.
  - `AccessibilityContext.tsx`: Quản lý `fontScaleMode` (`'A' | 'A+' | 'A++'`), hàm `cycleFontMode()`, và trạng thái đọc giọng nói TTS toàn cục.
  - `OfficerAuthContext.tsx`: Quản lý đăng nhập, đổi mã PIN, kiểm tra phiên và đăng xuất cán bộ.
- [x] **MOB-1.12 [Thanh Header Cố định & Màn hình Chọn 96 Xã (`PersistentCivicHeader.tsx`, `WardSelectorModal.tsx`, `OnboardingWardScreen.tsx`)]:**
  - Thiết kế `PersistentCivicHeader.tsx` cao `56dp`:
    - Bên trái: Nút Pill màu xanh ngọc `#F0FDFA` viền `#99F6E4` hiển thị `📍 <Tên Xã/Phường> [Đổi Xã]`.
    - Bên phải: Nút chuyển cỡ chữ `A Cỡ chữ: Chuẩn / Lớn (A+) / Rất lớn (A++)`.
  - Thiết kế `WardSelectorModal.tsx` & `OnboardingWardScreen.tsx`: Ô tìm kiếm nhanh 96 xã/phường/đặc khu An Giang, bộ lọc theo loại đơn vị (`Tất cả`, `Phường`, `Xã`, `Đặc khu`), nút **`🎯 Định vị GPS tự động`** tìm xã gần nhất, và thẻ hiển thị địa chỉ trụ sở UBND + số điện thoại Một cửa.
- [x] **MOB-1.13 [Thanh Điều hướng 5 Tab Đáy (`BottomTabNavigator.tsx`)]:**
  - Cấu hình 5 Bottom Tabs chiều cao `64dp`, màu active `#00796B`, màu inactive `#64748B`:
    1. `💬 40 TTHC` (`LegalRagChatScreen`)
    2. `🛡️ Sơ Duyệt` (`SmartFormPrecheckScreen`)
    3. `🎫 Ví Mã QR` (`DossierAndQrPassScreen`)
    4. `📍 Sự Cố 25m` (`FieldIncidentReportScreen`)
    5. `🏛️ Cán Bộ` (`OfficerMobileAuditScreen`)
- [x] **MOB-1.14 [Gate 1 Verification]:**
  - Viết và chạy Unit Tests cho `cccdQrParser.test.ts`, `formValidators.test.ts`, `visionQualityGate.test.ts`, `crossWardRouting.test.ts`.
  - Chạy `npx tsc --noEmit` và `npm test` trong `mobile/` đạt 100% PASS (`36/36` tests, `0` TypeScript errors) trước khi commit vào nhánh `feature/mobile-phase1-foundation`.

---

## 💬 CHẶNG M2: TAB 1 (`LegalRagChatScreen`) — HỎI ĐÁP 40 TTHC, GIỌNG ĐỌC TTS MỞ/TẮT & TẢI MẪU `.DOCX`/`.PDF`
> **Mục tiêu:** Hoàn thiện kênh tra cứu và tư vấn pháp lý 40 TTHC cấp xã tỉnh An Giang 2026 với cơ chế chống ảo giác (`θ = 0.78`), đọc giọng nói tiếng Việt cho người cao tuổi và tải trực tiếp biểu mẫu về máy.

- [x] **MOB-2.1 [Đồng bộ & Cache 40 TTHC An Giang 2026]:**
  - Khi mở `LegalRagChatScreen`, gọi `GET /api/v1/procedures` lưu toàn bộ 40 TTHC vào bảng `cached_procedures` trên `expo-sqlite`. Nếu mất mạng, tự động đọc từ `cached_procedures` và `legalKnowledgeBase.ts`.
- [x] **MOB-2.2 [Thanh Lọc Nhanh Nhóm Thủ tục & Câu hỏi Gợi ý]:**
  - Hiển thị dải nút lọc ngang (Chips): `Tất cả (40)`, `Cư trú (CT01)`, `Hộ tịch (Khai sinh/Kết hôn)`, `Chứng thực`, `Bảo trợ XH`, `Đất đai & Xây dựng`.
  - Hiển thị các câu hỏi mẫu 1 chạm phổ biến tại An Giang để người dân lớn tuổi không cần gõ phím nhiều.
- [x] **MOB-2.3 [Hiển thị Thẻ Câu trả lời Pháp lý 5 Phần Chuẩn hóa]:**
  - Kết nối `POST /api/v1/rag/ask` với `{ question, wardName, threshold: 0.78 }`.
  - Hiển thị rõ huy hiệu mã thủ tục và điểm tương đồng Cosine: ví dụ `TTHC-CR-01 • S_max = 0.94`.
  - Trình bày 5 mục rõ ràng: **1. Thành phần hồ sơ**, **2. Thời hạn giải quyết**, **3. Lệ phí & Đối tượng miễn giảm**, **4. Nơi tiếp nhận (gắn đúng tên UBND xã/phường đang chọn)**, **5. Căn cứ pháp lý trích dẫn (2026)**.
- [x] **MOB-2.4 [Giao diện Chốt chặn Từ chối An toàn (`Abstention Guardrail` khi `S_max < 0.78`)]:**
  - Khi phản hồi từ Backend có `abstained: true` hoặc `maxSimilarity < 0.78`, hiển thị thẻ cảnh báo màu vàng/đỏ nhạt giải thích rõ câu hỏi nằm ngoài phạm vi 40 TTHC cấp xã hoặc chưa đủ độ tin cậy pháp lý, tuyệt đối không sinh câu trả lời suy đoán.
  - Nếu điểm nằm trong vùng xám (`0.42 <= S_max < 0.78`), thông báo câu hỏi đã được chuyển vào hàng đợi `HITL Queue` để cán bộ Tư pháp - Hộ tịch thẩm định.
- [x] **MOB-2.5 [Component Nút Đọc Giọng Nói 2 Chế độ (`VoiceReaderToggle.tsx`)]:**
  - Sử dụng `expo-speech` (`Speech.speak(cleanText, { language: 'vi-VN', rate: 0.95 })`).
  - **Trạng thái 1 (Chưa đọc — Mặc định):** Nền `#FFFFFF`, viền `#A7F3D0`, chữ `#065F46`, nhãn `🔊 Nghe đọc to` + badge `#00796B` chữ trắng **`MỞ`**.
  - **Trạng thái 2 (Đang đọc):** Nền `#FEF2F2`, viền `#FCA5A5`, chữ `#DC2626`, nhãn `🔇 Đang đọc...` + badge `#DC2626` chữ trắng **`TẮT`**.
- [x] **MOB-2.6 [Quản lý Vòng đời Âm thanh TTS (Chống đọc tràn sang màn hình khác)]:**
  - Tự động gọi `Speech.stop()` và đặt `isSpeaking = false` khi: (a) người dùng bấm lại nút `TẮT`, (b) người dùng gửi câu hỏi mới, (c) người dùng chuyển sang Tab khác (`blur` event), hoặc (d) component unmount.
- [x] **MOB-2.7 [Thanh Tải Biểu mẫu Trực tiếp `.DOCX` và `.PDF` (`TemplateDownloadBar.tsx`)]:**
  - Đặt ngay dưới mỗi câu trả lời thủ tục 2 nút bấm kích thước `>= 48dp`:
    - **`📄 Tải Mẫu .DOCX`** (Ví dụ: `Mau_CT01_CuTru_Chuan_ND30.docx`)
    - **`📥 Tải Mẫu .PDF`** (Ví dụ: `Mau_CT01_CuTru_Chuan_ND30.pdf`)
  - Ghi tệp vào `FileSystem.documentDirectory` và mở hộp thoại chia sẻ/lưu tệp hệ thống qua `Sharing.shareAsync()`.
- [x] **MOB-2.8 [Kiểm tra Kỷ luật Cấm Nút In]:**
  - Rà soát toàn bộ `LegalRagChatScreen` và `TemplateDownloadBar` đảm bảo **không tồn tại bất kỳ nút "In" hay lệnh `print` hội thoại nào**.
- [x] **MOB-2.9 [Nút Chuyển tiếp Nhanh sang Tab Sơ duyệt]:**
  - Thêm nút CTA phụ `"🛡️ Chuyển sang Sơ duyệt & Kiểm tra tờ khai này"` tự động mở Tab 2 (`SmartFormPrecheckScreen`) và chọn đúng mã biểu mẫu tương ứng (`CT01`, `TK-KS`, `TK-KH`, `TK-BTXH`).
- [x] **MOB-2.10 [Áp dụng Cỡ chữ Động `A / A+ / A++`]:**
  - Toàn bộ nội dung câu trả lời pháp lý, trích dẫn điều khoản và nút bấm trên Tab 1 phải tự động co giãn tức thì khi người dân bấm nút `A Cỡ chữ` trên Header.
- [x] **MOB-2.11 [Gate 2 Verification]:**
  - Kiểm thử đầy đủ các kịch bản hỏi đáp 40 TTHC, câu hỏi bẫy (`S_max < 0.78`), bật/tắt giọng đọc TTS và tải file `.docx`/`.pdf` đạt 100% PASS (`45/45` tests, `0` TypeScript errors).

---

## 🛡️ CHẶNG M3: TAB 2 (`SmartFormPrecheckScreen`) — QUÉT QR CCCD, AI VISION GATE 3 TIÊU CHÍ & NỘP ĐƠN SƠ DUYỆT
> **Mục tiêu:** Giúp người dân tự kiểm tra tính hợp lệ của 4 nhóm tờ khai trọng tâm và chất lượng ảnh chụp ngay trên điện thoại trước khi gửi lên cán bộ Một cửa, loại bỏ hoàn toàn tình trạng nộp ảnh mờ hoặc nộp nhầm mẫu.

- [x] **MOB-3.1 [Thanh Chọn 4 Biểu mẫu Trọng tâm]:**
  - Xây dựng Segmented Control 4 tab: **`1. CT01 (Cư trú)`** | **`2. Khai sinh (TK-KS)`** | **`3. Kết hôn (TK-KH)`** | **`4. Bảo trợ (TK-BTXH)`**.
- [x] **MOB-3.2 [Modal Camera Quét QR CCCD 60fps (`CccdQrScannerModal.tsx`)]:**
  - Tích hợp `CameraView` từ `expo-camera` với `barcodeScannerSettings={{ barcodeTypes: ['qr'] }}`.
  - Vẽ khung ngắm căn chỉnh góc thẻ CCCD và đường tia laser `#2DD4BF` chuyển động lên xuống.
  - Bổ sung nút **"Dùng dữ liệu QR CCCD mẫu (Demo)"** ngay trong Modal để khi chạy trên máy ảo không có thẻ CCCD vật lý trước camera vẫn test được luồng quét 100%.
- [x] **MOB-3.3 [Tự động Điền Biểu mẫu `< 0.5s` & Huy hiệu Miễn Giấy tờ Số hóa]:**
  - Ngay khi `parseCccdQrString()` giải mã thành công chuỗi 7 trường, tự động điền `fullName`, `cccdNumber`, `dateOfBirth`, `gender`, `address`, `issueDate` vào biểu mẫu đang mở.
  - Tự động bật cờ `qrVerified = true` và hiển thị huy hiệu xanh **`✓ VERIFIED_VIA_VNEID_QR — Miễn nộp bản sao/chứng thực giấy tờ cư trú (NĐ 309/2026/NĐ-CP)`**.
- [x] **MOB-3.4 [Cảnh báo Đối soát Chéo QR CCCD vs. Dữ liệu Gõ tay]:**
  - Nếu người dân sửa tay hoặc đã nhập trước thông tin khác với dữ liệu trong mã QR CCCD, hiển thị danh sách cảnh báo từ `detectDiscrepancies()` (`WARNING` khi lệch hoa/thường, `CONFLICT` màu đỏ khi lệch số CCCD, họ tên hoặc ngày sinh).
- [x] **MOB-3.5 [Chụp Ảnh Tờ khai / Chọn File `.DOCX` & Tiền xử lý Chống OOM]:**
  - Tích hợp nút **Chụp ảnh tờ khai (`expo-image-picker` / `expo-camera`)** và **Tải file `.DOCX` / `.PDF` (`expo-document-picker`)**.
  - Bắt buộc chạy bước nén & thu nhỏ ảnh chụp qua `expo-image-manipulator` (`width <= 1920`, JPEG `0.82`) để đảm bảo kích thước ảnh luôn `< 4096px` và `< 5MB`.
- [x] **MOB-3.6 [Thẻ Chẩn đoán Chốt chặn AI Thị Giác 3 Tiêu chí (`VisionGateCard.tsx`)]:**
  - Hiển thị thẻ 3 cột trực quan ngay sau khi chọn ảnh/file (hoặc bấm 3 nút mô phỏng nhanh `✓ Mẫu chuẩn rõ nét` / `✕ Thử ảnh mờ` / `⚠ Thử sai mẫu`):
    1. **`1. Độ sắc nét`**: Hiển thị điểm `XX/100 điểm` (Đạt khi `>= 45`, chặn đỏ `BỊ CHẶN — ẢNH MỜ` khi `< 45`).
    2. **`2. Khớp mẫu`**: Hiển thị `Đúng <Mã mẫu>` (Đạt khi khớp tab đang chọn, chặn đỏ `BỊ CHẶN — SAI MẪU` khi lệch mẫu, ví dụ đang chọn `CT01` nhưng tải ảnh `TK-KS`).
    3. **`3. Chữ đã điền`**: Hiển thị số trường nhận diện rõ (ví dụ `5/5 mục rõ`).
- [x] **MOB-3.7 [Cơ chế Khóa Cứng Nút Gửi khi Vi phạm AI Vision Gate]:**
  - Khi `isBlurry == true` hoặc `isTooDark == true` hoặc `templateMatched == false`:
    - Khóa cứng nút nộp (`disabled = true`), đổi nền sang `#94A3B8`.
    - Đổi nhãn nút thành **`🚫 AI Thị Giác Chặn Gửi (Chụp Lại Ảnh)`** hoặc **`🚫 AI Thị Giác Chặn Gửi (Chọn Đúng Mẫu)`**.
- [x] **MOB-3.8 [Các Trường Đặc thù của Biểu mẫu 1 — `CT01` (Cư trú - TT 116/2026/TT-BCA)]:**
  - Hiển thị và kiểm tra: Họ tên, 12 số CCCD người khai, Ngày sinh, Địa chỉ thường trú/tạm trú đề nghị, Họ tên chủ hộ, **12 số CCCD chủ hộ (`hostCccdNumber`)**, **Ngày sinh/Tuổi chủ hộ (`>= 18` tuổi)**, và công tắc **`Xác nhận đồng ý của chủ hộ qua VNeID (`vneidHostConfirmed`)`**.
- [x] **MOB-3.9 [Các Trường Đặc thù của Biểu mẫu 2 — `TK-KS` (Khai sinh - TT 04/2020/TT-BTP)]:**
  - Hiển thị và kiểm tra: Họ tên trẻ, Ngày sinh trẻ, Nơi sinh, Họ tên & 12 số CCCD của Mẹ/Cha, **Thông tin trên Giấy chứng sinh (Họ tên mẹ, Ngày sinh trẻ, Số Giấy chứng sinh)** để đối chiếu chéo tự động (`Cross-Document Check`), và công tắc tình trạng hôn nhân của cha mẹ.
- [x] **MOB-3.10 [Các Trường Đặc thù của Biểu mẫu 3 — `TK-KH` (Kết hôn & Xác nhận độc thân - Luật HN&GĐ 2014)]:**
  - Hiển thị và kiểm tra: Họ tên, Ngày sinh, 12 số CCCD của Nam và Nữ (tính chính xác đến từng ngày: **Nam `>= 20` tuổi, Nữ `>= 18` tuổi**), và ô **Mục đích cấp Giấy xác nhận tình trạng hôn nhân** (chặn các cụm từ mơ hồ như *"Bổ sung hồ sơ"*, *"Làm giấy tờ cá nhân"*).
- [x] **MOB-3.11 [Các Trường Đặc thù của Biểu mẫu 4 — `TK-BTXH` (Bảo trợ xã hội - NĐ 20/2021 & NĐ 335/2026)]:**
  - Hiển thị và kiểm tra: Họ tên, Ngày sinh (kiểm tra mốc `>= 80` tuổi hoặc `>= 75` tuổi hộ nghèo), Nhóm đối tượng hưởng, Mức độ khuyết tật (`NẶNG` / `ĐẶC BIỆT NẶNG`), và **Số tài khoản ngân hàng + Tên ngân hàng nhận trợ cấp không dùng tiền mặt (Đề án 06)**.
- [x] **MOB-3.12 [Thẻ Nhập Email Nhận Kết Quả & Mã Hẹn QR Miễn Phí 100%]:**
  - Thiết kế thẻ riêng có huy hiệu **`100% Miễn phí • Không SMS`** thu thập `citizenEmail` (bắt buộc đúng chuẩn email) và `phoneNumber` (10 chữ số).
- [x] **MOB-3.13 [Luồng Gửi Sơ Duyệt Khép Kín (`Vault` → `Precheck` → `Dossiers` → `SQLite`)]:**
  - Khi bấm **`✨ Kiểm Tra & Gửi Sơ Duyệt Cán Bộ`**:
    1. Chạy `formValidators.ts` + gọi `POST /api/v1/forms/precheck`. Nếu có lỗi pháp lý, hiển thị danh sách lỗi chi tiết từng trường để công dân sửa trên tờ khai trước khi nộp.
    2. Tải ảnh tờ khai lên `POST /api/v1/vault/upload` lấy `oneTimeToken` (`OTT_...`) và xóa file ảnh tạm trong bộ nhớ cache của máy.
    3. Gọi `POST /api/v1/dossiers` lưu hồ sơ vào bảng `citizen_dossiers` trên PostgreSQL, nhận về `dossierCode` (`HS-...`) và `slaDeadline`.
    4. Lưu bản ghi hồ sơ vào bảng `wallet_qr_passes` trong `expo-sqlite` và tự động chuyển người dân sang Tab 3 (`Ví Mã QR`).
- [x] **MOB-3.14 [Gate 3 Verification]:**
  - Kiểm thử toàn bộ 4 biểu mẫu, 3 trạng thái AI Vision Gate và luồng nộp hồ sơ lên PostgreSQL đạt 100% PASS (`57/57` tests, `0` TypeScript errors).

---

## 🎫 CHẶNG M4: TAB 3 (`DossierAndQrPassScreen`) & TAB 4 (`FieldIncidentReportScreen`) — VÍ MÃ HẸN QR OFFLINE & BÁO SỰ CỐ GPS 25M
> **Mục tiêu:** Cung cấp Ví lưu trữ Phiếu hẹn Mã QR hoạt động cả khi không có sóng 4G, đồng bộ thời gian thực với Bàn Cán Bộ trên Web, và công cụ báo cáo sự cố hiện trường GPS chính xác cao `R = 25m` tự động định tuyến liên xã/phường.

- [ ] **MOB-4.1 [Khung Tra cứu & Đồng bộ Hồ sơ Xuyên Thiết bị (Web ↔ Mobile)]:**
  - Trên `DossierAndQrPassScreen.tsx`, xây dựng ô tra cứu bằng **`Mã hồ sơ (`HS-...`)`** + **`4 số cuối CCCD`** gọi `POST /api/v1/dossiers/track`.
  - Giúp người dân nộp đơn trên máy tính ở nhà vẫn kéo được ngay hồ sơ đó về Ví trên điện thoại để mang ra UBND xã.
- [ ] **MOB-4.2 [Đồng bộ Ngầm Trạng thái Hồ sơ & Lưu Đệm `expo-sqlite`]:**
  - Mỗi khi mở Tab 3 (hoặc kéo xuống để làm mới `Pull-to-Refresh`), tự động gọi `POST /api/v1/dossiers/track` cho các hồ sơ trong `wallet_qr_passes`.
  - Khi cán bộ trên Web bấm duyệt (`status = 'APPROVED'`, sinh `appointmentCode = 'LH-...'`), cập nhật ngay vào bảng `wallet_qr_passes` của `expo-sqlite`.
- [ ] **MOB-4.3 [Thẻ Phiếu Hẹn Sơ Duyệt Điện Tử Có Mã QR (`ElectronicQrPassCard.tsx`)]:**
  - Đóng khung viền `#00796B` dày `2px`, hiển thị huy hiệu **`PHIẾU HẸN SƠ DUYỆT ĐIỆN TỬ`**, tên **`UBND <Tên Xã/Phường>`**, **`Bộ phận Một cửa — Tỉnh An Giang`**.
  - Vẽ mã QR sắc nét bằng `react-native-qrcode-svg` với chuỗi dữ liệu chuẩn `SMARTWARD_PASS|{dossierCode}|{appointmentCode}|{wardCode}` và nhãn monospace `LH-YYYYMMDD-XXXX` bên dưới.
  - Hiển thị 4 ô thông tin: **Họ và tên công dân**, **Mã hồ sơ đồng bộ Web (`HS-...`)**, **Biểu mẫu & Thủ tục**, **Trạng thái / Cán bộ duyệt sơ bộ**, cùng khung hướng dẫn xuất trình tại Quầy ưu tiên.
- [ ] **MOB-4.4 [Xuất & Tải File `.PDF` Phiếu Hẹn Có Mã QR (`expo-print` + `expo-sharing`)]:**
  - Khi bấm nút **`📥 Tải Phiếu Hẹn Có Mã QR (.pdf) Về Máy`**, kết xuất mẫu HTML chuẩn hành chính của Phiếu hẹn kèm mã QR SVG sang file `.pdf` bằng `Print.printToFileAsync()` và mở menu lưu về máy qua `Sharing.shareAsync()`.
  - Tuyệt đối không mở hộp thoại in máy in (`Print.printAsync`).
- [ ] **MOB-4.5 [Hộp Thư Thông Báo Email Từ Cán Bộ (Miễn phí 100%)]:**
  - Hiển thị danh sách thông báo kết quả sơ duyệt gửi tới địa chỉ `citizenEmail` của công dân kèm lời dặn chi tiết của cán bộ (`officerFeedback`), thời gian phản hồi và trạng thái (`APPROVED` / `SUPPLEMENT_REQUIRED` / `REJECTED`).
- [ ] **MOB-4.6 [Định vị GPS Phần cứng Chính xác cao `R = 25m` (`FieldIncidentReportScreen.tsx`)]:**
  - Yêu cầu quyền vị trí và gọi `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation })`.
  - Hiển thị huy hiệu độ chính xác GPS thực tế (ví dụ `GPS ±6m`) và tọa độ `(lat, lon)`.
- [ ] **MOB-4.7 [Bản đồ Hiện trường & Vòng tròn Bán kính Gom cụm `R = 25m`]:**
  - Hiển thị bản đồ hiện trường (`MapView` / khung bản đồ trực quan) với chấm đỏ tâm sự cố và vòng tròn bán kính **`R = 25m`** màu xanh `#00796B` kèm chú thích tọa độ.
- [ ] **MOB-4.8 [Tự động Điền Địa chỉ & Định tuyến Liên Xã/Phường (`Cross-Ward Jurisdiction Routing`)]:**
  - Tự động điền địa chỉ hiện trường từ `Location.reverseGeocodeAsync()` (cho phép người dân chỉnh sửa tay nếu đứng trong hẻm).
  - Mỗi khi tọa độ hoặc ô địa chỉ thay đổi, chạy tức thì `resolveWardFromLocationBox(addressText, lat, lon, currentWard)` và hiển thị thẻ:
    **`🏛️ Tự động định tuyến về: UBND <Tên Xã/Phường Đích> | τ = 0.82`**.
- [ ] **MOB-4.9 [Biểu mẫu Gửi Phản ánh Sự cố & Bắt buộc SĐT Khẩn cấp]:**
  - Chọn 1 trong 5 danh mục chuẩn của Backend: `ROAD_DAMAGE` (Hư hỏng đường/Ổ gà), `FLOODING` (Ngập nước/Thoát nước), `LIGHTING_ELECTRICAL` (Cháy đèn đường/Điện), `ENVIRONMENT` (Rác thải/Môi trường), `ORDER_SECURITY` (Trật tự đô thị).
  - Kiểm tra bắt buộc nhập **Số điện thoại liên hệ xác minh khẩn cấp (`reporterPhone`)** và mô tả sự cố (`>= 10` ký tự).
- [ ] **MOB-4.10 [Gửi Phản ánh 2 Pha & Hàng đợi Offline (`offline_incident_queue`)]:**
  - Gọi `POST /api/v1/issues/report`. Khi thành công, hiển thị kết quả phân luồng 2 pha: Mã báo cáo (`RPT-...`), Mã cụm (`CLU-...`), trạng thái **Đã gộp vào cụm sẵn có trong bán kính 25m** hay **Tạo cụm sự cố mới**, và tên UBND xã/phường tiếp nhận.
  - Nếu thiết bị đang mất mạng, lưu vào bảng `offline_incident_queue` trên `expo-sqlite` và hiển thị thông báo *"Đã lưu vào hàng đợi Offline — Tự động gửi ngay khi có sóng 4G"*.
- [ ] **MOB-4.11 [Gate 4 Verification]:**
  - Kiểm thử chế độ Offline của Ví Mã Hẹn QR và kiểm thử gửi sự cố hiện trường đồng bộ lên Bản đồ GIS Cán bộ đạt 100% PASS.

---

## 🏛️ CHẶNG M5: TAB 5 (`OfficerMobileAuditScreen`) — BÀN CÁN BỘ DI ĐỘNG, QUÉT QR TẠI QUẦY & KIỂM THỬ E2E TOÀN DIỆN
> **Mục tiêu:** Cung cấp công cụ cho Cán bộ Một cửa dùng camera điện thoại quét nhanh Mã QR trên Phiếu hẹn của công dân tại quầy, xem ảnh giấy tờ có đóng dấu Watermark 1 lần từ Zero-Trust Vault và phê duyệt đồng bộ tức thì với Web.

- [ ] **MOB-5.1 [Màn hình Đăng nhập Cán bộ Một cửa & Lưu trữ `SecureStore`]:**
  - Khi mở Tab 5 mà chưa có JWT hợp lệ, hiển thị màn hình đăng nhập Công chức:
    - `Mã thẻ công chức` (`badgeId`, gợi ý mẫu demo `CC-AG-8942`)
    - `Mã PIN bảo mật` (`pin`, gợi ý mẫu demo `8942`)
    - `Đơn vị công tác` (`wardCode`, mặc định `AG_P_LONGXUYEN`)
  - Gọi `POST /api/v1/auth/officer/login`, lưu JWT vào `expo-secure-store`. Khi bấm Đăng xuất, gọi `POST /api/v1/auth/officer/logout` để thu hồi JWT trên Redis (`smartward:auth:revoked:{jti}`).
- [ ] **MOB-5.2 [Khung Camera Quét Mã QR Phiếu Hẹn Công Dân Tại Quầy]:**
  - Tích hợp khung ngắm Camera có tia laser quét mã QR trên màn hình `OfficerMobileAuditScreen`.
  - Hỗ trợ quét cả định dạng `SMARTWARD_PASS|{dossierCode}|{appointmentCode}|{wardCode}`, mã hẹn `LH-YYYYMMDD-XXXX` và mã hồ sơ `HS-...`.
  - Tích hợp nút **"Mô phỏng Quét QR Phiếu hẹn tại quầy"** để test nhanh trên máy ảo không có camera.
- [ ] **MOB-5.3 [Danh sách Hồ sơ Trực tuyến Thuộc Địa bàn Xã/Phường Cán bộ]:**
  - Gọi `GET /api/v1/dossiers/officer/list?wardCode=<officerWardCode>` hiển thị danh sách các hồ sơ `PENDING` / `APPROVED` / `SUPPLEMENT_REQUIRED`.
  - Đảm bảo mọi số CCCD của công dân hiển thị trên màn hình cán bộ đều được che mờ chuẩn **`********1234`** theo Nghị định 13/2023/NĐ-CP.
- [ ] **MOB-5.4 [Trình Xem Ảnh Giấy tờ Zero-Trust Vault 1 Lần (`One-Time Token GETDEL`)]:**
  - Trong chi tiết hồ sơ của cán bộ, hiển thị danh sách token tài liệu đính kèm (`vaultDocIds`).
  - Khi cán bộ bấm **"👁️ Xem ảnh tờ khai có Watermark (1 lần duy nhất)"**, gọi `GET /api/v1/vault/view/{token}` tải dữ liệu ảnh giải mã `AES-256-GCM` đã đóng dấu mờ chéo vào RAM để hiển thị trên Modal, tuyệt đối không lưu xuống bộ nhớ đĩa hay thư viện ảnh của điện thoại.
  - Nếu cán bộ bấm xem lại lần thứ 2 trên cùng một token đã tiêu thụ, hiển thị đúng cảnh báo bảo mật **`HTTP 410 GONE — Liên kết xem 1 lần đã tự hủy trên Redis theo Nghị định 13/2023/NĐ-CP`**.
- [ ] **MOB-5.5 [Thao tác Phê duyệt & Cấp Mã Hẹn QR / Yêu cầu Bổ sung 1 Chạm]:**
  - Ô nhập **Lời dặn của Cán bộ gửi qua Email cho công dân** (`officerFeedback`).
  - Nút **`Yêu Cầu Bổ Sung`** (màu đỏ nhạt `#FEF2F2`, viền `#FCA5A5`, chữ `#DC2626`): Gọi `PUT /api/v1/dossiers/{dossierCode}/review` với `status: 'SUPPLEMENT_REQUIRED'`.
  - Nút **`✓ Duyệt & Gửi Mã QR`** (màu xanh `#00796B` chữ trắng): Tự động sinh mã hẹn `LH-YYYYMMDD-XXXX` (nếu chưa có) và gọi `PUT /api/v1/dossiers/{dossierCode}/review` với `status: 'APPROVED'`.
- [ ] **MOB-5.6 [Bộ Kiểm thử Tự động Toàn diện (`mobile/src/__tests__/`)]:**
  - Hoàn thiện 5 file test trong `mobile/src/__tests__/`:
    1. `cccdQrParser.test.ts` (tối thiểu 8 test cases)
    2. `visionQualityGate.test.ts` (tối thiểu 6 test cases)
    3. `formValidators.test.ts` (tối thiểu 12 test cases cho 4 biểu mẫu `CT01`, `TK-KS`, `TK-KH`, `TK-BTXH`)
    4. `crossWardRouting.test.ts` (tối thiểu 8 test cases cho 96 xã/phường/đặc khu An Giang)
    5. `apiSyncContract.test.ts` (tối thiểu 6 test cases kiểm tra payload & đồng bộ hồ sơ/QR pass)
- [ ] **MOB-5.7 [Kiểm thử Liên thông E2E 2 Chiều (Web ↔ Backend ↔ Mobile)]:**
  - Thực hiện và xác nhận 100% PASS kịch bản liên thông:
    - *Chiều 1:* Công dân nộp đơn `CT01` trên **Mobile App** → Cán bộ mở **Web Dashboard** (`/officer/ward/AG_P_LONGXUYEN`) thấy ngay hồ sơ và bấm Duyệt → Công dân mở **Tab 3 Mobile App** nhận ngay Phiếu hẹn Mã QR `LH-...` và thông báo Email.
    - *Chiều 2:* Công dân nộp đơn trên **Web Citizen** (`/citizen/form`) → Mở **Mobile App** nhập Mã hồ sơ + 4 số cuối CCCD lưu Phiếu hẹn QR vào Ví Offline → Cán bộ dùng **Tab 5 Mobile App** quét Mã QR đó tại quầy.
- [ ] **MOB-5.8 [Cập nhật Hệ thống Tài liệu Dự án (`docs/`)]:**
  - Đồng bộ tiến độ tại `docs/roadmap/MOBILE_DEVELOPMENT_PLAN.md` và `docs/roadmap/MOBILE_TODO_SPRINT_BOARD.md`.
  - Cập nhật trạng thái hoàn thành các task `MOB-0.1` → `MOB-5.10` trong `docs/TODO_SPRINT_BOARD.md`.
  - Cập nhật hướng dẫn khởi chạy Mobile App (`cd mobile && npm install && npx expo start`) trong `README.md` và `docs/specs/MOBILE_APP_SPEC.md`.
- [ ] **MOB-5.9 [Kiểm tra Hồi quy Toàn Hệ thống Trước Khi Merge]:**
  - Chạy `./mvnw clean test` tại `backend/` (Đạt 100% PASS).
  - Chạy `npm run test:all` tại `frontend/` (Đạt 12/12 suites & Vite build PASS).
  - Chạy `npx tsc --noEmit && npm test` tại `mobile/` (Đạt 100% PASS).
- [ ] **MOB-5.10 [Merge Chuẩn Quy Trình Git (`AGENTS.md`)]:**
  - Hợp nhất nhánh tính năng vào `develop` bằng lệnh `git checkout develop && git merge --no-ff <ten-nhanh-mobile> -m "feat(mobile): complete react native expo sdk 52 app synced with web and backend"` và đẩy lên `origin/develop`.
