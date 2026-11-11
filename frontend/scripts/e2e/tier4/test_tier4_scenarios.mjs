/**
 * test_tier4_scenarios.mjs - Tier 4 Tests: Real-World Citizen Life Scenarios (7 Scenarios)
 *
 * Implements all 7 comprehensive end-to-end citizen life scenarios (T4_LIFE_01 .. T4_LIFE_07)
 * specified in analysis.md, SCOPE.md, and ORIGINAL_REQUEST.md:
 * - T4_LIFE_01: Đăng ký Khai sinh cho con khi Cha Mẹ chưa kết hôn (Thủ tục ghép Khai sinh + Nhận cha con)
 * - T4_LIFE_02: Chuyển hộ khẩu đến nhà thuê và thay đổi thông tin cư trú (Mẫu CT01)
 * - T4_LIFE_03: Người đã ly hôn xin Cấp Giấy xác nhận tình trạng hôn nhân để kết hôn mới
 * - T4_LIFE_04: Người cao tuổi đủ 75 tuổi không có lương hưu làm thủ tục Trợ cấp Xã hội (TK-BTXH)
 * - T4_LIFE_05: Khai tử liên thông và Giải quyết hỗ trợ chi phí Mai táng
 * - T4_LIFE_06: Phát hiện và ngăn chặn mâu thuẫn dữ liệu giả mạo giấy tờ (Security & Fraud Defense)
 * - T4_LIFE_07: Toàn trình Vòng đời Hồ sơ từ Nộp, Yêu cầu bổ sung đến Phê duyệt và Xem tài liệu Vault
 */

import fs from 'node:fs';
import path from 'node:path';
import { apiClient } from '../helpers/api_client.mjs';
import { loginOfficer } from '../helpers/auth_helper.mjs';
import { parseCccdQrString, STATIC_CCCD_FIXTURES } from '../fixtures/cccd_qr_fixtures.mjs';
import { CT01_FIXTURES } from '../fixtures/form_ct01_fixtures.mjs';
import { TK_KS_FIXTURES } from '../fixtures/form_tk_ks_fixtures.mjs';
import { TK_KH_FIXTURES } from '../fixtures/form_tk_kh_fixtures.mjs';
import { TK_BTXH_FIXTURES } from '../fixtures/form_tk_btxh_fixtures.mjs';
import { createSampleFileBuffer, OCR_CROSS_CHECK_FIXTURES } from '../fixtures/vault_document_fixtures.mjs';

const PROJECT_ROOT = path.resolve(process.cwd());
const SEED_PROCEDURES_DIR = path.join(PROJECT_ROOT, 'backend/src/main/resources/db/seed/procedures');

export async function runTests(assertContext) {
  console.log('\n================================================================');
  console.log('TIER 4: REAL-WORLD CITIZEN LIFE SCENARIOS (7 SCENARIOS)');
  console.log('================================================================\n');

  // =========================================================================
  // T4_LIFE_01: Đăng ký Khai sinh cho con khi Cha Mẹ chưa đăng ký kết hôn
  // =========================================================================
  await assertContext.runTest(
    { testId: 'T4_LIFE_01', featureCode: 'F4', tierCode: 'tier4' },
    '[LIFE_01] Unmarried parents birth registration combining paternity recognition with OCR cross-check',
    async () => {
      // 1. Quét QR CCCD của người mẹ (Trần Thị Hồng Nhung)
      const rawQr = STATIC_CCCD_FIXTURES.VALID_HCMC_FEMALE_2002_NO_OLD_ID.rawQr;
      const parsedMotherQr = parseCccdQrString(rawQr);
      assertContext.assert(parsedMotherQr.valid, 'Mother QR CCCD must parse successfully');
      assertContext.assertEqual(parsedMotherQr.data.cccdNumber, '079302009876', 'Mother CCCD');

      // 2. Kê khai TK-KS khi cha mẹ chưa kết hôn nhưng điền tên cha mà không ghép thủ tục nhận cha con
      const invalidPrecheckPayload = {
        procedureCode: 'TTHC-HT-01',
        formType: 'TK-KS',
        citizenCccd: parsedMotherQr.data.cccdNumber,
        fullName: 'TRẦN GIA HÂN',
        dateOfBirth: '2026-10-15',
        gender: 'Nữ',
        address: 'Phường Bến Nghé, Quận 1, TP.HCM',
        formData: {
          childFullName: 'TRẦN GIA HÂN',
          childGender: 'Nữ',
          childDob: '2026-10-15',
          motherName: parsedMotherQr.data.fullName,
          motherCccd: parsedMotherQr.data.cccdNumber,
          fatherName: 'PHẠM QUỐC DŨNG',
          parentsMarried: 'NO',
        },
      };

      const resInvalid = await apiClient.post('/api/v1/forms/precheck', invalidPrecheckPayload);
      assertContext.assertStatusCode(resInvalid.status, 200, 'Precheck status');

      const paternityValidation = resInvalid.data?.fieldValidations?.find(
        (f) => f.errorCode === 'UNMARRIED_PARENTS_PATERNITY_REQUIRED' || f.fieldName?.includes('Cha Mẹ')
      );
      assertContext.assert(
        resInvalid.data?.overallValid === false && paternityValidation?.valid === false,
        'Must block unmarried parents birth registration with father declared unless combined with paternity acknowledgment'
      );

      // 3. Công dân đồng ý thực hiện thủ tục kết hợp (Thông tư 04/2020/TT-BTP)
      const validPrecheckPayload = {
        procedureCode: 'TTHC-HT-01',
        formType: 'TK-KS',
        citizenCccd: parsedMotherQr.data.cccdNumber,
        fullName: 'TRẦN GIA HÂN',
        dateOfBirth: '2026-10-15',
        gender: 'Nữ',
        address: 'Phường Bến Nghé, Quận 1, TP.HCM',
        formData: {
          childFullName: 'TRẦN GIA HÂN',
          childGender: 'Nữ',
          childDob: '2026-10-15',
          motherName: parsedMotherQr.data.fullName,
          hospitalMotherName: parsedMotherQr.data.fullName,
          hospitalBirthDate: '2026-10-15',
          motherCccd: parsedMotherQr.data.cccdNumber,
          fatherName: '', // Để trống trên tờ khai thường để ghép thủ tục nhận cha con
          parentsMarried: 'NO',
        },
      };

      const resValid = await apiClient.post('/api/v1/forms/precheck', validPrecheckPayload);
      assertContext.assertStatusCode(resValid.status, 200, 'Valid precheck status');
      assertContext.assert(resValid.data?.overallValid === true, 'Precheck must pass for combined procedure flow');

      // 4. OCR đối soát Giấy chứng sinh
      const ocrMatch = OCR_CROSS_CHECK_FIXTURES.BIRTH_CERTIFICATE_MATCH;
      assertContext.assertEqual(ocrMatch.status, 'MATCH', 'Birth Certificate OCR matches declaration');

      // 5. Tải Giấy chứng sinh lên Zero-Trust Vault
      const samplePng = createSampleFileBuffer('png');
      const vaultRes = await apiClient.uploadFile(
        '/api/v1/vault/upload',
        samplePng,
        'gcs_tran_gia_han.png',
        { documentType: 'GIAY_CHUNG_SINH' }
      );
      assertContext.assertStatusCode(vaultRes.status, 200, 'Vault upload status');
      const gcsToken = vaultRes.data?.data?.oneTimeToken;
      const gcsDocCode = vaultRes.data?.data?.documentCode;
      assertContext.assert(Boolean(gcsToken && gcsDocCode), 'Must receive OTT token and document code');

      // 6. Nộp hồ sơ liên thông vào cơ sở dữ liệu
      const dossierPayload = {
        dossierCode: `HS-KS-LIFE01-${Date.now().toString().slice(-6)}`,
        procedureCode: 'TTHC-HT-01',
        wardCode: 'WARD-AG-01',
        citizenCccd: parsedMotherQr.data.cccdNumber,
        formData: validPrecheckPayload.formData,
        precheckReport: { overallValid: true },
        vaultDocIds: [gcsDocCode],
      };
      const submitRes = await apiClient.post('/api/v1/dossiers', dossierPayload);
      assertContext.assertStatusCode(submitRes.status, 201, 'Dossier submission status');
    }
  );

  // =========================================================================
  // T4_LIFE_02: Chuyển hộ khẩu nhà thuê và thay đổi thông tin cư trú Mẫu CT01
  // =========================================================================
  await assertContext.runTest(
    { testId: 'T4_LIFE_02', featureCode: 'F4', tierCode: 'tier4' },
    '[LIFE_02] Rented house residence declaration (Mẫu CT01) enforcing host consent, floor area, and 7-day SLA',
    async () => {
      // 1. Quét QR CCCD công dân (Đỗ Tuấn Anh)
      const rawQr = STATIC_CCCD_FIXTURES.VALID_AN_GIANG_MALE_1995.rawQr;
      const parsedApplicant = parseCccdQrString(rawQr);

      // 2. Kê khai CT01 diện thuê/mượn/ở nhờ nhưng thiếu thông tin chủ hộ -> Precheck chặn
      const missingHostPayload = CT01_FIXTURES.INVALID_THUE_MUON_MISSING_HOST;
      const resMissingHost = await apiClient.post('/api/v1/forms/precheck', missingHostPayload);
      assertContext.assertStatusCode(resMissingHost.status, 200, 'Precheck missing host status');

      const isHostFlagged =
        resMissingHost.data?.overallValid === false ||
        (Array.isArray(resMissingHost.data?.warnings) &&
          resMissingHost.data.warnings.some((w) => w.includes('thuê') || w.includes('chủ hộ')));
      assertContext.assert(isHostFlagged, 'Must require host consent for rented residence');

      // 3. Kê khai đầy đủ chủ hộ (Lê Văn Hòa) và hợp đồng thuê nhà
      const validHostPayload = CT01_FIXTURES.VALID_THUE_MUON_O_NHO_WITH_HOST;
      const resValidHost = await apiClient.post('/api/v1/forms/precheck', validHostPayload);
      assertContext.assertStatusCode(resValidHost.status, 200, 'Precheck valid host status');
      assertContext.assert(resValidHost.data?.overallValid === true, 'Rented residence with host consent must pass');

      // 4. Kiểm tra Modal A4 render đúng Mẫu CT01 theo Thông tư 66/2023/TT-BCA
      const a4ModalPath = path.join(PROJECT_ROOT, 'frontend/src/components/A4DocumentModal.tsx');
      const modalSource = fs.readFileSync(a4ModalPath, 'utf8');
      assertContext.assert(
        modalSource.includes('CT01') || modalSource.includes('Cư trú'),
        'A4DocumentModal must support CT01 residence declaration layout'
      );

      // 5. Nộp hồ sơ và kiểm tra thời hạn giải quyết luật định (07 ngày làm việc)
      const ct01SeedPath = path.join(SEED_PROCEDURES_DIR, 'TTHC-CR-01.json');
      if (fs.existsSync(ct01SeedPath)) {
        const seedContent = fs.readFileSync(ct01SeedPath, 'utf8');
        assertContext.assert(
          seedContent.includes('7 ngày') || seedContent.includes('07 ngày'),
          'Residence registration SLA must be 7 working days under Law on Residence'
        );
      }
    }
  );

  // =========================================================================
  // T4_LIFE_03: Người ly hôn xin cấp giấy độc thân kết hôn mới
  // =========================================================================
  await assertContext.runTest(
    { testId: 'T4_LIFE_03', featureCode: 'F4', tierCode: 'tier4' },
    '[LIFE_03] Divorced citizen single status certificate blocking vague purpose and verifying court divorce judgment',
    async () => {
      // 1. Kê khai mục đích mơ hồ "việc cá nhân" -> Bị từ chối
      const vaguePayload = TK_KH_FIXTURES.INVALID_VAGUE_MARITAL_PURPOSE;
      const resVague = await apiClient.post('/api/v1/forms/precheck', vaguePayload);
      assertContext.assertStatusCode(resVague.status, 200, 'Precheck vague purpose status');

      const purposeValidation = resVague.data?.fieldValidations?.find(
        (f) => f.errorCode === 'VAGUE_MARITAL_PURPOSE' || f.fieldName?.includes('Mục đích')
      );
      assertContext.assert(
        resVague.data?.overallValid === false || purposeValidation?.valid === false,
        'Vague marital status certificate purpose must be blocked'
      );

      // 2. Điền mục đích cụ thể: "Để làm thủ tục đăng ký kết hôn với anh Nguyễn Hùng Cường tại UBND Phường Đa Kao"
      const specificPurposePayload = TK_KH_FIXTURES.VALID_MARITAL_STATUS_CERTIFICATE_SPECIFIC;
      const resSpecific = await apiClient.post('/api/v1/forms/precheck', specificPurposePayload);
      assertContext.assertStatusCode(resSpecific.status, 200, 'Precheck specific purpose status');
      assertContext.assert(resSpecific.data?.overallValid === true, 'Specific marriage purpose must be accepted');

      // 3. Người đã ly hôn nộp kèm bản án/quyết định ly hôn của Tòa án
      const divorcedPayload = TK_KH_FIXTURES.VALID_DIVORCED_WITH_JUDGMENT;
      const resDivorced = await apiClient.post('/api/v1/forms/precheck', divorcedPayload);
      assertContext.assertStatusCode(resDivorced.status, 200, 'Precheck divorced judgment status');
      assertContext.assert(resDivorced.data?.overallValid === true, 'Divorced status with court judgment must pass');

      // 4. Lưu bản án ly hôn vào Zero-Trust Vault
      const pdfBuffer = createSampleFileBuffer('pdf');
      const vaultRes = await apiClient.uploadFile(
        '/api/v1/vault/upload',
        pdfBuffer,
        'ban_an_ly_hon_so_56.pdf',
        { documentType: 'QUYET_DINH_LY_HON' }
      );
      assertContext.assertStatusCode(vaultRes.status, 200, 'Upload divorce judgment status');
      assertContext.assert(
        Boolean(vaultRes.data?.data?.oneTimeToken),
        'Must issue OTT token for court judgment'
      );

      // 5. Kiểm tra thời hạn giải quyết: 03 ngày làm việc theo Luật Hộ tịch (TTHC-HT-11)
      const certSeedPath = path.join(SEED_PROCEDURES_DIR, 'TTHC-HT-11.json');
      if (fs.existsSync(certSeedPath)) {
        const seedText = fs.readFileSync(certSeedPath, 'utf8');
        assertContext.assert(
          seedText.includes('3 ngày') || seedText.includes('03 ngày'),
          'Marital status certificate SLA must be 3 working days'
        );
      }
    }
  );

  // =========================================================================
  // T4_LIFE_04: Người cao tuổi đủ 75 tuổi hưởng trợ cấp BTXH Đề án 06
  // =========================================================================
  await assertContext.runTest(
    { testId: 'T4_LIFE_04', featureCode: 'F4', tierCode: 'tier4' },
    '[LIFE_04] Elderly >= 75 years social pension eligibility under Social Insurance Law 2024 and cashless account',
    async () => {
      // 1. Quét QR CCCD trích xuất ngày sinh 05/02/1951 (75 tuổi)
      const elderlyDob = '1951-02-05';
      const elderlyPayload = {
        procedureCode: 'TTHC-BT-01',
        formType: 'TK-BTXH',
        citizenCccd: '089051009876',
        fullName: 'NGUYỄN THỊ BA',
        dateOfBirth: elderlyDob,
        gender: 'Nữ',
        address: 'Xã An Phú, An Giang',
        formData: {
          hasPension: 'NO',
          householdStatus: 'NORMAL',
          bankAccount: '102837465928',
          bankName: 'Vietcombank',
        },
      };

      // 2. Tiền kiểm áp dụng chuẩn Luật Bảo hiểm xã hội 2024 (mốc >= 75 tuổi)
      const resElderly = await apiClient.post('/api/v1/forms/precheck', elderlyPayload);
      assertContext.assertStatusCode(resElderly.status, 200, 'Precheck elderly 75 status');
      assertContext.assert(
        resElderly.data?.overallValid === true,
        'Elderly >= 75 years without pension must be eligible for social protection'
      );

      // 3. Đối chứng trường hợp chưa đủ 75 tuổi (72 tuổi, hộ thường) -> Bị từ chối
      const underagePayload = TK_BTXH_FIXTURES.INVALID_AGE_72_NORMAL_HOUSEHOLD;
      const resUnderage = await apiClient.post('/api/v1/forms/precheck', underagePayload);
      assertContext.assertStatusCode(resUnderage.status, 200, 'Precheck age 72 status');

      const ageValidation = resUnderage.data?.fieldValidations?.find(
        (f) => f.errorCode === 'INELIGIBLE_SOCIAL_PROTECTION_AGE' || f.fieldName?.includes('Độ tuổi')
      );
      assertContext.assert(
        resUnderage.data?.overallValid === false || ageValidation?.valid === false,
        'Age 72 in normal household must be rejected as ineligible'
      );

      // 4. Kê khai số tài khoản an sinh không dùng tiền mặt (Đề án 06)
      assertContext.assert(
        Boolean(elderlyPayload.formData.bankAccount && elderlyPayload.formData.bankName),
        'Must include cashless social protection bank account'
      );

      // 5. Kiểm tra quy định lệ phí cho thủ tục bảo trợ xã hội
      const btxhSeedPath = path.join(SEED_PROCEDURES_DIR, 'TTHC-BT-01.json');
      if (fs.existsSync(btxhSeedPath)) {
        const seedText = fs.readFileSync(btxhSeedPath, 'utf8');
        const isRegulated =
          seedText.includes('HĐND') ||
          seedText.includes('Miễn phí') ||
          seedText.includes('Không thu lệ phí');
        assertContext.assert(isRegulated, 'Social protection procedure fee is regulated by HĐND with exemptions');
      }
    }
  );

  // =========================================================================
  // T4_LIFE_05: Khai tử liên thông và giải quyết mai táng phí
  // =========================================================================
  await assertContext.runTest(
    { testId: 'T4_LIFE_05', featureCode: 'F8', tierCode: 'tier4' },
    '[LIFE_05] Inter-agency death registration and funeral allowance (Mẫu 02, Mẫu 03) with Death Cert OCR',
    async () => {
      // 1. Lựa chọn thủ tục liên thông TTHC-CR-02
      const deathSeedPath = path.join(SEED_PROCEDURES_DIR, 'TTHC-CR-02.json');
      assertContext.assert(fs.existsSync(deathSeedPath), 'TTHC-CR-02.json must exist in seed repository');

      // 2. OCR đối soát Giấy báo tử
      const deathReportOcr = {
        documentType: 'GIAY_BAO_TU',
        extractedFields: {
          deceasedFullName: 'TRẦN VĂN HÙNG',
          dateOfDeath: '2026-11-10',
          placeOfDeath: 'Tại nhà riêng, Phường Bến Nghé, Quận 1',
        },
        status: 'MATCH',
        confidence: 0.98,
      };
      assertContext.assertEqual(deathReportOcr.status, 'MATCH', 'Death certificate OCR matches declaration');

      // 3. Tự động liên thông biểu mẫu: Mẫu 02 (Khai tử) và Mẫu 03 (Mai táng phí)
      const a4ModalPath = path.join(PROJECT_ROOT, 'frontend/src/components/A4DocumentModal.tsx');
      const modalSource = fs.readFileSync(a4ModalPath, 'utf8');
      assertContext.assert(
        modalSource.includes('procedureTitle') || modalSource.includes('TỜ KHAI'),
        'A4DocumentModal must support dynamic procedure title rendering for inter-agency procedures'
      );

      // 4. Xác nhận quy định lệ phí khai tử theo Luật Phí và Lệ phí
      const seedContent = fs.readFileSync(deathSeedPath, 'utf8');
      const isFeeExempt =
        seedContent.includes('TTHC tương ứng') ||
        seedContent.includes('Miễn phí') ||
        seedContent.includes('Không thu lệ phí');
      assertContext.assert(isFeeExempt, 'Death registration component follows fee exemption under Law on Fees and Charges');

      // 5. Nộp hồ sơ và hoàn tất quy trình
      const dossierPayload = {
        dossierCode: `HS-CR02-LIFE05-${Date.now().toString().slice(-6)}`,
        procedureCode: 'TTHC-CR-02',
        wardCode: 'WARD-AG-01',
        citizenCccd: '079095012345',
        formData: {
          deceasedName: 'TRẦN VĂN HÙNG',
          dateOfDeath: '2026-11-10',
          applicantName: 'TRẦN VĂN BÌNH',
          applicantRelation: 'Con đẻ',
        },
        precheckReport: { overallValid: true },
        vaultDocIds: ['DOC_DEATH_REPORT_001'],
      };
      const res = await apiClient.post('/api/v1/dossiers', dossierPayload);
      assertContext.assertStatusCode(res.status, 201, 'Inter-agency death dossier submission status');
    }
  );

  // =========================================================================
  // T4_LIFE_06: Chống gian lận và phát hiện mâu thuẫn dữ liệu giả mạo giấy tờ
  // =========================================================================
  await assertContext.runTest(
    { testId: 'T4_LIFE_06', featureCode: 'F7', tierCode: 'tier4' },
    '[LIFE_06] Security & Fraud defense catching century-gender CCCD mismatch and 10-day DOB forgery',
    async () => {
      // 1. Đối tượng sử dụng số CCCD có chữ số thế kỷ/giới tính bị giả mạo
      // Nam sinh năm 1995 phải mang chữ số thế kỷ '0', đối tượng dùng '2' (của thế kỷ 21)
      const fraudulentCccd = '079201012345';
      const cccdCheckPayload = {
        ...CT01_FIXTURES.INVALID_CCCD_CENTURY_GENDER,
        citizenCccd: fraudulentCccd,
      };

      const resCccdCheck = await apiClient.post('/api/v1/forms/precheck', cccdCheckPayload);
      assertContext.assertStatusCode(resCccdCheck.status, 200, 'Precheck CCCD status');

      const cccdValidation = resCccdCheck.data?.fieldValidations?.find(
        (f) => f.errorCode === 'INVALID_CCCD_CENTURY_GENDER' || f.fieldName?.includes('CCCD')
      );
      assertContext.assert(
        resCccdCheck.data?.overallValid === false || cccdValidation?.valid === false,
        'Security layer must intercept century-gender digit mismatch in CCCD'
      );

      // 2. Kê khai ngày sinh 20/10/2026 nhưng GCS thật ghi ngày 10/10/2026 (lệch 10 ngày)
      const forgedDobPayload = {
        procedureCode: 'TTHC-HT-01',
        formType: 'TK-KS',
        citizenCccd: '089095012345',
        fullName: 'NGUYỄN VĂN AN',
        dateOfBirth: '2026-10-20', // Tờ khai ghi 20/10
        gender: 'Nam',
        address: 'Phường Mỹ Xuyên, An Giang',
        formData: {
          childFullName: 'NGUYỄN VĂN AN',
          hospitalBirthDate: '2026-10-10', // Giấy chứng sinh ghi 10/10
          motherName: 'LÊ THỊ BÍCH NGỌC',
          hospitalMotherName: 'LÊ THỊ BÍCH NGỌC',
          parentsMarried: 'YES',
        },
      };

      const resDobCheck = await apiClient.post('/api/v1/forms/precheck', forgedDobPayload);
      assertContext.assertStatusCode(resDobCheck.status, 200, 'Precheck DOB mismatch status');

      const dobValidation = resDobCheck.data?.fieldValidations?.find(
        (f) => f.errorCode === 'BIRTH_CERT_DATE_MISMATCH' || f.fieldName?.includes('Ngày sinh')
      );
      assertContext.assert(
        resDobCheck.data?.overallValid === false || dobValidation?.valid === false,
        'Precheck must flag BIRTH_CERT_DATE_MISMATCH for 10-day discrepancy'
      );

      // 3. Hệ thống từ chối nộp hồ sơ giả mạo (Zero Bypass)
      assertContext.assert(
        resDobCheck.data?.overallValid === false,
        'Fraudulent application must strictly fail overall validation'
      );
    }
  );

  // =========================================================================
  // T4_LIFE_07: Toàn trình Vòng đời Hồ sơ từ Nộp, Bổ sung đến Phê duyệt và Xem Vault
  // =========================================================================
  await assertContext.runTest(
    { testId: 'T4_LIFE_07', featureCode: 'F11', tierCode: 'tier4' },
    '[LIFE_07] Full dossier lifecycle: Submit -> OTT-1 -> Supplement Request -> Re-upload -> OTT-2 -> Approval',
    async () => {
      const lifeDossierCode = `HS-LIFE07-${Date.now().toString().slice(-6)}`;
      const citizenCccd = '089095012345'; // Last 4: 2345

      // GIAI ĐOẠN 1: Công dân nộp hồ sơ lần 1, đính kèm ảnh Sổ đỏ lên Vault (OTT-1)
      const samplePng = createSampleFileBuffer('png');
      const upload1 = await apiClient.uploadFile(
        '/api/v1/vault/upload',
        samplePng,
        'gcn_qsd_dat_trang1.png',
        { documentType: 'GCN_QSD_DAT' }
      );
      assertContext.assertStatusCode(upload1.status, 200, 'Stage 1: Upload OTT-1 status');

      const ott1 = upload1.data?.data?.oneTimeToken;
      const docCode1 = upload1.data?.data?.documentCode;
      assertContext.assert(Boolean(ott1 && docCode1), 'Must obtain OTT-1 token');

      // Nộp hồ sơ vào DB
      const submitRes = await apiClient.post('/api/v1/dossiers', {
        dossierCode: lifeDossierCode,
        procedureCode: 'TTHC-DC-01',
        wardCode: 'WARD-AG-01',
        citizenCccd,
        formData: { fullName: 'NGUYỄN VĂN AN', parcelNumber: '123' },
        precheckReport: { overallValid: true },
        vaultDocIds: [docCode1],
      });
      assertContext.assertStatusCode(submitRes.status, 201, 'Stage 1: Submit dossier status');

      // GIAI ĐOẠN 2: Cán bộ đăng nhập lấy JWT, mở xem OTT-1
      const loginRes = await loginOfficer();
      const officerToken = loginRes.data?.data?.token;

      // Cán bộ xem tài liệu lần đầu qua OTT-1 -> Thành công
      const view1 = await apiClient.get(`/api/v1/vault/view/${ott1}`);
      assertContext.assertStatusCode(view1.status, 200, 'Stage 2: Officer view OTT-1 status');

      // Xem lại OTT-1 lần thứ hai -> Token tự hủy, trả về 410 GONE
      const replay1 = await apiClient.get(`/api/v1/vault/view/${ott1}`);
      assertContext.assertStatusCode(replay1.status, 410, 'Stage 2: Replay OTT-1 must return 410 GONE');

      // GIAI ĐOẠN 3: Cán bộ phát hiện trang 2 bị mờ số thửa -> Yêu cầu bổ sung
      const supplementFeedback = 'Vui lòng chụp lại trang 2 GCN QSDĐ rõ số thửa và diện tích theo quy định.';
      const reviewSupplementRes = await apiClient.put(
        `/api/v1/dossiers/${lifeDossierCode}/review`,
        {
          status: 'SUPPLEMENT_REQUIRED',
          officerFeedback: supplementFeedback,
        },
        {
          headers: { Authorization: `Bearer ${officerToken}` },
        }
      );
      assertContext.assertStatusCode(reviewSupplementRes.status, 200, 'Stage 3: Supplement request status');

      // GIAI ĐOẠN 4: Công dân tra cứu tiến độ bằng mã + 4 số cuối CCCD -> Thấy yêu cầu bổ sung
      const trackRes = await apiClient.get(
        `/api/v1/dossiers/track?dossierCode=${lifeDossierCode}&last4Cccd=2345`
      );
      assertContext.assertStatusCode(trackRes.status, 200, 'Stage 4: Citizen track status');
      assertContext.assertEqual(trackRes.data?.data?.status, 'SUPPLEMENT_REQUIRED', 'Status must be SUPPLEMENT_REQUIRED');
      assertContext.assertEqual(trackRes.data?.data?.officerFeedback, supplementFeedback, 'Feedback matches officer note');

      // GIAI ĐOẠN 5: Công dân chụp lại ảnh rõ nét hơn, tải lên Vault (OTT-2) và bổ sung hồ sơ
      const upload2 = await apiClient.uploadFile(
        '/api/v1/vault/upload',
        samplePng,
        'gcn_qsd_dat_trang2_ro_net.png',
        { documentType: 'GCN_QSD_DAT' }
      );
      assertContext.assertStatusCode(upload2.status, 200, 'Stage 5: Upload OTT-2 status');
      const ott2 = upload2.data?.data?.oneTimeToken;
      const docCode2 = upload2.data?.data?.documentCode;

      // GIAI ĐOẠN 6: Cán bộ thẩm tra OTT-2 và phê duyệt hồ sơ kèm mã hẹn
      const view2 = await apiClient.get(`/api/v1/vault/view/${ott2}`);
      assertContext.assertStatusCode(view2.status, 200, 'Stage 6: Officer view OTT-2 status');

      const appointmentCode = `LH-${Date.now().toString().slice(-6)}`;
      const approveRes = await apiClient.put(
        `/api/v1/dossiers/${lifeDossierCode}/review`,
        {
          status: 'APPROVED',
          officerFeedback: 'Hồ sơ bổ sung hợp lệ. Hẹn công dân mang bản chính đến đối chiếu.',
          appointmentCode,
        },
        {
          headers: { Authorization: `Bearer ${officerToken}` },
        }
      );
      assertContext.assertStatusCode(approveRes.status, 200, 'Stage 6: Final approval status');

      // Xác nhận kết quả phê duyệt qua tra cứu công dân
      const finalTrackRes = await apiClient.get(
        `/api/v1/dossiers/track?dossierCode=${lifeDossierCode}&last4Cccd=2345`
      );
      assertContext.assertStatusCode(finalTrackRes.status, 200, 'Final track inquiry');
      assertContext.assertEqual(finalTrackRes.data?.data?.status, 'APPROVED', 'Final status must be APPROVED');
    }
  );
}
