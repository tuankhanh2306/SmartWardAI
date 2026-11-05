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
    name: '7. Frontend TypeScript & Production Build (Vite)',
    cmd: process.platform === 'win32' ? 'cmd.exe' : 'npm',
    args: process.platform === 'win32' ? ['/c', 'npm --prefix frontend run build'] : ['--prefix', 'frontend', 'run', 'build'],
    cwd: rootDir,
  },
  {
    name: '8. Backend JUnit RAG Query Service Test (16 assertions)',
    cmd: process.platform === 'win32' ? 'cmd.exe' : './mvnw',
    args: process.platform === 'win32' ? ['/c', 'cd backend && mvnw.cmd test -Dtest=RagQueryServiceTest'] : ['test', '-Dtest=RagQueryServiceTest'],
    cwd: rootDir,
  },
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
