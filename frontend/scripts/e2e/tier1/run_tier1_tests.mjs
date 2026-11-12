#!/usr/bin/env node
/**
 * run_tier1_tests.mjs - Master Test Runner for Tier 1: Feature Coverage (F1..F14)
 *
 * Executes 70 comprehensive test cases across all 14 features of SmartWard AI:
 * - F1: Seed JSON Standardization (5 tests)
 * - F2: Admin Procedures REST API (5 tests)
 * - F3: Procedure Hardcode Removal (5 tests)
 * - F4: Enhanced Form Precheck Engine (5 tests)
 * - F5: Dynamic A4 Form Modal (5 tests)
 * - F6: Smart Checklist & Exemption Warning (5 tests)
 * - F7: Real QR CCCD Scanner & Decoder (5 tests)
 * - F8: Multi-Document OCR Cross-Check (5 tests)
 * - F9: Zero-Trust Vault UI Integration (5 tests)
 * - F10: Database Persistence & Flyway V4 (5 tests)
 * - F11: Dossier Tracking & Management (5 tests)
 * - F12: Security & Officer RBAC Enforcement (5 tests)
 * - F13: Technical & Quality Compliance (5 tests)
 * - F14: Comprehensive E2E Testing & Hardening (5 tests)
 */

import { initializeTestSuiteState, createAssertionContext } from '../helpers/assertions.mjs';
import { apiClient } from '../helpers/api_client.mjs';
import { printHeader, printScoreboard } from '../helpers/reporter.mjs';
import { ensureBackendAvailable } from '../helpers/backend_server.mjs';

import { runTests as runProceduresTests } from './test_f01_f03_procedures.mjs';
import { runTests as runFormsTests } from './test_f04_f06_forms.mjs';
import { runTests as runVerificationVaultTests } from './test_f07_f09_verification_vault.mjs';
import { runTests as runDossierRbacTests } from './test_f10_f12_dossier_rbac.mjs';
import { runTests as runComplianceE2eTests } from './test_f13_f14_compliance_e2e.mjs';

async function main() {
  const { activeUrl, server } = await ensureBackendAvailable(apiClient);
  printHeader(activeUrl);

  const suiteState = initializeTestSuiteState();
  const assertContext = createAssertionContext(suiteState);
  const tier1StartTime = Date.now();

  try {
    // Group 1: F1, F2, F3 (15 tests)
    await runProceduresTests(assertContext);
  } catch (err) {
    console.error(`[UNCAUGHT_RUNNER_ERROR] in F1-F3: ${err.message}`);
  }

  try {
    // Group 2: F4, F5, F6 (15 tests)
    await runFormsTests(assertContext);
  } catch (err) {
    console.error(`[UNCAUGHT_RUNNER_ERROR] in F4-F6: ${err.message}`);
  }

  try {
    // Group 3: F7, F8, F9 (15 tests)
    await runVerificationVaultTests(assertContext);
  } catch (err) {
    console.error(`[UNCAUGHT_RUNNER_ERROR] in F7-F9: ${err.message}`);
  }

  try {
    // Group 4: F10, F11, F12 (15 tests)
    await runDossierRbacTests(assertContext);
  } catch (err) {
    console.error(`[UNCAUGHT_RUNNER_ERROR] in F10-F12: ${err.message}`);
  }

  try {
    // Group 5: F13 (5 tests)
    await runComplianceE2eTests(assertContext);
  } catch (err) {
    console.error(`[UNCAUGHT_RUNNER_ERROR] in F13: ${err.message}`);
  }

  suiteState.tierResults.tier1.durationMs = Date.now() - tier1StartTime;
  const allPassed = printScoreboard(suiteState);

  if (server) {
    server.close();
  }

  process.exitCode = allPassed ? 0 : 1;
}

main().catch((err) => {
  console.error('[FATAL_ERROR] Tier 1 Test Runner crashed:', err);
  process.exit(1);
});
