# Design System: SmartWard AI Mobile (iOS & Android Civic Super-App)

> **Google Stitch & Figma Semantic Specification (`stitch-design-taste`)**  
> **Synchronization Target:** 100% Visual & Behavioral Parity with SmartWard AI Web (`frontend/src/`) across 96 Wards/Communes/Special Zones of An Giang Province.

---

## 1. Visual Theme & Atmosphere
- **Atmosphere Description:** An authoritative, high-trust civic service mobile interface engineered for multi-generational accessibility (from young digital citizens to elderly residents over 75). It combines Swiss administrative clarity with tactile mobile ergonomics — daylight-first surfaces, crisp 1px structural borders, high-contrast Vietnamese typography, and zero decorative clutter.
- **Taste Spectrum Parameters:**
  - **Density:** `5 / 10` ("Daily Civic App Balanced" — generous breathing room on citizen screens; structured metadata density on officer review sheets)
  - **Variance:** `6 / 10` ("Asymmetric Functional Hierarchy" — split status headers, prominent QR pass cards, 3-column AI Vision Gate diagnostic strips)
  - **Motion:** `6 / 10` ("Fluid Spring Physics" — `stiffness: 120, damping: 22` bottom-sheet transitions, laser scanner sweep on CCCD QR camera, tactile `-1px` active button press)

---

## 2. Color Palette & Roles (Synchronized with Web `Tailwind` Tokens)
- **Canvas Slate** (`#F8FAFC`) — Primary mobile screen background (`SafeAreaView` fill), preventing harsh white eye strain outdoors.
- **Pure Surface** (`#FFFFFF`) — Elevated card containers, form input backgrounds, and modal bottom sheets.
- **Deep Navy Ink** (`#0F172A`) — Primary headline, citizen full name, and legal article body text (never pure `#000000`).
- **Muted Slate** (`#475569` / `#64748B`) — Secondary labels, legal citations, SLA timestamps, and helper captions.
- **Structural Border** (`#CBD5E1` / `#E2E8F0`) — Crisp `1px` card hairlines and input outlines.
- **Civic Emerald (Primary Accent)** (`#00796B` / Hover `#00695C` / Soft Tint `#F0FDFA`) — Single primary accent used for main CTAs, active bottom-tab indicators, ward selector pills, and official QR Pass framing.
- **Semantic Diagnostic Tokens:**
  - **AI Gate Pass / Valid (`#059669` text on `#ECFDF5` fill, `#A7F3D0` border):** Used when AI Vision Gate sharpness $\ge 45/100$ and template matches 100%.
  - **Pending Review / Warning (`#B45309` text on `#FFFBEB` fill, `#FDE68A` border):** Used for SLA countdowns and legal reminders.
  - **AI Gate Blocked / Conflict (`#DC2626` text on `#FEF2F2` fill, `#FCA5A5` border):** Used when AI Vision Gate blocks a blurry photo, mismatched form template, or active TTS stop button.

---

## 3. Typography Rules
- **Display & Section Headers:** `Be Vietnam Pro` / `Plus Jakarta Sans` (Bold `700` & ExtraBold `800`) — Tight tracking (`-0.02em`), optimized for Vietnamese diacritics (`Ấ, Ệ, Ữ, Đ`).
- **Body & Legal Clauses:** `Be Vietnam Pro` (Regular `400` & Medium `500`) — Relaxed line-height (`1.55`), dynamic 3-tier accessibility scaling (`A = 14px`, `A+ = 16px`, `A++ = 18.5px`) controlled from the persistent top header.
- **Monospace Metadata:** `JetBrains Mono` (SemiBold `600`) — Mandatory for 12-digit CCCD numbers (`089205023490`), Dossier IDs (`HS-20261111-MYBINH-0001`), Appointment QR Codes (`LH-20261111-8899`), GPS coordinates, and AI sharpness scores (`96/100`).
- **Banned Fonts:** Generic `Times New Roman` or uncalibrated serif fonts inside mobile UI controls (serif is reserved strictly for exported A4 `.docx`/`.pdf` files per Decree 30/2020/NĐ-CP).

---

## 4. Component Stylings & Behavioral Contracts
- **Persistent Top Civic Bar (`56px` height below status bar):**
  - Left: Tap-to-switch Ward Pill (`📍 Phường Mỹ Bình • Đổi Xã`) opening a searchable 96-ward bottom sheet with 1-tap GPS auto-detect.
  - Right: Accessibility Font Scaler (`A | A+ | A++`) + Role Switcher badge (`Công Dân` $\leftrightarrow$ `Cán Bộ`).
- **2-Mode Voice Reader Toggle (`Nghe đọc to`):**
  - State `OFF` (Default): White/Emerald pill with speaker icon + label `Nghe đọc to` + badge `MỞ`.
  - State `ON` (Speaking): High-contrast Crimson alert pill (`#FEF2F2` bg, `#DC2626` border) with pulsing dot + `Đang đọc...` + badge `TẮT` to stop speech immediately on tap.
- **AI Vision Gate 3-Criteria Diagnostic Card:**
  - Appears immediately after capturing a form photo or picking a `.docx`/`.pdf` file.
  - Displays a 3-column bento strip:
    1. `1. Độ sắc nét ảnh` (`96/100 điểm` — Laplacian variance check)
    2. `2. Khớp mục đã chọn` (`Mẫu CT01` — Keyword & header verification)
    3. `3. Nhận diện chữ điền` (`5/5 mục rõ chữ` — OCR/DOCX extraction count)
  - Automatically disables the primary submit CTA (`#94A3B8`) and changes label to `AI Thị Giác Chặn Gửi (Chụp Lại Ảnh)` if criterion 1 or 2 fails.
- **Free Email & Contact Card (Zero SMS/Zalo Cost):**
  - Dedicated card above the submit button with badge `100% Miễn phí • Không dùng SMS/Zalo thu phí`, collecting `citizenEmail` (for receiving the QR Appointment Pass) and `phoneNumber` (for web/app lookup).
- **Electronic QR Appointment Pass (`Phiếu Hẹn Sơ Duyệt Điện Tử Có Mã QR`):**
  - Framed with a `2px` solid `#00796B` border, displaying a high-contrast SVG QR code (`LH-YYYYMMDD-XXXX`), citizen name, dossier code, reviewing officer name, ward counter address, and a full-width primary button `Tải Phiếu Hẹn Có Mã QR (.pdf) Về Máy` (never invokes print dialogs).

---

## 5. Mobile Navigation & Screen Architecture (5 Bottom Tabs)
1. **Tab 1 — `Hỏi Đáp TTHC` (Legal RAG & 40 Procedures):** Searchable 4-category catalog (`Hộ tịch`, `Cư trú`, `Chứng thực`, `Bảo trợ & Đất đai`), 5-part grounded AI legal answers ($\theta = 0.78$), 2-mode TTS toggle (`MỞ`/`TẮT`), and direct `.docx`/`.pdf` template download.
2. **Tab 2 — `Sơ Duyệt Đơn` (Smart Form Precheck & AI Vision Gate):** Segmented selector (`CT01` | `TK-KS` | `TK-KH` | `TK-BTXH`), 60fps CCCD QR scanner, AI Vision Gate 3-criteria card, deterministic legal validation checklist, and free Email submission.
3. **Tab 3 — `Ví Mã Hẹn QR` (Offline QR Pass Wallet & Email Inbox):** Offline-cached QR Appointment Passes (`LH-...`), real-time PostgreSQL dossier status tracker (`PENDING` $\rightarrow$ `APPROVED`), and Officer Email Notification Inbox.
4. **Tab 4 — `Báo Sự Cố 25m` (Field Incident GPS Triage):** Interactive map with $R = 25\text{m}$ spatial circle, auto-filled location box, mandatory emergency phone, and automatic cross-ward routing to the responsible UBND.
5. **Tab 5 — `Bàn Cán Bộ` (Officer Mobile Counter Scanner & Audit):** JWT-protected officer view featuring a live QR Counter Scanner (scans citizen's `LH-...` pass), Zero-Trust watermarked document viewer (Redis OTT `GETDEL`), and 1-tap `Duyệt Hợp Lệ & Gửi Email + Mã QR`.

---

## 6. Anti-Patterns (Strictly Banned)
- **No Print Buttons (`window.print()`):** Mobile and Web citizens download `.docx` or `.pdf` files directly; printing is completely removed.
- **No Paid SMS or Zalo ZNS UI:** Never promise SMS OTP or Zalo paid notifications; always specify free Email + App/Web QR Pass.
- **No Neon / Purple AI Gradients:** Stick strictly to Civic Emerald (`#00796B`) and Slate neutrals (`#0F172A`, `#F8FAFC`).
- **No Unbounded Horizontal Overflow:** All cards and tables collapse cleanly into single-column mobile cards with minimum `44px` touch targets.
