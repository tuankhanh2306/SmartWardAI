#!/usr/bin/env node
/**
 * run_tier5_tests.mjs - Test Runner for Tier 5: Adversarial Hardening (8 Tests)
 *
 * Executes all 8 adversarial resilience, race condition, IDOR, SQLi,
 * JWT substitution, and boundary stress tests (T5_ADV_01 .. T5_ADV_08).
 */

import { initializeTestSuiteState, createAssertionContext } from '../helpers/assertions.mjs';
import { apiClient } from '../helpers/api_client.mjs';
import { printHeader, printScoreboard } from '../helpers/reporter.mjs';
import { ensureBackendAvailable } from '../helpers/backend_server.mjs';
import { runTests as runTier5Tests } from './test_tier5_adversarial.mjs';

export async function runTier5Suite(parentAssertContext = null) {
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
  await runTier5Tests(assertContext);

  if (suiteState) {
    suiteState.tierResults.tier5.durationMs = Date.now() - startTime;
    const allPassed = printScoreboard(suiteState);
    if (server) {
      server.close();
    }
    return { allPassed, suiteState };
  }

  return { allPassed: true };
}

// Direct execution from CLI
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('run_tier5_tests.mjs')) {
  runTier5Suite()
    .then(({ allPassed }) => {
      process.exit(allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('[FATAL_TIER5_RUNNER_ERROR]', err);
      process.exit(1);
    });
}
