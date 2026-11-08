import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Landmark, Bot, ShieldCheck, FileCheck2, MapPin, LogOut, AlertTriangle } from 'lucide-react';
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
    { to: '/citizen', label: 'Hỏi Đáp Thủ Tục', icon: Bot },
    { to: '/citizen/form', label: 'Kiểm Tra Tờ Khai & Báo Sự Cố', icon: FileCheck2 },
  ];

  const officerNavLinks = [
    { to: `/officer/ward/${currentWard.code}`, label: 'Bàn Điều Hành Xã', icon: ShieldCheck },
  ];

  const activeNavLinks = isOfficer ? officerNavLinks : citizenNavLinks;
  const isOnboarding = path === '/onboarding';

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="h-14 sm:h-16 w-full max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-3">
          {/* Brand Identity & Ward Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              to={isOfficer ? `/officer/ward/${currentWard.code}` : '/citizen'}
              className="flex items-center gap-2.5 min-w-0 group active:scale-[0.98] transition-transform"
            >
              <div className="w-9 h-9 rounded-xl bg-[#0F2942] flex items-center justify-center text-white shrink-0 shadow-xs">
                <Landmark className="w-4 h-4 text-teal-300" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm md:text-base text-slate-900 tracking-tight truncate">
                    UBND {currentWard.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      isOfficer
                        ? 'bg-[#0F2942] text-teal-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {isOfficer ? 'Cán Bộ' : 'Công Dân'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 leading-tight truncate hidden sm:inline">
                  Một Cửa Số • Tỉnh An Giang
                </span>
              </div>
            </Link>

            <Link
              to="/onboarding"
              className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition active:scale-95 shrink-0 ${
                isOnboarding
                  ? 'bg-[#0F2942] text-white border-[#0F2942]'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title="Đổi Xã/Phường khác tại An Giang"
            >
              <MapPin className="w-3.5 h-3.5 text-teal-700" />
              <span>Đổi Xã</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            {activeNavLinks.map((item) => {
              const Icon = item.icon;
              const isActive = path === item.to || (item.to !== '/citizen' && path.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all active:scale-[0.98] whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0F2942] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-300' : 'text-slate-500'}`} />
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
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition active:scale-95 cursor-pointer ${
                textScale !== 'normal'
                  ? 'bg-[#0F2942] text-white border-[#0F2942]'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title="Đổi cỡ chữ (Chuẩn / To / Rất to)"
            >
              <span className="font-bold">
                A{textScale === 'large' ? '+' : textScale === 'huge' ? '++' : ''}
              </span>
              <span className="hidden md:inline text-[11px]">
                {textScale === 'normal' ? 'Cỡ chữ' : textScale === 'large' ? 'Chữ to' : 'Rất to'}
              </span>
            </button>

            {isOfficer ? (
              <div className="flex items-center gap-2 pl-1.5 border-l border-slate-200">
                <div className="hidden md:flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0F2942] text-teal-200 flex items-center justify-center font-bold text-xs">
                    {officerProfile.avatarText}
                  </div>
                  <span className="text-xs font-semibold text-slate-800">{officerProfile.name}</span>
                </div>

                <button
                  type="button"
                  onClick={logoutToCitizen}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition active:scale-95 cursor-pointer"
                  title="Về Cổng Công Dân"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-600" />
                  <span>Về Cổng Dân</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F2942] hover:bg-[#1E3A5F] text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
                <span>Bàn Cán Bộ</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile-First Bottom Navigation Bar (1-Thumb Operation on Phones/Tablets) */}
      <nav
        aria-label="Điều hướng di động"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 grid grid-cols-4 gap-1 shadow-[0_-2px_10px_rgba(15,23,42,0.04)]"
      >
        <button
          type="button"
          onClick={() => navigate('/citizen')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold transition active:scale-95 cursor-pointer ${
            path === '/citizen'
              ? 'text-[#0F2942] bg-slate-100 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Bot className={`w-4 h-4 mb-0.5 ${path === '/citizen' ? 'text-[#0F2942]' : 'text-slate-400'}`} />
          <span>Hỏi Đáp</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/citizen/form')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold transition active:scale-95 cursor-pointer ${
            path === '/citizen/form' && hash !== '#incident'
              ? 'text-[#0F2942] bg-slate-100 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileCheck2
            className={`w-4 h-4 mb-0.5 ${
              path === '/citizen/form' && hash !== '#incident' ? 'text-[#0F2942]' : 'text-slate-400'
            }`}
          />
          <span>Tờ Khai</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/citizen/form#incident')}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold transition active:scale-95 cursor-pointer ${
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
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold transition active:scale-95 cursor-pointer ${
            isOnboarding || path.startsWith('/officer')
              ? 'text-[#0F2942] bg-slate-100 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <MapPin
            className={`w-4 h-4 mb-0.5 ${
              isOnboarding || path.startsWith('/officer') ? 'text-teal-700' : 'text-slate-400'
            }`}
          />
          <span>{isOfficer ? 'Bàn Cán Bộ' : 'Đổi Xã'}</span>
        </button>
      </nav>

      <OfficerAuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

export default Header;
