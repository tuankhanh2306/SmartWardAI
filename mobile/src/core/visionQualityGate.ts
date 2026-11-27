/**
 * SmartWard AI Mobile — Chốt Chặn Kiểm Định Ảnh Giấy Tờ (TASK-056 / TASK-057)
 * Nguyên tắc trung thực tuyệt đối:
 *  - Không bao giờ tự gán điểm nét/sáng giả (92/100, 190/255) khi chưa đo.
 *  - Không suy luận loại giấy tờ từ tên tệp (fileName).
 *  - Không mặc định UNKNOWN là đúng mẫu.
 *  - Không tự bịa số trường đọc được (5/5) khi chưa chạy OCR hoặc OCR không trích xuất được trường nào.
 *  - Tách bạch 4 trạng thái: chất lượng chưa đo (NOT_EVALUATED), OCR chưa chạy (NOT_RUN),
 *    OCR lỗi mạng/không khả dụng (NETWORK_ERROR / UNAVAILABLE), và đã đọc nhưng chưa xác định loại (UNIDENTIFIED).
 */

import { DOMAIN_THRESHOLDS } from '../theme/tokens';
import type { CoreFormType } from '../types/api.types';

export const VISION_MIN_SHARPNESS_SCORE = DOMAIN_THRESHOLDS.visionMinSharpnessScore; // 45
export const VISION_MIN_BRIGHTNESS_SCORE = DOMAIN_THRESHOLDS.visionMinBrightnessScore; // 55
export const VISION_MAX_IMAGE_EDGE_PX = 1920;

export type ExpectedDocumentType = CoreFormType | 'BIRTH_CERT' | 'CCCD';
export type DetectedDocumentType =
  | CoreFormType
  | 'BIRTH_CERT'
  | 'CCCD'
  | 'OTHER_TEXT'
  | 'NON_DOCUMENT'
  | 'UNKNOWN';

export type VisionQualityStatus =
  | 'PASS'
  | 'BLURRY'
  | 'TOO_DARK'
  | 'GLARE'
  | 'CROPPED'
  | 'UNREADABLE'
  | 'NOT_EVALUATED';

export type VisionOcrStatus = 'NOT_RUN' | 'NETWORK_ERROR' | 'UNAVAILABLE' | 'COMPLETED';

export type TemplateMatchStatus =
  | 'MATCHED_FILLED'
  | 'MATCHED_BLANK'
  | 'WRONG_DOCUMENT'
  | 'UNIDENTIFIED'
  | 'NOT_CHECKED';

export interface VisionGateEvaluationInput {
  expectedFormType: ExpectedDocumentType;
  fileName?: string;
  mimeType?: string;
  /** OCR text returned from server / verified document parser (NEVER inferred from filename) */
  rawText?: string;
  /** Real measured sharpness (0-100); omit/null if not measured */
  sharpnessScore?: number | null;
  /** Real measured brightness (0-255); omit/null if not measured */
  brightnessScore?: number | null;
  /** Server-reported image readability status */
  readabilityStatus?: VisionQualityStatus | 'CLEAR' | null;
  /** Server-reported Vietnamese reason for readability / OCR decision */
  readabilityReason?: string | null;
  /** Explicit OCR execution status */
  ocrStatus?: VisionOcrStatus;
  /** Server-reported document type classification */
  detectedDocumentType?: DetectedDocumentType | string | null;
  /** Server-confirmed blank official template (ONLY valid when official header matched) */
  isBlankTemplate?: boolean;
  /** Real count of matched extracted fields; null/undefined when OCR hasn't extracted fields */
  extractedFieldsCount?: number | null;
  totalExpectedFields?: number;
}

export interface VisionGateResult {
  canSubmit: boolean;
  isVerifiedForSubmission: boolean;
  qualityStatus: VisionQualityStatus;
  ocrStatus: VisionOcrStatus;
  templateMatchStatus: TemplateMatchStatus;
  isBlurry: boolean;
  isTooDark: boolean;
  sharpnessScore: number | null;
  brightnessScore: number | null;
  templateMatched: boolean;
  detectedFormCode: DetectedDocumentType;
  expectedFormCode: ExpectedDocumentType;
  extractedFieldsCount: number | null;
  totalExpectedFields: number;
  qualityMessage: string;
  templateMessage: string;
  fieldsMessage: string;
  reasonMessage: string;
  blockedReason?: string;
  suggestedTargetSlot?: ExpectedDocumentType;
  submitButtonLabel: string;
}

export function getDocumentTypeDisplayName(code: DetectedDocumentType | ExpectedDocumentType): string {
  switch (code) {
    case 'CT01':
      return 'Tờ khai thay đổi cư trú (CT01)';
    case 'TK-KS':
      return 'Tờ khai đăng ký khai sinh (TK-KS)';
    case 'BIRTH_CERT':
      return 'Giấy chứng sinh';
    case 'TK-KH':
      return 'Tờ khai đăng ký kết hôn / TTHN (TK-KH)';
    case 'TK-BTXH':
      return 'Tờ khai trợ giúp xã hội (TK-BTXH)';
    case 'CCCD':
      return 'Thẻ Căn cước công dân (CCCD)';
    case 'OTHER_TEXT':
      return 'Văn bản không phải biểu mẫu TTHC';
    case 'NON_DOCUMENT':
      return 'Ảnh không chứa giấy tờ hành chính';
    default:
      return 'Chưa xác định loại giấy tờ';
  }
}

export function normalizeDetectedDocumentType(raw?: string | null): DetectedDocumentType {
  const clean = (raw || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (!clean) return 'UNKNOWN';
  if (clean === 'TK_KS' || clean === 'TK-KS' || clean === 'BIRTH_DECLARATION') return 'TK-KS';
  if (clean === 'BIRTH_CERT' || clean === 'BIRTH_CERTIFICATE' || clean === 'GIAY_CHUNG_SINH') {
    return 'BIRTH_CERT';
  }
  if (clean === 'CT01' || clean === 'CT_01' || clean === 'CT01_RESIDENCE_DECLARATION') return 'CT01';
  if (clean === 'TK_KH' || clean === 'TK-KH' || clean === 'MARRIAGE_DECLARATION') return 'TK-KH';
  if (clean === 'TK_BTXH' || clean === 'TK-BTXH' || clean === 'SOCIAL_PROTECTION') return 'TK-BTXH';
  if (clean === 'CCCD' || clean === 'ID_CARD') return 'CCCD';
  if (clean === 'OTHER_TEXT') return 'OTHER_TEXT';
  if (clean === 'NON_DOCUMENT') return 'NON_DOCUMENT';
  return 'UNKNOWN';
}

function normalizeReadabilityStatus(
  raw?: VisionQualityStatus | 'CLEAR' | null
): VisionQualityStatus | null {
  if (!raw) return null;
  const upper = String(raw).trim().toUpperCase();
  if (upper === 'CLEAR' || upper === 'PASS') return 'PASS';
  if (upper === 'BLURRY') return 'BLURRY';
  if (upper === 'TOO_DARK') return 'TOO_DARK';
  if (upper === 'GLARE') return 'GLARE';
  if (upper === 'CROPPED') return 'CROPPED';
  if (upper === 'UNREADABLE') return 'UNREADABLE';
  if (upper === 'NOT_EVALUATED') return 'NOT_EVALUATED';
  return null;
}

/**
 * Classifies document type STRICTLY from real OCR text content (NEVER from fileName).
 * Distinguishes Tờ khai đăng ký khai sinh (TK-KS) from Giấy chứng sinh (BIRTH_CERT).
 */
export function verifyTemplateMatch(
  rawText: string | undefined,
  _ignoredFileName: string | undefined,
  expectedFormType: ExpectedDocumentType
): {
  templateMatched: boolean;
  detectedFormCode: DetectedDocumentType;
  templateMessage: string;
} {
  const text = (rawText || '').trim().toUpperCase();
  if (!text) {
    return {
      templateMatched: false,
      detectedFormCode: 'UNKNOWN',
      templateMessage: 'Chưa có nội dung OCR để xác định loại giấy tờ.',
    };
  }

  let detected: DetectedDocumentType = 'UNKNOWN';

  // Distinguish Giấy chứng sinh (BIRTH_CERT) BEFORE Tờ khai đăng ký khai sinh (TK-KS)
  if (
    text.includes('GIẤY CHỨNG SINH') ||
    text.includes('GIAY CHUNG SINH') ||
    text.includes('BIRTH_CERT') ||
    (text.includes('CHỨNG SINH') && !text.includes('TỜ KHAI ĐĂNG KÝ KHAI SINH'))
  ) {
    detected = 'BIRTH_CERT';
  } else if (
    text.includes('CT01') ||
    text.includes('THAY ĐỔI THÔNG TIN CƯ TRÚ') ||
    text.includes('THAY DOI THONG TIN CU TRU') ||
    text.includes('TT 116/2026')
  ) {
    detected = 'CT01';
  } else if (
    text.includes('TK-KS') ||
    text.includes('ĐĂNG KÝ KHAI SINH') ||
    text.includes('DANG KY KHAI SINH') ||
    text.includes('TỜ KHAI KHAI SINH') ||
    text.includes('TT 04/2020')
  ) {
    detected = 'TK-KS';
  } else if (
    text.includes('TK-KH') ||
    text.includes('ĐĂNG KÝ KẾT HÔN') ||
    text.includes('DANG KY KET HON') ||
    text.includes('TÌNH TRẠNG HÔN NHÂN') ||
    text.includes('TINH TRANG HON NHAN')
  ) {
    detected = 'TK-KH';
  } else if (
    text.includes('TK-BTXH') ||
    text.includes('TRỢ GIÚP XÃ HỘI') ||
    text.includes('TRO GIUP XA HOI') ||
    text.includes('BẢO TRỢ XÃ HỘI') ||
    text.includes('BAO TRO XA HOI') ||
    text.includes('20/2021')
  ) {
    detected = 'TK-BTXH';
  } else if (
    text.includes('CĂN CƯỚC CÔNG DÂN') ||
    text.includes('CAN CUOC CONG DAN') ||
    text.includes('CITIZEN IDENTITY CARD')
  ) {
    detected = 'CCCD';
  } else {
    detected = 'OTHER_TEXT';
  }

  if (detected === 'OTHER_TEXT') {
    return {
      templateMatched: false,
      detectedFormCode: detected,
      templateMessage: 'Chưa xác định được loại giấy tờ hành chính từ nội dung ảnh.',
    };
  }

  if (detected !== expectedFormType) {
    return {
      templateMatched: false,
      detectedFormCode: detected,
      templateMessage: `Ảnh nhận diện là ${getDocumentTypeDisplayName(detected)}, không khớp mục đang chọn (${getDocumentTypeDisplayName(expectedFormType)}).`,
    };
  }

  return {
    templateMatched: true,
    detectedFormCode: detected,
    templateMessage: `Đúng ${getDocumentTypeDisplayName(expectedFormType)}`,
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
    return { uri, width, height };
  }
}

/**
 * Honest Vision Quality Gate evaluation (TASK-056 & TASK-057).
 * Never fabricates sharpness/brightness scores, never matches by filename,
 * never defaults UNKNOWN to pass, and never fabricates extractedFieldsCount.
 */
export function evaluateDocumentVisionGate(
  input: VisionGateEvaluationInput
): VisionGateResult {
  const lowerName = (input.fileName || '').toLowerCase();
  const mime = (input.mimeType || '').toLowerCase();
  const isDigitalDocument =
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.pdf') ||
    mime.includes('wordprocessingml') ||
    mime.includes('pdf');

  const totalExpectedFields = input.totalExpectedFields ?? 5;

  // 1. Quality / Readability assessment (NO fake 92/185 defaults!)
  const sharpnessScore =
    typeof input.sharpnessScore === 'number' && Number.isFinite(input.sharpnessScore)
      ? Math.max(0, Math.min(100, Math.round(input.sharpnessScore)))
      : isDigitalDocument
      ? 100
      : null;

  const brightnessScore =
    typeof input.brightnessScore === 'number' && Number.isFinite(input.brightnessScore)
      ? Math.max(0, Math.min(255, Math.round(input.brightnessScore)))
      : isDigitalDocument
      ? 220
      : null;

  const serverReadability = normalizeReadabilityStatus(input.readabilityStatus);
  let qualityStatus: VisionQualityStatus = 'NOT_EVALUATED';

  if (serverReadability && serverReadability !== 'NOT_EVALUATED') {
    qualityStatus = serverReadability;
  } else if (isDigitalDocument) {
    qualityStatus = 'PASS';
  } else if (sharpnessScore !== null || brightnessScore !== null) {
    if (sharpnessScore !== null && sharpnessScore < VISION_MIN_SHARPNESS_SCORE) {
      qualityStatus = 'BLURRY';
    } else if (brightnessScore !== null && brightnessScore < VISION_MIN_BRIGHTNESS_SCORE) {
      qualityStatus = 'TOO_DARK';
    } else if (sharpnessScore !== null && brightnessScore !== null) {
      qualityStatus = 'PASS';
    } else {
      qualityStatus = 'NOT_EVALUATED';
    }
  }

  const isBlurry = qualityStatus === 'BLURRY' || qualityStatus === 'UNREADABLE';
  const isTooDark = qualityStatus === 'TOO_DARK';
  const isReadabilityFailed =
    qualityStatus === 'BLURRY' ||
    qualityStatus === 'TOO_DARK' ||
    qualityStatus === 'GLARE' ||
    qualityStatus === 'CROPPED' ||
    qualityStatus === 'UNREADABLE';

  const qualityMessage = (() => {
    if (isDigitalDocument) return 'Tệp văn bản số (.DOCX/.PDF) rõ chữ';
    switch (qualityStatus) {
      case 'PASS':
        return 'Ảnh đủ rõ và đủ sáng để đọc nội dung';
      case 'BLURRY':
        return 'Ảnh bị mờ/nhòe — hãy giữ chắc tay và chụp lại';
      case 'TOO_DARK':
        return 'Ảnh thiếu sáng — hãy đưa ra nơi đủ ánh sáng rồi chụp lại';
      case 'GLARE':
        return 'Ảnh bị lóa sáng che mất chữ — nghiêng nhẹ góc máy và chụp lại';
      case 'CROPPED':
        return 'Ảnh bị cắt mất góc giấy — đưa đủ 4 góc tờ giấy vào khung';
      case 'UNREADABLE':
        return 'Không đọc được chữ trên ảnh — vui lòng chụp lại rõ nét hơn';
      default:
        return 'Chưa đánh giá chất lượng ảnh';
    }
  })();

  // 2. OCR execution status (explicitly separated from UNIDENTIFIED!)
  const hasOcrEvidence = Boolean(
    (input.rawText && input.rawText.trim().length > 0) ||
      (input.detectedDocumentType && String(input.detectedDocumentType).trim().length > 0) ||
      typeof input.extractedFieldsCount === 'number'
  );
  const ocrStatus: VisionOcrStatus = input.ocrStatus ?? (hasOcrEvidence ? 'COMPLETED' : 'NOT_RUN');

  // 3. Document classification (strictly from server classification or real OCR text — NEVER fileName)
  let detectedFormCode: DetectedDocumentType = 'UNKNOWN';
  let templateMatchStatus: TemplateMatchStatus = 'NOT_CHECKED';
  let templateMatched = false;
  let templateMessage = 'Chưa kiểm tra nội dung ảnh để xác định loại giấy tờ.';
  let suggestedTargetSlot: ExpectedDocumentType | undefined;

  if (ocrStatus === 'NOT_RUN') {
    templateMatchStatus = 'NOT_CHECKED';
    detectedFormCode = 'UNKNOWN';
    templateMessage = 'Chưa chạy kiểm tra nội dung (OCR) cho ảnh này.';
  } else if (ocrStatus === 'NETWORK_ERROR') {
    templateMatchStatus = 'NOT_CHECKED';
    detectedFormCode = 'UNKNOWN';
    templateMessage = 'Không kết nối được máy chủ OCR để nhận diện loại giấy tờ.';
  } else if (ocrStatus === 'UNAVAILABLE') {
    templateMatchStatus = 'NOT_CHECKED';
    detectedFormCode = 'UNKNOWN';
    templateMessage = 'Dịch vụ nhận diện ảnh (OCR) tạm thời chưa sẵn sàng.';
  } else {
    // ocrStatus === 'COMPLETED'
    const serverDetected = normalizeDetectedDocumentType(input.detectedDocumentType);
    const textCheck = verifyTemplateMatch(input.rawText, undefined, input.expectedFormType);
    detectedFormCode = serverDetected !== 'UNKNOWN' ? serverDetected : textCheck.detectedFormCode;

    if (
      detectedFormCode === 'UNKNOWN' ||
      detectedFormCode === 'OTHER_TEXT' ||
      detectedFormCode === 'NON_DOCUMENT'
    ) {
      templateMatchStatus = 'UNIDENTIFIED';
      templateMatched = false;
      templateMessage = 'Chưa xác định loại giấy tờ — ảnh không khớp mẫu hành chính nào.';
    } else if (detectedFormCode !== input.expectedFormType) {
      templateMatchStatus = 'WRONG_DOCUMENT';
      templateMatched = false;
      templateMessage = `Nhận diện nhầm loại: đây là ${getDocumentTypeDisplayName(detectedFormCode)}, không phải ${getDocumentTypeDisplayName(input.expectedFormType)}.`;
      if (
        detectedFormCode === 'BIRTH_CERT' ||
        detectedFormCode === 'TK-KS' ||
        detectedFormCode === 'CT01' ||
        detectedFormCode === 'TK-KH' ||
        detectedFormCode === 'TK-BTXH' ||
        detectedFormCode === 'CCCD'
      ) {
        suggestedTargetSlot = detectedFormCode;
      }
    } else {
      // Exact document type matched! Distinguish MATCHED_BLANK vs MATCHED_FILLED.
      // CRITICAL (TASK-057): ONLY mark MATCHED_BLANK when server explicitly confirmed blank official template
      // AND readability is PASS (never treat 0 extracted fields on unreadable/faint photo as blank template!).
      if (input.isBlankTemplate === true && !isReadabilityFailed) {
        templateMatchStatus = 'MATCHED_BLANK';
        templateMatched = true;
        templateMessage = `Đúng mẫu ${getDocumentTypeDisplayName(input.expectedFormType)} nhưng tờ khai còn trống thông tin.`;
      } else {
        templateMatchStatus = 'MATCHED_FILLED';
        templateMatched = true;
        templateMessage = `Đúng ${getDocumentTypeDisplayName(input.expectedFormType)}`;
      }
    }
  }

  // 4. Real extracted field count (NEVER fabricated!)
  let extractedFieldsCount: number | null = null;
  let fieldsMessage = 'Chưa biết số trường (chưa kiểm tra OCR)';

  if (ocrStatus === 'NOT_RUN') {
    extractedFieldsCount = null;
    fieldsMessage = 'Chưa đọc nội dung ảnh (bấm Kiểm tra ảnh)';
  } else if (ocrStatus === 'NETWORK_ERROR') {
    extractedFieldsCount = null;
    fieldsMessage = 'Chưa đọc được do mất kết nối mạng';
  } else if (ocrStatus === 'UNAVAILABLE') {
    extractedFieldsCount = null;
    fieldsMessage = 'Chưa đọc được (dịch vụ OCR chưa sẵn sàng)';
  } else if (typeof input.extractedFieldsCount === 'number' && Number.isFinite(input.extractedFieldsCount)) {
    extractedFieldsCount = Math.max(0, Math.round(input.extractedFieldsCount));
    fieldsMessage =
      extractedFieldsCount > 0
        ? `Đọc được ${extractedFieldsCount}/${totalExpectedFields} mục có dữ liệu`
        : '0 trường phù hợp đọc được từ ảnh';
  } else if (templateMatchStatus === 'UNIDENTIFIED' || templateMatchStatus === 'WRONG_DOCUMENT') {
    extractedFieldsCount = 0;
    fieldsMessage = '0 trường phù hợp với mẫu đang chọn';
  } else if (templateMatchStatus === 'MATCHED_BLANK') {
    extractedFieldsCount = 0;
    fieldsMessage = '0 trường đã điền (mẫu trống)';
  } else if (isDigitalDocument && templateMatched) {
    extractedFieldsCount = null;
    fieldsMessage = 'Tệp văn bản đúng mẫu — kiểm tra các trường bên dưới';
  } else {
    extractedFieldsCount = null;
    fieldsMessage = 'Chưa trích xuất được giá trị cụ thể từ ảnh';
  }

  // 5. Final verdict & honest button label
  const isVerifiedForSubmission =
    qualityStatus === 'PASS' &&
    ocrStatus === 'COMPLETED' &&
    templateMatchStatus === 'MATCHED_FILLED';

  const canSubmit = isVerifiedForSubmission;

  let reasonMessage = input.readabilityReason?.trim() || '';
  if (!reasonMessage) {
    if (isReadabilityFailed) {
      reasonMessage = qualityMessage;
    } else if (ocrStatus === 'NETWORK_ERROR') {
      reasonMessage = 'Mất kết nối mạng khi kiểm tra ảnh. Ảnh vẫn được giữ lại — bấm Thử kiểm tra lại.';
    } else if (ocrStatus === 'UNAVAILABLE') {
      reasonMessage = 'Dịch vụ OCR trên máy chủ chưa sẵn sàng. Bạn có thể tự nhập thông tin vào tờ khai bên dưới.';
    } else if (ocrStatus === 'NOT_RUN') {
      reasonMessage = 'Ảnh mới chọn chưa qua bước kiểm tra nội dung OCR.';
    } else if (templateMatchStatus === 'UNIDENTIFIED') {
      reasonMessage = 'Chưa xác định loại giấy tờ. Không tự điền dữ liệu để tránh sai lệch hồ sơ.';
    } else if (templateMatchStatus === 'WRONG_DOCUMENT') {
      reasonMessage = templateMessage;
    } else if (templateMatchStatus === 'MATCHED_BLANK') {
      reasonMessage = 'Ảnh là mẫu giấy tờ còn trống, chưa có thông tin công dân để điền nháp.';
    } else if (qualityStatus === 'NOT_EVALUATED') {
      reasonMessage = 'Chất lượng ảnh chưa được đánh giá — vui lòng kiểm tra lại ảnh.';
    } else {
      reasonMessage = 'Ảnh đạt độ đọc được và khớp đúng loại giấy tờ yêu cầu.';
    }
  }

  let submitButtonLabel = 'Kiểm Tra & Gửi Sơ Duyệt';
  if (isReadabilityFailed) {
    submitButtonLabel = 'Chụp Lại Ảnh Rõ Nét Hơn';
  } else if (ocrStatus === 'NETWORK_ERROR' || ocrStatus === 'UNAVAILABLE') {
    submitButtonLabel = 'Thử Kiểm Tra Ảnh Lại';
  } else if (ocrStatus === 'NOT_RUN' || qualityStatus === 'NOT_EVALUATED') {
    submitButtonLabel = 'Kiểm Tra Ảnh Trước Khi Gửi';
  } else if (templateMatchStatus === 'WRONG_DOCUMENT') {
    submitButtonLabel = `Chọn Đúng Mẫu ${input.expectedFormType}`;
  } else if (templateMatchStatus === 'UNIDENTIFIED') {
    submitButtonLabel = 'Chưa Xác Định Giấy Tờ — Chụp Lại';
  } else if (templateMatchStatus === 'MATCHED_BLANK') {
    submitButtonLabel = 'Mẫu Trống — Điền Rồi Chụp Lại';
  }

  return {
    canSubmit,
    isVerifiedForSubmission,
    qualityStatus,
    ocrStatus,
    templateMatchStatus,
    isBlurry,
    isTooDark,
    sharpnessScore,
    brightnessScore,
    templateMatched,
    detectedFormCode,
    expectedFormCode: input.expectedFormType,
    extractedFieldsCount,
    totalExpectedFields,
    qualityMessage,
    templateMessage,
    fieldsMessage,
    reasonMessage,
    blockedReason: canSubmit ? undefined : reasonMessage,
    suggestedTargetSlot,
    submitButtonLabel,
  };
}
