# SmartWard AI — Đặc Tả Kiến Trúc Ứng Dụng Di Động (Mobile App Specification)

> **Trạng thái:** Đặc tả kiến trúc kỹ thuật chuẩn bị cho Giai đoạn triển khai Native Mobile App.  
> **Nền tảng mục tiêu:** iOS & Android (Cross-platform)  
> **Nguyên mẫu HTML:** `docs/designs/prototypes/smartward_mobile_app_prototype.html`  
> **Hệ thống Token thiết kế:** `mobile/DESIGN.md`, `mobile/design-tokens.json`

---

## 1. Mục Tiêu & Kiến Trúc Tổng Thể

Ứng dụng di động **SmartWard AI Mobile** được định vị là kênh tương tác trực tiếp, thuận tiện của người dân tại **96 xã, phường, đặc khu tỉnh An Giang** khi thực hiện dịch vụ công và phản ánh đô thị, đồng thời là công cụ kiểm tra đối chiếu nhanh của cán bộ Một cửa ngoài hiện trường.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ỨNG DỤNG DI ĐỘNG SMARTWARD AI                   │
│                      (React Native + Expo SDK 52)                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  expo-camera / QR    │ │ expo-location (25m)  │ │ expo-sqlite (Offline)│
│  Quét CCCD gắn chip  │ │ Bắt GPS hiện trường  │ │ Lưu ví hồ sơ & Phiếu │
│  & Mã hẹn của cán bộ │ │ tự điền địa chỉ      │ │ hẹn QR không cần 4G  │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
                                    │
                                    ▼ (HTTPS / RESTful JSON)
┌────────────────────────────────────────────────────────────────────────┐
│                   HẠ TẦNG BACKEND (SPRING BOOT 3.3)                    │
│            (Modular Monolith dùng chung 100% API với Web)              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cấu Trúc Thư Mục Dự Kiến (`mobile/`)

Mã nguồn ứng dụng di động sẽ được tổ chức độc lập trong thư mục `mobile/` ngang hàng với `frontend/` và `backend/`:

```
SmartWardAI/
├── backend/                      # Spring Boot 3.3 REST API (Cung cấp toàn bộ endpoints)
├── frontend/                     # Web App React 18 + Vite (Đã hoàn thiện)
├── mobile/                       # [Giai đoạn tiếp theo] Ứng dụng Di động
│   ├── app.json                  # Cấu hình quyền truy cập phần cứng (Camera, GPS, Bộ nhớ, Push)
│   ├── package.json              # expo-camera, expo-location, expo-speech, expo-sqlite, axios
│   └── src/
│       ├── api/                  # Tái sử dụng client.ts (chuyển đổi sang AsyncStorage)
│       ├── core/                 # Kế thừa cccdQrParser.ts, angiangWards.ts, tesseractOcr.ts
│       ├── context/              # WardContext, RoleContext, AccessibilityContext
│       ├── components/           # QrPassCard, VisionGateBadge, VoiceReaderButton
│       └── screens/              # 6 màn hình chuyên biệt (chi tiết tại Mục 3)
└── docs/mobile.md                # Tài liệu đặc tả này
```

---

## 3. Danh Mục 6 Màn Hình Chuyên Biệt

| STT | Màn hình | Chức năng nghiệp vụ chính | API Backend sử dụng |
| :-: | :--- | :--- | :--- |
| **1** | **`OnboardingWardScreen`** | Tự động định vị GPS hoặc cho phép người dân chọn 1 trong 96 xã/phường/đặc khu An Giang. Hỗ trợ thanh đổi cỡ chữ `A / A+ / A++` cho người cao tuổi. | `GET /api/v1/procedures` |
| **2** | **`LegalRagChatScreen`** | Trợ lý hỏi đáp pháp lý 40 TTHC tỉnh An Giang, tích hợp `expo-speech` đọc giọng nói tiếng Việt (2 chế độ MỞ/TẮT rõ ràng), tải biểu mẫu `.docx` / `.pdf`. | `POST /api/v1/rag/ask`<br>`GET /api/v1/procedures/{code}` |
| **3** | **`SmartFormPrecheckScreen`** | Dùng `expo-camera` quét nhanh mã QR trên thẻ CCCD gắn chip tự động điền thông tin; kiểm tra độ nét ảnh chụp giấy tờ (Laplacian $\ge 45$); sơ duyệt 4 nhóm tờ khai (`CT01`, `TK-KS`, `TK-KH`, `TK-BTXH`). | `POST /api/v1/forms/precheck`<br>`POST /api/v1/vault/upload`<br>`POST /api/v1/dossiers` |
| **4** | **`FieldIncidentReportScreen`**| Báo sự cố đô thị hiện trường: khóa tọa độ GPS độ chính xác cao $R = 25\text{m}$, tự động điền ô vị trí và nội dung, định tuyến tự động về UBND xã/phường sở tại. | `POST /api/v1/triage/reports` |
| **5** | **`DossierAndQrPassScreen`** | Ví hồ sơ điện tử: tra cứu tiến độ bằng mã hồ sơ + 4 số cuối CCCD; lưu đệm thẻ Phiếu hẹn mã QR vào `expo-sqlite` để xuất trình tại quầy Một cửa ngay cả khi không có mạng 4G. | `GET /api/v1/dossiers/track` |
| **6** | **`OfficerMobileAuditScreen`** | Màn hình dành riêng cho Cán bộ Một cửa: dùng camera quét nhanh mã QR trên điện thoại công dân (`LH-YYYYMMDD-XXXX`) để mở trực tiếp hồ sơ đối chiếu tại quầy. | `POST /api/v1/dossiers/officer/verify-qr`<br>`PUT /api/v1/dossiers/{code}/review` |

---

## 4. Bảng Ánh Xạ Chuyển Đổi Từ Web Sang Mobile Native

| Phân hệ chức năng | Triển khai trên Web (`frontend/`) | Giải pháp tương ứng trên Mobile (`mobile/`) |
| :--- | :--- | :--- |
| **Lưu trữ dữ liệu cục bộ** | `window.localStorage` | `@react-native-async-storage/async-storage` (dữ liệu thường) và `expo-secure-store` (mã JWT cán bộ) |
| **Quét mã QR & Chụp ảnh** | `navigator.mediaDevices` (Webcam HTML5) | `expo-camera` (`CameraView` phần cứng quét QR 60fps) + `expo-image-picker` |
| **Định vị hiện trường GPS**| `navigator.geolocation` | `expo-location` (`Accuracy.BestForNavigation` bán kính $R = 25\text{m}$) |
| **Giọng đọc AI tiếng Việt**| `window.speechSynthesis` | `expo-speech` (`Speech.speak(text, { language: 'vi-VN' })`) |
| **Bản đồ số GIS** | `leaflet` + OpenStreetMap Tiles | `react-native-maps` (`MapView`, `Marker`, `Circle` hiển thị bán kính 25m) |
| **Xuất file & Chia sẻ** | Tải trực tiếp qua trình duyệt | `expo-file-system` + `expo-sharing` (mở menu Lưu tệp/Gửi Zalo/In trên iOS & Android) |

---

## 5. Nguyên Tắc An Toàn & Bảo Mật Dữ Liệu Trên Mobile
1. **Zero-Trust Token:** Mọi liên kết xem ảnh giấy tờ chỉ tồn tại dưới dạng One-Time Token (OTT) tự hủy nguyên tử qua Redis `GETDEL`, không lưu trữ ảnh giấy tờ thô của công dân trong bộ nhớ tạm của ứng dụng di động.
2. **Quyền riêng tư (Nghị định 13/2023/NĐ-CP):** Số CCCD hiển thị trên các màn hình tra cứu của ứng dụng di động đều được che mờ dưới dạng `********1234`.
3. **Kênh truyền mã hóa:** Bắt buộc giao tiếp qua giao thức `https://` với chứng chỉ SSL/TLS hợp lệ (Let's Encrypt), từ chối kết nối văn bản thuần `http://` trên các bản build Production.
