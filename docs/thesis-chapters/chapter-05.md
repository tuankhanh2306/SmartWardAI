# CHƯƠNG 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

---

## 5.1. TỔNG KẾT CÁC KẾT QUẢ ĐẠT ĐƯỢC CỦA ĐỀ TÀI

Sau 12 tuần nghiên cứu lý thuyết, thiết kế kiến trúc, hiện thực hóa mã nguồn và thực nghiệm khoa học nghiêm ngặt trong khuôn khổ Học kỳ Doanh nghiệp tại Viettel An Giang và Đồ án Tốt nghiệp tại Viện Đào tạo Chất lượng cao – Trường Đại học Giao thông vận tải TP.HCM (UTH), đề tài **"SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã"** đã hoàn thành 100% các mục tiêu đề ra ban đầu, giải quyết trọn vẹn ba câu hỏi nghiên cứu then chốt:

### 1. Trả lời Câu hỏi Nghiên cứu 1 (RQ1 - Chống ảo giác trong Tư vấn Pháp lý Hành chính):
- **Giải pháp đề xuất:** Xây dựng hệ thống Legal RAG chuyên biệt dựa trên phương pháp phân mảnh văn bản theo cấu trúc phân cấp (Hierarchical Legal Chunking theo Chương - Điều - Khoản), chỉ mục đồ thị HNSW trên PostgreSQL pgvector và thiết lập chốt chặn từ chối an toàn (Abstention Guardrail) tại ngưỡng tin cậy toán học $\theta = 0.78$.
- **Kết quả thực nghiệm:** Đạt tỷ lệ truy xuất chính xác **Recall@3 = 95.38%**, **MRR = 0.912**, độ chính xác trích dẫn pháp lý **98.46%**. Đặc biệt, cơ chế Guardrail đạt tỷ lệ từ chối chính xác **True Abstention Rate = 100.0%** (15/15 câu hỏi bẫy ngoài phạm vi thẩm quyền đều bị chặn thành công, tỷ lệ phát sinh ảo giác sai lệch bằng $0.0\%$).

### 2. Trả lời Câu hỏi Nghiên cứu 2 (RQ2 - Phân luồng & Gom cụm Phản ánh Hiện trường):
- **Giải pháp đề xuất:** Thiết kế thuật toán phân luồng Hai Giai đoạn (Two-Stage Spatial-Semantic Triage) kết hợp tuần tự bộ lọc không gian Redis GEO ($R = 75\text{m}$) và bộ so khớp ngữ nghĩa vector pgvector ($\tau = 0.82$).
- **Kết quả thực nghiệm:** Đạt đỉnh Pareto tối ưu với **Precision = 100.0%**, **Recall = 100.0%**, **F1-Score = 100.0%**, phân cụm chính xác toàn bộ 30 cụm sự cố gốc và 25 ca biên nhiễu GPS đối kháng. Thời gian xử lý trung bình chỉ **$14.1\text{ ms}$** (nhanh hơn 13 lần so với phương pháp Semantic-only $184.2\text{ ms}$), đồng thời triệt tiêu hoàn toàn hiện tượng gộp nhầm của phương pháp Spatial-only thuần túy.

### 3. Trả lời Câu hỏi Nghiên cứu 3 (RQ3 - Bảo mật Dữ liệu & Ràng buộc Tài nguyên Zero-Cost):
- **Giải pháp đề xuất:** Hiện thực hóa kho bảo mật Zero-Trust Document Vault tuân thủ Điều 17 Nghị định 13/2023/NĐ-CP với mã hóa khối AES-256-GCM, thủy vân số động xoay chéo $-45^\circ$ qua Java2D và token truy cập một lần tự hủy (Single-Use Ephemeral Token) bằng lệnh nguyên tử Redis `GETDEL` (mô phỏng HTTP 410 Gone).
- **Kết quả thực nghiệm:** Hệ thống kiểm tra tờ khai bảo đảm nguyên tắc hành chính bất biến (*chỉ nhắc nhở người dân sửa bằng bút trên tờ khai giấy, không can thiệp sửa đổi trực tiếp trên màn hình*). Toàn bộ hệ thống 5 dịch vụ (PostgreSQL, Redis, MinIO, Spring Boot Backend, Nginx Frontend) hoạt động với tổng mức tiêu thụ RAM đỉnh chỉ **$880\text{ MB} < 2.0\text{ GB}$**, sẵn sàng chạy trên hạ tầng máy chủ cơ sở hiện có mà không phát sinh bất kỳ chi phí bản quyền phần mềm nào.

---

## 5.2. ĐÓNG GÓP THỰC TIỄN CHO CƠ QUAN HÀNH CHÍNH CẤP CƠ SỞ

1. **Đối với Người dân Địa phương (Công dân Phường 25, Bình Thạnh):**
   - Tiết kiệm thời gian đi lại: Công dân được tư vấn thủ tục hành chính trực tuyến 24/7 với căn cứ pháp lý rõ ràng, dễ hiểu.
   - Giảm thiểu rủi ro bị từ chối hồ sơ: Tính năng tiền kiểm định (Form Precheck) chỉ ra chính xác các lỗi sai về số CCCD, ngày cấp thẻ và mâu thuẫn thời gian trên tờ khai giấy trước khi người dân mang đến nộp tại Ủy ban.
   - Nâng cao tính minh bạch: Người dân dễ dàng gửi phản ánh hiện trường kèm định vị GPS tự động và theo dõi trực quan tiến độ xử lý của chính quyền.

2. **Đối với Cán bộ Tiếp nhận và Lãnh đạo UBND Phường/Xã:**
   - Giảm tải áp lực công việc Một cửa: Tự động hóa khâu sơ duyệt và đối chiếu chéo thông tin biểu mẫu với CSDL Dân cư Quốc gia (Đề án 06/CP), rút ngắn thời gian tiếp nhận mỗi bộ hồ sơ từ 15-20 phút xuống dưới 3 phút.
   - Tối ưu hóa điều hành hiện trường: Trung tâm chỉ huy GIS gom cụm các phản ánh trùng lặp, trực quan hóa bức tranh nóng của địa bàn (ngập úng, sụt lún, trật tự đô thị), ngăn ngừa việc điều động phân tán và trùng lặp nhân lực.
   - An tâm tuyệt đối về an toàn thông tin: Kiến trúc Zero-Trust Vault bảo vệ cán bộ khỏi các rủi ro pháp lý về lộ lọt dữ liệu công dân theo Nghị định 13/2023/NĐ-CP.

---

## 5.3. BÀI HỌC KINH NGHIỆM TRONG QUÁ TRÌNH THỰC HIỆN ĐỀ TÀI

Quá trình triển khai đề tài tại Viettel An Giang đã mang lại cho sinh viên những bài học chuyên môn và kỹ năng quý báu:
- **Tư duy Kiến trúc Bền vững (Pragmatic Architecture):** Không chạy theo các mô hình trí tuệ nhân tạo cồng kềnh tiêu tốn phần cứng xa xỉ. Việc thấu hiểu bản chất bài toán và kết hợp khéo léo giữa lọc dữ liệu thô (Redis GEO) với tinh chỉnh ngữ nghĩa (Vector Cosine) đã tạo ra một giải pháp thanh thoát, tốc độ cao và chi phí vận hành bằng không.
- **Kỷ luật Kỹ thuật Phần mềm (Software Engineering Discipline):** Áp dụng nghiêm ngặt quy trình kiểm thử đơn vị và tích hợp (57/57 backend tests tự động), cấu trúc mã nguồn theo chuẩn kiến trúc phân tầng sạch (Clean Hexagonal/Layered Architecture), và quy trình kiểm soát phiên bản Git có hệ thống.
- **Kỹ năng Tương tác Thiết kế Giao diện Hiện đại:** Khả năng phối hợp giữa công cụ thiết kế giao diện AI (Google Stitch qua giao thức Stitch MCP) với việc hiện thực hóa mã nguồn Frontend PWA sạch (React 18 + TailwindCSS + Leaflet) giúp đẩy nhanh tiến độ bàn giao sản phẩm từ vài tuần xuống vài ngày mà vẫn đảm bảo tính chuẩn xác về mặt thẩm mỹ GovTech.

---

## 5.4. HẠN CHẾ HIỆN TẠI CỦA HỆ THỐNG

Mặc dù đã đạt được các kết quả thực nghiệm ấn tượng, hệ thống vẫn tồn tại một số hạn chế nhất định cần được tiếp tục hoàn thiện:
1. **Phụ thuộc vào chất lượng chụp ảnh tờ khai:** Khâu trích xuất thông tin OCR trên biểu mẫu giấy phụ thuộc vào điều kiện ánh sáng, góc chụp và chất lượng camera điện thoại của người dân. Trong trường hợp giấy tờ bị nhàu nát, gấp nếp nghiêm trọng hoặc chữ viết tay quá mờ, độ chính xác nhận diện ký tự quang học có thể bị suy giảm.
2. **Bộ quy tắc nghiệp vụ tập trung vào thủ tục cốt lõi:** Hệ thống hiện tại đã cấu hình và kiểm chứng trên 40 thủ tục hành chính trọng điểm cấp xã/phường (Hộ tịch, Cư trú, Đất đai, Chứng thực). Các thủ tục đặc thù liên quan đến xây dựng phức tạp hoặc khiếu nại tố cáo đa ngành vẫn đòi hỏi cán bộ trực tiếp tư vấn chuyên sâu.
3. **Môi trường hoạt động Web/PWA:** Mặc dù PWA cho phép cài đặt nhanh trên màn hình chính di động, nhưng việc tương tác sâu với phần cứng máy ảnh chuyên dụng (như chống rung phần cứng, tự động căn khung viền văn bản tự động - auto-cropping) trên trình duyệt di động vẫn bị giới hạn so với ứng dụng bản địa (Native Mobile App).

---

## 5.5. HƯỚNG PHÁT TRIỂN TRONG TƯƠNG LAI

Để nâng cao hơn nữa giá trị thực tiễn và mở rộng phạm vi ứng dụng của hệ thống, các định hướng nghiên cứu và phát triển tiếp theo bao gồm:

### 1. Xây dựng Ứng dụng Di động Bản địa (Native Mobile App with On-Device AI):
- Phát triển ứng dụng bằng **React Native / Expo** cho cả hai hệ điều hành iOS và Android.
- Tích hợp thư viện quét tài liệu và OCR cục bộ trực tiếp trên thiết bị (On-Device MLKit Document Scanner), cho phép tự động căn chỉnh góc xoay, cắt viền thông minh và kiểm tra sơ bộ chữ viết tay ngay cả khi người dân đang ngoại tuyến không có mạng Internet.

### 2. Tích hợp Trực tiếp với Cổng Định danh Điện tử Quốc gia (VNeID):
- Phối hợp kết nối API định danh mức độ 2 của Đề án 06/CP (Bộ Công an). Khi công dân quét mã QR trên ứng dụng VNeID, các trường thông tin nhân thân (Họ tên, Số định danh, Nơi thường trú) sẽ được tự động điền sẵn vào tờ khai điện tử với độ tin cậy tuyệt đối 100%, loại bỏ hoàn toàn sai sót do nhập liệu thủ công.

### 3. Hỗ trợ Đa Ngôn ngữ và Tiếng Dân tộc Thiểu số:
- Đối với các tỉnh khu vực Đồng bằng sông Cửu Long (như An Giang, Trà Vinh, Sóc Trăng) và các tỉnh miền núi, mở rộng mô hình hỗ trợ giao diện và giọng nói song ngữ: Tiếng Việt - Tiếng Khmer hoặc Tiếng Chăm, giúp đồng bào dân tộc thiểu số dễ dàng tiếp cận các dịch vụ công bình đẳng và thuận tiện.

### 4. Cơ chế Học chủ động với Phản hồi của Con người (Human-in-the-Loop Active Learning):
- Xây dựng hệ thống tự học từ các phán quyết của cán bộ: Khi cán bộ tiếp nhận điều chỉnh một trường dữ liệu OCR hoặc tách/gộp một cụm phản ánh hiện trường, hệ số kinh nghiệm đó sẽ được ghi nhận vào hàng đợi phản hồi (Feedback Queue) để tự động tinh chỉnh ngưỡng $(\theta, R, \tau)$ theo đặc thù thời tiết và địa bàn của từng địa phương theo thời gian.
