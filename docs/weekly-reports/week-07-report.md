# BÁO CÁO TIẾN ĐỘ THỰC HIỆN DỰ ÁN – TUẦN 07
**Đề tài:** SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã  
**Sinh viên thực hiện:** Trịnh Tuấn Khánh  
**Đơn vị:** Viện Đào tạo Chất lượng cao – Trường Đại học Giao thông vận tải TP.HCM (UTH)  
**Thời gian thực hiện:** Tuần 7 (Giai đoạn Triển khai Phân hệ Lõi 4 – Zero-Trust Document Vault)

---

## 1. MỤC TIÊU TUẦN 07
- Hiện thực hoàn chỉnh Phân hệ 4: Kho Hồ sơ Tài liệu Không Tin cậy (Zero-Trust Document Vault) đáp ứng toàn diện các tiêu chuẩn bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP.
- Xây dựng `ImageWatermarkService` bằng Java2D (`Graphics2D`) vẽ chìm watermark chéo với nội dung: `"CHỈ DÙNG ĐỂ SƠ DUYỆT HỒ SƠ TẠI UBND - [TIMESTAMP]"`.
- Hiện thực `ZeroTrustVaultService`: Mã hóa đối xứng có xác thực bằng thuật toán `AES/GCM/NoPadding` (256-bit key, 12-byte IV ngẫu nhiên, 128-bit authentication tag).
- Tích hợp MinIO Java SDK để upload/download tệp mã hóa vào bucket `smartward-vault`.
- Cài đặt cơ chế One-Time Access Token trên Redis với TTL 24 giờ; sử dụng lệnh nguyên tử `GETDEL` (Spring Data Redis `getAndDelete`) để lấy và xóa token ngay lập tức trong 1 chu kỳ, bảo đảm lần truy cập thứ hai bắt buộc trả về mã lỗi HTTP `410 Gone`.
- Xây dựng các REST API: `POST /api/v1/vault/upload` và `GET /api/v1/vault/view/{token}`.
- Soạn thảo Chương 3 - Phần 4 Khóa luận tốt nghiệp UTH.

---

## 2. KẾT QUẢ ĐẠT ĐƯỢC TRONG TUẦN 07

### 2.1. Về Kỹ thuật & Mã nguồn (System / Code)
1. **Dịch vụ Đóng dấu Watermark Động (`ImageWatermarkService.java`):**
   - Áp dụng kỹ thuật hòa trộn kênh Alpha `AlphaComposite.SRC_OVER` ($\alpha = 0.38$).
   - Vẽ watermark nghiêng $-28^\circ$ phủ khắp ảnh với nội dung hành chính và tem thời gian thực.
2. **Kho Lưu trữ Mã hóa Zero-Trust (`ZeroTrustVaultService.java`):**
   - Mã hóa `AES/GCM/NoPadding` (256-bit) ngăn ngừa hoàn toàn khả năng đọc trộm và sửa đổi dữ liệu trái phép trên ổ đĩa.
   - Tích hợp MinIO Java SDK lưu trữ các đối tượng mã hóa dạng `.enc` trong bucket `smartward-vault`.
   - Sinh mã token một lần `OTT_UUID` lưu trữ trên Redis với TTL 24 giờ.
   - Triển khai phương thức `consumeOneTimeDocument`: Gọi lệnh nguyên tử `opsForValue().getAndDelete()` trên Redis. Nếu token đã bị tiêu thụ hoặc hết hạn, ném `BusinessException(ErrorCode.TOKEN_EXPIRED_OR_CONSUMED)` (mã HTTP 410).
3. **REST API Giao tiếp (`VaultController.java`):**
   - `POST /api/v1/vault/upload`: Tiếp nhận tệp tải lên (Multipart), đóng dấu watermark, mã hóa và trả về đường dẫn xem 1 lần.
   - `GET /api/v1/vault/view/{token}`: Giải mã và hiển thị hình ảnh trực tiếp trên trình duyệt với các HTTP header cấm lưu cache (`no-store, no-cache, must-revalidate`).

### 2.2. Về Kiểm thử Tự động (Testing & Verification)
- Bổ sung 8 unit test kiểm thử chuyên sâu:
  - `ImageWatermarkServiceTest`: 2/2 test passed.
  - `ZeroTrustVaultServiceTest`: 3/3 test passed (Mã hóa - giải mã toàn vẹn, bắt lỗi chống can thiệp ciphertext, từ chối token đã xem).
  - `VaultControllerTest`: 3/3 test passed (Upload thành công, xem lần đầu HTTP 200, xem lần hai HTTP 410 Gone).
- Toàn bộ test suite dự án đạt: **51/51 tests Passed, 0 Failures, BUILD SUCCESS**.

### 2.3. Về Báo cáo & Tài liệu Khóa luận (Thesis Documentation)
- Đã soạn thảo Chương 3 - Phần 4 tại [`docs/thesis-chapters/chapter-03.md`](file:///E:/SmartWardAI/docs/thesis-chapters/chapter-03.md) với sơ đồ tuần tự (Sequence Diagram) minh họa rõ ràng luồng bảo mật của cơ chế atomic `GETDEL`.
- Khẳng định sự tuân thủ tuyệt đối đối với Nghị định 13/2023/NĐ-CP của Chính phủ.

---

## 3. KẾ HOẠCH TUẦN TIẾP THEO (TUẦN 08)
- **Evaluation Runner & Dataset Benchmark Harness (Hạ tầng Kiểm định Thực nghiệm Khóa luận)**:
  - Xây dựng `EvaluationRunnerService` thực thi đo lường tự động trên toàn bộ 4 bộ dataset thực tế đã thu thập:
    - 80 câu hỏi RAG (40 câu trực tiếp, 25 câu tự nhiên, 15 câu ngoài phạm vi).
    - 150 phản ánh hiện trường (với nhiễu GPS Gaussian 5m - 35m).
    - 40 ảnh tờ khai hành chính Mẫu CT01 (in và viết tay).
  - Xây dựng REST API chạy benchmark: `POST /api/v1/evaluation/run`.
  - Tính toán các chỉ số học thuật cốt lõi: Recall@3, MRR (Mean Reciprocal Rank), Precision, F1-Score, Tỷ lệ từ chối ảo giác an toàn (Abstention Rate).
  - Soạn thảo Chương 4 - Phần 1 (Phương pháp Thực nghiệm và Thiết kế Môi trường Đánh giá).
