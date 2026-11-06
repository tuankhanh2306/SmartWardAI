import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Landmark, Bot, ShieldCheck, FileCheck2, ArrowRight, MapPin, LogOut } from 'lucide-react';
import { useWard } from '../context/WardContext';
import { useRole } from '../context/RoleContext';
import { useAccessibility } from '../context/AccessibilityContext';
import OfficerAuthModal from './OfficerAuthModal';

export const Header: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  const { currentWard } = useWard();
  const { isOfficer, officerProfile, logoutToCitizen, authModalOpen, setAuthModalOpen } = useRole();
  const { textScale, setTextScale } = useAccessibility();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Role-Based Navigation Partitioning (Phân quyền chức năng theo đúng vai trò)
  const citizenNavLinks = [
    { to: '/citizen', label: 'Cổng Công Dân (Hỏi Đáp AI)', icon: Bot },
    { to: '/citizen/form', label: 'Tiền Kiểm Định Tờ Khai', icon: FileCheck2 },
  ];

  const officerNavLinks = [
    { to: `/officer/ward/${currentWard.code}`, label: 'Bàn Điều Hành Xã (Dashboard Tập Trung)', icon: ShieldCheck },
  ];

  const activeNavLinks = isOfficer ? officerNavLinks : citizenNavLinks;

  const mobileNavLinks = [
    { to: '/onboarding', label: 'Đổi Xã/Phường', icon: MapPin },
    ...activeNavLinks,
  ];

  const isOnboarding = path === '/onboarding';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF8FF]/90 backdrop-blur-xl border-b border-[#EAEDFF] transition-all duration-300">
      <div className="h-16 w-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Brand Identity & Commune Context Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <Link
            to={isOfficer ? `/officer/ward/${currentWard.code}` : '/citizen'}
            className="flex items-center gap-2.5 sm:gap-3 shrink-0 group active:scale-[0.98] transition-transform duration-200"
          >
            <div className="p-1 rounded-xl bg-gradient-to-tr from-[#00236F]/10 to-[#57DFFE]/20 border border-[#DAE2FD]/60 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-[#00236F] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-300">
                <Landmark className="w-5 h-5 text-[#ACEDFF]" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-bold text-xs sm:text-sm md:text-base text-[#00236F] tracking-tight leading-none flex items-center gap-1.5">
                UBND {currentWard.name.toUpperCase()}
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#DCE1FF] text-[#00164E]">
                  AN GIANG
                </span>
                {isOfficer ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-[#00236F] text-[#57DFFE] border border-[#57DFFE]/30">
                    Cán Bộ
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-[#EBFDF3] text-[#166534] border border-[#86EFAC]">
                    Công Dân
                  </span>
                )}
              </span>
              <span className="text-[11px] text-[#444651] leading-tight mt-1 font-medium hidden sm:inline">
                Một Cửa Số • {currentWard.area}
              </span>
            </div>
          </Link>

          {/* Quick Ward Switcher Pill */}
          <Link
            to="/onboarding"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition active:scale-95 shrink-0 ${
              isOnboarding
                ? 'bg-[#00236F] text-white border-[#00236F] shadow-xs'
                : 'bg-[#F2F3FF] hover:bg-[#EAEDFF] border-[#DAE2FD] text-[#00236F]'
            }`}
            title="Bấm để đổi sang Xã/Phường khác tại An Giang"
          >
            <MapPin className={`w-3.5 h-3.5 ${isOnboarding ? 'text-[#57DFFE]' : 'text-[#00687A]'}`} />
            <span>Đổi Xã/Phường</span>
          </Link>
        </div>

        {/* Global Navigation Pill (Desktop) with Smooth Indicator */}
        <nav className="hidden lg:flex items-center gap-1 p-1 bg-[#F2F3FF] rounded-2xl border border-[#EAEDFF] shadow-inner shrink-0">
          {activeNavLinks.map((item) => {
            const Icon = item.icon;
            const isActive = path === item.to || (item.to !== '/citizen' && path.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] whitespace-nowrap ${
                  isActive
                    ? 'bg-[#00236F] text-white shadow-md shadow-[#00236F]/20'
                    : 'text-[#444651] hover:text-[#00236F] hover:bg-[#EAEDFF]/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#57DFFE]' : 'text-[#757682]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Role-Based Action: Switcher between Citizen & Officer & Accessibility */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Universal Accessibility Font Scale for all ages (Người già, thanh niên) */}
          <button
            type="button"
            onClick={() => {
              if (textScale === 'normal') setTextScale('large');
              else if (textScale === 'large') setTextScale('huge');
              else setTextScale('normal');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition active:scale-95 cursor-pointer ${
              textScale !== 'normal'
                ? 'bg-[#00236F] text-white border-[#00236F] shadow-xs'
                : 'bg-white hover:bg-[#EAEDFF] text-[#00236F] border-[#DAE2FD]'
            }`}
            title="Nhấn để đổi cỡ chữ to rõ: Chuẩn -> Chữ lớn -> Rất lớn (Dễ đọc cho người cao tuổi)"
          >
            <span className="font-serif font-black tracking-tight text-xs sm:text-sm">
              A{textScale === 'large' ? '+' : textScale === 'huge' ? '++' : ''}
            </span>
            <span className="hidden sm:inline text-[11px] font-semibold">
              {textScale === 'normal' ? 'Cỡ chữ' : textScale === 'large' ? 'Chữ to' : 'Chữ rất to'}
            </span>
          </button>

          {isOfficer ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[#DAE2FD]">
              <div className="hidden md:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#00236F] text-[#57DFFE] flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-[#ACEDFF]/60">
                  {officerProfile.avatarText}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-[#131B2E] leading-none">{officerProfile.name}</span>
                  <span className="text-[10px] text-[#00687A] font-medium leading-tight mt-0.5">
                    {officerProfile.badgeId} • Cán Bộ
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={logoutToCitizen}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F2F3FF] hover:bg-[#EAEDFF] text-[#444651] hover:text-[#00236F] text-xs font-bold border border-[#DAE2FD] transition active:scale-95 cursor-pointer"
                title="Đăng xuất khỏi bàn cán bộ, quay lại Cổng Công Dân"
              >
                <LogOut className="w-3.5 h-3.5 text-[#00687A]" />
                <span className="hidden xl:inline">Về Cổng Dân</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-[#DAE2FD]">
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00236F] hover:bg-[#1E3A8A] text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                title="Bấm để đăng nhập bằng Thẻ công chức Một Cửa"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#57DFFE]" />
                <span>Bàn Cán Bộ</span>
              </button>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-[#F2F3FF] border border-[#EAEDFF] text-[#00236F] active:scale-90 transition-transform"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#EAEDFF] bg-white/95 backdrop-blur-xl px-4 py-3 shadow-xl flex flex-col gap-1.5 animate-fadeIn">
          <div className="p-2 mb-1 rounded-xl bg-[#F8FAFC] border border-[#EAEDFF] flex items-center justify-between">
            <span className="text-xs text-[#757682]">Vai trò hiện tại:</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOfficer ? 'bg-[#00236F] text-[#57DFFE]' : 'bg-[#EBFDF3] text-[#166534]'}`}>
              {isOfficer ? '🛡️ Cán Bộ Xã' : '👤 Công Dân'}
            </span>
          </div>

          {mobileNavLinks.map((item) => {
            const Icon = item.icon;
            const isActive = path === item.to || (item.to !== '/citizen' && path.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#00236F] text-white shadow-sm'
                    : 'text-[#131B2E] hover:bg-[#F2F3FF]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#57DFFE]' : 'text-[#00687A]'}`} />
                  <span>{item.label}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
            );
          })}

          <div className="pt-2 border-t border-[#EAEDFF]">
            {isOfficer ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logoutToCitizen();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#FEF2F2] text-[#DC2626] font-bold text-xs flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Rời Bàn Cán Bộ (Về Cổng Dân)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAuthModalOpen(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#00236F] text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-[#57DFFE]" />
                <span>Đăng Nhập Bàn Cán Bộ Xã</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Officer Authentication Modal */}
      <OfficerAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </header>
  );
};

export default Header;

