#!/usr/bin/env node
/**
 * run_all_e2e_tests.mjs - Master Unified E2E Test Suite Runner for SmartWard AI
 *
 * Orchestrates and executes all 161+ comprehensive opaque-box E2E test cases across:
 * - Tier 1: Feature Coverage (70 tests, F1..F14)
 * - Tier 2: Boundary & Corner Cases (70 tests, F1..F14)
 * - Tier 3: Cross-Module Interactions (14 tests, T3_INT_01 .. T3_INT_14)
 * - Tier 4: Real-World Citizen Life Scenarios (7 tests, T4_LIFE_01 .. T4_LIFE_07)
 *
 * Produces a unified Scoreboard breakdown by Tier and by Feature (F1 - F14),
 * pinpointing root causes and implementation escalations with full auditability.
 */

import { initializeTestSuiteState, createAssertionContext } from './helpers/assertions.mjs';
import { apiClient } from './helpers/api_client.mjs';
import { printHeader, printScoreboard } from './helpers/reporter.mjs';

// Tier 1 Test Suites
import { runTests as runT1Procedures } from './tier1/test_f01_f03_procedures.mjs';
import { runTests as runT1Forms } from './tier1/test_f04_f06_forms.mjs';
import { runTests as runT1VerificationVault } from './tier1/test_f07_f09_verification_vault.mjs';
import { runTests as runT1DossierRbac } from './tier1/test_f10_f12_dossier_rbac.mjs';
import { runTests as runT1ComplianceE2e } from './tier1/test_f13_f14_compliance_e2e.mjs';

// Tier 2 Test Suites
import { runTests as runT2F01F03 } from './tier2/test_tier2_f01_f03.mjs';
import { runTests as runT2F04F06 } from './tier2/test_tier2_f04_f06.mjs';
import { runTests as runT2F07F09 } from './tier2/test_tier2_f07_f09.mjs';
import { runTests as runT2F10F12 } from './tier2/test_tier2_f10_f12.mjs';
import { runTests as runT2F13F14 } from './tier2/test_tier2_f13_f14.mjs';

// Tier 3 Test Suite
import { runTests as runTier3Tests } from './tier3/test_tier3_interactions.mjs';

// Tier 4 Test Suite
import { runTests as runTier4Tests } from './tier4/test_tier4_scenarios.mjs';

/**
 * Probe live backend instances to auto-discover active container/dev port.
 */
async function probeBackend() {
  const candidateUrls = [
    process.env.SMARTWARD_API_URL,
    'http://localhost:8082', // Docker compose mapped port for smartward-backend
    'http://localhost:8080', // Standard Spring Boot dev port
  ].filter(Boolean);

  for (const url of candidateUrls) {
    try {
      const probeClient = new (apiClient.constructor)(url);
      const res = await probeClient.get('/api/v1/health', { timeoutMs: 3000 });
      if (res.status === 200) {
        apiClient.setBaseUrl(url);
        return url;
      }
    } catch {
      // Continue next probe target
    }
  }

  return apiClient.getBaseUrl();
}

/**
 * Main execution function
 */
async function main() {
  const activeUrl = await probeBackend();

  console.log('================================================================');
  console.log('SMARTWARD AI — UNIFIED MASTER E2E TEST SUITE (TIERS 1 - 4)');
  console.log(`Environment Target: ${activeUrl}`);
  console.log(`Execution Mode: Complete CI/CD Acceptance Gate (161+ Test Cases)`);
  console.log('================================================================\n');

  const suiteState = initializeTestSuiteState();
  const assertContext = createAssertionContext(suiteState);

  const args = process.argv.slice(2);
  const tierFilterArg = args.find((a) => a.startsWith('--tier='));
  const activeTiers = tierFilterArg
    ? tierFilterArg.split('=')[1].split(',').map((t) => t.trim().toLowerCase())
    : ['1', '2', '3', '4'];

  // =========================================================================
  // TIER 1: FEATURE COVERAGE (70 TESTS)
  // =========================================================================
  if (activeTiers.includes('1') || activeTiers.includes('tier1')) {
    console.log('\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    console.log('EXECUTING TIER 1: FEATURE BASELINE COVERAGE (F1 - F14: 70 TESTS)');
    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n');
    const t1Start = Date.now();
    try {
      await runT1Procedures(assertContext);
      await runT1Forms(assertContext);
      await runT1VerificationVault(assertContext);
      await runT1DossierRbac(assertContext);
      await runT1ComplianceE2e(assertContext);
    } catch (err) {
      console.error(`[UNCAUGHT_RUNNER_ERROR] Tier 1 execution error: ${err.message}`);
    }
    suiteState.tierResults.tier1.durationMs = Date.now() - t1Start;
  }

  // =========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (70 TESTS)
  // =========================================================================
  if (activeTiers.includes('2') || activeTiers.includes('tier2')) {
    console.log('\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    console.log('EXECUTING TIER 2: BOUNDARY & CORNER CASES (F1 - F14: 70 TESTS)');
    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n');
    const t2Start = Date.now();
    try {
      await runT2F01F03(assertContext);
      await runT2F04F06(assertContext);
      await runT2F07F09(assertContext);
      await runT2F10F12(assertContext);
      await runT2F13F14(assertContext);
    } catch (err) {
      console.error(`[UNCAUGHT_RUNNER_ERROR] Tier 2 execution error: ${err.message}`);
    }
    suiteState.tierResults.tier2.durationMs = Date.now() - t2Start;
  }

  // =========================================================================
  // TIER 3: CROSS-FEATURE INTERACTIONS (14 TESTS)
  // =========================================================================
  if (activeTiers.includes('3') || activeTiers.includes('tier3')) {
    console.log('\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    console.log('EXECUTING TIER 3: CROSS-FEATURE INTERACTIONS (14 TESTS)');
    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n');
    const t3Start = Date.now();
    try {
      await runTier3Tests(assertContext);
    } catch (err) {
      console.error(`[UNCAUGHT_RUNNER_ERROR] Tier 3 execution error: ${err.message}`);
    }
    suiteState.tierResults.tier3.durationMs = Date.now() - t3Start;
  }

  // =========================================================================
  // TIER 4: REAL-WORLD CITIZEN LIFE SCENARIOS (7 SCENARIOS)
  // =========================================================================
  if (activeTiers.includes('4') || activeTiers.includes('tier4')) {
    console.log('\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    console.log('EXECUTING TIER 4: REAL-WORLD CITIZEN LIFE SCENARIOS (7 SCENARIOS)');
    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n');
    const t4Start = Date.now();
    try {
      await runTier4Tests(assertContext);
    } catch (err) {
      console.error(`[UNCAUGHT_RUNNER_ERROR] Tier 4 execution error: ${err.message}`);
    }
    suiteState.tierResults.tier4.durationMs = Date.now() - t4Start;
  }

  // =========================================================================
  // FINAL AGGREGATED SCOREBOARD REPORT
  // =========================================================================
  const allPassed = printScoreboard(suiteState);
  process.exitCode = allPassed ? 0 : 1;
}

main().catch((err) => {
  console.error('[FATAL_MASTER_RUNNER_ERROR] Unified Test Runner crashed:', err);
  process.exit(1);
});
