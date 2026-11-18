import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { QrCode } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { useResponsivePhone } from '../theme/responsive';
import { COLORS, RADIUS, SPACING } from '../theme/tokens';

export const DossierAndQrPassScreen: React.FC = () => {
  const { currentWard } = useWard();
  const { typography, fontScaleMode } = useAccessibility();
  const responsive = useResponsivePhone(fontScaleMode);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: responsive.horizontalPadding },
      ]}
    >
      <View style={[styles.card, { padding: responsive.cardPadding }]}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>CHẶNG M4 • OFFLINE QR PASS</Text>
        </View>
        <View style={styles.iconRow}>
          <View style={styles.iconBox}>
            <QrCode size={20} color={COLORS.primary} />
          </View>
          <Text style={[styles.title, typography.headingLg]}>
            Ví Phiếu Hẹn Điện Tử Có Mã QR
          </Text>
        </View>
        <Text style={[styles.body, typography.bodyMd]}>
          Lưu trữ Phiếu Hẹn Mã QR và Hộp thư Email miễn phí 100% từ Bộ phận Một cửa UBND {currentWard.name}.
        </Text>
        <Text style={[styles.meta, typography.captionSm]}>
          Xuất trình tại quầy ngay cả khi mất sóng 4G (SQLite Offline) • Tải trực tiếp .PDF về máy (Không dùng SMS/Zalo thu phí).
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.citizenSurface },
  content: { paddingVertical: SPACING.md, gap: SPACING.md },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: SPACING.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: COLORS.textPrimary, flex: 1 },
  body: { color: COLORS.textSecondary },
  meta: { color: COLORS.primary, fontWeight: '700' },
});
