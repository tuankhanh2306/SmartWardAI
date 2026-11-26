-- V21: Ward Registry (TASK-024) & Mobile Push Notification Devices (TASK-023)

CREATE TABLE IF NOT EXISTS ward_registry (
    ward_code VARCHAR(64) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    ward_type VARCHAR(40) NOT NULL,
    area VARCHAR(160),
    province VARCHAR(100) NOT NULL DEFAULT 'Tỉnh An Giang',
    office_address TEXT NOT NULL,
    phone_number VARCHAR(40),
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    working_hours VARCHAR(200),
    online_services_json TEXT,
    boundary_json TEXT,
    coord_source VARCHAR(40) DEFAULT 'osm',
    accuracy_note TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ward_registry_type ON ward_registry (ward_type);
CREATE INDEX IF NOT EXISTS idx_ward_registry_active ON ward_registry (active);

CREATE TABLE IF NOT EXISTS notification_device_tokens (
    id BIGSERIAL PRIMARY KEY,
    expo_push_token VARCHAR(255) NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL DEFAULT 'android',
    ward_code VARCHAR(64),
    dossier_code VARCHAR(64),
    device_label VARCHAR(120),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_device_dossier ON notification_device_tokens (dossier_code) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_notif_device_ward ON notification_device_tokens (ward_code) WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS notification_delivery_logs (
    id BIGSERIAL PRIMARY KEY,
    dossier_code VARCHAR(64) NOT NULL,
    expo_push_token VARCHAR(255) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_delivery_dossier ON notification_delivery_logs (dossier_code, created_at DESC);
