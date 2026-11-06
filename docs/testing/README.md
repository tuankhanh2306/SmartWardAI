# 🧪 TRUNG TÂM KIỂM THỬ & ĐẢM BẢO CHẤT LƯỢNG (TESTING & QA SUITES)

> **Dự án:** SmartWard AI  
> **Thư mục:** `docs/testing/`  
> **Mục tiêu:** Cung cấp tài liệu, hướng dẫn thực thi và ma trận kiểm chứng chất lượng toàn diện của hệ thống từ Backend JUnit, Frontend Regression Guard đến Kịch bản Thử thách Đối kháng (Adversarial Scenarios).

---

## 📋 Mục Lục Tài Liệu

- **[`TEST_READY.md`](./TEST_READY.md)**: Bản cam kết sẵn sàng kiểm thử (E2E Test Suite Ready) kèm danh mục 8 kịch bản bắt buộc (chào hỏi sai chính tả, suy luận ngữ cảnh nhiều lượt, chốt chặn từ chối an toàn khi $S_{max} < \theta$, bảo mật Nghị định 13/2023/NĐ-CP).

---

## 🚀 Hướng Dẫn Chạy Toàn Bộ Kiểm Thử

### 1. Kiểm Thử Đơn Vị & Tích Hợp Backend (JUnit 5 / Spring Boot 3.2)
```powershell
cd backend
.\mvnw.cmd test
```
*Kết quả chuẩn:* **127/127 tests PASS**, thời gian ~20s, bao gồm:
- `RagQueryServiceTest`: Kiểm tra logic giải đáp RAG, phòng chống ngộ độc cache, hàng đợi HITL.
- `FormPrecheckServiceTest`: Kiểm tra quy tắc tiền kiểm định 4 nhóm biểu mẫu (CT01, Khai sinh, Kết hôn, Bảo trợ xã hội).
- `ZeroTrustVaultServiceTest`: Kiểm tra đóng dấu bản quyền Java2D, mã hóa AES/GCM và token một lần 24h.
- `AdversarialExceptionsAndAbstentionChallengeTest`: Kiểm tra khả năng chịu lỗi trước input hiểm hóc và tấn công prompt injection.

### 2. Kiểm Thử Toàn Diện Hệ Thống (Frontend Regression Guard - 8 Suites)
```powershell
node frontend/scripts/run_all_tests.mjs
```
*Gồm 8 bộ test chuyên sâu:*
1. **Production Chatbox Acceptance Suite**: Kiểm tra 44 assertions giao tiếp dân sinh.
2. **Challenger Robustness & Edge-case Suite**: Kiểm tra 69 assertions tình huống biên.
3. **Challenger Adversarial Multi-Turn Suite**: Kiểm tra ngữ cảnh nhiều lượt liên tiếp.
4. **Intent Resolution & Out-of-Scope Suite**: Kiểm tra phân loại câu hỏi ngoài thẩm quyền cấp xã.
5. **End-to-End RAG Responses Suite**: Kiểm tra tính nhất quán của câu trả lời 5 phần hành chính.
6. **48-Scenario Adversarial Edge Cases Suite**: Kiểm tra 68 assertions các trường hợp tấn công và lỗi biên.
7. **Frontend TypeScript & Production Build**: Biên dịch nghiêm ngặt `tsc -b && vite build`.
8. **Backend JUnit RAG Query Service Test**: Xác nhận hợp đồng API từ phía server.

### 3. Đánh Giá Điểm Chuẩn RAG & Phân Luồng Không Gian (Python / Data Pipeline)
```powershell
python evaluation/scripts/evaluate_rag.py
python evaluation/scripts/verify_live_gemini.py
```
