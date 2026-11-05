# Hướng Dẫn Thu Thập Dữ Liệu Kiểm Thử Độc Lập (Held-out Collection Template)
## Dự án SmartWard AI — Trợ lý Pháp lý Một Cửa cấp Xã/Phường

### 1. Mục đích
Tập dữ liệu này dùng làm **bộ kiểm thử độc lập (Held-out Test Set)** để đánh giá năng lực thực tế của hệ thống AI SmartWard. 
Để đảm bảo tính khách quan và khoa học:
- **Người viết**: Xin nhờ bạn bè, người thân, đồng nghiệp (người ngoài nhóm phát triển) viết câu hỏi tự nhiên theo cách hiểu và thói quen hàng ngày của mình.
- **Tính tự nhiên**: Không cần câu chữ chau chuốt sách vở. Khuyến khích mọi cách diễn đạt:
  - Tiếng Việt không dấu (ví dụ: *lam khai sinh can gi*)
  - Tiếng lóng, viết tắt, teencode (ví dụ: *kê khai tt*, *dk ket hon*)
  - Phương ngữ Nam Bộ (ví dụ: *mần giấy giá thú*, *khai sanh cho bé*, *lãnh tiền già*, *chứng giấy tờ*)
  - Câu hỏi nhiều ý, câu cộc lốc, câu hỏi ngoài thẩm quyền xã, hoặc câu hỏi mơ hồ không rõ thủ tục.
- **Bảo mật**: **TUYỆT ĐỐI KHÔNG DÙNG THÔNG TIN CÁ NHÂN THẬT**. Mọi tên riêng, số CCCD, số điện thoại, địa chỉ nếu có phải là giả lập (ví dụ: Nguyễn Văn A, 0912345678).

---

### 2. Các nhóm ý định cần thu thập

| Nhóm ý định | Ý nghĩa | Ví dụ gợi ý |
| :--- | :--- | :--- |
| `GREETING` | Chào hỏi, làm quen, hỏi thăm, cảm ơn, tạm biệt | *"Chào cán bộ", "Alo bạn là ai", "Hôm nay thế nào", "Cảm ơn nhiều nha", "Bye"* |
| `PROCEDURE_CATALOG` | Hỏi danh sách, danh mục các thủ tục cấp xã có làm | *"Xã mình giải quyết được những thủ tục gì?", "Nêu 40 thủ tục", "Có làm giấy tờ gì ở đây"* |
| `COMMUNE_INFO` | Hỏi địa chỉ trụ sở, giờ tiếp dân, số điện thoại UBND | *"UBND xã ở đường nào?", "Mấy giờ mở cửa tiếp dân?", "Thứ 7 ủy ban có làm việc không?"* |
| `OUT_OF_SCOPE` | Các việc KHÔNG thuộc cấp xã (Hộ chiếu, Bằng lái, Làm CCCD, Biển số xe, Tòa án, BHXH...) | *"Làm hộ chiếu đi du lịch ở đâu?", "Đổi bằng lái xe B2", "Rút BHXH 1 lần", "Khởi kiện chia tài sản"* |
| `AMBIGUOUS` | Câu hỏi quá mơ hồ, thiếu thông tin, cần hỏi lại | *"Làm giấy tờ cho con cần gì?", "Mất bao nhiêu tiền?", "Hồ sơ có khó không?", "Hỏi về chế độ"* |
| `PROCEDURE_INQUIRY` | Hỏi cụ thể 1 trong 40 thủ tục cấp xã (Khai sinh, kết hôn, khai tử, cư trú CT01, chứng thực sao y, xác nhận độc thân, bảo trợ xã hội, đất đai cơ bản...) | *"Đăng ký khai sinh cho con mới sinh cần giấy tờ gì?", "Muốn đăng ký kết hôn thì hai đứa cần mang gì?", "Chứng thực bản sao học bạ hết bao nhiêu tiền?"* |

---

### 3. Cấu trúc bảng mẫu (Điền vào file heldout_collection_template.csv)

| id | text | intent | procedure_code | author_id | style_tags | notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| H_USER_001 | lam khai sanh cho con can gi chu | PROCEDURE_INQUIRY | TTHC-HT-01 | user_anh_ba | không_dấu,phương_ngữ | Câu hỏi phương ngữ Nam Bộ không dấu |
| H_USER_002 | đoi bang lai xe may o dau | OUT_OF_SCOPE | | user_chi_tu | không_dấu,ngoài_phạm_vi | Bằng lái xe thuộc Sở GTVT |
| H_USER_003 | lam giay to het bao lau | AMBIGUOUS | | user_chu_nam | mơ_hồ | Thiếu tên thủ tục cụ thể |
| H_USER_004 | ubnd xa minh may gio mo cua | COMMUNE_INFO | | user_anh_ba | không_dấu | Hỏi giờ làm việc |
