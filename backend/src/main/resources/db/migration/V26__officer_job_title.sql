-- Authority comes from a verified personnel assignment, never from the display name.
ALTER TABLE officers ADD COLUMN job_title VARCHAR(160);
CREATE INDEX idx_dossier_verified_receipt_lookup
    ON citizen_dossiers (upper(ward_code), upper(receiving_agency), upper(official_receipt_no))
    WHERE receipt_verified_at IS NOT NULL;
