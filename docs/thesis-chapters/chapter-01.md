# CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI VÀ BỐI CẢNH THỰC TIỄN

**Đề tài:** SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã  
**Chuyên ngành:** Công nghệ Thông tin – Trường Đại học Giao thông vận tải TP.HCM (UTH)

---

## 1.1. Đặt vấn đề và Tính cấp thiết của đề tài

Trong tiến trình chuyển đổi số quốc gia và cải cách thủ tục hành chính tại Việt Nam, Ủy ban Nhân dân (UBND) cấp xã, phường và thị trấn là cấp chính quyền gần dân nhất, trực tiếp giải quyết khối lượng lớn thủ tục hành chính (TTHC) và tiếp nhận các phản ánh, kiến nghị về đời sống dân sinh. Tại Bộ phận Tiếp nhận và Trả kết quả (thường gọi là **Bộ phận Một cửa**), công tác phục vụ nhân dân đang đối mặt với hai nút thắt lớn về quy trình xử lý thông tin:

### 1.1.1. Tỷ lệ sai sót cao ở khâu chuẩn bị biểu mẫu tờ khai hành chính
Người dân khi thực hiện các thủ tục phổ biến (như đăng ký khai sinh, đăng ký kết hôn, xác nhận tình trạng hôn nhân, đăng ký thường trú/tạm trú) thường gặp nhiều lúng túng trong việc tiếp cận các văn bản quy phạm pháp luật chuyên ngành. Hậu quả là các tờ khai hành chính gửi lên thường xuyên mắc các lỗi logic cơ bản:
* **Sai cấu trúc số định danh cá nhân (CCCD 12 số):** Không khớp mã tỉnh/thành phố nơi đăng ký khai sinh, sai chữ số quy định về thế kỷ và giới tính, hoặc sai lệch 2 số cuối của năm sinh.
* **Mâu thuẫn mốc thời gian:** Tờ khai ghi ngày cấp căn cước trước ngày sinh, ngày sinh ở tương lai, hoặc người chưa đủ 14 tuổi nhưng đã điền ngày cấp thẻ CCCD.
* **Bỏ trống các trường bắt buộc:** Bỏ qua các mục phụ thuộc theo từng loại thủ tục (ví dụ: thông tin người giám hộ, nơi tạm trú trước đây).

Hậu quả là hồ sơ bị cán bộ Một cửa từ chối tiếp nhận hoặc yêu cầu bổ sung nhiều lần, làm gia tăng thời gian chờ đợi, lãng phí chi phí đi lại của người dân và gây áp lực quá tải cục bộ cho công chức tư pháp – hộ tịch.

### 1.1.2. Trùng lặp và phân mảnh dữ liệu phản ánh hiện trường
Khi xảy ra các sự cố hạ tầng đô thị, môi trường hoặc an ninh trật tự trong khu dân cư (ví dụ: sụt lún nắp cống, chập cháy bóng đèn chiếu sáng ngõ xóm, rác thải ùn ứ sau mưa lớn), nhiều người dân cùng sinh sống tại khu vực sẽ đồng thời gửi báo cáo qua các kênh khác nhau (Zalo, mạng xã hội, cổng thông tin). 
* Do các báo cáo được viết bằng ngôn ngữ tự nhiên tự do (khác biệt về phương ngữ, từ viết tắt, cách hành văn) và tọa độ định vị GPS từ điện thoại cá nhân luôn có sai số từ 10m đến 40m (hiệu ứng hẻm sâu đô thị), hệ thống hành chính truyền thống không thể tự động nhận biết chúng thuộc cùng một sự cố gốc.
* Điều này dẫn đến tình trạng cán bộ tiếp nhận phải đọc duyệt từng phản ánh rời rạc, phân công trùng lặp lực lượng xuống hiện trường, làm giảm sút hiệu quả xử lý đô thị thông minh.

---

## 1.2. Mục tiêu Nghiên cứu và Phạm vi Đề tài

### 1.2.1. Mục tiêu tổng quát
Xây dựng một nền tảng phần mềm thông minh mang tên **SmartWard AI**, đóng vai trò là hệ thống hỗ trợ rà soát sơ bộ (Decision-Support System) cấp xã/phường, giúp:
1. Hỗ trợ người dân tra cứu pháp lý TTHC chuẩn xác và kiểm tra tính hợp lệ của tờ khai trước khi đến nộp hồ sơ.
2. Tự động gom cụm và phân luồng các phản ánh dân sinh hiện trường có sự trùng lặp về không gian địa lý và ngữ nghĩa.
3. Đảm bảo an toàn thông tin cá nhân theo Nghị định 13/2023/NĐ-CP với chi phí vận hành 0 VNĐ.

### 1.2.2. Phạm vi và Giới hạn đề tài
* **Phạm vi nghiệp vụ:** Giới hạn trong 40 thủ tục hành chính cấp xã/phường phổ biến nhất thuộc 4 lĩnh vực: Hộ tịch, Cư trú, Chứng thực và Bảo trợ xã hội.
* **Ràng buộc tài nguyên (Zero-Cost Architecture):** Toàn bộ hệ thống được tối ưu hóa để vận hành trọn vẹn trong môi trường Docker cục bộ với tổng mức tiêu thụ RAM $\le 2.0\text{ GB}$. Không sử dụng hạ tầng hàng đợi phân tán nặng nề như Apache Kafka mà sử dụng ThreadPool nội tại của Spring Boot 3.3.
* **Giới hạn pháp lý:** Kết quả tư vấn từ AI chỉ mang tính chất tham khảo sơ duyệt, tuyệt đối không thay thế quyết định hành chính chính thức của cán bộ Một cửa.

---

## 1.3. Các Câu hỏi Nghiên cứu (Research Questions)

Đề tài đặt trọng tâm vào việc giải quyết và chứng minh 3 câu hỏi nghiên cứu cốt lõi:

* **RQ1 (Legal RAG & Chống ảo giác):** *Phương pháp Truy xuất tăng cường (RAG) kết hợp phân đoạn văn bản theo cấu trúc pháp lý (Chương – Điều – Khoản) và cơ chế ngưỡng từ chối trả lời (Abstention Threshold $\theta$) cải thiện độ chính xác trích dẫn và giảm tỷ lệ ảo giác (Hallucination Rate) như thế nào so với việc sử dụng mô hình ngôn ngữ lớn (LLM) thuần túy?*
* **RQ2 (Gom cụm Không gian – Ngữ nghĩa):** *Việc kết hợp bộ lọc khoảng cách địa lý (Spatial Filtering) và độ tương đồng ngữ nghĩa (Semantic Similarity) có hiệu quả như thế nào trong việc gom nhóm các phản ánh hiện trường trùng lặp so với phương pháp chỉ dùng khoảng cách hoặc chỉ dùng văn bản? Ngưỡng tham số tối ưu $(\tau, R)$ được xác định ra sao trên đường cong Precision–Recall?*
* **RQ3 (Deterministic Rule Engine):** *Hệ thống quy tắc hậu kiểm định định sẵn viết bằng Java đặt phía sau mô hình Vision OCR đóng góp bao nhiêu phần trăm vào việc phát hiện và ngăn chặn lỗi logic trên tờ khai hành chính?*

---

## 1.4. Phân định Đóng góp Học thuật và Ranh giới Kỹ thuật

Để khẳng định tính trung thực học thuật trước Hội đồng Đồ án Tốt nghiệp UTH, các hạng mục của đề tài được phân định minh bạch:

| Hạng mục chức năng | Công cụ / API có sẵn (Off-the-shelf) | Đóng góp tự phát triển của sinh viên (Core Contribution) |
| :--- | :--- | :--- |
| **Tra cứu Pháp lý TTHC** | API mô hình Embedding (`text-embedding-004`) và LLM tạo sinh. | - Thiết kế thuật toán phân đoạn văn bản luật theo cấu trúc Điều - Khoản kèm metadata hiệu lực.<br/>- Xây dựng cơ chế chốt chặn Abstention Guardrail ($\theta$) buộc AI từ chối trả lời khi không có căn cứ rõ ràng.<br/>- Thuật toán hậu kiểm trích dẫn (Post-verification). |
| **Kiểm tra Tờ khai Hành chính** | API Vision OCR trích xuất ký tự thô sang định dạng JSON. | - Động cơ quy tắc **Java Rule Engine**: Kiểm tra cấu trúc 12 số CCCD (mã tỉnh, thế kỷ/giới tính, năm sinh), đối chiếu chéo logic ngày tháng.<br/>- Bộ lọc cảnh báo vùng mờ ảnh có OCR Confidence $< 0.70$. |
| **Gom nhóm Phản ánh Hiện trường** | Thư viện Redis GEO (`GEOSEARCH`) và extension pgvector. | - Thiết kế thuật toán gom cụm 2 pha (Spatial-Semantic Deduplication).<br/>- Xây dựng kịch bản Grid Search thực nghiệm tìm điểm cân bằng $F_1$-score tối ưu trên dải tham số $(R, \tau)$. |
| **Kho Lưu trữ Tài liệu Bảo mật** | Thư viện mã hóa `javax.crypto` và MinIO Object Storage. | - Mô-đun đóng dấu mờ động (Dynamic Watermarking) bằng Java2D ghi rõ ngày giờ và mục đích sử dụng.<br/>- Cơ chế khóa nguyên tử một lần đọc (One-Time Read Token) qua lệnh `GETDEL` trên Redis. |

---

## 1.5. Cấu trúc của Báo cáo Đồ án Tốt nghiệp

Báo cáo tốt nghiệp được bố cục thành 4 chương chính:
* **Chương 1: Tổng quan đề tài và Bối cảnh thực tiễn:** Trình bày lý do chọn đề tài, tính cấp thiết, các câu hỏi nghiên cứu và phạm vi kỹ thuật.
* **Chương 2: Cơ sở lý thuyết và Kiến trúc hệ thống:** Phân tích lý thuyết về RAG, Vector Database, Redis GEO, mã hóa AES và lý giải kiến trúc Modular Monolith Spring Boot 3.3.
* **Chương 3: Thiết kế và Cài đặt hệ thống:** Trình bày chi tiết giải thuật 4 module nghiệp vụ lõi, sơ đồ tuần tự và thiết kế cơ sở dữ liệu.
* **Chương 4: Thực nghiệm, Đánh giá kết quả và Thảo luận:** Công bố số liệu kiểm thử trên 80 câu hỏi RAG, 150 phản ánh hiện trường, kết quả Grid Search tối ưu tham số và phân tích lỗi (Error Analysis).
