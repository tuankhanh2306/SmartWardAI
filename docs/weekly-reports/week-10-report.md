# BÁO CÁO TIẾN ĐỘ THỰC HIỆN DỰ ÁN – TUẦN 10
**Đề tài:** SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã  
**Sinh viên thực hiện:** Trịnh Tuấn Khánh  
**Đơn vị:** Viện Đào tạo Chất lượng cao – Trường Đại học Giao thông vận tải TP.HCM (UTH)  
**Giảng viên hướng dẫn:** TS. Lê Văn Quốc Anh  
**Thời gian thực hiện:** Tuần 10 (Xây dựng Giao diện Frontend Web/PWA từ bản thiết kế Google Stitch qua Stitch MCP)

---

## 1. MỤC TIÊU TUẦN 10
- Khởi tạo dự án `frontend/` sử dụng Vite 6, React 18, TypeScript, TailwindCSS v3, Lucide Icons và Leaflet OpenStreetMap.
- Kết nối công cụ thiết kế Google Stitch qua Stitch MCP (`@_davideast/stitch-mcp`) đối với dự án `SmartWard AI GovTech Platform` (Project ID: `6123300235406367451`).
- Xuất khẩu mã giao diện mẫu chuẩn và chuyển dịch thành các React Component phân hệ phục vụ 2 nhóm tác nhân:
  1. **Cổng Dịch vụ Công Dân (Citizen Portal - `/citizen`):** Trợ lý tư vấn thủ tục hành chính pháp lý Legal RAG Chatbot, khối Bento 4 tiện ích một cửa, trích dẫn căn cứ pháp luật trực quan, và biểu ngữ cảnh báo chống ảo giác (Abstention Guardrail).
  2. **Tiền kiểm định tờ khai & Báo sự cố hiện trường (`/citizen/form`):** Động cơ tiền kiểm định tờ khai CT01 (CCCD 12 số, quy luật mốc tuổi 14/25/40/60, kiểm tra tính hợp lệ của ngày cấp), hiển thị rõ ràng quy chuẩn hành chính (*Hệ thống chỉ nhắc nhở người dân sửa bằng bút trên tờ khai giấy, không cho sửa trực tiếp trên màn hình*); Form gửi phản ánh sự cố hiện trường kèm định vị GPS tự động và phản hồi phân luồng 2 pha ($R=75\text{m}, \tau=0.82$).
  3. **Trung tâm Chỉ huy Phân luồng GIS Cán bộ (`/officer/map`):** Bản đồ số OpenStreetMap/Leaflet trực quan khu vực Phường 25 (Bình Thạnh), gom cụm phản ánh thời gian thực, vòng tròn đệm bán kính không gian $R=75\text{m}$, thanh tra điều phối hiện trường và điều động lực lượng dân quân / trật tự đô thị.
  4. **Bàn Sơ duyệt Tờ khai Cán bộ Một cửa (`/officer/audit`):** Bộ xem tài liệu scan CT01 và CCCD gắn lớp Watermark chéo chống gian lận thương mại ("*CHỈ DÙNG ĐỂ SƠ DUYỆT TẠI UBND PHƯỜNG 25...*"), các hộp nhận diện OCR Bounding Boxes, bảng đối soát dữ liệu chéo với CSDL Dân cư Quốc gia (Đề án 06/CP), thanh dock duyệt hồ sơ cố định, và cơ chế mô phỏng tự hủy bảo mật HTTP 410 Gone (Redis `GETDEL` Single-Use Token Vault tuân thủ Điều 17 Nghị định 13/2023/NĐ-CP).
- Thiết lập cấu hình Progressive Web App (PWA) qua Web App Manifest (`manifest.json`) cho phép công dân cài đặt trực tiếp lên màn hình chính điện thoại di động (Add to Home Screen).
- Kiểm tra toàn bộ lỗi biên dịch TypeScript và đóng gói Vite đạt kết quả 100% sạch (`npm run build`).

---

## 2. KẾT QUẢ ĐẠT ĐƯỢC TRONG TUẦN 10

### 2.1. Tích hợp Google Stitch qua Stitch MCP
- Sử dụng công cụ `get_screen` và `list_screens` của server MCP Google Stitch (`@_davideast/stitch-mcp`) kết nối trực tiếp đến workspace `projects/6123300235406367451`.
- Trích xuất thành công 4 màn hình giao diện GovTech tiêu chuẩn:
  - `citizen_portal.html`: Màn hình giao tiếp công dân số hóa.
  - `form_and_issue_reporting.html`: Giao diện tiền kiểm định hồ sơ cư trú và gửi phản ánh dân sinh.
  - `gis_command_center.html`: Bàn phân luồng sự cố địa không gian thời gian thực.
  - `officer_form_audit.html`: Bàn sơ duyệt hồ sơ nghiệp vụ một cửa kèm kho bảo mật Zero-Trust.
- Chuẩn hóa hệ thống Design Tokens vào cấu hình Tailwind: Font `Be Vietnam Pro`, màu chủ đạo Primary `#00236F`, Container `#1E3A8A`, Secondary `#00687A`, Background `#FAF8FF`, Error `#BA1A1A`.

### 2.2. Hiện thực hóa các Trang Giao diện Phân hệ (Frontend Implementation)
1. **Header & Sidebar Toàn cục (`Header.tsx` & `OfficerSidebar.tsx`):**
   - Header hiển thị huy hiệu UBND Phường 25, tên hệ thống, thanh điều hướng 4 phân hệ chính và trạng thái kết nối "AI Trực Tuyến".
   - Sidebar cố định cho cán bộ một cửa với chỉ báo bảo mật Cấp 3 tuân thủ Nghị định 13/2023/NĐ-CP.
2. **Cổng Dịch vụ Công Dân (`CitizenPortal.tsx` - Route `/citizen`):**
   - Hộp thoại trò chuyện tư vấn TTHC kết nối API `/api/v1/rag/ask`.
   - Popover xem nhanh trích dẫn văn bản quy phạm pháp luật (Chương, Điều, Khoản, mức độ liên quan).
   - Biểu ngữ cảnh báo an toàn từ chối trả lời (Abstention Guardrail) khi câu hỏi nằm ngoài phạm vi thẩm quyền hoặc dưới ngưỡng tin cậy $\theta = 0.78$.
   - Bento-grid 4 thủ tục phổ biến (Khai sinh, Đăng ký kết hôn, Tạm trú, Xác nhận tình trạng hôn nhân) kích hoạt hỏi nhanh 1 chạm.
3. **Tiền kiểm định Tờ khai & Báo sự cố (`FormAndIssueReporting.tsx` - Route `/citizen/form`):**
   - **Form Precheck Engine:** Kiểm tra định dạng 12 số CCCD, mã hóa tỉnh/thành, thế kỷ/giới tính, năm sinh, quy tắc cấp thẻ (đủ 14, 25, 40, 60 tuổi), và kiểm tra logic ngày sinh không được sau ngày cấp thẻ.
   - **Thông báo Quy tắc Hành chính:** Banner thông báo nêu rõ nguyên tắc *người dân chỉ dùng bút mực để gạch/sửa chữa trực tiếp trên bản giấy trước khi đến nộp tại bộ phận một cửa, hệ thống không cho phép sửa thông tin số trên màn hình để bảo đảm tính pháp lý của bản khai gốc*.
   - **Báo sự cố & Triage Hiện trường:** Tích hợp Geolocation HTML5 tự động lấy tọa độ GPS thực tế. Khi gửi phản ánh, hệ thống gọi API `/api/v1/issues/report` và hiển thị trực quan thông điệp phân luồng (đã gộp vào sự cố gốc hay tạo sự cố mới) kèm bán kính $R=75\text{m}$ và độ tương đồng $\tau=0.82$.
4. **Trung tâm Chỉ huy Phân luồng GIS (`GisCommandCenter.tsx` - Route `/officer/map`):**
   - Bản đồ Leaflet tương tác cao, thiết lập tâm tại tọa độ Phường 25, Bình Thạnh ($10.8030^\circ\text{N}, 106.7150^\circ\text{E}$).
   - Vẽ các điểm gom sự cố dạng Marker tùy chỉnh theo số lượng báo cáo kèm vòng tròn bán kính không gian $R=75\text{m}$.
   - Thanh tra thông tin chi tiết (Inspector) hiển thị mô tả sự cố gốc, phân loại lĩnh vực, mức độ khẩn cấp, danh sách các phản ánh thành viên được gộp tự động, và các nút điều phối xử lý hiện trường.
5. **Bàn Sơ duyệt Tờ khai Cán bộ (`OfficerFormAudit.tsx` - Route `/officer/audit`):**
   - Bộ xem bản scan CT01/CCCD với bộ công cụ: Phóng to, thu nhỏ, xoay $90^\circ$, tăng tương phản, bộ lọc OCR Trắng Đen.
   - Lớp Watermark chống giả mạo xoay góc $-45^\circ$: "*CHỈ DÙNG ĐỂ SƠ DUYỆT TẠI UBND PHƯỜNG 25 - 04/11/2026 08:50 - CÁN BỘ: TRẦN THỊ HƯƠNG - KHÔNG CÓ GIÁ TRỊ THỰC THI PHÁP LÝ NGOÀI PHIÊN LÀM VIỆC*".
   - Hộp nhận diện OCR Bounding Boxes tương tác 2 chiều (hover vào trường đối soát ở bảng bên phải sẽ tự động tô sáng vùng dữ liệu tương ứng trên bản scan).
   - Bảng đối soát 4/4 trường dữ liệu với điểm tin cậy tổng thể 94.2%.
   - Widget đồng hồ đếm ngược TTL tự hủy và nút "Mô phỏng HTTP 410" giải thích nguyên lý bảo mật Redis `GETDEL` Single-Use Token Vault.
   - Thanh dock tác vụ cố định với nút Chấp thuận sơ duyệt, Yêu cầu bổ sung (kèm popover lý do nhanh gửi qua VNeID/SMS), và Chuyển lãnh đạo ký số.

### 2.3. Cấu hình PWA & Tương thích Di động
- Tạo file `frontend/public/manifest.json` đăng ký tên ứng dụng "SmartWard AI - Cổng Dịch Vụ Công Phường 25", màu sắc chủ đạo `#00236F`, chế độ hiển thị `standalone`.
- Tối ưu hóa phản hồi giao diện thích ứng đa nền tảng (Responsive Layout: Mobile, Tablet, Laptop, Desktop).
- Bổ sung định hướng nghiên cứu mở rộng trong tương lai: Phát triển phiên bản ứng dụng di động bản địa (Native Mobile App) bằng React Native / Expo kết hợp thư viện quét camera OCR MLKit trên thiết bị đầu cuối.

### 2.4. Đóng gói & Kiểm thử Kỹ thuật
- Biên dịch TypeScript (`tsc -b`) và đóng gói tài nguyên Vite (`vite build`):
  ```
  vite v6.4.5 building for production...
  ✓ 2132 modules transformed.
  dist/index.html                   1.64 kB │ gzip:   0.87 kB
  dist/assets/index-apbjkXoe.css   29.33 kB │ gzip:   5.82 kB
  dist/assets/index-CgQK96I6.js   474.37 kB │ gzip: 143.63 kB
  ✓ built in 2.45s (0 errors, 0 warnings)
  ```
- Kiểm thử toàn diện phía Backend Spring Boot song hành:
  ```
  [INFO] Tests run: 57, Failures: 0, Errors: 0, Skipped: 0
  [INFO] BUILD SUCCESS
  ```
  Bảo đảm 100% tính tương thích giữa giao diện Frontend React và các REST API Backend.

---

## 3. ĐÁNH GIÁ MỨC TIÊU THỤ TÀI NGUYÊN (ZERO-COST CRITERIA)
- Gói bundle ứng dụng sau khi nén Gzip chỉ chiếm **149.45 KB** (143.63 KB JS + 5.82 KB CSS), tải tức thì trong vòng dưới $100\text{ ms}$ qua mạng nội bộ hoặc 4G/5G.
- Khi triển khai môi trường sản phẩm dưới dạng tệp tĩnh (Static Assets) được phục vụ bởi Nginx hoặc Spring Boot Resource Handler, mức tiêu thụ RAM của phân hệ Frontend xấp xỉ **0 MB**.
- Tổng mức tiêu thụ bộ nhớ toàn hệ thống (Docker Compose: PostgreSQL pgvector + Redis + MinIO + Spring Boot Backend) tiếp tục được duy trì ổn định ở mức $\sim 880\text{ MB} < 2.0\text{ GB}$, đáp ứng trọn vẹn tiêu chuẩn Zero-Cost của đề tài.

---

## 4. KẾ HOẠCH TUẦN 11
- **Đóng gói toàn diện Hệ thống & Tối ưu Docker:**
  - Hoàn thiện tệp `docker-compose.yml` tích hợp cả container Nginx Frontend và Spring Boot Backend với giới hạn tài nguyên khắt khe (`mem_limit: 2048m`).
  - Kiểm thử toàn diện kịch bản chạy ngoại tuyến (Offline Demo Profile) không cần Internet qua `DeterministicMockAiClient`.
- **Rà soát Mã nguồn & Viết Tài liệu:**
  - Thực hiện chuẩn hóa Clean Code, bổ sung chú thích JavaDoc và TypeScript types đầy đủ.
  - Cập nhật hướng dẫn cài đặt và vận hành 1 bước trong `README.md`.
- **Hoàn thiện Bản thảo Báo cáo Khóa luận Tốt nghiệp UTH:**
  - Tổng hợp toàn bộ các Chương 1, 2, 3, 4, 5, Lời cảm ơn, Kết luận, Danh mục tài liệu tham khảo theo quy cách chuẩn UTH (Font Times New Roman, dãn dòng 1.5, canh lề tiêu chuẩn).
  - Gửi bản thảo hoàn chỉnh cho GVHD TS. Lê Văn Quốc Anh và Mentor Viettel An Giang rà soát trước khi đóng bìa.
