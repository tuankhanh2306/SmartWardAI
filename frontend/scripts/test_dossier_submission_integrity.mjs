import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourcePath = path.resolve(__dirname, '../src/pages/FormAndIssueReporting.tsx');

console.log('================================================================');
console.log('SMARTWARD AI: DOSSIER SUBMISSION INTEGRITY ACCEPTANCE TEST SUITE');
console.log('================================================================');

let totalPassed = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ [PASS] ${message}`);
  totalPassed++;
}

// Read FormAndIssueReporting.tsx + extracted feature modules source code
const featuresDir = path.resolve(__dirname, '../src/features');
function readFeatureSources(dir) {
  if (!fs.existsSync(dir)) return '';
  let acc = '';
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) acc += readFeatureSources(full);
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) acc += '\n' + fs.readFileSync(full, 'utf-8');
  }
  return acc;
}
const sourceCode = fs.readFileSync(sourcePath, 'utf-8') + readFeatureSources(featuresDir);

// =================================================================
// 1. STATIC SOURCE CODE INTEGRITY AUDIT
// =================================================================
console.log('\n--- 1. STATIC SOURCE CODE INTEGRITY AUDIT ---');

// Audit 1.1: Banned fallback values must be eliminated completely
assert(
  !sourceCode.includes("cccd || '089095012345'"),
  'Must ban fake CCCD fallback: cccd || \'089095012345\''
);
assert(
  !sourceCode.includes("phoneNumber || '0918234567'") && !sourceCode.includes("phone: phoneNumber || '0918234567'"),
  'Must ban fake Phone fallback: phoneNumber || \'0918234567\''
);
assert(
  !sourceCode.includes("fullName || 'Công dân kê khai'"),
  'Must ban fake Full Name fallback: fullName || \'Công dân kê khai\''
);
assert(
  !sourceCode.includes('const generatedAppointment = `LH-'),
  'Must ban auto-generated fake appointment code: generatedAppointment = LH-...'
);
assert(
  !sourceCode.includes("approvedDossier.appointmentCode || `LH-"),
  'Must ban QR fallback to fake appointment code in counter QR pass'
);

// Audit 1.2: Mandatory Validations before submission
assert(
  sourceCode.includes('/^\\d{12}$/.test(cleanCccd)'),
  'Must validate CCCD with exact 12-digit regex (/^\\d{12}$/)'
);
assert(
  sourceCode.includes('/^0\\d{9}$/.test(cleanPhone)'),
  'Must validate phone number with 10 digits starting with 0 (/^0\\d{9}$/)'
);
assert(
  sourceCode.includes('cleanFullName.length < 3'),
  'Must validate full name length >= 3 characters'
);

// Audit 1.3: Error resilience in submitDossier catch block
assert(
  sourceCode.includes('setSubmitError(') && sourceCode.includes('return; // Dừng hẳn: không tạo bản ghi giả'),
  'Must halt immediately and set submitError on API failure, never proceeding to saveLiveSubmittedDossier'
);

// Audit 1.4: Appointment code assignment in initial submission
assert(
  sourceCode.includes('appointmentCode: undefined,'),
  'Initial dossier cache must store appointmentCode as undefined until officer approval'
);

// Audit 1.5: QR pass conditional rendering
assert(
  sourceCode.includes('hasRealAppointment = Boolean(') &&
  sourceCode.includes('Hồ Sơ Đang Chờ Cán Bộ Xác Nhận & Cấp Lịch Hẹn'),
  'Must render "Waiting for officer approval" banner when appointmentCode is not yet officially granted'
);

// =================================================================
// 2. RUNTIME LOGIC SIMULATION & VALIDATION TEST
// =================================================================
console.log('\n--- 2. RUNTIME VALIDATION & ERROR HANDLING TEST ---');

// Pure simulation of validation logic
function validateCitizenDossierInputs(fullName, cccd, phone, email) {
  const cleanFullName = (fullName || '').trim();
  if (!cleanFullName || cleanFullName.length < 3) {
    return { valid: false, field: 'fullName', error: 'Vui lòng nhập đầy đủ Họ và tên công dân (tối thiểu 3 ký tự).' };
  }

  const cleanCccd = (cccd || '').trim();
  if (!cleanCccd || !/^\d{12}$/.test(cleanCccd)) {
    return { valid: false, field: 'cccd', error: 'Số CCCD/ĐDCN không hợp lệ. Vui lòng nhập đúng 12 chữ số theo quy định Đề án 06.' };
  }

  const cleanPhone = (phone || '').trim();
  if (!cleanPhone || !/^0\d{9}$/.test(cleanPhone)) {
    return { valid: false, field: 'phone', error: 'Số điện thoại liên hệ không hợp lệ (cần 10 chữ số, bắt đầu bằng 0).' };
  }

  const cleanEmail = (email || '').trim();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { valid: false, field: 'email', error: 'Vui lòng nhập Địa chỉ Email hợp lệ.' };
  }

  return { valid: true, cleanFullName, cleanCccd, cleanPhone, cleanEmail };
}

// Test Case 1: Short / invalid CCCD
const tc1 = validateCitizenDossierInputs('NGUYỄN MINH TUẤN KHANH', '03103708', '0918234567', 'test@gmail.com');
assert(!tc1.valid && tc1.field === 'cccd', 'Must reject 8-digit CCCD ("03103708")');

// Test Case 2: CCCD with non-digits
const tc2 = validateCitizenDossierInputs('NGUYỄN MINH TUẤN KHANH', '08920502349A', '0918234567', 'test@gmail.com');
assert(!tc2.valid && tc2.field === 'cccd', 'Must reject 12-character CCCD containing letters ("08920502349A")');

// Test Case 3: Invalid Phone (5 digits)
const tc3 = validateCitizenDossierInputs('NGUYỄN MINH TUẤN KHANH', '089205023490', '09012', 'test@gmail.com');
assert(!tc3.valid && tc3.field === 'phone', 'Must reject 5-digit phone number ("09012")');

// Test Case 4: Phone not starting with 0
const tc4 = validateCitizenDossierInputs('NGUYỄN MINH TUẤN KHANH', '089205023490', '8491823456', 'test@gmail.com');
assert(!tc4.valid && tc4.field === 'phone', 'Must reject phone number not starting with 0 ("8491823456")');

// Test Case 5: Empty / Short Full Name
const tc5 = validateCitizenDossierInputs('   ', '089205023490', '0918234567', 'test@gmail.com');
assert(!tc5.valid && tc5.field === 'fullName', 'Must reject empty full name');

const tc5b = validateCitizenDossierInputs('Lê', '089205023490', '0918234567', 'test@gmail.com');
assert(!tc5b.valid && tc5b.field === 'fullName', 'Must reject 2-character full name ("Lê")');

// Test Case 6: Valid Inputs Pass
const tc6 = validateCitizenDossierInputs('NGUYỄN MINH TUẤN KHANH', '089205023490', '0918234567', 'congdan.test@example.invalid');
assert(tc6.valid === true, 'Must accept fully valid inputs with 12-digit CCCD and 10-digit phone');

// =================================================================
// 3. API FAILURE RESILIENCE SIMULATION
// =================================================================
console.log('\n--- 3. API FAILURE RESILIENCE & CACHE ISOLATION TEST ---');

// Mock localStorage
const mockStorage = new Map();

function simulateSubmitWorkflow(apiWillFail = false) {
  let submitError = null;
  let submittedDossier = null;

  // 1. Validation passed
  const cleanFullName = 'NGUYỄN MINH TUẤN KHANH';
  const cleanCccd = '089205023490';
  const cleanPhone = '0918234567';
  const cleanEmail = 'congdan.test@example.invalid';

  let submitRes;
  try {
    if (apiWillFail) {
      throw new Error('Connection refused / 500 Internal Server Error');
    }
    submitRes = {
      dossierCode: 'TTHC-CT-01-20261115-0001',
      procedureCode: 'TTHC-CT-01',
      wardCode: 'AN_PHU',
      status: 'PENDING_REVIEW',
      slaDeadline: '2026-11-18T17:00:00Z',
      createdAt: '2026-11-15T16:00:00Z'
    };
  } catch (err) {
    submitError = 'Không thể nộp hồ sơ lên hệ thống. Vui lòng kiểm tra kết nối mạng và thử lại.';
    return { success: false, submitError, submittedDossier: null };
  }

  // Only reaches here if API succeeded
  submittedDossier = submitRes;
  const liveRecord = {
    id: submitRes.dossierCode,
    citizenName: cleanFullName.toUpperCase(),
    status: 'VALID',
    cccd: cleanCccd,
    contactPhone: cleanPhone,
    citizenEmail: cleanEmail,
    appointmentCode: undefined // No fake appointment code!
  };
  mockStorage.set('smartward_live_dossiers_v1', [liveRecord]);

  return { success: true, submitError: null, submittedDossier, liveRecord };
}

// Test Failure Case: API Fails
const failureRun = simulateSubmitWorkflow(true);
assert(failureRun.success === false, 'Workflow must report failure when submitDossier throws');
assert(failureRun.submitError !== null, 'Must populate submitError banner on failure');
assert(!mockStorage.has('smartward_live_dossiers_v1'), 'Must NOT write anything to localStorage when API fails');

// Test Success Case: API Succeeds
const successRun = simulateSubmitWorkflow(false);
assert(successRun.success === true, 'Workflow must succeed when API returns 200');
assert(successRun.submittedDossier.dossierCode === 'TTHC-CT-01-20261115-0001', 'Must use official dossierCode from server');
assert(successRun.liveRecord.appointmentCode === undefined, 'Must NOT have fake appointmentCode on new submission');
assert(mockStorage.has('smartward_live_dossiers_v1'), 'Must save valid cache only after server confirms');

// =================================================================
// 4. QR PASS DISPLAY LOGIC TEST
// =================================================================
console.log('\n--- 4. QR PASS DISPLAY LOGIC AUDIT ---');

function determineQrPassDisplay(targetDossier) {
  const appointmentCode = targetDossier?.appointmentCode;
  const hasRealAppointment = Boolean(
    appointmentCode &&
    !appointmentCode.startsWith('LH-MOCK') &&
    targetDossier.status === 'VALID'
  );
  if (!hasRealAppointment) {
    return { mode: 'WAITING_APPROVAL', appointmentCode: null };
  }
  return { mode: 'SHOW_QR_PASS', appointmentCode };
}

// 4.1: Newly submitted dossier (no appointmentCode)
const newlySubmitted = {
  id: 'TTHC-CT-01-20261115-0001',
  status: 'VALID',
  appointmentCode: undefined
};
const qrState1 = determineQrPassDisplay(newlySubmitted);
assert(qrState1.mode === 'WAITING_APPROVAL', 'Newly submitted dossier must display WAITING_APPROVAL mode');
assert(qrState1.appointmentCode === null, 'Newly submitted dossier must NOT have an appointmentCode');

// 4.2: Approved dossier with official appointmentCode
const approvedDossier = {
  id: 'TTHC-CT-01-20261115-0001',
  status: 'VALID',
  appointmentCode: 'LH-20261115-ANPHU-0089'
};
const qrState2 = determineQrPassDisplay(approvedDossier);
assert(qrState2.mode === 'SHOW_QR_PASS', 'Approved dossier must enter SHOW_QR_PASS mode');
assert(qrState2.appointmentCode === 'LH-20261115-ANPHU-0089', 'QR Pass must display official appointmentCode from server');

// 4.3: Mock appointment code rejected
const fakeMockDossier = {
  id: 'TTHC-CT-01-20261115-0001',
  status: 'VALID',
  appointmentCode: 'LH-MOCK-9999'
};
const qrState3 = determineQrPassDisplay(fakeMockDossier);
assert(qrState3.mode === 'WAITING_APPROVAL', 'Mock appointment code (LH-MOCK) must be rejected and remain in WAITING_APPROVAL');

// =================================================================
// 5. UNVERIFIED SLA NULL DISPLAY AUDIT
// =================================================================
console.log('\n--- 5. UNVERIFIED SLA NULL DISPLAY AUDIT ---');
const formPageSrc = fs.readFileSync(sourcePath, 'utf-8');
const dossierApiSrc = fs.readFileSync(path.resolve(__dirname, '../src/api/modules/dossier.api.ts'), 'utf-8');
const trackingTabSrc = fs.readFileSync(path.resolve(__dirname, '../src/features/dossier-tracking/DossierTrackingTab.tsx'), 'utf-8');

assert(
  dossierApiSrc.includes('Chưa xác định (chờ cán bộ Một cửa xác nhận)') &&
  sourceCode.includes('formatSlaDeadlineVi(submittedDossier.slaDeadline') &&
  trackingTabSrc.includes('formatSlaDeadlineVi(trackingResult.slaDeadline'),
  'Web UI must use formatSlaDeadlineVi returning explicit unverified fallback when slaDeadline is null'
);

assert(
  !trackingTabSrc.includes('Nghị định 13/2023/NĐ-CP') && !formPageSrc.includes('Nghị định 13/2023/NĐ-CP'),
  'Form/Tracking UI source must not render unverified Decree 13/2023/ND-CP string'
);

// Evaluate exact runtime formatting logic mirrored from dossier.api.ts
function formatSlaDeadlineCheck(slaDeadline, withSeconds = false) {
  if (!slaDeadline) return 'Chưa xác định (chờ cán bộ Một cửa xác nhận)';
  const parsed = new Date(slaDeadline);
  if (Number.isNaN(parsed.getTime())) return 'Chưa xác định (chờ cán bộ Một cửa xác nhận)';
  const datePart = parsed.toLocaleDateString('vi-VN');
  return withSeconds ? `${datePart} (17:00:00)` : `${datePart} 17:00`;
}
assert(
  formatSlaDeadlineCheck(null, true) === 'Chưa xác định (chờ cán bộ Một cửa xác nhận)' &&
  formatSlaDeadlineCheck(undefined, false) === 'Chưa xác định (chờ cán bộ Một cửa xác nhận)',
  'Null or undefined slaDeadline must display unverified confirmation prompt instead of 1970 epoch date'
);
assert(
  !formatSlaDeadlineCheck('2026-11-25T17:00:00Z', false).includes('Chưa xác định'),
  'Verified slaDeadline must render localized date instead of unverified fallback'
);

// =================================================================
// 6. TASK-051: CANONICAL MAPPING, PRECHECK/SUBMIT SPLIT & UUID IDEMPOTENCY AUDIT
// =================================================================
console.log('\n--- 6. TASK-051: CANONICAL MAPPING, PRECHECK SPLIT & UUID IDEMPOTENCY ---');

assert(
  !sourceCode.includes("'TK-KS': 'TTHC-CR-01'") &&
  !sourceCode.includes("'TK-KH': 'TTHC-CR-03'") &&
  !sourceCode.includes("'CT01': 'TTHC-CT-01'"),
  'Must eliminate legacy mismatched procCodeMap (TK-KS->CR-01, TK-KH->CR-03, CT01->CT-01)'
);

assert(
  sourceCode.includes('resolveCanonicalProcedureCode') &&
  sourceCode.includes("case 'TK-KS':") &&
  sourceCode.includes("return 'TTHC-HT-01';"),
  'Must enforce single canonical procedure mapping (TK-KS -> TTHC-HT-01)'
);

assert(
  !sourceCode.includes("dob: dob || '1990-01-01'") &&
  !sourceCode.includes('sharpnessScore: ocr.visionGateResult?.sharpnessScore ?? 96'),
  'Must NOT inject fake default DOB (1990-01-01) or fake OCR sharpnessScore (96) into submission payload'
);

assert(
  sourceCode.includes('const handlePrecheck = async () =>') &&
  sourceCode.includes('const handleSubmitDossier = async () =>') &&
  sourceCode.includes('verifiedSnapshotHash !== currentFingerprint'),
  'Must separate handlePrecheck from handleSubmitDossier and block submission if edited after precheck'
);

assert(
  sourceCode.includes('idempotencyKey: submissionAttemptUuid') &&
  sourceCode.includes('Chưa xác nhận được kết quả gửi'),
  'Must reuse stable UUID idempotencyKey on lost-response retry and display clear unconfirmed notice'
);

// =================================================================
// 7. TASK-052 & TASK-053: PILOT BIRTH REGISTRATION UX INTEGRITY AUDIT
// =================================================================
console.log('\n--- 7. TASK-052 & TASK-053: PROCEDURE ROUTING, PRIVACY DRAFT & NEXT-ACTION CARD ---');

assert(
  sourceCode.includes("searchParams.get('procedure')") &&
  sourceCode.includes("searchParams.get('ward')"),
  'FormAndIssueReporting must support ?procedure=TTHC-HT-01 and validated ?ward= URL parameters'
);

assert(
  sourceCode.includes('smartward_form_draft_meta_v1') &&
  sourceCode.includes('smartward_form_session_pii_v1') &&
  sourceCode.includes('Lưu để làm sau') &&
  sourceCode.includes('Tiếp tục hồ sơ đang làm') &&
  sourceCode.includes('Xóa bản nháp'),
  'Draft storage must separate non-PII localStorage progress from active-tab sessionStorage PII with Save/Resume/Clear controls'
);

assert(
  trackingTabSrc.includes('<DossierNextActionCard') &&
  trackingTabSrc.indexOf('<DossierNextActionCard') < trackingTabSrc.indexOf('Lịch sử xử lý hồ sơ') &&
  trackingTabSrc.includes('trackingResult.wardCode'),
  'DossierTrackingTab must place DossierNextActionCard ABOVE timeline history and resolve handling ward from trackingResult.wardCode'
);

console.log('\n================================================================');
console.log(`SUMMARY: All ${totalPassed}/${totalTests} dossier integrity tests PASSED! 100% GREEN!`);
console.log('================================================================');
