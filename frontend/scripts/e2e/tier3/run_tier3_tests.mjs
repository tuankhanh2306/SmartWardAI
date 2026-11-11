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
import { runTests as runTier3Tests } from './test_tier3_interactions.mjs';

async function probeBackend() {
  const candidateUrls = [
    process.env.SMARTWARD_API_URL,
    'http://localhost:8082', // Docker mapped port for smartward-backend
    'http://localhost:8080', // Default Spring Boot dev port
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
      // Continue probing next URL
    }
  }

  return apiClient.getBaseUrl();
}

export async function runTier3Suite(parentAssertContext = null) {
  const activeUrl = await probeBackend();

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
