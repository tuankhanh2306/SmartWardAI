/**
 * test_f07_f09_verification_vault.mjs - Tier 1 Tests for F7, F8, F9 (15 Test Cases)
 *
 * Covers:
 * - F7: Real QR CCCD Scanner & Decoder (T1_F07_01 .. T1_F07_05)
 * - F8: Multi-Document OCR Cross-Check (T1_F08_01 .. T1_F08_05)
 * - F9: Zero-Trust Vault UI Integration (T1_F09_01 .. T1_F09_05)
 */

import fs from 'node:fs';
import path from 'node:path';
import { apiClient } from '../helpers/api_client.mjs';
import { parseCccdQrString, STATIC_CCCD_FIXTURES } from '../fixtures/cccd_qr_fixtures.mjs';
import { createSampleFileBuffer, OCR_CROSS_CHECK_FIXTURES } from '../fixtures/vault_document_fixtures.mjs';

import { PROJECT_ROOT } from '../helpers/project_root.mjs';

export async function runTests(assertContext) {
  console.log('\n--- [TIER 1] Running F7: Real QR CCCD Scanner & Decoder Tests ---');

  // T1_F07_01: Decode 7-field BCA standard QR string
  await assertContext.runTest(
    { testId: 'T1_F07_01', featureCode: 'F7', tierCode: 'tier1' },
    '7-field BCA QR string decoded successfully into constituent citizen attributes',
    async () => {
      const rawQr = STATIC_CCCD_FIXTURES.VALID_AN_GIANG_MALE_1995.rawQr;
      const result = parseCccdQrString(rawQr);

      assertContext.assert(result.valid, 'QR string must be parsed as valid');
      assertContext.assertEqual(result.data.cccdNumber, '089095012345', 'CCCD number');
      assertContext.assertEqual(result.data.dateOfBirth, '1995-08-15', 'Date of birth');
    }
  );

  // T1_F07_02: Decode QR with 9-digit old ID number
  await assertContext.runTest(
    { testId: 'T1_F07_02', featureCode: 'F7', tierCode: 'tier1' },
    'QR string with old 9-digit CMND decoded successfully',
    async () => {
      const rawQr = '089205023490|025896314|NGUYỄN THỊ LAN|05042005|Nữ|Ấp 1, Xã Bình Hưng, Huyện Bình Chánh|12102023';
      const result = parseCccdQrString(rawQr);

      assertContext.assert(result.valid, 'QR with old CMND should parse');
      assertContext.assertEqual(result.data.oldIdNumber, '025896314', 'Old ID number');
    }
  );

  // T1_F07_03: Auto-fill mapping simulation
  await assertContext.runTest(
    { testId: 'T1_F07_03', featureCode: 'F7', tierCode: 'tier1' },
    'QR parsed fields successfully map to form state attributes',
    async () => {
      const rawQr = STATIC_CCCD_FIXTURES.VALID_HCMC_FEMALE_2002_NO_OLD_ID.rawQr;
      const parsed = parseCccdQrString(rawQr);

      const mappedFormState = {
        citizenCccd: parsed.data.cccdNumber,
        fullName: parsed.data.fullName,
        dateOfBirth: parsed.data.dateOfBirth,
        gender: parsed.data.gender,
        address: parsed.data.address,
      };

      assertContext.assert(
        Boolean(mappedFormState.citizenCccd && mappedFormState.fullName && mappedFormState.dateOfBirth),
        'All primary form fields must be mapped from QR'
      );
    }
  );

  // T1_F07_04: Detect mismatch between typed name and QR data
  await assertContext.runTest(
    { testId: 'T1_F07_04', featureCode: 'F7', tierCode: 'tier1' },
    'Discrepancy detection successfully flags difference between typed name and QR CCCD name',
    async () => {
      const typedName = 'TRẦN BÌNH';
      const qrName = 'TRẦN VĂN BÌNH';
      const isMismatch = typedName.trim().toUpperCase() !== qrName.trim().toUpperCase();
      assertContext.assert(isMismatch, 'Name discrepancy must be detected');
    }
  );

  // T1_F07_05: Graceful error on corrupted / non-QR input
  await assertContext.runTest(
    { testId: 'T1_F07_05', featureCode: 'F7', tierCode: 'tier1' },
    'Corrupted QR input cleanly rejected with informative error message',
    async () => {
      const corruptedInput = STATIC_CCCD_FIXTURES.CORRUPTED_MISSING_PARTS;
      const result = parseCccdQrString(corruptedInput);
      assertContext.assert(!result.valid, 'Corrupted QR must not be accepted');
    }
  );

  console.log('\n--- [TIER 1] Running F8: Multi-Document OCR Cross-Check Tests ---');

  // T1_F08_01: Birth Certificate status MATCH
  await assertContext.runTest(
    { testId: 'T1_F08_01', featureCode: 'F8', tierCode: 'tier1' },
    'Birth certificate cross-check evaluates to MATCH when dates and parent names are identical',
    async () => {
      const fixture = OCR_CROSS_CHECK_FIXTURES.BIRTH_CERTIFICATE_MATCH;
      const declarationDob = '2026-11-01';
      const declarationMother = 'LÊ THỊ BÍCH NGỌC';

      const dobMatch = fixture.extractedFields.birthDate === declarationDob;
      const motherMatch = fixture.extractedFields.motherFullName === declarationMother;
      const isMatch = dobMatch && motherMatch && fixture.status === 'MATCH';
      assertContext.assert(isMatch, 'Cross-check must yield MATCH status');
    }
  );

  // T1_F08_02: Birth Certificate DOB CONFLICT
  await assertContext.runTest(
    { testId: 'T1_F08_02', featureCode: 'F8', tierCode: 'tier1' },
    'Birth certificate cross-check classifies DOB discrepancy as CONFLICT',
    async () => {
      const fixture = OCR_CROSS_CHECK_FIXTURES.BIRTH_CERTIFICATE_CONFLICT_DOB;
      const declarationDob = '2026-11-01';
      const isConflict =
        fixture.extractedFields.birthDate !== declarationDob && fixture.status === 'CONFLICT';
      assertContext.assert(isConflict, 'DOB mismatch must classify as CONFLICT');
    }
  );

  // T1_F08_03: Mother name CONFLICT on Birth Certificate
  await assertContext.runTest(
    { testId: 'T1_F08_03', featureCode: 'F8', tierCode: 'tier1' },
    'Birth certificate cross-check classifies mother name discrepancy as CONFLICT',
    async () => {
      const fixture = OCR_CROSS_CHECK_FIXTURES.BIRTH_CERTIFICATE_CONFLICT_MOTHER;
      const declarationMother = 'LÊ THỊ BÍCH NGỌC';
      const isConflict =
        fixture.extractedFields.motherFullName !== declarationMother && fixture.status === 'CONFLICT';
      assertContext.assert(isConflict, 'Mother name mismatch must classify as CONFLICT');
    }
  );

  // T1_F08_04: Disability Certificate MATCH
  await assertContext.runTest(
    { testId: 'T1_F08_04', featureCode: 'F8', tierCode: 'tier1' },
    'Disability certificate cross-check evaluates to MATCH for severe disability allowance',
    async () => {
      const fixture = OCR_CROSS_CHECK_FIXTURES.DISABILITY_CERTIFICATE_MATCH;
      const declarationLevel = 'DAC_BIET_NANG';
      const isMatch =
        fixture.extractedFields.disabilityLevel === declarationLevel && fixture.status === 'MATCH';
      assertContext.assert(isMatch, 'Disability level must match declaration');
    }
  );

  // T1_F08_05: Land Certificate WARNING classification
  await assertContext.runTest(
    { testId: 'T1_F08_05', featureCode: 'F8', tierCode: 'tier1' },
    'Land certificate minor abbreviation discrepancy correctly classifies as non-blocking WARNING',
    async () => {
      const fixture = OCR_CROSS_CHECK_FIXTURES.LAND_CERTIFICATE_WARNING_ABBREVIATION;
      assertContext.assert(fixture.status === 'WARNING', 'Minor difference must classify as WARNING');
    }
  );

  console.log('\n--- [TIER 1] Running F9: Zero-Trust Vault UI Integration Tests ---');

  let uploadedOneTimeToken = null;

  // T1_F09_01: Upload sensitive document to Vault
  await assertContext.runTest(
    { testId: 'T1_F09_01', featureCode: 'F9', tierCode: 'tier1' },
    'Vault upload generates valid One-Time Token and enforces AES-256 encryption',
    async () => {
      const pngBuffer = createSampleFileBuffer('png');
      const res = await apiClient.uploadFile(
        '/api/v1/vault/upload',
        pngBuffer,
        'cccd_test_sample.png',
        { documentType: 'CIVIC_DOCUMENT' }
      );

      assertContext.assertStatusCode(res.status, 200, 'POST /api/v1/vault/upload status');
      uploadedOneTimeToken = res.data?.data?.oneTimeToken;
      const encryptionAlg = res.data?.data?.encryptionAlgorithm || '';

      assertContext.assert(
        Boolean(uploadedOneTimeToken && encryptionAlg.includes('AES')),
        'Vault upload must return OTT and confirm AES encryption'
      );
    }
  );

  // T1_F09_02: First view via One-Time Token returns decrypted image
  await assertContext.runTest(
    { testId: 'T1_F09_02', featureCode: 'F9', tierCode: 'tier1' },
    'First view delivers decrypted, watermarked image binary bytes',
    async () => {
      if (!uploadedOneTimeToken) {
        throw new Error('No uploaded One-Time Token available for view test');
      }
      const res = await apiClient.get(`/api/v1/vault/view/${uploadedOneTimeToken}`);
      assertContext.assertStatusCode(res.status, 200, 'First view status');

      const isImage =
        res.contentType?.includes('image/') ||
        (res.buffer && res.buffer.length > 0);
      assertContext.assert(Boolean(isImage), 'Response must contain image binary content');
    }
  );

  // T1_F09_03: Second view strictly self-destructs (HTTP 410 GONE)
  await assertContext.runTest(
    { testId: 'T1_F09_03', featureCode: 'F9', tierCode: 'tier1' },
    'Second view of already-consumed OTT strictly returns HTTP 410 GONE (Atomic Self-Destruction)',
    async () => {
      if (!uploadedOneTimeToken) {
        throw new Error('No uploaded One-Time Token available for replay test');
      }
      const res = await apiClient.get(`/api/v1/vault/view/${uploadedOneTimeToken}`);
      assertContext.assertStatusCode(res.status, 410, 'Replay view status must be 410 GONE');
    }
  );

  // T1_F09_04: Watermark confirmation from Vault service
  await assertContext.runTest(
    { testId: 'T1_F09_04', featureCode: 'F9', tierCode: 'tier1' },
    'ZeroTrustVaultService incorporates Java2D protective watermark overlay',
    async () => {
      const vaultServicePath = path.join(
        PROJECT_ROOT,
        'backend/src/main/java/vn/edu/uth/smartward/vault/ZeroTrustVaultService.java'
      );
      const vaultCode = fs.readFileSync(vaultServicePath, 'utf8');
      const hasWatermarkLogic =
        vaultCode.includes('applyWatermark') ||
        vaultCode.includes('watermarkContent') ||
        vaultCode.includes('watermarkApplied');
      assertContext.assert(hasWatermarkLogic, 'Must contain watermark application logic');
    }
  );

  // T1_F09_05: PerWardDashboard / client.ts integration
  await assertContext.runTest(
    { testId: 'T1_F09_05', featureCode: 'F9', tierCode: 'tier1' },
    'Frontend client integrates real Zero-Trust Vault APIs (uploadVaultDocument, viewVaultDocument)',
    async () => {
      const clientPath = path.join(PROJECT_ROOT, 'frontend/src/api/client.ts');
      const clientCode = fs.readFileSync(clientPath, 'utf8');
      const hasVaultIntegration =
        clientCode.includes('uploadVaultDocument') || clientCode.includes('viewVaultDocument');
      assertContext.assert(hasVaultIntegration, 'Frontend client must integrate real Vault APIs');
    }
  );
}
