import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useWard } from '../context/WardContext';
import { OfficerDashboardDrawers } from '../features/officer-dashboard/OfficerDashboardDrawers';
import { useRole } from '../context/RoleContext';
import { AN_GIANG_WARDS, type WardItem } from '../data/anGiangWards';
import { calculateHaversineMeters, toLeafletLatLng } from '../utils/geoUtils';
import Pagination from '../components/Pagination';
import { OfficerAgentPanel } from '../components/OfficerAgentPanel';
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
  X,
  ChevronRight,
  Search,
  ExternalLink,
  PhoneCall,
  Check,
  FileCheck2,
  UserCheck,
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
  locationSource?: string;
  locationAccuracyM?: number;
  photoUrls?: string[];
  photoCount?: number;
  reports?: Array<{ reportCode: string; description: string; submittedAt?: string; photoUrls?: string[] }>;
  is_mock?: boolean;
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
    motherName?: string;
    fatherName?: string;
    childBirthPlace?: string;
    birthCertNumber?: string;
    birthCertIssueDate?: string;
    parentsMarried?: string;
    childEthnicity?: string;
  };
}

export const PerWardDashboard: React.FC = () => {
  const { wardCode } = useParams<{ wardCode: string }>();
  const navigate = useNavigate();
  const { currentWard, setWard } = useWard();
  const { logoutToCitizen, officerProfile, isOfficer } = useRole();
  const [confirmCitizenSwitchOpen, setConfirmCitizenSwitchOpen] = useState(false);

  const lockedOfficerWardCode =
    isOfficer && officerProfile.wardCode && officerProfile.wardCode !== 'AG_PROVINCE'
      ? officerProfile.wardCode
      : null;

  // Find ward from locked officer ward, param, or context
  const ward: WardItem =
    AN_GIANG_WARDS.find((w) => w.code === (lockedOfficerWardCode || wardCode)) || currentWard;

  // SEC-09: Enforce officer ward lock on URL and sync with WardContext
  useEffect(() => {
    if (lockedOfficerWardCode && wardCode && wardCode.toUpperCase() !== lockedOfficerWardCode.toUpperCase()) {
      navigate(`/officer/ward/${lockedOfficerWardCode}`, { replace: true });
      return;
    }
    if (ward.code !== currentWard.code) {
      setWard(ward);
    }
  }, [lockedOfficerWardCode, wardCode, ward, currentWard.code, setWard, navigate]);

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
  const [officerAgentOpen, setOfficerAgentOpen] = useState<boolean>(false);
  const [selectedIncident, setSelectedIncident] = useState<LocalIncident | null>(null);
  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);
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
        setVaultError('Tài liệu bảo mật đã tự hủy sau 1 lần xem theo Luật Bảo vệ DLCN 91/2025/QH15 & NĐ 356/2025/NĐ-CP.');
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
    getHitlQueue()
      .then((items) => {
        if (!mounted) return;
        setHitlItems(items);
        const initialDrafts: Record<string, string> = {};
        items.forEach((it) => {
          initialDrafts[it.id] = it.suggestedAnswer;
        });
        setDraftAnswers(initialDrafts);
      })
      .catch(() => {
        if (mounted) setHitlItems([]);
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
    } catch {
      setToastBanner(`Không thể phê duyệt HITL ${item.id} do lỗi kết nối máy chủ.`);
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
    } catch {
      setToastBanner(`Không đồng bộ được chỉ mục Redis GEO (cần quyền Quản trị viên hoặc kiểm tra kết nối).`);
      setTimeout(() => setToastBanner(null), 5000);
    } finally {
      setGeoSyncing(false);
    }
  };

  // Incidents Dataset fetched dynamically from Backend Clusters API + live citizen submissions (no static mock generator)
  const [incidents, setIncidents] = useState<LocalIncident[]>([]);

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
          const rawFt = String((s.formData as any)?.formType || '').trim().toUpperCase();
          const formType: QuickDossierItem['formType'] =
            rawFt === 'TK-KS'
              ? 'Khai sinh'
              : rawFt === 'TK-KH'
              ? 'Kết hôn'
              : rawFt === 'TK-BTXH'
              ? 'Bảo trợ'
              : rawFt === 'CT01'
              ? 'CT01'
              : s.procedureCode.includes('HT-01')
              ? 'Khai sinh'
              : s.procedureCode.includes('HT-02') || s.procedureCode.includes('HT-11')
              ? 'Kết hôn'
              : s.procedureCode.includes('BT')
              ? 'Bảo trợ'
              : 'CT01';

          const vaultToken =
            Array.isArray(s.vaultDocIds) && s.vaultDocIds.length > 0 ? s.vaultDocIds[0] : undefined;
          const fd = (s.formData as Record<string, any>) || {};

          return {
            id: s.dossierCode,
            citizenName: s.citizenName || fd.fullName || fd.childName || 'Công dân nộp hồ sơ',
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
            citizenEmail: fd.email || fd.citizenEmail || '',
            contactPhone: fd.phone || fd.phoneNumber || '',
            appointmentCode: s.appointmentCode,
            officerFeedback: s.officerFeedback,
            errorCount: s.status === 'SUPPLEMENT_REQUIRED' ? 1 : 0,
            vaultToken,
            vaultDocId: vaultToken,
            details: {
              dob: fd.dob || fd.ngaySinh || 'Chưa cung cấp',
              gender: fd.gender || fd.gioiTinh || 'Chưa xác định',
              address: fd.address || fd.diaChi || `${ward.name}, An Giang`,
              confidence: 99.0,
              sharpnessScore: typeof fd.sharpnessScore === 'number' ? fd.sharpnessScore : undefined,
              templateMatched: typeof fd.templateMatched === 'boolean' ? fd.templateMatched : undefined,
              issues: s.officerFeedback ? [s.officerFeedback] : [],
              vaultToken,
              motherName: fd.motherName || undefined,
              fatherName: fd.fatherName || undefined,
              childBirthPlace: fd.childBirthPlace || undefined,
              birthCertNumber: fd.birthCertNumber || undefined,
              birthCertIssueDate: fd.birthCertIssueDate || undefined,
              parentsMarried: fd.parentsMarried || undefined,
              childEthnicity: fd.childEthnicity || undefined,
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
    const recipientEmail = target?.citizenEmail || '';

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
      recipientEmail
        ? `Đã sơ duyệt HỢP LỆ hồ sơ ${dossierId}, cấp Mã QR ${appointmentCode} và gửi Email thông báo tới ${recipientEmail}!`
        : `Đã sơ duyệt HỢP LỆ hồ sơ ${dossierId} và cấp Mã QR ${appointmentCode}!`
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
    const recipientEmail = target?.citizenEmail || '';

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

      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &bull; Dữ liệu GIS Hành chính An Giang 2026 (ODbL)',
        maxZoom: 19,
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

    // 0. BƯỚC 5: Render ward administrative boundary polygon & fitBounds to active HQ + incident cluster at street-level zoom
    if (ward.boundary && ward.boundary.length >= 3) {
      const latLngs = ward.boundary.map((coord) => toLeafletLatLng(coord));
      L.polygon(latLngs, {
        color: '#00236F',
        weight: 1.5,
        dashArray: '6, 6',
        fillColor: '#38BDF8',
        fillOpacity: 0.05,
      }).addTo(markersLayer);
    }

    const focusPoints: [number, number][] = [[ward.lat, ward.lon]];
    incidents.forEach((inc) => {
      if (Math.abs(inc.lat - ward.lat) < 0.02 && Math.abs(inc.lon - ward.lon) < 0.02) {
        focusPoints.push([inc.lat, inc.lon]);
      }
    });
    if (focusPoints.length > 1) {
      map.fitBounds(L.latLngBounds(focusPoints), { padding: [40, 40], maxZoom: 16 });
    } else {
      map.setView([ward.lat, ward.lon], 16, { animate: false });
    }
    map.invalidateSize({ animate: false });

    // 1. Add Ward Administrative Coverage Circle & Distinct HQ Marker
    L.circle([ward.lat, ward.lon], {
      radius: 400,
      color: '#00236F',
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: '#38BDF8',
      fillOpacity: 0.06,
    }).addTo(markersLayer);

    const isUnverified = ward.coordSource === 'unverified';
    const hqIcon = L.divIcon({
      className: 'custom-hq-marker',
      html: `
        <div class="flex flex-col items-center">
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00236F] text-white border-2 border-white shadow-xl text-xs font-bold text-center whitespace-nowrap cursor-pointer hover:bg-[#00174F] transition-all">
            <span class="text-sm">🏛️</span>
            <span>UBND ${ward.name}</span>
            ${isUnverified ? '<span class="ml-1 px-1.5 py-0.5 rounded bg-amber-500 text-[9px] font-black uppercase text-black">Tọa độ chưa xác thực</span>' : ''}
          </div>
          <div class="w-2.5 h-2.5 bg-[#00236F] rotate-45 -mt-1 border-r border-b border-white"></div>
        </div>
      `,
      iconSize: [220, 42],
      iconAnchor: [110, 42],
    });

    L.marker([ward.lat, ward.lon], { icon: hqIcon })
      .addTo(markersLayer)
      .bindPopup(
        `<div class="p-2 text-xs font-sans min-w-[200px]">
          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="text-base">🏛️</span>
            <b class="text-[#00236F] text-sm">Trụ sở UBND ${ward.name}</b>
          </div>
          ${isUnverified ? '<div class="p-1 px-2 mb-1.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">⚠️ Tọa độ chưa qua kiểm tra thực địa (unverified)</div>' : ''}
          <span class="text-[#64748B] block mb-1">📍 ${ward.officeAddress}</span>
          <span class="text-[11px] font-bold text-[#00687A] block mb-1">📞 Hotline: ${ward.phoneNumber}</span>
          <span class="text-[10px] text-slate-400 block">Nguồn tọa độ: ${ward.coordSource || 'official_gis'}</span>
        </div>`
      );

    // 2. BƯỚC 5: Spatial Clustering (< 35m) & Spiderfy on click
    const CLUSTER_DISTANCE_METERS = 35;
    interface IncidentCluster {
      id: string;
      centroidLat: number;
      centroidLon: number;
      items: LocalIncident[];
    }

    const clusters: IncidentCluster[] = [];
    incidents.forEach((inc) => {
      let matched: IncidentCluster | null = null;
      for (const cl of clusters) {
        const dist = calculateHaversineMeters(inc.lat, inc.lon, cl.centroidLat, cl.centroidLon);
        if (dist <= CLUSTER_DISTANCE_METERS) {
          matched = cl;
          break;
        }
      }
      if (matched) {
        matched.items.push(inc);
      } else {
        clusters.push({
          id: `cl-${inc.id}`,
          centroidLat: inc.lat,
          centroidLon: inc.lon,
          items: [inc],
        });
      }
    });

    clusters.forEach((cluster) => {
      if (cluster.items.length === 1) {
        // Single isolated incident
        const inc = cluster.items[0];
        const markerColor =
          inc.urgency === 'HIGH' ? '#DC2626' : inc.urgency === 'MEDIUM' ? '#D97706' : '#00687A';

        // R = 25m spatial deduplication ring
        L.circle([inc.lat, inc.lon], {
          radius: 25,
          color: markerColor,
          weight: 1.5,
          fillColor: markerColor,
          fillOpacity: 0.15,
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
                <span class="text-[10px] text-[#334155] font-semibold">${inc.duplicatesMerged} phản ánh</span>
                ${(inc.photoCount ?? inc.photoUrls?.length ?? 0) > 0 ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">📷 ${inc.photoCount ?? inc.photoUrls?.length} ảnh</span>` : ''}
              </div>
            </div>`
          );

        marker.on('dblclick', () => {
          setSelectedIncident(inc);
        });
      } else {
        // Multi-incident cluster (< 35m)
        const isExpanded = expandedClusterId === cluster.id;
        const count = cluster.items.length;

        const clusterIcon = L.divIcon({
          className: 'custom-cluster-marker',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer group hover:scale-110 transition-transform">
              <div class="w-8 h-8 rounded-full bg-[#BA1A1A] text-white border-2 border-white shadow-xl flex items-center justify-center font-extrabold text-xs ring-2 ring-red-300">
                ${count}
              </div>
              <div class="absolute -bottom-4 px-1.5 py-0.5 rounded-full bg-slate-900/80 text-white text-[8px] font-bold whitespace-nowrap">
                ${isExpanded ? 'Đang mở' : 'Gộp ' + count}
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const clusterMarker = L.marker([cluster.centroidLat, cluster.centroidLon], { icon: clusterIcon })
          .addTo(markersLayer);

        clusterMarker.on('click', () => {
          setExpandedClusterId((prev) => (prev === cluster.id ? null : cluster.id));
        });

        if (isExpanded) {
          // Bung nan hoa (radial spiderfy)
          const spiderRadiusDeg = 0.00035; // ~38m spread
          cluster.items.forEach((inc, idx) => {
            const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
            const sLat = cluster.centroidLat + spiderRadiusDeg * Math.sin(angle);
            const sLon = cluster.centroidLon + (spiderRadiusDeg * Math.cos(angle)) / Math.cos((cluster.centroidLat * Math.PI) / 180);

            // Connective line to cluster center
            L.polyline([[cluster.centroidLat, cluster.centroidLon], [sLat, sLon]], {
              color: '#DC2626',
              weight: 1.5,
              dashArray: '3, 3',
              opacity: 0.8,
            }).addTo(markersLayer);

            const markerColor =
              inc.urgency === 'HIGH' ? '#DC2626' : inc.urgency === 'MEDIUM' ? '#D97706' : '#00687A';

            const leafIcon = L.divIcon({
              className: 'custom-spider-leaf-marker',
              html: `<div style="background-color: ${markerColor}" class="w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold cursor-pointer hover:scale-125 transition-transform">!</div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });

            const leafMarker = L.marker([sLat, sLon], { icon: leafIcon })
              .addTo(markersLayer)
              .bindPopup(
                `<div class="p-2 text-xs font-sans">
                  <div class="text-[10px] font-bold text-red-600 mb-0.5">Sự cố trong cụm #${idx + 1}</div>
                  <b class="text-[#0F2942] block mb-1">${inc.title}</b>
                  <span class="text-[#64748B] block mb-1">${inc.address}</span>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold text-white" style="background:${markerColor}">${inc.urgency}</span>
                  </div>
                </div>`
              );

            leafMarker.on('dblclick', () => {
              setSelectedIncident(inc);
            });
          });
        } else {
          // Collapsed cluster ring
          L.circle([cluster.centroidLat, cluster.centroidLon], {
            radius: 35,
            color: '#BA1A1A',
            weight: 1.5,
            dashArray: '4, 4',
            fillColor: '#FCA5A5',
            fillOpacity: 0.2,
          }).addTo(markersLayer);
        }
      }
    });
  }, [activeTab, ward.code, ward.lat, ward.lon, ward.name, ward.officeAddress, ward.phoneNumber, ward.boundary, ward.coordSource, incidents, expandedClusterId]);

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

  // Sync incidents from live citizen reports and Backend Clusters API
  useEffect(() => {
    let mounted = true;
    const storageKey = `smartward_incidents_v2_${ward.code}`;
    let baseIncidents: LocalIncident[] = [];

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Verify saved incidents belong to the calibrated town center (within ~0.004 deg ~ 400m)
          const belongsToWard = parsed.some(
            (p: any) =>
              typeof p.lat === 'number' &&
              typeof p.lon === 'number' &&
              Math.abs(p.lat - ward.lat) < 0.004 &&
              Math.abs(p.lon - ward.lon) < 0.004
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
          FLOODING: 'Ngập nước & Thủy lợi',
          ENVIRONMENT: 'Môi trường & Rác thải',
          GARBAGE: 'Môi trường & Rác thải',
          LIGHTING: 'Chiếu sáng đô thị',
          LIGHTING_ELECTRICAL: 'Chiếu sáng đô thị',
          ORDER_SECURITY: 'An ninh trật tự',
          SECURITY: 'An ninh trật tự',
        };
        const statusMap: Record<string, LocalIncident['status']> = {
          OPEN: 'PENDING',
          IN_PROGRESS: 'IN_PROGRESS',
          RESOLVED: 'RESOLVED',
        };
        return {
          id: c.clusterCode,
          category: catMap[(c.category || '').toUpperCase()] || 'Cơ sở hạ tầng',
          title: c.title,
          description: c.descriptionSummary || c.title,
          address: c.addressText || `${ward.name}, ${ward.province}`,
          lat: c.centroidLatitude,
          lon: c.centroidLongitude,
          reportedTime: 'Vừa cập nhật',
          status: statusMap[c.status] || 'PENDING',
          urgency: c.reportCount >= 4 ? 'HIGH' : c.reportCount >= 2 ? 'MEDIUM' : 'LOW',
          duplicatesMerged: c.reportCount,
          reporterPhone: '0988.***.012',
          locationSource: c.locationSource,
          locationAccuracyM: c.locationAccuracyM,
          photoUrls: c.photoUrls || [],
          photoCount: c.photoCount ?? (c.photoUrls?.length ?? 0),
          reports: c.reports || [],
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

    setToastBanner(`Đã cập nhật sự cố ${id} sang trạng thái: ${newStatus === 'RESOLVED' ? 'Đã hoàn thành' : newStatus === 'IN_PROGRESS' ? 'Đang xử lý' : 'Chờ tiếp nhận'}`);
    setTimeout(() => setToastBanner(null), 4000);

    // Call backend status update API and report explicitly if persistence fails
    updateClusterStatus(id, newStatus).catch(() => {
      setToastBanner(`Cảnh báo: Không đồng bộ được trạng thái sự cố ${id} lên máy chủ Backend.`);
      setTimeout(() => setToastBanner(null), 5000);
    });
  };

  // Calculate high-signal metrics
  const pendingIncidentsCount = incidents.filter((i) => i.status === 'PENDING').length;
  const inProgressCount = incidents.filter((i) => i.status === 'IN_PROGRESS').length;
  const pendingHitlCount = hitlItems.filter((i) => i.status === 'PENDING').length;

  return (
    <div className="flex flex-col w-full pb-20 bg-[#F5F6F8]">
      {/* ========================================================================= */}
      {/* 1. CITIZEN-ALIGNED CRIMSON MASTHEAD (ĐỒNG BỘ MÀU ĐỎ ĐÔ - CHỮ TO RÕ)      */}
      {/* ========================================================================= */}
      <section className="bg-bca-masthead text-white px-4 md:px-8 py-5 border-b-2 border-[#D4A017]/40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#D4A017] text-[#750715] uppercase tracking-wider shadow-2xs">
                  BÀN TRỰC MỘT CỬA • {officerProfile.badgeId}
                </span>
                <span className="bg-white/15 text-white text-sm sm:text-base font-extrabold px-3.5 py-1 rounded-xl border border-white/25 inline-flex items-center gap-2">
                  <span>UBND {ward.name}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 font-bold border border-emerald-400/30">
                    ĐANG TRỰC
                  </span>
                </span>
              </div>

              <div className="text-sm text-white/90 mt-2 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 font-bold">
                  <UserCheck className="w-4 h-4 text-[#FDE047]" />
                  <span>{officerProfile.name}</span>
                  <span className="text-white/75 font-normal">({officerProfile.title})</span>
                </span>
                <span className="hidden sm:inline text-white/40">•</span>
                <span className="flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-[#FDE047]" />
                  <span className="font-bold">{ward.phoneNumber}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Dock */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setOfficerAgentOpen((prev) => !prev)}
              className="px-4 py-2.5 bg-white text-[#8F0A1B] hover:bg-[#F7EEDF] rounded-xl text-xs sm:text-sm font-extrabold border border-white/30 transition active:scale-95 cursor-pointer flex items-center gap-2 shadow-sm"
              title="Mở Trợ lý AI hỗ trợ xử lý việc tại xã"
            >
              <BrainCircuit className="w-4 h-4 text-[#B90E23]" />
              <span>Trợ lý AI</span>
            </button>
            <button
              onClick={() => navigate('/officer/procedures')}
              className="px-4 py-2.5 bg-[#750715] hover:bg-[#5E0510] text-white rounded-xl text-xs sm:text-sm font-bold border border-[#D4A017]/40 transition active:scale-95 cursor-pointer flex items-center gap-2 shadow-sm"
              title="Tra cứu 40 thủ tục hành chính"
            >
              <BookOpen className="w-4 h-4 text-[#FDE047]" />
              <span>40 TTHC</span>
            </button>
            <button
              onClick={() => setConfirmCitizenSwitchOpen(true)}
              className="px-4 py-2.5 bg-black/25 hover:bg-black/40 text-white rounded-xl text-xs sm:text-sm font-bold border border-white/20 transition active:scale-95 cursor-pointer flex items-center gap-2"
              title="Chuyển sang Cổng Dân Sinh"
            >
              <ExternalLink className="w-4 h-4 text-white/80" />
              <span>Cổng Dân Sinh</span>
            </button>
          </div>
        </div>
      </section>

      {/* Requirement 5: Mandatory Confirmation Modal before logging out to Citizen Portal */}
      {confirmCitizenSwitchOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-citizen-switch-title"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 animate-fadeIn">
            <h3 id="confirm-citizen-switch-title" className="text-base font-extrabold text-[#0F2942]">
              Xác nhận kết thúc phiên Cán bộ?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Bạn đang trong phiên trực công vụ của <strong>{officerProfile.badgeId}</strong> tại{' '}
              <strong>UBND {ward.name}</strong>. Chuyển sang <strong>Cổng Dân Sinh</strong> sẽ đăng xuất và thu hồi
              phiên làm việc cán bộ hiện tại.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmCitizenSwitchOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Hủy — Ở lại bàn cán bộ
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmCitizenSwitchOpen(false);
                  setWard(ward);
                  logoutToCitizen();
                }}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                Xác nhận đăng xuất & sang Cổng Dân
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. HIGH-SIGNAL METRIC TILES (CHỮ TO RÕ - BỐ CỤC THOÁNG GỌN)              */}
      {/* ========================================================================= */}
      {officerAgentOpen && (
        <OfficerAgentPanel
          wardName={ward.name}
          wardCode={ward.code}
          onClose={() => setOfficerAgentOpen(false)}
        />
      )}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 w-full grid grid-cols-2 lg:grid-cols-4 gap-4 z-10">
        {/* KPI 1: Phản ánh sự cố */}
        <div
          onClick={() => handleTabChange('INCIDENTS')}
          className={`p-5 rounded-2xl bg-white border-2 transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between ${
            activeTab === 'INCIDENTS' ? 'border-[#B90E23] ring-2 ring-[#B90E23]/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wide">Phản ánh sự cố</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#750715]">
              {pendingIncidentsCount + inProgressCount}
            </div>
            <div className="text-xs sm:text-sm font-bold text-amber-700 mt-1 flex items-center gap-1">
              <span>{pendingIncidentsCount} ca mới cần xử lý</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Duyệt câu hỏi */}
        <div
          onClick={() => handleTabChange('HITL')}
          className={`p-5 rounded-2xl bg-white border-2 transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between ${
            activeTab === 'HITL' ? 'border-[#B90E23] ring-2 ring-[#B90E23]/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wide">Giải đáp câu hỏi</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#B90E23] flex items-center justify-center shrink-0 border border-rose-200">
              <BrainCircuit className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#750715]">
              {pendingHitlCount}
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-500 mt-1 flex items-center gap-1">
              <span>{hitlItems.length - pendingHitlCount} câu đã trả lời</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Hồ sơ chờ duyệt */}
        <div
          onClick={() => handleTabChange('FORMS')}
          className={`p-5 rounded-2xl bg-white border-2 transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between ${
            activeTab === 'FORMS' ? 'border-[#B90E23] ring-2 ring-[#B90E23]/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wide">Sơ duyệt hồ sơ</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-800">
              {dossiers.length}
            </div>
            <div className="text-xs sm:text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1">
              <span>Khai sinh, Kết hôn, CT01</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Tỷ lệ đúng hạn */}
        <div
          onClick={() => handleTabChange('MAP')}
          className={`p-5 rounded-2xl bg-white border-2 transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between ${
            activeTab === 'MAP' ? 'border-[#B90E23] ring-2 ring-[#B90E23]/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-600 uppercase tracking-wide">Đúng hạn Một cửa</span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center shrink-0 border border-sky-200">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#0284C7]">
              {ward.solvedRate}%
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-500 mt-1 flex items-center gap-1">
              <span>Đạt tiêu chuẩn xã/phường</span>
            </div>
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
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-7 w-full flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-slate-200">
          {/* Segmented Tab Navigator — Citizen Crimson Synchronized System */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300 shadow-inner">
            {/* Tab 1 */}
            <button
              type="button"
              onClick={() => handleTabChange('INCIDENTS')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm sm:text-base font-extrabold transition-all cursor-pointer flex items-center gap-2.5 ${
                activeTab === 'INCIDENTS'
                  ? 'bg-[#B90E23] text-white shadow-md'
                  : 'text-slate-700 hover:text-[#B90E23] hover:bg-white/80'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'INCIDENTS' ? 'text-[#FDE047]' : 'text-slate-500'}`} />
              <span>Sự Cố Địa Bàn</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  activeTab === 'INCIDENTS'
                    ? 'bg-white/25 text-white'
                    : 'bg-white text-slate-700'
                }`}
              >
                {incidents.length}
              </span>
            </button>

            {/* Tab 2 */}
            <button
              type="button"
              onClick={() => handleTabChange('HITL')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm sm:text-base font-extrabold transition-all cursor-pointer flex items-center gap-2.5 ${
                activeTab === 'HITL'
                  ? 'bg-[#B90E23] text-white shadow-md'
                  : 'text-slate-700 hover:text-[#B90E23] hover:bg-white/80'
              }`}
            >
              <BrainCircuit className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'HITL' ? 'text-[#FDE047]' : 'text-slate-500'}`} />
              <span>Duyệt Câu Hỏi</span>
              {pendingHitlCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#D4A017] text-[#750715]">
                  {pendingHitlCount}
                </span>
              )}
            </button>

            {/* Tab 3 */}
            <button
              type="button"
              onClick={() => handleTabChange('FORMS')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm sm:text-base font-extrabold transition-all cursor-pointer flex items-center gap-2.5 ${
                activeTab === 'FORMS'
                  ? 'bg-[#B90E23] text-white shadow-md'
                  : 'text-slate-700 hover:text-[#B90E23] hover:bg-white/80'
              }`}
            >
              <FileCheck2 className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'FORMS' ? 'text-[#FDE047]' : 'text-slate-500'}`} />
              <span>Sơ Duyệt Tờ Khai</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  activeTab === 'FORMS'
                    ? 'bg-white/25 text-white'
                    : 'bg-white text-emerald-800'
                }`}
              >
                {dossiers.length}
              </span>
            </button>

            {/* Tab 4 */}
            <button
              type="button"
              onClick={() => handleTabChange('MAP')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm sm:text-base font-extrabold transition-all cursor-pointer flex items-center gap-2.5 ${
                activeTab === 'MAP'
                  ? 'bg-[#B90E23] text-white shadow-md'
                  : 'text-slate-700 hover:text-[#B90E23] hover:bg-white/80'
              }`}
            >
              <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 animate-pulse" />
              <span>Bản Đồ Điểm Nóng</span>
            </button>
          </div>

          <span className="text-xs sm:text-sm text-slate-500 font-bold hidden md:inline">
            💡 Nhấp vào dòng để xem hồ sơ và xử lý
          </span>
        </div>

        {/* ========================================================================= */}
        {/* MODULE 1: INCIDENTS MANAGEMENT (CHỮ TO RÕ - BẢNG THOÁNG GỌN)             */}
        {/* ========================================================================= */}
        {activeTab === 'INCIDENTS' && (
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Filter and Search Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/80">
              <div className="flex items-center gap-2 flex-1 max-w-lg relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm mã số, tên sự cố hoặc tuyến đường..."
                  className="w-full h-11 pl-11 pr-4 text-sm sm:text-base rounded-xl bg-white border border-slate-300 focus:outline-none focus:border-[#B90E23] focus:ring-2 focus:ring-[#B90E23]/20 text-slate-800 font-medium"
                />
                {searchKeyword && (
                  <button
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl border border-slate-300 text-xs sm:text-sm">
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
                    className={`px-3 sm:px-4 py-2 rounded-lg font-extrabold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5 ${
                      statusFilter === tab.key
                        ? 'bg-[#B90E23] text-white shadow-xs'
                        : 'text-slate-700 hover:text-[#B90E23] hover:bg-white/80'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="opacity-80 font-mono text-xs">({tab.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* High-Signal Compact Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-800">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-xs sm:text-sm font-extrabold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="p-4 sm:p-5">Mã & Giờ Báo</th>
                    <th className="p-4 sm:p-5">Lĩnh Vực</th>
                    <th className="p-4 sm:p-5">Tiêu Đề & Địa Điểm</th>
                    <th className="p-4 sm:p-5 text-center">Mức Độ</th>
                    <th className="p-4 sm:p-5 text-center">Trạng Thái</th>
                    <th className="p-4 sm:p-5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-500 font-medium text-base">
                        Không có sự cố nào trong danh sách.
                      </td>
                    </tr>
                  ) : (
                    paginatedIncidents.map((inc) => (
                      <tr
                        key={inc.id}
                        onClick={() => setSelectedIncident(inc)}
                        className={`hover:bg-amber-50/40 transition-colors cursor-pointer ${
                          selectedIncident?.id === inc.id ? 'bg-rose-50/60' : ''
                        }`}
                      >
                        <td className="p-4 sm:p-5 font-mono font-extrabold text-[#750715] text-sm sm:text-base">
                          {inc.id}
                          <span className="block text-xs font-sans text-slate-500 font-semibold mt-0.5">
                            {inc.reportedTime}
                          </span>
                        </td>
                        <td className="p-4 sm:p-5 font-extrabold text-slate-700">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                            {inc.category}
                          </span>
                        </td>
                        <td className="p-4 sm:p-5 max-w-md">
                          <span className="font-extrabold text-base text-slate-900 block line-clamp-1">
                            {inc.title}
                          </span>
                          <span className="text-sm text-slate-600 flex items-center gap-1.5 mt-1 font-medium">
                            <MapPin className="w-4 h-4 text-[#B90E23] shrink-0" />
                            <span className="truncate">{inc.address}</span>
                          </span>
                          {(inc.photoCount ?? inc.photoUrls?.length ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                              <span>📷 {inc.photoCount ?? inc.photoUrls?.length} ảnh hiện trường</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 sm:p-5 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold inline-block ${
                              inc.urgency === 'HIGH'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : inc.urgency === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {inc.urgency === 'HIGH' ? 'Khẩn cấp' : inc.urgency === 'MEDIUM' ? 'Trung bình' : 'Bình thường'}
                          </span>
                        </td>
                        <td className="p-4 sm:p-5 text-center">
                          <span
                            className={`inline-block px-3 py-1.5 rounded-full text-xs sm:text-sm font-extrabold ${
                              inc.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : inc.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {inc.status === 'RESOLVED'
                              ? 'Đã xong'
                              : inc.status === 'IN_PROGRESS'
                              ? 'Đang xử lý'
                              : 'Chờ nhận'}
                          </span>
                        </td>
                        <td className="p-4 sm:p-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedIncident(inc)}
                            className="px-4 py-2 rounded-xl bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs sm:text-sm font-extrabold shadow-sm transition active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <span>Xem & Xử lý</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
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
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-5 sm:p-7 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#750715] flex items-center gap-2">
                  <BrainCircuit className="w-6 h-6 text-[#B90E23]" />
                  <span>Duyệt Câu Hỏi Cần Cán Bộ Giải Đáp</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                  Trường hợp công dân hỏi chi tiết riêng biệt cần cán bộ Một cửa xác nhận nội dung tư vấn.
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-extrabold bg-amber-100 text-amber-900 border border-amber-300 self-start sm:self-auto">
                {pendingHitlCount} câu chờ duyệt
              </span>
            </div>

            {/* List of Items */}
            <div className="grid grid-cols-1 gap-3.5">
              {hitlItems.map((item) => {
                const isApproved = item.status === 'APPROVED';
                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer hover:border-[#B90E23] flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isApproved ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                    onClick={() => setSelectedHitlItem(item)}
                  >
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
                        <span className="font-mono font-extrabold text-[#750715] bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                          {item.id}
                        </span>
                        <span className="text-slate-700 font-extrabold flex items-center gap-1.5 truncate">
                          <BookOpen className="w-4 h-4 text-[#B90E23] shrink-0" />
                          {item.candidateProcedureName}
                        </span>
                      </div>

                      <p className="text-base sm:text-lg font-bold text-slate-900 line-clamp-2">
                        "{item.query}"
                      </p>
                      <span className="text-xs text-slate-500 font-medium">
                        Gửi lúc: {item.createdAt} • Địa bàn: {item.wardName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-extrabold ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedHitlItem(item)}
                        className="px-4 py-2.5 rounded-xl bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs sm:text-sm font-extrabold transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <span>{isApproved ? 'Xem lại' : 'Duyệt trả lời'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {hitlItems.length === 0 && (
                <div className="p-10 text-center text-slate-500 text-base font-medium">
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
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-5 sm:p-7 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#750715] flex items-center gap-2">
                  <FileCheck2 className="w-6 h-6 text-[#B90E23]" />
                  <span>Sơ Duyệt Hồ Sơ Một Cửa • {ward.name}</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                  Kiểm tra tờ khai CT01, Khai sinh, Kết hôn, Bảo trợ xã hội của người dân gửi đến.
                </p>
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {(['ALL', 'VALID', 'HAS_ERRORS', 'PENDING'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setDossierFilter(st)}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                      dossierFilter === st
                        ? 'bg-[#B90E23] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={dossierSearch}
                onChange={(e) => setDossierSearch(e.target.value)}
                placeholder="Tìm họ tên, số CCCD, mã hồ sơ hoặc loại thủ tục..."
                className="w-full bg-transparent text-sm sm:text-base text-slate-800 font-medium focus:outline-none"
              />
              {dossierSearch && (
                <button
                  type="button"
                  onClick={() => setDossierSearch('')}
                  className="text-xs sm:text-sm text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Dossiers Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-800">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-xs sm:text-sm font-extrabold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="p-4 sm:p-5">Mã Hồ Sơ</th>
                    <th className="p-4 sm:p-5">Người Nộp</th>
                    <th className="p-4 sm:p-5">Thủ Tục</th>
                    <th className="p-4 sm:p-5">Số CCCD</th>
                    <th className="p-4 sm:p-5 text-center">Kiểm Tra AI</th>
                    <th className="p-4 sm:p-5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDossiers.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDossier(d)}
                      className="hover:bg-amber-50/40 transition cursor-pointer"
                    >
                      <td className="p-4 sm:p-5 font-mono font-extrabold text-[#750715] text-sm sm:text-base">
                        {d.id}
                        <span className="block text-xs font-sans text-slate-500 font-semibold">{d.submittedAt}</span>
                      </td>
                      <td className="p-4 sm:p-5 font-extrabold text-base text-slate-900">
                        {d.citizenName}
                      </td>
                      <td className="p-4 sm:p-5">
                        <span className="font-extrabold text-slate-800 block text-sm sm:text-base">{d.procedure}</span>
                        <span className="text-xs text-slate-500 font-semibold">Mẫu: {d.formType}</span>
                      </td>
                      <td className="p-4 sm:p-5 font-mono text-sm font-bold text-slate-700">
                        {d.cccd}
                      </td>
                      <td className="p-4 sm:p-5 text-center">
                        {d.status === 'VALID' ? (
                          <span className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-emerald-700" /> Hợp lệ
                          </span>
                        ) : d.status === 'HAS_ERRORS' ? (
                          <span className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-extrabold bg-red-100 text-red-800 border border-red-300 inline-flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-red-700" /> {d.errorCount} lỗi
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-extrabold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1.5">
                            Chờ rà soát
                          </span>
                        )}
                      </td>
                      <td className="p-4 sm:p-5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDossier(d);
                          }}
                          className="px-4 py-2 rounded-xl bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs sm:text-sm font-extrabold transition active:scale-95 cursor-pointer inline-flex items-center gap-1.5 ml-auto shadow-sm"
                        >
                          <span>Sơ duyệt</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredDossiers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-500 text-base font-medium">
                        Không tìm thấy hồ sơ nào phù hợp.
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
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-5 sm:p-7 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <span className="text-base sm:text-lg font-extrabold text-[#750715] flex items-center gap-2">
                <Radio className="w-5 h-5 text-red-500 animate-pulse shrink-0" />
                <span>Bản Đồ Điểm Nóng Sự Cố Tại {ward.name}</span>
              </span>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-bold text-slate-700">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Khẩn cấp
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Trung bình
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Đã xử lý
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.invalidateSize({ animate: false });
                      mapInstanceRef.current.flyTo([ward.lat, ward.lon], 15, { duration: 0.8 });
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  title="Định tâm lại bản đồ về trụ sở UBND"
                >
                  <MapPin className="w-4 h-4 text-[#B90E23]" />
                  <span>Về Trung Tâm Xã</span>
                </button>
                <button
                  type="button"
                  onClick={handleRebuildGeoIndex}
                  disabled={geoSyncing}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  title="Làm mới dữ liệu vị trí sự cố trên bản đồ"
                >
                  <RefreshCw className={`w-4 h-4 text-slate-600 ${geoSyncing ? 'animate-spin' : ''}`} />
                  <span>{geoSyncing ? 'Đang tải...' : 'Làm Mới'}</span>
                </button>
              </div>
            </div>
            <div className="w-full h-[520px] rounded-2xl overflow-hidden border-2 border-slate-200 relative z-1 shadow-inner bg-slate-100">
              <div ref={mapContainerRef} className="w-full h-full" />
            </div>
          </div>
        )}
      </div>


      <OfficerDashboardDrawers
        ward={ward}
        selectedIncident={selectedIncident}
        setSelectedIncident={setSelectedIncident}
        updateIncidentStatus={updateIncidentStatus}
        selectedHitlItem={selectedHitlItem}
        setSelectedHitlItem={setSelectedHitlItem}
        draftAnswers={draftAnswers}
        setDraftAnswers={setDraftAnswers}
        resolvingId={resolvingId}
        handleApproveHitl={handleApproveHitl}
        selectedDossier={selectedDossier}
        setSelectedDossier={setSelectedDossier}
        vaultStatus={vaultStatus}
        vaultTokenConsumed={vaultTokenConsumed}
        showVaultScan={showVaultScan}
        vaultLoading={vaultLoading}
        handleCloseVaultDocument={handleCloseVaultDocument}
        handleOpenVaultDocument={handleOpenVaultDocument}
        vaultImageBlobUrl={vaultImageBlobUrl}
        vaultError={vaultError}
        officerCustomNote={officerCustomNote}
        setOfficerCustomNote={setOfficerCustomNote}
        handleApproveDossier={handleApproveDossier}
        handleRequestSupplement={handleRequestSupplement}
      />
    </div>
  );
};

export default PerWardDashboard;
