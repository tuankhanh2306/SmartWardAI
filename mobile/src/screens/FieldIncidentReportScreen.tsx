import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MapPinned } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { COLORS, DOMAIN_THRESHOLDS, RADIUS, SPACING } from '../theme/tokens';

export const FieldIncidentReportScreen: React.FC = () => {
  const { currentWard } = useWard();
  const { typography } = useAccessibility();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.iconRow}>
          <MapPinned size={22} color={COLORS.primary} />
          <Text style={[styles.title, typography.headingLg]}>
            Báo Cáo Sự Cố Hiện Trường GPS 25m
          </Text>
        </View>
        <Text style={[styles.body, typography.bodyMd]}>
          Tự động định tuyến liên xã/phường theo tọa độ thực tế hoặc ô địa chỉ (mặc định UBND {currentWard.name}).
        </Text>
        <Text style={[styles.meta, typography.captionSm]}>
          Gom cụm không gian R = {DOMAIN_THRESHOLDS.gpsClusterRadiusMeters}m • Ngữ nghĩa τ ={' '}
          {DOMAIN_THRESHOLDS.semanticClusterThreshold} • Hỗ trợ hàng đợi Offline khi mất mạng.
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
