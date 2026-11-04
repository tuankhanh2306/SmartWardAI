import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Landmark, Bot, ShieldCheck, Map, FileCheck2, ArrowRight } from 'lucide-react';

export const Header: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/citizen', label: 'Cổng Công Dân', icon: Bot },
    { to: '/citizen/form', label: 'Tiền Kiểm Định & Báo Sự Cố', icon: FileCheck2 },
    { to: '/officer/audit', label: 'Bàn Sơ Duyệt Cán Bộ', icon: ShieldCheck },
    { to: '/officer/map', label: 'Trung Tâm Chỉ Huy GIS', icon: Map },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF8FF]/90 backdrop-blur-xl border-b border-[#EAEDFF] transition-all duration-300">
      <div className="h-16 w-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Brand Identity with double-bezel icon */}
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
            <span className="font-sans font-bold text-sm md:text-base text-[#00236F] tracking-tight leading-none flex items-center gap-1.5">
              UBND PHƯỜNG 25
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#DCE1FF] text-[#00164E]">
                AI 2.0
              </span>
            </span>
            <span className="text-[11px] text-[#444651] leading-tight mt-1 font-medium hidden sm:inline">
              Bộ phận Một Cửa Số & Điều Hành Hiện Trường
            </span>
          </div>
        </Link>

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
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/80 rounded-full border border-[#DAE2FD] shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00687A] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00687A]" />
            </span>
            <span className="text-xs text-[#00687A] font-bold tracking-tight">AI Trực Tuyến</span>
          </div>

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
    </header>
  );
};

export default Header;
