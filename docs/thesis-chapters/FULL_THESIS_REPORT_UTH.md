# TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI TP. HỒ CHÍ MINH (UTH)
## VIỆN ĐÀO TẠO CHẤT LƯỢNG CAO
### CHUYÊN NGÀNH: CÔNG NGHỆ THÔNG TIN

---

<br>
<br>

# BÁO CÁO HỌC KỲ DOANH NGHIỆP & ĐỒ ÁN TỐT NGHIỆP KỸ SƯ

<br>

### TÊN ĐỀ TÀI:
# SMARTWARD AI – HỆ THỐNG HỖ TRỢ THỦ TỤC HÀNH CHÍNH VÀ PHÂN LUỒNG PHẢN ÁNH CẤP PHƯỜNG/XÃ TÍCH HỢP AI CHỐNG ẢO GIÁC VÀ BẢO MẬT ZERO-TRUST

<br>
<br>

**Sinh viên thực hiện:** Trịnh Tuấn Khánh  
**Mã số sinh viên:** 2151050000  
**Lớp:** CN21CLC  
**Khóa:** 2021 – 2025  

**Giảng viên hướng dẫn:** TS. Lê Văn Quốc Anh  
**Đơn vị đào tạo:** Viện Đào tạo Chất lượng cao – Trường ĐH Giao thông vận tải TP.HCM  

**Cán bộ hướng dẫn Doanh nghiệp (Mentor):** Kỹ sư Trưởng Giải pháp Số  
**Đơn vị thực tập:** Viettel An Giang – Chi nhánh Tập đoàn Công nghiệp – Viễn thông Quân đội  

<br>
<br>

*TP. Hồ Chí Minh, Tháng 11 Năm 2026*

---

\newpage

# LỜI CAM ĐOAN

Tôi xin cam đoan bản báo cáo tốt nghiệp này là công trình nghiên cứu và phát triển phần mềm độc lập do chính tôi thực hiện dưới sự định hướng học thuật của Giảng viên hướng dẫn **TS. Lê Văn Quốc Anh** và sự đồng hành hướng dẫn nghiệp vụ thực tế của các kỹ sư tại **Viettel An Giang**.

Mọi số liệu thực nghiệm, kết quả đo đạc độ trễ, mức tiêu thụ tài nguyên phần cứng, biểu đồ khoa học và mã nguồn được trình bày trong báo cáo này là hoàn toàn trung thực, khách quan và được kiểm chứng thông qua bộ công cụ đánh giá tự động lưu trữ công khai trong kho mã nguồn dự án. Các đoạn trích dẫn lý thuyết, tài liệu nghiên cứu và thư viện nguồn mở đều được ghi nhận nguồn gốc xuất xứ rõ ràng theo đúng chuẩn mực đạo đức nghiên cứu học thuật của Trường Đại học Giao thông vận tải TP.HCM.

*TP. Hồ Chí Minh, ngày 04 tháng 11 năm 2026*  
**Sinh viên thực hiện**  
*(Ký và ghi rõ họ tên)*  
**Trịnh Tuấn Khánh**

---

\newpage

# LỜI CẢM ƠN

Để hoàn thành chương trình đào tạo kỹ sư Công nghệ Thông tin và hoàn thiện công trình nghiên cứu Đồ án Tốt nghiệp này, tôi xin bày tỏ lòng biết ơn sâu sắc và chân thành nhất đến:

Quý Thầy, Cô giáo **Khoa Công nghệ Thông tin** và **Viện Đào tạo Chất lượng cao – Trường Đại học Giao thông vận tải TP. Hồ Chí Minh (UTH)**, những người đã truyền dạy cho tôi nền tảng tri thức vững chắc về khoa học máy tính, kỹ thuật lập trình và phương pháp tư duy logic trong suốt 4 năm học tập dưới mái trường.

Đặc biệt, tôi xin gửi lời tri ân sâu sắc nhất tới **TS. Lê Văn Quốc Anh** – Giảng viên trực tiếp hướng dẫn đề tài. Thầy đã dành nhiều thời gian quý báu để định hướng phương pháp luận khoa học, rèn giũa tư duy phân tích toán học nghiêm ngặt cho bài toán phân luồng hai giai đoạn và chốt chặn chống ảo giác, đồng thời luôn động viên, khích lệ tôi kiên định theo đuổi giải pháp phần mềm tối ưu Zero-Cost.

Tôi xin chân thành cảm ơn Ban Giám đốc và các anh chị kỹ sư tại **Phòng Giải pháp Kinh doanh Doanh nghiệp – Viettel An Giang**, đặc biệt là Mentor hướng dẫn trực tiếp. Quý đơn vị đã tạo mọi điều kiện tốt nhất về môi trường làm việc, tài liệu nghiệp vụ hành chính công thực tế và môi trường kiểm thử để tôi có cơ hội cọ xát với các bài toán số hóa chính quyền cơ sở quy mô lớn.

Sau cùng, con xin gửi lời tri ân vô hạn đến Cha, Mẹ và Gia đình – điểm tựa tinh thần vững chắc nhất luôn đồng hành, yêu thương và tạo mọi điều kiện tốt nhất cho con trên con đường học tập và trưởng thành.

---

\newpage

# TÓM TẮT ĐỀ TÀI (ABSTRACT)

### Tóm tắt tiếng Việt:
Chuyển đổi số cấp xã, phường và thị trấn – cấp hành chính cơ sở gần dân nhất – hiện đang đối mặt với ba thách thức lớn: (1) Tỷ lệ hồ sơ hành chính bị sai sót thông tin logic cơ bản dẫn đến việc người dân phải đi lại nhiều lần; (2) Thiếu công cụ tự động phát hiện và gom cụm các phản ánh sự cố đô thị bị trùng lặp do nhiễu định vị GPS và ngôn từ tự do; (3) Nguy cơ rò rỉ dữ liệu cá nhân theo Nghị định số 13/2023/NĐ-CP cùng với rào cản ngân sách phần cứng hạn chế tại các địa phương.

Đề tài **SmartWard AI** giải quyết đồng thời các vấn đề trên thông qua bốn đóng góp kỹ thuật then chốt:
1. **Kiến trúc Legal RAG phân cấp:** Kết hợp nhúng ngữ nghĩa vector 768 chiều (text-embedding-004), chỉ mục đồ thị HNSW trên PostgreSQL pgvector và chốt chặn từ chối an toàn (Abstention Guardrail) tại ngưỡng tin cậy toán học $\theta = 0.78$. Đạt tỷ lệ truy xuất Recall@3 95.38%, MRR 0.912 và triệt tiêu 100.0% các câu hỏi bẫy ngoài thẩm quyền.
2. **Thuật toán Phân luồng Hiện trường Hai Giai đoạn (Two-Stage Spatial-Semantic Triage):** Kết hợp bộ lọc không gian Redis GEO ($R = 75\text{m}$) và bộ so khớp ngữ nghĩa vector pgvector ($\tau = 0.82$), đạt điểm Pareto tối ưu F1-Score 100.0% trên 150 phản ánh thực nghiệm, giảm độ trễ xử lý xuống còn $14.1\text{ ms}$ (nhanh hơn 13 lần so với phương pháp so sánh vector toàn cục).
3. **Kho bảo mật Zero-Trust Document Vault:** Hiện thực hóa cơ chế mã hóa đối xứng AES-256-GCM, thủy vân động chống giả mạo xoay chéo $-45^\circ$ trên Java2D và token xem một lần tự hủy (Single-Use Ephemeral Token) qua lệnh nguyên tử Redis `GETDEL` (mô phỏng HTTP 410 Gone), đồng thời duy trì nguyên tắc hành chính bất biến (*chỉ nhắc nhở người dân sửa bằng bút trên tờ khai giấy, không can thiệp sửa đổi trực tiếp trên màn hình*).
4. **Phân hệ Giao diện Web/PWA chuẩn GovTech:** Thiết kế từ Google Stitch qua giao thức Stitch MCP, đáp ứng hoàn hảo tiêu chuẩn responsive di động và máy tính cán bộ. Toàn bộ stack phần mềm 5 thành phần (PostgreSQL pgvector, Redis, MinIO, Spring Boot Backend, Nginx Frontend) hoạt động với tổng mức tiêu thụ RAM đỉnh chỉ $880\text{ MB} \le 2.0\text{ GB}$, bảo đảm 100% tiêu chí Zero-Cost về chi phí bản quyền và hạ tầng.

### Abstract in English:
Digital transformation at the ward and commune level—the grassroots tier of local governance in Vietnam—faces three critical bottlenecks: (1) High citizen application error rates in administrative forms causing repeated physical visits; (2) Inability to automatically detect and aggregate duplicate civic incident reports due to urban GPS noise and unstructured text descriptions; and (3) Stringent citizen data privacy mandates under Decree No. 13/2023/ND-CP constrained by severely limited local IT budgets.

The **SmartWard AI** project addresses these challenges through four foundational technical contributions:
1. **Hierarchical Legal RAG with Abstention Guardrail:** Integrates 768-dimensional semantic embeddings, HNSW graph indexing on PostgreSQL pgvector, and a mathematical confidence threshold $\theta = 0.78$. It achieves Recall@3 of 95.38%, MRR of 0.912, and a 100.0% True Abstention Rate on out-of-scope adversarial questions, completely eliminating hallucinations.
2. **Two-Stage Spatial-Semantic Incident Triage:** Seamlessly cascades Redis GEO spatial bounding ($R = 75\text{m}$) with pgvector cosine semantic verification ($\tau = 0.82$). The algorithm achieves Pareto-optimal 100.0% Precision, Recall, and F1-Score across 150 experimental civic reports while reducing end-to-end latency to $14.1\text{ ms}$ (13x faster than global vector comparisons).
3. **Zero-Trust Document Vault:** Enforces Decree 13 compliance through AES-256-GCM at-rest encryption, dynamic $-45^\circ$ diagonal fraud-prevention watermarking via Java2D, and single-use self-destruct tokens leveraging atomic Redis `GETDEL` commands (HTTP 410 Gone simulation), strictly upholding administrative integrity by requiring citizen paper-form corrections only.
4. **GovTech-Grade Web/PWA Frontend:** Designed in Google Stitch via Stitch MCP and implemented in React 18, Vite 6, and Leaflet. The complete five-tier containerized architecture operates at a peak RAM footprint of only $880\text{ MB} \le 2.0\text{ GB}$, fulfilling a 100% Zero-Cost licensing and deployment standard for grassroots public agencies.

---

\newpage

# DANH MỤC TỪ VIẾT TẮT

| Viết tắt | Thuật ngữ Tiếng Anh | Thuật ngữ Tiếng Việt |
| :--- | :--- | :--- |
| **AI** | Artificial Intelligence | Trí tuệ nhân tạo |
| **API** | Application Programming Interface | Giao diện lập trình ứng dụng |
| **CCCD** | Citizen Identity Card | Căn cước công dân gắn chip |
| **CSDL** | Database | Cơ sở dữ liệu |
| **GIS** | Geographic Information System | Hệ thống thông tin địa lý |
| **HNSW** | Hierarchical Navigable Small World | Cấu trúc đồ thị thế giới nhỏ phân cấp |
| **ILM** | Information Lifecycle Management | Quản lý vòng đời dữ liệu |
| **JSON** | JavaScript Object Notation | Định dạng trao đổi dữ liệu JSON |
| **kNN** | k-Nearest Neighbors | Thuật toán k láng giềng gần nhất |
| **LLM** | Large Language Model | Mô hình ngôn ngữ lớn |
| **MCP** | Model Context Protocol | Giao thức ngữ cảnh mô hình |
| **MRR** | Mean Reciprocal Rank | Điểm xếp hạng nghịch đảo trung bình |
| **OCR** | Optical Character Recognition | Nhận dạng ký tự quang học |
| **PWA** | Progressive Web App | Ứng dụng web cấp tiến |
| **RAG** | Retrieval-Augmented Generation | Truy xuất tăng cường tạo sinh |
| **REST** | Representational State Transfer | Kiến trúc truyền trạng thái đại diện |
| **TTHC** | Administrative Procedures | Thủ tục hành chính |
| **TTL** | Time-To-Live | Thời gian sống của dữ liệu bộ nhớ đệm |
| **UBND** | People's Committee | Ủy ban Nhân dân |
| **UTH** | University of Transport and Communications HCMC | Trường ĐH Giao thông vận tải TP.HCM |
| **UUID** | Universally Unique Identifier | Định danh duy nhất phổ quát |
| **VNeID** | Vietnam Electronic Identification | Ứng dụng định danh điện tử quốc gia |

---

\newpage

# DANH MỤC BẢNG BIỂU

- **Bảng 1.1:** So sánh định lượng phương pháp tiếp cận của Đề tài so với hệ thống truyền thống.
- **Bảng 2.1:** So sánh các thuật toán tìm kiếm vector lân cận gần nhất (kNN vs IVF vs HNSW).
- **Bảng 2.2:** Hệ sinh thái công nghệ lựa chọn và lý do kỹ thuật trong SmartWard AI.
- **Bảng 2.3:** Bảng phân bổ hạn ngạch bộ nhớ RAM trần trong tệp Docker Compose.
- **Bảng 3.1:** Đặc tả các Endpoint REST API cốt lõi của Backend Spring Boot.
- **Bảng 3.2:** Bảng mã trạng thái lỗi và thông điệp cảnh báo tiền kiểm định tờ khai CT01.
- **Bảng 4.1:** Cấu trúc chi tiết bộ dữ liệu kiểm thử thực nghiệm tổng hợp (Evaluation Dataset).
- **Bảng 4.2:** Kết quả quét lưới thô (Coarse Grid Search) cho 25 cặp siêu tham số $(R, \tau)$.
- **Bảng 4.3:** Kết quả quét lưới mịn (Fine Grid Search) tại $R = 75\text{m}$ xác định đỉnh Pareto $\tau = 0.82$.
- **Bảng 4.4:** Bảng so sánh đối đầu 3 phương pháp gom cụm phân luồng hiện trường.
- **Bảng 4.5:** Đánh giá định lượng so sánh 3 cấu hình RAG trên 80 câu hỏi kiểm thử.
- **Bảng 4.6:** Ma trận kiểm thử độ bền OCR Form Check trước các dạng suy giảm ảnh scan.
- **Bảng 4.7:** Bảng đo lường tài nguyên thực tế của hệ thống qua lệnh Docker Stats.

---

\newpage

# DANH MỤC HÌNH VẼ VÀ BIỂU ĐỒ

- **Hình 1.1:** Sơ đồ tổ chức Phòng Giải pháp Kinh doanh Doanh nghiệp – Viettel An Giang.
- **Hình 2.1:** Quy trình truy xuất ngữ nghĩa và chốt chặn Abstention Guardrail trong Legal RAG.
- **Hình 2.2:** Sơ đồ thuật toán phân luồng sự cố hiện trường hai giai đoạn (Spatial + Semantic).
- **Hình 2.3:** Cơ chế bảo mật tệp và Token tự hủy (Single-Use Token via Redis GETDEL).
- **Hình 3.1:** Sơ đồ kiến trúc tổng thể 4 tầng phân hệ của hệ thống SmartWard AI.
- **Hình 3.2:** Sơ đồ lớp dữ liệu quan hệ và vector nhúng trên PostgreSQL 16 (Entity-Relationship).
- **Hình 3.3:** Quy trình tương tác giữa công dân, cán bộ và kho bảo mật một lần (Sequence Diagram).
- **Hình 4.1:** Bản đồ nhiệt (F1 Heatmap) phân bố điểm F1-Score trên lưới siêu tham số $(R, \tau)$.
- **Hình 4.2:** Đường cong Precision - Recall - F1 tại bán kính tối ưu $R = 75\text{m}$.
- **Hình 4.3:** Biểu đồ cột so sánh đối đầu hiệu năng và độ trễ giữa 3 phương pháp Triage.
- **Hình 4.4:** Biểu đồ phân tích năng lực phân cụm trên 25 ca biên nhiễu GPS đối kháng.
- **Hình 4.5:** Đường cong đánh đổi giữa tỷ lệ bao phủ và nguy cơ ảo giác theo ngưỡng $\theta$.
- **Hình 4.6:** Biểu đồ đo đạc phân bổ bộ nhớ RAM thực tế của 5 container hệ thống.
- **Hình 5.1:** Giao diện Cổng Công dân (Legal RAG Chatbot & Bento Grid 4 thủ tục).
- **Hình 5.2:** Giao diện Tiền kiểm định tờ khai CT01 và Báo sự cố định vị GPS tự động.
- **Hình 5.3:** Giao diện Trung tâm chỉ huy phân luồng GIS Cán bộ (Leaflet OpenStreetMap).
- **Hình 5.4:** Giao diện Bàn sơ duyệt tờ khai với Watermark chống giả mạo và mô phỏng HTTP 410.

---

\newpage

# NỘI DUNG BÁO CÁO TOÀN VĂN (CHƯƠNG 1 ĐẾN CHƯƠNG 5)

*(Xem chi tiết từng chương tại các tệp tài liệu thành phần trong thư mục `docs/thesis-chapters/`):*
1. **Chương 1:** [Tổng quan Đề tài & Bối cảnh Thực tiễn](chapter-01.md)
2. **Chương 2:** [Cơ sở Lý thuyết & Công nghệ Nền tảng](chapter-02.md)
3. **Chương 3:** [Phân tích & Thiết kế Kiến trúc Hệ thống](chapter-03.md)
4. **Chương 4:** [Thực nghiệm, Đánh giá & Thảo luận Kết quả](chapter-04.md)
5. **Chương 5:** [Kết luận & Hướng Phát triển](chapter-05.md)

---

\newpage

# TÀI LIỆU THAM KHẢO

1. Quốc hội nước CHXHCN Việt Nam. (2014). *Luật Hộ tịch số 60/2014/QH13*. Ban hành ngày 20/11/2014.
2. Quốc hội nước CHXHCN Việt Nam. (2020). *Luật Cư trú số 68/2020/QH14*. Ban hành ngày 13/11/2020.
3. Quốc hội nước CHXHCN Việt Nam. (2023). *Luật Căn cước số 26/2023/QH15*. Ban hành ngày 27/11/2023.
4. Chính phủ nước CHXHCN Việt Nam. (2023). *Nghị định số 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân*. Ban hành ngày 17/04/2023.
5. Thủ tướng Chính phủ. (2022). *Quyết định số 06/QĐ-TTg phê duyệt Đề án phát triển ứng dụng dữ liệu về dân cư, định danh và xác thực điện tử phục vụ chuyển đổi số quốc gia giai đoạn 2022 - 2025 (Đề án 06/CP)*.
6. Lewis, P., et al. (2020). "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks". *Advances in Neural Information Processing Systems (NeurIPS 2020)*, 33, 9459-9474.
7. Malkov, Y. A., & Yashunin, D. A. (2018). "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs". *IEEE Transactions on Pattern Analysis and Machine Intelligence*, 42(4), 824-836.
8. Johnson, J., Douze, M., & Jégou, H. (2019). "Billion-scale similarity search with GPUs". *IEEE Transactions on Big Data*, 7(3), 535-547.
9. Sinnott, R. W. (1984). "Virtues of the Haversine". *Sky and Telescope*, 68(2), 159.
10. Dwork, C. (2008). "Differential Privacy: A Survey of Results". *Theory and Applications of Models of Computation*, 1-19.
11. Daemen, J., & Rijmen, V. (2002). *The Design of Rijndael: AES - The Advanced Encryption Standard*. Springer-Verlag.
12. Google DeepMind. (2024). *Gemini 1.5: Unlocking multimodal understanding across millions of tokens*. arXiv preprint arXiv:2403.05530.
