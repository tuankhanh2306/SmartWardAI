-- =====================================================================
-- SmartWard AI - Database Migration V11: Admin Province Scope & PIN Policy
-- 1. Adds must_change_pin flag to officers for mandatory first-login PIN change
-- 2. Updates ADM-AG-0001 and ADM-AG-0002 ward_code to 'AG_PROVINCE' (not a commune)
-- =====================================================================

ALTER TABLE officers
ADD COLUMN IF NOT EXISTS must_change_pin BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE officers
SET ward_code = 'AG_PROVINCE'
WHERE role = 'ADMIN' AND badge_id IN ('ADM-AG-0001', 'ADM-AG-0002');
