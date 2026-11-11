/**
 * reporter.mjs - ANSI Console Scoreboard & Aggregated Execution Reporter
 *
 * Implements standard E2E Project Pattern output with tier breakdown,
 * feature coverage matrix (F1..F14), and failure root-cause analysis.
 */

export function printHeader(targetApiUrl) {
  console.log('================================================================');
  console.log('SMARTWARD AI — OPAQUE-BOX COMPREHENSIVE E2E TEST SUITE');
  console.log(`Environment Target: ${targetApiUrl}`);
  console.log(`Execution Mode: Automated CI / Acceptance Gate (Tier 1: Feature Coverage)`);
  console.log('================================================================\n');
}

export function printScoreboard(suiteState) {
  const durationSec = ((Date.now() - suiteState.startTime) / 1000).toFixed(2);
  const passRate =
    suiteState.totalTests > 0
      ? ((suiteState.totalPassed / suiteState.totalTests) * 100).toFixed(1)
      : '0.0';

  console.log('\n================================================================');
  console.log('E2E TEST EXECUTION SCOREBOARD BY TIER');
  console.log('================================================================');
  for (const key of Object.keys(suiteState.tierResults)) {
    const t = suiteState.tierResults[key];
    if (t.total === 0) continue;
    const mark = t.failed === 0 ? '✓ PASS' : '✗ FAIL';
    console.log(`[${mark}] ${t.name}: ${t.passed}/${t.total} passed`);
  }

  console.log('----------------------------------------------------------------');
  console.log(
    `TOTAL: ${suiteState.totalPassed} / ${suiteState.totalTests} TESTS PASSED (${passRate}%) | DURATION: ${durationSec}s`
  );
  console.log('================================================================');

  console.log('\n================================================================');
  console.log('FEATURE INVENTORY COVERAGE BREAKDOWN (F1 - F14)');
  console.log('================================================================');
  console.log('| Code | Feature Name                          | Total | Pass | Fail | Status |');
  console.log('|:-----|:--------------------------------------|:-----:|:----:|:----:|:------:|');

  for (const code of Object.keys(suiteState.featureResults)) {
    const f = suiteState.featureResults[code];
    const status = f.total > 0 && f.failed === 0 ? 'PASS' : f.failed > 0 ? 'FAIL' : 'SKIP';
    const paddedCode = f.code.padEnd(4);
    const paddedName = f.name.padEnd(38);
    const paddedTot = String(f.total).padStart(5);
    const paddedPass = String(f.passed).padStart(4);
    const paddedFail = String(f.failed).padStart(4);
    console.log(`| ${paddedCode} | ${paddedName} | ${paddedTot} | ${paddedPass} | ${paddedFail} | ${status.padEnd(6)} |`);
  }
  console.log('================================================================');

  if (suiteState.totalFailed > 0) {
    console.error(`\n❌ REGRESSION / VERIFICATION DETECTED: ${suiteState.totalFailed} test(s) failed!`);
    console.error('\nList of Failures:');
    suiteState.failures.forEach((f, idx) => {
      console.error(`  ${idx + 1}. [${f.tierCode}] [${f.featureCode}] [${f.testId}]: ${f.message}`);
    });
    return false;
  }

  console.log('\n🎉 ALL EXECUTED TESTS PASSED! FEATURE INTEGRITY VERIFIED.');
  return true;
}
