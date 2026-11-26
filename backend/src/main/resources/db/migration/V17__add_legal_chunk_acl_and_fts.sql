-- ==============================================================================
-- V17: Document-Level ACL (visibility_scope, ward_code) & PostgreSQL FTS (tsvector + GIN)
-- TASK-033 (WEB-030, WEB-005, API-011):
--   1. Enforces visibility_scope ('PUBLIC' | 'OFFICER_ONLY') and optional ward_code
--      directly inside SQL queries so citizens can never retrieve internal officer chunks.
--   2. Adds generated tsvector column + GIN index for zero-RAM-overhead Hybrid RRF
--      combining pgvector HNSW cosine search with PostgreSQL Full-Text Search.
-- ==============================================================================

ALTER TABLE legal_chunks
    ADD COLUMN IF NOT EXISTS visibility_scope VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
    ADD COLUMN IF NOT EXISTS ward_code VARCHAR(50);

ALTER TABLE legal_chunks
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(legal_reference, ''))
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_legal_chunks_search_vector
    ON legal_chunks USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_legal_chunks_visibility_ward
    ON legal_chunks (visibility_scope, ward_code);
