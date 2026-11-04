import React, { useEffect, useState, useRef } from 'react';
import { getIssueClusters, type IssueCluster } from '../api/client';
import { OfficerSidebar } from '../components/OfficerSidebar';
import L from 'leaflet';

export const GisCommandCenter: React.FC = () => {
  const [clusters, setClusters] = useState<IssueCluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<IssueCluster | null>(null);
  const [radiusFilter, setRadiusFilter] = useState<number>(75);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Fetch Clusters from Backend
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const data = await getIssueClusters();
        setClusters(data);
        if (data.length > 0) {
          setSelectedCluster(data[0]);
        }
      } catch {
        // Fallback default clusters in Ward 25
        const mock: IssueCluster[] = [
          {
            id: 'clust-1',
            clusterCode: 'CLUST-ROAD-001',
            category: 'ROAD_DAMAGE',
            centroidLatitude: 10.8035,
            centroidLongitude: 106.7145,
            title: 'Sụt lún hố ga tại ngã ba Võ Oanh - D5',
            descriptionSummary: 'Ổ gà sâu và nắp hố ga bị chênh lệch nguy hiểm',
            status: 'OPEN',
            reportCount: 5,
            createdAt: '2026-11-04 08:30:00',
            lastReportAt: '2026-11-04 09:15:00',
          },
          {
            id: 'clust-2',
            clusterCode: 'CLUST-FLOOD-002',
            category: 'FLOODING',
            centroidLatitude: 10.8048,
            centroidLongitude: 106.7162,
            title: 'Ngập nước cục bộ đường Ung Văn Khiêm',
            descriptionSummary: 'Nước dâng cao 35cm do triều cường sau mưa lớn',
            status: 'INVESTIGATING',
            reportCount: 3,
            createdAt: '2026-11-04 08:45:00',
            lastReportAt: '2026-11-04 09:20:00',
          },
          {
            id: 'clust-3',
            clusterCode: 'CLUST-GARBAGE-003',
            category: 'GARBAGE',
            centroidLatitude: 10.8021,
            centroidLongitude: 106.7132,
            title: 'Điểm tập kết rác tự phát vỉa hè Nguyễn Gia Trí',
            descriptionSummary: 'Rác sinh hoạt tràn ra lòng đường gây mùi khó chịu',
            status: 'OPEN',
            reportCount: 4,
            createdAt: '2026-11-04 08:10:00',
            lastReportAt: '2026-11-04 09:05:00',
          },
        ];
        setClusters(mock);
        setSelectedCluster(mock[0]);
      } finally {
        setLoading(false);
      }
    };

    fetchClusters();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [10.8035, 106.7145], // Phường 25, Bình Thạnh
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    // Refresh markers & circles
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();

      const filtered = categoryFilter === 'ALL'
        ? clusters
        : clusters.filter((c) => c.category === categoryFilter);

      filtered.forEach((c) => {
        // Draw spatial circle radius R (default 75m)
        const circle = L.circle([c.centroidLatitude, c.centroidLongitude], {
          radius: radiusFilter,
          color: c.category === 'ROAD_DAMAGE' ? '#ba1a1a' : c.category === 'FLOODING' ? '#00687a' : '#e6ab02',
          fillColor: c.category === 'ROAD_DAMAGE' ? '#ffdad6' : c.category === 'FLOODING' ? '#57dffe' : '#ffddb8',
          fillOpacity: 0.25,
          weight: 2,
        });

        // Custom marker with badge
        const iconHtml = `
          <div style="background-color: ${
            c.category === 'ROAD_DAMAGE' ? '#ba1a1a' : c.category === 'FLOODING' ? '#00687a' : '#1e3a8a'
          }; color: white; border-radius: 9999px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white;">
            ${c.reportCount}
          </div>
        `;
        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-cluster-icon',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const marker = L.marker([c.centroidLatitude, c.centroidLongitude], { icon: customIcon });

        marker.on('click', () => {
          setSelectedCluster(c);
        });

        circle.addTo(layerGroupRef.current!);
        marker.addTo(layerGroupRef.current!);
      });
    }
  }, [clusters, radiusFilter, categoryFilter]);

  return (
    <div className="flex w-full min-h-screen bg-background">
      <OfficerSidebar />

      <main className="pl-64 w-full pt-16 min-h-screen flex flex-col">
        <div className="p-4 md:p-6 flex flex-col gap-4">
          {/* Operations Header Ribbon */}
          <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-xs border border-outline-variant/30 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[26px]">spatial_tracking</span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-bold text-base md:text-lg text-primary uppercase">
                    TRUNG TÂM CHỈ HUY SPATIAL-SEMANTIC TRIAGE P.25
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-bold text-xs">
                    GIS AI LIVE
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-semibold text-xs">
                    Khu vực: P.25 - Bình Thạnh
                  </span>
                </div>
                <span className="text-xs text-on-surface-variant">
                  Gom cụm tự động bằng mô hình Hai Pha: Không gian Redis GEO (R={radiusFilter}m) + Ngữ nghĩa Cosine (τ=0.82)
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <span className="w-2.5 h-2.5 rounded-full bg-error animate-ping"></span>
                <span className="text-on-surface-variant">Khẩn cấp:</span>
                <span className="font-bold text-error">
                  {clusters.filter((c) => c.status === 'OPEN').length} Cụm
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                <span className="text-on-surface-variant">Đang xử lý:</span>
                <span className="font-bold text-secondary">
                  {clusters.filter((c) => c.status === 'INVESTIGATING').length} Cụm
                </span>
              </div>
            </div>
          </div>

          {/* Main Layout: GIS Map (8 cols) & Incident Inspector (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: GIS Map Card */}
            <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl shadow-xs border border-outline-variant/30 overflow-hidden flex flex-col relative h-[680px]">
              {/* Floating Filter Bar */}
              <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 bg-surface-container-lowest/90 backdrop-blur-md p-2 rounded-xl shadow-md border border-outline-variant/30">
                {/* Radius filter */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="font-bold text-primary mr-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">radar</span> Bán kính R:
                  </span>
                  {[50, 75, 100].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRadiusFilter(r)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        radiusFilter === r
                          ? 'bg-primary text-on-primary shadow-xs'
                          : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      {r}m {r === 75 && '(Tối ưu)'}
                    </button>
                  ))}
                </div>

                {/* Category filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-surface-container px-2.5 py-1 rounded-lg text-xs text-on-surface font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tất cả danh mục</option>
                    <option value="ROAD_DAMAGE">Hạ tầng giao thông</option>
                    <option value="FLOODING">Ngập nước</option>
                    <option value="GARBAGE">Vệ sinh môi trường</option>
                    <option value="STREETLIGHT">Chiếu sáng</option>
                  </select>
                </div>
              </div>

              {/* Map Canvas */}
              <div ref={mapContainerRef} className="w-full h-full"></div>
            </div>

            {/* Right: Selected Cluster Inspector */}
            <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl shadow-xs border border-outline-variant/30 p-5 flex flex-col gap-4 overflow-y-auto max-h-[680px]">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                <span className="text-sm font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-secondary">analytics</span>
                  Chi Tiết Cụm Phản Ánh Hiện Trường
                </span>
                {selectedCluster && (
                  <span className="font-mono text-xs font-bold text-secondary bg-surface-container px-2 py-0.5 rounded">
                    {selectedCluster.clusterCode}
                  </span>
                )}
              </div>

              {selectedCluster ? (
                <div className="flex flex-col gap-4 text-xs">
                  <div>
                    <span className="text-on-surface-variant block mb-0.5">Tiêu đề sự cố:</span>
                    <h3 className="text-sm font-bold text-on-surface">{selectedCluster.title}</h3>
                  </div>

                  <div className="p-3 bg-surface-container-low rounded-xl flex flex-col gap-1">
                    <span className="text-on-surface-variant font-medium">Tóm tắt mô tả tổng hợp:</span>
                    <p className="text-on-surface leading-relaxed">{selectedCluster.descriptionSummary}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div className="p-2.5 rounded-lg bg-surface-container-low">
                      <span className="text-on-surface-variant block text-[10px]">Số người phản ánh:</span>
                      <strong className="text-sm text-primary">{selectedCluster.reportCount} lượt báo</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface-container-low">
                      <span className="text-on-surface-variant block text-[10px]">Trạng thái:</span>
                      <strong className="text-sm text-secondary">{selectedCluster.status}</strong>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface-container-low font-mono space-y-1">
                    <div>Tọa độ tâm cụm: {selectedCluster.centroidLatitude.toFixed(6)}, {selectedCluster.centroidLongitude.toFixed(6)}</div>
                    <div>Cập nhật gần nhất: {selectedCluster.lastReportAt}</div>
                  </div>

                  {/* Dispatch action buttons */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/20">
                    <button
                      onClick={() => alert(`Đã điều phối Đội Quản lý Đô thị P.25 xử lý cụm ${selectedCluster.clusterCode}`)}
                      className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px]">send_time_extension</span>
                      Điều Phối Tổ Xử Lý Hiện Trường
                    </button>
                    <button
                      onClick={() => alert(`Đã đánh dấu giải quyết xong cụm ${selectedCluster.clusterCode}`)}
                      className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs border border-outline-variant/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                      Đánh Dấu Hoàn Thành
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-on-surface-variant text-xs">
                  {loading ? 'Đang nạp dữ liệu GIS...' : 'Bấm vào một điểm gộp trên bản đồ để xem chi tiết.'}
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

