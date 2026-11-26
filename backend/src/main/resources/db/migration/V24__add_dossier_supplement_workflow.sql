-- =====================================================================
-- SmartWard AI - Database Migration V24: Dossier Supplement Workflow (TASK-054)
-- Hỗ trợ người dân gửi bổ sung hồ sơ trực tiếp & cán bộ lọc "Vừa bổ sung"
-- =====================================================================

ALTER TABLE citizen_dossiers
    ADD COLUMN IF NOT EXISTS requested_supplement_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS supplemented_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS supplement_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_citizen_dossiers_supplemented_at
    ON citizen_dossiers (ward_code, supplemented_at DESC)
    WHERE supplemented_at IS NOT NULL;
