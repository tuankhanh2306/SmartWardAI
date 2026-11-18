import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { COLORS, DOMAIN_THRESHOLDS, RADIUS, SPACING } from '../theme/tokens';

export const SmartFormPrecheckScreen: React.FC = () => {
  const { currentWard } = useWard();
  const { typography } = useAccessibility();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.iconRow}>
          <ShieldCheck size={22} color={COLORS.primary} />
          <Text style={[styles.title, typography.headingLg]}>
            Sơ Duyệt Đơn & AI Thị Giác 3 Tiêu Chí
          </Text>
        </View>
        <Text style={[styles.body, typography.bodyMd]}>
          Hỗ trợ 4 biểu mẫu: CT01 (Cư trú), TK-KS (Khai sinh), TK-KH (Kết hôn), TK-BTXH (Bảo trợ xã hội) nộp trực tuyến về UBND {currentWard.name}.
        </Text>
        <Text style={[styles.meta, typography.captionSm]}>
          Ngưỡng AI Vision Gate: Độ nét ≥ {DOMAIN_THRESHOLDS.visionMinSharpnessScore}/100 • Độ sáng ≥{' '}
          {DOMAIN_THRESHOLDS.visionMinBrightnessScore}/255 • Chống Pixel-Flood OOM ≤ 1920px.
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
