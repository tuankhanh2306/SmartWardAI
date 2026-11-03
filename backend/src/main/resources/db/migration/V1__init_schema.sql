-- =====================================================================
-- SmartWard AI - Database Migration V1: Initial Schema (UTH Graduation Thesis)
-- Enables pgvector, creates 6 core tables with relational & vector indices
-- =====================================================================

-- 0. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================================
-- 1. Table: admin_procedures (Quản lý 40 TTHC cấp xã)
-- =====================================================================
CREATE TABLE IF NOT EXISTS admin_procedures (
    id BIGSERIAL PRIMARY KEY,
    procedure_code VARCHAR(50) NOT NULL UNIQUE,
    portal_code VARCHAR(50),
    portal_id VARCHAR(100),
    procedure_name VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    agency VARCHAR(255),
    processing_time VARCHAR(255),
    fee VARCHAR(255),
    source_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_procedures_code ON admin_procedures(procedure_code);
CREATE INDEX IF NOT EXISTS idx_admin_procedures_category ON admin_procedures(category);
CREATE INDEX IF NOT EXISTS idx_admin_procedures_status ON admin_procedures(status);

-- =====================================================================
-- 2. Table: legal_chunks (Các phân đoạn văn bản phục vụ RAG Điều-Khoản)
-- =====================================================================
CREATE TABLE IF NOT EXISTS legal_chunks (
    id BIGSERIAL PRIMARY KEY,
    procedure_id BIGINT NOT NULL REFERENCES admin_procedures(id) ON DELETE CASCADE,
    chunk_code VARCHAR(50) NOT NULL UNIQUE,
    chunk_type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    legal_reference VARCHAR(500),
    embedding vector(768),
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL,
    effective_date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_legal_chunks_proc_id ON legal_chunks(procedure_id);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_type ON legal_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_status_date ON legal_chunks(status, effective_date);

-- HNSW Vector Index for Fast Cosine Similarity Search
CREATE INDEX IF NOT EXISTS idx_legal_chunks_embedding_hnsw 
ON legal_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- =====================================================================
-- 3. Table: issue_clusters (Cụm sự cố phản ánh hiện trường)
-- =====================================================================
CREATE TABLE IF NOT EXISTS issue_clusters (
    id BIGSERIAL PRIMARY KEY,
    cluster_code VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    center_latitude NUMERIC(10, 7) NOT NULL,
    center_longitude NUMERIC(10, 7) NOT NULL,
    center_embedding vector(768),
    report_count INT DEFAULT 1 NOT NULL,
    status VARCHAR(50) DEFAULT 'OPEN' NOT NULL,
    first_reported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_reported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_issue_clusters_category ON issue_clusters(category);
CREATE INDEX IF NOT EXISTS idx_issue_clusters_status ON issue_clusters(status);
CREATE INDEX IF NOT EXISTS idx_issue_clusters_location ON issue_clusters(center_latitude, center_longitude);

-- HNSW Vector Index for Semantic Matching in Stage 2
CREATE INDEX IF NOT EXISTS idx_issue_clusters_embedding_hnsw
ON issue_clusters USING hnsw (center_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- =====================================================================
-- 4. Table: civic_reports (Phản ánh hiện trường từ công dân)
-- =====================================================================
CREATE TABLE IF NOT EXISTS civic_reports (
    id BIGSERIAL PRIMARY KEY,
    report_code VARCHAR(50) NOT NULL UNIQUE,
    cluster_id BIGINT REFERENCES issue_clusters(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    image_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'SUBMITTED' NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_civic_reports_cluster_id ON civic_reports(cluster_id);
CREATE INDEX IF NOT EXISTS idx_civic_reports_submitted_at ON civic_reports(submitted_at);

-- =====================================================================
-- 5. Table: form_submissions (Tiền kiểm định tờ khai hành chính)
-- =====================================================================
CREATE TABLE IF NOT EXISTS form_submissions (
    id BIGSERIAL PRIMARY KEY,
    submission_code VARCHAR(50) NOT NULL UNIQUE,
    form_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    ocr_raw_result JSONB,
    validation_report JSONB,
    is_valid BOOLEAN DEFAULT FALSE NOT NULL,
    confidence_score NUMERIC(4, 3),
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_type ON form_submissions(form_type);
CREATE INDEX IF NOT EXISTS idx_form_submissions_is_valid ON form_submissions(is_valid);

-- =====================================================================
-- 6. Table: vault_documents (Kho lưu trữ tài liệu bảo mật Zero-Trust)
-- =====================================================================
CREATE TABLE IF NOT EXISTS vault_documents (
    id BIGSERIAL PRIMARY KEY,
    document_code VARCHAR(50) NOT NULL UNIQUE,
    minio_object_path VARCHAR(500) NOT NULL,
    encryption_algorithm VARCHAR(50) DEFAULT 'AES/GCM/NoPadding' NOT NULL,
    watermark_content VARCHAR(255),
    one_time_token VARCHAR(100) UNIQUE,
    is_viewed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vault_documents_token ON vault_documents(one_time_token);
CREATE INDEX IF NOT EXISTS idx_vault_documents_expires_at ON vault_documents(expires_at);
