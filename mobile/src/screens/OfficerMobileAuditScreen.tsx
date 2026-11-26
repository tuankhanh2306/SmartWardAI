/**
 * SmartWard AI Mobile — Bàn Cán Bộ Một Cửa Di Động (Chặng M5: MOB-5.1 -> MOB-5.5)
 * - Đăng nhập Công chức (badgeId, pin, wardCode) lưu JWT trong expo-secure-store + Đăng xuất thu hồi Redis
 * - Camera Quét Mã QR Phiếu Hẹn tại quầy (SMARTWARD_PASS|..., LH-..., HS-...) + Nút mô phỏng Demo
 * - Danh sách hồ sơ địa bàn (cách ly SEC-09, che mờ CCCD ********1234 theo NĐ 13/2023/NĐ-CP)
 * - Xem ảnh Zero-Trust Vault 1 lần (GETDEL -> HTTP 410 GONE ở lần 2)
 * - Phê duyệt 1 chạm (✓ Duyệt & Gửi Mã QR / Yêu Cầu Bổ Sung) đồng bộ PostgreSQL <-> Web
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Fingerprint,
  Landmark,
  LogOut,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import { listOfficerDossiers } from '../api/client';
import { OfficerVaultViewerModal } from '../components/OfficerVaultViewerModal';
import { useAccessibility } from '../context/AccessibilityContext';
import { useOfficerAuth } from '../context/OfficerAuthContext';
import { useWard } from '../context/WardContext';
import {
  lookupDossierByScannedCounterQr,
  sanitizeOfficerDossierForDisplay,
  submitOfficerDossierDecision,
} from '../core/officerAuditService';
import { useResponsivePhone } from '../theme/responsive';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';
import type { OfficerDossierDto } from '../types/api.types';

export const OfficerMobileAuditScreen: React.FC = () => {
  const { currentWard } = useWard();
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

  // Login inputs (MOB-5.1)
  const [badgeId, setBadgeId] = useState('CC-AG-8942');
  const [pin, setPin] = useState('8942');
  const [wardCodeInput, setWardCodeInput] = useState(currentWard.code);
  const [loggingIn, setLoggingIn] = useState(false);

  // Officer Workspace state (MOB-5.2 -> 5.5)
  const [dossiers, setDossiers] = useState<OfficerDossierDto[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualQrInput, setManualQrInput] = useState('');
  const [scanNotice, setScanNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  // Selected dossier for review
  const [selectedDossier, setSelectedDossier] = useState<OfficerDossierDto | null>(null);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Zero-Trust Vault One-Time Viewer (MOB-5.4)
  const [activeVaultToken, setActiveVaultToken] = useState<string | null>(null);
  const [consumedTokens, setConsumedTokens] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setWardCodeInput(currentWard.code);
  }, [currentWard.code]);

  const fetchWardDossiers = useCallback(async () => {
    if (!officer) return;
    setLoadingList(true);
    try {
      const items = await listOfficerDossiers(officer.wardCode);
      setDossiers(items.map(sanitizeOfficerDossierForDisplay));
    } catch {
      // Keep existing list if offline
    } finally {
      setLoadingList(false);
    }
  }, [officer]);

  useEffect(() => {
    if (isAuthenticated && officer) {
      void fetchWardDossiers();
    }
  }, [fetchWardDossiers, isAuthenticated, officer]);

  const handleOfficerLogin = async () => {
    if (loggingIn) return;
    setLoggingIn(true);
    clearAuthError();
    try {
      await login({
        badgeId,
        pin,
        wardCode: wardCodeInput || currentWard.code,
      });
    } catch {
      // Error surfaced via OfficerAuthContext.authError
    } finally {
      setLoggingIn(false);
    }
  };

  const handleCounterQrCode = async (rawCode: string) => {
    setScanNotice(null);
    setScannerOpen(false);
    const res = await lookupDossierByScannedCounterQr(rawCode);
    if (res.success && res.dossier) {
      setSelectedDossier(res.dossier);
      setFeedbackInput(res.dossier.officerFeedback || '');
      setScanNotice({ type: 'ok', text: res.message });
    } else {
      // Local list fallback for demo when offline
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

    // Demo mock dossier when backend is offline
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
            : `Đã gửi yêu cầu bổ sung hồ sơ ${updated.dossierCode} tới Email công dân.`,
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

  const handleTokenConsumed = useCallback((token: string) => {
    setConsumedTokens((prev) => ({ ...prev, [token]: true }));
  }, []);

  if (isRestoring) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.officerNavy} />
      </View>
    );
  }

  // TASK-043: Biometric Unlock Gate when returning to an active Officer session
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
            <View style={styles.navyIconBox}>
              <Fingerprint size={22} color={COLORS.officerAccentSky} />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.loginTitle, typography.headingMd]}>
                Mở khóa phiên Cán bộ
              </Text>
              <Text style={[styles.loginSub, typography.captionSm]}>
                Dùng {biometricLabel} để tiếp tục làm việc nhanh tại hiện trường
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
            <Fingerprint size={17} color={COLORS.onPrimary} />
            <Text style={[styles.loginBtnText, typography.bodyBold]}>
              Mở khóa bằng {biometricLabel}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void unlockFallbackToPin();
            }}
            style={[styles.logoutBtn, { alignSelf: 'center', marginTop: SPACING.sm }]}
          >
            <Text style={[styles.logoutText, { color: COLORS.officerNavy }]}>
              Chuyển sang nhập mã PIN
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // MOB-5.1: Officer Login Screen
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
            <View style={styles.navyIconBox}>
              <Landmark size={20} color={COLORS.officerAccentSky} />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.loginTitle, typography.headingMd]}>
                Đăng nhập Cán bộ Một cửa
              </Text>
              <Text style={[styles.loginSub, typography.captionSm]}>
                Xác thực JWT &amp; cách ly địa bàn xã/phường
              </Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mã thẻ công chức</Text>
            <TextInput
              value={badgeId}
              onChangeText={setBadgeId}
              autoCapitalize="characters"
              placeholder="CC-AG-8942"
              placeholderTextColor={COLORS.textMuted}
              style={[styles.input, typography.bodyMd]}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mã PIN bảo mật</Text>
            <TextInput
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              keyboardType="number-pad"
              placeholder="8942"
              placeholderTextColor={COLORS.textMuted}
              style={[styles.input, typography.bodyMd]}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Đơn vị công tác (Mã xã/phường)</Text>
            <TextInput
              value={wardCodeInput}
              onChangeText={setWardCodeInput}
              autoCapitalize="characters"
              placeholder="AG_P_LONGXUYEN"
              placeholderTextColor={COLORS.textMuted}
              style={[styles.input, typography.bodyMd]}
            />
          </View>

          {authError ? (
            <View style={styles.errorBox}>
              <AlertTriangle size={15} color={COLORS.errorAccent} />
              <Text style={styles.errorText}>{authError}</Text>
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
              <ShieldCheck size={18} color={COLORS.officerAccentSky} />
            )}
            <Text style={styles.loginBtnText}>
              {loggingIn ? 'Đang xác thực...' : 'Đăng nhập Công chức'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Authenticated Officer Workspace
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
          refreshing={loadingList}
          onRefresh={() => {
            void fetchWardDossiers();
          }}
          tintColor={COLORS.officerNavy}
        />
      }
    >
      {/* Officer Profile Bar */}
      <View style={styles.officerBar}>
        <View style={styles.flex1}>
          <Text style={styles.officerName} numberOfLines={1}>
            {officer.fullName} ({officer.badgeId})
          </Text>
          <Text style={styles.officerWard} numberOfLines={1}>
            UBND {officer.wardName} • {officer.wardCode}
          </Text>
        </View>
        {biometricAvailable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Bật hoặc tắt mở khóa bằng ${biometricLabel}`}
            onPress={() => {
              void setBiometricEnabled(!biometricEnabled);
            }}
            style={[
              styles.logoutBtn,
              {
                marginRight: SPACING.xs,
                borderColor: biometricEnabled ? COLORS.primary : COLORS.borderSubtle,
              },
            ]}
          >
            <Fingerprint
              size={15}
              color={biometricEnabled ? COLORS.primary : COLORS.textMuted}
            />
            <Text
              style={[
                styles.logoutText,
                { color: biometricEnabled ? COLORS.primary : COLORS.textSecondary },
              ]}
            >
              {biometricEnabled ? `${biometricLabel}: Bật` : biometricLabel}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đăng xuất cán bộ"
          onPress={() => {
            void logout();
          }}
          style={styles.logoutBtn}
        >
          <LogOut size={15} color={COLORS.errorAccent} />
          <Text style={styles.logoutText}>Thoát</Text>
        </Pressable>
      </View>

      {/* MOB-5.2: Counter QR Scanner Card */}
      <View style={[styles.card, { padding: responsive.cardPadding }]}>
        <View style={styles.rowBetween}>
          <View style={styles.rowGap}>
            <QrCode size={16} color={COLORS.officerNavy} />
            <Text style={[styles.cardTitle, typography.bodyBold]}>
              Quét QR Phiếu Hẹn Tại Quầy
            </Text>
          </View>
          <Pressable
            onPress={() => setScannerOpen((v) => !v)}
            style={styles.smallNavyBtn}
          >
            <Text style={styles.smallNavyBtnText}>
              {scannerOpen ? 'Tắt Camera' : 'Mở Camera'}
            </Text>
          </Pressable>
        </View>

        {scannerOpen ? (
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
                    ? 'Đang ở bản Web Preview — nhập mã HS/LH hoặc bấm mô phỏng bên dưới.'
                    : 'Cấp quyền Camera để quét trực tiếp Phiếu hẹn QR công dân.'}
                </Text>
                {Platform.OS !== 'web' && !camPerm?.granted ? (
                  <Pressable
                    onPress={() => {
                      void requestCamPerm();
                    }}
                    style={styles.smallNavyBtn}
                  >
                    <Text style={styles.smallNavyBtnText}>Cấp quyền Camera</Text>
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
            placeholder="Nhập nhanh mã HS-... hoặc LH-..."
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

        <Pressable
          accessibilityRole="button"
          onPress={handleSimulateCounterQr}
          style={({ pressed }) => [styles.demoScanBtn, pressed && styles.pressed]}
        >
          <Sparkles size={15} color={COLORS.primary} />
          <Text style={styles.demoScanText}>Mô phỏng Quét QR Phiếu hẹn tại quầy</Text>
        </Pressable>

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

      {/* MOB-5.4 & MOB-5.5: Selected Dossier Review Sheet */}
      {selectedDossier ? (
        <View style={[styles.reviewCard, { padding: responsive.cardPadding }]}>
          <View style={styles.rowBetween}>
            <Text style={styles.reviewCode}>{selectedDossier.dossierCode}</Text>
            <Text style={styles.reviewStatus}>{selectedDossier.status}</Text>
          </View>
          <Text style={[styles.reviewName, typography.headingMd]}>
            {selectedDossier.citizenName} ({selectedDossier.citizenCccd})
          </Text>
          <Text style={[styles.reviewProc, typography.captionSm]}>
            {selectedDossier.procedureName} ({selectedDossier.procedureCode})
          </Text>

          {/* MOB-5.4: Zero-Trust Vault One-Time Token buttons */}
          {(selectedDossier.vaultDocIds || []).length > 0 ? (
            <View style={styles.vaultList}>
              {(selectedDossier.vaultDocIds || []).map((token) => {
                const used = Boolean(consumedTokens[token]);
                return (
                  <Pressable
                    key={token}
                    accessibilityRole="button"
                    onPress={() => setActiveVaultToken(token)}
                    style={[styles.vaultBtn, used && styles.vaultBtnUsed]}
                  >
                    <Eye
                      size={15}
                      color={used ? COLORS.errorAccent : COLORS.officerNavy}
                    />
                    <Text
                      style={[styles.vaultBtnText, used && styles.textErr]}
                      numberOfLines={1}
                    >
                      {used
                        ? `Token đã tự hủy (410 Gone) • ${token.slice(0, 14)}`
                        : '👁️ Xem ảnh tờ khai có Watermark (1 lần duy nhất)'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Lời dặn Cán bộ gửi qua Email công dân</Text>
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

      {/* MOB-5.3: Ward Dossiers List (CCCD masked ********1234) */}
      <View style={[styles.card, { padding: responsive.cardPadding }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.cardTitle, typography.bodyBold]}>
            Hồ sơ địa bàn ({dossiers.length})
          </Text>
          <Pressable
            onPress={() => {
              void fetchWardDossiers();
            }}
            style={styles.refreshIconBtn}
          >
            <RefreshCw size={15} color={COLORS.officerNavy} />
          </Pressable>
        </View>

        {dossiers.length === 0 ? (
          <Text style={styles.emptyListText}>
            Chưa có hồ sơ trực tuyến mới hoặc máy chủ đang ngoại tuyến. Kéo xuống để tải lại.
          </Text>
        ) : (
          dossiers.map((item) => (
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
              <Text style={styles.dossierRowStatus}>{item.status}</Text>
            </Pressable>
          ))
        )}
      </View>

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
  },
  content: {
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.md,
  },
  loginCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.officerNavy,
    gap: SPACING.md,
  },
  loginTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  navyIconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.officerNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginTitle: { color: COLORS.officerNavy },
  loginSub: { color: COLORS.textMuted },
  field: { gap: 4 },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
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
    backgroundColor: COLORS.officerNavy,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  loginBtnText: { color: COLORS.onPrimary, fontSize: 14, fontWeight: '800' },
  officerBar: {
    backgroundColor: COLORS.officerNavy,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  officerName: { color: COLORS.onPrimary, fontSize: 14, fontWeight: '800' },
  officerWard: { color: COLORS.officerAccentSky, fontSize: 12, fontWeight: '600' },
  logoutBtn: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorBg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logoutText: { color: COLORS.errorAccent, fontSize: 12, fontWeight: '800' },
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
  cardTitle: { color: COLORS.officerNavy },
  smallNavyBtn: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.officerNavy,
    justifyContent: 'center',
  },
  smallNavyBtnText: { color: COLORS.onPrimary, fontSize: 12, fontWeight: '700' },
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
    backgroundColor: COLORS.officerNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupBtnText: { color: COLORS.onPrimary, fontSize: 13, fontWeight: '800' },
  demoScanBtn: {
    minHeight: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  demoScanText: { color: COLORS.primary, fontSize: 12.5, fontWeight: '700' },
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
  reviewStatus: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  reviewName: { color: COLORS.textPrimary },
  reviewProc: { color: COLORS.textMuted },
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
  vaultBtnText: { color: COLORS.officerNavy, fontSize: 12.5, fontWeight: '700', flex: 1 },
  decisionRow: { flexDirection: 'row', gap: SPACING.sm },
  supplementBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorBg, // #FEF2F2 per MOB-5.5
    borderWidth: 1,
    borderColor: COLORS.errorBorder, // #FCA5A5
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  supplementBtnText: { color: COLORS.errorAccent, fontSize: 12.5, fontWeight: '800' },
  approveBtn: {
    flex: 1.2,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary, // #00796B per MOB-5.5
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
  dossierRowStatus: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.84 },
});
