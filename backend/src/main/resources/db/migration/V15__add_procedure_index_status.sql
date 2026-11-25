-- ==============================================================================
-- V15: Asynchronous Vector Indexing Status & Retry Tracking for Procedures
-- TASK-013 (WEB-020, API-010, API-037):
--   Decouples Admin Maker-Checker approval from synchronous AI Sidecar embedding
--   so approval responds immediately while a background worker updates pgvector
--   safely with retry tracking (PENDING_INDEX / INDEXED / FAILED).
-- ==============================================================================

ALTER TABLE procedure_versions
    ADD COLUMN IF NOT EXISTS index_status VARCHAR(32) NOT NULL DEFAULT 'INDEXED',
    ADD COLUMN IF NOT EXISTS index_retry_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS index_error TEXT,
    ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMPTZ;

ALTER TABLE admin_procedures
    ADD COLUMN IF NOT EXISTS index_status VARCHAR(32) NOT NULL DEFAULT 'INDEXED';

CREATE INDEX IF NOT EXISTS idx_procedure_versions_pending_index
    ON procedure_versions (index_status)
    WHERE index_status IN ('PENDING_INDEX', 'FAILED');
