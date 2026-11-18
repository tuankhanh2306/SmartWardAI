import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { useResponsivePhone } from '../theme/responsive';
import { COLORS, RADIUS, SPACING } from '../theme/tokens';

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
        <View style={styles.iconRow}>
          <View style={styles.iconBox}>
            <MapPin size={20} color={COLORS.citizenCrimson} />
          </View>
          <Text style={[styles.title, typography.headingLg]}>Báo cáo sự cố</Text>
        </View>
        <Text style={[styles.body, typography.bodyMd]}>
          Gửi phản ánh đường hư hỏng, ngập nước, đèn đường hoặc môi trường kèm vị trí GPS về {currentWard.name}.
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
    backgroundColor: COLORS.citizenCrimsonSoftBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: COLORS.textPrimary, flex: 1 },
  body: { color: COLORS.textSecondary },
});
