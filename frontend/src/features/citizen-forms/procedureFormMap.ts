import type { FormPrecheckResponse } from '../../api/client';
import type { CitizenFormType } from './useFormOcrUpload';

export type MarriageFormMode = 'MARRIAGE_REGISTRATION' | 'MARITAL_STATUS_CONFIRMATION';

/**
 * Single canonical mapping between Citizen Form Templates and Official Procedure Codes (TASK-051).
 */
export function resolveCanonicalProcedureCode(
  formType: CitizenFormType,
  marriageMode: MarriageFormMode = 'MARRIAGE_REGISTRATION'
): string {
  switch (formType) {
    case 'TK-KS':
      return 'TTHC-HT-01';
    case 'TK-KH':
      return marriageMode === 'MARITAL_STATUS_CONFIRMATION' ? 'TTHC-HT-11' : 'TTHC-HT-02';
    case 'TK-BTXH':
      return 'TTHC-BT-01';
    case 'CT01':
    default:
      return 'TTHC-CR-01';
  }
}

export function resolveSupportedFormTypeByProcedure(procedureCode?: string | null): CitizenFormType | null {
  if (!procedureCode) return null;
  const clean = procedureCode.trim().toUpperCase();
  if (clean === 'TTHC-HT-01' || clean === 'KS-01-DK') return 'TK-KS';
  if (clean === 'TTHC-HT-02' || clean === 'TTHC-HT-11' || clean === 'HT-02-DK') return 'TK-KH';
  if (clean === 'TTHC-BT-01' || clean === 'TTHC-BT-02') return 'TK-BTXH';
  if (clean === 'TTHC-CR-01' || clean === 'TTHC-CR-03' || clean === 'CT-01' || clean === 'CT01') return 'CT01';
  return null;
}

export function resolveOfficerDisplayFormLabel(
  procedureCode?: string | null,
  rawFormType?: string | null
): 'CT01' | 'Khai sinh' | 'Kết hôn' | 'Bảo trợ' {
  const ft = (rawFormType || '').trim().toUpperCase();
  if (ft === 'TK-KS') return 'Khai sinh';
  if (ft === 'TK-KH') return 'Kết hôn';
  if (ft === 'TK-BTXH') return 'Bảo trợ';
  if (ft === 'CT01') return 'CT01';

  const mapped = resolveSupportedFormTypeByProcedure(procedureCode);
  if (mapped === 'TK-KS') return 'Khai sinh';
  if (mapped === 'TK-KH') return 'Kết hôn';
  if (mapped === 'TK-BTXH') return 'Bảo trợ';
  return 'CT01';
}

export function generateSubmissionAttemptUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function buildCanonicalSubmissionFormData(params: {
  selectedFormType: CitizenFormType;
  fullName: string;
  dob: string;
  gender: string;
  issueDate: string;
  address: string;
  phoneNumber: string;
  citizenEmail: string;
  sharpnessScore: number | null;
  templateMatched: boolean | null;
  // CT01
  hostName: string;
  hostCccd: string;
  hostRelation: string;
  declarationScope: string;
  // TK-KS
  hospitalBirthDate: string;
  motherName: string;
  hospitalMotherName: string;
  motherResidence: string;
  fatherName: string;
  fatherResidence: string;
  parentsMarried: 'YES' | 'NO';
  childEthnicity: string;
  childNationality: string;
  childBirthPlace: string;
  birthCertNumber: string;
  birthCertIssueDate: string;
  // TK-KH
  marriageMode: MarriageFormMode;
  partnerName: string;
  partnerCccd: string;
  partnerDob: string;
  partnerGender: 'Nam' | 'Nữ';
  partnerAddress: string;
  maritalCertPurpose: string;
  previousMaritalStatus: 'SINGLE' | 'DIVORCED' | 'WIDOWED';
  // TK-BTXH
  disabilityLevel: string;
  householdStatus: string;
  bankAccount: string;
  socialTargetGroup: string;
}): Record<string, any> {
  const base: Record<string, any> = {
    formType: params.selectedFormType,
    fullName: params.fullName.trim(),
    dob: params.dob.trim(), // Missing field stays empty string, NEVER '1990-01-01'
    gender: params.gender.trim(),
    cccdIssueDate: params.issueDate.trim(),
    address: params.address.trim(),
    permanentAddress: params.address.trim(),
    phone: params.phoneNumber.trim(),
    phoneNumber: params.phoneNumber.trim(),
    email: params.citizenEmail.trim(),
    citizenEmail: params.citizenEmail.trim(),
    sharpnessScore: params.sharpnessScore, // null when no image uploaded (never fake 96)
    templateMatched: params.templateMatched, // null when no image uploaded (never fake true)
  };

  if (params.selectedFormType === 'TK-KS') {
    Object.assign(base, {
      childName: params.fullName.trim(),
      hospitalBirthDate: params.hospitalBirthDate.trim(),
      motherName: params.motherName.trim(),
      hospitalMotherName: params.hospitalMotherName.trim(),
      motherResidence: params.motherResidence.trim(),
      fatherName: params.fatherName.trim(),
      fatherResidence: params.fatherResidence.trim(),
      parentsMarried: params.parentsMarried,
      childEthnicity: params.childEthnicity.trim(),
      childNationality: params.childNationality.trim(),
      childBirthPlace: params.childBirthPlace.trim(),
      birthCertNumber: params.birthCertNumber.trim(),
      birthCertIssueDate: params.birthCertIssueDate.trim(),
    });
  } else if (params.selectedFormType === 'CT01') {
    Object.assign(base, {
      hostName: params.hostName.trim(),
      hostCccd: params.hostCccd.trim(),
      hostRelation: params.hostRelation,
      declarationScope: params.declarationScope,
    });
  } else if (params.selectedFormType === 'TK-KH') {
    Object.assign(base, {
      marriageMode: params.marriageMode,
      partnerName: params.partnerName.trim(),
      partnerCccd: params.partnerCccd.trim(),
      partnerDob: params.partnerDob.trim(),
      partnerGender: params.partnerGender,
      partnerAddress: params.partnerAddress.trim(),
      maritalCertPurpose: params.maritalCertPurpose.trim(),
      previousMaritalStatus: params.previousMaritalStatus,
    });
  } else if (params.selectedFormType === 'TK-BTXH') {
    Object.assign(base, {
      disabilityLevel: params.disabilityLevel,
      householdStatus: params.householdStatus,
      bankAccount: params.bankAccount.trim(),
      socialTargetGroup: params.socialTargetGroup,
    });
  }
  return base;
}

export function computeFormSnapshotFingerprint(
  procedureCode: string,
  wardCode: string,
  cccd: string,
  formData: Record<string, any>
): string {
  const keys = Object.keys(formData).sort();
  const pairs = keys.map((k) => `${k}:${JSON.stringify(formData[k] ?? null)}`).join('|');
  return `${procedureCode}|${wardCode}|${cccd.trim()}|${pairs}`;
}

const ERROR_CODE_TO_DOM_ID: Record<string, string> = {
  INVALID_CHILD_NAME: 'p3-full-name',
  BIRTH_CERT_DATE_MISMATCH: 'p3-ks-hospital-dob',
  BIRTH_CERT_MOTHER_MISMATCH: 'p3-ks-mother-name',
  INVALID_PARENT_CCCD: 'p3-cccd',
  UNMARRIED_PARENTS_PATERNITY_REQUIRED: 'p3-ks-parents-married',
  MISSING_CHILD_ETHNICITY: 'p3-ks-ethnicity',
  MISSING_CHILD_NATIONALITY: 'p3-ks-nationality',
  MISSING_CHILD_BIRTH_PLACE: 'p3-ks-birthplace',
  MISSING_BIRTH_CERT_NUMBER: 'p3-ks-cert-num',
  INVALID_BIRTH_CERT_ISSUE_DATE: 'p3-ks-cert-date',
  MISSING_MOTHER_RESIDENCE: 'p3-ks-mother-res',
  MISSING_FATHER_RESIDENCE: 'p3-ks-father-res',
};

export function focusFirstInvalidPrecheckField(
  validations: FormPrecheckResponse['fieldValidations'] | undefined
): string | null {
  if (!Array.isArray(validations) || validations.length === 0) return null;
  const firstInvalid = validations.find((v) => !v.valid);
  if (!firstInvalid) return null;

  const code = (firstInvalid.errorCode || '').trim().toUpperCase();
  let domId = ERROR_CODE_TO_DOM_ID[code] || null;
  if (!domId) {
    const fn = (firstInvalid.fieldName || '').toLowerCase();
    if (fn.includes('họ tên mẹ') || fn.includes('sản phụ')) domId = 'p3-ks-mother-name';
    else if (fn.includes('chứng sinh') && fn.includes('ngày sinh')) domId = 'p3-ks-hospital-dob';
    else if (fn.includes('số giấy chứng sinh')) domId = 'p3-ks-cert-num';
    else if (fn.includes('ngày cấp giấy chứng sinh')) domId = 'p3-ks-cert-date';
    else if (fn.includes('nơi sinh')) domId = 'p3-ks-birthplace';
    else if (fn.includes('cư trú của người mẹ')) domId = 'p3-ks-mother-res';
    else if (fn.includes('cư trú của người cha')) domId = 'p3-ks-father-res';
    else if (fn.includes('cccd') || fn.includes('định danh')) domId = 'p3-cccd';
    else if (fn.includes('ngày sinh')) domId = 'p3-dob';
    else if (fn.includes('họ') && fn.includes('tên')) domId = 'p3-full-name';
  }

  if (domId && typeof document !== 'undefined') {
    setTimeout(() => {
      const el = document.getElementById(domId!) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }, 60);
  }
  return domId;
}
