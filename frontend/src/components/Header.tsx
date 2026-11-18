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
  const { currentWard, isOfficeOpen, officeStatusLabel } = useWard();
  const { role, isOfficer, officerProfile, logout, sessionSecondsLeft, authModalOpen, setAuthModalOpen } =
    useRole();
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

  // Close utility drawer on route/hash navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [path, hash]);

  // Close utility drawer on outside click or Escape key (restoring focus to trigger)
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
      to: `/officer/ward/${currentWard.code}`,
      label: 'Bàn Điều Hành',
      icon: ShieldCheck,
      match: () => path.startsWith('/officer'),
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
  ];

  const activeNavLinks = isOfficer ? officerNavLinks : citizenNavLinks;
  const isOnboarding = path === '/onboarding';

  // Format 5-minute countdown (MM:SS)
  const timerMinutes = Math.floor(sessionSecondsLeft / 60);
  const timerSeconds = sessionSecondsLeft % 60;
  const formattedCountdown = `${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 ${
          isOfficer
            ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/80'
            : 'shadow-xs'
        }`}
      >
        {/* TIER 1: Officer Single Header OR Citizen Official Crimson Masthead */}
        <div
          className={
            isOfficer
              ? 'h-14 sm:h-16 w-full max-w-[1920px] mx-auto px-3 sm:px-5 xl:px-6 flex items-center justify-between gap-3'
              : 'bg-bca-masthead text-white h-14 lg:h-[52px] w-full'
          }
        >
          <div
            className={
              isOfficer
                ? 'w-full flex items-center justify-between gap-3'
                : 'h-full w-full max-w-[1440px] 2xl:max-w-[1920px] mx-auto px-3 sm:px-5 xl:px-6 flex items-center justify-between gap-3'
            }
          >
            {/* Cluster 1: Brand + Active Ward Switcher */}
            <div className="min-w-0 flex items-center gap-2">
              <Link
                to="/onboarding"
                title="Bấm để đổi Xã/Phường khác tại An Giang"
                className={
                  isOfficer
                    ? `min-w-0 inline-flex items-center gap-2 pr-2.5 pl-1.5 py-1 rounded-xl border transition active:scale-[0.98] gov-focus-ring ${
                        isOnboarding
                          ? 'bg-teal-50 border-teal-300 text-[#004D40]'
                          : 'bg-transparent border-transparent hover:bg-slate-100/80 hover:border-slate-200 text-slate-900'
                      }`
                    : `min-w-0 inline-flex items-center gap-2.5 pr-2.5 pl-1 py-1 rounded-xl border transition active:scale-[0.98] gov-focus-ring ${
                        isOnboarding
                          ? 'bg-white/15 border-amber-300/60 text-white'
                          : 'bg-transparent border-transparent hover:bg-white/10 text-white'
                      }`
                }
              >
                <div
                  className={
                    isOfficer
                      ? 'w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 bg-[#0F2942]'
                      : 'w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#7F0918] border border-[#FCD34D]/65 text-[#FDE047] shadow-2xs'
                  }
                >
                  {isOfficer ? (
                    <ShieldCheck className="w-4 h-4 text-teal-200" />
                  ) : (
                    <Landmark className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex flex-col">
                  {!isOfficer && (
                    <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-wider text-[#FDE68A] leading-tight">
                      Cổng Một Cửa Số • An Giang
                    </span>
                  )}
                  <div className="min-w-0 flex items-center gap-1.5">
                    <span
                      className={`font-bold text-xs sm:text-sm tracking-tight truncate max-w-[155px] sm:max-w-[240px] ${
                        isOfficer ? 'text-slate-900 font-semibold' : 'text-white'
                      }`}
                    >
                      UBND {currentWard.name}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isOfficeOpen
                          ? isOfficer
                            ? 'bg-[#16A34A]'
                            : 'bg-[#4ADE80]'
                          : isOfficer
                          ? 'bg-[#CA8A04]'
                          : 'bg-[#FBBF24]'
                      }`}
                      title={officeStatusLabel}
                    />
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isOfficer ? 'text-slate-500' : 'text-amber-100'
                      }`}
                    />
                  </div>
                </div>
              </Link>
            </div>

            {/* Officer Center Navigation (Kept intact for Officer role) */}
            {isOfficer && (
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
                          ? 'bg-white text-[#0F2942] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          isActive ? 'text-[#0F2942]' : 'text-slate-500'
                        }`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Cluster 3: Session Indicator + Hamburger Utility Menu [☰] */}
            <div ref={menuContainerRef} className="relative flex items-center gap-2 shrink-0">
              {isOfficer ? (
                <span
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[#00695C] px-2 py-1"
                  title="Phiên làm việc cán bộ thường trực"
                >
                  <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                  <span>Thường trực</span>
                </span>
              ) : (
                <div
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono font-semibold ${
                    sessionSecondsLeft <= 60
                      ? 'bg-white text-[#991B1B] border border-red-200 animate-pulse'
                      : 'bg-black/20 text-amber-50 border border-white/15'
                  }`}
                  title="Thời gian phiên làm việc công dân còn lại (tự kết thúc sau 5 phút)"
                >
                  <Clock
                    className={`w-3.5 h-3.5 ${
                      sessionSecondsLeft <= 60 ? 'text-[#B90E23]' : 'text-[#FDE68A]'
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
                title="Mở menu cài đặt hiển thị, thông tin UBND và đổi vai trò"
                className={
                  isOfficer
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

              {/* Quick Settings & Ward Info Popover Drawer */}
              {menuOpen && (
                <div
                  id="header-utility-menu"
                  role="dialog"
                  aria-label="Cài đặt và thông tin UBND"
                  className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(21rem,calc(100vw-1.5rem))] rounded-2xl bg-white border border-slate-200 shadow-xl p-3.5 z-50 flex flex-col gap-3 animate-fadeIn text-slate-900"
                >
                  {/* Section 1: Active Ward Info & Hours */}
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
                          isOfficer ? 'text-[#00695C]' : 'text-[#B90E23]'
                        }`}
                      />
                      <span>{currentWard.officeAddress}</span>
                    </p>
                    <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <Calendar
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isOfficer ? 'text-[#00695C]' : 'text-[#B90E23]'
                        }`}
                      />
                      <span>{currentWard.workingHours}</span>
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-1 mt-0.5 border-t border-slate-200/70">
                      <a
                        href={`tel:${currentWard.phoneNumber.replace(/\s+/g, '')}`}
                        className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline font-mono ${
                          isOfficer ? 'text-[#00695C]' : 'text-[#9F0C1E]'
                        }`}
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>{currentWard.phoneNumber}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          navigate('/onboarding');
                        }}
                        className={`text-xs font-semibold hover:underline cursor-pointer ${
                          isOfficer
                            ? 'text-[#00695C] hover:text-[#004D40]'
                            : 'text-[#9F0C1E] hover:text-[#750715]'
                        }`}
                      >
                        Đổi xã/phường
                      </button>
                    </div>
                  </div>

                  {/* Section 2: Accessibility Controls */}
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
                                ? isOfficer
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

                    {!isOfficer && (
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

                  {/* Section 3: Role / Session Controls (Strictly Isolated by Role) */}
                  <div className="pt-2 border-t border-slate-200 flex flex-col gap-1.5">
                    {isOfficer ? (
                      <>
                        <div className="flex items-center gap-2 px-1 py-1">
                          <div className="w-7 h-7 rounded-lg bg-[#0F2942] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {officerProfile.avatarText}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {officerProfile.name}
                            </p>
                            <p className="text-[11px] text-slate-600">Cán bộ Một cửa</p>
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

        {/* TIER 2 (Desktop Citizen Only): Warm Ivory Editorial Sub-Navigation Bar */}
        {!isOfficer && (
          <nav
            aria-label="Điều hướng chính"
            className="hidden lg:block bg-[#F7EEDF] border-b border-[#E5D4B3]"
          >
            <div className="h-10 w-full max-w-[1440px] 2xl:max-w-[1920px] mx-auto px-5 xl:px-6 flex items-center gap-7">
              {citizenNavLinks.map((item) => {
                const Icon = item.icon;
                const isActive = item.match();
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`h-full inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide border-b-[2.5px] transition-colors whitespace-nowrap gov-focus-ring ${
                      isActive
                        ? 'border-[#B90E23] text-[#9F0C1E]'
                        : 'border-transparent text-[#2B1B17] hover:text-[#9F0C1E]'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${
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
      </header>

      {/* Mobile-First Bottom Navigation Bar */}
      <nav
        aria-label="Điều hướng di động"
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 grid ${
          isOfficer ? 'grid-cols-4' : 'grid-cols-5'
        } gap-1 shadow-[0_-2px_10px_rgba(15,23,42,0.04)]`}
      >
        {isOfficer ? (
          <>
            <button
              type="button"
              onClick={() => navigate(`/officer/ward/${currentWard.code}`)}
              className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer ${
                path.startsWith('/officer/ward')
                  ? 'text-[#0F2942] bg-slate-100 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 mb-0.5 text-[#0F2942]" />
              <span>Bàn Điều Hành</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/officer/audit')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer ${
                path === '/officer/audit'
                  ? 'text-[#0F2942] bg-slate-100 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileCheck2 className="w-4 h-4 mb-0.5 text-[#0F2942]" />
              <span>Sơ Duyệt</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/officer/map')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer ${
                path === '/officer/map'
                  ? 'text-[#0F2942] bg-slate-100 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-4 h-4 mb-0.5 text-[#0F2942]" />
              <span>Bản Đồ</span>
            </button>

            <button
              type="button"
              onClick={() => logout()}
              className="flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold text-red-600 hover:bg-red-50 transition active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mb-0.5 text-red-600" />
              <span>Đăng Xuất</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => navigate('/citizen')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer ${
                path === '/citizen'
                  ? 'text-[#9F0C1E] bg-[#FEF2F2] font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot
                className={`w-4 h-4 mb-0.5 ${
                  path === '/citizen' ? 'text-[#B90E23]' : 'text-slate-500'
                }`}
              />
              <span>Hỏi Đáp</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/citizen/procedures')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer ${
                path === '/citizen/procedures'
                  ? 'text-[#9F0C1E] bg-[#FEF2F2] font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen
                className={`w-4 h-4 mb-0.5 ${
                  path === '/citizen/procedures' ? 'text-[#B90E23]' : 'text-slate-500'
                }`}
              />
              <span>Thủ Tục</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/citizen/form#form')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer ${
                path === '/citizen/form' && hash !== '#incident'
                  ? 'text-[#9F0C1E] bg-[#FEF2F2] font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck2
                className={`w-4 h-4 mb-0.5 ${
                  path === '/citizen/form' && hash !== '#incident'
                    ? 'text-[#B90E23]'
                    : 'text-slate-500'
                }`}
              />
              <span>Tờ Khai</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/citizen/form#incident')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer ${
                path === '/citizen/form' && hash === '#incident'
                  ? 'text-[#9F0C1E] bg-[#FEF2F2] font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 mb-0.5 ${
                  path === '/citizen/form' && hash === '#incident'
                    ? 'text-[#B90E23]'
                    : 'text-slate-500'
                }`}
              />
              <span>Sự Cố</span>
            </button>

            <button
              type="button"
              onClick={() => logout()}
              className="flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold text-slate-600 hover:text-slate-900 transition active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mb-0.5 text-slate-500" />
              <span>Đổi Vai Trò</span>
            </button>
          </>
        )}
      </nav>

      <OfficerAuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <ChangePinModal isOpen={changePinOpen} onClose={() => setChangePinOpen(false)} />
    </>
  );
};

export default Header;
