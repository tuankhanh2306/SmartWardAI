# 📚 TRUNG TÂM ĐIỀU HƯỚNG TÀI LIỆU DỰ ÁN (MASTER DOCUMENTATION PORTAL)

> **Dự án:** SmartWard AI — Hệ thống Hỗ trợ Thủ tục Hành chính & Phân luồng Phản ánh Cấp Phường/Xã  
> **Đơn vị:** Viện Đào tạo Chất lượng cao — Trường Đại học Giao thông vận tải TP.HCM (UTH)  
> **Doanh nghiệp đồng hành:** Viettel An Giang  
> **Giảng viên hướng dẫn:** TS. Lê Văn Quốc Anh | **Sinh viên thực hiện:** Khóa luận Tốt nghiệp CNTT  
> **Cập nhật gần nhất:** Tháng 11/2026 — Phiên bản chuẩn hóa toàn diện

---

## 🧭 1. Bản Đồ Tra Cứu Nhanh Theo Mục Đích (Quick Action Matrix)

Tùy theo công việc bạn đang cần làm hoặc khi AI cần tra cứu để lập trình, hãy mở ngay tài liệu tương ứng:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BẢN ĐỒ TÀI LIỆU SMARTWARD AI                                         │
├─────────────────────────┬─────────────────────────────────────────────────┬────────────────────────────┤
│ Mục đích sử dụng        │ Mở tài liệu nào?                                │ Lợi ích chính              │
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 🎯 BẢO VỆ TỐT NGHIỆP    │ • docs/defense/DEFENSE_PRESENTATION_AND_DEMO.md │ • 10 Slide thuyết trình    │
│    (Tuần 12 tại UTH)    │ • docs/defense/DEFENSE_QA_AND_RATIONALE.md      │ • Kịch bản Demo 3 phút     │
│                         │ • docs/defense/PROJECT_DEFENSE_REVIEW.md        │ • 6 câu hỏi phản biện khó  │
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 📖 NỘP KHÓA LUẬN /      │ • docs/thesis-chapters/FULL_THESIS_REPORT_UTH.md│ • Toàn văn báo cáo 5 chương│
│    BÁO CÁO THỰC TẬP     │ • docs/thesis-chapters/chapter-01 đến 05.md     │ • Chuẩn format UTH, bìa,   │
│    DOANH NGHIỆP         │ • docs/weekly-reports/week-01 đến 11-report.md  │   14 bảng biểu, 15 đồ thị  │
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 💻 LẬP TRÌNH & PHÁT     │ • docs/architecture/SYSTEM_SPECIFICATION.md     │ • Đặc tả 7 REST APIs       │
│    TRIỂN HỆ THỐNG       │ • docs/architecture/ARCHITECTURE_AND_FLOWS.md   │ • Schema CSDL Flyway V1-V6 │
│    (Dành cho Bạn & AI)  │ • docs/architecture/PROJECT_CONSTRAINTS.md      │ • Ràng buộc RAM ≤ 2.0GB    │
│                         │ • docs/architecture/GIT_WORKFLOW.md             │ • Quy chuẩn Git commit     │
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 🚀 ĐỀ TÀI NCKH 2.0      │ • docs/roadmap/EXPANSION_ROADMAP_2.0.md         │ • Multi-Ward Onboarding    │
│    (Mở rộng 8 tuần      │ • docs/roadmap/BUSINESS_AND_RESEARCH_PLAN.md    │ • Quét QR CCCD thay vì NFC │
│    Tháng 3/2027)        │ • docs/roadmap/BASELINE_ROADMAP_12W.md          │ • Fine-tune Bi-Encoder T4  │
└─────────────────────────┴─────────────────────────────────────────────────┴────────────────────────────┘
```

---

## 🗂️ 2. Cấu Trúc Thư Mục Tài Liệu Chi Tiết

```
docs/
├── README.md                                    # 🗺️ (Tài liệu này) Bản đồ tổng thể và mục lục điều hướng
│
├── 🎓 thesis-chapters/                          # KHÓA LUẬN & BÁO CÁO CHÍNH THỨC UTH
│   ├── FULL_THESIS_REPORT_UTH.md                # 📄 Toàn văn báo cáo tốt nghiệp hoàn chỉnh (Gộp 5 chương)
│   ├── chapter-01.md                            # 📌 Chương 1: Tổng quan, Bối cảnh, RQ1-3, Đóng góp
│   ├── chapter-02.md                            # 📌 Chương 2: Cơ sở lý thuyết RAG, Zero-Trust, Đề án 06
│   ├── chapter-03.md                            # 📌 Chương 3: Thiết kế 4 Module cốt lõi (RAG, Rule, Triage, Vault)
│   ├── chapter-04.md                            # 📌 Chương 4: Thực nghiệm & Đánh giá (Recall@3, MRR, Grid Search)
│   └── chapter-05.md                            # 📌 Chương 5: Kết luận, Đánh giá thực tiễn & Hướng phát triển
│
├── 🎯 defense/                                  # HỒ SƠ BẢO VỆ TỐT NGHIỆP TRƯỚC HỘI ĐỒNG
│   ├── DEFENSE_PRESENTATION_AND_DEMO.md         # 🖼️ Bộ khung 10 Slide thuyết trình + Kịch bản Demo 3 phút
│   ├── DEFENSE_QA_AND_RATIONALE.md              # 🛡️ Bộ 6 câu hỏi phản biện hiểm hóc & Lập luận kỹ thuật
│   └── PROJECT_DEFENSE_REVIEW.md                # 📊 Báo cáo đánh giá độc lập 8 khía cạnh kỹ thuật & học thuật
│
├── 🏗️ architecture/                             # ĐẶC TẢ KỸ THUẬT & KIẾN TRÚC PHẦN MỀM
│   ├── SYSTEM_SPECIFICATION.md                  # ⚙️ Đặc tả 7 REST APIs, cấu trúc Entity, HNSW, Redis Key
│   ├── ARCHITECTURE_AND_FLOWS.md                # 🔄 Sơ đồ tuần tự (Sequence Diagram), Luồng dữ liệu 4 module
│   ├── PROJECT_CONSTRAINTS.md                   # 🔒 Ràng buộc phần cứng Zero-Cost, RAM ≤ 2GB, Bảo mật NĐ 13
│   └── GIT_WORKFLOW.md                          # 🌿 Quy chuẩn đặt tên nhánh, Conventional Commits, Release
│
├── 🚀 roadmap/                                  # LỘ TRÌNH DỰ ÁN & ĐỀ TÀI NCKH
│   ├── EXPANSION_ROADMAP_2.0.md                 # 🌟 Lộ trình mở rộng 8 tuần SmartWard AI 2.0 (Khả thi 100%)
│   ├── BASELINE_ROADMAP_12W.md                  # 📅 Lịch trình 12 tuần cơ sở đồ án tốt nghiệp (W01 – W12)
│   └── BUSINESS_AND_RESEARCH_PLAN.md            # 💡 Đề cương đề tài NCKH cấp Trường & Hội thảo ICT Quốc gia
│
└── 📅 weekly-reports/                           # NHẬT KÝ & BÁO CÁO TIẾN ĐỘ THỰC TẬP
    ├── week-01-report.md đến week-11-report.md  # 📝 Báo cáo chi tiết từng tuần nộp GVHD & Doanh nghiệp
    ├── chapter1-bao-cao-hkdn.md                 # 🏢 Báo cáo quá trình thực tập tại Viettel An Giang
    └── TEMPLATE.md                              # 📋 Biểu mẫu báo cáo tiến độ tuần chuẩn UTH
```

---

## 📖 3. Tóm Tắt Từng Tài Liệu & Khi Nào Cần Đọc

### 3.1 Nhóm Khóa Luận & Học Thuật UTH (`docs/thesis-chapters/`)

1. **[`FULL_THESIS_REPORT_UTH.md`](thesis-chapters/FULL_THESIS_REPORT_UTH.md):**
   - **Nội dung:** Toàn văn khóa luận đóng bìa nộp trường UTH. Đầy đủ Lời cam đoan, Lời cảm ơn, Danh mục từ viết tắt, 14 bảng biểu so sánh, 15 đồ thị và 5 chương nội dung.
   - **Khi nào đọc:** Khi cần in ấn, đóng bìa cứng mạ vàng hoặc gửi file PDF hoàn chỉnh cho GVHD và Doanh nghiệp ký duyệt.

2. **[`chapter-01.md`](thesis-chapters/chapter-01.md) đến [`chapter-05.md`](thesis-chapters/chapter-05.md):**
   - **Nội dung:** Từng chương tách rời để dễ chỉnh sửa khi GVHD yêu cầu sửa đổi cục bộ.
   - Chương 1: Bối cảnh chuyển đổi số xã/phường, 3 câu hỏi nghiên cứu (RQ1, RQ2, RQ3).
   - Chương 2: Tổng quan RAG, pgvector, Zero-Trust Architecture và Nghị định 13/2023.
   - Chương 3: Kiến trúc chi tiết 4 module và thuật toán gom cụm 2 pha ($R=75\text{m}, \tau=0.78$).
   - Chương 4: Số liệu thực nghiệm (Recall@3 đạt 94.4%, MRR 0.891, F1 triage 0.912).
   - Chương 5: Kết luận và cam kết đạo đức AI.

---

### 3.2 Nhóm Hồ Sơ Bảo Vệ Đồ Án (`docs/defense/`)

1. **[`DEFENSE_PRESENTATION_AND_DEMO.md`](defense/DEFENSE_PRESENTATION_AND_DEMO.md):**
   - **Nội dung:** 
     - Thiết kế nội dung **10 Slide thuyết trình** cô đọng, nói đúng trọng tâm trong 10 phút.
     - **Kịch bản Demo trực tiếp 3 phút** với 3 tình huống thực tế: (1) RAG từ chối câu hỏi bẫy; (2) Rule Engine phát hiện sai số CCCD & ngày sinh; (3) Triage tự động gộp 2 phản ánh hiện trường trùng lặp.
   - **Khi nào đọc:** 2 ngày trước khi bảo vệ để tập dượt thuyết trình và quay video demo dự phòng.

2. **[`DEFENSE_QA_AND_RATIONALE.md`](defense/DEFENSE_QA_AND_RATIONALE.md):**
   - **Nội dung:** Tổng hợp **6 câu hỏi phản biện hóc búa nhất** mà Hội đồng chấm đồ án UTH thường chất vấn (Tại sao chọn pgvector thay vì Milvus/Pinecone? Tại sao dùng gom cụm 2 pha thay vì DBSCAN thuần túy? Làm sao chứng minh an toàn thông tin theo Nghị định 13?...). Mỗi câu hỏi đều có sẵn câu trả lời chuẩn chỉnh, thuyết phục.
   - **Khi nào đọc:** Học thuộc lòng trước ngày bảo vệ để tự tin trả lời bất kỳ câu hỏi phản biện nào.

3. **[`PROJECT_DEFENSE_REVIEW.md`](defense/PROJECT_DEFENSE_REVIEW.md):**
   - **Nội dung:** Báo cáo đánh giá độc lập toàn diện đồ án theo 8 tiêu chí kiểm định chất lượng phần mềm và học thuật.

---

### 3.3 Nhóm Thiết Kế Hệ Thống & Kỹ Thuật (`docs/architecture/`)

> [!NOTE]
> Đây là nhóm tài liệu **quan trọng nhất cho việc Lập trình và Duy trì Mã nguồn**. Cả bạn và AI Agent luôn đối chiếu nhóm này khi viết code.

1. **[`SYSTEM_SPECIFICATION.md`](architecture/SYSTEM_SPECIFICATION.md):**
   - **Nội dung:** Đặc tả 7 REST APIs chính của hệ thống (`/api/v1/rag/ask`, `/api/v1/forms/precheck`, `/api/v1/issues/report`, `/api/v1/vault/upload`...), định dạng Request/Response JSON, mã lỗi BusinessException, và cấu trúc các bảng PostgreSQL.
   - **Khi nào đọc:** Khi cần viết thêm Controller, Service hoặc Frontend API Client.

2. **[`ARCHITECTURE_AND_FLOWS.md`](architecture/ARCHITECTURE_AND_FLOWS.md):**
   - **Nội dung:** Sơ đồ tuần tự (Sequence Diagram), luồng di chuyển của dữ liệu giữa Frontend React $\leftrightarrow$ Spring Boot Backend $\leftrightarrow$ PostgreSQL pgvector $\leftrightarrow$ Redis 7 $\leftrightarrow$ MinIO Object Storage.

3. **[`PROJECT_CONSTRAINTS.md`](architecture/PROJECT_CONSTRAINTS.md):**
   - **Nội dung:** Ràng buộc nghiêm ngặt: Tổng RAM $\le 2.0\text{ GB}$, Zero-Cost (không tốn tiền duy trì), tuân thủ Nghị định 13/2023/NĐ-CP (xóa tài liệu sau 7 ngày, đóng dấu Watermark chống rò rỉ).

4. **[`GIT_WORKFLOW.md`](architecture/GIT_WORKFLOW.md):**
   - **Nội dung:** Quy tắc đặt tên nhánh Git (`main`, `feature/*`), cấu trúc Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`), và quy trình Release phiên bản.

---

### 3.4 Nhóm Lộ Trình Phát Triển & NCKH (`docs/roadmap/`)

1. **[`EXPANSION_ROADMAP_2.0.md`](roadmap/EXPANSION_ROADMAP_2.0.md):**
   - **Nội dung:** Bản lộ trình mở rộng 8 tuần (W13 – W20) SmartWard AI 2.0 đã được tinh chỉnh thực tế:
     - Multi-Ward Onboarding (chọn địa bàn thường trú $\rightarrow$ định vị trụ sở Một Cửa).
     - Per-Ward Isolation (luật dùng chung cấp tỉnh, chỉ cô lập dịch vụ và sự cố theo phường).
     - Quét mã QR mặt trước thẻ CCCD (tự động trích xuất chuỗi `|` điền tờ khai trong 0.5s, bỏ qua giải mã chip NFC phức tạp).
     - Fine-tune Vietnamese Bi-Encoder trên Colab T4 + Human-in-the-Loop Active Learning.
   - **Khi nào đọc:** Khi bắt đầu giai đoạn phát triển mở rộng sau khi bảo vệ tốt nghiệp.

2. **[`BASELINE_ROADMAP_12W.md`](roadmap/BASELINE_ROADMAP_12W.md):**
   - **Nội dung:** Kế hoạch thực hiện 12 tuần ban đầu của đồ án tốt nghiệp từ W01 đến W12.

3. **[`BUSINESS_AND_RESEARCH_PLAN.md`](roadmap/BUSINESS_AND_RESEARCH_PLAN.md):**
   - **Nội dung:** Đề cương nghiên cứu khoa học, mô hình chuyển giao công nghệ cho UBND xã/phường và kế hoạch gửi bài báo tại Hội thảo ICT.

---

### 3.5 Nhóm Báo Cáo Tiến Độ Tuần (`docs/weekly-reports/`)

- Chứa toàn bộ các bản báo cáo tiến độ nộp định kỳ hàng tuần cho Giảng viên hướng dẫn (TS. Lê Văn Quốc Anh) và Mentor Doanh nghiệp (Viettel An Giang), kèm biên bản đánh giá thực tập học kỳ doanh nghiệp.

---

## 🛠️ 4. Quy Tắc Duy Trì Tài Liệu Cho Lập Trình Viên & AI Agent

Khi thêm tính năng mới hoặc chỉnh sửa mã nguồn:

1. **Thay đổi CSDL / API:** Cập nhật ngay [`docs/architecture/SYSTEM_SPECIFICATION.md`](architecture/SYSTEM_SPECIFICATION.md) và migration script tương ứng trong `backend/src/main/resources/db/migration/`.
2. **Cập nhật tiến độ:** Tích vào checkbox trong [`TODO.md`](../TODO.md) ở thư mục gốc.
3. **Phát triển tính năng mở rộng:** Luôn tuân theo kiến trúc khả thi trong [`docs/roadmap/EXPANSION_ROADMAP_2.0.md`](roadmap/EXPANSION_ROADMAP_2.0.md).
4. **Không tạo file rời rạc ở thư mục gốc:** Mọi tài liệu mới phải được xếp vào đúng 1 trong 5 thư mục con nêu trên.

---

*Hệ thống tài liệu này được thiết lập chuẩn hóa nhằm đảm bảo bạn đạt kết quả bảo vệ tốt nghiệp xuất sắc tại UTH và dễ dàng chuyển tiếp thành đề tài Nghiên cứu khoa học cấp cao.*
