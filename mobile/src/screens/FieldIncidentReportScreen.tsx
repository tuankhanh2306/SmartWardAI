import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MapPinned } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { useResponsivePhone } from '../theme/responsive';
import { COLORS, DOMAIN_THRESHOLDS, RADIUS, SPACING } from '../theme/tokens';

export const FieldIncidentReportScreen: React.FC = () => {
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
          <Text style={styles.badgeText}>CHẶNG M4 • GPS TRIAGE 25M</Text>
        </View>
        <View style={styles.iconRow}>
          <View style={styles.iconBox}>
            <MapPinned size={20} color={COLORS.citizenCrimson} />
          </View>
          <Text style={[styles.title, typography.headingLg]}>
            Báo Cáo Sự Cố Hiện Trường GPS 25m
          </Text>
        </View>
        <Text style={[styles.body, typography.bodyMd]}>
          Tự động định tuyến liên xã/phường theo tọa độ thực tế hoặc ô địa chỉ về đúng UBND tiếp nhận (mặc định {currentWard.name}).
        </Text>
        <Text style={[styles.meta, typography.captionSm]}>
          Gom cụm không gian R = {DOMAIN_THRESHOLDS.gpsClusterRadiusMeters}m • Ngữ nghĩa τ ={' '}
          {DOMAIN_THRESHOLDS.semanticClusterThreshold} • Hàng đợi Offline khi mất sóng 4G.
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
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: SPACING.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.citizenCrimsonSoftBg,
    borderWidth: 1,
    borderColor: COLORS.citizenCrimsonSoftBorder,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { color: COLORS.citizenBubble, fontSize: 11, fontWeight: '800' },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.citizenCrimsonSoftBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: COLORS.textPrimary, flex: 1 },
  body: { color: COLORS.textSecondary },
  meta: { color: COLORS.citizenBubble, fontWeight: '700' },
});
