# BÁO CÁO TIẾN ĐỘ THỰC HIỆN DỰ ÁN – TUẦN 06 (SƠ KẾT GIỮA KỲ)
**Đề tài:** SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã  
**Sinh viên thực hiện:** Trịnh Tuấn Khánh  
**Đơn vị:** Viện Đào tạo Chất lượng cao – Trường Đại học Giao thông vận tải TP.HCM (UTH)  
**Thời gian thực hiện:** Tuần 6 (Giai đoạn Triển khai Phân hệ Lõi 3 – Two-Stage Spatial-Semantic Triage)

---

## 1. MỤC TIÊU TUẦN 06 & SƠ KẾT GIỮA KỲ
- Hiện thực hoàn chỉnh Phân hệ 3: Thuật toán Phân luồng và Gom cụm Phản ánh Hiện trường 2 Pha (Two-Stage Spatial-Semantic Triage).
- Cấu hình chỉ mục không gian cực nhanh trên Redis GEO (`GEOADD`, `GEOSEARCH`) cho tọa độ các cụm sự cố.
- Cài đặt Pha 1: Lọc không gian trong bán kính $R = 75$ mét đối với các cụm đang `OPEN` hoặc `IN_PROGRESS` trong 72 giờ qua.
- Cài đặt Pha 2: Lọc cứng theo danh mục nghiệp vụ (`category`) và đo độ tương đồng Cosine ngữ nghĩa ($\text{Sim} \ge \tau = 0.82$).
- Cài đặt cơ chế cập nhật tâm cụm trung bình động (Incremental Centroid Update) cho cả tọa độ GPS và vector tâm 768 chiều.
- Xây dựng các REST API: `POST /api/v1/issues/report` (gửi phản ánh) và `GET /api/v1/issues/clusters` (lấy danh sách cụm cho bản đồ cán bộ).
- Soạn thảo Chương 3 - Phần 3 Khóa luận tốt nghiệp UTH và Báo cáo Sơ kết Giữa kỳ.

---

## 2. KẾT QUẢ ĐẠT ĐƯỢC TRONG TUẦN 06

### 2.1. Về Kỹ thuật & Mã nguồn (System / Code)
1. **Dịch vụ Chỉ mục Không gian (`SpatialIndexService.java`):**
   - Đóng gói các lệnh Redis GEO: `addClusterLocation`, `findNearbyClusters` (dùng `org.springframework.data.redis.domain.geo.Metrics.METERS`), và `removeClusterLocation`.
   - Độ trễ tìm kiếm không gian $< 1.0\text{ ms}$.
2. **Động cơ Phân luồng 2 Pha (`TwoStageTriageService.java`):**
   - **Pha 1:** Quét ứng viên trong bán kính $R = 75$ mét qua Redis GEO.
   - **Pha 2:** Lọc danh mục (loại bỏ trường hợp khác nghiệp vụ tại cùng vị trí) và tính Cosine Similarity vector mô tả với tâm cụm.
   - **Gộp cụm khi $\text{Sim} \ge 0.82$:** Tăng biến đếm `reportCount`, cập nhật tâm GPS và vector tâm cụm trung bình động chuẩn hóa $L_2$, cập nhật lại vị trí trên Redis GEO, liên kết phản ánh vào cụm.
   - **Tạo cụm mới khi $\text{Sim} < 0.82$ hoặc không có ứng viên:** Sinh mã `CLUST_YYYYMMDD_XXXX`, khởi tạo tâm cụm và index vào Redis GEO.
3. **REST API Giao tiếp (`TriageController.java`):**
   - `POST /api/v1/issues/report`: Tiếp nhận phản ánh công dân (GPS + mô tả + danh mục), trả về biên nhận và thông tin cụm được phân luồng.
   - `GET /api/v1/issues/clusters`: Cung cấp danh sách cụm sự cố theo trạng thái (`OPEN`, `IN_PROGRESS`) và danh mục phục vụ lớp bản đồ số (GIS) trên bàn làm việc cán bộ.

### 2.2. Về Kiểm thử Tự động (Testing & Verification)
- Xây dựng các lớp kiểm thử tự động chuyên sâu:
  - `TwoStageTriageServiceTest`: Kiểm thử tạo cụm mới khi không có ứng viên, gộp cụm thành công khi $\text{Sim} \ge 0.82$, và ngăn chặn gộp nhầm khi hai sự cố khác danh mục xảy ra tại cùng tọa độ.
  - `TriageControllerTest`: Kiểm thử MockMvc cho các REST API tiếp nhận phản ánh và truy vấn cụm bản đồ.
- Toàn bộ test suite dự án đạt: **43/43 tests Passed, 0 Failures, BUILD SUCCESS**.

### 2.3. Sơ kết Tiến độ Giữa kỳ (Tuần 1 - Tuần 6)
- Đã hoàn thành xuất sắc 100% mục tiêu của nửa đầu chặng đường (6/12 tuần):
  - **Tuần 1:** Khởi tạo hạ tầng Docker Zero-cost (< 2.0GB RAM) và khung Spring Boot 3.3.
  - **Tuần 2:** Thu thập 40 TTHC cấp xã và thiết kế CSDL Flyway (`pgvector` HNSW index).
  - **Tuần 3:** Tích hợp AI Client (Gemini & Deterministic Mock), Redis Rate Limiter, Query Cache.
  - **Tuần 4:** Module 1 Legal RAG Điều-Khoản & Abstention Guardrail ($\theta = 0.78$).
  - **Tuần 5:** Module 2 Deterministic Form Rule Engine (Kiểm tra 12 số CCCD, Date Logic).
  - **Tuần 6:** Module 3 Two-Stage Spatial-Semantic Triage (Redis GEO $R$ mét + pgvector Cosine $\tau$).

---

## 3. KẾ HOẠCH TUẦN TIẾP THEO (TUẦN 07)
- **Module 4: Zero-Trust Document Vault (Bảo mật tài liệu Nghị định 13/2023/NĐ-CP)**:
  - Xây dựng `ImageWatermarkService` bằng Java2D (`Graphics2D`) vẽ chìm watermark chéo chống lạm dụng hồ sơ.
  - Hiện thực `ZeroTrustVaultService`: Mã hóa file ảnh bằng thuật toán `AES/GCM/NoPadding` (256-bit key) và upload vào MinIO bucket `smartward-vault`.
  - Cơ chế Token 1 lần (One-Time Access Link) với lệnh Redis `GETDEL` và TTL 24 giờ.
