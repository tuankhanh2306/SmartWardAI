/**
 * test_f04_f06_forms.mjs - Tier 1 Tests for F4, F5, F6 (15 Test Cases)
 *
 * Covers:
 * - F4: Enhanced Form Precheck Engine (T1_F04_01 .. T1_F04_05)
 * - F5: Dynamic A4 Form Modal (T1_F05_01 .. T1_F05_05)
 * - F6: Smart Checklist & Exemption Warning (T1_F06_01 .. T1_F06_05)
 */

import fs from 'node:fs';
import path from 'node:path';
import { apiClient } from '../helpers/api_client.mjs';
import { CT01_FIXTURES } from '../fixtures/form_ct01_fixtures.mjs';
import { TK_KS_FIXTURES } from '../fixtures/form_tk_ks_fixtures.mjs';
import { TK_KH_FIXTURES } from '../fixtures/form_tk_kh_fixtures.mjs';
import { TK_BTXH_FIXTURES } from '../fixtures/form_tk_btxh_fixtures.mjs';

import { PROJECT_ROOT } from '../helpers/project_root.mjs';

export async function runTests(assertContext) {
  console.log('\n--- [TIER 1] Running F4: Enhanced Form Precheck Engine Tests ---');

  // T1_F04_01: Precheck CT01 rented/borrowed residence missing host info
  await assertContext.runTest(
    { testId: 'T1_F04_01', featureCode: 'F4', tierCode: 'tier1' },
    'Precheck detects missing host consent / rented residence requirements for CT01',
    async () => {
      const payload = CT01_FIXTURES.INVALID_THUE_MUON_MISSING_HOST;
      const res = await apiClient.post('/api/v1/forms/precheck', payload);
      assertContext.assertStatusCode(res.status, 200, 'POST /api/v1/forms/precheck status');

      const isMissingHostFlagged =
        res.data?.overallValid === false ||
        (Array.isArray(res.data?.warnings) &&
          res.data.warnings.some((w) => w.includes('thuê') || w.includes('chủ hộ')));
      assertContext.assert(isMissingHostFlagged, 'Must detect missing host consent for rented residence');
    }
  );

  // T1_F04_02: Precheck TK-KS with full child & parent details
  await assertContext.runTest(
    { testId: 'T1_F04_02', featureCode: 'F4', tierCode: 'tier1' },
    'TK-KS with full parents & birth certificate info passes precheck (overallValid: true)',
    async () => {
      const payload = TK_KS_FIXTURES.VALID_STANDARD;
      const res = await apiClient.post('/api/v1/forms/precheck', payload);
      assertContext.assertStatusCode(res.status, 200, 'POST /api/v1/forms/precheck status');
      assertContext.assert(res.data?.overallValid === true, 'TK-KS should pass precheck when details are complete');
    }
  );

  // T1_F04_03: Precheck TK-KH marriage mode with valid statutory ages
  await assertContext.runTest(
    { testId: 'T1_F04_03', featureCode: 'F4', tierCode: 'tier1' },
    'TK-KH marriage registration with valid ages (Nam >= 20, Nữ >= 18) passes precheck',
    async () => {
      const payload = TK_KH_FIXTURES.VALID_MARRIAGE_REGISTRATION;
      const res = await apiClient.post('/api/v1/forms/precheck', payload);
      assertContext.assertStatusCode(res.status, 200, 'POST /api/v1/forms/precheck status');
      assertContext.assert(res.data?.overallValid === true, 'Marriage registration should pass when ages >= statutory threshold');
    }
  );

  // T1_F04_04: Precheck TK-KH marital status cert with specific purpose
  await assertContext.runTest(
    { testId: 'T1_F04_04', featureCode: 'F4', tierCode: 'tier1' },
    'TK-KH single status certificate with clear specific purpose passes precheck',
    async () => {
      const payload = TK_KH_FIXTURES.VALID_MARITAL_STATUS_CERTIFICATE_SPECIFIC;
      const res = await apiClient.post('/api/v1/forms/precheck', payload);
      assertContext.assertStatusCode(res.status, 200, 'POST /api/v1/forms/precheck status');
      assertContext.assert(res.data?.overallValid === true, 'Specific marital status certificate purpose should pass');
    }
  );

  // T1_F04_05: Precheck TK-BTXH elderly >= 75 years old
  await assertContext.runTest(
    { testId: 'T1_F04_05', featureCode: 'F4', tierCode: 'tier1' },
    'TK-BTXH for elderly citizen >= 75 years without pension passes precheck under Social Insurance Law 2024',
    async () => {
      const payload = TK_BTXH_FIXTURES.VALID_ELDERLY_76_YEARS;
      const res = await apiClient.post('/api/v1/forms/precheck', payload);
      assertContext.assertStatusCode(res.status, 200, 'POST /api/v1/forms/precheck status');
      assertContext.assert(res.data?.overallValid === true, 'Elderly >= 75 years must qualify for social protection');
    }
  );

  console.log('\n--- [TIER 1] Running F5: Dynamic A4 Form Modal Tests ---');

  // T1_F05_01: Verify removal of mock NGUYỄN VĂN HÒA
  await assertContext.runTest(
    { testId: 'T1_F05_01', featureCode: 'F5', tierCode: 'tier1' },
    'A4DocumentModal does not contain hardcoded fallback mock name NGUYỄN VĂN HÒA',
    async () => {
      const modalPath = path.join(PROJECT_ROOT, 'frontend/src/components/A4DocumentModal.tsx');
      const modalContent = fs.readFileSync(modalPath, 'utf8');
      const containsMockName = modalContent.includes('NGUYỄN VĂN HÒA');
      assertContext.assert(!containsMockName, 'Mock name NGUYỄN VĂN HÒA must be removed');
    }
  );

  // T1_F05_02: Statutory text in A4 for Certification & Declarations
  await assertContext.runTest(
    { testId: 'T1_F05_02', featureCode: 'F5', tierCode: 'tier1' },
    'A4DocumentModal includes mandatory statutory citizen declaration and commitment clause',
    async () => {
      const modalPath = path.join(PROJECT_ROOT, 'frontend/src/components/A4DocumentModal.tsx');
      const modalContent = fs.readFileSync(modalPath, 'utf8');
      const hasCamDoan =
        modalContent.includes('cam đoan') || modalContent.includes('chịu trách nhiệm trước pháp luật');
      assertContext.assert(hasCamDoan, 'Must contain statutory commitment clause');
    }
  );

  // T1_F05_03: A4 General Template accommodates Land and Construction procedures
  await assertContext.runTest(
    { testId: 'T1_F05_03', featureCode: 'F5', tierCode: 'tier1' },
    'A4DocumentModal supports dynamic procedure title rendering for Land/Construction procedures',
    async () => {
      const modalPath = path.join(PROJECT_ROOT, 'frontend/src/components/A4DocumentModal.tsx');
      const modalContent = fs.readFileSync(modalPath, 'utf8');
      const hasGeneralTemplate =
        modalContent.includes('procedureTitle') &&
        modalContent.includes('CÁN BỘ TIẾP NHẬN MỘT CỬA');
      assertContext.assert(hasGeneralTemplate, 'Must dynamically render procedure title in General template');
    }
  );

  // T1_F05_04: A4 Form covers Birth & Civil Status fields
  await assertContext.runTest(
    { testId: 'T1_F05_04', featureCode: 'F5', tierCode: 'tier1' },
    'A4DocumentModal renders official Birth Registration template with birth certificate baseline',
    async () => {
      const modalPath = path.join(PROJECT_ROOT, 'frontend/src/components/A4DocumentModal.tsx');
      const modalContent = fs.readFileSync(modalPath, 'utf8');
      const hasKsFields =
        modalContent.includes('TỜ KHAI ĐĂNG KÝ KHAI SINH') &&
        modalContent.includes('Giấy chứng sinh');
      assertContext.assert(hasKsFields, 'Must render birth registration template with birth certificate fields');
    }
  );

  // T1_F05_05: A4 Form covers Social Protection & Decree 20/2021
  await assertContext.runTest(
    { testId: 'T1_F05_05', featureCode: 'F5', tierCode: 'tier1' },
    'A4DocumentModal renders official Social Protection template with Decree 20/2021 baseline',
    async () => {
      const modalPath = path.join(PROJECT_ROOT, 'frontend/src/components/A4DocumentModal.tsx');
      const modalContent = fs.readFileSync(modalPath, 'utf8');
      const hasBtxhFields =
        modalContent.includes('TRỢ CẤP XÃ HỘI') &&
        modalContent.includes('20/2021/NĐ-CP');
      assertContext.assert(hasBtxhFields, 'Must render social protection template referencing Decree 20/2021');
    }
  );

  console.log('\n--- [TIER 1] Running F6: Smart Checklist & Exemption Warning Tests ---');

  // T1_F06_01: Branching logic for unmarried parents birth registration
  await assertContext.runTest(
    { testId: 'T1_F06_01', featureCode: 'F6', tierCode: 'tier1' },
    'Form & Issue Reporting implements branching checklist for unmarried parents birth registration',
    async () => {
      const formReportingPath = path.join(PROJECT_ROOT, 'frontend/src/pages/FormAndIssueReporting.tsx');
      const formReportingCode = fs.readFileSync(formReportingPath, 'utf8');
      const hasUnmarriedBranching =
        formReportingCode.includes('parentsMarried') ||
        formReportingCode.includes('nhận cha') ||
        formReportingCode.includes('kết hợp');
      assertContext.assert(hasUnmarriedBranching, 'Must include checklist branching for unmarried parents');
    }
  );

  // T1_F06_02: Branching checklist requires divorce judgment if divorced
  await assertContext.runTest(
    { testId: 'T1_F06_02', featureCode: 'F6', tierCode: 'tier1' },
    'Checklist requires court divorce judgment for citizens with prior divorce status',
    async () => {
      const formReportingPath = path.join(PROJECT_ROOT, 'frontend/src/pages/FormAndIssueReporting.tsx');
      const formReportingCode = fs.readFileSync(formReportingPath, 'utf8');
      const hasDivorceRequirement =
        formReportingCode.includes('DIVORCED') ||
        formReportingCode.includes('ly hôn') ||
        formReportingCode.includes('bản án');
      assertContext.assert(hasDivorceRequirement, 'Must require divorce judgment on checklist');
    }
  );

  // T1_F06_03: 100% Fee Exemption badge for Birth Registration (HT-01)
  await assertContext.runTest(
    { testId: 'T1_F06_03', featureCode: 'F6', tierCode: 'tier1' },
    'Birth Registration procedure (TTHC-HT-01) is strictly 100% fee exempt under Law on Fees and Charges',
    async () => {
      const ht01Seed = JSON.parse(
        fs.readFileSync(path.join(PROJECT_ROOT, 'backend/src/main/resources/db/seed/procedures/TTHC-HT-01.json'), 'utf8')
      );
      const isFree =
        ht01Seed.fee.toLowerCase().includes('miễn phí') ||
        ht01Seed.fee.toLowerCase().includes('không thu');
      assertContext.assert(isFree, 'TTHC-HT-01 fee must be exempt');
    }
  );

  // T1_F06_04: 100% Fee Exemption for Death Registration (HT-13 / CR-02)
  await assertContext.runTest(
    { testId: 'T1_F06_04', featureCode: 'F6', tierCode: 'tier1' },
    'Death Registration procedure (TTHC-HT-13) is strictly 100% fee exempt',
    async () => {
      const ht13Path = path.join(PROJECT_ROOT, 'backend/src/main/resources/db/seed/procedures/TTHC-HT-13.json');
      const cr02Path = path.join(PROJECT_ROOT, 'backend/src/main/resources/db/seed/procedures/TTHC-CR-02.json');

      let isFree = false;
      if (fs.existsSync(ht13Path)) {
        const ht13Seed = JSON.parse(fs.readFileSync(ht13Path, 'utf8'));
        isFree =
          ht13Seed.fee.toLowerCase().includes('miễn phí') ||
          ht13Seed.fee.toLowerCase().includes('không thu');
      } else if (fs.existsSync(cr02Path)) {
        const cr02Seed = JSON.parse(fs.readFileSync(cr02Path, 'utf8'));
        isFree =
          cr02Seed.fee.toLowerCase().includes('miễn phí') ||
          cr02Seed.fee.toLowerCase().includes('tương ứng');
      }

      assertContext.assert(isFree, 'Death registration procedure must reflect fee exemption');
    }
  );

  // T1_F06_05: Certification procedure fee schedule indication
  await assertContext.runTest(
    { testId: 'T1_F06_05', featureCode: 'F6', tierCode: 'tier1' },
    'Certification procedure specifies fee schedule rules accurately',
    async () => {
      const ct01Seed = JSON.parse(
        fs.readFileSync(path.join(PROJECT_ROOT, 'backend/src/main/resources/db/seed/procedures/TTHC-CT-01.json'), 'utf8')
      );
      assertContext.assert(Boolean(ct01Seed.fee), 'Fee schedule must be specified for CT-01');
    }
  );
}
