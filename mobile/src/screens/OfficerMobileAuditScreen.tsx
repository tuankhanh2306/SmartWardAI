import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Landmark } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useOfficerAuth } from '../context/OfficerAuthContext';
import { useWard } from '../context/WardContext';
import { useResponsivePhone } from '../theme/responsive';
import { COLORS, RADIUS, SPACING } from '../theme/tokens';

export const OfficerMobileAuditScreen: React.FC = () => {
  const { currentWard } = useWard();
  const { officer, isAuthenticated } = useOfficerAuth();
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
          <Text style={styles.badgeText}>CHẶNG M5 • BÀN CÁN BỘ SEC-09</Text>
        </View>
        <View style={styles.iconRow}>
          <View style={styles.iconBox}>
            <Landmark size={20} color={COLORS.officerAccentSky} />
          </View>
          <Text style={[styles.title, typography.headingLg]}>
            Bàn Cán Bộ &amp; Quét QR Tại Quầy
          </Text>
        </View>
        <Text style={[styles.body, typography.bodyMd]}>
          {isAuthenticated && officer
            ? `Đã đăng nhập: ${officer.fullName} (${officer.badgeId}) — ${officer.wardName}.`
            : `Dành riêng cho Công chức Một cửa thuộc UBND ${currentWard.name} (Xác thực JWT + Cách ly địa bàn SEC-09).`}
        </Text>
        <Text style={[styles.meta, typography.captionSm]}>
          Quét mã QR Phiếu Hẹn (LH-...) • Xem ảnh Zero-Trust Vault 1 lần (GETDEL / HTTP 410 Gone) • Che mờ CCCD ********1234.
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
    borderColor: COLORS.officerNavy,
    gap: SPACING.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.officerNavy,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { color: COLORS.officerAccentSky, fontSize: 11, fontWeight: '800' },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.officerNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: COLORS.officerNavy, flex: 1 },
  body: { color: COLORS.textSecondary },
  meta: { color: COLORS.officerNavy, fontWeight: '700' },
});
