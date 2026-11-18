/**
 * SmartWard AI Mobile — Thẻ Phiếu Hẹn Sơ Duyệt Điện Tử Có Mã QR (MOB-4.3 & MOB-4.4)
 * - Khung viền #00796B dày 2px
 * - Mã QR sắc nét bằng react-native-qrcode-svg (SMARTWARD_PASS|{dossierCode}|{appointmentCode}|{wardCode})
 * - 4 ô thông tin gọn + Nút tải trực tiếp .PDF về máy (tuyệt đối 0 nút In)
 */

import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Download } from 'lucide-react-native';
import {
  exportQrPassToPdf,
  getDossierStatusVietnamese,
} from '../core/qrPassPdfExporter';
import type { WalletQrPassRow } from '../storage/sqliteDb';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';

export interface ElectronicQrPassCardProps {
  pass: WalletQrPassRow;
}

export const ElectronicQrPassCard: React.FC<ElectronicQrPassCardProps> = ({ pass }) => {
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const isApproved = pass.status.toUpperCase() === 'APPROVED';
  const isSupplement = pass.status.toUpperCase() === 'SUPPLEMENT_REQUIRED';
  const isRejected = pass.status.toUpperCase() === 'REJECTED';

  const handleDownloadPdf = async () => {
    setExporting(true);
    setExportMsg(null);
    const res = await exportQrPassToPdf(pass);
    setExporting(false);
    setExportMsg(res.message);
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.passBadge}>
          <Text style={styles.passBadgeText}>PHIẾU HẸN SƠ DUYỆT ĐIỆN TỬ</Text>
        </View>
        <View
          style={[
            styles.statusPill,
            isApproved
              ? styles.statusOk
              : isSupplement || isRejected
              ? styles.statusErr
              : styles.statusPending,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isApproved
                ? styles.textOk
                : isSupplement || isRejected
                ? styles.textErr
                : styles.textPending,
            ]}
          >
            {isApproved
              ? 'Đã duyệt'
              : isSupplement
              ? 'Cần bổ sung'
              : isRejected
              ? 'Từ chối'
              : 'Chờ duyệt'}
          </Text>
        </View>
      </View>

      <Text style={styles.wardTitle}>UBND {pass.ward_name}</Text>
      <Text style={styles.wardSub}>Bộ phận Một cửa — Tỉnh An Giang</Text>

      {/* High-contrast SVG QR Code (Works 100% offline in Airplane Mode) */}
      <View style={styles.qrStage}>
        <QRCode
          value={pass.qr_payload || pass.dossier_code}
          size={144}
          color={COLORS.textPrimary}
          backgroundColor={COLORS.card}
        />
        <Text style={styles.appointmentCode}>
          {pass.appointment_code || pass.dossier_code}
        </Text>
      </View>

      {/* 4 Clean Info Cells */}
      <View style={styles.infoGrid}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Công dân</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {pass.citizen_name} ({pass.citizen_cccd_mask})
          </Text>
        </View>
        <View style={styles.hairline} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mã hồ sơ</Text>
          <Text style={styles.infoValueMono} numberOfLines={1}>
            {pass.dossier_code}
          </Text>
        </View>
        <View style={styles.hairline} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Thủ tục</Text>
          <Text style={styles.infoValue} numberOfLines={2}>
            {pass.procedure_name}
          </Text>
        </View>
        <View style={styles.hairline} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Trạng thái</Text>
          <Text style={styles.infoValue} numberOfLines={2}>
            {getDossierStatusVietnamese(pass.status)}
          </Text>
        </View>
      </View>

      {pass.officer_feedback ? (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackLabel}>Lời dặn cán bộ:</Text>
          <Text style={styles.feedbackText}>{pass.officer_feedback}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={exporting}
        onPress={() => {
          void handleDownloadPdf();
        }}
        style={({ pressed }) => [styles.pdfBtn, pressed && styles.pressed]}
      >
        {exporting ? (
          <ActivityIndicator size="small" color={COLORS.onPrimary} />
        ) : (
          <Download size={16} color={COLORS.onPrimary} />
        )}
        <Text style={styles.pdfBtnText} numberOfLines={1}>
          📥 Tải Phiếu Hẹn Có Mã QR (.pdf)
        </Text>
      </Pressable>

      {exportMsg ? <Text style={styles.exportMsg}>✓ {exportMsg}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  passBadge: {
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  passBadgeText: {
    color: COLORS.primary,
    fontSize: 10.5,
    fontWeight: '800',
  },
  statusPill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusOk: { backgroundColor: COLORS.successBg, borderColor: COLORS.successBorder },
  statusErr: { backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder },
  statusPending: { backgroundColor: COLORS.warningBg, borderColor: COLORS.warningBorder },
  statusText: { fontSize: 11, fontWeight: '800' },
  textOk: { color: COLORS.successText },
  textErr: { color: COLORS.errorAccent },
  textPending: { color: COLORS.warningText },
  wardTitle: {
    color: COLORS.textPrimary,
    fontSize: 15.5,
    fontWeight: '800',
  },
  wardSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: -4,
  },
  qrStage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  appointmentCode: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoGrid: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  infoRow: {
    paddingVertical: 7,
    gap: 2,
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    fontWeight: '600',
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  infoValueMono: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.borderSubtle,
  },
  feedbackBox: {
    backgroundColor: COLORS.primarySubtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    padding: SPACING.sm,
    gap: 2,
  },
  feedbackLabel: {
    color: COLORS.primary,
    fontSize: 11.5,
    fontWeight: '800',
  },
  feedbackText: {
    color: COLORS.textPrimary,
    fontSize: 12.5,
    lineHeight: 18,
  },
  pdfBtn: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
  },
  pdfBtnText: {
    color: COLORS.onPrimary,
    fontSize: 13.5,
    fontWeight: '800',
  },
  exportMsg: {
    color: COLORS.successText,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: { opacity: 0.85 },
});
