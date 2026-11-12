-- =====================================================================
-- SmartWard AI - Database Migration V4: Citizen Dossiers Schema (M4)
-- Quản lý hồ sơ thủ tục hành chính nộp trực tuyến cấp xã
-- =====================================================================

CREATE TABLE IF NOT EXISTS citizen_dossiers (
    id BIGSERIAL PRIMARY KEY,
    dossier_code VARCHAR(64) NOT NULL UNIQUE,
    procedure_code VARCHAR(64) NOT NULL,
    ward_code VARCHAR(64) NOT NULL,
    citizen_cccd VARCHAR(12) NOT NULL,
    form_data JSONB NOT NULL,
    precheck_report JSONB,
    vault_doc_ids JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(32) DEFAULT 'PENDING' NOT NULL,
    sla_deadline TIMESTAMPTZ NOT NULL,
    officer_feedback TEXT,
    appointment_code VARCHAR(64),
    version BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_citizen_dossiers_code ON citizen_dossiers(dossier_code);
CREATE INDEX IF NOT EXISTS idx_citizen_dossiers_cccd ON citizen_dossiers(citizen_cccd);
CREATE INDEX IF NOT EXISTS idx_citizen_dossiers_ward ON citizen_dossiers(ward_code);
CREATE INDEX IF NOT EXISTS idx_citizen_dossiers_status ON citizen_dossiers(status);
