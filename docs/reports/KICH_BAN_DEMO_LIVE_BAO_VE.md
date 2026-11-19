# SMARTWARD AI — KỊCH BẢN TRÌNH DIỄN THỰC CHIẾN (LIVE DEMO SCRIPT)
**Phục vụ:** Báo cáo Đồ án Tốt nghiệp / Nghiệm thu Học kỳ Doanh nghiệp (HKDN)  
**Thời lượng trình diễn khuyến nghị:** 5 – 7 phút  
**Kiến trúc:** Mobile App (Expo SDK 52) ↔ Web Desktop (React 18 / Vite 6) ↔ Backend Spring Boot 3.3.5 / AI Sidecar  

---

## 1. MỤC TIÊU VÀ THÔNG ĐIỆP CỐT LÕI CẦN TRUYỀN TẢI
Trước khi bắt đầu bấm máy thoại với Hội đồng, người trình bày cần nêu bật **1 câu tuyên ngôn định vị dự án**:
> *"SmartWard AI không sinh ra để cạnh tranh hay thay thế Cổng Dịch vụ công Quốc gia, mà đóng vai trò là **Bộ đệm Tiền kiểm Thông minh (Pre-intake Buffer)** đặt tại bàn tay người dân và cấp cơ sở (xã/phường) — biến quá trình chuẩn bị hồ sơ từ một trải nghiệm bối rối, dễ bị trả lại thành quy trình 3 bước: **Tự động điền qua CCCD gắn chip $\rightarrow$ Tiền kiểm lỗi pháp lý $\rightarrow$ Nhận Vé hẹn điện tử (0đ) để được thụ lý trong 30 giây**."*

---

## 2. BẢNG THIẾT LẬP MÔI TRƯỜNG TRƯỚC BUỔI BẢO VỆ (PRE-DEMO CHECKLIST)

| Thiết bị / Môi trường | Cần chuẩn bị sẵn | Ghi chú kỹ thuật |
| :--- | :--- | :--- |
| **Máy tính thuyết trình** | Trình duyệt Chrome/Edge mở 2 tab: <br>1. `http://localhost:3000` (Bàn làm việc Cán bộ Một cửa)<br>2. Terminal chạy `docker compose ps` | Chạy sẵn 6 Docker container active, RAM tổng $\le 2048\text{ MiB}$ |
| **Điện thoại di động (hoặc Giả lập)** | App Expo Go (hoặc Development Build) mở dự án Mobile, kết nối cùng dải Wi-Fi LAN hoặc chạy Metro bundler | Chế độ sáng màn hình 100%, bật âm lượng để Hội đồng nghe rõ Voice AI TTS |
| **Đạo cụ trình diễn** | 1 Thẻ CCCD gắn chip thật (hoặc ảnh chụp mã QR CCCD trên màn hình phụ) | Mã QR chuẩn Bộ Công an: `12 số CCCD\|CMND cũ\|Họ tên\|Ngày sinh\|Giới tính\|Địa chỉ\|Ngày cấp` |
| **Tài khoản Cán bộ Test** | `canbo.tuxa@angiang.gov.vn` / Mật khẩu: `CanBo@2026!` (Xã An Phú, Tỉnh An Giang) | Đã được cấp quyền `OFFICER_ONE_STOP` tại Xã An Phú |

---

## 3. KỊCH BẢN TRÌNH DIỄN 4 MÀN CHI TIẾT (STEP-BY-STEP)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TỔNG THỂ LUỒNG DEMO 5 PHÚT                     │
│                                                                        │
│  [MÀN 1: MOBILE CÔNG DÂN]                                             │
│  Quét CCCD QR ──► Hỏi đáp Voice RAG ──► Tiền kiểm ──► Vision Gate ──► QR Pass
│                                                                 │      │
│  [MÀN 2: WEB CÁN BỘ MỘT CỬA]                                    ▼      ▼
│  Cán bộ quét QR Pass ──► Mở Vault Zero-Trust (Watermark) ──► Duyệt 30s!│
│                                                                        │
│  [MÀN 3: PHẢN ÁNH HIỆN TRƯỜNG GIS]                                    │
│  Mobile chụp ảnh sự cố ──► GPS An Giang ──► Two-Stage Triage ──► Bản đồ GIS
│                                                                        │
│  [MÀN 4: HỘI ĐỒNG KIỂM TOÁN HẠ TẦNG]                                  │
│  RAM 6 Containers <= 2048 MiB ──► 524 JUnit Backend ──► 73 Vitest Mobile
└────────────────────────────────────────────────────────────────────────┘
```

---

### MÀN 1: TRẢI NGHIỆM CÔNG DÂN TRÊN DI ĐỘNG (MOBILE EXPO SDK 52)
**Thời lượng:** 2 phút 30 giây  
**Mục tiêu:** Thể hiện tính thân thiện, loại bỏ rào cản gõ phím, trí tuệ nhân tạo RAG không ảo giác và tiền kiểm tất định.

* **Bước 1.1: Quét CCCD Gắn Chip tự động hóa (Auto Fill-in):**
  - *Thao tác:* Mở Tab **Hồ sơ & Dịch vụ**, bấm nút camera "Quét mã QR CCCD". Đưa camera vào mã QR của thẻ CCCD.
  - *Lời thoại đề xuất:*
    > *"Thưa Thầy Cô, đối với người cao tuổi hoặc người dân lao động tại vùng nông thôn An Giang, việc phải tự gõ 12 số CCCD hay địa chỉ thường trú rất dễ nhầm lẫn. Với SmartWard AI, chỉ mất đúng 0.3 giây quét mã QR, toàn bộ thông tin cá nhân bao gồm Họ tên, Số định danh, Ngày sinh, Giới tính, Quê quán được trích xuất hoàn toàn cục bộ trên điện thoại theo chuẩn mã hóa của Bộ Công an, gán sẵn vào hồ sơ mà không cần gõ một phím nào."*

* **Bước 1.2: Trợ lý AI Pháp lý RAG & Đọc Giọng nói Trợ năng (Accessibility TTS):**
  - *Thao tác:* Chuyển sang Tab **Tư vấn AI**. Bật công tắc **"Đọc to (TTS)"**.
  - Nhập hoặc bấm câu hỏi mẫu: *"Thủ tục đăng ký khai sinh cho con cần những giấy tờ gì và nộp ở đâu?"*
  - *Hiện tượng:* Trợ lý phản hồi trong vòng 0.8 giây, hiển thị cấu trúc 5 phần hành chính rõ ràng (Căn cứ pháp lý, Nơi nộp, Thành phần hồ sơ, Lệ phí 0đ, Thời hạn giải quyết) và giọng đọc tự nhiên cất lên.
  - *Lời thoại đề xuất:*
    > *"Câu trả lời trích dẫn chính xác Thông tư 04/2024/TT-BTP của Bộ Tư pháp và Nghị định 30/2020/NĐ-CP. Đặc biệt, tính năng Giọng đọc trợ năng giúp bà con mắt kém hoặc không rành công nghệ có thể nghe hướng dẫn từng bước."*

* **Bước 1.3: Thử thách Chốt chặn Chống ảo giác (Abstention Guardrail Challenge):**
  - *Thao tác:* Nhập câu hỏi bẫy hoặc ngoài thẩm quyền: *"Làm thế nào để xin visa đi Mỹ nhanh nhất?"* hoặc *"Chỉ tôi cách chạy giấy tờ đất không cần nộp thuế"*.
  - *Hiện tượng:* Hệ thống từ chối trả lời an toàn ngay lập tức với thông báo lịch sự: *"Xin lỗi, vấn đề này nằm ngoài thẩm quyền của UBND cấp xã/phường..."* kèm 3 nút gợi ý chuyển hướng nghiệp vụ công dân hợp lệ.
  - *Lời thoại đề xuất:*
    > *"Đây là chốt chặn quan trọng nhất của hệ thống: với ngưỡng từ chối an toàn $\theta = 0.78$ và $\theta_{lower} = 0.42$, SmartWard AI tuyệt đối không bị ảo giác sinh chữ bừa bãi khi gặp các câu hỏi sai lệch hoặc nhạy cảm."*

* **Bước 1.4: Tiền kiểm Tất định (Deterministic Precheck) & Cổng Thị giác (Vision Gate):**
  - *Thao tác:* Chọn thủ tục **Trợ cấp Bảo trợ Xã hội (TK-BTXH)**.
    - *Tình huống lỗi:* Nhập người hưởng sinh năm 1956 (70 tuổi) nhưng để diện thường, chưa có số tài khoản ngân hàng. Bấm "Tiền kiểm hồ sơ".
    - *Hiện tượng:* Báo vi phạm màu đỏ: *Yêu cầu từ đủ 75 tuổi (theo Luật BHXH 2024) hoặc từ đủ 70 tuổi nếu thuộc hộ nghèo; bắt buộc có STK theo Đề án 06*.
    - *Tình huống sửa đúng:* Đổi năm sinh sang 1950 (76 tuổi) và điền số tài khoản Agribank. Tiền kiểm chuyển sang **Hợp lệ (Màu xanh 100%)**.
  - Chụp ảnh giấy tờ (hoặc tải ảnh mẫu): Cổng thị giác **Vision Quality Gate** chấm điểm độ sắc nét $\ge 45/100$ và độ sáng $\ge 55/255$.
  - Xuất hiện màn hình chúc mừng và phát hành **Vé hẹn điện tử / Mã QR Pass thông hành**.
  - Bấm nút **"Xuất phôi A4 (.PDF/.DOCX)"**: Hiển thị tệp A4 chuẩn Mẫu số 01 (NĐ 20/2021 & NĐ 335/2026 & Luật BHXH 2024) gói gọn đúng 1 trang để người dân có thể in hoặc lưu.

---

### MÀN 2: BÀN LÀM VIỆC TIẾP NHẬN CỦA CÁN BỘ MỘT CỬA (WEB DESKTOP)
**Thời lượng:** 1 phút 30 giây  
**Mục tiêu:** Chứng minh rút ngắn thời gian giải quyết từ 20 phút xuống 30 giây, tuân thủ Nghị định 13/2023/NĐ-CP (Zero-Trust Document Vault).

* **Bước 2.1: Quét mã QR Pass của Công dân:**
  - *Thao tác:* Tại màn hình Web Bàn làm việc Cán bộ, chọn mục **"Tiếp nhận theo Mã QR Pass"**. Nhập mã hoặc quét mã QR Pass vừa tạo từ điện thoại công dân.
  - *Hiện tượng:* Hệ thống hiển thị ngay hồ sơ công dân đã được thẩm tra với huy hiệu **"ĐÃ TIỀN KIỂM HỢP LỆ 100%"**.

* **Bước 2.2: Mở và Xem Tài liệu trong Zero-Trust Document Vault:**
  - *Thao tác:* Bấm nút **"Mở tệp đính kèm trong Vault"**.
  - *Hiện tượng:* Ảnh CCCD/Giấy tờ mở ra trong modal an toàn. Trên ảnh xuất hiện đường **Watermark chéo mờ in thời gian thực**: `"XÃ AN PHÚ - CHỈ SỬ DỤNG SƠ DUYỆT TTHC - [NGÀY GIỜ]"`. Đường link xem ảnh sử dụng cơ chế liên kết 1 lần (`GETDEL` qua Redis, tự động hủy trong 60 giây).
  - *Lời thoại đề xuất:*
    > *"Để bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP, SmartWard AI không lưu ảnh gốc công khai. Mọi hình ảnh được mã hóa AES-256-GCM trước khi đẩy vào MinIO. Khi cán bộ xem, hệ thống tự động đóng dấu Watermark trực tiếp trên RAM máy chủ rồi mới truyền về trình duyệt, chống việc chụp màn hình hoặc phát tán trái phép dữ liệu của người dân."*

* **Bước 2.3: Phê duyệt nhanh chóng trong 30 giây:**
  - *Thao tác:* Cán bộ bấm nút **"Tiếp nhận & Chuyển phòng chuyên môn"**. Trạng thái chuyển thành `RECEIVED`. Trên điện thoại công dân lập tức nhận được thông báo cập nhật tiến độ.

---

### MÀN 3: PHẢN ÁNH HIỆN TRƯỜNG GIS & THUẬT TOÁN GOM CỤM (TWO-STAGE TRIAGE)
**Thời lượng:** 1 phút 30 giây  
**Mục tiêu:** Trình diễn năng lực quản trị thông minh, phát hiện trùng lặp sự cố và bản đồ chỉ huy trực quan.

* **Bước 3.1: Gửi Phản ánh Sự cố từ Di động:**
  - *Thao tác:* Trên Mobile App, vào Tab **Phản ánh**. Chọn danh mục **Hạ tầng đô thị**, chụp ảnh đoạn đường hư hỏng/ổ gà, định vị GPS tại Xã An Phú, An Giang. Bấm **"Gửi phản ánh"**.
* **Bước 3.2: Thử nghiệm gửi sự cố trùng lặp để kích hoạt Two-Stage Triage:**
  - *Thao tác:* Gửi tiếp một phản ánh thứ hai cũng tại vị trí bán kính gần đó ($< 50$ mét) với nội dung tương tự: *"Đường sụp lún gây nguy hiểm"*.
  - *Hiện tượng:* Hệ thống không tạo mới sự cố gây quá tải, mà tự động nhận diện qua **Redis GEOSEARCH** (khoảng cách không gian) kết hợp **Cosine Similarity vector pgvector** $\ge 0.75$, tự động gộp vào cụm hiện có và tăng chỉ số `report_count = 2`.
* **Bước 3.3: Quan sát trên Trung tâm Chỉ huy GIS Web:**
  - *Thao tác:* Chuyển sang Web tab **Bản đồ Giám sát Sự cố (GIS Command Center)**.
  - *Hiện tượng:* Vị trí sự cố tại Xã An Phú sáng lên trên bản đồ vệ tinh/giao thông với trạng thái cảnh báo màu cam, hiển thị số lượt phản ánh tăng lên kèm ảnh chụp hiện trường. Cán bộ điều phối có thể bấm phân công cho Cán bộ địa chính/xây dựng đi xử lý ngay lập tức.

---

### MÀN 4: MINH CHỨNG KIỂM TOÁN DƯỚI NỀN (UNDER THE HOOD AUDIT)
**Thời lượng:** 30 giây  
**Mục tiêu:** Chốt hạ bài báo cáo bằng các chỉ số kỹ thuật thép, chứng minh hệ thống đã kiểm thử tự động 100%.

* *Thao tác:* Mở cửa sổ Terminal/Command Prompt trên máy:
  1. Gõ `docker stats --no-stream` để Hội đồng thấy bảng sử dụng RAM của 6 container: **Tổng RAM duy trì ổn định ở mức ~1.4 GiB (Dưới trần 2048 MiB)**.
  2. Chiếu kết quả kiểm thử:
     - Backend Spring Boot: **524/524** bài kiểm thử JUnit **PASS 100%**.
     - Frontend Web: **11/11** bộ kiểm thử hồi quy + Vite Build **PASS 100%**.
     - Mobile App: **73/73** bài kiểm thử Vitest **PASS 100%**.
     - CI/CD GitHub Actions: Tự động khóa cổng `deploy` nếu có bất kỳ lỗi nào.

---

## 4. BẢNG TỔNG HỢP CÁC TÌNH HUỐNG DỰ PHÒNG (FAILSAFE BACKUP)

| Tình huống phát sinh | Cách xử lý tức thì không làm gián đoạn bài thuyết trình |
| :--- | :--- |
| **Mất kết nối Internet của phòng hội đồng** | Trình diễn bình thường! Toàn bộ 6 Docker container, Local AI Sidecar (PhoBERT ONNX INT8), CSDL và Mobile App đều chạy mạng nội bộ LAN (`127.0.0.1` hoặc IP Wi-Fi nội bộ), không phụ thuộc Cloud ngoài. |
| **Không có thẻ CCCD vật lý** | Sử dụng file ảnh mã QR CCCD giả định chuẩn có sẵn trong tài liệu test `scripts/fixtures/cccd_qr_samples.json`. |
| **Micro máy tính bắt âm thanh kém** | Dùng bàn phím gõ text hoặc chọn các chip câu hỏi nhanh (Quick Suggestion Chips) đã được nhúng sẵn trên giao diện. |

---
*Tài liệu được biên soạn phục vụ công tác nghiệm thu bảo vệ đồ án và kiểm thử thực nghiệm dự án SmartWard AI.*
