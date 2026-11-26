/**
 * test_session_expiry_e2e.mjs — Live Browser Countdown & Expiry Tests (QA-3.7)
 *
 * Tests real rendered React UI (RoleContext + Header + CitizenGuard + OfficerGuard + AdminGuard)
 * using Playwright's virtual clock (`page.clock`) against the built SPA bundle (`frontend/dist`):
 *   1. Citizen 30m sliding session: <= 60s warning banner + "Tiếp tục? (+30 phút)" extension
 *   2. Citizen 30m natural expiry: auto-logout to `/`, RoleGateway notice, CitizenGuard re-entry block
 *   3. Officer 15m inactivity lock: <= 60s warning banner + automatic lockout at 0s -> `/`
 *   4. Officer 8h JWT exp expiry: overrides active inactivity window, auto-logs out -> `/`, OfficerGuard bounce
 *   5. Admin 8h JWT exp expiry & AdminGuard protection on `/admin`
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(currentDir, '..');
const distDir = path.join(frontendDir, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function startStaticSpaServer() {
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error(`Missing built frontend bundle at ${distDir}. Run "npm run build" first.`);
  }
  const server = http.createServer((req, res) => {
    const cleanUrl = (req.url || '/').split('?')[0];
    let filePath = path.join(distDir, cleanUrl === '/' ? 'index.html' : cleanUrl);
    if (!filePath.startsWith(distDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

function makeFakeJwt({ sub, role, wardCode, expSec }) {
  const b64url = (obj) =>
    Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub,
    role,
    wardCode,
    iat: expSec - 8 * 3600,
    exp: expSec,
  });
  return `${header}.${payload}.qa37_mock_sig`;
}

function assert(cond, message) {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function run() {
  console.log('================================================================');
  console.log('SMARTWARD AI — QA-3.7 LIVE BROWSER SESSION COUNTDOWN & EXPIRY E2E');
  console.log('================================================================\n');

  const { server, baseUrl } = await startStaticSpaServer();
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  const RESULTS = [];
  const runScenario = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      RESULTS.push({ name, pass: true });
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}\n     -> ${err.message}`);
      RESULTS.push({ name, pass: false, error: err.message });
    }
  };

  try {
    // =========================================================================
    // SCENARIO 1: Citizen 30m Session Warning Banner at <=60s & "Tiếp tục?" Extend
    // =========================================================================
    await runScenario('1. Citizen 30m session shows <=60s warning banner and extends on "Tiếp tục? (+30 phút)"', async () => {
      const BASE_TIME = Date.UTC(2026, 10, 25, 2, 0, 0);
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();

      await page.clock.install({ time: BASE_TIME });
      await page.addInitScript((t) => {
        localStorage.setItem('smartward_selected_ward_code', 'AG_P_LONGXUYEN');
        localStorage.setItem('smartward_user_role', 'citizen');
        localStorage.setItem('smartward_session_expires_at', String(t + 30 * 60 * 1000));
      }, BASE_TIME);

      await page.goto(`${baseUrl}/citizen`, { waitUntil: 'networkidle' });
      assert(new URL(page.url()).pathname === '/citizen', 'CitizenGuard must allow active /citizen route');

      // Advance 28m: ~120s left -> warning banner MUST NOT be visible yet
      await page.clock.fastForward(28 * 60 * 1000);
      await page.clock.runFor(2000);
      const extendBtnEarly = page.locator('button', { hasText: 'Tiếp tục?' });
      assert((await extendBtnEarly.count()) === 0, 'Warning banner must stay hidden when >60s remain');

      // Advance into <=60s warning zone (~50s remaining)
      await page.clock.fastForward(70 * 1000);
      await page.clock.runFor(2000);

      const warningBanner = page.locator('header').locator('text=/Phiên làm việc công dân sắp hết hạn sau \\d+ giây/');
      await warningBanner.waitFor({ state: 'visible', timeout: 3000 });

      const extendBtn = page.locator('button', { hasText: 'Tiếp tục? (+30 phút)' });
      assert(await extendBtn.isVisible(), 'Citizen extend button "Tiếp tục? (+30 phút)" must be visible');

      await extendBtn.click();
      await page.clock.runFor(1100);

      assert((await extendBtn.count()) === 0, 'Warning banner must dismiss after clicking extend');
      const extendedUntil = await page.evaluate(() => Number(localStorage.getItem('smartward_session_expires_at') || '0'));
      const currentVirtualNow = await page.evaluate(() => Date.now());
      assert(
        extendedUntil - currentVirtualNow >= 29 * 60 * 1000,
        `Session deadline must reset to +30m (got remaining ${(extendedUntil - currentVirtualNow) / 1000}s)`
      );

      await context.close();
    });

    // =========================================================================
    // SCENARIO 2: Citizen 30m Natural Expiry -> Logout -> CitizenGuard Bounce
    // =========================================================================
    await runScenario('2. Citizen 30m session expires at 0s, redirects to /, clears storage, and CitizenGuard blocks /citizen', async () => {
      const BASE_TIME = Date.UTC(2026, 10, 25, 3, 0, 0);
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();

      await page.clock.install({ time: BASE_TIME });
      await page.addInitScript((t) => {
        if (!sessionStorage.getItem('qa_bootstrapped')) {
          sessionStorage.setItem('qa_bootstrapped', '1');
          localStorage.setItem('smartward_selected_ward_code', 'AG_P_LONGXUYEN');
          localStorage.setItem('smartward_user_role', 'citizen');
          localStorage.setItem('smartward_session_expires_at', String(t + 30 * 60 * 1000));
        }
      }, BASE_TIME);

      await page.goto(`${baseUrl}/citizen`, { waitUntil: 'networkidle' });
      assert(new URL(page.url()).pathname === '/citizen', 'Must initially stay on /citizen');

      // Fast-forward to exact expiry (30m + 2s tick)
      await page.clock.fastForward(30 * 60 * 1000);
      await page.clock.runFor(2500);

      await page.waitForURL((u) => u.pathname === '/', { timeout: 5000 });
      const storageState = await page.evaluate(() => ({
        role: localStorage.getItem('smartward_user_role'),
        expiresAt: localStorage.getItem('smartward_session_expires_at'),
      }));
      assert(storageState.role === null && storageState.expiresAt === null, 'Expired citizen localStorage must be wiped');

      const expiryBanner = page.locator('text=/Phiên làm việc 30 phút đã hết hạn/');
      await expiryBanner.waitFor({ state: 'visible', timeout: 3000 });

      // Attempting direct reload to /citizen must be blocked back to / by CitizenGuard
      await page.goto(`${baseUrl}/citizen`, { waitUntil: 'networkidle' });
      assert(new URL(page.url()).pathname === '/', 'CitizenGuard must redirect unauthenticated /citizen back to /');

      await context.close();
    });

    // =========================================================================
    // SCENARIO 3: Officer 15m Inactivity Lockout (Warning at <=60s + Auto Logout)
    // =========================================================================
    await runScenario('3. OfficerGuard 15m inactivity timer warns at <=60s and locks session at 0s -> /', async () => {
      const BASE_TIME = Date.UTC(2026, 10, 25, 4, 0, 0);
      const token = makeFakeJwt({
        sub: 'CC-AG-8942',
        role: 'OFFICER',
        wardCode: 'AG_P_LONGXUYEN',
        expSec: Math.floor(BASE_TIME / 1000) + 8 * 3600,
      });

      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();

      await page.route('**/api/v1/auth/officer/me', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              badgeId: 'CC-AG-8942',
              fullName: 'Trần Quốc Bảo — Cán bộ Tư pháp',
              wardCode: 'AG_P_LONGXUYEN',
              role: 'OFFICER',
              mustChangePin: false,
            },
          }),
        })
      );
      await page.route('**/api/v1/auth/officer/logout', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
      );
      await page.route('**/api/v1/dossiers/**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
      );

      await page.clock.install({ time: BASE_TIME });
      await page.addInitScript(({ t, jwt }) => {
        if (!sessionStorage.getItem('qa_officer_boot')) {
          sessionStorage.setItem('qa_officer_boot', '1');
          localStorage.setItem('smartward_selected_ward_code', 'AG_P_LONGXUYEN');
          localStorage.setItem('smartward_user_role', 'officer');
          localStorage.setItem(
            'smartward_officer_profile',
            JSON.stringify({
              badgeId: 'CC-AG-8942',
              name: 'Trần Quốc Bảo — Cán bộ Tư pháp',
              wardCode: 'AG_P_LONGXUYEN',
              role: 'OFFICER',
              mustChangePin: false,
            })
          );
          sessionStorage.setItem('smartward_officer_token', jwt);
          sessionStorage.setItem('smartward_inactivity_expires_at', String(t + 15 * 60 * 1000));
        }
      }, { t: BASE_TIME, jwt: token });

      await page.goto(`${baseUrl}/officer/ward/AG_P_LONGXUYEN`, { waitUntil: 'networkidle' });
      assert(new URL(page.url()).pathname === '/officer/ward/AG_P_LONGXUYEN', 'OfficerGuard must allow authenticated officer route');

      // Advance 14m10s -> ~50s left -> Officer warning banner must appear
      await page.clock.fastForward(14 * 60 * 1000 + 10 * 1000);
      await page.clock.runFor(2000);

      const officerWarning = page.locator('header').locator('text=/Cảnh báo khóa không hoạt động/');
      await officerWarning.waitFor({ state: 'visible', timeout: 3000 });

      // Advance remaining 55s -> inactivity timeout -> auto logout to /
      await page.clock.fastForward(55 * 1000);
      await page.clock.runFor(2000);

      await page.waitForURL((u) => u.pathname === '/', { timeout: 5000 });
      const tokAfter = await page.evaluate(() => sessionStorage.getItem('smartward_officer_token'));
      assert(tokAfter === null, 'Officer JWT must be cleared from sessionStorage on 15m inactivity lock');

      const lockNotice = page.locator('text=/tự động khóa do không hoạt động quá 15 phút/');
      await lockNotice.waitFor({ state: 'visible', timeout: 3000 });

      await context.close();
    });

    // =========================================================================
    // SCENARIO 4: Officer 8-Hour JWT `exp` Expiry (Overrides Idle Timer)
    // =========================================================================
    await runScenario('4. OfficerGuard 8h JWT expiry triggers forced re-login even with fresh inactivity timer', async () => {
      const BASE_TIME = Date.UTC(2026, 10, 25, 5, 0, 0);
      const JWT_EXP_SEC = Math.floor(BASE_TIME / 1000) + 8 * 3600;
      const token = makeFakeJwt({
        sub: 'CC-AG-8942',
        role: 'OFFICER',
        wardCode: 'AG_P_LONGXUYEN',
        expSec: JWT_EXP_SEC,
      });

      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();

      await page.route('**/api/v1/auth/officer/me', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              badgeId: 'CC-AG-8942',
              fullName: 'Trần Quốc Bảo',
              wardCode: 'AG_P_LONGXUYEN',
              role: 'OFFICER',
              mustChangePin: false,
            },
          }),
        })
      );
      await page.route('**/api/v1/auth/officer/logout', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
      );
      await page.route('**/api/v1/dossiers/**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
      );

      // Start clock at T + 7h 59m 50s while inactivity deadline stays at now + 15m (simulating active officer reaching 8h cap)
      const NEAR_8H_TIME = BASE_TIME + (8 * 3600 - 10) * 1000;
      await page.clock.install({ time: NEAR_8H_TIME });
      await page.addInitScript(({ nowMs, jwt }) => {
        if (!sessionStorage.getItem('qa_8h_officer_boot')) {
          sessionStorage.setItem('qa_8h_officer_boot', '1');
          localStorage.setItem('smartward_selected_ward_code', 'AG_P_LONGXUYEN');
          localStorage.setItem('smartward_user_role', 'officer');
          localStorage.setItem(
            'smartward_officer_profile',
            JSON.stringify({
              badgeId: 'CC-AG-8942',
              name: 'Trần Quốc Bảo',
              wardCode: 'AG_P_LONGXUYEN',
              role: 'OFFICER',
              mustChangePin: false,
            })
          );
          sessionStorage.setItem('smartward_officer_token', jwt);
          sessionStorage.setItem('smartward_inactivity_expires_at', String(nowMs + 15 * 60 * 1000));
        }
      }, { nowMs: NEAR_8H_TIME, jwt: token });

      await page.goto(`${baseUrl}/officer/ward/AG_P_LONGXUYEN`, { waitUntil: 'networkidle' });
      assert(new URL(page.url()).pathname === '/officer/ward/AG_P_LONGXUYEN', 'Must stay on /officer before 8h JWT cap');

      // Advance 12s across the 8h JWT exp boundary
      await page.clock.fastForward(12 * 1000);
      await page.clock.runFor(2000);

      await page.waitForURL((u) => u.pathname === '/', { timeout: 5000 });
      const jwtMsg = page.locator('text=/Phiên làm việc 8 giờ \\(JWT\\) đã hết hạn/');
      await jwtMsg.waitFor({ state: 'visible', timeout: 3000 });

      // Attempting direct access back to /officer/ward/... must bounce to /
      await page.goto(`${baseUrl}/officer/ward/AG_P_LONGXUYEN`, { waitUntil: 'networkidle' });
      assert(new URL(page.url()).pathname === '/', 'OfficerGuard must bounce expired session back to /');

      await context.close();
    });

    // =========================================================================
    // SCENARIO 5: Admin 8-Hour JWT `exp` Expiry & AdminGuard Bounce
    // =========================================================================
    await runScenario('5. AdminGuard enforces 8h JWT expiry on /admin and redirects to /', async () => {
      const BASE_TIME = Date.UTC(2026, 10, 25, 6, 0, 0);
      const JWT_EXP_SEC = Math.floor(BASE_TIME / 1000) + 8 * 3600;
      const adminToken = makeFakeJwt({
        sub: 'ADM-AG-0001',
        role: 'ADMIN',
        wardCode: 'AG_PROVINCE',
        expSec: JWT_EXP_SEC,
      });

      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();

      await page.route('**/api/v1/auth/officer/me', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              badgeId: 'ADM-AG-0001',
              fullName: 'Quản trị viên Tỉnh An Giang',
              wardCode: 'AG_PROVINCE',
              role: 'ADMIN',
              mustChangePin: false,
            },
          }),
        })
      );
      await page.route('**/api/v1/auth/officer/logout', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
      );
      await page.route('**/api/v1/admin/**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
      );
      await page.route('**/api/v1/procedures**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
      );

      const NEAR_8H_TIME = BASE_TIME + (8 * 3600 - 10) * 1000;
      await page.clock.install({ time: NEAR_8H_TIME });
      await page.addInitScript(({ nowMs, jwt }) => {
        if (!sessionStorage.getItem('qa_8h_admin_boot')) {
          sessionStorage.setItem('qa_8h_admin_boot', '1');
          localStorage.setItem('smartward_selected_ward_code', 'AG_P_LONGXUYEN');
          localStorage.setItem('smartward_user_role', 'admin');
          localStorage.setItem(
            'smartward_officer_profile',
            JSON.stringify({
              badgeId: 'ADM-AG-0001',
              name: 'Quản trị viên Tỉnh An Giang',
              wardCode: 'AG_PROVINCE',
              role: 'ADMIN',
              mustChangePin: false,
            })
          );
          sessionStorage.setItem('smartward_officer_token', jwt);
          sessionStorage.setItem('smartward_inactivity_expires_at', String(nowMs + 15 * 60 * 1000));
        }
      }, { nowMs: NEAR_8H_TIME, jwt: adminToken });

      await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' });
      assert(new URL(page.url()).pathname === '/admin', 'AdminGuard must allow valid ADMIN JWT on /admin');

      await page.clock.fastForward(12 * 1000);
      await page.clock.runFor(2000);

      await page.waitForURL((u) => u.pathname === '/', { timeout: 5000 });
      const tokAfter = await page.evaluate(() => sessionStorage.getItem('smartward_officer_token'));
      assert(tokAfter === null, 'Admin token must be wiped after 8h expiry');

      await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' });
      assert(new URL(page.url()).pathname === '/', 'AdminGuard must bounce unauthenticated /admin back to /');

      await context.close();
    });
  } finally {
    await browser.close();
    server.close();
  }

  const passed = RESULTS.filter((r) => r.pass).length;
  const failed = RESULTS.filter((r) => !r.pass).length;
  console.log('\n================================================================');
  console.log(`QA-3.7 SESSION EXPIRY RESULTS: Total: ${RESULTS.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================');
  if (failed > 0) {
    process.exit(1);
  }
  console.log('🎉 ALL 3-GUARD LIVE SESSION COUNTDOWN & EXPIRY TESTS PASSED!');
}

run().catch((err) => {
  console.error('Fatal error in test_session_expiry_e2e.mjs:', err);
  process.exit(1);
});
