/**
 * SmartWard AI Mobile — Màn hình 1: Chọn 96 Xã/Phường/Đặc khu An Giang
 * Đồng bộ trực tiếp giao diện Web (Header.tsx Crimson Masthead + WardOnboarding.tsx Navy Cards)
 * Tối ưu Responsive cho tất cả kích thước màn hình điện thoại (Tiny 320px -> Large 430px+)
 */

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowRight,
  Building2,
  ChevronRight,
  Clock,
  Landmark,
  Navigation,
  Phone,
  Search,
  Type,
  X,
} from 'lucide-react-native';
import { WardSelectorModal } from '../components/WardSelectorModal';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import {
  searchAnGiangWards,
  type WardFilterType,
} from '../core/angiangWards';
import { getOfficeOpenStatus, useResponsivePhone } from '../theme/responsive';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';

const QUICK_FILTER_TABS: Array<{ key: WardFilterType; label: string }> = [
  { key: 'ALL', label: 'Tất cả (96)' },
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
  const { typography, fontScaleMode, cycleFontMode } = useAccessibility();
  const responsive = useResponsivePhone(fontScaleMode);
  const officeStatus = getOfficeOpenStatus();

  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState<WardFilterType>('ALL');
  const [modalVisible, setModalVisible] = useState(false);

  const quickWards = useMemo(
    () => searchAnGiangWards(keyword, filterType).slice(0, 6),
    [keyword, filterType]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      {/* Official Crimson Masthead matching Web Header.tsx */}
      <View
        style={[
          styles.masthead,
          { paddingHorizontal: responsive.horizontalPadding },
        ]}
      >
        <View style={styles.brandRow}>
          <View style={styles.emblem}>
            <Landmark size={18} color={COLORS.citizenGoldLight} />
          </View>
          <View style={styles.brandTextCol}>
            <Text numberOfLines={1} style={styles.brandOverline}>
              CỔNG MỘT CỬA SỐ • TỈNH AN GIANG
            </Text>
            <Text numberOfLines={1} style={styles.brandTitle}>
              SmartWard AI (96 Đơn vị)
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void cycleFontMode();
          }}
          style={({ pressed }) => [styles.fontBtn, pressed && styles.pressed]}
        >
          <Type size={14} color={COLORS.citizenGoldSoft} />
          <Text style={styles.fontBtnText}>{fontScaleMode}</Text>
        </Pressable>
      </View>

      {/* Warm Ivory Editorial Sub-Banner */}
      <View
        style={[
          styles.ivoryStrip,
          { paddingHorizontal: responsive.horizontalPadding },
        ]}
      >
        <Text style={styles.ivoryStripText} numberOfLines={1}>
          14 Phường • 79 Xã • 3 Đặc khu (Phú Quốc, Kiên Hải, Thổ Châu)
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: responsive.horizontalPadding,
            gap: responsive.sectionGap,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected Ward Institutional Card (Synced with WardOnboarding.tsx) */}
        <View
          style={[
            styles.selectedWardCard,
            { padding: responsive.cardPadding },
          ]}
        >
          <View style={styles.selectedHeaderRow}>
            <View style={styles.selectedTitleRow}>
              <View style={styles.navyBadgeIcon}>
                <Building2 size={18} color={COLORS.officerAccentSky} />
              </View>
              <View style={styles.selectedTitleCol}>
                <Text style={[styles.selectedLabel, typography.captionSm]}>
                  UBND ĐANG CHỌN ({currentWard.code})
                </Text>
                <Text
                  style={[styles.selectedWardName, typography.headingLg]}
                  numberOfLines={2}
                >
                  UBND {currentWard.name}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.officeStatusPill,
                officeStatus.isOfficeOpen
                  ? styles.officeOpenPill
                  : styles.officeAfterHoursPill,
              ]}
            >
              <Text
                style={[
                  styles.officeStatusText,
                  officeStatus.isOfficeOpen
                    ? styles.officeOpenText
                    : styles.officeAfterHoursText,
                ]}
              >
                {officeStatus.statusLabel}
              </Text>
            </View>
          </View>

          <View style={styles.infoList}>
            <View style={styles.infoLine}>
              <Building2 size={15} color={COLORS.textMuted} />
              <Text style={[styles.infoText, typography.bodyMd]}>
                {currentWard.officeAddress}
              </Text>
            </View>
            <View style={styles.infoLine}>
              <Phone size={15} color={COLORS.primary} />
              <Text style={[styles.infoTextHighlight, typography.bodyBold]}>
                Hotline Một cửa: {currentWard.phoneNumber}
              </Text>
            </View>
            <View style={styles.infoLine}>
              <Clock size={15} color={COLORS.textMuted} />
              <Text style={[styles.infoText, typography.captionSm]}>
                {currentWard.workingHours}
              </Text>
            </View>
          </View>

          {/* GPS Auto-Detect & Full 96-Ward Modal */}
          <View
            style={[
              styles.dualActionRow,
              responsive.isTinyPhone && styles.dualActionCol,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              disabled={isDetectingGps}
              onPress={() => {
                void detectNearestWardByGps();
              }}
              style={({ pressed }) => [styles.gpsBtn, pressed && styles.pressed]}
            >
              {isDetectingGps ? (
                <ActivityIndicator size="small" color={COLORS.onPrimary} />
              ) : (
                <Navigation size={15} color={COLORS.onPrimary} />
              )}
              <Text style={[styles.gpsBtnText, typography.bodyBold]} numberOfLines={1}>
                Định vị GPS
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setModalVisible(true)}
              style={({ pressed }) => [styles.listBtn, pressed && styles.pressed]}
            >
              <Search size={15} color={COLORS.officerNavy} />
              <Text style={[styles.listBtnText, typography.bodyBold]} numberOfLines={1}>
                Danh sách 96 Xã
              </Text>
            </Pressable>
          </View>

          {gpsError ? (
            <Text style={[styles.gpsErrorText, typography.captionSm]}>{gpsError}</Text>
          ) : null}
        </View>

        {/* Inline Quick Search & Picker (Synced with Web WardOnboarding left column) */}
        <View style={[styles.searchCard, { padding: responsive.cardPadding }]}>
          <Text style={[styles.sectionHeading, typography.headingMd]}>
            Tìm nhanh Xã / Phường / Đặc khu
          </Text>

          <View style={styles.searchInputWrap}>
            <Search size={16} color={COLORS.textMuted} />
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              placeholder="Gõ tên xã/phường (VD: Long Xuyên, Châu Đốc, Phú Quốc)..."
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
            contentContainerStyle={styles.filterChipsRow}
          >
            {QUICK_FILTER_TABS.map((tab) => {
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

          <View style={styles.quickList}>
            {quickWards.map((ward) => {
              const selected = ward.code === currentWard.code;
              return (
                <Pressable
                  key={ward.code}
                  onPress={() => {
                    void selectWard(ward, false);
                  }}
                  style={({ pressed }) => [
                    styles.quickRow,
                    selected && styles.quickRowSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.quickRowLeft}>
                    <Text style={[styles.quickWardName, typography.bodyBold]} numberOfLines={1}>
                      {ward.name}
                    </Text>
                    <Text style={[styles.quickWardArea, typography.captionSm]} numberOfLines={1}>
                      {ward.area} • {ward.type}
                    </Text>
                  </View>
                  <View style={styles.quickRowRight}>
                    <View style={styles.rateBadge}>
                      <Text style={styles.rateBadgeText}>{ward.solvedRate}%</Text>
                    </View>
                    <ChevronRight
                      size={16}
                      color={selected ? COLORS.officerNavy : COLORS.textMuted}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setModalVisible(true)}
            style={styles.viewAllLink}
          >
            <Text style={[styles.viewAllLinkText, typography.bodyBold]}>
              Xem đầy đủ tất cả 96 đơn vị hành chính →
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sticky Bottom Primary CTA (Always reachable on all phone heights) */}
      <View
        style={[
          styles.stickyFooter,
          { paddingHorizontal: responsive.horizontalPadding },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void completeOnboarding();
          }}
          style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressed]}
        >
          <Text style={[styles.confirmBtnText, typography.headingMd]} numberOfLines={1}>
            Vào Cổng UBND {currentWard.name}
          </Text>
          <ArrowRight size={19} color={COLORS.officerAccentSky} />
        </Pressable>
      </View>

      <WardSelectorModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.citizenSurface,
  },
  masthead: {
    minHeight: 58,
    backgroundColor: COLORS.citizenCrimson,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  brandRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emblem: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.citizenEmblemBg,
    borderWidth: 1.25,
    borderColor: COLORS.citizenGoldBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandTextCol: {
    flex: 1,
    minWidth: 0,
  },
  brandOverline: {
    color: COLORS.citizenGoldSoft,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  brandTitle: {
    color: COLORS.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  fontBtn: {
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  fontBtnText: {
    color: COLORS.onPrimary,
    fontSize: 12.5,
    fontWeight: '800',
  },
  ivoryStrip: {
    backgroundColor: COLORS.citizenIvory,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.citizenIvoryBorder,
    paddingVertical: 7,
  },
  ivoryStripText: {
    color: COLORS.citizenIvoryInk,
    fontSize: 11.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  selectedWardCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.officerNavy,
    gap: SPACING.md,
  },
  selectedHeaderRow: {
    gap: SPACING.sm,
  },
  selectedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  navyBadgeIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.officerNavy,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  selectedTitleCol: {
    flex: 1,
    minWidth: 0,
  },
  selectedLabel: {
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  selectedWardName: {
    color: COLORS.officerNavy,
  },
  officeStatusPill: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  officeOpenPill: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
  },
  officeAfterHoursPill: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
  },
  officeStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  officeOpenText: {
    color: COLORS.successText,
  },
  officeAfterHoursText: {
    color: COLORS.warningText,
  },
  infoList: {
    gap: SPACING.xs,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  infoText: {
    color: COLORS.textSecondary,
    flex: 1,
  },
  infoTextHighlight: {
    color: COLORS.primary,
    flex: 1,
  },
  dualActionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  dualActionCol: {
    flexDirection: 'column',
  },
  gpsBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
  },
  gpsBtnText: {
    color: COLORS.onPrimary,
  },
  listBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.mutedSurface,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
  },
  listBtnText: {
    color: COLORS.officerNavy,
  },
  gpsErrorText: {
    color: COLORS.errorText,
  },
  searchCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    gap: SPACING.sm,
  },
  sectionHeading: {
    color: COLORS.officerNavy,
  },
  searchInputWrap: {
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
  filterChipsRow: {
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
  quickList: {
    gap: SPACING.xs,
  },
  quickRow: {
    minHeight: MIN_TOUCH_TARGET + 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  quickRowSelected: {
    backgroundColor: COLORS.mutedSurface,
    borderColor: COLORS.officerNavy,
  },
  quickRowLeft: {
    flex: 1,
    minWidth: 0,
  },
  quickWardName: {
    color: COLORS.textPrimary,
  },
  quickWardArea: {
    color: COLORS.textMuted,
  },
  quickRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  rateBadge: {
    backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  rateBadgeText: {
    color: COLORS.successText,
    fontSize: 11,
    fontWeight: '800',
  },
  viewAllLink: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllLinkText: {
    color: COLORS.citizenCrimson,
  },
  stickyFooter: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingVertical: SPACING.sm,
  },
  confirmBtn: {
    minHeight: 52,
    backgroundColor: COLORS.officerNavy,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  confirmBtnText: {
    color: COLORS.onPrimary,
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
