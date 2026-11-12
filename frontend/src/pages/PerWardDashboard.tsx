import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useWard } from '../context/WardContext';
import { useRole } from '../context/RoleContext';
import { AN_GIANG_WARDS, type WardItem } from '../data/anGiangWards';
import Pagination from '../components/Pagination';
import {
  getHitlQueue,
  resolveHitlItem,
  rebuildSpatialIndex,
  getIssueClusters,
  updateClusterStatus,
  getLiveSubmittedIncidents,
  getLiveSubmittedDossiers,
  updateLiveDossierStatus,
  updateLiveIncidentStatus,
  sendCitizenEmailNotification,
  viewVaultDocument,
  uploadVaultDocument,
  getOfficerDossiers,
  reviewOfficerDossier,
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
  ArrowLeft,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  Mail,
} from 'lucide-react';

interface LocalIncident {
  id: string;
  category: string;
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
  reporterHomeWardName?: string;
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
  citizenEmail?: string;
  contactPhone?: string;
  appointmentCode?: string;
  officerFeedback?: string;
  errorCount: number;
  vaultToken?: string;
  vaultDocId?: string;
  vaultViewUsed?: boolean;
  details?: {
    dob?: string;
    gender?: string;
    address?: string;
    confidence?: number;
    sharpnessScore?: number;
    templateMatched?: boolean;
    issues?: string[];
    vaultToken?: string;
  };
}

export const PerWardDashboard: React.FC = () => {
  const { wardCode } = useParams<{ wardCode: string }>();
  const navigate = useNavigate();
  const { currentWard, setWard } = useWard();
  const { logoutToCitizen, officerProfile } = useRole();

  // Find ward from param or context
  const ward: WardItem =
    AN_GIANG_WARDS.find((w) => w.code === wardCode) || currentWard;

  // Sync with context if wardCode in URL is different
  useEffect(() => {
    if (wardCode && ward.code !== currentWard.code) {
      setWard(ward);
    }
  }, [wardCode, ward, currentWard.code, setWard]);

  // Tab sync with URL search params (Enforce 1 unified Dashboard workspace)
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab')?.toUpperCase();
  const initialTab =
    urlTab === 'FORMS' || urlTab === 'MAP' || urlTab === 'HITL' || urlTab === 'INCIDENTS'
      ? (urlTab as 'INCIDENTS' | 'HITL' | 'FORMS' | 'MAP')
      : 'FORMS';

  const [activeTab, setActiveTab] = useState<'INCIDENTS' | 'HITL' | 'FORMS' | 'MAP'>(initialTab);

  const handleTabChange = (tab: 'INCIDENTS' | 'HITL' | 'FORMS' | 'MAP') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (urlTab && (urlTab === 'FORMS' || urlTab === 'MAP' || urlTab === 'HITL' || urlTab === 'INCIDENTS')) {
      if (urlTab !== activeTab) {
        setActiveTab(urlTab as 'INCIDENTS' | 'HITL' | 'FORMS' | 'MAP');
      }
    }
  }, [urlTab]);

  // Search & Filter States
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Progressive Disclosure: Drawer / Modal States (Only open when needed!)
  const [selectedIncident, setSelectedIncident] = useState<LocalIncident | null>(null);
  const [selectedHitlItem, setSelectedHitlItem] = useState<HitlGrayZoneItem | null>(null);
  const [selectedDossier, setSelectedDossier] = useState<QuickDossierItem | null>(null);
  const [showVaultScan, setShowVaultScan] = useState<boolean>(false);
  const [vaultTokenConsumed, setVaultTokenConsumed] = useState<boolean>(false);
  const [vaultImageBlobUrl, setVaultImageBlobUrl] = useState<string | null>(null);
  const [vaultLoading, setVaultLoading] = useState<boolean>(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [vaultStatus, setVaultStatus] = useState<'IDLE' | 'LOADING' | 'VIEWING' | 'CONSUMED_410' | 'ERROR'>('IDLE');

  // Reset Vault One-Time Token (OTT) state and cleanup blob URL whenever Officer switches selectedDossier
  useEffect(() => {
    if (vaultImageBlobUrl) {
      URL.revokeObjectURL(vaultImageBlobUrl);
      setVaultImageBlobUrl(null);
    }
    setVaultLoading(false);
    setVaultError(null);
    setShowVaultScan(false);

    if (selectedDossier) {
      if (selectedDossier.vaultViewUsed) {
        setVaultStatus('CONSUMED_410');
        setVaultTokenConsumed(true);
      } else {
        setVaultStatus('IDLE');
        setVaultTokenConsumed(false);
      }
    } else {
      setVaultStatus('IDLE');
      setVaultTokenConsumed(false);
    }
  }, [selectedDossier?.id]);

  const handleOpenVaultDocument = async () => {
    if (!selectedDossier) return;

    let token = selectedDossier.vaultToken || selectedDossier.details?.vaultToken;

    // Fallback for legacy demo dossiers: dynamically generate real OTT via uploadVaultDocument
    if (!token) {
      try {
        setVaultLoading(true);
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 250;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, 400, 250);
          ctx.fillStyle = '#0f2942';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(`TỜ KHAI HÀNH CHÍNH - ${selectedDossier.formType}`, 20, 40);
          ctx.font = '12px sans-serif';
          ctx.fillText(`Họ tên: ${selectedDossier.citizenName}`, 20, 80);
          ctx.fillText(`Số CCCD: ${selectedDossier.cccd}`, 20, 110);
          ctx.fillText(`Mã hồ sơ: ${selectedDossier.id}`, 20, 140);
          ctx.fillText(`UBND ${ward.name}`, 20, 170);
        }
        const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b || new Blob()), 'image/png'));
        const formData = new FormData();
        formData.append('file', blob, 'sample_dossier_scan.png');
        formData.append('documentType', 'CIVIC_DOCUMENT');
        const uploadRes = await uploadVaultDocument(formData);
        token = uploadRes.oneTimeToken;
        selectedDossier.vaultToken = token;
      } catch (err: any) {
        setVaultLoading(false);
        setVaultStatus('ERROR');
        setVaultError('Không thể tạo phiên xem bảo mật cho hồ sơ này.');
        return;
      }
    }

    setVaultLoading(true);
    setVaultError(null);

    try {
      // Call GET /api/v1/vault/view/{token}
      const imageBlob = await viewVaultDocument(token);

      // Create object URL displaying decrypted image with Java2D watermark
      const objectUrl = URL.createObjectURL(imageBlob);
      setVaultImageBlobUrl(objectUrl);
      setShowVaultScan(true);
      setVaultStatus('VIEWING');
      setVaultTokenConsumed(true);
      selectedDossier.vaultViewUsed = true;
    } catch (err: any) {
      // Catch HTTP 410 GONE (Atomic Self-Destruction via Redis GETDEL)
      if (err?.response?.status === 410 || err?.status === 410) {
        setVaultStatus('CONSUMED_410');
        setVaultTokenConsumed(true);
        setShowVaultScan(false);
        if (vaultImageBlobUrl) {
          URL.revokeObjectURL(vaultImageBlobUrl);
          setVaultImageBlobUrl(null);
        }
        setVaultError('Tài liệu bảo mật đã tự hủy theo Nghị định 13/2023/NĐ-CP.');
      } else {
        setVaultStatus('ERROR');
        setVaultError(err?.message || 'Không thể truy xuất tài liệu từ kho Zero-Trust.');
      }
    } finally {
      setVaultLoading(false);
    }
  };

  const handleCloseVaultDocument = () => {
    if (vaultImageBlobUrl) {
      URL.revokeObjectURL(vaultImageBlobUrl);
      setVaultImageBlobUrl(null);
    }
    setShowVaultScan(false);
    setVaultStatus('CONSUMED_410');
    setVaultTokenConsumed(true);
    if (selectedDossier) {
      selectedDossier.vaultViewUsed = true;
    }
  };

  // Dossier Tab Filter & Search
  const [dossierFilter, setDossierFilter] = useState<'ALL' | 'VALID' | 'HAS_ERRORS' | 'PENDING'>('ALL');
  const [dossierSearch, setDossierSearch] = useState<string>('');

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
        `Đã phê duyệt nội dung hướng dẫn cho câu hỏi ${item.id} và cập nhật vào hệ thống giải đáp tự động.`
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
      await rebuildSpatialIndex();
      setToastBanner(`Đã cập nhật dữ liệu vị trí sự cố trên bản đồ địa bàn ${ward.name}.`);
      setTimeout(() => setToastBanner(null), 5000);
    } finally {
      setGeoSyncing(false);
    }
  };

  // Build ward-scoped default incidents around the selected ward's coordinates
  const buildDefaultWardIncidents = (targetWard: WardItem): LocalIncident[] => [
    {
      id: `INC-${targetWard.code}-001`,
      category: 'Cơ sở hạ tầng',
      title: 'Đường sạt lở mé sông, xuất hiện ổ gà lớn sau mưa lớn',
      description: 'Đoạn đường ven mé sông sạt lở ăn sâu vào lòng đường khoảng 1.2m, tiềm ẩn nguy cơ tai nạn giao thông vào ban đêm. Đã có 3 người dân cùng phản ánh trong sáng nay.',
      address: `Gần cầu ngã ba, ${targetWard.name}, ${targetWard.province}`,
      lat: targetWard.lat + 0.0022,
      lon: targetWard.lon + 0.0018,
      reportedTime: '08:15 Sáng nay',
      status: 'IN_PROGRESS',
      urgency: 'HIGH',
      duplicatesMerged: 3,
      reporterPhone: '0918.***.214',
      officerNote: 'Đã cử cán bộ Địa chính - Xây dựng xuống khảo sát, căng dây cảnh báo nguy hiểm.',
    },
    {
      id: `INC-${targetWard.code}-002`,
      category: 'Chiếu sáng đô thị',
      title: 'Hệ thống đèn đường chập chờn đoạn trước trường học',
      description: 'Trụ đèn số 04 trước cổng trường tiểu học bị chập chớp tắt liên tục, học sinh tan học buổi tối gặp khó khăn khi qua đường.',
      address: `Trục đường chính, ${targetWard.name}, ${targetWard.province}`,
      lat: targetWard.lat - 0.0018,
      lon: targetWard.lon + 0.0028,
      reportedTime: 'Hôm qua, 18:30',
      status: 'PENDING',
      urgency: 'MEDIUM',
      duplicatesMerged: 1,
      reporterPhone: '0903.***.882',
    },
    {
      id: `INC-${targetWard.code}-003`,
      category: 'Môi trường & Rác thải',
      title: 'Ùn ứ rác sinh hoạt tại khu vực chợ dân sinh',
      description: 'Điểm tập kết rác tạm sau phiên chợ chiều chưa được xe thu gom chuyển đi, gây mùi khó chịu.',
      address: `Cổng chợ địa phương, ${targetWard.name}, ${targetWard.province}`,
      lat: targetWard.lat + 0.0012,
      lon: targetWard.lon - 0.0024,
      reportedTime: 'Hôm qua, 09:00',
      status: 'RESOLVED',
      urgency: 'LOW',
      duplicatesMerged: 2,
      reporterPhone: '0977.***.119',
      officerNote: 'Đội vệ sinh môi trường đã hoàn tất thu dọn và phun tiêu độc khử trùng lúc 10h30.',
    },
    {
      id: `INC-${targetWard.code}-004`,
      category: 'Cơ sở hạ tầng',
      title: 'Cầu dân sinh bắc qua mương rạch bị hư hỏng mặt cầu',
      description: 'Mặt cầu qua kênh rạch có nhịp bị nứt gãy, xe máy qua lại nguy hiểm. Cần bố trí gia cố gấp.',
      address: `Tổ 4, Khu dân cư trung tâm, ${targetWard.name}, ${targetWard.province}`,
      lat: targetWard.lat + 0.0031,
      lon: targetWard.lon - 0.0012,
      reportedTime: '2 ngày trước',
      status: 'IN_PROGRESS',
      urgency: 'HIGH',
      duplicatesMerged: 4,
      reporterPhone: '0939.***.672',
      officerNote: 'Tổ công tác đã tạm thời rào chắn và liên hệ đơn vị sửa chữa dân sinh.',
    },
    {
      id: `INC-${targetWard.code}-005`,
      category: 'An ninh trật tự',
      title: 'Tụ tập hát karaoke loa kéo công suất lớn quá giờ quy định',
      description: 'Hát loa kéo mở âm lượng lớn từ 22h30 đến khuya gây mất trật tự giấc ngủ khu dân cư.',
      address: `Khu dân cư kênh mới, ${targetWard.name}, ${targetWard.province}`,
      lat: targetWard.lat - 0.0025,
      lon: targetWard.lon - 0.0019,
      reportedTime: '3 ngày trước',
      status: 'RESOLVED',
      urgency: 'MEDIUM',
      duplicatesMerged: 2,
      reporterPhone: '0988.***.543',
      officerNote: 'Công an địa phương đã xuống nhắc nhở, hộ gia đình đã ký cam kết không tái phạm.',
    },
    {
      id: `INC-${targetWard.code}-006`,
      category: 'Môi trường & Rác thải',
      title: 'Cống thoát nước trục lộ chính bị tắc nghẽn sau mưa',
      description: 'Rác và lục bình dồn ứ sau đợt mưa lớn làm nghẽn dòng chảy tiêu thoát nước.',
      address: `Tuyến đường liên khóm/ấp, ${targetWard.name}, ${targetWard.province}`,
      lat: targetWard.lat + 0.0019,
      lon: targetWard.lon + 0.0026,
      reportedTime: '3 ngày trước',
      status: 'RESOLVED',
      urgency: 'LOW',
      duplicatesMerged: 1,
      reporterPhone: '0912.***.334',
    },
    {
      id: `INC-${targetWard.code}-007`,
      category: 'Cơ sở hạ tầng',
      title: 'Biển báo giao thông khúc cua bị cây cối che khuất',
      description: 'Cành cây mọc sum sê che mất biển báo giao thông trên tuyến lộ chính.',
      address: `Đoạn giao lộ trung tâm, ${targetWard.name}, ${targetWard.province}`,
      lat: targetWard.lat - 0.0011,
      lon: targetWard.lon + 0.0014,
      reportedTime: '4 ngày trước',
      status: 'PENDING',
      urgency: 'MEDIUM',
      duplicatesMerged: 1,
      reporterPhone: '0966.***.990',
    },
    {
      id: `INC-${targetWard.code}-008`,
      category: 'Chiếu sáng đô thị',
      title: 'Đèn đường chiếu sáng khu vực nhà sinh hoạt cộng đồng bị cháy',
      description: 'Bóng đèn cao áp trước sân nhà sinh hoạt cộng đồng bị cháy bóng 3 ngày nay.',
      address: `Nhà sinh hoạt cộng đồng, ${targetWard.name}, ${targetWard.province}`,
      lat: targetWard.lat + 0.0036,
      lon: targetWard.lon - 0.0031,
      reportedTime: '5 ngày trước',
      status: 'RESOLVED',
      urgency: 'LOW',
      duplicatesMerged: 2,
      reporterPhone: '0944.***.765',
    },
  ];

  // Incidents Dataset with Rich Context for Progressive Disclosure (Unified single loader below)
  const [incidents, setIncidents] = useState<LocalIncident[]>(() => buildDefaultWardIncidents(ward));

  // Dossiers Dataset with Rich Context for In-Place Audit
  const [dossiers, setDossiers] = useState<QuickDossierItem[]>([
    {
      id: 'CT01-2026-0894',
      citizenName: 'NGUYỄN VĂN AN',
      procedure: 'Đăng ký tạm trú cá nhân',
      formType: 'CT01',
      submittedAt: '08:50 Hôm nay',
      status: 'VALID',
      cccd: '079095012345',
      errorCount: 0,
      details: {
        dob: '15/08/1995',
        gender: 'Nam',
        address: `Số 12, Đường Thoại Ngọc Hầu, ${ward.name}, Tỉnh An Giang`,
        confidence: 98.6,
        issues: [],
      },
    },
    {
      id: 'CT01-2026-0895',
      citizenName: 'TRẦN THỊ BÍCH NGỌC',
      procedure: 'Đăng ký thường trú về nhà mới',
      formType: 'CT01',
      submittedAt: '09:12 Hôm nay',
      status: 'HAS_ERRORS',
      cccd: '089198004562',
      errorCount: 1,
      details: {
        dob: '22/11/1998',
        gender: 'Nữ',
        address: `Ấp An Thạnh, ${ward.name}, Tỉnh An Giang`,
        confidence: 97.4,
        issues: ['Mục 11: Chưa có xác nhận chữ ký của chủ hộ hợp pháp'],
      },
    },
    {
      id: 'KS-2026-0112',
      citizenName: 'LÊ HOÀNG LONG',
      procedure: 'Liên thông Đăng ký khai sinh & cấp thẻ BHYT',
      formType: 'Khai sinh',
      submittedAt: '09:35 Hôm nay',
      status: 'PENDING',
      cccd: '089026001239',
      errorCount: 0,
      details: {
        dob: '01/11/2026',
        gender: 'Nam',
        address: `Khóm 2, ${ward.name}, Tỉnh An Giang`,
        confidence: 99.0,
        issues: [],
      },
    },
    {
      id: 'KH-2026-0043',
      citizenName: 'PHẠM QUỐC DŨNG & VŨ MAI ANH',
      procedure: 'Đăng ký kết hôn Một cửa điện tử',
      formType: 'Kết hôn',
      submittedAt: '10:05 Hôm nay',
      status: 'HAS_ERRORS',
      cccd: '079092014589',
      errorCount: 2,
      details: {
        dob: '10/04/1992',
        gender: 'Nam',
        address: `Tổ 5, Ấp Phú Hưng, ${ward.name}, An Giang`,
        confidence: 91.2,
        issues: [
          'Đối tác nữ chưa đủ 18 tuổi tròn tính theo ngày sinh CCCD',
          'Thiếu Giấy xác nhận tình trạng hôn nhân của bên cư trú ngoài xã',
        ],
      },
    },
  ]);

  const [officerCustomNote, setOfficerCustomNote] = useState<string>('');

  // Sync citizen dossiers directly from PostgreSQL database API (F11) + local live precheck submissions
  useEffect(() => {
    let mounted = true;

    const localDossiers = getLiveSubmittedDossiers();
    if (localDossiers.length > 0) {
      setDossiers((prev) => {
        const localIds = new Set(localDossiers.map((l) => l.id));
        const remaining = prev.filter((p) => !localIds.has(p.id));
        return [...localDossiers, ...remaining];
      });
    }

    // Load from PostgreSQL database
    getOfficerDossiers(ward.code)
      .then((dbDossiers) => {
        if (!mounted || !dbDossiers || dbDossiers.length === 0) return;
        const mapped: QuickDossierItem[] = dbDossiers.map((s) => {
          const formType: QuickDossierItem['formType'] =
            s.procedureCode.includes('HT-01') || s.procedureCode.includes('CR-01')
              ? 'Khai sinh'
              : s.procedureCode.includes('HT-02') || s.procedureCode.includes('CR-03')
              ? 'Kết hôn'
              : s.procedureCode.includes('BT')
              ? 'Bảo trợ'
              : 'CT01';

          const vaultToken =
            Array.isArray(s.vaultDocIds) && s.vaultDocIds.length > 0 ? s.vaultDocIds[0] : undefined;

          return {
            id: s.dossierCode,
            citizenName: s.citizenName || 'Công dân nộp hồ sơ',
            procedure: s.procedureName || s.procedureCode,
            formType,
            submittedAt: s.createdAt
              ? new Date(s.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
                ' ' +
                new Date(s.createdAt).toLocaleDateString('vi-VN')
              : 'Vừa nộp',
            status:
              s.status === 'APPROVED'
                ? 'VALID'
                : s.status === 'SUPPLEMENT_REQUIRED' || s.status === 'REJECTED'
                ? 'HAS_ERRORS'
                : 'PENDING',
            cccd: s.citizenCccd,
            citizenEmail: (s.formData as any)?.email || (s.formData as any)?.citizenEmail || 'khanhblue06@gmail.com',
            contactPhone: (s.formData as any)?.phone || (s.formData as any)?.phoneNumber || '0918234567',
            appointmentCode: s.appointmentCode,
            officerFeedback: s.officerFeedback,
            errorCount: s.status === 'SUPPLEMENT_REQUIRED' ? 1 : 0,
            vaultToken,
            vaultDocId: vaultToken,
            details: {
              dob: (s.formData as any)?.dob || (s.formData as any)?.ngaySinh || 'Chưa cung cấp',
              gender: (s.formData as any)?.gender || (s.formData as any)?.gioiTinh || 'Nam',
              address: (s.formData as any)?.address || (s.formData as any)?.diaChi || `${ward.name}, An Giang`,
              confidence: 99.0,
              sharpnessScore: (s.formData as any)?.sharpnessScore ?? 96,
              templateMatched: (s.formData as any)?.templateMatched ?? true,
              issues: s.officerFeedback ? [s.officerFeedback] : [],
              vaultToken,
            },
          };
        });
        if (mapped.length > 0) {
          setDossiers((prev) => {
            const dbIds = new Set(mapped.map((m) => m.id));
            const remaining = prev.filter((p) => !dbIds.has(p.id));
            return [...mapped, ...remaining];
          });
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải danh sách hồ sơ từ API PostgreSQL:', err);
      });

    return () => {
      mounted = false;
    };
  }, [ward.code, ward.name]);

  // Filtered dossiers based on status & search
  const filteredDossiers = useMemo(() => {
    return dossiers.filter((d) => {
      const matchStatus = dossierFilter === 'ALL' || d.status === dossierFilter;
      const matchSearch =
        !dossierSearch.trim() ||
        d.citizenName.toLowerCase().includes(dossierSearch.toLowerCase()) ||
        d.cccd.includes(dossierSearch.trim()) ||
        d.id.toLowerCase().includes(dossierSearch.toLowerCase()) ||
        d.procedure.toLowerCase().includes(dossierSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [dossiers, dossierFilter, dossierSearch]);

  const handleApproveDossier = async (dossierId: string) => {
    const target = dossiers.find((d) => d.id === dossierId);
    const reviewer = `${officerProfile.name} (${officerProfile.badgeId} • UBND ${ward.name})`;
    const feedback =
      officerCustomNote.trim() ||
      `Hồ sơ đã được công chức Một cửa UBND ${ward.name} sơ duyệt HỢP LỆ. Kính mời công dân mang bản chính đến Quầy Một cửa (Luồng ưu tiên Đã sơ duyệt) để ký trực tiếp và nhận kết quả.`;
    const appointmentCode = `LH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const recipientEmail = target?.citizenEmail || 'khanhblue06@gmail.com';

    try {
      await reviewOfficerDossier(dossierId, {
        status: 'APPROVED',
        officerFeedback: feedback,
        appointmentCode,
      });
    } catch (err) {
      console.warn('Review API update failed, keeping optimistic state:', err);
    }

    updateLiveDossierStatus(dossierId, 'VALID', feedback, reviewer, appointmentCode);
    sendCitizenEmailNotification({
      dossierId,
      recipientEmail,
      citizenName: target?.citizenName || 'CÔNG DÂN',
      subject: `[UBND ${ward.name}] Kết quả Sơ duyệt Hồ sơ ${dossierId}: HỢP LỆ - Cấp Phiếu Hẹn Mã QR (${appointmentCode})`,
      status: 'APPROVED',
      wardName: ward.name,
      reviewerName: reviewer,
      feedbackText: feedback,
      appointmentCode,
    });

    setDossiers((prev) =>
      prev.map((d) =>
        d.id === dossierId
          ? { ...d, status: 'VALID', errorCount: 0, officerFeedback: feedback, appointmentCode }
          : d
      )
    );
    setOfficerCustomNote('');
    setToastBanner(
      `Đã sơ duyệt HỢP LỆ hồ sơ ${dossierId}, cấp Mã QR ${appointmentCode} và gửi Email thông báo tới ${recipientEmail}!`
    );
    setTimeout(() => setToastBanner(null), 5000);
    setSelectedDossier(null);
  };

  const handleRequestSupplement = async (dossierId: string) => {
    const target = dossiers.find((d) => d.id === dossierId);
    const reviewer = `${officerProfile.name} (${officerProfile.badgeId} • UBND ${ward.name})`;
    const feedback =
      officerCustomNote.trim() ||
      `Đề nghị công dân kiểm tra, chỉnh sửa lại thông tin sai lệch trên tờ khai giấy gốc và gửi lại ảnh chụp rõ nét để cán bộ Một cửa UBND ${ward.name} sơ duyệt lại.`;
    const recipientEmail = target?.citizenEmail || 'khanhblue06@gmail.com';

    try {
      await reviewOfficerDossier(dossierId, {
        status: 'SUPPLEMENT_REQUIRED',
        officerFeedback: feedback,
      });
    } catch (err) {
      console.warn('Review API update failed, keeping optimistic state:', err);
    }

    updateLiveDossierStatus(dossierId, 'HAS_ERRORS', feedback, reviewer);
    sendCitizenEmailNotification({
      dossierId,
      recipientEmail,
      citizenName: target?.citizenName || 'CÔNG DÂN',
      subject: `[UBND ${ward.name}] Thông báo cần chỉnh sửa/bổ sung Hồ sơ sơ duyệt ${dossierId}`,
      status: 'SUPPLEMENT_REQUIRED',
      wardName: ward.name,
      reviewerName: reviewer,
      feedbackText: feedback,
    });

    setDossiers((prev) =>
      prev.map((d) =>
        d.id === dossierId
          ? { ...d, status: 'HAS_ERRORS', errorCount: Math.max(1, d.errorCount), officerFeedback: feedback }
          : d
      )
    );
    setOfficerCustomNote('');
    setToastBanner(`Đã gửi Email hướng dẫn chỉnh sửa hồ sơ ${dossierId} tới ${recipientEmail}!`);
    setTimeout(() => setToastBanner(null), 5000);
    setSelectedDossier(null);
  };

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
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet map container when MAP tab is active, with ResizeObserver to prevent gray partial tiles
  useEffect(() => {
    if (activeTab !== 'MAP' || !mapContainerRef.current) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
      return;
    }

    const container = mapContainerRef.current;

    if (!mapInstanceRef.current) {
      const map = L.map(container, {
        zoomControl: false,
        preferCanvas: true,
      }).setView([ward.lat, ward.lon], 15);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const tileLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi', {
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Google Maps &bull; Dữ liệu GIS Hành chính An Giang',
        maxZoom: 20,
        keepBuffer: 4,
      });

      // Automatically fall back to CartoDB Voyager CDN if any tile request fails
      tileLayer.on('tileerror', (err: any) => {
        const tile = err?.tile as HTMLImageElement | undefined;
        const coords = err?.coords;
        if (tile && coords && !tile.dataset.fallback) {
          tile.dataset.fallback = '1';
          tile.src = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${coords.z}/${coords.x}/${coords.y}.png`;
        }
      });

      tileLayer.addTo(map);
      const markersLayer = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = markersLayer;
    }

    const map = mapInstanceRef.current;

    // Multi-stage invalidateSize + ResizeObserver so container dimensions are always 100% accurate
    const rafId = requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
    });
    const t1 = setTimeout(() => map.invalidateSize({ animate: false }), 100);
    const t2 = setTimeout(() => map.invalidateSize({ animate: false }), 350);
    const t3 = setTimeout(() => map.invalidateSize({ animate: false }), 700);

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
      clearTimeout(t3);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [activeTab]);

  // Update map camera & incident markers whenever ward or incidents change (without destroying the map!)
  useEffect(() => {
    if (activeTab !== 'MAP' || !mapInstanceRef.current || !markersLayerRef.current) return;

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

    markersLayer.clearLayers();
    map.setView([ward.lat, ward.lon], 15, { animate: false });
    map.invalidateSize({ animate: false });

    // 1. Add Ward Administrative Coverage Circle (R = 500m overview) & HQ Marker
    L.circle([ward.lat, ward.lon], {
      radius: 450,
      color: '#00236F',
      weight: 1.5,
      dashArray: '6, 6',
      fillColor: '#38BDF8',
      fillOpacity: 0.07,
    }).addTo(markersLayer);

    const hqIcon = L.divIcon({
      className: 'custom-hq-marker',
      html: `<div class="px-3 py-1 rounded-xl bg-[#00236F] text-white border-2 border-white shadow-lg text-[11px] font-bold text-center whitespace-nowrap">🏛️ UBND ${ward.name}</div>`,
      iconSize: [145, 28],
      iconAnchor: [72, 14],
    });
    L.marker([ward.lat, ward.lon], { icon: hqIcon })
      .addTo(markersLayer)
      .bindPopup(
        `<div class="p-2 text-xs font-sans">
          <b class="text-[#00236F] block mb-1">Trụ sở UBND ${ward.name}</b>
          <span class="text-[#64748B] block mb-1">${ward.officeAddress}</span>
          <span class="text-[11px] font-bold text-[#00687A]">📞 Hotline: ${ward.phoneNumber}</span>
        </div>`
      );

    // 2. Add Incident Markers + R=25m Spatial Deduplication Circles
    incidents.forEach((inc) => {
      const markerColor =
        inc.urgency === 'HIGH' ? '#DC2626' : inc.urgency === 'MEDIUM' ? '#D97706' : '#00687A';

      // R = 25m spatial clustering radius ring around each incident hotspot
      L.circle([inc.lat, inc.lon], {
        radius: 25,
        color: markerColor,
        weight: 1.5,
        fillColor: markerColor,
        fillOpacity: 0.2,
      }).addTo(markersLayer);

      const incIcon = L.divIcon({
        className: 'custom-inc-marker',
        html: `<div style="background-color: ${markerColor}" class="w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-110 transition-transform">!</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([inc.lat, inc.lon], { icon: incIcon })
        .addTo(markersLayer)
        .bindPopup(
          `<div class="p-2 text-xs font-sans">
            <b class="text-[#0F2942] block mb-1">${inc.title}</b>
            <span class="text-[#64748B] block mb-1">${inc.address}</span>
            <div class="flex items-center gap-2 mt-1">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold text-white" style="background:${markerColor}">${inc.urgency}</span>
              <span class="text-[10px] text-[#334155] font-semibold">${inc.duplicatesMerged} phản ánh cùng điểm</span>
            </div>
          </div>`
        );

      marker.on('dblclick', () => {
        setSelectedIncident(inc);
      });
    });
  }, [activeTab, ward.code, ward.lat, ward.lon, ward.name, ward.officeAddress, ward.phoneNumber, incidents]);

  // Clean up map instance on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Sync incidents from ward defaults, localStorage, live citizen reports, and Backend Clusters API
  useEffect(() => {
    let mounted = true;
    const storageKey = `smartward_incidents_${ward.code}`;
    let baseIncidents = buildDefaultWardIncidents(ward);

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Verify saved incidents actually belong near this ward (within ~0.08 deg ~ 8km)
          const belongsToWard = parsed.some(
            (p: any) =>
              typeof p.lat === 'number' &&
              typeof p.lon === 'number' &&
              Math.abs(p.lat - ward.lat) < 0.08 &&
              Math.abs(p.lon - ward.lon) < 0.08
          );
          if (belongsToWard) {
            baseIncidents = parsed;
          }
        }
      } catch {
        // ignore
      }
    }

    // Merge any live citizen-submitted incidents routed to this ward
    const liveAll = getLiveSubmittedIncidents();
    const matchingLive: LocalIncident[] = liveAll
      .filter(
        (item) =>
          item.wardCode === ward.code ||
          item.wardName.toLowerCase() === ward.name.toLowerCase()
      )
      .map((item) => ({
        id: item.id,
        category: item.category,
        title: item.title,
        description: item.description,
        address: item.address,
        lat: item.lat,
        lon: item.lon,
        reportedTime: item.reportedTime,
        status: item.status,
        urgency: item.urgency,
        duplicatesMerged: item.duplicatesMerged,
        reporterPhone: item.reporterPhone,
        reporterHomeWardName: item.reporterHomeWardName,
        officerNote: item.officerNote,
      }));

    const existingBaseIds = new Set(baseIncidents.map((i) => i.id));
    const mergedInitial = [
      ...matchingLive.filter((m) => !existingBaseIds.has(m.id)),
      ...baseIncidents,
    ];
    setIncidents(mergedInitial);

    getIssueClusters().then((clusters) => {
      if (!mounted || !clusters || clusters.length === 0) return;
      // Only include clusters geographically near this ward (within ~12km / 0.12 deg) so foreign coords never pollute the map
      const nearbyClusters = clusters.filter(
        (c) =>
          Math.abs(c.centroidLatitude - ward.lat) < 0.12 &&
          Math.abs(c.centroidLongitude - ward.lon) < 0.12
      );
      if (nearbyClusters.length === 0) return;
      const mappedClusters: LocalIncident[] = nearbyClusters.map((c) => {
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
          officerNote: `Đã tổng hợp các phản ánh trùng vị trí từ người dân.`,
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
    const noteText =
      newStatus === 'RESOLVED'
        ? `Tổ công tác UBND ${ward.name} (${officerProfile.name}) đã hoàn tất xử lý và khắc phục hiện trường.`
        : newStatus === 'IN_PROGRESS'
        ? `Cán bộ trực ban UBND ${ward.name} (${officerProfile.name}) đã tiếp nhận và cử lực lượng xuống hiện trường.`
        : `Đã mở lại hồ sơ sự cố để kiểm tra bổ sung.`;

    updateLiveIncidentStatus(id, newStatus, noteText);

    setIncidents((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, status: newStatus, officerNote: noteText } : item
      );
      try {
        localStorage.setItem(`smartward_incidents_${ward.code}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    if (selectedIncident && selectedIncident.id === id) {
      setSelectedIncident((prev) =>
        prev ? { ...prev, status: newStatus, officerNote: noteText } : null
      );
    }

    // Call backend status update API asynchronously
    updateClusterStatus(id, newStatus).catch(() => {});

    setToastBanner(`Đã cập nhật sự cố ${id} sang trạng thái: ${newStatus === 'RESOLVED' ? 'Đã hoàn thành' : newStatus === 'IN_PROGRESS' ? 'Đang xử lý' : 'Chờ tiếp nhận'} (Đã đồng bộ về Cổng Công Dân)`);
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
      {/* 1. COMPACT OFFICER JURISDICTION STRIP (NO DUPLICATE HEADER)               */}
      {/* ========================================================================= */}
      <section className="bg-[#0F2942] text-white px-4 md:px-8 py-4 border-b border-[#1E3A5F] shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/onboarding')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 shrink-0 cursor-pointer"
              title="Quay lại danh mục 96 xã/phường"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-[#38BDF8] uppercase tracking-wider">
                  Trực Ban Một Cửa • {officerProfile.badgeId}
                </span>
                <span className="text-sm sm:text-base font-extrabold tracking-tight">
                  Phụ trách địa bàn:
                </span>
                <div className="relative">
                  <select
                    value={ward.code}
                    onChange={(e) => handleWardSelect(e.target.value)}
                    className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#38BDF8] transition cursor-pointer appearance-none pr-7"
                    title="Đổi địa bàn xã/phường đang quản lý"
                  >
                    {AN_GIANG_WARDS.map((w) => (
                      <option key={w.code} value={w.code} className="text-[#0F172A] bg-white">
                        UBND {w.name} ({w.type})
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="w-3.5 h-3.5 text-white/80 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                </div>
              </div>

              <p className="text-xs text-white/75 mt-1 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
                  Cán bộ trực: <strong>{officerProfile.name}</strong> ({officerProfile.title})
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" />
                  {ward.officeAddress}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <PhoneCall className="w-3.5 h-3.5 text-[#38BDF8]" />
                  Đường dây nóng: <strong>{ward.phoneNumber}</strong>
                </span>
              </p>
            </div>
          </div>

          {/* Quick Action Navigation Dock */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setWard(ward);
                logoutToCitizen();
              }}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/15 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="Chuyển sang Cổng Công Dân"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Cổng Dân Sinh</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. HIGH-SIGNAL METRIC TILES (COMPACT & SYNCHRONIZED)                      */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-4 w-full grid grid-cols-2 lg:grid-cols-4 gap-3.5 z-10">
        {/* KPI 1: Phản ánh cần xử lý */}
        <div
          onClick={() => handleTabChange('INCIDENTS')}
          className="p-4 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex items-center justify-between cursor-pointer hover:border-[#0F2942] transition-all"
        >
          <div>
            <span className="text-xs font-bold text-[#64748B] uppercase">Phản ánh cần xử lý</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold text-[#0F2942]">{pendingIncidentsCount + inProgressCount}</span>
              <span className="text-xs text-[#64748B]">/ {incidents.length} ca</span>
            </div>
            <span className="text-xs text-[#D97706] font-semibold block">
              {pendingIncidentsCount} ca mới chưa tiếp nhận
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Câu hỏi cần giải đáp */}
        <div
          onClick={() => handleTabChange('HITL')}
          className="p-4 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex items-center justify-between cursor-pointer hover:border-[#0F2942] transition-all"
        >
          <div>
            <span className="text-xs font-bold text-[#64748B] uppercase">Câu hỏi cần giải đáp</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold text-[#0F2942]">{pendingHitlCount}</span>
              <span className="text-xs text-[#64748B]">câu hỏi</span>
            </div>
            <span className="text-xs text-[#0F766E] font-semibold block">
              {hitlItems.length - pendingHitlCount} câu đã phản hồi
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] flex items-center justify-center shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Hồ sơ chờ sơ duyệt */}
        <div
          onClick={() => handleTabChange('FORMS')}
          className="p-4 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex items-center justify-between cursor-pointer hover:border-[#0F2942] transition-all"
        >
          <div>
            <span className="text-xs font-bold text-[#64748B] uppercase">Hồ sơ chờ duyệt</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-extrabold text-[#0F766E]">{dossiers.length}</span>
              <span className="text-xs text-[#64748B]">tờ khai</span>
            </div>
            <span className="text-xs text-[#16A34A] font-semibold block">
              CT01, Khai sinh, Kết hôn, BTXH
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4] flex items-center justify-center shrink-0">
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
            <span className="text-xs text-[#64748B]">Chuẩn ISO Một Cửa</span>
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
      {/* 4. WORKSPACE CONTROLS: UNIFIED 4 MODULE TABS                              */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 w-full flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#CBD5E1]">
          {/* Segmented Tab Navigator — 100% Unified Slate-Navy Color System */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-2xl border border-[#CBD5E1] shadow-xs">
            {/* Tab 1 */}
            <button
              type="button"
              onClick={() => handleTabChange('INCIDENTS')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'INCIDENTS'
                  ? 'bg-[#0F2942] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F2942] hover:bg-white'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${activeTab === 'INCIDENTS' ? 'text-[#38BDF8]' : 'text-[#64748B]'}`} />
              <span>Sự Cố Hiện Trường</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                  activeTab === 'INCIDENTS'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#E2E8F0] text-[#0F2942]'
                }`}
              >
                {incidents.length}
              </span>
            </button>

            {/* Tab 2 */}
            <button
              type="button"
              onClick={() => handleTabChange('HITL')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'HITL'
                  ? 'bg-[#0F2942] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F2942] hover:bg-white'
              }`}
            >
              <BrainCircuit className={`w-4 h-4 ${activeTab === 'HITL' ? 'text-[#38BDF8]' : 'text-[#64748B]'}`} />
              <span>Duyệt Câu Hỏi Vùng Xám</span>
              {pendingHitlCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#F59E0B] text-white">
                  {pendingHitlCount}
                </span>
              )}
            </button>

            {/* Tab 3 */}
            <button
              type="button"
              onClick={() => handleTabChange('FORMS')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'FORMS'
                  ? 'bg-[#0F2942] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F2942] hover:bg-white'
              }`}
            >
              <FileCheck2 className={`w-4 h-4 ${activeTab === 'FORMS' ? 'text-[#38BDF8]' : 'text-[#64748B]'}`} />
              <span>Sơ Duyệt Tờ Khai</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                  activeTab === 'FORMS'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#E2E8F0] text-[#0F766E]'
                }`}
              >
                {dossiers.length}
              </span>
            </button>

            {/* Tab 4 */}
            <button
              type="button"
              onClick={() => handleTabChange('MAP')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'MAP'
                  ? 'bg-[#0F2942] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F2942] hover:bg-white'
              }`}
            >
              <Radio className="w-4 h-4 text-[#DC2626] animate-pulse" />
              <span>Bản Đồ Điểm Nóng GIS</span>
            </button>
          </div>

          <span className="text-xs text-[#64748B] font-medium hidden md:inline">
            Bấm vào từng dòng để mở ngăn thẩm định chi tiết
          </span>
        </div>

        {/* ========================================================================= */}
        {/* MODULE 1: INCIDENTS MANAGEMENT (COMPACT + PROGRESSIVE DISCLOSURE)        */}
        {/* ========================================================================= */}
        {activeTab === 'INCIDENTS' && (
          <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs overflow-hidden flex flex-col">
            {/* Filter and Search Bar */}
            <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#F8FAFC]">
              <div className="flex items-center gap-2 flex-1 max-w-md relative">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm theo mã sự cố, nội dung hoặc địa chỉ..."
                  className="w-full h-9 pl-9 pr-3 text-xs sm:text-sm rounded-xl bg-white border border-[#CBD5E1] focus:outline-none focus:border-[#0F2942] text-[#0F172A]"
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
                        ? 'bg-[#0F2942] text-white shadow-2xs'
                        : 'text-[#475569] hover:text-[#0F2942]'
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
                        className={`hover:bg-[#F8FAFC] transition-colors cursor-pointer ${
                          selectedIncident?.id === inc.id ? 'bg-[#EFF6FF]' : ''
                        }`}
                      >
                        <td className="p-4 font-mono font-bold text-[#0F2942]">
                          {inc.id}
                          <span className="block text-xs font-sans text-[#64748B] font-normal mt-0.5">
                            {inc.reportedTime}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-[#0F766E]">
                          {inc.category}
                        </td>
                        <td className="p-4 max-w-sm">
                          <span className="font-bold block text-[#0F172A] line-clamp-1">
                            {inc.title}
                          </span>
                          <span className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                            <span>{inc.address}</span>
                          </span>
                          {inc.reporterPhone && (
                            <span className="text-xs font-mono font-bold text-[#DC2626] flex items-center gap-1 mt-1">
                              <PhoneCall className="w-3 h-3 shrink-0" />
                              <span>SĐT liên hệ: {inc.reporterPhone}</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              inc.urgency === 'HIGH'
                                ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]'
                                : inc.urgency === 'MEDIUM'
                                ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                                : 'bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]'
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
                              ? 'Đã hoàn tất'
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
                              className="px-3 py-1.5 rounded-xl bg-[#0F2942] hover:bg-[#1E3A5F] text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
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
        {/* MODULE 2: CITIZEN QUESTION REVIEW & APPROVAL                              */}
        {/* ========================================================================= */}
        {activeTab === 'HITL' && (
          <div className="bg-white rounded-3xl border border-[#CBD5E1] shadow-xs p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#0F2942]">
                  Danh Sách Câu Hỏi Cần Cán Bộ Giải Đáp
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Các tình huống hồ sơ riêng biệt của người dân cần cán bộ Một cửa kiểm tra và xác nhận nội dung hướng dẫn.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] self-start sm:self-auto">
                {pendingHitlCount} câu chờ duyệt
              </span>
            </div>

            {/* Compact List of Items */}
            <div className="grid grid-cols-1 gap-3">
              {hitlItems.map((item) => {
                const isApproved = item.status === 'APPROVED';
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-[#0F2942] flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isApproved ? 'bg-[#F8FAFC] border-[#CBD5E1]' : 'bg-white border-[#CBD5E1] shadow-2xs'
                    }`}
                    onClick={() => setSelectedHitlItem(item)}
                  >
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-[#0F2942] bg-[#F1F5F9] px-2 py-0.5 rounded">
                          {item.id}
                        </span>
                        <span className="text-[#0F766E] font-semibold flex items-center gap-1 truncate">
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
                        {isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedHitlItem(item)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#0F2942] hover:bg-[#1E3A5F] text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs"
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
                  Hiện không có câu hỏi nào đang chờ cán bộ giải đáp.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODULE 3: UNIFIED DOSSIER AUDIT WORKSPACE (SƠ DUYỆT TẬP TRUNG TẠI CHỖ)    */}
        {/* ========================================================================= */}
        {activeTab === 'FORMS' && (
          <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#0F2942] flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-[#0F766E]" />
                  <span>Sơ Duyệt Hồ Sơ Một Cửa • {ward.name}</span>
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Thẩm định trực tiếp các tờ khai CT01, Khai sinh, Kết hôn, Bảo trợ xã hội đã tiền kiểm tra.
                </p>
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(['ALL', 'VALID', 'HAS_ERRORS', 'PENDING'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setDossierFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      dossierFilter === st
                        ? 'bg-[#0F2942] text-white shadow-xs'
                        : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                    }`}
                  >
                    {st === 'ALL'
                      ? `Tất cả (${dossiers.length})`
                      : st === 'VALID'
                      ? `Hợp lệ (${dossiers.filter((d) => d.status === 'VALID').length})`
                      : st === 'HAS_ERRORS'
                      ? `Có lỗi (${dossiers.filter((d) => d.status === 'HAS_ERRORS').length})`
                      : `Chờ duyệt (${dossiers.filter((d) => d.status === 'PENDING').length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl px-3.5 py-2">
              <Search className="w-4 h-4 text-[#64748B] shrink-0" />
              <input
                type="text"
                value={dossierSearch}
                onChange={(e) => setDossierSearch(e.target.value)}
                placeholder="Tìm nhanh theo Họ tên công dân, số CCCD, Mã hồ sơ hoặc loại thủ tục..."
                className="w-full bg-transparent text-xs sm:text-sm text-[#0F172A] focus:outline-none"
              />
              {dossierSearch && (
                <button
                  type="button"
                  onClick={() => setDossierSearch('')}
                  className="text-xs text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Dossiers Table */}
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
                  {filteredDossiers.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDossier(d)}
                      className="hover:bg-[#F8FAFC] transition cursor-pointer"
                    >
                      <td className="p-3.5 font-mono font-bold text-[#0F2942]">
                        {d.id}
                        <span className="block text-xs font-sans text-[#64748B] font-normal">{d.submittedAt}</span>
                      </td>
                      <td className="p-3.5 font-bold text-[#0F172A]">
                        {d.citizenName}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-[#0F766E] block">{d.procedure}</span>
                        <span className="text-xs text-[#64748B]">Mẫu: {d.formType}</span>
                      </td>
                      <td className="p-3.5 font-mono text-xs font-bold text-[#334155]">
                        {d.cccd}
                      </td>
                      <td className="p-3.5 text-center">
                        {d.status === 'VALID' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#166534] border border-[#86EFAC] inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-[#16A34A]" /> Hợp lệ
                          </span>
                        ) : d.status === 'HAS_ERRORS' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" /> {d.errorCount} lỗi cần sửa
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] inline-flex items-center gap-1">
                            Chờ rà soát
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDossier(d);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#0F2942] hover:bg-[#1E3A5F] text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1 ml-auto shadow-xs"
                        >
                          <span>Sơ duyệt</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredDossiers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#64748B] text-xs">
                        Không tìm thấy hồ sơ nào khớp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODULE 4: INCIDENT MAP                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'MAP' && (
          <div className="bg-white rounded-3xl border border-[#CBD5E1] shadow-xs p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
              <span className="text-xs sm:text-sm font-bold text-[#0F2942] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#DC2626] animate-pulse shrink-0" />
                Bản Đồ Điểm Nóng Sự Cố Tại {ward.name}
              </span>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" /> Khẩn cấp
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" /> Trung bình
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" /> Đã xử lý
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.invalidateSize({ animate: false });
                      mapInstanceRef.current.flyTo([ward.lat, ward.lon], 15, { duration: 0.8 });
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-xs font-bold text-[#0F2942] flex items-center gap-1 transition cursor-pointer"
                  title="Định tâm lại bản đồ về trụ sở UBND và các điểm nóng trong địa bàn"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Về Trung Tâm Xã</span>
                </button>
                <button
                  type="button"
                  onClick={handleRebuildGeoIndex}
                  disabled={geoSyncing}
                  className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-xs font-semibold text-[#0F2942] flex items-center gap-1 transition cursor-pointer"
                  title="Làm mới dữ liệu vị trí sự cố trên bản đồ"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${geoSyncing ? 'animate-spin' : ''}`} />
                  <span>{geoSyncing ? 'Đang cập nhật...' : 'Làm Mới Bản Đồ'}</span>
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
                <span className="p-2 rounded-xl bg-[#0F2942] text-white">
                  <AlertTriangle className="w-5 h-5 text-[#38BDF8]" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#0F2942]">
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
                  Đã tổng hợp <strong>{selectedIncident.duplicatesMerged} phản ánh cùng điểm sự cố</strong> từ người dân trên địa bàn.
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

                <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
                  <span className="text-[#991B1B] block text-[11px] font-bold">
                    SĐT người dân báo tin khẩn (Giám sát liên hệ):
                  </span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-mono font-extrabold text-sm text-[#DC2626]">
                      {selectedIncident.reporterPhone || '0912.***.***'}
                    </span>
                    {selectedIncident.reporterPhone && (
                      <a
                        href={`tel:${selectedIncident.reporterPhone.replace(/\*/g, '0')}`}
                        className="px-2.5 py-1 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Gọi xác minh</span>
                      </a>
                    )}
                  </div>
                  <span className="text-[11px] text-[#16A34A] mt-1 block font-semibold">
                    {selectedIncident.reporterHomeWardName &&
                    selectedIncident.reporterHomeWardName !== ward.name
                      ? `Công dân từ ${selectedIncident.reporterHomeWardName} báo khi đi qua địa bàn`
                      : 'Kèm SĐT bắt buộc để người giám sát liên hệ'}
                  </span>
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
                    className="flex-1 py-2.5 rounded-xl bg-[#0F2942] hover:bg-[#1E3A5F] text-white text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    Tiếp Nhận Xử Lý
                  </button>
                )}

                {selectedIncident.status !== 'RESOLVED' && (
                  <button
                    type="button"
                    onClick={() => updateIncidentStatus(selectedIncident.id, 'RESOLVED')}
                    className="flex-1 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
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
                <div className="w-9 h-9 rounded-xl bg-[#0F2942] text-white flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5 text-[#38BDF8]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-[#0F2942]">
                    Duyệt Nội Dung Hướng Dẫn: {selectedHitlItem.id}
                  </h3>
                  <span className="text-xs text-[#64748B]">
                    Thủ tục liên quan: {selectedHitlItem.candidateProcedureName}
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
                <label className="text-xs font-bold text-[#0F2942] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#0F766E]" />
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
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-3.5 text-xs sm:text-sm text-[#0F172A] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
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
                  className="px-4 py-2 rounded-xl bg-[#0F2942] hover:bg-[#1E3A5F] text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#38BDF8]" />
                  <span>
                    {resolvingId === selectedHitlItem.id
                      ? 'Đang lưu...'
                      : 'Phê Duyệt Hướng Dẫn'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. PROGRESSIVE DISCLOSURE DRAWER: SLIDE-OVER FOR SELECTED DOSSIER         */}
      {/* ========================================================================= */}
      {selectedDossier && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fadeIn">
          {/* Backdrop click to close */}
          <div
            className="flex-1"
            onClick={() => setSelectedDossier(null)}
          />

          {/* Drawer Body */}
          <div className="w-full sm:w-[500px] md:w-[560px] bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#CBD5E1] animate-slideLeft z-10">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#0F2942] text-white">
                  <FileCheck2 className="w-5 h-5 text-[#38BDF8]" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#0F2942]">
                      {selectedDossier.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        selectedDossier.status === 'VALID'
                          ? 'bg-[#ECFDF5] text-[#166534] border border-[#86EFAC]'
                          : selectedDossier.status === 'HAS_ERRORS'
                          ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                          : 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                      }`}
                    >
                      {selectedDossier.status === 'VALID'
                        ? 'Hợp lệ'
                        : selectedDossier.status === 'HAS_ERRORS'
                        ? `${selectedDossier.errorCount} lỗi cần sửa`
                        : 'Chờ sơ duyệt'}
                    </span>
                  </div>
                  <span className="text-xs text-[#64748B] block mt-0.5">
                    Thời gian tiếp nhận: {selectedDossier.submittedAt}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDossier(null)}
                className="p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              {/* Procedure & Form Title */}
              <div>
                <span className="text-xs font-bold text-[#00687A] uppercase tracking-wider block mb-1">
                  Mẫu Biểu: {selectedDossier.formType}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#0F172A] leading-snug">
                  {selectedDossier.procedure}
                </h3>
              </div>

              {/* Citizen Identity Card */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-2.5">
                <span className="text-xs font-bold text-[#0F2942] uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#0F766E]" />
                  Thông Tin Định Danh Công Dân (Đề án 06/CP)
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[#64748B] block">Họ và tên:</span>
                    <span className="font-bold text-[#0F172A] text-sm uppercase">
                      {selectedDossier.citizenName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Số định danh (CCCD 12 số):</span>
                    <span className="font-mono font-bold text-[#0F2942]">
                      {selectedDossier.cccd}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Ngày tháng năm sinh:</span>
                    <span className="font-semibold text-[#0F172A]">
                      {selectedDossier.details?.dob || 'Chưa cung cấp'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Giới tính:</span>
                    <span className="font-semibold text-[#0F172A]">
                      {selectedDossier.details?.gender || 'Chưa xác định'}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#E2E8F0] text-xs">
                  <span className="text-[#64748B] block">Địa chỉ thường trú / tạm trú kê khai:</span>
                  <span className="font-semibold text-[#0F172A] mt-0.5 block">
                    {selectedDossier.details?.address || `Xã ${ward.name}, An Giang`}
                  </span>
                </div>

                {/* Email & SĐT nhận thông báo kết quả sơ duyệt (Không dùng SMS) */}
                <div className="pt-2 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-white border border-[#CBD5E1] flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#00796B] shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#64748B] block">Email nhận Phiếu hẹn & Kết quả:</span>
                      <span className="font-mono font-bold text-[#00796B] truncate block">
                        {selectedDossier.citizenEmail || 'khanhblue06@gmail.com'}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-[#CBD5E1] flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-[#0F2942] shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#64748B] block">SĐT định danh tra cứu:</span>
                      <span className="font-mono font-bold text-[#0F172A] truncate block">
                        {selectedDossier.contactPhone || '0918234567'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Vision Gate Verification Summary */}
              <div className="p-3.5 rounded-2xl bg-[#F0FDFA] border border-[#99F6E4] flex items-center justify-between gap-3 text-xs text-[#0F766E]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0D9488] shrink-0" />
                  <div>
                    <span className="font-bold block">Chốt Chặn AI Thị Giác: Đã Xác Thực Trước Khi Nộp</span>
                    <span className="text-[11px] text-[#0F766E]/90">
                      Độ sắc nét: <strong>{selectedDossier.details?.sharpnessScore ?? 96}/100</strong> • Khớp đúng biểu mẫu <strong>{selectedDossier.formType}</strong>
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] font-mono text-[10px] font-bold shrink-0">
                  AI GATE PASS
                </span>
              </div>

              {/* Precheck Results */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[#475569] flex items-center justify-between">
                  <span>Kết Quả Kiểm Tra Hồ Sơ:</span>
                  <span className="text-[#0F766E] font-semibold">
                    Đối chiếu tự động
                  </span>
                </span>

                {selectedDossier.status === 'VALID' || selectedDossier.errorCount === 0 ? (
                  <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#86EFAC] text-xs text-[#166534] flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Tờ khai hợp lệ chuẩn quy định</span>
                      <p className="text-[11px] text-[#15803D] mt-0.5 leading-relaxed">
                        Các trường thông tin bắt buộc (CCCD 12 số, ngày sinh, địa chỉ, quan hệ nhân thân) đã khớp quy định. Đủ điều kiện tiếp nhận và cấp phiếu hẹn trả kết quả.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#DC2626] flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
                      <span>Phát hiện {selectedDossier.errorCount} điểm không phù hợp cần điều chỉnh:</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-[11px] text-[#B91C1C]">
                      {(selectedDossier.details?.issues && selectedDossier.details.issues.length > 0) ? (
                        selectedDossier.details.issues.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))
                      ) : (
                        <li>Thiếu tài liệu đính kèm hoặc sai lệch thông tin kê khai so với căn cước công dân.</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Document Preview (Zero-Trust One-Time Token Vault — Burn After Reading) */}
              <div className="flex flex-col gap-2.5">
                <div className="p-3.5 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] text-xs text-[#0F766E] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#0D9488] shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">Kho Lưu Trữ Tạm Xem 1 Lần (Zero-Trust OTT Vault)</span>
                      <span className="text-[11px] text-[#0F766E]/80">
                        {vaultStatus === 'CONSUMED_410' || (vaultTokenConsumed && !showVaultScan)
                          ? 'Token xem 1 lần đã tự hủy vĩnh viễn trên Redis (Nghị định 13/2023/NĐ-CP)'
                          : 'Bản chụp đính kèm chỉ mở được duy nhất 01 lần để bảo vệ dữ liệu cá nhân'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={vaultLoading || (vaultStatus === 'CONSUMED_410' && !showVaultScan)}
                    onClick={() => {
                      if (showVaultScan) {
                        handleCloseVaultDocument();
                      } else {
                        handleOpenVaultDocument();
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                      vaultStatus === 'CONSUMED_410' && !showVaultScan
                        ? 'bg-[#E2E8F0] text-[#64748B] cursor-not-allowed'
                        : vaultLoading
                        ? 'bg-[#0F2942]/70 text-white cursor-wait'
                        : 'bg-[#0F2942] hover:bg-[#1E3A5F] text-white cursor-pointer active:scale-95'
                    }`}
                  >
                    {vaultLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#57DFFE]" />
                        <span>Đang giải mã...</span>
                      </>
                    ) : showVaultScan ? (
                      'Đóng & Tự Hủy Phiên'
                    ) : vaultStatus === 'CONSUMED_410' || vaultTokenConsumed ? (
                      'Đã Tự Hủy (HTTP 410)'
                    ) : (
                      'Mở Bản Chụp (1 Lần)'
                    )}
                  </button>
                </div>

                {/* BANNER ĐỎ CẢNH BÁO TỰ HỦY NGHỊ ĐỊNH 13/2023/NĐ-CP (HTTP 410 GONE) */}
                {(vaultStatus === 'CONSUMED_410' || (vaultTokenConsumed && !showVaultScan)) && (
                  <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#991B1B] animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold">Tài liệu bảo mật đã tự hủy theo Nghị định 13/2023/NĐ-CP</span>
                      <span className="text-[11px] text-[#B91C1C]">
                        Mã token truy cập một lần (One-Time Token) đã bị tiêu hủy vĩnh viễn khỏi Redis bằng lệnh nguyên tử GETDEL. Mọi nỗ lực truy cập lại đều bị máy chủ từ chối với mã phản hồi HTTP 410 GONE để chống sao chép và bảo vệ quyền riêng tư công dân.
                      </span>
                    </div>
                  </div>
                )}

                {/* KHUNG HIỂN THỊ HÌNH ẢNH THẬT ĐÃ GIẢI MÃ TỪ MINIO KÈM WATERMARK */}
                {showVaultScan && vaultImageBlobUrl && (
                  <div className="relative p-3 rounded-2xl bg-[#0F172A] border-2 border-[#0F2942] shadow-2xl overflow-hidden select-none animate-fadeIn flex flex-col items-center">
                    <div className="w-full text-center text-xs text-white py-1.5 font-bold flex items-center justify-between px-2 bg-slate-800/80 rounded-t-xl mb-2">
                      <span className="flex items-center gap-1.5 text-[#57DFFE]">
                        <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                        Bản chụp giải mã từ MinIO (AES-256-GCM)
                      </span>
                      <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-mono font-bold tracking-wider animate-pulse">
                        XEM 1 LẦN DUY NHẤT
                      </span>
                    </div>

                    {/* THẺ IMG HIỂN THỊ ẢNH THẬT TỪ BLOB URL */}
                    <div className="relative w-full max-h-96 flex items-center justify-center bg-black/40 rounded-lg overflow-hidden border border-slate-700">
                      <img
                        src={vaultImageBlobUrl}
                        alt="Bản chụp tài liệu công dân có đóng dấu watermark Java2D"
                        className="max-h-96 w-auto object-contain rounded select-none pointer-events-none"
                      />
                    </div>

                    <div className="w-full text-center text-[11px] text-slate-300 py-2 mt-2 border-t border-slate-700/80 flex items-center justify-between px-2">
                      <span className="text-left text-slate-400">
                        Dấu mờ bảo mật: <strong>CHỈ DÙNG ĐỂ SƠ DUYỆT HỒ SƠ TẠI UBND</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleCloseVaultDocument}
                        className="px-2.5 py-1 rounded bg-red-700 hover:bg-red-800 text-white font-bold text-[11px] transition cursor-pointer"
                      >
                        Đóng ngay
                      </button>
                    </div>
                  </div>
                )}

                {/* LỖI TRUY XUẤT NẾU CÓ */}
                {vaultError && vaultStatus === 'ERROR' && (
                  <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{vaultError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer / Officer Actions */}
            <div className="p-5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#334155] flex items-center justify-between">
                  <span>Nội dung phản hồi gửi tự động qua Email công dân ({selectedDossier.citizenEmail || 'khanhblue06@gmail.com'}):</span>
                  <span className="text-[10px] text-[#00796B] font-semibold">Miễn phí 100% • Kèm Phiếu hẹn QR</span>
                </label>
                <textarea
                  rows={2}
                  value={officerCustomNote}
                  onChange={(e) => setOfficerCustomNote(e.target.value)}
                  placeholder="Nhập ghi chú hướng dẫn cụ thể (VD: Mời ông/bà mang CCCD gốc và Giấy chứng sinh bản chính đến Quầy số 2 trước 16h30)..."
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#00796B]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApproveDossier(selectedDossier.id)}
                  className="flex-1 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Duyệt Hợp Lệ & Gửi Email + Mã QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestSupplement(selectedDossier.id)}
                  className="flex-1 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Yêu Cầu Bổ Sung (Gửi Email)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDossier(null)}
                className="w-full py-2 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] text-xs font-bold hover:bg-[#F1F5F9] cursor-pointer"
              >
                Đóng ngăn thẩm định
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerWardDashboard;
