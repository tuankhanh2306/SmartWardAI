import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useWard } from '../context/WardContext';
import {
  Landmark,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  KeyRound,
  Lock,
  Clock,
  AlertCircle,
  MapPin,
  Bot,
  FileCheck2,
  FileText,
} from 'lucide-react';

export const RoleGateway: React.FC = () => {
  const { role, isOfficer, isCitizen, enterAsCitizen, loginOfficer, sessionMessage, clearSessionMessage } = useRole();
  const { currentWard } = useWard();
  const navigate = useNavigate();

  // If already authenticated and within 5-min session, redirect to corresponding space
  useEffect(() => {
    if (isOfficer) {
      navigate(`/officer/ward/${currentWard.code}`, { replace: true });
    } else if (isCitizen) {
      navigate('/citizen', { replace: true });
    }
  }, [role, isOfficer, isCitizen, currentWard.code, navigate]);

  // Officer Login Form State
  const [badgeId, setBadgeId] = useState('CC-AG-8942');
  const [pin, setPin] = useState('8942');
  const [officerError, setOfficerError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
        navigate(`/officer/ward/${currentWard.code}`, { replace: true });
      } else {
        setOfficerError('Mã thẻ hoặc mã PIN không chính xác (hoặc tài khoản chưa được phân quyền).');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFillDemoOfficer = () => {
    setBadgeId('CC-AG-8942');
    setPin('8942');
    setOfficerError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Banner & Official Header */}
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* National Crest / Coat of Arms Indicator */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-800 text-xs font-bold mb-3 shadow-2xs uppercase tracking-wider">
          <Landmark className="w-4 h-4 text-red-700" />
          <span>Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam • Độc Lập - Tự Do - Hạnh Phúc</span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
          HỆ THỐNG MỘT CỬA SỐ SMARTWARD AI
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-2xl font-medium">
          Cổng Xác Thực & Phân Quyền Truy Cập Hành Chính Công Cấp Xã/Phường
        </p>

        {/* Selected Ward Badge */}
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-50 border border-teal-200 text-[#00796B] text-xs font-semibold">
          <MapPin className="w-3.5 h-3.5" />
          <span>Địa bàn phục vụ: <strong>UBND {currentWard.name}</strong></span>
          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="ml-1 text-slate-500 hover:text-[#00796B] underline text-[11px] cursor-pointer"
          >
            Đổi xã khác
          </button>
        </div>

        {/* 5-Minute Session Expiry Alert (If Triggered) */}
        {sessionMessage && (
          <div className="mt-4 w-full max-w-2xl rounded-xl bg-amber-50 border border-amber-300 p-3.5 flex items-start gap-3 text-left shadow-xs animate-fadeIn">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-amber-900">Thông Báo Hết Hạn Phiên (5 Phút)</h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">{sessionMessage}</p>
            </div>
            <button
              type="button"
              onClick={clearSessionMessage}
              className="text-amber-700 hover:text-amber-900 text-xs font-bold px-2 py-0.5"
            >
              Đóng
            </button>
          </div>
        )}
      </div>

      {/* Main Two-Role Portals Grid */}
      <div className="w-full max-w-5xl mx-auto my-6 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
        {/* ==================================================================== */}
        {/* ROLE 1: CỔNG DỊCH VỤ CÔNG DÂN */}
        {/* ==================================================================== */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-md hover:shadow-lg transition-all duration-200 flex flex-col justify-between p-6 sm:p-8 relative overflow-hidden group">
          {/* Subtle Accent Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#00796B]" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-[#00796B] flex items-center justify-center shadow-xs">
                <UserCheck className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-[#00796B] border border-teal-200 uppercase tracking-wider">
                Truy Cập Tức Thì
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Cổng Dành Cho Người Dân
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              Dành cho công dân, doanh nghiệp và tổ chức cần tra cứu thủ tục, hỏi đáp pháp lý, nộp và sơ duyệt tờ khai.
            </p>

            {/* Feature Bullet Points */}
            <div className="mt-5 space-y-2.5 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <Bot className="w-4 h-4 text-[#00796B] shrink-0 mt-0.5" />
                <span>Trợ lý AI PhoBERT giải đáp 40 TTHC cấp xã chuẩn xác theo luật.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-[#00796B] shrink-0 mt-0.5" />
                <span>Danh mục đầy đủ thành phần hồ sơ, thời hạn giải quyết và lệ phí.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <FileCheck2 className="w-4 h-4 text-[#00796B] shrink-0 mt-0.5" />
                <span>Tự động kiểm tra tính hợp lệ và tiền kiểm hồ sơ trước khi nộp.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#00796B] shrink-0 mt-0.5" />
                <span>Không cần mật khẩu • Phiên tự động kết thúc sau 5 phút an toàn.</span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-8 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={enterAsCitizen}
              className="w-full py-3.5 px-5 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <span>Đăng Nhập Với Tư Cách Người Dân</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-center text-[11px] text-slate-500 mt-2 font-medium">
              Vào thẳng cổng dịch vụ • Không yêu cầu mã PIN
            </p>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* ROLE 2: BÀN CÔNG VỤ CÁN BỘ */}
        {/* ==================================================================== */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-md hover:shadow-lg transition-all duration-200 flex flex-col justify-between p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle Accent Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0F2942]" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-[#0F2942] flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-[#0F2942] border border-slate-200 uppercase tracking-wider">
                Xác Thực Công Chức
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Bàn Công Vụ Cán Bộ
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              Dành cho công chức, cán bộ Một Cửa và lãnh đạo UBND giải quyết hồ sơ và giám sát địa bàn.
            </p>

            {/* Officer Login Form */}
            <form onSubmit={handleOfficerLogin} className="mt-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã Thẻ Công Chức
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={badgeId}
                    onChange={(e) => setBadgeId(e.target.value.toUpperCase())}
                    placeholder="VD: CC-AG-8942"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0F2942] focus:border-[#0F2942] font-mono uppercase"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã PIN Bảo Mật
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Mã PIN 4 số"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0F2942] focus:border-[#0F2942] font-mono"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Error Alert */}
              {officerError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 flex items-start gap-2 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{officerError}</span>
                </div>
              )}

              {/* Quick Demo Fill Helper */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Tài khoản mẫu: CC-AG-8942</span>
                <button
                  type="button"
                  onClick={handleFillDemoOfficer}
                  className="text-[#00796B] hover:underline font-semibold cursor-pointer"
                >
                  Điền nhanh
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full mt-2 py-3 px-5 rounded-xl bg-[#0F2942] hover:bg-[#1E3A5F] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-70 cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang Xác Thực JWT...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#5EEAD4]" />
                    <span>Đăng Nhập Thẻ Cán Bộ</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-500">
              Yêu cầu JWT Token thật từ máy chủ • Phiên làm việc 5 phút
            </span>
          </div>
        </div>
      </div>

      {/* Security Policy & Footer */}
      <div className="w-full max-w-4xl mx-auto text-center border-t border-slate-200 pt-4">
        <div className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-600 font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>
            Tiêu chuẩn an toàn: Mọi phiên truy cập (Dân & Cán bộ) tự động hết hạn sau <strong>5 phút</strong> nhằm bảo vệ dữ liệu.
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Ủy ban nhân dân Tỉnh An Giang • Nền tảng Chính quyền số Cấp Xã Thông Minh • Phiên bản 1.0.0
        </p>
      </div>
    </div>
  );
};

export default RoleGateway;
