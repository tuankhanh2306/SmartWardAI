# CẨM NANG THIẾT KẾ HỆ THỐNG, LÝ GIẢI CÔNG NGHỆ VÀ BỘ CÂU HỎI BẢO VỆ ĐỐI KHÁNG
## DỰ ÁN: SMARTWARD AI (NỀN TẢNG CHÍNH QUYỀN SỐ CẤP XÃ/PHƯỜNG)
**Đơn vị đào tạo:** Viện Đào tạo Chất lượng cao – Trường ĐH Giao thông vận tải TP.HCM (UTH)  
**Đơn vị tiếp nhận thực tập:** Viettel An Giang – Tập đoàn Công nghiệp – Viễn thông Quân đội  
**Sinh viên thực hiện:** Nguyễn Minh Tuấn Khanh (MSSV: 089205023490 - Lớp: CN2301CLCB)  
**Giảng viên hướng dẫn:** TS. Lê Văn Quốc Anh (UTH)  

---

# PHẦN 1: TẠI SAO LÀM THẾ NÀY? TẠI SAO KHÔNG CHỌN CÁI KHÁC?
*(System Architecture Decisions & Alternative Trade-offs Analysis)*

Tài liệu này đóng vai trò là "Vũ khí phản biện" giúp sinh viên trả lời thuyết phục trước bất kỳ câu hỏi nào của Hội đồng về lý do lựa chọn công nghệ, chứng minh mọi quyết định kỹ thuật đều có cơ sở khoa học và tính toán thực tế, không hề cảm tính.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TỔNG HỢP MA TRẬN ĐÁNH ĐỔI CÔNG NGHỆ                            │
├─────────────────────────┬───────────────────────────┬──────────────────────────────────┤
│ Thành phần kiến trúc    │ Công nghệ được CHỌN       │ Công nghệ BỊ BÁC BỎ & Lý do     │
├─────────────────────────┼───────────────────────────┼──────────────────────────────────┤
│ Mô hình kiến trúc       │ Modular Monolith          │ Microservices (Over-engineering) │
│ Nền tảng Backend        │ Spring Boot 3.3 (Java 21) │ NodeJS / Python (Type/Memory)    │
│ Lưu trữ & Vector Search │ PostgreSQL 16 + pgvector  │ Milvus / Pinecone (Tốn RAM, sync)│
│ Bộ nhớ đệm & Không gian │ Redis 7 (GEO + GETDEL)    │ PostGIS (Nặng RAM) / Memcached   │
│ Lưu trữ tệp nhị phân    │ MinIO Object Storage (S3) │ Lưu Local Disk / Lưu BLOB vào DB │
│ Hàng đợi tác vụ ngầm    │ Spring @Async + Outbox    │ Apache Kafka / RabbitMQ (Tốn RAM)│
│ Framework RAG           │ Tự code Java + pgvector   │ LangChain / LlamaIndex (Blackbox)│
│ Hậu kiểm tra tờ khai    │ Java Rule Engine tất định │ LLM kiểm tra (Xác suất mờ, ảo)  │
│ Thuật toán gom phản ánh │ Two-Stage Spatial-Semantic│ Spatial-only hoặc Semantic-only  │
│ Bảo vệ hồ sơ công dân   │ Watermark + AES + One-Time│ Lưu file gốc không che mờ        │
│ Nền tảng giao diện      │ Web Responsive / PWA      │ Native Mobile App (Quá tải solo) │
└─────────────────────────┴───────────────────────────┴──────────────────────────────────┤
```

---

## 1. Kiến Trúc Backend: Modular Monolith (Spring Boot 3.3 / Java 21)
### Tại sao CHỌN?
1. **Ràng buộc phần cứng Zero-Cost ($\le 2.0\text{ GB}$ RAM):** Cấp xã/phường tại Việt Nam thường tận dụng máy chủ nội bộ hoặc máy trạm cũ. Một tiến trình JVM duy nhất của Spring Boot được tối ưu cờ `-Xmx256m` chỉ tốn khoảng ~410MB RAM thực tế (RSS), chạy nhẹ nhàng cạnh CSDL.
2. **Tính toàn vẹn giao dịch (ACID):** Cho phép thực hiện các thao tác ghi nhận phản ánh, cập nhật cụm sự cố và lưu hồ sơ trong một Database Transaction nội bộ duy nhất.
3. **Java 21 & Virtual Threads (Project Loom):** Cho phép xử lý hàng nghìn kết nối đồng thời với chi phí bộ nhớ cực thấp mà không cần chuyển sang lập trình phản ứng (Reactive) phức tạp.

### Tại sao KHÔNG CHỌN Microservices?
* **Over-engineering:** Lưu lượng của một phường/xã trung bình chỉ 5–20 phản ánh/ngày, cao điểm bão lũ khoảng 50–100 yêu cầu/giờ. Chia nhỏ thành 4–5 microservices là sự lãng phí tài nguyên vô nghĩa.
* **Ngốn RAM gấp 4 lần:** Mỗi microservice Spring Boot ngốn tối thiểu 200–300MB RAM. 4 service cộng lại sẽ ngốn hơn 1.2GB RAM chỉ riêng tầng ứng dụng, phá vỡ trần 2GB của toàn bộ máy chủ.
* **Độ trễ mạng (Network Latency) & Xử lý phân tán:** Phát sinh bài toán giao dịch phân tán (Distributed Transaction / Saga pattern), làm phức tạp hóa dự án đối với 1 sinh viên làm trong 12 tuần.

### Tại sao KHÔNG CHỌN NodeJS hay Python làm Backend chính?
* **So với Python (FastAPI/Django):** Python phù hợp cho nghiên cứu dữ liệu, nhưng khi chạy concurrency cao trên môi trường đa luồng cần cơ chế WSGI/Gunicorn tốn nhiều RAM, thiếu tính kiểm soát kiểu tĩnh (Strong Static Typing) chặt chẽ cho hệ thống dịch vụ công.
* **So với NodeJS (Express/NestJS):** Java Spring Boot là tiêu chuẩn kỹ thuật cốt lõi trong các hệ thống chính phủ và doanh nghiệp lớn tại Việt Nam (Viettel, VNPT, các Cổng Dịch vụ công Quốc gia đều dùng Java).

---

## 2. Lưu Trữ Dữ Liệu: PostgreSQL 16 + `pgvector`
### Tại sao CHỌN?
1. **Mô hình Hybrid Search "Tất-cả-trong-một":** Cho phép kết hợp bộ lọc quan hệ và tìm kiếm vector trong **cùng 1 câu lệnh SQL duy nhất**:
   ```sql
   SELECT id, content, 1.0 - (embedding <=> :queryVec) AS similarity
   FROM legal_chunks
   WHERE status = 'ACTIVE' AND effective_date <= CURRENT_DATE
   ORDER BY embedding <=> :queryVec LIMIT 3;
   ```
2. **Chỉ mục HNSW (Hierarchical Navigable Small World):** Tốc độ tìm kiếm láng giềng gần nhất (ANN) cực nhanh ($< 10\text{ms}$ trên hàng chục nghìn vector), độ chính xác Recall đạt trên 98% mà không cần nạp lại chỉ mục khi thêm dữ liệu mới.
3. **Đảm bảo ACID:** Dữ liệu điều khoản luật và vector embedding luôn đồng bộ tuyệt đối trong cùng một transaction.

### Tại sao KHÔNG CHỌN Vector Database chuyên dụng (Milvus, Pinecone, Qdrant)?
* **Pinecone:** Là dịch vụ đám mây có phí (vi phạm ràng buộc 0 VNĐ) và dữ liệu văn bản pháp luật công dân bị gửi ra máy chủ nước ngoài (vi phạm quy định dữ liệu chính quyền).
* **Milvus / Qdrant:** Cần chạy thêm 1 container độc lập, ngốn thêm tối thiểu 512MB–1GB RAM.
* **Bài toán Mất đồng bộ (Data Desynchronization):** Khi một thủ tục hành chính bị hủy bỏ hiệu lực (`status = 'SUPERSEDED'`), nếu dùng Vector DB rời, ta phải viết code đồng bộ 2 nơi. Nếu đồng bộ lỗi, hệ thống sẽ trả về điều luật đã hết hạn! Với PostgreSQL, chỉ cần đổi trạng thái 1 trường là xong.

---

## 3. Bộ Nhớ Đệm & Không Gian: Redis 7
### Tại sao CHỌN?
1. **Lệnh `GEOSEARCH` có sẵn:** Đo bán kính $R$ mét giữa tọa độ GPS của người dân với các cụm sự cố trong độ trễ dưới 1 mili-giây.
2. **Lệnh nguyên tử `GETDEL` (Atomic Get-and-Delete):** Đảm bảo cơ chế One-Time Read Token cho kho giấy tờ: ngay khi người dùng nhấn xem ảnh, token lập tức bị đọc và xóa trong 1 thao tác duy nhất ở tầng RAM, ngăn chặn triệt để hiện tượng Race Condition (hai người cùng click 1 lúc).
3. **Siêu nhẹ:** Cấu hình giới hạn `maxmemory 100mb`, chiếm chưa tới 40MB RAM thực tế.

### Tại sao KHÔNG DÙNG luôn PostGIS trong PostgreSQL?
* Cài thêm PostGIS vào PostgreSQL làm tăng dung lượng image và tiêu tốn thêm bộ nhớ đệm shared buffers.
* Tần suất công dân gửi phản ánh và cập nhật vị trí đòi hỏi tốc độ đọc/ghi cực nhanh trên RAM. Redis tách riêng bài toán không gian thời gian thực ra khỏi đĩa cứng của PostgreSQL.

---

## 4. Lưu Trữ Tệp: MinIO Object Storage
### Tại sao CHỌN?
1. **Chuẩn S3 API:** Cho phép sinh liên kết bảo mật tạm thời (**Presigned URL**) có thời hạn ngắn (60 giây), client tải trực tiếp không cần qua server làm nghẽn băng thông backend.
2. **Chính sách vòng đời tự động (ILM - Lifecycle Policy):** Cấu hình tự động xóa ảnh sau 7 ngày, đảm bảo hệ thống không bị tràn ổ cứng và tuân thủ nguyên tắc không lưu trữ dữ liệu cá nhân quá thời hạn cần thiết của Nghị định 13/2023/NĐ-CP.
3. **Tách biệt dữ liệu nhị phân:** Giữ CSDL PostgreSQL luôn sạch sẽ, dung lượng backup DB chỉ vài chục MB thay vì phình to hàng chục GB vì chứa ảnh.

### Tại sao KHÔNG LƯU thẳng ảnh vào Thư mục Ổ cứng (Local Disk)?
* Khó quản lý phân quyền, dễ bị lỗ hổng Directory Traversal (`../../etc/passwd`).
* Không có cơ chế tự hủy (ILM) theo chính sách, phải viết thêm script cron ngoài OS phức tạp.
* Không hỗ trợ Presigned URL có chữ ký mã hóa an toàn.

### Tại sao KHÔNG LƯU ảnh dạng BLOB trong CSDL PostgreSQL?
* Làm phình to dung lượng bảng CSDL, giảm hiệu năng cache `shared_buffers`, làm chậm các truy vấn quan hệ và tìm kiếm vector.

---

## 5. Xử Lý Tác Vụ Bất Đồng Bộ: Loại Bỏ Apache Kafka
### Tại sao CHỌN: Spring `@Async` + Transactional Outbox?
1. **Tiết kiệm $100\%$ tài nguyên Message Queue:** Kafka đòi hỏi tối thiểu 512MB–1GB RAM cho Broker và Zookeeper/KRaft. Loại bỏ Kafka giúp hệ thống đạt mục tiêu $\le 2.0\text{ GB}$ RAM.
2. **Đủ tải cho cấp xã:** Cấp xã chỉ có vài chục yêu cầu/ngày. Spring `@Async` với ThreadPool (core=2, max=4, queue=50) xử lý mượt mà tác vụ gọi OCR và băm vector trong nền.
3. **Bảo toàn dữ liệu bằng Transactional Outbox:** Dùng câu lệnh SQL `SELECT ... FOR UPDATE SKIP LOCKED` trên PostgreSQL để các luồng công việc lấy tác vụ tuần tự mà không bị tranh chấp, hệ thống dù có khởi động lại cũng không bị mất dữ liệu.

---

## 6. Trợ Lý Pháp Lý: Legal RAG & Ngưỡng Từ Chối $\theta = 0.78$
### Tại sao CHỌN: Băm theo Chương - Điều - Khoản thay vì Fixed-size Chunking?
* **Fixed-size Chunking (500 tokens):** Thường cắt ngang lưng chừng một câu văn pháp lý hoặc ngắt đôi một điều kiện hưởng chế độ, làm mất ngữ cảnh văn bản quy phạm.
* **Cấu trúc pháp lý 4 tầng:** Băm trọn vẹn từng Điều/Khoản và gắn kèm Metadata: `Số hiệu văn bản`, `Mã TTHC`, `Ngày hiệu lực`. Khi truy xuất, toàn bộ căn cứ luật được giữ nguyên vẹn.

### Tại sao BẮT BUỘC có Ngưỡng từ chối $\theta = 0.78$ (Abstention Guardrail)?
* Trong lĩnh vực hành chính công, **thà từ chối trả lời còn hơn trả lời sai**. Nếu công dân hỏi thủ tục cấp Hộ chiếu (thuộc thẩm quyền cấp Tỉnh/Bộ), hệ thống không được bịa đặt quy trình mà phải từ chối ngay lập tức và hướng dẫn ra đúng cơ quan có thẩm quyền.
* Thực nghiệm đã chứng minh: Ngưỡng $\theta = 0.78$ giúp giảm tỷ lệ trả lời sai trên câu hỏi bẫy từ **73.3% xuống chỉ còn 6.7%** (từ chối đúng 93.3%).

---

## 7. Hậu Kiểm Tra Tờ Khai: Java Rule Engine Tất Định Sau OCR
### Tại sao KHÔNG để LLM tự kiểm tra logic biểu mẫu?
* **LLM là mô hình xác suất (Probabilistic):** Cùng một bức ảnh CCCD, hôm nay LLM có thể đọc đúng, ngày mai có thể suy diễn nhầm số `1` thành số `7`. LLM không thể đảm bảo tính tất định (Deterministic).
* **Java Rule Engine đảm bảo 100% tính chính xác:** 
  * Kiểm tra cấu trúc 12 số CCCD theo công thức Bộ Công an: 3 số đầu là mã tỉnh, 1 số thế kỷ/giới tính, 2 số năm sinh, 6 số ngẫu nhiên.
  * Kiểm tra logic thời gian: $\text{Ngày sinh} < \text{Ngày cấp CCCD} \le \text{Hôm nay}$.
  * Tích hợp **Luật Căn cước 2023** (hiệu lực 01/07/2024: cho phép cấp thẻ dưới 14 tuổi).
  * Thời gian thực thi chỉ mất **0.001 giây**, không tốn chi phí gọi API AI.

---

## 8. Gom Cụm Phản Ánh: Thuật Toán 2 Pha (Spatial-Semantic Triage)
### Tại sao KHÔNG chỉ gom theo Vị trí (Spatial-only)?
* Nếu chỉ gom theo bán kính $R = 75\text{m}$, trong cùng một con ngõ có 2 sự cố xảy ra cùng lúc: một bên là "cháy bóng đèn đường", một bên là "nghẹt cống thoát nước". Thuật toán gom theo vị trí sẽ **gộp nhầm 2 sự cố này làm một**, làm sai lệch phân công nhiệm vụ của cán bộ (Precision tụt xuống chỉ còn **24.27%**).

### Tại sao KHÔNG chỉ gom theo Nội dung (Semantic-only)?
* Nếu chỉ gom theo ngữ nghĩa mô tả, một sự cố "ổ gà sâu nguy hiểm" ở Phường 25 và một "ổ gà sâu nguy hiểm" ở Phường 12 (cách nhau 5km) có câu từ giống hệt nhau sẽ bị **gộp chung vào một cụm**, phá vỡ tính cục bộ địa lý.

### Giải pháp kết hợp 2 Pha ($R = 75\text{m}, \tau = 0.82$):
* **Pha 1 (Lọc không gian):** Dùng Redis `GEOSEARCH` quét nhanh các sự cố trong bán kính $R = 75\text{m}$ (loại bỏ 95% dữ liệu ở xa trong 1ms).
* **Pha 2 (So khớp nghiệp vụ & ngữ nghĩa):** So khớp chính xác `Category` và đo Cosine Similarity vector mô tả $\ge 0.82$.
* **Kết quả:** Đạt điểm cân bằng tối ưu **$F_1 = 91.4\%$**, triệt tiêu cả hiện tượng gộp nhầm lẫn bỏ sót.

---

## 9. Giao Diện Người Dùng: Web Responsive / PWA thay vì Native Mobile App
### Tại sao CHỌN Web-First Responsive / PWA?
1. **Tâm lý người dân đi làm thủ tục:** Người dân rất ngại tải thêm app mới vào điện thoại. Với Web PWA, chỉ cần quét mã QR tại bàn Một cửa là mở web dùng ngay.
2. **Tận dụng đầy đủ phần cứng:** Trình duyệt di động hiện đại hỗ trợ đầy đủ HTML5 Camera API (chụp tờ khai) và Geolocation API (bắt GPS chính xác $< 10\text{m}$).
3. **An toàn tiến độ cho 1 sinh viên:** Dành thời gian tập trung vào chất lượng thuật toán Backend và Thực nghiệm khoa học thay vì phải viết 2 lần giao diện (React Native + React Web). Phân hệ Native App được quy hoạch là hướng phát triển tương lai.

---
---

# PHẦN 2: BỘ CÂU HỎI & ĐÁP ĐỐI KHÁNG BẢO VỆ ĐỒ ÁN
*(Comprehensive Adversarial Defense Q&A for Graduation Thesis)*

Bộ câu hỏi này được phân loại thành 5 nhóm chủ đề bao quát mọi tình huống Hội đồng có thể chất vấn:

---

## NHÓM 1: Ý TƯỞNG, TÍNH MỚI & ĐÓNG GÓP HỌC THUẬT

### Câu 1: Các framework như LangChain, LlamaIndex có sẵn sao em không dùng mà tự code Spring Boot? Đóng góp mới ở đâu?
> **Trả lời:**  
> Kính thưa Hội đồng, việc không dùng LangChain xuất phát từ 2 lý do kỹ thuật sống còn:  
> 1. *Ràng buộc tài nguyên:* LangChain/Python khi nạp thư viện tốn tối thiểu 600–800MB RAM, phá vỡ giới hạn $\le 2.0\text{GB}$ của máy chủ cấp xã. Tự xây dựng trên Spring Boot 3.3 và Java 21 giúp kiểm soát bộ nhớ chặt chẽ ở mức ~400MB.  
> 2. *Trách nhiệm pháp lý:* LangChain là chuỗi xác suất mờ (probabilistic chains). Dịch vụ công đòi hỏi tính chính xác tuyệt đối. Đóng góp của đề tài nằm ở **Kiến trúc dung hòa giữa Xác suất và Tất định (Hybrid Deterministic-Probabilistic Architecture)**: AI chỉ làm nhiệm vụ trích xuất ngôn ngữ, toàn bộ việc phán xét tính hợp lệ của hồ sơ được trao cho Java Rule Engine kiểm tra 100% tất định.

### Câu 2: Đề tài này là công trình nghiên cứu khoa học hay chỉ là sản phẩm tích hợp phần mềm thông thường?
> **Trả lời:**  
> Đề tài của em không dừng lại ở mức lắp ghép API (wrapper app) mà tập trung giải quyết 3 Câu hỏi Nghiên cứu định lượng (RQ1, RQ2, RQ3):  
> - Nghiên cứu thuật toán phân đoạn văn bản luật theo cấu trúc 4 tầng và chứng minh bằng thực nghiệm ngưỡng từ chối $\theta = 0.78$ triệt tiêu ảo giác (RQ1).  
> - Xây dựng mô hình toán học gom cụm 2 pha và chạy quy trình Quét lưới 2 giai đoạn (Coarse-to-Fine Grid Search) tìm nghiệm cực trị Pareto $(R=75\text{m}, \tau=0.82)$ đạt $F_1 = 91.4\%$ (RQ2).  
> - Đo lường định lượng vai trò của Rule Engine tất định trong việc chặn lỗi tờ khai sau bước nhận diện quang học (RQ3).

---

## NHÓM 2: KIẾN TRÚC & TỐI ƯU HÓA TÀI NGUYÊN (ZERO-COST)

### Câu 3: Em nói hệ thống chạy dưới 2.0GB RAM, nếu có 10 người cùng chụp ảnh CCCD 12MP gửi lên thì Spring Boot có bị văng (OOMKilled) không?
> **Trả lời:**  
> Thưa Thầy/Cô, đây là rủi ro rất thực tế vì 1 ảnh 12MP khi bung ra RAM đồ họa (uncompressed raster) ngốn tới **$45.8\text{MB}$**. Nếu 10 luồng cùng chạy sẽ ngốn gần 500MB và làm sập JVM ngay.  
> Để bảo vệ hệ thống, em áp dụng 3 rào chắn kỹ thuật:  
> 1. *Giới hạn luồng đồ họa:* Sử dụng `Semaphore(2)` độc lập cho tác vụ Watermark, chỉ cho phép tối đa 2 ảnh được xử lý song song, các ảnh khác xếp hàng đợi.  
> 2. *Thu nhỏ ảnh trước khi xử lý (Pre-downscaling):* Cưỡng chế thu nhỏ ảnh về chiều rộng tối đa 1920px (Full HD) trước khi nạp vào Java2D, giảm kích thước bitmap từ $45.8\text{MB}$ xuống còn $\approx 8.8\text{MB}$ (giảm hơn 80% áp lực RAM).  
> 3. *Cấu hình JVM tối ưu:* Thiết lập `-Xms192m -Xmx256m -XX:MaxMetaspaceSize=80m -Xss256k`, đảm bảo tổng RSS của Spring Boot không bao giờ vượt quá $410\text{MB}$, nằm an toàn trong container 512MB.

### Câu 4: Tại sao một hệ thống tiếp nhận phản ánh lại dám bỏ Kafka? Nếu server mất điện giữa chừng thì có mất phản ánh của người dân không?
> **Trả lời:**  
> Em bỏ Kafka vì lưu lượng cấp xã chỉ vài chục tin/ngày, duy trì cụm Kafka ngốn 1GB RAM là lãng phí.  
> Để không mất dữ liệu, em áp dụng mô hình **Transactional Outbox**: Khi người dân gửi phản ánh, dữ liệu được ghi vào CSDL PostgreSQL với trạng thái `SUBMITTED` trong cùng 1 transaction. Luồng xử lý ngầm sử dụng câu lệnh `SELECT ... FOR UPDATE SKIP LOCKED` để lấy từng bản ghi ra xử lý. Dù server có khởi động lại đột ngột, các phản ánh chưa xử lý vẫn nằm nguyên trong CSDL và sẽ tự động được chạy lại khi hệ thống online.

---

## NHÓM 3: TRÍ TUỆ NHÂN TẠO, RAG & CHỐNG ẢO GIÁC PHÁP LÝ

### Câu 5: Nếu người dân hỏi một thủ tục không thuộc thẩm quyền cấp xã (như cấp Hộ chiếu), hệ thống xử lý thế nào?
> **Trả lời:**  
> Hệ thống sẽ kích hoạt **Abstention Guardrail**: Khi câu hỏi được chuyển thành vector và so sánh với 40 TTHC cấp xã trong CSDL, điểm tương đồng cao nhất $S_{max}$ sẽ chỉ đạt khoảng $0.60 - 0.70$ (thấp hơn ngưỡng $\theta = 0.78$). Hệ thống lập tức từ chối trả lời tự do và xuất câu thông báo an toàn:  
> *"Hệ thống không tìm thấy quy định cấp xã cho thủ tục này. Đây có thể là thủ tục thuộc thẩm quyền cấp Tỉnh/Bộ. Xin vui lòng liên hệ trực tiếp Bộ phận Một cửa."*  
> Cơ chế này bảo vệ người dân không bị nhận thông tin sai lệch.

### Câu 6: Dữ liệu văn bản pháp lý thay đổi liên tục, làm sao hệ thống biết một điều luật đã hết hiệu lực?
> **Trả lời:**  
> Mỗi đoạn văn bản pháp lý trong bảng `legal_chunks` đều gắn chặt với 2 trường metadata: `status` ('ACTIVE' hoặc 'SUPERSEDED') và `effective_date`.  
> Mọi câu truy vấn RAG đều bắt buộc có điều kiện lọc:  
> `WHERE status = 'ACTIVE' AND effective_date <= CURRENT_DATE`  
> Khi có luật mới ban hành, cán bộ chỉ cần cập nhật trạng thái bản ghi cũ thành `SUPERSEDED`, toàn bộ hệ sinh thái RAG sẽ tự động bỏ qua điều luật cũ ngay lập tức mà không cần xóa dữ liệu lịch sử.

---

## NHÓM 4: TOÁN HỌC, ĐO ĐẠC & KẾT QUẢ THỰC NGHIỆM

### Câu 7: Tại sao em không dùng Accuracy để đánh giá mà lại dùng Precision, Recall và F1-Score?
> **Trả lời:**  
> Trong bài toán gom cụm 150 phản ánh, tổng số cặp phản ánh là $\binom{150}{2} = 11,175$ cặp. Trong đó số cặp cùng sự cố chỉ chiếm **2.68% (300 cặp)**, còn số cặp khác sự cố chiếm tới **97.32%**.  
> Đây là cạm bẫy mất cân bằng nhãn (Class Imbalance). Nếu dùng Accuracy, một mô hình tầm thường "phán tất cả là khác nhau" vẫn đạt Accuracy 97.32% nhưng thực chất vô dụng. Vì vậy bắt buộc phải dùng:  
> - **Precision:** Đo việc không gộp nhầm sự cố khác loại.  
> - **Recall:** Đo việc không bỏ sót phản ánh do GPS trôi dạt.  
> - **F1-Score (Trung bình điều hòa):** Thước đo công tâm nhất ép cả 2 chỉ số đều phải cao, giúp em tìm ra điểm tối ưu $(R=75\text{m}, \tau=0.82)$ đạt $F_1 = 91.4\%$.

### Câu 8: Con số $F_1 = 91.4\%$ và Recall@3 = $93.8\%$ có phải do em tự điền vào cho đẹp không? Có script chứng minh không?
> **Trả lời:**  
> Dạ hoàn toàn không! Toàn bộ số liệu trên đều được sinh ra từ các script thực nghiệm chạy thực tế trong thư mục `evaluation/scripts/`:  
> - File `grid_search.py` chạy quét trên 150 phản ánh với 25 ca biên khó, xuất dữ liệu thật ra `evaluation/results/grid_search.csv` và vẽ biểu đồ `pr_curve_triage.png`.  
> - File `evaluate_rag.py` chạy trên 80 câu hỏi kiểm thử đối chiếu 40 TTHC, xuất kết quả ra `evaluation/results/rag_metrics.json` và vẽ biểu đồ `abstention_tradeoff.png`.  
> Thầy/Cô có thể trực tiếp mở terminal chạy lệnh `python evaluation/scripts/grid_search.py` để tái lập 100% kết quả ngay tại phòng bảo vệ.

---

## NHÓM 5: AN TOÀN DỮ LIỆU, PHÁP LÝ & BẢO VỆ CÔNG DÂN

### Câu 9: Hệ thống bảo vệ dữ liệu cá nhân của người dân theo Nghị định 13/2023/NĐ-CP như thế nào?
> **Trả lời:**  
> Hệ thống tuân thủ Nghị định 13 qua mô hình bảo vệ 4 lớp:  
> 1. *Đóng dấu mờ động (Dynamic Watermark):* Mọi ảnh CCCD/tờ khai khi tải lên đều được tự động chèn dòng chữ chìm: *"CHỈ DÙNG ĐỂ SƠ DUYỆT HỒ SƠ TẠI UBND - [TIMESTAMP]"*, chống việc tuồn ảnh ra ngoài làm giả hồ sơ vay tín dụng.  
> 2. *Mã hóa tĩnh (Encryption at Rest):* Tệp được mã hóa bằng thuật toán AES-256-GCM trước khi ghi vào kho MinIO.  
> 3. *Quyền xem 1 lần (One-Time Viewing Lease):* Sử dụng lệnh nguyên tử `GETDEL` trên Redis cấp token xem 60 giây, sau đó tự hủy, lần truy cập thứ hai trả về HTTP 410 Gone.  
> 4. *Tự hủy theo vòng đời (Data Retention):* Cấu hình MinIO ILM tự động xóa vĩnh viễn tệp sau 7 ngày.

### Câu 10: Nếu mô hình OCR đọc sai số CCCD (nhận nhầm số 1 thành số 7) thì người dân có bị từ chối hồ sơ oan không?
> **Trả lời:**  
> Dạ hoàn toàn không! Hệ thống tuân thủ nguyên tắc **Con người là trung tâm (Human-in-the-loop)**:  
> - Sau khi OCR đọc ảnh, hệ thống hiển thị kết quả lên màn hình kèm ảnh gốc phóng to đúng vị trí số CCCD và yêu cầu công dân: *"Hệ thống nhận diện số CCCD của bác là 080... Xin vui lòng kiểm tra lại và chỉnh sửa nếu có sai sót trước khi bấm gửi"*.  
> - Nếu ảnh bị mờ hoặc độ tin cậy $\rho < 0.70$, hệ thống không phán xét mà gắn nhãn `MANUAL_REVIEW_REQUIRED` để cán bộ Một cửa hỗ trợ trực tiếp.  
> AI chỉ đóng vai trò trợ lý nhập liệu nhanh, quyền quyết định cuối cùng luôn thuộc về công dân và cán bộ tiếp nhận.

---

*Tài liệu thuộc hồ sơ Đồ án Tốt nghiệp & Học kỳ Doanh nghiệp SmartWard AI.*  
*Tác giả: Nguyễn Minh Tuấn Khanh — UTH & Viettel An Giang.*
