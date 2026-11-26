-- =====================================================================
-- SmartWard AI - Database Migration V22: Seed Officers for 6 Unchanged Communes (TASK-009)
-- Completes 102/102 An Giang administrative units per NQ 1654/NQ-UBTVQH15
-- (85 Xã, 14 Phường, 3 Đặc khu — adding 6 unchanged communes:
--  Mỹ Hòa Hưng, Bình Giang, Bình Sơn, Hòn Nghệ, Sơn Hải, Tiên Hải)
-- BCrypt Cost 12 Hash matches V20 (SmartWardDev2026!)
-- =====================================================================

INSERT INTO officers (badge_id, full_name, ward_code, role, password_hash, must_change_pin, failed_attempts, locked_until, pin_expires_at, active)
VALUES
    ('CB-AG_X_MYHOAHUNG', 'Cán bộ Một cửa — Xã Mỹ Hòa Hưng', 'AG_X_MYHOAHUNG', 'OFFICER', '$2a$12$fjueEMUz8LUaz.GvpWzB8eUq3DNhk.C1QScHkKuoouQAJvbx4uy1O', FALSE, 0, NULL, NULL, TRUE),
    ('CB-AG_X_BINHGIANG', 'Cán bộ Một cửa — Xã Bình Giang',   'AG_X_BINHGIANG', 'OFFICER', '$2a$12$fjueEMUz8LUaz.GvpWzB8eUq3DNhk.C1QScHkKuoouQAJvbx4uy1O', FALSE, 0, NULL, NULL, TRUE),
    ('CB-AG_X_BINHSON',   'Cán bộ Một cửa — Xã Bình Sơn',     'AG_X_BINHSON',   'OFFICER', '$2a$12$fjueEMUz8LUaz.GvpWzB8eUq3DNhk.C1QScHkKuoouQAJvbx4uy1O', FALSE, 0, NULL, NULL, TRUE),
    ('CB-AG_X_HONNGHE',   'Cán bộ Một cửa — Xã Hòn Nghệ',     'AG_X_HONNGHE',   'OFFICER', '$2a$12$fjueEMUz8LUaz.GvpWzB8eUq3DNhk.C1QScHkKuoouQAJvbx4uy1O', FALSE, 0, NULL, NULL, TRUE),
    ('CB-AG_X_SONHAI',    'Cán bộ Một cửa — Xã Sơn Hải',      'AG_X_SONHAI',    'OFFICER', '$2a$12$fjueEMUz8LUaz.GvpWzB8eUq3DNhk.C1QScHkKuoouQAJvbx4uy1O', FALSE, 0, NULL, NULL, TRUE),
    ('CB-AG_X_TIENHAI',   'Cán bộ Một cửa — Xã Tiên Hải',     'AG_X_TIENHAI',   'OFFICER', '$2a$12$fjueEMUz8LUaz.GvpWzB8eUq3DNhk.C1QScHkKuoouQAJvbx4uy1O', FALSE, 0, NULL, NULL, TRUE)
ON CONFLICT (badge_id) DO NOTHING;
