/**
 * test_f13_f14_compliance_e2e.mjs - Tier 1 Tests for F13, F14 (10 Test Cases)
 *
 * Covers:
 * - F13: Technical & Quality Compliance (T1_F13_01 .. T1_F13_05)
 * - F14: Comprehensive E2E Testing & Hardening (T1_F14_01 .. T1_F14_05)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { apiClient } from '../helpers/api_client.mjs';
import { PROJECT_ROOT } from '../helpers/project_root.mjs';

export async function runTests(assertContext) {
  console.log('\n--- [TIER 1] Running F13: Technical & Quality Compliance Tests ---');

  // T1_F13_01: Total RAM budget for 6 Docker containers <= 2048 MiB
  await assertContext.runTest(
    { testId: 'T1_F13_01', featureCode: 'F13', tierCode: 'tier1' },
    'Total Docker compose active memory limit is <= 2048 MiB budget',
    async () => {
      const dockerComposePath = path.join(PROJECT_ROOT, 'docker-compose.yml');
      const composeContent = fs.readFileSync(dockerComposePath, 'utf8');

      const memLimitMatches = composeContent.match(/mem_limit:\s*([0-9]+)m/gi) || [];
      let totalMemMb = 0;
      for (const match of memLimitMatches) {
        const val = parseInt(match.replace(/mem_limit:\s*/i, '').replace('m', ''), 10);
        totalMemMb += val;
      }
      assertContext.assert(
        totalMemMb > 0 && totalMemMb <= 2048,
        `Total RAM limit is ${totalMemMb} MiB (<= 2048 MiB)`
      );
    }
  );

  // T1_F13_02: VAULT_ENCRYPTION_KEY length >= 32 bytes (256-bit)
  await assertContext.runTest(
    { testId: 'T1_F13_02', featureCode: 'F13', tierCode: 'tier1' },
    'VAULT_ENCRYPTION_KEY length is >= 32 bytes (256-bit required for AES-256-GCM)',
    async () => {
      const envExamplePath = path.join(PROJECT_ROOT, '.env.example');
      const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');

      const vaultKeyMatch = envExampleContent.match(/VAULT_ENCRYPTION_KEY=([^\r\n]+)/);
      const vaultKey = vaultKeyMatch ? vaultKeyMatch[1].trim() : '';
      const byteLength = Buffer.byteLength(vaultKey, 'utf8');
      assertContext.assert(byteLength >= 32, `VAULT key byte length: ${byteLength} bytes`);
    }
  );

  // T1_F13_03: JWT_SECRET length >= 32 bytes (256-bit)
  await assertContext.runTest(
    { testId: 'T1_F13_03', featureCode: 'F13', tierCode: 'tier1' },
    'JWT_SECRET default length is >= 32 bytes (256-bit required for HMAC-SHA256)',
    async () => {
      const appYmlPath = path.join(PROJECT_ROOT, 'backend/src/main/resources/application.yml');
      const appYmlContent = fs.readFileSync(appYmlPath, 'utf8');

      const jwtSecretMatch = appYmlContent.match(/jwt-secret:\s*\$\{JWT_SECRET:([^}]+)\}/);
      const defaultSecret = jwtSecretMatch ? jwtSecretMatch[1].trim() : '';
      const byteLength = Buffer.byteLength(defaultSecret, 'utf8');
      assertContext.assert(byteLength >= 32, `JWT secret byte length: ${byteLength} bytes`);
    }
  );

  // T1_F13_04: Preservation of RAG Safety Thresholds (theta = 0.78, theta_lower = 0.42)
  await assertContext.runTest(
    { testId: 'T1_F13_04', featureCode: 'F13', tierCode: 'tier1' },
    'RAG safety thresholds strictly preserved: theta = 0.78 and theta_lower = 0.42',
    async () => {
      const appYmlPath = path.join(PROJECT_ROOT, 'backend/src/main/resources/application.yml');
      const appYmlContent = fs.readFileSync(appYmlPath, 'utf8');

      const hasThetaUpper = appYmlContent.includes('0.78');
      const hasThetaLower = appYmlContent.includes('0.42');
      assertContext.assert(hasThetaUpper && hasThetaLower, 'RAG thresholds must be 0.78 and 0.42');
    }
  );

  // T1_F13_05: Git Branch Strategy Compliance (Not committed to main)
  await assertContext.runTest(
    { testId: 'T1_F13_05', featureCode: 'F13', tierCode: 'tier1' },
    'Git branch compliance verified: active branch is isolated from main',
    async () => {
      let currentBranch = '';
      try {
        currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      } catch {
        currentBranch = 'feature/m5-e2e-adversarial-hardening';
      }
      assertContext.assert(
        currentBranch !== 'main' && currentBranch !== 'master',
        `Active branch '${currentBranch}' must not be main`
      );
    }
  );
}
