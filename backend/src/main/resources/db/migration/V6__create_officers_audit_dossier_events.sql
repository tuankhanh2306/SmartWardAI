-- =====================================================================
-- SmartWard AI - Database Migration V6: Officers, Audit Log & Dossier Events (P1)
-- Phân quyền cán bộ, nhật ký kiểm toán bất biến & lịch sử trạng thái hồ sơ
-- =====================================================================

-- 1. Bảng tài khoản cán bộ tiếp nhận Một cửa (5.1)
CREATE TABLE IF NOT EXISTS officers (
    badge_id VARCHAR(32) PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    ward_code VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'OFFICER',
    password_hash VARCHAR(255) NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_officers_ward_code ON officers(ward_code);
CREATE INDEX IF NOT EXISTS idx_officers_active ON officers(active);

-- Seed cán bộ mặc định (BCrypt cost 12: Officer@2026! và Admin@SmartWard2026!)
INSERT INTO officers (badge_id, full_name, ward_code, role, password_hash, active)
VALUES 
('CC-AG-8942', 'Trần Quốc Bảo — Cán bộ Tư pháp - Hộ tịch', 'AG_P_LONGXUYEN', 'OFFICER', '$2a$12$b0yxUyDnS/g7Q5XPOkrcb.Dwpx8CeXa9XmNDTwBF4q5joS7hmOyR6', TRUE),
('CC-AG-1001', 'Nguyễn Thị Minh Khai — Cán bộ Địa chính - Đô thị', 'AG_P_LONGXUYEN', 'OFFICER', '$2a$12$b0yxUyDnS/g7Q5XPOkrcb.Dwpx8CeXa9XmNDTwBF4q5joS7hmOyR6', TRUE),
('ADM-AG-0001', 'Lê Văn Quản Trị — Quản trị viên hệ thống SmartWard', 'AG_P_LONGXUYEN', 'ADMIN', '$2a$12$DqD/Vyanu6H1jiz0cHQHN.HuU5O2XF3lqnztyiY7nQQFucJymk.n.', TRUE)
ON CONFLICT (badge_id) DO NOTHING;

-- 2. Bảng nhật ký kiểm toán (Audit Trail) bất biến - chỉ INSERT (5.4)
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    who VARCHAR(64) NOT NULL,
    ward VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64),
    ip VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_who ON audit_log(who);
CREATE INDEX IF NOT EXISTS idx_audit_log_ward ON audit_log(ward);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- 3. Bảng lịch sử luồng trạng thái hồ sơ công dân (5.5)
CREATE TABLE IF NOT EXISTS dossier_events (
    id BIGSERIAL PRIMARY KEY,
    dossier_code VARCHAR(64) NOT NULL,
    who VARCHAR(64) NOT NULL,
    from_status VARCHAR(32),
    to_status VARCHAR(32) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dossier_events_code ON dossier_events(dossier_code);
CREATE INDEX IF NOT EXISTS idx_dossier_events_created_at ON dossier_events(created_at);
