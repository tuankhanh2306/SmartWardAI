-- =====================================================================
-- SMARTWARD AI — V7: Legal Chunk Provenance, Header Path & Content Hash
-- Supports Knowledge Pipeline: Header-based chunking & safe re-indexing
-- =====================================================================

ALTER TABLE legal_chunks ADD COLUMN IF NOT EXISTS header_path VARCHAR(255);
ALTER TABLE legal_chunks ADD COLUMN IF NOT EXISTS section_name VARCHAR(100);
ALTER TABLE legal_chunks ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE legal_chunks ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ;
ALTER TABLE legal_chunks ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
ALTER TABLE legal_chunks ADD COLUMN IF NOT EXISTS pipeline_version VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_legal_chunks_content_hash ON legal_chunks(content_hash);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_header_path ON legal_chunks(header_path);
