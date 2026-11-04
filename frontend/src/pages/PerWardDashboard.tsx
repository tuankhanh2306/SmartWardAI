import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWard } from '../context/WardContext';
import { AN_GIANG_WARDS, type WardItem } from '../data/anGiangWards';
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
  ]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Initialize Leaflet map for ward incidents
  useEffect(() => {
    if (activeTab !== 'MAP' || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([ward.lat, ward.lon], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Add headquarters marker
      const hqIcon = L.divIcon({
        className: 'custom-hq-marker',
        html: `<div class="p-1 rounded-lg bg-[#00236F] text-white border-2 border-white shadow-md text-[10px] font-bold text-center">UBND ${ward.name}</div>`,
        iconSize: [80, 24],
      });
      L.marker([ward.lat, ward.lon], { icon: hqIcon }).addTo(map);

      // Add incident markers
      incidents.forEach((inc) => {
        const markerColor = inc.urgency === 'HIGH' ? '#BA1A1A' : inc.urgency === 'MEDIUM' ? '#D97706' : '#00687A';
        const incIcon = L.divIcon({
          className: 'custom-inc-marker',
          html: `<div style="background-color: ${markerColor}" class="w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold">!</div>`,
          iconSize: [24, 24],
        });

        L.marker([inc.lat, inc.lon], { icon: incIcon })
          .addTo(map)
          .bindPopup(
            `<div class="p-2 text-xs">
              <b class="text-[#00236F] block mb-1">${inc.title}</b>
              <span class="text-[#757682] block mb-1">${inc.address}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold text-white" style="background:${markerColor}">${inc.urgency}</span>
            </div>`
          );
      });

      mapInstanceRef.current = map;
    }
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
        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-[#EAEDFF] pb-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('INCIDENTS')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'INCIDENTS'
                ? 'bg-[#00236F] text-white shadow-xs'
                : 'text-[#444651] hover:bg-[#F2F3FF]'
            }`}
          >
            📋 Danh Sách Phản Ánh ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('MAP')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'MAP'
                ? 'bg-[#00236F] text-white shadow-xs'
                : 'text-[#444651] hover:bg-[#F2F3FF]'
            }`}
          >
            🗺️ Bản Đồ Sự Cố Địa Bàn
          </button>
        </div>

        {/* Tab 1: Incidents List */}
        {activeTab === 'INCIDENTS' && (
          <div className="bg-white rounded-3xl border border-[#EAEDFF] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#EAEDFF] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#00236F]">
                Sự Cố Hiện Trường Phát Sinh Tại {ward.name}
              </h2>
              <span className="text-xs text-[#757682]">Dữ liệu cô lập độc lập theo địa bàn</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#131B2E]">
                <thead className="bg-[#FAF8FF] border-b border-[#EAEDFF] text-[11px] font-bold text-[#757682] uppercase">
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
                  {incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-[#F2F3FF]/30 transition-colors">
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
                          <MapPin className="w-3 h-3 text-[#00236F]" />
                          {inc.address}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-[#DCE1FF] text-[#00164E]">
                          +{inc.duplicatesMerged} phản ánh
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            inc.status === 'RESOLVED'
                              ? 'bg-[#EBFDF3] text-[#166534]'
                              : inc.status === 'IN_PROGRESS'
                              ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                              : 'bg-[#FFFBEB] text-[#B45309]'
                          }`}
                        >
                          {inc.status === 'RESOLVED'
                            ? '✓ Đã xong'
                            : inc.status === 'IN_PROGRESS'
                            ? 'Đang xử lý'
                            : 'Chờ tiếp nhận'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inc.status !== 'IN_PROGRESS' && inc.status !== 'RESOLVED' && (
                            <button
                              onClick={() => updateIncidentStatus(inc.id, 'IN_PROGRESS')}
                              className="px-2.5 py-1 rounded-lg bg-[#00236F] text-white text-[11px] font-bold hover:bg-[#1E3A8A] transition"
                            >
                              Tiếp Nhận
                            </button>
                          )}
                          {inc.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => updateIncidentStatus(inc.id, 'RESOLVED')}
                              className="px-2.5 py-1 rounded-lg bg-[#16A34A] text-white text-[11px] font-bold hover:bg-[#15803D] transition"
                            >
                              Hoàn Thành
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Leaflet Local GIS Map */}
        {activeTab === 'MAP' && (
          <div className="bg-white rounded-3xl border border-[#EAEDFF] shadow-xs p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#00236F] flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-[#BA1A1A] animate-pulse" />
                Vị Trí Các Điểm Nóng Sự Cố Tại {ward.name} (Tọa độ: {ward.lat.toFixed(4)}, {ward.lon.toFixed(4)})
              </span>
              <span className="text-[11px] text-[#757682]">Ghim đỏ: Nguy cấp • Ghim vàng: Trung bình</span>
            </div>
            <div ref={mapContainerRef} className="w-full h-[520px] rounded-2xl overflow-hidden border border-[#DAE2FD]" />
          </div>
        )}
      </div>
    </div>
  );
};

export default PerWardDashboard;
