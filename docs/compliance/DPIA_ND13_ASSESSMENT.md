# HỒ SƠ ĐÁNH GIÁ TÁC ĐỘNG XỬ LÝ DỮ LIỆU CÁ NHÂN (DPIA)
## DỰ ÁN HỆ THỐNG TRỢ LÝ HÀNH CHÍNH CÔNG CẤP XÃ/PHƯỜNG (SMARTWARD AI)
*Căn cứ Nghị định số 13/2023/NĐ-CP ngày 17/04/2023 của Chính phủ về bảo vệ dữ liệu cá nhân*

---

> **TRẠNG THÁI RÀ SOÁT PHÁP LÝ:**  
> Hệ thống hiện đã triển khai các **biện pháp kỹ thuật bảo vệ dữ liệu ở mức cao nhất** (Zero-Trust Document Vault, mã hóa AES-256-GCM, watermark động, xóa dữ liệu tự động, token xem 1 lần). Tài liệu này là **Dự thảo Đánh giá Tác động (DPIA Internal Draft)** phục vụ rà soát nội bộ với Đơn vị chủ quản / Phòng Pháp chế trước khi chính thức nghiệm thu và công bố khẳng định tuân thủ pháp luật.

---

### 1. Danh Mục Dữ Liệu Cá Nhân Thu Thập & Mục Đích Xử Lý

| Nhóm Dữ Liệu | Loại Dữ Liệu Cá Nhân Thu Thập | Mục Đích Xử Lý | Vị Trí Lưu Trữ & Biện Pháp Bảo Vệ |
| :--- | :--- | :--- | :--- |
| **Hồ sơ hành chính công dân** | Họ tên, số CCCD (12 số), ngày sinh, địa chỉ thường trú, SĐT | Tiếp nhận và tra cứu tiến độ hồ sơ thủ tục hành chính tại UBND Xã/Phường | Lưu trữ tại PostgreSQL (`dossiers`), mã hóa trường dữ liệu nhạy cảm, tra cứu yêu cầu nhập đúng Mã hồ sơ + 4 số cuối CCCD |
| **Tài liệu đính kèm (Giấy tờ scan/chụp)** | Ảnh chụp CCCD (mặt trước/sau), tờ khai CT01 cư trú, giấy khai sinh | Cung cấp thành phần hồ sơ theo quy định pháp luật cho cán bộ Một cửa thẩm tra | Lưu tại MinIO (`smartward-vault`) sau khi đóng watermark chéo và mã hóa đối xứng AES-256-GCM |
| **Phản ánh trật tự / vệ sinh** | Tọa độ GPS (vĩ độ, kinh độ), địa chỉ sự cố, ảnh hiện trường, mô tả | Phân loại tự động (Triage) và chuyển giao UBND Xã xử lý sự cố công cộng | Không lưu trữ CCCD; tọa độ chuyển thành cụm phản ánh (Cluster) |
| **Nhật ký truy cập hệ thống** | Địa chỉ IP, User-Agent, thời điểm truy cập, ID yêu cầu (`correlationId`) | Bảo đảm an toàn thông tin, kiểm toán truy vết cán bộ (`audit_logs`) | Lưu tại PostgreSQL; tự động che mờ số CCCD và SĐT trong nhật ký console/file bằng `MaskingMessageConverter` |

---

### 2. Cơ Sở Pháp Lý & Nguyên Tắc Đồng Ý (Consent)

1. **Cơ sở xử lý:**  
   - Thực hiện nhiệm vụ quản lý nhà nước và cung cấp dịch vụ công trực tuyến theo Luật Căn cước và Nghị định số 42/2022/NĐ-CP.
   - Sự đồng ý tự nguyện và minh bạch của công dân khi chủ động tải giấy tờ và nhấn "Gửi hồ sơ".
2. **Quyền tự quyết của công dân:**  
   - Công dân được quyền xem lại thông tin biểu mẫu trước khi nộp chính thức.
   - Bộ tiền kiểm biểu mẫu (Form Rule Engine) chỉ hoạt động theo nguyên tắc **cảnh báo lỗi định dạng** để công dân chỉnh sửa trên bản gốc, không tự ý can thiệp hay sửa đổi dữ liệu gốc của công dân.

---

### 3. Chính Sách Lưu Trữ, Mã Hóa & Tự Tiêu Hủy (Retention & Purging Policy)

1. **Tài liệu tạm trong Document Vault:**  
   - Sau khi tải lên, tài liệu được cấp mã truy cập một lần (`oneTimeToken`) trên Redis với thời hạn hiệu lực **24 giờ**.
   - Khi cán bộ mở xem tài liệu, hệ thống thực thi lệnh nguyên tử `GETDEL` để **hủy token vĩnh viễn khỏi Redis**. Mọi nỗ lực truy cập lại đều trả về mã lỗi `HTTP 410 GONE`.
   - Vòng đời dữ liệu lưu trữ (ILM): Dữ liệu lưu tạm trên MinIO được cấu hình tự động tiêu hủy sau **7 ngày**.
2. **Dấu mờ bảo vệ bản quyền (Dynamic Watermark):**  
   - Mọi ảnh giấy tờ khi tải lên đều được chèn watermark bán trong suốt:  
     `"CHỈ DÙNG ĐỂ NỘP TTHC TẠI UBND XÃ/PHƯỜNG - [NGÀY GIỜ] - [ID HỒ SƠ]"`  
     nhằm triệt tiêu rủi ro chiếm đoạt ảnh CCCD để vay nợ hoặc mở tài khoản trái phép.
3. **Mã hóa khi lưu trữ (Encryption at Rest):**  
   - Sử dụng khóa đối xứng 256-bit AES/GCM/NoPadding với nonce ngẫu nhiên 12-byte cho mỗi tài liệu trước khi ghi vào MinIO.

---

### 4. Quy Trình Xử Lý Yêu Cầu Của Chủ Thể Dữ Liệu (Data Subject Rights)

1. **Quyền được biết và tra cứu:** Công dân có thể tra cứu thông tin tiến độ xử lý hồ sơ thông qua Cổng Dịch vụ công hoặc quét mã QR biên nhận.
2. **Quyền rút lại sự đồng ý / Hủy hồ sơ:** Khi hồ sơ còn ở trạng thái `SUBMITTED` (chưa thẩm duyệt), công dân có quyền yêu cầu cán bộ Một cửa hỗ trợ hủy hồ sơ.
3. **Quyền yêu cầu xóa dữ liệu:** Sau khi thủ tục hoàn tất và có quyết định trả kết quả, các bản scan tạm thời trên hệ thống tự động xóa sạch theo chính sách ILM 7 ngày.

---

### 5. Quy Trình Báo Cáo & Xử Lý Sự Cố An Toàn Dữ Liệu

1. **Bộ phận tiếp nhận:** Đội ngũ Quản trị Kỹ thuật SmartWard AI phối hợp với Cán bộ Công nghệ Thông tin UBND Xã/Phường.
2. **Phát hiện và cô lập:** Khi phát hiện hành vi dò quét (brute-force) hoặc truy cập IDOR trái phép:
   - Rate Limiter tự động chặn IP (HTTP 429).
   - Nhật ký kiểm toán `audit_logs` ghi nhận định danh người dùng và địa chỉ IP.
3. **Thời hạn thông báo:** Trong trường hợp xảy ra sự cố rò rỉ dữ liệu, Ban Quản trị cam kết thông báo tới Cục An toàn thông tin (Bộ TT&TT) và Cục An ninh mạng (A05 - Bộ Công an) trong vòng **72 giờ** theo quy định tại Điều 23 Nghị định 13/2023/NĐ-CP.

---

### 6. Kế Hoạch Nghiệm Thu Chính Thức

- [x] Triển khai rào chắn kỹ thuật Zero-Trust, AES-256-GCM, Watermark động Java2D, Single-Use Redis Token.
- [x] Lọc bỏ toàn bộ thông tin định danh cá nhân (PII) khỏi `localStorage` phía Frontend.
- [x] Triển khai bộ lọc che mờ PII trong log hệ thống (`MaskingMessageConverter`).
- [x] Bổ sung mã truy vết yêu cầu thống nhất `X-Correlation-ID` qua `CorrelationIdFilter`.
- [ ] Chuyển hồ sơ DPIA nội bộ cho Bộ phận Pháp chế / Đơn vị chủ quản rà soát và ký biên bản thẩm định.
- [ ] Tiến hành kiểm thử xâm nhập nội bộ (Internal Penetration Test) theo chuẩn OWASP ASVS L2.
