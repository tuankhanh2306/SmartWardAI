-- ============================================================================
-- V3: Vector Space Isolation for Multi-Tier Embedding Models
-- Ensures vectors from Google (gemini-embedding-001), Local Sidecar (bkai_pho_bert_ft_v1),
-- and Offline Deterministic Mock (deterministic-mock-v1) are never cross-compared.
-- ============================================================================

ALTER TABLE legal_chunks
    ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(100) NOT NULL DEFAULT 'bkai_pho_bert_ft_v1';

CREATE INDEX IF NOT EXISTS idx_legal_chunks_embedding_model
    ON legal_chunks(embedding_model, status);

ALTER TABLE issue_clusters
    ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(100) NOT NULL DEFAULT 'bkai_pho_bert_ft_v1';

CREATE INDEX IF NOT EXISTS idx_issue_clusters_embedding_model
    ON issue_clusters(embedding_model, status);
