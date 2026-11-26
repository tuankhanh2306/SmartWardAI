# Responsive 50:50 Gateway, Sticky Header & Wai Centered AI Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign SmartWard AI's responsive app shell, sticky header, 50:50 RoleGateway, Wai-style centered CitizenPortal, and downward custom fee dropdown in ProceduresCatalogPage while eliminating 320px overflow and passing all tests.

**Architecture:** Convert `<Header />` to a `sticky top-0 z-50` multi-viewport header with mobile/tablet navigation strip and natural page scrolling in `App.tsx`; rebuild `RoleGateway.tsx` into a responsive 50:50 split screen (`grid-cols-1 lg:grid-cols-2`); rebuild `CitizenPortal.tsx` into a centered Wai-style AI workspace with an Omnibox card and 4-column suggestion cards; and upgrade `ProceduresCatalogPage.tsx`'s fee status selector to a downward-opening custom accessible dropdown alongside fixing `320px` overflow in `FormAndIssueReporting.tsx` and `WardOnboarding.tsx` A11y.

**Tech Stack:** React 18, TypeScript, TailwindCSS, Lucide Icons, Playwright + `@axe-core/playwright`.

**Spec:** `docs/specs/2026-11-24-responsive-5050-wai-layout-design.md`

## Global Constraints
- Preserve button accessible names required by Playwright tests (`Đăng nhập với tư cách Người dân`, `Đăng nhập Cán bộ`, `Đăng nhập Hệ thống`, `Đăng ký khai sinh`).
- Zero horizontal overflow (`scrollWidth <= innerWidth`) across `320px`, `375px`, `768px`, and `1280px`.
- Zero critical/serious Axe WCAG 2.1 AA violations across all audited screens.
- Never commit directly to `main`; commit on `feature/ui-wai-5050-responsive-layout`.

## Review Focus
- `320×568` small mobile viewport must not overflow horizontally on `/`, `/citizen`, `/citizen/procedures`, `/citizen/form`, or `/onboarding`.
- Sticky header must stay pinned at `top: 0` when scrolling down long pages (`/citizen/procedures`, `/citizen/form`, `/citizen` with long chat).
- 50:50 RoleGateway must let both Citizen entry and Officer login work in 1 click without breaking `test_ui_a11y_snapshots.mjs`.
- Custom downward dropdown for `Tình trạng lệ phí` (`#proc-fee-select`) must always open downward (`top-full`), close on outside click or `Escape`, and filter procedures accurately.
- `WardOnboarding.tsx` must have zero Axe violations (`aria-command-name`, `color-contrast`, `scrollable-region-focusable`).

---

### Task 1: Sticky Header & Natural Document Scroll App Shell (`App.tsx`, `Header.tsx`)
- [ ] **Step 1:** Update `frontend/src/components/Header.tsx` from `fixed` to `sticky top-0 z-50`, add a responsive horizontal scrollable sub-navigation bar for `< lg` screens (so mobile/tablet users always have sticky navigation), and ensure strict role link isolation.
- [ ] **Step 2:** Update `frontend/src/App.tsx` to remove fragile hardcoded `pt-14 lg:pt-[92px]` offsets that conflicted with dynamic sticky header height, allowing natural document scrolling on all viewports.

### Task 2: 50:50 Split RoleGateway (`RoleGateway.tsx`)
- [ ] **Step 1:** Redesign `frontend/src/pages/RoleGateway.tsx` into a `min-h-screen grid grid-cols-1 lg:grid-cols-2` 50:50 split layout matching Reference Image 1 (Wai login screen):
  - Left 50%: Warm civic gradient panel, `SmartWard+ AI ASSISTANT` brand header, headline *"Một cổng số, kết nối mọi nghiệp vụ hành chính"*, 3 checkmark value bullets, and 2 floating preview cards (AI RAG Q&A card + Form Precheck A4 summary card).
  - Right 50%: Top-right Ward Selector pill (`UBND ... • Đổi xã`), centered elevated card *"Xin chào, Welcome back"* with a 50:50 segmented Role Switcher (`Người dân` | `Đăng nhập Cán bộ`), Citizen 1-click entry button (`Đăng nhập với tư cách Người dân`), and Officer login form (`Đăng nhập Hệ thống`) + security QR footer note.

### Task 3: Wai-Style Centered AI Workspace (`CitizenPortal.tsx`)
- [ ] **Step 1:** Redesign `frontend/src/pages/CitizenPortal.tsx` matching Reference Image 2 (Wai centered assistant):
  - Remove the cramped fixed-height left sidebar and inner `overflow-hidden` scroll trap.
  - When `messages.length === 0`: Render centered hero branding (`SmartWard+`), *"Xin chào, tôi là SmartWard AI"*, subtitle, the multi-action **Omnibox Card** (textarea/input + bottom toolbar with `+`, `Kiểm tra tờ khai`, `Nguồn thông tin (40 Thủ tục)`, RAG status pill, Voice Mic button, and `→` Send button), and the **`GỢI Ý CÂU HỎI`** section with 4 horizontal cards (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
  - When `messages.length > 0`: Render centered conversation stream (`max-w-4xl mx-auto`) with natural page scrolling and a `sticky bottom-0` Omnibox dock so the page scrolls up/down smoothly while the Header stays sticky at the top.

### Task 4: Downward Custom Fee Dropdown (`ProceduresCatalogPage.tsx`) & 320px/A11y Fixes (`FormAndIssueReporting.tsx`, `WardOnboarding.tsx`)
- [ ] **Step 1:** In `frontend/src/pages/ProceduresCatalogPage.tsx`, upgrade `Tình trạng lệ phí` (`#proc-fee-select`), `Nhóm thủ tục` (`#proc-category-select`), and `Hình thức thực hiện` (`#proc-mode-select`) into a custom downward-opening dropdown component (`top-full left-0 right-0 mt-1.5 z-30`) with rotating `ChevronDown`, active checkmarks, count badges, keyboard support, and outside-click close.
- [ ] **Step 2:** In `frontend/src/pages/FormAndIssueReporting.tsx` (around line 2100), allow the input mode switcher (`Tải ảnh PC / Camera / Nhập tay`) to wrap cleanly on `320px` screens so horizontal overflow is `0px`.
- [ ] **Step 3:** In `frontend/src/pages/WardOnboarding.tsx`, fix remaining Axe WCAG 2.1 AA contrast and Leaflet marker accessible attributes.

### Task 5: Build, Unit Tests & Multi-Viewport Playwright Verification
- [ ] **Step 1:** Run `npx.cmd tsc --noEmit` and `npm.cmd run build` in `frontend/`.
- [ ] **Step 2:** Run `$env:CI_FRONTEND_ONLY='true'; npm.cmd run test:all` in `frontend/`.
- [ ] **Step 3:** Run `node frontend/scripts/milestones/test_ui_a11y_snapshots.mjs --strict` across `320px`, `375px`, `768px`, and `1280px` and inspect screenshots to confirm 0 overflow, 0 role leaks, and 0 critical/serious Axe violations.
