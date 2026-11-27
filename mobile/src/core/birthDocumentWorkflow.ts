/**
 * SmartWard AI Mobile — Luồng Chụp, Phân Loại & Điền Nháp Khai Sinh (TASK-057)
 * - Phân tách Thủ tục (TTHC-HT-01) với từng loại giấy tờ: Tờ khai TK-KS (nhiều trang) + Giấy chứng sinh (BIRTH_CERT)
 * - Ánh xạ kết quả OCR multipart từ Backend sang VisionGateResult trung thực
 * - Không coi OCR đọc 0 trường là mẫu trống; ảnh tham khảo chưa xác minh không làm hồ sơ đủ giấy
 * - Tính toán đối chiếu điền nháp (chuẩn hóa dd-mm-yyyy) và yêu cầu xác nhận trước khi ghi đè trường người dân đã nhập
 */

import { formatDateToDmy } from './formValidators';
import {
  evaluateDocumentVisionGate,
  getDocumentTypeDisplayName,
  normalizeDetectedDocumentType,
  type ExpectedDocumentType,
  type VisionGateResult,
} from './visionQualityGate';
import type {
  CoreFormType,
  ExtractedFormOcrFields,
  FormImagePrecheckResponse,
} from '../types/api.types';

export type AttachmentDocRole = ExpectedDocumentType | 'OTHER';

export interface CapturedDocumentPage {
  id: string;
  slotRole: AttachmentDocRole;
  docLabel: string;
  pageIndex: number;
  uri: string;
  fileName: string;
  mimeType: string;
  gate: VisionGateResult;
  ocrFields?: ExtractedFormOcrFields | null;
  attachedAsReference?: boolean;
  checking?: boolean;
  uploadStatus?: 'PENDING' | 'UPLOADED' | 'FAILED';
  documentCode?: string;
  oneTimeToken?: string;
  lastError?: string | null;
}

export interface PrefillFieldDiffItem {
  key: string;
  label: string;
  currentValue: string;
  extractedValue: string;
  willOverwrite: boolean;
  confidence?: number;
}

export interface PrefillPlan {
  items: PrefillFieldDiffItem[];
  newCount: number;
  overwriteCount: number;
}

export interface BirthFormCurrentDraft {
  fullName: string;
  citizenCccd: string;
  dateOfBirth: string;
  gender: 'Nam' | 'Nữ';
  address: string;
  phoneNumber: string;
  motherName: string;
  fatherName: string;
  hospitalBirthDate: string;
  hospitalMotherName: string;
  birthCertNumber?: string;
  childBirthPlace?: string;
}

export function getSlotDocLabel(role: AttachmentDocRole): string {
  if (role === 'OTHER') return 'Tài liệu tham khảo đính kèm';
  return getDocumentTypeDisplayName(role);
}

/**
 * Converts Backend POST /api/v1/forms/precheck (multipart) response into honest VisionGateResult.
 * Enforces TASK-057 guardrails:
 *  - UNAVAILABLE service -> ocrStatus: 'UNAVAILABLE', never pass
 *  - 0 extracted fields on non-clear or non-official image -> NEVER marked MATCHED_BLANK
 */
export function evaluateServerOcrIntoVisionGate(
  ocrResp: FormImagePrecheckResponse,
  expectedSlot: ExpectedDocumentType,
  fileName: string,
  mimeType: string
): VisionGateResult {
  const rawOcrStatus = (ocrResp.ocrStatus || ocrResp.extractedFields?.ocrStatus || 'COMPLETED')
    .trim()
    .toUpperCase();

  if (rawOcrStatus === 'UNAVAILABLE') {
    return evaluateDocumentVisionGate({
      expectedFormType: expectedSlot,
      fileName,
      mimeType,
      ocrStatus: 'UNAVAILABLE',
      readabilityStatus: 'NOT_EVALUATED',
      readabilityReason:
        ocrResp.readabilityReason ||
        ocrResp.extractedFields?.readabilityReason ||
        ocrResp.summaryMessage ||
        'Dịch vụ OCR trên máy chủ tạm chưa sẵn sàng.',
    });
  }

  const rawReadability = (
    ocrResp.readabilityStatus ||
    ocrResp.extractedFields?.readabilityStatus ||
    'NOT_EVALUATED'
  )
    .trim()
    .toUpperCase();

  const detectedDoc = normalizeDetectedDocumentType(
    ocrResp.detectedDocumentType || ocrResp.extractedFields?.detectedDocumentType
  );

  const matchedFields =
    typeof ocrResp.matchedFieldCount === 'number'
      ? ocrResp.matchedFieldCount
      : countPopulatedOcrFields(ocrResp.extractedFields);

  // Strict guardrail: ONLY allow isBlankTemplate when server explicitly returned true
  // AND image is CLEAR AND detectedDoc matches expectedSlot (never treat 0 fields on faint/book photo as blank!).
  const isBlankTemplate =
    (ocrResp.isBlankTemplate === true || ocrResp.extractedFields?.isBlankTemplate === true) &&
    rawReadability === 'CLEAR' &&
    detectedDoc === expectedSlot;

  return evaluateDocumentVisionGate({
    expectedFormType: expectedSlot,
    fileName,
    mimeType,
    ocrStatus: 'COMPLETED',
    readabilityStatus: rawReadability as VisionGateResult['qualityStatus'] | 'CLEAR',
    readabilityReason:
      ocrResp.readabilityReason || ocrResp.extractedFields?.readabilityReason || undefined,
    detectedDocumentType: detectedDoc,
    isBlankTemplate,
    rawText: ocrResp.extractedFields?.rawTextExcerpt || undefined,
    extractedFieldsCount: matchedFields,
  });
}

export function countPopulatedOcrFields(fields?: ExtractedFormOcrFields | null): number {
  if (!fields) return 0;
  const candidates = [
    fields.fullName,
    fields.birthDate,
    fields.gender,
    fields.cccdNumber,
    fields.permanentAddress,
    fields.phoneNumber,
    fields.childFullName,
    fields.childDob,
    fields.childGender,
    fields.childBirthPlace,
    fields.motherFullName,
    fields.fatherFullName,
    fields.birthCertNumber,
    fields.hospitalName,
  ];
  return candidates.filter((v) => typeof v === 'string' && v.trim().length > 0).length;
}

/**
 * Normalizes any recognized date string from OCR to dd-mm-yyyy for Mobile display/editing.
 */
export function normalizeOcrDateToDmy(raw?: string | null): string {
  if (!raw || !raw.trim()) return '';
  return formatDateToDmy(raw.trim());
}

/**
 * Reassigns a captured photo to a different document slot (e.g., Giấy chứng sinh captured in TK-KS slot)
 * in 1 tap while keeping the exact photo URI & re-evaluating the gate against the new slot.
 */
export function reassignCapturedPageSlot(
  pages: CapturedDocumentPage[],
  pageId: string,
  targetSlot: ExpectedDocumentType
): CapturedDocumentPage[] {
  const existingTargetCount = pages.filter(
    (p) => p.slotRole === targetSlot && p.id !== pageId
  ).length;

  return pages.map((p) => {
    if (p.id !== pageId) return p;
    const reEvaluated = evaluateDocumentVisionGate({
      expectedFormType: targetSlot,
      fileName: p.fileName,
      mimeType: p.mimeType,
      ocrStatus: p.gate.ocrStatus,
      readabilityStatus: p.gate.qualityStatus === 'PASS' ? 'CLEAR' : p.gate.qualityStatus,
      readabilityReason: p.gate.reasonMessage,
      detectedDocumentType: p.gate.detectedFormCode,
      isBlankTemplate: p.gate.templateMatchStatus === 'MATCHED_BLANK',
      extractedFieldsCount: p.gate.extractedFieldsCount,
    });
    return {
      ...p,
      slotRole: targetSlot,
      docLabel: getSlotDocLabel(targetSlot),
      pageIndex: existingTargetCount + 1,
      gate: reEvaluated,
      attachedAsReference: false,
    };
  });
}

/**
 * Computes confirmable prefill diff between OCR extracted fields and current user-entered draft.
 * Never silently overwrites fields already typed by the citizen.
 */
export function computePrefillPlan(
  formType: CoreFormType,
  slotRole: AttachmentDocRole,
  current: BirthFormCurrentDraft,
  ocr?: ExtractedFormOcrFields | null
): PrefillPlan {
  if (!ocr) return { items: [], newCount: 0, overwriteCount: 0 };
  const conf = ocr.fieldConfidences || {};
  const items: PrefillFieldDiffItem[] = [];

  const pushIfPresent = (
    key: string,
    label: string,
    currentVal: string,
    extractedRaw: string | null | undefined,
    confKey?: string,
    isDate = false
  ) => {
    const extracted = isDate
      ? normalizeOcrDateToDmy(extractedRaw)
      : (extractedRaw || '').trim();
    if (!extracted) return;
    const cur = (currentVal || '').trim();
    if (cur.toLowerCase() === extracted.toLowerCase()) return;
    items.push({
      key,
      label,
      currentValue: cur,
      extractedValue: extracted,
      willOverwrite: cur.length > 0,
      confidence: confKey ? conf[confKey] : undefined,
    });
  };

  if (formType === 'TK-KS') {
    if (slotRole === 'BIRTH_CERT') {
      pushIfPresent('fullName', 'Họ tên trẻ', current.fullName, ocr.childFullName || ocr.fullName, 'childFullName');
      pushIfPresent('dateOfBirth', 'Ngày sinh trẻ', current.dateOfBirth, ocr.childDob || ocr.birthDate, 'childDob', true);
      pushIfPresent('hospitalBirthDate', 'Ngày sinh (Giấy chứng sinh)', current.hospitalBirthDate, ocr.childDob || ocr.birthDate, 'childDob', true);
      pushIfPresent('motherName', 'Họ tên Mẹ', current.motherName, ocr.motherFullName, 'motherFullName');
      pushIfPresent('hospitalMotherName', 'Họ tên Mẹ (Giấy chứng sinh)', current.hospitalMotherName, ocr.motherFullName, 'motherFullName');
      pushIfPresent('childBirthPlace', 'Nơi sinh / Bệnh viện', current.childBirthPlace || '', ocr.hospitalName || ocr.childBirthPlace, 'hospitalName');
      pushIfPresent('birthCertNumber', 'Số Giấy chứng sinh', current.birthCertNumber || '', ocr.birthCertNumber, 'birthCertNumber');
    } else {
      pushIfPresent('fullName', 'Họ tên trẻ', current.fullName, ocr.childFullName || ocr.fullName, 'childFullName');
      pushIfPresent('dateOfBirth', 'Ngày sinh trẻ', current.dateOfBirth, ocr.childDob || ocr.birthDate, 'childDob', true);
      pushIfPresent('gender', 'Giới tính trẻ', current.gender, ocr.childGender || ocr.gender, 'childGender');
      pushIfPresent('citizenCccd', 'Số CCCD người đi khai', current.citizenCccd, ocr.cccdNumber, 'cccdNumber');
      pushIfPresent('address', 'Địa chỉ người đi khai', current.address, ocr.permanentAddress, 'permanentAddress');
      pushIfPresent('motherName', 'Họ tên Mẹ', current.motherName, ocr.motherFullName, 'motherFullName');
      pushIfPresent('fatherName', 'Họ tên Cha', current.fatherName, ocr.fatherFullName, 'fatherFullName');
      pushIfPresent('childBirthPlace', 'Nơi sinh trẻ', current.childBirthPlace || '', ocr.childBirthPlace || ocr.hospitalName, 'childBirthPlace');
      pushIfPresent('birthCertNumber', 'Số Giấy chứng sinh', current.birthCertNumber || '', ocr.birthCertNumber, 'birthCertNumber');
    }
  } else {
    pushIfPresent('fullName', 'Họ và tên', current.fullName, ocr.fullName, 'fullName');
    pushIfPresent('citizenCccd', 'Số CCCD (12 số)', current.citizenCccd, ocr.cccdNumber, 'cccdNumber');
    pushIfPresent('dateOfBirth', 'Ngày sinh', current.dateOfBirth, ocr.birthDate, 'birthDate', true);
    pushIfPresent('gender', 'Giới tính', current.gender, ocr.gender, 'gender');
    pushIfPresent('address', 'Địa chỉ thường trú', current.address, ocr.permanentAddress, 'permanentAddress');
    pushIfPresent('phoneNumber', 'Số điện thoại', current.phoneNumber, ocr.phoneNumber, 'phoneNumber');
  }

  return {
    items,
    newCount: items.filter((i) => !i.willOverwrite).length,
    overwriteCount: items.filter((i) => i.willOverwrite).length,
  };
}

/**
 * Checks whether required Birth Registration (TTHC-HT-01) document slots are genuinely verified.
 * Unverified reference attachments (`attachedAsReference === true`) NEVER satisfy required slots.
 */
export function evaluateBirthSlotCompleteness(pages: CapturedDocumentPage[]): {
  hasVerifiedTkKs: boolean;
  hasVerifiedBirthCert: boolean;
  hasUnverifiedReferenceOnly: boolean;
  isComplete: boolean;
} {
  const isVerifiedPage = (p: CapturedDocumentPage) =>
    !p.attachedAsReference && p.gate.isVerifiedForSubmission;

  const hasVerifiedTkKs = pages.some((p) => p.slotRole === 'TK-KS' && isVerifiedPage(p));
  const hasVerifiedBirthCert = pages.some((p) => p.slotRole === 'BIRTH_CERT' && isVerifiedPage(p));
  const hasUnverifiedReferenceOnly =
    pages.some((p) => Boolean(p.attachedAsReference) || !p.gate.isVerifiedForSubmission) &&
    (!hasVerifiedTkKs || !hasVerifiedBirthCert);

  return {
    hasVerifiedTkKs,
    hasVerifiedBirthCert,
    hasUnverifiedReferenceOnly,
    isComplete: hasVerifiedTkKs && hasVerifiedBirthCert,
  };
}
