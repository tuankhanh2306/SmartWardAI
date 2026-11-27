/**
 * SmartWard AI Mobile — Push Notification Service (TASK-023)
 * Uses expo-notifications to obtain an Expo Push Token and register it
 * against POST /api/v1/notifications/register-device for dossier updates.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerPushDevice, unregisterPushDevice } from '../api/client';

const STORAGE_PUSH_TOKEN_KEY = 'smartward_expo_push_token_v1';
const STORAGE_PUSH_ENABLED_KEY = 'smartward_push_notifications_enabled_v1';

export interface PushRegistrationOutcome {
  ok: boolean;
  token?: string;
  permissionStatus: 'granted' | 'denied' | 'unsupported';
  message: string;
}

async function loadExpoNotificationsModule(): Promise<typeof import('expo-notifications') | null> {
  return ExpoNotifications ?? null;
}

export async function configureForegroundNotificationHandler(): Promise<void> {
  const Notifications = await loadExpoNotificationsModule();
  if (!Notifications || typeof Notifications.setNotificationHandler !== 'function') return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestExpoPushToken(): Promise<{
  token: string | null;
  permissionStatus: 'granted' | 'denied' | 'unsupported';
}> {
  if (Platform.OS === 'web') {
    return { token: null, permissionStatus: 'unsupported' };
  }

  const Notifications = await loadExpoNotificationsModule();
  if (!Notifications) {
    return { token: null, permissionStatus: 'unsupported' };
  }

  try {
    if (Platform.OS === 'android' && typeof Notifications.setNotificationChannelAsync === 'function') {
      await Notifications.setNotificationChannelAsync('dossier-updates', {
        name: 'Cập nhật hồ sơ hành chính',
        importance: Notifications.AndroidImportance?.HIGH ?? 4,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;
    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') {
      return { token: null, permissionStatus: 'denied' };
    }

    const tokenResp = await Notifications.getExpoPushTokenAsync();
    const token = tokenResp?.data?.trim() || null;
    if (token) {
      await AsyncStorage.setItem(STORAGE_PUSH_TOKEN_KEY, token);
      await AsyncStorage.setItem(STORAGE_PUSH_ENABLED_KEY, 'true');
    }
    return { token, permissionStatus: 'granted' };
  } catch {
    return { token: null, permissionStatus: 'unsupported' };
  }
}

export async function registerDossierPushSubscription(params: {
  dossierCode?: string;
  wardCode?: string;
  deviceLabel?: string;
}): Promise<PushRegistrationOutcome> {
  const { token, permissionStatus } = await requestExpoPushToken();
  if (!token) {
    if (permissionStatus === 'denied') {
      return {
        ok: false,
        permissionStatus: 'denied',
        message: 'Bạn chưa cấp quyền thông báo cho ứng dụng. Vui lòng bật trong Cài đặt điện thoại.',
      };
    }
    return {
      ok: false,
      permissionStatus: 'unsupported',
      message: 'Thiết bị hiện tại (trình duyệt/giả lập) chưa hỗ trợ Expo Push Token thật.',
    };
  }

  const platform: 'ios' | 'android' | 'web' =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  await registerPushDevice({
    expoPushToken: token,
    platform,
    wardCode: params.wardCode,
    dossierCode: params.dossierCode?.trim().toUpperCase(),
    deviceLabel: params.deviceLabel,
  });

  return {
    ok: true,
    token,
    permissionStatus: 'granted',
    message: params.dossierCode
      ? `Đã bật thông báo đẩy cho hồ sơ ${params.dossierCode.trim().toUpperCase()}.`
      : 'Đã bật thông báo đẩy kết quả hồ sơ trên thiết bị này.',
  };
}

export async function disablePushNotifications(): Promise<void> {
  const saved = await AsyncStorage.getItem(STORAGE_PUSH_TOKEN_KEY);
  if (saved) {
    try {
      await unregisterPushDevice(saved);
    } catch {
      // Ignore network errors when opting out locally
    }
  }
  await AsyncStorage.setItem(STORAGE_PUSH_ENABLED_KEY, 'false');
}

export async function isPushNotificationsEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_PUSH_ENABLED_KEY)) === 'true';
  } catch {
    return false;
  }
}
