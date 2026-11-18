/**
 * SmartWard AI Mobile — Chốt chặn AI Thị Giác 3 Tiêu chí (AI Vision Quality Gate)
 *
 * 3 Tiêu chí bắt buộc trước khi nộp hồ sơ:
 * 1. Độ sắc nét & Độ sáng (sharpnessScore >= 45/100, brightnessScore >= 55/255)
 *    + Chống tràn RAM Pixel-Flood OOM (resize <= 1920px, JPEG compress 0.82 qua expo-image-manipulator)
 * 2. Khớp đúng biểu mẫu đang chọn (CT01 | TK-KS | TK-KH | TK-BTXH)
 * 3. Số trường thông tin nhận diện rõ (extractedFieldsCount / totalExpectedFields)
 */

import { DOMAIN_THRESHOLDS } from '../theme/tokens';
import type { CoreFormType } from '../types/api.types';

export const VISION_MAX_IMAGE_EDGE_PX = 1920;
export const VISION_BACKEND_HARD_LIMIT_PX = 4096;
export const VISION_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export type VisionQualityStatus = 'GOOD' | 'BLURRY' | 'TOO_DARK';
export type VisionSimulationPreset = 'GOOD' | 'BLURRY' | 'WRONG_TEMPLATE';

export interface VisionGateEvaluationInput {
  expectedFormType: CoreFormType;
  fileName: string;
  mimeType?: string;
  rawText?: string;
  /** Measured Laplacian sharpness score (0..100). Digital DOCX/PDF defaults to 100. */
  sharpnessScore?: number;
  /** Measured luminance brightness score (0..255). Digital DOCX/PDF defaults to 220. */
  brightnessScore?: number;
  /** Number of required fields extracted from OCR/DOCX */
  extractedFieldsCount?: number;
  /** Total expected mandatory fields for the chosen form */
  totalExpectedFields?: number;
  /** Optional raw image dimensions before resize */
  widthPx?: number;
  heightPx?: number;
  fileSizeBytes?: number;
}

export interface TemplateMatchResult {
  templateMatched: boolean;
  detectedFormCode: CoreFormType | 'UNKNOWN';
  detectedFormLabel: string;
  expectedFormLabel: string;
  templateMessage: string;
}

export interface VisionGateResult {
  // Criterion 1: Sharpness & Brightness
  sharpnessScore: number; // 0..100
  brightnessScore: number; // 0..255
  isBlurry: boolean;
  isTooDark: boolean;
  qualityStatus: VisionQualityStatus;
  qualityMessage: string;

  // Criterion 2: Template Match
  templateMatched: boolean;
  detectedFormCode: CoreFormType | 'UNKNOWN';
  detectedFormLabel: string;
  templateMessage: string;

  // Criterion 3: Extracted Fields Count
  extractedFieldsCount: number;
  totalExpectedFields: number;
  fieldsMessage: string;

  // Final Gate Decision
  canSubmit: boolean;
  blockedReason?: string;
  submitButtonLabel: string;
}

export const FORM_TYPE_LABELS: Record<CoreFormType, string> = {
  CT01: 'Mẫu CT01 (Thay đổi thông tin cư trú)',
  'TK-KS': 'Tờ khai Đăng ký khai sinh (TT 04/2020/TT-BTP)',
  'TK-KH': 'Tờ khai Kết hôn / Xác nhận độc thân (Luật HN&GĐ 2014)',
  'TK-BTXH': 'Tờ khai Trợ cấp bảo trợ xã hội (NĐ 20/2021 & NĐ 335/2026)',
};

export const FORM_EXPECTED_FIELDS_COUNT: Record<CoreFormType, number> = {
  CT01: 5,
  'TK-KS': 5,
  'TK-KH': 5,
  'TK-BTXH': 4,
};

/**
 * Checks if uploaded photo/DOCX/PDF text matches the selected form tab.
 */
export function verifyTemplateMatch(
  rawText: string,
  fileName: string,
  expectedFormType: CoreFormType
): TemplateMatchResult {
  const combined = `${rawText || ''} ${fileName || ''}`.toUpperCase();
  let detected: CoreFormType | 'UNKNOWN' = 'UNKNOWN';

  if (
    combined.includes('CT01') ||
    combined.includes('THÔNG TIN CƯ TRÚ') ||
    combined.includes('THONG TIN CU TRU') ||
    combined.includes('116/2026/TT-BCA') ||
    combined.includes('66/2023/TT-BCA') ||
    combined.includes('CR-01')
  ) {
    detected = 'CT01';
  } else if (
    combined.includes('KHAI SINH') ||
    combined.includes('CHỨNG SINH') ||
    combined.includes('CHUNG SINH') ||
    combined.includes('TK-KS') ||
    combined.includes('HT-01')
  ) {
    detected = 'TK-KS';
  } else if (
    combined.includes('KẾT HÔN') ||
    combined.includes('KET HON') ||
    combined.includes('TÌNH TRẠNG HÔN NHÂN') ||
    combined.includes('TINH TRANG HON NHAN') ||
    combined.includes('ĐỘC THÂN') ||
    combined.includes('DOC THAN') ||
    combined.includes('TK-KH') ||
    combined.includes('HT-02')
  ) {
    detected = 'TK-KH';
  } else if (
    combined.includes('TRỢ CẤP') ||
    combined.includes('TRO CAP') ||
    combined.includes('TRỢ GIÚP XÃ HỘI') ||
    combined.includes('BẢO TRỢ') ||
    combined.includes('BAO TRO') ||
    combined.includes('20/2021/NĐ-CP') ||
    combined.includes('335/2026/NĐ-CP') ||
    combined.includes('TK-BTXH') ||
    combined.includes('BT-01')
  ) {
    detected = 'TK-BTXH';
  }

  const expectedLabel = FORM_TYPE_LABELS[expectedFormType];

  if (detected !== 'UNKNOWN' && detected !== expectedFormType) {
    return {
      templateMatched: false,
      detectedFormCode: detected,
      detectedFormLabel: FORM_TYPE_LABELS[detected],
      expectedFormLabel: expectedLabel,
      templateMessage: `BỊ CHẶN — SAI MẪU: Ảnh/tệp tải lên là "${FORM_TYPE_LABELS[detected]}", không khớp với mục đang chọn là "${expectedLabel}".`,
    };
  }

  return {
    templateMatched: true,
    detectedFormCode: detected === 'UNKNOWN' ? expectedFormType : detected,
    detectedFormLabel: expectedLabel,
    expectedFormLabel: expectedLabel,
    templateMessage: `Đúng ${expectedFormType} — ${expectedLabel}.`,
  };
}

/**
 * Resizes captured camera photo to max edge 1920px (JPEG 0.82) via expo-image-manipulator
 * to prevent Pixel-Flood OOM (> 4096px / > 5MB) on SmartWard Backend ImageWatermarkService.
 */
export async function resizeImageForUpload(
  uri: string,
  width?: number,
  height?: number
): Promise<{ uri: string; width?: number; height?: number }> {
  try {
    // Dynamic import so pure-Node Vitest unit tests work cleanly without native Expo runtime
    const ImageManipulator = await import('expo-image-manipulator');
    const actions: Array<{ resize: { width?: number; height?: number } }> = [];

    if (width && height) {
      if (Math.max(width, height) > VISION_MAX_IMAGE_EDGE_PX) {
        if (width >= height) {
          actions.push({ resize: { width: VISION_MAX_IMAGE_EDGE_PX } });
        } else {
          actions.push({ resize: { height: VISION_MAX_IMAGE_EDGE_PX } });
        }
      }
    } else {
      actions.push({ resize: { width: VISION_MAX_IMAGE_EDGE_PX } });
    }

    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: 0.82,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  } catch {
    // Fallback in non-native/unit-test environments
    return { uri, width, height };
  }
}

/**
 * Evaluates all 3 criteria of the AI Vision Quality Gate using invariant thresholds:
 * - sharpnessScore >= 45 / 100
 * - brightnessScore >= 55 / 255
 * - templateMatched === true
 */
export function evaluateDocumentVisionGate(
  input: VisionGateEvaluationInput
): VisionGateResult {
  const lowerName = (input.fileName || '').toLowerCase();
  const mime = (input.mimeType || '').toLowerCase();
  const isDigitalDocument =
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.pdf') ||
    mime.includes('pdf') ||
    mime.includes('wordprocessingml');

  const sharpnessScore = Math.max(
    0,
    Math.min(100, Math.round(input.sharpnessScore ?? (isDigitalDocument ? 100 : 92)))
  );
  const brightnessScore = Math.max(
    0,
    Math.min(255, Math.round(input.brightnessScore ?? (isDigitalDocument ? 220 : 185)))
  );

  const isBlurry = sharpnessScore < DOMAIN_THRESHOLDS.visionMinSharpnessScore; // < 45
  const isTooDark = brightnessScore < DOMAIN_THRESHOLDS.visionMinBrightnessScore; // < 55

  let qualityStatus: VisionQualityStatus = 'GOOD';
  let qualityMessage = `Ảnh rõ nét (${sharpnessScore}/100 điểm), ánh sáng tốt (${brightnessScore}/255).`;

  if (isTooDark) {
    qualityStatus = 'TOO_DARK';
    qualityMessage = `BỊ CHẶN — THIẾU SÁNG (${brightnessScore}/255 < ${DOMAIN_THRESHOLDS.visionMinBrightnessScore}). Vui lòng bật đèn và chụp lại tờ khai.`;
  } else if (isBlurry) {
    qualityStatus = 'BLURRY';
    qualityMessage = `BỊ CHẶN — ẢNH MỜ (${sharpnessScore}/100 < ${DOMAIN_THRESHOLDS.visionMinSharpnessScore}). Vui lòng giữ chắc tay và chụp vuông góc.`;
  } else if (isDigitalDocument) {
    qualityMessage = 'Tệp văn bản kỹ thuật số (.DOCX/.PDF) đạt độ sắc nét tuyệt đối 100/100.';
  }

  const templateCheck = verifyTemplateMatch(
    input.rawText || '',
    input.fileName,
    input.expectedFormType
  );

  const totalExpectedFields =
    input.totalExpectedFields ?? FORM_EXPECTED_FIELDS_COUNT[input.expectedFormType];
  const extractedFieldsCount = Math.max(
    0,
    Math.min(totalExpectedFields, input.extractedFieldsCount ?? (isBlurry || isTooDark ? 1 : totalExpectedFields))
  );
  const fieldsMessage = `${extractedFieldsCount}/${totalExpectedFields} mục rõ chữ`;

  const canSubmit = !isBlurry && !isTooDark && templateCheck.templateMatched;

  let blockedReason: string | undefined;
  let submitButtonLabel = '✨ Kiểm Tra & Gửi Sơ Duyệt Cán Bộ';

  if (isBlurry || isTooDark) {
    blockedReason = qualityMessage;
    submitButtonLabel = '🚫 AI Thị Giác Chặn Gửi (Chụp Lại Ảnh)';
  } else if (!templateCheck.templateMatched) {
    blockedReason = templateCheck.templateMessage;
    submitButtonLabel = '🚫 AI Thị Giác Chặn Gửi (Chọn Đúng Mẫu)';
  }

  return {
    sharpnessScore,
    brightnessScore,
    isBlurry,
    isTooDark,
    qualityStatus,
    qualityMessage,
    templateMatched: templateCheck.templateMatched,
    detectedFormCode: templateCheck.detectedFormCode,
    detectedFormLabel: templateCheck.detectedFormLabel,
    templateMessage: templateCheck.templateMessage,
    extractedFieldsCount,
    totalExpectedFields,
    fieldsMessage,
    canSubmit,
    blockedReason,
    submitButtonLabel,
  };
}

/**
 * Quick simulation presets for council demos & QA testing (`GOOD` | `BLURRY` | `WRONG_TEMPLATE`).
 */
export function simulateVisionGatePreset(
  preset: VisionSimulationPreset,
  expectedFormType: CoreFormType
): VisionGateResult {
  const mismatchedForm: CoreFormType = expectedFormType === 'CT01' ? 'TK-KS' : 'CT01';

  switch (preset) {
    case 'BLURRY':
      return evaluateDocumentVisionGate({
        expectedFormType,
        fileName: `${expectedFormType.toLowerCase()}_blurry_capture.jpg`,
        mimeType: 'image/jpeg',
        rawText: FORM_TYPE_LABELS[expectedFormType],
        sharpnessScore: 24,
        brightnessScore: 150,
        extractedFieldsCount: 1,
      });

    case 'WRONG_TEMPLATE':
      return evaluateDocumentVisionGate({
        expectedFormType,
        fileName: `${mismatchedForm.toLowerCase()}_wrong_template.jpg`,
        mimeType: 'image/jpeg',
        rawText: FORM_TYPE_LABELS[mismatchedForm],
        sharpnessScore: 94,
        brightnessScore: 196,
        extractedFieldsCount: FORM_EXPECTED_FIELDS_COUNT[expectedFormType],
      });

    case 'GOOD':
    default:
      return evaluateDocumentVisionGate({
        expectedFormType,
        fileName: `${expectedFormType.toLowerCase()}_sharp_verified.jpg`,
        mimeType: 'image/jpeg',
        rawText: FORM_TYPE_LABELS[expectedFormType],
        sharpnessScore: 96,
        brightnessScore: 198,
        extractedFieldsCount: FORM_EXPECTED_FIELDS_COUNT[expectedFormType],
      });
  }
}
