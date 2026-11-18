import React from 'react';
import { useRole } from '../context/RoleContext';
import { useWard } from '../context/WardContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';

interface OfficerGuardProps {
  children: React.ReactNode;
}

/**
 * Strict Route Guard for Commune Officer Workspace (/officer/*):
 * - Unauthenticated -> Redirects to '/'
 * - Admin -> Strictly redirected to '/admin' (Requirement 2: Admin does NOT enter /officer/*)
 * - Officer -> Allowed
 * - Citizen -> Blocked with explanation
 */
export const OfficerGuard: React.FC<OfficerGuardProps> = ({ children }) => {
  const { role, isOfficer, isAdmin, isHydratingSession } = useRole();
  const { currentWard } = useWard();
  const navigate = useNavigate();

  if (isHydratingSession) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-3 border-[#0F2942]/30 border-t-[#0F2942] rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-600">
          Đang xác thực phiên Cán bộ (/api/v1/auth/officer/me)...
        </span>
      </div>
    );
  }

  // If unauthenticated (no role or session expired), redirect to gateway
  if (!role) {
    return <Navigate to="/" replace />;
  }

  // Requirement 2: Admin NEVER enters /officer/*; redirect Admin to /admin
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // If commune officer with active session, allow access
  if (isOfficer) {
    return <>{children}</>;
  }

  // If citizen, strictly block and provide return / authentication options
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-[#F8FAFC]">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-[#CBD5E1] shadow-lg p-8 text-center flex flex-col items-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-[#FEF2F2] border-2 border-[#FCA5A5] flex items-center justify-center text-[#DC2626] mb-5 shadow-sm">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] mb-2 uppercase tracking-wider">
          Phân Quyền Công Vụ Cấp Xã
        </span>

        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F2942] tracking-tight">
          Khu Vực Dành Riêng Cho Cán Bộ Xã/Phường
        </h1>

        <p className="text-xs sm:text-sm text-[#475569] mt-2.5 max-w-md leading-relaxed">
          Phân hệ Điều hành địa bàn, Sơ duyệt hồ sơ cư trú và Bản đồ GIS yêu cầu tài khoản công chức được cấp phép tại{' '}
          <strong>UBND {currentWard.name}</strong>. Bạn đang ở chế độ <strong>Công Dân</strong>.
        </p>

        <div className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 my-5 text-left flex flex-col gap-2 text-xs text-[#334155]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>
              Công dân có thể thực hiện tra cứu và nộp tờ khai tại <strong>Cổng Công Dân</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>
              Công chức tiếp nhận hồ sơ vui lòng đăng nhập bằng thẻ công vụ để tiếp tục tác nghiệp.
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            type="button"
            onClick={() => navigate('/citizen')}
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-[#CBD5E1] text-[#0F2942] hover:bg-[#F1F5F9] text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về Cổng Công Dân</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-[#0F2942] hover:bg-[#1E3A5F] text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-[#5EEAD4]" />
            <span>Đăng Nhập Thẻ Cán Bộ</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfficerGuard;
