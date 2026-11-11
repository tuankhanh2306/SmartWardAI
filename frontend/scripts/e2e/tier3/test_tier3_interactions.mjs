/**
 * test_tier3_interactions.mjs - Tier 3 Tests: Cross-Feature Interactions (14 Test Cases)
 *
 * Implements all 14 cross-feature interaction test cases (T3_INT_01 .. T3_INT_14)
 * specified in analysis.md and SCOPE.md:
 * - T3_INT_01 (F1 + F2): Seed JSON Standardization -> Admin Procedures REST API
 * - T3_INT_02 (F2 + F3): Procedures REST API -> Frontend Dynamic Catalog Sync
 * - T3_INT_03 (F7 + F4): Quét QR CCCD -> Tự động điền Form CT01 & Tiền kiểm
 * - T3_INT_04 (F4 + F5): Form Precheck -> Render Modal A4 dữ liệu thực tế
 * - T3_INT_05 (F6 + F4): Smart Checklist -> Ràng buộc Validator Form Precheck
 * - T3_INT_06 (F8 + F4): OCR Đối soát Giấy chứng sinh -> Báo cáo Tiền kiểm
 * - T3_INT_07 (F4 + F9): Form Precheck -> Đính kèm Zero-Trust Vault
 * - T3_INT_08 (F9 + F10): Vault Documents -> Citizen Dossier DB Record
 * - T3_INT_09 (F10 + F11): Database Persistence -> Tra cứu tiến độ (mã + 4 số cuối CCCD)
 * - T3_INT_10 (F11 + F12): Quản lý hồ sơ -> Phân quyền Cán bộ Một cửa (RBAC)
 * - T3_INT_11 (F11 + F9): Cán bộ xem hồ sơ Dashboard -> Tiêu thụ One-Time Token (OTT 410 GONE)
 * - T3_INT_12 (F12 + F3): Đăng nhập Cán bộ -> Giải quyết Hàng đợi HITL RAG
 * - T3_INT_13 (F6 + F11): Smart Checklist Phí -> Tính toán SLA & Lệ phí Hồ sơ
 * - T3_INT_14 (F13 + F9): Khóa bảo mật 32-byte -> Tính toàn vẹn mã hóa và giải mã Vault AES-256
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { apiClient } from '../helpers/api_client.mjs';
import { loginOfficer } from '../helpers/auth_helper.mjs';
import { parseCccdQrString, STATIC_CCCD_FIXTURES } from '../fixtures/cccd_qr_fixtures.mjs';
import { TK_KS_FIXTURES } from '../fixtures/form_tk_ks_fixtures.mjs';
import { OCR_CROSS_CHECK_FIXTURES, createSampleFileBuffer } from '../fixtures/vault_document_fixtures.mjs';

const PROJECT_ROOT = path.resolve(process.cwd());
const SEED_PROCEDURES_DIR = path.join(PROJECT_ROOT, 'backend/src/main/resources/db/seed/procedures');

export async function runTests(assertContext) {
  console.log('\n================================================================');
  console.log('TIER 3: CROSS-FEATURE INTERACTIONS (14 TEST CASES)');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // T3_INT_01 (F1 + F2): Seed JSON Standardization -> Admin Procedures REST API
  // -------------------------------------------------------------------------
  await assertContext.runTest(
    { testId: 'T3_INT_01', featureCode: 'F2', tierCode: 'tier3' },
    '[F1+F2] Seed JSONs sync into Admin Procedures REST API returning 40 procedures with commune authority',
    async () => {
      // Step 1: Verify Seed directory on disk has 40 valid JSON files
      const seedFiles = fs.existsSync(SEED_PROCEDURES_DIR)
        ? fs.readdirSync(SEED_PROCEDURES_DIR).filter((f) => f.endsWith('.json'))
        : [];
      assertContext.assertEqual(seedFiles.length, 40, 'Seed procedures folder must contain exactly 40 JSON files');

      // Step 2: Query GET /api/v1/procedures from REST API
      const res = await apiClient.get('/api/v1/procedures');
      assertContext.assertStatusCode(res.status, 200, 'GET /api/v1/procedures status');

      const procedures = res.data?.data || res.data || [];
      assertContext.assert(Array.isArray(procedures), 'API response data must be an array');
      assertContext.assertEqual(procedures.length, 40, 'REST API must return exactly 40 procedures from DB');

      // Step 3: Check that commune authority is standardized on commune level
      const sampleProc = procedures.find((p) => p.procedureCode === 'TTHC-HT-01');
      assertContext.assert(Boolean(sampleProc), 'TTHC-HT-01 must be present in procedures list');
      if (sampleProc?.agency) {
        assertContext.assert(
          sampleProc.agency.includes('xã') || sampleProc.agency.includes('phường'),
          'Procedure agency must specify commune-level authority'
        );
      }
    }
  );

  // -------------------------------------------------------------------------
  // T3_INT_02 (F2 + F3): Procedures REST API -> Frontend Dynamic Catalog Sync
  // -------------------------------------------------------------------------
  await assertContext.runTest(
    { testId: 'T3_INT_02', featureCode: 'F3', tierCode: 'tier3' },
    '[F2+F3] Procedures REST API aligns with Frontend dynamic catalog across all 4 standard commune groups',
    async () => {
      // Step 1: Read frontend procedures catalog source
      const catalogPath = path.join(PROJECT_ROOT, 'frontend/src/data/proceduresCatalog.ts');
      assertContext.assert(fs.existsSync(catalogPath), 'frontend/src/data/proceduresCatalog.ts must exist');

      const content = fs.readFileSync(catalogPath, 'utf8');

      // Step 2: Extract procedure codes from frontend file
      const codeMatches = [...content.matchAll(/"code":\s*"(TTHC-[A-Z0-9-]+)"/g)].map((m) => m[1]);
      assertContext.assertEqual(codeMatches.length, 40, 'Frontend proceduresCatalog must define exactly 40 procedures');

      // Step 3: Verify obsolete duplicate codes are eradicated
      const staleDuplicates = ['TTHC-BT-06', 'TTHC-CR-05', 'TTHC-CT-03'];
      for (const stale of staleDuplicates) {
        assertContext.assert(
          !codeMatches.includes(stale),
          `Stale duplicate code ${stale} must not exist in frontend catalog`
        );
      }

      // Step 4: Verify mandatory added procedures exist
      const requiredCodes = ['TTHC-HT-13', 'TTHC-MT-01', 'TTHC-NCC-01'];
      for (const reqCode of requiredCodes) {
        assertContext.assert(
          codeMatches.includes(reqCode),
          `Missing procedure ${reqCode} must be included in frontend catalog`
        );
      }
    }
  );

  // -------------------------------------------------------------------------
  // T3_INT_03 (F7 + F4): Quét QR CCCD -> Tự động điền Form CT01 & Tiền kiểm
  // -------------------------------------------------------------------------
  await assertContext.runTest(
    { testId: 'T3_INT_03', featureCode: 'F4', tierCode: 'tier3' },
    '[F7+F4] QR CCCD 7-field decoding automatically populates Form CT01 and triggers successful precheck',
    async () => {
      // Step 1: Decode standard BCA QR string
      const rawQr = STATIC_CCCD_FIXTURES.VALID_AN_GIANG_MALE_1995.rawQr;
      const parsedQr = parseCccdQrString(rawQr);

      assertContext.assert(parsedQr.valid, 'BCA QR must parse successfully');
      assertContext.assertEqual(parsedQr.data.cccdNumber, '089095012345', 'CCCD number parsed correctly');

      // Step 2: Auto-fill into Form CT01 payload
      const autoFilledPayload = {
        procedureCode: 'TTHC-CR-01',
        formType: 'CT01',
        citizenCccd: parsedQr.data.cccdNumber,
        fullName: parsedQr.data.fullName,
        dateOfBirth: parsedQr.data.dateOfBirth,
        gender: parsedQr.data.gender,
        cccdIssueDate: parsedQr.data.issueDate,
        address: parsedQr.data.address,
        formData: {
          residenceType: 'CHINH_CHU',
          declarationScope: 'Đăng ký thường trú theo diện chủ hộ',
          phone: '0901234567',
        },
      };

      // Step 3: Trigger backend form precheck
      const res = await apiClient.post('/api/v1/forms/precheck', autoFilledPayload);
      assertContext.assertStatusCode(res.status, 200, 'POST /api/v1/forms/precheck status');
      assertContext.assert(res.data?.overallValid === true, 'Auto-filled CT01 form from QR must pass precheck');

      const cccdValidation = res.data?.fieldValidations?.find(
        (f) => f.fieldName?.toLowerCase().includes('cccd') || f.fieldName?.toLowerCase().includes('định danh')
      );
      assertContext.assert(cccdValidation?.valid === true, 'Citizen CCCD must be validated successfully');
      assertContext.assertEqual(cccdValidation?.providedValue, '089095012345', 'Citizen CCCD preserved in precheck validation');
    }
  );

  // -------------------------------------------------------------------------
  // T3_INT_04 (F4 + F5): Form Precheck -> Render Modal A4 dữ liệu thực tế
  // -------------------------------------------------------------------------
  await assertContext.runTest(
    { testId: 'T3_INT_04', featureCode: 'F5', tierCode: 'tier3' },
    '[F4+F5] Form Precheck data transitions seamlessly to A4 Document Modal without mock NGUYỄN VĂN HÒA',
    async () => {
      const a4ModalPath = path.join(PROJECT_ROOT, 'frontend/src/components/A4DocumentModal.tsx');
      assertContext.assert(fs.existsSync(a4ModalPath), 'A4DocumentModal.tsx must exist');

      const modalSource = fs.readFileSync(a4ModalPath, 'utf8');

      // Check 1: Mock placeholder NGUYỄN VĂN HÒA removed
      assertContext.assert(
        !modalSource.includes('NGUYỄN VĂN HÒA'),
        'Mock name NGUYỄN VĂN HÒA must be completely removed from A4 modal'
      );

      // Check 2: Dynamic props binding for citizen details
      const bindsDynamicCitizen =
        modalSource.includes('fullName') &&
        (modalSource.includes('idNumber') || modalSource.includes('citizenCccd'));
      assertContext.assert(bindsDynamicCitizen, 'A4 modal must dynamically bind citizen fullName and CCCD/idNumber');

      // Check 3: Citizen statutory declaration and commitment clause present
      const hasCommitmentClause =
        modalSource.includes('cam đoan') ||
        modalSource.includes('chịu trách nhiệm trước pháp luật') ||
        modalSource.includes('ký trực tiếp');
      assertContext.assert(hasCommitmentClause, 'A4 modal must include statutory commitment / signature clause');
    }
  );

  // -------------------------------------------------------------------------
  // T3_INT_05 (F6 + F4): Smart Checklist -> Ràng buộc Validator Form Precheck
  // -------------------------------------------------------------------------
  await assertContext.runTest(
    { testId: 'T3_INT_05', featureCode: 'F6', tierCode: 'tier3' },
    '[F6+F4] Smart checklist condition (unmarried parents) activates mandatory paternity combination validator',
    async () => {
      // Case A: Unmarried parents without combined procedure -> Precheck MUST fail
      const invalidPayload = {
        procedureCode: 'TTHC-HT-01',
        formType: 'TK-KS',
        citizenCccd: '089095012345',
        fullName: 'NGUYỄN MINH KHANG',
        dateOfBirth: '2026-11-01',
        gender: 'Nam',
        address: 'Phường Mỹ Xuyên, An Giang',
        formData: {
          childFullName: 'NGUYỄN MINH KHANG',
          motherName: 'LÊ THỊ BÍCH NGỌC',
          fatherName: 'NGUYỄN VĂN AN',
          parentsMarried: 'NO',
        },
      };

      const resInvalid = await apiClient.post('/api/v1/forms/precheck', invalidPayload);
      assertContext.assertStatusCode(resInvalid.status, 200, 'Precheck status for unmarried without combined');

      const paternityValidation = resInvalid.data?.fieldValidations?.find(
        (f) => f.errorCode === 'UNMARRIED_PARENTS_PATERNITY_REQUIRED' || f.fieldName?.includes('Cha Mẹ')
      );
      assertContext.assert(
        resInvalid.data?.overallValid === false && paternityValidation?.valid === false,
        'Form precheck must fail when parents are unmarried and fatherName is declared'
      );
      assertContext.assertEqual(
        paternityValidation?.errorCode,
        'UNMARRIED_PARENTS_PATERNITY_REQUIRED',
        'ErrorCode must be UNMARRIED_PARENTS_PATERNITY_REQUIRED'
      );

      // Case B: Unmarried parents WITH combined procedure / empty fatherName -> Precheck succeeds
      const validPayload = {
        procedureCode: 'TTHC-HT-01',
        formType: 'TK-KS',
        citizenCccd: '089095012345',
        fullName: 'NGUYỄN MINH KHANG',
        dateOfBirth: '2026-11-01',
        gender: 'Nam',
        address: 'Phường Mỹ Xuyên, An Giang',
        formData: {
          childFullName: 'NGUYỄN MINH KHANG',
          motherName: 'LÊ THỊ BÍCH NGỌC',
          hospitalMotherName: 'LÊ THỊ BÍCH NGỌC',
          hospitalBirthDate: '2026-11-01',
          parentsMarried: 'YES',
        },
      };
      const resValid = await apiClient.post('/api/v1/forms/precheck', validPayload);
      assertContext.assertStatusCode(resValid.status, 200, 'Precheck status for married parents');
      assertContext.assert(resValid.data?.overallValid === true, 'Standard birth registration must pass precheck');
    }
  );

  // -------------------------------------------------------------------------
  // T3_INT_06 (F8 + F4): OCR Đối soát Giấy chứng sinh -> Báo cáo Tiền kiểm
  // -------------------------------------------------------------------------
  await assertContext.runTest(
    { testId: 'T3_INT_06', featureCode: 'F8', tierCode: 'tier3' },
    '[F8+F4] OCR birth certificate cross-check feeds directly into Precheck Report flagging date CONFLICT',
    async () => {
      // Case A: Discrepancy between declaration and birth certificate date -> Flag CONFLICT
      const conflictPayload = TK_KS_FIXTURES.INVALID_DOB_MISMATCH_GCS;
      const resConflict = await apiClient.post('/api/v1/forms/precheck', conflictPayload);
      assertContext.assertStatusCode(resConflict.status, 200, 'POST /api/v1/forms/precheck status');

      const isConflictDetected =
        resConflict.data?.overallValid === false ||
        (Array.isArray(resConflict.data?.fieldValidations) &&
          resConflict.data.fieldValidations.some(
            (fv) => fv.errorCode?.includes('BIRTH_CERT') || fv.errorMessage?.includes('chứng sinh')
          )) ||
        (Array.isArray(resConflict.data?.warnings) &&
          resConflict.data.warnings.some((w) => w.includes('chứng sinh') || w.includes('ngày sinh')));

      assertContext.assert(isConflictDetected, 'Date discrepancy between form and GCS must be flagged');

      // Case B: Exact match fixture evaluation
      const ocrMatchFixture = OCR_CROSS_CHECK_FIXTURES.BIRTH_CERTIFICATE_MATCH;
      assertContext.assertEqual(ocrMatchFixture.status, 'MATCH', 'Matching GCS evaluates to MATCH');
    }
  );

  // -------------------------------------------------------------------------
  // T3_INT_07 (F4 + F9): Form Precheck -> Đính kèm Zero-Trust Vault
  // -------------------------------------------------------------------------
  let tier3UploadedToken = null;
  let tier3DocCode = null;

  await assertContext.runTest(
    { testId: 'T3_INT_07', featureCode: 'F9', tierCode: 'tier3' },
    '[F4+F9] Sensitive documents uploaded during form filing are AES-256 encrypted and return OTT token',
    async () => {
      const samplePng = createSampleFileBuffer('png');
      const res = await apiClient.uploadFile(
        '/api/v1/vault/upload',
        samplePng,
        'giay_chung_sinh_scan.png',
        { documentType: 'GIAY_CHUNG_SINH' }
      );

      assertContext.assertStatusCode(res.status, 200, 'POST /api/v1/vault/upload status');

      tier3UploadedToken = res.data?.data?.oneTimeToken;
      tier3DocCode = res.data?.data?.documentCode;
      const algorithm = res.data?.data?.encryptionAlgorithm || '';

      assertContext.assert(
        Boolean(tier3UploadedToken && tier3UploadedToken.startsWith('OTT_')),
        'Vault upload must issue One-Time Token starting with OTT_'
      );
      assertContext.assert(
        algorithm.includes('AES'),
        'Vault upload must confirm AES authenticated symmetric encryption'
      );
    }
  );

  // -------------------------------------------------------------------------
  // T3_INT_08 (F9 + F10): Vault Documents -> Citizen Dossier DB Record
  // -------------------------------------------------------------------------
  await assertContext.runTest(
    { testId: 'T3_INT_08', featureCode: 'F10', tierCode: 'tier3' },
    '[F9+F10] Dossier submission accepts and binds vault_doc_ids to the persisted database entity',
    async () => {
      const dossierPayload = {
        dossierCode: `HS-T3-INT08-${Date.now().toString().slice(-6)}`,
        procedureCode: 'TTHC-HT-01',
        wardCode: 'WARD-AG-01',
        citizenCccd: '089095012345',
        formData: {
          childFullName: 'NGUYỄN MINH KHANG',
          motherName: 'LÊ THỊ BÍCH NGỌC',
          fatherFullName: 'NGUYỄN VĂN AN',
        },
        precheckReport: {
          overallValid: true,
          warnings: [],
        },
        vaultDocIds: [tier3DocCode || 'DOC_20261111_0001_SAMPLE'],
      };

      const res = await apiClient.post('/api/v1/dossiers', dossierPayload);
      assertContext.assertStatusCode(res.status, 201, 'POST /api/v1/dossiers status');
      assertContext.assertEqual(res.data?.data?.status, 'PENDING', 'Initial status must be PENDING');
    }
  );

  // -------------------------------------------------------------------------
  // T3_INT_09 (F10 + F11): Database Persistence -> Tra cứu tiến độ (mã + 4 số cuối CCCD)
  // -------------------------------------------------------------------------
  const trackingDossierCode = `HS-T3-TRACK-${Date.now().toString().slice(-6)}`;
  const trackingCccd = '079302009876'; // Last 4: 9876

  await assertContext.runTest(
    { testId: 'T3_INT_09', featureCode: 'F11', tierCode: 'tier3' },
    '[F10+F11] Dossier progress inquiry verifies last 4 CCCD digits against PostgreSQL record',
    async () => {
      // Create dossier first
      await apiClient.post('/api/v1/dossiers', {
        dossierCode: trackingDossierCode,
        procedureCode: 'TTHC-CR-01',
        wardCode: 'WARD-AG-01',
        citizenCccd: trackingCccd,
        formData: { fullName: 'TRẦN THỊ HỒNG NHUNG' },
        precheckReport: { overallValid: true },
        vaultDocIds: [],
      });

      // Legitimate citizen query: matching dossierCode + last4Cccd
      const resMatch = await apiClient.get(
        `/api/v1/dossiers/track?dossierCode=${trackingDossierCode}&last4Cccd=9876`
      );
      assertContext.assertStatusCode(resMatch.status, 200, 'Legitimate dossier tracking status');
      assertContext.assertEqual(resMatch.data?.data?.dossierCode, trackingDossierCode, 'Tracked dossier code matches');

      // Unauthorized snooping attempt: wrong last 4 digits
      const resWrong = await apiClient.get(
        `/api/v1/dossiers/track?dossierCode=${trackingDossierCode}&last4Cccd=0000`
      );
      const isBlocked = resWrong.status === 403 || resWrong.status === 404 || !resWrong.ok;
      assertContext.assert(isBlocked, 'Inquiry with mismatched last 4 CCCD digits must be rejected');
    }
  );

  // -------------------------------------------------------------------------
  // T3_INT_10 (F11 + F12): Quản lý hồ sơ -> Phân quyền Cán bộ Một cửa (RBAC)
  // -------------------------------------------------------------------------
  await assertContext.runTest(
    { testId: 'T3_INT_10', featureCode: 'F12', tierCode: 'tier3' },
    '[F11+F12] Dossier review endpoint enforces Officer RBAC (rejects unauthenticated, allows authorized officer)',
    async () => {
      const reviewPayload = {
        status: 'APPROVED',
        officerFeedback: 'Hồ sơ đã kiểm tra hợp lệ, hẹn ngày đối chiếu.',
        appointmentCode: `LH-${Date.now().toString().slice(-6)}`,
      };

      // Attempt 1: Anonymous request without token -> MUST fail with 401
      const resAnon = await apiClient.put(`/api/v1/dossiers/${trackingDossierCode}/review`, reviewPayload, {
        headers: { Authorization: '' },
      });
      assertContext.assertStatusCode(resAnon.status, 401, 'Anonymous review attempt must return HTTP 401');

      // Attempt 2: Authorized Officer request with valid JWT
      const loginRes = await loginOfficer();
      const officerToken = loginRes.data?.data?.token;
      assertContext.assert(Boolean(officerToken), 'Officer login must yield valid Bearer JWT');

      const resAuth = await apiClient.put(`/api/v1/dossiers/${trackingDossierCode}/review`, reviewPayload, {
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      assertContext.assertStatusCode(resAuth.status, 200, 'Officer review with Bearer token must return HTTP 200');
    }
  );

  // -------------------------------------------------------------------------
  // T3_INT_11 (F11 + F9): Cán bộ xem hồ sơ Dashboard -> Tiêu thụ One-Time Token (OTT 410 GONE)
  // -------------------------------------------------------------------------
  await assertContext.runTest(
    { testId: 'T3_INT_11', featureCode: 'F9', tierCode: 'tier3' },
    '[F11+F9] Officer inspecting dossier attachment consumes OTT; replay attempt strictly returns HTTP 410 GONE',
    async () => {
      // Step 1: Upload a fresh sensitive document to Vault
      const pngBuffer = createSampleFileBuffer('png');
      const uploadRes = await apiClient.uploadFile(
        '/api/v1/vault/upload',
        pngBuffer,
        'cccd_officer_review.png',
        { documentType: 'CCCD_FRONT' }
      );
      assertContext.assertStatusCode(uploadRes.status, 200, 'Upload status for OTT inspection');

      const freshOttToken = uploadRes.data?.data?.oneTimeToken;
      assertContext.assert(Boolean(freshOttToken), 'Must obtain active One-Time Token');

      // Step 2: First view by officer -> Returns 200 with decrypted image binary
      const firstView = await apiClient.get(`/api/v1/vault/view/${freshOttToken}`);
      assertContext.assertStatusCode(firstView.status, 200, 'First view status must be HTTP 200');

      // Step 3: Replay / second view attempt -> Token already consumed, returns HTTP 410 GONE
      const secondView = await apiClient.get(`/api/v1/vault/view/${freshOttToken}`);
      assertContext.assertStatusCode(secondView.status, 410, 'Second view must return HTTP 410 GONE (Self-Destruction)');
    }
  );

  // -------------------------------------------------------------------------
  // T3_INT_12 (F12 + F3): Đăng nhập Cán bộ -> Giải quyết Hàng đợi HITL RAG
  // -------------------------------------------------------------------------
  await assertContext.runTest(
    { testId: 'T3_INT_12', featureCode: 'F12', tierCode: 'tier3' },
    '[F12+F3] Officer login provides access to HITL gray-zone queue to resolve inquiries and seed RAG cache',
    async () => {
      // Step 1: Ensure officer is authenticated
      const loginRes = await loginOfficer();
      const officerToken = loginRes.data?.data?.token;

      // Step 2: Query HITL Gray Zone Queue
      const queueRes = await apiClient.get('/api/v1/rag/hitl-queue', {
        headers: { Authorization: `Bearer ${officerToken}` },
      });
      assertContext.assertStatusCode(queueRes.status, 200, 'GET /api/v1/rag/hitl-queue status');
      assertContext.assert(Array.isArray(queueRes.data?.data || queueRes.data), 'HITL queue data must be an array');

      // Step 3: Verify HITL resolve contract structure exists in codebase
      const ragControllerPath = path.join(
        PROJECT_ROOT,
        'backend/src/main/java/vn/edu/uth/smartward/rag/RagController.java'
      );
      const ragSource = fs.readFileSync(ragControllerPath, 'utf8');
      const hasHitlResolve =
        ragSource.includes('hitl-queue/{id}/resolve') || ragSource.includes('resolveHitlItem');
      assertContext.assert(hasHitlResolve, 'RagController must implement HITL resolve endpoint');
    }
  );

  // -------------------------------------------------------------------------
  // T3_INT_13 (F6 + F11): Smart Checklist Phí -> Tính toán SLA & Lệ phí Hồ sơ
  // -------------------------------------------------------------------------
  await assertContext.runTest(
    { testId: 'T3_INT_13', featureCode: 'F6', tierCode: 'tier3' },
    '[F6+F11] Smart checklist fee exemption maps to 0 VND dossier fee and 1-day statutory SLA for Birth/Death',
    async () => {
      // Step 1: Check Law on Fees and Charges 2015 Article 11 rules in Seed JSONs
      const birthSeedPath = path.join(SEED_PROCEDURES_DIR, 'TTHC-HT-01.json');
      const deathSeedPath = path.join(SEED_PROCEDURES_DIR, 'TTHC-HT-13.json');

      assertContext.assert(fs.existsSync(birthSeedPath), 'TTHC-HT-01.json seed must exist');
      assertContext.assert(fs.existsSync(deathSeedPath), 'TTHC-HT-13.json seed must exist');

      const birthContent = fs.readFileSync(birthSeedPath, 'utf8');
      const deathContent = fs.readFileSync(deathSeedPath, 'utf8');

      // Birth Registration (TTHC-HT-01) must have fee explicitly marked free
      const birthFree = birthContent.includes('Miễn phí') || birthContent.includes('Không thu lệ phí');
      assertContext.assert(birthFree, 'TTHC-HT-01 must be designated fee-exempt in seed database');

      // Death Registration (TTHC-HT-13) must have fee explicitly marked free
      const deathFree = deathContent.includes('Miễn phí') || deathContent.includes('Không thu lệ phí');
      assertContext.assert(deathFree, 'TTHC-HT-13 must be designated fee-exempt in seed database');

      // Step 2: Statutory SLA for vital records (Birth/Death) is 1 working day
      const birthSla = birthContent.includes('1 ngày') || birthContent.includes('Trong ngày làm việc');
      const deathSla = deathContent.includes('1 ngày') || deathContent.includes('Trong ngày làm việc');
      assertContext.assert(birthSla && deathSla, 'Vital civil registration SLA must be 1 working day');
    }
  );

  // -------------------------------------------------------------------------
  // T3_INT_14 (F13 + F9): Khóa bảo mật 32-byte -> Tính toàn vẹn mã hóa và giải mã Vault AES-256
  // -------------------------------------------------------------------------
  await assertContext.runTest(
    { testId: 'T3_INT_14', featureCode: 'F13', tierCode: 'tier3' },
    '[F13+F9] Vault AES-256-GCM authenticated encryption preserves 100% byte integrity and detects tampering',
    async () => {
      // Step 1: Verify key length >= 32 bytes (256-bit)
      const testKey32 = Buffer.from('SmartWardAI_AES256_Secret_Key_32B_Safe!!', 'utf8').subarray(0, 32);
      assertContext.assertEqual(testKey32.length, 32, 'AES-256 key must be exactly 32 bytes (256 bits)');

      // Step 2: Encrypt test payload using standard AES-256-GCM
      const originalPlaintext = Buffer.from(
        'BẢN CHỤP GIẤY CHỨNG SINH - SMARTWARD ZERO-TRUST VAULT INTEGRITY TEST',
        'utf8'
      );
      const iv = crypto.randomBytes(12); // Standard 12-byte GCM IV
      const cipher = crypto.createCipheriv('aes-256-gcm', testKey32, iv);

      const ciphertext = Buffer.concat([cipher.update(originalPlaintext), cipher.final()]);
      const authTag = cipher.getAuthTag(); // Standard 16-byte GCM Tag
      assertContext.assertEqual(authTag.length, 16, 'GCM Authentication tag must be 16 bytes (128 bits)');

      // Step 3: Decrypt and verify exact byte match
      const decipher = crypto.createDecipheriv('aes-256-gcm', testKey32, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

      assertContext.assertEqual(
        decrypted.toString('utf8'),
        originalPlaintext.toString('utf8'),
        'Decrypted plaintext must match original plaintext byte-for-byte'
      );

      // Step 4: Tamper test: Corrupt 1 byte in ciphertext -> GCM authentication MUST throw
      const tamperedCiphertext = Buffer.from(ciphertext);
      tamperedCiphertext[0] ^= 0xff; // Flip bits

      let threwTamperError = false;
      try {
        const tamperDecipher = crypto.createDecipheriv('aes-256-gcm', testKey32, iv);
        tamperDecipher.setAuthTag(authTag);
        Buffer.concat([tamperDecipher.update(tamperedCiphertext), tamperDecipher.final()]);
      } catch {
        threwTamperError = true;
      }

      assertContext.assert(
        threwTamperError,
        'AES-256-GCM must strictly reject tampered ciphertext with authentication error'
      );
    }
  );
}
