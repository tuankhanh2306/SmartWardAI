/**
 * SmartWard AI Mobile — Ví Phiếu Hẹn Điện Tử Có Mã QR Offline & Hộp Thư Email (MOB-4.1 -> MOB-4.5)
 * - Tra cứu & đồng bộ hồ sơ xuyên thiết bị (Web <-> Mobile) qua POST /api/v1/dossiers/track
 * - Tự động đồng bộ trạng thái & Pull-to-Refresh vào expo-sqlite (wallet_qr_passes)
 * - Xuất trình Phiếu Hẹn Mã QR 100% Offline & Tải .PDF trực tiếp (0 nút In)
 * - Hộp thư Thông báo Email từ Cán bộ (Miễn phí 100% • 0 SMS/Zalo)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Mail, QrCode, RefreshCw, Search } from 'lucide-react-native';
import { trackCitizenDossier } from '../api/client';
import { registerDossierPushSubscription } from '../services/pushNotifications';
import { syncWalletQrPassesFromServer } from '../api/offlineSyncManager';
import { ElectronicQrPassCard } from '../components/ElectronicQrPassCard';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { getWardByCode } from '../core/angiangWards';
import { maskCccdNumber } from '../core/cccdQrParser';
import {
  walletQrForTracking,
  getAllWalletQrPasses,
  upsertWalletQrPass,
  type WalletQrPassRow,
} from '../storage/sqliteDb';
import { useResponsivePhone } from '../theme/responsive';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';

export const DossierAndQrPassScreen: React.FC = () => {
  const { currentWard } = useWard();
  const { typography, fontScaleMode } = useAccessibility();
  const responsive = useResponsivePhone(fontScaleMode);

  const [passes, setPasses] = useState<WalletQrPassRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Cross-device tracking inputs (MOB-4.1)
  const [dossierCodeInput, setDossierCodeInput] = useState('');
  const [last4Input, setLast4Input] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackNotice, setTrackNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  const loadLocalPasses = useCallback(async () => {
    const rows = await getAllWalletQrPasses();
    setPasses(rows);
  }, []);

  const handleSyncAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncWalletQrPassesFromServer();
    } finally {
      await loadLocalPasses();
      setRefreshing(false);
    }
  }, [loadLocalPasses]);

  useEffect(() => {
    void loadLocalPasses();
    void syncWalletQrPassesFromServer().then(() => loadLocalPasses());
  }, [loadLocalPasses]);

  // MOB-4.1: Track dossier submitted on Web/Mobile via POST /api/v1/dossiers/track
  const handleTrackDossier = async () => {
    const cleanCode = dossierCodeInput.trim().toUpperCase();
    const cleanLast4 = last4Input.trim();

    if (!cleanCode) {
      setTrackNotice({ type: 'err', text: 'Vui lòng nhập Mã hồ sơ (VD: HS-20261118-0001).' });
      return;
    }
    if (!/^\d{4}$/.test(cleanLast4)) {
      setTrackNotice({ type: 'err', text: 'Vui lòng nhập đúng 4 số cuối CCCD.' });
      return;
    }

    setIsTracking(true);
    setTrackNotice(null);
    try {
      const tracked = await trackCitizenDossier({
        dossierCode: cleanCode,
        last4Cccd: cleanLast4,
      });

      const resolvedWard = getWardByCode(tracked.wardCode);
      const row: WalletQrPassRow = {
        dossier_code: tracked.dossierCode,
        appointment_code: tracked.appointmentCode || null,
        procedure_code: tracked.procedureCode,
        procedure_name: tracked.procedureName || tracked.procedureCode,
        ward_code: tracked.wardCode || currentWard.code,
        ward_name: resolvedWard?.name || currentWard.name,
        citizen_name: 'Công dân tra cứu',
        citizen_cccd_mask: tracked.citizenCccd || maskCccdNumber(`00000000${cleanLast4}`),
        citizen_last4: cleanLast4,
        citizen_email: null,
        status: tracked.status || 'PENDING',
        officer_feedback: tracked.officerFeedback || null,
        sla_deadline: tracked.slaDeadline || null,
        qr_payload: walletQrForTracking(
          tracked,
          tracked.appointmentCode,
          tracked.wardCode || currentWard.code
        ),
        synced_at: Date.now(),
      };

      await upsertWalletQrPass(row);
      await loadLocalPasses();
      void registerDossierPushSubscription({
        dossierCode: tracked.dossierCode,
        wardCode: tracked.wardCode || currentWard.code,
      }).catch(() => undefined);
      setDossierCodeInput('');
      setLast4Input('');
      setTrackNotice({
        type: 'ok',
        text: `Đã đồng bộ hồ sơ ${tracked.dossierCode} vào Ví Offline trên máy.`,
      });
    } catch {
      setTrackNotice({
        type: 'err',
        text: 'Không tìm thấy hồ sơ hoặc máy chủ đang ngoại tuyến. Vui lòng kiểm tra lại Mã hồ sơ & 4 số cuối CCCD.',
      });
    } finally {
      setIsTracking(false);
    }
  };

  // MOB-4.5: Free Email Notification Inbox items from Officer reviews
  const emailNotifications = useMemo(
    () =>
      passes.filter(
        (p) =>
          Boolean(p.officer_feedback) ||
          ['APPROVED', 'SUPPLEMENT_REQUIRED', 'REJECTED'].includes(p.status.toUpperCase())
      ),
    [passes]
  );

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
          refreshing={refreshing}
          onRefresh={() => {
            void handleSyncAll();
          }}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* MOB-4.1: Cross-Device Tracking Box (Web <-> Mobile) */}
      <View style={[styles.card, { padding: responsive.cardPadding }]}>
        <View style={styles.sectionHeader}>
          <Search size={16} color={COLORS.primary} />
          <Text style={[styles.sectionTitle, typography.bodyBold]}>
            Tra cứu &amp; kéo hồ sơ từ Web về Ví QR
          </Text>
        </View>

        <View style={styles.trackRow}>
          <TextInput
            value={dossierCodeInput}
            onChangeText={setDossierCodeInput}
            autoCapitalize="characters"
            placeholder="Mã hồ sơ (HS-...)"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.inputCode, typography.bodyMd]}
          />
          <TextInput
            value={last4Input}
            onChangeText={(v) => setLast4Input(v.replace(/[^0-9]/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="4 số cuối CCCD"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.inputLast4, typography.bodyMd]}
          />
        </View>

        <View style={styles.trackActions}>
          <Pressable
            accessibilityRole="button"
            disabled={isTracking}
            onPress={() => {
              void handleTrackDossier();
            }}
            style={({ pressed }) => [styles.trackBtn, pressed && styles.pressed]}
          >
            {isTracking ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Search size={15} color={COLORS.onPrimary} />
            )}
            <Text style={styles.trackBtnText}>Tra cứu &amp; Lưu Offline</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={refreshing}
            onPress={() => {
              void handleSyncAll();
            }}
            style={({ pressed }) => [styles.syncBtn, pressed && styles.pressed]}
          >
            <RefreshCw size={15} color={COLORS.primary} />
          </Pressable>
        </View>

        {trackNotice ? (
          <Text
            style={[
              styles.noticeText,
              trackNotice.type === 'ok' ? styles.textOk : styles.textErr,
            ]}
          >
            {trackNotice.text}
          </Text>
        ) : null}
      </View>

      {/* MOB-4.3: Offline QR Passes List */}
      {passes.length === 0 ? (
        <View style={styles.emptyCard}>
          <QrCode size={32} color={COLORS.textDisabled} />
          <Text style={[styles.emptyTitle, typography.bodyBold]}>
            Chưa có Phiếu hẹn QR nào trong Ví
          </Text>
          <Text style={[styles.emptySub, typography.captionSm]}>
            Nộp tờ khai ở mục “Soạn tờ khai” hoặc nhập Mã hồ sơ từ Web ở trên để lưu Phiếu hẹn dùng khi không có 4G.
          </Text>
        </View>
      ) : (
        <View style={styles.passList}>
          {passes.map((pass) => (
            <ElectronicQrPassCard key={pass.dossier_code} pass={pass} />
          ))}
        </View>
      )}

      {/* MOB-4.5: Free Officer Email Notification Inbox (Zero SMS/Zalo Cost) */}
      <View style={[styles.card, { padding: responsive.cardPadding }]}>
        <View style={styles.inboxHeader}>
          <View style={styles.sectionHeader}>
            <Mail size={16} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, typography.bodyBold]}>
              Hộp thư Email từ Cán bộ
            </Text>
          </View>
          <View style={styles.freePill}>
            <Text style={styles.freePillText}>0đ • Không SMS</Text>
          </View>
        </View>

        {emailNotifications.length === 0 ? (
          <Text style={[styles.emptyInboxText, typography.captionSm]}>
            Chưa có phản hồi mới từ Bộ phận Một cửa. Khi cán bộ duyệt hồ sơ, thông báo và Mã hẹn QR sẽ gửi tự động về Email của bạn.
          </Text>
        ) : (
          <View style={styles.inboxList}>
            {emailNotifications.map((item) => (
              <View key={`mail-${item.dossier_code}`} style={styles.mailItem}>
                <View style={styles.mailTop}>
                  <Text style={styles.mailCode}>{item.dossier_code}</Text>
                  <Text style={styles.mailStatus}>{item.status}</Text>
                </View>
                {item.citizen_email ? (
                  <Text style={styles.mailRecipient}>Tới: {item.citizen_email}</Text>
                ) : null}
                <Text style={[styles.mailBody, typography.bodyMd]}>
                  {item.officer_feedback ||
                    (item.appointment_code
                      ? `Hồ sơ đã được duyệt sơ bộ. Mã hẹn QR: ${item.appointment_code}.`
                      : 'Hồ sơ đã có cập nhật trạng thái từ Bộ phận Một cửa.')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.citizenSurface,
  },
  content: {
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
  },
  trackRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  inputCode: {
    flex: 1.4,
    minHeight: 44,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    color: COLORS.textPrimary,
  },
  inputLast4: {
    flex: 1,
    minHeight: 44,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    color: COLORS.textPrimary,
  },
  trackActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  trackBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET - 4,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trackBtnText: {
    color: COLORS.onPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  syncBtn: {
    width: MIN_TOUCH_TARGET - 4,
    height: MIN_TOUCH_TARGET - 4,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  textOk: { color: COLORS.successText },
  textErr: { color: COLORS.errorAccent },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  passList: {
    gap: SPACING.md,
  },
  inboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  freePill: {
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  freePillText: {
    color: COLORS.successText,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyInboxText: {
    color: COLORS.textMuted,
  },
  inboxList: {
    gap: SPACING.sm,
  },
  mailItem: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.sm,
    gap: 4,
  },
  mailTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mailCode: {
    color: COLORS.primary,
    fontSize: 12.5,
    fontWeight: '800',
  },
  mailStatus: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  mailRecipient: {
    color: COLORS.textMuted,
    fontSize: 11.5,
  },
  mailBody: {
    color: COLORS.textPrimary,
  },
  pressed: { opacity: 0.84 },
});
