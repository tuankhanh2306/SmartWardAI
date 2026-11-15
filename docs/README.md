# Master Documentation Index — SmartWard AI

> **Dự án:** Hệ thống Hành chính công & Đô thị thông minh cấp Xã/Phường SmartWard AI (Tỉnh An Giang, 96 xã/phường/đặc khu)  
> **Phiên bản:** Production Hardening (Tháng 11/2026)  
> **Tình trạng kiểm thử:** 420/420 Backend Maven Tests PASS | Frontend Build Clean (0 errors)

---

## 🧭 1. Bản Đồ Điều Hướng Nhanh

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BẢN ĐỒ TÀI LIỆU TOÀN DIỆN SMARTWARD AI                               │
├─────────────────────────┬─────────────────────────────────────────────────┬────────────────────────────┤
│ Tác vụ cần tra cứu      │ Mở tài liệu nào?                                │ Nội dung chính             │
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ ⚙️ KIẾN TRÚC & ĐẶC TẢ   │ • docs/architecture/SYSTEM_SPECIFICATION.md     │ • 10 REST APIs & 4 Tờ khai │
│    KỸ THUẬT             │ • docs/architecture/ARCHITECTURE_AND_FLOWS.md   │ • Luồng GPS 25m & Vault OTT│
│                         │ • docs/architecture/PROJECT_CONSTRAINTS.md      │ • Trần RAM 2048MB & NĐ 13  │
│                         │ • docs/architecture/GIT_WORKFLOW.md             │ • Chuẩn Git & Conventional │
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 🚀 LỘ TRÌNH & NÂNG CẤP  │ • docs/roadmap/ROADMAP.md                       │ • Lộ trình 2026 & Trạng    │
│    HỆ THỐNG             │ • docs/mobile.md                                │   thái M1–M4 (100% DONE)   │
│                         │ • docs/roadmap/EXPANSION_ROADMAP_2.0.md         │ • Đặc tả Mobile App Native │
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 🧪 KIỂM THỬ & BẢO ĐẢM   │ • docs/testing/TEST_READY.md                    │ • 420 Unit/Integration &   │
│    CHẤT LƯỢNG           │ • docs/testing/TEST_INFRA.md                    │   161 E2E Test Scenarios   │
│                         │ • evaluation/results/                           │ • Số liệu thực nghiệm RQ1-3│
├─────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────┤
│ 📑 BÁO CÁO DOANH NGHIỆP │ • docs/reports/MENTOR_TECHNICAL_BRIEFING.md     │ • Báo cáo kỹ thuật Mentor  │
│    (Viettel An Giang)   │ • docs/weekly-reports/                          │ • Báo cáo thực tập tuần    │
└─────────────────────────┴─────────────────────────────────────────────────┴────────────────────────────┘
```

---

## 🗂️ 2. Danh Mục Tài Liệu Theo Phân Hệ

### 2.1. Phân hệ Kiến trúc & Ràng buộc Kỹ thuật (`docs/architecture/`)
* **[`SYSTEM_SPECIFICATION.md`](architecture/SYSTEM_SPECIFICATION.md):** Bản đặc tả hoàn chỉnh 10 nhóm REST API, cấu trúc các thực thể JPA, các quy tắc Rule Engine (`CT01`, `TK-KS`, `TK-KH`, `TK-BTXH`), cơ chế chống Pixel Flood OOM, băm SHA-256 One-Time Token (OTT), và thuật toán phân cụm Two-Pass Bipartite Majority Alignment.
* **[`ARCHITECTURE_AND_FLOWS.md`](architecture/ARCHITECTURE_AND_FLOWS.md):** Sơ đồ tuần tự và luồng xử lý dữ liệu giữa React Frontend $\leftrightarrow$ Spring Boot Backend $\leftrightarrow$ PostgreSQL pgvector $\leftrightarrow$ Redis 7 $\leftrightarrow$ MinIO Object Storage $\leftrightarrow$ Python AI Sidecar.
* **[`PROJECT_CONSTRAINTS.md`](architecture/PROJECT_CONSTRAINTS.md):** Quy định nghiêm ngặt về ngân sách tài nguyên: tổng RAM 6 container $\le 2048\text{ MiB}$, chi phí vận hành 0 VNĐ (Zero-Cost), độ dài khóa mật mã $\ge 32\text{ bytes}$, bảo vệ quyền riêng tư theo Nghị định 13/2023/NĐ-CP.
* **[`GIT_WORKFLOW.md`](architecture/GIT_WORKFLOW.md):** Quy chuẩn phát triển phần mềm: cấm commit trực tiếp lên `main`, phân nhánh `feature/*`, `bugfix/*` từ `develop`, và quy tắc thông điệp commit theo Conventional Commits.

### 2.2. Phân hệ Lộ trình & Ứng dụng Di động (`docs/roadmap/` & `docs/mobile.md`)
* **[`docs/roadmap/ROADMAP.md`](roadmap/ROADMAP.md):** Tổng kết chi tiết trạng thái hoàn thiện 100% của 4 Milestone (M1: Bảo mật PII & Vault, M2: Thực nghiệm thật & Validator STRICT, M3: 40 TTHC An Giang 2026 & CT01/VNeID, M4: Tích hợp và Post-Victory Audit), kèm kế hoạch phát hành Release và thí điểm diện rộng.
* **[`docs/mobile.md`](mobile.md):** Bản đặc tả kiến trúc Native Mobile App (React Native + Expo SDK 52) cho 96 xã/phường/đặc khu tỉnh An Giang, gồm 6 màn hình chuyên biệt và bảng ánh xạ công nghệ Web sang Mobile Native.
* **[`docs/roadmap/EXPANSION_ROADMAP_2.0.md`](roadmap/EXPANSION_ROADMAP_2.0.md):** Đề xuất mở rộng các tính năng thế hệ tiếp theo (Fine-tune mô hình AI cục bộ, tích hợp chữ ký số và đồng bộ định danh VNeID).

### 2.3. Phân hệ Kiểm thử & Nghiệm thu Chất lượng (`docs/testing/`)
* **[`docs/testing/TEST_READY.md`](testing/TEST_READY.md):** Báo cáo sẵn sàng kiểm thử toàn diện: cập nhật kết quả 420 bài kiểm thử Backend Maven đạt 100% PASS, 44 bài kiểm thử Frontend Acceptance PASS, và hệ thống 161 kịch bản kiểm thử E2E phân tầng (Tier 1–4).
* **[`docs/testing/TEST_INFRA.md`](testing/TEST_INFRA.md):** Hướng dẫn cấu hình hạ tầng kiểm thử, cơ chế tự động dò tìm cổng (Port Discovery) và nạp dữ liệu thử nghiệm giả lập (Synthetic Fixtures).

---

## 🛠️ 3. Quy Tắc Duy Trì Tính Toàn Vẹn Cho Kỹ Sư & Agent

1. **Tuân thủ Flyway Checksum:** Tuyệt đối không chỉnh sửa nội dung các tệp migration đã phát hành từ `V1` đến `V5`. Mọi thay đổi cấu trúc bảng CSDL mới phải tạo tệp migration kế tiếp `V6__...sql`.
2. **Bảo toàn Ngân sách RAM:** Khi bổ sung container hoặc thư viện mới, luôn kiểm tra tổng `mem_limit` trong `docker-compose.yml` không được vượt quá `2048 MiB`.
3. **Quy trình Release Chuẩn:**
   ```powershell
   git checkout main && git pull origin main
   git merge --no-ff develop -m "release: v1.0.0-production-angiang-2026"
   git push origin main
   ```
