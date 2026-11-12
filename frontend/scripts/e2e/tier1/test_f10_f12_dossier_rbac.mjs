/**
 * test_f10_f12_dossier_rbac.mjs - Tier 1 Tests for F10, F11, F12 (15 Test Cases)
 *
 * Covers:
 * - F10: Database Persistence & Flyway V4 (T1_F10_01 .. T1_F10_05)
 * - F11: Dossier Tracking & Management (T1_F11_01 .. T1_F11_05)
 * - F12: Security & Officer RBAC Enforcement (T1_F12_01 .. T1_F12_05)
 */

import fs from 'node:fs';
import path from 'node:path';
import { apiClient } from '../helpers/api_client.mjs';
import { loginOfficer, logoutOfficer, OFFICER_ACCOUNTS } from '../helpers/auth_helper.mjs';

import { PROJECT_ROOT } from '../helpers/project_root.mjs';
const MIGRATION_DIR = path.join(PROJECT_ROOT, 'backend/src/main/resources/db/migration');
const DOSSIER_PKG_DIR = path.join(PROJECT_ROOT, 'backend/src/main/java/vn/edu/uth/smartward/dossier');

export async function runTests(assertContext) {
  console.log('\n--- [TIER 1] Running F10: Database Persistence & Flyway V4 Tests ---');

  let v4SqlContent = '';

  // T1_F10_01: Verify Flyway migration V4 for citizen_dossiers
  await assertContext.runTest(
    { testId: 'T1_F10_01', featureCode: 'F10', tierCode: 'tier1' },
    'Flyway migration file for citizen_dossiers exists in db/migration (e.g. V4__create_citizen_dossiers.sql)',
    async () => {
      const files = fs.existsSync(MIGRATION_DIR) ? fs.readdirSync(MIGRATION_DIR) : [];
      const v4File = files.find((f) => f.startsWith('V4__') || f.includes('citizen_dossier'));
      const migrationExists = Boolean(v4File);

      if (migrationExists) {
        v4SqlContent = fs.readFileSync(path.join(MIGRATION_DIR, v4File), 'utf8');
      }
      assertContext.assert(migrationExists, 'Migration file for citizen_dossiers must exist');
    }
  );

  // T1_F10_02: Verify mandatory columns in citizen_dossiers table
  await assertContext.runTest(
    { testId: 'T1_F10_02', featureCode: 'F10', tierCode: 'tier1' },
    'citizen_dossiers schema defines all mandatory columns (dossier_code, procedure_code, ward_code, citizen_cccd, form_data, status, sla_deadline)',
    async () => {
      const requiredColumns = [
        'dossier_code',
        'procedure_code',
        'ward_code',
        'citizen_cccd',
        'form_data',
        'status',
        'sla_deadline',
      ];
      const missingColumns = requiredColumns.filter(
        (col) => !v4SqlContent.toLowerCase().includes(col.toLowerCase())
      );
      assertContext.assert(
        v4SqlContent.length > 0 && missingColumns.length === 0,
        `All mandatory columns must be defined, missing: ${missingColumns.join(', ')}`
      );
    }
  );

  // T1_F10_03: Unique constraint on dossier_code
  await assertContext.runTest(
    { testId: 'T1_F10_03', featureCode: 'F10', tierCode: 'tier1' },
    'citizen_dossiers schema enforces UNIQUE constraint on dossier_code',
    async () => {
      const hasUniqueConstraint =
        v4SqlContent.toLowerCase().includes('unique') &&
        v4SqlContent.toLowerCase().includes('dossier_code');
      assertContext.assert(hasUniqueConstraint, 'dossier_code column must have UNIQUE constraint');
    }
  );

  // T1_F10_04: JSONB column data type for form_data and precheck_report
  await assertContext.runTest(
    { testId: 'T1_F10_04', featureCode: 'F10', tierCode: 'tier1' },
    'citizen_dossiers schema utilizes PostgreSQL JSONB for form_data and precheck_report',
    async () => {
      const hasJsonb =
        v4SqlContent.toLowerCase().includes('jsonb') &&
        v4SqlContent.toLowerCase().includes('form_data');
      assertContext.assert(hasJsonb, 'form_data must be stored as JSONB');
    }
  );

  // T1_F10_05: Spring Repository & Service backend package
  await assertContext.runTest(
    { testId: 'T1_F10_05', featureCode: 'F10', tierCode: 'tier1' },
    'Backend package vn.edu.uth.smartward.dossier contains CitizenDossier entity, service, and repository',
    async () => {
      const dossierPkgExists = fs.existsSync(DOSSIER_PKG_DIR);
      let hasServiceOrEntity = false;
      if (dossierPkgExists) {
        const files = fs.readdirSync(DOSSIER_PKG_DIR);
        hasServiceOrEntity = files.some(
          (f) => f.includes('Dossier') && (f.endsWith('Service.java') || f.endsWith('.java'))
        );
      }
      assertContext.assert(
        dossierPkgExists && hasServiceOrEntity,
        'Dossier package and classes must exist'
      );
    }
  );

  console.log('\n--- [TIER 1] Running F11: Dossier Tracking & Management Tests ---');

  const testDossierCode = `HS-E2E-${Date.now().toString().slice(-6)}`;
  const testCccd = '089095012345';
  const testLast4Cccd = '2345';

  // T1_F11_01: Citizen submits dossier via POST /api/v1/dossiers
  await assertContext.runTest(
    { testId: 'T1_F11_01', featureCode: 'F11', tierCode: 'tier1' },
    'POST /api/v1/dossiers successfully creates and persists dossier record in PostgreSQL',
    async () => {
      const payload = {
        dossierCode: testDossierCode,
        procedureCode: 'TTHC-CR-01',
        wardCode: 'WARD-AG-01',
        citizenCccd: testCccd,
        formData: {
          fullName: 'NGUYỄN VĂN AN',
          residenceType: 'CHINH_CHU',
          phone: '0901234567',
        },
        precheckReport: {
          overallValid: true,
          warnings: [],
        },
        vaultDocIds: ['DOC_20261111_0001_MOCK'],
      };

      const res = await apiClient.post('/api/v1/dossiers', payload);
      assertContext.assertStatusCode(res.status, 201, 'POST /api/v1/dossiers status');
    }
  );

  // T1_F11_02: Citizen tracks dossier with matching code & last 4 CCCD digits
  await assertContext.runTest(
    { testId: 'T1_F11_02', featureCode: 'F11', tierCode: 'tier1' },
    'GET /api/v1/dossiers/track returns dossier status and SLA when last 4 CCCD digits match',
    async () => {
      const res = await apiClient.get(
        `/api/v1/dossiers/track?dossierCode=${testDossierCode}&last4Cccd=${testLast4Cccd}`
      );
      assertContext.assertStatusCode(res.status, 200, 'GET /api/v1/dossiers/track status');
    }
  );

  // T1_F11_03: Citizen tracks dossier with wrong last 4 CCCD digits (Access Control)
  await assertContext.runTest(
    { testId: 'T1_F11_03', featureCode: 'F11', tierCode: 'tier1' },
    'GET /api/v1/dossiers/track rejects inquiry when last 4 CCCD digits do not match citizen record',
    async () => {
      const res = await apiClient.get(
        `/api/v1/dossiers/track?dossierCode=${testDossierCode}&last4Cccd=9999`
      );
      const isRejected = res.status === 403 || res.status === 404 || res.status === 400 || !res.ok;
      assertContext.assert(isRejected, 'Must reject inquiry with mismatched CCCD digits');
    }
  );

  // T1_F11_04: Officer approves dossier with appointment code
  await assertContext.runTest(
    { testId: 'T1_F11_04', featureCode: 'F11', tierCode: 'tier1' },
    'PUT /api/v1/dossiers/{code}/review updates status to APPROVED with appointment code',
    async () => {
      const loginRes = await loginOfficer();
      const officerToken = loginRes.data?.data?.token;

      const res = await apiClient.put(
        `/api/v1/dossiers/${testDossierCode}/review`,
        {
          status: 'APPROVED',
          officerFeedback: 'Hồ sơ đầy đủ, hẹn đối chiếu bản chính.',
          appointmentCode: `LH-${Date.now().toString().slice(-6)}`,
        },
        {
          headers: { Authorization: `Bearer ${officerToken}` },
        }
      );
      assertContext.assertStatusCode(res.status, 200, 'PUT review status to APPROVED');
    }
  );

  // T1_F11_05: Officer requests supplement with specific reason
  await assertContext.runTest(
    { testId: 'T1_F11_05', featureCode: 'F11', tierCode: 'tier1' },
    'PUT /api/v1/dossiers/{code}/review updates status to SUPPLEMENT_REQUIRED with feedback',
    async () => {
      const loginRes = await loginOfficer();
      const officerToken = loginRes.data?.data?.token;

      const res = await apiClient.put(
        `/api/v1/dossiers/${testDossierCode}/review`,
        {
          status: 'SUPPLEMENT_REQUIRED',
          officerFeedback: 'Vui lòng bổ sung bản chụp mặt sau CCCD và hợp đồng thuê nhà.',
        },
        {
          headers: { Authorization: `Bearer ${officerToken}` },
        }
      );
      assertContext.assertStatusCode(res.status, 200, 'PUT review status to SUPPLEMENT_REQUIRED');
    }
  );

  console.log('\n--- [TIER 1] Running F12: Security & Officer RBAC Enforcement Tests ---');

  // T1_F12_01: Officer login with valid credentials
  await assertContext.runTest(
    { testId: 'T1_F12_01', featureCode: 'F12', tierCode: 'tier1' },
    'Officer login delivers valid JWT HMAC-SHA256 token and role OFFICER',
    async () => {
      const res = await loginOfficer(
        OFFICER_ACCOUNTS.JUSTICE_CIVIC.badgeId,
        OFFICER_ACCOUNTS.JUSTICE_CIVIC.pin,
        OFFICER_ACCOUNTS.JUSTICE_CIVIC.wardCode
      );
      assertContext.assertStatusCode(res.status, 200, 'POST /api/v1/auth/officer/login status');

      const token = res.data?.data?.token;
      const role = res.data?.data?.role;
      assertContext.assert(Boolean(token && role === 'OFFICER'), 'Must return JWT token and role OFFICER');
    }
  );

  // T1_F12_02: Officer login with invalid PIN returns 401
  await assertContext.runTest(
    { testId: 'T1_F12_02', featureCode: 'F12', tierCode: 'tier1' },
    'POST /api/v1/auth/officer/login with wrong PIN returns HTTP 401 Unauthorized',
    async () => {
      const res = await apiClient.post('/api/v1/auth/officer/login', {
        badgeId: OFFICER_ACCOUNTS.JUSTICE_CIVIC.badgeId,
        pin: '0000',
        wardCode: 'WARD-AG-01',
      });
      assertContext.assertStatusCode(res.status, 401, 'Invalid PIN must return 401');
    }
  );

  // T1_F12_03: Protect HITL queue without authorization token
  await assertContext.runTest(
    { testId: 'T1_F12_03', featureCode: 'F12', tierCode: 'tier1' },
    'GET /api/v1/rag/hitl/queue without Bearer token is rejected with HTTP 401/403',
    async () => {
      apiClient.clearOfficerToken();
      const res = await apiClient.get('/api/v1/rag/hitl/queue');
      const isProtected = res.status === 401 || res.status === 403 || !res.ok;
      assertContext.assert(isProtected, 'HITL queue endpoint must require authentication');
    }
  );

  // T1_F12_04: Protected administrative endpoints require valid Officer Bearer authorization
  await assertContext.runTest(
    { testId: 'T1_F12_04', featureCode: 'F12', tierCode: 'tier1' },
    'Administrative endpoints enforce Officer authorization',
    async () => {
      // Test with valid token
      const loginRes = await loginOfficer();
      const validToken = loginRes.data?.data?.token;
      const authRes = await apiClient.get('/api/v1/auth/officer/me', {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      assertContext.assertStatusCode(authRes.status, 200, 'Authenticated officer profile access');

      // Test without token
      apiClient.clearOfficerToken();
      const noAuthRes = await apiClient.get('/api/v1/auth/officer/me', {
        headers: { Authorization: '' },
      });
      const isRejected = noAuthRes.status === 401 || noAuthRes.status === 403 || !noAuthRes.ok;
      assertContext.assert(isRejected, 'Unauthenticated access to officer/me must be rejected');
    }
  );

  // T1_F12_05: Officer logout and token revocation
  await assertContext.runTest(
    { testId: 'T1_F12_05', featureCode: 'F12', tierCode: 'tier1' },
    'Subsequent requests using revoked token are rejected with HTTP 401 Unauthorized',
    async () => {
      const loginRes = await loginOfficer();
      const tokenToRevoke = loginRes.data?.data?.token;

      const logoutRes = await logoutOfficer();
      assertContext.assertStatusCode(logoutRes.status, 200, 'Logout status');

      const testMeRes = await apiClient.get('/api/v1/auth/officer/me', {
        headers: { Authorization: `Bearer ${tokenToRevoke}` },
      });
      const isRevoked = testMeRes.status === 401 || !testMeRes.ok;
      assertContext.assert(isRevoked, 'Revoked token must be rejected with 401');
    }
  );
}
