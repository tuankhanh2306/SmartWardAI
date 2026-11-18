/**
 * SmartWard AI Mobile — Màn hình 1: Onboarding & Chọn 96 Xã/Phường/Đặc khu An Giang
 * Cho phép công dân định vị GPS tự động hoặc tìm chọn đơn vị hành chính trước khi vào 5 Tab chính.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowRight,
  Building2,
  Clock,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
} from 'lucide-react-native';
import { WardSelectorModal } from '../components/WardSelectorModal';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';

export const OnboardingWardScreen: React.FC = () => {
  const {
    currentWard,
    isDetectingGps,
    gpsError,
    detectNearestWardByGps,
    completeOnboarding,
  } = useWard();
  const { typography, fontScaleMode, cycleFontMode } = useAccessibility();

  const [modalVisible, setModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topRow}>
          <View style={styles.brandBadge}>
            <ShieldCheck size={16} color={COLORS.primary} />
            <Text style={styles.brandBadgeText}>SMARTWARD AI • AN GIANG 2026</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void cycleFontMode();
            }}
            style={styles.fontToggle}
          >
            <Text style={styles.fontToggleText}>Cỡ chữ: {fontScaleMode}</Text>
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <Text style={[styles.heroTitle, typography.displayXl]}>
            Trợ Lý Hành Chính Công Cấp Xã — Tỉnh An Giang
          </Text>
          <Text style={[styles.heroSubtitle, typography.bodyMd]}>
            Hỗ trợ 96 Xã, Phường và Đặc khu • 40 Thủ tục hành chính chuẩn hóa 2026 • Hoàn toàn miễn phí (Không SMS/Zalo thu phí).
          </Text>
        </View>

        <View style={styles.wardCard}>
          <View style={styles.wardCardHeader}>
            <Text style={[styles.sectionLabel, typography.captionSm]}>
              ĐƠN VỊ HÀNH CHÍNH ĐANG CHỌN
            </Text>
            <View style={styles.typePill}>
              <Text style={styles.typePillText}>{currentWard.type}</Text>
            </View>
          </View>

          <View style={styles.wardNameRow}>
            <MapPin size={22} color={COLORS.primary} />
            <Text style={[styles.wardName, typography.headingLg]}>
              UBND {currentWard.name}
            </Text>
          </View>

          <View style={styles.infoLine}>
            <Building2 size={16} color={COLORS.textSecondary} />
            <Text style={[styles.infoText, typography.bodyMd]}>
              {currentWard.officeAddress}
            </Text>
          </View>

          <View style={styles.infoLine}>
            <Phone size={16} color={COLORS.primary} />
            <Text style={[styles.infoTextBold, typography.bodyBold]}>
              Bộ phận Một cửa: {currentWard.phoneNumber}
            </Text>
          </View>

          <View style={styles.infoLine}>
            <Clock size={16} color={COLORS.textSecondary} />
            <Text style={[styles.infoText, typography.captionSm]}>
              {currentWard.workingHours}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void detectNearestWardByGps();
              }}
              disabled={isDetectingGps}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.secondaryBtnPressed,
              ]}
            >
              {isDetectingGps ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Navigation size={16} color={COLORS.primary} />
              )}
              <Text style={[styles.secondaryBtnText, typography.bodyBold]}>
                Định vị GPS
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setModalVisible(true)}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.secondaryBtnPressed,
              ]}
            >
              <MapPin size={16} color={COLORS.primary} />
              <Text style={[styles.secondaryBtnText, typography.bodyBold]}>
                Chọn 96 Xã/Phường
              </Text>
            </Pressable>
          </View>

          {gpsError ? (
            <Text style={[styles.errorText, typography.captionSm]}>{gpsError}</Text>
          ) : null}
        </View>

        <View style={styles.servicesCard}>
          <Text style={[styles.sectionLabel, typography.captionSm]}>
            DỊCH VỤ TRỰC TUYẾN TRỌNG TÂM TẠI {currentWard.name.toUpperCase()}
          </Text>
          <View style={styles.serviceChipWrap}>
            {currentWard.onlineServices.map((srv) => (
              <View key={srv} style={styles.serviceChip}>
                <Text style={[styles.serviceChipText, typography.captionSm]}>
                  ✓ {srv}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void completeOnboarding();
          }}
          style={({ pressed }) => [
            styles.continueBtn,
            pressed && styles.continueBtnPressed,
          ]}
        >
          <Text style={[styles.continueBtnText, typography.headingMd]}>
            Tiếp tục vào Cổng Công Dân
          </Text>
          <ArrowRight size={20} color={COLORS.onPrimary} />
        </Pressable>
      </ScrollView>

      <WardSelectorModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  brandBadgeText: {
    color: COLORS.primary,
    fontSize: 11.5,
    fontWeight: '800',
  },
  fontToggle: {
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    justifyContent: 'center',
  },
  fontToggleText: {
    color: COLORS.textPrimary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  heroTitle: {
    color: COLORS.textPrimary,
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
  },
  wardCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  wardCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  typePill: {
    backgroundColor: COLORS.primarySubtle,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
  },
  typePillText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  wardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  wardName: {
    color: COLORS.textPrimary,
    flex: 1,
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
  infoTextBold: {
    color: COLORS.primary,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
  },
  secondaryBtnPressed: {
    opacity: 0.85,
  },
  secondaryBtnText: {
    color: COLORS.primary,
  },
  errorText: {
    color: COLORS.errorText,
  },
  servicesCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  serviceChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  serviceChip: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  serviceChipText: {
    color: COLORS.textPrimary,
  },
  continueBtn: {
    minHeight: 54,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  continueBtnPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  continueBtnText: {
    color: COLORS.onPrimary,
  },
});
