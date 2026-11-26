-- =====================================================================
-- SmartWard AI - Database Migration V23: Transactional Dossier Idempotency (TASK-051)
-- Persists UUID idempotency_key + SHA-256 payload_hash inside citizen_dossiers
-- so retries across network drops or Backend restarts return the original dossier_code,
-- while reusing the same key with a mutated payload is rejected with HTTP 409 CONFLICT.
-- =====================================================================

ALTER TABLE citizen_dossiers
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128),
    ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS uq_citizen_dossiers_idempotency_key
    ON citizen_dossiers (idempotency_key)
    WHERE idempotency_key IS NOT NULL;
