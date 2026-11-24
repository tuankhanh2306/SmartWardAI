-- =====================================================================
-- SmartWard AI - Database Migration V13: Incident Location, Address & Source
-- Bổ sung trường địa chỉ chi tiết và chuẩn hóa nguồn gốc vị trí sự cố
-- =====================================================================

ALTER TABLE civic_reports ADD COLUMN IF NOT EXISTS address_text TEXT;
ALTER TABLE civic_reports ADD COLUMN IF NOT EXISTS location_accuracy_m DOUBLE PRECISION;
ALTER TABLE civic_reports ADD COLUMN IF NOT EXISTS location_source VARCHAR(32) DEFAULT 'GPS';
