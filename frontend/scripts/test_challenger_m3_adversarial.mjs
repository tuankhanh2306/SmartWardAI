import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const currentFile = fileURLToPath(import.meta.url);

// Ensure tsx loader is active for importing TypeScript files
if (!process.env.SMARTWARD_TSX_ACTIVE) {
  const rootDir = path.resolve(path.dirname(currentFile), '../..');
  const loaderPath = path.resolve(rootDir, 'frontend/node_modules/tsx/dist/loader.mjs');
  if (fs.existsSync(loaderPath)) {
    const res = spawnSync(process.execPath, ['--import', pathToFileURL(loaderPath).href, currentFile, ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: { ...process.env, SMARTWARD_TSX_ACTIVE: '1' }
    });
    process.exit(res.status ?? 0);
  }
}

console.log('================================================================');
console.log('CHALLENGER 1: ADVERSARIAL STRESS TEST SUITE — MILESTONE 3 (F7 & F8)');
console.log('Features: F7 (CCCD QR Parser & Decoder), F8 (OCR Cross-Check Engine)');
console.log('================================================================\n');

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✓ [PASS] ${description}`);
    passedAssertions++;
  } else {
    console.error(`  ✗ [FAIL] ${description}`);
    failedAssertions++;
  }
}

function assertEqual(actual, expected, description) {
  if (actual === expected) {
    console.log(`  ✓ [PASS] ${description} === ${expected}`);
    passedAssertions++;
  } else {
    console.error(`  ✗ [FAIL] ${description}: Expected '${expected}', got '${actual}'`);
    failedAssertions++;
  }
}

// -------------------------------------------------------------
// SECTION 1: CCCD QR CODE PARSER ADVERSARIAL MATRIX (F7)
// -------------------------------------------------------------
console.log('--- SECTION 1: CCCD QR Parser & Decoder (F7) ---');

const { parseCccdQrString, detectDiscrepancies } = await import('../src/utils/cccdQrParser.ts');

// 1. Standard BCA 7-field QR string with old 9-digit CMND
{
  const qr = '089095012345|251000123|NGUYỄN VĂN AN|15081995|Nam|Số 18 Đường Trần Hưng Đạo, An Giang|25042021';
  const res = parseCccdQrString(qr);
  assert(res.valid, 'BCA 7-field QR with 9-digit CMND parsed successfully');
  assertEqual(res.data?.cccdNumber, '089095012345', 'CCCD number');
  assertEqual(res.data?.oldIdNumber, '251000123', 'Old 9-digit CMND');
  assertEqual(res.data?.fullName, 'NGUYỄN VĂN AN', 'Full name');
  assertEqual(res.data?.dateOfBirth, '1995-08-15', 'DOB in ISO yyyy-MM-dd');
  assertEqual(res.data?.gender, 'Nam', 'Gender');
  assertEqual(res.data?.address, 'Số 18 Đường Trần Hưng Đạo, An Giang', 'Address');
  assertEqual(res.data?.issueDate, '2021-04-25', 'Issue date in ISO yyyy-MM-dd');
}

// 2. Standard BCA 7-field QR without old CMND (two pipes "||")
{
  const qr = '079302009876||TRẦN THỊ HỒNG NHUNG|12032002|Nữ|Số 45 Lê Duẩn, Phường Bến Nghé, Quận 1|10102022';
  const res = parseCccdQrString(qr);
  assert(res.valid, '7-field QR with absent old CMND (||) parsed successfully');
  assertEqual(res.data?.cccdNumber, '079302009876', 'CCCD number');
  assertEqual(res.data?.oldIdNumber, '', 'Old CMND is empty string');
  assertEqual(res.data?.fullName, 'TRẦN THỊ HỒNG NHUNG', 'Full name preserved without index shift');
  assertEqual(res.data?.dateOfBirth, '2002-03-12', 'DOB correctly parsed');
  assertEqual(res.data?.gender, 'Nữ', 'Gender is Nữ');
  assertEqual(res.data?.issueDate, '2022-10-10', 'Issue date parsed');
}

// 3. 6-field QR without issue date
{
  const qr = '089095012345|251000123|LÊ VĂN HÒA|01011948|Nam|Số 12 Tràng Thi, Hà Nội';
  const res = parseCccdQrString(qr);
  assert(res.valid, '6-field QR without issue date is valid');
  assertEqual(res.data?.fullName, 'LÊ VĂN HÒA', 'Full name');
  assertEqual(res.data?.dateOfBirth, '1948-01-01', 'DOB');
  assertEqual(res.data?.issueDate, '', 'Issue date defaults to empty string');
}

// 4. 6-field QR with absent old ID and absent issue date
{
  const qr = '079300012345||VÕ THỊ MAI|29022000|Nữ|Phường Bến Nghé, Quận 1, TP.HCM';
  const res = parseCccdQrString(qr);
  assert(res.valid, '6-field QR with absent old ID (||) and no issue date');
  assertEqual(res.data?.oldIdNumber, '', 'Old ID empty');
  assertEqual(res.data?.fullName, 'VÕ THỊ MAI', 'Full name');
  assertEqual(res.data?.dateOfBirth, '2000-02-29', 'Leap year DOB');
  assertEqual(res.data?.gender, 'Nữ', 'Gender');
}

// 5. Excessive whitespace padding around pipes (" | | ")
{
  const paddedQr = '  089095012345  |   |  NGUYỄN VĂN AN  | 15081995 | Nam |  Địa chỉ thường trú  | 25042021  ';
  const res = parseCccdQrString(paddedQr);
  assert(res.valid, 'Excessive padding around delimiters trimmed cleanly');
  assertEqual(res.data?.cccdNumber, '089095012345', 'Trimmed CCCD');
  assertEqual(res.data?.oldIdNumber, '', 'Padded empty field resolved to empty string');
  assertEqual(res.data?.fullName, 'NGUYỄN VĂN AN', 'Trimmed full name');
  assertEqual(res.data?.address, 'Địa chỉ thường trú', 'Trimmed address');
}

// 6. 6-digit Date Parsing (ddMMyy -> yyyy-MM-dd)
{
  // 95 -> 1995 (yy > 40)
  const qr6DigitOld = '089095012345||NGUYỄN VĂN AN|150895|Nam|An Giang|250421';
  const resOld = parseCccdQrString(qr6DigitOld);
  assert(resOld.valid, '6-digit DOB and Issue Date (150895 & 250421) parsed');
  assertEqual(resOld.data?.dateOfBirth, '1995-08-15', 'DOB 150895 -> 1995-08-15');
  assertEqual(resOld.data?.issueDate, '2021-04-25', 'Issue date 250421 -> 2021-04-25');

  // 05 -> 2005 (yy <= 40)
  const qr6DigitYoung = '089005012345||TRẦN BÉ BI|050405|Nam|An Giang|121023';
  const resYoung = parseCccdQrString(qr6DigitYoung);
  assert(resYoung.valid, '6-digit DOB 050405 parsed');
  assertEqual(resYoung.data?.dateOfBirth, '2005-04-05', 'DOB 050405 -> 2005-04-05');
}

// 7. Gender Normalization
{
  const qrFemale = '089095012345||PHẠM THỊ HOA|15081995|Female|Hà Nội|25042021';
  const resFemale = parseCccdQrString(qrFemale);
  assertEqual(resFemale.data?.gender, 'Nữ', 'Female converted to Nữ');

  const qrNu = '089095012345||PHẠM THỊ HOA|15081995|nữ|Hà Nội|25042021';
  const resNu = parseCccdQrString(qrNu);
  assertEqual(resNu.data?.gender, 'Nữ', 'lowercase "nữ" converted to Nữ');

  const qrNam = '089095012345||NGUYỄN VĂN AN|15081995|NAM|Hà Nội|25042021';
  const resNam = parseCccdQrString(qrNam);
  assertEqual(resNam.data?.gender, 'Nam', 'uppercase "NAM" converted to Nam');
}

// 8. Vietnamese Complex Diacritics
{
  const complexName = 'ĐẶNG NGUYỄN HOÀNG PHƯƠNG THẢO';
  const complexAddress = 'Thôn 4, Xã Ea Ktur, Huyện Cư Kuin, Tỉnh Đắk Lắk';
  const qr = `066195000123||${complexName}|15081995|Nữ|${complexAddress}|25042021`;
  const res = parseCccdQrString(qr);
  assert(res.valid, 'Vietnamese complex diacritics parsed cleanly');
  assertEqual(res.data?.fullName, complexName, 'Full name with complex diacritics');
  assertEqual(res.data?.address, complexAddress, 'Address with complex diacritics');
}

// 9. Adversarial Rejections of Invalid QR Payloads
{
  // Null or empty
  assert(!parseCccdQrString(null).valid, 'Null input rejected');
  assert(!parseCccdQrString('').valid, 'Empty string rejected');
  assert(!parseCccdQrString(123456).valid, 'Number input rejected');

  // Less than 6 fields (5 fields)
  assert(!parseCccdQrString('089095012345|251000123|NGUYỄN VĂN AN|15081995|Nam').valid,
    '5 fields rejected (< 6 parts)');

  // More than 7 fields (8 fields)
  assert(!parseCccdQrString('089095012345|251000123|NGUYỄN VĂN AN|15081995|Nam|Địa chỉ|25042021|ExtraField').valid,
    '8 fields rejected (> 7 parts)');

  // Non-12-digit CCCD
  assert(!parseCccdQrString('08909501234|251000123|NGUYỄN VĂN AN|15081995|Nam|Địa chỉ|25042021').valid,
    '11-digit CCCD rejected');
  assert(!parseCccdQrString('0890950123456|251000123|NGUYỄN VĂN AN|15081995|Nam|Địa chỉ|25042021').valid,
    '13-digit CCCD rejected');
  assert(!parseCccdQrString('08909501234A|251000123|NGUYỄN VĂN AN|15081995|Nam|Địa chỉ|25042021').valid,
    'Alphanumeric CCCD rejected');

  // Invalid DOB
  assert(!parseCccdQrString('089095012345|251000123|NGUYỄN VĂN AN|1508199|Nam|Địa chỉ|25042021').valid,
    '7-digit DOB rejected');
}

// -------------------------------------------------------------
// SECTION 2: DISCREPANCY DETECTION MATRIX (F7)
// -------------------------------------------------------------
console.log('\n--- SECTION 2: Discrepancy Detection Matrix (F7) ---');

const baseQrData = {
  cccdNumber: '089095012345',
  oldIdNumber: '251000123',
  fullName: 'NGUYỄN VĂN AN',
  dateOfBirth: '1995-08-15',
  gender: 'Nam',
  address: 'Số 18 Đường Trần Hưng Đạo, TP Long Xuyên, An Giang',
  issueDate: '2021-04-25',
  rawQr: 'mock',
};

// 1. Identical typed data -> 0 discrepancies
{
  const discrepancies = detectDiscrepancies(baseQrData, {
    cccd: '089095012345',
    fullName: 'NGUYỄN VĂN AN',
    dob: '1995-08-15',
    gender: 'Nam',
    address: 'Số 18 Đường Trần Hưng Đạo, TP Long Xuyên, An Giang',
  });
  assertEqual(discrepancies.length, 0, 'Exact match yields 0 discrepancies');
}

// 2. Full Name Case Sensitivity Difference -> WARNING
{
  const discrepancies = detectDiscrepancies(baseQrData, {
    fullName: 'Nguyễn Văn An',
  });
  assertEqual(discrepancies.length, 1, 'Case difference yields 1 discrepancy');
  assertEqual(discrepancies[0].fieldKey, 'fullName', 'Discrepancy field is fullName');
  assertEqual(discrepancies[0].level, 'WARNING', 'Case difference level is WARNING');
}

// 3. Full Name Mismatch -> CONFLICT
{
  const discrepancies = detectDiscrepancies(baseQrData, {
    fullName: 'TRẦN VĂN BÌNH',
  });
  assertEqual(discrepancies.length, 1, 'Name mismatch yields 1 discrepancy');
  assertEqual(discrepancies[0].level, 'CONFLICT', 'Name mismatch level is CONFLICT');
}

// 4. CCCD Number Mismatch -> CONFLICT
{
  const discrepancies = detectDiscrepancies(baseQrData, {
    cccd: '079095099999',
  });
  assertEqual(discrepancies.length, 1, 'CCCD mismatch yields 1 discrepancy');
  assertEqual(discrepancies[0].fieldKey, 'cccdNumber', 'Field key');
  assertEqual(discrepancies[0].level, 'CONFLICT', 'CCCD mismatch level is CONFLICT');
}

// 5. Date of Birth Mismatch -> CONFLICT
{
  const discrepancies = detectDiscrepancies(baseQrData, {
    dob: '1995-08-20',
  });
  assertEqual(discrepancies.length, 1, 'DOB mismatch yields 1 discrepancy');
  assertEqual(discrepancies[0].fieldKey, 'dateOfBirth', 'Field key');
  assertEqual(discrepancies[0].level, 'CONFLICT', 'DOB mismatch level is CONFLICT');
}

// 6. Gender Mismatch -> CONFLICT
{
  const discrepancies = detectDiscrepancies(baseQrData, {
    gender: 'Nữ',
  });
  assertEqual(discrepancies.length, 1, 'Gender mismatch yields 1 discrepancy');
  assertEqual(discrepancies[0].fieldKey, 'gender', 'Field key');
  assertEqual(discrepancies[0].level, 'CONFLICT', 'Gender mismatch level is CONFLICT');
}

// 7. Address Difference -> WARNING (non-fatal)
{
  const discrepancies = detectDiscrepancies(baseQrData, {
    address: 'Số 18 Trần Hưng Đạo, Long Xuyên, An Giang',
  });
  assertEqual(discrepancies.length, 1, 'Address difference yields 1 discrepancy');
  assertEqual(discrepancies[0].fieldKey, 'address', 'Field key');
  assertEqual(discrepancies[0].level, 'WARNING', 'Address difference level is WARNING (not blocking)');
}

// 8. Empty or undefined form data -> No false positives
{
  const discrepancies = detectDiscrepancies(baseQrData, {});
  assertEqual(discrepancies.length, 0, 'Empty form data yields 0 discrepancies');
}

// -------------------------------------------------------------
// SUMMARY SCOREBOARD
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`CHALLENGER 1 ADVERSARIAL TEST RESULTS:`);
console.log(`Passed: ${passedAssertions} | Failed: ${failedAssertions}`);
console.log('================================================================');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  console.log('ALL ADVERSARIAL STRESS ASSERTIONS PASSED 100%!');
}
