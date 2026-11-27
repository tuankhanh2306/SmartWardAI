import { describe, expect, it } from 'vitest';
import {
  formatDateToDmy,
  formatDmyDateInput,
  normalizeDateToIso,
  parseIsoDate,
  validateAdministrativeForm,
} from '../core/formValidators';

const REF_DATE = new Date('2026-11-18T00:00:00Z');

describe('formValidators — Động cơ kiểm định tất định 4 nhóm tờ khai', () => {
  // ==========================================================================
  // 1. CT01 (TT 116/2026/TT-BCA & NĐ 309/2026/NĐ-CP)
  // ==========================================================================
  it('CT01: Hợp lệ khi đủ 12 số CCCD người khai/chủ hộ, tuổi hợp lệ, xác nhận VNeID & gắn nhãn VERIFIED_VIA_VNEID_QR', () => {
    const res = validateAdministrativeForm({
      formType: 'CT01',
      fullName: 'NGUYỄN MINH TUẤN KHANH',
      citizenCccd: '089205023490',
      dateOfBirth: '2005-06-23',
      address: 'Số 18 Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang',
      citizenEmail: 'congdan@angiang.gov.vn',
      phoneNumber: '0918234567',
      qrVerified: true,
      referenceDate: REF_DATE,
      extra: {
        hostCccdNumber: '089075001122',
        hostDateOfBirth: '1975-03-10',
        vneidHostConfirmed: true,
      },
    });

    expect(res.valid).toBe(true);
    expect(res.verificationBadge).toBe('VERIFIED_VIA_VNEID_QR');
    expect(res.warnings.some((w) => w.includes('VERIFIED_VIA_VNEID_QR'))).toBe(true);
  });

  it('CT01: Chặn khi người khai < 14 tuổi, chủ hộ < 18 tuổi hoặc thiếu xác nhận VNeID chủ hộ', () => {
    const res = validateAdministrativeForm({
      formType: 'CT01',
      fullName: 'NGUYỄN BÉ AN',
      citizenCccd: '089215023490',
      dateOfBirth: '2015-01-01', // 11 tuổi
      address: 'Số 18 Trần Hưng Đạo, Phường Long Xuyên',
      referenceDate: REF_DATE,
      extra: {
        hostCccdNumber: '08909', // sai 12 số
        hostDateOfBirth: '2010-05-01', // 16 tuổi
        vneidHostConfirmed: false,
      },
    });

    expect(res.valid).toBe(false);
    const errorCodes = res.fieldValidations.filter((f) => !f.valid).map((f) => f.errorCode);
    expect(errorCodes).toContain('APPLICANT_UNDER_14');
    expect(errorCodes).toContain('INVALID_HOST_CCCD');
    expect(errorCodes).toContain('HOST_UNDER_18');
    expect(errorCodes).toContain('MISSING_VNEID_HOST_CONFIRMATION');
  });

  // ==========================================================================
  // 2. TK-KS (TT 04/2020/TT-BTP)
  // ==========================================================================
  it('TK-KS: Hợp lệ khi khớp Giấy chứng sinh và cha mẹ đã kết hôn', () => {
    const res = validateAdministrativeForm({
      formType: 'TK-KS',
      fullName: 'NGUYỄN GIA BẢO',
      citizenCccd: '089195001122',
      dateOfBirth: '2026-10-25',
      referenceDate: REF_DATE,
      extra: {
        motherName: 'TRẦN THỊ MAI',
        hospitalMotherName: 'Trần Thị Mai',
        hospitalBirthDate: '2026-10-25',
        fatherName: 'NGUYỄN VĂN HÙNG',
        parentsMarried: 'YES',
      },
    });

    expect(res.valid).toBe(true);
    expect(res.warnings).toHaveLength(0);
  });

  it('TK-KS: Cảnh báo quá hạn 60 ngày khi đăng ký khai sinh trễ', () => {
    const res = validateAdministrativeForm({
      formType: 'TK-KS',
      fullName: 'NGUYỄN GIA BẢO',
      citizenCccd: '089195001122',
      dateOfBirth: '2026-08-01', // > 100 ngày trước REF_DATE
      referenceDate: REF_DATE,
      extra: {
        motherName: 'TRẦN THỊ MAI',
        hospitalMotherName: 'TRẦN THỊ MAI',
        hospitalBirthDate: '2026-08-01',
        parentsMarried: 'YES',
      },
    });

    expect(res.valid).toBe(true);
    expect(res.warnings.some((w) => w.includes('60 ngày'))).toBe(true);
  });

  it('TK-KS: Chặn ngày sinh tương lai, lệch Giấy chứng sinh và cha mẹ chưa kết hôn nhưng ghi tên cha', () => {
    const res = validateAdministrativeForm({
      formType: 'TK-KS',
      fullName: 'NGUYỄN GIA BẢO',
      citizenCccd: '089195001122',
      dateOfBirth: '2026-12-01', // tương lai so với 2026-11-18
      referenceDate: REF_DATE,
      extra: {
        motherName: 'TRẦN THỊ MAI',
        hospitalMotherName: 'TRẦN THỊ LAN',
        hospitalBirthDate: '2026-11-01',
        fatherName: 'NGUYỄN VĂN HÙNG',
        parentsMarried: 'NO',
      },
    });

    expect(res.valid).toBe(false);
    const errorCodes = res.fieldValidations.filter((f) => !f.valid).map((f) => f.errorCode);
    expect(errorCodes).toContain('FUTURE_BIRTH_DATE');
    expect(errorCodes).toContain('BIRTH_CERT_DATE_MISMATCH');
    expect(errorCodes).toContain('BIRTH_CERT_MOTHER_MISMATCH');
    expect(errorCodes).toContain('UNMARRIED_PARENTS_PATERNITY_REQUIRED');
  });

  // ==========================================================================
  // 3. TK-KH (Luật HN&GĐ 2014)
  // ==========================================================================
  it('TK-KH: Hợp lệ khi Nam >= 20, Nữ >= 18, CCCD khác nhau và mục đích rõ ràng', () => {
    const res = validateAdministrativeForm({
      formType: 'TK-KH',
      fullName: 'NGUYỄN VĂN NAM',
      citizenCccd: '089200001111',
      dateOfBirth: '2006-11-18', // Đúng 20 tuổi tại 2026-11-18
      gender: 'Nam',
      referenceDate: REF_DATE,
      extra: {
        partnerDob: '2008-11-18', // Đúng 18 tuổi tại 2026-11-18
        partnerGender: 'Nữ',
        partnerCccd: '089308002222',
        maritalCertPurpose: 'Để đăng ký kết hôn với chị Lê Thị Hoa tại UBND Phường Long Xuyên',
      },
    });

    expect(res.valid).toBe(true);
  });

  it('TK-KH: Chặn Nam 19 tuổi 11 tháng (thiếu 1 ngày), trùng CCCD và mục đích mơ hồ VAGUE_MARITAL_PURPOSE', () => {
    const res = validateAdministrativeForm({
      formType: 'TK-KH',
      fullName: 'NGUYỄN VĂN NAM',
      citizenCccd: '089206001111',
      dateOfBirth: '2006-11-19', // Thiếu đúng 1 ngày để đủ 20 tuổi tại 2026-11-18
      gender: 'Nam',
      referenceDate: REF_DATE,
      extra: {
        partnerDob: '2008-11-19', // Thiếu 1 ngày để đủ 18 tuổi
        partnerGender: 'Nữ',
        partnerCccd: '089206001111', // Trùng CCCD
        maritalCertPurpose: 'Bổ sung hồ sơ',
      },
    });

    expect(res.valid).toBe(false);
    const errorCodes = res.fieldValidations.filter((f) => !f.valid).map((f) => f.errorCode);
    expect(errorCodes).toContain('UNDERAGE_MARRIAGE');
    expect(errorCodes).toContain('PARTNER_UNDERAGE_MARRIAGE');
    expect(errorCodes).toContain('DUPLICATE_PARTNER_CCCD');
    expect(errorCodes).toContain('VAGUE_MARITAL_PURPOSE');
  });

  // ==========================================================================
  // 4. TK-BTXH (Luật BHXH 2024, NĐ 20/2021 & NĐ 335/2026 & Đề án 06)
  // ==========================================================================
  it('TK-BTXH: Hợp lệ cho người >= 75 tuổi diện thường hoặc >= 70 tuổi hộ nghèo có STK ngân hàng (Luật BHXH 2024)', () => {
    const elder76 = validateAdministrativeForm({
      formType: 'TK-BTXH',
      fullName: 'PHẠM VĂN BẢY',
      citizenCccd: '089050009988',
      dateOfBirth: '1950-05-01', // 76 tuổi (>= 75 tuổi diện thường)
      referenceDate: REF_DATE,
      extra: {
        householdStatus: 'NORMAL',
        disabilityLevel: 'NONE',
        bankAccount: '102003456789',
      },
    });
    expect(elder76.valid).toBe(true);

    const poor71 = validateAdministrativeForm({
      formType: 'TK-BTXH',
      fullName: 'TRẦN THỊ TÁM',
      citizenCccd: '089055009977',
      dateOfBirth: '1955-10-01', // 71 tuổi (>= 70 tuổi hộ nghèo)
      referenceDate: REF_DATE,
      extra: {
        householdStatus: 'POOR',
        disabilityLevel: 'NONE',
        bankAccount: '012345678901',
      },
    });
    expect(poor71.valid).toBe(true);
  });

  it('TK-BTXH: Hợp lệ cho người khuyết tật nặng dưới 70 tuổi khi có STK ngân hàng', () => {
    const res = validateAdministrativeForm({
      formType: 'TK-BTXH',
      fullName: 'LÊ VĂN TƯ',
      citizenCccd: '089085003344',
      dateOfBirth: '1985-02-02',
      referenceDate: REF_DATE,
      extra: {
        householdStatus: 'NORMAL',
        disabilityLevel: 'SEVERE',
        bankAccount: '9988776655',
      },
    });
    expect(res.valid).toBe(true);
  });

  it('TK-BTXH: Chặn khi 70 tuổi diện thường không khuyết tật và thiếu STK ngân hàng Đề án 06', () => {
    const res = validateAdministrativeForm({
      formType: 'TK-BTXH',
      fullName: 'NGUYỄN VĂN SÁU',
      citizenCccd: '089056001122',
      dateOfBirth: '1956-01-01', // 70 tuổi (chưa đủ 75 diện thường)
      referenceDate: REF_DATE,
      extra: {
        householdStatus: 'NORMAL',
        disabilityLevel: 'NONE',
        bankAccount: '',
      },
    });

    expect(res.valid).toBe(false);
    const errorCodes = res.fieldValidations.filter((f) => !f.valid).map((f) => f.errorCode);
    expect(errorCodes).toContain('INELIGIBLE_SOCIAL_PROTECTION_AGE');
    expect(errorCodes).toContain('MISSING_BANK_ACCOUNT');
  });

  it('CT01: Hợp lệ khi nộp không yêu cầu xác nhận chủ hộ (chủ sở hữu nhà tự khai) nhưng chặn CCCD đầu 000', () => {
    const res = validateAdministrativeForm({
      formType: 'CT01',
      fullName: 'TRẦN VĂN MINH',
      citizenCccd: '000205023490', // Mã tỉnh 000 không hợp lệ
      dateOfBirth: '1995-04-12',
      address: 'Số 25 Lý Tự Trọng, Phường Long Xuyên',
      referenceDate: REF_DATE,
      extra: {
        requiresHostConsent: false,
      },
    });
    expect(res.valid).toBe(false);
    expect(res.fieldValidations.some((f) => f.errorCode === 'INVALID_CCCD_FORMAT')).toBe(true);
  });

  it('TK-KH: Cảnh báo xuất trình bản án ly hôn khi người khai từng ly hôn', () => {
    const res = validateAdministrativeForm({
      formType: 'TK-KH',
      fullName: 'LÊ THỊ HOA',
      citizenCccd: '089194008877',
      dateOfBirth: '1994-07-20',
      gender: 'Nữ',
      referenceDate: REF_DATE,
      extra: {
        maritalCertPurpose: 'Để đăng ký kết hôn với anh Nguyễn Văn Nam tại UBND Phường Long Xuyên',
        previousMaritalStatus: 'DIVORCED',
      },
    });
    expect(res.valid).toBe(true);
    expect(res.warnings.some((w) => w.includes('Bản án/Quyết định ly hôn'))).toBe(true);
  });

  // ==========================================================================
  // 5. DD-MM-YYYY Format & Conversion Helpers
  // ==========================================================================
  it('hỗ trợ chuẩn định dạng dd-mm-yyyy trong app Mobile & chặn ngày không tồn tại như 31-02-2005', () => {
    expect(formatDmyDateInput('23062005')).toBe('23-06-2005');
    expect(formatDmyDateInput('23-06-2005')).toBe('23-06-2005');
    expect(formatDateToDmy('2005-06-23')).toBe('23-06-2005');
    expect(normalizeDateToIso('23-06-2005')).toBe('2005-06-23');
    expect(parseIsoDate('31-02-2005')).toBeNull();
    expect(parseIsoDate('15-13-2005')).toBeNull();

    const ct01Dmy = validateAdministrativeForm({
      formType: 'CT01',
      fullName: 'NGUYỄN MINH TUẤN KHANH',
      citizenCccd: '089205023490',
      dateOfBirth: '23-06-2005',
      address: 'Số 18 Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang',
      referenceDate: REF_DATE,
      extra: {
        hostCccdNumber: '089075001122',
        hostDateOfBirth: '10-03-1975',
        vneidHostConfirmed: true,
      },
    });
    expect(ct01Dmy.valid).toBe(true);

    const tksDmy = validateAdministrativeForm({
      formType: 'TK-KS',
      fullName: 'NGUYỄN GIA BẢO',
      citizenCccd: '089195001122',
      dateOfBirth: '25-10-2026',
      referenceDate: REF_DATE,
      extra: {
        motherName: 'TRẦN THỊ MAI',
        hospitalMotherName: 'TRẦN THỊ MAI',
        hospitalBirthDate: '25-10-2026',
        parentsMarried: 'YES',
      },
    });
    expect(tksDmy.valid).toBe(true);

    const tkkhDmy = validateAdministrativeForm({
      formType: 'TK-KH',
      fullName: 'NGUYỄN VĂN NAM',
      citizenCccd: '089200001111',
      dateOfBirth: '18-11-2006',
      gender: 'Nam',
      referenceDate: REF_DATE,
      extra: {
        partnerDob: '18-11-2008',
        partnerGender: 'Nữ',
        partnerCccd: '089308002222',
        maritalCertPurpose: 'Để đăng ký kết hôn với chị Lê Thị Hoa tại UBND Phường Long Xuyên',
      },
    });
    expect(tkkhDmy.valid).toBe(true);
  });
});
