-- ==============================================================================
-- V16: Field Incident Photos JSONB Column on civic_reports
-- TASK-027 (MOB-023, WEB-029, API-023, API-025):
--   Stores up to 3 MinIO photo keys per citizen incident report (JSONB array)
--   so ward officers can inspect multi-angle field evidence per cluster while
--   public cluster endpoints strip all photo references.
-- ==============================================================================

ALTER TABLE civic_reports
    ADD COLUMN IF NOT EXISTS photo_keys JSONB NOT NULL DEFAULT '[]'::jsonb;
