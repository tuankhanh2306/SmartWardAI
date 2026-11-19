-- =====================================================================
-- SmartWard AI - Database Migration V12: Emergency Auth Hardening & PIN Expiry
-- Idempotent DDL/DML (safe regardless of branch merge order, out-of-order=false)
-- 1. Ensures must_change_pin & pin_expires_at columns exist on officers
-- 2. Revokes leaked default BCrypt password hashes committed in repo seeds (V6/V10)
-- =====================================================================

ALTER TABLE officers
ADD COLUMN IF NOT EXISTS must_change_pin BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE officers
ADD COLUMN IF NOT EXISTS pin_expires_at TIMESTAMPTZ;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'officers'
          AND column_name = 'password_hash'
    ) THEN
        UPDATE officers
        SET password_hash = 'REVOKED_COMPROMISED_SEED',
            must_change_pin = TRUE,
            pin_expires_at = NULL
        WHERE password_hash IN (
            '$2a$12$b0yxUyDnS/g7Q5XPOkrcb.Dwpx8CeXa9XmNDTwBF4q5joS7hmOyR6',
            '$2a$12$DqD/Vyanu6H1jiz0cHQHN.HuU5O2XF3lqnztyiY7nQQFucJymk.n.'
        );
    END IF;
END $$;
