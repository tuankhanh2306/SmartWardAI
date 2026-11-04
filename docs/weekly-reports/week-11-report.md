# BÁO CÁO TIẾN ĐỘ THỰC HIỆN DỰ ÁN – TUẦN 11
**Đề tài:** SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã  
**Sinh viên thực hiện:** Trịnh Tuấn Khánh  
**Đơn vị:** Viện Đào tạo Chất lượng cao – Trường Đại học Giao thông vận tải TP.HCM (UTH)  
**Giảng viên hướng dẫn:** TS. Lê Văn Quốc Anh  
**Cán bộ hướng dẫn Doanh nghiệp (Mentor):** Kỹ sư Trưởng Giải pháp Số – Viettel An Giang  
**Thời gian thực hiện:** Tuần 11 (Đóng gói Hệ thống Docker, Tối ưu Hóa Ngân sách Tài nguyên & Hoàn thiện Báo cáo Toàn văn UTH)

---

## 1. MỤC TIÊU TUẦN 11
- Thiết kế tệp cấu hình Docker đa tầng (Multi-stage Dockerfile) cho cả hai phân hệ: Spring Boot Backend (Java 21 JRE Temurin) và React Frontend PWA (Nginx Alpine).
- Cập nhật tệp điều phối tổng thể `docker-compose.yml` tích hợp trọn gói 5 dịch vụ (PostgreSQL pgvector, Redis, MinIO, Spring Boot Backend, Nginx Frontend) với hạn ngạch trần cứng $\sum \text{RAM} = 1,728\text{ MB} < 2,048\text{ MB} = 2.0\text{ GB}$.
- Kiểm tra toàn diện năng lực vận hành ngoại tuyến (Offline Resilience) thông qua lớp AI giả lập tất định `DeterministicMockAiClient`, sẵn sàng cho buổi bảo vệ đồ án tốt nghiệp tại hội đồng UTH mà không phụ thuộc vào đường truyền mạng Internet.
- Rà soát mã nguồn, chuẩn hóa Clean Code, bổ sung chú thích tài liệu kỹ thuật JavaDoc / OpenAPI và cập nhật hướng dẫn cài đặt khởi chạy trong `README.md`.
- Soạn thảo hoàn thiện Chương 2 (Cơ sở lý thuyết & Công nghệ nền tảng) và Chương 5 (Kết luận & Hướng phát triển).
- Hợp nhất toàn bộ các chương mục (Trang bìa, Lời cam đoan, Lời cảm ơn, Tóm tắt tiếng Việt/Anh, Danh mục từ viết tắt, Danh mục bảng biểu/hình vẽ, Chương 1 đến Chương 5, Tài liệu tham khảo) thành bản thảo Báo cáo Khóa luận Tốt nghiệp & Học kỳ Doanh nghiệp UTH hoàn chỉnh tại `docs/thesis-chapters/FULL_THESIS_REPORT_UTH.md`.
- Viết Báo cáo Tiến độ Tuần 11 nộp Giảng viên hướng dẫn và Mentor Doanh nghiệp.

---

## 2. KẾT QUẢ ĐẠT ĐƯỢC TRONG TUẦN 11

### 2.1. Đóng gói Container & Kiểm soát Ngân sách Tài nguyên Zero-Cost
1. **Dockerfile Phân hệ Backend (`backend/Dockerfile`):**
   - Áp dụng kỹ thuật Multi-stage build: Giai đoạn 1 biên dịch mã nguồn với `eclipse-temurin:21-jdk-alpine`, giai đoạn 2 chạy ứng dụng với hình ảnh thu nhỏ `eclipse-temurin:21-jre-alpine`.
   - Cấu hình cờ JVM tối ưu bộ nhớ heap: `-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -Xmx512m -Xms128m`.
   - Chạy dưới tài khoản không đặc quyền `smartward:smartward` tăng cường an ninh.
   - Endpoint kiểm tra sức khỏe tự động: `wget http://localhost:8080/api/v1/health`.
2. **Dockerfile & Nginx Phân hệ Frontend (`frontend/Dockerfile` & `frontend/nginx.conf`):**
   - Biên dịch gói tĩnh Vite bằng `node:20-alpine`, sau đó chuyển sang `nginx:1.27-alpine` để phục vụ tệp tĩnh và làm Reverse Proxy định tuyến `/api/` về `backend:8080`.
   - Kích hoạt nén Gzip mức độ 6 (giảm kích thước tải xuống còn ~149 KB) và cấu hình SPA fallback `try_files $uri $uri/ /index.html;`.
3. **Phân bổ Ngân sách Tài nguyên Toàn hệ thống (`docker-compose.yml`):**
   - **PostgreSQL 16 pgvector:** Giới hạn 512 MB RAM (Thực tế: ~110 MB).
   - **Redis 7 Alpine:** Giới hạn 128 MB RAM (Thực tế: ~18 MB).
   - **MinIO S3 Object Storage:** Giới hạn 256 MB RAM (Thực tế: ~65 MB).
   - **Spring Boot Backend:** Giới hạn 768 MB RAM (Thực tế: ~380 MB).
   - **Nginx Frontend:** Giới hạn 64 MB RAM (Thực tế: ~12 MB).
   - **Tổng hạn ngạch trần:** **1,728 MB**, thực tế tiêu thụ khi vận hành đầy tải chỉ **~585 MB** (hoàn toàn đáp ứng điều kiện $\le 2.0\text{ GB}$).

### 2.2. Kiểm thử Khả năng Kháng Đứt gãy Mạng Ngoại tuyến (Offline Resilience)
- Kiểm chứng thực tế profile `dev` của ứng dụng Spring Boot:
  - Khi không có Internet hoặc không khai báo biến `GEMINI_API_KEY`, hệ thống tự động kích hoạt `DeterministicMockAiClient`.
  - Sinh vector nhúng 768 chiều tất định thông qua mã băm SHA-256 của câu hỏi.
  - Phản hồi nhận diện tờ khai mẫu chính xác, phục vụ demo mượt mà các ca kiểm thử: Hỏi đáp TTHC, cảnh báo Guardrail, phát hiện lỗi CCCD 12 số, và phân luồng sự cố hiện trường 2 pha ($R=75\text{m}, \tau=0.82$).
- Toàn bộ **57/57 backend tests** tự động chạy cục bộ đạt kết quả **BUILD SUCCESS** mà không yêu cầu kết nối mạng bên ngoài.

### 2.3. Hoàn thiện Bộ Tài liệu Khóa luận Tốt nghiệp UTH
- **Soạn thảo Chương 2:** `docs/thesis-chapters/chapter-02.md` trình bày toàn diện cơ sở lý thuyết về RAG, Vector Embeddings, chỉ mục HNSW, thuật toán phân mảnh Điều-Khoản, chốt chặn $\theta = 0.78$, thuật toán Triage 2 pha, công thức Haversine, và kiến trúc bảo mật Zero-Trust theo Nghị định 13/2023/NĐ-CP.
- **Soạn thảo Chương 5:** `docs/thesis-chapters/chapter-05.md` tổng kết đóng góp của đề tài trong việc giải quyết 3 câu hỏi nghiên cứu (RQ1, RQ2, RQ3), đánh giá giá trị thực tiễn cho Phường 25 (Bình Thạnh), phân tích hạn chế và vạch ra 4 định hướng phát triển tương lai (Native Mobile App với On-device MLKit, tích hợp định danh VNeID, hỗ trợ tiếng dân tộc thiểu số Khmer/Chăm, và Human-in-the-loop Active Learning).
- **Hợp nhất Bản thảo Khóa luận Hoàn chỉnh:** `docs/thesis-chapters/FULL_THESIS_REPORT_UTH.md` được định dạng chuẩn mực theo quy cách của Trường ĐH Giao thông vận tải TP.HCM (UTH), bao gồm đầy đủ trang bìa, lời cam đoan, lời cảm ơn, tóm tắt song ngữ, danh mục từ viết tắt, danh mục 14 bảng biểu, danh mục 15 hình vẽ, toàn văn 5 chương và 12 tài liệu tham khảo chuẩn học thuật APA/IEEE.

---

## 3. ĐÁNH GIÁ MỨC ĐỘ HOÀN THÀNH
- Đã hoàn thành **100% các mục tiêu của Tuần 11** (Tasks 11.1 đến 11.7) đúng tiến độ quy định.
- Hệ thống đã sẵn sàng 100% về mặt kỹ thuật, mã nguồn, hạ tầng container và tài liệu báo cáo để chuyển sang Tuần 12 (Soạn slide thuyết trình 10 trang, kịch bản demo 3 phút và bảo vệ trước Hội đồng chấm tốt nghiệp).

---

## 4. KẾ HOẠCH TUẦN 12 (TUẦN CUỐI CÙNG)
- **Task 12.1:** Thiết kế bộ 10 Slide thuyết trình chuẩn học thuật theo khung bảo vệ tại UTH.
- **Task 12.2:** Xây dựng kịch bản Demo trực tiếp 3 phút (3 ca: RAG từ chối câu hỏi bẫy, Rule Engine phát hiện lỗi tờ khai CT01, Triage tự gom 2 phản ánh trùng).
- **Task 12.3:** Chuẩn bị phương án video demo dự phòng (Backup Video Demo) phòng sự cố mất điện/mất mạng tại phòng hội đồng.
- **Task 12.4:** Luyện tập trả lời thành thạo 6 câu hỏi phản biện then chốt của Hội đồng chấm tốt nghiệp UTH.
- **Task 12.5:** Đóng bìa cứng mạ vàng cuốn Báo cáo tốt nghiệp có chữ ký GVHD và dấu mộc xác nhận của Doanh nghiệp.
- **Task 12.6:** Thuyết trình và bảo vệ đề tài trước Hội đồng Đồ án Tốt nghiệp Khoa CNTT - UTH.
- **Task 12.7:** Viết Báo cáo tổng kết toàn khóa thực tập và đồ án tốt nghiệp.
