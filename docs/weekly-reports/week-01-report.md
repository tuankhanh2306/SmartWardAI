# BÁO CÁO TIẾN ĐỘ THỰC TẬP & ĐỒ ÁN TỐT NGHIỆP - TUẦN 01
**HỌC KỲ DOANH NGHIỆP / ĐỒ ÁN TỐT NGHIỆP KỸ SƯ CNTT**  
**TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP.HCM (UTH)**

---

### THÔNG TIN CHUNG
* **Sinh viên thực hiện:** Nguyễn Minh Tuấn Khánh
* **Mã số sinh viên (MSSV):** *(Điền MSSV của bạn vào đây)*
* **Lớp / Khóa:** *(Ví dụ: CN20... / K20)*  
* **Ngành:** Công nghệ Thông tin
* **Tên đề tài:** **SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã**
* **Giảng viên hướng dẫn (GVHD):** *(Điền tên Thầy/Cô hướng dẫn tại UTH)*
* **Người hướng dẫn doanh nghiệp (Mentor):** *(Điền tên Mentor tại doanh nghiệp thực tập)*
* **Thời gian thực hiện Tuần 1:** Từ ngày .../.../202... đến ngày .../.../202...
* **Kho lưu trữ mã nguồn (Git Repository):** [https://github.com/tuankhanh2306/SmartWardAI](https://github.com/tuankhanh2306/SmartWardAI)

---

## 1. MỤC TIÊU CÔNG VIỆC TRONG TUẦN 1
1. Khảo sát nghiệp vụ tiếp nhận hồ sơ Một cửa và tiếp nhận phản ánh dân sinh tại UBND cấp phường/xã; xác định 2 bài toán nhức nhối trong xử lý thông tin.
2. Xây dựng 3 câu hỏi nghiên cứu cốt lõi (RQ1, RQ2, RQ3) có khả năng kiểm chứng bằng thực nghiệm khoa học.
3. Thiết lập toàn bộ tài liệu kiến trúc kỹ thuật, ràng buộc tài nguyên 0 VNĐ (Zero-Cost Architecture) và quy tắc kiểm soát mã nguồn.
4. Xây dựng môi trường hạ tầng Docker Compose cục bộ khống chế nghiêm ngặt tổng lượng RAM dưới 2.0 GB.
5. Soạn thảo đề cương chi tiết và nội dung Chương 1 của cuốn Báo cáo tốt nghiệp / Báo cáo thực tập.

---

## 2. CHI TIẾT CÁC CÔNG VIỆC ĐÃ THỰC HIỆN TRONG TUẦN

| STT | Hạng mục công việc | Mô tả chi tiết | Kết quả đạt được | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Khảo sát nghiệp vụ & Xác định bài toán** | Làm việc với Mentor và khảo sát thực tế tại Bộ phận Một cửa: người dân sai sót tờ khai hành chính nhiều lần; phản ánh hiện trường bị trùng lặp, rời rạc. | Xác định rõ 2 bài toán thực tiễn và phạm vi giải quyết của hệ thống SmartWard AI. | **Hoàn thành** (100%) |
| **2** | **Xây dựng Câu hỏi Nghiên cứu (RQ)** | Phát biểu 3 câu hỏi nghiên cứu chuẩn học thuật: (1) RAG Điều-Khoản & Ngưỡng từ chối $\theta$, (2) Gom cụm 2 pha Spatial-Semantic $(R, \tau)$, (3) Java Rule Engine hậu kiểm tờ khai. | Hoàn thiện tài liệu `docs/business-and-research-plan.md`. | **Hoàn thành** (100%) |
| **3** | **Đặc tả Kiến trúc & Cơ sở dữ liệu** | Lựa chọn kiến trúc Modular Monolith Spring Boot 3.3 thay vì Microservices (tránh over-engineering); thiết kế ERD 6 bảng PostgreSQL kết hợp pgvector; vẽ 3 sơ đồ tuần tự Mermaid. | Hoàn thiện tài liệu `docs/architecture-and-flows.md`. | **Hoàn thành** (100%) |
| **4** | **Xác lập Ràng buộc Zero-Cost & Bảo mật** | Cấu hình giới hạn phần cứng: RAM $\le 2\text{GB}$, Postgres pgvector 512MB, Redis 128MB, MinIO 5GB (xóa sau 7 ngày). Tuân thủ an toàn thông tin theo Nghị định 13/2023/NĐ-CP (Watermark động, AES-256, One-Time Read token). | Hoàn thiện tài liệu `docs/project-constraints.md` và `AGENT_RULES.md`. | **Hoàn thành** (100%) |
| **5** | **Thiết kế Lộ trình 12 tuần & Sprint Board** | Lên kế hoạch chi tiết từ Tuần 1 đến Tuần 12 đồng bộ giữa code và viết các chương báo cáo nộp Khoa CNTT - UTH. | Hoàn thiện `docs/ROADMAP.md` và `TODO.md`. | **Hoàn thành** (100%) |
| **6** | **Thiết lập Git & Đồng bộ hóa** | Khởi tạo Git repo, cấu hình `.gitignore`, chuẩn hóa package `vn.edu.uth.smartward`, đẩy toàn bộ tài liệu lên GitHub. | Repo hoạt động tại `github.com/tuankhanh2306/SmartWardAI`. | **Hoàn thành** (100%) |

---

## 3. SẢN PHẨM / MINH CHỨNG BÀN GIAO (DELIVERABLES & EVIDENCES)

1. **Kho lưu trữ GitHub chính thức:**
   * Link: [https://github.com/tuankhanh2306/SmartWardAI](https://github.com/tuankhanh2306/SmartWardAI)
   * Lịch sử Commit rõ ràng, có phân chia thư mục `docs/` chuyên nghiệp.
2. **Bộ 6 tài liệu kỹ thuật và học thuật đã hoàn thành:**
   * `README.md`: Bản tóm lược điều hành (Executive Summary) cho đề tài.
   * `docs/business-and-research-plan.md`: Đặt vấn đề, bối cảnh thực tiễn và 3 câu hỏi nghiên cứu.
   * `docs/architecture-and-flows.md`: Kiến trúc Modular Monolith, 3 sơ đồ Mermaid tuần tự và ERD CSDL.
   * `docs/experimental-design-and-defense.md`: Thiết kế thực nghiệm quét lưới (Grid Search), phân tích lỗi và 10 slide bảo vệ.
   * `docs/project-constraints.md`: Đặc tả chi tiết các ràng buộc kỹ thuật, phần cứng và pháp lý.
   * `docs/ROADMAP.md` & `TODO.md`: Lộ trình 12 tuần và bảng checklist công việc chi tiết.
3. **Bản thảo Báo cáo thực tập / Đồ án tốt nghiệp:**
   * Đã hoàn thành dự thảo **Chương 1 (Tổng quan đề tài & Bối cảnh thực tiễn)**.

---

## 4. KHÓ KHĂN GẶP PHẢI & GIẢI PHÁP ĐÃ THỰC HIỆN

* **Khó khăn 1 (Ràng buộc phần cứng):**  
  * *Vấn đề:* Ban đầu định hướng sử dụng kiến trúc Microservices và Apache Kafka cho hàng đợi tác vụ, tuy nhiên khi cấu hình thử nghiệm thấy tiêu tốn tối thiểu 3–4 GB RAM, vượt quá khả năng máy trạm cá nhân và không cần thiết cho quy mô phường/xã.  
  * *Giải pháp:* Tinh gọn kiến trúc về **Modular Monolith** bằng Spring Boot 3.3, sử dụng `@Async ThreadPoolTaskExecutor` nội tại kết hợp Redis để xử lý bất đồng bộ, khống chế tổng RAM cụm Docker dưới 2.0 GB.
* **Khó khăn 2 (Rủi ro ảo giác pháp lý của AI):**  
  * *Vấn đề:* Các mô hình ngôn ngữ lớn (LLM) dễ bịa đặt căn cứ pháp luật khi người dân hỏi về những thủ tục không có trong thẩm quyền cấp xã.  
  * *Giải pháp:* Đưa ra cơ chế chốt chặn **Abstention Guardrail** với ngưỡng từ chối $\theta = 0.78$. Nếu điểm tương đồng vector thấp hơn ngưỡng, hệ thống bắt buộc từ chối sinh chữ tự do và hướng dẫn người dân gặp trực tiếp cán bộ Một cửa.

---

## 5. KẾ HOẠCH CÔNG VIỆC TUẦN TIẾP THEO (TUẦN 2)

Theo đúng lộ trình trong `docs/ROADMAP.md`, kế hoạch Tuần 2 tập trung vào dữ liệu và cơ sở dữ liệu:
1. Thu thập và làm sạch văn bản quy phạm pháp luật của 40 thủ tục hành chính cấp xã (Hộ tịch, Cư trú, Chứng thực, Bảo trợ).
2. Viết script khởi tạo cơ sở dữ liệu Flyway `V1__init_schema.sql` (tạo 6 bảng, cấu hình extension `pgvector` và chỉ mục HNSW).
3. Xây dựng dịch vụ tiền xử lý `LegalChunkingService` để băm nhỏ văn bản theo đúng cấu trúc Điều - Khoản - Điểm kèm metadata ngày hiệu lực.
4. Dự thảo nội dung **Chương 2 (Kiến trúc hệ thống và Thiết kế Cơ sở Dữ liệu)** của cuốn báo cáo.

---

## 6. Ý KIẾN ĐÁNH GIÁ & XÁC NHẬN CỦA NGƯỜI HƯỚNG DẪN

### Ý kiến của Giảng viên hướng dẫn (UTH):
* **Nhận xét về tiến độ:** ............................................................................................................
* **Nhận xét về chất lượng nội dung:** ........................................................................................
* **Đánh giá tuần 1:** $\square$ Đạt yêu cầu $\quad \square$ Cần bổ sung  

*Ngày ..... tháng ..... năm 202...*  
**Giảng viên hướng dẫn**  
*(Ký và ghi rõ họ tên)*  

<br/><br/>

### Ý kiến của Người hướng dẫn Doanh nghiệp (Mentor):
* **Nhận xét thái độ & kết quả:** ...............................................................................................
* **Mức độ hoàn thành công việc:** ...........................................................................................  

*Ngày ..... tháng ..... năm 202...*  
**Người hướng dẫn tại Doanh nghiệp**  
*(Ký và ghi rõ họ tên)*
