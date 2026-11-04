import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWard } from '../context/WardContext';
import { type WardItem } from '../data/anGiangWards';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Search,
  Building2,
  Phone,
  Clock,
  ArrowRight,
  ChevronRight,
  LayoutDashboard
} from 'lucide-react';

export const WardOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { currentWard, setWard, searchWards, isOfficeOpen } = useWard();

  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'Phường' | 'Xã' | 'Đặc khu'>('ALL');
  const [selected, setSelected] = useState<WardItem>(currentWard);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const filteredWards = searchWards(keyword, filterType);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([selected.lat, selected.lon], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Create custom pulsing civic pin icon
      const civicIcon = L.divIcon({
        className: 'custom-civic-marker',
        html: `
          <div class="relative flex items-center justify-center w-10 h-10 -ml-2 -mt-4">
            <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-[#00236F] opacity-40"></span>
            <div class="relative w-8 h-8 rounded-xl bg-[#00236F] border-2 border-white shadow-lg flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#57DFFE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 20h20"></path><path d="m3 7 9-4 9 4"></path><path d="M6 10v10"></path><path d="M10 10v10"></path><path d="M14 10v10"></path><path d="M18 10v10"></path>
              </svg>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([selected.lat, selected.lon], { icon: civicIcon })
        .addTo(map)
        .bindPopup(
          `<div class="p-2 text-xs font-sans">
            <b class="text-[#00236F] text-sm block mb-1">UBND ${selected.name}</b>
            <p class="text-[#444651] mb-1">${selected.officeAddress}</p>
            <span class="text-[11px] font-bold text-[#00687A]">📞 Hotline: ${selected.phoneNumber}</span>
          </div>`
        );

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      // Smooth camera flight to selected ward
      const map = mapInstanceRef.current;
      map.flyTo([selected.lat, selected.lon], 15, {
        duration: 1.2,
        easeLinearity: 0.25,
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([selected.lat, selected.lon]);
        markerRef.current.setPopupContent(
          `<div class="p-2 text-xs font-sans">
            <b class="text-[#00236F] text-sm block mb-1">UBND ${selected.name}</b>
            <p class="text-[#444651] mb-1">${selected.officeAddress}</p>
            <span class="text-[11px] font-bold text-[#00687A]">📞 Hotline: ${selected.phoneNumber}</span>
          </div>`
        );
      }
    }
  }, [selected]);

  const handleConfirm = () => {
    setWard(selected);
    navigate('/citizen');
  };

  const handleOpenDashboard = () => {
    setWard(selected);
    navigate(`/officer/ward/${selected.code}`);
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-64px)] bg-[#FAF8FF]">
      {/* Top Banner Header */}
      <section className="relative w-full bg-gradient-to-b from-[#EAEDFF]/80 via-[#F2F3FF]/50 to-transparent px-4 md:px-8 py-8 border-b border-[#EAEDFF] overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#DAE2FD] shadow-xs mb-3">
              <span className="w-2 h-2 rounded-full bg-[#00687A] animate-pulse" />
              <span className="text-xs font-bold text-[#00236F] uppercase tracking-wider">
                Tỉnh An Giang • Cổng Quản Trị Trực Tiếp Cấp Xã / Phường
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#00236F] tracking-tight">
              Định Vị Địa Bàn Thường Trú & Điểm Tiếp Dân Một Cửa
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[#444651] max-w-2xl leading-relaxed">
              Hệ thống 96 đơn vị hành chính trực thuộc Tỉnh An Giang (14 Phường • 79 Xã • 3 Đặc khu) phẳng hóa hoàn toàn, kết nối hạ tầng số cùng Viettel An Giang. Toàn bộ thủ tục hành chính, trợ lý AI tư vấn và phản ánh thực địa liên kết trực tiếp với UBND địa phương tương ứng.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleConfirm}
              className="px-5 py-2.5 bg-[#00236F] text-white rounded-xl text-xs font-bold shadow-md shadow-[#00236F]/20 hover:bg-[#1E3A8A] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Vào Cổng Dịch Vụ</span>
              <ArrowRight className="w-4 h-4 text-[#57DFFE]" />
            </button>
          </div>
        </div>
      </section>

      {/* Main Split Grid Viewport */}
      <div className="max-w-7xl w-full mx-auto px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* LEFT COLUMN: Search & Communes List (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-3xl border border-[#EAEDFF] shadow-xs p-5 gap-4 max-h-[720px]">
          {/* Search Input Bar */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#757682] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Gõ tên xã, phường, đặc khu (VD: Phú Quốc, Long Xuyên, Ba Chúc, An Phú...)"
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-[#F2F3FF]/70 border border-[#DAE2FD] focus:outline-hidden focus:border-[#00236F] focus:bg-white text-[#131B2E] transition-all"
            />
          </div>

          {/* Filter Type Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {(['ALL', 'Phường', 'Xã', 'Đặc khu'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
                  filterType === type
                    ? 'bg-[#00236F] text-white shadow-xs'
                    : 'bg-[#F2F3FF] text-[#444651] hover:bg-[#EAEDFF]'
                }`}
              >
                {type === 'ALL' ? `Tất Cả (${filteredWards.length})` : type}
              </button>
            ))}
          </div>

          {/* Communes List (Scrollable) */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredWards.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#757682]">
                Không tìm thấy xã/phường phù hợp với từ khóa "{keyword}".
              </div>
            ) : (
              filteredWards.map((ward) => {
                const isSelected = selected.code === ward.code;
                return (
                  <div
                    key={ward.code}
                    onClick={() => setSelected(ward)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#00236F]/5 border-[#00236F] shadow-xs'
                        : 'bg-white border-[#EAEDFF] hover:border-[#DAE2FD] hover:bg-[#F2F3FF]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#00236F] text-[#57DFFE]' : 'bg-[#F2F3FF] text-[#00687A]'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-[#131B2E] tracking-tight">
                          {ward.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#757682]">
                          <span>{ward.area}</span>
                          <span>•</span>
                          <span className="font-medium text-[#00687A]">{ward.type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-[#EBFDF3] text-[#166534]">
                        {ward.solvedRate}%
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isSelected ? 'text-[#00236F] translate-x-0.5' : 'text-[#DAE2FD]'
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: GPS Leaflet Map & Ward Info Panel (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Leaflet GPS Map Viewport */}
          <div className="w-full h-80 rounded-3xl border border-[#EAEDFF] overflow-hidden shadow-xs relative bg-[#E5E7EB]">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Floating Top Badge on Map */}
            <div className="absolute top-3 left-3 z-[1000] px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#DAE2FD] shadow-md flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span className="font-bold text-[#00236F]">UBND {selected.name}</span>
              <span className="text-[#757682]">({selected.lat.toFixed(4)}, {selected.lon.toFixed(4)})</span>
            </div>
          </div>

          {/* Selected Ward Administrative Info Card */}
          <div className="p-6 bg-white rounded-3xl border border-[#EAEDFF] shadow-xs flex flex-col gap-5">
            {/* Office Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-[#00687A] uppercase tracking-wider">
                  Trụ sở Tiếp Nhận & Trả Kết Quả Một Cửa
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[#00236F] tracking-tight mt-0.5">
                  UBND {selected.name} • {selected.province}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                    isOfficeOpen
                      ? 'bg-[#EBFDF3] border-[#86EFAC] text-[#166534]'
                      : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {isOfficeOpen ? 'Đang mở cửa tiếp dân' : 'Ngoài giờ làm việc'}
                </span>
              </div>
            </div>

            {/* Address & Hotline Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#F2F3FF]/60 border border-[#EAEDFF]">
              <div className="flex items-start gap-2.5 text-xs text-[#131B2E]">
                <MapPin className="w-4 h-4 text-[#00236F] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[#757682] text-[11px]">Địa chỉ trụ sở:</span>
                  <span>{selected.officeAddress}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-[#131B2E]">
                <Phone className="w-4 h-4 text-[#00687A] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[#757682] text-[11px]">Đường dây nóng Một Cửa:</span>
                  <span className="font-bold text-[#00687A]">{selected.phoneNumber}</span>
                </div>
              </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF]">
                <span className="text-[11px] text-[#757682] block">Giải quyết đúng hạn</span>
                <span className="text-base font-extrabold text-[#16A34A]">{selected.solvedRate}%</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF]">
                <span className="text-[11px] text-[#757682] block">Sự cố đang mở</span>
                <span className="text-base font-extrabold text-[#00236F]">{selected.totalOpenIncidents} ca</span>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF]">
                <span className="text-[11px] text-[#757682] block">Giờ hành chính</span>
                <span className="text-xs font-bold text-[#131B2E] mt-1 block">07:00 – 17:00</span>
              </div>
            </div>

            {/* Online Services Available */}
            <div>
              <span className="text-xs font-bold text-[#131B2E] block mb-2">
                Dịch vụ công trực tuyến tiếp nhận tại địa bàn:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selected.onlineServices.map((srv) => (
                  <span
                    key={srv}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#EAEDFF]/70 text-[#00236F] border border-[#DAE2FD]"
                  >
                    ✓ {srv}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-[#EAEDFF] flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={handleOpenDashboard}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#DAE2FD] text-[#00236F] text-xs font-bold hover:bg-[#F2F3FF] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-[#00687A]" />
                <span>Xem Bàn Cán Bộ Địa Bàn Này</span>
              </button>

              <button
                onClick={handleConfirm}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#00236F] text-white text-xs font-bold shadow-md shadow-[#00236F]/20 hover:bg-[#1E3A8A] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Xác Nhận & Làm Việc Tại {selected.name}</span>
                <ArrowRight className="w-4 h-4 text-[#57DFFE]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WardOnboarding;
