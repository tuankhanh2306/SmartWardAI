/**
 * SmartWard AI Mobile — Thanh Tải Biểu Mẫu Trực Tiếp (.DOCX & .PDF)
 * Gọn nhẹ 1 hàng, 0 chữ mô tả rườm rà, TUYỆT ĐỐI 0 nút In (No Print Dialogs).
 */

import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Download, FileText } from 'lucide-react-native';
import {
  exportTemplateDocument,
  getTemplateFileDescriptor,
} from '../core/templateExporter';
import { COLORS, RADIUS, SPACING } from '../theme/tokens';
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
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tải mẫu DOCX ${descriptor.docxFileName}`}
          disabled={busyFormat !== null}
          onPress={() => {
            void handleDownload('DOCX');
          }}
          style={({ pressed }) => [styles.btnDocx, pressed && styles.btnPressed]}
        >
          {busyFormat === 'DOCX' ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <FileText size={15} color={COLORS.primary} />
          )}
          <Text style={styles.btnDocxText} numberOfLines={1}>
            Tải .DOCX
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tải mẫu PDF ${descriptor.pdfFileName}`}
          disabled={busyFormat !== null}
          onPress={() => {
            void handleDownload('PDF');
          }}
          style={({ pressed }) => [styles.btnPdf, pressed && styles.btnPressed]}
        >
          {busyFormat === 'PDF' ? (
            <ActivityIndicator size="small" color={COLORS.onPrimary} />
          ) : (
            <Download size={15} color={COLORS.onPrimary} />
          )}
          <Text style={styles.btnPdfText} numberOfLines={1}>
            Tải .PDF
          </Text>
        </Pressable>
      </View>

      {statusMessage ? (
        <Text style={styles.statusText} numberOfLines={2}>
          ✓ {statusMessage}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  btnDocx: {
    flex: 1,
    minHeight: 42,
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
    minHeight: 42,
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
    fontSize: 13,
    fontWeight: '700',
  },
  btnPdfText: {
    color: COLORS.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  statusText: {
    color: COLORS.successText,
    fontSize: 12,
    fontWeight: '600',
  },
});
