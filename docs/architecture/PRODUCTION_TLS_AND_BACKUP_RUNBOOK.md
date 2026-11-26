# KIẾN TRÚC TRIỂN KHAI PRODUCTION (HTTPS/TLS) & KỊCH BẢN SAO LƯU / KHÔI PHỤC (RPO/RTO)
> **Mã công việc:** `TASK-017`  
> **Cập nhật:** `2026-11-26`  
> **Phạm vi:** Production Cloud (Railway) & On-Premise / VPS Docker Compose (UBND cấp xã / Sở TT&TT)

---

## 1. Mô Hình Triển Khai Production Chính Thức (HTTPS/TLS)

SmartWard AI chốt **2 phương án triển khai hỗ trợ HTTPS/TLS bắt buộc** (nhằm bảo đảm trình duyệt cho phép truy cập Geolocation GPS và Camera WebRTC theo chuẩn Secure Contexts):

### Phương án A — Cloud Managed PaaS trên Railway (Đang vận hành Production)
| Thành phần | Dịch vụ Railway | Giao thức & Bảo mật |
| :--- | :--- | :--- |
| **Web Portal (PWA)** | `smartward-frontend` (`https://smartward-frontend-production.up.railway.app`) | TLS 1.3 tự động qua Railway Edge (`railway-hikari`), CSP chặt, `Permissions-Policy: camera=(self), microphone=(self), geolocation=(self)` |
| **Backend API** | `smartward-backend` (`https://smartward-backend-production.up.railway.app`) | TLS 1.3, Spring Security Allowlist + `anyRequest().denyAll()`, JWT HS256 (khóa ≥ 32 bytes), CORS chặt theo domain |
| **Database** | `smartward-postgres` (PostgreSQL 16 + pgvector) | Mạng nội bộ private (`*.railway.internal`), persistent volume |
| **Cache / GEO / OTT** | `smartward-redis` (Redis 7 AOF) | Mạng nội bộ private, mật khẩu bắt buộc (`requirepass`) |
| **Object Vault** | `smartward-vault` (S3-compatible Bucket) | Chỉ lưu bản mã hóa `AES-256-GCM` đã đóng watermark, chính sách vòng đời tự xóa 7 ngày |

### Phương án B — Triển khai Nội bộ / VPS Docker Compose (`<= 2048 MiB RAM`)
- Đặt Reverse Proxy **Caddy 2** hoặc **Nginx + Certbot (Let's Encrypt)** ở tầng ngoài chấm dứt TLS 1.3 (`443 -> smartward-frontend:80` và `/api/ -> smartward-backend:8080`).
- Bật `server.forward-headers-strategy: NATIVE` trên Backend và cấu hình `SMARTWARD_TRUSTED_PROXIES` đúng dải CIDR của Reverse Proxy để chống giả mạo IP (`ClientIpResolver`).
- Giữ tổng hạn ngạch 6 container Docker $\le 2048\text{ MiB}$ theo quy chuẩn `AGENTS.md`.

---

## 2. Mục Tiêu Khôi Phục Thảm Họa (RPO / RTO)

| Chỉ số | Cam kết mục tiêu | Cơ chế bảo đảm |
| :--- | :---: | :--- |
| **RPO (Recovery Point Objective)** | **≤ 24 giờ** (0 mất mát cho Redis AOF) | Cron / Task Scheduler chạy `backup_all` hằng ngày lúc `02:00` (giờ VN) + Redis AOF `appendonly yes` |
| **RTO (Recovery Time Objective)** | **≤ 2 giờ** (diễn tập thực tế < 15 phút) | Khôi phục tức thời từ `pg_dump` + `mc mirror` vào cụm Docker/Railway mới |
| **Chính sách lưu trữ (Retention)** | **7 ngày xoay vòng** | Tự động xóa bản sao lưu cũ hơn 7 ngày phù hợp vòng đời ILM 7 ngày của `smartward-vault` (Luật 91/2025/QH15) |

---

## 3. Quy Trình Sao Lưu & Diễn Tập Khôi Phục

### 3.1. Sao lưu tự động hợp nhất (PostgreSQL + MinIO Vault)
- **Windows Server / Workstation (PowerShell):**
  ```powershell
  # Kiểm tra khô (Dry-Run)
  powershell -ExecutionPolicy Bypass -File scripts\backup_all.ps1 -DryRun

  # Chạy sao lưu thực tế (tạo SQL dump + MinIO mirror + SHA-256 manifest)
  powershell -ExecutionPolicy Bypass -File scripts\backup_all.ps1 -RetentionDays 7
  ```
- **Linux VPS (Cronjob 02:00 hằng ngày):**
  ```cron
  0 2 * * * /opt/smartward/scripts/backup_db.sh && /opt/smartward/scripts/backup_minio.sh >> /var/log/smartward-backup.log 2>&1
  ```

### 3.2. Khôi phục PostgreSQL (`pg_dump`)
- **Windows:**
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts\restore_db.ps1 -BackupFile backups\postgres\smartward_backup_<TIMESTAMP>.sql
  ```
- **Linux:**
  ```bash
  ./scripts/restore_db.sh backups/postgres/smartward_backup_<TIMESTAMP>.sql.gz
  ```

### 3.3. Khôi phục MinIO Object Vault (`mc mirror`)
```bash
mc mirror --preserve backups/minio/vault_mirror_<TIMESTAMP> smartward_backup/smartward-vault
```

### 3.4. Kiểm chứng sau khôi phục (Post-Recovery Verification Checklist)
1. Kiểm tra `/api/v1/health` trả `HTTP 200` với `status = UP`.
2. Kiểm tra Flyway schema & số bản ghi bảng `admin_procedures` (40 TTHC), `ward_registry` (96/102 xã), `citizen_dossiers`, `issue_clusters`.
3. Gọi `POST /api/v1/issues/clusters/rebuild-index` (quyền `ADMIN`) nếu cần tái tạo chỉ mục Redis GEO từ PostgreSQL.
4. Kiểm thử 1 lượt mở trang `https://...` xác nhận trình duyệt cấp quyền GPS & Camera qua HTTPS.
