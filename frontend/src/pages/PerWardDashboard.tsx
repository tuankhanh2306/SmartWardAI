import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWard } from '../context/WardContext';
import { AN_GIANG_WARDS, type WardItem } from '../data/anGiangWards';
import Pagination from '../components/Pagination';
import {
  getHitlQueue,
  resolveHitlItem,
  rebuildSpatialIndex,
  getIssueClusters,
  updateClusterStatus,
  type HitlGrayZoneItem,
} from '../api/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  AlertTriangle,
  TrendingUp,
  Radio,
  BrainCircuit,
  CheckCircle2,
  RefreshCw,
  BookOpen,
  Sparkles,
  X,
  ChevronRight,
  Search,
  ExternalLink,
  PhoneCall,
  Check,
  FileCheck2,
  ArrowLeft
} from 'lucide-react';

interface LocalIncident {
  id: string;
  category: 'Cơ sở hạ tầng' | 'Môi trường & Rác thải' | 'An ninh trật tự' | 'Chiếu sáng đô thị';
  title: string;
  description?: string;
  address: string;
  lat: number;
  lon: number;
  reportedTime: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  duplicatesMerged: number;
  reporterPhone?: string;
  officerNote?: string;
}

interface QuickDossierItem {
  id: string;
  citizenName: string;
  procedure: string;
  formType: 'CT01' | 'Khai sinh' | 'Kết hôn' | 'Bảo trợ';
  submittedAt: string;
  status: 'PENDING' | 'VALID' | 'HAS_ERRORS';
  cccd: string;
  errorCount: number;
}

export const PerWardDashboard: React.FC = () => {
  const { wardCode } = useParams<{ wardCode: string }>();
  const navigate = useNavigate();
  const { currentWard, setWard } = useWard();

  // Find ward from param or context
  const ward: WardItem =
    AN_GIANG_WARDS.find((w) => w.code === wardCode) || currentWard;

  // Sync with context if wardCode in URL is different
  useEffect(() => {
    if (wardCode && ward.code !== currentWard.code) {
      setWard(ward);
    }
  }, [wardCode, ward, currentWard.code, setWard]);

  // Main Workspace Tab (Decoupled modules)
  const [activeTab, setActiveTab] = useState<'INCIDENTS' | 'HITL' | 'FORMS' | 'MAP'>('INCIDENTS');

  // Search & Filter States
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Progressive Disclosure: Drawer / Modal States (Only open when needed!)
  const [selectedIncident, setSelectedIncident] = useState<LocalIncident | null>(null);
  const [selectedHitlItem, setSelectedHitlItem] = useState<HitlGrayZoneItem | null>(null);

  // HITL Gray-Zone Queue State & Spatial Warm-up State
  const [hitlItems, setHitlItems] = useState<HitlGrayZoneItem[]>([]);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [geoSyncing, setGeoSyncing] = useState<boolean>(false);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getHitlQueue().then((items) => {
      if (!mounted) return;
      setHitlItems(items);
      const initialDrafts: Record<string, string> = {};
      items.forEach((it) => {
        initialDrafts[it.id] = it.suggestedAnswer;
      });
      setDraftAnswers(initialDrafts);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleApproveHitl = async (item: HitlGrayZoneItem) => {
    const editedAnswer = (draftAnswers[item.id] ?? item.suggestedAnswer).trim();
    if (!editedAnswer) return;
    setResolvingId(item.id);
    try {
      const updated = await resolveHitlItem(
        item.id,
        editedAnswer,
        `Công chức Tư pháp - Hộ tịch (${ward.name})`
      );
      setHitlItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, ...updated, status: 'APPROVED' } : it))
      );
      setToastBanner(
        `Đã phê duyệt hồ sơ vùng xám ${item.id} và nạp trực tiếp vào bộ nhớ đệm Redis RAG (TTL 24 giờ).`
      );
      // Close detail modal after approval
      setSelectedHitlItem(null);
      setTimeout(() => setToastBanner(null), 5000);
    } finally {
      setResolvingId(null);
    }
  };

  const handleRebuildGeoIndex = async () => {
    setGeoSyncing(true);
    try {
      const res = await rebuildSpatialIndex();
      setToastBanner(`${res.message} (${res.syncedClustersCount} cụm đang hoạt động).`);
      setTimeout(() => setToastBanner(null), 5000);
    } finally {
      setGeoSyncing(false);
    }
  };

  // Incidents Dataset with Rich Context for Progressive Disclosure
  const [incidents, setIncidents] = useState<LocalIncident[]>([
    {
      id: 'INC-AG-001',
      category: 'Cơ sở hạ tầng',
      title: 'Đường sạt lở mé sông, xuất hiện ổ gà lớn sau mưa lớn',
      description: 'Đoạn đường ven mé sông sạt lở ăn sâu vào lòng đường khoảng 1.2m, tiềm ẩn nguy cơ tai nạn giao thông vào ban đêm. Đã có 3 người dân cùng phản ánh trong sáng nay.',
      address: `Gần cầu ngã ba, ${ward.name}, ${ward.province}`,
      lat: ward.lat + 0.003,
      lon: ward.lon + 0.002,
      reportedTime: '08:15 Sáng nay',
      status: 'IN_PROGRESS',
      urgency: 'HIGH',
      duplicatesMerged: 3,
      reporterPhone: '0918.***.214',
      officerNote: 'Đã cử cán bộ Địa chính - Xây dựng xuống khảo sát, căng dây cảnh báo nguy hiểm.',
    },
    {
      id: 'INC-AG-002',
      category: 'Chiếu sáng đô thị',
      title: 'Hệ thống đèn đường chập chờn đoạn trước trường học',
      description: 'Trụ đèn số 04 trước cổng trường tiểu học bị chập chớp tắt liên tục, học sinh tan học buổi tối gặp khó khăn khi qua đường.',
      address: `Trục đường chính, ${ward.name}, ${ward.province}`,
      lat: ward.lat - 0.002,
      lon: ward.lon + 0.004,
      reportedTime: 'Hôm qua, 18:30',
      status: 'PENDING',
      urgency: 'MEDIUM',
      duplicatesMerged: 1,
      reporterPhone: '0903.***.882',
    },
    {
      id: 'INC-AG-003',
      category: 'Môi trường & Rác thải',
      title: 'Ùn ứ rác sinh hoạt tại khu vực chợ dân sinh',
      description: 'Điểm tập kết rác tạm sau phiên chợ chiều chưa được xe thu gom chuyển đi, gây mùi khó chịu.',
      address: `Cổng chợ địa phương, ${ward.name}, ${ward.province}`,
      lat: ward.lat + 0.001,
      lon: ward.lon - 0.003,
      reportedTime: 'Hôm qua, 09:00',
      status: 'RESOLVED',
      urgency: 'LOW',
      duplicatesMerged: 2,
      reporterPhone: '0977.***.119',
      officerNote: 'Đội vệ sinh môi trường đã hoàn tất thu dọn và phun tiêu độc khử trùng lúc 10h30.',
    },
    {
      id: 'INC-AG-004',
      category: 'Cơ sở hạ tầng',
      title: 'Cầu gỗ dân sinh bắc qua mương rạch bị nứt gãy ván lót',
      description: 'Cầu ván qua kênh rạch có 2 thanh gỗ bị mục gãy, xe máy qua lại nguy hiểm. Cần bố trí ván thay thế gấp.',
      address: `Tổ 4, Ấp An Hòa, ${ward.name}, ${ward.province}`,
      lat: ward.lat + 0.004,
      lon: ward.lon - 0.001,
      reportedTime: '2 ngày trước',
      status: 'IN_PROGRESS',
      urgency: 'HIGH',
      duplicatesMerged: 4,
      reporterPhone: '0939.***.672',
      officerNote: 'Trưởng ấp đã tạm thời rào chắn và liên hệ đơn vị sửa chữa dân sinh.',
    },
    {
      id: 'INC-AG-005',
      category: 'An ninh trật tự',
      title: 'Tụ tập hát karaoke loa kéo công suất lớn quá giờ quy định',
      description: 'Hát loa kéo mở âm lượng lớn từ 22h30 đến khuya gây mất trật tự giấc ngủ khu dân cư.',
      address: `Khu dân cư kênh mới, ${ward.name}, ${ward.province}`,
      lat: ward.lat - 0.003,
      lon: ward.lon - 0.002,
      reportedTime: '3 ngày trước',
      status: 'RESOLVED',
      urgency: 'MEDIUM',
      duplicatesMerged: 2,
      reporterPhone: '0988.***.543',
      officerNote: 'Công an xã đã xuống nhắc nhở, hộ gia đình đã ký cam kết không tái phạm.',
    },
    {
      id: 'INC-AG-006',
      category: 'Môi trường & Rác thải',
      title: 'Cống thoát nước trục lộ liên xã bị tắc nghẽn lục bình',
      description: 'Lục bình dồn ứ sau đợt nước rút làm nghẽn dòng chảy tiêu thoát mương.',
      address: `Ngay cống Ba Răng, ${ward.name}, ${ward.province}`,
      lat: ward.lat + 0.002,
      lon: ward.lon + 0.003,
      reportedTime: '3 ngày trước',
      status: 'RESOLVED',
      urgency: 'LOW',
      duplicatesMerged: 1,
      reporterPhone: '0912.***.334',
    },
    {
      id: 'INC-AG-007',
      category: 'Cơ sở hạ tầng',
      title: 'Biển báo giao thông cua dốc nguy hiểm bị cây cối che khuất',
      description: 'Cành cây mọc sum sê che mất biển báo đường cong nguy hiểm trên tuyến lộ.',
      address: `Đoạn dốc cầu Kênh Ranh, ${ward.name}, ${ward.province}`,
      lat: ward.lat - 0.001,
      lon: ward.lon + 0.001,
      reportedTime: '4 ngày trước',
      status: 'PENDING',
      urgency: 'MEDIUM',
      duplicatesMerged: 1,
      reporterPhone: '0966.***.990',
    },
    {
      id: 'INC-AG-008',
      category: 'Chiếu sáng đô thị',
      title: 'Đèn đường chiếu sáng khu vực nhà sinh hoạt cộng đồng bị cháy',
      description: 'Bóng đèn cao áp trước sân nhà sinh hoạt ấp bị cháy bóng 3 ngày nay.',
      address: `Nhà văn hóa ấp Trung, ${ward.name}, ${ward.province}`,
      lat: ward.lat + 0.005,
      lon: ward.lon - 0.004,
      reportedTime: '5 ngày trước',
      status: 'RESOLVED',
      urgency: 'LOW',
      duplicatesMerged: 2,
      reporterPhone: '0944.***.765',
    },
  ]);

  // Mock Dossiers for Quick Audit Tab Preview
  const quickDossiers: QuickDossierItem[] = [
    {
      id: 'HS-2026-0894',
      citizenName: 'NGUYỄN VĂN AN',
      procedure: 'Đăng ký tạm trú cá nhân',
      formType: 'CT01',
      submittedAt: '08:50 Hôm nay',
      status: 'VALID',
      cccd: '079095012345',
      errorCount: 0,
    },
    {
      id: 'HS-2026-0895',
      citizenName: 'TRẦN THỊ BÍCH NGỌC',
      procedure: 'Đăng ký thường trú về nhà mới',
      formType: 'CT01',
      submittedAt: '09:12 Hôm nay',
      status: 'HAS_ERRORS',
      cccd: '089198004562',
      errorCount: 1,
    },
    {
      id: 'HS-2026-0112',
      citizenName: 'LÊ HOÀNG LONG',
      procedure: 'Đăng ký khai sinh cho trẻ mới sinh',
      formType: 'Khai sinh',
      submittedAt: '09:35 Hôm nay',
      status: 'PENDING',
      cccd: '089026001239',
      errorCount: 0,
    },
    {
      id: 'HS-2026-0043',
      citizenName: 'PHẠM QUỐC DŨNG',
      procedure: 'Đăng ký kết hôn Một cửa',
      formType: 'Kết hôn',
      submittedAt: '10:05 Hôm nay',
      status: 'HAS_ERRORS',
      cccd: '079092014589',
      errorCount: 2,
    },
  ];

  // Filtered incidents based on status & search
  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchSearch =
        !searchKeyword.trim() ||
        item.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        item.address.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        item.id.toLowerCase().includes(searchKeyword.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [incidents, statusFilter, searchKeyword]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / pageSize));
  const paginatedIncidents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIncidents.slice(start, start + pageSize);
  }, [filteredIncidents, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, pageSize, searchKeyword]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Initialize Leaflet map for ward incidents
  useEffect(() => {
    if (activeTab !== 'MAP' || !mapContainerRef.current) return;

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
      html: `<div class="px-3 py-1 rounded-xl bg-[#00236F] text-white border-2 border-white shadow-md text-[11px] font-bold text-center whitespace-nowrap">UBND ${ward.name}</div>`,
      iconSize: [120, 28],
      iconAnchor: [60, 14],
    });
    L.marker([ward.lat, ward.lon], { icon: hqIcon }).addTo(map);

    // Add incident markers
    incidents.forEach((inc) => {
      const markerColor =
        inc.urgency === 'HIGH' ? '#DC2626' : inc.urgency === 'MEDIUM' ? '#D97706' : '#00687A';
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
            <span class="text-[#64748B] block mb-1">${inc.address}</span>
            <div class="flex items-center gap-2 mt-1">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold text-white" style="background:${markerColor}">${inc.urgency}</span>
              <span class="text-[10px] text-[#334155] font-semibold">+${inc.duplicatesMerged} trùng</span>
            </div>
          </div>`
        );
    });

    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [activeTab, ward, incidents]);

  // Sync incidents from localStorage and Backend Clusters API
  useEffect(() => {
    let mounted = true;
    const storageKey = `smartward_incidents_${ward.code}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setIncidents(parsed);
        }
      } catch {
        // ignore
      }
    }

    getIssueClusters().then((clusters) => {
      if (!mounted || !clusters || clusters.length === 0) return;
      const mappedClusters: LocalIncident[] = clusters.map((c) => {
        const catMap: Record<string, LocalIncident['category']> = {
          ROAD_DAMAGE: 'Cơ sở hạ tầng',
          FLOODING: 'Cơ sở hạ tầng',
          ENVIRONMENT: 'Môi trường & Rác thải',
          GARBAGE: 'Môi trường & Rác thải',
          LIGHTING: 'Chiếu sáng đô thị',
          ORDER_SECURITY: 'An ninh trật tự',
        };
        const statusMap: Record<string, LocalIncident['status']> = {
          OPEN: 'PENDING',
          IN_PROGRESS: 'IN_PROGRESS',
          RESOLVED: 'RESOLVED',
        };
        return {
          id: c.clusterCode,
          category: catMap[c.category] || 'Cơ sở hạ tầng',
          title: c.title,
          description: c.descriptionSummary || c.title,
          address: `${ward.name}, ${ward.province}`,
          lat: c.centroidLatitude,
          lon: c.centroidLongitude,
          reportedTime: 'Vừa cập nhật',
          status: statusMap[c.status] || 'PENDING',
          urgency: c.reportCount >= 4 ? 'HIGH' : c.reportCount >= 2 ? 'MEDIUM' : 'LOW',
          duplicatesMerged: c.reportCount,
          reporterPhone: '0988.***.012',
          officerNote: `Hệ thống phân luồng tự động 2 pha (R=75m, tau=0.82).`,
        };
      });

      setIncidents((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newClusters = mappedClusters.filter((mc) => !existingIds.has(mc.id));
        const merged = [...newClusters, ...prev];
        try {
          localStorage.setItem(storageKey, JSON.stringify(merged));
        } catch {
          // ignore
        }
        return merged;
      });
    }).catch(() => {});

    return () => {
      mounted = false;
    };
  }, [ward.code, ward.name, ward.province]);

  const updateIncidentStatus = (id: string, newStatus: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED') => {
    setIncidents((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item));
      try {
        localStorage.setItem(`smartward_incidents_${ward.code}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    if (selectedIncident && selectedIncident.id === id) {
      setSelectedIncident((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    // Call backend status update API asynchronously
    updateClusterStatus(id, newStatus).catch(() => {});

    setToastBanner(`Đã cập nhật sự cố ${id} sang trạng thái: ${newStatus === 'RESOLVED' ? 'Đã hoàn thành' : newStatus === 'IN_PROGRESS' ? 'Đang xử lý' : 'Chờ tiếp nhận'}`);
    setTimeout(() => setToastBanner(null), 4000);
  };

  // Sync ward change directly from dropdown
  const handleWardSelect = (code: string) => {
    const selected = AN_GIANG_WARDS.find((w) => w.code === code);
    if (selected) {
      setWard(selected);
      navigate(`/officer/ward/${selected.code}`);
    }
  };

  // Calculate high-signal metrics
  const pendingIncidentsCount = incidents.filter((i) => i.status === 'PENDING').length;
  const inProgressCount = incidents.filter((i) => i.status === 'IN_PROGRESS').length;
  const pendingHitlCount = hitlItems.filter((i) => i.status === 'PENDING').length;

  return (
    <div className="flex flex-col w-full pb-20 bg-[#F8FAFC]">
      {/* ========================================================================= */}
      {/* 1. TOP CIVIC HEADER & REAL-TIME WARD SELECTOR (SYNCHRONIZED)              */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-r from-[#00236F] via-[#1E3A8A] to-[#0A2540] text-white px-4 md:px-8 py-7 border-b border-[#CBD5E1]/30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate('/onboarding')}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 shrink-0 mt-0.5 cursor-pointer shadow-xs"
              title="Quay lại danh mục địa bàn"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#57DFFE]/20 text-[#BAE6FD] border border-[#57DFFE]/40 uppercase tracking-wider">
                  Bàn Làm Việc Cán Bộ Một Cửa
                </span>
                <span className="text-xs text-[#BAE6FD] font-medium">• Đề Án 06/CP Verified</span>
              </div>

              {/* Synchronized Ward Header with Quick Select Dropdown */}
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
                  UBND {ward.name.toUpperCase()}
                </h1>
                <div className="relative">
                  <select
                    value={ward.code}
                    onChange={(e) => handleWardSelect(e.target.value)}
                    className="bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#57DFFE] transition cursor-pointer appearance-none pr-7"
                    title="Đổi địa bàn xã/phường đang quản lý"
                  >
                    {AN_GIANG_WARDS.map((w) => (
                      <option key={w.code} value={w.code} className="text-[#0F172A] bg-white">
                        {w.name} ({w.type})
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="w-3.5 h-3.5 text-white/80 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                </div>
              </div>

              <p className="text-xs sm:text-sm text-white/80 mt-1 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#57DFFE]" />
                  {ward.officeAddress}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <PhoneCall className="w-3.5 h-3.5 text-[#57DFFE]" />
                  Hotline: <strong>{ward.phoneNumber}</strong>
                </span>
              </p>
            </div>
          </div>

          {/* Quick Action Navigation Dock */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setWard(ward);
                navigate('/citizen');
              }}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#57DFFE]" />
              <span>Giao Diện Dân Sinh</span>
            </button>
            <button
              onClick={() => navigate('/officer/audit')}
              className="px-3.5 py-2 bg-[#57DFFE] hover:bg-[#38BDF8] text-[#00236F] rounded-xl text-xs font-bold shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Bàn Sơ Duyệt Tờ Khai ❯</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. HIGH-SIGNAL METRIC TILES (COMPACT & SYNCHRONIZED)                      */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-4 w-full grid grid-cols-2 lg:grid-cols-4 gap-3.5 z-10">
        {/* KPI 1: Phản ánh cần xử lý */}
        <div
          onClick={() => setActiveTab('INCIDENTS')}
          className="p-4 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex items-center justify-between cursor-pointer hover:border-[#00236F] transition-all"
        >
          <div>
            <span className="text-xs font-bold text-[#64748B] uppercase">Phản ánh cần xử lý</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold text-[#00236F]">{pendingIncidentsCount + inProgressCount}</span>
              <span className="text-xs text-[#64748B]">/ {incidents.length} ca</span>
            </div>
            <span className="text-[11px] text-[#D97706] font-semibold block">
              {pendingIncidentsCount} ca mới chưa tiếp nhận
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Vùng xám AI */}
        <div
          onClick={() => setActiveTab('HITL')}
          className="p-4 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex items-center justify-between cursor-pointer hover:border-[#00236F] transition-all"
        >
          <div>
            <span className="text-xs font-bold text-[#64748B] uppercase">Vùng xám AI (HITL)</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold text-[#78350F]">{pendingHitlCount}</span>
              <span className="text-xs text-[#64748B]">câu hỏi</span>
            </div>
            <span className="text-[11px] text-[#00687A] font-semibold block">
              {hitlItems.length - pendingHitlCount} câu đã nạp cache
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] flex items-center justify-center shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Hồ sơ chờ sơ duyệt */}
        <div
          onClick={() => setActiveTab('FORMS')}
          className="p-4 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex items-center justify-between cursor-pointer hover:border-[#00236F] transition-all"
        >
          <div>
            <span className="text-xs font-bold text-[#64748B] uppercase">Hồ sơ chờ duyệt</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold text-[#00687A]">{quickDossiers.length}</span>
              <span className="text-xs text-[#64748B]">tờ khai</span>
            </div>
            <span className="text-[11px] text-[#16A34A] font-semibold block">
              CT01, Khai sinh, Kết hôn
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] text-[#00687A] border border-[#99F6E4] flex items-center justify-center shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Tỷ lệ đúng hạn */}
        <div className="p-4 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#64748B] uppercase">Tiến độ giải quyết</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold text-[#16A34A]">{ward.solvedRate}%</span>
              <span className="text-xs text-[#64748B]">đúng hạn</span>
            </div>
            <span className="text-[11px] text-[#64748B]">Chuẩn ISO Một Cửa</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#16A34A] border border-[#A7F3D0] flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TOAST NOTIFICATION BANNER                                              */}
      {/* ========================================================================= */}
      {toastBanner && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-4 w-full">
          <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#86EFAC] text-[#166534] text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A34A]" />
              <span>{toastBanner}</span>
            </div>
            <button
              onClick={() => setToastBanner(null)}
              className="text-[#166534] hover:text-[#064E3B] p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. WORKSPACE CONTROLS: DECOUPLED MODULE TABS                              */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 w-full flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#CBD5E1]">
          {/* Segmented Tab Navigator */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-2xl border border-[#CBD5E1] shadow-xs">
            {/* Tab 1 */}
            <button
              type="button"
              onClick={() => setActiveTab('INCIDENTS')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'INCIDENTS'
                  ? 'bg-[#00236F] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#00236F] hover:bg-white'
              }`}
            >
              <span>📋 Phản Ánh Dân Sinh</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                  activeTab === 'INCIDENTS'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#E2E8F0] text-[#00236F]'
                }`}
              >
                {incidents.length}
              </span>
            </button>

            {/* Tab 2 */}
            <button
              type="button"
              onClick={() => setActiveTab('HITL')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'HITL'
                  ? 'bg-[#00236F] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#00236F] hover:bg-white'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Duyệt Vùng Xám AI</span>
              {pendingHitlCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#F59E0B] text-white">
                  {pendingHitlCount}
                </span>
              )}
            </button>

            {/* Tab 3 */}
            <button
              type="button"
              onClick={() => setActiveTab('FORMS')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'FORMS'
                  ? 'bg-[#00236F] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#00236F] hover:bg-white'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Sơ Duyệt Tờ Khai</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#E2E8F0] text-[#00687A]">
                {quickDossiers.length}
              </span>
            </button>

            {/* Tab 4 */}
            <button
              type="button"
              onClick={() => setActiveTab('MAP')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'MAP'
                  ? 'bg-[#00236F] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#00236F] hover:bg-white'
              }`}
            >
              <Radio className="w-4 h-4 text-[#DC2626] animate-pulse" />
              <span>Bản Đồ GIS Địa Bàn</span>
            </button>
          </div>

          <span className="text-xs text-[#64748B] font-medium hidden md:inline">
            💡 Bấm vào từng dòng để mở ngăn chi tiết khi cần xử lý
          </span>
        </div>

        {/* ========================================================================= */}
        {/* MODULE 1: INCIDENTS MANAGEMENT (COMPACT + PROGRESSIVE DISCLOSURE)        */}
        {/* ========================================================================= */}
        {activeTab === 'INCIDENTS' && (
          <div className="bg-white rounded-3xl border border-[#CBD5E1] shadow-xs overflow-hidden flex flex-col">
            {/* Filter and Search Bar */}
            <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#FAF8FF]">
              <div className="flex items-center gap-2 flex-1 max-w-md relative">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm theo mã sự cố, nội dung hoặc địa chỉ..."
                  className="w-full h-9 pl-9 pr-3 text-xs sm:text-sm rounded-xl bg-white border border-[#CBD5E1] focus:outline-none focus:border-[#00236F] text-[#0F172A]"
                />
                {searchKeyword && (
                  <button
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-xl border border-[#CBD5E1] text-xs">
                {(
                  [
                    { key: 'ALL', label: 'Tất cả', count: incidents.length },
                    { key: 'PENDING', label: 'Chờ tiếp nhận', count: pendingIncidentsCount },
                    { key: 'IN_PROGRESS', label: 'Đang xử lý', count: inProgressCount },
                    { key: 'RESOLVED', label: 'Đã xong', count: incidents.filter((i) => i.status === 'RESOLVED').length },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1 ${
                      statusFilter === tab.key
                        ? 'bg-[#00236F] text-white shadow-2xs'
                        : 'text-[#475569] hover:text-[#00236F]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[11px] opacity-80 font-mono">({tab.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* High-Signal Compact Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-[#0F172A]">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-bold text-[#64748B] uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Mã & Giờ Báo</th>
                    <th className="p-4">Lĩnh Vực</th>
                    <th className="p-4">Tiêu Đề & Địa Điểm</th>
                    <th className="p-4 text-center">Mức Độ</th>
                    <th className="p-4 text-center">Trạng Thái</th>
                    <th className="p-4 text-right">Chi Tiết & Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {paginatedIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#64748B]">
                        Không tìm thấy sự cố nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    paginatedIncidents.map((inc) => (
                      <tr
                        key={inc.id}
                        onClick={() => setSelectedIncident(inc)}
                        className={`hover:bg-[#F1F5F9]/70 transition-colors cursor-pointer ${
                          selectedIncident?.id === inc.id ? 'bg-[#EFF6FF]' : ''
                        }`}
                      >
                        <td className="p-4 font-mono font-bold text-[#00236F]">
                          {inc.id}
                          <span className="block text-xs font-sans text-[#64748B] font-normal mt-0.5">
                            {inc.reportedTime}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-[#00687A]">
                          {inc.category}
                        </td>
                        <td className="p-4 max-w-sm">
                          <span className="font-bold block text-[#0F172A] line-clamp-1">
                            {inc.title}
                          </span>
                          <span className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#00687A] shrink-0" />
                            <span>{inc.address}</span>
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              inc.urgency === 'HIGH'
                                ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]'
                                : inc.urgency === 'MEDIUM'
                                ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                                : 'bg-[#F0FDFA] text-[#00687A] border border-[#99F6E4]'
                            }`}
                          >
                            {inc.urgency === 'HIGH' ? 'Khẩn cấp' : inc.urgency === 'MEDIUM' ? 'Trung bình' : 'Bình thường'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                              inc.status === 'RESOLVED'
                                ? 'bg-[#ECFDF5] text-[#166534] border border-[#86EFAC]'
                                : inc.status === 'IN_PROGRESS'
                                ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
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
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedIncident(inc)}
                              className="px-3 py-1.5 rounded-xl bg-[#00236F] hover:bg-[#1E3A8A] text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              <span>Mở xử lý</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
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
              pageSizeOptions={[5, 10, 20]}
              labelSingular="sự cố"
              labelPlural="sự cố"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODULE 2: HITL GRAY-ZONE APPROVAL (COMPACT LIST + ACCORDION/MODAL)        */}
        {/* ========================================================================= */}
        {activeTab === 'HITL' && (
          <div className="bg-white rounded-3xl border border-[#CBD5E1] shadow-xs p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#00236F]">
                  Hàng Đợi Phê Duyệt Câu Hỏi Vùng Xám (Human-in-the-Loop)
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Các câu hỏi dùng từ ngữ địa phương hoặc tình huống hồ sơ riêng biệt cần cán bộ xác nhận trước khi đưa vào bộ nhớ đệm tự động.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] self-start sm:self-auto">
                0.42 ≤ S_max &lt; 0.78
              </span>
            </div>

            {/* Compact List of HITL Items */}
            <div className="grid grid-cols-1 gap-3">
              {hitlItems.map((item) => {
                const isApproved = item.status === 'APPROVED';
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-[#00236F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isApproved ? 'bg-[#F8FAFC] border-[#CBD5E1]' : 'bg-white border-[#CBD5E1] shadow-2xs'
                    }`}
                    onClick={() => setSelectedHitlItem(item)}
                  >
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-[#00236F] bg-[#EAEDFF] px-2 py-0.5 rounded">
                          {item.id}
                        </span>
                        <span className="font-mono font-semibold text-[#D97706] bg-[#FFFBEB] px-2 py-0.5 rounded border border-[#FDE68A]">
                          Khớp: {(item.similarityScore * 100).toFixed(1)}%
                        </span>
                        <span className="text-[#00687A] font-semibold flex items-center gap-1 truncate">
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          {item.candidateProcedureName}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-bold text-[#0F172A] line-clamp-1">
                        "{item.query}"
                      </p>
                      <span className="text-[11px] text-[#64748B]">
                        Thời gian: {item.createdAt} • Người gửi tại: {item.wardName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isApproved
                            ? 'bg-[#ECFDF5] text-[#166534] border border-[#86EFAC]'
                            : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                        }`}
                      >
                        {isApproved ? '✓ Đã duyệt' : '⏳ Chờ duyệt'}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedHitlItem(item)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#00236F] hover:bg-[#1E3A8A] text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>{isApproved ? 'Xem lại' : 'Duyệt phản hồi'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {hitlItems.length === 0 && (
                <div className="p-8 text-center text-[#64748B] text-xs">
                  Hiện không có câu hỏi vùng xám nào cần duyệt.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODULE 3: QUICK DOSSIERS AUDIT OVERVIEW                                   */}
        {/* ========================================================================= */}
        {activeTab === 'FORMS' && (
          <div className="bg-white rounded-3xl border border-[#CBD5E1] shadow-xs p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#00236F]">
                  Hồ Sơ Tờ Khai Chờ Thẩm Định Tại {ward.name}
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Tổng hợp các hồ sơ CT01, Khai sinh, Kết hôn vừa được công dân tiền kiểm tra.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/officer/audit')}
                className="px-4 py-2 bg-[#00236F] hover:bg-[#1E3A8A] text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>Chuyển sang Bàn Sơ Duyệt Chuyên Sâu</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-[#0F172A]">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-bold text-[#64748B] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Mã Hồ Sơ</th>
                    <th className="p-3.5">Công Dân</th>
                    <th className="p-3.5">Loại Thủ Tục</th>
                    <th className="p-3.5">Số Định Danh (CCCD)</th>
                    <th className="p-3.5 text-center">Tiền Kiểm Tra AI</th>
                    <th className="p-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {quickDossiers.map((d) => (
                    <tr key={d.id} className="hover:bg-[#F8FAFC] transition">
                      <td className="p-3.5 font-mono font-bold text-[#00236F]">
                        {d.id}
                        <span className="block text-[11px] font-sans text-[#64748B] font-normal">{d.submittedAt}</span>
                      </td>
                      <td className="p-3.5 font-bold text-[#0F172A]">
                        {d.citizenName}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-[#00687A] block">{d.procedure}</span>
                        <span className="text-[11px] text-[#64748B]">Mẫu: {d.formType}</span>
                      </td>
                      <td className="p-3.5 font-mono text-xs font-bold text-[#334155]">
                        {d.cccd}
                      </td>
                      <td className="p-3.5 text-center">
                        {d.status === 'VALID' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#166534] border border-[#86EFAC] inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-[#16A34A]" /> Hợp lệ
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" /> {d.errorCount} lỗi cần sửa
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => navigate('/officer/audit')}
                          className="px-3 py-1.5 rounded-lg bg-[#EAEDFF] hover:bg-[#DAE2FD] text-[#00236F] text-xs font-bold transition cursor-pointer"
                        >
                          Mở hồ sơ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODULE 4: GIS SPATIAL RADAR MAP                                          */}
        {/* ========================================================================= */}
        {activeTab === 'MAP' && (
          <div className="bg-white rounded-3xl border border-[#CBD5E1] shadow-xs p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
              <span className="text-xs sm:text-sm font-bold text-[#00236F] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#DC2626] animate-pulse shrink-0" />
                Vị Trí Các Điểm Nóng Sự Cố Tại {ward.name} (Tọa độ: {ward.lat.toFixed(4)}, {ward.lon.toFixed(4)})
              </span>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" /> Khẩn cấp
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" /> Trung bình
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00687A]" /> Đã xử lý
                </span>
                <button
                  type="button"
                  onClick={handleRebuildGeoIndex}
                  disabled={geoSyncing}
                  className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-xs font-semibold text-[#00236F] flex items-center gap-1 transition cursor-pointer"
                  title="Đồng bộ lại chỉ mục không gian Redis GEO từ cơ sở dữ liệu PostgreSQL"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${geoSyncing ? 'animate-spin' : ''}`} />
                  <span>{geoSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ Redis GEO'}</span>
                </button>
              </div>
            </div>
            <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-[#CBD5E1] relative z-1 shadow-inner bg-[#E2E8F0]">
              <div ref={mapContainerRef} className="w-full h-full" />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. PROGRESSIVE DISCLOSURE DRAWER: SLIDE-OVER FOR SELECTED INCIDENT        */}
      {/* ========================================================================= */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fadeIn">
          {/* Backdrop click to close */}
          <div
            className="flex-1"
            onClick={() => setSelectedIncident(null)}
          />

          {/* Drawer Body */}
          <div className="w-full sm:w-[500px] md:w-[540px] bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#CBD5E1] animate-slideLeft z-10">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#00236F] text-white">
                  <AlertTriangle className="w-5 h-5 text-[#57DFFE]" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#00236F]">
                      {selectedIncident.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        selectedIncident.urgency === 'HIGH'
                          ? 'bg-[#FEE2E2] text-[#DC2626]'
                          : selectedIncident.urgency === 'MEDIUM'
                          ? 'bg-[#FEF3C7] text-[#D97706]'
                          : 'bg-[#F0FDFA] text-[#00687A]'
                      }`}
                    >
                      {selectedIncident.urgency}
                    </span>
                  </div>
                  <span className="text-xs text-[#64748B] block mt-0.5">
                    Thời gian tiếp nhận: {selectedIncident.reportedTime}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              {/* Incident Title & Category */}
              <div>
                <span className="text-xs font-bold text-[#00687A] uppercase tracking-wider block mb-1">
                  Lĩnh vực: {selectedIncident.category}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#0F172A] leading-snug">
                  {selectedIncident.title}
                </h3>
              </div>

              {/* Duplicate Reports Merged Indicator */}
              <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E40AF] flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
                <span>
                  Hệ thống AI tự động phát hiện và gộp <strong>{selectedIncident.duplicatesMerged} phản ánh trùng lặp</strong> từ công dân trong cùng bán kính 500m.
                </span>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-[#475569]">Mô tả chi tiết hiện trường:</span>
                <p className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs sm:text-sm text-[#0F172A] leading-relaxed">
                  {selectedIncident.description || 'Không có mô tả chi tiết bổ sung.'}
                </p>
              </div>

              {/* Location and Reporter Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px] font-medium">Địa chỉ phát sinh:</span>
                  <span className="font-bold text-[#0F172A] mt-0.5 block">{selectedIncident.address}</span>
                  <span className="font-mono text-[10px] text-[#00687A] mt-1 block">
                    Tọa độ: {selectedIncident.lat.toFixed(4)}, {selectedIncident.lon.toFixed(4)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px] font-medium">Số điện thoại người báo:</span>
                  <span className="font-bold text-[#0F172A] mt-0.5 block">{selectedIncident.reporterPhone || '0912.***.***'}</span>
                  <span className="text-[11px] text-[#16A34A] mt-1 block font-semibold">Đã xác minh qua OTP dân sinh</span>
                </div>
              </div>

              {/* Officer Note */}
              {selectedIncident.officerNote && (
                <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs">
                  <span className="font-bold text-[#166534] block mb-1">Ghi chú cán bộ phụ trách:</span>
                  <p className="text-[#14532D] leading-relaxed">{selectedIncident.officerNote}</p>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col gap-2.5">
              <span className="text-xs font-bold text-[#475569]">Chuyển đổi trạng thái xử lý:</span>
              <div className="flex items-center gap-2">
                {selectedIncident.status !== 'IN_PROGRESS' && (
                  <button
                    type="button"
                    onClick={() => updateIncidentStatus(selectedIncident.id, 'IN_PROGRESS')}
                    className="flex-1 py-2.5 rounded-xl bg-[#00236F] hover:bg-[#1E3A8A] text-white text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    Tiếp Nhận Xử Lý
                  </button>
                )}

                {selectedIncident.status !== 'RESOLVED' && (
                  <button
                    type="button"
                    onClick={() => updateIncidentStatus(selectedIncident.id, 'RESOLVED')}
                    className="flex-1 py-2.5 rounded-xl bg-[#00687A] hover:bg-[#004E5C] text-white text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    Báo Cáo Hoàn Thành
                  </button>
                )}

                {selectedIncident.status === 'RESOLVED' && (
                  <button
                    type="button"
                    onClick={() => updateIncidentStatus(selectedIncident.id, 'PENDING')}
                    className="flex-1 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#475569] text-xs font-bold transition cursor-pointer"
                  >
                    Mở Lại Xử Lý
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] text-xs font-bold hover:bg-[#F1F5F9] cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. PROGRESSIVE DISCLOSURE MODAL: HITL REVIEW & APPROVAL                   */}
      {/* ========================================================================= */}
      {selectedHitlItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl border border-[#CBD5E1] overflow-hidden flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00236F] text-white flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5 text-[#57DFFE]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-[#00236F]">
                    Phê Duyệt Câu Hỏi Vùng Xám: {selectedHitlItem.id}
                  </h3>
                  <span className="text-xs text-[#64748B]">
                    Điểm tương đồng: {(selectedHitlItem.similarityScore * 100).toFixed(1)}% • Ngưỡng chuẩn: 0.42 ≤ S_max &lt; 0.78
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHitlItem(null)}
                className="p-1.5 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1]">
                <span className="text-xs font-bold text-[#64748B] uppercase block mb-1">
                  Câu hỏi gốc của công dân ({selectedHitlItem.wardName}):
                </span>
                <p className="text-sm font-bold text-[#0F172A]">
                  “{selectedHitlItem.query}”
                </p>
                <div className="mt-2 pt-2 border-t border-[#E2E8F0] text-xs text-[#00687A] font-semibold flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>Căn cứ pháp lý gợi ý: {selectedHitlItem.legalReference} ({selectedHitlItem.candidateProcedureName})</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#00236F] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#00687A]" />
                    Nội dung trả lời chuẩn hóa (Cán bộ có thể chỉnh sửa trực tiếp trước khi duyệt):
                  </span>
                </label>
                <textarea
                  rows={6}
                  value={draftAnswers[selectedHitlItem.id] ?? selectedHitlItem.suggestedAnswer}
                  onChange={(e) =>
                    setDraftAnswers((prev) => ({
                      ...prev,
                      [selectedHitlItem.id]: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-3.5 text-xs sm:text-sm text-[#0F172A] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#00236F]"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setDraftAnswers((prev) => ({
                    ...prev,
                    [selectedHitlItem.id]: selectedHitlItem.suggestedAnswer,
                  }))
                }
                className="px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-xs font-bold text-[#475569] transition cursor-pointer"
              >
                Khôi phục bản nháp AI
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedHitlItem(null)}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] text-xs font-bold hover:bg-[#F1F5F9] cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={resolvingId === selectedHitlItem.id}
                  onClick={() => handleApproveHitl(selectedHitlItem)}
                  className="px-4 py-2 rounded-xl bg-[#00236F] hover:bg-[#1E3A8A] text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#57DFFE]" />
                  <span>
                    {resolvingId === selectedHitlItem.id
                      ? 'Đang nạp Cache...'
                      : 'Phê Duyệt & Nạp Cache Redis (24h)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerWardDashboard;
