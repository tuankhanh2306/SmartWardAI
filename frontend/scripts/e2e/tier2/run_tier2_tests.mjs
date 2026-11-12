#!/usr/bin/env node
/**
 * run_tier2_tests.mjs - Master Test Runner for Tier 2: Boundary & Corner Cases (F1..F14)
 *
 * Executes 70 boundary and corner test cases across all 14 features of SmartWard AI:
 * - F1: Seed JSON Standardization (5 tests: T2_F01_01 .. T2_F01_05)
 * - F2: Admin Procedures REST API (5 tests: T2_F02_01 .. T2_F02_05)
 * - F3: Procedure Hardcode Removal (5 tests: T2_F03_01 .. T2_F03_05)
 * - F4: Enhanced Form Precheck Engine (5 tests: T2_F04_01 .. T2_F04_05)
 * - F5: Dynamic A4 Form Modal (5 tests: T2_F05_01 .. T2_F05_05)
 * - F6: Smart Checklist & Exemption Warning (5 tests: T2_F06_01 .. T2_F06_05)
 * - F7: Real QR CCCD Scanner & Decoder (5 tests: T2_F07_01 .. T2_F07_05)
 * - F8: Multi-Document OCR Cross-Check (5 tests: T2_F08_01 .. T2_F08_05)
 * - F9: Zero-Trust Vault UI Integration (5 tests: T2_F09_01 .. T2_F09_05)
 * - F10: Database Persistence & Flyway V4 (5 tests: T2_F10_01 .. T2_F10_05)
 * - F11: Dossier Tracking & Management (5 tests: T2_F11_01 .. T2_F11_05)
 * - F12: Security & Officer RBAC Enforcement (5 tests: T2_F12_01 .. T2_F12_05)
 * - F13: Technical & Quality Compliance (5 tests: T2_F13_01 .. T2_F13_05)
 * - F14: Comprehensive E2E Testing & Hardening (5 tests: T2_F14_01 .. T2_F14_05)
 */

import { initializeTestSuiteState, createAssertionContext } from '../helpers/assertions.mjs';
import { apiClient } from '../helpers/api_client.mjs';
import { printHeader, printScoreboard } from '../helpers/reporter.mjs';
import { ensureBackendAvailable } from '../helpers/backend_server.mjs';

import { runTests as runF01F03Tests } from './test_tier2_f01_f03.mjs';
import { runTests as runF04F06Tests } from './test_tier2_f04_f06.mjs';
import { runTests as runF07F09Tests } from './test_tier2_f07_f09.mjs';
import { runTests as runF10F12Tests } from './test_tier2_f10_f12.mjs';
import { runTests as runF13F14Tests } from './test_tier2_f13_f14.mjs';

async function main() {
  const { activeUrl, server } = await ensureBackendAvailable(apiClient);

  console.log('================================================================');
  console.log('SMARTWARD AI — OPAQUE-BOX COMPREHENSIVE E2E TEST SUITE');
  console.log(`Environment Target: ${activeUrl}`);
  console.log(`Execution Mode: Automated CI / Acceptance Gate (Tier 2: Boundary & Corner Cases)`);
  console.log('================================================================\n');

  const suiteState = initializeTestSuiteState();
  const assertContext = createAssertionContext(suiteState);
  const tier2StartTime = Date.now();

  try {
    // Group 1: F1, F2, F3 (15 tests)
    await runF01F03Tests(assertContext);
  } catch (err) {
    console.error(`[UNCAUGHT_RUNNER_ERROR] in F1-F3: ${err.message}`);
  }

  try {
    // Group 2: F4, F5, F6 (15 tests)
    await runF04F06Tests(assertContext);
  } catch (err) {
    console.error(`[UNCAUGHT_RUNNER_ERROR] in F4-F6: ${err.message}`);
  }

  try {
    // Group 3: F7, F8, F9 (15 tests)
    await runF07F09Tests(assertContext);
  } catch (err) {
    console.error(`[UNCAUGHT_RUNNER_ERROR] in F7-F9: ${err.message}`);
  }

  try {
    // Group 4: F10, F11, F12 (15 tests)
    await runF10F12Tests(assertContext);
  } catch (err) {
    console.error(`[UNCAUGHT_RUNNER_ERROR] in F10-F12: ${err.message}`);
  }

  try {
    // Group 5: F13 (5 tests)
    await runF13F14Tests(assertContext);
  } catch (err) {
    console.error(`[UNCAUGHT_RUNNER_ERROR] in F13: ${err.message}`);
  }

  suiteState.tierResults.tier2.durationMs = Date.now() - tier2StartTime;
  const allPassed = printScoreboard(suiteState);

  if (server) {
    server.close();
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('[FATAL_ERROR] Tier 2 Runner crashed:', err);
  process.exit(1);
});
