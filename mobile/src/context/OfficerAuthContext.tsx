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
  login: (request: OfficerLoginRequest) => Promise<OfficerPrincipal>;
  changePin: (request: OfficerChangePinRequest) => Promise<void>;
  refreshSession: () => Promise<OfficerPrincipal | null>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const OfficerAuthContext = createContext<OfficerAuthContextValue | undefined>(undefined);

export const OfficerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [officer, setOfficer] = useState<OfficerPrincipal | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    setOnUnauthorizedHandler(() => {
      setOfficer(null);
      setAuthError('Phiên đăng nhập Cán bộ đã hết hạn. Vui lòng đăng nhập lại.');
    });

    let mounted = true;
    (async () => {
      try {
        const [token, profile] = await Promise.all([getOfficerToken(), getOfficerProfile()]);
        if (mounted && token && profile) {
          setOfficer(profile);
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
      const resp = await apiLoginOfficer({
        badgeId: request.badgeId.trim(),
        pin: request.pin.trim(),
        wardCode: request.wardCode?.trim(),
      });

      const principal: OfficerPrincipal = resp.officer ?? {
        badgeId: resp.badgeId || request.badgeId.trim(),
        fullName: resp.fullName || 'Cán bộ Một cửa',
        role: resp.role || 'OFFICER',
        wardCode: resp.wardCode || request.wardCode || 'AG_P_LONGXUYEN',
        wardName: resp.wardName || 'Phường Long Xuyên',
        mustChangePin: resp.mustChangePin,
      };

      await saveOfficerSession(resp.accessToken, principal);
      setOfficer(principal);
      return principal;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Đăng nhập thất bại. Vui lòng kiểm tra Mã công chức, Mã PIN hoặc kết nối máy chủ.';
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  const changePin = useCallback(async (request: OfficerChangePinRequest) => {
    setAuthError(null);
    await apiChangePin(request);
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
    }
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <OfficerAuthContext.Provider
      value={{
        officer,
        isAuthenticated: Boolean(officer),
        isRestoring,
        authError,
        login,
        changePin,
        refreshSession,
        logout,
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
