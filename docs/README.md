# 📚 TRUNG TÂM ĐIỀU HƯỚNG TÀI LIỆU DỰ ÁN (MASTER DOCUMENTATION PORTAL)

> **Dự án:** SmartWard AI — Hệ thống Hỗ trợ Thủ tục Hành chính & Phân luồng Phản ánh Cấp Phường/Xã  
> **Đơn vị phát triển:** Viện Đào tạo Chất lượng cao — UTH  
> **Cập nhật gần nhất:** Tháng 11/2026 — Phiên bản chuẩn hóa kỹ thuật

---

## 🧭 1. Bản Đồ Tra Cứu Nhanh Cho Kỹ Sư & AI

Tùy theo tác vụ phát triển hoặc khi cần tra cứu đặc tả, hãy mở ngay tài liệu tương ứng:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BẢN ĐỒ TÀI LIỆU SMARTWARD AI                                         │
├─────────────────────────┬─────────────────────────────────────────────────┬────────────────────────────┤
│ Tác vụ cần làm          │ Mở tài liệu nào?                                │ Nội dung chính             │
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 💻 LẬP TRÌNH & PHÁT     │ • docs/architecture/SYSTEM_SPECIFICATION.md     │ • Đặc tả 7 REST APIs       │
│    TRIỂN HỆ THỐNG       │ • docs/architecture/ARCHITECTURE_AND_FLOWS.md   │ • Schema CSDL Flyway V1-V6 │
│    (Code Backend/Front) │ • docs/architecture/PROJECT_CONSTRAINTS.md      │ • Ràng buộc RAM ≤ 2.0GB    │
│                         │ • docs/architecture/GIT_WORKFLOW.md             │ • Quy chuẩn Git commit     │
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 🚀 LỘ TRÌNH MỞ RỘNG     │ • docs/roadmap/EXPANSION_ROADMAP_2.0.md         │ • Multi-Ward Onboarding    │
│    (SmartWard AI 2.0    │ • docs/roadmap/BASELINE_ROADMAP_12W.md          │ • Quét QR CCCD thay vì NFC │
│    Giai đoạn 8 tuần)    │ • docs/roadmap/BUSINESS_AND_RESEARCH_PLAN.md    │ • Fine-tune Bi-Encoder T4  │
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 📅 BÁO CÁO TIẾN ĐỘ      │ • docs/weekly-reports/week-01 đến 11-report.md  │ • Nhật ký tiến độ 11 tuần  │
│    (Nhật ký thực tập)   │ • docs/weekly-reports/chapter1-bao-cao-hkdn.md  │ • Báo cáo học kỳ DN        │
└─────────────────────────┴─────────────────────────────────────────────────┴────────────────────────────┘
```

---

## 🗂️ 2. Cấu Trúc Thư Mục Tài Liệu Kỹ Thuật

```
docs/
├── README.md                                    # 🗺️ (Tài liệu này) Bản đồ tổng thể và mục lục điều hướng
│
├── 🏗️ architecture/                             # ĐẶC TẢ KỸ THUẬT & KIẾN TRÚC PHẦN MỀM
│   ├── SYSTEM_SPECIFICATION.md                  # ⚙️ Đặc tả 7 REST APIs, cấu trúc Entity, HNSW, Redis Key
│   ├── ARCHITECTURE_AND_FLOWS.md                # 🔄 Sơ đồ tuần tự (Sequence Diagram), Luồng dữ liệu 4 module
│   ├── PROJECT_CONSTRAINTS.md                   # 🔒 Ràng buộc phần cứng Zero-Cost, RAM ≤ 2GB, Bảo mật NĐ 13
│   └── GIT_WORKFLOW.md                          # 🌿 Quy chuẩn đặt tên nhánh, Conventional Commits, Release
│
├── 🚀 roadmap/                                  # LỘ TRÌNH DỰ ÁN & MỞ RỘNG SẢN PHẨM
│   ├── EXPANSION_ROADMAP_2.0.md                 # 🌟 Lộ trình mở rộng 8 tuần SmartWard AI 2.0 (Khả thi 100%)
│   ├── BASELINE_ROADMAP_12W.md                  # 📅 Lịch trình 12 tuần cơ sở của dự án (W01 – W12)
│   └── BUSINESS_AND_RESEARCH_PLAN.md            # 💡 Kế hoạch sản phẩm & Đề tài NCKH
│
├── 🎨 designs/                                  # THIẾT KẾ GIAO DIỆN & TRỰC QUAN HÓA 3D
│   ├── README.md                                # 🎨 Tổng quan hồ sơ thiết kế
│   ├── agent_3d_topology.html                   # 🌐 Trực quan hóa mô hình Multi-Agent 3D không gian làm việc
│   └── prototypes/                              # 🖼️ 4 bản mẫu HTML nguyên mẫu giao diện chuẩn hóa
│       ├── citizen_portal.html                  # Cổng dịch vụ công dân sinh
│       ├── form_and_issue_reporting.html        # Tiền kiểm định tờ khai & Báo sự cố
│       ├── gis_command_center.html              # Trung tâm chỉ huy bản đồ GIS
│       └── officer_form_audit.html              # Bàn làm việc số cán bộ Một cửa
│
├── 🧪 testing/                                  # TÀI LIỆU KIỂM THỬ & BẢO ĐẢM CHẤT LƯỢNG
│   ├── README.md                                # 🧪 Hướng dẫn chạy 8 bộ kiểm thử tự động
│   └── TEST_READY.md                            # 📋 Bản cam kết sẵn sàng kiểm thử E2E & 8 kịch bản bắt buộc
│
└── 📅 weekly-reports/                           # NHẬT KÝ & BÁO CÁO TIẾN ĐỘ THỰC TẬP
    ├── week-01-report.md đến week-11-report.md  # 📝 Báo cáo chi tiết từng tuần
    ├── BAO_CAO_HKDN.docx                        # 🏢 Báo cáo thực tập doanh nghiệp (Viettel An Giang)
    ├── chapter1-bao-cao-hkdn.md                 # 📄 Chương 1 Báo cáo thực tập học kỳ DN
    └── TEMPLATE.md                              # 📋 Biểu mẫu báo cáo tiến độ tuần
```

---

## 📖 3. Tóm Tắt Từng Tài Liệu & Khi Nào Cần Đọc

### 3.1 Nhóm Thiết Kế Hệ Thống & Kỹ Thuật (`docs/architecture/`)

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

### 3.2 Nhóm Lộ Trình Phát Triển & Sản Phẩm (`docs/roadmap/`)

1. **[`EXPANSION_ROADMAP_2.0.md`](roadmap/EXPANSION_ROADMAP_2.0.md):**
   - **Nội dung:** Bản lộ trình mở rộng 8 tuần (W13 – W20) SmartWard AI 2.0 đã được tinh chỉnh thực tế:
     - Multi-Ward Onboarding (chọn địa bàn thường trú $\rightarrow$ định vị trụ sở Một Cửa).
     - Per-Ward Isolation (luật dùng chung cấp tỉnh, chỉ cô lập dịch vụ và sự cố theo phường).
     - Quét mã QR mặt trước thẻ CCCD (tự động trích xuất chuỗi `|` điền tờ khai trong 0.5s, bỏ qua giải mã chip NFC phức tạp).
     - Fine-tune Vietnamese Bi-Encoder trên Colab T4 + Human-in-the-Loop Active Learning.
   - **Khi nào đọc:** Khi lập kế hoạch và triển khai các tính năng mở rộng.

2. **[`BASELINE_ROADMAP_12W.md`](roadmap/BASELINE_ROADMAP_12W.md):**
   - **Nội dung:** Kế hoạch thực hiện 12 tuần ban đầu của hệ thống từ W01 đến W12.

3. **[`BUSINESS_AND_RESEARCH_PLAN.md`](roadmap/BUSINESS_AND_RESEARCH_PLAN.md):**
   - **Nội dung:** Kế hoạch kinh doanh, chuyển giao công nghệ cho UBND xã/phường và kế hoạch NCKH.

---

### 3.3 Nhóm Báo Cáo Tiến Độ Tuần (`docs/weekly-reports/`)

- Chứa toàn bộ các bản báo cáo tiến độ nộp định kỳ hàng tuần từ Tuần 1 đến Tuần 11, kèm báo cáo thực tập học kỳ doanh nghiệp tại Viettel An Giang.

---

## 🛠️ 4. Quy Tắc Duy Trì Tài Liệu Cho Lập Trình Viên & AI Agent

Khi thêm tính năng mới hoặc chỉnh sửa mã nguồn:

1. **Thay đổi CSDL / API:** Cập nhật ngay [`docs/architecture/SYSTEM_SPECIFICATION.md`](architecture/SYSTEM_SPECIFICATION.md) và migration script tương ứng trong `backend/src/main/resources/db/migration/`.
2. **Cập nhật tiến độ:** Tích vào checkbox trong [`TODO.md`](../TODO.md) ở thư mục gốc.
3. **Phát triển tính năng mở rộng:** Luôn tuân theo kiến trúc khả thi trong [`docs/roadmap/EXPANSION_ROADMAP_2.0.md`](roadmap/EXPANSION_ROADMAP_2.0.md).
4. **Không tạo file rời rạc ở thư mục gốc:** Mọi tài liệu kỹ thuật phải được xếp vào đúng các thư mục `architecture/` hoặc `roadmap/`.
