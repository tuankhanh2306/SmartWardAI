/**
 * SmartWard AI Mobile — Thanh Header 1 Tầng Siêu Gọn (52dp)
 * - Trái: Huy hiệu tròn + Tên Xã/Phường ▾ (chạm để đổi 96 xã)
 * - Phải: Nút cỡ chữ A / A+ / A++
 * Loại bỏ hoàn toàn thông tin thừa (dải phụ, mã xã, hotline, trạng thái) khỏi mặt tiền.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, Landmark, Type } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { useResponsivePhone } from '../theme/responsive';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';

export interface PersistentCivicHeaderProps {
  onOpenWardSelector: () => void;
}

export const PersistentCivicHeader: React.FC<PersistentCivicHeaderProps> = ({
  onOpenWardSelector,
}) => {
  const { currentWard } = useWard();
  const { fontScaleMode, cycleFontMode } = useAccessibility();
  const responsive = useResponsivePhone(fontScaleMode);

  return (
    <View
      style={[
        styles.masthead,
        { paddingHorizontal: responsive.horizontalPadding },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Đang chọn ${currentWard.name}. Nhấn để đổi xã phường.`}
        onPress={onOpenWardSelector}
        style={({ pressed }) => [styles.wardTrigger, pressed && styles.pressed]}
      >
        <View style={styles.emblemCircle}>
          <Landmark size={15} color={COLORS.citizenGoldLight} />
        </View>
        <Text numberOfLines={1} style={styles.wardNameText}>
          {currentWard.name}
        </Text>
        <ChevronDown size={16} color={COLORS.citizenGoldSoft} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Đổi cỡ chữ. Hiện tại: ${fontScaleMode}`}
        onPress={() => {
          void cycleFontMode();
        }}
        style={({ pressed }) => [styles.fontScalerBtn, pressed && styles.pressed]}
      >
        <Type size={14} color={COLORS.citizenGoldSoft} />
        <Text style={styles.fontScalerText}>{fontScaleMode}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  masthead: {
    height: 52,
    backgroundColor: COLORS.citizenCrimson,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  wardTrigger: {
    flex: 1,
    minWidth: 0,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emblemCircle: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.citizenEmblemBg,
    borderWidth: 1,
    borderColor: COLORS.citizenGoldBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  wardNameText: {
    color: COLORS.onPrimary,
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  fontScalerBtn: {
    minWidth: 54,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexShrink: 0,
  },
  fontScalerText: {
    color: COLORS.onPrimary,
    fontSize: 12.5,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
});
