/**
 * assertions.mjs - Comprehensive Assertion Helpers & Result Collector
 *
 * Tracks test execution status across Tiers (Tier 1..5) and Features (F1..F14),
 * ensuring 1 test case = 1 test execution entry for accurate scoreboard reporting.
 */

export class AssertionError extends Error {
  constructor(message, expected, actual, metadata = {}) {
    super(message);
    this.name = 'AssertionError';
    this.expected = expected;
    this.actual = actual;
    this.metadata = metadata;
  }
}

export function initializeTestSuiteState() {
  return {
    totalTests: 0,
    totalPassed: 0,
    totalFailed: 0,
    startTime: Date.now(),
    tierResults: {
      tier1: { code: 'tier1', name: 'Tier 1: Feature Coverage (F1..F14)', total: 0, passed: 0, failed: 0, durationMs: 0 },
      tier2: { code: 'tier2', name: 'Tier 2: Boundary & Corner Cases', total: 0, passed: 0, failed: 0, durationMs: 0 },
      tier3: { code: 'tier3', name: 'Tier 3: Cross-Feature Interactions', total: 0, passed: 0, failed: 0, durationMs: 0 },
      tier4: { code: 'tier4', name: 'Tier 4: Real-World Life Scenarios', total: 0, passed: 0, failed: 0, durationMs: 0 },
      tier5: { code: 'tier5', name: 'Tier 5: Adversarial Hardening', total: 0, passed: 0, failed: 0, durationMs: 0 },
    },
    featureResults: {
      F1:  { code: 'F1',  name: 'Seed JSON Standardization', total: 0, passed: 0, failed: 0 },
      F2:  { code: 'F2',  name: 'Admin Procedures REST API', total: 0, passed: 0, failed: 0 },
      F3:  { code: 'F3',  name: 'Procedure Hardcode Removal', total: 0, passed: 0, failed: 0 },
      F4:  { code: 'F4',  name: 'Enhanced Form Precheck Engine', total: 0, passed: 0, failed: 0 },
      F5:  { code: 'F5',  name: 'Dynamic A4 Form Modal', total: 0, passed: 0, failed: 0 },
      F6:  { code: 'F6',  name: 'Smart Checklist & Exemption', total: 0, passed: 0, failed: 0 },
      F7:  { code: 'F7',  name: 'Real QR CCCD Scanner & Decoder', total: 0, passed: 0, failed: 0 },
      F8:  { code: 'F8',  name: 'Multi-Document OCR Cross-Check', total: 0, passed: 0, failed: 0 },
      F9:  { code: 'F9',  name: 'Zero-Trust Vault UI Integration', total: 0, passed: 0, failed: 0 },
      F10: { code: 'F10', name: 'Database Persistence & Flyway', total: 0, passed: 0, failed: 0 },
      F11: { code: 'F11', name: 'Dossier Tracking & Management', total: 0, passed: 0, failed: 0 },
      F12: { code: 'F12', name: 'Security & Officer RBAC Enforcement', total: 0, passed: 0, failed: 0 },
      F13: { code: 'F13', name: 'Technical & Quality Compliance', total: 0, passed: 0, failed: 0 },
      F14: { code: 'F14', name: 'Comprehensive E2E Testing Suite', total: 0, passed: 0, failed: 0 },
    },
    failures: [],
  };
}

export function createAssertionContext(suiteState) {
  return {
    async runTest(metadata, testName, testFn) {
      const { testId, featureCode, tierCode = 'tier1' } = metadata;
      suiteState.totalTests++;
      if (featureCode && suiteState.featureResults[featureCode]) {
        suiteState.featureResults[featureCode].total++;
      }
      if (tierCode && suiteState.tierResults[tierCode]) {
        suiteState.tierResults[tierCode].total++;
      }

      try {
        await testFn();
        suiteState.totalPassed++;
        if (featureCode && suiteState.featureResults[featureCode]) {
          suiteState.featureResults[featureCode].passed++;
        }
        if (tierCode && suiteState.tierResults[tierCode]) {
          suiteState.tierResults[tierCode].passed++;
        }
        console.log(`  ✓ [PASS] [${testId}] ${testName}`);
      } catch (err) {
        suiteState.totalFailed++;
        if (featureCode && suiteState.featureResults[featureCode]) {
          suiteState.featureResults[featureCode].failed++;
        }
        if (tierCode && suiteState.tierResults[tierCode]) {
          suiteState.tierResults[tierCode].failed++;
        }
        suiteState.failures.push({
          testId,
          featureCode: featureCode || 'N/A',
          tierCode: tierCode || 'tier1',
          testName,
          message: err.message,
        });
        console.error(`  ❌ [FAIL] [${testId}] ${testName} -> ${err.message}`);
      }
    },

    assert(condition, message) {
      if (!condition) {
        throw new AssertionError(message, true, condition);
      }
    },

    assertEqual(actual, expected, message) {
      if (actual !== expected) {
        throw new AssertionError(
          `${message} (Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)})`,
          expected,
          actual
        );
      }
    },

    assertStatusCode(actualStatus, expectedStatus, message) {
      if (actualStatus !== expectedStatus) {
        throw new AssertionError(
          `${message} (Expected HTTP ${expectedStatus}, received HTTP ${actualStatus})`,
          expectedStatus,
          actualStatus
        );
      }
    },

    assertJsonStructure(payload, requiredKeys = [], message) {
      const isObj = payload && typeof payload === 'object' && !Array.isArray(payload);
      if (!isObj) {
        throw new AssertionError(`${message} (Payload is not a valid JSON object)`);
      }
      const missingKeys = requiredKeys.filter((k) => !(k in payload));
      if (missingKeys.length > 0) {
        throw new AssertionError(`${message} (Missing required keys: ${missingKeys.join(', ')})`);
      }
    },

    assertErrorMessage(payload, expectedErrorPattern, message) {
      const errText = [
        payload?.message || '',
        payload?.error || '',
        payload?.errorCode || '',
        payload?.code || '',
        Array.isArray(payload?.fieldValidations)
          ? payload.fieldValidations.map((f) => `${f.errorCode || ''} ${f.errorMessage || ''}`).join(' ')
          : '',
        Array.isArray(payload?.warnings) ? payload.warnings.join(' ') : ''
      ].join(' ');

      const match =
        typeof expectedErrorPattern === 'string'
          ? errText.includes(expectedErrorPattern)
          : expectedErrorPattern.test(errText);

      if (!match) {
        throw new AssertionError(
          `${message} (Pattern '${expectedErrorPattern}' not found in response: "${errText.trim().slice(0, 150)}...")`
        );
      }
    },

    assertIncludes(actualStringOrArray, expectedItem, message) {
      let match = false;
      if (typeof actualStringOrArray === 'string') {
        match = actualStringOrArray.includes(expectedItem);
      } else if (Array.isArray(actualStringOrArray)) {
        match = actualStringOrArray.includes(expectedItem);
      }
      if (!match) {
        throw new AssertionError(
          `${message} (Target does not include: ${JSON.stringify(expectedItem)})`
        );
      }
    },

    assertMatches(actualStr, regex, message) {
      if (!regex.test(String(actualStr))) {
        throw new AssertionError(
          `${message} (String does not match regex ${regex}: "${actualStr}")`
        );
      }
    },
  };
}
