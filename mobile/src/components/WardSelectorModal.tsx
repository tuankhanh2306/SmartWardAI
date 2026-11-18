/**
 * SmartWard AI Mobile — Modal Chọn 96 Xã, Phường, Đặc khu (Tối giản, 1 chạm chọn ngay)
 */

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, Navigation, Search, X } from 'lucide-react-native';
import {
  searchAnGiangWards,
  type WardFilterType,
  type WardItem,
} from '../core/angiangWards';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { useResponsivePhone } from '../theme/responsive';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';

export interface WardSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

const FILTER_OPTIONS: Array<{ key: WardFilterType; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'Phường', label: 'Phường' },
  { key: 'Xã', label: 'Xã' },
  { key: 'Đặc khu', label: 'Đặc khu' },
];

export const WardSelectorModal: React.FC<WardSelectorModalProps> = ({
  visible,
  onClose,
}) => {
  const { currentWard, isDetectingGps, gpsError, selectWard, detectNearestWardByGps } =
    useWard();
  const { typography, fontScaleMode } = useAccessibility();
  const responsive = useResponsivePhone(fontScaleMode);

  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState<WardFilterType>('ALL');

  const filteredWards = useMemo(
    () => searchAnGiangWards(keyword, filterType),
    [keyword, filterType]
  );

  const handleSelectWard = async (ward: WardItem) => {
    await selectWard(ward, true);
    onClose();
  };

  const handleDetectGps = async () => {
    const result = await detectNearestWardByGps();
    if (result) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.header,
            { paddingHorizontal: responsive.horizontalPadding },
          ]}
        >
          <Text style={[styles.title, typography.headingMd]} numberOfLines={1}>
            Chọn xã, phường
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng"
            onPress={onClose}
            style={styles.closeBtn}
          >
            <X size={20} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        <View
          style={[
            styles.controlsWrap,
            { paddingHorizontal: responsive.horizontalPadding },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void handleDetectGps();
            }}
            disabled={isDetectingGps}
            style={({ pressed }) => [styles.gpsButton, pressed && styles.pressed]}
          >
            {isDetectingGps ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Navigation size={16} color={COLORS.onPrimary} />
            )}
            <Text style={[styles.gpsButtonText, typography.bodyBold]}>
              {isDetectingGps ? 'Đang định vị...' : 'Tự động tìm xã gần tôi'}
            </Text>
          </Pressable>

          {gpsError ? (
            <Text style={[styles.gpsErrorText, typography.captionSm]}>{gpsError}</Text>
          ) : null}

          <View style={styles.searchBox}>
            <Search size={16} color={COLORS.textMuted} />
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              placeholder="Tìm tên xã, phường, đặc khu..."
              placeholderTextColor={COLORS.textMuted}
              style={[styles.searchInput, typography.bodyMd]}
              returnKeyType="search"
            />
            {keyword.length > 0 ? (
              <Pressable onPress={() => setKeyword('')} hitSlop={10}>
                <X size={16} color={COLORS.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTER_OPTIONS.map((opt) => {
              const active = filterType === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setFilterType(opt.key)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={filteredWards}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, typography.bodyMd]}>
                Không tìm thấy "{keyword}".
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = item.code === currentWard.code;
            return (
              <Pressable
                onPress={() => {
                  void handleSelectWard(item);
                }}
                style={({ pressed }) => [
                  styles.wardRow,
                  { paddingHorizontal: responsive.horizontalPadding },
                  isSelected && styles.wardRowSelected,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.wardRowTextCol}>
                  <Text style={[styles.wardName, typography.bodyBold]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.wardSub, typography.captionSm]} numberOfLines={1}>
                    {item.area}
                  </Text>
                </View>
                {isSelected ? (
                  <Check size={18} color={COLORS.citizenCrimson} />
                ) : null}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.card,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  title: {
    color: COLORS.textPrimary,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.mutedSurface,
  },
  controlsWrap: {
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  gpsButton: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.citizenCrimson,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  gpsButtonText: {
    color: COLORS.onPrimary,
  },
  gpsErrorText: {
    color: COLORS.errorText,
  },
  searchBox: {
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
  wardRow: {
    minHeight: 56,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
  },
  wardRowSelected: {
    backgroundColor: COLORS.citizenCrimsonSoftBg,
  },
  wardRowTextCol: {
    flex: 1,
    minWidth: 0,
  },
  wardName: {
    color: COLORS.textPrimary,
  },
  wardSub: {
    color: COLORS.textMuted,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.borderSubtle,
    marginLeft: SPACING.lg,
  },
  emptyBox: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
  },
  pressed: {
    opacity: 0.82,
  },
});
