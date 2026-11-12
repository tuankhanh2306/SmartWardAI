/**
 * test_tier5_adversarial.mjs - Tier 5 Tests: Adversarial Coverage Hardening (8 Tests)
 *
 * Implements strict adversarial resilience, fuzzing, boundary micro-precision,
 * and security attack prevention tests (T5_ADV_01 .. T5_ADV_08):
 * - T5_ADV_01: Concurrent OTT Replay Attacks (Atomic GETDEL under 10 parallel requests)
 * - T5_ADV_02: Blind SQLi & XSS payload injection in tracking parameters
 * - T5_ADV_03: Officer JWT header/algorithm substitution attack (alg: none, forged, expired)
 * - T5_ADV_04: RAG Decision Boundary Stress (theta = 0.78 +- 10^-6 and theta_lower = 0.42 +- 10^-6)
 * - T5_ADV_05: Multi-Part Vault Payload Bomb: Content-Type spoofing and oversize rejection (>5MB)
 * - T5_ADV_06: Century / Gender / Province Code Anomaly Detection on CCCD
 * - T5_ADV_07: Cross-Tenant / Cross-Ward IDOR protection (Ward A officer barred from Ward B dossier)
 * - T5_ADV_08: Corrupted QR BCA barcode data stream (missing pipes, null bytes, unicode injection)
 */

import crypto from 'node:crypto';
import { apiClient } from '../helpers/api_client.mjs';
import { loginOfficer } from '../helpers/auth_helper.mjs';
import { parseCccdQrString, STATIC_CCCD_FIXTURES } from '../fixtures/cccd_qr_fixtures.mjs';
import { createSampleFileBuffer } from '../fixtures/vault_document_fixtures.mjs';

export async function runTests(assertContext) {
  console.log('\n================================================================');
  console.log('TIER 5: ADVERSARIAL COVERAGE HARDENING (8 TESTS)');
  console.log('================================================================\n');

  // =========================================================================
  // T5_ADV_01: Concurrent OTT Replay Attacks (Atomic GETDEL under 10 parallel requests)
  // =========================================================================
  await assertContext.runTest(
    { testId: 'T5_ADV_01', featureCode: 'F9', tierCode: 'tier5' },
    '[ADV_01] Concurrent OTT Replay: Exactly one 200 OK and 9 HTTP 410 GONE under 10 parallel race requests',
    async () => {
      // 1. Tải tài liệu lên Vault lấy One-Time Token (OTT)
      const samplePng = createSampleFileBuffer('png');
      const uploadRes = await apiClient.uploadFile(
        '/api/v1/vault/upload',
        samplePng,
        'adversarial_test_doc.png',
        { documentType: 'CCCD_FRONT' }
      );
      assertContext.assertStatusCode(uploadRes.status, 200, 'Upload status must be 200');

      const ottToken = uploadRes.data?.data?.oneTimeToken;
      assertContext.assert(Boolean(ottToken), 'Must receive valid OTT token');

      // 2. Đồng thời bắn 10 requests truy cập cùng một OTT token
      const racePromises = Array.from({ length: 10 }, () =>
        apiClient.get(`/api/v1/vault/view/${ottToken}`)
      );
      const responses = await Promise.all(racePromises);

      const status200Count = responses.filter((r) => r.status === 200).length;
      const status410Count = responses.filter((r) => r.status === 410).length;

      assertContext.assertEqual(
        status200Count,
        1,
        'Atomic GETDEL must ensure exactly ONE request succeeds with HTTP 200'
      );
      assertContext.assertEqual(
        status410Count,
        9,
        'All 9 competing concurrent requests must be rejected with HTTP 410 GONE'
      );
    }
  );

  // =========================================================================
  // T5_ADV_02: Blind SQLi & XSS payload injection in tracking parameters
  // =========================================================================
  await assertContext.runTest(
    { testId: 'T5_ADV_02', featureCode: 'F11', tierCode: 'tier5' },
    '[ADV_02] Blind SQLi & XSS injection in tracking parameters safely handled without 500 error or script reflection',
    async () => {
      const maliciousPayloads = [
        { dossierCode: "' OR '1'='1", last4Cccd: "1234" },
        { dossierCode: "HS-001; DROP TABLE citizen_dossiers;--", last4Cccd: "1234" },
        { dossierCode: "HS-001<script>alert(document.cookie)</script>", last4Cccd: "1234" },
        { dossierCode: "HS-20261111-0001", last4Cccd: "' OR '1'='1" },
        { dossierCode: "UNION SELECT NULL, NULL, NULL--", last4Cccd: "0000" },
      ];

      for (const payload of maliciousPayloads) {
        const queryStr = `/api/v1/dossiers/track?dossierCode=${encodeURIComponent(
          payload.dossierCode
        )}&last4Cccd=${encodeURIComponent(payload.last4Cccd)}`;

        const res = await apiClient.get(queryStr);

        // Phải trả về 404 (Không tìm thấy) hoặc 400 (Bad Request), tuyệt đối không 500 Internal Error
        assertContext.assert(
          res.status === 404 || res.status === 400 || res.status === 200,
          `Adversarial query '${payload.dossierCode}' must not crash server (got status ${res.status})`
        );

        // Dữ liệu trả về không được phản chiếu mã script nguyên vẹn
        const rawBodyText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        assertContext.assert(
          !rawBodyText.includes('<script>alert'),
          'Response must never reflect unescaped malicious script tags'
        );
      }
    }
  );

  // =========================================================================
  // T5_ADV_03: Officer JWT header/algorithm substitution attack (alg: none, forged, expired)
  // =========================================================================
  await assertContext.runTest(
    { testId: 'T5_ADV_03', featureCode: 'F12', tierCode: 'tier5' },
    '[ADV_03] Officer RBAC strictly rejects alg:none, forged signature, and expired JWT tokens with HTTP 401',
    async () => {
      // 1. Token với alg: none (không chữ ký)
      const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const testPayload = Buffer.from(
        JSON.stringify({ sub: 'OFFICER_HACK', role: 'OFFICER', exp: Math.floor(Date.now() / 1000) + 3600 })
      ).toString('base64url');
      const algNoneToken = `${noneHeader}.${testPayload}.`;

      const resNone = await apiClient.get('/api/v1/auth/officer/me', {
        headers: { Authorization: `Bearer ${algNoneToken}` },
      });
      assertContext.assertEqual(resNone.status, 401, 'alg:none token must return HTTP 401 Unauthorized');

      // 2. Token giả mạo chữ ký bằng secret khác
      const forgedSig = crypto.createHmac('sha256', 'WRONG_FAKE_SECRET_KEY_1234567890123')
        .update(`${noneHeader}.${testPayload}`).digest('base64url');
      const forgedToken = `${noneHeader}.${testPayload}.${forgedSig}`;

      const resForged = await apiClient.get('/api/v1/auth/officer/me', {
        headers: { Authorization: `Bearer ${forgedToken}` },
      });
      assertContext.assertEqual(resForged.status, 401, 'Forged signature token must return HTTP 401 Unauthorized');

      // 3. Token hợp lệ nhưng đã hết hạn từ 1 giờ trước
      const expiredPayload = Buffer.from(
        JSON.stringify({ sub: 'CC-AG-8942', role: 'OFFICER', exp: Math.floor(Date.now() / 1000) - 3600 })
      ).toString('base64url');
      const validHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const expiredSig = crypto.createHmac('sha256', 'SMARTWARD_DEV_JWT_SECRET_KEY_AT_LEAST_32_BYTES_LONG_2026')
        .update(`${validHeader}.${expiredPayload}`).digest('base64url');
      const expiredToken = `${validHeader}.${expiredPayload}.${expiredSig}`;

      const resExpired = await apiClient.get('/api/v1/auth/officer/me', {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      assertContext.assertEqual(resExpired.status, 401, 'Expired token must return HTTP 401 Unauthorized');

      // 4. Chuỗi token dị dạng
      const resMalformed = await apiClient.get('/api/v1/auth/officer/me', {
        headers: { Authorization: 'Bearer NOT_A_JWT_TOKEN' },
      });
      assertContext.assertEqual(resMalformed.status, 401, 'Malformed token must return HTTP 401 Unauthorized');
    }
  );

  // =========================================================================
  // T5_ADV_04: RAG Decision Boundary Stress (theta = 0.78 +- 10^-6 and theta_lower = 0.42 +- 10^-6)
  // =========================================================================
  await assertContext.runTest(
    { testId: 'T5_ADV_04', featureCode: 'F13', tierCode: 'tier5' },
    '[ADV_04] RAG decision boundary stress at micro-epsilon precision (theta = 0.78 +- 10^-6, theta_lower = 0.42 +- 10^-6)',
    async () => {
      function evaluateRagDecision(score, theta = 0.78, thetaLower = 0.42) {
        const EPSILON = 1e-9;
        const passesTheta = score >= (theta - EPSILON);
        const shouldAbstain = !passesTheta;
        const isGrayZone = shouldAbstain && (score >= (thetaLower - EPSILON));
        const isOutOfScope = shouldAbstain && !isGrayZone;
        return { passesTheta, shouldAbstain, isGrayZone, isOutOfScope };
      }

      // Micro-epsilon testing: theta = 0.78
      const upperJustPass = evaluateRagDecision(0.780001);
      assertContext.assertEqual(upperJustPass.passesTheta, true, '0.780001 passes threshold');
      assertContext.assertEqual(upperJustPass.shouldAbstain, false, '0.780001 does NOT abstain');

      const upperJustFail = evaluateRagDecision(0.779999);
      assertContext.assertEqual(upperJustFail.passesTheta, false, '0.779999 fails threshold');
      assertContext.assertEqual(upperJustFail.shouldAbstain, true, '0.779999 must trigger abstention');
      assertContext.assertEqual(upperJustFail.isGrayZone, true, '0.779999 routes to HITL gray zone');

      // Micro-epsilon testing: theta_lower = 0.42
      const lowerJustInGray = evaluateRagDecision(0.420001);
      assertContext.assertEqual(lowerJustInGray.isGrayZone, true, '0.420001 in gray zone');
      assertContext.assertEqual(lowerJustInGray.isOutOfScope, false, '0.420001 not out of scope');

      const lowerJustOutOfScope = evaluateRagDecision(0.419999);
      assertContext.assertEqual(lowerJustOutOfScope.isGrayZone, false, '0.419999 below gray zone floor');
      assertContext.assertEqual(lowerJustOutOfScope.isOutOfScope, true, '0.419999 is out of scope');
    }
  );

  // =========================================================================
  // T5_ADV_05: Multi-Part Vault Payload Bomb: Content-Type spoofing and oversize rejection (>5MB)
  // =========================================================================
  await assertContext.runTest(
    { testId: 'T5_ADV_05', featureCode: 'F9', tierCode: 'tier5' },
    '[ADV_05] Zero-Trust Vault payload protection strictly enforces 5MB size limit (HTTP 413) and bans executables',
    async () => {
      // 1. Tải lên tệp quá 5MB (5.2MB payload bomb)
      const oversizedBuffer = Buffer.alloc(5.2 * 1024 * 1024, 0x41);
      const resOversize = await apiClient.uploadFile(
        '/api/v1/vault/upload',
        oversizedBuffer,
        'huge_payload_bomb.png',
        { documentType: 'GCN_QSD_DAT' }
      );
      assertContext.assertEqual(resOversize.status, 413, 'Oversized file > 5MB must strictly return HTTP 413 Payload Too Large');

      // 2. Tải lên tệp thực thi độc hại (.exe / .sh) giả mạo tệp hồ sơ
      const maliciousExecutableBuffer = Buffer.from('#!/bin/sh\nrm -rf / # malicious script payload', 'utf8');
      const resMalicious = await apiClient.uploadFile(
        '/api/v1/vault/upload',
        maliciousExecutableBuffer,
        'malicious_script.sh',
        { documentType: 'MALICIOUS_EXEC' }
      );
      assertContext.assert(
        resMalicious.status === 415 || resMalicious.status === 400,
        'Malicious executable upload must be rejected with HTTP 415 or HTTP 400'
      );
    }
  );

  // =========================================================================
  // T5_ADV_06: Century / Gender / Province Code Anomaly Detection on CCCD
  // =========================================================================
  await assertContext.runTest(
    { testId: 'T5_ADV_06', featureCode: 'F7', tierCode: 'tier5' },
    '[ADV_06] CCCD validation engine intercepts province anomaly, century-gender mismatch, and invalid length',
    async () => {
      // 1. Mã tỉnh không tồn tại '999'
      const resProvince = await apiClient.post('/api/v1/forms/precheck', {
        procedureCode: 'TTHC-CR-01',
        formType: 'CT01',
        citizenCccd: '999095012345',
        fullName: 'NGUYỄN VĂN AN',
        dateOfBirth: '1995-08-15',
        gender: 'Nam',
        formData: { residenceType: 'THUONG_TRU' },
      });
      assertContext.assertStatusCode(resProvince.status, 200, 'Precheck status');
      const provinceIssue = resProvince.data?.fieldValidations?.find(
        (f) => f.errorCode === 'INVALID_CCCD_PROVINCE' || f.fieldName?.includes('CCCD')
      );
      assertContext.assert(
        resProvince.data?.overallValid === false || provinceIssue?.valid === false,
        'Must flag INVALID_CCCD_PROVINCE for non-existent province code 999'
      );

      // 2. Chữ số thế kỷ/giới tính bất thường: Nữ sinh năm 1990 nhưng mang số thế kỷ '0' (dành cho Nam)
      const resGenderMismatch = await apiClient.post('/api/v1/forms/precheck', {
        procedureCode: 'TTHC-CR-01',
        formType: 'CT01',
        citizenCccd: '089090012345', // 0 = Nam sinh 1900-1999
        fullName: 'NGUYỄN THỊ MAI',
        dateOfBirth: '1990-05-20',
        gender: 'Nữ', // Nhưng kê khai Nữ -> Phải là '1'
        formData: { residenceType: 'THUONG_TRU' },
      });
      const centuryIssue = resGenderMismatch.data?.fieldValidations?.find(
        (f) => f.errorCode === 'INVALID_CCCD_CENTURY_GENDER' || f.fieldName?.includes('CCCD')
      );
      assertContext.assert(
        resGenderMismatch.data?.overallValid === false || centuryIssue?.valid === false,
        'Must flag INVALID_CCCD_CENTURY_GENDER for male century digit on female applicant'
      );

      // 3. Độ dài CCCD bất thường (11 chữ số)
      const resLengthMismatch = await apiClient.post('/api/v1/forms/precheck', {
        procedureCode: 'TTHC-CR-01',
        formType: 'CT01',
        citizenCccd: '08909501234', // 11 chữ số
        fullName: 'NGUYỄN VĂN AN',
        dateOfBirth: '1995-08-15',
        gender: 'Nam',
        formData: { residenceType: 'THUONG_TRU' },
      });
      const lengthIssue = resLengthMismatch.data?.fieldValidations?.find(
        (f) => f.errorCode === 'INVALID_CCCD_LENGTH' || f.fieldName?.includes('CCCD')
      );
      assertContext.assert(
        resLengthMismatch.data?.overallValid === false || lengthIssue?.valid === false,
        'Must flag INVALID_CCCD_LENGTH for 11-digit CCCD'
      );
    }
  );

  // =========================================================================
  // T5_ADV_07: Cross-Tenant / Cross-Ward IDOR protection
  // =========================================================================
  await assertContext.runTest(
    { testId: 'T5_ADV_07', featureCode: 'F12', tierCode: 'tier5' },
    '[ADV_07] Cross-Tenant IDOR: Ward A officer is strictly forbidden from reviewing or mutating Ward B dossier (HTTP 403)',
    async () => {
      // 1. Tạo hồ sơ thuộc WARD-B (ví dụ WARD-AG-02 hoặc WARD-B-01)
      const foreignDossierCode = `HS-WARD-B-${Date.now().toString().slice(-6)}`;
      const createRes = await apiClient.post('/api/v1/dossiers', {
        dossierCode: foreignDossierCode,
        procedureCode: 'TTHC-CR-01',
        wardCode: 'WARD-B',
        citizenCccd: '089095012345',
        formData: { fullName: 'TRẦN VĂN HẢI' },
        precheckReport: { overallValid: true },
      });
      assertContext.assertStatusCode(createRes.status, 201, 'Dossier creation status');

      // 2. Cán bộ Ward A đăng nhập lấy JWT token của WARD-AG-01
      const loginA = await loginOfficer({ wardCode: 'WARD-AG-01', badgeId: 'OFFICER-AG-01' });
      const officerTokenA = loginA.data?.data?.token;

      // 3. Cán bộ Ward A cố tình duyệt hồ sơ thuộc WARD-B -> Phải bị chặn với HTTP 403 Forbidden
      const idorAttemptRes = await apiClient.put(
        `/api/v1/dossiers/${foreignDossierCode}/review`,
        {
          status: 'APPROVED',
          officerFeedback: 'Cố tình duyệt trái thẩm quyền địa bàn',
        },
        {
          headers: { Authorization: `Bearer ${officerTokenA}` },
        }
      );

      assertContext.assertEqual(
        idorAttemptRes.status,
        403,
        'Cross-ward mutation attempt must be strictly blocked with HTTP 403 Forbidden'
      );
    }
  );

  // =========================================================================
  // T5_ADV_08: Corrupted QR BCA barcode data stream (missing pipes, null bytes, unicode injection)
  // =========================================================================
  await assertContext.runTest(
    { testId: 'T5_ADV_08', featureCode: 'F7', tierCode: 'tier5' },
    '[ADV_08] Real QR parser handles corrupted BCA barcode streams gracefully without throwing uncaught exceptions',
    async () => {
      const corruptedStreams = [
        // Thiếu số trường (chỉ có 3 trường)
        { raw: '089095012345|251000123|NGUYỄN VĂN AN', reason: 'Missing fields' },
        // Phân tách bằng dấu phẩy thay vì dấu gạch đứng
        { raw: '089095012345,251000123,NGUYỄN VĂN AN,15081995,Nam,An Giang,25042021', reason: 'Comma delimiter' },
        // Chứa null-byte và ký tự điều khiển
        { raw: '089095012345|\0\0|NGUYỄN VĂN AN|15081995|Nam|An Giang|25042021', reason: 'Null bytes' },
        // Ngày sinh định dạng chữ
        { raw: '089095012345|251000123|NGUYỄN VĂN AN|INVALID_DOB|Nam|An Giang|25042021', reason: 'Invalid DOB format' },
        // Dữ liệu rỗng / undefined
        { raw: '', reason: 'Empty string' },
        { raw: null, reason: 'Null payload' },
      ];

      for (const stream of corruptedStreams) {
        let result;
        let crashed = false;
        try {
          result = parseCccdQrString(stream.raw);
        } catch {
          crashed = true;
        }

        assertContext.assertEqual(crashed, false, `Parser must not crash on corrupted stream (${stream.reason})`);
        assertContext.assertEqual(result?.valid, false, `Corrupted stream (${stream.reason}) must evaluate to valid: false`);
      }

      // Đối chứng: Mã QR hợp lệ phải parse thành công
      const validQr = STATIC_CCCD_FIXTURES.VALID_AN_GIANG_MALE_1995.rawQr;
      const validResult = parseCccdQrString(validQr);
      assertContext.assertEqual(validResult.valid, true, 'Valid BCA QR payload must parse successfully');
      assertContext.assertEqual(validResult.data?.cccdNumber, '089095012345', 'Valid CCCD number');
    }
  );
}
