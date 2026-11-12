import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Landmark, Bot, ShieldCheck, FileCheck2, MapPin, LogOut, AlertTriangle, BookOpen } from 'lucide-react';
import { useWard } from '../context/WardContext';
import { useRole } from '../context/RoleContext';
import { useAccessibility } from '../context/AccessibilityContext';
import OfficerAuthModal from './OfficerAuthModal';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const hash = location.hash;
  const { currentWard } = useWard();
  const { isOfficer, officerProfile, logoutToCitizen, authModalOpen, setAuthModalOpen } = useRole();
  const { textScale, setTextScale } = useAccessibility();

  const citizenNavLinks = [
    { to: '/citizen', label: 'Hỏi Đáp AI', icon: Bot, match: () => path === '/citizen' },
    {
      to: '/citizen/procedures',
      label: 'Danh Mục 40 TTHC',
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
      label: 'Báo Sự Cố (GPS)',
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
      to: '/citizen',
      label: 'Hỏi Đáp Dân',
      icon: Bot,
      match: () => path === '/citizen',
    },
    {
      to: '/citizen/procedures',
      label: 'Danh Mục 40 TTHC',
      icon: BookOpen,
      match: () => path === '/citizen/procedures',
    },
    {
      to: '/citizen/form#form',
      label: 'Tờ Khai & Sự Cố',
      icon: FileCheck2,
      match: () => path === '/citizen/form',
    },
  ];

  const activeNavLinks = isOfficer ? officerNavLinks : citizenNavLinks;
  const isOnboarding = path === '/onboarding';

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="h-14 sm:h-16 w-full max-w-[1536px] mx-auto px-3 sm:px-6 flex items-center justify-between gap-2 xl:gap-4">
          {/* Brand Identity & Ward Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to={isOfficer ? `/officer/ward/${currentWard.code}` : '/citizen'}
              className="flex items-center gap-2 sm:gap-2.5 shrink-0 group active:scale-[0.98] transition-transform"
            >
              <div className="w-9 h-9 rounded-xl bg-[#00796B] flex items-center justify-center text-white shrink-0 shadow-xs">
                <Landmark className="w-4 h-4 text-teal-200" />
              </div>
              <div className="flex flex-col shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm md:text-base text-slate-900 tracking-tight whitespace-nowrap">
                    UBND {currentWard.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      isOfficer
                        ? 'bg-[#00796B] text-white shadow-2xs'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {isOfficer ? 'Cán Bộ' : 'Công Dân'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 leading-tight whitespace-nowrap hidden md:inline">
                  Một Cửa Số • Tỉnh An Giang
                </span>
              </div>
            </Link>

            <Link
              to="/onboarding"
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition active:scale-95 shrink-0 shadow-2xs ${
                isOnboarding
                  ? 'bg-[#00796B] text-white border-[#00695C]'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title="Đổi Xã/Phường khác tại An Giang"
            >
              <MapPin className="w-3.5 h-3.5 text-[#00796B]" />
              <span className="whitespace-nowrap">Đổi Xã</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            {activeNavLinks.map((item) => {
              const Icon = item.icon;
              const isActive = item.match();
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 xl:gap-2 text-xs font-semibold px-2.5 xl:px-3.5 py-1.5 rounded-lg transition-all active:scale-[0.98] whitespace-nowrap ${
                    isActive
                      ? 'bg-[#00796B] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 xl:w-4 xl:h-4 ${isActive ? 'text-teal-200' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Font Scale & Role Switch */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (textScale === 'normal') setTextScale('large');
                else if (textScale === 'large') setTextScale('huge');
                else setTextScale('normal');
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition active:scale-95 cursor-pointer shadow-2xs ${
                textScale !== 'normal'
                  ? 'bg-[#00796B] text-white border-[#00695C]'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title="Đổi cỡ chữ (Chuẩn / To / Rất to)"
            >
              <span className="font-bold">
                A{textScale === 'large' ? '+' : textScale === 'huge' ? '++' : ''}
              </span>
              <span className="hidden xl:inline text-[11px]">
                {textScale === 'normal' ? 'Cỡ chữ' : textScale === 'large' ? 'Chữ to' : 'Rất to'}
              </span>
            </button>

            {isOfficer ? (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 border-l border-slate-200">
                <div
                  className="flex items-center gap-1.5 sm:gap-2"
                  title={`Cán bộ: ${officerProfile.name}`}
                >
                  <div className="w-7 h-7 rounded-lg bg-[#00796B] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {officerProfile.avatarText}
                  </div>
                  <span className="hidden xl:inline text-xs font-semibold text-slate-800 whitespace-nowrap">
                    {officerProfile.name}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={logoutToCitizen}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition active:scale-95 cursor-pointer shadow-2xs"
                  title="Về Cổng Công Dân"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-600" />
                  <span className="whitespace-nowrap">Về Cổng Dân</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-semibold transition active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-200" />
                <span>Bàn Cán Bộ</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile-First Bottom Navigation Bar (1-Thumb Operation on Phones/Tablets) */}
      <nav
        aria-label="Điều hướng di động"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 grid grid-cols-5 gap-1 shadow-[0_-2px_10px_rgba(15,23,42,0.04)]"
      >
        <button
          type="button"
          onClick={() => navigate('/citizen')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer ${
            path === '/citizen'
              ? 'text-[#00796B] bg-teal-50 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Bot className={`w-4 h-4 mb-0.5 ${path === '/citizen' ? 'text-[#00796B]' : 'text-slate-400'}`} />
          <span>Hỏi Đáp</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/citizen/procedures')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer ${
            path === '/citizen/procedures'
              ? 'text-[#00796B] bg-teal-50 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <BookOpen className={`w-4 h-4 mb-0.5 ${path === '/citizen/procedures' ? 'text-[#00796B]' : 'text-slate-400'}`} />
          <span>Thủ Tục</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/citizen/form#form')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer ${
            path === '/citizen/form' && hash !== '#incident'
              ? 'text-[#00796B] bg-teal-50 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileCheck2
            className={`w-4 h-4 mb-0.5 ${
              path === '/citizen/form' && hash !== '#incident' ? 'text-[#00796B]' : 'text-slate-400'
            }`}
          />
          <span>Tờ Khai</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/citizen/form#incident')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer ${
            path === '/citizen/form' && hash === '#incident'
              ? 'text-red-700 bg-red-50 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <AlertTriangle
            className={`w-4 h-4 mb-0.5 ${
              path === '/citizen/form' && hash === '#incident' ? 'text-red-600' : 'text-slate-400'
            }`}
          />
          <span>Báo Sự Cố</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (isOfficer) {
              navigate(`/officer/ward/${currentWard.code}`);
            } else {
              navigate('/onboarding');
            }
          }}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer ${
            isOnboarding || path.startsWith('/officer')
              ? 'text-[#00796B] bg-teal-50 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <MapPin
            className={`w-4 h-4 mb-0.5 ${
              isOnboarding || path.startsWith('/officer') ? 'text-teal-700' : 'text-slate-400'
            }`}
          />
          <span>{isOfficer ? 'Cán Bộ' : 'Đổi Xã'}</span>
        </button>
      </nav>

      <OfficerAuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

export default Header;
