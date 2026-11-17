# Master Documentation Index — SmartWard AI

> **Dự án:** Hệ sinh thái Hành chính công & Đô thị số cấp Xã/Phường SmartWard AI (Tỉnh An Giang, 96 xã/phường/đặc khu)  
> **Phiên bản:** Production Hardening (Tháng 11/2026)  
> **Tình trạng kiểm thử:** 420/420 Backend Maven Tests PASS | Frontend Build Clean (0 errors)

---

## 📜 Quy Ước Bắt Buộc Về Quản Trị Tài Liệu (Documentation Governance)

Để tránh tình trạng tài liệu bị phân mảnh, trùng lặp hoặc tạo file tùy tiện ở thư mục gốc, **mọi kỹ sư và AI Agent phải tuân thủ nghiêm ngặt bảng phân loại sau**:

| Phân nhóm thư mục | Loại nội dung được phép đặt vào | Trách nhiệm & Bản chất tài liệu | Ví dụ tệp điển hình |
| :--- | :--- | :--- | :--- |
| **`docs/project/`** | Tổng quan đề tài, bối cảnh, yêu cầu gốc & milestone | Single Source of Truth cho toàn dự án | `PROJECT.md` |
| **`docs/specs/`** | **Đặc tả tính năng / Sản phẩm** (Cái gì được xây, hành vi ra sao, payload, UI flow) | Đặc tả chức năng, hợp đồng giao diện, luồng màn hình | `MOBILE_APP_SPEC.md`, `SMARTWARD_SPEC_AND_DEPLOYMENT_ROADMAP.md` |
| **`docs/architecture/`** | **Thiết kế kỹ thuật hệ thống** (Vì sao xây như vậy, kiến trúc, sơ đồ, bảo mật, RAM) | Thiết kế hệ thống, sơ đồ tuần tự, ràng buộc phần cứng, quy chuẩn Git | `SYSTEM_SPECIFICATION.md`, `ARCHITECTURE_AND_FLOWS.md`, `PROJECT_CONSTRAINTS.md` |
| **`docs/roadmap/`** | **Kế hoạch theo thời gian dài hạn** (Khi nào làm gì, lộ trình chiến lược) | Kế hoạch dài hạn cố định, ít biến động | `ROADMAP.md`, `BASELINE_ROADMAP_12W.md`, `EXPANSION_ROADMAP_2.0.md` |
| **`docs/` (Gốc docs)** | **Việc đang làm tuần này / hôm nay** (Sprint board sống, cập nhật liên tục) | Bảng theo dõi tiến độ công việc hàng ngày/tuần | `TODO_SPRINT_BOARD.md` |
| **`docs/reports/`** | **Báo cáo kỹ thuật gửi Mentor / Giảng viên** | Báo cáo cột mốc quan trọng, đánh giá hiệu năng | `BAO_CAO_TIEN_DO_DEPLOY_MENTOR.md`, `MENTOR_TECHNICAL_BRIEFING.md` |
| **`docs/weekly-reports/`** | **Nhật ký tuần đã qua** (Lịch sử đã xảy ra) | Báo cáo tiến độ từng tuần nộp doanh nghiệp/nhà trường | `week-01-report.md` .. `week-11-report.md` |
| **`docs/testing/`** | **Bảo đảm chất lượng & Kiểm thử** | Hướng dẫn chạy test, E2E test suite, test harness | `TEST_READY.md`, `TEST_INFRA.md` |

> ⚠️ **NGUYÊN TẮC BẤT BIẾN:**  
> 1. **KHÔNG TẠO BẤT KỲ FILE `.md` NÀO Ở THƯ MỤC GỐC REPO** (Thư mục gốc chỉ duy trì đúng 2 file markdown: `README.md` và `AGENTS.md`).  
> 2. Trước khi tạo file markdown mới, bắt buộc đối chiếu bảng phân loại trên và đặt đúng vào thư mục con phù hợp trong `docs/`.

---

## 🧭 1. Bản Đồ Tra Cứu Nhanh Cho Kỹ Sư & Giảng Viên

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BẢN ĐỒ TÀI LIỆU TOÀN DIỆN SMARTWARD AI                               │
├─────────────────────────┬─────────────────────────────────────────────────┬────────────────────────────┤
│ Tác vụ cần tra cứu      │ Mở tài liệu nào?                                │ Nội dung chính             │
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 📋 TỔNG QUAN DỰ ÁN      │ • docs/project/PROJECT.md                       │ • Bối cảnh, Yêu cầu R1-R5, │
│    & YÊU CẦU CỐT LÕI    │ • README.md (gốc repo)                          │   Bảng F1-F18 & Milestones │
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 📐 ĐẶC TẢ TÍNH NĂNG     │ • docs/specs/MOBILE_APP_SPEC.md                 │ • Đặc tả Mobile Native App │
│    & SẢN PHẨM           │ • docs/specs/SMARTWARD_UNIFIED_AGENT_AND_...    │ • Đặc tả tính năng hợp nhất│
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ ⚙️ THIẾT KẾ KIẾN TRÚC   │ • docs/architecture/SYSTEM_SPECIFICATION.md     │ • 10 REST APIs & 4 Tờ khai │
│    & KỸ THUẬT HỆ THỐNG  │ • docs/architecture/ARCHITECTURE_AND_FLOWS.md   │ • Luồng GPS 25m & Vault OTT│
│                         │ • docs/architecture/PROJECT_CONSTRAINTS.md      │ • Trần RAM 2048MB & NĐ 13  │
│                         │ • docs/architecture/GIT_WORKFLOW.md             │ • Chuẩn Git & Conventional │
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 🚀 LỘ TRÌNH CHIẾN LƯỢC  │ • docs/roadmap/ROADMAP.md                       │ • Lộ trình 2026 & M1–M4    │
│    (Kế hoạch dài hạn)   │ • docs/roadmap/BASELINE_ROADMAP_12W.md          │ • Đề cương 12 tuần cơ sở   │
│                         │ • docs/roadmap/EXPANSION_ROADMAP_2.0.md         │ • Kế hoạch mở rộng 2.0     │
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 📌 SPRINT BOARD SỐNG    │ • docs/TODO_SPRINT_BOARD.md                     │ • Đầu việc đang làm/đã xong│
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 🧪 KIỂM THỬ & CHẤT LƯỢNG│ • docs/testing/TEST_READY.md                    │ • 420 Unit & 161 E2E tests │
│                         │ • docs/testing/TEST_INFRA.md                    │ • Hạ tầng test & fixtures  │
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 📑 BÁO CÁO THỰC TẾ      │ • docs/reports/MENTOR_TECHNICAL_BRIEFING.md     │ • Báo cáo Mentor Viettel   │
│    (Đã hoàn thành)      │ • docs/reports/BAO_CAO_TIEN_DO_DEPLOY_MENTOR.md │ • Báo cáo Deploy Cloud     │
│                         │ • docs/weekly-reports/                          │ • Nhật ký tuần W01–W11     │
└─────────────────────────┴─────────────────────────────────────────────────┴────────────────────────────┘
```

---

## 🗂️ 2. Tóm Tắt Chi Tiết Từng Phân Hệ

### 2.1. Phân hệ Đặc tả Tính năng & Sản phẩm (`docs/specs/`)
* **[`MOBILE_APP_SPEC.md`](specs/MOBILE_APP_SPEC.md):** Bản đặc tả hoàn chỉnh về tính năng và hành vi sản phẩm cho Native Mobile App (React Native + Expo SDK 52) phục vụ 96 xã/phường tỉnh An Giang: 6 màn hình chuyên biệt (Onboarding, Legal RAG Chat + TTS, Smart Form Precheck, Báo sự cố hiện trường GPS 25m, Ví hồ sơ và Phiếu hẹn QR offline, Bàn duyệt của Cán bộ tại quầy) kèm bảng ánh xạ công nghệ Web sang Mobile Native.
* **[`SMARTWARD_UNIFIED_AGENT_AND_MOBILE_SPEC.md`](specs/SMARTWARD_UNIFIED_AGENT_AND_MOBILE_SPEC.md):** Tài liệu đặc tả hợp nhất nền tảng web & mobile và các kịch bản thực thi tác tử.
* **[`SMARTWARD_SPEC_AND_DEPLOYMENT_ROADMAP.md`](specs/SMARTWARD_SPEC_AND_DEPLOYMENT_ROADMAP.md):** Bản lưu trữ đặc tả kỹ thuật chi tiết theo giai đoạn triển khai.

### 2.2. Phân hệ Thiết kế Kỹ thuật & Ràng buộc Hệ thống (`docs/architecture/`)
* **[`SYSTEM_SPECIFICATION.md`](architecture/SYSTEM_SPECIFICATION.md):** Bản thiết kế kỹ thuật giải thích *vì sao* hệ thống được xây dựng như hiện tại: 10 REST APIs, JPA Entities, chỉ mục HNSW vector 768 chiều, cơ chế chống Pixel Flood OOM (tối đa 4096px, 16M pixels), cơ chế băm One-Time Token (OTT) bằng SHA-256, và thuật toán phân cụm Two-Pass Bipartite Majority Alignment.
* **[`ARCHITECTURE_AND_FLOWS.md`](architecture/ARCHITECTURE_AND_FLOWS.md):** Sơ đồ tuần tự và luồng truyền thông giữa các phân hệ: React Frontend $\leftrightarrow$ Spring Boot Backend $\leftrightarrow$ PostgreSQL pgvector $\leftrightarrow$ Redis 7 $\leftrightarrow$ MinIO $\leftrightarrow$ Local AI Sidecar.
* **[`PROJECT_CONSTRAINTS.md`](architecture/PROJECT_CONSTRAINTS.md):** Các ràng buộc kỹ thuật bất biến: trần RAM 2048 MiB cho 6 containers, vận hành Zero-Cost 0 VNĐ, tuân thủ Nghị định 13/2023/NĐ-CP (xóa sau 7 ngày, đóng dấu mờ chéo, cấp link xem 1 lần duy nhất).
* **[`GIT_WORKFLOW.md`](architecture/GIT_WORKFLOW.md):** Quy chuẩn phát triển mã nguồn: cấm commit trực tiếp lên `main`, bắt buộc phân nhánh từ `develop`, quy tắc đặt tên commit chuẩn Conventional Commits.

### 2.3. Phân hệ Lộ trình Chiến lược (`docs/roadmap/`) vs. Sprint Board Sống (`docs/TODO_SPRINT_BOARD.md`)
* **[`docs/roadmap/ROADMAP.md`](roadmap/ROADMAP.md):** Lộ trình chiến lược dài hạn: tổng kết nghiệm thu M1–M4 và định hướng phát hành release production, pilot 1–5 phường/xã và kế hoạch mở rộng.
* **[`docs/roadmap/BASELINE_ROADMAP_12W.md`](roadmap/BASELINE_ROADMAP_12W.md):** Kế hoạch cơ sở 12 tuần được giữ nguyên làm mốc đối sánh học thuật.
* **[`docs/TODO_SPRINT_BOARD.md`](TODO_SPRINT_BOARD.md):** **Sprint board sống** ghi nhận chi tiết trạng thái từng đầu việc kỹ thuật đang thực hiện, đã hoàn thành hoặc đang chờ xử lý theo từng ngày/tuần.

### 2.4. Phân hệ Báo cáo Thực tế (`docs/reports/` & `docs/weekly-reports/`)
* **[`docs/reports/MENTOR_TECHNICAL_BRIEFING.md`](reports/MENTOR_TECHNICAL_BRIEFING.md):** Báo cáo đánh giá hiệu năng kỹ thuật gửi Mentor Viettel An Giang và Giảng viên hướng dẫn.
* **[`docs/reports/BAO_CAO_TIEN_DO_DEPLOY_MENTOR.md`](reports/BAO_CAO_TIEN_DO_DEPLOY_MENTOR.md):** Báo cáo tiến độ vận hành hệ thống thực tế trên nền tảng Cloud.
* **[`docs/weekly-reports/`](weekly-reports/):** Toàn bộ 11 bản báo cáo tiến độ nộp định kỳ hàng tuần từ W01 đến W11.
