import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const currentFile = fileURLToPath(import.meta.url);

if (!process.env.SMARTWARD_TSX_ACTIVE) {
  const rootDir = path.resolve(path.dirname(currentFile), '../..');
  const loaderPath = path.resolve(rootDir, 'frontend/node_modules/tsx/dist/loader.mjs');
  if (fs.existsSync(loaderPath)) {
    const res = spawnSync(
      process.execPath,
      ['--import', pathToFileURL(loaderPath).href, currentFile, ...process.argv.slice(2)],
      {
        stdio: 'inherit',
        env: { ...process.env, SMARTWARD_TSX_ACTIVE: '1' },
      }
    );
    process.exit(res.status ?? 0);
  }
}

const {
  officerLoginSchema,
  citizenDossierFormSchema,
  civicIncidentSchema,
  dossierTrackingSchema,
  extractZodFieldErrors,
} = await import('../src/schemas/formValidation.js');

console.log('================================================================');
console.log('SMARTWARD AI - ZOD FORM VALIDATION SCHEMAS TEST SUITE');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${desc}: ${err.message}`);
    failCount++;
  }
}

// 1. officerLoginSchema
it('officerLoginSchema accepts valid badgeId and pin', () => {
  const res = officerLoginSchema.safeParse({ badgeId: 'CB-AG_P_LONGXUYEN', pin: 'SmartWard2026!' });
  assert.strictEqual(res.success, true);
});

it('officerLoginSchema rejects empty badgeId and pin with field-level messages', () => {
  const res = officerLoginSchema.safeParse({ badgeId: '  ', pin: '' });
  assert.strictEqual(res.success, false);
  const errs = extractZodFieldErrors(res.error);
  assert.strictEqual(errs.badgeId, 'Vui lòng nhập Mã số thẻ công chức / quản trị.');
  assert.strictEqual(errs.pin, 'Vui lòng nhập Mã PIN công vụ.');
});

it('officerLoginSchema rejects short badgeId (< 3 chars)', () => {
  const res = officerLoginSchema.safeParse({ badgeId: 'AB', pin: '123456' });
  assert.strictEqual(res.success, false);
  const errs = extractZodFieldErrors(res.error);
  assert.strictEqual(errs.badgeId, 'Mã thẻ phải có ít nhất 3 ký tự.');
});

// 2. citizenDossierFormSchema
it('citizenDossierFormSchema accepts complete valid citizen dossier inputs', () => {
  const res = citizenDossierFormSchema.safeParse({
    fullName: 'NGUYỄN VĂN AN',
    cccd: '089092003456',
    dob: '1992-10-10',
    address: 'Ấp Vĩnh Hòa, Phường Long Xuyên, Tỉnh An Giang',
    phoneNumber: '0918234567',
    citizenEmail: 'congdan.angiang@gmail.com',
  });
  assert.strictEqual(res.success, true);
});

it('citizenDossierFormSchema catches invalid CCCD, phone, email, and missing fields', () => {
  const res = citizenDossierFormSchema.safeParse({
    fullName: 'An',
    cccd: '12345',
    dob: '',
    address: 'Abc',
    phoneNumber: '1234567890',
    citizenEmail: 'not-an-email',
  });
  assert.strictEqual(res.success, false);
  const errs = extractZodFieldErrors(res.error);
  assert.ok(errs.fullName);
  assert.ok(errs.cccd);
  assert.ok(errs.dob);
  assert.ok(errs.address);
  assert.ok(errs.phoneNumber);
  assert.ok(errs.citizenEmail);
});

// 3. civicIncidentSchema
it('civicIncidentSchema accepts valid GPS incident report with empty optional phone', () => {
  const res = civicIncidentSchema.safeParse({
    locationSource: 'GPS',
    latitude: 10.386,
    longitude: 105.435,
    description: 'Mặt đường bị sụt lún gây nguy hiểm cho xe máy.',
    reporterPhone: '',
  });
  assert.strictEqual(res.success, true);
});

it('civicIncidentSchema accepts valid VN phone and rejects WARD_DEFAULT, short desc, invalid phone', () => {
  const validPhone = civicIncidentSchema.safeParse({
    locationSource: 'PIN_DRAGGED',
    latitude: 10.386,
    longitude: 105.435,
    description: 'Đèn đường hỏng 3 ngày nay.',
    reporterPhone: '+84 918 234 567',
  });
  assert.strictEqual(validPhone.success, true);

  const invalid = civicIncidentSchema.safeParse({
    locationSource: 'WARD_DEFAULT',
    latitude: Number.NaN,
    longitude: Number.POSITIVE_INFINITY,
    description: 'Hư',
    reporterPhone: 'abc123',
  });
  assert.strictEqual(invalid.success, false);
  const errs = extractZodFieldErrors(invalid.error);
  assert.ok(errs.locationSource);
  assert.ok(errs.latitude);
  assert.ok(errs.longitude);
  assert.ok(errs.description);
  assert.ok(errs.reporterPhone);
});

// 4. dossierTrackingSchema
it('dossierTrackingSchema accepts 4-digit or 12-digit CCCD with valid code', () => {
  assert.strictEqual(
    dossierTrackingSchema.safeParse({ dossierCode: 'HS-20261111-0001', last4Cccd: '3456' }).success,
    true
  );
  assert.strictEqual(
    dossierTrackingSchema.safeParse({ dossierCode: 'HS-20261111-0001', last4Cccd: '089092003456' }).success,
    true
  );
});

it('dossierTrackingSchema rejects empty code and invalid CCCD length', () => {
  const res = dossierTrackingSchema.safeParse({ dossierCode: 'HS', last4Cccd: '12345' });
  assert.strictEqual(res.success, false);
  const errs = extractZodFieldErrors(res.error);
  assert.ok(errs.dossierCode);
  assert.ok(errs.last4Cccd);
});

console.log('\n================================================================');
console.log(`ZOD TEST RESULTS: Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
}
console.log('🎉 ALL ZOD VALIDATION SCHEMA TESTS PASSED!\n');
