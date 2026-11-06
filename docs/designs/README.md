# 🎨 HỒ SƠ THIẾT KẾ & BẢN MẪU GIAO DIỆN (UI/UX DESIGN & PROTOTYPES)

> **Dự án:** SmartWard AI  
> **Thư mục:** `docs/designs/`  
> **Mục đích:** Lưu trữ tập trung các bản mẫu giao diện nguyên mẫu (HTML prototypes), sơ đồ trực quan hóa và mô hình không gian 3D.

---

## 📂 Danh Mục Tài Liệu Thiết Kế

### 1. Bản Mẫu Giao Diện HTML Nguyên Mẫu (`prototypes/`)
Thư mục lưu trữ 4 giao diện nguyên mẫu độc lập chuẩn hóa theo hệ thống màu sắc nhận diện hành chính công cấp phường/xã:
- **`citizen_portal.html`**: Cổng dịch vụ công dân sinh tương tác — Trợ lý hỏi đáp pháp lý RAG, danh mục 40 TTHC, tra cứu và gửi câu hỏi Một cửa.
- **`form_and_issue_reporting.html`**: Giao diện Tiền kiểm định đa biểu mẫu (CT01, Khai sinh, Kết hôn, Bảo trợ xã hội) và gửi phản ánh sự cố hiện trường kèm ghim bản đồ GIS.
- **`gis_command_center.html`**: Trung tâm chỉ huy Bản đồ số GIS & Phân luồng sự cố 2 pha (bán kính R=75m, tương đồng ngữ nghĩa $\tau=0.82$).
- **`officer_form_audit.html`**: Bàn làm việc số của Cán bộ Một cửa — Thẩm định hồ sơ đối chiếu chéo OCR, mã hóa Zero-Trust AES-256 và phê duyệt hàng đợi HITL.

### 2. Trực Quan Hóa Mô Hình Multi-Agent 3D (`agent_3d_topology.html`)
- **`agent_3d_topology.html`**: Ứng dụng WebGL / Three.js tương tác hiển thị cấu trúc liên kết 3D của toàn bộ đội ngũ Multi-Agent (Chỉ huy Teamwork, Reviewers, Challengers, Auditors, Workers).
- **Tính năng:**
  - Chuyển đổi trạng thái trực quan giữa các Agent theo thời gian thực (Working, Idle, Lounging).
  - Bản đồ synap luân chuyển dữ liệu và bàn giao công việc giữa các tầng nghiệp vụ.
  - Hỗ trợ xem trực tiếp trên mọi trình duyệt web không cần cài đặt thêm phần mềm.
