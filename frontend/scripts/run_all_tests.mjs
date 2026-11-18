import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, '../..');

console.log('================================================================');
console.log('SMARTWARD AI - COMPREHENSIVE REGRESSION GUARD RUNNER');
console.log('================================================================\n');

const suites = [
  {
    name: '1. Production Chatbox Acceptance Suite (44 assertions)',
    cmd: process.execPath,
    args: [path.join(currentDir, 'test_chatbox_production.mjs')],
    cwd: rootDir,
  },
  {
    name: '2. Challenger Robustness & Edge-case Suite (69 assertions)',
    cmd: process.execPath,
    args: [path.join(currentDir, 'test_challenger_robustness.mjs')],
    cwd: rootDir,
  },
  {
    name: '3. Challenger Adversarial Multi-Turn Suite (9 assertions)',
    cmd: process.execPath,
    args: [path.join(currentDir, 'test_challenger_adversarial_suite.mjs')],
    cwd: rootDir,
  },
  {
    name: '4. Intent Resolution & Out-of-Scope Suite (18 assertions)',
    cmd: process.execPath,
    args: [path.join(currentDir, 'test_intent_resolution.mjs')],
    cwd: rootDir,
  },
  {
    name: '5. End-to-End RAG Responses Suite (6 assertions)',
    cmd: process.execPath,
    args: [path.join(currentDir, 'test_rag_responses.mjs')],
    cwd: rootDir,
  },
  {
    name: '6. 48-Scenario Adversarial Edge Cases Suite (68 assertions)',
    cmd: process.execPath,
    args: [path.join(currentDir, 'test_adversarial_ai.mjs')],
    cwd: rootDir,
  },
  {
    name: '7. Dossier Submission & QR Pass Integrity Suite (30 assertions)',
    cmd: process.execPath,
    args: [path.join(currentDir, 'test_dossier_submission_integrity.mjs')],
    cwd: rootDir,
  },
  {
    name: '8. Intent Matching & Confidence Diacritics Regression Suite (49 assertions)',
    cmd: process.execPath,
    args: [path.join(currentDir, 'test_intent_matching_regression.mjs')],
    cwd: rootDir,
  },
  {
    name: '9. Voice Input Speech-to-Text Normalization Suite (17 assertions)',
    cmd: process.execPath,
    args: [path.join(currentDir, 'test_voice_input_normalization.mjs')],
    cwd: rootDir,
  },
  {
    name: '10. Role Gateway & 5-Min Session Boundary Suite (13 assertions)',
    cmd: process.execPath,
    args: [path.join(currentDir, 'test_role_gateway_regression.mjs')],
    cwd: rootDir,
  },
  {
    name: '11. Frontend TypeScript & Production Build (Vite)',
    cmd: process.platform === 'win32' ? 'cmd.exe' : 'npm',
    args: process.platform === 'win32' ? ['/c', 'npm --prefix frontend run build'] : ['--prefix', 'frontend', 'run', 'build'],
    cwd: rootDir,
  },
  ...(process.env.CI_FRONTEND_ONLY === 'true'
    ? []
    : [
        {
          name: '12. Backend JUnit RAG Query Service Test (16 assertions)',
          cmd: process.platform === 'win32' ? 'cmd.exe' : './mvnw',
          args: process.platform === 'win32' ? ['/c', 'mvnw.cmd test -Dtest=RagQueryServiceTest'] : ['test', '-Dtest=RagQueryServiceTest'],
          cwd: path.join(rootDir, 'backend'),
        },
      ]),
];

let failedCount = 0;
const results = [];

for (const suite of suites) {
  console.log(`\n>>> EXECUTING: ${suite.name}...`);
  const start = Date.now();
  const res = spawnSync(suite.cmd, suite.args, { stdio: 'inherit', cwd: suite.cwd });
  const duration = ((Date.now() - start) / 1000).toFixed(2);
  const passed = (res.status === 0);

  results.push({ name: suite.name, passed, duration, code: res.status });
  if (!passed) failedCount++;
}

console.log('\n================================================================');
console.log('REGRESSION GUARD EXECUTION SCOREBOARD');
console.log('================================================================');
results.forEach(r => {
  const mark = r.passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${mark}] ${r.name} (${r.duration}s, exit code: ${r.code})`);
});
console.log('================================================================');

if (failedCount > 0) {
  console.error(`\n❌ REGRESSION DETECTED: ${failedCount} suite(s) failed!`);
  process.exit(1);
} else {
  console.log('\n🎉 ALL SUITES PASSED! 100% REGRESSION-GUARD VERIFIED.');
  process.exit(0);
}
