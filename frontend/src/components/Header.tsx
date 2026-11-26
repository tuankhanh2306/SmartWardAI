import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Landmark,
  Bot,
  ShieldCheck,
  FileCheck2,
  MapPin,
  LogOut,
  AlertTriangle,
  BookOpen,
  Clock,
  ArrowLeft,
  KeyRound,
  Menu,
  X,
  ChevronDown,
  PhoneCall,
  Calendar,
  Volume2,
  Eye,
  Type,
  GitCompare,
  Lock,
} from 'lucide-react';
import { useWard } from '../context/WardContext';
import { useRole } from '../context/RoleContext';
import { useAccessibility } from '../context/AccessibilityContext';
import OfficerAuthModal from './OfficerAuthModal';
import ChangePinModal from './ChangePinModal';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const hash = location.hash;
  const { currentWard, isOfficeOpen, officeStatusLabel, totalWardsCount } = useWard();
  const {
    role,
    isOfficer,
    isAdmin,
    isCitizen,
    officerProfile,
    logout,
    sessionSecondsLeft,
    sessionWarningActive,
    extendSession,
    authModalOpen,
    setAuthModalOpen,
  } = useRole();
  const {
    textScale,
    setTextScale,
    isAudioAutoPlay,
    setIsAudioAutoPlay,
    isSimpleMode,
    setIsSimpleMode,
  } = useAccessibility();
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [path, hash]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  // If on Gateway (/), hide standard app header so Gateway has clean view
  if (path === '/' || !role) {
    return null;
  }

  const assignedOfficerWardCode =
    officerProfile.wardCode && officerProfile.wardCode !== 'AG_PROVINCE'
      ? officerProfile.wardCode
      : currentWard.code;

  const citizenNavLinks = [
    { to: '/citizen', label: 'Hỏi Đáp AI', icon: Bot, match: () => path === '/citizen' },
    {
      to: '/citizen/procedures',
      label: '40 Thủ Tục',
      icon: BookOpen,
      match: () => path === '/citizen/procedures',
    },
    {
      to: '/citizen/form#form',
      label: 'Kiểm Tra Tờ Khai',
      icon: FileCheck2,
      match: () => path === '/citizen/form' && hash !== '#incident',
    },
    {
      to: '/citizen/form#incident',
      label: 'Báo Sự Cố',
      icon: AlertTriangle,
      match: () => path === '/citizen/form' && hash === '#incident',
    },
  ];

  const officerNavLinks = [
    {
      to: `/officer/ward/${assignedOfficerWardCode}`,
      label: 'Bàn Điều Hành',
      icon: ShieldCheck,
      match: () => path.startsWith('/officer/ward'),
    },
    {
      to: `/officer/audit`,
      label: 'Sơ Duyệt Hồ Sơ',
      icon: FileCheck2,
      match: () => path === '/officer/audit',
    },
    {
      to: `/officer/map`,
      label: 'Bản Đồ GIS',
      icon: MapPin,
      match: () => path === '/officer/map',
    },
    {
      to: `/officer/procedures`,
      label: 'Đề Xuất 40 TTHC',
      icon: BookOpen,
      match: () => path === '/officer/procedures',
    },
  ];

  const adminNavLinks = [
    {
      to: '/admin',
      label: 'Danh Mục 40 TTHC',
      icon: BookOpen,
      match: () => path === '/admin' || path === '/admin/procedures',
    },
    {
      to: '/admin/proposals',
      label: 'Hàng Đợi Duyệt TTHC',
      icon: GitCompare,
      match: () => path.startsWith('/admin/proposals'),
    },
    {
      to: `/admin/wards/${currentWard.code}`,
      label: `Xem Liên Xã (${totalWardsCount})`,
      icon: Eye,
      match: () => path.startsWith('/admin/wards'),
    },
  ];

  const activeNavLinks = isAdmin ? adminNavLinks : isOfficer ? officerNavLinks : citizenNavLinks;
  const isOnboarding = path === '/onboarding';
  const isStaff = isOfficer || isAdmin;

  const timerMinutes = Math.floor(sessionSecondsLeft / 60);
  const timerSeconds = sessionSecondsLeft % 60;
  const formattedCountdown = `${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`;

  return (
    <>
      <header
        className={`sticky top-0 left-0 right-0 z-50 w-full max-w-full ${
          isStaff
            ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs'
            : 'shadow-xs'
        }`}
      >
        {/* TIER 1: Officer/Admin Single Header OR Citizen Official Crimson Masthead */}
        <div
          className={
            isStaff
              ? 'min-h-14 sm:min-h-16 w-full max-w-[1920px] mx-auto px-2.5 sm:px-5 xl:px-6 py-1.5 flex items-center justify-between gap-2 sm:gap-3'
              : 'bg-bca-masthead text-white min-h-13 lg:h-[52px] w-full'
          }
        >
          <div
            className={
              isStaff
                ? 'w-full flex items-center justify-between gap-2 sm:gap-3'
                : 'min-h-13 lg:h-full w-full max-w-[1440px] 2xl:max-w-[1920px] mx-auto px-2.5 sm:px-5 xl:px-6 py-1.5 flex items-center justify-between gap-2 sm:gap-3'
            }
          >
            {/* Cluster 1: Brand + Scope Pill (Officer locked to assigned ward; Citizen & Admin can switch wards) */}
            <div className="min-w-0 flex items-center gap-1.5 sm:gap-2">
              {isOfficer ? (
                <div
                  title="Đơn vị công tác cố định theo tài khoản cán bộ"
                  className="min-w-0 inline-flex items-center gap-1.5 sm:gap-2 pr-2 pl-1.5 py-1 rounded-xl border border-slate-200 bg-slate-50 text-slate-900"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white shrink-0 bg-[#0F2942]">
                    <ShieldCheck className="w-4 h-4 text-teal-200" />
                  </div>
                  <div className="min-w-0 flex items-center gap-1">
                    <span className="font-semibold text-xs sm:text-sm text-slate-900 tracking-tight truncate max-w-[120px] sm:max-w-[230px]">
                      UBND {currentWard.name}
                    </span>
                    <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                  </div>
                </div>
              ) : (
                <Link
                  to="/onboarding"
                  title={`Bấm để đổi đơn vị hành chính (${totalWardsCount} đơn vị)`}
                  className={
                    isAdmin
                      ? `min-w-0 inline-flex items-center gap-1.5 sm:gap-2 pr-2 pl-1.5 py-1 rounded-xl border transition active:scale-[0.98] gov-focus-ring ${
                          isOnboarding
                            ? 'bg-amber-50 border-amber-300 text-[#78350F]'
                            : 'bg-transparent border-transparent hover:bg-slate-100/80 hover:border-slate-200 text-slate-900'
                        }`
                      : `min-w-0 inline-flex items-center gap-2 pr-2 pl-1 py-1 rounded-xl border transition active:scale-[0.98] gov-focus-ring ${
                          isOnboarding
                            ? 'bg-white/15 border-amber-300/60 text-white'
                            : 'bg-transparent border-transparent hover:bg-white/10 text-white'
                        }`
                  }
                >
                  <div
                    className={
                      isAdmin
                        ? 'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white shrink-0 bg-[#78350F]'
                        : 'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 bg-[#7F0918] border border-[#FCD34D]/65 text-[#FDE047] shadow-2xs'
                    }
                  >
                    {isAdmin ? (
                      <ShieldCheck className="w-4 h-4 text-amber-200" />
                    ) : (
                      <Landmark className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex flex-col">
                    {isCitizen && (
                      <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-wider text-[#FDE68A] leading-tight">
                        Cổng Một Cửa Số • An Giang
                      </span>
                    )}
                    <div className="min-w-0 flex items-center gap-1">
                      <span
                        className={`font-bold text-xs sm:text-sm tracking-tight truncate max-w-[120px] sm:max-w-[240px] ${
                          isAdmin ? 'text-slate-900 font-semibold' : 'text-white'
                        }`}
                      >
                        {isAdmin ? 'Quản Trị Cấp Tỉnh (AG_PROVINCE)' : `UBND ${currentWard.name}`}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isOfficeOpen
                            ? isAdmin
                              ? 'bg-[#16A34A]'
                              : 'bg-[#4ADE80]'
                            : isAdmin
                            ? 'bg-[#CA8A04]'
                            : 'bg-[#FBBF24]'
                        }`}
                        title={officeStatusLabel}
                      />
                      <ChevronDown
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isAdmin ? 'text-slate-500' : 'text-amber-100'
                        }`}
                      />
                    </div>
                  </div>
                </Link>
              )}
            </div>

            {/* Officer / Admin Center Navigation */}
            {isStaff && (
              <nav
                aria-label="Điều hướng chính"
                className="hidden lg:flex items-center gap-0.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 shrink-0"
              >
                {activeNavLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.match();
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap gov-focus-ring ${
                        isActive
                          ? isAdmin
                            ? 'bg-white text-[#78350F] shadow-xs'
                            : 'bg-white text-[#0F2942] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          isActive
                            ? isAdmin
                              ? 'text-[#78350F]'
                              : 'text-[#0F2942]'
                            : 'text-slate-500'
                        }`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Cluster 3: Role Badge + Session Countdown + Utility Menu */}
            <div ref={menuContainerRef} className="relative flex items-center gap-2 shrink-0">
              <span
                className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                  isAdmin
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : isOfficer
                    ? 'bg-slate-100 text-[#0F2942] border-slate-300'
                    : 'bg-black/20 text-amber-100 border-white/20'
                }`}
              >
                {isAdmin ? 'ADMIN CẤP TỈNH' : isOfficer ? 'CÁN BỘ XÃ' : 'CÔNG DÂN'}
              </span>

              {isStaff && (
                <div
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono font-semibold ${
                    sessionWarningActive
                      ? 'bg-white text-[#991B1B] border border-red-200 animate-pulse'
                      : 'text-slate-600'
                  }`}
                  title="Thời gian khóa không hoạt động 15 phút còn lại"
                >
                  <Clock
                    className={`w-3.5 h-3.5 ${
                      sessionWarningActive ? 'text-[#B90E23]' : 'text-slate-500'
                    }`}
                  />
                  <span>{formattedCountdown}</span>
                </div>
              )}

              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                aria-controls="header-utility-menu"
                aria-haspopup="true"
                title="Mở menu cài đặt hiển thị, thông tin UBND và phiên làm việc"
                className={
                  isStaff
                    ? `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer gov-focus-ring ${
                        menuOpen
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`
                    : `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer gov-focus-ring ${
                        menuOpen
                          ? 'bg-white text-[#750715] border-white'
                          : 'bg-black/20 hover:bg-black/30 text-white border-white/25'
                      }`
                }
              >
                {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                <span className="sr-only sm:not-sr-only">Tùy chọn</span>
              </button>

              {menuOpen && (
                <div
                  id="header-utility-menu"
                  role="dialog"
                  aria-label="Cài đặt và thông tin UBND"
                  className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(21rem,calc(100vw-1.5rem))] rounded-2xl bg-white border border-slate-200 shadow-xl p-3.5 z-50 flex flex-col gap-3 animate-fadeIn text-slate-900"
                >
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        UBND {currentWard.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                          isOfficeOpen
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {isOfficeOpen ? 'Đang tiếp dân' : 'Ngoài giờ • AI 24/7'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-snug">
                      <MapPin
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          isStaff ? 'text-[#00695C]' : 'text-[#B90E23]'
                        }`}
                      />
                      <span>{currentWard.officeAddress}</span>
                    </p>
                    <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <Calendar
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isStaff ? 'text-[#00695C]' : 'text-[#B90E23]'
                        }`}
                      />
                      <span>{currentWard.workingHours}</span>
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-1 mt-0.5 border-t border-slate-200/70">
                      <a
                        href={`tel:${currentWard.phoneNumber.replace(/\s+/g, '')}`}
                        className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline font-mono ${
                          isStaff ? 'text-[#00695C]' : 'text-[#9F0C1E]'
                        }`}
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>{currentWard.phoneNumber}</span>
                      </a>
                      {!isOfficer && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            navigate('/onboarding');
                          }}
                          className={`text-xs font-semibold hover:underline cursor-pointer ${
                            isAdmin
                              ? 'text-[#00695C] hover:text-[#004D40]'
                              : 'text-[#9F0C1E] hover:text-[#750715]'
                          }`}
                        >
                          Đổi xã/phường
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-slate-500" />
                        <span>Cỡ chữ hiển thị</span>
                      </span>
                      <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                        {(
                          [
                            { id: 'normal', label: 'Chuẩn' },
                            { id: 'large', label: 'To' },
                            { id: 'huge', label: 'Rất to' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setTextScale(opt.id)}
                            aria-pressed={textScale === opt.id}
                            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                              textScale === opt.id
                                ? isStaff
                                  ? 'bg-[#00695C] text-white shadow-2xs'
                                  : 'bg-[#B90E23] text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {isCitizen && (
                      <>
                        <button
                          type="button"
                          aria-pressed={isAudioAutoPlay}
                          onClick={() => setIsAudioAutoPlay(!isAudioAutoPlay)}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer gov-focus-ring"
                        >
                          <span className="text-xs font-medium text-slate-800 flex items-center gap-2">
                            <Volume2 className="w-4 h-4 text-[#B90E23]" />
                            <span>Tự động đọc câu trả lời</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              isAudioAutoPlay
                                ? 'bg-[#B90E23] text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isAudioAutoPlay ? 'BẬT' : 'TẮT'}
                          </span>
                        </button>

                        <button
                          type="button"
                          aria-pressed={isSimpleMode}
                          onClick={() => {
                            const next = !isSimpleMode;
                            setIsSimpleMode(next);
                            if (next && textScale === 'normal') {
                              setTextScale('large');
                            }
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer gov-focus-ring"
                        >
                          <span className="text-xs font-medium text-slate-800 flex items-center gap-2">
                            <Eye className="w-4 h-4 text-[#B90E23]" />
                            <span>Giao diện đơn giản (Chữ to)</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              isSimpleMode
                                ? 'bg-[#B90E23] text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isSimpleMode ? 'BẬT' : 'TẮT'}
                          </span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Section 3: Role / Session Controls */}
                  <div className="pt-2 border-t border-slate-200 flex flex-col gap-1.5">
                    {isStaff ? (
                      <>
                        <div className="flex items-center gap-2 px-1 py-1">
                          <div
                            className={`w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-xs shrink-0 ${
                              isAdmin ? 'bg-[#78350F]' : 'bg-[#0F2942]'
                            }`}
                          >
                            {officerProfile.avatarText}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {officerProfile.name}
                            </p>
                            <p className="text-[11px] text-slate-600">
                              {isAdmin
                                ? `Quản trị viên • ${officerProfile.badgeId}`
                                : `Cán bộ xã • ${officerProfile.badgeId} (${officerProfile.wardCode})`}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              setChangePinOpen(true);
                            }}
                            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Đổi PIN</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              logout();
                            }}
                            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Đăng xuất</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer gov-focus-ring"
                      >
                        <span className="flex items-center gap-2">
                          <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                          <span>Đổi Vai Trò (Về cổng chính)</span>
                        </span>
                        <span className="text-[11px] text-slate-600 font-medium">Công dân</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TIER 2 (All Screens Citizen): Responsive Sticky Sub-Navigation Bar */}
        {isCitizen && (
          <nav
            aria-label="Điều hướng chính"
            className="block bg-[#F7EEDF]/95 backdrop-blur-md border-b border-[#E5D4B3] w-full"
          >
            <div className="min-h-9 lg:h-10 w-full max-w-[1440px] 2xl:max-w-[1920px] mx-auto px-2 sm:px-5 xl:px-6 py-1 lg:py-0 flex flex-wrap items-center justify-between sm:justify-start gap-x-2.5 sm:gap-x-6 gap-y-1">
              {citizenNavLinks.map((item) => {
                const Icon = item.icon;
                const isActive = item.match();
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`py-1 lg:py-0 lg:h-full inline-flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wide border-b-2 lg:border-b-[2.5px] transition-colors whitespace-nowrap gov-focus-ring ${
                      isActive
                        ? 'border-[#B90E23] text-[#9F0C1E]'
                        : 'border-transparent text-[#2B1B17] hover:text-[#9F0C1E]'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-[#B90E23]' : 'text-[#5C4033]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        {/* TIER 2 (Mobile/Tablet Staff Only): Responsive Sub-Navigation Bar when < lg */}
        {isStaff && (
          <nav
            aria-label="Điều hướng di động"
            className="lg:hidden bg-slate-50/95 backdrop-blur-md border-t border-slate-200/80 w-full"
          >
            <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-5 py-1.5 flex flex-wrap items-center justify-between sm:justify-start gap-1.5">
              {activeNavLinks.map((item) => {
                const Icon = item.icon;
                const isActive = item.match();
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg transition-all whitespace-nowrap gov-focus-ring ${
                      isActive
                        ? isAdmin
                          ? 'bg-white text-[#78350F] shadow-2xs border border-amber-200'
                          : 'bg-white text-[#0F2942] shadow-2xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        {/* Requirement 4: Pre-Expiry 60s Warning Banner with "Tiếp tục?" Button */}
        {sessionWarningActive && (
          <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex flex-wrap items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {isCitizen
                  ? `Phiên làm việc công dân sắp hết hạn sau ${sessionSecondsLeft} giây. Bạn có muốn tiếp tục để không mất bản nháp đang soạn không?`
                  : `Cảnh báo khóa không hoạt động: Phiên công vụ sẽ tự động đăng xuất sau ${sessionSecondsLeft} giây.`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={extendSession}
                className="px-3 py-1 rounded-lg bg-white text-amber-900 font-extrabold hover:bg-amber-50 transition cursor-pointer"
              >
                Tiếp tục? ({isCitizen ? '+30 phút' : '+15 phút'})
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="px-2.5 py-1 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-semibold cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </header>

      <OfficerAuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <ChangePinModal isOpen={changePinOpen} onClose={() => setChangePinOpen(false)} />
    </>
  );
};

export default Header;
