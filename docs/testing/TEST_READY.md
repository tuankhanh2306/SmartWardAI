# E2E Test Suite Ready

## Test Runners & Commands
- **Backend Automated Test Suite**:
  ```powershell
  cd e:\SmartWardAI\backend
  .\mvnw.cmd test
  ```
  Expected: All 100 tests pass with exit code 0 (`BUILD SUCCESS`).
- **Frontend Type & Bundle Verification**:
  ```powershell
  cd e:\SmartWardAI\frontend
  npm run build
  ```
  Expected: `tsc -b && vite build` succeeds with 0 errors.
- **RAG Evaluation Benchmark**:
  ```powershell
  cd e:\SmartWardAI
  python evaluation/scripts/evaluate_rag.py
  ```
  Expected: 80 questions evaluated; `trueAbstentionRate: 100.0%`, `falseAnswerRateTrap: 0.0%`.
- **Manual Live API Verification**:
  ```powershell
  cd e:\SmartWardAI
  python evaluation/scripts/verify_live_gemini.py
  ```

## Mandatory Scenarios Coverage Summary (Chỉ đạo 2026-11-04)
| # | Kịch bản kiểm thử | Trạng thái | Lớp kiểm thử / Script |
|---|-------------------|:----------:|-----------------------|
| 1 | Câu trả lời dài hoàn chỉnh (Khai sinh Xã An Phú) | PASS | `GeminiAiClientTest.java` / `verify_live_gemini.py` |
| 2 | Mock trả `finishReason: MAX_TOKENS` (retry 16k + fallback) | PASS | `GeminiAiClientTest.java` / `GeminiAiClientAdversarialTest.java` |
| 3 | Ghép nối đa phần tử (`parts[]` 1-5 parts, null safe) | PASS | `GeminiAiClientTest.java` / `GeminiAiClientAdversarialTest.java` |
| 4 | Định dạng chuẩn 5 phần, không chào hỏi khách sáo | PASS | `GeminiAiClientTest.java` / `RagQueryServiceTest.java` |
| 5 | Xử lý thiếu dữ liệu lệ phí/địa chỉ -> "Chưa có dữ liệu" | PASS | `GeminiAiClientTest.java` |
| 6 | Bắt mã lỗi 400/401/403/429/500/timeout, khử lộ API key | PASS | `GeminiAiClientTest.java` |
| 7 | Ngoài phạm vi ($S_{max} < \theta$) -> abstention, 0 LLM calls | PASS | `RagQueryServiceTest.java` / `evaluate_rag.py` |
| 8 | Disclaimer pháp lý luôn hiện diện | PASS | `GeminiAiClientTest.java` / `RagQueryService.java` |

Tất cả 8 kịch bản bắt buộc đã được kiểm chứng độc lập bởi 2 Reviewers, 2 Challengers, và 1 Forensic Auditor.
