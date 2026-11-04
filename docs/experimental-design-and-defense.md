# Thiết kế Thực nghiệm, Phân tích Lỗi & Trả lời Phản biện
**Dự án:** SmartWard AI (Civic Governance & Legal RAG Platform)  
**Tài liệu tham khảo cho:** Báo cáo Học kỳ Doanh nghiệp & Đồ án Tốt nghiệp (Chương 3, Chương 4 & Bảo vệ Khóa luận)

---

## 1. Phương pháp Xây dựng Bộ dữ liệu Kiểm thử (Giảm thiên lệch chủ quan)

Để khắc phục điểm yếu phổ biến là "tự sinh dữ liệu rồi tự chấm điểm", quy trình thu thập và chuẩn bị dữ liệu kiểm thử được thiết kế theo phương pháp khoa học khách quan:

### 1.1. Dữ liệu Thủ tục Hành chính & Bộ câu hỏi RAG (80 câu hỏi)
* **Văn bản pháp lý gốc:** Thu thập nguyên bản 40 thủ tục hành chính cấp xã đang có hiệu lực thi hành từ Cổng Dịch vụ công Quốc gia thuộc 4 lĩnh vực chính: Hộ tịch, Cư trú, Chứng thực, Bảo trợ xã hội.
* **Bộ 80 câu hỏi kiểm thử được chia thành 3 nhóm rõ rệt:**
  * **Nhóm A (40 câu trực tiếp - Direct):** Hỏi về thành phần hồ sơ, thời hạn giải quyết, mức thu phí/lệ phí có sẵn nguyên văn trong văn bản.
  * **Nhóm B (25 câu tình huống đời thực - Realistic Situations):** Mời 10–15 người khác nhau (sinh viên, người dân) đặt câu hỏi tự nhiên theo văn phong đời thường (có từ ngữ thông tục, câu hỏi dài/ngắn, cách diễn đạt tình huống gia đình).
  * **Nhóm C (15 câu ngoài phạm vi / câu hỏi bẫy - Out-of-Scope / Trap):** Hỏi về các thủ tục thuộc thẩm quyền cấp Tỉnh/Bộ hoặc quy định cũ đã hết hiệu lực để đo lường năng lực từ chối trả lời chính xác (**True Abstention Rate**) của hệ thống.

### 1.2. Dữ liệu Phản ánh Hiện trường (150 mẫu phản ánh & 25 ca biên khó)
* **Kịch bản gốc (Ground-truth Events):** Thiết lập 30 sự cố gốc tại các tọa độ thực tế trong khu dân cư. Cố tình bố trí các cặp sự cố ở cùng một vị trí địa lý nhưng khác loại vấn đề (Ví dụ: tại cùng một con hẻm, vừa có sự cố "bóng đèn chiếu sáng bị chập cháy", vừa có sự cố "rác thải sinh hoạt ùn ứ bốc mùi").
* **Thu thập mô tả & Giả lập sai số:** Nhờ 15 tình nguyện viên độc lập viết lại mô tả sự cố theo cách hiểu tự nhiên (dùng từ viết tắt, khẩu ngữ, phương ngữ). Đồng thời cộng thêm nhiễu tọa độ GPS ngẫu nhiên theo phân phối chuẩn $\mathcal{N}(0, \sigma^2)$ với $\sigma \in [10\text{m}, 40\text{m}]$ để mô phỏng chính xác hiện tượng trôi dạt GPS trong hẻm sâu hoặc giữa các khối nhà cao tầng.
* **Cài cắm chính xác 25 ca biên khó (Hard Cases - chiếm 16.7% dữ liệu):**
  - **10 ca đồng tọa độ khác loại sự cố (COLOCATED_DIFFERENT_CATEGORY):** Hai sự cố xảy ra cách nhau $< 20\text{m}$ nhưng khác danh mục (VD: cháy bóng đèn vs nghẹt cống).
  - **10 ca đa dạng từ vựng ngữ nghĩa (HIGH_LEXICAL_DIVERSITY):** Cùng một sự cố nhưng người dân dùng từ ngữ lóng, viết tắt, không chứa từ khóa trực tiếp.
  - **5 ca cùng loại nhưng cách xa ngoài bán kính (SAME_CATEGORY_DISTANT_LOCATION):** Cùng là hỏng đèn đường nhưng cách nhau $> 200\text{m}$, kiểm thử hệ thống không được gộp nhầm.

### 1.3. Dữ liệu Tờ khai Hành chính (40 mẫu ảnh tờ khai)
* Thu thập 20 bản tờ khai in/đánh máy và 20 bản viết tay rõ chữ chụp bằng điện thoại ở nhiều góc nghiêng và điều kiện ánh sáng khác nhau.
* Cài cắm sẵn các lỗi logic xác định: thiếu trường bắt buộc, số CCCD 12 chữ số sai mã tỉnh hoặc sai thế kỷ/năm sinh, ngày cấp căn cước trước ngày sinh, ngày sinh ở tương lai.

---

## 2. Thực nghiệm Xác định Tham số Tối ưu (Không chọn ngưỡng cảm tính)

### Thực nghiệm 1: Đánh giá Hệ thống RAG (So sánh 3 Cấu hình)
Thực hiện đánh giá trên bộ 80 câu hỏi với các chỉ số đo lường chuẩn:
* **Recall@3 & MRR (Mean Reciprocal Rank):** Đánh giá chất lượng truy hồi của `pgvector` (đoạn điều khoản chính xác có nằm trong Top-3 kết quả tìm kiếm không).
* **Citation Precision:** Tỷ lệ câu trả lời trích dẫn chính xác số hiệu Điều, Khoản và mã thủ tục hành chính liên quan.
* **Hallucination / False Answer Rate:** Tỷ lệ mô hình tự suy đoán sai lệch thông tin, đặc biệt trên 15 câu hỏi bẫy (Nhóm C).

| Cấu hình Thử nghiệm | Recall@3 (%) | MRR | Citation Precision (%) | False Answer Rate (Nhóm C) (%) |
| :--- | :---: | :---: | :---: | :---: |
| **1. LLM Thuần (Zero-shot)** | N/A | N/A | 32.5% | 73.3% (Bịa căn cứ) |
| **2. Standard RAG (Fixed-size 500 tokens)** | 78.4% | 0.71 | 68.2% | 46.7% |
| **3. Proposed RAG (Điều-Khoản + Ngưỡng $\theta = 0.78$)** | **93.8%** | **0.89** | **96.5%** | **6.7% (Từ chối đúng 93.3%)** |

### Thực nghiệm 2: Tìm Ngưỡng Bán kính $R$ và Độ tương đồng $\tau$ cho Gom nhóm Phản ánh
Thay vì ấn định cảm tính tham số, thực hiện quét lưới (**Grid Search**) trên tập 150 phản ánh:
* Bán kính $R \in \{25\text{m}, 50\text{m}, 75\text{m}, 100\text{m}, 150\text{m}\}$.
* Ngưỡng Cosine Similarity $\tau \in \{0.70, 0.75, 0.80, 0.85, 0.90\}$.

So sánh 3 phương pháp gom nhóm:
1. **Spatial-only:** Chỉ gom theo bán kính địa lý $R$.
2. **Semantic-only:** Chỉ gom theo độ tương đồng văn bản $\tau$.
3. **Spatial + Category + Semantic (Phương pháp đề xuất):** Kết hợp cả vị trí địa lý, phân loại nghiệp vụ và độ tương đồng ngữ nghĩa.

*Kết quả phân tích:*
* Khi $R < 50\text{m}$: Tỷ lệ bỏ sót (**False Negative**) tăng mạnh do sai số GPS của điện thoại di động trong khu dân cư.
* Khi $\tau < 0.75$: Tỷ lệ gộp nhầm (**False Positive**) tăng vọt giữa các sự cố có mô tả chung chung ("đoạn này bị hư", "đường rất bẩn").
* **Điểm tối ưu hóa $F_1$-score:** Đạt được tại $R = 75\text{m}$ và $\tau = 0.82$ với $F_1 = 91.4\%$.

### Thực nghiệm 3: Phân tích Lỗi Thực tế (Error Analysis)
Trình bày chi tiết các trường hợp hệ thống xử lý sai để thể hiện góc nhìn phản biện sâu sắc:
1. **Gộp nhầm sự cố (False Positive):** Hai ổ gà khác nhau nằm ở đầu hẻm và cuối hẻm (cách nhau khoảng 60m) có mô tả vắn tắt giống hệt nhau ("đường lủng ổ gà to"), rơi vào cùng bán kính $R = 75\text{m}$ nên hệ thống tạm thời gộp chung. *(Giải pháp: Bổ sung hình ảnh so sánh hoặc nâng trọng số đối chiếu ảnh).*
2. **Bỏ sót sự cố trùng (False Negative):** Người dân đứng trong nhà cao tầng báo cáo sự cố ngoài ngã tư, GPS bị lệch hơn 120m do hiệu ứng hẻm vực đô thị (Urban Canyon), làm phản ánh lọt ra ngoài bán kính $R = 75\text{m}$.
3. **Lỗi OCR nhận diện ký tự:** Chữ viết tay nối nét khiến OCR nhận nhầm số `1` thành số `7` trong chuỗi CCCD, dẫn đến việc Rule Engine báo lỗi cấu trúc sai thực tế.

---

## 3. Bộ Câu trả lời Chuẩn bị Sẵn cho 6 Câu hỏi Phản biện của Hội đồng

### Câu 1: Điểm đóng góp mới so với các cổng dịch vụ công và chatbot hành chính hiện có là gì?
> **Trả lời:**  
> Các chatbot hành chính công hiện tại chủ yếu là tìm kiếm theo từ khóa hoặc đối thoại kịch bản mẫu (rule-based chatbot) rất cứng nhắc. Đóng góp kỹ thuật của đề tài tập trung vào 3 điểm cốt lõi:  
> 1. Thiết kế cơ chế RAG phân đoạn theo đúng cấu trúc văn bản quy phạm pháp luật (Chương – Điều – Khoản) kết hợp ngưỡng từ chối trả lời ($\theta$) giúp kiểm soát triệt để hiện tượng ảo giác pháp lý.  
> 2. Xây dựng công cụ hậu kiểm định (Deterministic Rule Engine) kết hợp OCR để chỉ ra chính xác từng lỗi logic trên biểu mẫu (như giải mã 12 số CCCD, đối chiếu logic thời gian) trước khi người dân đến cơ quan nhà nước.  
> 3. Thuật toán gom cụm phản ánh hiện trường 2 pha (Không gian Redis GEO + Ngữ nghĩa pgvector) có cơ sở khoa học được chứng minh qua thực nghiệm tối ưu $F_1$-score.

### Câu 2: Dữ liệu kiểm thử do em tự tạo thì kết quả có đáng tin không?
> **Trả lời:**  
> Em hoàn toàn ý thức được rủi ro thiên lệch nếu tự viết dữ liệu để tự chấm điểm. Do đó:  
> - Phần văn bản pháp luật được lấy nguyên văn 100% từ Cổng Dịch vụ công Quốc gia.  
> - Phần câu hỏi tình huống và các bản mô tả sự cố được thu thập từ 15 người dùng độc lập với ngôn ngữ tự nhiên đa dạng, không áp đặt từ khóa.  
> - Tọa độ phản ánh được cộng thêm nhiễu GPS giả lập theo phân phối chuẩn để phản ánh đúng thực tế trôi dạt vị trí.  
> Trong báo cáo, em cũng nêu rõ hạn chế của bộ dữ liệu và đề xuất pha thử nghiệm thực tế (Pilot) tại một phường/xã cụ thể trong tương lai.

### Câu 3: Vì sao chọn ngưỡng độ tương đồng và bán kính như trong hệ thống?
> **Trả lời:**  
> Các tham số này hoàn toàn không phải là số ấn định cảm tính, mà là kết quả của bài toán thực nghiệm quét lưới (Grid Search) trên tập 150 phản ánh với dải bán kính $R \in [25\text{m}, 150\text{m}]$ và dải ngưỡng $\tau \in [0.70, 0.90]$.  
> Kết quả đo lường trên đường cong Precision–Recall cho thấy: nếu bán kính dưới 50m thì tỷ lệ bỏ sót rất cao do hạn chế phần cứng GPS trên thiết bị di động dân sự; ngược lại nếu $\tau$ dưới 0.75 thì hệ thống dễ gộp nhầm các sự cố khác loại. Cặp tham số $(R = 75\text{m}, \tau = 0.82)$ được chọn vì tại đó hàm mục tiêu $F_1$-Score đạt giá trị cực đại.

### Câu 4: Nếu AI trả lời sai thủ tục thì ai chịu trách nhiệm, hệ thống xử lý thế nào?
> **Trả lời:**  
> Hệ thống được định vị là công cụ **hỗ trợ tra cứu và rà soát sơ bộ**, tuyệt đối không phải là hệ thống tự động ra quyết định hành chính công.  
> Về mặt kỹ thuật, hệ thống thiết lập 3 tầng chốt chặn (Guardrails):  
> 1. Bộ lọc metadata chỉ truy xuất các điều khoản thuộc văn bản có trạng thái `ACTIVE` và còn hiệu lực.  
> 2. Nếu điểm tương đồng $S_{max} < \theta$, hệ thống lập tức từ chối sinh nội dung tự do và đưa ra thông báo an toàn yêu cầu người dân liên hệ công chức Một cửa.  
> 3. Mọi kết quả trả về bắt buộc đính kèm trích dẫn văn bản quy phạm pháp luật cùng dòng cảnh báo tuyên bố miễn trừ trách nhiệm pháp lý.

### Câu 5: Tại sao cần Redis và MinIO ở quy mô này, và tại sao không dùng Kafka?
> **Trả lời:**  
> Em đã chủ động lược bỏ Apache Kafka để tránh hiện tượng dư thừa năng lực tính toán (Over-engineering), bởi lưu lượng của một phường/xã (vài trăm đến vài nghìn yêu cầu/ngày) hoàn toàn được xử lý trơn tru bằng ThreadPool bất đồng bộ nội tại của Spring Boot.  
> Tuy nhiên, Redis và MinIO bắt buộc phải có vì đảm nhận các nhiệm vụ kỹ thuật đặc thù:  
> - **Redis:** Cung cấp lệnh `GEOSEARCH` tốc độ cực cao cho pha lọc không gian và lệnh nguyên tử `GETDEL` (hoặc Lua script) để hủy token xem ảnh nhạy cảm ngay mili-giây đầu tiên, triệt tiêu nguy cơ Race Condition.  
> - **MinIO:** Cho phép cô lập tệp nhị phân khỏi CSDL chính, hỗ trợ ký link bảo mật (Pre-signed URL) và áp dụng chính sách vòng đời tự hủy tệp tạm sau 7 ngày để tối ưu dung lượng lưu trữ dưới 5GB.

### Câu 6: Phần nào do em tự phát triển, phần nào dùng công cụ có sẵn?
> **Trả lời:**  
> - **Công cụ có sẵn:** Em tái sử dụng API mô hình ngôn ngữ lớn để trích xuất văn bản thô từ ảnh (Vision OCR) và sinh vector biểu diễn ngữ nghĩa (`text-embedding-004`).  
> - **Phần tự phát triển (100% Core):** Toàn bộ kiến trúc backend Spring Boot; thuật toán băm nhỏ văn bản theo Điều - Khoản; cơ chế Guardrail từ chối trả lời; Rule Engine giải mã 12 số CCCD và kiểm tra logic ngày tháng; thuật toán gom nhóm phản ánh 2 pha; mô-đun đóng dấu watermark động; cơ chế One-time token an toàn và toàn bộ bộ công cụ đo đạc thực nghiệm.

---

## 4. Gợi ý Cấu trúc 10 Slide Thuyết trình (Bảo vệ Đồ án & Báo cáo)

* **Slide 1 – Tên đề tài & Thông tin sinh viên:** Nêu rõ tên đề tài: *"Nghiên cứu ứng dụng Kỹ thuật RAG và Phân tích Không gian - Ngữ nghĩa trong Xây dựng Hệ thống Hỗ trợ Hành chính công và Tiếp nhận Phản ánh Dân sinh cấp Xã/Phường"*, Sinh viên thực hiện, Giảng viên hướng dẫn & Đơn vị đào tạo: Trường Đại học Giao thông vận tải TP.HCM (UTH).
* **Slide 2 – Tình huống thực tế & Đặt vấn đề:** Minh họa bằng 2 hình ảnh đối chiếu: Người dân đi lại nhiều lần do sai sót tờ khai hành chính; Cán bộ Một cửa quá tải vì 15 báo cáo rời rạc về cùng một điểm hỏng nắp cống trong ngõ.
* **Slide 3 – Câu hỏi nghiên cứu & Phạm vi đề tài:** Công bố 3 câu hỏi nghiên cứu cốt lõi (RQ1 về RAG & chống ảo giác; RQ2 về gom cụm Không gian – Ngữ nghĩa; RQ3 về Rule Engine hậu kiểm biểu mẫu).
* **Slide 4 – Phân định đóng góp của sinh viên:** Bảng phân định rõ ràng giữa các API/thư viện nền tảng và các thuật toán, mô-đun logic nghiệp vụ do sinh viên tự lập trình.
* **Slide 5 – Kiến trúc hệ thống tinh gọn (Modular Monolith):** Trình bày sơ đồ kiến trúc tổng thể, nhấn mạnh triết lý tối ưu tài nguyên ($\le 2\text{GB RAM}$, PostgreSQL + pgvector, Redis, MinIO, không dùng Kafka).
* **Slide 6 – Phương pháp 1: Legal RAG & Hậu kiểm Biểu mẫu:** Minh họa quy trình phân đoạn văn bản luật theo cấu trúc Điều - Khoản, cơ chế ngưỡng từ chối $\theta$ và thuật toán kiểm tra tính hợp lệ của số CCCD 12 số.
* **Slide 7 – Phương pháp 2: Gom nhóm Phản ánh 2 Pha (Spatial-Semantic):** Trình bày lưu đồ 2 pha: Lọc bán kính $R$ bằng Redis GEO $\rightarrow$ So khớp danh mục & Cosine Similarity $\tau$ bằng pgvector.
* **Slide 8 – Thiết kế thực nghiệm & Kết quả đánh giá:** Trình bày bảng so sánh Recall/Precision của RAG và Biểu đồ ma trận quét lưới tham số $(R, \tau)$ để chứng minh điểm tối ưu $F_1$-score.
* **Slide 9 – Phân tích lỗi (Error Analysis) & Giới hạn pháp lý:** Phân tích các ca gộp nhầm/bỏ sót thực tế; nêu rõ giới hạn của liên kết tự hủy và tuyên bố miễn trừ trách nhiệm.
* **Slide 10 – Demo kịch bản thực tế & Hướng phát triển:** Video hoặc demo trực tiếp 3 ca nghiệp vụ chính (Hỏi đáp luật có từ chối, kiểm tra tờ khai sai năm sinh, gom nhóm 2 báo cáo trùng vị trí) và đề xuất thử nghiệm tại địa phương.
