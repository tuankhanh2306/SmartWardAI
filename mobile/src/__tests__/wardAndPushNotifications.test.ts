import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPost, mockGet, mockStorage } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
  mockStorage: new Map<string, string>(),
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => mockStorage.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      mockStorage.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      mockStorage.delete(k);
    }),
  },
}));

vi.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn(async () => undefined),
  getPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: vi.fn(async () => ({ data: 'ExponentPushToken[mobileUnitTest01]' })),
}));

vi.mock('../api/client', () => ({
  apiClient: { post: mockPost, get: mockGet },
  registerPushDevice: vi.fn(async (req: unknown) => {
    mockPost('/notifications/register-device', req);
    return {
      registered: true,
      deviceId: 99,
      platform: 'android',
      updatedAt: new Date().toISOString(),
    };
  }),
  unregisterPushDevice: vi.fn(async (token: string) => {
    mockPost('/notifications/unregister-device', { expoPushToken: token });
    return { unregistered: true };
  }),
}));

import {
  disablePushNotifications,
  isPushNotificationsEnabled,
  registerDossierPushSubscription,
} from '../services/pushNotifications';

describe('TASK-023 Mobile Push Notifications', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGet.mockReset();
    mockStorage.clear();
  });

  it('registers Expo Push Token with Backend and normalizes dossier code', async () => {
    const res = await registerDossierPushSubscription({
      dossierCode: 'hs-2026-1001',
      wardCode: 'AG_P_LONGXUYEN',
      deviceLabel: 'Test Android',
    });

    expect(res.ok).toBe(true);
    expect(res.permissionStatus).toBe('granted');
    expect(res.token).toBe('ExponentPushToken[mobileUnitTest01]');
    expect(mockPost).toHaveBeenCalledWith(
      '/notifications/register-device',
      expect.objectContaining({
        expoPushToken: 'ExponentPushToken[mobileUnitTest01]',
        platform: 'android',
        wardCode: 'AG_P_LONGXUYEN',
        dossierCode: 'HS-2026-1001',
      })
    );
    expect(await isPushNotificationsEnabled()).toBe(true);
  });

  it('unregisters push device cleanly when user opts out', async () => {
    await registerDossierPushSubscription({ dossierCode: 'HS-2026-2002' });
    await disablePushNotifications();

    expect(mockPost).toHaveBeenCalledWith('/notifications/unregister-device', {
      expoPushToken: 'ExponentPushToken[mobileUnitTest01]',
    });
    expect(await isPushNotificationsEnabled()).toBe(false);
  });
});
