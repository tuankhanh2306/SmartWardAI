import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Landmark } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useOfficerAuth } from '../context/OfficerAuthContext';
import { useWard } from '../context/WardContext';
import { COLORS, RADIUS, SPACING } from '../theme/tokens';

export const OfficerMobileAuditScreen: React.FC = () => {
  const { currentWard } = useWard();
  const { officer, isAuthenticated } = useOfficerAuth();
  const { typography } = useAccessibility();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.iconRow}>
          <Landmark size={22} color={COLORS.primary} />
          <Text style={[styles.title, typography.headingLg]}>
            Bàn Cán Bộ Một Cửa & Quét QR Tại Quầy
          </Text>
        </View>
        <Text style={[styles.body, typography.bodyMd]}>
          {isAuthenticated && officer
            ? `Đã đăng nhập: ${officer.fullName} (${officer.badgeId}) — ${officer.wardName}.`
            : `Dành riêng cho Công chức Một cửa thuộc UBND ${currentWard.name} (Xác thực JWT + Cách ly địa bàn SEC-09).`}
        </Text>
        <Text style={[styles.meta, typography.captionSm]}>
          Quét mã QR Phiếu Hẹn công dân (LH-...) • Xem ảnh Zero-Trust Vault 1 lần (GETDEL / HTTP 410 Gone) • Che mờ CCCD ********1234.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  content: { padding: SPACING.lg, gap: SPACING.md },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  title: { color: COLORS.textPrimary, flex: 1 },
  body: { color: COLORS.textSecondary },
  meta: { color: COLORS.primary, fontWeight: '600' },
});
