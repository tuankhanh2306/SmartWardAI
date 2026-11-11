/**
 * form_tk_ks_fixtures.mjs - Synthetic Fixtures for TK-KS (Birth Registration)
 *
 * Covers Decree 04/2020/TT-BTP rules, including child/parent details, birth certificate cross-checks,
 * and paternity acknowledgment rules when parents are unmarried.
 */

export const TK_KS_FIXTURES = {
  VALID_STANDARD: {
    procedureCode: 'TTHC-HT-01',
    formType: 'TK-KS',
    citizenCccd: '089095012345',
    fullName: 'NGUYỄN MINH KHANG',
    dateOfBirth: '2026-11-01',
    gender: 'Nam',
    address: 'Số 18 Đường Trần Hưng Đạo, Phường Mỹ Xuyên, TP Long Xuyên, Tỉnh An Giang',
    formData: {
      childFullName: 'NGUYỄN MINH KHANG',
      childGender: 'Nam',
      childDob: '2026-11-01',
      childBirthPlace: 'Bệnh viện Sản - Nhi An Giang',
      childEthnicity: 'Kinh',
      childNationality: 'Việt Nam',
      birthCertNumber: 'GCS-2026-8942',
      birthCertIssueDate: '2026-11-02',
      hospitalBirthDate: '2026-11-01',
      motherName: 'LÊ THỊ BÍCH NGỌC',
      hospitalMotherName: 'LÊ THỊ BÍCH NGỌC',
      motherCccd: '089197009876',
      motherDob: '1997-04-20',
      motherAddress: 'Số 18 Đường Trần Hưng Đạo, Phường Mỹ Xuyên, An Giang',
      fatherFullName: 'NGUYỄN VĂN AN',
      fatherCccd: '089095012345',
      fatherDob: '1995-08-15',
      parentsMarried: 'YES',
    },
    expected: {
      overallValid: true,
      errorCount: 0,
    },
  },

  VALID_UNMARRIED_PARENTS_COMBINED: {
    procedureCode: 'TTHC-HT-01',
    formType: 'TK-KS',
    citizenCccd: '079302009876',
    fullName: 'TRẦN GIA HÂN',
    dateOfBirth: '2026-10-15',
    gender: 'Nữ',
    address: 'Phường Bến Nghé, Quận 1, TP.HCM',
    formData: {
      childFullName: 'TRẦN GIA HÂN',
      childGender: 'Nữ',
      childDob: '2026-10-15',
      childBirthPlace: 'Bệnh viện Từ Dũ, TP.HCM',
      childEthnicity: 'Kinh',
      childNationality: 'Việt Nam',
      birthCertNumber: 'GCS-2026-1122',
      birthCertIssueDate: '2026-10-16',
      hospitalBirthDate: '2026-10-15',
      motherName: 'TRẦN THỊ HỒNG NHUNG',
      hospitalMotherName: 'TRẦN THỊ HỒNG NHUNG',
      motherCccd: '079302009876',
      parentsMarried: 'NO',
      combinedPaternityProcedure: 'true',
      fatherFullName: 'NGUYỄN VĂN AN',
      fatherCccd: '089095012345',
    },
    expected: {
      overallValid: true,
      errorCount: 0,
    },
  },

  INVALID_UNMARRIED_FATHER_WITHOUT_COMBINED: {
    procedureCode: 'TTHC-HT-01',
    formType: 'TK-KS',
    citizenCccd: '079302009876',
    fullName: 'TRẦN GIA HÂN',
    dateOfBirth: '2026-10-15',
    gender: 'Nữ',
    address: 'Phường Bến Nghé, Quận 1, TP.HCM',
    formData: {
      childFullName: 'TRẦN GIA HÂN',
      childGender: 'Nữ',
      childDob: '2026-10-15',
      motherName: 'TRẦN THỊ HỒNG NHUNG',
      parentsMarried: 'NO',
      combinedPaternityProcedure: 'false',
      fatherFullName: 'NGUYỄN VĂN AN',
    },
    expected: {
      overallValid: false,
      expectedErrorCode: 'UNMARRIED_FATHER_WITHOUT_COMBINED_PROCEDURE',
    },
  },

  INVALID_DOB_MISMATCH_GCS: {
    procedureCode: 'TTHC-HT-01',
    formType: 'TK-KS',
    citizenCccd: '089095012345',
    fullName: 'NGUYỄN MINH KHANG',
    dateOfBirth: '2026-11-01',
    gender: 'Nam',
    address: 'Phường Mỹ Xuyên, An Giang',
    formData: {
      childFullName: 'NGUYỄN MINH KHANG',
      motherName: 'LÊ THỊ BÍCH NGỌC',
      hospitalMotherName: 'LÊ THỊ BÍCH NGỌC',
      hospitalBirthDate: '2026-11-05', // Mismatch with declaration
      parentsMarried: 'YES',
    },
    expected: {
      overallValid: false,
      expectedErrorCode: 'BIRTH_CERT_DATE_MISMATCH',
    },
  },

  INVALID_FUTURE_DOB: {
    procedureCode: 'TTHC-HT-01',
    formType: 'TK-KS',
    citizenCccd: '089095012345',
    fullName: 'NGUYỄN MINH KHANG',
    dateOfBirth: '2030-01-01', // Future date
    gender: 'Nam',
    address: 'Phường Mỹ Xuyên, An Giang',
    formData: {
      childFullName: 'NGUYỄN MINH KHANG',
      motherName: 'LÊ THỊ BÍCH NGỌC',
      parentsMarried: 'YES',
    },
    expected: {
      overallValid: false,
      expectedErrorCode: 'FUTURE_BIRTH_DATE',
    },
  },
};
