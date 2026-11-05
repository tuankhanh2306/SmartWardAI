import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWard } from '../context/WardContext';
import { AN_GIANG_WARDS, type WardItem } from '../data/anGiangWards';
import Pagination from '../components/Pagination';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  ArrowLeft,
  Radio
} from 'lucide-react';

interface LocalIncident {
  id: string;
  category: 'Cơ sở hạ tầng' | 'Môi trường & Rác thải' | 'An ninh trật tự' | 'Chiếu sáng đô thị';
  title: string;
  address: string;
  lat: number;
  lon: number;
  reportedTime: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  duplicatesMerged: number;
}

export const PerWardDashboard: React.FC = () => {
  const { wardCode } = useParams<{ wardCode: string }>();
  const navigate = useNavigate();
  const { currentWard, setWard } = useWard();

  // Find ward from param or context
  const ward: WardItem =
    AN_GIANG_WARDS.find((w) => w.code === wardCode) || currentWard;

  const [activeTab, setActiveTab] = useState<'INCIDENTS' | 'MAP' | 'OFFICERS'>('INCIDENTS');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  const [incidents, setIncidents] = useState<LocalIncident[]>([
    {
      id: 'INC-AG-001',
      category: 'Cơ sở hạ tầng',
      title: 'Đường sạt lở mé sông, xuất hiện ổ gà lớn sau mưa lớn',
      address: `Gần cầu ngã ba, ${ward.name}, ${ward.province}`,
      lat: ward.lat + 0.003,
      lon: ward.lon + 0.002,
      reportedTime: '08:15 Sáng nay',
      status: 'IN_PROGRESS',
      urgency: 'HIGH',
      duplicatesMerged: 3,
    },
    {
      id: 'INC-AG-002',
      category: 'Chiếu sáng đô thị',
      title: 'Hệ thống đèn đường chập chờn đoạn trước trường học',
      address: `Trục đường chính, ${ward.name}, ${ward.province}`,
      lat: ward.lat - 0.002,
      lon: ward.lon + 0.004,
      reportedTime: 'Hôm qua, 18:30',
      status: 'PENDING',
      urgency: 'MEDIUM',
      duplicatesMerged: 1,
    },
    {
      id: 'INC-AG-003',
      category: 'Môi trường & Rác thải',
      title: 'Ùn ứ rác sinh hoạt tại khu vực chợ dân sinh',
      address: `Cổng chợ địa phương, ${ward.name}, ${ward.province}`,
      lat: ward.lat + 0.001,
      lon: ward.lon - 0.003,
      reportedTime: 'Hôm qua, 09:00',
      status: 'RESOLVED',
      urgency: 'LOW',
      duplicatesMerged: 2,
    },
    {
      id: 'INC-AG-004',
      category: 'Cơ sở hạ tầng',
      title: 'Cầu gỗ dân sinh bắc qua mương rạch bị nứt gãy ván lót',
      address: `Tổ 4, Ấp An Hòa, ${ward.name}, ${ward.province}`,
      lat: ward.lat + 0.004,
      lon: ward.lon - 0.001,
      reportedTime: '2 ngày trước',
      status: 'IN_PROGRESS',
      urgency: 'HIGH',
      duplicatesMerged: 4,
    },
    {
      id: 'INC-AG-005',
      category: 'An ninh trật tự',
      title: 'Tụ tập hát karaoke loa kéo công suất lớn quá giờ quy định',
      address: `Khu dân cư kênh mới, ${ward.name}, ${ward.province}`,
      lat: ward.lat - 0.003,
      lon: ward.lon - 0.002,
      reportedTime: '3 ngày trước',
      status: 'RESOLVED',
      urgency: 'MEDIUM',
      duplicatesMerged: 2,
    },
    {
      id: 'INC-AG-006',
      category: 'Môi trường & Rác thải',
      title: 'Cống thoát nước trục lộ liên xã bị tắc nghẽn lục bình',
      address: `Ngay cống Ba Răng, ${ward.name}, ${ward.province}`,
      lat: ward.lat + 0.002,
      lon: ward.lon + 0.003,
      reportedTime: '3 ngày trước',
      status: 'RESOLVED',
      urgency: 'LOW',
      duplicatesMerged: 1,
    },
    {
      id: 'INC-AG-007',
      category: 'Cơ sở hạ tầng',
      title: 'Biển báo giao thông cua dốc nguy hiểm bị cây cối che khuất',
      address: `Đoạn dốc cầu Kênh Ranh, ${ward.name}, ${ward.province}`,
      lat: ward.lat - 0.001,
      lon: ward.lon + 0.001,
      reportedTime: '4 ngày trước',
      status: 'PENDING',
      urgency: 'MEDIUM',
      duplicatesMerged: 1,
    },
    {
      id: 'INC-AG-008',
      category: 'Chiếu sáng đô thị',
      title: 'Đèn đường chiếu sáng khu vực nhà sinh hoạt cộng đồng bị cháy',
      address: `Nhà văn hóa ấp Trung, ${ward.name}, ${ward.province}`,
      lat: ward.lat + 0.005,
      lon: ward.lon - 0.004,
      reportedTime: '5 ngày trước',
      status: 'RESOLVED',
      urgency: 'LOW',
      duplicatesMerged: 2,
    },
  ]);

  // Filtered incidents based on status
  const filteredIncidents = useMemo(() => {
    if (statusFilter === 'ALL') return incidents;
    return incidents.filter((item) => item.status === statusFilter);
  }, [incidents, statusFilter]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / pageSize));
  const paginatedIncidents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIncidents.slice(start, start + pageSize);
  }, [filteredIncidents, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, pageSize]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Initialize Leaflet map for ward incidents with proper lifecycle
  useEffect(() => {
    if (activeTab !== 'MAP' || !mapContainerRef.current) return;

    // Clean up any existing map instance to prevent "Map container is already initialized"
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([ward.lat, ward.lon], 15);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add headquarters marker
    const hqIcon = L.divIcon({
      className: 'custom-hq-marker',
      html: `<div class="px-2.5 py-1 rounded-xl bg-[#00236F] text-white border-2 border-white shadow-md text-[10px] font-bold text-center whitespace-nowrap">UBND ${ward.name}</div>`,
      iconSize: [110, 26],
      iconAnchor: [55, 13],
    });
    L.marker([ward.lat, ward.lon], { icon: hqIcon }).addTo(map);

    // Add incident markers
    incidents.forEach((inc) => {
      const markerColor =
        inc.urgency === 'HIGH' ? '#BA1A1A' : inc.urgency === 'MEDIUM' ? '#D97706' : '#00687A';
      const incIcon = L.divIcon({
        className: 'custom-inc-marker',
        html: `<div style="background-color: ${markerColor}" class="w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-110 transition-transform">!</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([inc.lat, inc.lon], { icon: incIcon })
        .addTo(map)
        .bindPopup(
          `<div class="p-2 text-xs font-sans">
            <b class="text-[#00236F] block mb-1">${inc.title}</b>
            <span class="text-[#757682] block mb-1">${inc.address}</span>
            <div class="flex items-center gap-2 mt-1">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold text-white" style="background:${markerColor}">${inc.urgency}</span>
              <span class="text-[10px] text-[#444651] font-semibold">+${inc.duplicatesMerged} trùng</span>
            </div>
          </div>`
        );
    });

    mapInstanceRef.current = map;

    // Invalidate size to eliminate grey tiles after tab switch
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [activeTab, ward, incidents]);


  const updateIncidentStatus = (id: string, newStatus: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED') => {
    setIncidents((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  return (
    <div className="flex flex-col w-full pb-16 bg-[#FAF8FF]">
      {/* Top Header Navigation */}
      <section className="bg-gradient-to-r from-[#00236F] via-[#1E3A8A] to-[#004E5C] text-white px-4 md:px-8 py-8 border-b border-[#DAE2FD]/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate('/onboarding')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 shrink-0 mt-1"
              title="Quay lại chọn địa bàn khác"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#57DFFE]/20 text-[#ACEDFF] border border-[#57DFFE]/40 uppercase tracking-wider">
                  Bàn Điều Hành Cán Bộ Xã/Phường
                </span>
                <span className="text-xs text-[#ACEDFF]">• An Giang</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                UBND {ward.name}
              </h1>
              <p className="text-xs sm:text-sm text-white/80 mt-1 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#57DFFE]" />
                {ward.officeAddress} • 📞 Hotline: {ward.phoneNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setWard(ward);
                navigate('/citizen');
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition active:scale-95"
            >
              Cổng Dịch Vụ Công Dân
            </button>
            <button
              onClick={() => navigate('/onboarding')}
              className="px-4 py-2 bg-[#57DFFE] text-[#00236F] hover:bg-[#ACEDFF] rounded-xl text-xs font-bold shadow-md transition active:scale-95"
            >
              Đổi Địa Bàn Khác
            </button>
          </div>
        </div>
      </section>

      {/* KPI Cards Row */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-4 w-full grid grid-cols-2 lg:grid-cols-4 gap-4 z-10">
        <div className="p-4 rounded-2xl bg-white border border-[#EAEDFF] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#757682] uppercase">Sự cố địa bàn</span>
            <span className="text-2xl font-extrabold text-[#00236F] block mt-1">{incidents.length} ca</span>
            <span className="text-[10px] text-[#16A34A] font-semibold">Tự gộp 6 phản ánh trùng</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#00236F]/10 text-[#00236F] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EAEDFF] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#757682] uppercase">Tỷ lệ đúng hạn</span>
            <span className="text-2xl font-extrabold text-[#16A34A] block mt-1">{ward.solvedRate}%</span>
            <span className="text-[10px] text-[#757682]">Chuẩn SLA cấp xã</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EBFDF3] text-[#16A34A] flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EAEDFF] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#757682] uppercase">Thời gian xử lý TB</span>
            <span className="text-2xl font-extrabold text-[#00687A] block mt-1">1.8 ngày</span>
            <span className="text-[10px] text-[#00687A] font-semibold">Nhanh hơn 35% kỳ trước</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#00687A]/10 text-[#00687A] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EAEDFF] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#757682] uppercase">Cán bộ trực tiếp</span>
            <span className="text-2xl font-extrabold text-[#131B2E] block mt-1">4 đồng chí</span>
            <span className="text-[10px] text-[#16A34A] font-semibold">100% ca trực sẵn sàng</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F2F3FF] text-[#00236F] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 w-full flex flex-col gap-5">
        {/* Modern Segmented Tab Controls */}
        <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-[#EAEDFF] shadow-xs w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('INCIDENTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-2 ${
              activeTab === 'INCIDENTS'
                ? 'bg-[#00236F] text-white shadow-xs'
                : 'text-[#444651] hover:text-[#00236F] hover:bg-[#F2F3FF]'
            }`}
          >
            <span>📋 Danh Sách Phản Ánh</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'INCIDENTS'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#F2F3FF] text-[#00236F]'
              }`}
            >
              {incidents.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MAP')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-2 ${
              activeTab === 'MAP'
                ? 'bg-[#00236F] text-white shadow-xs'
                : 'text-[#444651] hover:text-[#00236F] hover:bg-[#F2F3FF]'
            }`}
          >
            <span>🗺️ Bản Đồ Sự Cố Hiện Trường</span>
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
          </button>
        </div>

        {/* Tab 1: Incidents List */}
        {activeTab === 'INCIDENTS' && (
          <div className="bg-white rounded-3xl border border-[#EAEDFF] shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-[#EAEDFF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#00236F]">
                  Sự Cố Hiện Trường Phát Sinh Tại {ward.name}
                </h2>
                <span className="text-xs text-[#757682] mt-0.5 block">
                  Phân luồng độc lập theo địa bàn • Tự động gộp tin báo trùng lặp
                </span>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F2F3FF] rounded-xl border border-[#EAEDFF] text-xs">
                {(
                  [
                    { key: 'ALL', label: 'Tất cả', count: incidents.length },
                    { key: 'PENDING', label: 'Chờ duyệt', count: incidents.filter((i) => i.status === 'PENDING').length },
                    { key: 'IN_PROGRESS', label: 'Đang xử lý', count: incidents.filter((i) => i.status === 'IN_PROGRESS').length },
                    { key: 'RESOLVED', label: 'Đã xong', count: incidents.filter((i) => i.status === 'RESOLVED').length },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition active:scale-95 cursor-pointer flex items-center gap-1 ${
                      statusFilter === tab.key
                        ? 'bg-[#00236F] text-white shadow-2xs'
                        : 'text-[#444651] hover:text-[#00236F]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[10px] opacity-80 font-mono">({tab.count})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#131B2E]">
                <thead className="bg-[#FAF8FF] border-b border-[#EAEDFF] text-[11px] font-bold text-[#757682] uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Mã & Thời Gian</th>
                    <th className="p-4">Loại Sự Cố</th>
                    <th className="p-4">Nội Dung & Địa Chỉ</th>
                    <th className="p-4 text-center">Gộp Trùng</th>
                    <th className="p-4 text-center">Trạng Thái</th>
                    <th className="p-4 text-right">Thao Tác Cán Bộ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEDFF]">
                  {paginatedIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#757682]">
                        Không có sự cố nào thuộc trạng thái này.
                      </td>
                    </tr>
                  ) : (
                    paginatedIncidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-[#F2F3FF]/40 transition-colors">
                        <td className="p-4 font-mono font-bold text-[#00236F]">
                          {inc.id}
                          <span className="block text-[10px] font-sans text-[#757682] mt-0.5">
                            {inc.reportedTime}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-[#00687A]">
                          {inc.category}
                        </td>
                        <td className="p-4 max-w-sm">
                          <span className="font-bold block text-[#131B2E]">{inc.title}</span>
                          <span className="text-[11px] text-[#757682] flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-[#00236F] shrink-0" />
                            <span>{inc.address}</span>
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 rounded-lg font-bold text-[10px] bg-[#EAEDFF] text-[#00236F] border border-[#DAE2FD]">
                            +{inc.duplicatesMerged} phản ánh
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              inc.status === 'RESOLVED'
                                ? 'bg-[#EBFDF3] text-[#166534] border border-[#86EFAC]'
                                : inc.status === 'IN_PROGRESS'
                                ? 'bg-[#ACEDFF]/40 text-[#004E5C] border border-[#57DFFE]/40'
                                : 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                            }`}
                          >
                            {inc.status === 'RESOLVED'
                              ? '✓ Đã hoàn tất'
                              : inc.status === 'IN_PROGRESS'
                              ? 'Đang xử lý'
                              : 'Chờ tiếp nhận'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {inc.status !== 'IN_PROGRESS' && inc.status !== 'RESOLVED' && (
                              <button
                                type="button"
                                onClick={() => updateIncidentStatus(inc.id, 'IN_PROGRESS')}
                                className="px-3 py-1.5 rounded-xl bg-[#00236F] hover:bg-[#0A328F] active:scale-95 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                              >
                                Tiếp Nhận
                              </button>
                            )}
                            {inc.status === 'IN_PROGRESS' && (
                              <button
                                type="button"
                                onClick={() => updateIncidentStatus(inc.id, 'RESOLVED')}
                                className="px-3 py-1.5 rounded-xl bg-[#00687A] hover:bg-[#004E5C] active:scale-95 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                              >
                                Hoàn Thành
                              </button>
                            )}
                            {inc.status === 'RESOLVED' && (
                              <span className="text-[11px] text-[#757682] font-semibold italic">
                                Lưu trữ hồ sơ
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Phân Trang (Pagination) */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredIncidents.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[3, 5, 10]}
              labelSingular="sự cố"
              labelPlural="sự cố"
            />
          </div>
        )}

        {/* Tab 2: Leaflet Local GIS Map */}
        {activeTab === 'MAP' && (
          <div className="bg-white rounded-3xl border border-[#EAEDFF] shadow-xs p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EAEDFF]">
              <span className="text-xs sm:text-sm font-bold text-[#00236F] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#BA1A1A] animate-pulse shrink-0" />
                Vị Trí Các Điểm Nóng Sự Cố Tại {ward.name} (Tọa độ: {ward.lat.toFixed(4)}, {ward.lon.toFixed(4)})
              </span>
              <div className="flex items-center gap-3 text-[11px] text-[#757682]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#BA1A1A]" /> Khẩn cấp
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" /> Trung bình
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00687A]" /> Đã xử lý
                </span>
              </div>
            </div>
            <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-[#DAE2FD] relative z-1 shadow-inner bg-[#E5E7EB]">
              <div ref={mapContainerRef} className="w-full h-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerWardDashboard;
