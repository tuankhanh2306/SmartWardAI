# BÁO CÁO TIẾN ĐỘ THỰC HIỆN DỰ ÁN – TUẦN 05
**Đề tài:** SmartWard AI – Hệ thống Hỗ trợ Thủ tục Hành chính và Phân luồng Phản ánh Cấp Phường/Xã  
**Sinh viên thực hiện:** Trịnh Tuấn Khánh  
**Đơn vị:** Viện Đào tạo Chất lượng cao – Trường Đại học Giao thông vận tải TP.HCM (UTH)  
**Thời gian thực hiện:** Tuần 5 (Giai đoạn Triển khai Phân hệ Lõi 2 – Deterministic Form Rule Engine)

---

## 1. MỤC TIÊU TUẦN 05
- Xây dựng Phân hệ 2: Động cơ Quy tắc Định thức Tiền kiểm định Biểu mẫu Hành chính (Deterministic Form Rule Engine).
- Tích hợp `OcrExtractionClient` kết nối Vision OCR giải mã các trường thông tin biểu mẫu và độ tin cậy nhận diện.
- Viết các lớp kiểm định định thức bằng pure Java: `CccdValidator` (12 chữ số, 63 tỉnh/thành, thế kỷ/giới tính, năm sinh), `DateLogicValidator` (nghịch lý thời gian, tuổi cấp CCCD $\ge 14$), và `MandatoryFieldValidator`.
- Đánh dấu cảnh báo `MANUAL_REVIEW_REQUIRED` khi độ tin cậy nhận diện chữ viết $< 0.70$.
- Xây dựng REST API `POST /api/v1/forms/precheck` tiếp nhận upload file ảnh biểu mẫu và trả về báo cáo tiền kiểm định chi tiết.
- Soạn thảo Chương 3 - Phần 2 Khóa luận tốt nghiệp UTH.

---

## 2. KẾT QUẢ ĐẠT ĐƯỢC TRONG TUẦN 05

### 2.1. Về Kỹ thuật & Mã nguồn (System / Code)
1. **Trích xuất thông tin OCR (`OcrExtractionClient.java`):**
   - Kết nối `AiModelClient.performVisionOcr` trích xuất thông tin có cấu trúc: `fullName`, `birthDate`, `gender`, `cccdNumber`, `issueDate`, `issuePlace`, `permanentAddress`, `overallConfidence`, và `fieldConfidences`.
2. **Bộ kiểm định Căn cước công dân (`CccdValidator.java`):**
   - Kiểm tra định dạng 12 chữ số.
   - Đối chiếu danh mục 63 mã tỉnh/thành phố hợp pháp theo quy định của Bộ Công an.
   - Kiểm tra chữ số thế kỷ và giới tính (0/1 cho thế kỷ 20, 2/3 cho thế kỷ 21...).
   - Kiểm tra 2 chữ số năm sinh trên thẻ có khớp với ngày sinh khai báo.
3. **Bộ kiểm định Logic Ngày tháng (`DateLogicValidator.java`):**
   - Kiểm tra ngày cấp thẻ không nằm trong tương lai.
   - Kiểm tra ngày sinh phải trước ngày cấp thẻ.
   - Kiểm tra điều kiện đủ 14 tuổi khi được cấp CCCD theo Luật Căn cước.
4. **Bộ kiểm tra Trường bắt buộc (`MandatoryFieldValidator.java`):**
   - Bắt lỗi khi để trống các trường pháp lý cốt lõi.
5. **Dịch vụ Sơ duyệt Biểu mẫu (`FormPrecheckService.java`):**
   - Tổng hợp kết quả từ các bộ kiểm định, đánh dấu cảnh báo `MANUAL_REVIEW_REQUIRED` với các trường có độ tin cậy $< 0.70$.
   - Lưu trữ nhật ký sơ duyệt vào bảng `form_submissions` trong PostgreSQL.
   - Đính kèm Tuyên bố miễn trừ trách nhiệm pháp lý theo Nghị định 13/2023/NĐ-CP.
6. **REST API Sơ duyệt Biểu mẫu (`FormCheckController.java`):**
   - Điểm cuối `POST /api/v1/forms/precheck` nhận multipart file ảnh và tham số `formType`.

### 2.2. Về Kiểm thử Tự động (Testing & Verification)
- Bổ sung 17 unit test kiểm thử chuyên sâu cho toàn bộ quy tắc kiểm định:
  - `CccdValidatorTest`: 7/7 test passed.
  - `DateLogicValidatorTest`: 4/4 test passed.
  - `MandatoryFieldValidatorTest`: 2/2 test passed.
  - `FormPrecheckServiceTest`: 3/3 test passed.
  - `FormCheckControllerTest`: 1/1 test passed.
- Toàn bộ test suite dự án đạt: **38/38 tests Passed, 0 Failures, BUILD SUCCESS**.

### 2.3. Về Báo cáo & Tài liệu Khóa luận (Thesis Documentation)
- Đã soạn thảo Chương 3 - Phần 2 tại [`docs/thesis-chapters/chapter-03.md`](file:///E:/SmartWardAI/docs/thesis-chapters/chapter-03.md).
- Làm rõ bản chất "Pre-check & Audit": Hệ thống chỉ nhắc nhở và cảnh báo để công dân sửa trên tờ khai giấy, tuyệt đối không tự sửa trên phần mềm nhằm bảo đảm tính pháp lý và tuân thủ Nghị định 13/2023/NĐ-CP.

---

## 3. KẾ HOẠCH TUẦN TIẾP THEO (TUẦN 06)
- **Module 3: Two-Stage Spatial-Semantic Triage (Gom cụm và phân luồng phản ánh hiện trường 2 pha)**:
  - Cấu hình Redis GEO index cho tọa độ địa lý các cụm sự cố.
  - Hiện thực Pha 1: Lọc không gian trong bán kính $R$ mét qua Redis `GEOSEARCH` trong cửa sổ 72 giờ.
  - Hiện thực Pha 2: So khớp danh mục nghiệp vụ và đo Cosine Similarity vector ngữ nghĩa với tâm cụm ($\text{Sim} \ge \tau$).
  - Xây dựng các REST API: `POST /api/v1/issues/report` và `GET /api/v1/issues/clusters`.
