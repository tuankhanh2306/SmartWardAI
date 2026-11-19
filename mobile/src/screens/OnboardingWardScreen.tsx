/**
 * SmartWard AI Mobile — Màn hình Chọn 96 Xã/Phường (Siêu gọn, 1 chạm vào thẳng cổng)
 * Loại bỏ các thẻ metadata dài dòng; chỉ giữ định vị GPS + tìm kiếm + danh sách 96 đơn vị.
 */

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Check,
  ChevronRight,
  Landmark,
  Navigation,
  Search,
  X,
} from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import {
  searchAnGiangWards,
  type WardFilterType,
  type WardItem,
} from '../core/angiangWards';
import { useResponsivePhone } from '../theme/responsive';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';

const FILTER_TABS: Array<{ key: WardFilterType; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'Phường', label: 'Phường' },
  { key: 'Xã', label: 'Xã' },
  { key: 'Đặc khu', label: 'Đặc khu' },
];

export const OnboardingWardScreen: React.FC = () => {
  const {
    currentWard,
    isDetectingGps,
    gpsError,
    selectWard,
    detectNearestWardByGps,
    completeOnboarding,
  } = useWard();
  const { typography, fontScaleMode } = useAccessibility();
  const responsive = useResponsivePhone(fontScaleMode);

  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState<WardFilterType>('ALL');

  const wards = useMemo(
    () => searchAnGiangWards(keyword, filterType),
    [keyword, filterType]
  );

  const handleChooseWard = async (ward: WardItem) => {
    await selectWard(ward, true);
  };

  const handleGpsDetect = async () => {
    const res = await detectNearestWardByGps();
    if (res) {
      await completeOnboarding();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <View
        style={[
          styles.topHeader,
          { paddingHorizontal: responsive.horizontalPadding },
        ]}
      >
        <View style={styles.emblem}>
          <Landmark size={18} color={COLORS.citizenGoldLight} />
        </View>
        <View style={styles.titleCol}>
          <Text style={[styles.title, typography.headingMd]} numberOfLines={1}>
            Chọn xã, phường An Giang
          </Text>
          <Text style={[styles.subtitle, typography.captionSm]} numberOfLines={1}>
            Chạm 1 lần vào địa phương để bắt đầu
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.controls,
          { paddingHorizontal: responsive.horizontalPadding },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          disabled={isDetectingGps}
          onPress={() => {
            void handleGpsDetect();
          }}
          style={({ pressed }) => [styles.gpsBtn, pressed && styles.pressed]}
        >
          {isDetectingGps ? (
            <ActivityIndicator size="small" color={COLORS.onPrimary} />
          ) : (
            <Navigation size={16} color={COLORS.onPrimary} />
          )}
          <Text style={[styles.gpsBtnText, typography.bodyBold]}>
            {isDetectingGps ? 'Đang định vị...' : 'Tự động tìm xã gần tôi'}
          </Text>
        </Pressable>

        {gpsError ? (
          <Text style={[styles.gpsError, typography.captionSm]}>{gpsError}</Text>
        ) : null}

        <View style={styles.searchWrap}>
          <Search size={16} color={COLORS.textMuted} />
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="Tìm xã, phường, đặc khu..."
            placeholderTextColor={COLORS.textMuted}
            style={[styles.searchInput, typography.bodyMd]}
          />
          {keyword.length > 0 ? (
            <Pressable onPress={() => setKeyword('')} hitSlop={8}>
              <X size={16} color={COLORS.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_TABS.map((tab) => {
            const active = filterType === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setFilterType(tab.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={wards}
        keyExtractor={(item) => item.code}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const isCurrent = item.code === currentWard.code;
          return (
            <Pressable
              onPress={() => {
                void handleChooseWard(item);
              }}
              style={({ pressed }) => [
                styles.row,
                { paddingHorizontal: responsive.horizontalPadding },
                isCurrent && styles.rowSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.wardName, typography.bodyBold]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.wardArea, typography.captionSm]} numberOfLines={1}>
                  {item.area}
                </Text>
              </View>
              {isCurrent ? (
                <Check size={18} color={COLORS.citizenCrimson} />
              ) : (
                <ChevronRight size={17} color={COLORS.textMuted} />
              )}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.card,
  },
  topHeader: {
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.citizenCrimson,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emblem: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.citizenEmblemBg,
    borderWidth: 1,
    borderColor: COLORS.citizenGoldBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: COLORS.onPrimary,
  },
  subtitle: {
    color: COLORS.citizenGoldSoft,
  },
  controls: {
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    backgroundColor: COLORS.card,
  },
  gpsBtn: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  gpsBtnText: {
    color: COLORS.onPrimary,
  },
  gpsError: {
    color: COLORS.errorText,
  },
  searchWrap: {
    minHeight: 44,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: COLORS.textPrimary,
  },
  filterRow: {
    gap: SPACING.xs,
  },
  filterChip: {
    minHeight: 34,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.mutedSurface,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.citizenCrimson,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: COLORS.onPrimary,
  },
  row: {
    minHeight: 56,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  rowSelected: {
    backgroundColor: COLORS.citizenCrimsonSoftBg,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  wardName: {
    color: COLORS.textPrimary,
  },
  wardArea: {
    color: COLORS.textMuted,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.borderSubtle,
    marginLeft: SPACING.lg,
  },
  pressed: {
    opacity: 0.82,
  },
});
