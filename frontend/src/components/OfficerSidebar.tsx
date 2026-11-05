import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWard } from '../context/WardContext';
import {
  LayoutDashboard,
  FileCheck2,
  Map,
  Repeat,
  ExternalLink,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';

interface OfficerSidebarProps {
  activeMenu?: 'audit' | 'map' | string;
}

export const OfficerSidebar: React.FC<OfficerSidebarProps> = ({ activeMenu }) => {
  const location = useLocation();
  const { currentWard } = useWard();
  const path = activeMenu ? `/officer/${activeMenu}` : location.pathname;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Drawer Trigger Floating Pill */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#00236F] text-white shadow-lg shadow-[#00236F]/30 text-xs font-bold active:scale-95 transition-all border border-[#57DFFE]/30 cursor-pointer"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>{mobileOpen ? 'Đóng Menu' : 'Menu Cán Bộ'}</span>
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-30 transition-opacity"
        />
      )}

      {/* Main Sidebar (Desktop fixed, Mobile sliding drawer) */}
      <aside
        className={`fixed left-0 top-16 bottom-0 w-64 bg-white z-40 flex flex-col justify-between py-5 shadow-xs border-r border-[#EAEDFF] transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-3">
          <div className="px-5 py-2 flex flex-col border-b border-[#EAEDFF] pb-3">
            <span className="text-[11px] uppercase tracking-wider text-[#757682] font-bold">
              Bàn Cán Bộ • {currentWard.name}
            </span>
            <span className="text-xs text-[#00236F] font-extrabold mt-0.5">Tỉnh An Giang</span>
          </div>

          <nav className="flex flex-col gap-1.5 px-3">
            <Link
              to={`/officer/ward/${currentWard.code}`}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                path.includes('/officer/ward')
                  ? 'bg-[#00236F] text-white shadow-xs'
                  : 'text-[#444651] hover:text-[#00236F] hover:bg-[#F2F3FF]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Điều Hành Xã/Phường</span>
            </Link>

            <Link
              to="/officer/audit"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                path.includes('/officer/audit')
                  ? 'bg-[#00236F] text-white shadow-xs'
                  : 'text-[#444651] hover:text-[#00236F] hover:bg-[#F2F3FF]'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Bàn Sơ Duyệt Tờ Khai</span>
            </Link>

            <Link
              to="/officer/map"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                path.includes('/officer/map')
                  ? 'bg-[#00236F] text-white shadow-xs'
                  : 'text-[#444651] hover:text-[#00236F] hover:bg-[#F2F3FF]'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>Phân Luồng Hiện Trường GIS</span>
            </Link>

            <div className="my-2 border-t border-[#EAEDFF]" />

            <Link
              to="/onboarding"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#444651] hover:text-[#00236F] hover:bg-[#F2F3FF] transition-all"
            >
              <Repeat className="w-4 h-4 text-[#00687A]" />
              <span>Đổi Xã/Phường Khác</span>
            </Link>

            <Link
              to="/citizen"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#444651] hover:text-[#00236F] hover:bg-[#F2F3FF] transition-all"
            >
              <ExternalLink className="w-4 h-4 text-[#00687A]" />
              <span>Chuyển Cổng Công Dân</span>
            </Link>
          </nav>
        </div>

        <div className="px-4 flex flex-col gap-3">
          <div className="p-3.5 rounded-2xl bg-[#F2F3FF] border border-[#DAE2FD]">
            <div className="flex items-center gap-1.5 text-[#00236F] mb-1">
              <ShieldCheck className="w-4 h-4 text-[#00687A]" />
              <span className="text-xs font-bold">Bảo Mật Cấp 3</span>
            </div>
            <p className="text-[11px] text-[#444651] leading-relaxed">
              Kho dữ liệu số hóa tuân thủ Nghị định 13/2023/NĐ-CP & Token xem tự hủy.
            </p>
          </div>
          <div className="text-[11px] text-[#757682] font-medium text-center">
            © 2026 UBND {currentWard.name} • SmartWard AI
          </div>
        </div>
      </aside>
    </>
  );
};

export default OfficerSidebar;


