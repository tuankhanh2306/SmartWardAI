import { beforeEach, describe, expect, it, vi } from 'vitest';

const { secureStoreMap, localAuthMocks } = vi.hoisted(() => ({
  secureStoreMap: new Map<string, string>(),
  localAuthMocks: {
    hasHardwareAsync: vi.fn(async () => true),
    isEnrolledAsync: vi.fn(async () => true),
    supportedAuthenticationTypesAsync: vi.fn(async () => [1]),
    authenticateAsync: vi.fn(async () => ({ success: true })),
    AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  },
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

vi.mock('expo-secure-store', () => ({
  isAvailableAsync: vi.fn(async () => true),
  getItemAsync: vi.fn(async (k: string) => secureStoreMap.get(k) ?? null),
  setItemAsync: vi.fn(async (k: string, v: string) => {
    secureStoreMap.set(k, v);
  }),
  deleteItemAsync: vi.fn(async (k: string) => {
    secureStoreMap.delete(k);
  }),
}));

vi.mock('expo-local-authentication', () => localAuthMocks);

import {
  authenticateOfficerWithBiometrics,
  checkBiometricCapability,
  isBiometricUnlockEnabled,
  setBiometricUnlockEnabled,
} from '../services/biometricAuth';
import {
  buildSqlCipherPragmaKeyStatement,
  decryptWalletField,
  encryptWalletField,
  getOrCreateSqliteMasterKeyHex,
  isEncryptedWalletValue,
  resetSqliteMasterKeyCacheForTests,
  SQLITE_MASTER_KEY_STORAGE_ID,
} from '../storage/sqliteEncryption';
import {
  getAllWalletQrPasses,
  getRawMemoryWalletPassForTests,
  upsertWalletQrPass,
} from '../storage/sqliteDb';

describe('TASK-043 Officer Biometric Unlock', () => {
  beforeEach(() => {
    secureStoreMap.clear();
    localAuthMocks.hasHardwareAsync.mockResolvedValue(true);
    localAuthMocks.isEnrolledAsync.mockResolvedValue(true);
    localAuthMocks.supportedAuthenticationTypesAsync.mockResolvedValue([1]);
    localAuthMocks.authenticateAsync.mockResolvedValue({ success: true });
  });

  it('detects fingerprint hardware and persists biometric toggle in SecureStore', async () => {
    const cap = await checkBiometricCapability();
    expect(cap.available).toBe(true);
    expect(cap.label).toBe('Vân tay');

    expect(await isBiometricUnlockEnabled()).toBe(false);
    await setBiometricUnlockEnabled(true);
    expect(await isBiometricUnlockEnabled()).toBe(true);
  });

  it('returns fallbackToPin=true when biometric verification fails or is cancelled', async () => {
    localAuthMocks.authenticateAsync.mockResolvedValueOnce({ success: false });
    const res = await authenticateOfficerWithBiometrics();
    expect(res.success).toBe(false);
    expect(res.fallbackToPin).toBe(true);
  });

  it('succeeds when biometric authentication passes', async () => {
    const res = await authenticateOfficerWithBiometrics();
    expect(res.success).toBe(true);
    expect(res.fallbackToPin).toBe(false);
  });
});

describe('TASK-025 SQLite / QR Pass Wallet Encryption', () => {
  beforeEach(() => {
    secureStoreMap.clear();
    resetSqliteMasterKeyCacheForTests();
  });

  it('generates and persists a 256-bit master key in Keychain/Keystore (SecureStore)', async () => {
    const key1 = await getOrCreateSqliteMasterKeyHex();
    expect(key1).toMatch(/^[0-9a-f]{64}$/i);
    expect(secureStoreMap.get(SQLITE_MASTER_KEY_STORAGE_ID)).toBe(key1);

    const key2 = await getOrCreateSqliteMasterKeyHex();
    expect(key2).toBe(key1);
    expect(buildSqlCipherPragmaKeyStatement(key1)).toBe(`PRAGMA key = "x'${key1}'";`);
  });

  it('encrypts sensitive wallet fields at rest and decrypts transparently on read', async () => {
    const cipher = await encryptWalletField('3490');
    expect(cipher).toBeTruthy();
    expect(isEncryptedWalletValue(cipher)).toBe(true);
    expect(cipher).not.toContain('3490');
    expect(await decryptWalletField(cipher)).toBe('3490');

    // Backwards-compatible read of legacy plaintext
    expect(await decryptWalletField('LEGACY_PLAIN')).toBe('LEGACY_PLAIN');
  });

  it('stores wallet_qr_passes encrypted at rest so raw DB rows hide citizen PII & last4 CCCD', async () => {
    await upsertWalletQrPass({
      dossier_code: 'HS-2026-SEC01',
      appointment_code: 'LH-2026-9901',
      procedure_code: 'TTHC-CR-01',
      procedure_name: 'Đăng ký thường trú',
      ward_code: 'AG_P_LONGXUYEN',
      ward_name: 'Phường Long Xuyên',
      citizen_name: 'NGUYỄN VĂN AN',
      citizen_cccd_mask: '********3490',
      citizen_last4: '3490',
      citizen_email: 'an.nguyen@example.com',
      status: 'APPROVED',
      officer_feedback: 'Hồ sơ hợp lệ',
      sla_deadline: null,
      qr_payload: 'SMARTWARD_PASS|HS-2026-SEC01|LH-2026-9901|AG_P_LONGXUYEN',
      synced_at: Date.now(),
    });

    const rawStored = getRawMemoryWalletPassForTests('HS-2026-SEC01');
    expect(rawStored).toBeDefined();
    expect(isEncryptedWalletValue(rawStored?.citizen_last4)).toBe(true);
    expect(rawStored?.citizen_last4).not.toContain('3490');
    expect(rawStored?.citizen_name).not.toContain('NGUYỄN VĂN AN');
    expect(rawStored?.qr_payload).not.toContain('LH-2026-9901');

    const decryptedList = await getAllWalletQrPasses();
    const decrypted = decryptedList.find((r) => r.dossier_code === 'HS-2026-SEC01');
    expect(decrypted?.citizen_last4).toBe('3490');
    expect(decrypted?.citizen_name).toBe('NGUYỄN VĂN AN');
    expect(decrypted?.qr_payload).toBe('SMARTWARD_PASS|HS-2026-SEC01|LH-2026-9901|AG_P_LONGXUYEN');
  });
});
