/**
 * form_tk_btxh_fixtures.mjs - Synthetic Fixtures for TK-BTXH (Social Protection Allowance)
 *
 * Covers Decree 20/2021/ND-CP & Social Insurance Law 2024:
 * Elderly without pension threshold (>= 75 years, or >= 70 years for poor/near-poor households),
 * disability allowances, and mandatory cashless social protection accounts (Project 06).
 */

export const TK_BTXH_FIXTURES = {
  VALID_ELDERLY_76_YEARS: {
    procedureCode: 'TTHC-BT-01',
    formType: 'TK-BTXH',
    citizenCccd: '001048005678',
    fullName: 'LÊ VĂN HÒA',
    dateOfBirth: '1948-01-01', // 78 years >= 75
    gender: 'Nam',
    address: 'Số 12 Tràng Thi, Phường Hàng Trống, Quận Hoàn Kiếm, Hà Nội',
    formData: {
      hasPension: 'NO',
      householdStatus: 'NORMAL',
      disabilityLevel: 'NONE',
      bankAccount: '102837465928',
      bankName: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam (Agribank)',
    },
    expected: {
      overallValid: true,
      errorCount: 0,
    },
  },

  VALID_POOR_ELDERLY_71_YEARS: {
    procedureCode: 'TTHC-BT-01',
    formType: 'TK-BTXH',
    citizenCccd: '089053001234',
    fullName: 'TRẦN THỊ ÚT',
    dateOfBirth: '1953-05-10', // 73 years (>= 70 for poor household)
    gender: 'Nữ',
    address: 'Xã An Phú, Huyện An Phú, Tỉnh An Giang',
    formData: {
      hasPension: 'NO',
      householdStatus: 'POOR',
      poorHouseholdId: 'HN-AG-2026-99',
      disabilityLevel: 'NONE',
      bankAccount: '98765432101',
      bankName: 'Agribank Chi nhánh An Phú',
    },
    expected: {
      overallValid: true,
      errorCount: 0,
    },
  },

  VALID_SEVERE_DISABILITY: {
    procedureCode: 'TTHC-BT-01',
    formType: 'TK-BTXH',
    citizenCccd: '089095012345',
    fullName: 'NGUYỄN VĂN AN',
    dateOfBirth: '1995-08-15',
    gender: 'Nam',
    address: 'Số 18 Đường Trần Hưng Đạo, An Giang',
    formData: {
      hasPension: 'NO',
      householdStatus: 'NORMAL',
      disabilityLevel: 'DAC_BIET_NANG',
      disabilityCertNumber: 'GCN-KT-2025-01',
      guardianName: 'NGUYỄN THỊ BÌNH',
      guardianCccd: '089165009876',
      guardianRelation: 'Mẹ đẻ',
      bankAccount: '123456789012',
      bankName: 'Vietcombank',
    },
    expected: {
      overallValid: true,
      errorCount: 0,
    },
  },

  INVALID_AGE_72_NORMAL_HOUSEHOLD: {
    procedureCode: 'TTHC-BT-01',
    formType: 'TK-BTXH',
    citizenCccd: '089054001234',
    fullName: 'NGUYỄN VĂN BA',
    dateOfBirth: '1954-05-10', // 72 years (not yet 75 and normal household)
    gender: 'Nam',
    address: 'Xã An Phú, An Giang',
    formData: {
      hasPension: 'NO',
      householdStatus: 'NORMAL',
      disabilityLevel: 'NONE',
      bankAccount: '12345678901',
    },
    expected: {
      overallValid: false,
      expectedErrorCode: 'INELIGIBLE_SOCIAL_PROTECTION_AGE',
    },
  },

  INVALID_MISSING_BANK_ACCOUNT: {
    procedureCode: 'TTHC-BT-01',
    formType: 'TK-BTXH',
    citizenCccd: '001048005678',
    fullName: 'LÊ VĂN HÒA',
    dateOfBirth: '1948-01-01',
    gender: 'Nam',
    address: 'Hà Nội',
    formData: {
      hasPension: 'NO',
      householdStatus: 'NORMAL',
      disabilityLevel: 'NONE',
      bankAccount: '', // Missing cashless bank account (Project 06)
    },
    expected: {
      overallValid: false,
      expectedErrorCode: 'MISSING_BANK_ACCOUNT',
    },
  },
};
