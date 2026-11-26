-- =====================================================================
-- SmartWard AI - Database Migration V19: Reset Dev/Test Officer Credentials
-- Idempotent DML: updates revoked password hashes for demonstration accounts
-- PIN: SmartWardDev2026! (BCrypt cost 12)
-- Hash: $2a$12$fjueEMUz8LUaz.GvpWzB8eUq3DNhk.C1QScHkKuoouQAJvbx4uy1O
-- =====================================================================

UPDATE officers
SET password_hash = '$2a$12$fjueEMUz8LUaz.GvpWzB8eUq3DNhk.C1QScHkKuoouQAJvbx4uy1O',
    must_change_pin = FALSE,
    failed_attempts = 0,
    locked_until = NULL,
    pin_expires_at = NULL,
    active = TRUE
WHERE badge_id IN ('CC-AG-8942', 'CC-AG-1001', 'ADM-AG-0001', 'ADM-AG-0002');
