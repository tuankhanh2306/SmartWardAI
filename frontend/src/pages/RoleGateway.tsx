import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { useWard } from '../context/WardContext';
import { ChangePinModal } from '../components/ChangePinModal';
import { officerLoginSchema, extractZodFieldErrors } from '../schemas/formValidation';
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
  Building2,
  CheckCircle2,
  Sparkles,
  FileText,
  Bot,
  QrCode,
  Globe,
  ChevronDown,
} from 'lucide-react';

export const RoleGateway: React.FC = () => {
  const {
    role,
    isOfficer,
    isAdmin,
    isCitizen,
    officerProfile,
    enterAsCitizen,
    loginOfficer,
    sessionMessage,
    clearSessionMessage,
  } = useRole();
  const { currentWard, setWard, allWards, totalWardsCount } = useWard();
  const navigate = useNavigate();

  // If already authenticated and within session, redirect to corresponding role workspace
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin', { replace: true });
    } else if (isOfficer) {
      const targetCode =
        officerProfile.wardCode && officerProfile.wardCode !== 'AG_PROVINCE'
          ? officerProfile.wardCode
          : currentWard.code;
      const w = allWards.find((x) => x.code === targetCode);
      if (w && w.code !== currentWard.code) {
        setWard(w);
      }
      navigate(`/officer/ward/${targetCode}`, { replace: true });
    } else if (isCitizen) {
      navigate('/citizen', { replace: true });
    }
  }, [
    role,
    isAdmin,
    isOfficer,
    isCitizen,
    officerProfile.wardCode,
    currentWard.code,
    allWards,
    setWard,
    navigate,
  ]);

  const [mode, setMode] = useState<'citizen' | 'officer'>('citizen');
  const [badgeId, setBadgeId] = useState(`CB-${currentWard.code}`);
  const [pin, setPin] = useState('');
  const [officerError, setOfficerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [changePinOpen, setChangePinOpen] = useState(false);

  const handleOfficerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = officerLoginSchema.safeParse({ badgeId, pin });
    if (!parsed.success) {
      setFieldErrors(extractZodFieldErrors(parsed.error));
      setOfficerError(null);
      return;
    }
    setFieldErrors({});
    setOfficerError(null);
    setIsLoggingIn(true);
    try {
      const ok = await loginOfficer(badgeId, pin);
      if (ok) {
        const norm = badgeId.trim().toUpperCase();
        if (norm.startsWith('ADM-')) {
          navigate('/admin', { replace: true });
          return;
        }
        let targetCode = currentWard.code;
        if (norm.startsWith('CB-') || norm.startsWith('CA-')) {
          targetCode = norm.substring(3);
          const w = allWards.find((x) => x.code === targetCode);
          if (w && w.code !== currentWard.code) {
            setWard(w);
          }
        } else {
          targetCode = 'AG_P_LONGXUYEN';
        }
        navigate(`/officer/ward/${targetCode}`, { replace: true });
      } else {
        setOfficerError('Mã thẻ hoặc mã PIN không chính xác.');
      }
    } catch {
      setOfficerError('Đã xảy ra lỗi khi khởi tạo phiên đăng nhập. Vui lòng thử lại.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:grid lg:grid-cols-2 overflow-x-clip">
      {/* ========================================================================= */}
      {/* LEFT 50%: BRANDING HERO, VALUE PROPOSITIONS & FLOATING AI PREVIEW CARDS   */}
      {/* ========================================================================= */}
      <section
        aria-label="Giới thiệu Hệ thống Trợ lý Hành chính công SmartWard AI"
        className="order-2 lg:order-1 w-full lg:min-h-screen bg-gradient-to-br from-[#FFF9F3] via-[#FDF2E7] to-[#FCE6D2] border-t lg:border-t-0 lg:border-r border-[#F1DEC9] px-4 sm:px-8 lg:px-12 xl:px-16 py-8 lg:py-10 flex flex-col justify-between relative overflow-hidden"
      >
        {/* Top Accent Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-[#FDBA74]/25 to-[#F97316]/10 blur-3xl"
        />

        {/* Brand Lockup */}
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#9F0C1E] text-white flex items-center justify-center shadow-xs">
              <Landmark className="w-5 h-5 text-[#FDE047]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                SmartWard
              </span>
              <Sparkles className="w-4 h-4 text-[#C2410C] shrink-0" />
              <span className="ml-1 text-[10px] font-extrabold uppercase tracking-wider text-[#9A3412] bg-white/80 px-2 py-0.5 rounded-full border border-[#FDBA74]">
                Trợ lý hành chính
              </span>
            </div>
          </div>
        </div>

        {/* Center Editorial Headline & 3 Value Bullets */}
        <div className="relative z-10 my-6 lg:my-8 max-w-xl">
          <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black tracking-tight text-slate-900 leading-[1.2]">
            Một cổng số,
            <span className="block text-[#C2410C] mt-1">
              kết nối mọi nghiệp vụ hành chính
            </span>
          </h1>

          <p className="mt-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
            Chọn vai trò <strong>Người dân</strong> hoặc <strong>Cán bộ</strong> để tra cứu thủ
            tục, tiền kiểm hồ sơ và xử lý nghiệp vụ theo địa bàn.
          </p>

          <ul className="mt-5 space-y-2.5 text-xs sm:text-sm text-slate-800 font-medium">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#C2410C] shrink-0 mt-0.5" />
              <span>
                Đồng bộ <strong>{totalWardsCount} xã, phường, đặc khu</strong> theo phân quyền đơn vị
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#C2410C] shrink-0 mt-0.5" />
              <span>
                Bảo mật hồ sơ và thông tin cá nhân an toàn
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#C2410C] shrink-0 mt-0.5" />
              <span>
                Hỏi đáp <strong>40 thủ tục</strong>, kiểm tra tờ khai &amp; báo sự cố
              </span>
            </li>
          </ul>

          {/* Floating Dual Preview Cards */}
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch">
            {/* Preview Card 1: AI Legal Assistant Q&A */}
            <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-xs border border-[#F1DEC9] shadow-sm flex flex-col justify-between gap-2.5 lg:-rotate-1 transition-transform hover:rotate-0">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#9A3412]">
                  <Bot className="w-3.5 h-3.5 text-[#C2410C]" />
                  <span>Trợ lý Pháp lý</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Chuẩn pháp lý
                </span>
              </div>

              <div className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-[11px] font-semibold text-slate-800">
                &ldquo;Khai sinh tại {currentWard.name} cần gì?&rdquo;
              </div>

              <div className="p-2.5 rounded-xl bg-[#FFF9F3] border border-[#FDE68A] text-[11px] text-slate-700 leading-snug">
                <div className="font-bold text-slate-900">
                  01 ngày làm việc • <span className="text-[#166534]">Miễn 100% lệ phí</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-600">
                  Luật Hộ tịch 2014 • Trích xuất chuẩn
                </p>
              </div>
            </div>

            {/* Preview Card 2: Document Precheck Summary */}
            <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-xs border border-[#F1DEC9] shadow-sm flex flex-col justify-between gap-2.5 lg:rotate-1 transition-transform hover:rotate-0">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#9F0C1E]">
                  <FileText className="w-3.5 h-3.5 text-[#B90E23]" />
                  <span>Tiền kiểm hồ sơ</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#9F0C1E] border border-[#FECACA]">
                  4 mẫu A4
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#9F0C1E] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  A4
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-900 truncate">
                    Tờ khai CT01 Cư trú
                  </div>
                  <div className="text-[10px] text-slate-600">
                    Độ nét 100/100 • Khớp mẫu
                  </div>
                </div>
              </div>

              <ul className="space-y-1 text-[10px] text-slate-700">
                <li>• Tự kiểm tra 12 số CCCD &amp; ngày sinh</li>
                <li>• Cấp Phiếu hẹn mã QR tại quầy</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Footer */}
        <div className="relative z-10 pt-3 border-t border-[#EED7C1] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#7C2D12] font-medium">
          <span>© 2026 SmartWard AI</span>
          <span>UBND {currentWard.name} • Tỉnh An Giang</span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* RIGHT 50%: STICKY TOP PILL & 50:50 ROLE SELECTION / LOGIN CARD            */}
      {/* ========================================================================= */}
      <section
        aria-label="Chọn vai trò và Đăng nhập hệ thống"
        className="order-1 lg:order-2 w-full lg:min-h-screen bg-white flex flex-col justify-between"
      >
        {/* Sticky Top Utility Bar inside Right Panel (Stays pinned on scroll) */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-8 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#9F0C1E] text-[#FDE047] flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
              Cổng Một Cửa Số
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#B90E23] to-[#C2410C] hover:from-[#9F0C1E] hover:to-[#9A3412] text-white text-xs font-bold shadow-2xs transition cursor-pointer shrink-0 gov-focus-ring"
            title={`Đổi đơn vị hành chính (${totalWardsCount} xã, phường, đặc khu)`}
          >
            <Globe className="w-3.5 h-3.5 text-amber-200 shrink-0" />
            <span className="truncate max-w-[140px] sm:max-w-[220px]">
              {currentWard.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-amber-100 shrink-0" />
          </button>
        </header>

        {/* Centered Interactive Welcome Card */}
        <div className="flex-1 flex items-center justify-center px-3.5 sm:px-6 py-6 sm:py-10">
          <div className="w-full max-w-[460px] bg-white rounded-3xl border border-slate-200/90 shadow-[0_12px_40px_rgba(15,23,42,0.06)] p-5 sm:p-8 flex flex-col animate-fadeIn">
            {/* Welcome Heading */}
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Xin chào
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Chọn vai trò để bắt đầu với SmartWard AI.
              </p>
            </div>

            {/* Session Expiry / Lockout Alert */}
            {sessionMessage && (
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-xs text-amber-900 animate-fadeIn">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold">{sessionMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={clearSessionMessage}
                  aria-label="Đóng thông báo phiên"
                  className="text-amber-800 hover:text-amber-950 font-bold px-1 cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}

            {/* 50:50 ROLE SELECTOR TABS (Người dân 50% : Cán bộ 50%) */}
            <div
              role="group"
              aria-label="Chọn vai trò truy cập 50:50"
              className="mt-5 grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-slate-100 border border-slate-200/80"
            >
              <button
                type="button"
                aria-pressed={mode === 'citizen'}
                onClick={() => {
                  setOfficerError(null);
                  setMode('citizen');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer gov-focus-ring ${
                  mode === 'citizen'
                    ? 'bg-white text-[#9F0C1E] shadow-xs border border-slate-200/80'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>Người dân</span>
              </button>

              <button
                type="button"
                aria-pressed={mode === 'officer'}
                onClick={() => {
                  setOfficerError(null);
                  setBadgeId(`CB-${currentWard.code}`);
                  setPin('');
                  setMode('officer');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer gov-focus-ring ${
                  mode === 'officer'
                    ? 'bg-[#0F2942] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Đăng nhập Cán bộ</span>
              </button>
            </div>

            {/* ================================================================= */}
            {/* TAB 1 (50% LEFT CHOICE): CITIZEN INSTANT ACCESS                   */}
            {/* ================================================================= */}
            {mode === 'citizen' && (
              <div className="mt-5 flex flex-col gap-4 animate-fadeIn">
                {/* Active Ward Selection Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#9F0C1E] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[11px] font-semibold text-slate-600">
                        Địa bàn đang chọn
                      </span>
                      <span className="block text-xs sm:text-sm font-bold text-slate-900 truncate">
                        UBND {currentWard.name}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/onboarding')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-[#9F0C1E] transition cursor-pointer shrink-0 gov-focus-ring"
                  >
                    Đổi xã ({totalWardsCount})
                  </button>
                </div>

                {/* Citizen Feature Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div className="p-2.5 rounded-xl bg-[#FFF9F3] border border-[#F1DEC9] flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#C2410C] shrink-0" />
                    <span className="font-semibold">Hỏi đáp 40 thủ tục</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FFF9F3] border border-[#F1DEC9] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#9F0C1E] shrink-0" />
                    <span className="font-semibold">Tiền kiểm mẫu A4</span>
                  </div>
                </div>

                {/* Primary Gradient Action Button (Maintains exact Playwright accessible name) */}
                <button
                  type="button"
                  onClick={enterAsCitizen}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#B90E23] via-[#C2410C] to-[#B45309] hover:from-[#9F0C1E] hover:to-[#9A3412] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer gov-focus-ring"
                >
                  <Sparkles className="w-4 h-4 text-amber-200 shrink-0" />
                  <span>Đăng nhập với tư cách Người dân</span>
                  <ArrowRight className="w-4 h-4 text-amber-100 shrink-0" />
                </button>
              </div>
            )}

            {/* ================================================================= */}
            {/* TAB 2 (50% RIGHT CHOICE): OFFICER / ADMIN LOGIN FORM              */}
            {/* ================================================================= */}
            {mode === 'officer' && (
              <div className="mt-5 animate-fadeIn">
                <form onSubmit={handleOfficerLogin} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="gateway-ward-select"
                      className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"
                    >
                      <Building2 className="w-3.5 h-3.5 text-[#00796B]" />
                      <span>Đơn vị công tác ({totalWardsCount})</span>
                    </label>
                    <select
                      id="gateway-ward-select"
                      value={currentWard.code}
                      onChange={(e) => {
                        const w = allWards.find((x) => x.code === e.target.value);
                        if (w) {
                          setWard(w);
                          setBadgeId(`CB-${w.code}`);
                          setPin('');
                          setOfficerError(null);
                        }
                      }}
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-900"
                    >
                      {allWards.map((w) => (
                        <option key={w.code} value={w.code}>
                          {w.name} ({w.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="gateway-badge-input"
                      className="block text-xs font-bold text-slate-700 mb-1.5"
                    >
                      Mã thẻ công chức
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="gateway-badge-input"
                        type="text"
                        value={badgeId}
                        onChange={(e) => {
                          setBadgeId(e.target.value.toUpperCase());
                          if (fieldErrors.badgeId) {
                            setFieldErrors((prev) => ({ ...prev, badgeId: '' }));
                          }
                        }}
                        aria-invalid={Boolean(fieldErrors.badgeId)}
                        placeholder="VD: CB-AG_P_LONGXUYEN"
                        className={`w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 font-mono uppercase text-slate-900 ${
                          fieldErrors.badgeId
                            ? 'border-red-500 focus:ring-red-500/30'
                            : 'border-slate-300 focus:ring-[#C2410C]'
                        }`}
                      />
                    </div>
                    {fieldErrors.badgeId && (
                      <p role="alert" className="mt-1 text-xs font-medium text-red-700">
                        {fieldErrors.badgeId}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label
                        htmlFor="gateway-pin-input"
                        className="block text-xs font-bold text-slate-700"
                      >
                        Mã PIN công vụ
                      </label>
                      <button
                        type="button"
                        onClick={() => setChangePinOpen(true)}
                        className="text-xs font-bold text-[#C2410C] hover:underline cursor-pointer"
                      >
                        Đổi mã PIN?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="gateway-pin-input"
                        type="password"
                        value={pin}
                        onChange={(e) => {
                          setPin(e.target.value);
                          if (fieldErrors.pin) {
                            setFieldErrors((prev) => ({ ...prev, pin: '' }));
                          }
                        }}
                        aria-invalid={Boolean(fieldErrors.pin)}
                        placeholder="Nhập mã PIN"
                        className={`w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 font-mono text-slate-900 ${
                          fieldErrors.pin
                            ? 'border-red-500 focus:ring-red-500/30'
                            : 'border-slate-300 focus:ring-[#C2410C]'
                        }`}
                      />
                    </div>
                    {fieldErrors.pin && (
                      <p role="alert" className="mt-1 text-xs font-medium text-red-700">
                        {fieldErrors.pin}
                      </p>
                    )}
                  </div>

                  {officerError && (
                    <div className="rounded-xl bg-red-50 border border-red-200 p-2.5 flex items-start gap-2 text-red-800 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                      <span>{officerError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#B90E23] via-[#C2410C] to-[#B45309] hover:from-[#9F0C1E] hover:to-[#9A3412] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-70 cursor-pointer gov-focus-ring"
                  >
                    {isLoggingIn ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Đang xác thực...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-200" />
                        <span>Đăng nhập Hệ thống</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Security & Account Info Box with QR Icon (Matching Wai Reference Card Footer) */}
            <div className="mt-5 p-3.5 rounded-2xl bg-[#FFF9F3] border border-[#F1DEC9] flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <Clock className="w-4 h-4 text-[#C2410C] shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-700 leading-snug">
                  <span className="font-bold text-slate-900 block">
                    Phiên làm việc an toàn
                  </span>
                  <span>
                    Công dân: phiên 30 phút • Cán bộ: khóa sau 15 phút.
                  </span>
                </div>
              </div>
              <div
                aria-hidden="true"
                className="w-9 h-9 rounded-xl bg-white border border-[#EED7C1] flex items-center justify-center text-slate-800 shrink-0"
              >
                <QrCode className="w-5 h-5" />
              </div>
            </div>

            <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-600">
              Dữ liệu cá nhân được xử lý minh bạch, có sự đồng ý rõ ràng và chỉ cho mục đích giải quyết TTHC theo{' '}
              <span className="font-semibold text-slate-700">
                Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 &amp; NĐ 356/2025/NĐ-CP
              </span>
              .
            </p>
          </div>
        </div>

        {/* Minimal Right Bottom Line */}
        <div className="px-4 sm:px-8 py-3 text-center text-[11px] text-slate-600 border-t border-slate-100">
          UBND {currentWard.name} • Hotline: {currentWard.phoneNumber}
        </div>
      </section>

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
