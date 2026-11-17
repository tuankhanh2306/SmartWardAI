import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useWard } from '../context/WardContext';
import { ChangePinModal } from '../components/ChangePinModal';
import {
  Landmark,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Lock,
  Clock,
  AlertCircle,
  MapPin,
  Building2,
} from 'lucide-react';

export const RoleGateway: React.FC = () => {
  const { role, isOfficer, isCitizen, enterAsCitizen, loginOfficer, sessionMessage, clearSessionMessage } = useRole();
  const { currentWard, setWard, allWards } = useWard();
  const navigate = useNavigate();

  // If already authenticated and within session, redirect to corresponding space
  useEffect(() => {
    if (isOfficer) {
      const savedBadge = localStorage.getItem('smartward_officer_badge') || '';
      let targetCode = currentWard.code;
      if (savedBadge.startsWith('CB-')) {
        targetCode = savedBadge.substring(3);
        const w = allWards.find((x) => x.code === targetCode);
        if (w && w.code !== currentWard.code) {
          setWard(w);
        }
      }
      navigate(`/officer/ward/${targetCode}`, { replace: true });
    } else if (isCitizen) {
      navigate('/citizen', { replace: true });
    }
  }, [role, isOfficer, isCitizen, currentWard.code, allWards, setWard, navigate]);

  // Mode: 'choice' (2 big buttons) or 'officer_form' (account inputs)
  const [mode, setMode] = useState<'choice' | 'officer_form'>('choice');

  // Officer Form State - defaults to current ward
  const [badgeId, setBadgeId] = useState(`CB-${currentWard.code}`);
  const [pin, setPin] = useState('8942');
  const [officerError, setOfficerError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [changePinOpen, setChangePinOpen] = useState(false);

  const handleOfficerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeId.trim()) {
      setOfficerError('Vui lòng nhập Mã số thẻ công chức.');
      return;
    }
    if (!pin.trim()) {
      setOfficerError('Vui lòng nhập Mã PIN công vụ.');
      return;
    }
    setOfficerError(null);
    setIsLoggingIn(true);
    try {
      const ok = await loginOfficer(badgeId, pin);
      if (ok) {
        const norm = badgeId.trim().toUpperCase();
        let targetCode = currentWard.code;
        if (norm.startsWith('CB-')) {
          targetCode = norm.substring(3);
          const w = allWards.find((x) => x.code === targetCode);
          if (w && w.code !== currentWard.code) {
            setWard(w);
          }
        }
        navigate(`/officer/ward/${targetCode}`, { replace: true });
      } else {
        setOfficerError('Mã thẻ hoặc mã PIN không chính xác.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFillWardOfficer = () => {
    setBadgeId(`CB-${currentWard.code}`);
    setPin('8942');
    setOfficerError(null);
  };

  const handleFillLeadOfficer = () => {
    setBadgeId('CC-AG-8942');
    setPin('8942');
    setOfficerError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Single Clean Container */}
      <div className="w-full max-w-[440px] bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col animate-fadeIn">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-[#00796B] flex items-center justify-center mb-3 shadow-2xs">
            <Landmark className="w-6 h-6" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Hệ Thống Một Cửa Số
          </h1>

          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-[#00796B]" />
            <span>UBND {currentWard.name}</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="text-[#00796B] hover:underline font-medium cursor-pointer"
            >
              Đổi xã
            </button>
          </div>
        </div>

        {/* 5-Min Expiry Alert (If Triggered for Citizen) */}
        {sessionMessage && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-xs text-amber-800 animate-fadeIn">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">{sessionMessage}</span>
            </div>
            <button
              type="button"
              onClick={clearSessionMessage}
              className="text-amber-700 hover:text-amber-900 font-bold px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 1: 2 NÚT BỰ ĐĂNG NHẬP (DEFAULT) */}
        {/* ==================================================================== */}
        {mode === 'choice' && (
          <div className="pt-6 space-y-3.5">
            {/* Button 1: Người Dân */}
            <button
              type="button"
              onClick={enterAsCitizen}
              className="w-full p-4 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-white shadow-xs flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-teal-100 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Đăng nhập với tư cách Người dân</div>
                  <div className="text-xs text-teal-100/80 font-normal">Vào thẳng hệ thống • Phiên 5 phút</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-teal-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            {/* Button 2: Cán Bộ */}
            <button
              type="button"
              onClick={() => {
                setOfficerError(null);
                setBadgeId(`CB-${currentWard.code}`);
                setPin('8942');
                setMode('officer_form');
              }}
              className="w-full p-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-slate-300 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Đăng nhập với tư cách Cán bộ</div>
                  <div className="text-xs text-slate-400 font-normal">Phiên thường trực cho 96 xã/phường</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 2: Ô NHẬP TÀI KHOẢN CÁN BỘ */}
        {/* ==================================================================== */}
        {mode === 'officer_form' && (
          <div className="pt-5 animate-fadeIn">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => setMode('choice')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold mb-3 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>

            <h2 className="text-base font-bold text-slate-900 mb-3">
              Xác thực quyền Cán bộ
            </h2>

            <form onSubmit={handleOfficerLogin} className="space-y-3">
              {/* Quick Ward Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#00796B]" />
                  <span>Chọn địa bàn (Cấp đủ 96 xã/phường)</span>
                </label>
                <select
                  value={currentWard.code}
                  onChange={(e) => {
                    const w = allWards.find((x) => x.code === e.target.value);
                    if (w) {
                      setWard(w);
                      setBadgeId(`CB-${w.code}`);
                      setPin('8942');
                      setOfficerError(null);
                    }
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {allWards.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã thẻ công chức
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={badgeId}
                    onChange={(e) => setBadgeId(e.target.value.toUpperCase())}
                    placeholder="VD: CB-AG_P_LONGXUYEN"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono uppercase"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã PIN bảo mật
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Mã PIN 4 số"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Error Message */}
              {officerError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 flex items-start gap-2 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{officerError}</span>
                </div>
              )}

              {/* Quick Fill Helpers */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <button
                  type="button"
                  onClick={handleFillWardOfficer}
                  className="text-[#00796B] hover:underline font-semibold cursor-pointer"
                >
                  Xã hiện tại (CB-{currentWard.code})
                </button>
                <button
                  type="button"
                  onClick={handleFillLeadOfficer}
                  className="text-slate-600 hover:underline font-semibold cursor-pointer"
                >
                  Mẫu: CC-AG-8942
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-70 cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-teal-300" />
                    <span>Đăng nhập Cán bộ</span>
                  </>
                )}
              </button>

              {/* Change PIN Action */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setChangePinOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  <span>Đổi mã PIN cán bộ</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Security Caption */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Cán bộ: Thường trực không giới hạn • Dân: Phiên 5 phút an toàn</span>
        </div>
      </div>

      <ChangePinModal
        isOpen={changePinOpen}
        onClose={() => setChangePinOpen(false)}
        defaultBadgeId={badgeId}
        onSuccess={(newPin) => {
          setPin(newPin);
          setOfficerError(null);
        }}
      />
    </div>
  );
};

export default RoleGateway;
