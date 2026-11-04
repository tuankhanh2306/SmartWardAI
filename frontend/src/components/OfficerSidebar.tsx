import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface OfficerSidebarProps {
  activeMenu?: 'audit' | 'map' | string;
}

export const OfficerSidebar: React.FC<OfficerSidebarProps> = ({ activeMenu }) => {
  const location = useLocation();
  const path = activeMenu ? `/officer/${activeMenu}` : location.pathname;

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-surface-container-lowest z-40 flex flex-col justify-between py-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-outline-variant/20">
      <div className="flex flex-col gap-2">
        <div className="px-4 py-2">
          <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
            Nghiệp Vụ Cán Bộ Phường 25
          </span>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          <Link
            to="/officer/audit"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              path.includes('/officer/audit')
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">fact_check</span>
            Bàn Sơ Duyệt Tờ Khai
          </Link>

          <Link
            to="/officer/map"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              path.includes('/officer/map')
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">map</span>
            Phân Luồng Hiện Trường GIS
          </Link>

          <Link
            to="/citizen"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">public</span>
            Chuyển Cổng Công Dân
          </Link>
        </nav>
      </div>

      <div className="px-4 flex flex-col gap-3">
        <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
          <div className="flex items-center gap-1.5 text-primary mb-1">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span className="text-xs font-bold">Bảo Mật Cấp 3</span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-tight">
            Kho dữ liệu số hóa tuân thủ Nghị định 13/2023/NĐ-CP & Token xem tự hủy.
          </p>
        </div>
        <div className="text-[11px] text-on-surface-variant font-medium text-center">
          © 2026 UBND Phường 25 • SmartWard AI
        </div>
      </div>
    </aside>
  );
};

export default OfficerSidebar;

