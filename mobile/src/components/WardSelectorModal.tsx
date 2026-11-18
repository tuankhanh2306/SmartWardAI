/**
 * SmartWard AI Mobile — Modal Chọn 96 Xã, Phường, Đặc khu Tỉnh An Giang
 * Đồng bộ giao diện Web WardOnboarding.tsx (Navy #0F2942 + Civic Emerald #00796B + Tỷ lệ giải quyết %)
 * Tối ưu Responsive cho tất cả kích thước màn hình điện thoại.
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
import {
  Building2,
  Check,
  Navigation,
  Phone,
  Search,
  X,
} from 'lucide-react-native';
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
  const { typography, fontScaleMode } = useAccessibility();
  const responsive = useResponsivePhone(fontScaleMode);

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
        {/* Crimson Top Bar matching Web Citizen Portal */}
        <View
          style={[
            styles.header,
            { paddingHorizontal: responsive.horizontalPadding },
          ]}
        >
          <View style={styles.headerTitleBox}>
            <Text style={[styles.title, typography.headingMd]} numberOfLines={1}>
              Chọn Xã / Phường / Đặc khu
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              96 Đơn vị hành chính Tỉnh An Giang chuẩn hóa 2026
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng hộp thoại chọn xã phường"
            onPress={onClose}
            style={styles.closeBtn}
          >
            <X size={20} color={COLORS.onPrimary} />
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
            style={({ pressed }) => [styles.gpsButton, pressed && styles.gpsButtonPressed]}
          >
            {isDetectingGps ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Navigation size={17} color={COLORS.onPrimary} />
            )}
            <Text style={[styles.gpsButtonText, typography.bodyBold]} numberOfLines={1}>
              {isDetectingGps ? 'Đang định vị GPS...' : '🎯 Định vị GPS tự động'}
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
            <Search size={17} color={COLORS.textMuted} />
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
          contentContainerStyle={[
            styles.listContent,
            { paddingHorizontal: responsive.horizontalPadding },
          ]}
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
                  { padding: responsive.cardPadding },
                  isSelected && styles.wardCardSelected,
                  pressed && styles.wardCardPressed,
                ]}
              >
                <View style={styles.wardCardTop}>
                  <View
                    style={[
                      styles.wardIconBox,
                      isSelected ? styles.wardIconBoxActive : styles.wardIconBoxIdle,
                    ]}
                  >
                    <Building2
                      size={16}
                      color={isSelected ? COLORS.officerAccentSky : COLORS.primary}
                    />
                  </View>

                  <View style={styles.wardTitleCol}>
                    <Text style={[styles.wardName, typography.bodyBold]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.wardAreaText, typography.captionSm]} numberOfLines={1}>
                      {item.area} • {item.type}
                    </Text>
                  </View>

                  <View style={styles.wardMetaRight}>
                    <View style={styles.rateTag}>
                      <Text style={styles.rateTagText}>{item.solvedRate}%</Text>
                    </View>
                    {isSelected ? <Check size={18} color={COLORS.officerNavy} /> : null}
                  </View>
                </View>

                <Text style={[styles.wardAddress, typography.captionSm]} numberOfLines={2}>
                  🏛️ {item.officeAddress}
                </Text>

                <View style={styles.wardFooterRow}>
                  <View style={styles.phoneRow}>
                    <Phone size={12} color={COLORS.primary} />
                    <Text style={[styles.phoneText, typography.captionSm]}>
                      {item.phoneNumber}
                    </Text>
                  </View>
                  <Text style={styles.wardCodeText}>{item.code}</Text>
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
    backgroundColor: COLORS.citizenSurface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.citizenCrimson,
    gap: SPACING.sm,
  },
  headerTitleBox: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: COLORS.onPrimary,
  },
  subtitle: {
    color: COLORS.citizenGoldSoft,
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: MIN_TOUCH_TARGET - 4,
    height: MIN_TOUCH_TARGET - 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  controlsWrap: {
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
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
    minWidth: 0,
    color: COLORS.textPrimary,
  },
  filterRow: {
    gap: SPACING.xs,
    paddingVertical: 2,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.mutedSurface,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.officerNavy,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: COLORS.onPrimary,
  },
  listContent: {
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  wardCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
  },
  wardCardSelected: {
    backgroundColor: COLORS.mutedSurface,
    borderColor: COLORS.officerNavy,
    borderWidth: 1.5,
  },
  wardCardPressed: {
    opacity: 0.9,
  },
  wardCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  wardIconBox: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  wardIconBoxActive: {
    backgroundColor: COLORS.officerNavy,
  },
  wardIconBoxIdle: {
    backgroundColor: COLORS.primarySubtle,
  },
  wardTitleCol: {
    flex: 1,
    minWidth: 0,
  },
  wardName: {
    color: COLORS.textPrimary,
  },
  wardAreaText: {
    color: COLORS.textMuted,
  },
  wardMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  rateTag: {
    backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  rateTagText: {
    color: COLORS.successText,
    fontSize: 11,
    fontWeight: '800',
  },
  wardAddress: {
    color: COLORS.textSecondary,
  },
  wardFooterRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  wardCodeText: {
    color: COLORS.textMuted,
    fontSize: 11,
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
