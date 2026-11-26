# TÀI LIỆU NỘI DUNG THUYẾT TRÌNH & KỊCH BẢN CANVA — SMARTWARD AI

> **Đề tài:** SmartWard AI (V-SmartWard AI) — Nền tảng hỗ trợ tiếp nhận thủ tục hành chính và điều phối phân luồng phản ánh hiện trường cấp xã/phường tích hợp trí tuệ nhân tạo.  
> **Sinh viên thực hiện:** Nguyễn Minh Tuấn Khanh — MSSV: `089205023490` — Lớp: `CN2301CLCB`  
> **Giảng viên hướng dẫn:** TS. Lê Văn Quốc Anh (Trường ĐH Giao thông vận tải TP.HCM – UTH)  
> **Đơn vị thực tập & Mentor:** Viettel An Giang — Mentor: Lê Thanh Lâm (Phòng Giải pháp Kinh doanh Doanh nghiệp)  
> **Thời lượng thuyết trình mục tiêu:** 12 – 15 phút trình bày + 3 – 5 phút Demo trực tiếp + Hỏi đáp Hội đồng.

---

## PHẦN 1. HỒ SƠ THÔNG TIN CHI TIẾT DỰ ÁN (NGUỒN DỮ LIỆU ĐỂ ĐƯA LÊN SLIDE)

Toàn bộ con số và nhận định dưới đây đã được đồng bộ 100% với báo cáo [BAO_CAO_HKDN_da_cap_nhat (1).docx](file:///E:/SmartWardAI/docs/weekly-reports/BAO_CAO_HKDN_da_cap_nhat%20(1).docx) và trạng thái mã nguồn thực tế:

### 1.1. Định vị cốt lõi & Bối cảnh bài toán
* **Câu định vị 1 dòng (Elevator Pitch):** SmartWard AI là **bộ đệm tiền kiểm và trợ lý hướng dẫn thủ tục hành chính** đứng trước Bộ phận Một cửa UBND cấp xã/phường — **không thay thế quyết định pháp lý của cán bộ và không tự động phê duyệt hồ sơ**.
* **Địa bàn mục tiêu:** Tỉnh An Giang có **102 đơn vị hành chính cấp xã** theo phương án sắp xếp mới. Hệ thống đã nạp danh mục và đa giác ranh giới của **96 đơn vị** (`79` xã, `14` phường, `3` đặc khu: Phú Quốc, Kiên Hải, Thổ Châu); **6 xã còn lại** đang chờ đồng bộ dữ liệu ranh giới thật (không tự vẽ ranh giới giả lập).
* **Hai nút thắt thực tế tại cấp xã:**
  1. **Sai sót hồ sơ hành chính:** Người dân khai sai cấu trúc CCCD 12 số, nhầm logic ngày tháng, thiếu giấy tờ hoặc xem văn bản hết hiệu lực $\rightarrow$ hồ sơ bị trả lại 1–3 lần, gây quá tải cho cán bộ Một cửa. Nếu dùng LLM thuần để tư vấn thì gặp rủi ro **bịa căn cứ pháp lý (legal hallucination)**.
  2. **Phản ánh hiện trường trùng lặp, phân mảnh:** Nhiều người dân báo cùng một sự cố (ổ gà, ngập nước, đứt dây điện) bằng lời lẽ khác nhau; GPS trong hẻm sâu sai số 40–120 m; người dân không biết sự cố thuộc địa bàn UBND xã/phường nào để gửi.
* **Khung pháp lý bảo vệ dữ liệu cá nhân:** Định hướng theo **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15** và **Nghị định 356/2025/NĐ-CP** (hiệu lực từ `01/01/2026`, thay thế Nghị định 13/2023/NĐ-CP; nhóm ghi nhận trung thực là chưa đọc toàn văn bản gốc nên áp dụng nguyên tắc tối thiểu hóa dữ liệu và thông báo trung tính trên giao diện).

### 1.2. Kiến trúc hệ thống & Ngân sách RAM 2.048 MiB (Zero Headroom)
* **Quyết định kiến trúc:** Chọn **Modular Monolith (Spring Boot 3.3.5 / Java 21)** kết hợp **1 Local AI Sidecar (Python FastAPI)** trong cùng một **Monorepo** (`backend/`, `frontend/`, `mobile/`, `ml/`) thay vì Microservices + Kafka, nhằm vừa khít trần phần cứng **2.048 MiB RAM (2,0 GiB)**.
* **Bảng phân bổ ngân sách RAM 6 Container (cộng đúng 2.048 MiB, dư 0 MiB):**

| STT | Container | Công nghệ chính | Trần RAM (`mem_limit`) | Mức dùng tham chiếu | Vai trò |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `smartward-backend` | Spring Boot 3.3.5, Java 21 (`-Xmx512m`) | **768 MiB** | `~380 MiB` | Toàn bộ REST API, 5 mô-đun nghiệp vụ, RBAC |
| 2 | `smartward-postgres` | PostgreSQL 16 + `pgvector` (HNSW) | **448 MiB** | `~110 MiB` | 12 bảng dữ liệu quan hệ & vector 768 chiều (`V1..V14`) |
| 3 | `smartward-ai-sidecar` | FastAPI + PhoBERT ONNX INT8 + Piper TTS | **384 MiB** | `~210 MiB` | Vector hóa 768d, phân loại ý định, đọc giọng nói miền Tây |
| 4 | `smartward-minio` | MinIO S3-Compatible | **256 MiB** | `~65 MiB` | Lưu trữ tệp `.enc` đã mã hóa `AES-256-GCM` |
| 5 | `smartward-redis` | Redis 7.2.5 (`AOF` + `noeviction`, `GEORADIUS`) | **128 MiB** | `~18 MiB` | Chỉ mục bán kính 25 m, token `OTT_`, thu hồi phiên, cache, rate limit |
| 6 | `smartward-frontend` | React 18.3, Vite 6, Tailwind 3.4, Nginx 1.27 | **64 MiB** | `~12 MiB` | Phục vụ Web PWA (`~149 KB` gzip) & Reverse Proxy |
| — | **Tổng cộng** | **6 Container thường trực** | **2.048 MiB** | **`~795 MiB`** | **Đúng bằng trần 2,0 GiB (0 MiB dự phòng)** |

* **Mô hình dữ liệu & 3 vai trò:**
  * **14 phiên bản Flyway (`V1..V14`)** quản lý **12 bảng PostgreSQL** (chia 5 nhóm: Nội dung & RAG, Hồ sơ & Tờ khai, Sự cố GIS, Kho bảo mật Vault, Người dùng & Audit) + **3 bảng SQLite ngoại tuyến** trên Mobile (`cached_procedures`, `wallet_qr_passes`, `offline_incident_queue`).
  * **3 vai trò:** Công dân (không cần PIN), Cán bộ Một cửa cấp xã (cách ly theo đúng `ward_code`), Quản trị viên cấp tỉnh (giám sát liên xã chỉ đọc, phê duyệt nội dung TTHC, cấp PIN 1 lần).

### 1.3. Năm mô-đun kỹ thuật cốt lõi (Viết theo cấu trúc: Vấn đề $\rightarrow$ Quyết định $\rightarrow$ Cơ chế)
1. **Mô-đun 1 – Legal RAG có Chốt chặn Hai ngưỡng & Hàng đợi HITL (`RQ1`):**
   * Cắt văn bản 40 TTHC theo cấu trúc **Chương – Điều – Khoản**, chỉ truy xuất bản `PUBLISHED`.
   * **Hai ngưỡng an toàn:**
     * $S_{\max} \ge \theta = 0,78$: Tổng hợp câu trả lời theo khuôn 5 phần + **hậu kiểm mã trích dẫn** (loại bỏ mọi mã không thuộc Top-K thực tế).
     * $0,42 \le S_{\max} < 0,78$ *(Vùng xám)*: Từ chối trả lời tự do, đẩy câu hỏi vào bảng `hitl_gray_zone_queue` trên PostgreSQL để cán bộ giải đáp (Human-in-the-Loop).
     * $S_{\max} < \theta_{\text{lower}} = 0,42$: Từ chối an toàn ngoài phạm vi.
   * *Lưu ý trung thực:* Ngưỡng tương đồng giúp giảm mạnh rủi ro sinh chữ ngoài nguồn, không thay thế thẩm định pháp lý 100%.
2. **Mô-đun 2 – Tiền kiểm Tờ khai Tất định (Deterministic Rule Engine), Nộp hồ sơ & SLA trung thực (`RQ3`):**
   * **Chốt chặn chất lượng ảnh tại thiết bị (Vision Quality Gate):** kiểm tra độ sáng, độ nét trên Web Canvas / Mobile trước khi OCR; quét trực tiếp mã **QR trên thẻ CCCD**.
   * **Rule Engine thuần Java/TypeScript (không để AI đoán luật):** kiểm tra 4 nhóm tờ khai (`CT01` cư trú, `TK-KS` khai sinh, `TK-KH` kết hôn, `TK-BTXH` bảo trợ xã hội) về CCCD 12 số (63 mã tỉnh, chữ số thế kỷ/giới tính, năm sinh), logic ngày tháng, tuổi kết hôn tính đến từng ngày, đối chiếu chéo giấy chứng sinh. Khi độ tin cậy OCR $< 0,70$ thì gắn cờ `MANUAL_REVIEW_REQUIRED`.
   * **SLA trung thực:** Khi nộp hồ sơ (`idempotencyKey`, tra cứu bằng mã hồ sơ + 4 số cuối CCCD), nếu thủ tục chưa được xác minh cột `sla_working_days` (`NULL`), hệ thống hiển thị rõ **“Chưa xác định (chờ cán bộ Một cửa xác nhận)”** chứ không gán hạn giả định.
3. **Mô-đun 3 – Gom cụm Phản ánh Hiện trường 2 Pha (`Two-Stage Spatial-Semantic Triage` – `RQ2`):**
   * **Định vị & Ranh giới:** Lấy GPS hoặc kéo thả ghim trên Google Maps (dự phòng Leaflet/OSM); ghi nhận `location_source` (`GPS`, `PIN_DRAGGED`) và chặn tọa độ mặc định tâm xã (`WARD_DEFAULT`) khi chưa xác nhận; kiểm tra đa giác ranh giới 96/102 xã (dung sai `300 m`) và gợi ý chuyển xã nếu chọn lệch; số điện thoại liên hệ là **tùy chọn**.
   * **Gom cụm 2 pha:** Pha 1 dùng Redis `GEORADIUS` lọc cụm đang mở trong bán kính $R$ mét (cửa sổ 72 giờ); Pha 2 lọc cùng danh mục (chuẩn hóa 5 loại sự cố) và độ tương đồng ngữ nghĩa Cosine $\ge \tau$.
   * **Bảo vệ quyền riêng tư vị trí:** API công khai làm tròn tọa độ `%.3f` và ẩn địa chỉ chi tiết; API cán bộ hiển thị chi tiết theo địa bàn kèm nút dẫn đường Google Maps.
4. **Mô-đun 4 – Kho Tài liệu Bảo mật Zero-Trust Vault:**
   * Kiểm tra magic bytes (`%PDF`, `JPEG`, `PNG`), chặn ảnh $> 4096 \times 4096\text{ px}$ ($> 5\text{ MB}$).
   * Đóng **Watermark chéo động** bằng Java2D ($\alpha = 0,38$) ghi rõ mục đích sơ duyệt và dấu thời gian.
   * Mã hóa **AES-256-GCM** (IV 12 byte ngẫu nhiên, khóa 32 byte, `fail-closed` nếu thiếu khóa hoặc Redis đầy).
   * **Token xem một lần (`OTT_`):** Lưu trên Redis (`AOF` + `noeviction`, TTL 24 giờ). **Chỉ đánh dấu đã xem và xóa token sau khi tải tệp từ MinIO và giải mã thành công** (bảo toàn token nếu lỗi mạng giữa chừng); lần mở thứ hai trả `HTTP 410 Gone`.
5. **Mô-đun 5 – Phân quyền RBAC, Quản trị tri thức Maker-Checker & Mobile Offline:**
   * **RBAC & PIN 1 lần:** Backend cưỡng chế JWT/RBAC, cách ly địa bàn theo `ward_code`; cấp PIN 1 lần có hạn 24 giờ, bắt buộc đổi PIN ở lần đăng nhập đầu (`must_change_pin`).
   * **Maker-Checker:** Chu trình `DRAFT` $\rightarrow$ `PENDING_REVIEW` $\rightarrow$ xem Diff $\rightarrow$ `PUBLISHED` / `REJECTED` / `SUPERSEDED` và Rollback. **Người tạo đề xuất không được tự phê duyệt**; mọi thao tác ghi vào `audit_log` có trigger PostgreSQL chặn `UPDATE/DELETE/TRUNCATE`.
   * **Mobile Offline (Expo SDK 52):** Lưu 3 bảng SQLite cục bộ giúp tra cứu 40 TTHC, mở Ví phiếu hẹn QR (`SMARTWARD_PASS`) và lưu hàng đợi báo cáo sự cố ngay cả khi mất sóng.

### 1.4. Kết quả Thực nghiệm (`RQ1–RQ3`) & Bằng chứng Kiểm thử
* *(Lưu ý phương pháp: Số liệu đo trên 3 bộ dữ liệu tổng hợp do nhóm tự xây dựng sau khi đã loại bỏ hoàn toàn lỗi rò rỉ nhãn ground-truth leakage).*
* **RQ1 – Legal RAG (80 câu: 65 câu trong phạm vi, 15 câu bẫy ngoài phạm vi):**
  * **LLM Zero-shot (mốc tham chiếu):** Citation Precision `32,5%`, Trả lời sai câu bẫy `73,3%`, Từ chối đúng `26,7%`.
  * **RAG chuẩn ($\theta = 0,42$):** Recall@3 `86,2%`, MRR `0,79`, Citation Precision `86,2%`, Trả lời sai câu bẫy `100,0%`.
  * **RAG đề xuất (Chunking Điều–Khoản + $\theta = 0,78$):** Giữ nguyên Recall@3 `86,2%` và MRR `0,79`, tăng Citation Precision lên **`97,6%`** (`+11,4` điểm %) và **giảm tỷ lệ trả lời sai câu bẫy từ `100,0%` xuống `6,7%`** (`14/15` câu bẫy được chặn đúng).
* **RQ2 – Gom cụm Phản ánh 2 Pha (150 phản ánh = 30 sự cố gốc × 5 biến thể, chia theo thời gian 90 Dev / 60 Held-out):**
  * **Toàn tập (150 báo cáo):** Chỉ vị trí ($R = 50\text{ m}$) đạt Precision `43,03%`, F1 `58,77%`; Chỉ ngữ nghĩa ($\tau = 0,75$) đạt F1 `88,24%`; **Kết hợp 2 pha ($R = 50\text{ m}, \tau = 0,75$)** đạt **Precision `100,0%`**, Recall `80,0%`, **F1 `88,89%`**.
  * **Kiểm định mù trên tập Held-out (60 báo cáo):**
    * Cấu hình tối ưu thực nghiệm $(R = 50\text{ m}, \tau = 0,75)$: **Precision `100,0%`**, Recall `70,0%`, **F1 `82,35%`**.
    * Cấu hình bán kính hẹp đô thị $(R = 25\text{ m}, \tau = 0,80)$: **Precision `100,0%`**, Recall `62,0%`, **F1 `76,54%`**.
    * Cấu hình ngưỡng cao $(R = 25\text{ m}, \tau = 0,82)$: Precision `100,0%` nhưng Recall trên TF-IDF sụt còn `20,0%` (`F1 = 33,33%`) $\rightarrow$ bài học thực nghiệm để hạ ngưỡng TF-IDF về `0,80` hoặc chuyển sang vector PhoBERT.
* **RQ3 – Rule Engine tờ khai (40 tờ khai mẫu: 20 đánh máy, 20 viết tay có cài lỗi):** Phát hiện `100%` lỗi cấu trúc CCCD và lỗi logic ngày tháng đã cài, `0%` báo nhầm trên mẫu hợp lệ (trên bộ dữ liệu tổng hợp).
* **Kiểm thử phần mềm (đo ngày `20/11/2026`, nhánh `bugfix/hardening-vault-redis-sla-hitl` – commit `2bf4865`):**
  * **Backend:** `537` ca kiểm thử trên hơn 50 lớp (`535` PASS, `0` lỗi, `2` skipped).
  * **Web Frontend:** `11/11` bộ kiểm thử hồi quy và build tĩnh (`tsc -b && vite build`) PASS.
  * **Mobile App:** `9/9` tệp Vitest với `76/76` ca PASS, `0` lỗi TypeScript.

### 1.5. Bài học xương máu & Hạn chế trung thực (Điểm cộng lớn với Hội đồng)
* **5 Bài học kỹ thuật lớn nhất:**
  1. *489 unit test PASS nhưng ứng dụng không khởi động được* do 2 dịch vụ thiếu `@Autowired` khi có nhiều constructor $\rightarrow$ Bài học: Unit test với mock không thay thế được bài kiểm thử khởi động thật (`RealDatabaseAndRedisBootSmokeTest` + `/api/v1/health`).
  2. *Kết quả thực nghiệm ban đầu đạt 100% bất thường* do script đánh giá vô tình đọc nhãn `ground-truth` $\rightarrow$ Bài học: Kết quả hoàn hảo là tín hiệu phải nghi ngờ; đã viết lại hoàn toàn bộ đánh giá mù nhãn và tách tập Held-out theo thời gian.
  3. *Dữ liệu pháp lý cào tự động lẫn chữ “UBND TP Đà Nẵng”, “Bộ Ngoại giao”* $\rightarrow$ Bài học: Dữ liệu pháp lý bắt buộc phải qua quy trình con người duyệt (**Maker-Checker**) và ẩn SLA (`NULL`) khi chưa xác minh.
  4. *Thứ tự xóa token Vault và Redis `volatile-lru`* có thể làm mất token của người dân khi lỗi mạng $\rightarrow$ Đổi sang xóa token **sau khi giải mã thành công** và bật Redis `noeviction` + `AOF`.
  5. *Lệch mã danh mục giữa Web, Mobile và Backend* $\rightarrow$ Chuẩn hóa tại một nguồn sự thật ở Backend.
* **Hạn chế đã biết & 5 việc ưu tiên trước khi triển khai thí điểm:**
  1. Bật Docker daemon trên máy chủ để chạy nghiệm thu `RealDatabaseAndRedisBootSmokeTest` và đo `docker stats` dưới tải thật.
  2. Nhờ chuyên viên xác minh 5–10 TTHC ưu tiên để kích hoạt `sla_working_days` thật (hiện 40/40 đang để `NULL`).
  3. Nạp nốt dữ liệu đa giác ranh giới cho **6/102 xã** còn thiếu của tỉnh An Giang.
  4. Tách tài khoản DB riêng chỉ có quyền `SELECT, INSERT` cho bảng `audit_log` và gỡ nút đăng nhập nhanh trên giao diện demo.
  5. Bổ sung mã hóa tệp SQLite trên Mobile và kịch bản sao lưu tự động (`pg_dump`, `mc mirror`).

---

## PHẦN 2. KỊCH BẢN THUYẾT TRÌNH VỚI CANVA (14 SLIDE CHUẨN — ĐỦ Ý, TRỰC QUAN)

### Gợi ý Thiết kế (Design System) trên Canva
* **Tỷ lệ khung hình:** Presentation `16:9` (1920 × 1080 px).
* **Bảng màu GovTech chuyên nghiệp:**
  * Nền chính: Trắng sáng `#F8FAFC` (giúp máy chiếu trong phòng bảo vệ hiển thị rõ nhất, không dùng toàn bộ nền đen trừ Slide bìa).
  * Màu chủ đạo (Primary): Xanh dương hành chính `#1E40AF` hoặc `#1F4ED8`.
  * Màu nhấn (Accent): Xanh lá kiểm chứng `#16A34A` (cho thông số Đạt / Pass) và Đỏ cảnh báo `#DC2626` (cho Chốt chặn / Lỗi bị chặn).
  * Chữ chính: Đen xám đậm `#0F172A`.
* **Phông chữ trên Canva hỗ trợ tiếng Việt đẹp:** **Be Vietnam Pro**, **Inter**, hoặc **Montserrat** (Tiêu đề `28–36 pt` Bold; Nội dung `16–20 pt`; Bảng số liệu `14–16 pt`).
* **Quy tắc vàng:** Mỗi slide không quá **3 khối thông tin**; ưu tiên **Sơ đồ luồng + Con số to + Ảnh chụp màn hình thật** từ dự án.

---

### Chi tiết từng Slide (Bố cục Canva + Nội dung hiển thị + Lời thuyết trình)

---

#### SLIDE 1: TRANG BÌA (TITLE SLIDE)
* **Thời lượng:** 45 giây
* **Bố cục Canva:** Nền xanh đậm `#0F172A`, vạch dọc màu xanh lam `#1F4ED8` bên trái. Bên phải đặt mockup 2 thiết bị (màn hình Web Bàn điều hành Cán bộ + khung điện thoại Mobile App công dân).
* **Nội dung chữ trên Slide:**
  * **SMARTWARD AI (V-SMARTWARD AI)**
  * *Nền tảng hỗ trợ tiếp nhận thủ tục hành chính và điều phối phân luồng phản ánh hiện trường cấp xã/phường tích hợp trí tuệ nhân tạo*
  * Sinh viên thực hiện: **Nguyễn Minh Tuấn Khanh** (MSSV: `089205023490` – Lớp: `CN2301CLCB`)
  * Giảng viên hướng dẫn: **TS. Lê Văn Quốc Anh** (UTH)
  * Đơn vị thực tập & Mentor: **Viettel An Giang** – Mentor: **Lê Thanh Lâm**
* **Lời thuyết trình (Speaker Script):**
  > *"Kính chào Hội đồng và các bạn. Em là Nguyễn Minh Tuấn Khanh. Hôm nay em xin báo cáo kết quả Học kỳ doanh nghiệp tại Viettel An Giang với đề tài: SmartWard AI — Nền tảng hỗ trợ tiếp nhận thủ tục hành chính và điều phối phản ánh hiện trường cấp xã/phường tích hợp trí tuệ nhân tạo, dưới sự hướng dẫn của TS. Lê Văn Quốc Anh và anh Lê Thanh Lâm."*

---

#### SLIDE 2: BÀI TOÁN THỰC TIỄN & ĐỊNH VỊ HỆ THỐNG
* **Thời lượng:** 1 phút
* **Bố cục Canva:** Phía trên là 1 thanh Banner nổi bật (Câu định vị). Ở giữa chia 2 thẻ (Card) đối xứng: *Bài toán 1* và *Bài toán 2*. Phía dưới là 3 ô số liệu lớn (Stat Callouts).
* **Nội dung chữ trên Slide:**
  * **Định vị:** *Bộ đệm tiền kiểm & Trợ lý hướng dẫn đứng trước Bộ phận Một cửa — Không thay thế công chức, không tự động duyệt hồ sơ.*
  * **Card 1 – Sai sót hồ sơ giấy:** Sai cấu trúc CCCD 12 số, mâu thuẫn ngày tháng, thiếu thành phần hồ sơ $\rightarrow$ đi lại 1–3 lần; LLM thuần có rủi ro **bịa căn cứ pháp lý**.
  * **Card 2 – Phản ánh hiện trường phân mảnh:** Nhiều người báo trùng một sự cố bằng từ ngữ khác nhau; GPS trong hẻm lệch 40–120 m; khó định tuyến đúng xã/phường.
  * **3 Ô số liệu:** `96 / 102` đơn vị cấp xã An Giang đã nạp ranh giới (`6` xã chờ đồng bộ) | `40` TTHC & `4` mẫu tờ khai | `≤ 2.048 MiB` Trần RAM toàn hệ thống.
* **Lời thuyết trình:**
  > *"Điểm đầu tiên em muốn nhấn mạnh là định vị của SmartWard AI: hệ thống đóng vai trò là bộ đệm tiền kiểm giúp người dân chuẩn bị hồ sơ đúng ngay từ nhà và giúp cán bộ gom nhóm sự cố, tuyệt đối không thay thế quyết định phê duyệt của cán bộ Một cửa. Tại địa bàn tỉnh An Giang với 102 đơn vị cấp xã sau sắp xếp — trong đó hệ thống đã nạp danh mục và ranh giới thực của 96 đơn vị, còn 6 xã đang chờ đồng bộ — chúng em giải quyết hai nút thắt lớn: một là hồ sơ giấy bị trả lại nhiều lần do lỗi điền biểu mẫu và ảo giác pháp lý nếu dùng AI tự do; hai là phản ánh hiện trường bị trùng lặp và lệch tọa độ GPS."*

---

#### SLIDE 3: BA CÂU HỎI NGHIÊN CỨU (RQ1 – RQ3) & PHÂN ĐỊNH ĐÓNG GÓP
* **Thời lượng:** 1 phút
* **Bố cục Canva:** 3 hàng ngang cho `RQ1`, `RQ2`, `RQ3` (mỗi hàng gồm: Nhãn RQ màu xanh $\rightarrow$ Câu hỏi $\rightarrow$ Chỉ số đo). Phía dưới là hộp ghi chú phân định rõ *Công cụ có sẵn* và *Phần sinh viên tự thiết kế*.
* **Nội dung chữ trên Slide:**
  * **RQ1 (Legal RAG):** Phân đoạn theo *Chương–Điều–Khoản* kết hợp hai ngưỡng ($\theta = 0,78$; $\theta_{\text{lower}} = 0,42$) giảm ảo giác và tăng độ chính xác trích dẫn thế nào? *(Đo: Recall@3, MRR, Citation Precision, False Answer Rate)*.
  * **RQ2 (GIS Triage 2 pha):** Lọc không gian ($R$) kết hợp ngữ nghĩa ($\tau$) có hiệu quả hơn từng pha đơn lẻ không? Tham số $(R, \tau)$ nào tối ưu trên tập Held-out? *(Đo: Precision, Recall, F1)*.
  * **RQ3 (Deterministic Rule Engine):** Bộ quy tắc tất định đặt sau OCR chặn được bao nhiêu % lỗi logic tờ khai? *(Đo: Error Detection Rate, False Positive Rate)*.
  * **Ranh giới tự thực hiện (`AGENTS.md`):** Sinh viên trực tiếp khảo sát nghiệp vụ, thiết kế kiến trúc 2 GiB RAM, xây dựng thuật toán/ngưỡng và kiểm định chống rò rỉ nhãn; AI Agent hỗ trợ dựng khung code, viết test và rà soát lỗi biên.
* **Lời thuyết trình:**
  > *"Để dự án không chỉ dừng ở việc ghép nối công cụ, em đặt ra 3 câu hỏi nghiên cứu định lượng gắn với 3 mô-đun lõi: RQ1 về chống ảo giác pháp lý trong RAG; RQ2 về gom cụm phản ánh 2 pha không gian – ngữ nghĩa; và RQ3 về kiểm tra tờ khai bằng luật tất định sau OCR. Mọi quyết định kiến trúc, ngưỡng thuật toán và thực nghiệm đều do em trực tiếp thiết kế và kiểm chứng."*

---

#### SLIDE 4: QUYẾT ĐỊNH KIẾN TRÚC & NGÂN SÁCH RAM 2.048 MiB
* **Thời lượng:** 1 phút 15 giây
* **Bố cục Canva:** Bên trái là **Sơ đồ kiến trúc 3 tầng** (Tầng 1: Web PWA & Mobile Expo $\rightarrow$ Tầng 2: Spring Boot Modular Monolith + FastAPI AI Sidecar $\rightarrow$ Tầng 3: PostgreSQL/pgvector, Redis, MinIO). Bên phải là **Bảng ngân sách RAM 6 container**.
* **Nội dung chữ trên Slide:**
  * **Vì sao Modular Monolith + 1 AI Sidecar?** Microservices + Kafka tốn `2,7 – 4,0 GB` RAM, vượt trần phần cứng cấp xã. Modular Monolith chạy trên 1 JVM (`-Xmx512m`) dùng `@Async` tiết kiệm hàng trăm MiB RAM.
  * **Bảng RAM 6 Container:**
    * Backend Spring Boot: `768 MiB` (`~380 MiB`)
    * PostgreSQL 16 + pgvector: `448 MiB` (`~110 MiB`)
    * AI Sidecar (PhoBERT ONNX INT8 + Piper TTS): `384 MiB` (`~210 MiB`)
    * MinIO Object Storage: `256 MiB` (`~65 MiB`)
    * Redis 7.2.5 (`AOF + noeviction`): `128 MiB` (`~18 MiB`)
    * Frontend Nginx Alpine: `64 MiB` (`~12 MiB`)
    * **Tổng trần: `2.048 MiB` (Dư `0 MiB`) — Mức dùng tham chiếu: `~795 MiB`**.
* **Lời thuyết trình:**
  > *"Về kiến trúc, ban đầu em thử nghiệm hướng Microservices kèm Kafka nhưng tổng RAM vượt quá 3 GB. Vì vậy em chuyển sang Modular Monolith trên Spring Boot 3.3.5 kết hợp đúng 1 container AI Sidecar chạy PhoBERT đã lượng tử hóa INT8 và bộ đọc giọng nói Piper TTS. Bảng bên phải cho thấy tổng mem_limit của 6 container cộng lại vừa khít 2.048 MiB, dư 0 MiB, và mức tiêu thụ tham chiếu chỉ khoảng 795 MiB."*

---

#### SLIDE 5: MÔ HÌNH DỮ LIỆU (14 MIGRATION FLYWAY) & BA VAI TRÒ
* **Thời lượng:** 1 phút
* **Bố cục Canva:** Phía trên là 3 thẻ Vai trò (Công dân – Cán bộ xã – Quản trị viên tỉnh). Phía dưới là 5 cụm bảng PostgreSQL (12 bảng) + 1 cụm SQLite Mobile (3 bảng).
* **Nội dung chữ trên Slide:**
  * **3 Vai trò (RBAC cưỡng chế tại Backend):**
    1. **Công dân:** Tra cứu, tiền kiểm, nộp hồ sơ, báo sự cố (không cần PIN).
    2. **Cán bộ Một cửa (`ROLE_OFFICER`):** Chỉ truy cập dữ liệu thuộc **1 xã được phân công (`ward_code`)**, mở Vault 1 lần, trả lời HITL.
    3. **Quản trị viên cấp tỉnh (`ROLE_ADMIN`):** Giám sát liên xã **chỉ đọc**, phê duyệt nội dung TTHC (Maker-Checker), cấp PIN 1 lần 24h.
  * **12 Bảng PostgreSQL (`V1..V14`):**
    * *Nội dung & RAG:* `admin_procedures`, `procedure_versions`, `legal_chunks` (768d), `hitl_gray_zone_queue`.
    * *Hồ sơ & Tờ khai:* `citizen_dossiers`, `dossier_events`, `form_submissions`.
    * *Sự cố GIS & Kho bảo mật:* `issue_clusters`, `civic_reports`, `vault_documents`.
    * *Người dùng & Kiểm toán:* `officers`, `audit_log` (có trigger chặn `UPDATE/DELETE/TRUNCATE`).
  * **3 Bảng SQLite Mobile (`expo-sqlite`):** `cached_procedures`, `wallet_qr_passes`, `offline_incident_queue`.
* **Lời thuyết trình:**
  > *"Hệ thống dữ liệu được quản lý chặt chẽ qua 14 phiên bản Flyway với 12 bảng PostgreSQL và 3 bảng SQLite ngoại tuyến trên di động. Phân quyền được chia làm 3 vai trò và cưỡng chế hoàn toàn ở tầng Backend: cán bộ xã nào chỉ được phép xem hồ sơ và sự cố của đúng xã đó; còn quản trị viên cấp tỉnh giám sát liên xã ở chế độ chỉ đọc và phê duyệt nội dung thủ tục."*

---

#### SLIDE 6: MÔ-ĐUN 1 – LEGAL RAG HAI NGƯỠNG & HÀNG ĐỢI HITL (RQ1)
* **Thời lượng:** 1 phút 15 giây
* **Bố cục Canva:** Sơ đồ luồng ngang từ *Câu hỏi* $\rightarrow$ *Chuẩn hóa & Giải quyết ngữ cảnh đa lượt* $\rightarrow$ *Vector 768d (pgvector)* $\rightarrow$ **Khối rẽ nhánh 3 luồng theo $S_{\max}$**.
* **Nội dung chữ trên Slide:**
  * **Phân đoạn pháp lý:** Cắt theo *Chương – Điều – Khoản*, chỉ truy xuất bản `PUBLISHED`.
  * **Chốt chặn 2 ngưỡng an toàn:**
    * 🟢 **$S_{\max} \ge 0,78$:** Trả lời theo khuôn 5 phần + **Hậu kiểm mã trích dẫn `[CITATION]`** (xóa mọi mã ngoài Top-K).
    * 🟡 **$0,42 \le S_{\max} < 0,78$ (Vùng xám):** Không sinh câu trả lời tự do $\rightarrow$ Lưu vào bảng `hitl_gray_zone_queue` trên PostgreSQL để cán bộ giải đáp.
    * 🔴 **$S_{\max} < 0,42$:** Từ chối an toàn (ngoài phạm vi 40 TTHC cấp xã).
  * **Giới hạn trung thực:** Ngưỡng tương đồng chỉ giảm rủi ro sinh chữ ngoài văn bản, không thay thế việc thẩm định pháp lý của chuyên viên.
* **Lời thuyết trình:**
  > *"Ở Mô-đun 1 là Legal RAG: trong hành chính công, thà hệ thống từ chối còn hơn trả lời sai luật. Em thiết kế chốt chặn 2 ngưỡng: chỉ khi độ tương đồng đạt từ 0,78 trở lên hệ thống mới tổng hợp câu trả lời và quét hậu kiểm từng mã trích dẫn. Nếu rơi vào vùng xám từ 0,42 đến dưới 0,78, câu hỏi được lưu bền vững vào bảng hàng đợi HITL trên PostgreSQL để cán bộ trả lời. Dưới 0,42 hệ thống từ chối ngay."*

---

#### SLIDE 7: MÔ-ĐUN 2 – TIỀN KIỂM TỜ KHAI TẤT ĐỊNH & SLA TRUNG THỰC (RQ3)
* **Thời lượng:** 1 phút
* **Bố cục Canva:** Luồng 4 bước ở trên (*Vision Quality Gate* $\rightarrow$ *Quét QR CCCD / OCR* $\rightarrow$ *Rule Engine Java thuần* $\rightarrow$ *Nộp hồ sơ & Vé hẹn QR*). Bên dưới là bảng quy tắc 4 tờ khai và hộp nhấn mạnh **SLA Trung thực**.
* **Nội dung chữ trên Slide:**
  * **Nguyên tắc thiết kế:** *AI chỉ đọc chữ (OCR), Luật Java tất định quyết định đúng/sai — Người dân tự sửa trên bản giấy để giữ nguyên giá trị pháp lý.*
  * **Chốt chặn tại thiết bị:** Kiểm tra độ nét/độ sáng ảnh; quét trực tiếp mã QR trên thẻ CCCD gắn chip.
  * **4 Nhóm biểu mẫu:** `CT01` (CCCD 12 số, 63 mã tỉnh, khớp giới tính/năm sinh), `TK-KS` (đối chiếu chéo giấy chứng sinh), `TK-KH` (tuổi kết hôn nam $\ge 20$, nữ $\ge 18$ tính đến từng ngày), `TK-BTXH` (điều kiện tuổi/khuyết tật & STK). Độ tin cậy OCR $< 0,70 \rightarrow$ gắn cờ `MANUAL_REVIEW_REQUIRED`.
  * **Quyết định SLA trung thực:** Khi thủ tục chưa được xác minh cột `sla_working_days` (`NULL`), phiếu hẹn hiển thị rõ **“Chưa xác định (chờ cán bộ Một cửa xác nhận)”** — tuyệt đối không bịa hạn trả kết quả.
* **Lời thuyết trình:**
  > *"Ở Mô-đun 2, em không dùng LLM để đoán tính hợp lệ của tờ khai mà viết bộ Rule Engine tất định bằng Java và TypeScript đặt sau bước OCR và quét QR CCCD. Một quyết định thiết kế quan trọng khác là tính trung thực của hạn giải quyết SLA: với các thủ tục mà thời hạn chưa được cán bộ xác minh trong cơ sở dữ liệu, hệ thống trả về NULL và hiển thị rõ 'Chưa xác định, chờ cán bộ xác nhận' thay vì tự gán cứng 3 ngày như các bản demo thông thường."*

---

#### SLIDE 8: MÔ-ĐUN 3 – BÁO CÁO SỰ CỐ GIS & GOM CỤM 2 PHA (RQ2)
* **Thời lượng:** 1 phút
* **Bố cục Canva:** Bên trái là sơ đồ luồng *Định vị GPS / Kéo thả ghim* $\rightarrow$ *Kiểm tra đa giác 96 xã (dung sai 300 m)* $\rightarrow$ *Pha 1: Redis GEORADIUS ($R = 25\text{ m}$)* $\rightarrow$ *Pha 2: Cùng danh mục + Cosine $\ge \tau$*. Bên phải là hộp so sánh API Công khai vs API Cán bộ.
* **Nội dung chữ trên Slide:**
  * **Thu thập vị trí chống sai lệch:** Hỗ trợ GPS và ghim kéo thả trên Google Maps (dự phòng Leaflet); lưu `location_source` (`GPS`, `PIN_DRAGGED`) và **chặn `WARD_DEFAULT`** nếu người dân chưa xác nhận vị trí.
  * **Kiểm tra địa giới:** Đối chiếu đa giác ranh giới `96/102` xã (dung sai `300 m`), tự động gợi ý chuyển xã khi vị trí nằm ngoài địa bàn đang chọn. Số điện thoại người báo là **tùy chọn**.
  * **Gom cụm 2 pha:**
    * *Pha 1 (Không gian):* Redis `GEORADIUS` bán kính $R = 25\text{ m}$ trong cửa sổ `72 giờ`.
    * *Pha 2 (Ngữ nghĩa):* Chuẩn hóa 5 danh mục sự cố + độ tương đồng Cosine $\ge \tau$.
  * **Bảo mật vị trí:** API công khai làm tròn tọa độ `%.3f` và ẩn địa chỉ; API cán bộ lọc theo xã phụ trách kèm nút dẫn đường Google Maps.
* **Lời thuyết trình:**
  > *"Mô-đun 3 xử lý bài toán phản ánh hiện trường GIS. Người dân có thể bật GPS hoặc kéo thả ghim trực tiếp trên bản đồ; hệ thống kiểm tra tọa độ với đa giác ranh giới của 96 xã trong dung sai 300 mét để định tuyến đúng UBND xã. Khi phản ánh gửi lên, hệ thống lọc Pha 1 bằng Redis GEORADIUS trong bán kính 25 mét, sau đó lọc Pha 2 theo danh mục và độ tương đồng ngữ nghĩa để gộp các báo cáo trùng lặp vào cùng một cụm sự cố."*

---

#### SLIDE 9: MÔ-ĐUN 4 & 5 – ZERO-TRUST VAULT, MAKER-CHECKER & MOBILE OFFLINE
* **Thời lượng:** 1 phút 15 giây
* **Bố cục Canva:** Chia 2 nửa: Bên trái là **Sơ đồ tuần tự Zero-Trust Vault** (nhấn mạnh bước xóa token sau khi giải mã thành công). Bên phải là **Chu trình Maker-Checker** và **3 bảng SQLite Mobile Offline**.
* **Nội dung chữ trên Slide:**
  * **Kho tài liệu Zero-Trust Vault (Định hướng Luật 91/2025 & NĐ 356/2025):**
    1. Kiểm tra magic bytes, chặn ảnh $> 4096 \times 4096\text{ px}$ ($> 5\text{ MB}$).
    2. Đóng **Watermark động** nghiêng toàn ảnh kèm thời gian thực.
    3. Mã hóa **AES-256-GCM** lưu tệp `.enc` lên MinIO.
    4. **Cơ chế tiêu thụ token an toàn:** Token `OTT_` lưu trên Redis (`AOF + noeviction`). Khi cán bộ mở xem, hệ thống **chỉ đọc token $\rightarrow$ tải MinIO $\rightarrow$ giải mã thành công rồi mới xóa token và đánh dấu đã xem** (tránh mất token khi rớt mạng); lần xem thứ 2 trả `HTTP 410 Gone`.
  * **Quản trị tri thức Maker-Checker & RBAC:**
    * Đề xuất (`DRAFT` $\rightarrow$ `PENDING_REVIEW`) $\rightarrow$ Quản trị viên xem **Diff** và duyệt chéo (**người tạo không tự duyệt**) $\rightarrow$ `PUBLISHED` / Rollback; lưu vết `audit_log` bất biến.
    * Cấp mã **PIN 1 lần (24h)**, bắt buộc đổi PIN lần đầu.
  * **Mobile Offline-First (Expo SDK 52):** 3 bảng SQLite (`cached_procedures`, `wallet_qr_passes`, `offline_incident_queue`).
* **Lời thuyết trình:**
  > *"Với giấy tờ nhạy cảm của người dân, Mô-đun 4 Zero-Trust Vault đóng dấu watermark động và mã hóa AES-256-GCM trước khi lưu vào MinIO. Một cải tiến quan trọng trong đợt cứng hóa vừa qua là chúng em chuyển Redis sang chế độ noeviction kèm AOF, và chỉ xóa token xem một lần sau khi đã tải tệp từ MinIO và giải mã thành công, khắc phục triệt để lỗi mất token khi mạng chập chờn. Bên cạnh đó, Mô-đun 5 bổ sung quy trình Maker-Checker bắt buộc hai người duyệt chéo khi cập nhật thủ tục pháp lý và ứng dụng Mobile chạy ngoại tuyến bằng SQLite."*

---

#### SLIDE 10: KẾT QUẢ THỰC NGHIỆM RQ1 (LEGAL RAG) & RQ3 (RULE ENGINE)
* **Thời lượng:** 1 phút 15 giây
* **Bố cục Canva:** Bên trái là **Bảng kết quả RQ1** kèm biểu đồ `evaluation/charts/abstention_tradeoff.png`. Bên phải là hộp kết quả **RQ3** và ghi chú minh bạch về bộ dữ liệu tự xây dựng (`80` câu hỏi, `40` tờ khai, `150` phản ánh).
* **Nội dung chữ trên Slide:**
  * **Bảng RQ1 – Legal RAG (80 câu: 65 trong phạm vi, 15 câu bẫy):**

| Cấu hình | Recall@3 | MRR | Citation Precision | Trả lời sai câu bẫy | Từ chối đúng |
| :--- | :---: | :---: | :---: | :---: | :---: |
| LLM Zero-shot *(mốc tham chiếu)* | – | – | `32,5%` | `73,3%` | `26,7%` |
| RAG chuẩn ($\theta = 0,42$) | `86,2%` | `0,79` | `86,2%` | `100,0%` | `0,0%` |
| **RAG đề xuất (Điều–Khoản + $\theta = 0,78$)** | **`86,2%`** | **`0,79`** | **`97,6%`** | **`6,7%`** | **`93,3%`** |

  * **Kết quả RQ3 – Rule Engine (40 tờ khai mẫu: 20 in, 20 viết tay):** Phát hiện `100%` lỗi cấu trúc CCCD và lỗi logic ngày tháng đã cài sẵn, `0%` báo nhầm trên mẫu hợp lệ *(lưu ý trung thực: đo trên dữ liệu tổng hợp có lỗi cài chủ động)*.
* **Lời thuyết trình:**
  > *"Sang phần đánh giá thực nghiệm trên bộ dữ liệu tự xây dựng đã loại bỏ rò rỉ nhãn: ở RQ1 với 80 câu hỏi gồm 15 câu bẫy ngoài phạm vi, RAG chuẩn không có ngưỡng chặn cao trả lời sai 100% câu bẫy. Khi áp dụng phân đoạn theo Điều–Khoản và ngưỡng 0,78, hệ thống giữ nguyên Recall@3 ở mức 86,2%, nâng độ chính xác trích dẫn lên 97,6% và kéo tỷ lệ trả lời sai câu bẫy xuống chỉ còn 6,7%. Ở RQ3, Rule Engine phát hiện 100% lỗi cài sẵn trên 40 tờ khai mẫu."*

---

#### SLIDE 11: KẾT QUẢ THỰC NGHIỆM RQ2 (GOM CỤM 2 PHA & KIỂM ĐỊNH HELD-OUT)
* **Thời lượng:** 1 phút 15 giây
* **Bố cục Canva:** Bên trái là 2 bảng số liệu (**So sánh 3 phương pháp** và **Kiểm định Held-out 90 Dev / 60 Test**). Bên phải chèn 2 biểu đồ từ thư mục `evaluation/charts/`: `method_comparison_bar.png` và `f1_heatmap_triage.png`.
* **Nội dung chữ trên Slide:**
  * **So sánh 3 phương pháp (Toàn tập 150 báo cáo):**
    * Chỉ không gian ($R = 50\text{ m}$): Precision `43,03%` | Recall `92,67%` | F1 `58,77%` *(gộp nhầm nhiều)*
    * Chỉ ngữ nghĩa ($\tau = 0,75$): Precision `98,36%` | Recall `80,00%` | F1 `88,24%`
    * **Hai pha ($R = 50\text{ m}, \tau = 0,75$):** **Precision `100,00%`** | Recall `80,00%` | **F1 `88,89%`**
  * **Kiểm định mù trên tập Held-out (60 báo cáo tách theo thời gian):**

| Cấu hình trên Held-out (60 báo cáo) | Precision | Recall | F1 | Nhận xét thực nghiệm |
| :--- | :---: | :---: | :---: | :--- |
| **Tối ưu trên Dev ($R = 50\text{ m}, \tau = 0,75$)** | **`100,0%`** | **`70,0%`** | **`82,35%`** | F1 cao nhất trên Held-out |
| **Bán kính hẹp đô thị ($R = 25\text{ m}, \tau = 0,80$)** | **`100,0%`** | **`62,0%`** | **`76,54%`** | Phù hợp hẻm sâu/ngã tư |
| **Ngưỡng cao trong code ($R = 25\text{ m}, \tau = 0,82$)** | `100,0%` | `20,0%` | `33,33%` | Recall sụt mạnh trên TF-IDF $\rightarrow$ cần hạ về `0,80` |

* **Lời thuyết trình:**
  > *"Ở RQ2 trên 150 báo cáo sự cố, nếu chỉ lọc theo bán kính 50 mét thì Precision chỉ đạt 43% do gộp nhầm các sự cố khác loại ở gần nhau. Khi kết hợp 2 pha không gian và ngữ nghĩa, Precision đạt tuyệt đối 100% — đây là ưu tiên đúng về nghiệp vụ vì gộp nhầm nguy hiểm hơn tách thừa. Đặc biệt, khi kiểm định mù trên tập Held-out 60 báo cáo, chúng em phát hiện nếu đặt ngưỡng tau = 0,82 trên bộ vector TF-IDF thì Recall sụt xuống 20%, F1 chỉ còn 33,33%; trong khi ở tau = 0,80 với bán kính 25 mét thì F1 đạt 76,54% và ở (50 m, 0,75) đạt 82,35%. Đây là bằng chứng thực nghiệm giúp nhóm hiệu chỉnh tham số hệ thống."*

---

#### SLIDE 12: GIAO DIỆN HỆ THỐNG & KỊCH BẢN DEMO TRỰC TIẾP (3 PHÚT)
* **Thời lượng:** 30 giây giới thiệu slide + 3 phút chạy Demo trực tiếp
* **Bố cục Canva:** Khung lưới 4 ảnh chụp màn hình thật: (1) *Cổng chọn 3 vai trò & 96 xã An Giang*, (2) *Chat Legal RAG + Tiền kiểm tờ khai*, (3) *Bản đồ báo cáo sự cố Google Maps có ghim kéo thả*, (4) *Bàn điều hành Cán bộ & Mobile Ví QR Pass*.
* **Nội dung chữ trên Slide:**
  * **Luồng Demo 3 kịch bản nối tiếp:**
    1. **Công dân (Web / Mobile):** Quét QR CCCD $\rightarrow$ Hỏi thủ tục & thử câu bẫy ($\theta = 0,78$) $\rightarrow$ Tiền kiểm tờ khai & nhận **Vé hẹn QR** (SLA hiển thị *“Chưa xác định”* khi chưa xác minh).
    2. **Phản ánh sự cố GIS:** Kéo thả ghim tại An Giang $\rightarrow$ Kiểm tra đa giác xã `300 m` $\rightarrow$ Gửi 2 báo cáo trùng lặp $\rightarrow$ Tự động gom thành 1 cụm.
    3. **Cán bộ Một cửa & Quản trị tỉnh:** Quét QR Pass $\rightarrow$ Mở tài liệu **Zero-Trust Vault** có Watermark (`OTT_` xem lần 2 trả `HTTP 410`) $\rightarrow$ Duyệt chéo TTHC (**Maker-Checker**).
* **Lời thuyết trình:**
  > *"Trên slide là giao diện thực tế của hệ thống trên cả Web PWA và ứng dụng di động Expo, có hỗ trợ chỉnh cỡ chữ A++ và giọng đọc miền Tây cho người cao tuổi. Sau đây em xin phép chuyển sang màn hình chạy Demo trực tiếp 3 luồng nghiệp vụ này."*

---

#### SLIDE 13: KIỂM THỬ PHẦN MỀM, BÀI HỌC XƯƠNG MÁU & HẠN CHẾ ĐÃ BIẾT
* **Thời lượng:** 1 phút 15 giây
* **Bố cục Canva:** Chia 2 cột rõ rệt: Cột trái là **Bằng chứng kiểm thử & 4 bài học kỹ thuật đắt giá**; Cột phải là **Bảng Hạn chế đã biết (Trung thực học thuật)**.
* **Nội dung chữ trên Slide:**
  * **Kiểm thử tự động (ngày `20/11/2026`, nhánh `bugfix/hardening-vault-redis-sla-hitl` – commit `2bf4865`):**
    * Backend: **`535 / 537` test PASS** (`0` lỗi, `2` skipped).
    * Web Frontend: **`11 / 11` suite PASS** (`tsc -b && vite build` 0 lỗi).
    * Mobile Expo: **`76 / 76` test Vitest PASS** (`9/9` files).
    * Lịch sử Git: **`336` commit** trên `develop` (`337` tính cả nhánh cứng hóa), tuân thủ nhánh tính năng & `merge --no-ff`.
  * **4 Bài học thực tiễn lớn nhất:**
    1. *489 test PASS nhưng app không boot được* (thiếu `@Autowired`) $\rightarrow$ Bổ sung `RealDatabaseAndRedisBootSmokeTest`.
    2. *Số liệu 100% ban đầu do rò rỉ nhãn* $\rightarrow$ Đo lại mù nhãn trên tập Held-out.
    3. *Dữ liệu cào lẫn “Đà Nẵng”, “Bộ Ngoại giao”* $\rightarrow$ Bắt buộc qua **Maker-Checker** và để `sla_working_days = NULL`.
    4. *Mất token Vault khi lỗi mạng* $\rightarrow$ Chỉ xóa token sau khi giải mã thành công + Redis `noeviction` & `AOF`.
  * **Hạn chế đã biết:** Còn `6/102` xã thiếu ranh giới; `40` TTHC chờ chuyên viên xác minh SLA; SQLite Mobile chưa mã hóa mức tệp; `audit_log` cần tách role DB chỉ ghi; chờ bật Docker daemon chạy smoke test khởi động thật.
* **Lời thuyết trình:**
  > *"Về chất lượng phần mềm, hệ thống đạt 535 trên 537 bài test backend, 11 trên 11 suite web và 76 trên 76 bài test mobile. Tuy nhiên, bài học lớn nhất em rút ra trong kỳ thực tập là: unit test pass không đồng nghĩa với hệ thống chạy được — chúng em từng gặp lỗi 489 test đều xanh nhưng ứng dụng không khởi động được do thiếu chú thích Autowired ở hai constructor, hay dữ liệu cào tự động từ cổng dịch vụ công bị lẫn tên cơ quan của Đà Nẵng và Bộ Ngoại giao. Chính những vấp ngã đó giúp em xây dựng cơ chế Maker-Checker, ẩn SLA chưa xác minh và trình bày trung thực các hạn chế còn tồn đọng ở cột bên phải."*

---

#### SLIDE 14: KẾT LUẬN & LỘ TRÌNH PHÁT TRIỂN
* **Thời lượng:** 1 phút
* **Bố cục Canva:** Phía trên là **Lộ trình cứng hóa 5 việc ưu tiên** (dạng thanh tiến trình 1 $\rightarrow$ 5). Phía dưới là **3 Hướng phát triển sản phẩm** và lời cảm ơn Hội đồng.
* **Nội dung chữ trên Slide:**
  * **Lộ trình Cứng hóa trước khi triển khai thí điểm (5 việc ưu tiên):**
    1. Bật Docker daemon chạy nghiệm thu `RealDatabaseAndRedisBootSmokeTest` & `/api/v1/health`.
    2. Nhờ cán bộ Một cửa xác minh **5–10 TTHC ưu tiên** để kích hoạt hạn `sla_working_days` thật.
    3. Đồng bộ nốt dữ liệu đa giác ranh giới cho **6/102 xã** còn thiếu của tỉnh An Giang.
    4. Tách role CSDL chỉ ghi (`SELECT, INSERT`) cho `audit_log` và gỡ nút đăng nhập mẫu trên UI demo.
    5. Bổ sung lọc PII trước khi gọi API ngoài, mã hóa SQLite Mobile và kịch bản sao lưu tự động.
  * **Định hướng phát triển tiếp theo:**
    * *Trợ lý “Sự kiện đời người liên thông”:* Kết nối chuỗi thủ tục (Khai sinh $\rightarrow$ Nhập hộ khẩu $\rightarrow$ Cấp thẻ BHYT).
    * *Đánh giá RAG chuẩn hóa:* Bộ câu hỏi kiểm chuẩn do công chức tư pháp – hộ tịch thẩm định độc lập.
    * *Song ngữ Việt – Khmer có người duyệt & Minh bạch Vault:* Phục vụ đồng bào dân tộc tại An Giang và cho phép công dân xem lịch sử ai đã truy cập tài liệu của mình.
  * **Xin chân thành cảm ơn Hội đồng! Em rất mong nhận được câu hỏi và góp ý của Thầy Cô.**
* **Lời thuyết trình:**
  > *"Tóm lại, dự án SmartWard AI đã hoàn thành trọn vẹn khung kỹ thuật đa nền tảng Web và Mobile trong ngân sách 2.048 MiB RAM và trả lời định lượng 3 câu hỏi nghiên cứu bằng số liệu trung thực. Trước khi đưa vào thử nghiệm thực tế tại địa phương, em xác định rõ 5 việc cứng hóa ưu tiên trên slide, đặc biệt là xác minh 5 đến 10 thủ tục cốt lõi để kích hoạt SLA thật và hoàn tất kiểm thử khởi động trên Docker. Về dài hạn, sản phẩm sẽ hướng tới trợ lý sự kiện đời người liên thông và hỗ trợ tiếng Khmer có chuyên viên hiệu đính cho bà con An Giang. Em xin chân thành cảm ơn Thầy Cô và Hội đồng đã lắng nghe, em xin phép nhận câu hỏi ạ!"*

---

## PHẦN 3. BẢNG HỎI – ĐÁP NHANH PHÒNG HỘI ĐỒNG CHẤT VẤN (Q&A CHEATSHEET)

| Câu hỏi Hội đồng hay hỏi | Cách trả lời ngắn gọn, đúng trọng tâm và trung thực |
| :--- | :--- |
| **1. AI của em có tự duyệt hồ sơ thay cán bộ Một cửa không?** | Dạ **không**. Ngay từ Chương 2 em đã định vị SmartWard AI chỉ là **bộ đệm tiền kiểm và trợ lý hướng dẫn**. Hệ thống chỉ cảnh báo lỗi để người dân tự sửa trên tờ khai giấy trước khi nộp; quyền quyết định tiếp nhận và phê duyệt 100% thuộc về công chức Một cửa. |
| **2. Vì sao trong bảng kết quả có cả $R=50\text{ m}, \tau=0,75$ lẫn $R=25\text{ m}, \tau=0,80$ và $0,82$?** | Dạ trên tập thực nghiệm, cặp $(50\text{ m}, 0,75)$ cho F1 cao nhất (`88,89%` toàn tập, `82,35%` held-out). Khi đưa vào cấu hình triển khai cho khu vực hẻm sâu đô thị, em thu hẹp bán kính xuống $25\text{ m}$ để chống gộp nhầm hai sự cố ở hai dãy nhà đối diện. Khi đo kiểm định trên vector TF-IDF, em phát hiện mức $\tau = 0,82$ làm Recall giảm xuống `20%` (`F1 = 33,33%`), còn ở $\tau = 0,80$ đạt `F1 = 76,54%`, nên báo cáo ghi nhận đầy đủ cả 3 mốc để minh chứng lý do chọn tham số. |
| **3. Dữ liệu 40 TTHC lấy từ đâu, đã chuẩn pháp lý 100% chưa?** | Dạ dữ liệu được thu thập từ Cổng Dịch vụ công Quốc gia. Tuy nhiên khi hậu kiểm, em phát hiện dữ liệu mẫu cào tự động vẫn có bản ghi lẫn tên cơ quan khác (như “Đà Nẵng”, “Bộ Ngoại giao”). Vì vậy em không tuyên bố “đã xác minh 100%”, mà xây dựng mô-đun **Maker-Checker** để cán bộ duyệt chéo và để `sla_working_days = NULL` (“Chưa xác định”) cho tới khi từng thủ tục được người có thẩm quyền xác nhận. |
| **4. Phần nào em tự làm, phần nào AI Agent hỗ trợ?** | Dạ em trực tiếp khảo sát nghiệp vụ tại đơn vị, đặt 3 câu hỏi nghiên cứu, thiết kế kiến trúc 6 container giới hạn `2.048 MiB` RAM, thiết kế thuật toán RAG 2 ngưỡng / Rule Engine / Triage 2 pha / Zero-Trust Vault, phát hiện và sửa lỗi rò rỉ nhãn trong thực nghiệm. Công cụ AI Agent được em dùng làm trợ lý dựng khung code, viết test tự động và rà soát lỗi biên, mọi kết quả đều được em kiểm tra lại bằng log và số đo thực tế. |
| **5. Kho Zero-Trust Vault và hệ thống bảo vệ dữ liệu cá nhân thế nào?** | Dạ hệ thống định hướng theo Luật Bảo vệ dữ liệu cá nhân `91/2025/QH15` và Nghị định `356/2025/NĐ-CP`. Tài liệu đính kèm được đóng dấu watermark động, mã hóa `AES-256-GCM` và chỉ xem được 1 lần qua token `OTT_` trên Redis (`AOF + noeviction`), trong đó token chỉ bị xóa sau khi giải mã thành công. API bản đồ công khai cũng làm tròn tọa độ `%.3f` và ẩn địa chỉ chi tiết của người dân. |
