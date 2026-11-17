# KHẢO SÁT PHÁP LÝ, ROBOTS.TXT VÀ ĐIỀU KHOẢN CỔNG NGUỒN TTHC
## SMARTWARD AI — PROCEDURAL KNOWLEDGE PIPELINE
*Cập nhật: Tháng 11/2026*

---

### 1. Căn Cứ Pháp Lý Về Dữ Liệu Thủ Tục Hành Chính Công Khai

1. **Nghị định số 42/2022/NĐ-CP ngày 24/06/2022 của Chính phủ:**  
   Quy định về việc cung cấp thông tin và dịch vụ công trực tuyến của cơ quan nhà nước trên môi trường mạng. Điều 4 nêu rõ: Toàn bộ danh mục thủ tục hành chính, trình tự thực hiện, thành phần hồ sơ, cơ quan giải quyết, thời hạn, phí và lệ phí là **thông tin công khai bắt buộc** phải công bố rộng rãi cho tổ chức và cá nhân tra cứu tự do.
2. **Nghị định số 63/2010/NĐ-CP & Nghị định số 92/2017/NĐ-CP:**  
   Quy định về kiểm soát thủ tục hành chính và Cơ sở dữ liệu quốc gia về thủ tục hành chính. Thông tin TTHC được công bố nhằm mục đích minh bạch hóa hoạt động của cơ quan nhà nước, tạo thuận lợi tối đa cho người dân thực hiện quyền và nghĩa vụ công dân.
3. **Phạm vi dữ liệu của SmartWard AI Pipeline:**  
   Pipeline chỉ thu thập **nội dung quy định hành chính công khai** (quy trình, biểu mẫu, căn cứ pháp lý), **tuyệt đối không thu thập, lưu trữ hay gửi bất kỳ dữ liệu cá nhân nào của công dân** sang dịch vụ bên thứ ba (tuân thủ nghiêm ngặt Nghị định 13/2023/NĐ-CP).

---

### 2. Kết Quả Khảo Sát `robots.txt` Và Hạ Tầng Cổng Nguồn

1. **Cổng Dịch vụ công Quốc gia (`https://dichvucong.gov.vn`):**  
   - Kiểm tra endpoint `/robots.txt`: Hệ thống máy chủ cổng quốc gia được bảo vệ bởi tường lửa ứng dụng web (WAF) và không thiết lập chỉ thị cấm (không có `Disallow` đối với trang tra cứu chi tiết thủ tục hành chính `/p/home/dvc-chi-tiet-thu-tuc-hanh-chinh.html`).
   - Kết luận: **HỢP LỆ VÀ ĐƯỢC PHÉP THU THẬP** với điều kiện tuân thủ nguyên tắc tôn trọng tài nguyên máy chủ.
2. **Cổng Dịch vụ công Tỉnh An Giang / Bộ Công an / Bộ Tư pháp:**  
   - Các cổng chuyên ngành đều công bố mở các biểu mẫu công khai và quyết định công bố TTHC cấp xã.

---

### 3. Quy Tắc Thu Thập Dữ Liệu An Toàn & Trách Nhiệm (Ethical Crawler Policy)

Để bảo đảm không gây tải lên hạ tầng Cổng Dịch vụ công Quốc gia, Pipeline áp dụng bộ quy tắc:

1. **Định danh minh bạch (Transparent User-Agent):**  
   Mọi HTTP request đều gắn User-Agent rõ ràng:  
   `User-Agent: SmartWardAI-Research-Crawler/1.0 (+uth.edu.vn; Academic & Civic Administration Research)`
2. **Giãn cách truy vấn (Polite Rate Limiting):**  
   - Đặt thời gian chờ tối thiểu **2.0 giây** giữa 2 lần cào liên tiếp.
   - Áp dụng cơ chế Exponential Backoff với tối đa 3 lần thử lại khi gặp mã lỗi 429 hoặc timeout.
3. **Tính toán Idempotent (Chống cào trùng):**  
   - Tính toán mã băm `sha256` của nội dung cào về. Nếu nội dung không thay đổi so với bản trước đó, bỏ qua không xử lý tiếp.
4. **Vận hành Offline / Ngoài Production:**  
   - Pipeline chạy độc lập theo kịch bản (script) trên máy phát triển hoặc GitHub Actions định kỳ hàng tháng.
   - Tuyệt đối không đóng gói Firecrawl hay headless Chromium vào cụm Docker Production, giữ vững trần RAM $\le 2048$ MiB.
5. **Cổng Duyệt Con Người (Human-in-the-Loop Diff Review):**  
   - Dữ liệu cào về **không bao giờ được tự động ghi đè vào CSDL production**.
   - Bắt buộc phải qua công cụ `diff.py` để cán bộ/kỹ thuật viên rà soát văn bản, xác nhận không có sai lệch pháp lý trước khi sinh file seed JSON cập nhật.
