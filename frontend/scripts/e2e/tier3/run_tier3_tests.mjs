#!/usr/bin/env node
/**
 * run_tier3_tests.mjs - Test Runner for Tier 3: Cross-Feature Interactions
 *
 * Executes all 14 cross-feature interaction scenarios (T3_INT_01 .. T3_INT_14)
 * validating end-to-end data flows and contract enforcement across modules:
 * - F1 + F2: Seed JSON to Admin Procedures REST API
 * - F2 + F3: Procedures REST API to Frontend Dynamic Catalog
 * - F7 + F4: Real QR CCCD to Form Precheck
 * - F4 + F5: Form Precheck to A4 Document Modal Preview
 * - F6 + F4: Smart Checklist to Form Precheck Validation
 * - F8 + F4: Multi-Doc OCR to Precheck Report
 * - F4 + F9: Form Filing to Zero-Trust Vault Upload
 * - F9 + F10: Vault Documents to Citizen Dossier Persistence
 * - F10 + F11: Database Persistence to Citizen Tracking
 * - F11 + F12: Dossier Management to Officer RBAC Interceptor
 * - F11 + F9: Officer Dashboard to One-Time Token (OTT 410 GONE)
 * - F12 + F3: Officer Auth to HITL Gray-Zone Queue Resolution
 * - F6 + F11: Smart Checklist Exemption to Dossier SLA & Fee
 * - F13 + F9: 32-Byte Key to Vault AES-256-GCM Integrity
 */

import { initializeTestSuiteState, createAssertionContext } from '../helpers/assertions.mjs';
import { apiClient } from '../helpers/api_client.mjs';
import { printHeader, printScoreboard } from '../helpers/reporter.mjs';
import { ensureBackendAvailable } from '../helpers/backend_server.mjs';
import { runTests as runTier3Tests } from './test_tier3_interactions.mjs';

export async function runTier3Suite(parentAssertContext = null) {
  const { activeUrl, server } = await ensureBackendAvailable(apiClient);

  let suiteState;
  let assertContext;

  if (parentAssertContext) {
    assertContext = parentAssertContext;
  } else {
    printHeader(activeUrl);
    suiteState = initializeTestSuiteState();
    assertContext = createAssertionContext(suiteState);
  }

  const startTime = Date.now();
  await runTier3Tests(assertContext);

  if (suiteState) {
    suiteState.tierResults.tier3.durationMs = Date.now() - startTime;
    const allPassed = printScoreboard(suiteState);
    if (server) {
      server.close();
    }
    return { allPassed, suiteState };
  }

  return { allPassed: true };
}

// Direct execution from CLI
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('run_tier3_tests.mjs')) {
  runTier3Suite()
    .then(({ allPassed }) => {
      process.exit(allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('[FATAL_TIER3_RUNNER_ERROR]', err);
      process.exit(1);
    });
}
