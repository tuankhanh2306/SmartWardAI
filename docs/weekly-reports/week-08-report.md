# BÁO CÁO TIẾN ĐỘ THỰC HIỆN DỰ ÁN – TUẦN 08
**Đề tài:** SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã  
**Sinh viên thực hiện:** Trịnh Tuấn Khánh  
**Đơn vị:** Viện Đào tạo Chất lượng cao – Trường Đại học Giao thông vận tải TP.HCM (UTH)  
**Thời gian thực hiện:** Tuần 8 (Giai đoạn Triển khai Hạ tầng Đo lường Thực nghiệm & Benchmark Harness)

---

## 1. MỤC TIÊU TUẦN 08
- Hoàn thiện và chuẩn hóa 3 bộ dataset kiểm thử thực nghiệm (80 câu RAG, 40 tờ khai Mẫu CT01, 150 phản ánh hiện trường kèm 25 ca biên khó).
- Xây dựng `ExperimentRunnerService` trong backend tự động đo lường và tính toán các chỉ số học thuật: Recall@3, MRR (Mean Reciprocal Rank), Citation Precision, False Answer Rate, F1-Score, và Tỷ lệ phân tách ca biên khó.
- Xây dựng REST API `POST /api/v1/evaluation/run-benchmarks` và `GET /api/v1/evaluation/report` xuất báo cáo số liệu thực nghiệm.
- Soạn thảo Chương 4 - Phần 1 Khóa luận tốt nghiệp UTH (Phương pháp luận thiết kế tập kiểm thử giảm thiểu thiên lệch chủ quan).
- Viết Báo cáo Tiến độ Tuần 8 nộp GVHD và Mentor.

---

## 2. KẾT QUẢ ĐẠT ĐƯỢC TRONG TUẦN 08

### 2.1. Về Kỹ thuật & Mã nguồn (System / Code)
1. **Chuẩn hóa Dữ liệu Thực nghiệm trên Backend (`src/main/resources/benchmark/`):**
   - Tích hợp 80 câu RAG (`ground-truth.json`), 40 tờ khai (`annotations.json`), và 150 phản ánh (`generated-reports.csv`) trực tiếp vào classpath tài nguyên của Spring Boot.
2. **Dịch vụ Đo lường Thực nghiệm Tự động (`ExperimentRunnerService.java`):**
   - **Đánh giá Legal RAG:** Đo lường Recall@3 (95.38%), MRR (0.912), Abstention Accuracy (100.0% trên 15 câu ngoài phạm vi), False Answer Rate (0.0%), và Citation Precision (98.46%).
   - **Đánh giá Form Rule Engine:** Đo lường ma trận nhầm lẫn (Confusion Matrix) trên 40 tờ khai, đạt Accuracy 100.0%, Precision 100.0%, Recall 100.0%, F1-Score 1.000; phát hiện 100% các lỗi vi phạm 12 số CCCD và logic ngày tháng.
   - **Đánh giá Triage 2 Pha:** Kiểm chứng 25 ca biên khó, đạt 100% tỷ lệ phân tách các sự cố khác danh mục tại cùng tọa độ (`COLOCATED_DIFFERENT_CATEGORY`) và các sự cố cùng danh mục ở xa (`SAME_CATEGORY_DISTANT_LOCATION`).
3. **REST API Đo lường Thực nghiệm (`EvaluationController.java`):**
   - `POST /api/v1/evaluation/run-benchmarks`: Chạy toàn bộ bộ benchmark và trả về `FullBenchmarkReport`.
   - `GET /api/v1/evaluation/report`: Truy xuất báo cáo số liệu thực nghiệm khoa học.

### 2.2. Về Kiểm thử Tự động (Testing & Verification)
- Bổ sung 6 unit test chuyên sâu:
  - `ExperimentRunnerServiceTest`: 4/4 test passed (kiểm thử độc lập cả 3 bộ đo lường và báo cáo hợp nhất).
  - `EvaluationControllerTest`: 2/2 test passed (kiểm thử MockMvc cho các REST API benchmark).
- Toàn bộ test suite dự án đạt: **57/57 tests Passed, 0 Failures, BUILD SUCCESS**.

### 2.3. Về Báo cáo & Tài liệu Khóa luận (Thesis Documentation)
- Đã soạn thảo Chương 4 - Phần 1 tại [`docs/thesis-chapters/chapter-04.md`](file:///E:/SmartWardAI/docs/thesis-chapters/chapter-04.md).
- Làm rõ phương pháp luận thiết kế tập kiểm thử giảm thiểu thiên lệch chủ quan, bảng ma trận nhầm lẫn (Confusion Matrix), và các công thức toán học tính toán chỉ số Recall@3, MRR, F1-Score.

---

## 3. KẾ HOẠCH TUẦN TIẾP THEO (TUẦN 09)
- **Tối ưu hóa Siêu tham số & Quét lưới (Hyperparameter Optimization & Grid Search)**:
  - Viết script quét lưới không gian $(R, \tau)$ với bán kính $R \in [25\text{m}, 150\text{m}]$ (bước nhảy 25m) và ngưỡng ngữ nghĩa $\tau \in [0.70, 0.90]$ (bước nhảy 0.05).
  - Tìm ra điểm cân bằng Pareto tối ưu $(R^*, \tau^*)$ cực đại hóa $F_1$-score phân luồng.
  - Vẽ các biểu đồ nhiệt (Heatmap) và biểu đồ phân tán (Scatter plots) minh họa kết quả nghiên cứu trong thư mục `evaluation/plots/`.
  - Hoàn thiện toàn bộ Chương 4 Khóa luận tốt nghiệp (Số liệu & Thảo luận học thuật).
