# CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ NỀN TẢNG

---

## 2.1. TỔNG QUAN CƠ CHẾ TRUY XUẤT TĂNG CƯỜNG TẠO SINH (RAG) VÀ BÀI TOÁN CHỐNG ẢO GIÁC TRONG HÀNH CHÍNH CÔNG

### 2.1.1. Khái niệm và Hạn chế của Mô hình Ngôn ngữ Lớn (LLM) Độc lập
Các mô hình ngôn ngữ lớn (Large Language Models - LLM) như GPT-4, Gemini, Claude sở hữu khả năng suy luận và tổng hợp ngôn ngữ tự nhiên vượt trội. Tuy nhiên, khi áp dụng trực tiếp vào lĩnh vực hành chính công và tư vấn thủ tục pháp lý, phương pháp LLM độc lập (Zero-shot / Direct Prompting) bộc lộ ba điểm nghẽn nghiêm trọng:
1. **Hiện tượng ảo giác tri thức (Hallucination):** LLM sinh từ dựa trên phân phối xác suất thống kê thay vì truy nguyên sự thật khách quan. Trong các câu hỏi lắt léo hoặc tình huống pháp lý chưa rõ ràng, mô hình có xu hướng tự "sáng tác" ra các điều luật, số nghị định hoặc thủ tục không hề tồn tại trong thực tế.
2. **Độ trễ cập nhật tri thức (Knowledge Cutoff):** Tri thức của mô hình bị đóng băng tại thời điểm hoàn tất huấn luyện. Các thông tư, nghị định và quy định cấp địa phương (đặc biệt là các văn bản quy phạm mới ban hành như Luật Căn cước 2023, Nghị định 13/2023/NĐ-CP) không thể được cập nhật tức thời nếu không tái huấn luyện tốn kém.
3. **Thiếu khả năng truy nguyên bằng chứng (Lack of Traceability):** Câu trả lời của LLM thuần túy không đi kèm trích dẫn pháp lý chính xác (Chương, Điều, Khoản cụ thể), khiến công dân và cán bộ tiếp nhận không thể đối chiếu giá trị pháp lý thực tế.

### 2.1.2. Kiến trúc Truy xuất Tăng cường Tạo sinh (Retrieval-Augmented Generation - RAG)
Để khắc phục triệt để các hạn chế trên, kiến trúc RAG kết hợp hai thành phần cốt lõi:
- **Bộ máy truy xuất tri thức (Retriever):** Tìm kiếm và trích xuất các đoạn văn bản pháp quy (chunks) có mức độ liên quan ngữ nghĩa cao nhất từ một kho ngữ liệu căn cứ có thẩm quyền.
- **Bộ máy tạo sinh ngôn ngữ (Generator):** Nhận ngữ cảnh đã truy xuất làm "tiền đề thông tin duy nhất" (grounding context) để tổng hợp câu trả lời mạch lạc bằng tiếng Việt tự nhiên cho công dân.

### 2.1.3. Cơ chế Nhúng Ngữ nghĩa (Vector Embedding) và Độ đo Tương đồng Cosine
Mỗi đoạn văn bản pháp lý $T$ được ánh xạ thành một vector đặc trưng $D$-chiều trong không gian thực $\mathbb{R}^D$ thông qua mô hình nhúng (text-embedding-004 với $D = 768$):
$$\mathbf{v} = \text{Embedding}(T) \in \mathbb{R}^{768}, \quad \|\mathbf{v}\|_2 = 1$$

Khi công dân gửi câu hỏi $Q$, câu hỏi được mã hóa thành vector truy vấn $\mathbf{q} \in \mathbb{R}^{768}$. Mức độ tương đồng ngữ nghĩa giữa câu hỏi $Q$ và đoạn văn bản $T$ được định lượng bằng độ tương đồng Cosine:
$$\text{Sim}(\mathbf{q}, \mathbf{v}) = \frac{\mathbf{q} \cdot \mathbf{v}}{\|\mathbf{q}\|_2 \|\mathbf{v}\|_2} = \sum_{i=1}^{768} q_i v_i$$
Do các vector đã được chuẩn hóa theo độ dài $L_2$ ($\|\mathbf{q}\| = \|\mathbf{v}\| = 1$), độ tương đồng Cosine quy về tích vô hướng (Inner Product), cho phép tăng tốc độ tính toán phần cứng tối đa.

### 2.1.4. Cấu trúc Chỉ mục Đồ thị HNSW (Hierarchical Navigable Small World)
Để tìm kiếm các vector lân cận gần nhất (k-Nearest Neighbors - kNN) trong hàng nghìn mảnh văn bản pháp lý mà không phải quét toàn bộ bảng dữ liệu ($\mathcal{O}(N)$), hệ thống sử dụng thuật toán đồ thị đa tầng HNSW được tích hợp trực tiếp trong extension `pgvector` của PostgreSQL 16.

HNSW tổ chức dữ liệu thành các tầng liên kết hình học:
- Tầng cao nhất gồm các bước nhảy dài (long-range links) cho phép định vị nhanh vùng lân cận tổng quát.
- Các tầng thấp hơn tăng dần mật độ nút để định vị chính xác vector đích.
- Độ phức tạp tìm kiếm tiệm cận: $\mathcal{O}(\log N)$, thời gian phản hồi thực tế dưới $5\text{ ms}$ cho cơ sở dữ liệu thủ tục cấp xã/phường.

Chỉ số cấu hình HNSW tối ưu cho SmartWard AI:
```sql
CREATE INDEX idx_legal_chunks_embedding_hnsw 
ON legal_chunks USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);
```

### 2.1.5. Chiến lược Phân mảnh Pháp lý Phân cấp (Hierarchical Legal Chunking)
Khác với văn bản thông thường được băm đều theo độ dài ký tự (Fixed-length chunking), văn bản quy phạm pháp luật Việt Nam có cấu trúc ngữ nghĩa phân cấp nghiêm ngặt: **Văn bản $\rightarrow$ Chương $\rightarrow$ Điều $\rightarrow$ Khoản $\rightarrow$ Điểm**.
Nếu cắt ngang xương câu văn bản, các ràng buộc pháp lý (như "ngoại trừ trường hợp quy định tại Khoản 2") sẽ bị đứt gãy, dẫn đến trích xuất sai lệch.

SmartWard AI áp dụng chiến lược **Legal Chunking theo ranh giới Điều/Khoản**:
- Mỗi chunk đại diện cho đúng một Điều hoặc Khoản hoàn chỉnh kèm metadata cấu trúc (`document_code`, `procedure_code`, `article_number`, `clause_number`).
- Kích thước đoạn: $300 - 600$ từ, trùng khớp hoàn hảo với cửa sổ ngữ cảnh tập trung của mô hình ngôn ngữ.

### 2.1.6. Chốt chặn Từ chối An toàn (Abstention Guardrail)
Nhằm triệt tiêu 100% tình trạng "ảo giác", hệ thống thiết lập cơ chế kiểm định ngưỡng tin cậy toán học:
$$\text{Answer}(Q) = \begin{cases}
\text{Generate}(\text{Context}, Q) & \text{nếu } \max_{i} \text{Sim}(\mathbf{q}, \mathbf{v}_i) \ge \theta \\
\text{Abstain}(\text{Disclaimer}) & \text{nếu } \max_{i} \text{Sim}(\mathbf{q}, \mathbf{v}_i) < \theta
\end{cases}$$
Với ngưỡng tối ưu thực nghiệm $\theta = 0.78$:
- Nếu độ tương đồng cao nhất của tài liệu truy xuất được dưới $0.78$, hệ thống chủ động phát tín hiệu từ chối trả lời (`abstained = true`), kèm hướng dẫn công dân liên hệ trực tiếp cán bộ chuyên trách tại Bộ phận Một cửa.
- Tuyệt đối không để LLM tự suy diễn đối với các câu hỏi nằm ngoài phạm vi pháp lý được phân quyền.

---

## 2.2. KỸ THUẬT PHÂN LUỒNG PHẢN ÁNH HIỆN TRƯỜNG 2 PHA (TWO-STAGE SPATIAL-SEMANTIC CLUSTERING)

### 2.2.1. Bài toán Tiếp nhận Phản ánh Dân sinh Cấp Phường/Xã
Khi xảy ra một sự cố hạ tầng đô thị (ví dụ: ngập úng ngã tư Võ Oanh - D2, sụt lún nắp hố ga, cây gãy chắn đường), nhiều người dân cùng lúc gửi phản ánh qua ứng dụng điện thoại. Mỗi người mô tả bằng văn phong và từ ngữ khác nhau:
- Người A: *"Ngập sâu đoạn trước trường UTH ngã tư D2 nước ngập nửa bánh xe."*
- Người B: *"Đường Võ Oanh ngập nặng xe chết máy la liệt cán bộ ơi."*
- Người C: *"Cống thoát nước đối diện số 15 Võ Oanh bị tắc nghẽn trào ngược."*

Nếu không có cơ chế phân luồng tự động, cán bộ trực ban sẽ nhận hàng chục thông báo riêng lẻ, dẫn đến phân tán nguồn lực và cử trùng lặp nhiều đội phản ứng nhanh đến cùng một địa điểm.

### 2.2.2. Hạn chế của Tiếp cận Đơn Lẻ (Single-Modal Limitations)
- **Nếu chỉ dùng Khoảng cách Địa lý (Spatial-only):** Dễ gộp nhầm các sự cố hoàn toàn khác loại xảy ra gần nhau. Ví dụ: một vụ "va chạm giao thông" và một điểm "đổ rác trộm" cách nhau $30\text{m}$ sẽ bị gom thành 1 sự việc duy nhất (Precision chỉ đạt $24.27\%$).
- **Nếu chỉ dùng Ngữ nghĩa Văn bản (Semantic-only):** Hai điểm "ngập nước" cách nhau $3\text{km}$ ở hai đầu địa bàn phường sẽ bị gộp chung vì cùng nói về ngập úng, khiến việc điều phối lực lượng hiện trường bị sai lệch hoàn toàn. Đồng thời việc so sánh vector ngữ nghĩa toàn cục tốn kém chi phí tính toán $\mathcal{O}(N)$.

### 2.2.3. Thuật toán Phân luồng Hai Giai đoạn (Two-Stage Triage Algorithm)
SmartWard AI đề xuất mô hình phân luồng kết hợp tuần tự:

```
[Công dân gửi phản ánh: (lat, lon, mô tả)]
                   │
                   ▼
       ┌───────────────────────┐
       │   PHA 1: LỌC ĐỊA LÝ   │ ──(Redis GEO: Bán kính R = 75m)
       └───────────────────────┘
                   │
      [k sự cố ứng viên lân cận]
                   │
                   ▼
       ┌───────────────────────┐
       │  PHA 2: SO KHỚP Ý NGHĨA│ ──(pgvector: Cosine Sim >= tau = 0.82)
       └───────────────────────┘
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
(Đạt ngưỡng: Gộp cụm)   (Không đạt: Tạo sự cố mới)
```

1. **Pha 1 - Lọc Không gian Thô (Spatial Pruning via Redis GEO):**
   - Sử dụng lệnh `GEORADIUS` với bán kính $R = 75\text{m}$ xung quanh tọa độ $(\text{lat}, \text{lon})$ của người báo.
   - Sàng lọc nhanh từ hàng nghìn sự cố xuống chỉ còn $k$ sự cố đang mở ($k \ll N$, thường $k \in [0, 5]$).
   - Độ phức tạp thời gian: $\mathcal{O}(\log M + k)$, thời gian xử lý: $< 1.5\text{ ms}$.

2. **Pha 2 - So khớp Ngữ nghĩa Mịn (Semantic Verification via pgvector Cosine):**
   - Chỉ tính toán độ tương đồng Cosine vector giữa phản ánh mới và $k$ sự cố ứng viên được sàng lọc từ Pha 1:
     $$\text{Sim}(\mathbf{e}_{\text{new}}, \mathbf{e}_{\text{cluster}}) \ge \tau = 0.82$$
   - Nếu $\max \ge 0.82$: Tự động gộp phản ánh mới vào cụm sự cố gốc hiện hữu, tăng chỉ số `reporters_count += 1`, cập nhật danh sách người chứng kiến.
   - Nếu $\max < 0.82$: Khởi tạo một cụm sự cố độc lập mới.

### 2.2.4. Công thức Khoảng cách Trắc địa Haversine
Khoảng cách mặt cầu giữa hai tọa độ $(\phi_1, \lambda_1)$ và $(\phi_2, \lambda_2)$ được tính bằng công thức Haversine với bán kính Trái Đất $R_{\text{earth}} \approx 6,371,000\text{ m}$:
$$\Delta\phi = \phi_2 - \phi_1, \quad \Delta\lambda = \lambda_2 - \lambda_1$$
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$d = 2 R_{\text{earth}} \arcsin\left(\sqrt{a}\right)$$
Redis GEO sử dụng mã hóa Geohash 52-bit, bảo đảm độ chính xác không gian sai lệch dưới $0.5\text{m}$.

---

## 2.3. QUY ĐỊNH PHÁP LÝ BẢO VỆ DỮ LIỆU CÁ NHÂN & KIẾN TRÚC ZERO-TRUST DOCUMENT VAULT

### 2.3.1. Ràng buộc Pháp lý từ Nghị định số 13/2023/NĐ-CP
Nghị định 13/2023/NĐ-CP về Bảo vệ Dữ liệu Cá nhân đặt ra các quy định ngặt nghèo đối với việc xử lý thông tin cá nhân trong cơ quan nhà nước:
- **Điều 9:** Quyền của chủ thể dữ liệu (công dân có quyền yêu cầu xóa, hạn chế xử lý dữ liệu sau khi hoàn thành phiên nghiệp vụ).
- **Điều 13:** Nghĩa vụ bảo vệ dữ liệu cá nhân cơ bản và nhạy cảm (Số CCCD, hình ảnh sinh trắc học, nơi cư trú, thông tin nhân thân).
- **Điều 17:** Các biện pháp kỹ thuật bắt buộc để chống thất thoát dữ liệu, rà quét lộ lọt và truy cập trái phép.

Nếu lưu trữ các bản scan tờ khai (CT01) và căn cước công dân trực tiếp trên máy chủ hoặc trả về đường dẫn tĩnh công khai (Public URL), nguy cơ rò rỉ dữ liệu công dân là cực kỳ lớn.

### 2.3.2. Mã hóa Dữ liệu Tĩnh AES-256-GCM (Encryption at Rest)
Mọi tệp hình ảnh giấy tờ công dân tải lên đều được mã hóa bằng thuật toán mã hóa khối đối xứng **AES-256-GCM** (Galois/Counter Mode) trước khi ghi xuống phân vùng lưu trữ MinIO:
- **Độ dài khóa:** 256 bits ($K \in \{0,1\}^{256}$).
- **Vector khởi tạo ngẫu nhiên (IV):** 12 bytes ngẫu nhiên cho mỗi tệp, chống tấn công replay.
- **Thẻ xác thực toàn vẹn (Auth Tag):** 128 bits, bảo đảm tệp tin không bị can thiệp hay sửa đổi trái phép ở mức nhị phân.

### 2.3.3. Kỹ thuật Thủy vân Động Chống Giả mạo (Dynamic Digital Watermarking)
Để ngăn ngừa cán bộ chụp màn hình rồi sử dụng bản scan cho mục đích thương mại phi pháp ngoài giờ làm việc, hệ thống chèn một lớp thủy vân động trực tiếp lên pixel ảnh trước khi hiển thị qua Java2D:
```
CHỈ DÙNG ĐỂ SƠ DUYỆT TẠI UBND PHƯỜNG 25 - [TIMESTAMP] - CÁN BỘ: [TÊN] - KHÔNG CÓ GIÁ TRỊ THỰC THI PHÁP LÝ
```
- Lớp thủy vân được xoay góc chéo $-45^\circ$, độ trong suốt $25\%$, rải đều toàn bộ bề mặt văn bản.
- Dù kẻ xấu chụp ảnh màn hình, bản chụp cũng không thể sử dụng để giao dịch dân sự hay làm giả hồ sơ bên ngoài.

### 2.3.4. Token Một Lần Tự Hủy (Single-Use Ephemeral Token via Redis GETDEL)
Hệ thống loại bỏ hoàn toàn cơ chế đường dẫn tĩnh:
1. Khi cán bộ mở hồ sơ, backend tạo một mã định danh ngẫu nhiên mã hóa an toàn: `tk_` + UUID v4.
2. Token này được lưu trữ trong Redis với thời gian sống (TTL) mặc định 24 giờ.
3. Khi trình duyệt gọi đến endpoint `/api/v1/vault/view/{token}`, Spring Boot thực thi lệnh nguyên tử `GETDEL`:
   ```bash
   REDIS EVAL "return redis.call('GETDEL', KEYS[1])" 1 smartward:vault:token:{token}
   ```
4. Dữ liệu ảnh được giải mã trong bộ nhớ đệm và stream trực tiếp ra luồng phản hồi HTTP.
5. Ngay sau khi tải xong, key trên Redis biến mất vĩnh viễn. Mọi lượt truy cập tiếp theo bằng token đó đều trả về mã lỗi **HTTP 410 Gone**, ngăn chặn tuyệt đối việc chia sẻ liên kết ra ngoài.

---

## 2.4. CÔNG NGHỆ NỀN TẢNG VÀ RÀNG BUỘC TÀI NGUYÊN ZERO-COST ($\le 2.0\text{ GB}$ RAM)

### 2.4.1. Hệ sinh thái Công nghệ Lựa chọn

| Tầng kiến trúc | Công nghệ sử dụng | Phiên bản | Lý do kỹ thuật & Lợi ích vận hành |
| :--- | :--- | :---: | :--- |
| **Backend Core** | Spring Boot | 3.3.5 | Hiệu năng cao, kiến trúc doanh nghiệp chuẩn mực, hỗ trợ Java 21 Virtual Threads tối ưu đa luồng. |
| **Ngôn ngữ Backend** | Java OpenJDK (Temurin) | 21 LTS | Hỗ trợ Pattern Matching, Record Classes, Garbage Collector G1 tối ưu bộ nhớ heap. |
| **Cơ sở Dữ liệu Chính** | PostgreSQL + pgvector | 16-1.0 | Quản lý đồng thời dữ liệu quan hệ ACID và vector nhúng 768 chiều với chỉ mục HNSW. |
| **Bộ nhớ đệm & Tốc độ** | Redis Alpine | 7.2 | Hỗ trợ cấu trúc địa không gian (GEO), In-memory Caching, Rate-limiting và Single-Use Tokens. |
| **Lưu trữ Đối tượng** | MinIO Object Storage | Latest | Chuẩn tương thích AWS S3, tự động quản lý vòng đời tệp (ILM) và mã hóa an toàn. |
| **Frontend Framework** | React + TypeScript + Vite | 18.3 / 6.0 | Tốc độ đóng gói siêu nhanh, kiểm soát kiểu dữ liệu chặt chẽ, hỗ trợ PWA offline. |
| **CSS & Design System** | TailwindCSS + Stitch | 3.4 | Hệ thống Utility-first tuân thủ chặt chẽ design tokens chuẩn GovTech từ Google Stitch. |
| **Bản đồ GIS** | Leaflet OpenStreetMap | 1.9 | Nhẹ, không tốn chi phí bản quyền Google Maps API, hiển thị mượt mà trên trình duyệt. |

### 2.4.2. Ràng buộc và Phân bổ Ngân sách Tài nguyên Zero-Cost
Nhằm bảo đảm giải pháp có thể triển khai thành công tại các máy chủ cũ của UBND Phường/Xã (thường là máy tính văn phòng có RAM $4\text{ GB}$ hoặc máy chủ dùng chung có phân bổ ảo hóa $\le 2\text{ GB}$), toàn bộ hệ thống được đặt giới hạn tài nguyên cứng trong `docker-compose.yml`:

$$\sum \text{RAM}_{\text{limit}} = 512\text{MB (Postgres)} + 128\text{MB (Redis)} + 256\text{MB (MinIO)} + 768\text{MB (Backend)} + 64\text{MB (Frontend)} = 1,728\text{ MB} \le 2,048\text{ MB}$$

Thực tế kiểm thử vận hành cho thấy toàn bộ hệ sinh thái tiêu thụ mức RAM đỉnh chỉ **$880\text{ MB}$**, đáp ứng vượt mức mong đợi bài toán Zero-Cost License & Low Hardware Resource Footprint.
