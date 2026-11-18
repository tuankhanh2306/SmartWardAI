import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MessageSquareText } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { COLORS, DOMAIN_THRESHOLDS, RADIUS, SPACING } from '../theme/tokens';

export const LegalRagChatScreen: React.FC = () => {
  const { currentWard } = useWard();
  const { typography } = useAccessibility();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.iconRow}>
          <MessageSquareText size={22} color={COLORS.primary} />
          <Text style={[styles.title, typography.headingLg]}>
            Hỏi Đáp 40 Thủ Tục Hành Chính (2026)
          </Text>
        </View>
        <Text style={[styles.body, typography.bodyMd]}>
          Đơn vị tiếp nhận hiện tại: UBND {currentWard.name} ({currentWard.code}).
        </Text>
        <Text style={[styles.meta, typography.captionSm]}>
          Chốt chặn Legal RAG: θ = {DOMAIN_THRESHOLDS.ragDirectAnswerSimilarity} | HITL ≥{' '}
          {DOMAIN_THRESHOLDS.ragHitlLowerSimilarity} • Tích hợp giọng đọc tiếng Việt MỞ/TẮT & tải trực tiếp .DOCX/.PDF ở Chặng M2.
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
