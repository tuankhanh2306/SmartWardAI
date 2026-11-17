import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useWard } from '../context/WardContext';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

interface CitizenGuardProps {
  children: React.ReactNode;
}

export const CitizenGuard: React.FC<CitizenGuardProps> = ({ children }) => {
  const { role, isOfficer, enterAsCitizen } = useRole();
  const { currentWard } = useWard();
  const navigate = useNavigate();

  // If unauthenticated (no role chosen or session expired), redirect to gateway
  if (!role) {
    return <Navigate to="/" replace />;
  }

  // If currently an officer, strictly prevent jumping to citizen routes via URL
  if (isOfficer) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 bg-[#F8FAFC]">
        <div className="w-full max-w-lg rounded-2xl bg-white border border-[#CBD5E1] shadow-lg p-8 text-center flex flex-col items-center animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] border-2 border-[#BFDBFE] flex items-center justify-center text-[#1D4ED8] mb-5 shadow-sm">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#1E40AF] border border-[#DBEAFE] mb-2 uppercase tracking-wider">
            Phân Tách Khu Vực Công Vụ
          </span>

          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F2942] tracking-tight">
            Bạn Đang Ở Phiên Làm Việc Cán Bộ
          </h1>

          <p className="text-xs sm:text-sm text-[#475569] mt-3 max-w-md leading-relaxed">
            Để bảo mật hồ sơ hành chính và tránh xung đột quyền hạn, hệ thống không cho phép truy cập chéo sang Cổng Dân
            khi đang giữ phiên công chức tại <strong>UBND {currentWard.name}</strong>.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-6">
            <button
              type="button"
              onClick={() => navigate(`/officer/ward/${currentWard.code}`)}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-[#CBD5E1] text-[#0F2942] hover:bg-[#F1F5F9] text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay Lại Bàn Cán Bộ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                enterAsCitizen();
              }}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-teal-200" />
              <span>Đổi Sang Cổng Dân</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Permitted for citizen
  return <>{children}</>;
};

export default CitizenGuard;
