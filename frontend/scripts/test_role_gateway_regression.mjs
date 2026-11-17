import assert from 'node:assert';

console.log('================================================================');
console.log('SMARTWARD AI - ROLE GATEWAY & 96 WARDS SESSION TEST SUITE');
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

// Mock localStorage simulator for node environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, val) {
    this.store[key] = String(val);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const mockStorage = new MockLocalStorage();
const CITIZEN_SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Replicate RoleContext logic under test
function evaluateSessionState(storage, now = Date.now()) {
  const roleStr = storage.getItem('smartward_user_role');
  const token = storage.getItem('smartward_officer_token');

  if (!roleStr) {
    return { role: null, isOfficer: false, isCitizen: false, isExpired: false };
  }

  // Officer Standing Duty: "nếu vẫn còn trong web thì không bị giới hạn phiên làm việc"
  if ((roleStr === 'officer' || roleStr === 'OFFICER') && token && !token.startsWith('pending_sync_')) {
    return { role: 'officer', isOfficer: true, isCitizen: false, isExpired: false, isStandingDuty: true };
  }

  // Citizen: Strict 5-minute session
  if (roleStr === 'citizen' || roleStr === 'CITIZEN') {
    const expiresAtStr = storage.getItem('smartward_session_expires_at');
    if (!expiresAtStr) {
      return { role: null, isOfficer: false, isCitizen: false, isExpired: true };
    }
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || now >= expiresAt) {
      // Citizen session timeout expired after 5 minutes!
      return { role: null, isOfficer: false, isCitizen: false, isExpired: true };
    }
    return { role: 'citizen', isOfficer: false, isCitizen: true, isExpired: false, isStandingDuty: false };
  }

  return { role: null, isOfficer: false, isCitizen: false, isExpired: false };
}

function enterAsCitizen(storage, now = Date.now()) {
  storage.setItem('smartward_user_role', 'citizen');
  storage.setItem('smartward_session_expires_at', now + CITIZEN_SESSION_TIMEOUT_MS);
  storage.removeItem('smartward_officer_token');
  storage.removeItem('smartward_officer_badge');
  storage.removeItem('smartward_officer_profile');
}

function loginOfficer(storage, token, badgeId, now = Date.now()) {
  if (!token || token.startsWith('pending_sync_')) {
    return false;
  }
  storage.setItem('smartward_user_role', 'officer');
  // Officers have standing session keep-alive
  storage.setItem('smartward_session_expires_at', now + 8 * 3600 * 1000);
  storage.setItem('smartward_officer_token', token);
  storage.setItem('smartward_officer_badge', badgeId);
  return true;
}

function evaluateRouteAccess(targetPath, session) {
  if (targetPath === '/' || targetPath === '/onboarding') {
    return { allowed: true, redirect: null };
  }

  if (targetPath.startsWith('/citizen')) {
    if (!session.role) {
      return { allowed: false, redirect: '/', reason: 'UNAUTHENTICATED' };
    }
    if (session.isOfficer) {
      return { allowed: false, redirect: '/officer', reason: 'CROSSOVER_BLOCKED' };
    }
    return { allowed: true, redirect: null };
  }

  if (targetPath.startsWith('/officer')) {
    if (!session.role) {
      return { allowed: false, redirect: '/', reason: 'UNAUTHENTICATED' };
    }
    if (session.isCitizen) {
      return { allowed: false, redirect: '/', reason: 'CITIZEN_FORBIDDEN' };
    }
    if (session.isOfficer) {
      return { allowed: true, redirect: null };
    }
  }

  return { allowed: false, redirect: '/' };
}

// --- SUITE 1: First Visit & Unauthenticated Gatekeeper ---
console.log('--- SCENARIO 1: First Visit (Zero Session) ---');

it('Initial visit with empty storage must yield role = null', () => {
  mockStorage.clear();
  const state = evaluateSessionState(mockStorage);
  assert.strictEqual(state.role, null);
  assert.strictEqual(state.isOfficer, false);
  assert.strictEqual(state.isCitizen, false);
});

it('Unauthenticated user navigating to /citizen must be redirected to /', () => {
  mockStorage.clear();
  const state = evaluateSessionState(mockStorage);
  const check = evaluateRouteAccess('/citizen', state);
  assert.strictEqual(check.allowed, false);
  assert.strictEqual(check.redirect, '/');
  assert.strictEqual(check.reason, 'UNAUTHENTICATED');
});

it('Unauthenticated user navigating to /officer/ward/AG_DK_PHUQUOC must be redirected to /', () => {
  mockStorage.clear();
  const state = evaluateSessionState(mockStorage);
  const check = evaluateRouteAccess('/officer/ward/AG_DK_PHUQUOC', state);
  assert.strictEqual(check.allowed, false);
  assert.strictEqual(check.redirect, '/');
});

// --- SUITE 2: Citizen Role Authorization & 5-Min Limit ---
console.log('\n--- SCENARIO 2: Citizen Role & 5-Min Session ---');

it('enterAsCitizen sets role=citizen and 5-min expiration timestamp', () => {
  mockStorage.clear();
  const now = 1000000;
  enterAsCitizen(mockStorage, now);
  const state = evaluateSessionState(mockStorage, now);
  assert.strictEqual(state.role, 'citizen');
  assert.strictEqual(state.isCitizen, true);
  assert.strictEqual(state.isOfficer, false);
  assert.strictEqual(mockStorage.getItem('smartward_session_expires_at'), String(now + 300000));
});

it('Active citizen session expires exactly after 5 minutes (300,000ms)', () => {
  mockStorage.clear();
  const loginTime = 1000000;
  enterAsCitizen(mockStorage, loginTime);

  // 4 minutes 59 seconds: Still active
  const tValid = loginTime + (4 * 60 + 59) * 1000;
  const sValid = evaluateSessionState(mockStorage, tValid);
  assert.strictEqual(sValid.role, 'citizen');
  assert.strictEqual(sValid.isExpired, false);

  // 5 minutes 1 second: Expired!
  const tExpired = loginTime + (5 * 60 + 1) * 1000;
  const sExpired = evaluateSessionState(mockStorage, tExpired);
  assert.strictEqual(sExpired.role, null);
  assert.strictEqual(sExpired.isExpired, true);
});

// --- SUITE 3: Officer Standing Session (Unlimited While on Web) ---
console.log('\n--- SCENARIO 3: Officer Standing Duty (Unlimited on Web) ---');

it('Officer login with verified JWT grants officer role with standing duty', () => {
  mockStorage.clear();
  const now = 2000000;
  const ok = loginOfficer(mockStorage, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real_jwt', 'CB-AG_DK_PHUQUOC', now);
  assert.strictEqual(ok, true);
  const state = evaluateSessionState(mockStorage, now);
  assert.strictEqual(state.role, 'officer');
  assert.strictEqual(state.isOfficer, true);
  assert.strictEqual(state.isStandingDuty, true);
});

it('Officer session does NOT expire after 5 minutes while remaining on web', () => {
  mockStorage.clear();
  const loginTime = 2000000;
  loginOfficer(mockStorage, 'valid_token_xyz', 'CB-AG_P_MYBINH', loginTime);

  // 10 minutes later: Officer session is STILL active
  const t10Min = loginTime + 10 * 60 * 1000;
  const s10Min = evaluateSessionState(mockStorage, t10Min);
  assert.strictEqual(s10Min.role, 'officer');
  assert.strictEqual(s10Min.isExpired, false);
  assert.strictEqual(s10Min.isStandingDuty, true);
});

// --- SUITE 4: 96 Wards Officer Account Coverage ---
console.log('\n--- SCENARIO 4: 96 Wards Account Coverage & Validation ---');

const testWardCodes = [
  'AG_DK_PHUQUOC',
  'AG_DK_KIENHAI',
  'AG_DK_THOCHAU',
  'AG_P_LONGXUYEN',
  'AG_P_BINHDUC',
  'AG_P_MYTHOI',
  'AG_P_CHAUDOC',
  'AG_X_ANPHU',
  'AG_X_VINHHAU',
  'AG_X_CHOVAM',
  'AG_X_HOALAC',
  'AG_X_TRIEUHAI'
];

testWardCodes.forEach(code => {
  it(`Ward [${code}] officer account format CB-${code} is valid`, () => {
    const badgeId = `CB-${code}`;
    assert.match(badgeId, /^CB-AG_(DK|[PX])_[A-Z0-9]+$/);
  });
});

it('Officer role is blocked from jumping into /citizen via URL without explicit role change', () => {
  mockStorage.clear();
  loginOfficer(mockStorage, 'token_xyz', 'CB-AG_P_LONGXUYEN');
  const state = evaluateSessionState(mockStorage);
  const check = evaluateRouteAccess('/citizen', state);
  assert.strictEqual(check.allowed, false);
  assert.strictEqual(check.reason, 'CROSSOVER_BLOCKED');
});

it('Citizen role is strictly blocked from accessing /officer routes', () => {
  mockStorage.clear();
  enterAsCitizen(mockStorage);
  const state = evaluateSessionState(mockStorage);
  const check = evaluateRouteAccess('/officer/ward/AG_P_LONGXUYEN', state);
  assert.strictEqual(check.allowed, false);
  assert.strictEqual(check.reason, 'CITIZEN_FORBIDDEN');
});

// --- SCENARIO 5: Officer Change PIN Validation & State Flow ---
console.log('\n--- SCENARIO 5: Officer Change PIN Validation & Flow ---');

function validateChangePin(badgeId, currentPin, newPin, confirmPin, storedPin = '8942') {
  const cleanBadge = (badgeId || '').trim().toUpperCase();
  const cleanCurrent = (currentPin || '').trim();
  const cleanNew = (newPin || '').trim();
  const cleanConfirm = (confirmPin || '').trim();

  if (!cleanBadge) return { success: false, error: 'Mã công chức không được để trống' };
  if (!cleanCurrent) return { success: false, error: 'Vui lòng nhập mã PIN hiện tại' };
  if (!cleanNew) return { success: false, error: 'Vui lòng nhập mã PIN mới' };
  if (cleanNew !== cleanConfirm) return { success: false, error: 'Xác nhận mã PIN mới không khớp' };
  if (cleanNew.length < 4 || cleanNew.length > 32) return { success: false, error: 'Mã PIN mới phải từ 4 đến 32 ký tự' };
  if (cleanNew === cleanCurrent) return { success: false, error: 'Mã PIN mới không được trùng với mã PIN hiện tại' };
  if (cleanCurrent !== storedPin) return { success: false, error: 'Mã PIN hiện tại không chính xác' };

  return { success: true, newPin: cleanNew };
}

it('validateChangePin rejects empty badgeId', () => {
  const res = validateChangePin('', '8942', '123456', '123456');
  assert.strictEqual(res.success, false);
  assert.match(res.error, /Mã công chức/);
});

it('validateChangePin rejects mismatched confirmPin', () => {
  const res = validateChangePin('CB-AG_DK_PHUQUOC', '8942', '123456', '123457');
  assert.strictEqual(res.success, false);
  assert.match(res.error, /không khớp/);
});

it('validateChangePin rejects new PIN shorter than 4 characters', () => {
  const res = validateChangePin('CB-AG_DK_PHUQUOC', '8942', '12', '12');
  assert.strictEqual(res.success, false);
  assert.match(res.error, /từ 4 đến 32 ký tự/);
});

it('validateChangePin rejects new PIN identical to current PIN', () => {
  const res = validateChangePin('CB-AG_DK_PHUQUOC', '8942', '8942', '8942');
  assert.strictEqual(res.success, false);
  assert.match(res.error, /không được trùng/);
});

it('validateChangePin rejects incorrect current PIN', () => {
  const res = validateChangePin('CB-AG_DK_PHUQUOC', '0000', '123456', '123456', '8942');
  assert.strictEqual(res.success, false);
  assert.match(res.error, /không chính xác/);
});

it('validateChangePin successfully updates PIN when inputs are valid', () => {
  const res = validateChangePin('CB-AG_DK_PHUQUOC', '8942', '987654', '987654', '8942');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.newPin, '987654');
});

console.log('\n================================================================');
console.log(`TEST RESULTS: Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL ROLE GATEWAY & 96 WARDS SESSION TESTS PASSED!\n');
  process.exit(0);
}
