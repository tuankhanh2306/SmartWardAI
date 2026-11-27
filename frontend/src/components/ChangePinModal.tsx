import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRole } from '../context/RoleContext';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBadgeId?: string;
  onSuccess?: (newPin: string) => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  isOpen,
  onClose,
  defaultBadgeId,
  onSuccess,
}) => {
  const { isOfficer, officerProfile, changeOfficerPin } = useRole();

  const [badgeId, setBadgeId] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBadgeId(defaultBadgeId || (isOfficer ? officerProfile.badgeId : ''));
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setError(null);
      setSuccessMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, defaultBadgeId, isOfficer, officerProfile.badgeId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanBadge = badgeId.trim().toUpperCase();
    const cleanCurrent = currentPin.trim();
    const cleanNew = newPin.trim();
    const cleanConfirm = confirmPin.trim();

    if (!cleanBadge) {
      setError('Vui lòng nhập Mã thẻ công chức.');
      return;
    }
    if (!cleanCurrent) {
      setError('Vui lòng nhập Mã PIN hiện tại.');
      return;
    }
    if (!cleanNew) {
      setError('Vui lòng nhập Mã PIN mới.');
      return;
    }
    if (cleanNew.length < 6 || cleanNew.length > 32) {
      setError('Mã PIN mới phải từ 6 đến 32 ký tự.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setError('Xác nhận mã PIN mới không khớp.');
      return;
    }
    if (cleanNew === cleanCurrent) {
      setError('Mã PIN mới không được trùng với mã PIN hiện tại.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await changeOfficerPin(cleanBadge, cleanCurrent, cleanNew, cleanConfirm);
      if (result.success) {
        setSuccessMessage(result.message || 'Đổi mã PIN thành công!');
        if (onSuccess) {
          onSuccess(cleanNew);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(result.message || 'Đổi mã PIN thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      style={{ margin: 0 }}
    >
      <div className="relative w-full max-w-[420px] rounded-2xl bg-white border border-slate-200 shadow-xl p-5 sm:p-6 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-teal-300 flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Đổi Mã PIN Cán Bộ
              </h2>
              <p className="text-[11px] text-slate-500">
                Bảo mật tài khoản công vụ Một Cửa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-4">
          {/* Badge ID Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mã thẻ công chức
            </label>
            <input
              type="text"
              value={badgeId}
              onChange={(e) => setBadgeId(e.target.value.toUpperCase())}
              placeholder="VD: CB-AG_P_LONGXUYEN"
              disabled={isOfficer || isSubmitting}
              className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white uppercase"
            />
          </div>

          {/* Current PIN Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mã PIN hiện tại
            </label>
            <div className="relative">
              <input
                type={showCurrentPin ? 'text' : 'password'}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="Mã PIN đang dùng (VD: 8942)"
                disabled={isSubmitting}
                className="w-full text-xs font-mono px-3 py-2 pr-9 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPin(!showCurrentPin)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
              >
                {showCurrentPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* New PIN Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Mã PIN mới
              </label>
              <span className="text-[10px] text-slate-400">Từ 4 đến 32 ký tự</span>
            </div>
            <div className="relative">
              <input
                type={showNewPin ? 'text' : 'password'}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Nhập mã PIN mới"
                disabled={isSubmitting}
                className="w-full text-xs font-mono px-3 py-2 pr-9 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
              >
                {showNewPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Confirm New PIN Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Xác nhận mã PIN mới
            </label>
            <div className="relative">
              <input
                type={showConfirmPin ? 'text' : 'password'}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Nhập lại mã PIN mới"
                disabled={isSubmitting}
                className="w-full text-xs font-mono px-3 py-2 pr-9 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
              >
                {showConfirmPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-2.5 flex items-start gap-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 flex items-start gap-2 text-emerald-800 text-xs animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-teal-300" />
                  <span>Cập nhật mã PIN</span>
                </>
              )}
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

export default ChangePinModal;
