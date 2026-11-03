# Kế hoạch Nghiên cứu, Bối cảnh & Ràng buộc Vận hành
**Dự án:** SmartWard AI (Civic Governance & Legal RAG Platform)  
**Tài liệu tham khảo cho:** Báo cáo Học kỳ Doanh nghiệp & Đồ án Tốt nghiệp (Chương 1 & Chương 2)

---

## 1. Đặt vấn đề và Bối cảnh Thực tiễn (Chương 2 - Bối cảnh và mục tiêu)

Tại bộ phận Tiếp nhận và Trả kết quả (Bộ phận Một cửa) cấp xã/phường, công tác giải quyết thủ tục hành chính và tiếp nhận phản ánh dân sinh đang tồn tại hai hạn chế lớn về mặt quy trình xử lý thông tin:

1. **Sai sót biểu mẫu ở khâu chuẩn bị hồ sơ:**  
   Người dân thường gặp khó khăn khi tra cứu điều kiện pháp lý đặc thù hoặc điền thiếu/sai thông tin trên các tờ khai hành chính (như sai định dạng số định danh cá nhân CCCD, mâu thuẫn mốc thời gian ngày sinh – ngày cấp, thiếu giấy tờ đính kèm theo quy định). Điều này dẫn đến tình trạng hồ sơ bị trả về để bổ sung nhiều lần, làm tăng thời gian chờ đợi và gây quá tải cho cán bộ tiếp nhận.
   
2. **Trùng lặp và phân mảnh dữ liệu phản ánh hiện trường:**  
   Các phản ánh về hạ tầng đô thị, vệ sinh môi trường và an ninh trật tự được người dân gửi qua nhiều kênh phi cấu trúc. Khi một sự cố xảy ra tại khu dân cư (ví dụ: ngập nước cục bộ, hư hỏng nắp cống, rác thải ùn ứ), nhiều người dân cùng gửi báo cáo với các cách diễn đạt khác nhau và tọa độ GPS có sai số nhất định. Điều này gây quá tải thông tin, phân mảnh dữ liệu và khó khăn cho cán bộ chuyên môn trong việc gom nhóm, phân loại và phân công xử lý.

---

## 2. Câu hỏi Nghiên cứu (Research Questions)

Đề tài tập trung giải quyết 3 câu hỏi nghiên cứu cốt lõi có thể kiểm chứng bằng thực nghiệm khoa học:

* **RQ1:** Phương pháp Truy xuất tăng cường (RAG) kết hợp phân đoạn văn bản theo cấu trúc pháp lý (Chương – Điều – Khoản) và cơ chế ngưỡng từ chối trả lời (Abstention Threshold $\theta$) cải thiện độ chính xác trích dẫn và giảm tỷ lệ ảo giác (Hallucination Rate) như thế nào so với việc sử dụng mô hình ngôn ngữ lớn (LLM) thuần túy?
* **RQ2:** Việc kết hợp bộ lọc khoảng cách địa lý (Spatial Filtering) và độ tương đồng ngữ nghĩa (Semantic Similarity) có hiệu quả như thế nào trong việc gom nhóm các phản ánh hiện trường trùng lặp so với phương pháp chỉ dùng khoảng cách hoặc chỉ dùng văn bản? Ngưỡng tham số tối ưu $(\tau, R)$ được xác định ra sao trên đường cong Precision–Recall?
* **RQ3:** Hệ thống quy tắc hậu kiểm định định sẵn (Deterministic Validation Rules) đặt phía sau mô hình OCR đóng góp bao nhiêu phần trăm vào việc phát hiện và ngăn chặn lỗi logic trên tờ khai hành chính trước khi nộp hồ sơ?

---

## 3. Phân định Phần Tự Phát triển và Công cụ Có sẵn

Nhằm đảm bảo tính minh bạch học thuật và làm rõ đóng góp cá nhân khi bảo vệ trước Hội đồng, ranh giới kỹ thuật của đề tài được phân định cụ thể:

| Hạng mục | Công cụ / Mô hình có sẵn (Off-the-shelf) | Phần sinh viên tự thiết kế và lập trình (Core Contribution) |
| :--- | :--- | :--- |
| **Xử lý Thủ tục Hành chính (RAG)** | API tạo Vector Embedding và LLM sinh văn bản (`text-embedding-004`, Gemini API / Ollama). | - Bộ tiền xử lý băm văn bản pháp luật theo cấu trúc Điều - Khoản - Điểm kèm metadata ngày hiệu lực.<br/>- Thuật toán Hybrid Search kết hợp lọc quan hệ, từ khóa và vector (`pgvector`).<br/>- Bộ lọc ngưỡng độ tin cậy ($\theta$) buộc hệ thống từ chối trả lời khi không tìm thấy căn cứ pháp lý rõ ràng. |
| **Kiểm tra Tờ khai (Form Pre-check)** | Mô hình Vision OCR trích xuất văn bản thô từ ảnh chụp biểu mẫu. | - **Rule-based Validation Engine** viết bằng Java: Kiểm tra trường bắt buộc theo từng mã thủ tục hành chính.<br/>- Thuật toán kiểm tra cấu trúc 12 số CCCD (mã tỉnh/thành phố, mã giới tính/thế kỷ, năm sinh).<br/>- Kiểm tra tính hợp lý chéo giữa các mốc thời gian (ngày sinh < ngày cấp < ngày hiện tại). |
| **Gom nhóm Phản ánh (Issue Triage)** | Thư viện tính khoảng cách không gian của Redis GEO (`GEOSEARCH`) và vector cosine của `pgvector`. | - Thuật toán kết hợp 2 pha (Spatial-Semantic Deduplication).<br/>- Kịch bản thực nghiệm quét lưới tham số (Grid Search) cho bán kính $R$ và ngưỡng ngữ nghĩa $\tau$ để tìm điểm cân bằng $F_1$-score tối ưu. |
| **Bảo mật Hồ sơ (Document Vault)** | Thư viện mã hóa chuẩn `javax.crypto` (AES-256-GCM) và lưu trữ đối tượng MinIO S3-compatible. | - Mô-đun tự động đóng dấu mờ động (Dynamic Watermarking) ghi rõ mục đích và thời gian sử dụng lên ảnh giấy tờ.<br/>- Cơ chế khóa nguyên tử một lần đọc (One-Time Read Token) bằng Redis Lua Script / `GETDEL`. |

---

## 4. Ràng buộc Tài nguyên và Chi phí (Zero-Cost Architecture Constraints)

Hệ thống được thiết kế để vận hành hoàn chỉnh trên môi trường máy cục bộ (Local Docker stack) hoặc các gói dịch vụ đám mây miễn phí (Free-tier) mà không làm suy giảm tính đúng đắn của thuật toán:

* **Tổng bộ nhớ RAM giới hạn:** $\le 2.0\text{ GB}$ (Đã lược bỏ Apache Kafka để tránh lãng phí tài nguyên cho quy mô phường/xã; sử dụng Spring Boot `@Async` ThreadPoolExecutor và `ApplicationEventPublisher` để xử lý các tác vụ bất đồng bộ).
* **PostgreSQL 16 + pgvector:** Giới hạn `mem_limit: 512m`, cấu hình HikariCP tối đa 10 kết nối đồng thời (`maximum-pool-size: 10`).
* **Redis 7:** Giới hạn `mem_limit: 128m`, `maxmemory 100mb`, chính sách giải phóng `volatile-lru`, lưu trữ tọa độ cụm sự cố đang mở (GEO index) và token tự hủy (TTL 24 giờ).
* **MinIO Object Storage:** Giới hạn cứng dung lượng Bucket `smartward-vault` ở mức `5 GB`, kích thước mỗi ảnh tải lên $\le 5\text{ MB}$, thiết lập Lifecycle Policy (ILM) tự động xóa các tệp tạm sau 7 ngày.

---

## 5. Giới hạn Pháp lý và Bảo mật (Limitations & Disclaimers)

* **Tuyên bố miễn trừ trách nhiệm (Legal Disclaimer):**  
  Mọi kết quả tư vấn thủ tục hành chính và kiểm tra sơ bộ tờ khai từ hệ thống chỉ mang tính chất hỗ trợ tham khảo trước khi nộp, tuyệt đối không thay thế quyết định tiếp nhận hoặc từ chối hồ sơ chính thức của công chức có thẩm quyền tại Bộ phận Một cửa.
* **Giới hạn của liên kết tự hủy (One-Time Link):**  
  Cơ chế token tự hủy (One-time token) và đóng dấu mờ động chỉ giải quyết triệt để việc rò rỉ đường dẫn truy cập trái phép hoặc tái sử dụng file ảnh vào các mục đích khác; cơ chế này không thể ngăn chặn hành vi cố tình chụp lại màn hình vật lý từ thiết bị của người xem.
* **Cập nhật hiệu lực văn bản pháp lý:**  
  Mỗi văn bản thủ tục nạp vào hệ thống đều được gắn chặt với các trường `effective_date`, `expiry_date` và `administrative_unit_code` nhằm thích ứng linh hoạt với việc thay đổi tên gọi, địa giới và thẩm quyền quản lý sau các đợt sắp xếp, sáp nhập đơn vị hành chính cấp xã.
