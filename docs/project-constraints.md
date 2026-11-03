# TÀI LIỆU ĐẶC TẢ RÀNG BUỘC DỰ ÁN (PROJECT CONSTRAINTS SPECIFICATION)
**Dự án:** SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã  
**Tài liệu tham khảo cho:** Báo cáo Học kỳ Doanh nghiệp & Đồ án Tốt nghiệp (Chương 2: Phân tích Ràng buộc & Giới hạn Đề tài)

---

## 1. Ràng buộc về Ngân sách và Hạ tầng Vận hành (Zero-Cost & Resource Constraints)

Do dự án được thực hiện độc lập bởi 1 sinh viên trong thời gian 3 tháng với ngân sách vận hành **0 VNĐ**, toàn bộ hệ thống bị ràng buộc nghiêm ngặt về mức tiêu thụ phần cứng:

* **Tổng bộ nhớ RAM toàn hệ thống:**  
  Giới hạn tối đa **2.0 GB RAM** cho toàn bộ cụm Docker Compose để đảm bảo ứng dụng chạy mượt mà trên máy tính cá nhân tiêu chuẩn (laptop học tập).
* **Kiến trúc ứng dụng (No Message Broker Overhead):**  
  Không sử dụng các hệ thống hàng đợi phân tán tiêu tốn tài nguyên bộ nhớ như Apache Kafka hay RabbitMQ. Bắt buộc xử lý bất đồng bộ thông qua `ThreadPoolTaskExecutor` (`@Async`) nội tại của Spring Boot với cấu hình: `corePoolSize = 2`, `maxPoolSize = 4`, `queueCapacity = 50`.
* **Cơ sở dữ liệu PostgreSQL 16 (pgvector):**  
  * Giới hạn RAM container: `512 MB`.
  * Số kết nối đồng thời tối đa (HikariCP `maximum-pool-size`): `10 connections`, `minimum-idle: 2`.
  * Kích thước chiều Vector Embedding cố định: `768 dimensions` (sử dụng chỉ mục HNSW để cân bằng giữa tốc độ truy vấn và dung lượng RAM).
* **Bộ nhớ đệm Redis 7:**  
  * Giới hạn RAM container: `128 MB` (`maxmemory 100mb`).
  * Chính sách giải phóng bộ nhớ: `volatile-lru` (chỉ lưu các khóa có gắn thời gian tự hủy TTL).
* **Lưu trữ đối tượng MinIO (Object Storage):**  
  * Hạn mức dung lượng Bucket (`smartward-vault`): Tối đa `5 GB`.
  * Kích thước tệp tải lên tối đa: `5 MB / ảnh` (chỉ chấp nhận định dạng `.jpg`, `.png`, `.pdf`).
  * Vòng đời lưu trữ (Lifecycle Policy - ILM): Tự động xóa vĩnh viễn các tệp tờ khai và giấy tờ tạm sau `7 ngày`, xóa ảnh hiện trường sau `30 ngày`.
* **Hạn mức API AI bên ngoài (Rate Limit Constraint):**  
  Sử dụng gói miễn phí (Free-tier) của mô hình ngôn ngữ lớn/OCR (giới hạn tối đa 15 requests/phút). Do đó hệ thống bắt buộc:
  * Cài đặt bộ giới hạn tốc độ (Rate Limiter trên Redis: tối đa `5 yêu cầu/phút/người dùng`).
  * Lưu bộ nhớ đệm (Cache) trên Redis cho các câu hỏi thủ tục trùng lặp trong thời gian 1 giờ.

---

## 2. Ràng buộc về Kỹ thuật và Độ chính xác Thuật toán (Technical & Algorithmic Constraints)

Hệ thống không áp dụng AI một cách cảm tính mà phải tuân thủ các ranh giới kỹ thuật rõ ràng:

* **Ràng buộc chống ảo giác trong RAG (Abstention Guardrail):**  
  * Hệ thống chỉ được phép sinh câu trả lời từ các đoạn văn bản pháp luật nằm trong cơ sở dữ liệu nội bộ có trạng thái `ACTIVE` và còn hiệu lực.
  * Nếu điểm tương đồng Cosine cao nhất ($S_{\max}$) nhỏ hơn ngưỡng từ chối $\theta$ (xác định qua thực nghiệm, mặc định $\theta = 0.78$), hệ thống bắt buộc **từ chối trả lời** và trả về thông báo hướng dẫn người dân liên hệ trực tiếp cán bộ Một cửa.
* **Ràng buộc nhận diện biểu mẫu (OCR & Rule Engine):**  
  * Chỉ hỗ trợ tốt đối với biểu mẫu in, đánh máy hoặc chữ viết tay rõ nét chụp trong điều kiện đủ sáng (độ phân giải tối thiểu 1000 x 1000 px).
  * Nếu độ tin cậy nhận diện ký tự (Confidence Score) của trường thông tin thấp hơn `0.70`, hệ thống không tự ý kết luận đúng/sai mà phải gắn nhãn `"Cần người dùng kiểm tra lại do ảnh mờ"`.
* **Ràng buộc gom nhóm phản ánh hiện trường (Spatial-Semantic Deduplication):**  
  * Hai phản ánh chỉ được gộp vào cùng một cụm sự cố (Cluster) khi thỏa mãn đồng thời 3 điều kiện:
    1. Cùng danh mục sự cố $C$.
    2. Khoảng cách địa lý $\le R$ mét.
    3. Độ tương đồng ngữ nghĩa $\ge \tau$.
  * Chỉ xét gộp với các sự cố đang ở trạng thái `OPEN` hoặc `IN_PROGRESS` được báo cáo trong vòng `72 giờ` gần nhất.

---

## 3. Ràng buộc về Bảo mật và Quyền riêng tư Dữ liệu (Security & Privacy Constraints)

Tuân thủ nghiêm ngặt quy định bảo mật thông tin trong hướng dẫn thực tập và nguyên tắc bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP):

* **Không lưu trữ dữ liệu nhạy cảm dạng rõ (No Plaintext PII):**  
  Ảnh chụp CCCD hoặc giấy tờ hộ tịch gửi kèm phải được đóng dấu mờ động (Watermark ghi rõ ngày giờ và mục đích: *"CHỈ DÙNG ĐỂ SƠ DUYỆT HỒ SƠ TẠI UBND - [TIMESTAMP]"*) và mã hóa chuẩn `AES-256-GCM` trước khi lưu xuống MinIO.
* **Cơ chế truy cập một lần (One-Time Read Constraint):**  
  Đường dẫn xem giấy tờ đính kèm chỉ có hiệu lực trong 24 giờ và tự động bị hủy trên Redis ngay tại mili-giây đầu tiên khi cán bộ mở xem (`GETDEL` / Lua script). Lần truy cập thứ hai bắt buộc trả về mã `410 Gone`.
* **Giới hạn vật lý:**  
  Hệ thống bảo vệ luồng truyền tải và chống rò rỉ liên kết, nhưng không thể ngăn chặn việc người xem sử dụng thiết bị bên ngoài (như điện thoại khác) để chụp lại màn hình hiển thị.
* **Ẩn danh hóa dữ liệu thực nghiệm:**  
  Toàn bộ dữ liệu tờ khai, họ tên, số CCCD, địa chỉ sử dụng trong quá trình phát triển và viết báo cáo đều phải là dữ liệu giả lập (Synthetic/Anonymized Data), tuyệt đối không sử dụng thông tin công dân thật.

---

## 4. Ràng buộc về Nghiệp vụ và Pháp lý (Legal & Operational Disclaimers)

* **Vai trò hỗ trợ tham khảo (Decision-Support Only):**  
  Hệ thống đóng vai trò rà soát sơ bộ giúp người dân giảm sai sót trước khi đến UBND phường/xã. Kết quả của hệ thống **không có giá trị pháp lý** thay thế phiếu tiếp nhận, phiếu yêu cầu bổ sung hồ sơ hoặc kết luận của công chức tư pháp – hộ tịch. Mọi phản hồi đều phải đính kèm tuyên bố miễn trừ trách nhiệm.
* **Tính thời điểm của văn bản pháp luật:**  
  Cơ sở tri thức trong phạm vi đồ án chỉ giới hạn ở 40 thủ tục hành chính phổ biến cấp phường/xã được cập nhật đến thời điểm khóa dữ liệu thực nghiệm. Khi có quy định mới hoặc thay đổi địa giới hành chính, quản trị viên cần cập nhật lại văn bản và trường `effective_date`.

---

## 5. Ràng buộc về Thời gian và Nhân sự (Scope & Schedule Constraints)

* **Nhân sự:** 01 sinh viên thực hiện toàn bộ (Full-stack, Thiết kế CSDL, Thực nghiệm thuật toán và Soạn thảo Báo cáo) dưới sự hướng dẫn của Mentor doanh nghiệp và Giảng viên hướng dẫn.
* **Thời gian thực hiện:** Gói gọn trong **12 tuần (3 tháng)** của Học kỳ doanh nghiệp.
* **Các hạng mục nằm ngoài phạm vi đề tài (Out-of-Scope):**
  * Không tích hợp trực tiếp với Cổng Dịch vụ công Quốc gia hoặc Cơ sở dữ liệu quốc gia về dân cư (do yêu cầu bảo mật cấp nhà nước và phân quyền chuyên ngành).
  * Không xử lý thanh toán lệ phí hành chính trực tuyến.
  * Không xây dựng ứng dụng di động gốc (Native iOS/Android) mà triển khai dưới dạng Web App đáp ứng (Responsive Web App) tương thích hoàn hảo trên trình duyệt điện thoại và máy tính.
