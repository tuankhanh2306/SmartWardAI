-- ==============================================================================
-- SMARTWARD AI — VERIFICATION SCRIPT FOR LEAST-PRIVILEGE AUDIT_LOG ROLE
-- Must be executed AS the runtime role (e.g. psql -U smartward_app -d smartward_db).
-- Verifies:
--   1. INSERT into audit_log SUCCEEDS
--   2. SELECT from audit_log SUCCEEDS
--   3. UPDATE audit_log is REJECTED by PostgreSQL (insufficient_privilege)
--   4. DELETE FROM audit_log is REJECTED by PostgreSQL (insufficient_privilege)
--   5. TRUNCATE audit_log is REJECTED by PostgreSQL (insufficient_privilege)
--   6. DROP TRIGGER / ALTER TABLE on audit_log is REJECTED (must be owner)
-- ==============================================================================

\set ON_ERROR_STOP on

DO $$
DECLARE
    v_inserted_id BIGINT;
    v_count BIGINT;
BEGIN
    -- 1. INSERT must succeed
    INSERT INTO public.audit_log (who, ward, action, entity, entity_id, ip, user_agent)
    VALUES ('SEC_VERIFY_BOT', 'AG_PROVINCE', 'AUDIT_ROLE_SELF_CHECK', 'AUDIT_LOG', 'VERIFY-010', '127.0.0.1', 'psql-verify')
    RETURNING id INTO v_inserted_id;

    -- 2. SELECT must succeed
    SELECT count(*) INTO v_count FROM public.audit_log WHERE id = v_inserted_id;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'FAIL: SELECT on audit_log did not return inserted row';
    END IF;
    RAISE NOTICE 'PASS [1/6 & 2/6]: INSERT (id=%) and SELECT succeeded as %', v_inserted_id, current_user;

    -- 3. UPDATE must be denied
    BEGIN
        UPDATE public.audit_log SET action = 'TAMPERED' WHERE id = v_inserted_id;
        RAISE EXCEPTION 'FAIL: UPDATE on audit_log unexpectedly succeeded!';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'PASS [3/6]: UPDATE rejected by PostgreSQL (%).', SQLERRM;
    END;

    -- 4. DELETE must be denied
    BEGIN
        DELETE FROM public.audit_log WHERE id = v_inserted_id;
        RAISE EXCEPTION 'FAIL: DELETE on audit_log unexpectedly succeeded!';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'PASS [4/6]: DELETE rejected by PostgreSQL (%).', SQLERRM;
    END;

    -- 5. TRUNCATE must be denied
    BEGIN
        TRUNCATE TABLE public.audit_log;
        RAISE EXCEPTION 'FAIL: TRUNCATE on audit_log unexpectedly succeeded!';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'PASS [5/6]: TRUNCATE rejected by PostgreSQL (%).', SQLERRM;
    END;

    -- 6. DROP TRIGGER / DDL must be denied (not table owner)
    BEGIN
        DROP TRIGGER trg_audit_log_no_update_delete ON public.audit_log;
        RAISE EXCEPTION 'FAIL: DROP TRIGGER on audit_log unexpectedly succeeded!';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'PASS [6/6]: DROP TRIGGER rejected by PostgreSQL (%).', SQLERRM;
    END;

    BEGIN
        ALTER TABLE public.audit_log DISABLE TRIGGER ALL;
        RAISE EXCEPTION 'FAIL: ALTER TABLE DISABLE TRIGGER unexpectedly succeeded!';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'PASS [6b/6]: ALTER TABLE DISABLE TRIGGER rejected by PostgreSQL (%).', SQLERRM;
    END;
END $$;
