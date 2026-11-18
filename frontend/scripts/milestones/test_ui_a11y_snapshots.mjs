/**
 * SmartWard AI — Multi-Viewport Visual Snapshot & Accessibility (axe-core) Audit Harness
 * =======================================================================================
 * Audits key UI subsystems across 375px (Mobile), 768px (Tablet), and 1280px (Desktop),
 * checks Header role isolation, verifies zero horizontal overflow, and runs WCAG 2.1 AA
 * scans via @axe-core/playwright against built `frontend/dist`.
 *
 * Usage:
 *   node frontend/scripts/test_ui_a11y_snapshots.mjs [--out-dir <dir>] [--strict]
 */

import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(currentDir, '../..');
const rootDir = path.resolve(frontendDir, '..');

const VIEWPORTS = [
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 800 },
];

function parseCliArgs(argv) {
  let outDir = path.join(rootDir, '.tmp-ui-audit');
  let strict = false;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out-dir' && argv[i + 1]) {
      outDir = path.resolve(argv[i + 1]);
      i++;
    } else if (argv[i] === '--strict') {
      strict = true;
    }
  }
  return { outDir, strict };
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForServerReady(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Server still starting
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Preview server did not become ready within ${timeoutMs}ms at ${url}`);
}

async function launchBrowser(chromium) {
  try {
    return await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function resetSession(page, baseUrl) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
}

async function enterCitizenRole(page, baseUrl) {
  await resetSession(page, baseUrl);
  await page.getByRole('button', { name: /Đăng nhập với tư cách Người dân/i }).click();
  await page.waitForURL('**/citizen', { timeout: 10000 });
}

async function enterOfficerRole(page, baseUrl) {
  await resetSession(page, baseUrl);
  await page.getByRole('button', { name: /Đăng nhập với tư cách Cán bộ/i }).click();
  await page.getByRole('button', { name: /Đăng nhập Cán bộ/i }).click();
  await page.waitForURL('**/officer/**', { timeout: 15000 });
}

async function checkRoleIsolation(page, expectedRole) {
  return page.evaluate((role) => {
    const header = document.querySelector('header');
    const navButtonsAndLinks = Array.from(document.querySelectorAll('header a, nav a, header button, nav button'));
    const hrefs = navButtonsAndLinks
      .map((el) => el.getAttribute('href') || el.textContent || '')
      .map((s) => s.trim());

    if (role === 'citizen') {
      const leaks = hrefs.filter((h) => h.includes('/officer') || /Bàn Cán Bộ|Bàn Điều Hành|Sơ Duyệt/i.test(h));
      return { headerPresent: Boolean(header), leaks };
    }
    if (role === 'officer') {
      const leaks = hrefs.filter((h) => h.includes('/citizen') || /Hỏi Đáp AI|Báo Sự Cố|Kiểm Tra Tờ Khai/i.test(h));
      return { headerPresent: Boolean(header), leaks };
    }
    return { headerPresent: Boolean(header), leaks: [] };
  }, expectedRole);
}

async function auditScreen(page, AxeBuilder, config, baseUrl, outDir) {
  if (config.setup) {
    await config.setup(page, baseUrl);
  } else {
    await page.goto(`${baseUrl}${config.path}`, { waitUntil: 'networkidle' });
  }

  if (config.afterLoad) {
    await config.afterLoad(page);
  }
  await page.waitForTimeout(350);

  const viewportReports = [];
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(250);

    const overflow = await page.evaluate(() => {
      const header = document.querySelector('header');
      const headerWidth = header ? header.scrollWidth : 0;
      const docWidth = document.documentElement.scrollWidth;
      const maxWidth = Math.max(docWidth, headerWidth);
      return {
        scrollWidth: docWidth,
        headerScrollWidth: headerWidth,
        innerWidth: window.innerWidth,
        hasHorizontalOverflow: maxWidth > window.innerWidth + 1,
      };
    });

    const screenshotPath = path.join(outDir, `${config.name}-${vp.name}px.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    let axeSummary = null;
    if (vp.name === '375' || vp.name === '1280') {
      const axeResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      axeSummary = {
        passesCount: axeResults.passes.length,
        violations: axeResults.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodesCount: v.nodes.length,
          targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
        })),
      };
    }

    const isolation = await checkRoleIsolation(page, config.role);
    viewportReports.push({ viewport: vp.name, screenshotPath, overflow, isolation, axe: axeSummary });
  }

  return { screen: config.name, path: config.path, role: config.role, viewports: viewportReports };
}

async function main() {
  const { outDir, strict } = parseCliArgs(process.argv.slice(2));
  fs.mkdirSync(outDir, { recursive: true });

  const distDir = path.join(frontendDir, 'dist');
  if (!fs.existsSync(distDir)) {
    throw new Error('frontend/dist not found. Run "npm.cmd --prefix frontend run build" first.');
  }

  const playwrightMod = await import(pathToFileURL(path.join(frontendDir, 'node_modules/playwright/index.mjs')).href);
  const axeMod = await import(pathToFileURL(path.join(frontendDir, 'node_modules/@axe-core/playwright/dist/index.mjs')).href);
  const AxeBuilder = axeMod.default || axeMod.AxeBuilder;

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const viteBin = path.join(frontendDir, 'node_modules/vite/bin/vite.js');

  const previewProc = spawn(process.execPath, [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: frontendDir,
    stdio: 'pipe',
  });

  let browser;
  try {
    await waitForServerReady(baseUrl);
    browser = await launchBrowser(playwrightMod.chromium);

    const targets = [
      { name: 'gateway', path: '/', role: 'public' },
      {
        name: 'citizen-chat',
        path: '/citizen',
        role: 'citizen',
        setup: enterCitizenRole,
        afterLoad: async (page) => {
          const quickBtn = page.locator('button', { hasText: /Đăng ký khai sinh/i }).first();
          if (await quickBtn.isVisible().catch(() => false)) {
            await quickBtn.click();
            await page.waitForTimeout(500);
          }
        },
      },
      { name: 'citizen-form', path: '/citizen/form#form', role: 'citizen' },
      { name: 'citizen-incident', path: '/citizen/form#incident', role: 'citizen' },
      { name: 'officer-dashboard', path: '/officer', role: 'officer', setup: enterOfficerRole },
    ];

    const context = await browser.newContext();
    const page = await context.newPage();
    const reports = [];

    for (const target of targets) {
      reports.push(await auditScreen(page, AxeBuilder, target, baseUrl, outDir));
    }

    const reportPath = path.join(outDir, 'audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, reports }, null, 2));

    let criticalOrSeriousCount = 0;
    let roleLeakCount = 0;
    let overflowCount = 0;

    console.log('\n=== UI MULTI-VIEWPORT & ACCESSIBILITY AUDIT SUMMARY ===');
    for (const r of reports) {
      console.log(`\n[${r.screen}] (${r.path}, role=${r.role})`);
      for (const vp of r.viewports) {
        const maxW = Math.max(vp.overflow.scrollWidth, vp.overflow.headerScrollWidth || 0);
        const overflowTag = vp.overflow.hasHorizontalOverflow
          ? `OVERFLOW (${maxW}>${vp.overflow.innerWidth})`
          : 'no-overflow';
        if (vp.overflow.hasHorizontalOverflow) overflowCount++;
        if (vp.isolation.leaks.length > 0) roleLeakCount++;
        const leaksTag = vp.isolation.leaks.length > 0 ? `LEAKS=${vp.isolation.leaks.join(',')}` : 'role-clean';
        const axeTag = vp.axe
          ? `axe-passes=${vp.axe.passesCount} violations=${vp.axe.violations.length} [${vp.axe.violations.map((v) => `${v.id}:${v.impact}(${v.nodesCount})`).join(', ')}]`
          : 'axe=skipped';
        if (vp.axe) {
          criticalOrSeriousCount += vp.axe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious').length;
        }
        console.log(`  - ${vp.viewport}px: ${overflowTag} | ${leaksTag} | ${axeTag}`);
      }
    }

    console.log(`\nSaved screenshots & JSON report to: ${outDir}`);
    if (strict && (criticalOrSeriousCount > 0 || roleLeakCount > 0 || overflowCount > 0)) {
      console.error(`STRICT AUDIT FAILED: critical/serious=${criticalOrSeriousCount}, roleLeaks=${roleLeakCount}, overflow375=${overflowCount}`);
      process.exitCode = 1;
    }
  } finally {
    if (browser) await browser.close();
    previewProc.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('UI Audit failed:', err);
  process.exit(1);
});
