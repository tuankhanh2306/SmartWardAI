/**
 * form_tk_kh_fixtures.mjs - Synthetic Fixtures for TK-KH (Marriage & Marital Status)
 *
 * Covers Law on Marriage and Family 2014 & Circular 04/2020/TT-BTP:
 * Separation of Marriage Registration mode vs Marital Status Certificate mode,
 * statutory age rules (Male >= 20, Female >= 18), and prohibition of vague certification purposes.
 */

export const TK_KH_FIXTURES = {
  VALID_MARRIAGE_REGISTRATION: {
    procedureCode: 'TTHC-HT-02',
    formType: 'TK-KH',
    citizenCccd: '089095012345',
    fullName: 'NGUYỄN VĂN AN',
    dateOfBirth: '1995-08-15', // Male 31 >= 20
    gender: 'Nam',
    address: 'Số 18 Đường Trần Hưng Đạo, Phường Mỹ Xuyên, TP Long Xuyên, Tỉnh An Giang',
    formData: {
      marriageMode: 'MARRIAGE_REGISTRATION',
      maritalCertPurpose: 'Để làm thủ tục đăng ký kết hôn với chị Trần Thị Hồng Nhung tại UBND Phường Bến Nghé',
      ethnicity: 'Kinh',
      nationality: 'Việt Nam',
      previousMaritalStatus: 'NEVER_MARRIED',
      partnerName: 'TRẦN THỊ HỒNG NHUNG',
      partnerCccd: '079302009876',
      partnerDob: '2002-03-12', // Female 24 >= 18
      partnerGender: 'Nữ',
      partnerEthnicity: 'Kinh',
      partnerNationality: 'Việt Nam',
      partnerAddress: 'Số 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    },
    expected: {
      overallValid: true,
      errorCount: 0,
    },
  },

  VALID_MARITAL_STATUS_CERTIFICATE_SPECIFIC: {
    procedureCode: 'TTHC-HT-03',
    formType: 'TK-KH',
    citizenCccd: '089095012345',
    fullName: 'NGUYỄN VĂN AN',
    dateOfBirth: '1995-08-15',
    gender: 'Nam',
    address: 'Số 18 Đường Trần Hưng Đạo, Phường Mỹ Xuyên, TP Long Xuyên, Tỉnh An Giang',
    formData: {
      marriageMode: 'MARITAL_STATUS_CERTIFICATE',
      previousMaritalStatus: 'NEVER_MARRIED',
      maritalCertPurpose: 'Để làm thủ tục đăng ký kết hôn với chị Trần Thị Hồng Nhung tại UBND Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    },
    expected: {
      overallValid: true,
      errorCount: 0,
    },
  },

  VALID_DIVORCED_WITH_JUDGMENT: {
    procedureCode: 'TTHC-HT-02',
    formType: 'TK-KH',
    citizenCccd: '089095012345',
    fullName: 'NGUYỄN VĂN AN',
    dateOfBirth: '1995-08-15',
    gender: 'Nam',
    address: 'Phường Mỹ Xuyên, An Giang',
    formData: {
      marriageMode: 'MARRIAGE_REGISTRATION',
      previousMaritalStatus: 'DIVORCED',
      divorceJudgmentNumber: 'BA-2024-56/HNGĐ-ST',
      divorceJudgmentDate: '2024-06-20',
      divorceCourtName: 'Tòa án nhân dân TP Long Xuyên, Tỉnh An Giang',
      partnerName: 'TRẦN THỊ HỒNG NHUNG',
      partnerCccd: '079302009876',
      partnerDob: '2002-03-12',
      partnerGender: 'Nữ',
      maritalCertPurpose: 'Để làm thủ tục đăng ký kết hôn mới sau khi ly hôn hợp pháp',
    },
    expected: {
      overallValid: true,
      errorCount: 0,
    },
  },

  INVALID_UNDERAGE_MALE: {
    procedureCode: 'TTHC-HT-02',
    formType: 'TK-KH',
    citizenCccd: '089207012345',
    fullName: 'LÊ VĂN HÙNG',
    dateOfBirth: '2007-06-10', // Male 19 years old (< 20)
    gender: 'Nam',
    address: 'Phường Mỹ Xuyên, An Giang',
    formData: {
      marriageMode: 'MARRIAGE_REGISTRATION',
      partnerName: 'TRẦN THỊ HỒNG NHUNG',
      partnerDob: '2005-01-01',
      partnerGender: 'Nữ',
    },
    expected: {
      overallValid: false,
      expectedErrorCode: 'UNDERAGE_MARRIAGE',
    },
  },

  INVALID_UNDERAGE_FEMALE: {
    procedureCode: 'TTHC-HT-02',
    formType: 'TK-KH',
    citizenCccd: '089095012345',
    fullName: 'NGUYỄN VĂN AN',
    dateOfBirth: '1995-08-15',
    gender: 'Nam',
    address: 'Phường Mỹ Xuyên, An Giang',
    formData: {
      marriageMode: 'MARRIAGE_REGISTRATION',
      partnerName: 'NGUYỄN THỊ MAI',
      partnerDob: '2009-08-20', // Female 17 years old (< 18)
      partnerGender: 'Nữ',
    },
    expected: {
      overallValid: false,
      expectedErrorCode: 'UNDERAGE_MARRIAGE',
    },
  },

  INVALID_VAGUE_MARITAL_PURPOSE: {
    procedureCode: 'TTHC-HT-03',
    formType: 'TK-KH',
    citizenCccd: '089095012345',
    fullName: 'NGUYỄN VĂN AN',
    dateOfBirth: '1995-08-15',
    gender: 'Nam',
    address: 'Phường Mỹ Xuyên, An Giang',
    formData: {
      marriageMode: 'MARITAL_STATUS_CERTIFICATE',
      maritalCertPurpose: 'việc cá nhân', // Banned vague purpose
    },
    expected: {
      overallValid: false,
      expectedErrorCode: 'VAGUE_MARITAL_PURPOSE',
    },
  },
};
