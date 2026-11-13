# SmartWard AI — Agent Context Map
> **Mục đích:** File này giúp AI Agent load context tối thiểu thay vì scan toàn bộ project.  
> Đọc file này trước, rồi chỉ mở thêm file liên quan đến task hiện tại.

---

## 🗺️ Cấu trúc monorepo

```
e:\SmartWardAI\
├── backend/        Spring Boot 3.3 / Java 21 — API server port 8080
├── frontend/       React + Vite + TailwindCSS — port 3000
├── ml/             Python FastAPI sidecar — port 8000, ONNX inference
├── data-pipeline/  40 TTHC crawler & dataset (chỉ đọc khi seed)
├── evaluation/     Scripts đánh giá học thuật (chỉ đọc khi eval)
├── docs/           Tài liệu kỹ thuật & weekly reports
└── docker-compose.yml  6 containers, tổng RAM ≤ 2048 MiB
```

---

## 🔢 Magic Numbers — KHÔNG cần đọc lại file để tra

| Key | Value |
|-----|-------|
| RAG threshold trả lời | θ = 0.78 |
| RAG gray-zone HITL | θ_lower = 0.42 |
| Triage cosine | τ = 0.82 |
| Triage geo radius | R = 25 m / 72 h |
| Embedding dims | 768 (gemini-embedding-001, MRL) |
| Encryption | AES-256-GCM |
| JWT TTL | 8 giờ |
| Auth cán bộ | HMAC-SHA256 |
| HITL queue max | 50 items (CopyOnWriteArrayList) |
| RAM budget | ≤ 2048 MiB (6 containers) |

---

## 🔗 URLs & Hạ tầng

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:3000 |
| Backend (Spring) | http://localhost:8080 |
| ML Sidecar | http://localhost:8000 |
| MinIO console | http://localhost:9000 |
| PostgreSQL | localhost:5432 / db `smartward` |
| Redis | localhost:6379 |
| Jira project | https://ut-team-v1rret25.atlassian.net / project **KAN** |

---

## 📁 File cốt lõi theo module (chỉ mở khi cần)

### Backend — đọc theo module task yêu cầu:
```
backend/src/main/java/vn/edu/uth/smartward/
  ai/          → AiModelClient, GeminiAiClient, SidecarAiModelClient
  rag/         → RagController, RagQueryService, LegalChunkingService
  formcheck/   → FormCheckController, FormPrecheckService, CccdValidator
  triage/      → TriageController, TwoStageTriageService, SpatialIndexService
  vault/       → VaultController, ZeroTrustVaultService, ImageWatermarkService
  evaluation/  → EvaluationController, ExperimentRunnerService
  common/      → ApiResponse, GlobalExceptionHandler, RedisRateLimiter
  config/      → CorsConfig, RedisConfig, MinioConfig, OpenApiConfig
```
Config: `backend/src/main/resources/application.yml`  
DB migrations: `backend/src/main/resources/db/migration/`  
Seed (40 TTHC): `backend/src/main/resources/db/seed/procedures/`

### Frontend — đọc theo trang task yêu cầu:
```
frontend/src/
  pages/     → CitizenPortal, FormAndIssueReporting, PerWardDashboard, WardOnboarding
  components/→ Header, OfficerAuthModal, OfficerGuard, Pagination, CccdQrScannerModal
  context/   → AccessibilityContext, RoleContext, WardContext
  api/       → client.ts (Axios base)
  services/  → geminiClient, intentClassifier, legalKnowledgeBase, tesseractOcr
  utils/     → cccdQrParser.ts
```

### ML Sidecar:
- Model production: `ml/models/bkai_finetuned_int8.onnx` (129 MB)
- Intent classifier: `ml/models/intent_classifier.joblib` (40 KB)
- Serve: `ml/sidecar/serve.py` (FastAPI)

### Docs — đọc khi cần tổng quan:
```
docs/architecture/SYSTEM_SPECIFICATION.md   ← spec đầy đủ nhất
docs/architecture/ARCHITECTURE_AND_FLOWS.md ← luồng hệ thống
docs/roadmap/EXPANSION_ROADMAP_2.0.md       ← kế hoạch mở rộng
docs/testing/TEST_READY.md                  ← trạng thái kiểm thử
docs/weekly-reports/week-11/                ← báo cáo mới nhất
```

---

## 🌿 Git — Quy tắc bắt buộc (AGENTS.md)

```
main       ← production (KHÔNG commit trực tiếp)
develop    ← integration (nhánh đang làm việc)
feature/*  ← tính năng mới (tạo từ develop)
bugfix/*   ← sửa lỗi (tạo từ develop)
hotfix/*   ← vá khẩn (từ main, merge cả main+develop)
```

**Tạo nhánh mới:**
```bash
git checkout develop; git pull origin develop
git checkout -b feature/<ten-tinh-nang>
```

---

## ⚡ Các lệnh hay dùng

```powershell
# Chạy frontend dev
cd e:\SmartWardAI\frontend; npm.cmd run dev

# Build backend
cd e:\SmartWardAI\backend; ./mvnw package -DskipTests

# Khởi động toàn bộ stack (cần Docker Desktop đang chạy)
cd e:\SmartWardAI; docker compose up -d

# Xem logs container
docker compose logs -f backend

# Commit chuẩn
git add -A; git commit -m "feat(module): mo ta ngan gon"
git push origin feature/<ten-nhanh>
```

---

## 🚫 Thư mục KHÔNG cần đọc (tốn token, ít liên quan)

- `ml/models/*.onnx` — binary, không đọc được
- `data-pipeline/procedure-crawler/` — chỉ dùng khi tái-crawl
- `evaluation/` — chỉ dùng khi chạy đánh giá học thuật
- `frontend/node_modules/` — không bao giờ đọc
- `backend/target/` — build output
- `docs/weekly-reports/week-01/` đến `week-09/` — lịch sử cũ

---

## 📋 Trạng thái dự án (cập nhật: Tuần 12)

- **Giai đoạn:** Chuẩn bị bảo vệ thực tập Viettel An Giang
- **Frontend:** Hoàn chỉnh, đang chạy ổn định
- **Backend:** 8 module, tất cả endpoint đã hoạt động
- **ML:** ONNX int8 quantized, latency ~180ms P95
- **Docker:** 6 containers, ~795 MiB thực tế
- **Jira:** KAN-4 đến KAN-47, đã upload đầy đủ
- **Tests:** Unit + Integration + E2E adversarial đã viết
- **Git:** Đang ở nhánh `develop`, remote origin sync

---

*Cập nhật file này khi có thay đổi lớn về kiến trúc hoặc magic numbers.*
