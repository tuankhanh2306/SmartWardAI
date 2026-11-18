import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { useResponsivePhone } from '../theme/responsive';
import { COLORS, DOMAIN_THRESHOLDS, RADIUS, SPACING } from '../theme/tokens';

export const SmartFormPrecheckScreen: React.FC = () => {
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
          <Text style={styles.badgeText}>CHẶNG M3 • AI VISION GATE</Text>
        </View>
        <View style={styles.iconRow}>
          <View style={styles.iconBox}>
            <ShieldCheck size={20} color={COLORS.primary} />
          </View>
          <Text style={[styles.title, typography.headingLg]}>
            Sơ Duyệt Đơn &amp; Quét QR CCCD
          </Text>
        </View>
        <Text style={[styles.body, typography.bodyMd]}>
          Hỗ trợ 4 biểu mẫu trọng tâm: CT01 (Cư trú), TK-KS (Khai sinh), TK-KH (Kết hôn), TK-BTXH (Bảo trợ xã hội) nộp trực tuyến về UBND {currentWard.name}.
        </Text>
        <Text style={[styles.meta, typography.captionSm]}>
          AI Thị Giác 3 tiêu chí: Độ nét ≥ {DOMAIN_THRESHOLDS.visionMinSharpnessScore}/100 • Độ sáng ≥{' '}
          {DOMAIN_THRESHOLDS.visionMinBrightnessScore}/255 • Chống OOM ≤ 1920px.
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
