-- SmartWard AI - Database Migration V25:
-- 1. Citizen dossier routing channel, receiving agency & verified official receipt separation (SW_DRAFT vs SW_RECEIPT)
-- 2. Conditional signing delegations table (ward + procedure + delegate badge/title + decision_number + valid window)

ALTER TABLE citizen_dossiers
    ADD COLUMN IF NOT EXISTS routing_channel VARCHAR(32) NOT NULL DEFAULT 'TTPVHCC_UBND',
    ADD COLUMN IF NOT EXISTS receiving_agency VARCHAR(255),
    ADD COLUMN IF NOT EXISTS official_receipt_no VARCHAR(64),
    ADD COLUMN IF NOT EXISTS receipt_verified_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_citizen_dossiers_routing_channel
    ON citizen_dossiers(ward_code, routing_channel);

CREATE TABLE IF NOT EXISTS signing_delegations (
    id BIGSERIAL PRIMARY KEY,
    ward_code VARCHAR(64) NOT NULL,
    procedure_code VARCHAR(64) NOT NULL,
    delegate_badge_id VARCHAR(64),
    delegate_title VARCHAR(160),
    decision_number VARCHAR(128) NOT NULL,
    seal_type VARCHAR(32) NOT NULL DEFAULT 'TTPVHCC_SEAL',
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signing_delegations_lookup
    ON signing_delegations(ward_code, procedure_code, active);

-- Real-world An Giang reference delegation:
-- Decision 989/QD-UBND of Special Zone Kien Hai authorizing Deputy Director of TTPVHCC to sign selected certification TTHCs
INSERT INTO signing_delegations (
    ward_code,
    procedure_code,
    delegate_badge_id,
    delegate_title,
    decision_number,
    seal_type,
    valid_from,
    valid_to,
    active
)
SELECT
    'AG_DK_KIENHAI',
    proc_code,
    NULL,
    'Phó Giám đốc Trung tâm Phục vụ hành chính công',
    '989/QĐ-UBND',
    'TTPVHCC_SEAL',
    TIMESTAMP WITH TIME ZONE '2025-07-01 00:00:00+07',
    TIMESTAMP WITH TIME ZONE '2027-12-31 23:59:59+07',
    TRUE
FROM (VALUES ('TTHC-CT-01'), ('TTHC-CT-02')) AS v(proc_code)
WHERE NOT EXISTS (
    SELECT 1 FROM signing_delegations sd
    WHERE sd.ward_code = 'AG_DK_KIENHAI'
      AND sd.procedure_code = v.proc_code
      AND sd.decision_number = '989/QĐ-UBND'
);
