# HỒ SƠ ĐÁNH GIÁ TÁC ĐỘNG & ĐỐI CHIẾU TUÂN THỦ BẢO VỆ DỮ LIỆU CÁ NHÂN (DPIA 2026)
## DỰ ÁN HỆ THỐNG TRỢ LÝ HÀNH CHÍNH CÔNG CẤP XÃ/PHƯỜNG (SMARTWARD AI)

*Căn cứ pháp lý hiệu lực từ 01/01/2026:*
- **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15** (5 chương, 39 điều, Quốc hội khóa XV thông qua ngày 26/06/2025, hiệu lực từ 01/01/2026).
- **Nghị định số 356/2025/NĐ-CP** (ban hành ngày 31/12/2025, hiệu lực từ 01/01/2026 — **thay thế Nghị định số 13/2023/NĐ-CP**).

---

> **TRẠNG THÁI RÀ SOÁT PHÁP LÝ (`TASK-022` — Cập nhật 2026-11-26):**
> SmartWard AI đã hoàn tất đối chiếu kỹ thuật với khung pháp lý mới (Luật 91/2025/QH15 & NĐ 356/2025/NĐ-CP), nâng cấp câu chữ thông báo bảo mật minh bạch trên cả Web và Mobile, bỏ cách diễn đạt đồng ý mặc nhiên, đồng thời hoàn thiện mã hóa đầu cuối cho kho giấy tờ (Zero-Trust Vault AES-256-GCM + `GETDEL`) và ví QR ngoại tuyến trên Mobile (SQLCipher + AES-256-GCM khóa từ Keychain/Keystore).

---

### 1. Bảng Đối Chiếu Tuân Thủ Luật 91/2025/QH15 & Nghị Định 356/2025/NĐ-CP

| Yêu cầu pháp lý (Luật 91/2025/QH15 & NĐ 356/2025/NĐ-CP) | Giải pháp kỹ thuật & UX tại SmartWard AI | Trạng thái |
| :--- | :--- | :---: |
| **Nguyên tắc đồng ý rõ ràng** *(Sự im lặng hoặc không phản hồi không được coi là sự đồng ý)* | Gỡ bỏ câu chữ đồng ý ngầm định ở Cổng vai trò; người dân chủ động bấm xác nhận nộp hồ sơ, chủ động bật quyền Camera/GPS/Push và có nút tắt thông báo bất kỳ lúc nào. | ✅ Đạt |
| **Minh bạch mục đích & giới hạn phạm vi xử lý** | Chỉ thu thập đúng trường dữ liệu của từng mã TTHC; phản ánh hiện trường không thu thập CCCD; không lưu PII vào `localStorage` trình duyệt. | ✅ Đạt |
| **Bảo vệ dữ liệu cá nhân nhạy cảm (CCCD, ảnh giấy tờ, sinh trắc học)** | Ảnh giấy tờ đóng watermark chéo động + mã hóa `AES/GCM/NoPadding` 256-bit lưu trên MinIO (ILM tự hủy sau 7 ngày) + token đọc 1 lần Redis `GETDEL` (`HTTP 410 GONE`). Sinh trắc học cán bộ (`TASK-043`) xác thực cục bộ qua OS Keychain/Keystore, không gửi dữ liệu sinh trắc học lên máy chủ. | ✅ Đạt |
| **Bảo vệ dữ liệu trên thiết bị di động (Offline QR Wallet)** | Mã hóa SQLite bằng cấu hình `SQLCipher` + mã hóa cấp cột `AES-256-GCM` với khóa 256-bit lưu trong iOS Keychain / Android Keystore (`TASK-025`). | ✅ Đạt |
| **Xử lý dữ liệu trong môi trường AI (RAG / Agent)** | Chốt chặn chống ảo giác $\theta = 0.78$; bộ lọc che mờ số CCCD/SĐT `MaskingMessageConverter` trước khi ghi log, `agent_traces` hoặc gửi thông báo đẩy (`TASK-023`); nguyên tắc **Draft-Only** (AI không tự ý nộp hồ sơ thay công dân). | ✅ Đạt |
| **Cách ly quyền truy cập & truy vết kiểm toán** | Phân quyền chặt `ROLE_OFFICER` / `ROLE_ADMIN`, cách ly địa bàn xã (`SEC-09`), che mờ CCCD dạng `********1234` trên toàn bộ DTO cán bộ, ghi nhật ký bất biến `audit_log` kèm `X-Correlation-ID`. | ✅ Đạt |
| **Quyền của chủ thể dữ liệu (Biết, Truy cập, Chỉnh sửa, Xóa)** | Công dân tra cứu tiến độ qua Mã hồ sơ + 4 số cuối CCCD (rate-limit 5 lần/15 phút); được xem lại và chỉnh sửa tờ khai trước khi nộp; bản scan tạm tự hủy sau 7 ngày. | ✅ Đạt |

---

### 2. Danh Mục Dữ Liệu Cá Nhân Thu Thập & Mục Đích Xử Lý

| Nhóm Dữ Liệu | Dữ Liệu Thu Thập | Mục Đích Xử Lý | Vị Trí Lưu Trữ & Bảo Vệ |
| :--- | :--- | :--- | :--- |
| **Hồ sơ hành chính công dân** | Họ tên, số CCCD (12 số), ngày sinh, địa chỉ thường trú, SĐT/Email | Tiếp nhận và tra cứu tiến độ TTHC tại UBND Xã/Phường | PostgreSQL (`citizen_dossiers`); che mờ `********XXXX` khi hiển thị cán bộ; tra cứu bắt buộc Mã hồ sơ + 4 số cuối CCCD |
| **Tài liệu đính kèm (Zero-Trust Vault)** | Ảnh chụp CCCD, tờ khai CT01, giấy hộ tịch | Phục vụ cán bộ Một cửa sơ duyệt hồ sơ | MinIO (`smartward-vault`) sau watermark Java2D + mã hóa AES-256-GCM; token xem 1 lần Redis `GETDEL` (TTL 24h); ILM tự hủy 7 ngày |
| **Ví Phiếu Hẹn Offline (Mobile)** | Mã hồ sơ, mã lịch hẹn, 4 số cuối CCCD, họ tên | Xuất trình mã QR tại quầy Một cửa khi không có sóng 4G | `smartward_mobile.db` (SQLCipher + AES-256-GCM cột nhạy cảm, khóa lưu trong Keychain/Keystore) |
| **Phản ánh sự cố hiện trường** | Tọa độ GPS, địa chỉ sự cố, ảnh hiện trường (đã xóa EXIF), mô tả | Gom cụm 2 pha (Spatial-Semantic Triage) và điều phối xử lý | PostgreSQL (`issue_clusters`, `civic_reports`), không thu thập CCCD |
| **Thiết bị nhận thông báo đẩy** | `expoPushToken`, nền tảng, mã hồ sơ đăng ký | Thông báo trạng thái hồ sơ đã duyệt / cần bổ sung | PostgreSQL (`notification_device_tokens`), nội dung push tự động che mọi chuỗi 9–12 số |
| **Nhật ký kiểm toán & truy vết AI** | IP thật, `badgeId`, hành động, `X-Correlation-ID` | Phòng chống tấn công, kiểm toán công vụ | PostgreSQL (`audit_log`, `agent_traces`), lọc sạch PII qua `MaskingMessageConverter` |

---

### 3. Quy Trình Ứng Phó Sự Cố & Báo Cáo Cơ Quan Quản Lý

1. **Phát hiện & cô lập:** Rate Limiter Redis tự động chặn brute-force (`HTTP 429`), thu hồi tức thời JWT cán bộ trên Redis (`smartward:auth:revoked:{jti}`), khóa phiên sau 15 phút không hoạt động.
2. **Thông báo sự cố:** Khi phát hiện sự cố vi phạm bảo vệ dữ liệu cá nhân, Ban Quản trị Hệ thống phối hợp UBND cấp xã thực hiện thông báo tới Cơ quan chuyên trách bảo vệ dữ liệu cá nhân (Cục A05 — Bộ Công an) trong vòng **72 giờ** kể từ khi phát hiện theo quy định của Luật 91/2025/QH15 và Nghị định 356/2025/NĐ-CP.
3. **Kiểm định định kỳ:** Rà soát checklist OWASP ASVS L2 và diễn tập khôi phục sao lưu (`scripts/backup_all.*` / `scripts/restore_*`) trước mỗi đợt nâng cấp lớn.
