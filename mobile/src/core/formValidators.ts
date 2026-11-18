/**
 * SmartWard AI Mobile — Động cơ Kiểm định Tất định 4 Nhóm Tờ khai (Local Precheck Engine)
 * Chạy kiểm định tức thì trên thiết bị trước khi gọi POST /api/v1/forms/precheck
 *
 * 4 Biểu mẫu trọng tâm:
 * 1. CT01    — Thay đổi thông tin cư trú (TT 116/2026/TT-BCA & NĐ 309/2026/NĐ-CP)
 * 2. TK-KS   — Đăng ký khai sinh & đối chiếu Giấy chứng sinh (TT 04/2020/TT-BTP)
 * 3. TK-KH   — Đăng ký kết hôn & Xác nhận tình trạng hôn nhân (Luật HN&GĐ 2014)
 * 4. TK-BTXH — Trợ cấp bảo trợ xã hội hằng tháng (NĐ 20/2021 & NĐ 335/2026 & Đề án 06)
 */

import type { CoreFormType, FieldValidation } from '../types/api.types';

export interface LocalFormValidationInput {
  formType: CoreFormType;
  fullName: string;
  citizenCccd: string;
  dateOfBirth: string; // yyyy-MM-dd
  gender?: 'Nam' | 'Nữ' | string;
  address?: string;
  phoneNumber?: string;
  citizenEmail?: string;
  qrVerified?: boolean;
  /** Reference date for deterministic age calculation in tests (defaults to now) */
  referenceDate?: Date;
  extra?: {
    // CT01 fields
    hostFullName?: string;
    hostCccdNumber?: string;
    hostDateOfBirth?: string;
    vneidHostConfirmed?: boolean;
    requiresHostConsent?: boolean;

    // TK-KS fields
    motherName?: string;
    fatherName?: string;
    hospitalBirthDate?: string;
    hospitalMotherName?: string;
    parentsMarried?: 'YES' | 'NO';

    // TK-KH fields
    partnerFullName?: string;
    partnerCccd?: string;
    partnerDob?: string;
    partnerGender?: 'Nam' | 'Nữ' | string;
    maritalCertPurpose?: string;
    previousMaritalStatus?: 'SINGLE' | 'DIVORCED' | 'WIDOWED';

    // TK-BTXH fields
    householdStatus?: 'NORMAL' | 'POOR' | 'NEAR_POOR';
    disabilityLevel?: 'NONE' | 'MILD' | 'SEVERE' | 'EXTREMELY_SEVERE';
    bankAccount?: string;
    bankName?: string;
  };
}

export interface LocalFormValidationResult {
  formType: CoreFormType;
  valid: boolean;
  fieldValidations: FieldValidation[];
  warnings: string[];
  verificationBadge?: 'VERIFIED_VIA_VNEID_QR';
}

const CCCD_12_REGEX = /^\d{12}$/;
const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9|2)\d{8,9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseIsoDate(isoDate: string): Date | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate.trim())) {
    return null;
  }
  const [y, m, d] = isoDate.trim().split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

/**
 * Computes exact age in full years, remaining months, and exact days difference.
 */
export function computeExactAge(
  dobIso: string,
  referenceDate: Date = new Date()
): { years: number; months: number; totalDays: number; isFuture: boolean } | null {
  const birth = parseIsoDate(dobIso);
  if (!birth) return null;

  const refUtc = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate())
  );

  const diffMs = refUtc.getTime() - birth.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (totalDays < 0) {
    return { years: -1, months: 0, totalDays, isFuture: true };
  }

  let years = refUtc.getUTCFullYear() - birth.getUTCFullYear();
  let months = refUtc.getUTCMonth() - birth.getUTCMonth();
  if (refUtc.getUTCDate() < birth.getUTCDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, totalDays, isFuture: false };
}

export function isValidCccd12(cccd: string): boolean {
  const clean = (cccd || '').trim();
  return CCCD_12_REGEX.test(clean) && !clean.startsWith('000');
}

export function validateCitizenContact(email?: string, phone?: string): FieldValidation[] {
  const checks: FieldValidation[] = [];
  if (email !== undefined) {
    const cleanEmail = email.trim();
    const emailValid = EMAIL_REGEX.test(cleanEmail);
    checks.push({
      fieldName: 'Email nhận kết quả & Mã hẹn QR (Miễn phí 100%)',
      providedValue: cleanEmail || '(Để trống)',
      valid: emailValid,
      errorCode: emailValid ? undefined : 'INVALID_CITIZEN_EMAIL',
      errorMessage: emailValid
        ? undefined
        : 'Vui lòng nhập đúng định dạng Email để nhận Phiếu hẹn điện tử có mã QR miễn phí.',
      confidenceScore: emailValid ? 0.99 : 0.4,
    });
  }
  if (phone !== undefined && phone.trim().length > 0) {
    const cleanPhone = phone.trim();
    const phoneValid = VN_PHONE_REGEX.test(cleanPhone);
    checks.push({
      fieldName: 'Số điện thoại liên hệ (10 số)',
      providedValue: cleanPhone,
      valid: phoneValid,
      errorCode: phoneValid ? undefined : 'INVALID_PHONE_NUMBER',
      errorMessage: phoneValid
        ? undefined
        : 'Số điện thoại phải là số di động/cố định Việt Nam hợp lệ (10 chữ số).',
      confidenceScore: phoneValid ? 0.98 : 0.4,
    });
  }
  return checks;
}

function validateCt01(
  input: LocalFormValidationInput,
  refDate: Date
): LocalFormValidationResult {
  const fieldValidations: FieldValidation[] = [];
  const warnings: string[] = [];
  const extra = input.extra || {};

  // 1. Họ tên người khai
  const nameValid = input.fullName.trim().length >= 4 && input.fullName.trim().includes(' ');
  fieldValidations.push({
    fieldName: 'Họ và tên người khai (Mẫu CT01)',
    providedValue: input.fullName,
    valid: nameValid,
    errorCode: nameValid ? undefined : 'INVALID_FULL_NAME',
    errorMessage: nameValid
      ? undefined
      : 'Họ và tên phải ghi đầy đủ họ, chữ đệm và tên theo giấy tờ tùy thân.',
    confidenceScore: nameValid ? 0.99 : 0.5,
  });

  // 2. 12 số CCCD người khai
  const cccdValid = isValidCccd12(input.citizenCccd);
  fieldValidations.push({
    fieldName: 'Số định danh cá nhân / CCCD người khai (12 số)',
    providedValue: input.citizenCccd,
    valid: cccdValid,
    errorCode: cccdValid ? undefined : 'INVALID_CCCD_FORMAT',
    errorMessage: cccdValid
      ? undefined
      : 'Số CCCD người khai phải gồm đúng 12 chữ số hợp lệ của Bộ Công an.',
    confidenceScore: cccdValid ? 0.99 : 0.4,
  });

  // 3. Tuổi người khai >= 14 (TT 116/2026/TT-BCA)
  const applicantAge = computeExactAge(input.dateOfBirth, refDate);
  const applicantAgeValid = Boolean(applicantAge && !applicantAge.isFuture && applicantAge.years >= 14);
  fieldValidations.push({
    fieldName: 'Độ tuổi người trực tiếp kê khai CT01 (≥ 14 tuổi)',
    providedValue: applicantAge
      ? `${input.dateOfBirth} (${applicantAge.years} tuổi)`
      : input.dateOfBirth || '(Để trống)',
    valid: applicantAgeValid,
    errorCode: applicantAgeValid ? undefined : 'APPLICANT_UNDER_14',
    errorMessage: applicantAgeValid
      ? undefined
      : 'Người trực tiếp ký tờ khai CT01 phải từ đủ 14 tuổi trở lên (dưới 14 tuổi phải do cha/mẹ/người giám hộ khai hộ).',
    confidenceScore: applicantAgeValid ? 0.98 : 0.35,
  });

  // 4. Địa chỉ cư trú đề nghị
  const addressValid = (input.address || '').trim().length >= 8;
  fieldValidations.push({
    fieldName: 'Nơi đề nghị đăng ký cư trú',
    providedValue: input.address || '(Để trống)',
    valid: addressValid,
    errorCode: addressValid ? undefined : 'INSUFFICIENT_ADDRESS',
    errorMessage: addressValid
      ? undefined
      : 'Địa chỉ cư trú đề nghị phải ghi đầy đủ số nhà, đường/ấp, xã/phường.',
    confidenceScore: addressValid ? 0.95 : 0.5,
  });

  // 5. CCCD Chủ hộ & Tuổi chủ hộ >= 18 & Xác nhận VNeID (TT 116/2026/TT-BCA)
  const requiresHost = extra.requiresHostConsent !== false;
  if (requiresHost) {
    const hostCccd = (extra.hostCccdNumber || '').trim();
    const hostCccdValid = isValidCccd12(hostCccd);
    fieldValidations.push({
      fieldName: 'Số định danh 12 số CCCD Chủ hộ (hostCccdNumber)',
      providedValue: hostCccd || '(Chưa nhập)',
      valid: hostCccdValid,
      errorCode: hostCccdValid ? undefined : 'INVALID_HOST_CCCD',
      errorMessage: hostCccdValid
        ? undefined
        : 'Bắt buộc nhập đúng 12 chữ số CCCD của Chủ hộ để đối soát trên Cơ sở dữ liệu Quốc gia về dân cư.',
      confidenceScore: hostCccdValid ? 0.98 : 0.35,
    });

    if (extra.hostDateOfBirth) {
      const hostAge = computeExactAge(extra.hostDateOfBirth, refDate);
      const hostAgeValid = Boolean(hostAge && !hostAge.isFuture && hostAge.years >= 18);
      fieldValidations.push({
        fieldName: 'Độ tuổi Chủ hộ (≥ 18 tuổi theo Luật Cư trú)',
        providedValue: hostAge
          ? `${extra.hostDateOfBirth} (${hostAge.years} tuổi)`
          : extra.hostDateOfBirth,
        valid: hostAgeValid,
        errorCode: hostAgeValid ? undefined : 'HOST_UNDER_18',
        errorMessage: hostAgeValid
          ? undefined
          : 'Chủ hộ đồng ý cho đăng ký thường trú/tạm trú phải từ đủ 18 tuổi trở lên.',
        confidenceScore: hostAgeValid ? 0.99 : 0.3,
      });
    }

    const hostConfirmed = Boolean(extra.vneidHostConfirmed);
    fieldValidations.push({
      fieldName: 'Xác nhận đồng ý của Chủ hộ qua VNeID (TT 116/2026/TT-BCA)',
      providedValue: hostConfirmed ? 'Đã xác nhận VNeID' : 'Chưa xác nhận',
      valid: hostConfirmed,
      errorCode: hostConfirmed ? undefined : 'MISSING_VNEID_HOST_CONFIRMATION',
      errorMessage: hostConfirmed
        ? undefined
        : 'Chủ hộ cần bật xác nhận đồng ý cho đăng ký cư trú qua ứng dụng VNeID hoặc ký trực tiếp mục đồng ý.',
      confidenceScore: hostConfirmed ? 0.99 : 0.4,
    });
  }

  const verificationBadge = input.qrVerified ? 'VERIFIED_VIA_VNEID_QR' : undefined;
  if (verificationBadge) {
    warnings.push(
      '✓ VERIFIED_VIA_VNEID_QR (NĐ 309/2026/NĐ-CP): Đã xác thực từ mã QR CCCD — Miễn nộp bản sao chứng thực giấy tờ cư trú.'
    );
  }

  return {
    formType: 'CT01',
    valid: fieldValidations.every((f) => f.valid),
    fieldValidations,
    warnings,
    verificationBadge,
  };
}

function validateTkKs(
  input: LocalFormValidationInput,
  refDate: Date
): LocalFormValidationResult {
  const fieldValidations: FieldValidation[] = [];
  const warnings: string[] = [];
  const extra = input.extra || {};

  // 1. Họ tên trẻ
  const childNameValid = input.fullName.trim().length >= 4 && input.fullName.trim().includes(' ');
  fieldValidations.push({
    fieldName: 'Họ, chữ đệm, tên của trẻ (Tờ khai Khai sinh)',
    providedValue: input.fullName,
    valid: childNameValid,
    errorCode: childNameValid ? undefined : 'INVALID_CHILD_NAME',
    errorMessage: childNameValid
      ? undefined
      : 'Họ tên trẻ phải ghi đầy đủ họ, chữ đệm và tên tiếng Việt.',
    confidenceScore: childNameValid ? 0.99 : 0.45,
  });

  // 2. Ngày sinh trẻ không ở tương lai & cảnh báo quá hạn 60 ngày
  const childAge = computeExactAge(input.dateOfBirth, refDate);
  const childDobValid = Boolean(childAge && !childAge.isFuture);
  fieldValidations.push({
    fieldName: 'Ngày sinh của trẻ (Không được ở tương lai)',
    providedValue: input.dateOfBirth || '(Để trống)',
    valid: childDobValid,
    errorCode: childDobValid ? undefined : 'FUTURE_BIRTH_DATE',
    errorMessage: childDobValid
      ? undefined
      : 'Ngày sinh của trẻ không hợp lệ hoặc lớn hơn ngày hiện tại.',
    confidenceScore: childDobValid ? 0.99 : 0.25,
  });

  if (childAge && !childAge.isFuture && childAge.totalDays > 60) {
    warnings.push(
      `Cảnh báo quá hạn 60 ngày (Điều 15 Luật Hộ tịch): Trẻ đã sinh được ${childAge.totalDays} ngày. Vẫn được đăng ký khai sinh miễn lệ phí nhưng cần ghi rõ lý do đăng ký quá hạn.`
    );
  }

  // 3. Đối chiếu chéo Ngày sinh trẻ vs Giấy chứng sinh
  const hospitalDob = (extra.hospitalBirthDate || '').trim();
  const dobCrossValid =
    childDobValid && (!hospitalDob || input.dateOfBirth.trim() === hospitalDob);
  fieldValidations.push({
    fieldName: 'Đối chiếu chéo Ngày sinh trẻ vs Giấy chứng sinh',
    providedValue: `${input.dateOfBirth}${hospitalDob ? ` | GCS: ${hospitalDob}` : ''}`,
    valid: dobCrossValid,
    errorCode: dobCrossValid ? undefined : 'BIRTH_CERT_DATE_MISMATCH',
    errorMessage: dobCrossValid
      ? undefined
      : `LỆCH GIẤY CHỨNG SINH: Ngày sinh trên Tờ khai (${input.dateOfBirth}) khác với Giấy chứng sinh bệnh viện (${hospitalDob}).`,
    confidenceScore: dobCrossValid ? 0.99 : 0.3,
  });

  // 4. Đối chiếu chéo Họ tên mẹ vs Giấy chứng sinh
  const motherName = (extra.motherName || '').trim();
  const hospitalMotherName = (extra.hospitalMotherName || '').trim();
  const motherValid =
    motherName.length >= 4 &&
    (!hospitalMotherName || motherName.toLowerCase() === hospitalMotherName.toLowerCase());
  fieldValidations.push({
    fieldName: 'Đối chiếu chéo Họ tên Mẹ vs Giấy chứng sinh',
    providedValue: `${motherName || '(Trống)'}${
      hospitalMotherName ? ` | GCS: ${hospitalMotherName}` : ''
    }`,
    valid: motherValid,
    errorCode: motherValid ? undefined : 'BIRTH_CERT_MOTHER_MISMATCH',
    errorMessage: motherValid
      ? undefined
      : `LỆCH GIẤY CHỨNG SINH: Họ tên mẹ trên Tờ khai ('${motherName}') không khớp với sản phụ trên Giấy chứng sinh ('${hospitalMotherName}').`,
    confidenceScore: motherValid ? 0.98 : 0.3,
  });

  // 5. 12 số CCCD Cha/Mẹ
  const parentCccdValid = isValidCccd12(input.citizenCccd);
  fieldValidations.push({
    fieldName: 'Số định danh cá nhân (12 số CCCD) của Cha/Mẹ',
    providedValue: input.citizenCccd,
    valid: parentCccdValid,
    errorCode: parentCccdValid ? undefined : 'INVALID_PARENT_CCCD',
    errorMessage: parentCccdValid
      ? undefined
      : 'Số CCCD của cha/mẹ phải gồm đúng 12 chữ số hợp lệ.',
    confidenceScore: parentCccdValid ? 0.98 : 0.4,
  });

  // 6. Quy tắc cha mẹ chưa đăng ký kết hôn
  const fatherName = (extra.fatherName || '').trim();
  const parentsMarried = extra.parentsMarried || 'YES';
  const paternityValid = !(parentsMarried === 'NO' && fatherName.length > 0);
  fieldValidations.push({
    fieldName: 'Quy tắc Cha Mẹ chưa đăng ký kết hôn (TT 04/2020/TT-BTP)',
    providedValue:
      parentsMarried === 'NO'
        ? `Chưa kết hôn (Tên cha: ${fatherName || 'Để trống'})`
        : 'Đã đăng ký kết hôn',
    valid: paternityValid,
    errorCode: paternityValid ? undefined : 'UNMARRIED_PARENTS_PATERNITY_REQUIRED',
    errorMessage: paternityValid
      ? undefined
      : `Cha mẹ CHƯA đăng ký kết hôn nhưng ghi tên Cha ('${fatherName}'): Phải nộp hồ sơ kết hợp 'Đăng ký khai sinh và Nhận cha, mẹ, con'.`,
    confidenceScore: paternityValid ? 0.99 : 0.3,
  });

  return {
    formType: 'TK-KS',
    valid: fieldValidations.every((f) => f.valid),
    fieldValidations,
    warnings,
    verificationBadge: input.qrVerified ? 'VERIFIED_VIA_VNEID_QR' : undefined,
  };
}

function validateTkKh(
  input: LocalFormValidationInput,
  refDate: Date
): LocalFormValidationResult {
  const fieldValidations: FieldValidation[] = [];
  const warnings: string[] = [];
  const extra = input.extra || {};

  // 1. Tuổi kết hôn bên thứ nhất (Nam >= 20, Nữ >= 18 chính xác đến từng ngày)
  const isMale = (input.gender || 'Nam').trim().toLowerCase() !== 'nữ';
  const reqAge = isMale ? 20 : 18;
  const age = computeExactAge(input.dateOfBirth, refDate);
  const ageValid = Boolean(age && !age.isFuture && age.years >= reqAge);
  fieldValidations.push({
    fieldName: `Độ tuổi kết hôn hợp pháp (Điều 8 Luật HN&GĐ 2014 — ${isMale ? 'Nam ≥ 20' : 'Nữ ≥ 18'})`,
    providedValue: age
      ? `${input.dateOfBirth} (${age.years} tuổi ${age.months} tháng)`
      : input.dateOfBirth || '(Để trống)',
    valid: ageValid,
    errorCode: ageValid ? undefined : 'UNDERAGE_MARRIAGE',
    errorMessage: ageValid
      ? undefined
      : `CHƯA ĐỦ TUỔI KẾT HÔN: ${isMale ? 'Nam phải từ đủ 20 tuổi' : 'Nữ phải từ đủ 18 tuổi'} tính chính xác đến từng ngày (hiện ${
          age?.years ?? 0
        } tuổi ${age?.months ?? 0} tháng).`,
    confidenceScore: ageValid ? 0.99 : 0.25,
  });

  // 2. Tuổi kết hôn bên thứ hai (nếu khai kết hôn)
  if (extra.partnerDob) {
    const partnerIsMale = (extra.partnerGender || 'Nữ').trim().toLowerCase() !== 'nữ';
    const partnerReqAge = partnerIsMale ? 20 : 18;
    const pAge = computeExactAge(extra.partnerDob, refDate);
    const pAgeValid = Boolean(pAge && !pAge.isFuture && pAge.years >= partnerReqAge);
    fieldValidations.push({
      fieldName: `Độ tuổi Bên kết hôn thứ hai (${partnerIsMale ? 'Nam ≥ 20' : 'Nữ ≥ 18'})`,
      providedValue: pAge
        ? `${extra.partnerDob} (${pAge.years} tuổi ${pAge.months} tháng)`
        : extra.partnerDob,
      valid: pAgeValid,
      errorCode: pAgeValid ? undefined : 'PARTNER_UNDERAGE_MARRIAGE',
      errorMessage: pAgeValid
        ? undefined
        : `CHƯA ĐỦ TUỔI KẾT HÔN (Bên thứ hai): ${
            partnerIsMale ? 'Nam phải từ đủ 20 tuổi' : 'Nữ phải từ đủ 18 tuổi'
          } (hiện ${pAge?.years ?? 0} tuổi ${pAge?.months ?? 0} tháng).`,
      confidenceScore: pAgeValid ? 0.99 : 0.25,
    });
  }

  // 3. CCCD 12 số & không trùng nhau giữa 2 bên
  const cccd1 = input.citizenCccd.trim();
  const cccdValid = isValidCccd12(cccd1);
  fieldValidations.push({
    fieldName: 'Số định danh cá nhân (12 số CCCD)',
    providedValue: cccd1,
    valid: cccdValid,
    errorCode: cccdValid ? undefined : 'INVALID_CCCD_FORMAT',
    errorMessage: cccdValid ? undefined : 'Số CCCD phải gồm đúng 12 chữ số hợp lệ.',
    confidenceScore: cccdValid ? 0.99 : 0.4,
  });

  if (extra.partnerCccd && extra.partnerCccd.trim()) {
    const cccd2 = extra.partnerCccd.trim();
    const partnerCccdValid = isValidCccd12(cccd2) && cccd2 !== cccd1;
    fieldValidations.push({
      fieldName: 'Số CCCD Bên kết hôn thứ hai (Không trùng lặp)',
      providedValue: cccd2,
      valid: partnerCccdValid,
      errorCode: partnerCccdValid
        ? undefined
        : cccd2 === cccd1
        ? 'DUPLICATE_PARTNER_CCCD'
        : 'INVALID_PARTNER_CCCD',
      errorMessage: partnerCccdValid
        ? undefined
        : cccd2 === cccd1
        ? 'Số CCCD của hai bên kết hôn không được trùng nhau.'
        : 'Số CCCD của bên kết hôn thứ hai phải gồm đúng 12 chữ số hợp lệ.',
      confidenceScore: partnerCccdValid ? 0.99 : 0.25,
    });
  }

  // 4. Chặn mục đích xác nhận tình trạng hôn nhân mơ hồ
  const purpose = (extra.maritalCertPurpose || '').trim();
  const lowerPurpose = purpose.toLowerCase();
  const vaguePhrases = new Set([
    'bổ sung hồ sơ',
    'việc cá nhân',
    'làm giấy tờ',
    'làm giấy tờ cá nhân',
    'kết hôn',
    'xác nhận độc thân',
  ]);
  const isVague = purpose.length < 15 || vaguePhrases.has(lowerPurpose);
  fieldValidations.push({
    fieldName: 'Mục đích sử dụng Giấy xác nhận tình trạng hôn nhân',
    providedValue: purpose || '(Để trống)',
    valid: !isVague,
    errorCode: !isVague ? undefined : 'VAGUE_MARITAL_PURPOSE',
    errorMessage: !isVague
      ? undefined
      : "Mục đích ghi quá chung chung ('Bổ sung hồ sơ', 'Làm giấy tờ cá nhân'). Bắt buộc ghi rõ mục đích cụ thể (ví dụ: 'Để đăng ký kết hôn với anh/chị [Họ tên] tại UBND...' hoặc 'Để làm thủ tục chuyển nhượng quyền sử dụng đất').",
    confidenceScore: !isVague ? 0.98 : 0.3,
  });

  if (extra.previousMaritalStatus === 'DIVORCED') {
    warnings.push(
      'Người đã ly hôn cần đính kèm bản trích lục Bản án/Quyết định ly hôn đã có hiệu lực pháp luật.'
    );
  }

  return {
    formType: 'TK-KH',
    valid: fieldValidations.every((f) => f.valid),
    fieldValidations,
    warnings,
    verificationBadge: input.qrVerified ? 'VERIFIED_VIA_VNEID_QR' : undefined,
  };
}

function validateTkBtxh(
  input: LocalFormValidationInput,
  refDate: Date
): LocalFormValidationResult {
  const fieldValidations: FieldValidation[] = [];
  const warnings: string[] = [];
  const extra = input.extra || {};

  // 1. Mốc tuổi người cao tuổi (>= 80 hoặc >= 75 hộ nghèo/cận nghèo) hoặc khuyết tật nặng/đặc biệt nặng
  const age = computeExactAge(input.dateOfBirth, refDate);
  const hasSevereDisability =
    extra.disabilityLevel === 'SEVERE' || extra.disabilityLevel === 'EXTREMELY_SEVERE';
  const isPoorOrNearPoor =
    extra.householdStatus === 'POOR' || extra.householdStatus === 'NEAR_POOR';

  const eligible = Boolean(
    hasSevereDisability ||
      (age && !age.isFuture && age.years >= 80) ||
      (age && !age.isFuture && age.years >= 75 && isPoorOrNearPoor)
  );

  fieldValidations.push({
    fieldName: 'Điều kiện hưởng trợ cấp BTXH (NĐ 20/2021 & NĐ 335/2026)',
    providedValue: `${input.dateOfBirth} (${age?.years ?? 0} tuổi) | ${
      hasSevereDisability
        ? 'Khuyết tật nặng/đặc biệt nặng'
        : isPoorOrNearPoor
        ? 'Hộ nghèo/cận nghèo'
        : 'Diện thông thường'
    }`,
    valid: eligible,
    errorCode: eligible ? undefined : 'INELIGIBLE_SOCIAL_PROTECTION_AGE',
    errorMessage: eligible
      ? undefined
      : `CHƯA ĐỦ ĐIỀU KIỆN HƯỞNG TRỢ CẤP: Yêu cầu người cao tuổi từ đủ 80 tuổi (hoặc từ đủ 75 tuổi thuộc hộ nghèo/cận nghèo) hoặc có Giấy xác nhận khuyết tật mức độ nặng/đặc biệt nặng (hiện ${
          age?.years ?? 0
        } tuổi).`,
    confidenceScore: eligible ? 0.99 : 0.3,
  });

  // 2. CCCD 12 số người hưởng
  const cccdValid = isValidCccd12(input.citizenCccd);
  fieldValidations.push({
    fieldName: 'Số định danh cá nhân (12 số CCCD người hưởng)',
    providedValue: input.citizenCccd,
    valid: cccdValid,
    errorCode: cccdValid ? undefined : 'INVALID_CCCD_FORMAT',
    errorMessage: cccdValid ? undefined : 'Số CCCD người hưởng trợ cấp phải gồm đúng 12 chữ số.',
    confidenceScore: cccdValid ? 0.99 : 0.4,
  });

  // 3. Bắt buộc Số tài khoản ngân hàng nhận trợ cấp không dùng tiền mặt (Đề án 06)
  const bankAccount = (extra.bankAccount || '').trim();
  const bankValid = /^[0-9A-Za-z]{8,20}$/.test(bankAccount);
  fieldValidations.push({
    fieldName: 'Số tài khoản ngân hàng nhận trợ cấp (Đề án 06)',
    providedValue: bankAccount || '(Chưa nhập)',
    valid: bankValid,
    errorCode: bankValid ? undefined : 'MISSING_BANK_ACCOUNT',
    errorMessage: bankValid
      ? undefined
      : 'Bắt buộc cung cấp Số tài khoản ngân hàng (8–20 ký tự) để chi trả trợ cấp an sinh xã hội không dùng tiền mặt theo Đề án 06.',
    confidenceScore: bankValid ? 0.98 : 0.4,
  });

  return {
    formType: 'TK-BTXH',
    valid: fieldValidations.every((f) => f.valid),
    fieldValidations,
    warnings,
    verificationBadge: input.qrVerified ? 'VERIFIED_VIA_VNEID_QR' : undefined,
  };
}

/**
 * Main deterministic local validator for all 4 core administrative forms.
 */
export function validateAdministrativeForm(
  input: LocalFormValidationInput
): LocalFormValidationResult {
  const refDate = input.referenceDate || new Date();

  let result: LocalFormValidationResult;
  switch (input.formType) {
    case 'TK-KS':
      result = validateTkKs(input, refDate);
      break;
    case 'TK-KH':
      result = validateTkKh(input, refDate);
      break;
    case 'TK-BTXH':
      result = validateTkBtxh(input, refDate);
      break;
    case 'CT01':
    default:
      result = validateCt01(input, refDate);
      break;
  }

  // Append optional citizen contact validation if provided
  if (input.citizenEmail !== undefined || input.phoneNumber !== undefined) {
    const contactChecks = validateCitizenContact(input.citizenEmail, input.phoneNumber);
    result.fieldValidations.push(...contactChecks);
    result.valid = result.fieldValidations.every((f) => f.valid);
  }

  return result;
}
