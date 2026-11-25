-- ==============================================================================
-- SMARTWARD AI — LEAST-PRIVILEGE RUNTIME DB ROLE FOR IMMUTABLE AUDIT_LOG
-- TASK-010 (API-004, API-037):
--   1. Creates a dedicated non-superuser PostgreSQL runtime role (smartward_app)
--      separate from the schema/table owner & Flyway migration role (smartward).
--   2. Grants standard CRUD (SELECT, INSERT, UPDATE, DELETE) on operational
--      tables and USAGE/SELECT on sequences.
--   3. STRICTLY restricts public.audit_log to SELECT + INSERT only.
--      Because smartward_app is NOT the owner of public.audit_log and has no
--      CREATE/DDL/TRIGGER/UPDATE/DELETE/TRUNCATE privileges on it, PostgreSQL
--      rejects UPDATE, DELETE, TRUNCATE, ALTER TABLE, and DROP TRIGGER attempts
--      at the database engine permission layer.
--
-- Usage (run as DBA / table owner 'smartward'):
--   psql -v ON_ERROR_STOP=1 -v app_user=smartward_app -v app_password='<STRONG_PASSWORD>' \
--        -U smartward -d smartward_db -f scripts/db/setup_audit_least_privilege_role.sql
-- ==============================================================================

\if :{?app_user}
\else
  \set app_user smartward_app
\endif

\if :{?app_password}
\else
  \set app_password 'SmartWardApp_ChangeMe_2026!'
\endif

SELECT format(
    'DO $body$ BEGIN ' ||
    'IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = %L) THEN ' ||
    '  CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION PASSWORD %L; ' ||
    'ELSE ' ||
    '  ALTER ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION PASSWORD %L; ' ||
    'END IF; ' ||
    'END $body$;',
    :'app_user', :'app_user', :'app_password', :'app_user', :'app_password'
) \gexec

-- Allow connecting to current database & using schema public (WITHOUT CREATE/DDL rights)
SELECT format('GRANT CONNECT ON DATABASE %I TO %I;', current_database(), :'app_user') \gexec
SELECT format('REVOKE CREATE ON SCHEMA public FROM %I;', :'app_user') \gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I;', :'app_user') \gexec

-- Grant runtime CRUD on operational tables and sequence access
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I;', :'app_user') \gexec
SELECT format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I;', :'app_user') \gexec

-- Default privileges for future Flyway migrations run by the current owner role
SELECT format(
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I;',
    :'app_user'
) \gexec
SELECT format(
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I;',
    :'app_user'
) \gexec

-- HARDENING: Strip ALL privileges on audit_log and re-grant ONLY SELECT + INSERT
SELECT format('REVOKE ALL PRIVILEGES ON TABLE public.audit_log FROM PUBLIC;') \gexec
SELECT format('REVOKE ALL PRIVILEGES ON TABLE public.audit_log FROM %I;', :'app_user') \gexec
SELECT format('GRANT SELECT, INSERT ON TABLE public.audit_log TO %I;', :'app_user') \gexec

-- Ensure sequence for audit_log.id allows INSERT (auto-increment) without ALTER/DROP
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'audit_log_id_seq') THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE public.audit_log_id_seq FROM PUBLIC');
    END IF;
END $$;
SELECT format('GRANT USAGE, SELECT ON SEQUENCE public.audit_log_id_seq TO %I;', :'app_user') \gexec

-- Verify resulting grants on audit_log
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'audit_log'
  AND grantee = :'app_user'
ORDER BY privilege_type;
