import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FileCheck2 } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { useResponsivePhone } from '../theme/responsive';
import { COLORS, RADIUS, SPACING } from '../theme/tokens';

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
        <View style={styles.iconRow}>
          <View style={styles.iconBox}>
            <FileCheck2 size={20} color={COLORS.primary} />
          </View>
          <Text style={[styles.title, typography.headingLg]}>
            Kiểm tra tờ khai
          </Text>
        </View>
        <Text style={[styles.body, typography.bodyMd]}>
          Quét QR CCCD và kiểm tra lỗi tờ khai CT01, Khai sinh, Kết hôn, Bảo trợ xã hội trước khi nộp tại {currentWard.name}.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.citizenSurface },
  content: { paddingVertical: SPACING.md },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: SPACING.sm,
  },
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
});
