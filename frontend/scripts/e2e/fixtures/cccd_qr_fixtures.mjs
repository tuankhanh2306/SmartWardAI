/**
 * cccd_qr_fixtures.mjs - Synthetic QR CCCD Fixtures & BCA 7-Field Parser
 *
 * Implements the official Ministry of Public Security (BCA) 7-field QR standard:
 * CCCD_12_DIGITS|OLD_ID_9_DIGITS|FULL_NAME|DOB_DDMMYYYY|GENDER|ADDRESS|ISSUE_DATE_DDMMYYYY
 */

export const BCA_PROVINCE_CODES = [
  '001', '002', '004', '006', '008', '010', '011', '012', '014', '015',
  '017', '019', '020', '022', '024', '025', '026', '027', '030', '031',
  '033', '034', '035', '036', '037', '038', '040', '042', '044', '045',
  '046', '048', '049', '051', '052', '054', '056', '058', '060', '062',
  '064', '066', '067', '068', '070', '072', '074', '075', '077', '079',
  '080', '082', '083', '084', '086', '087', '089', '091', '092', '093',
  '094', '095', '096'
];

export function generateSyntheticCccdQr(options = {}) {
  const {
    provinceCode = '089', // An Giang default
    birthDateStr = '15081995', // DDMMYYYY
    gender = 'Nam',
    fullName = 'NGUYỄN VĂN AN',
    oldId = '251234567',
    address = 'Số 18 Đường Trần Hưng Đạo, Phường Mỹ Xuyên, TP Long Xuyên, Tỉnh An Giang',
    issueDateStr = '25042021', // DDMMYYYY
    sequence = '012345',
    corruption = null,
  } = options;

  const birthYear = parseInt(birthDateStr.slice(4, 8), 10);
  let centuryGenderDigit = '0';
  if (birthYear >= 1900 && birthYear <= 1999) {
    centuryGenderDigit = gender === 'Nam' ? '0' : '1';
  } else if (birthYear >= 2000 && birthYear <= 2099) {
    centuryGenderDigit = gender === 'Nam' ? '2' : '3';
  } else if (birthYear >= 2100 && birthYear <= 2199) {
    centuryGenderDigit = gender === 'Nam' ? '4' : '5';
  }

  const yearTwoDigits = String(birthYear % 100).padStart(2, '0');
  let cccdNumber = `${provinceCode}${centuryGenderDigit}${yearTwoDigits}${sequence}`;

  switch (corruption) {
    case 'SHORT_LENGTH':
      cccdNumber = cccdNumber.slice(0, 11);
      break;
    case 'LONG_LENGTH':
      cccdNumber = `${cccdNumber}9`;
      break;
    case 'INVALID_PROVINCE_000':
      cccdNumber = `000${cccdNumber.slice(3)}`;
      break;
    case 'INVALID_PROVINCE_999':
      cccdNumber = `999${cccdNumber.slice(3)}`;
      break;
    case 'CENTURY_GENDER_MISMATCH':
      cccdNumber = `${provinceCode}2${yearTwoDigits}${sequence}`; // 2000s digit for 1900s birth
      break;
    case 'YEAR_MISMATCH':
      cccdNumber = `${provinceCode}${centuryGenderDigit}98${sequence}`;
      break;
    case 'FUTURE_ISSUE_DATE':
      return `${cccdNumber}|${oldId}|${fullName}|${birthDateStr}|${gender}|${address}|01012035`;
    case 'MISSING_FIELD_6_PARTS':
      return `${cccdNumber}|${oldId}|${fullName}|${birthDateStr}|${gender}|${address}`;
    case 'WRONG_DELIMITER_COMMA':
      return `${cccdNumber},${oldId},${fullName},${birthDateStr},${gender},${address},${issueDateStr}`;
    case 'NO_OLD_ID':
      return `${cccdNumber}||${fullName}|${birthDateStr}|${gender}|${address}|${issueDateStr}`;
    default:
      break;
  }

  return `${cccdNumber}|${oldId}|${fullName}|${birthDateStr}|${gender}|${address}|${issueDateStr}`;
}

export const STATIC_CCCD_FIXTURES = {
  VALID_AN_GIANG_MALE_1995: {
    rawQr: '089095012345|251000123|NGUYỄN VĂN AN|15081995|Nam|Số 18 Đường Trần Hưng Đạo, Phường Mỹ Xuyên, TP Long Xuyên, Tỉnh An Giang|25042021',
    parsed: {
      cccdNumber: '089095012345',
      oldIdNumber: '251000123',
      fullName: 'NGUYỄN VĂN AN',
      dateOfBirth: '1995-08-15',
      gender: 'Nam',
      address: 'Số 18 Đường Trần Hưng Đạo, Phường Mỹ Xuyên, TP Long Xuyên, Tỉnh An Giang',
      issueDate: '2021-04-25',
    },
  },
  VALID_HCMC_FEMALE_2002_NO_OLD_ID: {
    rawQr: '079302009876||TRẦN THỊ HỒNG NHUNG|12032002|Nữ|Số 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh|10102022',
    parsed: {
      cccdNumber: '079302009876',
      oldIdNumber: '',
      fullName: 'TRẦN THỊ HỒNG NHUNG',
      dateOfBirth: '2002-03-12',
      gender: 'Nữ',
      address: 'Số 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      issueDate: '2022-10-10',
    },
  },
  VALID_HANOI_ELDERLY_MALE_1948: {
    rawQr: '001048005678|012345678|LÊ VĂN HÒA|01011948|Nam|Số 12 Tràng Thi, Phường Hàng Trống, Quận Hoàn Kiếm, Hà Nội|15052021',
    parsed: {
      cccdNumber: '001048005678',
      oldIdNumber: '012345678',
      fullName: 'LÊ VĂN HÒA',
      dateOfBirth: '1948-01-01',
      gender: 'Nam',
      address: 'Số 12 Tràng Thi, Phường Hàng Trống, Quận Hoàn Kiếm, Hà Nội',
      issueDate: '2021-05-15',
    },
  },
  VALID_FEMALE_2000_LEAP_YEAR: {
    rawQr: '079300012345||VÕ THỊ MAI|29022000|Nữ|Phường Bến Nghé, Quận 1, TP.HCM|15032021',
    parsed: {
      cccdNumber: '079300012345',
      oldIdNumber: '',
      fullName: 'VÕ THỊ MAI',
      dateOfBirth: '2000-02-29',
      gender: 'Nữ',
      address: 'Phường Bến Nghé, Quận 1, TP.HCM',
      issueDate: '2021-03-15',
    },
  },
  INVALID_LENGTH_11_DIGITS: '08909501234|251000123|NGUYỄN VĂN AN|15081995|Nam|Số 18 Đường Trần Hưng Đạo, An Giang|25042021',
  INVALID_PROVINCE_CODE_000: '000095012345|251000123|NGUYỄN VĂN AN|15081995|Nam|Số 18 Đường Trần Hưng Đạo, An Giang|25042021',
  INVALID_PROVINCE_CODE_999: '999095012345|251000123|NGUYỄN VĂN AN|15081995|Nam|Số 18 Đường Trần Hưng Đạo, An Giang|25042021',
  INVALID_CENTURY_GENDER_MISMATCH: '089295012345|251000123|NGUYỄN VĂN AN|15081995|Nam|Số 18 Đường Trần Hưng Đạo, An Giang|25042021',
  INVALID_FUTURE_ISSUE_DATE: '089095012345|251000123|NGUYỄN VĂN AN|15081995|Nam|Số 18 Đường Trần Hưng Đạo, An Giang|01012035',
  INVALID_WRONG_DELIMITER_COMMA: '089095012345,251000123,NGUYỄN VĂN AN,15081995,Nam,Số 18 Đường Trần Hưng Đạo,25042021',
  CORRUPTED_MISSING_PARTS: '089095012345|251000123|NGUYỄN VĂN AN',
};

/**
 * Standard BCA 7-Field QR Decoder
 */
export function parseCccdQrString(rawQr) {
  if (!rawQr || typeof rawQr !== 'string') {
    return { valid: false, error: 'Empty or non-string QR payload' };
  }

  const parts = rawQr.split('|');
  if (parts.length < 6 || parts.length > 7) {
    return { valid: false, error: `Invalid field count: expected 7 fields separated by '|', got ${parts.length}` };
  }

  const cccdNumber = parts[0].trim();
  const oldIdNumber = parts[1] ? parts[1].trim() : '';
  const fullName = parts[2].trim();
  const dobRaw = parts[3].trim();
  const gender = parts[4].trim();
  const address = parts[5].trim();
  const issueDateRaw = parts[6] ? parts[6].trim() : '';

  // Validate 12-digit CCCD
  if (!/^\d{12}$/.test(cccdNumber)) {
    return { valid: false, error: `CCCD must be exactly 12 digits, got '${cccdNumber}'` };
  }

  // Parse DOB (DDMMYYYY)
  let dateOfBirth = '';
  if (/^\d{8}$/.test(dobRaw)) {
    const day = dobRaw.slice(0, 2);
    const month = dobRaw.slice(2, 4);
    const year = dobRaw.slice(4, 8);
    dateOfBirth = `${year}-${month}-${day}`;
  } else {
    return { valid: false, error: `Invalid DOB format in QR: '${dobRaw}', expected DDMMYYYY` };
  }

  // Parse Issue Date (DDMMYYYY)
  let issueDate = '';
  if (/^\d{8}$/.test(issueDateRaw)) {
    const day = issueDateRaw.slice(0, 2);
    const month = issueDateRaw.slice(2, 4);
    const year = issueDateRaw.slice(4, 8);
    issueDate = `${year}-${month}-${day}`;
  }

  return {
    valid: true,
    data: {
      cccdNumber,
      oldIdNumber,
      fullName,
      dateOfBirth,
      gender,
      address,
      issueDate,
    },
  };
}
