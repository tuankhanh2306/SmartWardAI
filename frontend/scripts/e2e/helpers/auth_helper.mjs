/**
 * auth_helper.mjs - Officer Authentication Helper & Token Manager
 *
 * Provides single-sign-on caching, officer role catalog, token lifecycle management,
 * and adversarial token generators for E2E testing.
 */

import { apiClient } from './api_client.mjs';

const DEFAULT_QA_PIN = process.env.SMARTWARD_OFFICER_PIN || 'SmartWardQa2026!';

export const OFFICER_ACCOUNTS = {
  JUSTICE_CIVIC: {
    badgeId: 'CC-AG-8942',
    pin: DEFAULT_QA_PIN,
    wardCode: 'AG_P_LONGXUYEN',
    role: 'OFFICER',
    fullName: 'Trần Quốc Bảo — Cán bộ Tư pháp - Hộ tịch',
  },
  LAND_URBAN: {
    badgeId: 'CC-AG-1001',
    pin: DEFAULT_QA_PIN,
    wardCode: 'AG_P_LONGXUYEN',
    role: 'OFFICER',
    fullName: 'Phạm Minh Đức — Cán bộ Địa chính - Đô thị',
  },
};

let cachedOfficerToken = null;
let cachedOfficerData = null;

async function postLogin(badgeId, pin, wardCode) {
  let res = await apiClient.post('/api/v1/auth/officer/login', { badgeId, pin, wardCode });
  if (res.status === 404) {
    res = await apiClient.post('/api/v1/officer/login', { badgeId, pin, wardCode });
  }
  return res;
}

/**
 * Logs in an officer and caches the Bearer JWT token in the shared ApiClient.
 */
export async function loginOfficer(
  badgeId = OFFICER_ACCOUNTS.JUSTICE_CIVIC.badgeId,
  pin = OFFICER_ACCOUNTS.JUSTICE_CIVIC.pin,
  wardCode = OFFICER_ACCOUNTS.JUSTICE_CIVIC.wardCode
) {
  const isDefaultPin =
    pin === DEFAULT_QA_PIN ||
    pin === OFFICER_ACCOUNTS.JUSTICE_CIVIC.pin ||
    pin === OFFICER_ACCOUNTS.LAND_URBAN.pin;
  const candidatePins = isDefaultPin
    ? [...new Set([pin, 'SmartWardDev2026!', 'SmartWardE2E2026!', '8942'])]
    : [pin];

  let res = null;
  let matchedPin = pin;
  for (const candidatePin of candidatePins) {
    res = await postLogin(badgeId, candidatePin, wardCode);
    if (res.ok && res.data?.data?.token) {
      matchedPin = candidatePin;
      break;
    }
  }

  // Handle mandatory first-login PIN rotation (mustChangePin === true -> PIN >= 6 chars)
  if (res?.ok && res.data?.data?.mustChangePin === true && res.data?.data?.token) {
    const newPin = matchedPin === 'SmartWardQa2026!' ? 'SmartWardE2E2026!' : 'SmartWardQa2026!';
    const changeRes = await apiClient.post(
      '/api/v1/auth/officer/change-pin',
      {
        badgeId,
        currentPin: matchedPin,
        newPin,
        confirmPin: newPin,
      },
      { headers: { Authorization: `Bearer ${res.data.data.token}` } }
    );
    if (changeRes.ok) {
      res = await postLogin(badgeId, newPin, wardCode);
      if (res.ok && res.data?.data?.token) {
        if (badgeId === OFFICER_ACCOUNTS.JUSTICE_CIVIC.badgeId) {
          OFFICER_ACCOUNTS.JUSTICE_CIVIC.pin = newPin;
        } else if (badgeId === OFFICER_ACCOUNTS.LAND_URBAN.badgeId) {
          OFFICER_ACCOUNTS.LAND_URBAN.pin = newPin;
        }
      }
    }
  }

  if (res?.ok && res.data?.data?.token) {
    cachedOfficerToken = res.data.data.token;
    cachedOfficerData = res.data.data;
    apiClient.setOfficerToken(cachedOfficerToken);
  }

  return res;
}

/**
 * Returns a valid cached token, logging in if necessary.
 */
export async function getValidOfficerToken() {
  if (cachedOfficerToken) {
    return cachedOfficerToken;
  }
  const res = await loginOfficer();
  if (res.ok && cachedOfficerToken) {
    return cachedOfficerToken;
  }
  throw new Error(`Failed to obtain valid officer token: HTTP ${res.status} - ${JSON.stringify(res.data)}`);
}

/**
 * Logs out the officer and invalidates the session token in Redis/Backend blacklist.
 */
export async function logoutOfficer() {
  if (!cachedOfficerToken) {
    return { ok: true, status: 200, message: 'Already logged out' };
  }

  const res = await apiClient.post('/api/v1/auth/officer/logout', {});
  cachedOfficerToken = null;
  cachedOfficerData = null;
  apiClient.clearOfficerToken();
  return res;
}

/**
 * Returns cached officer profile or queries GET /api/v1/auth/officer/me.
 */
export async function getOfficerProfile() {
  return apiClient.get('/api/v1/auth/officer/me');
}

/**
 * Generates an adversarial malformed JWT token (corrupted signature).
 */
export function createMalformedToken() {
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJDQy1BRy04OTQyIiwicm9sZSI6Ik9GRklDRVIifQ.INVALID_SIGNATURE_FOR_TESTING';
}

/**
 * Generates an expired token payload (exp epoch in the past).
 */
export function createExpiredToken() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'CC-AG-8942',
      role: 'OFFICER',
      iat: 1600000000,
      exp: 1600000001, // Expired in 2020
    })
  ).toString('base64url');
  return `${header}.${payload}.MOCK_EXPIRED_SIGNATURE`;
}
