/**
 * SmartWard AI Mobile — Lưu trữ Bảo mật JWT & Hồ sơ Cán bộ
 * Sử dụng expo-secure-store (iOS Keychain / Android Keystore) với fallback an toàn sang AsyncStorage / Memory.
 */

import type { OfficerPrincipal } from '../types/api.types';

export const OFFICER_TOKEN_KEY = 'smartward_officer_token';
export const OFFICER_PROFILE_KEY = 'smartward_officer_profile';

const memoryFallback = new Map<string, string>();
let cachedToken: string | null | undefined = undefined;

export function resetOfficerTokenMemoryCache(): void {
  cachedToken = undefined;
}

async function setItemRaw(key: string, value: string): Promise<void> {
  try {
    const SecureStore = await import('expo-secure-store');
    if (typeof SecureStore.isAvailableAsync === 'function' && (await SecureStore.isAvailableAsync())) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
  } catch {
    // Fallback below
  }

  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(key, value);
    return;
  } catch {
    memoryFallback.set(key, value);
  }
}

async function getItemRaw(key: string): Promise<string | null> {
  try {
    const SecureStore = await import('expo-secure-store');
    if (typeof SecureStore.isAvailableAsync === 'function' && (await SecureStore.isAvailableAsync())) {
      return await SecureStore.getItemAsync(key);
    }
  } catch {
    // Fallback below
  }

  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    return await AsyncStorage.getItem(key);
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

async function deleteItemRaw(key: string): Promise<void> {
  try {
    const SecureStore = await import('expo-secure-store');
    if (typeof SecureStore.isAvailableAsync === 'function' && (await SecureStore.isAvailableAsync())) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
  } catch {
    // Fallback below
  }

  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.removeItem(key);
    return;
  } catch {
    memoryFallback.delete(key);
  }
}

/**
 * Decodes JWT payload (Base64URL) and returns true if token is malformed or expired.
 */
export function isJwtExpired(token: string | null | undefined, clockSkewSeconds = 15): boolean {
  if (!token || typeof token !== 'string') return true;
  const parts = token.split('.');
  if (parts.length !== 3) return true;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decodedJson =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    const payload = JSON.parse(decodedJson) as { exp?: number };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 < Date.now() + clockSkewSeconds * 1000;
  } catch {
    return true;
  }
}

export async function saveOfficerSession(
  token: string,
  profile: OfficerPrincipal
): Promise<void> {
  cachedToken = token;
  await Promise.all([
    setItemRaw(OFFICER_TOKEN_KEY, token),
    setItemRaw(OFFICER_PROFILE_KEY, JSON.stringify(profile)),
  ]);
}

export async function getOfficerToken(): Promise<string | null> {
  if (cachedToken === undefined) {
    cachedToken = await getItemRaw(OFFICER_TOKEN_KEY);
  }
  if (!cachedToken) return null;
  if (isJwtExpired(cachedToken)) {
    await clearOfficerSession();
    return null;
  }
  return cachedToken;
}

export async function getOfficerProfile(): Promise<OfficerPrincipal | null> {
  const raw = await getItemRaw(OFFICER_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OfficerPrincipal;
  } catch {
    return null;
  }
}

export async function clearOfficerSession(): Promise<void> {
  cachedToken = null;
  await Promise.all([
    deleteItemRaw(OFFICER_TOKEN_KEY),
    deleteItemRaw(OFFICER_PROFILE_KEY),
  ]);
}
