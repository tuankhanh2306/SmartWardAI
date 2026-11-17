# SmartWard AI — Lộ Trình Phát Triển & Trạng Thái Hoàn Thiện

> **Dự án:** Hệ sinh thái Hành chính công & Đô thị số cấp Xã/Phường SmartWard AI (Tỉnh An Giang, 96 xã/phường/đặc khu)  
> **Cập nhật:** Tháng 11/2026 — Đã hoàn thành 100% Giai đoạn Hardening, Bảo mật, Thực nghiệm thật & Đồng bộ TTHC An Giang 2026.

---

## 1. Trạng Thái Hoàn Thiện Tổng Thể (Overall Completion Status)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TIẾN ĐỘ THỰC HIỆN CÁC GIAI ĐOẠN (100% COMPLETE)                 │
├────────────────────────────┬──────────────────────────────────────┬────────────────────┤
│ Giai đoạn / Nhánh kỹ thuật │ Nội dung trọng tâm                   │ Trạng thái Git     │
├────────────────────────────┼──────────────────────────────────────┼────────────────────┤
│ M1: Bảo mật, PII & Vault   │ Che mờ CCCD, JWT Redis, chống OOM,   │ ✅ MERGED develop   │
│     Hardening              │ băm SHA-256 OTT, magic bytes Vault   │ (Commit 5a96ee0)   │
├────────────────────────────┼──────────────────────────────────────┼────────────────────┤
│ M2: Thực nghiệm thật &     │ Phân cụm 2 pha Two-Pass Bipartite,   │ ✅ MERGED develop   │
│     Validator STRICT       │ Date STRICT, CccdValidator, đa       │ (Commit 53738ea)   │
│                            │ địa phương SHA-256, N+1 fix, Lifespan│                    │
├────────────────────────────┼──────────────────────────────────────┼────────────────────┤
│ M3: 40 TTHC An Giang 2026  │ 40 seed JSONs & ground-truth An Giang│ ✅ MERGED develop   │
│     & CT01 / VNeID QR      │ 2026, Flyway V5, CT01 TT 116/2026,   │ (Commit d1da674)   │
│                            │ miễn giấy tờ số hóa NĐ 309/2026/NĐ-CP│                    │
├────────────────────────────┼──────────────────────────────────────┼────────────────────┤
│ M4: Nghiệm thu toàn diện & │ 420/420 Backend tests PASS,          │ ✅ VICTORY CONFIRMED│
│     Post-Victory Audit     │ Frontend build 0 errors, 44/44 FE    │ (Commit b6cdf25)   │
└────────────────────────────┴──────────────────────────────────────┴────────────────────┘
```

---

## 2. Chi Tiết Các Cải Tiến Đã Đóng Gói (Production-Ready Deliverables)

### 2.1. Nhóm 1: Bảo mật, Quyền riêng tư (Nghị định 13/2023/NĐ-CP) & Chống tràn bộ nhớ OOM
- **Che mờ CCCD:** Mọi API trả về cho cán bộ (`CitizenDossierService.mapToOfficerDto`) đều tự động che mờ thành dạng `********1234`.
- **Khử PII khỏi Log:** Loại bỏ số CCCD khỏi log truy vết hồ sơ (`trackDossier`); tự động thay thế chuỗi 9–12 chữ số liên tiếp thành `***REDACTED_ID***` trong log RAG.
- **Thu hồi JWT trên Redis:** Đăng xuất vô hiệu hóa token ngay lập tức thông qua Redis key `smartward:auth:revoked:{jti}` với thời gian sống (TTL) bằng thời hạn còn lại của JWT; duy trì fallback in-memory khi mất kết nối Redis.
- **Đồng bộ địa bàn:** Cập nhật mã địa bàn mặc định của cán bộ sang `AG_P_LONGXUYEN`.
- **Chống giả mạo IP & CORS:** Kích hoạt `server.forward-headers-strategy: NATIVE` để reverse-proxy tin cậy tự động thiết lập IP; hàm `extractClientIp` đọc trực tiếp từ `request.getRemoteAddr()`; loại bỏ hoàn toàn ký tự đại diện `*` trong cấu hình CORS.
- **Chống Pixel Flood OOM:** Đọc kích thước điểm ảnh từ header file ảnh trước khi giải mã. Chặn đứng các tệp có chiều rộng > 4096px, chiều cao > 4096px hoặc tổng số điểm ảnh > 16.777.216 pixels; tự động gọi `flush()` giải phóng bộ nhớ đồ họa nguyên bản.
- **Băm Token Zero-Trust Vault:** Toàn bộ One-Time Token (OTT) lưu trữ trong cơ sở dữ liệu đều được băm bằng SHA-256; tự động nhận diện magic bytes (%PDF, \xFF\xD8\xFF, PNG) để trả về đúng `Content-Type`.

### 2.2. Nhóm 2: Đánh giá thực nghiệm trung thực, Chuẩn hóa Validator & Tối ưu hiệu năng
- **Thuật toán đối sánh thực nghiệm hai pha (Two-Pass Bipartite Majority Alignment):** Thay thế toàn bộ các biến đếm giả lập bằng thuật toán so khớp cụm thực tế trên 150 phản ánh dân sinh (`generated-reports.csv`) và tính toán chính xác tỷ lệ phân tách các ca biên (`COLOCATED_DIFFERENT_CATEGORY`, `SAME_CATEGORY_DISTANT_LOCATION`).
- **Benchmark RAG động:** Đo thời gian thực bằng `System.nanoTime()`, đo độ tương đồng vector thực tế, tính toán động Recall@3 và MRR, bắt buộc từ chối an toàn khi $S_{\max} < 0.78$.
- **Bộ kiểm tra ngày tháng nghiêm ngặt (`DateLogicValidator`):** Áp dụng `ResolverStyle.STRICT` cho cả định dạng `dd/MM/uuuu` và `uuuu-MM-dd`, từ chối các ngày không hợp lệ (ví dụ: ngày 31/02) và chặn đứng năm sinh trước 1900 với mã lỗi `INVALID_DATE_LOGIC`.
- **Cảnh báo kiểm tra CCCD (`CccdValidator`):** Gắn cờ cảnh báo `CANNOT_VERIFY_CCCD_YEAR_GENDER` khi chuỗi ngày sinh không đúng định dạng thay vì bỏ qua im lặng.
- **Bộ nhớ đệm đa địa phương (`QueryCacheService`):** Nạp chồng phương thức tạo khóa băm SHA-256 kết hợp giữa nội dung câu hỏi, mã/tên xã phường và danh mục thủ tục, chống dùng chung kết quả giữa các địa phương khác nhau.
- **Xóa truy vấn N+1:** Tối ưu hóa `ProcedureService.getProcedures()` bằng câu truy vấn gộp nhóm `countChunksByProcedure` trong `LegalChunkRepository`.
- **Tối ưu hóa NLP & Python Sidecar:** Tiền biên dịch sẵn toàn bộ biểu thức chính quy (static pre-compiled `Pattern`) trong `VietnameseTextNormalizer`; nâng cấp `serve.py` của Python FastAPI sang cơ chế quản lý vòng đời hiện đại `asynccontextmanager lifespan`.

### 2.3. Nhóm 3: Chuẩn hóa 40 TTHC tỉnh An Giang (2026) & Nâng cấp Rule Engine
- **Đồng bộ hóa 40 file Seed JSON & Benchmark Ground-Truth:**
  - Chuyển đổi toàn bộ các thủ tục cũ sang thẩm quyền giải quyết của UBND xã, phường, đặc khu thuộc tỉnh An Giang và Chủ tịch UBND cấp xã theo các văn bản quy phạm pháp luật hiệu lực năm 2026:
    - *Hộ tịch & Liên thông điện tử:* Quyết định 408/QĐ-UBND của UBND tỉnh An Giang, Nghị định 301/2026/NĐ-CP (liên thông Khai sinh - Thường trú - BHYT - Căn cước và Khai tử - Xóa thường trú - Mai táng phí).
    - *Cư trú:* Thông tư 116/2026/TT-BCA và Nghị định 154/2024/NĐ-CP.
    - *Bảo trợ xã hội:* Nghị định 335/2026/NĐ-CP và Quyết định 4595/QĐ-UBND (thời hạn mai táng phí 03 ngày làm việc).
    - *Đất đai:* Nghị định 49/2026/NĐ-CP, Quyết định 3828/QĐ-UBND và Quyết định 5025/QĐ-UBND.
    - *Chứng thực & Phi địa giới:* Nghị định 18/2026/NĐ-CP và Nghị định 309/2026/NĐ-CP.
  - Sạch sẽ 100% các nhãn địa phương cũ (Đà Nẵng).
- **Cơ sở dữ liệu & Flyway Migration V5:**
  - Tạo mới tệp migration `V5__sync_an_giang_2026_procedures.sql`.
  - Giữ nguyên vẹn 100% nội dung và checksum của các migration trước đó (`V1` đến `V4`).
- **Nâng cấp Rule Engine Biểu mẫu CT01 (TT 116/2026/TT-BCA):**
  - Kiểm tra hợp lệ 12 chữ số CCCD chủ hộ (`hostCccdNumber`), kiểm tra độ tuổi chủ hộ $\ge 18$ tuổi.
  - Hỗ trợ cờ xác nhận đồng ý của chủ hộ qua VNeID (`vneidHostConfirmed == true`), tự động miễn yêu cầu nộp văn bản giấy có ý kiến chủ hộ.
- **Quy tắc "Miễn nộp lại giấy tờ đã số hóa" (NĐ 309/2026/NĐ-CP):**
  - Tự động gắn nhãn `VERIFIED_VIA_VNEID_QR` khi quét thành công mã QR thẻ CCCD gắn chip hoặc chọn xác thực qua VNeID, hiển thị hướng dẫn miễn photo/chứng thực lại giấy tờ cư trú.
- **Đồng bộ hóa Frontend (`legalKnowledgeBase.ts`):**
  - Đồng bộ chuẩn xác mã thủ tục, tên gọi, thời hạn giải quyết, lệ phí và căn cứ pháp lý 2026.
  - Chuyển đổi mô hình quản lý sang chính quyền 2 cấp: Tỉnh An Giang $\rightarrow$ Xã / Phường / Đặc khu.

---

## 3. Lộ Trình Triển Khai Thực Tế & Đưa Lên Production (Post-2026)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  GIAI ĐOẠN A │     │  GIAI ĐOẠN B │     │  GIAI ĐOẠN C │     │  GIAI ĐOẠN D │
│  Nghiệm thu  │ ──> │ Phát hành    │ ──> │ Triển khai   │ ──> │ Mở rộng      │
│  Học thuật & │     │ Release      │     │ Thí điểm     │     │ Ứng dụng     │
│  Kiểm thử    │     │ Production   │     │ (Pilot Wards)│     │ Mobile App   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

| Giai đoạn | Mục tiêu kỹ thuật | Điều kiện tiên quyết | Trạng thái |
| :--- | :--- | :--- | :---: |
| **Giai đoạn A** | • 420/420 Backend tests PASS.<br>• Frontend build sạch 0 lỗi.<br>• Victory Audit độc lập phê duyệt. | Đã hoàn thành 100% trên nhánh `develop`. | **HOÀN THÀNH** |
| **Giai đoạn B** | • Merge `--no-ff` từ `develop` vào `main`.<br>• Đóng gói Docker Images chính thức.<br>• Cấu hình chứng chỉ SSL/TLS Let's Encrypt và reverse proxy Nginx. | Giai đoạn A hoàn tất. | **SẴN SÀNG** |
| **Giai đoạn C** | • Thí điểm tại 1–5 phường/xã (Phường Long Xuyên, Phường Châu Đốc, Xã An Phú).<br>• Kết nối SMTP gửi email thông báo trạng thái hồ sơ thật.<br>• Giám sát tải CPU/RAM trên hạ tầng VPS 4GB RAM (Docker Stack $\le 2048$ MiB). | Máy chủ VPS Ubuntu 24.04 LTS sẵn sàng. | **KẾ HOẠCH TIẾP THEO** |
| **Giai đoạn D** | • Khởi tạo mã nguồn ứng dụng di động tại thư mục `mobile/` bằng React Native (Expo SDK 52).<br>• Tái sử dụng tầng logic dùng chung (`cccdQrParser.ts`, `angiangWards.ts`, REST API client).<br>• Triển khai ví lưu trữ Phiếu hẹn mã QR Offline và thông báo đẩy (Push Notification). | Đặc tả kiến trúc tại `docs/mobile.md` đã sẵn sàng. | **ĐỊNH HƯỚNG TƯƠNG LAI** |

---

## 4. Hướng Dẫn Kích Hoạt Bản Release Lên Production

Khi sẵn sàng xuất xưởng phiên bản lên nhánh `main`, thực hiện theo đúng quy chuẩn phân nhánh tại `AGENTS.md`:

```powershell
# Chuyển về nhánh main và kéo mã nguồn mới nhất
git checkout main
git pull origin main

# Hợp nhất nhánh develop đã kiểm thử toàn diện vào main
git merge --no-ff develop -m "release: synchronize 2026 production hardening and an giang tthc upgrades"

# Đẩy bản release lên kho mã nguồn từ xa
git push origin main
```
