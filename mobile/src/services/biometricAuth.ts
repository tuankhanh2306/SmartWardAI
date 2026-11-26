/**
 * SmartWard AI Mobile — Officer Biometric Authentication Service (TASK-043)
 * Uses expo-local-authentication (TouchID / FaceID / Android BiometricPrompt)
 * with secure preference persistence in expo-secure-store and safe PIN fallback.
 */

import { Platform } from 'react-native';

export const BIOMETRIC_ENABLED_KEY = 'smartward_officer_biometric_enabled_v1';

export interface BiometricCapability {
  available: boolean;
  label: string;
}

export interface BiometricAuthResult {
  success: boolean;
  fallbackToPin: boolean;
  message?: string;
}

async function setPref(key: string, value: string): Promise<void> {
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
  } catch {
    // Ignore restricted environment
  }
}

async function getPref(key: string): Promise<string | null> {
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
    return null;
  }
}

export async function checkBiometricCapability(): Promise<BiometricCapability> {
  if (Platform.OS === 'web') {
    return { available: false, label: 'Sinh trắc học' };
  }
  try {
    const LocalAuth = await import('expo-local-authentication');
    const hasHardware = await LocalAuth.hasHardwareAsync();
    if (!hasHardware) {
      return { available: false, label: 'Sinh trắc học' };
    }
    const isEnrolled = await LocalAuth.isEnrolledAsync();
    if (!isEnrolled) {
      return { available: false, label: 'Sinh trắc học' };
    }
    const types = await LocalAuth.supportedAuthenticationTypesAsync();
    const hasFace = types.includes(LocalAuth.AuthenticationType.FACIAL_RECOGNITION);
    const hasFingerprint = types.includes(LocalAuth.AuthenticationType.FINGERPRINT);
    const label = hasFace ? 'FaceID' : hasFingerprint ? 'Vân tay' : 'Sinh trắc học';
    return { available: true, label };
  } catch {
    return { available: false, label: 'Sinh trắc học' };
  }
}

export async function isBiometricUnlockEnabled(): Promise<boolean> {
  return (await getPref(BIOMETRIC_ENABLED_KEY)) === 'true';
}

export async function setBiometricUnlockEnabled(enabled: boolean): Promise<void> {
  await setPref(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function authenticateOfficerWithBiometrics(
  promptMessage = 'Xác thực sinh trắc học để mở khóa phiên Cán bộ Một cửa'
): Promise<BiometricAuthResult> {
  if (Platform.OS === 'web') {
    return {
      success: false,
      fallbackToPin: true,
      message: 'Trình duyệt không hỗ trợ mở khóa sinh trắc học. Vui lòng nhập mã PIN.',
    };
  }
  try {
    const LocalAuth = await import('expo-local-authentication');
    const capability = await checkBiometricCapability();
    if (!capability.available) {
      return {
        success: false,
        fallbackToPin: true,
        message: 'Thiết bị chưa bật Vân tay/FaceID. Vui lòng đăng nhập bằng mã PIN.',
      };
    }

    const result = await LocalAuth.authenticateAsync({
      promptMessage,
      cancelLabel: 'Nhập mã PIN',
      fallbackLabel: 'Dùng mã PIN',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true, fallbackToPin: false };
    }

    return {
      success: false,
      fallbackToPin: true,
      message: 'Xác thực sinh trắc học chưa thành công. Bạn có thể chuyển sang nhập mã PIN.',
    };
  } catch {
    return {
      success: false,
      fallbackToPin: true,
      message: 'Không thể khởi động cảm biến sinh trắc học. Vui lòng dùng mã PIN.',
    };
  }
}
