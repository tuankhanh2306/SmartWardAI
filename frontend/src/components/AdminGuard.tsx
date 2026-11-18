import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * Strict Route Guard for Province-Level Admin Workspace (/admin/*):
 * - Unauthenticated -> Redirects to '/'
 * - Officer (including tampered localStorage after /me hydration) -> Redirects to '/officer/ward/{wardCode}'
 * - Citizen -> Redirects to '/citizen'
 * - Admin -> Allowed
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { role, isAdmin, isOfficer, isCitizen, isHydratingSession, officerProfile } = useRole();

  if (isHydratingSession) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-3 border-amber-500/30 border-t-amber-600 rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-600">
          Đang xác thực phiên Quản trị viên (/api/v1/auth/officer/me)...
        </span>
      </div>
    );
  }

  if (!role) {
    return <Navigate to="/" replace />;
  }

  if (isAdmin) {
    return <>{children}</>;
  }

  if (isOfficer) {
    const targetWard =
      officerProfile.wardCode && officerProfile.wardCode !== 'AG_PROVINCE'
        ? officerProfile.wardCode
        : 'AG_P_LONGXUYEN';
    return <Navigate to={`/officer/ward/${targetWard}`} replace />;
  }

  if (isCitizen) {
    return <Navigate to="/citizen" replace />;
  }

  return <Navigate to="/" replace />;
};

export default AdminGuard;
