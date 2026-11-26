-- SmartWard AI - Database Migration V20: Reset All 96 Ward Officers & Admins Credentials
-- Reset PIN for all ward officers (CB-%), community officers (CC-%), and admins (ADM-%) to SmartWardDev2026!
-- BCrypt Cost 12 Hash: $2a$12$fjueEMUz8LUaz.GvpWzB8eUq3DNhk.C1QScHkKuoouQAJvbx4uy1O

UPDATE officers
SET password_hash = '$2a$12$fjueEMUz8LUaz.GvpWzB8eUq3DNhk.C1QScHkKuoouQAJvbx4uy1O',
    must_change_pin = FALSE,
    failed_attempts = 0,
    locked_until = NULL,
    pin_expires_at = NULL,
    active = TRUE
WHERE badge_id LIKE 'CB-%' OR badge_id LIKE 'CC-%' OR badge_id LIKE 'ADM-%';
