import { OfficerIncidentEvidence } from '../components/OfficerIncidentEvidence';
import { paperDetails } from '../core/paperForm';
/**
 * SmartWard AI Mobile — Đăng Nhập & Bàn Cán Bộ Một Cửa Di Động (Đồng bộ 100% với Web RoleGateway & PerWardDashboard)
 * - Đăng nhập Công chức (Chọn 102 đơn vị, badgeId CB-<wardCode>, PIN 6–32 ký tự + Đổi PIN) -> JWT lưu SecureStore
 * - Masthead Đỏ Đô (#8F0A1B) + Bảng KPI 4 chỉ số + 3 Tab nghiệp vụ (Hồ sơ, Sự cố, Vùng xám AI)
 * - Camera Quét QR Phiếu hẹn tại quầy + Tìm kiếm & Lọc hồ sơ + Xem ảnh Zero-Trust Vault 1 lần (410 Gone)
 * - Cách ly địa bàn SEC-09 + Che mờ CCCD ********1234 + Modal xác nhận Đăng xuất thu hồi Redis
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  AlertTriangle,
  BrainCircuit,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  FileCheck2,
  Fingerprint,
  KeyRound,
  Landmark,
  Lock,
  LogOut,
  MapPin,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react-native';
import {
  fetchOfficerHitlQueue,
  fetchOfficerIssueClusters,
  listOfficerDossiers,
  resolveOfficerHitlItem,
  updateIssueClusterStatus,
} from '../api/client';
import { MobileOfficerChangePinModal } from '../components/MobileOfficerChangePinModal';
import { OfficerVaultViewerModal } from '../components/OfficerVaultViewerModal';
import { useAccessibility } from '../context/AccessibilityContext';
import { useOfficerAuth } from '../context/OfficerAuthContext';
import { useWard } from '../context/WardContext';
import { normalizeVietnameseText } from '../core/angiangWards';
import {
  buildDefaultOfficerBadgeForWard,
  filterOfficerDossiers,
  getOfficerDossierStatusMeta,
  lookupDossierByScannedCounterQr,
  resolveWardNameByCode,
  sanitizeOfficerDossierForDisplay,
  submitOfficerDossierDecision,
  type OfficerDossierFilter,
} from '../core/officerAuditService';
import { useResponsivePhone } from '../theme/responsive';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';
import type {
  HitlGrayZoneItemDto,
  IssueClusterDto,
  OfficerDossierDto,
} from '../types/api.types';

type OfficerDeskTab = 'FORMS' | 'INCIDENTS' | 'HITL';
type IncidentStatusFilter = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

const DOSSIER_FILTER_CHIPS: Array<{ key: OfficerDossierFilter; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'SUPPLEMENTED', label: 'Vừa bổ sung' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'SUPPLEMENT_REQUIRED', label: 'Cần bổ sung' },
];

const INCIDENT_FILTER_CHIPS: Array<{ key: IncidentStatusFilter; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'OPEN', label: 'Chờ tiếp nhận' },
  { key: 'IN_PROGRESS', label: 'Đang xử lý' },
  { key: 'RESOLVED', label: 'Đã hoàn thành' },
];

function mapIncidentCategoryLabel(category: string): string {
  switch ((category || '').toUpperCase()) {
    case 'ROAD_DAMAGE':
      return 'Đường / Hạ tầng';
    case 'FLOODING':
      return 'Ngập nước / Thủy lợi';
    case 'LIGHTING_ELECTRICAL':
      return 'Đèn đường / Điện';
    case 'ENVIRONMENT':
      return 'Môi trường / Rác thải';
    case 'ORDER_SECURITY':
      return 'Trật tự đô thị';
    default:
      return category || 'Sự cố hiện trường';
  }
}

export const OfficerMobileAuditScreen: React.FC = () => {
  const { currentWard, allWards, selectWard } = useWard();
  const {
    officer,
    isAuthenticated,
    isRestoring,
    authError,
    biometricAvailable,
    biometricLabel,
    biometricEnabled,
    isBiometricLocked,
    login,
    logout,
    setBiometricEnabled,
    unlockWithBiometrics,
    unlockFallbackToPin,
    clearAuthError,
  } = useOfficerAuth();
  const { typography, fontScaleMode } = useAccessibility();
  const responsive = useResponsivePhone(fontScaleMode);
  const [camPerm, requestCamPerm] = useCameraPermissions();

  // Login inputs — synchronized with Web RoleGateway (`CB-<wardCode>` + empty PIN)
  const [selectedLoginWardCode, setSelectedLoginWardCode] = useState(currentWard.code);
  const [badgeId, setBadgeId] = useState(() => buildDefaultOfficerBadgeForWard(currentWard.code));
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [wardPickerVisible, setWardPickerVisible] = useState(false);
  const [wardSearchKeyword, setWardSearchKeyword] = useState('');
  const [changePinVisible, setChangePinVisible] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginRoleNotice, setLoginRoleNotice] = useState<string | null>(null);

  // Officer Workspace Tabs & Refresh State
  const [activeTab, setActiveTab] = useState<OfficerDeskTab>('FORMS');
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  // Tab 1: Dossiers + QR Counter Scanner
  const [dossiers, setDossiers] = useState<OfficerDossierDto[]>([]);
  const [dossierFilter, setDossierFilter] = useState<OfficerDossierFilter>('ALL');
  const [dossierSearch, setDossierSearch] = useState('');
  const [scannerSectionOpen, setScannerSectionOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [manualQrInput, setManualQrInput] = useState('');
  const [scanNotice, setScanNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [selectedDossier, setSelectedDossier] = useState<OfficerDossierDto | null>(null);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Tab 2: Field Incidents (Triage Clusters)
  const [clusters, setClusters] = useState<IssueClusterDto[]>([]);
  const [incidentFilter, setIncidentFilter] = useState<IncidentStatusFilter>('ALL');
  const [updatingClusterCode, setUpdatingClusterCode] = useState<string | null>(null);
  const [incidentNotice, setIncidentNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  // Tab 3: AI Gray-Zone HITL Queue
  const [hitlItems, setHitlItems] = useState<HitlGrayZoneItemDto[]>([]);
  const [hitlFilter, setHitlFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [expandedHitlIds, setExpandedHitlIds] = useState<Record<string, boolean>>({});
  const [hitlDrafts, setHitlDrafts] = useState<Record<string, string>>({});
  const [resolvingHitlId, setResolvingHitlId] = useState<string | null>(null);
  const [hitlNotice, setHitlNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // Zero-Trust Vault One-Time Viewer
  const [activeVaultToken, setActiveVaultToken] = useState<string | null>(null);
  const [consumedTokens, setConsumedTokens] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelectedLoginWardCode(currentWard.code);
    setBadgeId((prev) =>
      prev.startsWith('CB-') || !prev.trim()
        ? buildDefaultOfficerBadgeForWard(currentWard.code)
        : prev
    );
  }, [currentWard.code]);

  const selectedLoginWard = useMemo(
    () =>
      allWards.find((w) => w.code === selectedLoginWardCode) ||
      allWards.find((w) => w.code === currentWard.code) ||
      currentWard,
    [allWards, selectedLoginWardCode, currentWard]
  );

  const filteredWards = useMemo(() => {
    const norm = normalizeVietnameseText(wardSearchKeyword);
    if (!norm) return allWards;
    return allWards.filter(
      (w) =>
        normalizeVietnameseText(w.name).includes(norm) ||
        normalizeVietnameseText(w.code).includes(norm) ||
        normalizeVietnameseText(w.area).includes(norm)
    );
  }, [allWards, wardSearchKeyword]);

  const fetchOfficerWorkspace = useCallback(async () => {
    if (!officer) return;
    setLoadingWorkspace(true);
    setWorkspaceError(null);
    try {
      const [dossierRes, clusterRes, hitlRes] = await Promise.allSettled([
        listOfficerDossiers(officer.wardCode),
        fetchOfficerIssueClusters({ wardCode: officer.wardCode }),
        fetchOfficerHitlQueue(),
      ]);

      const failedParts: string[] = [];
      if (dossierRes.status === 'fulfilled') {
        setDossiers(dossierRes.value.map(sanitizeOfficerDossierForDisplay));
      } else {
        failedParts.push('Hồ sơ');
      }
      if (clusterRes.status === 'fulfilled') {
        setClusters(clusterRes.value);
      } else {
        failedParts.push('Sự cố');
      }
      if (hitlRes.status === 'fulfilled') {
        setHitlItems(hitlRes.value);
        setHitlDrafts((prev) => {
          const next = { ...prev };
          for (const item of hitlRes.value) {
            if (next[item.id] === undefined) {
              next[item.id] = item.approvedAnswer || item.suggestedAnswer || '';
            }
          }
          return next;
        });
      } else {
        failedParts.push('Vùng xám AI');
      }

      if (failedParts.length > 0) {
        setWorkspaceError(
          `Không tải được mục: ${failedParts.join(', ')}. Kéo xuống hoặc bấm Thử lại.`
        );
      }
    } finally {
      setLoadingWorkspace(false);
    }
  }, [officer]);

  useEffect(() => {
    if (isAuthenticated && officer) {
      void fetchOfficerWorkspace();
    }
  }, [fetchOfficerWorkspace, isAuthenticated, officer]);

  const handleOfficerLogin = async () => {
    if (loggingIn) return;
    clearAuthError();
    setLoginRoleNotice(null);

    const cleanBadge = badgeId.trim().toUpperCase();
    const cleanPin = pin.trim();
    if (!cleanBadge) {
      setLoginRoleNotice('Vui lòng nhập Mã thẻ công chức.');
      return;
    }
    if (cleanPin.length < 6) {
      setLoginRoleNotice('Mã PIN công vụ phải từ 6 ký tự trở lên.');
      return;
    }

    setLoggingIn(true);
    try {
      const principal = await login({
        badgeId: cleanBadge,
        pin: cleanPin,
        wardCode: selectedLoginWardCode || currentWard.code,
      });

      if (principal.role?.toUpperCase() === 'ADMIN') {
        setLoginRoleNotice(
          'Tài khoản Quản trị viên cấp Tỉnh (ADMIN) không xử lý hồ sơ cấp xã; vui lòng dùng Bảng điều hành Web /admin.'
        );
      } else if (principal.wardCode && principal.wardCode !== 'AG_PROVINCE') {
        const matchedWard = allWards.find(
          (w) => w.code.toUpperCase() === principal.wardCode.toUpperCase()
        );
        await selectWard(matchedWard || principal.wardCode, false);
      }
    } catch {
      // Error surfaced via OfficerAuthContext.authError
    } finally {
      setLoggingIn(false);
    }
  };

  const handleCounterQrCode = async (rawCode: string) => {
    setScanNotice(null);
    setCameraOpen(false);
    const res = await lookupDossierByScannedCounterQr(rawCode);
    if (res.success && res.dossier) {
      setSelectedDossier(res.dossier);
      setFeedbackInput(res.dossier.officerFeedback || '');
      setScanNotice({ type: 'ok', text: res.message });
    } else {
      const clean = rawCode.trim().toUpperCase();
      const localMatch = dossiers.find(
        (d) =>
          clean.includes(d.dossierCode.toUpperCase()) ||
          (d.appointmentCode && clean.includes(d.appointmentCode.toUpperCase()))
      );
      if (localMatch) {
        setSelectedDossier(localMatch);
        setFeedbackInput(localMatch.officerFeedback || '');
        setScanNotice({
          type: 'ok',
          text: `Đã mở hồ sơ ${localMatch.dossierCode} từ danh sách địa bàn.`,
        });
      } else {
        setScanNotice({ type: 'err', text: res.message });
      }
    }
  };

  const handleSimulateCounterQr = () => {
    const first = dossiers[0];
    if (first) {
      const qr = `SMARTWARD_PASS|${first.dossierCode}|${first.appointmentCode || 'LH-20261118-8899'}|${first.wardCode}`;
      void handleCounterQrCode(qr);
      return;
    }

    const demoDossier: OfficerDossierDto = sanitizeOfficerDossierForDisplay({
      id: 'demo-1',
      dossierCode: 'HS-20261118-0001',
      procedureCode: 'TTHC-CR-01',
      procedureName: 'Đăng ký thường trú (Mẫu CT01)',
      wardCode: officer?.wardCode || currentWard.code,
      citizenCccd: '089205023490',
      citizenName: 'NGUYỄN MINH TUẤN KHANH',
      status: 'PENDING',
      slaDeadline: '2026-11-25',
      formData: { citizenEmail: 'congdan@gmail.com' },
      vaultDocIds: ['OTT_DEMO_CT01_001'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setSelectedDossier(demoDossier);
    setFeedbackInput('');
    setScanNotice({
      type: 'ok',
      text: `Đã mô phỏng quét mã QR hồ sơ ${demoDossier.dossierCode} tại quầy.`,
    });
  };

  const handleReviewDecision = async (decision: 'APPROVED' | 'SUPPLEMENT_REQUIRED') => {
    if (!selectedDossier || reviewing) return;
    setReviewing(true);
    setScanNotice(null);
    try {
      const updated = await submitOfficerDossierDecision(
        selectedDossier,
        decision,
        feedbackInput
      );
      setSelectedDossier(updated);
      setDossiers((prev) =>
        prev.map((item) => (item.dossierCode === updated.dossierCode ? updated : item))
      );
      setScanNotice({
        type: 'ok',
        text:
          decision === 'APPROVED'
            ? `Đã duyệt hồ sơ ${updated.dossierCode} & cấp mã hẹn ${updated.appointmentCode || ''}.`
            : `Đã gửi yêu cầu bổ sung hồ sơ ${updated.dossierCode} tới công dân.`,
      });
    } catch {
      setScanNotice({
        type: 'err',
        text: 'Không thể đồng bộ kết quả duyệt lên máy chủ lúc này.',
      });
    } finally {
      setReviewing(false);
    }
  };

  const handleUpdateClusterStatus = async (
    clusterCode: string,
    nextStatus: 'IN_PROGRESS' | 'RESOLVED'
  ) => {
    if (updatingClusterCode) return;
    setUpdatingClusterCode(clusterCode);
    setIncidentNotice(null);
    try {
      const updated = await updateIssueClusterStatus(
        clusterCode,
        nextStatus,
        `Cán bộ ${officer?.fullName || officer?.badgeId || 'Một cửa'} cập nhật trạng thái từ ứng dụng di động.`
      );
      setClusters((prev) =>
        prev.map((c) =>
          c.clusterCode === clusterCode ? { ...c, status: updated.status || nextStatus } : c
        )
      );
      setIncidentNotice({
        type: 'ok',
        text: `Đã cập nhật cụm sự cố ${clusterCode} sang "${nextStatus === 'RESOLVED' ? 'Đã hoàn thành' : 'Đang xử lý'}".`,
      });
    } catch {
      setIncidentNotice({
        type: 'err',
        text: `Không thể cập nhật trạng thái cụm sự cố ${clusterCode} lên máy chủ.`,
      });
    } finally {
      setUpdatingClusterCode(null);
    }
  };

  const handleResolveHitl = async (item: HitlGrayZoneItemDto) => {
    if (resolvingHitlId) return;
    const answerText = (hitlDrafts[item.id] ?? item.suggestedAnswer ?? '').trim();
    if (!answerText) {
      setHitlNotice({
        type: 'err',
        text: 'Vui lòng nhập nội dung câu trả lời chính thức trước khi phê duyệt.',
      });
      return;
    }

    setResolvingHitlId(item.id);
    setHitlNotice(null);
    try {
      const resolved = await resolveOfficerHitlItem(
        item.id,
        answerText,
        officer?.fullName || officer?.badgeId
      );
      setHitlItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                status: resolved.status || 'APPROVED',
                approvedAnswer: resolved.approvedAnswer || answerText,
              }
            : it
        )
      );
      setHitlNotice({
        type: 'ok',
        text: 'Đã duyệt câu trả lời vùng xám và nạp vào bộ nhớ đệm AI Redis.',
      });
    } catch {
      setHitlNotice({
        type: 'err',
        text: 'Không thể duyệt mục vùng xám lúc này. Vui lòng thử lại.',
      });
    } finally {
      setResolvingHitlId(null);
    }
  };

  const handleTokenConsumed = useCallback((token: string) => {
    setConsumedTokens((prev) => ({ ...prev, [token]: true }));
  }, []);

  // Derived lists & KPI counters (synced with Web PerWardDashboard)
  const filteredDossiers = useMemo(
    () => filterOfficerDossiers(dossiers, dossierFilter, dossierSearch),
    [dossiers, dossierFilter, dossierSearch]
  );

  const filteredClusters = useMemo(() => {
    if (incidentFilter === 'ALL') return clusters;
    return clusters.filter((c) => (c.status || '').toUpperCase() === incidentFilter);
  }, [clusters, incidentFilter]);

  const kpiPendingDossiers = useMemo(
    () => dossiers.filter((d) => (d.status || '').toUpperCase() === 'PENDING').length,
    [dossiers]
  );
  const kpiSupplementedDossiers = useMemo(
    () => dossiers.filter((d) => (d.status || '').toUpperCase() === 'SUPPLEMENTED').length,
    [dossiers]
  );
  const kpiPendingIncidents = useMemo(
    () => clusters.filter((c) => (c.status || '').toUpperCase() === 'OPEN').length,
    [clusters]
  );
  const kpiPendingHitl = useMemo(
    () => hitlItems.filter((h) => (h.status || '').toUpperCase() === 'PENDING').length,
    [hitlItems]
  );

  if (isRestoring) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.citizenCrimson} />
        <Text style={styles.loadingText}>Đang xác thực phiên Cán bộ (/api/v1/auth/officer/me)...</Text>
      </View>
    );
  }

  // Biometric Unlock Gate
  if (isBiometricLocked) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: responsive.horizontalPadding },
        ]}
      >
        <View style={[styles.loginCard, { padding: responsive.cardPadding }]}>
          <View style={styles.loginTitleRow}>
            <View style={styles.crimsonIconBox}>
              <Fingerprint size={22} color="#FDE047" />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.loginTitle, typography.headingMd]}>
                Mở khóa phiên Cán bộ
              </Text>
              <Text style={[styles.loginSub, typography.captionSm]}>
                Dùng {biometricLabel} để tiếp tục làm việc nhanh tại UBND {currentWard.name}
              </Text>
            </View>
          </View>

          {authError ? (
            <View style={styles.errorBox}>
              <AlertTriangle size={15} color={COLORS.errorAccent} />
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void unlockWithBiometrics();
            }}
            style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed]}
          >
            <Fingerprint size={17} color="#FDE047" />
            <Text style={[styles.loginBtnText, typography.bodyBold]}>
              Mở khóa bằng {biometricLabel}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void unlockFallbackToPin();
            }}
            style={[styles.secondaryOutlineBtn, { alignSelf: 'center', marginTop: SPACING.xs }]}
          >
            <Text style={styles.secondaryOutlineText}>Chuyển sang nhập mã PIN</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Synchronized Officer Login Screen (Parity with Web RoleGateway.tsx)
  if (!isAuthenticated || !officer) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: responsive.horizontalPadding },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.loginCard, { padding: responsive.cardPadding }]}>
          <View style={styles.loginTitleRow}>
            <View style={styles.crimsonIconBox}>
              <Landmark size={20} color="#FDE047" />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.loginTitle, typography.headingMd]}>
                Đăng nhập Cán bộ Một cửa
              </Text>
              <Text style={[styles.loginSub, typography.captionSm]}>
                Đồng bộ tài khoản công vụ &amp; cách ly địa bàn 102 xã/phường
              </Text>
            </View>
          </View>

          {/* Ward Selector (matches Web RoleGateway select dropdown) */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Building2 size={14} color={COLORS.primary} />
              <Text style={styles.label}>Đơn vị công tác ({allWards.length})</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setWardSearchKeyword('');
                setWardPickerVisible(true);
              }}
              style={styles.wardPickerBtn}
            >
              <Text style={styles.wardPickerText} numberOfLines={1}>
                {selectedLoginWard.name} ({selectedLoginWard.code})
              </Text>
              <ChevronDown size={16} color={COLORS.textMuted} />
            </Pressable>
          </View>

          {/* Officer Badge ID */}
          <View style={styles.field}>
            <Text style={styles.label}>Mã thẻ công chức</Text>
            <View style={styles.iconInputWrap}>
              <KeyRound size={15} color={COLORS.textMuted} />
              <TextInput
                value={badgeId}
                onChangeText={(v) => setBadgeId(v.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="VD: CB-AG_P_LONGXUYEN"
                placeholderTextColor={COLORS.textMuted}
                style={[styles.iconInput, typography.bodyMd]}
              />
            </View>
          </View>

          {/* Alphanumeric 6-32 char PIN + Toggle + Change PIN link */}
          <View style={styles.field}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Mã PIN công vụ</Text>
              <Pressable onPress={() => setChangePinVisible(true)} hitSlop={8}>
                <Text style={styles.changePinLink}>Đổi mã PIN?</Text>
              </Pressable>
            </View>
            <View style={styles.iconInputWrap}>
              <Lock size={15} color={COLORS.textMuted} />
              <TextInput
                value={pin}
                onChangeText={setPin}
                secureTextEntry={!showPin}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={32}
                placeholder="Nhập mã PIN (6–32 ký tự)"
                placeholderTextColor={COLORS.textMuted}
                style={[styles.iconInput, typography.bodyMd]}
              />
              <Pressable onPress={() => setShowPin((v) => !v)} hitSlop={8}>
                {showPin ? (
                  <EyeOff size={16} color={COLORS.textMuted} />
                ) : (
                  <Eye size={16} color={COLORS.textMuted} />
                )}
              </Pressable>
            </View>
          </View>

          {loginRoleNotice || authError ? (
            <View style={styles.errorBox}>
              <AlertTriangle size={15} color={COLORS.errorAccent} />
              <Text style={styles.errorText}>{loginRoleNotice || authError}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={loggingIn}
            onPress={() => {
              void handleOfficerLogin();
            }}
            style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed]}
          >
            {loggingIn ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <ShieldCheck size={18} color="#FDE047" />
            )}
            <Text style={styles.loginBtnText}>
              {loggingIn ? 'Đang xác thực...' : 'Đăng nhập Hệ thống'}
            </Text>
          </Pressable>

          {/* Security Footer Box (parity with Web RoleGateway) */}
          <View style={styles.securityFooterBox}>
            <Clock size={15} color="#C2410C" />
            <View style={styles.flex1}>
              <Text style={styles.securityFooterTitle}>Phiên làm việc an toàn</Text>
              <Text style={styles.securityFooterSub}>
                Xác thực chung Web/Mobile qua máy chủ Một cửa • Cán bộ: khóa sau 15 phút.
              </Text>
            </View>
          </View>
        </View>

        {/* Searchable 102-Ward Picker Modal */}
        <Modal
          visible={wardPickerVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setWardPickerVisible(false)}
        >
          <SafeAreaView style={styles.modalBackdrop} edges={['top', 'bottom', 'left', 'right']}>
            <View style={styles.wardModalSheet}>
              <View style={styles.wardModalHeader}>
                <Text style={styles.wardModalTitle}>
                  Chọn Đơn vị công tác ({allWards.length})
                </Text>
                <Pressable onPress={() => setWardPickerVisible(false)} style={styles.closeIconBtn}>
                  <X size={18} color={COLORS.textSecondary} />
                </Pressable>
              </View>
              <View style={styles.wardModalSearchWrap}>
                <Search size={15} color={COLORS.textMuted} />
                <TextInput
                  value={wardSearchKeyword}
                  onChangeText={setWardSearchKeyword}
                  placeholder="Tìm xã, phường, mã đơn vị..."
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.wardModalSearchInput}
                />
              </View>
              <FlatList
                data={filteredWards}
                keyExtractor={(item) => item.code}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const active = item.code === selectedLoginWardCode;
                  return (
                    <Pressable
                      onPress={() => {
                        setSelectedLoginWardCode(item.code);
                        setBadgeId(buildDefaultOfficerBadgeForWard(item.code));
                        setPin('');
                        clearAuthError();
                        setLoginRoleNotice(null);
                        setWardPickerVisible(false);
                      }}
                      style={[styles.wardRow, active && styles.wardRowActive]}
                    >
                      <View style={styles.flex1}>
                        <Text style={styles.wardRowName}>{item.name}</Text>
                        <Text style={styles.wardRowCode}>
                          {item.code} • {item.area}
                        </Text>
                      </View>
                      {active ? <Check size={17} color={COLORS.citizenCrimson} /> : null}
                    </Pressable>
                  );
                }}
              />
            </View>
          </SafeAreaView>
        </Modal>

        <MobileOfficerChangePinModal
          visible={changePinVisible}
          defaultBadgeId={badgeId}
          onClose={() => setChangePinVisible(false)}
          onSuccess={(newPin) => {
            setPin(newPin);
            clearAuthError();
            setLoginRoleNotice(null);
          }}
        />
      </ScrollView>
    );
  }

  const resolvedOfficerWardName =
    officer.wardName && officer.wardName !== officer.wardCode
      ? officer.wardName
      : resolveWardNameByCode(officer.wardCode);

  const selectedFormData = (selectedDossier?.formData || {}) as Record<string, unknown>;

  // Authenticated Officer Workspace (Crimson Masthead + 4 KPI Strip + 3 Tabs)
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: responsive.horizontalPadding },
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={loadingWorkspace}
          onRefresh={() => {
            void fetchOfficerWorkspace();
          }}
          tintColor={COLORS.citizenCrimson}
        />
      }
    >
      {/* 1. Crimson Officer Masthead (Parity with Web PerWardDashboard) */}
      <View style={styles.crimsonMasthead}>
        <View style={styles.mastheadTopRow}>
          <View style={styles.goldBadge}>
            <Text style={styles.goldBadgeText}>BÀN TRỰC MỘT CỬA • {officer.badgeId}</Text>
          </View>
          <View style={styles.dutyPill}>
            <Text style={styles.dutyPillText}>ĐANG TRỰC</Text>
          </View>
        </View>

        <Text style={styles.mastheadWard} numberOfLines={1}>
          UBND {resolvedOfficerWardName}
        </Text>
        <Text style={styles.mastheadOfficerName} numberOfLines={1}>
          {officer.fullName.replace(` — ${resolvedOfficerWardName}`, '')} • Mã đơn vị: {officer.wardCode}
        </Text>

        <View style={styles.mastheadActions}>
          {biometricAvailable ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void setBiometricEnabled(!biometricEnabled);
              }}
              style={[
                styles.mastheadActionBtn,
                biometricEnabled && styles.mastheadActionBtnActive,
              ]}
            >
              <Fingerprint size={13} color={biometricEnabled ? '#8F0A1B' : '#FFFFFF'} />
              <Text
                style={[
                  styles.mastheadActionText,
                  biometricEnabled && { color: '#8F0A1B' },
                ]}
              >
                {biometricEnabled ? `${biometricLabel}: Bật` : biometricLabel}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => setChangePinVisible(true)}
            style={styles.mastheadActionBtn}
          >
            <KeyRound size={13} color="#FDE047" />
            <Text style={styles.mastheadActionText}>Đổi PIN</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đăng xuất cán bộ"
            onPress={() => setLogoutConfirmVisible(true)}
            style={styles.mastheadLogoutBtn}
          >
            <LogOut size={13} color="#FFFFFF" />
            <Text style={styles.mastheadActionText}>Thoát</Text>
          </Pressable>
        </View>
      </View>

      {/* First-login Change PIN reminder */}
      {officer.mustChangePin ? (
        <View style={styles.warningBanner}>
          <AlertTriangle size={15} color="#92400E" />
          <Text style={styles.warningBannerText}>
            Tài khoản đang dùng PIN cấp lần đầu. Vui lòng đổi mã PIN mới để bảo mật.
          </Text>
          <Pressable onPress={() => setChangePinVisible(true)} style={styles.warningBannerBtn}>
            <Text style={styles.warningBannerBtnText}>Đổi ngay</Text>
          </Pressable>
        </View>
      ) : null}

      {officer.role?.toUpperCase() === 'ADMIN' ? (
        <View style={styles.warningBanner}>
          <AlertTriangle size={15} color="#92400E" />
          <Text style={styles.warningBannerText}>
            Tài khoản Quản trị viên (ADMIN) bị giới hạn truy cập nghiệp vụ trực tiếp cấp xã theo chuẩn SEC-09.
          </Text>
        </View>
      ) : null}

      {workspaceError ? (
        <View style={styles.errorBox}>
          <AlertTriangle size={15} color={COLORS.errorAccent} />
          <Text style={styles.errorText}>{workspaceError}</Text>
          <Pressable
            onPress={() => {
              void fetchOfficerWorkspace();
            }}
            style={styles.retryInlineBtn}
          >
            <Text style={styles.retryInlineBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}

      {/* 2. KPI Summary Strip (4 interactive cards) */}
      <View style={styles.kpiRow}>
        <Pressable
          onPress={() => {
            setActiveTab('FORMS');
            setDossierFilter('PENDING');
          }}
          style={[
            styles.kpiCard,
            activeTab === 'FORMS' && dossierFilter === 'PENDING' && styles.kpiCardActive,
          ]}
        >
          <Text style={[styles.kpiValue, { color: COLORS.citizenCrimson }]}>
            {kpiPendingDossiers}
          </Text>
          <Text style={styles.kpiLabel}>Chờ duyệt</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setActiveTab('FORMS');
            setDossierFilter('SUPPLEMENTED');
          }}
          style={[
            styles.kpiCard,
            activeTab === 'FORMS' && dossierFilter === 'SUPPLEMENTED' && styles.kpiCardActive,
          ]}
        >
          <Text style={[styles.kpiValue, { color: '#6D28D9' }]}>{kpiSupplementedDossiers}</Text>
          <Text style={styles.kpiLabel}>Vừa bổ sung</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setActiveTab('INCIDENTS');
            setIncidentFilter('OPEN');
          }}
          style={[styles.kpiCard, activeTab === 'INCIDENTS' && styles.kpiCardActive]}
        >
          <Text style={[styles.kpiValue, { color: '#B45309' }]}>{kpiPendingIncidents}</Text>
          <Text style={styles.kpiLabel}>Sự cố chờ</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setActiveTab('HITL');
            setHitlFilter(kpiPendingHitl > 0 ? 'PENDING' : 'ALL');
          }}
          style={[styles.kpiCard, activeTab === 'HITL' && styles.kpiCardActive]}
        >
          <Text style={[styles.kpiValue, { color: COLORS.primary }]}>{kpiPendingHitl}</Text>
          <Text style={styles.kpiLabel}>Vùng xám AI</Text>
        </Pressable>
      </View>

      {/* 3. Synchronized 3 Workspace Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('FORMS')}
          style={[styles.tabItem, activeTab === 'FORMS' && styles.tabItemActive]}
        >
          <FileCheck2
            size={14}
            color={activeTab === 'FORMS' ? '#FFFFFF' : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'FORMS' && styles.tabTextActive]}>
            Hồ sơ ({dossiers.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('INCIDENTS')}
          style={[styles.tabItem, activeTab === 'INCIDENTS' && styles.tabItemActive]}
        >
          <Wrench
            size={14}
            color={activeTab === 'INCIDENTS' ? '#FFFFFF' : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'INCIDENTS' && styles.tabTextActive]}>
            Sự cố ({clusters.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('HITL')}
          style={[styles.tabItem, activeTab === 'HITL' && styles.tabItemActive]}
        >
          <BrainCircuit
            size={14}
            color={activeTab === 'HITL' ? '#FFFFFF' : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'HITL' && styles.tabTextActive]}>
            Vùng xám ({hitlItems.length})
          </Text>
        </Pressable>
      </View>

      {/* ==================== TAB 1: HỒ SƠ (FORMS + QR COUNTER) ==================== */}
      {activeTab === 'FORMS' && (
        <>
          {/* Compact Collapsible Counter QR Lookup Card */}
          <View style={[styles.card, { padding: responsive.cardPadding }]}>
            <Pressable
              onPress={() => setScannerSectionOpen((v) => !v)}
              style={styles.rowBetween}
            >
              <View style={styles.rowGap}>
                <QrCode size={16} color={COLORS.citizenCrimson} />
                <Text style={[styles.cardTitle, typography.bodyBold]}>
                  Tra cứu / Quét QR Phiếu Hẹn Tại Quầy
                </Text>
              </View>
              <ChevronDown
                size={16}
                color={COLORS.textMuted}
                style={scannerSectionOpen ? { transform: [{ rotate: '180deg' }] } : undefined}
              />
            </Pressable>

            {scannerSectionOpen ? (
              <View style={{ gap: SPACING.sm, marginTop: SPACING.xs }}>
                <View style={styles.rowBetween}>
                  <Pressable
                    onPress={() => setCameraOpen((v) => !v)}
                    style={styles.smallCrimsonBtn}
                  >
                    <Text style={styles.smallCrimsonBtnText}>
                      {cameraOpen ? 'Tắt Camera' : 'Mở Camera QR'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSimulateCounterQr}
                    style={styles.demoScanBtnCompact}
                  >
                    <Sparkles size={13} color={COLORS.primary} />
                    <Text style={styles.demoScanText}>Mô phỏng Quét QR</Text>
                  </Pressable>
                </View>

                {cameraOpen ? (
                  <View style={styles.scannerBox}>
                    {Platform.OS !== 'web' && camPerm?.granted ? (
                      <CameraView
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                        onBarcodeScanned={({ data }) => {
                          if (data) void handleCounterQrCode(data);
                        }}
                      />
                    ) : (
                      <View style={styles.scannerFallback}>
                        <Text style={styles.scannerFallbackText}>
                          {Platform.OS === 'web'
                            ? 'Bản Web Preview — nhập mã HS/LH hoặc bấm Mô phỏng Quét QR.'
                            : 'Cấp quyền Camera để quét trực tiếp Phiếu hẹn QR công dân.'}
                        </Text>
                        {Platform.OS !== 'web' && !camPerm?.granted ? (
                          <Pressable
                            onPress={() => {
                              void requestCamPerm();
                            }}
                            style={styles.smallCrimsonBtn}
                          >
                            <Text style={styles.smallCrimsonBtnText}>Cấp quyền Camera</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    )}
                  </View>
                ) : null}

                <View style={styles.manualRow}>
                  <TextInput
                    value={manualQrInput}
                    onChangeText={setManualQrInput}
                    autoCapitalize="characters"
                    placeholder="Nhập mã HS-... hoặc LH-..."
                    placeholderTextColor={COLORS.textMuted}
                    style={[styles.input, styles.flex1, typography.bodyMd]}
                  />
                  <Pressable
                    onPress={() => {
                      if (manualQrInput.trim()) void handleCounterQrCode(manualQrInput);
                    }}
                    style={styles.lookupBtn}
                  >
                    <Text style={styles.lookupBtnText}>Tìm</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {scanNotice ? (
              <View
                style={[
                  styles.noticeBanner,
                  scanNotice.type === 'ok' ? styles.noticeOk : styles.noticeErr,
                ]}
              >
                <Text
                  style={[
                    styles.noticeText,
                    scanNotice.type === 'ok' ? styles.textOk : styles.textErr,
                  ]}
                >
                  {scanNotice.text}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Selected Dossier Review Card */}
          {selectedDossier ? (
            <View style={[styles.reviewCard, { padding: responsive.cardPadding }]}>
              <View style={styles.rowBetween}>
                <Text style={styles.reviewCode}>{selectedDossier.dossierCode}</Text>
                {(() => {
                  const meta = getOfficerDossierStatusMeta(selectedDossier.status);
                  return (
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: meta.bgColor, borderColor: meta.borderColor },
                      ]}
                    >
                      <Text style={[styles.statusChipText, { color: meta.textColor }]}>
                        {meta.label}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              <Text style={[styles.reviewName, typography.headingMd]}>
                {selectedDossier.citizenName} ({selectedDossier.citizenCccd})
              </Text>
              <Text style={[styles.reviewProc, typography.captionSm]}>
                {selectedDossier.procedureName} ({selectedDossier.procedureCode})
                {selectedDossier.slaDeadline ? ` • Hạn: ${selectedDossier.slaDeadline}` : ''}
              </Text>

              {/* Key Declared Data Summary (matching Web Drawer) */}
              {Object.keys(selectedFormData).length > 0 ? (
                <View style={styles.formDataBox}>
                  {paperDetails(selectedFormData).map(([label,value]) =>
                    <Text key={label} style={styles.formDataLine}>{label} · {value}</Text>)}
                  {Boolean(selectedFormData.birthDate || selectedFormData.dob) ? (
                    <Text style={styles.formDataLine}>
                      Ngày sinh: {String(selectedFormData.birthDate || selectedFormData.dob)}
                    </Text>
                  ) : null}
                  {Boolean(selectedFormData.permanentAddress || selectedFormData.address) ? (
                    <Text style={styles.formDataLine}>
                      Địa chỉ:{' '}
                      {String(selectedFormData.permanentAddress || selectedFormData.address)}
                    </Text>
                  ) : null}
                  {Boolean(selectedFormData.childFullName) ? (
                    <Text style={styles.formDataLine}>
                      Trẻ khai sinh: {String(selectedFormData.childFullName)}
                    </Text>
                  ) : null}
                  {Boolean(selectedFormData.motherName || selectedFormData.fatherName) ? (
                    <Text style={styles.formDataLine}>
                      Cha/Mẹ:{' '}
                      {[selectedFormData.fatherName, selectedFormData.motherName]
                        .filter(Boolean)
                        .join(' • ')}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {/* TASK-058: Labeled Multi-Attachment Zero-Trust Vault View (separates durable documentCode from 1-time token; backward-compatible with legacy dossiers) */}
              {(() => {
                const rawMeta = Array.isArray(selectedFormData.attachedDocuments)
                  ? (selectedFormData.attachedDocuments as Array<{
                      documentCode?: string;
                      oneTimeToken?: string;
                      docRole?: string;
                      docLabel?: string;
                      pageIndex?: number;
                      verified?: boolean;
                    }>)
                  : [];
                const tokens = selectedDossier.vaultDocIds || [];
                const items =
                  rawMeta.length > 0
                    ? rawMeta.map((m, idx) => ({
                        token: m.oneTimeToken || tokens[idx] || '',
                        documentCode: m.documentCode || `LEGACY_${idx + 1}`,
                        label: m.docLabel || `Ảnh giấy tờ #${idx + 1}`,
                        pageIndex: m.pageIndex || idx + 1,
                        verified: m.verified,
                      }))
                    : tokens.map((token, idx) => ({
                        token,
                        documentCode: `LEGACY_${idx + 1}`,
                        label: `Ảnh giấy tờ #${idx + 1} (hồ sơ cũ)`,
                        pageIndex: idx + 1,
                        verified: undefined,
                      }));

                if (items.length === 0) return null;
                return (
                  <View style={styles.vaultList}>
                    {items.map((att, idx) => {
                      const used = Boolean(att.token && consumedTokens[att.token]);
                      return (
                        <Pressable
                          key={`${att.documentCode}_${idx}`}
                          accessibilityRole="button"
                          disabled={!att.token}
                          onPress={() => {
                            if (att.token) setActiveVaultToken(att.token);
                          }}
                          style={[styles.vaultBtn, used && styles.vaultBtnUsed]}
                        >
                          <Eye
                            size={15}
                            color={used ? COLORS.errorAccent : COLORS.citizenCrimson}
                          />
                          <View style={styles.flex1}>
                            <Text
                              style={[styles.vaultBtnText, used && styles.textErr]}
                              numberOfLines={1}
                            >
                              {att.label} · Trang {att.pageIndex}
                              {att.verified === false ? ' (Tham khảo)' : ''}
                            </Text>
                            <Text style={styles.dossierRowProc} numberOfLines={1}>
                              {used
                                ? `Mã lưu: ${att.documentCode} • Quyền xem 1 lần đã tự hủy (410 Gone)`
                                : `Mã lưu: ${att.documentCode} • Bấm mở ảnh Watermark (1 lần)`}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })()}

              <View style={styles.field}>
                <Text style={styles.label}>Lời dặn Cán bộ gửi công dân</Text>
                <TextInput
                  value={feedbackInput}
                  onChangeText={setFeedbackInput}
                  placeholder="VD: Hồ sơ hợp lệ, mời mang CCCD gốc tới Quầy số 2..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  style={[styles.input, styles.multiline, typography.bodyMd]}
                />
              </View>

              <View style={styles.decisionRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={reviewing}
                  onPress={() => {
                    void handleReviewDecision('SUPPLEMENT_REQUIRED');
                  }}
                  style={({ pressed }) => [styles.supplementBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.supplementBtnText}>Yêu Cầu Bổ Sung</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={reviewing}
                  onPress={() => {
                    void handleReviewDecision('APPROVED');
                  }}
                  style={({ pressed }) => [styles.approveBtn, pressed && styles.pressed]}
                >
                  {reviewing ? (
                    <ActivityIndicator size="small" color={COLORS.onPrimary} />
                  ) : (
                    <CheckCircle2 size={15} color={COLORS.onPrimary} />
                  )}
                  <Text style={styles.approveBtnText}>✓ Duyệt &amp; Gửi Mã QR</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Dossiers Search + Filter + List */}
          <View style={[styles.card, { padding: responsive.cardPadding }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, typography.bodyBold]}>
                Hồ sơ địa bàn ({filteredDossiers.length}/{dossiers.length})
              </Text>
              <Pressable
                onPress={() => {
                  void fetchOfficerWorkspace();
                }}
                style={styles.refreshIconBtn}
              >
                <RefreshCw size={15} color={COLORS.citizenCrimson} />
              </Pressable>
            </View>

            <View style={styles.searchWrap}>
              <Search size={15} color={COLORS.textMuted} />
              <TextInput
                value={dossierSearch}
                onChangeText={setDossierSearch}
                placeholder="Tìm mã hồ sơ, tên công dân, thủ tục..."
                placeholderTextColor={COLORS.textMuted}
                style={styles.searchInput}
              />
              {dossierSearch ? (
                <Pressable onPress={() => setDossierSearch('')} hitSlop={8}>
                  <X size={15} color={COLORS.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipRow}
            >
              {DOSSIER_FILTER_CHIPS.map((chip) => {
                const active = dossierFilter === chip.key;
                return (
                  <Pressable
                    key={chip.key}
                    onPress={() => setDossierFilter(chip.key)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text
                      style={[styles.filterChipText, active && styles.filterChipTextActive]}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {filteredDossiers.length === 0 ? (
              <View style={styles.emptyStateBox}>
                <Text style={styles.emptyStateTitle}>
                  Chưa có hồ sơ nào tại UBND {resolvedOfficerWardName}
                </Text>
                <Text style={styles.emptyListText}>
                  Hệ thống tự động cách ly dữ liệu theo đúng địa bàn ({officer.wardCode}). Hồ sơ mới công dân nộp về {resolvedOfficerWardName} sẽ hiện tại đây ngay lập tức.
                </Text>
              </View>
            ) : (
              filteredDossiers.map((item) => {
                const meta = getOfficerDossierStatusMeta(item.status);
                return (
                  <Pressable
                    key={item.dossierCode}
                    onPress={() => {
                      setSelectedDossier(item);
                      setFeedbackInput(item.officerFeedback || '');
                    }}
                    style={[
                      styles.dossierRow,
                      selectedDossier?.dossierCode === item.dossierCode &&
                        styles.dossierRowActive,
                    ]}
                  >
                    <View style={styles.flex1}>
                      <Text style={styles.dossierRowCode}>{item.dossierCode}</Text>
                      <Text style={styles.dossierRowName} numberOfLines={1}>
                        {item.citizenName} • {item.citizenCccd}
                      </Text>
                      <Text style={styles.dossierRowProc} numberOfLines={1}>
                        {item.procedureName}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: meta.bgColor, borderColor: meta.borderColor },
                      ]}
                    >
                      <Text style={[styles.statusChipText, { color: meta.textColor }]}>
                        {meta.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </>
      )}

      {/* ==================== TAB 2: SỰ CỐ ĐỊA BÀN (INCIDENTS) ==================== */}
      {activeTab === 'INCIDENTS' && (
        <View style={[styles.card, { padding: responsive.cardPadding }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.cardTitle, typography.bodyBold]}>
              Cụm sự cố địa bàn ({filteredClusters.length}/{clusters.length})
            </Text>
            <Pressable
              onPress={() => {
                void fetchOfficerWorkspace();
              }}
              style={styles.refreshIconBtn}
            >
              <RefreshCw size={15} color={COLORS.citizenCrimson} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipRow}
          >
            {INCIDENT_FILTER_CHIPS.map((chip) => {
              const active = incidentFilter === chip.key;
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => setIncidentFilter(chip.key)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text
                    style={[styles.filterChipText, active && styles.filterChipTextActive]}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {incidentNotice ? (
            <View
              style={[
                styles.noticeBanner,
                incidentNotice.type === 'ok' ? styles.noticeOk : styles.noticeErr,
              ]}
            >
              <Text
                style={[
                  styles.noticeText,
                  incidentNotice.type === 'ok' ? styles.textOk : styles.textErr,
                ]}
              >
                {incidentNotice.text}
              </Text>
            </View>
          ) : null}

          {filteredClusters.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Text style={styles.emptyStateTitle}>
                Chưa có sự cố nào tại UBND {resolvedOfficerWardName}
              </Text>
              <Text style={styles.emptyListText}>
                Các phản ánh hiện trường công dân gửi thuộc địa bàn {resolvedOfficerWardName} ({officer.wardCode}) sẽ tự động gom cụm và hiển thị tại đây.
              </Text>
            </View>
          ) : (
            filteredClusters.map((cluster) => {
              const st = (cluster.status || 'OPEN').toUpperCase();
              const isBusy = updatingClusterCode === cluster.clusterCode;
              const statusColors =
                st === 'RESOLVED'
                  ? { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857', label: 'Đã hoàn thành' }
                  : st === 'IN_PROGRESS'
                  ? { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', label: 'Đang xử lý' }
                  : { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', label: 'Chờ tiếp nhận' };
              return (
                <View key={cluster.clusterCode} style={styles.clusterCard}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.clusterCode}>{cluster.clusterCode}</Text>
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: statusColors.bg, borderColor: statusColors.border },
                      ]}
                    >
                      <Text style={[styles.statusChipText, { color: statusColors.text }]}>
                        {statusColors.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.clusterTitle}>{cluster.title}</Text>
                  <Text style={styles.clusterMeta}>
                    {mapIncidentCategoryLabel(cluster.category)} • {cluster.reportCount} phản ánh
                    {(cluster.photoCount ?? 0) > 0 ? ` • ${cluster.photoCount} ảnh` : ''}
                  </Text>
                  <View style={styles.rowGap}>
                    <MapPin size={12} color={COLORS.textMuted} />
                    <Text style={styles.clusterAddress} numberOfLines={2}>
                      {cluster.addressText ||
                        'Chưa có địa chỉ hiện trường'}
                    </Text>
                  </View>

                  <OfficerIncidentEvidence cluster={cluster} />

                  {st !== 'RESOLVED' ? (
                    <View style={styles.clusterActions}>
                      {st === 'OPEN' ? (
                        <Pressable
                          disabled={isBusy}
                          onPress={() => {
                            void handleUpdateClusterStatus(cluster.clusterCode, 'IN_PROGRESS');
                          }}
                          style={styles.clusterProgressBtn}
                        >
                          <Text style={styles.clusterProgressText}>Tiếp nhận xử lý</Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        disabled={isBusy}
                        onPress={() => {
                          void handleUpdateClusterStatus(cluster.clusterCode, 'RESOLVED');
                        }}
                        style={styles.clusterResolveBtn}
                      >
                        <Text style={styles.clusterResolveText}>✓ Đã khắc phục</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      )}

      {/* ==================== TAB 3: VÙNG XÁM AI (HITL) ==================== */}
      {activeTab === 'HITL' && (() => {
        const pendingHitlCount = hitlItems.filter(
          (h) => (h.status || '').toUpperCase() !== 'APPROVED'
        ).length;
        const approvedHitlCount = hitlItems.length - pendingHitlCount;
        const visibleHitlItems = hitlItems.filter((h) => {
          const isApp = (h.status || '').toUpperCase() === 'APPROVED';
          if (hitlFilter === 'PENDING') return !isApp;
          if (hitlFilter === 'APPROVED') return isApp;
          return true;
        });

        return (
          <View style={[styles.card, { padding: responsive.cardPadding }]}>
            <View style={styles.rowBetween}>
              <View style={styles.flex1}>
                <Text style={[styles.cardTitle, typography.bodyBold]}>
                  Hàng đợi Vùng xám AI ({visibleHitlItems.length}/{hitlItems.length})
                </Text>
                <Text style={styles.hitlSubtitle}>
                  Câu hỏi độ tin cậy trung bình (42% – 78%) cần cán bộ thẩm định
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  void fetchOfficerWorkspace();
                }}
                style={styles.refreshIconBtn}
              >
                <RefreshCw size={15} color={COLORS.citizenCrimson} />
              </Pressable>
            </View>

            <View style={styles.hitlFilterRow}>
              {(
                [
                  { key: 'ALL', label: `Tất cả (${hitlItems.length})` },
                  { key: 'PENDING', label: `Chờ duyệt (${pendingHitlCount})` },
                  { key: 'APPROVED', label: `Đã duyệt (${approvedHitlCount})` },
                ] as const
              ).map((chip) => {
                const active = hitlFilter === chip.key;
                return (
                  <Pressable
                    key={chip.key}
                    onPress={() => setHitlFilter(chip.key)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text
                      style={[styles.filterChipText, active && styles.filterChipTextActive]}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {hitlNotice ? (
              <View
                style={[
                  styles.noticeBanner,
                  hitlNotice.type === 'ok' ? styles.noticeOk : styles.noticeErr,
                ]}
              >
                <Text
                  style={[
                    styles.noticeText,
                    hitlNotice.type === 'ok' ? styles.textOk : styles.textErr,
                  ]}
                >
                  {hitlNotice.text}
                </Text>
              </View>
            ) : null}

            {visibleHitlItems.length === 0 ? (
              <View style={styles.emptyStateBox}>
                <Text style={styles.emptyStateTitle}>
                  {hitlFilter === 'PENDING'
                    ? 'Không còn câu hỏi vùng xám chờ duyệt'
                    : 'Chưa có câu hỏi vùng xám AI'}
                </Text>
                <Text style={styles.emptyListText}>
                  Mọi câu hỏi trong ngưỡng 42% – 78% đã được xử lý hoặc chưa phát sinh.
                </Text>
              </View>
            ) : (
              visibleHitlItems.map((item) => {
                const approved = (item.status || '').toUpperCase() === 'APPROVED';
                const busy = resolvingHitlId === item.id;
                const similarityPct = (
                  Number(item.similarityScore ?? item.maxSimilarity ?? 0) * 100
                ).toFixed(1);
                const questionText = (item.question || item.query || '').trim();
                const answerText = (
                  hitlDrafts[item.id] ??
                  item.approvedAnswer ??
                  item.suggestedAnswer ??
                  ''
                ).trim();
                const expanded = Boolean(expandedHitlIds[item.id]);

                return (
                  <View
                    key={item.id}
                    style={[styles.hitlCard, approved && styles.hitlCardApproved]}
                  >
                    <View style={styles.rowBetween}>
                      <View style={styles.hitlScoreBadge}>
                        <Text style={styles.hitlScore}>Độ khớp: {similarityPct}%</Text>
                      </View>
                      <View
                        style={[
                          styles.statusChip,
                          approved
                            ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }
                            : { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusChipText,
                            { color: approved ? '#047857' : '#B45309' },
                          ]}
                        >
                          {approved ? 'Đã duyệt' : 'Chờ duyệt'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.hitlQuestion}>
                      {questionText ? `“${questionText}”` : 'Câu hỏi pháp lý cần thẩm định'}
                    </Text>

                    {item.wardName || item.legalReference ? (
                      <Text style={styles.hitlMetaLine} numberOfLines={2}>
                        {[item.wardName, item.legalReference].filter(Boolean).join(' • ')}
                      </Text>
                    ) : null}

                    {approved ? (
                      <View style={styles.hitlApprovedAnswerBox}>
                        <Text
                          style={styles.hitlApprovedAnswerText}
                          numberOfLines={expanded ? undefined : 4}
                        >
                          {answerText || 'Đã phê duyệt nội dung trả lời chuẩn.'}
                        </Text>
                        {answerText.length > 180 ? (
                          <Pressable
                            onPress={() =>
                              setExpandedHitlIds((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                            style={styles.hitlExpandBtn}
                          >
                            <Text style={styles.hitlExpandBtnText}>
                              {expanded ? 'Thu gọn' : 'Xem toàn bộ hướng dẫn'}
                            </Text>
                          </Pressable>
                        ) : null}
                        {item.resolvedBy ? (
                          <Text style={styles.hitlResolvedBy}>
                            Duyệt bởi: {item.resolvedBy}
                            {item.createdAt ? ` • ${item.createdAt}` : ''}
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <>
                        <TextInput
                          value={
                            hitlDrafts[item.id] ??
                            item.approvedAnswer ??
                            item.suggestedAnswer ??
                            ''
                          }
                          onChangeText={(txt) =>
                            setHitlDrafts((prev) => ({ ...prev, [item.id]: txt }))
                          }
                          multiline
                          placeholder="Nội dung trả lời chính thức..."
                          placeholderTextColor={COLORS.textMuted}
                          style={[styles.input, styles.multiline, typography.bodyMd]}
                        />
                        <Pressable
                          disabled={busy}
                          onPress={() => {
                            void handleResolveHitl(item);
                          }}
                          style={styles.approveBtn}
                        >
                          {busy ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <CheckCircle2 size={15} color="#FFFFFF" />
                          )}
                          <Text style={styles.approveBtnText}>Duyệt &amp; Lưu vào AI</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                );
              })
            )}
          </View>
        );
      })()}

      {/* Confirm Logout Modal (Parity with Web PerWardDashboard) */}
      <Modal
        visible={logoutConfirmVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setLogoutConfirmVisible(false)}
      >
        <View style={styles.modalBackdropCenter}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Xác nhận kết thúc phiên Cán bộ?</Text>
            <Text style={styles.confirmBody}>
              Bạn đang trực công vụ tài khoản {officer.badgeId} tại UBND {resolvedOfficerWardName}.
              Đăng xuất sẽ thu hồi phiên JWT hiện tại trên máy chủ.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setLogoutConfirmVisible(false)}
                style={styles.confirmCancelBtn}
              >
                <Text style={styles.confirmCancelText}>Ở lại bàn cán bộ</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setLogoutConfirmVisible(false);
                  void logout();
                }}
                style={styles.confirmDangerBtn}
              >
                <Text style={styles.confirmDangerText}>Xác nhận đăng xuất</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <MobileOfficerChangePinModal
        visible={changePinVisible}
        defaultBadgeId={officer.badgeId}
        onClose={() => setChangePinVisible(false)}
      />

      <OfficerVaultViewerModal
        visible={activeVaultToken !== null}
        token={activeVaultToken}
        officerBadgeId={officer.badgeId}
        alreadyConsumed={Boolean(activeVaultToken && consumedTokens[activeVaultToken])}
        onTokenConsumed={handleTokenConsumed}
        onClose={() => setActiveVaultToken(null)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.citizenSurface,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.citizenSurface,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  content: {
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.md,
  },
  loginCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: SPACING.md,
  },
  loginTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  crimsonIconBox: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: '#8F0A1B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginTitle: { color: '#0F172A' },
  loginSub: { color: COLORS.textMuted },
  field: { gap: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  wardPickerBtn: {
    minHeight: MIN_TOUCH_TARGET - 4,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  wardPickerText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13.5,
    fontWeight: '600',
  },
  iconInputWrap: {
    minHeight: MIN_TOUCH_TARGET - 4,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  iconInput: {
    flex: 1,
    color: COLORS.textPrimary,
    paddingVertical: 8,
  },
  changePinLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C2410C',
  },
  input: {
    minHeight: MIN_TOUCH_TARGET - 4,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    color: COLORS.textPrimary,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  errorText: { color: COLORS.errorText, fontSize: 12.5, flex: 1 },
  loginBtn: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.citizenCrimson,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  loginBtnText: { color: COLORS.onPrimary, fontSize: 14, fontWeight: '800' },
  secondaryOutlineBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
  },
  secondaryOutlineText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textPrimary },
  securityFooterBox: {
    backgroundColor: '#FFF9F3',
    borderWidth: 1,
    borderColor: '#F1DEC9',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  securityFooterTitle: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  securityFooterSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  crimsonMasthead: {
    backgroundColor: '#8F0A1B',
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: '#D4A017',
    padding: SPACING.md,
    gap: 6,
  },
  mastheadTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  goldBadge: {
    backgroundColor: '#D4A017',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    flexShrink: 1,
  },
  goldBadgeText: {
    color: '#750715',
    fontSize: 10.5,
    fontWeight: '900',
  },
  dutyPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(110, 231, 183, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  dutyPillText: {
    color: '#A7F3D0',
    fontSize: 10,
    fontWeight: '800',
  },
  mastheadWard: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  mastheadOfficerName: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '600',
  },
  mastheadActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  mastheadActionBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mastheadActionBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  mastheadLogoutBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mastheadActionText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  warningBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  warningBannerBtn: {
    backgroundColor: '#92400E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  warningBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingVertical: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  kpiCardActive: {
    borderColor: '#8F0A1B',
    borderWidth: 1.5,
    backgroundColor: '#FFF8F8',
  },
  retryInlineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.citizenCrimson,
  },
  retryInlineBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  emptyStateBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 4,
  },
  emptyStateTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: RADIUS.lg,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tabItemActive: {
    backgroundColor: '#8F0A1B',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: SPACING.sm,
  },
  reviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: SPACING.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex1: { flex: 1, minWidth: 0 },
  cardTitle: { color: '#0F172A' },
  smallCrimsonBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: '#8F0A1B',
    justifyContent: 'center',
  },
  smallCrimsonBtnText: { color: COLORS.onPrimary, fontSize: 12, fontWeight: '700' },
  demoScanBtnCompact: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  demoScanText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  scannerBox: {
    height: 180,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.cameraOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFallback: { padding: SPACING.md, alignItems: 'center', gap: SPACING.sm },
  scannerFallbackText: { color: '#CBD5E1', fontSize: 12.5, textAlign: 'center' },
  manualRow: { flexDirection: 'row', gap: SPACING.xs },
  lookupBtn: {
    minWidth: 64,
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.citizenCrimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupBtnText: { color: COLORS.onPrimary, fontSize: 13, fontWeight: '800' },
  noticeBanner: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    padding: SPACING.sm,
  },
  noticeOk: { backgroundColor: COLORS.successBg, borderColor: COLORS.successBorder },
  noticeErr: { backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder },
  noticeText: { fontSize: 12.5, fontWeight: '700' },
  textOk: { color: COLORS.successText },
  textErr: { color: COLORS.errorAccent },
  reviewCode: { color: COLORS.primary, fontSize: 13.5, fontWeight: '800' },
  reviewName: { color: COLORS.textPrimary },
  reviewProc: { color: COLORS.textMuted },
  formDataBox: {
    backgroundColor: COLORS.mutedSurface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.sm,
    gap: 3,
  },
  formDataLine: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  statusChip: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  vaultList: { gap: 6 },
  vaultBtn: {
    minHeight: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.mutedSurface,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vaultBtnUsed: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorBorder,
  },
  vaultBtnText: { color: '#8F0A1B', fontSize: 12.5, fontWeight: '700', flex: 1 },
  decisionRow: { flexDirection: 'row', gap: SPACING.sm },
  supplementBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  supplementBtnText: { color: COLORS.errorAccent, fontSize: 12.5, fontWeight: '800' },
  approveBtn: {
    flex: 1.2,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
  },
  approveBtnText: { color: COLORS.onPrimary, fontSize: 12.5, fontWeight: '800' },
  refreshIconBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.mutedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    minHeight: 40,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    backgroundColor: COLORS.canvas,
    paddingHorizontal: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    paddingVertical: 6,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.mutedSurface,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
  },
  filterChipActive: {
    backgroundColor: '#8F0A1B',
    borderColor: '#8F0A1B',
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  emptyListText: { color: COLORS.textMuted, fontSize: 12.5 },
  dossierRow: {
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.canvas,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dossierRowActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySubtle,
  },
  dossierRowCode: { color: COLORS.primary, fontSize: 12.5, fontWeight: '800' },
  dossierRowName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  dossierRowProc: { color: COLORS.textMuted, fontSize: 11.5 },
  clusterCard: {
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.canvas,
    gap: 6,
  },
  clusterCode: { fontSize: 12, fontWeight: '800', color: '#8F0A1B' },
  clusterStatusBadge: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  clusterTitle: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  clusterMeta: { fontSize: 11.5, color: COLORS.textSecondary, fontWeight: '600' },
  clusterAddress: { flex: 1, fontSize: 11.5, color: COLORS.textMuted },
  clusterActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  clusterProgressBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterProgressText: { fontSize: 12, fontWeight: '800', color: '#B45309' },
  clusterResolveBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterResolveText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  hitlCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  hitlCardApproved: {
    backgroundColor: '#FAFCFF',
    borderColor: '#E2E8F0',
  },
  hitlSubtitle: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  hitlFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hitlScoreBadge: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  hitlScore: { fontSize: 11, fontWeight: '800', color: '#6D28D9' },
  hitlStatus: { fontSize: 11.5, fontWeight: '800' },
  hitlQuestion: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 19,
  },
  hitlMetaLine: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  hitlApprovedAnswerBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: 6,
  },
  hitlApprovedAnswerText: {
    fontSize: 12.5,
    color: '#1E293B',
    lineHeight: 19,
  },
  hitlExpandBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  hitlExpandBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8F0A1B',
  },
  hitlResolvedBy: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  wardModalSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  wardModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  wardModalTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.mutedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wardModalSearchWrap: {
    margin: SPACING.md,
    paddingHorizontal: SPACING.sm,
    minHeight: 42,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    backgroundColor: COLORS.canvas,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wardModalSearchInput: { flex: 1, fontSize: 13.5, color: COLORS.textPrimary },
  wardRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  wardRowActive: { backgroundColor: '#FEF2F2' },
  wardRowName: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  wardRowCode: { fontSize: 11.5, color: COLORS.textMuted },
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  confirmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  confirmTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  confirmBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  confirmCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
  },
  confirmCancelText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textPrimary },
  confirmDangerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: '#DC2626',
  },
  confirmDangerText: { fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' },
  pressed: { opacity: 0.84 },
});
