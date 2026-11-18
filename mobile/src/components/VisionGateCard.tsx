/**
 * SmartWard AI Mobile — Thẻ Chẩn Đoán Chốt Chặn AI Thị Giác 3 Tiêu Chí (MOB-3.6)
 * Gọn thoáng cho mọi điện thoại:
 *   1. Độ nét (XX/100 — đạt >= 45, ánh sáng >= 55)
 *   2. Khớp mẫu (Đúng mẫu / Bị chặn sai mẫu)
 *   3. Chữ rõ (X/Y mục)
 * + 3 nút thử nhanh cho demo hội đồng (Chuẩn / Mờ / Sai mẫu).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Eye } from 'lucide-react-native';
import type {
  VisionGateResult,
  VisionSimulationPreset,
} from '../core/visionQualityGate';
import { COLORS, RADIUS, SPACING } from '../theme/tokens';

export interface VisionGateCardProps {
  result: VisionGateResult | null;
  fileName?: string | null;
  onSimulate: (preset: VisionSimulationPreset) => void;
}

export const VisionGateCard: React.FC<VisionGateCardProps> = ({
  result,
  fileName,
  onSimulate,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.titleRow}>
          <Eye size={15} color={COLORS.primary} />
          <Text style={styles.title}>Kiểm định ảnh tờ khai (AI)</Text>
        </View>
        {result ? (
          <View
            style={[
              styles.statusPill,
              result.canSubmit ? styles.pillOk : styles.pillBad,
            ]}
          >
            {result.canSubmit ? (
              <CheckCircle2 size={12} color={COLORS.successText} />
            ) : (
              <AlertTriangle size={12} color={COLORS.errorAccent} />
            )}
            <Text
              style={[
                styles.statusPillText,
                result.canSubmit ? styles.textOk : styles.textBad,
              ]}
            >
              {result.canSubmit ? 'Đạt chuẩn' : 'Bị chặn'}
            </Text>
          </View>
        ) : null}
      </View>

      {fileName ? (
        <Text style={styles.fileName} numberOfLines={1}>
          📎 {fileName}
        </Text>
      ) : null}

      {result ? (
        <>
          <View style={styles.grid}>
            {/* Tiêu chí 1: Độ nét */}
            <View
              style={[
                styles.metricBox,
                result.isBlurry || result.isTooDark ? styles.boxBad : styles.boxOk,
              ]}
            >
              <Text style={styles.metricLabel}>1. Độ nét</Text>
              <Text
                style={[
                  styles.metricValue,
                  result.isBlurry || result.isTooDark ? styles.textBad : styles.textOk,
                ]}
              >
                {result.sharpnessScore}/100
              </Text>
            </View>

            {/* Tiêu chí 2: Khớp mẫu */}
            <View
              style={[
                styles.metricBox,
                result.templateMatched ? styles.boxOk : styles.boxBad,
              ]}
            >
              <Text style={styles.metricLabel}>2. Khớp mẫu</Text>
              <Text
                style={[
                  styles.metricValue,
                  result.templateMatched ? styles.textOk : styles.textBad,
                ]}
                numberOfLines={1}
              >
                {result.templateMatched ? 'Đúng mẫu' : 'Sai mẫu'}
              </Text>
            </View>

            {/* Tiêu chí 3: Chữ điền */}
            <View style={[styles.metricBox, styles.boxNeutral]}>
              <Text style={styles.metricLabel}>3. Chữ rõ</Text>
              <Text style={styles.metricValueNeutral} numberOfLines={1}>
                {result.extractedFieldsCount}/{result.totalExpectedFields} mục
              </Text>
            </View>
          </View>

          {!result.canSubmit && result.blockedReason ? (
            <View style={styles.blockedBanner}>
              <Text style={styles.blockedText}>{result.blockedReason}</Text>
            </View>
          ) : null}
        </>
      ) : (
        <Text style={styles.placeholderText}>
          Chụp ảnh tờ khai hoặc chọn tệp .DOCX/.PDF để AI kiểm tra độ nét và đúng mẫu.
        </Text>
      )}

      {/* 3 Compact Demo Presets */}
      <View style={styles.presetRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onSimulate('GOOD')}
          style={({ pressed }) => [styles.presetChip, pressed && styles.pressed]}
        >
          <Text style={styles.presetOk}>✓ Ảnh chuẩn</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onSimulate('BLURRY')}
          style={({ pressed }) => [styles.presetChip, pressed && styles.pressed]}
        >
          <Text style={styles.presetBad}>✕ Thử ảnh mờ</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onSimulate('WRONG_TEMPLATE')}
          style={({ pressed }) => [styles.presetChip, pressed && styles.pressed]}
        >
          <Text style={styles.presetWarn}>⚠ Thử sai mẫu</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  pillOk: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
  },
  pillBad: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorBorder,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  fileName: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 6,
  },
  metricBox: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
  },
  boxOk: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
  },
  boxBad: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorBorder,
  },
  boxNeutral: {
    backgroundColor: COLORS.canvas,
    borderColor: COLORS.borderSubtle,
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  metricValueNeutral: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  textOk: {
    color: COLORS.successText,
  },
  textBad: {
    color: COLORS.errorAccent,
  },
  blockedBanner: {
    backgroundColor: COLORS.errorBg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    padding: SPACING.sm,
  },
  blockedText: {
    color: COLORS.errorText,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontSize: 12.5,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetChip: {
    flex: 1,
    minHeight: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  presetOk: { color: COLORS.successText, fontSize: 11.5, fontWeight: '700' },
  presetBad: { color: COLORS.errorAccent, fontSize: 11.5, fontWeight: '700' },
  presetWarn: { color: COLORS.warningText, fontSize: 11.5, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
