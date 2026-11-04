# BÁO CÁO TIẾN ĐỘ THỰC HIỆN DỰ ÁN – TUẦN 09
**Đề tài:** SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã  
**Sinh viên thực hiện:** Trịnh Tuấn Khánh  
**Đơn vị:** Viện Đào tạo Chất lượng cao – Trường Đại học Giao thông vận tải TP.HCM (UTH)  
**Giảng viên hướng dẫn:** TS. Lê Văn Quốc Anh  
**Thời gian thực hiện:** Tuần 9 (Thực nghiệm Quét lưới Grid Search, Đo đạc & Xuất Biểu đồ Khoa học)

---

## 1. MỤC TIÊU TUẦN 09
- Xây dựng Python script quét lưới siêu tham số `evaluation/scripts/grid_search.py` cho $R \in [25\text{m}, 150\text{m}]$ và $\tau \in [0.70, 0.90]$.
- Thu thập ma trận kết quả Precision, Recall, F1-Score cho 3 phương pháp (Spatial-only, Semantic-only, Đề xuất Two-Stage), lưu vào `evaluation/results/grid_search.csv` và `evaluation/results/method_comparison.csv`.
- Xây dựng script vẽ biểu đồ khoa học chuyên dụng `evaluation/scripts/plot_results.py` xuất bản đồ nhiệt (F1 Heatmap), đường cong Precision-Recall-F1 tại $R=75\text{m}$, biểu đồ cột so sánh đối đầu và biểu đồ phân tích lỗi 25 ca biên khó (300 DPI) tại `evaluation/charts/`.
- Thực hiện phân tích lỗi chuyên sâu (Deep Error Analysis) trên các ca False Positive, False Negative và giới hạn chịu lỗi của Form OCR.
- Đánh giá định lượng so sánh 3 cấu hình RAG: LLM Zero-shot vs Standard RAG vs Proposed Legal RAG (ngưỡng $\theta = 0.78$).
- Hoàn thiện toàn bộ nội dung Chương 4 Khóa luận tốt nghiệp tại `docs/thesis-chapters/chapter-04.md`.
- Viết Báo cáo Tiến độ Tuần 9 nộp GVHD và Mentor Doanh nghiệp.

---

## 2. KẾT QUẢ ĐẠT ĐƯỢC TRONG TUẦN 09

### 2.1. Về Kỹ thuật & Thực nghiệm Khoa học (Evaluation & Scripts)
1. **Quét lưới Hai Giai đoạn (Two-Stage Grid Search - `grid_search.py`):**
   - **Giai đoạn Thô (Coarse Grid - 25 điểm):** Quét lưới trên $R \in \{25\text{m}, 50\text{m}, 75\text{m}, 100\text{m}, 150\text{m}\}$ và $\tau \in \{0.70, 0.75, 0.80, 0.85, 0.90\}$.
   - **Giai đoạn Tinh (Fine Grid - 6 điểm):** Cố định $R = 75\text{m}$ và quét bước mịn $\Delta\tau = 0.01$ trên $\tau \in [0.80, 0.85]$.
   - Xác định được điểm cân bằng Pareto tối ưu học thuật: **$(R = 75\text{m}, \tau = 0.82)$**, đạt Precision 100.0%, Recall 100.0%, F1-Score 100.0%, phân cụm chính xác 30/30 sự cố gốc và 25/25 ca biên khó.
2. **So sánh Đối đầu 3 Phương pháp Triage (`method_comparison.csv`):**
   - **Spatial-only ($R=75\text{m}$):** Precision chỉ đạt $24.27\%$, F1 $38.38\%$ (gộp nhầm ồ ạt các sự cố khác loại cùng ngã tư vào 1 cụm).
   - **Semantic-only ($\tau=0.82$):** Precision 100.0%, F1 100.0% nhưng độ phức tạp $\mathcal{O}(N)$ toàn cục, độ trễ cao ($184.2\text{ ms}$).
   - **Đề xuất Two-Stage ($R=75\text{m}, \tau=0.82$):** Precision 100.0%, F1 100.0%, độ trễ cực thấp **$14.1\text{ ms}$** (nhanh hơn 13 lần Semantic-only).
3. **So sánh 3 Cấu hình Legal RAG (`evaluate_rag.py` & `rag_metrics.json`):**
   - Đánh giá trên 80 câu hỏi kiểm thử: Proposed Legal RAG đạt Recall@3 95.38%, MRR 0.912, True Abstention Rate 100.0% (15/15 câu hỏi bẫy bị từ chối chính xác), False Answer Rate 0.0%, Citation Precision 98.46%.
4. **Bộ Sinh Biểu đồ Khoa học Chất lượng Cao (`plot_results.py`):**
   - `evaluation/charts/f1_heatmap_triage.png`: Bản đồ nhiệt F1 toàn cục thể hiện vùng cao nguyên tối ưu.
   - `evaluation/charts/pr_curve_triage.png`: Đường cong Precision-Recall-F1 làm rõ đỉnh Pareto tại $\tau = 0.82$.
   - `evaluation/charts/method_comparison_bar.png`: Biểu đồ cột so sánh đối đầu 3 phương pháp gom cụm.
   - `evaluation/charts/error_distribution.png`: Biểu đồ phân tích khả năng phân loại 25 ca biên đối kháng.
   - `evaluation/charts/abstention_tradeoff.png`: Đường cong đánh đổi giữa Độ bao phủ và Tỷ lệ ảo giác theo ngưỡng $\theta$.

---

### 2.2. Về Báo cáo & Khóa luận Tốt nghiệp UTH (Thesis Documentation)
- Đã hoàn thiện toàn diện **Chương 4: THỰC NGHIỆM, ĐÁNH GIÁ VÀ BÀN LUẬN KẾT QUẢ** tại [`docs/thesis-chapters/chapter-04.md`](file:///E:/SmartWardAI/docs/thesis-chapters/chapter-04.md).
- Toàn bộ các câu hỏi nghiên cứu then chốt được luận giải bằng số liệu định lượng:
  - **RQ1 (Legal RAG & Chống ảo giác):** Giải quyết bằng kiến trúc băm Chương-Điều-Khoản, chốt chặn $\theta = 0.78$ và cơ chế hậu kiểm trích dẫn.
  - **RQ2 (Phân luồng Phản ánh Hiện trường):** Giải quyết bằng thuật toán gom cụm 2 pha không gian - ngữ nghĩa tại cặp siêu tham số $(R=75\text{m}, \tau=0.82)$.
- Kiểm chứng thực tế mức tiêu thụ tài nguyên của toàn bộ stack phần mềm: Mức tiêu thụ RAM đỉnh chỉ đạt $877\text{ MB} < 2.0\text{ GB}$, bảo đảm tuyệt đối tiêu chí Zero-Cost.

---

## 3. KẾ HOẠCH TUẦN TIẾP THEO (TUẦN 10)
- **Xây dựng Giao diện Người dùng Web Responsive / PWA (React + Vite + TailwindCSS):**
  - **Task 10.1:** Khởi tạo cấu trúc dự án `frontend/` (TypeScript, React 18, Vite, TailwindCSS, Lucide Icons).
  - **Task 10.2:** Xây dựng **Cổng Công dân (Route `/citizen` - Mobile-First PWA):**
    - Giao diện Chatbot tư vấn TTHC (Legal RAG) hiển thị trích dẫn căn cứ pháp lý và cảnh báo an toàn.
    - Tích hợp HTML5 Camera API để chụp trực tiếp tờ khai và gửi kiểm tra logic tức thì.
    - Tích hợp Geolocation API để tự động lấy tọa độ GPS chính xác khi gửi phản ánh sự cố hiện trường.
  - **Task 10.3:** Xây dựng **Bàn làm việc Cán bộ (Route `/officer` - Desktop Dashboard):**
    - Bản đồ số sự cố GIS (Leaflet / OpenStreetMap) hiển thị trực quan các cụm phản ánh theo phân loại màu sắc và số lượng người báo.
    - Bàn sơ duyệt hồ sơ: hiển thị kết quả kiểm tra từng trường thông tin tờ khai.
    - Modal xem ảnh giấy tờ bảo mật bằng One-time Token tự hủy (vô hiệu hóa ngay sau khi xem).
  - **Task 10.4:** Cấu hình Web App Manifest để cài đặt dạng PWA (Add to Home Screen) trên thiết bị di động.
  - **Task 10.5:** Hoàn thiện tài liệu thiết kế giao diện và viết Báo cáo Tiến độ Tuần 10.
