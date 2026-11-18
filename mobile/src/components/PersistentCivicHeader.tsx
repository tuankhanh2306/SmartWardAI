/**
 * SmartWard AI Mobile — Thanh Header Cố định Đồng bộ Web Frontend (Header.tsx)
 * - Tầng 1: Official Vietnamese Citizen Crimson Masthead (#B90E23 + Gold #FDE047 emblem + Ward Switcher + Font Scaler A/A+/A++)
 * - Tầng 2: Warm Ivory Editorial Strip (#F7EEDF / #E5D4B3) hiển thị trạng thái tiếp dân & Hotline 1 chạm
 * - Responsive cho mọi kích thước điện thoại (Tiny 320px -> Compact 360px -> Standard 390px -> Large 430px+)
 */

import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, Landmark, PhoneCall, Type } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { getOfficeOpenStatus, useResponsivePhone } from '../theme/responsive';
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
  const responsive = useResponsivePhone(fontScaleMode);
  const officeStatus = getOfficeOpenStatus();

  const fontButtonText = responsive.showCompactFontLabel
    ? fontScaleMode
    : fontScaleMode === 'A'
    ? 'A • Chuẩn'
    : fontScaleMode === 'A+'
    ? 'A+ • Lớn'
    : 'A++ • Rất lớn';

  const handleCallHotline = () => {
    const cleanPhone = currentWard.phoneNumber.replace(/[^0-9+]/g, '');
    if (cleanPhone) {
      void Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
    }
  };

  return (
    <View style={styles.headerRoot}>
      {/* TIER 1: Official Crimson Masthead (Synced with frontend bg-bca-masthead) */}
      <View
        style={[
          styles.masthead,
          { paddingHorizontal: responsive.horizontalPadding },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Đang chọn UBND ${currentWard.name}. Nhấn để đổi xã phường.`}
          onPress={onOpenWardSelector}
          style={({ pressed }) => [styles.wardTrigger, pressed && styles.pressed]}
        >
          <View
            style={[
              styles.emblemCircle,
              responsive.isTinyPhone && styles.emblemCircleTiny,
            ]}
          >
            <Landmark
              size={responsive.isTinyPhone ? 15 : 17}
              color={COLORS.citizenGoldLight}
            />
          </View>

          <View style={styles.wardTextCol}>
            {responsive.showHeaderSubtitle ? (
              <Text numberOfLines={1} style={styles.portalSubtitle}>
                CỔNG MỘT CỬA SỐ • AN GIANG
              </Text>
            ) : null}
            <View style={styles.wardNameRow}>
              <Text
                numberOfLines={1}
                style={[
                  styles.wardNameText,
                  responsive.isTinyPhone && styles.wardNameTextTiny,
                ]}
              >
                UBND {currentWard.name}
              </Text>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: officeStatus.isOfficeOpen
                      ? COLORS.onlineDot
                      : COLORS.offlineDot,
                  },
                ]}
              />
              <ChevronDown size={15} color={COLORS.citizenGoldSoft} />
            </View>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Đổi cỡ chữ. Hiện tại: ${fontScaleMode}`}
          onPress={() => {
            void cycleFontMode();
          }}
          style={({ pressed }) => [
            styles.fontScalerBtn,
            responsive.isTinyPhone && styles.fontScalerBtnTiny,
            pressed && styles.pressed,
          ]}
        >
          <Type size={14} color={COLORS.citizenGoldSoft} />
          <Text numberOfLines={1} style={styles.fontScalerText}>
            {fontButtonText}
          </Text>
        </Pressable>
      </View>

      {/* TIER 2: Warm Ivory Editorial Info Bar (Synced with frontend #F7EEDF / #E5D4B3) */}
      <View
        style={[
          styles.ivorySubBar,
          { paddingHorizontal: responsive.horizontalPadding },
        ]}
      >
        <View style={styles.ivoryLeft}>
          <View
            style={[
              styles.ivoryStatusDot,
              {
                backgroundColor: officeStatus.isOfficeOpen
                  ? COLORS.onlineDotDark
                  : COLORS.warningAccent,
              },
            ]}
          />
          <Text numberOfLines={1} style={styles.ivoryStatusText}>
            {officeStatus.statusLabel}
            {!responsive.isTinyPhone ? ` • ${currentWard.type} (${currentWard.code})` : ''}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Gọi Bộ phận Một cửa ${currentWard.phoneNumber}`}
          onPress={handleCallHotline}
          style={({ pressed }) => [styles.hotlinePill, pressed && styles.pressed]}
        >
          <PhoneCall size={12} color={COLORS.citizenCrimson} />
          <Text numberOfLines={1} style={styles.hotlineText}>
            {currentWard.phoneNumber}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRoot: {
    width: '100%',
    backgroundColor: COLORS.citizenCrimson,
  },
  masthead: {
    minHeight: TOUCH_TARGETS.appBarHeight,
    backgroundColor: COLORS.citizenCrimson,
    paddingVertical: SPACING.xs,
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
    paddingRight: SPACING.xs,
  },
  emblemCircle: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.citizenEmblemBg,
    borderWidth: 1.25,
    borderColor: COLORS.citizenGoldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemCircleTiny: {
    width: 30,
    height: 30,
  },
  wardTextCol: {
    flex: 1,
    minWidth: 0,
  },
  portalSubtitle: {
    color: COLORS.citizenGoldSoft,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  wardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  wardNameText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  wardNameTextTiny: {
    fontSize: 13,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
  },
  fontScalerBtn: {
    minHeight: MIN_TOUCH_TARGET - 6,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    flexShrink: 0,
  },
  fontScalerBtnTiny: {
    paddingHorizontal: SPACING.sm,
  },
  fontScalerText: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  ivorySubBar: {
    minHeight: 34,
    backgroundColor: COLORS.citizenIvory,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.citizenIvoryBorder,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  ivoryLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ivoryStatusDot: {
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
  },
  ivoryStatusText: {
    color: COLORS.citizenIvoryInk,
    fontSize: 11.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  hotlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.citizenIvoryBorder,
    borderRadius: RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    flexShrink: 0,
  },
  hotlineText: {
    color: COLORS.citizenCrimson,
    fontSize: 11,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
});
