/**
 * SmartWard AI Mobile — OfficerAuthContext
 * Quản lý phiên làm việc Cán bộ Một cửa (JWT lưu trên expo-secure-store, đồng bộ Redis revoke khi đăng xuất).
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  changeOfficerPin as apiChangePin,
  fetchCurrentOfficer,
  loginOfficer as apiLoginOfficer,
  logoutOfficer as apiLogoutOfficer,
  setOnUnauthorizedHandler,
} from '../api/client';
import {
  clearOfficerSession,
  getOfficerProfile,
  getOfficerToken,
  saveOfficerSession,
} from '../storage/secureAuthStorage';
import {
  authenticateOfficerWithBiometrics,
  checkBiometricCapability,
  isBiometricUnlockEnabled,
  setBiometricUnlockEnabled,
} from '../services/biometricAuth';
import {
  buildDefaultOfficerBadgeForWard,
  extractOfficerSessionToken,
  resolveWardNameByCode,
} from '../core/officerAuditService';
import type {
  OfficerChangePinRequest,
  OfficerLoginRequest,
  OfficerPrincipal,
} from '../types/api.types';

export interface OfficerAuthContextValue {
  officer: OfficerPrincipal | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  authError: string | null;
  biometricAvailable: boolean;
  biometricLabel: string;
  biometricEnabled: boolean;
  isBiometricLocked: boolean;
  login: (request: OfficerLoginRequest) => Promise<OfficerPrincipal>;
  changePin: (request: OfficerChangePinRequest) => Promise<void>;
  refreshSession: () => Promise<OfficerPrincipal | null>;
  logout: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  unlockFallbackToPin: () => Promise<void>;
  clearAuthError: () => void;
}

const OfficerAuthContext = createContext<OfficerAuthContextValue | undefined>(undefined);

export const OfficerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [officer, setOfficer] = useState<OfficerPrincipal | null>(null);
  const [lockedProfile, setLockedProfile] = useState<OfficerPrincipal | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [biometricLabel, setBiometricLabel] = useState<string>('Sinh trắc học');
  const [biometricEnabled, setBiometricEnabledState] = useState<boolean>(false);
  const [isBiometricLocked, setIsBiometricLocked] = useState<boolean>(false);

  useEffect(() => {
    setOnUnauthorizedHandler(() => {
      setOfficer(null);
      setLockedProfile(null);
      setIsBiometricLocked(false);
      setAuthError('Phiên đăng nhập Cán bộ đã hết hạn. Vui lòng đăng nhập lại.');
    });

    let mounted = true;
    (async () => {
      try {
        const [token, profile, capability, enabled] = await Promise.all([
          getOfficerToken(),
          getOfficerProfile(),
          checkBiometricCapability(),
          isBiometricUnlockEnabled(),
        ]);
        if (!mounted) return;
        setBiometricAvailable(capability.available);
        setBiometricLabel(capability.label);
        setBiometricEnabledState(enabled && capability.available);

        if (token && profile) {
          if (enabled && capability.available) {
            setLockedProfile(profile);
            setIsBiometricLocked(true);
          } else {
            setOfficer(profile);
          }
        }
      } finally {
        if (mounted) {
          setIsRestoring(false);
        }
      }
    })();

    return () => {
      mounted = false;
      setOnUnauthorizedHandler(null);
    };
  }, []);

  const login = useCallback(async (request: OfficerLoginRequest): Promise<OfficerPrincipal> => {
    setAuthError(null);
    try {
      const normalizedBadge = request.badgeId.trim().toUpperCase();
      const resp = await apiLoginOfficer({
        badgeId: normalizedBadge,
        pin: request.pin.trim(),
        wardCode: request.wardCode?.trim() || undefined,
      });

      const sessionToken = extractOfficerSessionToken(resp);
      if (!sessionToken) {
        throw new Error('Máy chủ xác thực không trả về mã phiên hợp lệ (JWT).');
      }

      const resolvedWardCode =
        resp.officer?.wardCode || resp.wardCode || request.wardCode?.trim() || 'AG_P_LONGXUYEN';
      const resolvedWardName =
        resp.officer?.wardName || resp.wardName || resolveWardNameByCode(resolvedWardCode);

      const principal: OfficerPrincipal = resp.officer
        ? {
            ...resp.officer,
            wardName: resp.officer.wardName || resolvedWardName,
          }
        : {
            badgeId: resp.badgeId || normalizedBadge || buildDefaultOfficerBadgeForWard(resolvedWardCode),
            fullName: resp.fullName || 'Cán bộ Một cửa',
            role: resp.role || 'OFFICER',
            wardCode: resolvedWardCode,
            wardName: resolvedWardName,
            mustChangePin: Boolean(resp.mustChangePin),
          };

      await saveOfficerSession(sessionToken, principal);
      setLockedProfile(null);
      setIsBiometricLocked(false);
      setOfficer(principal);
      return principal;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error && err.message) ||
        'Đăng nhập thất bại. Vui lòng kiểm tra Mã công chức, Mã PIN hoặc kết nối máy chủ.';
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  const changePin = useCallback(async (request: OfficerChangePinRequest) => {
    setAuthError(null);
    try {
      await apiChangePin({
        badgeId: request.badgeId.trim().toUpperCase(),
        currentPin: request.currentPin.trim(),
        newPin: request.newPin.trim(),
        confirmPin: request.confirmPin.trim(),
      });
      setOfficer((prev) => (prev ? { ...prev, mustChangePin: false } : prev));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể đổi mã PIN. Vui lòng kiểm tra lại thông tin.';
      throw new Error(message);
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<OfficerPrincipal | null> => {
    try {
      const token = await getOfficerToken();
      if (!token) {
        setOfficer(null);
        return null;
      }
      const verified = await fetchCurrentOfficer();
      await saveOfficerSession(token, verified);
      setOfficer(verified);
      return verified;
    } catch {
      await clearOfficerSession();
      setOfficer(null);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    try {
      await apiLogoutOfficer();
    } catch {
      await clearOfficerSession();
    } finally {
      setOfficer(null);
      setLockedProfile(null);
      setIsBiometricLocked(false);
    }
  }, []);

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const cap = await checkBiometricCapability();
      if (!cap.available) {
        setAuthError('Thiết bị chưa kích hoạt Vân tay hoặc FaceID.');
        return;
      }
      const verify = await authenticateOfficerWithBiometrics(
        `Xác thực ${cap.label} để bật mở khóa nhanh cho Cán bộ`
      );
      if (!verify.success) {
        setAuthError(verify.message || 'Chưa bật được mở khóa sinh trắc học.');
        return;
      }
      await setBiometricUnlockEnabled(true);
      setBiometricAvailable(true);
      setBiometricLabel(cap.label);
      setBiometricEnabledState(true);
      setAuthError(null);
      return;
    }
    await setBiometricUnlockEnabled(false);
    setBiometricEnabledState(false);
    setIsBiometricLocked(false);
  }, []);

  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    setAuthError(null);
    const result = await authenticateOfficerWithBiometrics(
      `Dùng ${biometricLabel} để mở khóa phiên Cán bộ Một cửa`
    );
    if (result.success) {
      const profile = lockedProfile || (await getOfficerProfile());
      const token = await getOfficerToken();
      if (token && profile) {
        setOfficer(profile);
        setLockedProfile(null);
        setIsBiometricLocked(false);
        return true;
      }
      setAuthError('Phiên đăng nhập đã hết hạn. Vui lòng nhập mã PIN.');
      setIsBiometricLocked(false);
      return false;
    }
    setAuthError(result.message || 'Xác thực sinh trắc học thất bại. Vui lòng dùng mã PIN.');
    return false;
  }, [biometricLabel, lockedProfile]);

  const unlockFallbackToPin = useCallback(async () => {
    setAuthError(null);
    setLockedProfile(null);
    setIsBiometricLocked(false);
    await clearOfficerSession();
    setOfficer(null);
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <OfficerAuthContext.Provider
      value={{
        officer,
        isAuthenticated: Boolean(officer),
        isRestoring,
        authError,
        biometricAvailable,
        biometricLabel,
        biometricEnabled,
        isBiometricLocked,
        login,
        changePin,
        refreshSession,
        logout,
        setBiometricEnabled,
        unlockWithBiometrics,
        unlockFallbackToPin,
        clearAuthError,
      }}
    >
      {children}
    </OfficerAuthContext.Provider>
  );
};

export function useOfficerAuth(): OfficerAuthContextValue {
  const ctx = useContext(OfficerAuthContext);
  if (!ctx) {
    throw new Error('useOfficerAuth must be used inside OfficerAuthProvider');
  }
  return ctx;
}
