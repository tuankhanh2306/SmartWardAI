import assert from 'node:assert';

console.log('================================================================');
console.log('SMARTWARD AI - ROLE GATEWAY & 5-MIN SESSION REGRESSION TEST SUITE');
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
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Replicate RoleContext logic under test
function evaluateSessionState(storage, now = Date.now()) {
  const expiresAtStr = storage.getItem('smartward_session_expires_at');
  const roleStr = storage.getItem('smartward_user_role');
  const token = storage.getItem('smartward_officer_token');

  if (!expiresAtStr || !roleStr) {
    return { role: null, isOfficer: false, isCitizen: false, isExpired: false };
  }

  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || now >= expiresAt) {
    // 5-min session timeout expired!
    return { role: null, isOfficer: false, isCitizen: false, isExpired: true };
  }

  if ((roleStr === 'officer' || roleStr === 'OFFICER') && token && !token.startsWith('pending_sync_')) {
    return { role: 'officer', isOfficer: true, isCitizen: false, isExpired: false };
  }

  if (roleStr === 'citizen' || roleStr === 'CITIZEN') {
    return { role: 'citizen', isOfficer: false, isCitizen: true, isExpired: false };
  }

  return { role: null, isOfficer: false, isCitizen: false, isExpired: false };
}

function enterAsCitizen(storage, now = Date.now()) {
  storage.setItem('smartward_user_role', 'citizen');
  storage.setItem('smartward_session_expires_at', now + SESSION_TIMEOUT_MS);
  storage.removeItem('smartward_officer_token');
  storage.removeItem('smartward_officer_badge');
  storage.removeItem('smartward_officer_profile');
}

function loginOfficer(storage, token, badgeId, now = Date.now()) {
  if (!token || token.startsWith('pending_sync_')) {
    return false;
  }
  storage.setItem('smartward_user_role', 'officer');
  storage.setItem('smartward_session_expires_at', now + SESSION_TIMEOUT_MS);
  storage.setItem('smartward_officer_token', token);
  storage.setItem('smartward_officer_badge', badgeId);
  return true;
}

function evaluateRouteAccess(targetPath, session) {
  // Path rules:
  // / -> accessible to all (gateway)
  // /citizen/* -> only citizen role
  // /officer/* -> only officer role
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

it('Unauthenticated user navigating to /officer/ward/70101 must be redirected to /', () => {
  mockStorage.clear();
  const state = evaluateSessionState(mockStorage);
  const check = evaluateRouteAccess('/officer/ward/70101', state);
  assert.strictEqual(check.allowed, false);
  assert.strictEqual(check.redirect, '/');
});

// --- SUITE 2: Citizen Login & Strict Boundaries ---
console.log('\n--- SCENARIO 2: Citizen Role Authorization & Isolation ---');

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

it('Citizen role is granted access to /citizen and subroutes', () => {
  const now = 1000000;
  const state = evaluateSessionState(mockStorage, now);
  assert.strictEqual(evaluateRouteAccess('/citizen', state).allowed, true);
  assert.strictEqual(evaluateRouteAccess('/citizen/procedures', state).allowed, true);
  assert.strictEqual(evaluateRouteAccess('/citizen/form', state).allowed, true);
});

it('Citizen role is strictly blocked from /officer routes', () => {
  const now = 1000000;
  const state = evaluateSessionState(mockStorage, now);
  const check = evaluateRouteAccess('/officer/ward/70101', state);
  assert.strictEqual(check.allowed, false);
  assert.strictEqual(check.reason, 'CITIZEN_FORBIDDEN');
});

// --- SUITE 3: Officer Login & Strict Boundaries ---
console.log('\n--- SCENARIO 3: Officer Role Authorization & Isolation ---');

it('Officer login rejects fake placeholder token pending_sync_...', () => {
  mockStorage.clear();
  const ok = loginOfficer(mockStorage, 'pending_sync_mock_jwt', 'CC-AG-8942');
  assert.strictEqual(ok, false);
  const state = evaluateSessionState(mockStorage);
  assert.strictEqual(state.role, null);
});

it('Officer login with verified JWT grants officer role with 5-min session', () => {
  mockStorage.clear();
  const now = 2000000;
  const ok = loginOfficer(mockStorage, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real_jwt', 'CC-AG-8942', now);
  assert.strictEqual(ok, true);
  const state = evaluateSessionState(mockStorage, now);
  assert.strictEqual(state.role, 'officer');
  assert.strictEqual(state.isOfficer, true);
  assert.strictEqual(state.isCitizen, false);
  assert.strictEqual(mockStorage.getItem('smartward_session_expires_at'), String(now + 300000));
});

it('Officer role is granted access to /officer/ward/:code and /officer/audit', () => {
  const now = 2000000;
  const state = evaluateSessionState(mockStorage, now);
  assert.strictEqual(evaluateRouteAccess('/officer/ward/70101', state).allowed, true);
  assert.strictEqual(evaluateRouteAccess('/officer/audit', state).allowed, true);
  assert.strictEqual(evaluateRouteAccess('/officer/map', state).allowed, true);
});

it('Officer role is blocked from jumping into /citizen via URL without explicit role change', () => {
  const now = 2000000;
  const state = evaluateSessionState(mockStorage, now);
  const check = evaluateRouteAccess('/citizen', state);
  assert.strictEqual(check.allowed, false);
  assert.strictEqual(check.reason, 'CROSSOVER_BLOCKED');
});

// --- SUITE 4: 5-Minute Timeout Invalidation ---
console.log('\n--- SCENARIO 4: 5-Minute Inactivity / Session Expiration Guard ---');

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

it('Active officer session expires exactly after 5 minutes (300,000ms)', () => {
  mockStorage.clear();
  const loginTime = 2000000;
  loginOfficer(mockStorage, 'valid_token_xyz', 'CC-AG-8942', loginTime);

  // 4 minutes 59 seconds: Still active
  const tValid = loginTime + (4 * 60 + 59) * 1000;
  const sValid = evaluateSessionState(mockStorage, tValid);
  assert.strictEqual(sValid.role, 'officer');
  assert.strictEqual(sValid.isExpired, false);

  // 5 minutes 0 seconds: Expired!
  const tExpired = loginTime + 300000;
  const sExpired = evaluateSessionState(mockStorage, tExpired);
  assert.strictEqual(sExpired.role, null);
  assert.strictEqual(sExpired.isExpired, true);
});

it('Expired session must be blocked from accessing protected citizen or officer routes', () => {
  const expiredState = { role: null, isOfficer: false, isCitizen: false, isExpired: true };
  assert.strictEqual(evaluateRouteAccess('/citizen', expiredState).allowed, false);
  assert.strictEqual(evaluateRouteAccess('/officer/ward/70101', expiredState).allowed, false);
  assert.strictEqual(evaluateRouteAccess('/', expiredState).allowed, true); // Must land on gateway
});

console.log('\n================================================================');
console.log(`ROLE GATEWAY TEST RESULTS: Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL ROLE GATEWAY & 5-MIN SESSION TESTS PASSED!\n');
  process.exit(0);
}
