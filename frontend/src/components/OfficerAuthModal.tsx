import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRole } from '../context/RoleContext';
import { useWard } from '../context/WardContext';
import { ShieldCheck, Lock, KeyRound, X, Check, ArrowRight, UserCheck } from 'lucide-react';

interface OfficerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const OfficerAuthModal: React.FC<OfficerAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { officerProfile, loginAsOfficer } = useRole();
  const { currentWard } = useWard();

  const [badgeId, setBadgeId] = useState(officerProfile.badgeId);
  const [pin, setPin] = useState('8942');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeId.trim()) {
      setError('Vui lòng nhập Mã số thẻ công chức.');
      return;
    }
    const success = loginAsOfficer(badgeId, pin);
    if (success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setError('Mã thẻ hoặc mã PIN không hợp lệ.');
    }
  };

  const handleQuickDemoLogin = () => {
    loginAsOfficer('CC-AG-8942', '8942');
    if (onSuccess) onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn"
      style={{ margin: 0 }}
    >
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-[#EAEDFF] shadow-2xl p-6">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EAEDFF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00236F] text-[#57DFFE] flex items-center justify-center shadow-md shadow-[#00236F]/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#00236F]">Xác Thực Thẩm Quyền Cán Bộ</h2>
              <p className="text-xs text-[#757682]">Hệ thống hành chính số • {currentWard.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#F2F3FF] text-[#757682] hover:text-[#131B2E] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-start gap-2.5 text-xs text-[#166534]">
            <UserCheck className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Chế độ phân quyền công vụ:</span>
              <p className="text-[11px] text-[#15803D] mt-0.5">
                Chỉ công chức được phân công nhiệm vụ Một cửa tại {currentWard.name} mới có quyền duyệt hồ sơ, xem bản đồ GIS và điều hành địa bàn.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#444651] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#00236F]" />
              <span>Mã Số Thẻ Công Chức / Cán Bộ:</span>
            </label>
            <input
              type="text"
              value={badgeId}
              onChange={(e) => setBadgeId(e.target.value)}
              placeholder="Ví dụ: CC-AG-8942"
              className="w-full h-10 px-3.5 rounded-xl border border-[#DAE2FD] bg-[#FAF8FF] font-mono font-bold text-xs text-[#00236F] focus:outline-none focus:border-[#00236F] focus:bg-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#444651] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#00236F]" />
              <span>Mã PIN Xác Thực Nhanh (hoặc VNeID cấp 2):</span>
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              maxLength={6}
              className="w-full h-10 px-3.5 rounded-xl border border-[#DAE2FD] bg-[#FAF8FF] font-mono font-bold text-xs text-[#00236F] focus:outline-none focus:border-[#00236F] focus:bg-white tracking-widest"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-[#DC2626] bg-[#FEF2F2] p-2.5 rounded-xl border border-[#FCA5A5]">
              {error}
            </p>
          )}

          {/* Quick Demo Login Option */}
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="w-full py-2.5 px-3 rounded-xl bg-[#F2F3FF] hover:bg-[#EAEDFF] text-[#00236F] text-xs font-bold border border-[#DAE2FD] flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
          >
            <Check className="w-4 h-4 text-[#00687A]" />
            <span>Đăng Nhập Nhanh: Thẻ Cán Bộ Mẫu (Trần Thị Hương)</span>
          </button>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#757682] hover:bg-[#F2F3FF] transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#00236F] hover:bg-[#1E3A8A] text-white text-xs font-bold shadow-md shadow-[#00236F]/20 flex items-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <span>Vào Bàn Cán Bộ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default OfficerAuthModal;
