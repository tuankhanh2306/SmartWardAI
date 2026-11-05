import React, { useEffect, useState, useRef } from 'react';
import { type IssueCluster } from '../api/client';
import { OfficerSidebar } from '../components/OfficerSidebar';
import { useWard } from '../context/WardContext';
import L from 'leaflet';
import {
  Layers,
  CheckCircle2,
  Send,
  Sparkles,
  MapPin,
  AlertCircle,
  Clock
} from 'lucide-react';

export const GisCommandCenter: React.FC = () => {
  const { currentWard } = useWard();
  const [clusters, setClusters] = useState<IssueCluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<IssueCluster | null>(null);
  const [radiusFilter, setRadiusFilter] = useState<number>(75);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Generate localized clusters for currentWard
  useEffect(() => {
    const lat = currentWard.lat;
    const lon = currentWard.lon;

    const mock: IssueCluster[] = [
      {
        id: `clust-${currentWard.code}-1`,
        clusterCode: `CLUST-${currentWard.code.substring(0, 4).toUpperCase()}-001`,
        category: 'ROAD_DAMAGE',
        centroidLatitude: lat + 0.0014,
        centroidLongitude: lon + 0.0012,
        title: `Sụt lún mặt đường gần ${currentWard.officeAddress}`,
        descriptionSummary: 'Ổ gà sâu và mặt đường bị nứt vỡ nguy hiểm sau mùa mưa lũ',
        status: 'OPEN',
        reportCount: 5,
        createdAt: '2026-11-04 08:30:00',
        lastReportAt: '2026-11-04 09:15:00',
      },
      {
        id: `clust-${currentWard.code}-2`,
        clusterCode: `CLUST-${currentWard.code.substring(0, 4).toUpperCase()}-002`,
        category: 'FLOODING',
        centroidLatitude: lat - 0.0016,
        centroidLongitude: lon + 0.0019,
        title: `Điểm trũng ngập nước khu dân cư ${currentWard.name}`,
        descriptionSummary: 'Nước dâng cao 30cm do triều cường sông Hậu cần tiêu thoát gấp',
        status: 'INVESTIGATING',
        reportCount: 3,
        createdAt: '2026-11-04 08:45:00',
        lastReportAt: '2026-11-04 09:20:00',
      },
      {
        id: `clust-${currentWard.code}-3`,
        clusterCode: `CLUST-${currentWard.code.substring(0, 4).toUpperCase()}-003`,
        category: 'GARBAGE',
        centroidLatitude: lat + 0.0009,
        centroidLongitude: lon - 0.0018,
        title: `Tồn đọng rác thải sinh hoạt gần chợ ${currentWard.name}`,
        descriptionSummary: 'Rác sinh hoạt ùn ứ cần xe chuyên dụng Đô Thị thu gom',
        status: 'OPEN',
        reportCount: 4,
        createdAt: '2026-11-04 08:10:00',
        lastReportAt: '2026-11-04 09:05:00',
      },
    ];
    setClusters(mock);
    setSelectedCluster(mock[0]);
    setLoading(false);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], 16, { duration: 1.0 });
    }
  }, [currentWard.code, currentWard.lat, currentWard.lon]);

  // 1. Initialize Map Instance with proper cleanup
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance before creating a new one
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [currentWard.lat, currentWard.lon],
      zoom: 16,
      zoomControl: false, // Move zoom control to avoid colliding with top filter bar
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    // Avoid gray/misaligned tiles on render
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // 2. Render Markers & Heat Circles when filters or clusters change
  useEffect(() => {
    if (!layerGroupRef.current || !mapInstanceRef.current) return;

    layerGroupRef.current.clearLayers();

    const filtered =
      categoryFilter === 'ALL'
        ? clusters
        : clusters.filter((c) => c.category === categoryFilter);

    filtered.forEach((c) => {
      const isRoad = c.category === 'ROAD_DAMAGE';
      const isFlood = c.category === 'FLOODING';
      const color = isRoad ? '#BA1A1A' : isFlood ? '#00687A' : '#D97706';
      const fillColor = isRoad ? '#FFDAD6' : isFlood ? '#ACEDFF' : '#FEF3C7';

      // Spatial radius circle
      const circle = L.circle([c.centroidLatitude, c.centroidLongitude], {
        radius: radiusFilter,
        color: color,
        fillColor: fillColor,
        fillOpacity: 0.28,
        weight: 2,
      });

      // Custom marker pill badge
      const iconHtml = `
        <div style="background-color: ${color};" class="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-lg border-2 border-white ring-2 ring-black/10 cursor-pointer hover:scale-110 transition-transform">
          ${c.reportCount}
        </div>
      `;
      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-cluster-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([c.centroidLatitude, c.centroidLongitude], {
        icon: customIcon,
      });

      marker.on('click', () => {
        setSelectedCluster(c);
      });

      circle.addTo(layerGroupRef.current!);
      marker.addTo(layerGroupRef.current!);
    });
  }, [clusters, radiusFilter, categoryFilter]);

  const handleDispatch = () => {
    if (!selectedCluster) return;
    setFeedbackMessage(
      `Đã chuyển lệnh điều phối Đội Quản lý Đô thị ${currentWard.name} xử lý cụm ${selectedCluster.clusterCode}!`
    );
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleResolve = () => {
    if (!selectedCluster) return;
    setClusters((prev) =>
      prev.map((item) =>
        item.id === selectedCluster.id ? { ...item, status: 'RESOLVED' } : item
      )
    );
    setSelectedCluster((prev) => (prev ? { ...prev, status: 'RESOLVED' } : null));
    setFeedbackMessage(
      `Cụm ${selectedCluster.clusterCode} đã được đánh dấu giải quyết hoàn tất.`
    );
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  return (
    <div className="flex w-full min-h-[calc(100vh-64px)] bg-[#FAF8FF]">
      {/* Responsive Officer Sidebar */}
      <OfficerSidebar activeMenu="map" />

      {/* Main Layout Area */}
      <main className="lg:pl-64 w-full flex flex-col min-w-0 transition-all">
        <div className="p-4 md:p-6 flex flex-col gap-5">
          {/* Operations Header Ribbon */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-[#EAEDFF] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#00236F]/10 flex items-center justify-center text-[#00236F] shrink-0 border border-[#DAE2FD]">
                <Layers className="w-6 h-6 text-[#00236F]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-extrabold text-base md:text-lg text-[#00236F] uppercase tracking-tight">
                    TRUNG TÂM CHỈ HUY SPATIAL-SEMANTIC TRIAGE • {currentWard.name.toUpperCase()}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EBFDF3] text-[#166534] font-bold text-xs border border-[#86EFAC]/50 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                    GIS AI LIVE
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F2F3FF] text-[#444651] font-semibold text-xs border border-[#DAE2FD]">
                    Khu vực: {currentWard.name} • Tỉnh An Giang
                  </span>
                </div>
                <span className="text-xs text-[#757682] mt-0.5 block">
                  Phân luồng & gom cụm sự cố Hai Pha: Không gian Redis GEO (R={radiusFilter}m) + Ngữ nghĩa Cosine (τ=0.82)
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2.5 flex-wrap text-xs">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#BA1A1A] animate-ping" />
                <span className="text-[#444651]">Khẩn cấp:</span>
                <span className="font-bold text-[#BA1A1A]">
                  {clusters.filter((c) => c.status === 'OPEN').length} Cụm
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00687A]" />
                <span className="text-[#444651]">Đang điều tra:</span>
                <span className="font-bold text-[#00687A]">
                  {clusters.filter((c) => c.status === 'INVESTIGATING').length} Cụm
                </span>
              </div>
            </div>
          </div>

          {/* Feedback Banner if an action was triggered */}
          {feedbackMessage && (
            <div className="p-3.5 rounded-xl bg-[#EBFDF3] border border-[#86EFAC] text-xs font-semibold text-[#166534] flex items-center gap-2 shadow-xs transition-all animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          )}

          {/* Main Layout: GIS Map (8 cols) & Incident Inspector (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: GIS Map Card with Isolating Container */}
            <div className="lg:col-span-8 bg-white rounded-3xl shadow-xs border border-[#EAEDFF] overflow-hidden flex flex-col relative h-[520px] lg:h-[680px]">
              {/* Floating Filter Bar - Positioned cleanly with z-20 below header */}
              <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2.5 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md border border-[#DAE2FD]/80">
                {/* Radius filter pills */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-[#00236F] mr-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#00687A]" /> Bán kính R:
                  </span>
                  {[50, 75, 100].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRadiusFilter(r)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
                        radiusFilter === r
                          ? 'bg-[#00236F] text-white shadow-xs'
                          : 'bg-[#F2F3FF] text-[#444651] hover:bg-[#EAEDFF] border border-[#DAE2FD]/60'
                      }`}
                    >
                      {r}m {r === 75 && '★'}
                    </button>
                  ))}
                </div>

                {/* Category filter dropdown */}
                <div className="flex items-center gap-2 text-xs">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-[#F2F3FF] hover:bg-[#EAEDFF] border border-[#DAE2FD] px-3 py-1.5 rounded-xl text-xs text-[#00236F] font-bold focus:outline-hidden focus:ring-2 focus:ring-[#00236F] cursor-pointer transition-colors"
                  >
                    <option value="ALL">Tất cả danh mục hiện trường</option>
                    <option value="ROAD_DAMAGE">Hạ tầng giao thông & sạt lở</option>
                    <option value="FLOODING">Ngập úng & triều cường</option>
                    <option value="GARBAGE">Môi trường & rác thải</option>
                    <option value="STREETLIGHT">Chiếu sáng công cộng</option>
                  </select>
                </div>
              </div>

              {/* Map Canvas with isolate style */}
              <div ref={mapContainerRef} className="w-full h-full relative z-1" />
            </div>

            {/* Right: Selected Cluster Inspector */}
            <div className="lg:col-span-4 bg-white rounded-3xl shadow-xs border border-[#EAEDFF] p-5 flex flex-col gap-4 overflow-y-auto max-h-[680px]">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAEDFF]">
                <span className="text-sm font-bold text-[#00236F] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#00687A]" />
                  Chi Tiết Cụm Phản Ánh Hiện Trường
                </span>
                {selectedCluster && (
                  <span className="font-mono text-xs font-bold text-[#00236F] bg-[#F2F3FF] border border-[#DAE2FD] px-2.5 py-0.5 rounded-lg">
                    {selectedCluster.clusterCode}
                  </span>
                )}
              </div>

              {selectedCluster ? (
                <div className="flex flex-col gap-4 text-xs">
                  <div>
                    <span className="text-[#757682] block mb-1 font-medium">Tiêu đề sự cố:</span>
                    <h3 className="text-sm font-bold text-[#131B2E] leading-snug">
                      {selectedCluster.title}
                    </h3>
                  </div>

                  <div className="p-3.5 bg-[#FAF8FF] rounded-2xl border border-[#EAEDFF] flex flex-col gap-1.5">
                    <span className="text-[#757682] font-semibold text-[11px] uppercase tracking-wider">
                      Mô tả tổng hợp AI:
                    </span>
                    <p className="text-[#131B2E] leading-relaxed text-xs">
                      {selectedCluster.descriptionSummary}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 font-mono">
                    <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF]">
                      <span className="text-[#757682] block text-[10px] font-sans">Lượt báo trùng:</span>
                      <strong className="text-sm text-[#00236F] font-bold">
                        {selectedCluster.reportCount} công dân
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF]">
                      <span className="text-[#757682] block text-[10px] font-sans">Trạng thái:</span>
                      <span
                        className={`inline-block text-xs font-bold px-2 py-0.5 rounded mt-0.5 ${
                          selectedCluster.status === 'RESOLVED'
                            ? 'bg-[#EBFDF3] text-[#166534]'
                            : selectedCluster.status === 'INVESTIGATING'
                            ? 'bg-[#ACEDFF]/40 text-[#004E5C]'
                            : 'bg-[#FFDAD6] text-[#BA1A1A]'
                        }`}
                      >
                        {selectedCluster.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF] font-mono text-[11px] space-y-1 text-[#444651]">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#00687A] shrink-0" />
                      <span>
                        Tâm: {selectedCluster.centroidLatitude.toFixed(6)},{' '}
                        {selectedCluster.centroidLongitude.toFixed(6)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#757682] shrink-0" />
                      <span>Báo cáo gần nhất: {selectedCluster.lastReportAt}</span>
                    </div>
                  </div>

                  {/* Dispatch action buttons with high-end micro-interactions */}
                  <div className="flex flex-col gap-2.5 pt-3 border-t border-[#EAEDFF]">
                    <button
                      type="button"
                      onClick={handleDispatch}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#00236F] hover:bg-[#0A328F] active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-[#00236F]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-[#57DFFE]" />
                      <span>Điều Phối Tổ Xử Lý Hiện Trường</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResolve}
                      disabled={selectedCluster.status === 'RESOLVED'}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#F2F3FF] hover:bg-[#EAEDFF] active:scale-[0.98] text-[#00236F] font-bold text-xs border border-[#DAE2FD] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>
                        {selectedCluster.status === 'RESOLVED'
                          ? 'Đã Giải Quyết Xong'
                          : 'Đánh Dấu Hoàn Thành'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-[#757682] text-xs">
                  {loading
                    ? 'Đang nạp dữ liệu GIS...'
                    : 'Bấm vào một điểm gộp trên bản đồ để xem chi tiết.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GisCommandCenter;


