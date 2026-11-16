import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export type UserRole = 'CITIZEN' | 'OFFICER';

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
  setRole: (role: UserRole) => void;
  loginAsOfficer: (badgeId?: string, pin?: string) => Promise<boolean>;
  logoutToCitizen: () => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
}

const ROLE_STORAGE_KEY = 'smartward_user_role';
const OFFICER_TOKEN_KEY = 'smartward_officer_token';
const OFFICER_BADGE_KEY = 'smartward_officer_badge';
const OFFICER_PROFILE_KEY = 'smartward_officer_profile';

// SEC-09: AUTHORIZED_OFFICER_CREDENTIALS removed from client code. Server is the sole authority for authentication.
const DEFAULT_OFFICER_PROFILE: OfficerProfile = {
  name: 'Cán bộ Một Cửa',
  title: 'Chuyên viên Tiếp nhận & Trả kết quả',
  badgeId: 'CC-AG-8942',
  department: 'Bộ phận Một Cửa',
  avatarText: 'CB',
};

const DEFAULT_CITIZEN_PROFILE: CitizenProfile = {
  name: 'Nguyễn Văn An',
  cccd: '079095012345',
  phone: '0908123456',
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  // Strictly require an existing verified session in localStorage; never auto-elevate from URL pathname
  const [role, setRoleState] = useState<UserRole>(() => {
    const saved = localStorage.getItem(ROLE_STORAGE_KEY);
    const token = localStorage.getItem(OFFICER_TOKEN_KEY);
    if (saved === 'OFFICER' && token && !token.startsWith('pending_sync_')) {
      return 'OFFICER';
    }
    return 'CITIZEN';
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [officerProfile, setOfficerProfile] = useState<OfficerProfile>(() => {
    const saved = localStorage.getItem(OFFICER_PROFILE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback below
      }
    }
    return DEFAULT_OFFICER_PROFILE;
  });
  const [citizenProfile] = useState<CitizenProfile>(DEFAULT_CITIZEN_PROFILE);

  const setRole = (newRole: UserRole) => {
    if (newRole === 'OFFICER') {
      const token = localStorage.getItem(OFFICER_TOKEN_KEY);
      if (!token || token.startsWith('pending_sync_')) {
        setAuthModalOpen(true);
        return;
      }
    }
    setRoleState(newRole);
    localStorage.setItem(ROLE_STORAGE_KEY, newRole);
  };

  const loginAsOfficer = async (badgeId?: string, pin?: string): Promise<boolean> => {
    const normalizedBadge = (badgeId || '').trim().toUpperCase();
    const cleanPin = (pin || '').trim();

    if (!normalizedBadge || !cleanPin) {
      return false;
    }

    try {
      // SEC-09: Authenticate directly against backend server. Do NOT pass client wardCode!
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
      if (!data || !data.token) {
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

      setOfficerProfile(newProfile);
      localStorage.setItem(OFFICER_PROFILE_KEY, JSON.stringify(newProfile));
      localStorage.setItem(OFFICER_BADGE_KEY, normalizedBadge);
      localStorage.setItem(OFFICER_TOKEN_KEY, data.token);
      setRoleState('OFFICER');
      localStorage.setItem(ROLE_STORAGE_KEY, 'OFFICER');
      setAuthModalOpen(false);
      return true;
    } catch (err) {
      console.warn('Officer authentication network error:', err);
      return false;
    }
  };

  const logoutToCitizen = () => {
    const token = localStorage.getItem(OFFICER_TOKEN_KEY);
    if (token) {
      fetch('/api/v1/auth/officer/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setRoleState('CITIZEN');
    localStorage.setItem(ROLE_STORAGE_KEY, 'CITIZEN');
    localStorage.removeItem(OFFICER_TOKEN_KEY);
    localStorage.removeItem(OFFICER_BADGE_KEY);
    localStorage.removeItem(OFFICER_PROFILE_KEY);
    navigate('/citizen');
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        isOfficer: role === 'OFFICER',
        isCitizen: role === 'CITIZEN',
        officerProfile,
        citizenProfile,
        setRole,
        loginAsOfficer,
        logoutToCitizen,
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
