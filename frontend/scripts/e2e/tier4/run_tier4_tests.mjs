#!/usr/bin/env node
/**
 * run_tier4_tests.mjs - Test Runner for Tier 4: Real-World Citizen Life Scenarios
 *
 * Executes all 7 end-to-end citizen life scenarios (T4_LIFE_01 .. T4_LIFE_07)
 * testing multi-step, multi-role citizen journeys:
 * - T4_LIFE_01: Unmarried parents birth registration combining paternity recognition
 * - T4_LIFE_02: Rented house residence declaration (Mẫu CT01) with host consent
 * - T4_LIFE_03: Divorced citizen single status certificate with court divorce judgment
 * - T4_LIFE_04: Elderly >= 75 years social pension eligibility and cashless account
 * - T4_LIFE_05: Inter-agency death registration and funeral allowance (Mẫu 02, Mẫu 03)
 * - T4_LIFE_06: Security & Fraud defense catching century-gender and DOB forgeries
 * - T4_LIFE_07: Full dossier lifecycle: Submit -> OTT-1 -> Supplement -> Re-upload -> OTT-2 -> Approval
 */

import { initializeTestSuiteState, createAssertionContext } from '../helpers/assertions.mjs';
import { apiClient } from '../helpers/api_client.mjs';
import { printHeader, printScoreboard } from '../helpers/reporter.mjs';
import { runTests as runTier4Tests } from './test_tier4_scenarios.mjs';

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

export async function runTier4Suite(parentAssertContext = null) {
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
  await runTier4Tests(assertContext);

  if (suiteState) {
    suiteState.tierResults.tier4.durationMs = Date.now() - startTime;
    const allPassed = printScoreboard(suiteState);
    return { allPassed, suiteState };
  }

  return { allPassed: true };
}

// Direct execution from CLI
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('run_tier4_tests.mjs')) {
  runTier4Suite()
    .then(({ allPassed }) => {
      process.exit(allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('[FATAL_TIER4_RUNNER_ERROR]', err);
      process.exit(1);
    });
}
