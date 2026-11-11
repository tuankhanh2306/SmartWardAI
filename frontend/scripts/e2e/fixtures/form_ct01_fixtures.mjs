/**
 * form_ct01_fixtures.mjs - Synthetic Fixtures for CT01 (Residence Declaration)
 *
 * Covers Decree 66/2023/TT-BCA rules, including host consent fields for rented/borrowed residences.
 */

export const CT01_FIXTURES = {
  VALID_STANDARD_OWNER: {
    procedureCode: 'TTHC-CR-01',
    formType: 'CT01',
    citizenCccd: '089095012345',
    fullName: 'NGUYỄN VĂN AN',
    dateOfBirth: '1995-08-15',
    gender: 'Nam',
    cccdIssueDate: '2021-04-25',
    address: 'Số 18 Đường Trần Hưng Đạo, Phường Mỹ Xuyên, TP Long Xuyên, Tỉnh An Giang',
    formData: {
      residenceType: 'CHINH_CHU',
      declarationScope: 'Đăng ký thường trú theo diện chủ hộ',
      phone: '0901234567',
    },
    expected: {
      overallValid: true,
      errorCount: 0,
    },
  },

  VALID_THUE_MUON_O_NHO_WITH_HOST: {
    procedureCode: 'TTHC-CR-01',
    formType: 'CT01',
    citizenCccd: '079302009876',
    fullName: 'TRẦN THỊ HỒNG NHUNG',
    dateOfBirth: '2002-03-12',
    gender: 'Nữ',
    cccdIssueDate: '2022-10-10',
    address: 'Số 123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    formData: {
      residenceType: 'THUE_MUON_O_NHO',
      hostName: 'LÊ VĂN HÒA',
      hostCccd: '001048005678',
      hostRelation: 'Chủ nhà cho thuê',
      declarationScope: 'Đăng ký tạm trú theo diện thuê nhà',
      phone: '0912345678',
    },
    expected: {
      overallValid: true,
      errorCount: 0,
    },
  },

  INVALID_THUE_MUON_MISSING_HOST: {
    procedureCode: 'TTHC-CR-01',
    formType: 'CT01',
    citizenCccd: '089095012345',
    fullName: 'NGUYỄN VĂN AN',
    dateOfBirth: '1995-08-15',
    gender: 'Nam',
    cccdIssueDate: '2021-04-25',
    address: 'Số 18 Đường Trần Hưng Đạo, Phường Mỹ Xuyên, TP Long Xuyên, Tỉnh An Giang',
    formData: {
      residenceType: 'THUE_MUON_O_NHO',
      // Missing hostName, hostCccd, hostRelation
      declarationScope: 'Đăng ký thường trú theo diện ở nhờ',
      phone: '0901234567',
    },
    expected: {
      overallValid: false,
      expectedErrorCode: 'MISSING_HOST_CONSENT',
    },
  },

  INVALID_CCCD_CENTURY_GENDER: {
    procedureCode: 'TTHC-CR-01',
    formType: 'CT01',
    citizenCccd: '079201012345', // Century digit '2' for birth year 1995 male (invalid)
    fullName: 'NGUYỄN VĂN AN',
    dateOfBirth: '1995-08-15',
    gender: 'Nam',
    cccdIssueDate: '2021-10-10',
    address: 'Phường Bến Nghé, Quận 1, TP.HCM',
    formData: {
      residenceType: 'CHINH_CHU',
    },
    expected: {
      overallValid: false,
      expectedErrorCode: 'INVALID_CCCD_CENTURY_GENDER',
    },
  },

  INVALID_SHORT_ADDRESS: {
    procedureCode: 'TTHC-CR-01',
    formType: 'CT01',
    citizenCccd: '089095012345',
    fullName: 'NGUYỄN VĂN AN',
    dateOfBirth: '1995-08-15',
    gender: 'Nam',
    cccdIssueDate: '2021-04-25',
    address: 'Xã A', // Less than 8 characters
    formData: {
      residenceType: 'CHINH_CHU',
    },
    expected: {
      overallValid: false,
      expectedErrorCode: 'INVALID_ADDRESS',
    },
  },
};
