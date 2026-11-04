import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Landmark, Bot, ShieldCheck, Map, FileCheck2, ArrowRight, Sparkles, MapPin } from 'lucide-react';
import { isGeminiConfigured } from '../services/geminiClient';
import { AiSettingsModal } from './AiSettingsModal';
import { useWard } from '../context/WardContext';

export const Header: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  const { currentWard } = useWard();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [geminiActive, setGeminiActive] = useState(isGeminiConfigured());

  const navLinks = [
    { to: '/onboarding', label: 'Chọn Xã/Phường', icon: MapPin },
    { to: '/citizen', label: 'Cổng Công Dân', icon: Bot },
    { to: '/citizen/form', label: 'Tiền Kiểm Định', icon: FileCheck2 },
    { to: `/officer/ward/${currentWard.code}`, label: 'Bàn Cán Bộ Xã', icon: ShieldCheck },
    { to: '/officer/map', label: 'Bản Đồ GIS', icon: Map },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF8FF]/90 backdrop-blur-xl border-b border-[#EAEDFF] transition-all duration-300">
      <div className="h-16 w-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Brand Identity with double-bezel icon */}
        <div className="flex items-center gap-3">
          <Link
            to="/citizen"
            className="flex items-center gap-3 shrink-0 group active:scale-[0.98] transition-transform duration-200"
          >
            <div className="p-1 rounded-xl bg-gradient-to-tr from-[#00236F]/10 to-[#57DFFE]/20 border border-[#DAE2FD]/60 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-[#00236F] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-300">
                <Landmark className="w-5 h-5 text-[#ACEDFF]" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-bold text-xs sm:text-sm md:text-base text-[#00236F] tracking-tight leading-none flex items-center gap-1.5">
                UBND {currentWard.name.toUpperCase()}
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#DCE1FF] text-[#00164E]">
                  AN GIANG
                </span>
              </span>
              <span className="text-[11px] text-[#444651] leading-tight mt-1 font-medium hidden sm:inline">
                Một Cửa Số • {currentWard.area}
              </span>
            </div>
          </Link>

          {/* Quick Ward Switcher Pill */}
          <Link
            to="/onboarding"
            className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#F2F3FF] hover:bg-[#EAEDFF] border border-[#DAE2FD] text-[11px] font-bold text-[#00236F] transition active:scale-95 ml-1 shrink-0"
            title="Bấm để đổi sang Xã/Phường khác tại An Giang"
          >
            <MapPin className="w-3.5 h-3.5 text-[#00687A]" />
            <span>Đổi Xã/Phường</span>
          </Link>
        </div>

        {/* Global Navigation Pill (Desktop) with Smooth Indicator */}
        <nav className="hidden lg:flex items-center gap-1 p-1 bg-[#F2F3FF] rounded-2xl border border-[#EAEDFF] shadow-inner">
          {navLinks.map((item) => {
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

        {/* Live System Status & Officer Profile */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setAiModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-xs transition-all active:scale-95 cursor-pointer ${
              geminiActive
                ? 'bg-[#EBFDF3] border-[#86EFAC] text-[#166534] hover:bg-[#DCFCE7]'
                : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E] hover:bg-[#FEF3C7]'
            }`}
            title="Nhấn để cấu hình Trí tuệ nhân tạo Gemini Mini"
          >
            {geminiActive ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]" />
                </span>
                <span className="text-xs font-bold tracking-tight flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
                  Gemini Flash (Có tư duy)
                </span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-[#D97706]" />
                <span className="text-xs font-bold tracking-tight flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                  Bật Gemini Flash
                </span>
              </>
            )}
          </button>

          <div className="hidden md:flex items-center gap-2.5 pl-2 border-l border-[#DAE2FD]">
            <div className="w-8 h-8 rounded-full bg-[#00687A] text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-[#ACEDFF]/60">
              TH
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-[#131B2E] leading-none">Trần Thị Hương</span>
              <span className="text-[10px] text-[#444651] leading-tight mt-0.5">Cán bộ P.25</span>
            </div>
          </div>

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

      {/* Mobile Drawer Navigation with Slide-Down Animation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#EAEDFF] bg-white/95 backdrop-blur-xl px-4 py-3 shadow-xl flex flex-col gap-1.5 animate-fadeIn">
          {navLinks.map((item) => {
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
        </div>
      )}

      {/* Gemini AI Engine Configuration Modal */}
      <AiSettingsModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onSaved={() => setGeminiActive(isGeminiConfigured())}
      />
    </header>
  );
};

export default Header;
