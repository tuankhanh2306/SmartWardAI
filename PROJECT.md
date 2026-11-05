# Project: SmartWard AI - Nâng cấp Chatbox & Cổng Công Dân Production

## Architecture
- **Backend Architecture**: Spring Boot 3.3.5 (Java 21) REST API at `/api/v1/rag/ask`.
  - Pure Java `VietnameseTextNormalizer` for sub-1ms diacritic, dialect, and Telex typo normalization.
  - Multi-turn conversation memory support via `history: List<ConversationTurnDto>` (last 3–5 turns) in `RagAskRequest`.
  - Contextual query rewriting in `RagQueryService` for anaphoric queries (e.g. "lệ phí bao nhiêu" -> "[Thủ tục kết hôn] lệ phí bao nhiêu").
  - Concise safe refusal/disclaimer (<= 2 sentences) + `suggestions: List<String>` in `RagAskResponse`.
- **Frontend Architecture**: React 18 + TypeScript + TailwindCSS + Vite.
  - `CitizenPortal.tsx`: Dynamic quick suggestion chips attached under each bot message, typing indicator ("Trợ lý AI đang soạn tin..."), smooth scroll and distinct user/bot bubbles.
  - `client.ts`: Passes `history` of recent 3–5 turns and falls back cleanly with contextual resolution and concise refusal.
  - `FormAndIssueReporting.tsx`: Form CT01 strictly contains NO "ngày cấp CCCD" (input fields & descriptive text cleaned).
  - `Header.tsx` & `CitizenPortal.tsx`: No "Gemini Flash" button anywhere.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Telex & Diacritic Normalization | Chuẩn hóa lỗi chính tả, phương ngữ, telex ("chaogf ban", "xin chaof", "tu van giup toi") trước khi phân loại ý định | M1 | R1 |
| F2 | Clarifying Open/Vague Queries | Tự động hỏi lại để làm rõ nhu cầu hoặc đưa ra danh mục các lĩnh vực hỗ trợ khi câu hỏi ngắn/mơ hồ ("bạn có thể tư vấn cho tôi không") thay vì từ chối máy móc | M1 | R1 |
| F3 | Multi-turn Context Memory | Duy trì bộ nhớ ngữ cảnh 3–5 lượt tương tác gần nhất để trả lời chính xác câu hỏi nối tiếp ("còn lệ phí bao nhiêu?") | M1 | R1 |
| F4 | Concise Safe Disclaimer | Rút gọn thông điệp từ chối pháp lý còn tối đa 1–2 câu ngắn gọn, súc tích kèm gợi ý chuyển hướng | M1 | R1 |
| F5 | Quick Suggestion Chips | Bổ sung các nút gợi ý nhanh ngay sau mỗi câu trả lời của chatbox (hồ sơ, lệ phí, nơi nộp), bấm là hỏi ngay | M1 | R2 |
| F6 | Typing Indicator | Hiệu ứng "Trợ lý AI đang soạn tin..." sinh động với 3 chấm nảy trong lúc chờ hệ thống tạo câu trả lời | M1 | R2 |
| F7 | Chatbox UI/UX Polish | Bong bóng chat rõ ràng, cuộn mượt mà, phân tách rành mạch giữa công dân và trợ lý AI trên `CitizenPortal.tsx` | M1 | R2 |
| F8 | CT01 Compliance | Tờ khai CT01 tuyệt đối không chứa trường hoặc chữ "ngày cấp CCCD" | M1 | R3 |
| F9 | Gemini Flash Hidden | Nút "Gemini Flash" ẩn hoàn toàn khỏi Header và chatbox | M1 | R3 |
| F10 | Automated Test Suites & Build | Bộ kiểm thử tự động bao quát 4 ca (chính tả, mơ hồ, nối tiếp, ngoài phạm vi) và `npm --prefix frontend run build` exit code 0 | M1 | R3 / Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Production Chatbox & Citizen Portal Hardening | F1–F10 full implementation, testing, review, challenge, and forensic audit | none | IN_PROGRESS |

## Interface Contracts
### Client ↔ Backend (`POST /api/v1/rag/ask`)
- **Request (`RagAskRequest`)**:
  ```json
  {
    "question": "còn lệ phí bao nhiêu?",
    "wardName": "Phường Bến Nghé",
    "history": [
      { "role": "user", "content": "Thủ tục đăng ký kết hôn cần giấy tờ gì?", "procedureCode": "TTHC-HT-02" },
      { "role": "assistant", "content": "1. TÓM TẮT THỦ TỤC: Đăng ký kết hôn...", "procedureCode": "TTHC-HT-02" }
    ],
    "topK": 3
  }
  ```
- **Response (`RagAskResponse`)**:
  ```json
  {
    "answer": "...",
    "abstained": false,
    "suggestions": ["Hồ sơ cần gì?", "Lệ phí bao nhiêu?", "Nơi nộp hồ sơ?", "Thời hạn giải quyết?"]
  }
  ```

## Code Layout
- Exclusive Worker File Ownership:
  - Backend:
    - `backend/src/main/java/vn/edu/uth/smartward/rag/VietnameseTextNormalizer.java` (NEW)
    - `backend/src/main/java/vn/edu/uth/smartward/rag/dto/ConversationTurnDto.java` (NEW)
    - `backend/src/main/java/vn/edu/uth/smartward/rag/dto/RagAskRequest.java` (MODIFIED)
    - `backend/src/main/java/vn/edu/uth/smartward/rag/dto/RagAskResponse.java` (MODIFIED)
    - `backend/src/main/java/vn/edu/uth/smartward/rag/RagQueryService.java` (MODIFIED)
    - `backend/src/test/java/vn/edu/uth/smartward/rag/RagQueryServiceTest.java` (MODIFIED)
  - Frontend:
    - `frontend/src/pages/CitizenPortal.tsx` (MODIFIED)
    - `frontend/src/api/client.ts` (MODIFIED)
    - `frontend/src/services/intentClassifier.ts` (MODIFIED)
    - `frontend/src/pages/FormAndIssueReporting.tsx` (MODIFIED)
    - `frontend/scripts/test_chatbox_production.mjs` (NEW)
    - `frontend/package.json` (MODIFIED - test script)
