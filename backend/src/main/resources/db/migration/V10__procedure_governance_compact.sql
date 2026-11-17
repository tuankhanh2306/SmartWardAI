-- =====================================================================
-- SmartWard AI - Database Migration V10: Procedure Governance Workflow (Compact)
-- 1. Creates procedure_versions with partial unique index (max 1 PUBLISHED per procedure)
-- 2. Alters admin_procedures with current_version_id (DEFERRABLE FK) & form_template_key
-- 3. Backfills 40 existing procedures into v1 PUBLISHED (idempotent)
-- 4. Enhances audit_log with version_no, before_snapshot, after_snapshot & Immutability Triggers
-- =====================================================================

-- 1. Create procedure_versions table
CREATE TABLE IF NOT EXISTS procedure_versions (
    id BIGSERIAL PRIMARY KEY,
    procedure_id BIGINT NOT NULL REFERENCES admin_procedures(id) ON DELETE CASCADE,
    version_no INT NOT NULL,
    content JSONB NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    state VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMPTZ,
    reviewed_by VARCHAR(64),
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    published_at TIMESTAMPTZ,
    source VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
    source_ref TEXT,
    CONSTRAINT uq_procedure_version_no UNIQUE (procedure_id, version_no),
    CONSTRAINT chk_procedure_version_state CHECK (state IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'SUPERSEDED'))
);

CREATE INDEX IF NOT EXISTS idx_procedure_versions_proc_id ON procedure_versions(procedure_id);
CREATE INDEX IF NOT EXISTS idx_procedure_versions_state ON procedure_versions(state);

-- Enforce at most ONE PUBLISHED version per procedure at any point in time
CREATE UNIQUE INDEX IF NOT EXISTS uq_procedure_versions_one_published
ON procedure_versions(procedure_id)
WHERE state = 'PUBLISHED';

-- 2. Alter admin_procedures to add current_version_id and form_template_key
ALTER TABLE admin_procedures
ADD COLUMN IF NOT EXISTS current_version_id BIGINT NULL,
ADD COLUMN IF NOT EXISTS form_template_key VARCHAR(32) NOT NULL DEFAULT 'GENERAL';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_admin_procedures_current_version'
    ) THEN
        ALTER TABLE admin_procedures
        ADD CONSTRAINT fk_admin_procedures_current_version
        FOREIGN KEY (current_version_id) REFERENCES procedure_versions(id)
        ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

-- Map specialized form template keys
UPDATE admin_procedures SET form_template_key = 'CT01' WHERE procedure_code IN ('TTHC-CR-01', 'TTHC-CR-03', 'TTHC-CR-04', 'TTHC-CR-06') AND form_template_key = 'GENERAL';
UPDATE admin_procedures SET form_template_key = 'TK-KS' WHERE procedure_code IN ('TTHC-HT-01', 'TTHC-HT-03') AND form_template_key = 'GENERAL';
UPDATE admin_procedures SET form_template_key = 'TK-KH' WHERE procedure_code IN ('TTHC-HT-02') AND form_template_key = 'GENERAL';
UPDATE admin_procedures SET form_template_key = 'TK-BTXH' WHERE procedure_code LIKE 'TTHC-BT-%' AND form_template_key = 'GENERAL';

-- 3. Seed secondary Admin account for four-eyes cross-approval when ADM-AG-0001 authors a proposal
INSERT INTO officers (badge_id, full_name, ward_code, role, password_hash, active)
VALUES ('ADM-AG-0002', 'Phạm Minh Quân — Phó Quản trị viên Kiểm soát TTHC', 'AG_P_LONGXUYEN', 'ADMIN', '$2a$12$DqD/Vyanu6H1jiz0cHQHN.HuU5O2XF3lqnztyiY7nQQFucJymk.n.', TRUE)
ON CONFLICT (badge_id) DO NOTHING;

-- 4. Idempotent backfill of 40 existing procedures into v1 PUBLISHED
INSERT INTO procedure_versions (
    procedure_id,
    version_no,
    content,
    content_hash,
    state,
    created_by,
    created_at,
    submitted_at,
    reviewed_by,
    reviewed_at,
    review_note,
    published_at,
    source,
    source_ref
)
SELECT
    p.id,
    1 AS version_no,
    jsonb_build_object(
        'trinh_tu', COALESCE(
            (SELECT string_agg(c.content, E'\n\n' ORDER BY c.id) FROM legal_chunks c WHERE c.procedure_id = p.id AND c.chunk_type = 'PROCESS_STEP'),
            'Bước 1: Công dân chuẩn bị hồ sơ theo quy định và nộp tại Bộ phận Một cửa UBND cấp xã hoặc qua Cổng Dịch vụ công trực tuyến. Bước 2: Cán bộ tiếp nhận kiểm tra tính đầy đủ, hợp lệ của hồ sơ. Bước 3: Cơ quan có thẩm quyền thẩm định, phê duyệt và trả kết quả theo phiếu hẹn.'
        ),
        'thanh_phan_ho_so', COALESCE(
            (SELECT string_agg(c.content, E'\n\n' ORDER BY c.id) FROM legal_chunks c WHERE c.procedure_id = p.id AND c.chunk_type IN ('REQUIRED_DOCUMENTS', 'REQUIRED_DOCS')),
            'Tờ khai theo mẫu quy định; Bản chính Căn cước công dân hoặc tài khoản định danh điện tử VNeID mức độ 2; Các giấy tờ chứng minh liên quan.'
        ),
        'thoi_han_le_phi', CONCAT(
            'Thời hạn giải quyết: ', COALESCE(p.processing_time, 'Theo quy định pháp luật hiện hành'),
            E'\nLệ phí: ', COALESCE(p.fee, 'Miễn phí / Theo quy định HĐND tỉnh An Giang')
        ),
        'co_quan_thuc_hien', COALESCE(p.agency, 'UBND cấp xã thuộc tỉnh An Giang'),
        'can_cu_phap_ly', COALESCE(
            (SELECT string_agg(c.content, E'\n\n' ORDER BY c.id) FROM legal_chunks c WHERE c.procedure_id = p.id AND c.chunk_type = 'LEGAL_BASIS'),
            'Quyết định công bố danh mục thủ tục hành chính chuẩn hóa năm 2026 của UBND tỉnh An Giang.'
        )
    ) AS content,
    md5(p.procedure_code || ':v1:' || COALESCE(p.procedure_name, '') || ':' || COALESCE(p.fee, '')) AS content_hash,
    'PUBLISHED' AS state,
    'SYSTEM_SEED' AS created_by,
    CURRENT_TIMESTAMP AS created_at,
    CURRENT_TIMESTAMP AS submitted_at,
    'ADM-AG-0001' AS reviewed_by,
    CURRENT_TIMESTAMP AS reviewed_at,
    'Khởi tạo danh mục 40 TTHC chuẩn hóa phiên bản v1' AS review_note,
    CURRENT_TIMESTAMP AS published_at,
    'MANUAL' AS source,
    p.source_url AS source_ref
FROM admin_procedures p
ON CONFLICT (procedure_id, version_no) DO NOTHING;

UPDATE admin_procedures p
SET current_version_id = pv.id
FROM procedure_versions pv
WHERE pv.procedure_id = p.id
  AND pv.state = 'PUBLISHED'
  AND (p.current_version_id IS NULL OR p.current_version_id <> pv.id);

-- 5. Enhance audit_log with version_no, before/after snapshots & Database-level Immutability Triggers
ALTER TABLE audit_log
ADD COLUMN IF NOT EXISTS version_no INT,
ADD COLUMN IF NOT EXISTS before_snapshot JSONB,
ADD COLUMN IF NOT EXISTS after_snapshot JSONB;

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE: Operation % on audit_log is strictly prohibited by security policy', TG_OP
        USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_no_update_delete ON audit_log;
CREATE TRIGGER trg_audit_log_no_update_delete
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_audit_log_no_truncate ON audit_log;
CREATE TRIGGER trg_audit_log_no_truncate
BEFORE TRUNCATE ON audit_log
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_log_mutation();
