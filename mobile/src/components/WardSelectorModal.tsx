/**
 * SmartWard AI Mobile — Modal Chọn 96 Xã, Phường, Đặc khu Tỉnh An Giang
 * Tích hợp tìm kiếm không dấu, lọc 4 nhóm (Tất cả | Phường | Xã | Đặc khu),
 * định vị GPS 1 chạm và thẻ thông tin trụ sở UBND + SĐT Một cửa.
 */

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, MapPin, Navigation, Phone, Search, X } from 'lucide-react-native';
import {
  searchAnGiangWards,
  type WardFilterType,
  type WardItem,
} from '../core/angiangWards';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';

export interface WardSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

const FILTER_OPTIONS: Array<{ key: WardFilterType; label: string }> = [
  { key: 'ALL', label: 'Tất cả (96)' },
  { key: 'Phường', label: 'Phường (14)' },
  { key: 'Xã', label: 'Xã (79)' },
  { key: 'Đặc khu', label: 'Đặc khu (3)' },
];

export const WardSelectorModal: React.FC<WardSelectorModalProps> = ({
  visible,
  onClose,
}) => {
  const { currentWard, isDetectingGps, gpsError, selectWard, detectNearestWardByGps } =
    useWard();
  const { typography } = useAccessibility();

  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState<WardFilterType>('ALL');
  const [gpsStatusNote, setGpsStatusNote] = useState<string | null>(null);

  const filteredWards = useMemo(
    () => searchAnGiangWards(keyword, filterType),
    [keyword, filterType]
  );

  const handleSelectWard = async (ward: WardItem) => {
    await selectWard(ward, true);
    setGpsStatusNote(null);
    onClose();
  };

  const handleDetectGps = async () => {
    setGpsStatusNote(null);
    const result = await detectNearestWardByGps();
    if (result) {
      const distText =
        result.distanceMeters < 1000
          ? `${result.distanceMeters} m`
          : `${(result.distanceMeters / 1000).toFixed(1)} km`;
      setGpsStatusNote(
        `Đã xác định gần nhất: ${result.ward.name} (cách trụ sở UBND ${distText}).`
      );
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
        <View style={styles.header}>
          <View style={styles.headerTitleBox}>
            <Text style={[styles.title, typography.headingLg]}>
              Chọn Xã / Phường / Đặc khu
            </Text>
            <Text style={[styles.subtitle, typography.captionSm]}>
              96 Đơn vị hành chính Tỉnh An Giang chuẩn hóa 2026
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng hộp thoại chọn xã phường"
            onPress={onClose}
            style={styles.closeBtn}
          >
            <X size={22} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.controlsWrap}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void handleDetectGps();
            }}
            disabled={isDetectingGps}
            style={({ pressed }) => [styles.gpsButton, pressed && styles.gpsButtonPressed]}
          >
            {isDetectingGps ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Navigation size={18} color={COLORS.onPrimary} />
            )}
            <Text style={[styles.gpsButtonText, typography.bodyBold]}>
              {isDetectingGps ? 'Đang định vị GPS An Giang...' : '🎯 Định vị GPS tự động'}
            </Text>
          </Pressable>

          {gpsStatusNote ? (
            <View style={styles.gpsSuccessBanner}>
              <Text style={[styles.gpsSuccessText, typography.captionSm]}>
                {gpsStatusNote}
              </Text>
            </View>
          ) : null}

          {gpsError ? (
            <View style={styles.gpsErrorBanner}>
              <Text style={[styles.gpsErrorText, typography.captionSm]}>{gpsError}</Text>
            </View>
          ) : null}

          <View style={styles.searchBox}>
            <Search size={18} color={COLORS.textMuted} />
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              placeholder="Tìm tên xã, phường, đặc khu (VD: Long Xuyên, Phú Quốc)..."
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

          <View style={styles.filterRow}>
            {FILTER_OPTIONS.map((opt) => {
              const active = filterType === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setFilterType(opt.key)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <FlatList
          data={filteredWards}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, typography.bodyMd]}>
                Không tìm thấy đơn vị hành chính phù hợp với từ khóa "{keyword}".
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
                  styles.wardCard,
                  isSelected && styles.wardCardSelected,
                  pressed && styles.wardCardPressed,
                ]}
              >
                <View style={styles.wardCardTop}>
                  <View style={styles.wardTitleRow}>
                    <MapPin
                      size={16}
                      color={isSelected ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={[styles.wardName, typography.headingMd]}>
                      {item.name}
                    </Text>
                  </View>
                  <View style={styles.wardMetaRight}>
                    <View style={styles.typeTag}>
                      <Text style={styles.typeTagText}>{item.type}</Text>
                    </View>
                    {isSelected ? <Check size={18} color={COLORS.primary} /> : null}
                  </View>
                </View>

                <Text style={[styles.wardAddress, typography.captionSm]}>
                  🏛️ {item.officeAddress}
                </Text>
                <View style={styles.wardFooterRow}>
                  <View style={styles.phoneRow}>
                    <Phone size={13} color={COLORS.primary} />
                    <Text style={[styles.phoneText, typography.captionSm]}>
                      Một cửa: {item.phoneNumber}
                    </Text>
                  </View>
                  <Text style={[styles.wardCodeText, typography.captionSm]}>
                    {item.code}
                  </Text>
                </View>
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
    backgroundColor: COLORS.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  headerTitleBox: {
    flex: 1,
  },
  title: {
    color: COLORS.textPrimary,
  },
  subtitle: {
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.mutedSurface,
  },
  controlsWrap: {
    padding: SPACING.lg,
    gap: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  gpsButton: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  gpsButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  gpsButtonText: {
    color: COLORS.onPrimary,
  },
  gpsSuccessBanner: {
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  gpsSuccessText: {
    color: COLORS.successText,
  },
  gpsErrorBanner: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  gpsErrorText: {
    color: COLORS.errorText,
  },
  searchBox: {
    minHeight: MIN_TOUCH_TARGET,
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
    color: COLORS.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.mutedSurface,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.primarySubtle,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  wardCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  wardCardSelected: {
    backgroundColor: COLORS.primarySubtle,
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  wardCardPressed: {
    opacity: 0.9,
  },
  wardCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  wardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
  },
  wardName: {
    color: COLORS.textPrimary,
  },
  wardMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  typeTag: {
    backgroundColor: COLORS.mutedSurface,
    borderRadius: RADIUS.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  typeTagText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  wardAddress: {
    color: COLORS.textSecondary,
  },
  wardFooterRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  wardCodeText: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  emptyBox: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
