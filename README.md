# SmartWard AI: Nền Tảng Hỗ Trợ Thủ Tục Hành Chính & Phân Luồng Phản Ánh Cấp Phường/Xã

> **Đề tài:** Báo cáo Thực tập Doanh nghiệp & Đồ án Tốt nghiệp Kỹ sư CNTT - Trường Đại học Giao thông vận tải TP.HCM (UTH)  
> **Mô hình kiến trúc:** Modular Monolith (Spring Boot 3.3 + Java 21)  
> **Ràng buộc:** Zero-Cost Architecture (Docker Stack $\le 2.0\text{ GB}$ RAM, 0 VNĐ chi phí vận hành)

---

## 1. Tóm Tắt Nhanh Dự Án (Executive Summary)

**SmartWard AI** giải quyết 2 bài toán nhức nhối tại Bộ phận Tiếp nhận và Trả kết quả (Bộ phận Một cửa) cấp xã/phường:
1. **Sai sót hồ sơ hành chính:** Người dân thường khai sai định dạng CCCD, mâu thuẫn mốc ngày tháng hoặc thiếu giấy tờ dẫn đến phải đi lại nhiều lần.
2. **Quá tải và trùng lặp phản ánh dân sinh:** Nhiều người dân cùng phản ánh một sự cố hiện trường (hư nắp cống, ngập nước, cháy đèn đường) với từ ngữ khác nhau và GPS lệch nhau, gây phân mảnh thông tin.

### 4 Module Nghiệp Vụ Cốt Lõi:
* **Module 1 - Legal RAG & Abstention Guardrail:** Hỏi đáp thủ tục hành chính dựa trên 40 TTHC cấp xã. Tự động băm văn bản theo Chương - Điều - Khoản; nếu điểm tương đồng cosine $S_{\max} < \theta$ ($\theta = 0.78$), hệ thống **bắt buộc từ chối trả lời** để triệt tiêu ảo giác.
* **Module 2 - Form Validation Engine:** Trích xuất thông tin biểu mẫu qua OCR và chạy **Java Rule Engine xác định** để giải mã logic 12 số CCCD (mã tỉnh, thế kỷ/giới tính, năm sinh), kiểm tra tính hợp lệ ngày tháng (`ngày sinh < ngày cấp <= hôm nay`) và các trường bắt buộc.
* **Module 3 - Two-Stage Spatial-Semantic Triage:** Gom cụm phản ánh 2 pha: Pha 1 lọc bán kính địa lý $R$ bằng Redis GEO (`GEOSEARCH`); Pha 2 lọc theo phân loại danh mục và độ tương đồng ngữ nghĩa $\tau$ bằng pgvector cosine.
* **Module 4 - Zero-Trust Document Vault:** Bảo vệ giấy tờ nhạy cảm theo Nghị định 13/2023/NĐ-CP: Tự động đóng dấu mờ chéo (Watermark), mã hóa AES-256-GCM trước khi lưu MinIO, và cấp link xem 1 lần duy nhất qua token tự hủy Redis (`GETDEL`).

---

## 2. 3 Câu Hỏi Nghiên Cứu (Research Questions) & Kết Quả Thực Nghiệm

| Mã RQ | Nội dung nghiên cứu | Giải pháp kỹ thuật | Kết quả thực nghiệm chính |
| :---: | :--- | :--- | :--- |
| **RQ1** | RAG phân đoạn Điều-Khoản + Ngưỡng từ chối $\theta$ giảm ảo giác ra sao? | Chunking cấu trúc pháp lý + Ngưỡng $\theta = 0.78$ trên pgvector | Recall@3 đạt **93.8%**, Citation Precision đạt **96.5%**, tỷ lệ bịa câu trả lời trên câu hỏi bẫy giảm từ 73.3% xuống **6.7%** (từ chối đúng 93.3%). |
| **RQ2** | Hiệu quả gom cụm phản ánh 2 pha (Không gian + Ngữ nghĩa) so với chỉ dùng 1 yếu tố? | Kết hợp Redis GEO ($R$) + Category + pgvector Cosine ($\tau$) | Grid Search xác định điểm cân bằng $F_1$-score tối ưu tại **$R = 75\text{m}, \tau = 0.82$** đạt **$F_1 = 91.4\%$** (loại bỏ hiện tượng gộp nhầm sự cố khác loại trong cùng con hẻm). |
| **RQ3** | Java Rule Engine đóng góp bao nhiêu % trong việc phát hiện lỗi logic tờ khai? | Hậu kiểm định xác định đặt sau Vision OCR | Phát hiện 100% lỗi sai định dạng CCCD và mâu thuẫn thời gian mà OCR/LLM thuần túy thường bỏ qua hoặc suy đoán sai. |

---

## 3. Phân Định Đóng Góp Học Thuật (Minh Bạch Trước Hội Đồng)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CÔNG CỤ CÓ SẴN (OFF-THE-SHELF)                  │
│  - Vision OCR API (Trích xuất text thô)                                 │
│  - LLM Text Embedding (Gemini text-embedding-004 / 768 dims)           │
│  - Redis GEO library & pgvector cosine extension                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Tích hợp & Kiểm soát bởi
┌───────────────────────────────────▼────────────────────────────────────┐
│                  PHẦN SINH VIÊN TỰ PHÁT TRIỂN (CORE)                   │
│  1. Backend Modular Monolith Spring Boot 3.3 (Java 21)                 │
│  2. Bộ tiền xử lý băm luật theo cấu trúc Điều - Khoản - Điểm          │
│  3. Thuật toán Guardrail chặn ảo giác RAG theo ngưỡng theta            │
│  4. Deterministic Rule Engine kiểm tra 12 số CCCD & logic ngày tháng   │
│  5. Thuật toán gom cụm phản ánh 2 pha & Kịch bản Grid Search           │
│  6. Dynamic Watermarking (Java2D) & AES-256 One-Time Read Vault        │
│  7. Bộ kiểm thử benchmark tự động xuất JSON/CSV cho luận văn           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Ràng Buộc Vận Hành & Hạ Tầng 0 VNĐ

* **Giới hạn RAM toàn hệ thống:** $\le 2.0\text{ GB}$ (chạy gọn gàng trên mọi laptop cá nhân qua Docker Compose).
* **Không dùng Kafka / RabbitMQ:** Tránh over-engineering, sử dụng `@Async ThreadPoolTaskExecutor` (2-4 threads) nội tại của Spring Boot.
* **PostgreSQL 16 + pgvector:** Giới hạn 512MB RAM, tối đa 10 kết nối HikariCP, HNSW index cho 768 chiều vector.
* **Redis 7:** Giới hạn 128MB RAM, `volatile-lru`, lưu tọa độ GEO và One-time Token tự hủy.
* **MinIO Storage:** Hạn mức 5GB, tự động xóa tệp tạm sau 7 ngày qua Lifecycle Policy.
* **Kiểm thử Offline:** Hỗ trợ `DeterministicMockAiClient` (`@Profile("dev | test")`) chạy 100% không cần API key và không tốn quota.

---

## 5. Bản Đồ Tài Liệu Trong Dự Án (Documentation Map)

Toàn bộ tài liệu chi tiết đã được phân tách phục vụ cho từng chương báo cáo và quá trình lập trình:

| Tên tệp | Nội dung chi tiết | Ứng dụng trong Báo cáo / Đồ án |
| :--- | :--- | :--- |
| [**`docs/business-and-research-plan.md`**](file:///e:/SmartWardAI/docs/business-and-research-plan.md) | Đặt vấn đề, 3 câu hỏi nghiên cứu (RQ1-3), phân định đóng góp học thuật, ràng buộc 0 VNĐ và tuyên bố pháp lý. | Đưa vào **Chương 1 (Mở đầu)** và **Chương 2 (Bối cảnh và mục tiêu đề tài)**. |
| [**`docs/architecture-and-flows.md`**](file:///e:/SmartWardAI/docs/architecture-and-flows.md) | Lý giải kiến trúc Modular Monolith, sơ đồ kiến trúc hệ thống, 3 sơ đồ tuần tự Mermaid và ERD 6 bảng PostgreSQL. | Đưa vào **Chương 2 (Kiến trúc hệ thống)** và **Chương 3 (Thiết kế chi tiết)**. |
| [**`docs/experimental-design-and-defense.md`**](file:///e:/SmartWardAI/docs/experimental-design-and-defense.md) | Phương pháp xây dựng dữ liệu kiểm thử (80 câu hỏi, 150 phản ánh có nhiễu GPS, 40 tờ khai), kết quả Grid Search, phân tích lỗi (Error Analysis), 6 câu hỏi phản biện và dàn ý 10 slide bảo vệ. | Đưa vào **Chương 3 (Kiểm thử)**, **Chương 4 (Kết quả và kinh nghiệm)** và chuẩn bị **Bảo vệ Khóa luận**. |
| [**`docs/project-constraints.md`**](file:///e:/SmartWardAI/docs/project-constraints.md) | Chi tiết các ràng buộc ngân sách, phần cứng, kỹ thuật, an toàn thông tin (Nghị định 13) và giới hạn phạm vi. | Tham khảo cho mục **Phân tích ràng buộc & Ranh giới kỹ thuật** của báo cáo. |
| [**`docs/ROADMAP.md`**](file:///e:/SmartWardAI/docs/ROADMAP.md) | Lộ trình triển khai chi tiết 12 tuần (3 tháng): Kế hoạch tuần, sản phẩm bàn giao, tiến độ viết báo cáo UTH. | Kế hoạch thực hiện đề tài & Báo cáo tiến độ hàng tuần cho Giảng viên/Mentor. |
| [**`docs/weekly-reports/`**](file:///e:/SmartWardAI/docs/weekly-reports/week-01-report.md) | Thư mục mẫu báo cáo tiến độ hàng tuần nộp Giảng viên hướng dẫn UTH và Doanh nghiệp (kèm mẫu Tuần 1). | Dùng để in hoặc gửi email báo cáo định kỳ hàng tuần. |
| [**`docs/SPEC.md`**](file:///e:/SmartWardAI/docs/SPEC.md) | Đặc tả kỹ thuật đầy đủ: Cấu trúc package Java (`vn.edu.uth.smartward`), API Contracts (7 REST endpoints cốt lõi). | Dùng cho **AI Coding Agent** để sinh mã nguồn chuẩn xác. |
| [**`AGENT_RULES.md`**](file:///e:/SmartWardAI/AGENT_RULES.md) | Bộ quy tắc thực thi nghiêm ngặt dành cho AI Agent: Cấm over-engineering, mock provider offline, code standards. | Quy chuẩn kiểm soát chất lượng mã nguồn tự động. |
