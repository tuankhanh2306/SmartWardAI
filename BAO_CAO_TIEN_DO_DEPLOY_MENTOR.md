# BÁO CÁO TIẾN ĐỘ THỰC TẬP DOANH NGHIỆP: TRIỂN KHAI VẬN HÀNH HỆ THỐNG SMARTWARD AI TRÊN MÔI TRƯỜNG CLOUD PRODUCTION

> **Kính gửi:** Giảng viên hướng dẫn / Cán bộ hướng dẫn Doanh nghiệp (Mentor)  
> **Sinh viên thực hiện:** Nguyễn Minh Tuấn Khánh  
> **Đơn vị đào tạo:** Trường Đại học Giao thông vận tải TP.HCM (UTH)  
> **Tên dự án:** SmartWard AI — Hệ thống Trợ lý Hành chính công & Đô thị Thông minh Cấp Xã/Phường  
> **Giai đoạn báo cáo:** Hoàn thiện Triển khai Web Application & Backend Microservices lên Nền tảng Cloud (Railway Production)  
> **Thời điểm cập nhật:** 13/11/2026  

---

## 1. TỔNG QUAN KẾT QUẢ TRIỂN KHAI HỆ THỐNG CLOUD (LIVE DEMO)

Hệ thống **SmartWard AI** đã hoàn tất việc đóng gói container, kiểm thử tự động đạt chuẩn 100% PASS và triển khai thành công lên hạ tầng đám mây **Railway Cloud (US-East / Global Edge)**. Cả 4 dịch vụ cốt lõi đều đang vận hành ở trạng thái **HEALTHY / UP** với thời gian hoạt động liên tục (uptime 99.9%).

### 1.1. Đường dẫn Trực tiếp (Live Production Endpoints)

| Phân hệ / Dịch vụ | Địa chỉ Truy cập Trực tuyến (Live URL) | Trạng thái Live | Ghi chú Vận hành |
| :--- | :--- | :---: | :--- |
| **Giao diện Người dân & Cán bộ (Web Frontend)** | **`https://smartward-frontend-production.up.railway.app`** | ![Live](https://img.shields.io/badge/Status-ONLINE-22c55e?style=flat-square) `HTTP 200` | Single Page Application (React 18 + Vite + TailwindCSS), Nginx Alpine Reverse Proxy bảo vệ cổng API nội bộ. |
| **Máy chủ Dịch vụ Nghiệp vụ (Web Backend)** | **`https://smartward-backend-production.up.railway.app`** | ![Live](https://img.shields.io/badge/Status-UP-22c55e?style=flat-square) `HTTP 200` | Spring Boot 3.3.5 (Java 21 LTS), quản lý 31 REST APIs, tích hợp HikariCP, Flyway Migration `V1`–`V4`. |
| **Kiểm tra Sức khỏe Hệ thống (Healthcheck API)** | **`https://smartward-backend-production.up.railway.app/api/v1/health`** | `UP` (RAM: 161MB / 72MB Free) | Trả về JSON metadata định danh tác giả, đơn vị UTH và trạng thái JVM. |
| **Cơ sở Dữ liệu Quan hệ & Vector (PostgreSQL)** | `smartward-postgres.railway.internal:5432` | `SUCCESS` | PostgreSQL 16 tích hợp extension `pgvector` phục vụ tìm kiếm ngữ nghĩa HNSW 768 chiều. |
| **Bộ nhớ Đệm & Không gian Địa lý (Redis Cache)** | `smartward-redis.railway.internal:6379` | `SUCCESS` | Redis 7 Alpine quản lý Semantic Cache, GEO Index bán kính $R = 25\text{m}$ và One-Time Token. |

---

## 2. TÀI KHOẢN & DỮ LIỆU THỰC NGHIỆM DÀNH CHO MENTOR KIỂM THỬ

Mentor và Hội đồng đánh giá có thể trực tiếp trải nghiệm toàn bộ các luồng nghiệp vụ trên hệ thống live bằng bộ tài khoản và kịch bản thực nghiệm sau:

### 2.1. Phân hệ Cán bộ Một cửa (Officer Dashboard)
- **Đường dẫn truy cập:** Truy cập mục **"Dành cho Cán bộ"** trên thanh điều hướng hoặc mở trực tiếp trên giao diện web.
- **Mã hiệu Thẻ Cán bộ (`badgeId`):** `CC-AG-8942`
- **Mã PIN bảo mật (`pin`):** `8942`
- **Đơn vị hành chính (`wardCode`):** `WARD-AG-01` (UBND Phường Mỹ Bình, Tỉnh An Giang)
- **Thông tin Cán bộ tiếp nhận:** Ông **Trần Quốc Bảo** — Chức vụ: *Cán bộ Tư pháp - Hộ tịch*.
- **Chức năng kiểm thử:**
  - Tiếp nhận danh sách hồ sơ nộp trực tuyến từ công dân.
  - Phê duyệt / Yêu cầu bổ sung hồ sơ kèm ghi chú nghiệp vụ.
  - Cấp phát Phiếu hẹn điện tử tích hợp mã QR định danh phục vụ tiếp nhận trực tiếp tại trụ sở.

### 2.2. Phân hệ Công dân Nộp & Tra cứu Hồ sơ (Citizen Portal)
- **Mã định danh công dân (Số CCCD thử nghiệm):** `079095012345` hoặc số CCCD 12 số của người dùng.
- **Mã hồ sơ mẫu phục vụ tra cứu tiến độ:** `HS-TEST-01` (Hệ thống trả về mã lỗi chuẩn `SW_404` khi chưa nộp hoặc trả về chi tiết tiến độ khi hồ sơ đã ghi nhận vào DB).
- **Trợ lý Pháp lý RAG AI:** Hỏi đáp trực tiếp bằng ngôn ngữ tự nhiên về 40 Thủ tục hành chính chuẩn hóa (VD: *"Thủ tục đăng ký khai sinh cần giấy tờ gì?"*, *"Mức trợ cấp mai táng phí hiện nay là bao nhiêu?"*).
- **Tiền kiểm biểu mẫu thông minh (Deterministic Form Pre-check):** Thử nghiệm sơ duyệt tờ khai Mẫu CT01 (Cư trú) và Mẫu Hộ tịch, hệ thống tự động phát hiện lỗi thiếu trường thông tin bắt buộc trước khi nộp vào CSDL.

---

## 3. CÁC HẠNG MỤC KỸ THUẬT ĐÃ HOÀN TẤT THEO LỘ TRÌNH (MILESTONES COMPLETED)

Bám sát tài liệu đặc tả và lộ trình kỹ thuật `SMARTWARD_SPEC_AND_DEPLOYMENT_ROADMAP.md`, các hạng mục thuộc **Giai đoạn 0, Giai đoạn 1 và Giai đoạn 2** đã được nghiệm thu thực tế:

```
[Hoàn tất 100%] Giai đoạn 0: Vá nợ kỹ thuật & Hợp nhất Danh mục TTHC
   ├── Đồng bộ 40/40 file TTHC chuẩn hóa (JSON Seed) vào PostgreSQL qua Flyway & Seeder.
   ├── Khắc phục hoàn toàn xung đột Transaction Isolation trong ProcedureDataSeeder.
   └── Đóng kín các lỗ hổng bảo mật đường dẫn và xử lý CORS nghiêm ngặt.

[Hoàn tất 100%] Giai đoạn 1: Mở rộng Tiền kiểm (Pre-check) Tự động
   ├── Triển khai bộ quy tắc xác thực biểu mẫu CT01, Giấy khai sinh, Khai tử, Đất đai.
   ├── Tích hợp RAG Search đa tầng (pgvector HNSW Cosine Similarity kết hợp Redis Cache).
   └── Toàn bộ 261/261 bài kiểm thử JUnit Backend đạt 100% PASS.

[Hoàn tất 100%] Giai đoạn 2: Lưu trữ Bền vững Hồ sơ & Triển khai Cloud Production
   ├── Chuyển dịch toàn bộ luồng lưu hồ sơ từ localStorage sang bảng citizen_dossiers trên PostgreSQL.
   ├── Khóa lạc quan (@Version) chống xung đột ghi đè đồng thời khi nhiều cán bộ cùng xử lý một hồ sơ.
   ├── Đóng gói Docker Compose và deploy thành công 4 Microservices lên Railway Cloud.
   └── Kiểm soát tổng dung lượng RAM toàn hệ thống ở mức tối ưu (~200MB JVM, đáp ứng giới hạn 2048 MiB).
```

---

## 4. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG & BẰNG CHỨNG THỰC TẾ (AUDIT EVIDENCE)

### 4.1. Kết quả Kiểm thử Tự động (Automated Test Suites)
- **Tầng Backend (JUnit 5 + Spring Boot Test + Mockito):**
  - Số bài kiểm thử chạy thành công: **261 / 261 bài** (Tỷ lệ đạt: **100% PASS**).
  - Bao gồm kiểm thử đơn vị (`ProcedureServiceTest`, `RagQueryServiceTest`, `CitizenDossierServiceTest`), kiểm thử bảo mật chống tấn công giả mạo (`CitizenDossierAdversarialTest`) và kiểm thử hợp chuẩn biểu mẫu (`FormPrecheckServiceTest`).
- **Tầng Kiểm thử Đầu - Cuối (End-to-End Test Suite):**
  - Chạy kịch bản Node.js/HTTP Client kiểm thử trực tiếp trên Cloud Production:
    - `GET /api/v1/health` $\rightarrow$ `HTTP 200 OK` (JVM Memory: 161 MB, Author: Nguyễn Minh Tuấn Khánh - UTH).
    - `GET /api/v1/procedures` $\rightarrow$ `HTTP 200 OK` (Truy xuất chuẩn xác đủ 40/40 thủ tục hành chính).
    - `POST /api/v1/officer/login` $\rightarrow$ `HTTP 200 OK` (Cán bộ Trần Quốc Bảo đăng nhập và nhận JWT token bảo mật).
    - `POST /api/v1/rag/ask` $\rightarrow$ `HTTP 200 OK` (RAG Query engine hoạt động ổn định với ngưỡng an toàn $\theta = 0.78$).

---

## 5. KẾ HOẠCH BƯỚC TIẾP THEO (NEXT STEPS)

Sau khi hoàn tất nghiệm thu và báo cáo hệ thống Web với Mentor, dự án sẽ tiến hành chuyển tiếp sang **Giai đoạn 3 & Giai đoạn 6**:
1. **Hoàn thiện Giao diện & Trải nghiệm Ứng dụng Di động (Mobile App UI/UX Pro Max):**
   - Triển khai 5 màn hình chuẩn hóa trên nền tảng React Native / Expo:
     - *Màn hình 01:* Trang chủ Tiện ích Số & Trợ lý Pháp lý Tỉnh An Giang.
     - *Màn hình 02:* Sơ duyệt Giấy tờ & Nộp hồ sơ dịch vụ công trực tuyến.
     - *Màn hình 03:* Không gian Phản ánh Hiện trường Đô thị thông minh (Chụp ảnh & GPS).
     - *Màn hình 04:* Bàn làm việc & Duyệt hồ sơ dành cho Cán bộ Một cửa.
     - *Màn hình 05:* **Ví Phiếu Hẹn Điện Tử (Mã QR Check-in)** — Tích hợp hình nền nhận diện thương hiệu `UTH - SMARTWARD` đồng bộ với Web, căn giữa thông tin thẻ và bố cục công thái học giúp người dân dễ dàng xuất trình tại UBND.
2. **Tích hợp API Chung:** Sử dụng trực tiếp cụm REST API đã deploy trên Railway (`https://smartward-backend-production.up.railway.app/api/v1`) cho ứng dụng di động mà không cần xây dựng lại backend.

---

*Báo cáo được khởi tạo tự động từ hệ sinh thái phát triển phần mềm SmartWard AI.*  
*Kính chuyển Mentor xem xét và cho ý kiến chỉ đạo.*
