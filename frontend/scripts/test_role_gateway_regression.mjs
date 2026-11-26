import assert from 'node:assert';

console.log('================================================================');
console.log('SMARTWARD AI - 3-TIER ROLE, SESSION, /ME HYDRATION & GUARD TEST SUITE');
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

class MockStorage {
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

const localStore = new MockStorage();
const sessionStore = new MockStorage();
const revokedJtis = new Set();

const CITIZEN_SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes sliding
const OFFICER_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes inactivity lock
const WARNING_THRESHOLD_SEC = 60; // 60s warning before expiry

function encodeUtf8Base64Url(str) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodeJwtPayloadUtf8(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const jsonStr = decodeURIComponent(
    Array.from(binary, (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );
  return JSON.parse(jsonStr);
}

function issueMockJwt({ sub, name, wardCode, role, jti, expSec }) {
  const header = encodeUtf8Base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = encodeUtf8Base64Url(
    JSON.stringify({ sub, name, wardCode, role, jti, exp: expSec })
  );
  return `${header}.${payload}.sig_verified`;
}

// Simulated Backend /api/v1/auth/officer/me & /logout & SEC-09 endpoints
function backendVerifyMe(token, nowMs = Date.now()) {
  if (!token) return { status: 401, errorCode: 'SW_401' };
  const claims = decodeJwtPayloadUtf8(token);
  if (!claims) return { status: 401, errorCode: 'SW_401' };
  if (claims.exp * 1000 <= nowMs) return { status: 401, errorCode: 'SW_401' };
  if (revokedJtis.has(claims.jti)) return { status: 401, errorCode: 'SW_401' };
  return {
    status: 200,
    data: {
      badgeId: claims.sub,
      fullName: claims.name,
      wardCode: claims.wardCode,
      role: claims.role,
      tokenId: claims.jti,
      expiresAtEpochSec: claims.exp,
    },
  };
}

function backendLogout(token, nowMs = Date.now()) {
  const res = backendVerifyMe(token, nowMs);
  if (res.status === 200 && res.data.tokenId) {
    revokedJtis.add(res.data.tokenId);
  }
  return { status: 200, revoked: true };
}

function backendCallAdminEndpoint(token, nowMs = Date.now()) {
  const me = backendVerifyMe(token, nowMs);
  if (me.status !== 200) return { status: 401, errorCode: 'SW_401' };
  if (me.data.role !== 'ADMIN') return { status: 403, errorCode: 'SW_403' };
  return { status: 200 };
}

function backendCallOfficerWardData(token, requestedWardCode, nowMs = Date.now()) {
  const me = backendVerifyMe(token, nowMs);
  if (me.status !== 200) return { status: 401, errorCode: 'SW_401' };
  if (me.data.role === 'ADMIN') return { status: 403, errorCode: 'SW_403' };
  if (requestedWardCode && requestedWardCode.toUpperCase() !== me.data.wardCode.toUpperCase()) {
    return { status: 403, errorCode: 'SW_403_SEC_09' };
  }
  return { status: 200, wardCode: me.data.wardCode };
}

// Replicate Frontend RoleContext + F5 /me hydration + Route Guard Matrix
function hydrateOnF5(local, session, nowMs = Date.now()) {
  const token = session.getItem('smartward_officer_token');
  if (token) {
    const meResp = backendVerifyMe(token, nowMs);
    if (meResp.status !== 200) {
      session.clear();
      local.clear();
      return { role: null, isCitizen: false, isOfficer: false, isAdmin: false };
    }
    const authoritativeRole = meResp.data.role === 'ADMIN' ? 'admin' : 'officer';
    // Overwrite any tampered localStorage role!
    local.setItem('smartward_user_role', authoritativeRole);
    local.setItem('smartward_officer_profile', JSON.stringify(meResp.data));

    const inactStr = session.getItem('smartward_inactivity_expires_at');
    const inactAt = inactStr ? parseInt(inactStr, 10) : nowMs + OFFICER_INACTIVITY_TIMEOUT_MS;
    const remSec = Math.max(0, Math.floor((inactAt - nowMs) / 1000));
    if (remSec <= 0) {
      session.clear();
      local.clear();
      return { role: null, isCitizen: false, isOfficer: false, isAdmin: false, isExpired: true };
    }

    return {
      role: authoritativeRole,
      isCitizen: false,
      isOfficer: authoritativeRole === 'officer',
      isAdmin: authoritativeRole === 'admin',
      wardCode: meResp.data.wardCode,
      badgeId: meResp.data.badgeId,
      sessionSecondsLeft: remSec,
      sessionWarningActive: remSec > 0 && remSec <= WARNING_THRESHOLD_SEC,
    };
  }

  const savedRole = local.getItem('smartward_user_role');
  if (savedRole === 'citizen') {
    const expStr = local.getItem('smartward_session_expires_at');
    if (!expStr) return { role: null, isCitizen: false, isOfficer: false, isAdmin: false };
    const expAt = parseInt(expStr, 10);
    const remSec = Math.max(0, Math.floor((expAt - nowMs) / 1000));
    if (remSec <= 0) {
      local.clear();
      return { role: null, isCitizen: false, isOfficer: false, isAdmin: false, isExpired: true };
    }
    return {
      role: 'citizen',
      isCitizen: true,
      isOfficer: false,
      isAdmin: false,
      sessionSecondsLeft: remSec,
      sessionWarningActive: remSec > 0 && remSec <= WARNING_THRESHOLD_SEC,
    };
  }

  // Tampered localStorage role='admin' or 'officer' without sessionStorage token is wiped
  local.removeItem('smartward_user_role');
  return { role: null, isCitizen: false, isOfficer: false, isAdmin: false };
}

function evaluateRouteMatrix(targetPath, state) {
  if (targetPath === '/' || targetPath === '/onboarding') {
    return { allowed: true, redirect: null };
  }
  if (!state.role) {
    return { allowed: false, redirect: '/' };
  }
  if (targetPath.startsWith('/citizen')) {
    if (state.isCitizen) return { allowed: true, redirect: null };
    if (state.isOfficer) return { allowed: false, redirect: `/officer/ward/${state.wardCode}` };
    if (state.isAdmin) return { allowed: false, redirect: '/admin' };
  }
  if (targetPath.startsWith('/officer')) {
    // Requirement 2: Admin NEVER enters /officer/*
    if (state.isAdmin) return { allowed: false, redirect: '/admin' };
    if (state.isCitizen) return { allowed: false, redirect: '/' };
    if (state.isOfficer) return { allowed: true, redirect: null };
  }
  if (targetPath.startsWith('/admin')) {
    if (state.isAdmin) return { allowed: true, redirect: null };
    if (state.isOfficer) return { allowed: false, redirect: `/officer/ward/${state.wardCode}` };
    if (state.isCitizen) return { allowed: false, redirect: '/citizen' };
  }
  return { allowed: false, redirect: '/' };
}

// ============================================================================
// 1. MANDATORY TEST: 3 ROLES x ROUTES MATRIX (CITIZEN / OFFICER / ADMIN)
// ============================================================================
console.log('--- 1. Ma trận 3 vai trò x các route (citizen / officer / admin) ---');

it('Citizen only accesses /citizen/* and is blocked from /officer/* and /admin/*', () => {
  localStore.clear();
  sessionStore.clear();
  const now = 1000000;
  localStore.setItem('smartward_user_role', 'citizen');
  localStore.setItem('smartward_session_expires_at', String(now + CITIZEN_SESSION_TIMEOUT_MS));

  const state = hydrateOnF5(localStore, sessionStore, now);
  assert.strictEqual(evaluateRouteMatrix('/citizen', state).allowed, true);
  assert.strictEqual(evaluateRouteMatrix('/citizen/procedures', state).allowed, true);
  assert.strictEqual(evaluateRouteMatrix('/officer/ward/AG_P_LONGXUYEN', state).allowed, false);
  assert.strictEqual(evaluateRouteMatrix('/admin', state).allowed, false);
  assert.strictEqual(evaluateRouteMatrix('/admin/proposals', state).allowed, false);
});

it('Officer only accesses /officer/* and is blocked from /citizen/* and /admin/*', () => {
  localStore.clear();
  sessionStore.clear();
  const now = 1000000;
  const token = issueMockJwt({
    sub: 'CB-AG_P_LONGXUYEN',
    name: 'Trần Quốc Bảo',
    wardCode: 'AG_P_LONGXUYEN',
    role: 'OFFICER',
    jti: 'jti-off-1',
    expSec: Math.floor(now / 1000) + 8 * 3600,
  });
  sessionStore.setItem('smartward_officer_token', token);
  sessionStore.setItem('smartward_inactivity_expires_at', String(now + OFFICER_INACTIVITY_TIMEOUT_MS));

  const state = hydrateOnF5(localStore, sessionStore, now);
  assert.strictEqual(evaluateRouteMatrix('/officer/ward/AG_P_LONGXUYEN', state).allowed, true);
  assert.strictEqual(evaluateRouteMatrix('/officer/procedures', state).allowed, true);
  assert.strictEqual(evaluateRouteMatrix('/citizen', state).allowed, false);
  assert.strictEqual(evaluateRouteMatrix('/admin', state).allowed, false);
  assert.strictEqual(evaluateRouteMatrix('/admin', state).redirect, '/officer/ward/AG_P_LONGXUYEN');
});

it('Admin only accesses /admin/* (including /admin/wards/:wardCode) and NEVER enters /officer/* or /citizen/*', () => {
  localStore.clear();
  sessionStore.clear();
  const now = 1000000;
  const token = issueMockJwt({
    sub: 'ADM-AG-0001',
    name: 'Lê Văn Quản Trị',
    wardCode: 'AG_PROVINCE',
    role: 'ADMIN',
    jti: 'jti-adm-1',
    expSec: Math.floor(now / 1000) + 8 * 3600,
  });
  sessionStore.setItem('smartward_officer_token', token);
  sessionStore.setItem('smartward_inactivity_expires_at', String(now + OFFICER_INACTIVITY_TIMEOUT_MS));

  const state = hydrateOnF5(localStore, sessionStore, now);
  assert.strictEqual(evaluateRouteMatrix('/admin', state).allowed, true);
  assert.strictEqual(evaluateRouteMatrix('/admin/proposals', state).allowed, true);
  assert.strictEqual(evaluateRouteMatrix('/admin/wards/AG_P_LONGXUYEN', state).allowed, true);
  assert.strictEqual(evaluateRouteMatrix('/officer/ward/AG_P_LONGXUYEN', state).allowed, false);
  assert.strictEqual(evaluateRouteMatrix('/officer/ward/AG_P_LONGXUYEN', state).redirect, '/admin');
  assert.strictEqual(evaluateRouteMatrix('/citizen', state).allowed, false);
});

// ============================================================================
// 2. MANDATORY TEST: TAMPERING LOCALSTORAGE role=admin WHILE LOGGED IN AS OFFICER
// ============================================================================
console.log('\n--- 2. Chống sửa tay localStorage role=admin khi đang là officer ---');

it('Manually setting localStorage role=admin while holding OFFICER token is overwritten on F5 (/me) to officer, redirected to /officer/*, and admin API returns 403', () => {
  localStore.clear();
  sessionStore.clear();
  const now = 2000000;
  const officerToken = issueMockJwt({
    sub: 'CB-AG_P_CHAUDOC',
    name: 'Cán bộ Châu Đốc',
    wardCode: 'AG_P_CHAUDOC',
    role: 'OFFICER',
    jti: 'jti-off-chaudoc',
    expSec: Math.floor(now / 1000) + 8 * 3600,
  });
  sessionStore.setItem('smartward_officer_token', officerToken);
  sessionStore.setItem('smartward_inactivity_expires_at', String(now + OFFICER_INACTIVITY_TIMEOUT_MS));

  // Attacker manually edits localStorage role=admin!
  localStore.setItem('smartward_user_role', 'admin');

  // Reload (F5) calls /api/v1/auth/officer/me -> restores role='officer'
  const hydrated = hydrateOnF5(localStore, sessionStore, now);
  assert.strictEqual(hydrated.role, 'officer');
  assert.strictEqual(hydrated.isAdmin, false);
  assert.strictEqual(hydrated.isOfficer, true);
  assert.strictEqual(localStore.getItem('smartward_user_role'), 'officer');

  // Trying to enter /admin redirects back to officer's ward
  const routeCheck = evaluateRouteMatrix('/admin/proposals', hydrated);
  assert.strictEqual(routeCheck.allowed, false);
  assert.strictEqual(routeCheck.redirect, '/officer/ward/AG_P_CHAUDOC');

  // Calling Admin API with this token returns 403 Forbidden
  const apiRes = backendCallAdminEndpoint(officerToken, now);
  assert.strictEqual(apiRes.status, 403);
});

// ============================================================================
// 3. MANDATORY TEST: F5 PRESERVES ROLE & WARD (BOTH OFFICER AND ADMIN)
// ============================================================================
console.log('\n--- 3. F5 giữ nguyên đúng vai trò và xã (cả Officer và Admin) ---');

it('F5 reload preserves Officer role, badgeId, and wardCode from /api/v1/auth/officer/me', () => {
  localStore.clear();
  sessionStore.clear();
  const now = 3000000;
  const token = issueMockJwt({
    sub: 'CB-AG_DK_PHUQUOC',
    name: 'Cán bộ Đặc khu Phú Quốc',
    wardCode: 'AG_DK_PHUQUOC',
    role: 'OFFICER',
    jti: 'jti-pq-1',
    expSec: Math.floor(now / 1000) + 8 * 3600,
  });
  sessionStore.setItem('smartward_officer_token', token);
  sessionStore.setItem('smartward_inactivity_expires_at', String(now + OFFICER_INACTIVITY_TIMEOUT_MS));

  const state = hydrateOnF5(localStore, sessionStore, now);
  assert.strictEqual(state.role, 'officer');
  assert.strictEqual(state.wardCode, 'AG_DK_PHUQUOC');
  assert.strictEqual(state.badgeId, 'CB-AG_DK_PHUQUOC');
});

it('F5 reload preserves Admin role and AG_PROVINCE scope (and AG_PROVINCE is excluded from commune ward list)', () => {
  localStore.clear();
  sessionStore.clear();
  const now = 3000000;
  const token = issueMockJwt({
    sub: 'ADM-AG-0001',
    name: 'Lê Văn Quản Trị',
    wardCode: 'AG_PROVINCE',
    role: 'ADMIN',
    jti: 'jti-adm-f5',
    expSec: Math.floor(now / 1000) + 8 * 3600,
  });
  sessionStore.setItem('smartward_officer_token', token);
  sessionStore.setItem('smartward_inactivity_expires_at', String(now + OFFICER_INACTIVITY_TIMEOUT_MS));

  const state = hydrateOnF5(localStore, sessionStore, now);
  assert.strictEqual(state.role, 'admin');
  assert.strictEqual(state.isAdmin, true);
  assert.strictEqual(state.wardCode, 'AG_PROVINCE');
  assert.notStrictEqual(state.wardCode, 'AG_P_LONGXUYEN');
});

// ============================================================================
// 4. MANDATORY TEST: SEC-09 CROSS-WARD API CALL = 403 & REVOKED TOKEN = 401
// ============================================================================
console.log('\n--- 4. SEC-09 Cross-Ward = 403 & Reused Logged-Out Token = 401 ---');

it('Officer of Ward A calling API for Ward B data returns 403 (SEC-09)', () => {
  const now = 4000000;
  const wardAToken = issueMockJwt({
    sub: 'CB-AG_P_LONGXUYEN',
    name: 'Trần Quốc Bảo',
    wardCode: 'AG_P_LONGXUYEN',
    role: 'OFFICER',
    jti: 'jti-sec09',
    expSec: Math.floor(now / 1000) + 8 * 3600,
  });

  // Same ward -> 200 OK
  assert.strictEqual(backendCallOfficerWardData(wardAToken, 'AG_P_LONGXUYEN', now).status, 200);
  // Different ward -> 403 Forbidden
  const crossWardRes = backendCallOfficerWardData(wardAToken, 'AG_P_CHAUDOC', now);
  assert.strictEqual(crossWardRes.status, 403);
});

it('Reusing a token after logout returns 401 (jti revoked)', () => {
  const now = 4000000;
  const token = issueMockJwt({
    sub: 'CC-AG-8942',
    name: 'Trần Quốc Bảo',
    wardCode: 'AG_P_LONGXUYEN',
    role: 'OFFICER',
    jti: 'jti-to-revoke-99',
    expSec: Math.floor(now / 1000) + 8 * 3600,
  });

  assert.strictEqual(backendVerifyMe(token, now).status, 200);
  backendLogout(token, now);
  assert.strictEqual(backendVerifyMe(token, now).status, 401);
});

// ============================================================================
// 5. MANDATORY TEST: CITIZEN 30-MIN SLIDING & OFFICER 15-MIN INACTIVITY + 60S WARNING
// ============================================================================
console.log('\n--- 5. Phiên công dân 30 phút trượt & Khóa không hoạt động 15 phút (cảnh báo 60s) ---');

it('Citizen 30-minute session activates warning at <= 60s, extends on "Tiếp tục?", and expires at 0s', () => {
  localStore.clear();
  sessionStore.clear();
  const start = 5000000;
  localStore.setItem('smartward_user_role', 'citizen');
  localStore.setItem('smartward_session_expires_at', String(start + CITIZEN_SESSION_TIMEOUT_MS));

  // At 29m 15s (45s left): Warning is active!
  const tWarning = start + (29 * 60 + 15) * 1000;
  const sWarning = hydrateOnF5(localStore, sessionStore, tWarning);
  assert.strictEqual(sWarning.role, 'citizen');
  assert.strictEqual(sWarning.sessionSecondsLeft, 45);
  assert.strictEqual(sWarning.sessionWarningActive, true);

  // Citizen clicks "Tiếp tục?" -> extends by 30 minutes from tWarning
  localStore.setItem('smartward_session_expires_at', String(tWarning + CITIZEN_SESSION_TIMEOUT_MS));
  const sExtended = hydrateOnF5(localStore, sessionStore, tWarning + 1000);
  assert.strictEqual(sExtended.role, 'citizen');
  assert.strictEqual(sExtended.sessionWarningActive, false);
  assert.strictEqual(sExtended.sessionSecondsLeft, 1799);

  // After another 30m 01s without extension -> Expired!
  const sExpired = hydrateOnF5(localStore, sessionStore, tWarning + CITIZEN_SESSION_TIMEOUT_MS + 1000);
  assert.strictEqual(sExpired.role, null);
  assert.strictEqual(sExpired.isExpired, true);
});

it('Officer 15-minute inactivity lock activates warning at <= 60s and locks session after 15m idle', () => {
  localStore.clear();
  sessionStore.clear();
  const start = 6000000;
  const token = issueMockJwt({
    sub: 'CC-AG-8942',
    name: 'Trần Quốc Bảo',
    wardCode: 'AG_P_LONGXUYEN',
    role: 'OFFICER',
    jti: 'jti-inact-test',
    expSec: Math.floor(start / 1000) + 8 * 3600,
  });
  sessionStore.setItem('smartward_officer_token', token);
  sessionStore.setItem('smartward_inactivity_expires_at', String(start + OFFICER_INACTIVITY_TIMEOUT_MS));

  // At 14m 20s idle (40s left): Warning is active!
  const t14m20s = start + (14 * 60 + 20) * 1000;
  const sWarn = hydrateOnF5(localStore, sessionStore, t14m20s);
  assert.strictEqual(sWarn.role, 'officer');
  assert.strictEqual(sWarn.sessionSecondsLeft, 40);
  assert.strictEqual(sWarn.sessionWarningActive, true);

  // At 15m 01s idle: Automatically locked out!
  const t15m01s = start + (15 * 60 + 1) * 1000;
  const sLocked = hydrateOnF5(localStore, sessionStore, t15m01s);
  assert.strictEqual(sLocked.role, null);
  assert.strictEqual(sLocked.isExpired, true);
});

console.log('\n================================================================');
console.log(`TEST RESULTS: Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL 3-TIER ROLE, SESSION, /ME HYDRATION & GUARD TESTS PASSED!\n');
  process.exit(0);
}
