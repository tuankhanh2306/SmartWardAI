# SMARTWARD AI — AGENT & CONTRIBUTOR GUIDELINES

## 1. Git Branch Strategy (BẮT BUỘC TUÂN THỦ NGHIÊM NGẶT)

Mọi thay đổi mã nguồn trong dự án **KHÔNG ĐƯỢC PHÉP COMMIT HOẶC PHÁT TRIỂN TRỰC TIẾP LÊN NHÁNH `main`**.

### Cấu trúc phân nhánh chuẩn:

| Nhánh | Mục đích | Nguồn gốc tạo nhánh | Hợp nhất (Merge) vào | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **`main`** | **Production** | Khởi tạo ban đầu | Không commit trực tiếp | Chỉ nhận code từ `develop` (sau kiểm thử) hoặc `hotfix/*` |
| **`develop`** | **Integration** | `main` | `main` (khi release) | Nhánh tích hợp chính của mọi tính năng và bản sửa lỗi |
| **`feature/*`** | **Tính năng mới** | `develop` | `develop` | Ví dụ: `feature/officer-auth-db`, `feature/speech-to-text` |
| **`bugfix/*`** | **Sửa lỗi thường** | `develop` | `develop` | Ví dụ: `bugfix/rate-limiter-interceptor`, `bugfix/form-validation` |
| **`hotfix/*`** | **Vá lỗi khẩn cấp** | `main` | `main` **VÀ** `develop` | Sửa trực tiếp lỗi sự cố Production, phải merge lại cả 2 nhánh |

### Quy trình thực hiện công việc (Workflow):

1. **Phát triển tính năng mới:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/<ten-tinh-nang>
   # Thực hiện code, kiểm thử (test pass 100%)
   git add .
   git commit -m "feat(<module>): mo ta tinh nang"
   git push origin feature/<ten-tinh-nang>
   # Tạo Pull Request hoặc Merge vào develop
   ```

2. **Sửa lỗi thông thường:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b bugfix/<ten-loi>
   # Sửa lỗi, viết regression test
   git add .
   git commit -m "fix(<module>): mo ta sua loi"
   git push origin bugfix/<ten-loi>
   # Merge vào develop
   ```

3. **Vá lỗi khẩn cấp (Hotfix trên Production):**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/<ten-su-co>
   # Khắc phục lỗi khẩn cấp
   git add .
   git commit -m "hotfix(<module>): mo ta va loi cap bach"
   # Merge vào main để kích hoạt CI/CD Production deploy
   git checkout main
   git merge --no-ff hotfix/<ten-su-co>
   git push origin main
   # ĐỒNG THỜI merge ngược lại develop để đồng bộ
   git checkout develop
   git merge --no-ff hotfix/<ten-su-co>
   git push origin develop
   git branch -d hotfix/<ten-su-co>
   ```

4. **Phát hành bản release lên Production:**
   - Khi `develop` đã ổn định và toàn bộ bộ test CI vượt qua:
   ```bash
   git checkout main
   git pull origin main
   git merge --no-ff develop -m "release: dong bo cac tinh nang moi len production"
   git push origin main
   ```

---

## 2. Tiêu chuẩn Kỹ thuật Bắt buộc
- **Ngân sách RAM:** Toàn bộ 6 container Docker không được vượt quá `2048 MiB`.
- **Khóa bảo mật:** Khóa `VAULT_ENCRYPTION_KEY` và `JWT_SECRET` phải có độ dài tối thiểu 32 bytes (256-bit).
- **RAG Chốt chặn:** Ngưỡng từ chối trả lời an toàn $\theta = 0.78$ và $\theta_{lower} = 0.42$.
- **Kiểm thử:** Trước khi merge vào `develop` hoặc `main`, tất cả bài kiểm thử JUnit Backend và bài kiểm thử Frontend phải đạt 100% PASS.
