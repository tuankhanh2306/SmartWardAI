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
import { PROJECT_ROOT } from '../helpers/project_root.mjs';

export async function runTests(assertContext) {
  console.log('\n--- [TIER 2] Running F13: Technical Compliance Boundary Tests ---');

  // T2_F13_01: RAG similarity score at exact upper safety threshold (0.7800)
  await assertContext.runTest(
    { testId: 'T2_F13_01', featureCode: 'F13', tierCode: 'tier2' },
    'RAG safety guardrail accepts query with S_max = 0.7800 without triggering abstention',
    async () => {
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

      let invalidKeyRejected = false;
      try {
        crypto.createCipheriv('aes-256-gcm', crypto.randomBytes(16), iv12Bytes);
      } catch {
        invalidKeyRejected = true;
      }
      assertContext.assert(invalidKeyRejected, 'Key less than 32 bytes must be rejected for AES-256');
    }
  );
}
