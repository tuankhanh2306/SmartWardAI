/**
 * SmartWard AI Mobile — Thanh Tải Biểu Mẫu Trực Tiếp (.DOCX & .PDF)
 * Kỷ luật bắt buộc:
 * - Kích thước vùng chạm tối thiểu >= 48dp
 * - CHỈ cung cấp 2 nút tải trực tiếp: "📄 Tải Mẫu .DOCX" & "📥 Tải Mẫu .PDF"
 * - TUYỆT ĐỐI KHÔNG có nút In (No Print Dialogs)
 */

import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Download, FileText } from 'lucide-react-native';
import { useAccessibility } from '../context/AccessibilityContext';
import {
  exportTemplateDocument,
  getTemplateFileDescriptor,
} from '../core/templateExporter';
import { COLORS, MIN_TOUCH_TARGET, RADIUS, SPACING } from '../theme/tokens';
import type { CoreFormType } from '../types/api.types';

export interface TemplateDownloadBarProps {
  procedureCode: string;
  procedureName: string;
  wardName: string;
  formType?: CoreFormType | null;
  legalBasis?: string;
}

export const TemplateDownloadBar: React.FC<TemplateDownloadBarProps> = ({
  procedureCode,
  procedureName,
  wardName,
  formType,
  legalBasis,
}) => {
  const { typography } = useAccessibility();
  const [busyFormat, setBusyFormat] = useState<'DOCX' | 'PDF' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const descriptor = getTemplateFileDescriptor(
    procedureCode,
    procedureName,
    formType,
    legalBasis
  );

  const handleDownload = async (format: 'DOCX' | 'PDF') => {
    setBusyFormat(format);
    setStatusMessage(null);
    const res = await exportTemplateDocument(format, descriptor, wardName);
    setBusyFormat(null);
    setStatusMessage(res.message);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.caption, typography.captionSm]}>
        Tải trực tiếp biểu mẫu chuẩn Nghị định 30/2020/NĐ-CP về máy (Miễn phí 100%):
      </Text>

      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tải mẫu DOCX ${descriptor.docxFileName}`}
          disabled={busyFormat !== null}
          onPress={() => {
            void handleDownload('DOCX');
          }}
          style={({ pressed }) => [
            styles.btnDocx,
            pressed && styles.btnPressed,
          ]}
        >
          {busyFormat === 'DOCX' ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <FileText size={16} color={COLORS.primary} />
          )}
          <Text style={[styles.btnDocxText, typography.bodyBold]}>
            📄 Tải Mẫu .DOCX
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tải mẫu PDF ${descriptor.pdfFileName}`}
          disabled={busyFormat !== null}
          onPress={() => {
            void handleDownload('PDF');
          }}
          style={({ pressed }) => [
            styles.btnPdf,
            pressed && styles.btnPressed,
          ]}
        >
          {busyFormat === 'PDF' ? (
            <ActivityIndicator size="small" color={COLORS.onPrimary} />
          ) : (
            <Download size={16} color={COLORS.onPrimary} />
          )}
          <Text style={[styles.btnPdfText, typography.bodyBold]}>
            📥 Tải Mẫu .PDF
          </Text>
        </Pressable>
      </View>

      {statusMessage ? (
        <Text style={[styles.statusText, typography.captionSm]}>
          ✓ {statusMessage}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  caption: {
    color: COLORS.textMuted,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  btnDocx: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnPdf: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDocxText: {
    color: COLORS.primary,
  },
  btnPdfText: {
    color: COLORS.onPrimary,
  },
  statusText: {
    color: COLORS.successText,
    fontWeight: '600',
  },
});
