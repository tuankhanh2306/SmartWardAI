import { describe, expect, it } from 'vitest';
import { validateAdministrativeForm } from '../core/formValidators';

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
  // 4. TK-BTXH (NĐ 20/2021 & NĐ 335/2026 & Đề án 06)
  // ==========================================================================
  it('TK-BTXH: Hợp lệ cho người >= 80 tuổi hoặc >= 75 tuổi hộ nghèo có STK ngân hàng', () => {
    const elder80 = validateAdministrativeForm({
      formType: 'TK-BTXH',
      fullName: 'PHẠM VĂN BẢY',
      citizenCccd: '089045009988',
      dateOfBirth: '1945-05-01', // 81 tuổi
      referenceDate: REF_DATE,
      extra: {
        householdStatus: 'NORMAL',
        disabilityLevel: 'NONE',
        bankAccount: '102003456789',
      },
    });
    expect(elder80.valid).toBe(true);

    const poor75 = validateAdministrativeForm({
      formType: 'TK-BTXH',
      fullName: 'TRẦN THỊ TÁM',
      citizenCccd: '089050009977',
      dateOfBirth: '1950-10-01', // 76 tuổi
      referenceDate: REF_DATE,
      extra: {
        householdStatus: 'POOR',
        disabilityLevel: 'NONE',
        bankAccount: '012345678901',
      },
    });
    expect(poor75.valid).toBe(true);
  });

  it('TK-BTXH: Hợp lệ cho người khuyết tật nặng dưới 75 tuổi khi có STK ngân hàng', () => {
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
      dateOfBirth: '1956-01-01', // 70 tuổi
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
});
