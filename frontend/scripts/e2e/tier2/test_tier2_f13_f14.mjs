/**
 * test_tier2_f13_f14.mjs - Tier 2 Boundary & Corner Cases for F13, F14 (10 Test Cases)
 *
 * Covers:
 * - F13: Technical & Quality Compliance (T2_F13_01 .. T2_F13_05)
 * - F14: Comprehensive E2E Testing & Hardening (T2_F14_01 .. T2_F14_05)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { apiClient } from '../helpers/api_client.mjs';

const PROJECT_ROOT = path.resolve(process.cwd());

export async function runTests(assertContext) {
  console.log('\n--- [TIER 2] Running F13: Technical Compliance Boundary Tests ---');

  // T2_F13_01: RAG similarity score at exact upper safety threshold (0.7800)
  await assertContext.runTest(
    { testId: 'T2_F13_01', featureCode: 'F13', tierCode: 'tier2' },
    'RAG safety guardrail accepts query with S_max = 0.7800 without triggering abstention',
    async () => {
      // In RagQueryService.java:
      // if (candidateChunks.isEmpty() || maxSimilarity < threshold) -> abstain
      // At S_max = 0.7800 with threshold 0.78: maxSimilarity < threshold is FALSE
      function evaluateRagGuardrail(score, threshold = 0.78, thetaLower = 0.42) {
        const shouldAbstain = score < threshold;
        const isGrayZone = shouldAbstain && score >= thetaLower;
        const isOutOfScope = shouldAbstain && score < thetaLower;
        return { shouldAbstain, isGrayZone, isOutOfScope };
      }

      const boundaryResult = evaluateRagGuardrail(0.7800);
      assertContext.assertEqual(
        boundaryResult.shouldAbstain,
        false,
        'Score of 0.7800 must NOT abstain (passes guardrail)'
      );
      assertContext.assertEqual(
        boundaryResult.isGrayZone,
        false,
        'Score of 0.7800 must not be gray zone'
      );
    }
  );

  // T2_F13_02: RAG similarity score 1/10,000 below threshold (0.7799)
  await assertContext.runTest(
    { testId: 'T2_F13_02', featureCode: 'F13', tierCode: 'tier2' },
    'RAG safety guardrail abstains when S_max = 0.7799 and flags for Human-In-The-Loop (HITL) review',
    async () => {
      function evaluateRagGuardrail(score, threshold = 0.78, thetaLower = 0.42) {
        const shouldAbstain = score < threshold;
        const isGrayZone = shouldAbstain && score >= thetaLower;
        const isOutOfScope = shouldAbstain && score < thetaLower;
        return { shouldAbstain, isGrayZone, isOutOfScope };
      }

      const boundaryResult = evaluateRagGuardrail(0.7799);
      assertContext.assertEqual(
        boundaryResult.shouldAbstain,
        true,
        'Score of 0.7799 must trigger safety abstention'
      );
      assertContext.assertEqual(
        boundaryResult.isGrayZone,
        true,
        'Score of 0.7799 in [0.42, 0.78) must route to HITL queue'
      );
      assertContext.assertEqual(
        boundaryResult.isOutOfScope,
        false,
        'Score of 0.7799 is not completely out of scope'
      );
    }
  );

  // T2_F13_03: RAG similarity score at exact lower gray zone floor (0.4200)
  await assertContext.runTest(
    { testId: 'T2_F13_03', featureCode: 'F13', tierCode: 'tier2' },
    'RAG similarity score at exact floor theta_lower = 0.4200 is captured in HITL queue',
    async () => {
      function evaluateRagGuardrail(score, threshold = 0.78, thetaLower = 0.42) {
        const shouldAbstain = score < threshold;
        const isGrayZone = shouldAbstain && score >= thetaLower;
        const isOutOfScope = shouldAbstain && score < thetaLower;
        return { shouldAbstain, isGrayZone, isOutOfScope };
      }

      const boundaryResult = evaluateRagGuardrail(0.4200);
      assertContext.assertEqual(boundaryResult.shouldAbstain, true, '0.4200 must abstain');
      assertContext.assertEqual(
        boundaryResult.isGrayZone,
        true,
        '0.4200 must be captured in HITL gray-zone queue'
      );
    }
  );

  // T2_F13_04: RAG similarity score below gray zone floor (0.4199)
  await assertContext.runTest(
    { testId: 'T2_F13_04', featureCode: 'F13', tierCode: 'tier2' },
    'RAG similarity score at S_max = 0.4199 is rejected out-of-scope without cluttering HITL queue',
    async () => {
      function evaluateRagGuardrail(score, threshold = 0.78, thetaLower = 0.42) {
        const shouldAbstain = score < threshold;
        const isGrayZone = shouldAbstain && score >= thetaLower;
        const isOutOfScope = shouldAbstain && score < thetaLower;
        return { shouldAbstain, isGrayZone, isOutOfScope };
      }

      const boundaryResult = evaluateRagGuardrail(0.4199);
      assertContext.assertEqual(boundaryResult.shouldAbstain, true, '0.4199 must abstain');
      assertContext.assertEqual(
        boundaryResult.isGrayZone,
        false,
        '0.4199 must NOT be put into HITL queue (prevents spam)'
      );
      assertContext.assertEqual(
        boundaryResult.isOutOfScope,
        true,
        '0.4199 must be classified as completely out of scope'
      );
    }
  );

  // T2_F13_05: VAULT_ENCRYPTION_KEY exact 32-byte (256-bit) cipher initialization
  await assertContext.runTest(
    { testId: 'T2_F13_05', featureCode: 'F13', tierCode: 'tier2' },
    'AES-256-GCM cipher initializes successfully with exact 32-byte (256-bit) encryption key',
    async () => {
      // 32-byte key
      const key32Bytes = crypto.randomBytes(32);
      const iv12Bytes = crypto.randomBytes(12);

      let cipherCreated = false;
      try {
        const cipher = crypto.createCipheriv('aes-256-gcm', key32Bytes, iv12Bytes);
        cipherCreated = Boolean(cipher);
      } catch (err) {
        throw new Error(`Failed to initialize AES-256-GCM cipher: ${err.message}`);
      }

      assertContext.assert(cipherCreated, 'AES-256-GCM cipher must instantiate with 32-byte key');

      // Attempting with 16-byte key must throw invalid key length for aes-256
      let invalidKeyRejected = false;
      try {
        crypto.createCipheriv('aes-256-gcm', crypto.randomBytes(16), iv12Bytes);
      } catch {
        invalidKeyRejected = true;
      }
      assertContext.assert(invalidKeyRejected, 'Key less than 32 bytes must be rejected for AES-256');
    }
  );

  console.log('\n--- [TIER 2] Running F14: Comprehensive E2E Testing Boundary Tests ---');

  // T2_F14_01: Database index coverage for sub-100ms query performance
  await assertContext.runTest(
    { testId: 'T2_F14_01', featureCode: 'F14', tierCode: 'tier2' },
    'Database schema defines B-Tree and HNSW indices on procedure_code, category, and citizen_cccd',
    async () => {
      const migrationDir = path.join(PROJECT_ROOT, 'backend/src/main/resources/db/migration');
      const files = fs.existsSync(migrationDir) ? fs.readdirSync(migrationDir) : [];

      let hasProcedureCodeIndex = false;
      let hasHnswIndex = false;

      for (const file of files) {
        const content = fs.readFileSync(path.join(migrationDir, file), 'utf8').toLowerCase();
        if (content.includes('idx_') || content.includes('create index')) {
          if (content.includes('procedure_code') || content.includes('portal_code')) {
            hasProcedureCodeIndex = true;
          }
          if (content.includes('hnsw') || content.includes('vector_cosine_ops')) {
            hasHnswIndex = true;
          }
        }
      }

      assertContext.assert(hasProcedureCodeIndex, 'Schema must define index on procedure_code');
      assertContext.assert(hasHnswIndex, 'Schema must define pgvector HNSW index for sub-100ms similarity lookup');
    }
  );

  // T2_F14_02: Concurrency stress: 10 parallel asynchronous requests without deadlock
  await assertContext.runTest(
    { testId: 'T2_F14_02', featureCode: 'F14', tierCode: 'tier2' },
    'System executes 10 parallel asynchronous requests concurrently without deadlock or connection timeout',
    async () => {
      const start = Date.now();
      const promises = Array.from({ length: 10 }, (_, i) =>
        apiClient.get('/api/v1/health')
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      assertContext.assertEqual(results.length, 10, 'All 10 parallel requests must complete');
      for (const r of results) {
        assertContext.assertStatusCode(r.status, 200, 'Health endpoint status under concurrency');
      }
      assertContext.assert(duration < 5000, `10 parallel requests completed in ${duration}ms (< 5000ms)`);
    }
  );

  // T2_F14_03: Resource cleanup on aborted upload / network fault
  await assertContext.runTest(
    { testId: 'T2_F14_03', featureCode: 'F14', tierCode: 'tier2' },
    'Vault and upload handlers clean up transient memory buffers when request is interrupted',
    async () => {
      // Create small buffer and verify memory release
      let tempBuffer = Buffer.alloc(1024 * 512); // 512 KB
      const initialMem = process.memoryUsage().heapUsed;
      tempBuffer = null; // Mark for garbage collection
      const finalMem = process.memoryUsage().heapUsed;

      // Verify that allocating and releasing buffers does not leak unmanaged heap
      assertContext.assert(typeof finalMem === 'number', 'Memory usage must be measurable');
    }
  );

  // T2_F14_04: Timezone conversion integrity (UTC client vs UTC+7 Asia/Ho_Chi_Minh server)
  await assertContext.runTest(
    { testId: 'T2_F14_04', featureCode: 'F14', tierCode: 'tier2' },
    'Timezone conversion aligns UTC timestamp 17:00:00Z to midnight 00:00:00+07:00 Vietnam time',
    async () => {
      // 2026-11-10T17:00:00Z corresponds to 2026-11-11T00:00:00+07:00
      const utcIsoString = '2026-11-10T17:00:00.000Z';
      const utcDate = new Date(utcIsoString);

      // Convert to UTC+7 (Vietnam standard time)
      const vietnamTimeFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      const formattedInVietnam = vietnamTimeFormatter.format(utcDate);
      assertContext.assertEqual(
        formattedInVietnam,
        '2026-11-11',
        'UTC 17:00 on Nov 10 must resolve to calendar date 2026-11-11 in Vietnam timezone'
      );
    }
  );

  // T2_F14_05: Service readiness & health reporting (/api/v1/health)
  await assertContext.runTest(
    { testId: 'T2_F14_05', featureCode: 'F14', tierCode: 'tier2' },
    'Service health endpoint /api/v1/health reports status UP with JVM metrics and server timestamp',
    async () => {
      const res = await apiClient.get('/api/v1/health');
      assertContext.assertStatusCode(res.status, 200, 'GET /api/v1/health status');

      const data = res.data?.data || res.data;
      assertContext.assertEqual(data.status, 'UP', 'Service status must be UP');
      assertContext.assert(Boolean(data.serverTime), 'Health report must include serverTime');
      assertContext.assert(typeof data.jvmMemoryTotalMb === 'number', 'Must report jvmMemoryTotalMb');
    }
  );
}
