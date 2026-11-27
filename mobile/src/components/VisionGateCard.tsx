/**
 * SmartWard AI Mobile — Thẻ Kiểm Định Ảnh Giấy Tờ (TASK-056 & TASK-057)
 * Hiển thị trung thực độ đọc được, loại giấy tờ, số trường thực đọc, lý do chi tiết
 * và các nút hành động (Kiểm tra lại / Chụp lại / Chuyển đúng ô) — không hiển thị điểm giả.
 */

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  ArrowRightLeft,
  Camera,
  CheckCircle2,
  FileWarning,
  HelpCircle,
  RefreshCw,
  WifiOff,
  XCircle,
} from 'lucide-react-native';
import type { ExpectedDocumentType, VisionGateResult } from '../core/visionQualityGate';
import { getDocumentTypeDisplayName } from '../core/visionQualityGate';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';

export interface VisionGateCardProps {
  gate: VisionGateResult;
  fileName?: string;
  checking?: boolean;
  onRetake?: () => void;
  onRetryCheck?: () => void;
  onReassignSlot?: (targetSlot: ExpectedDocumentType) => void;
}

export const VisionGateCard: React.FC<VisionGateCardProps> = ({
  gate,
  fileName,
  checking = false,
  onRetake,
  onRetryCheck,
  onReassignSlot,
}) => {
  const isPass = gate.isVerifiedForSubmission;
  const isNeutralPending =
    !isPass &&
    (gate.ocrStatus === 'NOT_RUN' ||
      gate.ocrStatus === 'NETWORK_ERROR' ||
      gate.ocrStatus === 'UNAVAILABLE' ||
      gate.templateMatchStatus === 'MATCHED_BLANK');

  const cardStyle = isPass
    ? styles.cardPass
    : isNeutralPending
    ? styles.cardWarn
    : styles.cardBlock;

  const headerTitle = checking
    ? 'Đang kiểm tra ảnh giấy tờ...'
    : isPass
    ? 'Ảnh đạt yêu cầu kiểm định'
    : gate.ocrStatus === 'NETWORK_ERROR'
    ? 'Chưa kiểm tra được do lỗi mạng'
    : gate.ocrStatus === 'UNAVAILABLE'
    ? 'Dịch vụ OCR tạm chưa sẵn sàng'
    : gate.ocrStatus === 'NOT_RUN'
    ? 'Chưa kiểm tra nội dung ảnh'
    : gate.templateMatchStatus === 'MATCHED_BLANK'
    ? 'Đúng mẫu nhưng tờ khai còn trống'
    : gate.templateMatchStatus === 'WRONG_DOCUMENT'
    ? 'Ảnh thuộc loại giấy tờ khác'
    : gate.qualityStatus !== 'PASS' && gate.qualityStatus !== 'NOT_EVALUATED'
    ? 'Ảnh chưa đủ độ rõ để đọc chữ'
    : 'Chưa xác định loại giấy tờ';

  const headerColor = isPass
    ? COLORS.successText
    : isNeutralPending
    ? COLORS.warningText
    : COLORS.errorText;

  return (
    <View style={[styles.card, cardStyle]}>
      <View style={styles.headerRow}>
        {checking ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : isPass ? (
          <CheckCircle2 size={18} color={COLORS.successAccent} />
        ) : gate.ocrStatus === 'NETWORK_ERROR' ? (
          <WifiOff size={18} color={COLORS.warningAccent} />
        ) : isNeutralPending ? (
          <HelpCircle size={18} color={COLORS.warningAccent} />
        ) : (
          <AlertTriangle size={18} color={COLORS.errorAccent} />
        )}
        <Text style={[styles.headerTitle, { color: headerColor }]}>{headerTitle}</Text>
      </View>

      {fileName ? (
        <Text style={styles.fileName} numberOfLines={1}>
          Tệp: {fileName}
        </Text>
      ) : null}

      <View style={styles.criteriaList}>
        {/* 1. Độ đọc được */}
        <View style={styles.criteriaRow}>
          {gate.qualityStatus === 'PASS' ? (
            <CheckCircle2 size={15} color={COLORS.successAccent} />
          ) : gate.qualityStatus === 'NOT_EVALUATED' ? (
            <HelpCircle size={15} color={COLORS.warningAccent} />
          ) : (
            <XCircle size={15} color={COLORS.errorAccent} />
          )}
          <Text
            style={[
              styles.criteriaText,
              gate.qualityStatus === 'PASS'
                ? styles.textOk
                : gate.qualityStatus === 'NOT_EVALUATED'
                ? styles.textWarn
                : styles.textErr,
            ]}
          >
            Độ đọc được: {gate.qualityMessage}
          </Text>
        </View>

        {/* 2. Nhận diện loại giấy tờ */}
        <View style={styles.criteriaRow}>
          {gate.templateMatchStatus === 'MATCHED_FILLED' ? (
            <CheckCircle2 size={15} color={COLORS.successAccent} />
          ) : gate.templateMatchStatus === 'MATCHED_BLANK' ||
            gate.templateMatchStatus === 'NOT_CHECKED' ? (
            <HelpCircle size={15} color={COLORS.warningAccent} />
          ) : (
            <FileWarning size={15} color={COLORS.errorAccent} />
          )}
          <Text
            style={[
              styles.criteriaText,
              gate.templateMatchStatus === 'MATCHED_FILLED'
                ? styles.textOk
                : gate.templateMatchStatus === 'MATCHED_BLANK' ||
                  gate.templateMatchStatus === 'NOT_CHECKED'
                ? styles.textWarn
                : styles.textErr,
            ]}
          >
            Loại giấy tờ: {gate.templateMessage}
          </Text>
        </View>

        {/* 3. Số trường thực đọc */}
        <View style={styles.criteriaRow}>
          {gate.extractedFieldsCount !== null && gate.extractedFieldsCount > 0 ? (
            <CheckCircle2 size={15} color={COLORS.successAccent} />
          ) : (
            <HelpCircle size={15} color={COLORS.textMuted} />
          )}
          <Text style={[styles.criteriaText, styles.textMuted]}>
            Trích xuất: {gate.fieldsMessage}
          </Text>
        </View>
      </View>

      {gate.reasonMessage ? (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonText}>{gate.reasonMessage}</Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        {gate.suggestedTargetSlot &&
        gate.templateMatchStatus === 'WRONG_DOCUMENT' &&
        onReassignSlot ? (
          <Pressable
            accessibilityRole="button"
            disabled={checking}
            onPress={() => onReassignSlot(gate.suggestedTargetSlot!)}
            style={({ pressed }) => [styles.reassignBtn, pressed && styles.pressed]}
          >
            <ArrowRightLeft size={14} color={COLORS.onPrimary} />
            <Text style={styles.reassignBtnText} numberOfLines={1}>
              Chuyển sang {getDocumentTypeDisplayName(gate.suggestedTargetSlot)}
            </Text>
          </Pressable>
        ) : null}

        {onRetryCheck &&
        (gate.ocrStatus === 'NOT_RUN' ||
          gate.ocrStatus === 'NETWORK_ERROR' ||
          gate.ocrStatus === 'UNAVAILABLE') ? (
          <Pressable
            accessibilityRole="button"
            disabled={checking}
            onPress={onRetryCheck}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
          >
            <RefreshCw size={14} color={COLORS.onPrimary} />
            <Text style={styles.retryBtnText}>
              {gate.ocrStatus === 'NOT_RUN' ? 'Kiểm tra ảnh ngay' : 'Thử kiểm tra lại'}
            </Text>
          </Pressable>
        ) : null}

        {onRetake ? (
          <Pressable
            accessibilityRole="button"
            disabled={checking}
            onPress={onRetake}
            style={({ pressed }) => [
              isPass ? styles.retakeOutlineBtn : styles.retakeBtn,
              pressed && styles.pressed,
            ]}
          >
            <Camera size={14} color={isPass ? COLORS.textPrimary : COLORS.onPrimary} />
            <Text style={isPass ? styles.retakeOutlineText : styles.retakeText}>
              Chụp / Chọn lại
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardPass: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
  },
  cardWarn: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
  },
  cardBlock: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    flex: 1,
  },
  fileName: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  criteriaList: {
    gap: 5,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
  },
  criteriaText: {
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  textOk: { color: COLORS.successText },
  textWarn: { color: COLORS.warningText },
  textErr: { color: COLORS.errorText },
  textMuted: { color: COLORS.textSecondary },
  reasonBox: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  reasonText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: 2,
  },
  reassignBtn: {
    flex: 1,
    minWidth: '100%',
    minHeight: MIN_TOUCH_TARGET - 4,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
  },
  reassignBtnText: {
    color: COLORS.onPrimary,
    fontSize: 12.5,
    fontWeight: '800',
  },
  retryBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET - 6,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
  },
  retryBtnText: {
    color: COLORS.onPrimary,
    fontSize: 12.5,
    fontWeight: '800',
  },
  retakeBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET - 6,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorAccent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
  },
  retakeText: {
    color: COLORS.onPrimary,
    fontSize: 12.5,
    fontWeight: '800',
  },
  retakeOutlineBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET - 6,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
  },
  retakeOutlineText: {
    color: COLORS.textPrimary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  pressed: { opacity: 0.85 },
});
