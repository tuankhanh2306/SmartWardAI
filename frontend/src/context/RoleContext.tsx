import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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

const DEFAULT_OFFICER_PROFILE: OfficerProfile = {
  name: 'Trần Thị Hương',
  title: 'Chuyên viên Tiếp nhận & Trả kết quả',
  badgeId: 'CC-AG-8942',
  department: 'Bộ phận Một Cửa',
  avatarText: 'TH',
};

const DEFAULT_CITIZEN_PROFILE: CitizenProfile = {
  name: 'Nguyễn Văn An',
  cccd: '079095012345',
  phone: '0908123456',
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize role from localStorage or auto-detect from active route
  const [role, setRoleState] = useState<UserRole>(() => {
    const saved = localStorage.getItem(ROLE_STORAGE_KEY);
    if (saved === 'OFFICER' || saved === 'CITIZEN') {
      return saved;
    }
    return location.pathname.startsWith('/officer') ? 'OFFICER' : 'CITIZEN';
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [officerProfile] = useState<OfficerProfile>(DEFAULT_OFFICER_PROFILE);
  const [citizenProfile] = useState<CitizenProfile>(DEFAULT_CITIZEN_PROFILE);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem(ROLE_STORAGE_KEY, newRole);
  };

  const loginAsOfficer = (_badgeId?: string, _pin?: string): boolean => {
    // Verified official badge simulation for demo
    setRole('OFFICER');
    setAuthModalOpen(false);
    return true;
  };

  const logoutToCitizen = () => {
    setRole('CITIZEN');
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
