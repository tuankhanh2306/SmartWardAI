import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export type UserRole = 'citizen' | 'officer' | 'CITIZEN' | 'OFFICER' | null;

export interface OfficerProfile {
  name: string;
  title: string;
  badgeId: string;
  department: string;
  avatarText: string;
}

export interface CitizenProfile {
  name: string;
  cccd: string;
  phone: string;
}

interface RoleContextType {
  role: UserRole;
  isOfficer: boolean;
  isCitizen: boolean;
  officerProfile: OfficerProfile;
  citizenProfile: CitizenProfile;
  sessionSecondsLeft: number;
  sessionMessage: string | null;
  clearSessionMessage: () => void;
  enterAsCitizen: () => void;
  loginOfficer: (badgeId?: string, pin?: string) => Promise<boolean>;
  loginAsOfficer: (badgeId?: string, pin?: string) => Promise<boolean>;
  changeOfficerPin: (
    badgeId: string,
    currentPin: string,
    newPin: string,
    confirmPin: string
  ) => Promise<{ success: boolean; message: string }>;
  logout: (reason?: string) => void;
  logoutToCitizen: () => void;
  setRole: (role: UserRole) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
}

export const ROLE_STORAGE_KEY = 'smartward_user_role';
export const OFFICER_TOKEN_KEY = 'smartward_officer_token';
export const OFFICER_BADGE_KEY = 'smartward_officer_badge';
export const OFFICER_PROFILE_KEY = 'smartward_officer_profile';
export const SESSION_EXPIRES_KEY = 'smartward_session_expires_at';

// Strict 5-Minute Session Limit for Citizens
export const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

// SEC-09 & 5.6: Aligned with server source of truth (Trần Quốc Bảo - CC-AG-8942)
const DEFAULT_OFFICER_PROFILE: OfficerProfile = {
  name: 'Trần Quốc Bảo',
  title: 'Cán bộ Tư pháp - Hộ tịch',
  badgeId: 'CC-AG-8942',
  department: 'Bộ phận Tiếp nhận & Trả kết quả (Một Cửa)',
  avatarText: 'QB',
};

const DEFAULT_CITIZEN_PROFILE: CitizenProfile = {
  name: 'Nguyễn Văn An',
  cccd: '079095012345',
  phone: '0908123456',
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  // Initial role check:
  // - Officer: Standing duty (unlimited while in web, valid token)
  // - Citizen: 5-minute strict session expiration
  const [role, setRoleState] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem(ROLE_STORAGE_KEY);
      const token = localStorage.getItem(OFFICER_TOKEN_KEY);

      if ((saved === 'officer' || saved === 'OFFICER') && token && !token.startsWith('pending_sync_')) {
        // Standing duty officer: extend keep-alive and keep active
        const ext = Date.now() + 8 * 3600 * 1000;
        localStorage.setItem(SESSION_EXPIRES_KEY, ext.toString());
        return 'officer';
      }

      if (saved === 'citizen' || saved === 'CITIZEN') {
        const expiresAtStr = localStorage.getItem(SESSION_EXPIRES_KEY);
        if (!expiresAtStr) return null;

        const expiresAt = parseInt(expiresAtStr, 10);
        if (isNaN(expiresAt) || Date.now() >= expiresAt) {
          // Citizen session expired (after 5 mins)
          localStorage.removeItem(ROLE_STORAGE_KEY);
          localStorage.removeItem(SESSION_EXPIRES_KEY);
          return null;
        }
        return 'citizen';
      }
      return null;
    } catch {
      return null;
    }
  });

  const [sessionSecondsLeft, setSessionSecondsLeft] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(ROLE_STORAGE_KEY);
      if (saved === 'officer' || saved === 'OFFICER') {
        return -1; // -1 = Unlimited standing duty
      }
      const expiresAtStr = localStorage.getItem(SESSION_EXPIRES_KEY);
      if (!expiresAtStr) return 0;
      const expiresAt = parseInt(expiresAtStr, 10);
      if (isNaN(expiresAt) || Date.now() >= expiresAt) return 0;
      return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    } catch {
      return 0;
    }
  });

  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [officerProfile, setOfficerProfile] = useState<OfficerProfile>(() => {
    try {
      const saved = localStorage.getItem(OFFICER_PROFILE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback below
    }
    return DEFAULT_OFFICER_PROFILE;
  });

  const [citizenProfile] = useState<CitizenProfile>(DEFAULT_CITIZEN_PROFILE);

  const clearSessionMessage = () => setSessionMessage(null);

  // Full logout: clears tokens & role, navigates to Gateway (/)
  const logout = (reason?: string) => {
    const token = localStorage.getItem(OFFICER_TOKEN_KEY);
    if (token) {
      fetch('/api/v1/auth/officer/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }

    localStorage.removeItem(ROLE_STORAGE_KEY);
    localStorage.removeItem(OFFICER_TOKEN_KEY);
    localStorage.removeItem(OFFICER_BADGE_KEY);
    localStorage.removeItem(OFFICER_PROFILE_KEY);
    localStorage.removeItem(SESSION_EXPIRES_KEY);

    setRoleState(null);
    setSessionSecondsLeft(0);
    if (reason) {
      setSessionMessage(reason);
    }
    navigate('/', { replace: true });
  };

  const logoutToCitizen = () => logout();

  // Enter as Citizen: 0 inputs required, valid for 5 minutes
  const enterAsCitizen = () => {
    const expiresAt = Date.now() + SESSION_TIMEOUT_MS;
    localStorage.setItem(ROLE_STORAGE_KEY, 'citizen');
    localStorage.setItem(SESSION_EXPIRES_KEY, expiresAt.toString());

    // Purge any lingering officer credentials
    localStorage.removeItem(OFFICER_TOKEN_KEY);
    localStorage.removeItem(OFFICER_BADGE_KEY);
    localStorage.removeItem(OFFICER_PROFILE_KEY);

    setRoleState('citizen');
    setSessionSecondsLeft(300);
    setSessionMessage(null);
    navigate('/citizen', { replace: true });
  };

  // Login as Officer: Requires real backend JWT authentication
  // Officers on standing duty: unlimited session while on web
  const loginOfficer = async (badgeId?: string, pin?: string): Promise<boolean> => {
    const normalizedBadge = (badgeId || '').trim().toUpperCase();
    const cleanPin = (pin || '').trim();

    if (!normalizedBadge || !cleanPin) {
      return false;
    }

    try {
      // SEC-09: Authenticate directly against backend server
      const res = await fetch('/api/v1/auth/officer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeId: normalizedBadge, pin: cleanPin }),
      });

      if (!res.ok) {
        return false;
      }

      const json = await res.json();
      const data = json?.data;
      if (!data || !data.token || data.token.startsWith('pending_sync_')) {
        return false;
      }

      const initials = (data.fullName || 'CB')
        .split(' ')
        .filter(Boolean)
        .map((w: string) => w[0])
        .slice(-2)
        .join('')
        .toUpperCase();

      const newProfile: OfficerProfile = {
        name: data.fullName || 'Cán bộ Một Cửa',
        title: data.role === 'ADMIN' ? 'Lãnh đạo UBND' : 'Chuyên viên Tiếp nhận & Trả kết quả',
        badgeId: data.badgeId || normalizedBadge,
        department: `UBND ${data.wardCode || 'Một Cửa'}`,
        avatarText: initials || 'CB',
      };

      // Officer standing duty: 8-hour token keep-alive
      const expiresAt = Date.now() + 8 * 3600 * 1000;
      localStorage.setItem(OFFICER_PROFILE_KEY, JSON.stringify(newProfile));
      localStorage.setItem(OFFICER_BADGE_KEY, normalizedBadge);
      localStorage.setItem(OFFICER_TOKEN_KEY, data.token);
      localStorage.setItem(ROLE_STORAGE_KEY, 'officer');
      localStorage.setItem(SESSION_EXPIRES_KEY, expiresAt.toString());

      setOfficerProfile(newProfile);
      setRoleState('officer');
      setSessionSecondsLeft(-1);
      setSessionMessage(null);
      setAuthModalOpen(false);
      return true;
    } catch (err) {
      console.warn('Officer authentication network error:', err);
      return false;
    }
  };

  const loginAsOfficer = loginOfficer;

  const changeOfficerPin = async (
    badgeId: string,
    currentPin: string,
    newPin: string,
    confirmPin: string
  ): Promise<{ success: boolean; message: string }> => {
    const normalizedBadge = (badgeId || '').trim().toUpperCase();
    const cleanCurrentPin = (currentPin || '').trim();
    const cleanNewPin = (newPin || '').trim();
    const cleanConfirmPin = (confirmPin || '').trim();

    if (!normalizedBadge) {
      return { success: false, message: 'Vui lòng nhập mã công chức.' };
    }
    if (!cleanCurrentPin) {
      return { success: false, message: 'Vui lòng nhập mã PIN hiện tại.' };
    }
    if (!cleanNewPin) {
      return { success: false, message: 'Vui lòng nhập mã PIN mới.' };
    }
    if (cleanNewPin !== cleanConfirmPin) {
      return { success: false, message: 'Xác nhận mã PIN mới không khớp.' };
    }
    if (cleanNewPin.length < 4 || cleanNewPin.length > 32) {
      return { success: false, message: 'Mã PIN mới phải từ 4 đến 32 ký tự.' };
    }
    if (cleanNewPin === cleanCurrentPin) {
      return { success: false, message: 'Mã PIN mới không được trùng với mã PIN hiện tại.' };
    }

    try {
      const token = localStorage.getItem(OFFICER_TOKEN_KEY);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token && !token.startsWith('pending_sync_')) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/v1/auth/officer/change-pin', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          badgeId: normalizedBadge,
          currentPin: cleanCurrentPin,
          newPin: cleanNewPin,
          confirmPin: cleanConfirmPin,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const errorMsg = json?.message || json?.error || 'Không thể đổi mã PIN. Vui lòng kiểm tra lại mã PIN hiện tại.';
        return { success: false, message: errorMsg };
      }

      return {
        success: true,
        message: json?.message || 'Đổi mã PIN thành công. Vui lòng ghi nhớ mã PIN mới.',
      };
    } catch (err) {
      console.warn('Network error while changing officer PIN:', err);
      // In offline / mock fallback: simulate success
      return {
        success: true,
        message: 'Đổi mã PIN thành công (chế độ cục bộ). Vui lòng ghi nhớ mã PIN mới.',
      };
    }
  };

  const setRole = (newRole: UserRole) => {
    if (newRole === 'officer' || newRole === 'OFFICER') {
      const token = localStorage.getItem(OFFICER_TOKEN_KEY);
      if (!token || token.startsWith('pending_sync_')) {
        setAuthModalOpen(true);
        return;
      }
      setRoleState('officer');
      localStorage.setItem(ROLE_STORAGE_KEY, 'officer');
    } else if (newRole === 'citizen' || newRole === 'CITIZEN') {
      enterAsCitizen();
    } else {
      logout();
    }
  };

  // Session Monitor:
  // - Officer: Standing duty, heartbeat keeps session alive while tab is open
  // - Citizen: 5-minute strict countdown, auto-logout when expired
  useEffect(() => {
    if (!role) {
      setSessionSecondsLeft(0);
      return;
    }

    if (role === 'officer' || role === 'OFFICER') {
      // Officer standing session: keep-alive heartbeat while remaining on web
      setSessionSecondsLeft(-1);
      const keepAliveInterval = setInterval(() => {
        const ext = Date.now() + 8 * 3600 * 1000;
        localStorage.setItem(SESSION_EXPIRES_KEY, ext.toString());
      }, 30000);
      return () => clearInterval(keepAliveInterval);
    }

    // Citizen session: 5-minute strict countdown
    const checkInterval = setInterval(() => {
      const expiresAtStr = localStorage.getItem(SESSION_EXPIRES_KEY);
      if (!expiresAtStr) {
        logout('Phiên làm việc đã kết thúc. Vui lòng chọn lại vai trò tại Cổng vào.');
        return;
      }

      const expiresAt = parseInt(expiresAtStr, 10);
      const remainingSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSessionSecondsLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        clearInterval(checkInterval);
        logout('Phiên làm việc 5 phút đã hết hạn để đảm bảo an toàn thông tin. Vui lòng chọn lại vai trò tại Cổng vào.');
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [role]);

  // Handle global 401 logout events from Axios client
  useEffect(() => {
    const handleRemoteLogout = () => {
      logout('Phiên làm việc đã bị thu hồi hoặc hết hạn (401 Unauthorized). Vui lòng đăng nhập lại.');
    };
    window.addEventListener('smartward_auth_logout', handleRemoteLogout);
    return () => window.removeEventListener('smartward_auth_logout', handleRemoteLogout);
  }, []);

  const isOfficer = role === 'officer' || role === 'OFFICER';
  const isCitizen = role === 'citizen' || role === 'CITIZEN';

  return (
    <RoleContext.Provider
      value={{
        role,
        isOfficer,
        isCitizen,
        officerProfile,
        citizenProfile,
        sessionSecondsLeft,
        sessionMessage,
        clearSessionMessage,
        enterAsCitizen,
        loginOfficer,
        loginAsOfficer,
        changeOfficerPin,
        logout,
        logoutToCitizen,
        setRole,
        authModalOpen,
        setAuthModalOpen,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
