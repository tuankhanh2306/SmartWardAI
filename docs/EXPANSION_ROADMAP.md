# 🚀 SmartWard AI — Lộ Trình Mở Rộng Toàn Diện (Unified Expansion Roadmap)

> **Phiên bản:** 1.0 | **Ngày:** 2026-11-04  
> **Dự án:** SmartWard AI — Hệ thống Hỗ trợ Thủ tục Hành chính & Phân luồng Phản ánh Cấp Phường/Xã  
> **Đơn vị:** Viện Đào tạo Chất lượng cao — Trường Đại học Giao thông vận tải TP.HCM (UTH)  
> **Trạng thái hiện tại:** W11/12 ✅ HOÀN THÀNH — Bắt đầu giai đoạn mở rộng 2 tháng

---

## 📋 Mục Lục

1. [Tầm Nhìn Sản Phẩm](#1-tầm-nhìn-sản-phẩm)
2. [Kiến Trúc Tổng Thể Mở Rộng](#2-kiến-trúc-tổng-thể-mở-rộng)
3. [Trụ Cột 1 — Multi-Ward Smart Entry System (MỚI)](#3-trụ-cột-1--multi-ward-smart-entry-system-mới)
4. [Trụ Cột 2 — Mobile App (React Native + Expo)](#4-trụ-cột-2--mobile-app-react-native--expo)
5. [Trụ Cột 3 — AI Training & Fine-tuning](#5-trụ-cột-3--ai-training--fine-tuning)
6. [Trụ Cột 4 — GovTech Advanced Features](#6-trụ-cột-4--govtech-advanced-features)
7. [Lịch Trình 8 Tuần Chi Tiết](#7-lịch-trình-8-tuần-chi-tiết)
8. [Database Schema Mở Rộng](#8-database-schema-mở-rộng)
9. [Tech Stack Bổ Sung](#9-tech-stack-bổ-sung)
10. [KPI & Metrics Mục Tiêu](#10-kpi--metrics-mục-tiêu)

---

## 1. Tầm Nhìn Sản Phẩm

### 1.1 Hiện Trạng (Baseline — W12)

SmartWard AI hiện đã hoàn thiện 4 module cốt lõi:

| Module | Mô tả | Trạng thái |
|--------|-------|------------|
| **RAG Legal** | Hỏi đáp 40 TTHC cấp xã, Abstention Guardrail θ=0.78 | ✅ Production-ready |
| **Form Precheck** | Kiểm tra 12 số CCCD, Date Logic, Rule Engine | ✅ Production-ready |
| **Triage 2-Phase** | Redis GEO R=75m + pgvector Cosine τ=0.78 | ✅ Production-ready |
| **Document Vault** | Watermark Java2D, AES-256, MinIO, Zero-Trust | ✅ Production-ready |

**Hạn chế cần giải quyết:**
- Hệ thống chỉ phục vụ **một đơn vị hành chính cố định** (Phường 25, Bình Thạnh)
- Chưa có **onboarding flow** để công dân tự định vị địa bàn thường trú
- Chưa có **per-ward isolation** cho dữ liệu và dashboard
- Chưa có **mobile app** cho cán bộ hiện trường
- AI còn phụ thuộc mock client, chưa fine-tune tiếng Việt thực

### 1.2 Tầm Nhìn 2 Tháng

```
SmartWard AI 2.0 — Nền tảng Quản trị Địa bàn Thông minh Đa Xã/Phường

               ┌─────────────────────────────────────────────────┐
               │            CITIZEN / PUBLIC LAYER                │
               │  Ward Onboarding → GPS Map → Office Info Card    │
               │  TTHC Chat (scoped) → Form Precheck → Incident  │
               └────────────────┬────────────────────────────────┘
                                │  REST / WebSocket
               ┌────────────────▼────────────────────────────────┐
               │            MULTI-WARD BACKEND                    │
               │  Ward Registry  │  Per-Ward Isolation Middleware │
               │  AI Fine-tuned  │  Heatmap GIS │ QR Token       │
               └────────────────┬────────────────────────────────┘
                                │  gRPC / Internal
               ┌────────────────▼────────────────────────────────┐
               │         OFFICER / ADMIN LAYER                    │
               │  Per-Ward Dashboard  │  KPI Monitor  │  Audit   │
               │  Mobile App (iOS/Android) │ Push Notification   │
               └─────────────────────────────────────────────────┘
```

---

## 2. Kiến Trúc Tổng Thể Mở Rộng

### 2.1 Sơ Đồ Component

```
┌──────────────── FRONTEND (React 18 + Vite) ────────────────┐
│                                                              │
│  /onboarding ──► WardSelector (Province→District→Ward)      │
│       │                                                      │
│       ▼  WardContext (React Context API)                     │
│  /citizen      ─── RAG Chat (ward-scoped)                   │
│  /citizen/form ─── Form Precheck + GPS                      │
│  /officer/map  ─── GIS Heatmap (ward-boundary filter)       │
│  /officer/audit─── Form Audit + KPI Dashboard               │
│  /officer/ward ─── Per-Ward Incident Dashboard (NEW)        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
            │ Axios + Offline Fallback (client.ts)
┌──────────────── BACKEND (Spring Boot 3.3 / Java 21) ───────┐
│                                                              │
│  WardContextFilter ── extracts X-Ward-Code header           │
│       │                                                      │
│  ward/   ── WardRegistryController, WardService             │
│  rag/    ── RagController (ward-scoped vector search)        │
│  triage/ ── TriageController (ward-boundary polygon check)  │
│  gis/    ── HeatmapController (PostGIS ST_Within)           │
│  qr/     ── QrTokenController (ký số + virtual queue)       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
            │ JDBC / Redis / S3
┌──────────────── DATA LAYER ────────────────────────────────┐
│  PostgreSQL 16 pgvector + PostGIS                           │
│    └── ward_registry, ward_service_catalog                  │
│    └── ward_operating_hours                                 │
│    └── legal_chunks (ward_code column added)                │
│    └── issue_clusters (ward_code + geometry column)         │
│  Redis 7 ── Ward-prefixed keys "WARD:{code}:*"             │
│  MinIO   ── Bucket per ward "ward-{code}-vault"            │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Ward Context Propagation

Mọi request sẽ mang **Ward Code** xuyên suốt:

```
Citizen chọn Xã "Phường 25, Bình Thạnh" → Ward Code: "BINHCO_P025"
        │
        ▼
Frontend: localStorage.setItem('wardCode', 'BINHCO_P025')
        │
        ▼
Axios interceptor: headers['X-Ward-Code'] = wardCode
        │
        ▼
Backend WardContextFilter: ThreadLocal<WardContext>
        │
        ├── RagService: WHERE legal_chunks.ward_code = ?
        ├── TriageService: WHERE ST_Within(point, ward_boundary)
        ├── HeatmapService: ST_Within aggregate
        └── DashboardService: GROUP BY ward_code HAVING ward_code = ?
```

---

## 3. Trụ Cột 1 — Multi-Ward Smart Entry System (MỚI)

> **Đây là tính năng trung tâm của đợt mở rộng** — được ưu tiên triển khai đầu tiên.

### 3.1 Luồng Onboarding Công Dân

```
Lần đầu vào web/app
        │
        ▼
┌───────────────────────────────┐
│     WARD ONBOARDING SCREEN    │
│                               │
│  "Nhập địa bàn thường trú     │
│   theo giấy tờ của bạn"       │
│                               │
│  🏙️ Tỉnh/Thành phố: [▼]       │
│  🏘️ Quận/Huyện:    [▼]        │
│  🏠 Xã/Phường/TT:  [▼]        │
│                               │
│  [🔍 Xác Nhận Địa Bàn]        │
└───────────────┬───────────────┘
                │
                ▼
    ┌───────────────────────┐
    │  GPS MAP (Leaflet)    │
    │  ● Ward centroid pin  │
    │  ⬡ Ward boundary      │
    │    polygon overlay    │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────────────────┐
    │       WARD INFO CARD              │
    │                                   │
    │  🏛️ UBND Phường 25, Bình Thạnh    │
    │  📍 123 Nơ Trang Long, Q. Bình    │
    │     Thạnh, TP. HCM                │
    │  ⏰ T2–T6: 7:30–11:30 | 13:30–17:00│
    │  📞 (028) 3514 xxxx               │
    │                                   │
    │  ✅ Hộ tịch   ✅ Cư trú           │
    │  ✅ Chứng thực ✅ Bảo trợ XH      │
    │  ✅ Đất đai                       │
    │                                   │
    │  [Vào trang chủ →]                │
    └───────────────────────────────────┘
```

### 3.2 Database Schema — Ward Registry

```sql
-- Migration: V7__ward_registry.sql

CREATE TABLE ward_registry (
    ward_code        VARCHAR(20)   PRIMARY KEY,  -- "BINHCO_P025"
    ward_name        VARCHAR(100)  NOT NULL,     -- "Phường 25"
    district_name    VARCHAR(100)  NOT NULL,     -- "Quận Bình Thạnh"
    province_name    VARCHAR(100)  NOT NULL,     -- "TP. Hồ Chí Minh"
    office_address   TEXT,
    phone_number     VARCHAR(20),
    centroid_lat     DECIMAL(10,7) NOT NULL,
    centroid_lon     DECIMAL(10,7) NOT NULL,
    boundary_geojson JSONB,                      -- GeoJSON polygon
    is_active        BOOLEAN       DEFAULT TRUE,
    created_at       TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE ward_operating_hours (
    id               BIGSERIAL     PRIMARY KEY,
    ward_code        VARCHAR(20)   REFERENCES ward_registry(ward_code),
    day_of_week      SMALLINT      NOT NULL, -- 1=Mon, 5=Fri
    open_time        TIME          NOT NULL, -- 07:30
    close_time       TIME          NOT NULL, -- 11:30
    session          VARCHAR(10)   NOT NULL  -- 'MORNING' | 'AFTERNOON'
);

CREATE TABLE ward_service_catalog (
    id               BIGSERIAL     PRIMARY KEY,
    ward_code        VARCHAR(20)   REFERENCES ward_registry(ward_code),
    service_group    VARCHAR(50)   NOT NULL, -- 'HO_TICH' | 'CU_TRU' | ...
    service_name     VARCHAR(200)  NOT NULL,
    is_available     BOOLEAN       DEFAULT TRUE,
    online_available BOOLEAN       DEFAULT FALSE
);

-- Index cho GIS query
CREATE INDEX idx_ward_centroid ON ward_registry 
    USING GIST (ST_MakePoint(centroid_lon, centroid_lat));
```

### 3.3 Per-Ward Dashboard (Cán Bộ)

Mỗi xã/phường có **dashboard riêng biệt**:

```
/officer/ward/{wardCode}/dashboard
│
├── KPI Row
│   ├── 📊 Tổng báo sự cố tuần này: 47
│   ├── ⏱️ Thời gian xử lý TB: 2.3 ngày
│   ├── ✅ Giải quyết đúng hạn: 94.7%
│   └── 🔴 Chờ xử lý: 3 ca
│
├── GIS Map (ward-boundary scoped)
│   └── Chỉ hiển thị incident clusters trong địa bàn xã
│
├── Incident List (filtered by ward_code)
│   └── Phân loại: Cơ sở hạ tầng | ANTT | Vệ sinh | Khác
│
└── Officer Activity Log
    └── Ai đang xử lý việc gì, deadline
```

### 3.4 Ward Switching (Đổi Địa Bàn)

Công dân có thể **đổi địa bàn** nếu có nhiều nơi thường trú:

```
Header → 📍 Phường 25 [▼] → Mở dropdown Ward Switcher
```

- Dữ liệu trước (chat history, form drafts) được **lưu theo ward_code riêng**
- Không xóa dữ liệu ward cũ khi switch
- LocalStorage key pattern: `smartward__{wardCode}__history`

---

## 4. Trụ Cột 2 — Mobile App (React Native + Expo)

### 4.1 Kiến Trúc Mobile

```
┌─────────────────────────────────────┐
│         MOBILE APP (Expo SDK 51)    │
│                                     │
│  ┌─────────┐  ┌──────────────────┐  │
│  │  NFC    │  │  Camera / MLKit  │  │
│  │  CCCD   │  │  Document Scanner│  │
│  │  Reader │  │  VietOCR Client  │  │
│  └────┬────┘  └────────┬─────────┘  │
│       └───────┬────────┘            │
│               ▼                     │
│  ┌────────────────────────────────┐ │
│  │     OFFLINE-FIRST DATA LAYER   │ │
│  │  WatermelonDB (SQLite) + Sync  │ │
│  └───────────────┬────────────────┘ │
│                  │ REST (same API)  │
└──────────────────┼──────────────────┘
                   ▼
         SmartWard AI Backend
```

### 4.2 Tái Sử Dụng Code

Vì frontend đã viết bằng TypeScript, mobile app tái sử dụng **~80% type definitions**:

```typescript
// Shared: frontend/src/api/client.ts → mobile/src/api/client.ts
// Chỉ thay: axios → react-native fetch wrapper
// Tái sử dụng hoàn toàn:
//   - RagRequest, RagResponse interface
//   - FormPrecheckRequest/Response
//   - IncidentReportRequest/Response
//   - WardInfo interface (NEW)
```

### 4.3 Tính Năng Độc Quyền Mobile

#### A) NFC CCCD Chip Reader

```
Mở tính năng → Hướng dẫn đặt thẻ CCCD vào lưng điện thoại
                      │
                      ▼
        react-native-nfc-manager (ICAO 9303)
        → Đọc: Họ tên, CCCD số, Ngày sinh, Giới tính
        → Auto-fill FormPrecheckRequest
        → Không lưu raw chip data (Zero-Trust mobile)
```

#### B) MLKit Document Scanner

```
Camera → MLKit auto-crop + deskew → Preview
       → "Gửi để kiểm tra" → FormPrecheckRequest
       → VietOCR trích xuất field → Hiển thị kết quả
```

#### C) Firebase FCM Push Notifications

```
Sự kiện Backend                    → FCM Message
─────────────────────────────────────────────────
Hồ sơ được duyệt                  → "✅ Hồ sơ #123 đã được duyệt"
Sự cố được tiếp nhận              → "🔔 Báo sự cố của bạn đã được xử lý"
Nhắc hẹn lịch UBND               → "⏰ Nhắc: Nộp hồ sơ trước 11:30 hôm nay"
Cập nhật văn bản pháp luật mới    → "📋 TTHC Hộ khẩu vừa được cập nhật"
```

#### D) Offline-First với WatermelonDB

```
Online:  API → WatermelonDB sync → UI
Offline: WatermelonDB → UI (đọc cache)
         Thao tác offline → Queue → Sync khi có mạng
```

### 4.4 Phân Phối App

| Platform | Phương thức | Timeline |
|----------|-------------|----------|
| Android | Google Play Internal Testing | Tháng 2 |
| iOS | TestFlight (Apple Developer) | Tháng 2 |
| Web PWA | Hiện tại (manifest.json đã có) | ✅ Done |

---

## 5. Trụ Cột 3 — AI Training & Fine-tuning

### 5.1 Lộ Trình Fine-tune Tiếng Việt

#### Phase 1: Vietnamese Bi-Encoder Fine-tuning

```
Mục tiêu: Nâng Recall@3 từ 94.4% → 97%+

Dữ liệu:
  - 1,000 cặp Q&A từ 40 TTHC hiện có
  - 500 cặp negative (câu hỏi không liên quan)
  - Nguồn: Cán bộ UBND annotate + LLM augmentation

Model: bkai-foundation-models/vietnamese-bi-encoder
  → Fine-tune bằng Sentence Transformers
  → Loss: MultipleNegativesRankingLoss
  → Export ONNX → tích hợp vào Spring Boot

Thời gian: 2-3 giờ GPU (Colab T4 miễn phí)
```

#### Phase 2: Local SLM — Qwen-2.5-3B-Instruct

```
Mục tiêu: AI chạy 100% offline, tuân thủ NĐ13/2023

Triển khai:
  Qwen-2.5-3B-Instruct → Ollama → 4-bit GGUF quantization
  RAM: ~2.5GB (chạy được trên server UTH)
  Latency: ~1.5s/response (acceptable)

LoRA Fine-tuning (optional nếu có GPU):
  Dataset: 2,000 cặp instruction tiếng Việt về TTHC
  Framework: Unsloth + TRL
  → Merge adapter vào base model
  → Export GGUF

Privacy:
  Không gửi dữ liệu ra ngoài
  Phù hợp NĐ13 (dữ liệu cá nhân không rời server)
```

#### Phase 3: VietOCR cho Form Thủ Công

```
Mục tiêu: Đọc chữ viết tay trên tờ khai giấy

Base model: pbcquoc/vietocr (Transformer + VGG)
Fine-tune dataset:
  - 500 ảnh tờ khai scan thực tế (ẩn danh hóa)
  - Augmentation: rotation ±5°, blur, noise
  
Integration:
  POST /api/v1/ocr/extract
  → MinIO: lưu ảnh gốc (7 ngày TTL)
  → Response: JSON fields extracted
  → Auto-fill FormPrecheckRequest
```

#### Phase 4: Human-in-the-Loop Active Learning

```
Quy trình:
  1. AI trả lời câu hỏi (confidence score)
  2. Nếu confidence < 0.6 → đánh dấu "cần review"
  3. Cán bộ UBND review qua admin panel
  4. Phản hồi đúng → thêm vào training dataset
  5. Retrain monthly (cron job)

Lợi ích:
  - Dataset tự phát triển theo thực tế địa phương
  - Giảm hallucination theo thời gian
  - Cán bộ đóng vai domain expert không cần biết AI
```

### 5.2 Evaluation Framework Mở Rộng

| Metric | Baseline (W09) | Target (W12+AI) |
|--------|----------------|-----------------|
| Recall@3 | 94.4% | 97.0% |
| MRR | 0.891 | 0.930 |
| Abstention Rate | 100% (out-scope) | 100% |
| OCR Accuracy | N/A (mock) | > 92% |
| SLM Response Time | < 4s (mock) | < 2s (Ollama) |

---

## 6. Trụ Cột 4 — GovTech Advanced Features

### 6.1 Dynamic Spatial Heatmap

```
Tính năng:
  - Bản đồ nhiệt (heatmap) theo thời gian thực
  - Hotspot: Ngập úng, hạ tầng xuống cấp, an ninh
  - Filter: Theo khoảng thời gian, loại sự cố, địa bàn
  - Animation: "Playback" diễn biến theo ngày/tuần

Tech:
  Backend: PostGIS ST_HeatmapValue aggregate
  Frontend: Leaflet.heat plugin
  Cache: Redis ZRANGEBYLEX cho time-series data

Giá trị:
  - UBND quận giám sát nhiều phường cùng lúc
  - Dự báo điểm nóng → phân bổ nguồn lực chủ động
```

### 6.2 Leadership KPI Dashboard

```
Dành cho: Chủ tịch UBND, Phó Chủ tịch, Trưởng phòng

Panels:
  ┌─────────────────────────────────────────┐
  │  SLA Compliance     │  CSAT Score       │
  │  ████████░░ 87.3%   │  ★★★★☆ 4.2/5      │
  ├─────────────────────┼───────────────────┤
  │  Officer Workload   │  Pending > 7 days │
  │  Nguyễn A: 12 ca   │  🔴 5 hồ sơ       │
  │  Trần B:   8 ca    │  🟡 2 phản ánh    │
  ├─────────────────────┴───────────────────┤
  │  Monthly Trend — Incident Resolution    │
  │  ████████████████▄▄▄▄░░░░   +12% MoM   │
  └─────────────────────────────────────────┘

Tech:
  Backend: Materialized views, refresh mỗi 15 phút
  Frontend: Recharts (đã có trong package.json)
  Export: PDF report (jsPDF)
```

### 6.3 Smart QR Token Check-in

```
Quy trình:
  Công dân đặt lịch → Nhận QR code (JWT signed)
  → Đến UBND → Scan QR → Check-in tự động
  → Hàng đợi ảo: "Bạn số 7, chờ ~15 phút"
  → Cán bộ nhận thông báo: "Công dân #7 đã check-in"

Tech:
  JWT: RS256 ký số (private key lưu MinIO Vault)
  QR: qrcode.js (frontend) → scan bằng camera
  Queue: Redis SORTED SET (timestamp làm score)
  Expiry: Token hết hạn sau 24h (NĐ13 compliant)

Lợi ích:
  - Giảm tình trạng xếp hàng chen lấn
  - Dữ liệu wait time → cải thiện SLA
  - Offline QR (công dân in ra giấy vẫn dùng được)
```

### 6.4 Ward Alert & Broadcasting

```
Tính năng mới cho dashboard xã:
  - Cán bộ phát thông báo khẩn tới công dân trong địa bàn
  - Ví dụ: "Mất điện khu vực Nơ Trang Long 8:00-12:00"
  - Channels: Push notification + SMS (Twilio) + Web banner

Tech:
  Backend: Spring WebSocket (STOMP) + FCM
  Frontend: useWebSocket hook
  SMS: Twilio Programmable SMS (fallback)
```

---

## 7. Lịch Trình 8 Tuần Chi Tiết

> **Bắt đầu từ W13** (sau W12 bảo vệ tốt nghiệp UTH)

| Tuần | Tiêu Điểm | Deliverables | Effort (LOC) |
|------|-----------|--------------|--------------|
| **W13** | **Ward Registry + Onboarding** | `V7__ward_registry.sql`, `WardRegistryController`, `/onboarding` page, `WardContext.tsx` | ~800 |
| **W14** | **Ward-scoped Backend Middleware** | `WardContextFilter`, update RAG + Triage + GIS queries | ~600 |
| **W15** | **Per-Ward Dashboard** | `/officer/ward/{code}` page, Ward KPI components, GIS boundary filter | ~700 |
| **W16** | **Dynamic Heatmap + QR Token** | `HeatmapController`, Leaflet.heat, `QrTokenController`, JWT RS256 | ~900 |
| **W17** | **Vietnamese Bi-Encoder Fine-tune** | Training script, 1K Q&A dataset, ONNX export, replace mock AI | ~400 |
| **W18** | **Local SLM via Ollama + VietOCR** | Ollama Docker service, `OcrController`, OCR fine-tune pipeline | ~600 |
| **W19** | **Mobile App Foundation (Expo)** | Expo project init, shared types, Ward Onboarding screen, offline sync | ~1200 |
| **W20** | **Mobile NFC + Camera + FCM** | NFC CCCD reader, MLKit scanner, FCM notifications, TestFlight build | ~1000 |

**Tổng ước tính:** ~6,200 LOC mới | ~20 endpoints | ~5 migration scripts

### Milestone Timeline

```
W13 ──────── W14 ──────── W15 ──────── W16 ──────── W17 ──────── W18 ──────── W19 ──────── W20
│            │            │            │            │            │            │            │
Ward         Backend      Per-Ward     Heatmap     AI Fine-     SLM +        Mobile      Mobile
Registry     Middleware   Dashboard    + QR        tune         OCR          Foundation  NFC + FCM
✦                        ✦                        ✦                         ✦
Multi-ward               Leadership               AI replaces               App Store
Onboarding               KPI Panel                Mock Client               Beta Submit
```

---

## 8. Database Schema Mở Rộng

### 8.1 Migration Plan (Flyway)

```
V1__init_schema.sql            ✅ Done
V2__seed_procedures.sql        ✅ Done
V3__evaluation_tables.sql      ✅ Done
V4__vault_ttl.sql              ✅ Done
V5__gis_clusters.sql           ✅ Done
V6__form_ocr.sql               ✅ Done
V7__ward_registry.sql          🔜 W13 (ward_registry, ward_operating_hours, ward_service_catalog)
V8__ward_scoped_columns.sql    🔜 W14 (thêm ward_code vào legal_chunks, issue_clusters)
V9__qr_tokens.sql              🔜 W16 (checkin_tokens, virtual_queue)
V10__ai_feedback.sql           🔜 W17 (ai_feedback_queue cho HITL active learning)
```

### 8.2 Redis Key Namespace (Ward-aware)

```
Hiện tại:
  rate_limit:{ip}
  geo:clusters

Thêm mới:
  WARD:{wardCode}:rag_cache:{queryHash}    TTL 1h
  WARD:{wardCode}:cluster_geo              TTL 5m
  WARD:{wardCode}:heatmap_data             TTL 15m
  QR:{token}:checkin                       TTL 24h
  QUEUE:{wardCode}:virtual                 TTL 1d (SORTED SET)
```

---

## 9. Tech Stack Bổ Sung

### 9.1 Backend Additions

| Thư viện | Phiên bản | Mục đích |
|----------|-----------|---------|
| `postgis` | 3.4 | Spatial queries (ST_Within, ST_HeatmapValue) |
| `spring-websocket` | 6.1 | Real-time alerts + dashboard |
| `jjwt-api` | 0.12 | QR token signing RS256 |
| `qrcode-generator` | 1.4 | Tạo QR code server-side |
| `djl-pytorch` | 0.26 | ONNX inference (Bi-Encoder) |
| `vietocr-client` | custom | HTTP client tới VietOCR service |

### 9.2 Frontend Additions

| Package | Phiên bản | Mục đích |
|---------|-----------|---------|
| `leaflet.heat` | 0.2 | Heatmap overlay trên Leaflet |
| `recharts` | 2.x | KPI charts |
| `jspdf` | 2.5 | Export PDF report |
| `jsqr` | 1.4 | Scan QR từ camera (web) |
| `socket.io-client` | 4.x | WebSocket alerts |

### 9.3 Mobile Stack (Mới Hoàn Toàn)

| Package | Version | Mục đích |
|---------|---------|---------|
| `expo` | SDK 51 | Base framework |
| `expo-camera` | 15.x | Camera + scanner |
| `react-native-nfc-manager` | 3.x | NFC CCCD reader |
| `@nozbe/watermelondb` | 0.27 | Offline SQLite sync |
| `@react-native-firebase/messaging` | 20.x | FCM push |
| `expo-location` | 17.x | GPS (thay navigator.geolocation) |
| `react-native-maps` | 1.x | Map (Leaflet không chạy trên native) |

### 9.4 AI/ML Stack (Mới)

| Tool | Mục đích |
|------|---------|
| Ollama 0.3 | Local LLM serving (Qwen-2.5-3B GGUF) |
| Sentence Transformers 3.x | Fine-tune Bi-Encoder |
| Unsloth + TRL | LoRA fine-tune SLM (optional) |
| VietOCR | Handwritten Vietnamese form OCR |
| Google Colab | Training environment (miễn phí T4 GPU) |

---

## 10. KPI & Metrics Mục Tiêu

### 10.1 Kỹ Thuật

| Metric | Hiện tại | Mục tiêu W20 |
|--------|----------|--------------|
| Recall@3 (RAG) | 94.4% | 97.0% |
| MRR | 0.891 | 0.93 |
| Form Precheck Accuracy | ~95% (mock) | 97% (real OCR) |
| Triage F1 | 0.912 | 0.93 |
| API Latency P95 | < 400ms | < 350ms |
| Docker RAM | ~585MB actual | < 1.8GB (thêm Ollama) |
| Offline Coverage | 100% (fallback) | 100% |

### 10.2 Sản Phẩm

| Metric | Target |
|--------|--------|
| Số xã/phường hỗ trợ | 10+ phường Bình Thạnh |
| Mobile App DAU | 50+ (pilot) |
| OCR Form Accuracy | > 92% |
| Push Notification Delivery | > 95% |
| QR Check-in Adoption | > 60% trong pilot |
| CSAT Score | > 4.0/5.0 |

### 10.3 Học Thuật / UTH

| Deliverable | Deadline |
|-------------|----------|
| Bảo vệ tốt nghiệp UTH | W12 (đã lên kế hoạch) |
| Mở rộng thành đề tài NCKH | Tháng 3/2027 |
| Nộp hội thảo quốc gia ICT | Tháng 4/2027 |
| Triển khai pilot UBND thực | Tháng 5/2027 |

---

## 📌 Ghi Chú Ràng Buộc Không Đổi

> [!IMPORTANT]
> Các ràng buộc sau **không thay đổi** dù mở rộng bao nhiêu:

1. **Zero-Cost RAM:** Tổng Docker stack ≤ 2.0GB RAM (kể cả Ollama service riêng)
2. **NĐ13/2023:** Dữ liệu cá nhân không rời server, không lưu chip data NFC raw
3. **Offline Resilience:** Mọi tính năng mới phải có graceful fallback khi mất mạng
4. **TypeScript Strict:** `verbatimModuleSyntax` = true, mọi type import dùng `type` keyword
5. **Design System:** Be Vietnam Pro, `#00236F`, `#1E3A8A`, `#00687A`, `#FAF8FF`, `#BA1A1A`
6. **Vietnamese Accuracy:** Mọi văn bản hành chính phải đúng pháp lý, không tự sáng tạo
7. **Conventional Commits:** `feat`, `fix`, `docs`, `refactor`, `test` prefix bắt buộc

---

*Tài liệu này được tổng hợp từ: (1) Ý tưởng Ward Onboarding của người dùng, (2) Kế hoạch Mobile App, (3) Lộ trình AI Training, (4) GovTech Advanced Features — ngày 2026-11-04.*
