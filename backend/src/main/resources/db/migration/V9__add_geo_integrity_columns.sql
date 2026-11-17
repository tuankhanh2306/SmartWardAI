-- =====================================================================
-- SmartWard AI - Database Migration V9: Geo Data Integrity & GPS Control
-- Bổ sung trường kiểm soát độ chính xác vị trí và nguồn tọa độ công dân
-- =====================================================================

ALTER TABLE civic_reports ADD COLUMN IF NOT EXISTS location_accuracy_m DOUBLE PRECISION;
ALTER TABLE civic_reports ADD COLUMN IF NOT EXISTS location_source VARCHAR(32) DEFAULT 'gps';
