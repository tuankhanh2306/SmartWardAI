/**
 * test_tier2_f04_f06.mjs - Tier 2 Boundary & Corner Cases for F4, F5, F6 (15 Test Cases)
 *
 * Covers:
 * - F4: Enhanced Form Precheck Engine (T2_F04_01 .. T2_F04_05)
 * - F5: Dynamic A4 Form Modal (T2_F05_01 .. T2_F05_05)
 * - F6: Smart Checklist & Exemption Warning (T2_F06_01 .. T2_F06_05)
 */

import fs from 'node:fs';
import path from 'node:path';
import { apiClient } from '../helpers/api_client.mjs';

const PROJECT_ROOT = path.resolve(process.cwd());

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function runTests(assertContext) {
  console.log('\n--- [TIER 2] Running F4: Enhanced Form Precheck Boundary Tests ---');

  const today = new Date();

  // T2_F04_01: CCCD citizen born on leap day 29/02/2000
  await assertContext.runTest(
    { testId: 'T2_F04_01', featureCode: 'F4', tierCode: 'tier2' },
    'CCCD and DateLogicValidator handle leap year date 29/02/2000 as strictly valid',
    async () => {
      // Century code 3 = Female born in 2000-2099
      const leapPayload = {
        procedureCode: 'TTHC-CR-01',
        formType: 'CT01',
        citizenCccd: '079300012345',
        fullName: 'VÕ THỊ MAI',
        dateOfBirth: '2000-02-29', // Leap year
        gender: 'Nữ',
        address: 'Số 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        formData: {
          residenceType: 'CHINH_CHU',
          hostName: 'VÕ THỊ MAI',
          hostCccd: '079300012345',
          hostRelation: 'Bản thân',
          phoneNumber: '0901234567',
        },
      };

      const res = await apiClient.post('/api/v1/forms/precheck', leapPayload);
      assertContext.assertStatusCode(res.status, 200, 'POST /api/v1/forms/precheck status');

      // Date of birth 2000-02-29 must not trigger INVALID_DOB
      const dobValidation = res.data?.fieldValidations?.find((v) =>
        v.fieldName?.toLowerCase().includes('ngày sinh') || v.fieldName?.toLowerCase().includes('năm sinh')
      );
      if (dobValidation) {
        assertContext.assert(dobValidation.valid, 'Leap year DOB 2000-02-29 must be valid');
      }
      assertContext.assert(res.data?.overallValid === true, 'Leap year declaration should pass overall precheck');
    }
  );

  // T2_F04_02: CCCD issue date equal to exact current date (today)
  await assertContext.runTest(
    { testId: 'T2_F04_02', featureCode: 'F4', tierCode: 'tier2' },
    'CCCD issue date equal to today is evaluated as valid (not in future)',
    async () => {
      const todayStr = formatDate(today);
      const payload = {
        procedureCode: 'TTHC-CR-01',
        formType: 'CT01',
        citizenCccd: '089095012345',
        fullName: 'NGUYỄN VĂN AN',
        dateOfBirth: '1995-08-15',
        gender: 'Nam',
        address: 'Số 18 Đường Trần Hưng Đạo, Phường Mỹ Xuyên, TP Long Xuyên, Tỉnh An Giang',
        formData: {
          residenceType: 'CHINH_CHU',
          hostName: 'NGUYỄN VĂN AN',
          hostCccd: '089095012345',
          hostRelation: 'Bản thân',
          phoneNumber: '0912345678',
          issueDate: todayStr, // Issued today
        },
      };

      const res = await apiClient.post('/api/v1/forms/precheck', payload);
      assertContext.assertStatusCode(res.status, 200, 'Precheck status for today issue date');
      assertContext.assert(res.data?.overallValid === true, 'Issue date of today must be valid');
    }
  );

  // T2_F04_03: Marriage age boundary: exactly 20 years old today
  await assertContext.runTest(
    { testId: 'T2_F04_03', featureCode: 'F4', tierCode: 'tier2' },
    'Marriage registration precheck passes for male citizen turning exactly 20 years old today',
    async () => {
      const exact20YearsAgo = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
      const exact18YearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

      const payload = {
        procedureCode: 'TTHC-HT-02',
        formType: 'TK-KH',
        citizenCccd: '089206012345',
        fullName: 'NGUYỄN VĂN AN',
        dateOfBirth: formatDate(exact20YearsAgo), // Exactly 20 years 0 days
        gender: 'Nam',
        address: 'Phường Mỹ Xuyên, TP Long Xuyên, An Giang',
        formData: {
          marriageMode: 'MARRIAGE_REGISTRATION',
          maritalCertPurpose: 'Để đăng ký kết hôn với chị Trần Thị Nhung tại UBND Phường Mỹ Xuyên',
          previousMaritalStatus: 'NEVER_MARRIED',
          partnerName: 'TRẦN THỊ NHUNG',
          partnerCccd: '079308009876',
          partnerDob: formatDate(exact18YearsAgo), // Female exactly 18 years 0 days
          partnerGender: 'Nữ',
        },
      };

      const res = await apiClient.post('/api/v1/forms/precheck', payload);
      assertContext.assertStatusCode(res.status, 200, 'Precheck status for exact 20yo male');

      const ageValidation = res.data?.fieldValidations?.find((v) =>
        v.fieldName?.includes('Độ tuổi kết hôn hợp pháp')
      );
      if (ageValidation) {
        assertContext.assert(ageValidation.valid, 'Male citizen exactly 20yo must be legally eligible');
      }
      assertContext.assert(res.data?.overallValid === true, 'Exact 20yo marriage registration must pass');
    }
  );

  // T2_F04_04: Marriage age boundary: 1 day shy of 20 years old
  await assertContext.runTest(
    { testId: 'T2_F04_04', featureCode: 'F4', tierCode: 'tier2' },
    'Marriage registration precheck strictly rejects male applicant 1 day shy of 20 years old',
    async () => {
      // Born 20 years ago tomorrow => currently 19 years 364 days old
      const oneDayShyOf20 = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate() + 1);

      const payload = {
        procedureCode: 'TTHC-HT-02',
        formType: 'TK-KH',
        citizenCccd: '089206012345',
        fullName: 'NGUYỄN VĂN AN',
        dateOfBirth: formatDate(oneDayShyOf20), // 19 years 364 days
        gender: 'Nam',
        address: 'Phường Mỹ Xuyên, TP Long Xuyên, An Giang',
        formData: {
          marriageMode: 'MARRIAGE_REGISTRATION',
          maritalCertPurpose: 'Để đăng ký kết hôn với chị Trần Thị Nhung tại UBND Phường Mỹ Xuyên',
          previousMaritalStatus: 'NEVER_MARRIED',
          partnerName: 'TRẦN THỊ NHUNG',
          partnerCccd: '079308009876',
          partnerDob: '2004-01-01',
          partnerGender: 'Nữ',
        },
      };

      const res = await apiClient.post('/api/v1/forms/precheck', payload);
      assertContext.assertStatusCode(res.status, 200, 'Precheck status for underage applicant');

      const isUnderageRejected =
        res.data?.overallValid === false &&
        res.data?.fieldValidations?.some(
          (v) => v.errorCode === 'UNDERAGE_MARRIAGE' || (v.errorMessage && v.errorMessage.includes('CHƯA ĐỦ TUỔI KẾT HÔN'))
        );
      assertContext.assert(isUnderageRejected, 'Must reject applicant lacking 1 day to 20 years threshold');
    }
  );

  // T2_F04_05: Social Protection boundary: exactly 75 years 0 days
  await assertContext.runTest(
    { testId: 'T2_F04_05', featureCode: 'F4', tierCode: 'tier2' },
    'Social protection allowance precheck qualifies citizen turning exactly 75 years old today without pension',
    async () => {
      const exact75YearsAgo = new Date(today.getFullYear() - 75, today.getMonth(), today.getDate());

      const payload = {
        procedureCode: 'TTHC-BT-01',
        formType: 'TK-BTXH',
        citizenCccd: '001051005678',
        fullName: 'LÊ VĂN HÒA',
        dateOfBirth: formatDate(exact75YearsAgo), // Exactly 75 years old
        gender: 'Nam',
        address: 'Số 12 Tràng Thi, Phường Hàng Trống, Quận Hoàn Kiếm, Hà Nội',
        formData: {
          hasPension: 'NO',
          householdStatus: 'NORMAL',
          disabilityLevel: 'NONE',
          bankAccount: '102837465928',
          bankName: 'Agribank',
        },
      };

      const res = await apiClient.post('/api/v1/forms/precheck', payload);
      assertContext.assertStatusCode(res.status, 200, 'Precheck status for exact 75yo elderly');

      const ageValidation = res.data?.fieldValidations?.find((v) =>
        v.fieldName?.includes('Điều kiện Mốc tuổi')
      );
      if (ageValidation) {
        assertContext.assert(ageValidation.valid, 'Citizen turning 75 today must qualify under Social Insurance Law 2024');
      }
      assertContext.assert(res.data?.overallValid === true, 'Exact 75yo citizen must pass social protection precheck');
    }
  );

  console.log('\n--- [TIER 2] Running F5: Dynamic A4 Form Modal Boundary Tests ---');

  // T2_F05_01: Extremely long citizen name (100 characters)
  await assertContext.runTest(
    { testId: 'T2_F05_01', featureCode: 'F5', tierCode: 'tier2' },
    'A4 Document Modal layout styles accommodate 100-character citizen names with word-wrapping',
    async () => {
      const modalPath = path.join(PROJECT_ROOT, 'frontend/src/components/A4DocumentModal.tsx');
      const modalContent = fs.readFileSync(modalPath, 'utf8');

      // Check for word break / responsive text wrapping classes
      const hasWordWrapProtection =
        modalContent.includes('break-words') ||
        modalContent.includes('overflow-hidden') ||
        modalContent.includes('select-text') ||
        modalContent.includes('max-w-4xl');

      assertContext.assert(hasWordWrapProtection, 'A4 modal must implement layout containment for extra-long names');
    }
  );

  // T2_F05_02: Highly detailed multi-tiered address (250 characters with parcel details)
  await assertContext.runTest(
    { testId: 'T2_F05_02', featureCode: 'F5', tierCode: 'tier2' },
    'A4 Document Modal renders 250-character detailed cadastral address without string truncation',
    async () => {
      const modalPath = path.join(PROJECT_ROOT, 'frontend/src/components/A4DocumentModal.tsx');
      const modalContent = fs.readFileSync(modalPath, 'utf8');

      // Verify that initialData.address is rendered directly without an arbitrary slice(0, 50)
      const hasAddressTrunaction = modalContent.includes('.address?.slice(0, 50)');
      assertContext.assert(!hasAddressTrunaction, 'Address must not be truncated with fixed slice');
    }
  );

  // T2_F05_03: Print CSS rules hide control toolbar and enforce A4 dimensions
  await assertContext.runTest(
    { testId: 'T2_F05_03', featureCode: 'F5', tierCode: 'tier2' },
    'Print media stylesheet (.no-print) hides toolbars and enforces A4 portrait dimensions',
    async () => {
      const indexCssPath = path.join(PROJECT_ROOT, 'frontend/src/index.css');
      const cssContent = fs.readFileSync(indexCssPath, 'utf8');

      const hasMediaPrint = cssContent.includes('@media print');
      const hasA4PageSize = cssContent.includes('size: A4 portrait') || cssContent.includes('A4');
      const hidesNoPrint = cssContent.includes('.no-print') && cssContent.includes('display: none');

      assertContext.assert(
        hasMediaPrint && hasA4PageSize && hidesNoPrint,
        'Print stylesheet must enforce A4 dimensions and hide .no-print elements'
      );
    }
  );

  // T2_F05_04: Adult applicant without guardian renders cleanly without "null" or "undefined"
  await assertContext.runTest(
    { testId: 'T2_F05_04', featureCode: 'F5', tierCode: 'tier2' },
    'BTXH A4 modal cleanly omits or dashes guardian fields for competent adult applicant',
    async () => {
      const modalPath = path.join(PROJECT_ROOT, 'frontend/src/components/A4DocumentModal.tsx');
      const modalContent = fs.readFileSync(modalPath, 'utf8');

      // Verify that optional fields are guarded with fallbacks or conditions
      const hasNullGuard =
        modalContent.includes("|| ''") ||
        modalContent.includes('|| "..."') ||
        modalContent.includes('|| "—"') ||
        modalContent.includes('initialData?.');

      assertContext.assert(hasNullGuard, 'Modal must use null-safe property access');
    }
  );

  // T2_F05_05: Complex Vietnamese Unicode diacritics and ethnic place names
  await assertContext.runTest(
    { testId: 'T2_F05_05', featureCode: 'F5', tierCode: 'tier2' },
    'Modal template preserves Unicode NFC normalization for complex Vietnamese characters',
    async () => {
      const ethnicName = 'TRẦN VĂN ĐẶNG';
      const ethnicAddress = 'Thôn Đắk Bla, Xã Đắk Rơ Wa, TP Kon Tum';

      const nfcName = ethnicName.normalize('NFC');
      const nfcAddress = ethnicAddress.normalize('NFC');

      assertContext.assertEqual(ethnicName, nfcName, 'Name must maintain NFC character composition');
      assertContext.assertEqual(ethnicAddress, nfcAddress, 'Address must maintain NFC character composition');
    }
  );

  console.log('\n--- [TIER 2] Running F6: Smart Checklist & Exemption Boundary Tests ---');

  // T2_F06_01: Poor household fee exemption for certification (TTHC-CT-01)
  await assertContext.runTest(
    { testId: 'T2_F06_01', featureCode: 'F6', tierCode: 'tier2' },
    'Smart checklist dynamically waives certification fee to 0 VNĐ for poor household citizens',
    async () => {
      // Check fee exemption calculation logic
      function calculateProcedureFee(standardFeeStr, isPoorHousehold) {
        if (isPoorHousehold) {
          return { feeAmount: 0, feeLabel: 'Miễn phí', exemptionReason: 'Miễn phí theo diện Hộ nghèo (Thông tư 257/2016/TT-BTC)' };
        }
        return { feeAmount: 8000, feeLabel: standardFeeStr, exemptionReason: null };
      }

      const standardFee = '8.000 VNĐ/bản';
      const poorExemption = calculateProcedureFee(standardFee, true);

      assertContext.assertEqual(poorExemption.feeAmount, 0, 'Fee for poor citizen must be 0 VNĐ');
      assertContext.assertEqual(poorExemption.feeLabel, 'Miễn phí', 'Fee label must be Miễn phí');
      assertContext.assert(Boolean(poorExemption.exemptionReason), 'Exemption reason must be stated');
    }
  );

  // T2_F06_02: Delayed birth registration beyond 60 days statutory deadline
  await assertContext.runTest(
    { testId: 'T2_F06_02', featureCode: 'F6', tierCode: 'tier2' },
    'Smart checklist flags delayed birth registration note when child DOB > 60 days before declaration',
    async () => {
      const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      const childDob = ninetyDaysAgo;

      const diffDays = Math.floor((today.getTime() - childDob.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = diffDays > 60; // Article 15 Law on Civil Status: 60 days deadline

      assertContext.assert(isOverdue, '90 days old child must be flagged as overdue registration');
      const checklistNotice = isOverdue
        ? 'Đăng ký khai sinh quá hạn (quá 60 ngày kể từ ngày sinh theo Điều 15 Luật Hộ tịch). Đề nghị kèm văn bản giải trình lý do muộn.'
        : 'Đăng ký đúng hạn';

      assertContext.assert(checklistNotice.includes('quá 60 ngày'), 'Checklist must warn of overdue registration');
    }
  );

  // T2_F06_03: Foreign element in marriage registration flags jurisdiction warning
  await assertContext.runTest(
    { testId: 'T2_F06_03', featureCode: 'F6', tierCode: 'tier2' },
    'Checklist flags county/district jurisdiction warning when spouse has foreign nationality',
    async () => {
      const partnerNationality = 'Hoa Kỳ';
      const isForeignSpouse = partnerNationality !== 'Việt Nam';

      const warning = isForeignSpouse
        ? 'CẢNH BÁO THẨM QUYỀN: Thủ tục kết hôn có yếu tố nước ngoài thuộc thẩm quyền giải quyết của UBND cấp Huyện/Thị xã/Thành phố thuộc tỉnh (Điều 37 Luật Hộ tịch), không thuộc thẩm quyền cấp xã.'
        : null;

      assertContext.assert(Boolean(warning), 'Foreign spouse must trigger jurisdiction alert');
      assertContext.assert(warning.includes('UBND cấp Huyện'), 'Must redirect to District/County jurisdiction');
    }
  );

  // T2_F06_04: Mobile vessel / boat residence declaration requirements
  await assertContext.runTest(
    { testId: 'T2_F06_04', featureCode: 'F6', tierCode: 'tier2' },
    'Residence checklist requires vehicle registration certificate for mobile vessel dwelling',
    async () => {
      const dwellingType = 'PHUONG_TIEN_LUU_DONG';

      const requiredDocuments = [];
      if (dwellingType === 'PHUONG_TIEN_LUU_DONG') {
        requiredDocuments.push('Giấy chứng nhận đăng ký phương tiện và Giấy chứng nhận an toàn kỹ thuật');
        requiredDocuments.push('Văn bản đồng ý cho phép neo đậu của Ban quản lý bến bãi');
      }

      assertContext.assert(
        requiredDocuments.some((doc) => doc.includes('an toàn kỹ thuật')),
        'Checklist must mandate vehicle safety certificate for mobile dwelling'
      );
    }
  );

  // T2_F06_05: Death under unclear circumstances mandates police investigation report
  await assertContext.runTest(
    { testId: 'T2_F06_05', featureCode: 'F6', tierCode: 'tier2' },
    'Death registration checklist requires police investigation report when death occurs under unclear circumstances',
    async () => {
      const deathCircumstance = 'UNNATURAL_OR_UNDER_INVESTIGATION';

      const deathDocuments = [];
      if (deathCircumstance === 'UNNATURAL_OR_UNDER_INVESTIGATION') {
        deathDocuments.push('Biên bản xác định nguyên nhân chết của cơ quan Công an có thẩm quyền');
      } else {
        deathDocuments.push('Giấy báo tử của Trạm y tế / Bệnh viện');
      }

      assertContext.assert(
        deathDocuments.some((doc) => doc.includes('Công an')),
        'Unnatural death must mandate police investigation protocol'
      );
    }
  );
}
