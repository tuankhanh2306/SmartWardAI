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
  loginAsOfficer: (badgeId?: string, pin?: string) => boolean;
  logoutToCitizen: () => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
}

const ROLE_STORAGE_KEY = 'smartward_user_role';
const OFFICER_TOKEN_KEY = 'smartward_officer_token';
const OFFICER_BADGE_KEY = 'smartward_officer_badge';

const AUTHORIZED_OFFICER_CREDENTIALS: Record<string, { pin: string; profile: OfficerProfile }> = {
  'CC-AG-8942': {
    pin: '8942',
    profile: {
      name: 'Trần Thị Hương',
      title: 'Chuyên viên Tiếp nhận & Trả kết quả',
      badgeId: 'CC-AG-8942',
      department: 'Bộ phận Một Cửa',
      avatarText: 'TH',
    },
  },
  'CC-AG-1001': {
    pin: '2026',
    profile: {
      name: 'Nguyễn Thị Minh Khai',
      title: 'Cán bộ Địa chính - Đô thị',
      badgeId: 'CC-AG-1001',
      department: 'Bộ phận Một Cửa',
      avatarText: 'MK',
    },
  },
};

const DEFAULT_OFFICER_PROFILE: OfficerProfile = AUTHORIZED_OFFICER_CREDENTIALS['CC-AG-8942'].profile;

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
    const badge = (localStorage.getItem(OFFICER_BADGE_KEY) || '').toUpperCase();
    if (saved === 'OFFICER' && token && AUTHORIZED_OFFICER_CREDENTIALS[badge]) {
      return 'OFFICER';
    }
    return 'CITIZEN';
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [officerProfile, setOfficerProfile] = useState<OfficerProfile>(() => {
    const badge = (localStorage.getItem(OFFICER_BADGE_KEY) || '').toUpperCase();
    return AUTHORIZED_OFFICER_CREDENTIALS[badge]?.profile || DEFAULT_OFFICER_PROFILE;
  });
  const [citizenProfile] = useState<CitizenProfile>(DEFAULT_CITIZEN_PROFILE);

  const setRole = (newRole: UserRole) => {
    if (newRole === 'OFFICER') {
      const token = localStorage.getItem(OFFICER_TOKEN_KEY);
      const badge = (localStorage.getItem(OFFICER_BADGE_KEY) || '').toUpperCase();
      if (!token || !AUTHORIZED_OFFICER_CREDENTIALS[badge]) {
        setAuthModalOpen(true);
        return;
      }
    }
    setRoleState(newRole);
    localStorage.setItem(ROLE_STORAGE_KEY, newRole);
  };

  const loginAsOfficer = (badgeId?: string, pin?: string): boolean => {
    const normalizedBadge = (badgeId || '').trim().toUpperCase();
    const cleanPin = (pin || '').trim();

    const record = AUTHORIZED_OFFICER_CREDENTIALS[normalizedBadge];
    if (!record || record.pin !== cleanPin) {
      return false;
    }

    setOfficerProfile(record.profile);
    localStorage.setItem(OFFICER_BADGE_KEY, normalizedBadge);
    localStorage.setItem(OFFICER_TOKEN_KEY, `pending_sync_${normalizedBadge}_${Date.now()}`);
    setRoleState('OFFICER');
    localStorage.setItem(ROLE_STORAGE_KEY, 'OFFICER');
    setAuthModalOpen(false);

    // Exchange credentials for a server-signed HMAC-SHA256 JWT token when backend is online
    fetch('/api/v1/auth/officer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badgeId: normalizedBadge, pin: cleanPin, wardCode: 'WARD-AG-01' }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const json = await res.json();
        const serverToken = json?.data?.token;
        if (serverToken) {
          localStorage.setItem(OFFICER_TOKEN_KEY, serverToken);
        }
      })
      .catch(() => {
        // Offline demo fallback keeps verified local session
      });

    return true;
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
