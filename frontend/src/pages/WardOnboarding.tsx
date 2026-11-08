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
      const container = mapContainerRef.current;
      const map = L.map(container, {
        zoomControl: false,
        preferCanvas: true,
      }).setView([selected.lat, selected.lon], 14);

      const tileLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi', {
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Google Maps &bull; GIS Hành chính An Giang',
        maxZoom: 20,
        keepBuffer: 4,
      });

      tileLayer.on('tileerror', (err: any) => {
        const tile = err?.tile as HTMLImageElement | undefined;
        const coords = err?.coords;
        if (tile && coords && !tile.dataset.fallback) {
          tile.dataset.fallback = '1';
          tile.src = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${coords.z}/${coords.x}/${coords.y}.png`;
        }
      });

      tileLayer.addTo(map);

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

      const rafId = requestAnimationFrame(() => map.invalidateSize({ animate: false }));
      const t1 = setTimeout(() => map.invalidateSize({ animate: false }), 100);
      const t2 = setTimeout(() => map.invalidateSize({ animate: false }), 350);

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize({ animate: false });
          }
        });
        resizeObserver.observe(container);
      }

      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(t1);
        clearTimeout(t2);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
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

  // Clean up Leaflet on component unmount to prevent container already initialized errors
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);


  const handleConfirm = () => {
    setWard(selected);
    navigate('/citizen');
  };

  const handleOpenDashboard = () => {
    setWard(selected);
    navigate(`/officer/ward/${selected.code}`);
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-64px)] bg-[#F8FAFC]">
      {/* Compact Top Banner Header */}
      <section className="w-full bg-white px-4 md:px-8 py-4 border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-[#0F2942] tracking-tight">
              Chọn Xã / Phường / Đặc Khu (Tỉnh An Giang)
            </h1>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Kết nối 96 đơn vị hành chính cấp cơ sở (14 Phường • 79 Xã • 3 Đặc khu) với Trợ lý Một cửa và Bản đồ sự cố.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-[#0F2942] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#1E3A5F] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Vào Cổng {selected.name}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#38BDF8]" />
            </button>
          </div>
        </div>
      </section>

      {/* Main Split Grid Viewport */}
      <div className="max-w-7xl w-full mx-auto px-4 md:px-8 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* LEFT COLUMN: Search & Communes List (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-2xl border border-[#CBD5E1] shadow-2xs p-4 gap-3.5 max-h-[680px]">
          {/* Search Input Bar */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm xã, phường, đặc khu (VD: Long Xuyên, Châu Đốc, Phú Quốc...)"
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus:outline-hidden focus:border-[#0F2942] focus:bg-white text-[#0F172A] transition-all"
            />
          </div>

          {/* Filter Type Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {(['ALL', 'Phường', 'Xã', 'Đặc khu'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filterType === type
                    ? 'bg-[#0F2942] text-white shadow-2xs'
                    : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                }`}
              >
                {type === 'ALL' ? `Tất Cả (${filteredWards.length})` : type}
              </button>
            ))}
          </div>

          {/* Communes List (Scrollable) */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredWards.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                Không tìm thấy xã/phường phù hợp với từ khóa "{keyword}".
              </div>
            ) : (
              filteredWards.map((ward) => {
                const isSelected = selected.code === ward.code;
                return (
                  <div
                    key={ward.code}
                    onClick={() => setSelected(ward)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#F1F5F9] border-[#0F2942] shadow-2xs'
                        : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#0F2942] text-[#38BDF8]' : 'bg-[#F1F5F9] text-[#0F766E]'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-[#0F172A] tracking-tight">
                          {ward.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#64748B]">
                          <span>{ward.area}</span>
                          <span>•</span>
                          <span className="font-medium text-[#0F766E]">{ward.type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-[#ECFDF5] text-[#065F46]">
                        {ward.solvedRate}%
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isSelected ? 'text-[#0F2942] translate-x-0.5' : 'text-[#CBD5E1]'
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
          <div className="w-full h-72 rounded-2xl border border-[#CBD5E1] overflow-hidden shadow-2xs relative bg-[#E2E8F0]">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Floating Top Badge on Map */}
            <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#CBD5E1] shadow-sm flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              <span className="font-bold text-[#0F2942]">UBND {selected.name}</span>
              <span className="text-[#64748B]">({selected.lat.toFixed(4)}, {selected.lon.toFixed(4)})</span>
            </div>
          </div>

          {/* Selected Ward Administrative Info Card */}
          <div className="p-5 bg-white rounded-2xl border border-[#CBD5E1] shadow-2xs flex flex-col gap-4">
            {/* Office Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-[#0F766E] uppercase tracking-wider">
                  Trụ Sở Tiếp Nhận & Trả Kết Quả Một Cửa
                </span>
                <h2 className="text-lg font-bold text-[#0F2942] tracking-tight mt-0.5">
                  UBND {selected.name} • {selected.province}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                    isOfficeOpen
                      ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                      : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {isOfficeOpen ? 'Đang mở cửa' : 'Ngoài giờ hành chính'}
                </span>
              </div>
            </div>

            {/* Address & Hotline Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-start gap-2.5 text-xs text-[#0F172A]">
                <MapPin className="w-4 h-4 text-[#0F2942] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[#64748B] text-[11px]">Địa chỉ trụ sở:</span>
                  <span>{selected.officeAddress}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-[#0F172A]">
                <Phone className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[#64748B] text-[11px]">Hotline Một Cửa:</span>
                  <span className="font-bold text-[#0F766E]">{selected.phoneNumber}</span>
                </div>
              </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[11px] text-[#64748B] block">Đúng hạn</span>
                <span className="text-base font-extrabold text-[#16A34A]">{selected.solvedRate}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[11px] text-[#64748B] block">Sự cố mở</span>
                <span className="text-base font-extrabold text-[#0F2942]">{selected.totalOpenIncidents} ca</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[11px] text-[#64748B] block">Giờ làm việc</span>
                <span className="text-xs font-bold text-[#0F172A] mt-1 block">07:00 – 17:00</span>
              </div>
            </div>

            {/* Online Services Available */}
            <div>
              <span className="text-xs font-bold text-[#0F172A] block mb-2">
                Dịch vụ công trực tuyến tại địa bàn:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selected.onlineServices.map((srv) => (
                  <span
                    key={srv}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#F1F5F9] text-[#0F2942] border border-[#CBD5E1]"
                  >
                    ✓ {srv}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={handleOpenDashboard}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#CBD5E1] text-[#0F2942] text-xs font-bold hover:bg-[#F1F5F9] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-[#0F766E]" />
                <span>Xem Bàn Cán Bộ</span>
              </button>

              <button
                onClick={handleConfirm}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#0F2942] text-white text-xs font-bold shadow-xs hover:bg-[#1E3A5F] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Chọn {selected.name}</span>
                <ArrowRight className="w-4 h-4 text-[#38BDF8]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WardOnboarding;
