import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/20">
      <div className="h-16 w-full px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <Link to="/citizen" className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-bold shadow-xs">
            <span className="material-symbols-outlined text-[24px]">account_balance</span>
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-bold text-sm md:text-base text-primary uppercase tracking-tight leading-none">
              UBND PHƯỜNG 25 - SMARTWARD AI
            </span>
            <span className="text-xs text-on-surface-variant leading-tight mt-0.5 font-medium">
              Bộ phận Một Cửa Số & Điều Hành Hiện Trường
            </span>
          </div>
        </Link>

        {/* Global Navigation Pill */}
        <nav className="hidden lg:flex items-center gap-1 p-1 bg-surface-container-low rounded-xl">
          <Link
            to="/citizen"
            className={`text-xs md:text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              path === '/citizen'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            Cổng Công Dân
          </Link>
          <Link
            to="/citizen/form"
            className={`text-xs md:text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              path === '/citizen/form'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            Tiền Kiểm Định Tờ Khai & Sự Cố
          </Link>
          <Link
            to="/officer/audit"
            className={`text-xs md:text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              path === '/officer/audit'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            Bàn Sơ Duyệt Cán Bộ
          </Link>
          <Link
            to="/officer/map"
            className={`text-xs md:text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              path === '/officer/map'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            Trung Tâm Chỉ Huy GIS
          </Link>
        </nav>

        {/* Live System Status & Officer Profile */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-surface-container rounded-full border border-outline-variant/30">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span className="text-xs text-secondary font-semibold">AI Trực Tuyến</span>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-outline-variant/30">
            <div className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold text-xs shadow-xs">
              TH
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-bold text-on-surface leading-none">Trần Thị Hương (P.25)</span>
              <span className="text-[11px] text-on-surface-variant leading-tight mt-0.5">Cán bộ Một cửa</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

