/**
 * SmartWard AI Mobile — Khối Chụp Giấy Tờ Nhiều Ô & Đối Chiếu Điền Nháp Có Xác Nhận (TASK-057 & TASK-058)
 * - Khai sinh (TK-KS): tách riêng ô "Tờ khai đăng ký khai sinh" (hỗ trợ nhiều trang) và ô "Giấy chứng sinh"
 * - Ảnh tham khảo chưa xác minh không làm hồ sơ đạt đủ giấy tờ bắt buộc
 * - Tách 3 thao tác độc lập: Kiểm tra ảnh -> Áp dụng vào tờ khai (có xác nhận ghi đè) -> Gửi sơ duyệt
 */

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FilePlus2,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import {
  computePrefillPlan,
  evaluateBirthSlotCompleteness,
  type BirthFormCurrentDraft,
  type CapturedDocumentPage,
} from '../core/birthDocumentWorkflow';
import type { ExpectedDocumentType } from '../core/visionQualityGate';
import { VisionGateCard } from './VisionGateCard';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';
import type { CoreFormType } from '../types/api.types';

export interface BirthDocumentCaptureCardProps {
  formType: CoreFormType;
  pages: CapturedDocumentPage[];
  currentDraft: BirthFormCurrentDraft;
  onOpenCameraForSlot: (slotRole: ExpectedDocumentType, replacePageId?: string) => void;
  onRetryCheckPage: (pageId: string) => void;
  onReassignPageSlot: (pageId: string, targetSlot: ExpectedDocumentType) => void;
  onToggleReferenceOnly: (pageId: string) => void;
  onRemovePage: (pageId: string) => void;
  onApplyPrefill: (pageId: string, allowOverwrite: boolean) => void;
}

export const BirthDocumentCaptureCard: React.FC<BirthDocumentCaptureCardProps> = ({
  formType,
  pages,
  currentDraft,
  onOpenCameraForSlot,
  onRetryCheckPage,
  onReassignPageSlot,
  onToggleReferenceOnly,
  onRemovePage,
  onApplyPrefill,
}) => {
  const slots: Array<{
    role: ExpectedDocumentType;
    title: string;
    subtitle: string;
    multiPage: boolean;
  }> =
    formType === 'TK-KS'
      ? [
          {
            role: 'TK-KS',
            title: '1. Tờ khai đăng ký khai sinh (Mẫu TK-KS)',
            subtitle: 'Hỗ trợ chụp nhiều trang (Trang 1, Trang 2...)',
            multiPage: true,
          },
          {
            role: 'BIRTH_CERT',
            title: '2. Giấy chứng sinh (Bệnh viện / Cơ sở y tế cấp)',
            subtitle: 'Giấy tờ bắt buộc đối chiếu họ tên mẹ, ngày sinh & nơi sinh',
            multiPage: false,
          },
        ]
      : [
          {
            role: formType,
            title: `Ảnh chụp tờ khai ${formType}`,
            subtitle: 'Chụp khung A4 hoặc chọn từ thư viện để kiểm tra độ đọc được',
            multiPage: true,
          },
        ];

  const birthCompleteness =
    formType === 'TK-KS' ? evaluateBirthSlotCompleteness(pages) : null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Giấy tờ chụp kiểm định (Bước 1: Kiểm tra ảnh)</Text>
        {birthCompleteness ? (
          <View
            style={[
              styles.completePill,
              birthCompleteness.isComplete ? styles.completePillOk : styles.completePillWarn,
            ]}
          >
            <Text
              style={[
                styles.completePillText,
                birthCompleteness.isComplete ? styles.textOk : styles.textWarn,
              ]}
            >
              {birthCompleteness.isComplete ? 'Đủ 2 giấy tờ' : 'Chưa đủ giấy tờ'}
            </Text>
          </View>
        ) : null}
      </View>

      {birthCompleteness?.hasUnverifiedReferenceOnly ? (
        <View style={styles.refWarnBanner}>
          <AlertTriangle size={14} color={COLORS.warningAccent} />
          <Text style={styles.refWarnText}>
            Ảnh tham khảo chưa được xác minh không thay thế giấy tờ bắt buộc. Hãy chụp rõ nét đủ cả Tờ khai TK-KS và Giấy chứng sinh.
          </Text>
        </View>
      ) : null}

      {slots.map((slot) => {
        const slotPages = pages.filter((p) => p.slotRole === slot.role);
        return (
          <View key={slot.role} style={styles.slotCard}>
            <View style={styles.slotHeader}>
              <View style={styles.flex1}>
                <Text style={styles.slotTitle}>{slot.title}</Text>
                <Text style={styles.slotSubtitle}>{slot.subtitle}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => onOpenCameraForSlot(slot.role)}
                style={({ pressed }) => [styles.captureSlotBtn, pressed && styles.pressed]}
              >
                {slotPages.length > 0 && slot.multiPage ? (
                  <FilePlus2 size={14} color="#FFFFFF" />
                ) : (
                  <Camera size={14} color="#FFFFFF" />
                )}
                <Text style={styles.captureSlotBtnText}>
                  {slotPages.length > 0 && slot.multiPage
                    ? `Thêm trang ${slotPages.length + 1}`
                    : slotPages.length > 0
                    ? 'Chụp lại'
                    : 'Chụp / Chọn'}
                </Text>
              </Pressable>
            </View>

            {slotPages.map((page) => {
              const prefillPlan =
                page.gate.templateMatchStatus === 'MATCHED_FILLED' && page.ocrFields
                  ? computePrefillPlan(formType, page.slotRole, currentDraft, page.ocrFields)
                  : null;

              const uploadBadge =
                page.uploadStatus === 'UPLOADED'
                  ? { text: 'Đã tải lên máy chủ', bg: COLORS.successBg, fg: COLORS.successText }
                  : page.uploadStatus === 'FAILED'
                  ? { text: 'Ảnh chưa gửi được · Chờ thử lại', bg: COLORS.errorBg, fg: COLORS.errorText }
                  : null;

              return (
                <View key={page.id} style={styles.pageWrap}>
                  <View style={styles.pageTopRow}>
                    <Image source={{ uri: page.uri }} style={styles.thumb} resizeMode="cover" />
                    <View style={styles.flex1}>
                      <Text style={styles.pageLabel}>
                        {page.docLabel} • Trang {page.pageIndex}
                      </Text>
                      <Text style={styles.pageMeta} numberOfLines={1}>
                        {page.fileName}
                      </Text>
                      {uploadBadge ? (
                        <View style={[styles.uploadPill, { backgroundColor: uploadBadge.bg }]}>
                          <Text style={[styles.uploadPillText, { color: uploadBadge.fg }]}>
                            {uploadBadge.text}
                          </Text>
                        </View>
                      ) : null}
                      {page.attachedAsReference ? (
                        <Text style={styles.refTag}>
                          Đính kèm tham khảo (chưa xác minh loại giấy tờ)
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xóa ${page.docLabel} trang ${page.pageIndex}`}
                      onPress={() => onRemovePage(page.id)}
                      style={styles.removeBtn}
                    >
                      <Trash2 size={15} color={COLORS.errorAccent} />
                    </Pressable>
                  </View>

                  <VisionGateCard
                    gate={page.gate}
                    fileName={page.fileName}
                    checking={Boolean(page.checking)}
                    onRetake={() => onOpenCameraForSlot(slot.role, page.id)}
                    onRetryCheck={() => onRetryCheckPage(page.id)}
                    onReassignSlot={(target) => onReassignPageSlot(page.id, target)}
                  />

                  {/* Allow keeping unverified photo explicitly as reference ONLY (never counts as verified) */}
                  {!page.gate.isVerifiedForSubmission &&
                  !page.checking &&
                  (page.gate.ocrStatus === 'UNAVAILABLE' ||
                    page.gate.ocrStatus === 'NETWORK_ERROR' ||
                    page.gate.templateMatchStatus === 'UNIDENTIFIED') ? (
                    <Pressable
                      onPress={() => onToggleReferenceOnly(page.id)}
                      style={styles.refToggleBtn}
                    >
                      <Text style={styles.refToggleText}>
                        {page.attachedAsReference
                          ? '✓ Đang giữ làm ảnh tham khảo (nhấn để bỏ)'
                          : 'Giữ ảnh này làm tài liệu tham khảo (không tự điền)'}
                      </Text>
                    </Pressable>
                  ) : null}

                  {/* Step 2: Confirmable Draft Prefill Preview */}
                  {prefillPlan && prefillPlan.items.length > 0 ? (
                    <View style={styles.prefillBox}>
                      <View style={styles.prefillHeader}>
                        <Sparkles size={14} color={COLORS.primary} />
                        <Text style={styles.prefillTitle}>
                          Bước 2: Đối chiếu &amp; Áp dụng vào tờ khai ({prefillPlan.items.length} trường)
                        </Text>
                      </View>
                      {prefillPlan.items.map((item) => (
                        <View key={item.key} style={styles.prefillRow}>
                          <Text style={styles.prefillFieldLabel}>{item.label}:</Text>
                          <Text style={styles.prefillFieldValue}>
                            {item.willOverwrite
                              ? `${item.currentValue} → ${item.extractedValue} (ghi đè)`
                              : item.extractedValue}
                          </Text>
                        </View>
                      ))}

                      <View style={styles.prefillActions}>
                        {prefillPlan.newCount > 0 ? (
                          <Pressable
                            onPress={() => onApplyPrefill(page.id, false)}
                            style={({ pressed }) => [styles.applySafeBtn, pressed && styles.pressed]}
                          >
                            <CheckCircle2 size={14} color="#FFFFFF" />
                            <Text style={styles.applyBtnText}>
                              Điền {prefillPlan.newCount} mục trống
                            </Text>
                          </Pressable>
                        ) : null}
                        {prefillPlan.overwriteCount > 0 ? (
                          <Pressable
                            onPress={() => onApplyPrefill(page.id, true)}
                            style={({ pressed }) => [styles.applyOverwriteBtn, pressed && styles.pressed]}
                          >
                            <Text style={styles.applyOverwriteText}>
                              Xác nhận ghi đè ({prefillPlan.items.length} mục)
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1,
  },
  completePill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
  },
  completePillOk: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
  },
  completePillWarn: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
  },
  completePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  textOk: { color: COLORS.successText },
  textWarn: { color: COLORS.warningText },
  refWarnBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.warningBg,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  refWarnText: {
    flex: 1,
    fontSize: 11.5,
    color: COLORS.warningText,
    fontWeight: '600',
    lineHeight: 16,
  },
  slotCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  flex1: { flex: 1, minWidth: 0 },
  slotTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  slotSubtitle: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  captureSlotBtn: {
    minHeight: 38,
    paddingHorizontal: 11,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.citizenCrimson,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  captureSlotBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pageWrap: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingTop: SPACING.sm,
    gap: SPACING.xs,
  },
  pageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  thumb: {
    width: 54,
    height: 70,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.mutedSurface,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
  },
  pageLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  pageMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  uploadPill: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 3,
  },
  uploadPillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  refTag: {
    fontSize: 11,
    color: COLORS.warningText,
    fontWeight: '700',
    marginTop: 2,
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refToggleBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.mutedSurface,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    alignItems: 'center',
  },
  refToggleText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  prefillBox: {
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: 5,
  },
  prefillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  prefillTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    flex: 1,
  },
  prefillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  prefillFieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  prefillFieldValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  prefillActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  applySafeBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET - 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  applyOverwriteBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET - 8,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.warningAccent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  applyOverwriteText: {
    color: COLORS.warningText,
    fontSize: 11.5,
    fontWeight: '800',
  },
  pressed: { opacity: 0.85 },
});
