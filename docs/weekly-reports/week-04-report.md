# BÁO CÁO TIẾN ĐỘ THỰC HIỆN DỰ ÁN – TUẦN 04
**Đề tài:** SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã  
**Sinh viên thực hiện:** Trịnh Tuấn Khánh  
**Đơn vị:** Viện Đào tạo Chất lượng cao – Trường Đại học Giao thông vận tải TP.HCM (UTH)  
**Thời gian thực hiện:** Tuần 4 (Giai đoạn Triển khai Phân hệ Lõi 1 – Legal RAG)

---

## 1. MỤC TIÊU TUẦN 04
- Hiện thực hoàn chỉnh Phân hệ 1: Trợ lý Tra cứu Pháp lý Thủ tục Hành chính (Legal RAG) trên nền Spring Boot 3.3, PostgreSQL 16 `pgvector`, và Redis 7.
- Cài đặt cơ chế chốt chặn chống ảo giác **Abstention Guardrail** với ngưỡng $\theta = 0.78$.
- Xây dựng thuật toán hậu kiểm tra trích dẫn (**Post-verification**) nhằm loại trừ triệt để trích dẫn căn cứ pháp lý giả mạo do mô hình sinh ra.
- Thiết lập REST API `POST /api/v1/rag/ask` hỗ trợ đầy đủ Rate Limiting (5 req/phút/IP), Redis Caching (1 giờ TTL), và gắn Tuyên bố miễn trừ trách nhiệm pháp lý.
- Soạn thảo Chương 3 - Phần 1 Khóa luận tốt nghiệp UTH.

---

## 2. KẾT QUẢ ĐẠT ĐƯỢC TRONG TUẦN 04

### 2.1. Về Kỹ thuật & Mã nguồn (System / Code)
1. **Projection & CSDL Vector (`LegalChunkRepository.java`):**
   - Bổ sung interface projection `LegalChunkMatch` ánh xạ kết quả truy vấn Cosine Similarity `(1.0 - (c.embedding <=> :queryVector))` kết hợp thông tin thủ tục (`AdminProcedure`).
   - Tối ưu hóa điều kiện lọc hiệu lực pháp lý: `status = 'ACTIVE' AND effective_date <= CURRENT_DATE AND embedding IS NOT NULL`.
2. **Dịch vụ Truy vấn Pháp lý (`RagQueryService.java`):**
   - Vector hóa câu hỏi công dân thành vector 768 chiều.
   - So khớp Top-K láng giềng gần nhất với chỉ mục HNSW trên PostgreSQL.
   - Kiểm định ngưỡng an toàn: Nếu $S_{\max} < 0.78$ hoặc tập kết quả rỗng, hệ thống ngắt suy diễn và phản hồi từ chối an toàn kèm căn cứ pháp lý rõ ràng.
   - Thuật toán hậu kiểm tra trích dẫn (`postVerifyCitations`): Quét biểu thức chính quy mã trích dẫn dạng `[MÃ_ĐOẠN]`, đối chiếu với danh sách Top-K ứng viên thực tế từ CSDL. Mọi mã bịa đặt nằm ngoài Top-K đều bị loại bỏ tự động.
3. **Giao diện Lập trình REST API (`RagController.java`):**
   - Điểm cuối `POST /api/v1/rag/ask` nhận payload `RagAskRequest` (`question`, `category`, `topK`, `similarityThreshold`).
   - Tích hợp kiểm tra IP `X-Forwarded-For` với `RedisRateLimiter`.
   - Trả về cấu trúc chuẩn `ApiResponse<RagAskResponse>` kèm danh sách `LegalCitationDto`, thời gian xử lý (`responseTimeMs`), và tuyên bố miễn trừ trách nhiệm.
4. **Tự động Vector hóa Dữ liệu khởi tạo (`ProcedureDataSeeder.java`):**
   - Bổ sung cơ chế tự động sinh vector embedding cho toàn bộ 40 TTHC và các đoạn văn bản khi khởi động ứng dụng, bảo đảm sẵn sàng dữ liệu phục vụ tìm kiếm.

### 2.2. Về Kiểm thử Tự động (Testing & Verification)
- Xây dựng các lớp kiểm thử tự động:
  - `RagQueryServiceTest`: 5 kịch bản kiểm thử (Chặn tần suất, Trúng cache, Từ chối an toàn $S_{\max} < 0.78$, Trả lời thành công khi $S_{\max} \ge 0.78$, Lọc bỏ trích dẫn giả mạo).
  - `RagControllerTest`: Kiểm thử MockMvc REST API (Phản hồi thành công HTTP 200, Bắt lỗi dữ liệu rỗng HTTP 422 `SW_422`).
- Toàn bộ test suite chạy thành công: **21/21 tests Passed, BUILD SUCCESS**.

### 2.3. Về Báo cáo & Tài liệu Khóa luận (Thesis Documentation)
- Đã soạn thảo hoàn chỉnh mục 3.1 Khóa luận tốt nghiệp tại [`docs/thesis-chapters/chapter-03.md`](file:///E:/SmartWardAI/docs/thesis-chapters/chapter-03.md):
  - 3.1.1 Đặt vấn đề và Thách thức Pháp lý trong Hành chính công.
  - 3.1.2 Giải thuật Phân đoạn Văn bản Pháp lý (Legal Unit Chunking).
  - 3.1.3 Mô hình Toán học của Chốt chặn Từ chối (Abstention Guardrail với $\theta = 0.78$).
  - 3.1.4 Thuật toán Hậu kiểm tra Trích dẫn (Post-Verification Algorithm).
  - 3.1.5 Kiến trúc Tích hợp Bộ đệm (Cache) và Giới hạn Tần suất (Rate Limit).
  - 3.1.6 Kết quả Kiểm thử Đơn vị và Thực nghiệm.

---

## 3. KẾ HOẠCH TUẦN TIẾP THEO (TUẦN 05)
- **Module 2: Deterministic Form Rule Engine (Kiểm định Biểu mẫu Hành chính)**:
  - Hiện thực bộ quy tắc thuần Java (`CccdValidator`) kiểm tra 12 chữ số CCCD (mã tỉnh, thế kỷ, giới tính, năm sinh).
  - Hiện thực `DateLogicValidator` kiểm định logic ngày tháng (`birthDate < issueDate <= today` và đủ 14 tuổi).
  - Hiện thực `MandatoryFieldValidator` và cảnh báo `MANUAL_REVIEW_REQUIRED` khi OCR confidence $< 0.70$.
  - Xây dựng REST API `POST /api/v1/forms/precheck` tiếp nhận ảnh tờ khai và xuất báo cáo tiền kiểm định.
