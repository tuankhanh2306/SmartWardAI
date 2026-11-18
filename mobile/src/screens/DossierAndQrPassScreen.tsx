import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { QrCode } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { COLORS, RADIUS, SPACING } from '../theme/tokens';

export const DossierAndQrPassScreen: React.FC = () => {
  const { currentWard } = useWard();
  const { typography } = useAccessibility();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.iconRow}>
          <QrCode size={22} color={COLORS.primary} />
          <Text style={[styles.title, typography.headingLg]}>
            Ví Phiếu Hẹn Điện Tử Có Mã QR (Offline)
          </Text>
        </View>
        <Text style={[styles.body, typography.bodyMd]}>
          Lưu trữ Phiếu Hẹn Mã QR và Hộp thư thông báo Email miễn phí 100% từ Bộ phận Một cửa UBND {currentWard.name}.
        </Text>
        <Text style={[styles.meta, typography.captionSm]}>
          Hỗ trợ xuất trình tại quầy ngay cả khi không có sóng 4G (lưu đệm SQLite) & tải file .PDF trực tiếp.
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
