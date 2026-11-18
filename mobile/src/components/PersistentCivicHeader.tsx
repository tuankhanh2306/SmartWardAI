/**
 * SmartWard AI Mobile — Thanh Header Cố định (PersistentCivicHeader)
 * Chiều cao chuẩn: 56dp | Vùng chạm tối thiểu: 48dp (WCAG Elderly-First)
 * - Bên trái: Nút Pill màu #F0FDFA viền #99F6E4 hiển thị "📍 <Tên Xã/Phường> [Đổi Xã]"
 * - Bên phải: Nút chuyển cỡ chữ "A Cỡ chữ: Chuẩn / Lớn (A+) / Rất lớn (A++)"
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin, Type } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import {
  COLORS,
  MIN_TOUCH_TARGET,
  RADIUS,
  SPACING,
  TOUCH_TARGETS,
} from '../theme/tokens';

export interface PersistentCivicHeaderProps {
  onOpenWardSelector: () => void;
}

export const PersistentCivicHeader: React.FC<PersistentCivicHeaderProps> = ({
  onOpenWardSelector,
}) => {
  const { currentWard } = useWard();
  const { fontScaleMode, cycleFontMode } = useAccessibility();

  const shortFontLabel =
    fontScaleMode === 'A'
      ? 'Chuẩn'
      : fontScaleMode === 'A+'
      ? 'Lớn (A+)'
      : 'Rất lớn (A++)';

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Đang chọn ${currentWard.name}. Nhấn để đổi xã phường.`}
        onPress={onOpenWardSelector}
        style={({ pressed }) => [styles.wardPill, pressed && styles.wardPillPressed]}
      >
        <MapPin size={16} color={COLORS.primary} />
        <Text numberOfLines={1} style={styles.wardNameText}>
          {currentWard.name}
        </Text>
        <View style={styles.changeWardBadge}>
          <Text style={styles.changeWardBadgeText}>Đổi Xã</Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Đổi cỡ chữ. Hiện tại: ${shortFontLabel}`}
        onPress={() => {
          void cycleFontMode();
        }}
        style={({ pressed }) => [styles.fontButton, pressed && styles.fontButtonPressed]}
      >
        <Type size={15} color={COLORS.textPrimary} />
        <Text style={styles.fontButtonText}>{shortFontLabel}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: TOUCH_TARGETS.appBarHeight,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  wardPill: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  wardPillPressed: {
    opacity: 0.85,
  },
  wardNameText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  changeWardBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  changeWardBadgeText: {
    color: COLORS.onPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  fontButton: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  fontButtonPressed: {
    backgroundColor: COLORS.mutedSurface,
  },
  fontButtonText: {
    color: COLORS.textPrimary,
    fontSize: 12.5,
    fontWeight: '700',
  },
});
