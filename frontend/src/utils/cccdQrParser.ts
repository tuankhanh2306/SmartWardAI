export interface DecodedCccdQr {
  cccdNumber: string;
  oldIdNumber: string;
  fullName: string;
  dateOfBirth: string; // ISO yyyy-MM-dd
  gender: 'Nam' | 'Nữ';
  address: string;
  issueDate: string; // ISO yyyy-MM-dd
  rawQr: string;
}

export type DiscrepancyLevel = 'MATCH' | 'WARNING' | 'CONFLICT';

export interface QrFieldDiscrepancy {
  fieldKey: 'cccdNumber' | 'fullName' | 'dateOfBirth' | 'gender' | 'address';
  fieldLabel: string;
  typedValue: string;
  qrValue: string;
  level: DiscrepancyLevel;
  message: string;
}

export interface QrParseResult {
  valid: boolean;
  error?: string;
  data?: DecodedCccdQr;
}

/**
 * Parses Vietnamese BCA 7-field CCCD QR Code string:
 * CCCD_12|OLD_CMND_9|FULL_NAME|DOB_DDMMYYYY|GENDER|ADDRESS|ISSUE_DATE_DDMMYYYY
 */
export function parseCccdQrString(rawQr: string): QrParseResult {
  if (!rawQr || typeof rawQr !== 'string') {
    return { valid: false, error: 'Dữ liệu mã QR trống hoặc không đúng định dạng chuỗi.' };
  }

  const cleanQr = rawQr.trim();
  const parts = cleanQr.split('|');

  if (parts.length < 6 || parts.length > 7) {
    return {
      valid: false,
      error: `Cấu trúc mã QR không hợp lệ: Yêu cầu 6-7 trường ngăn cách bởi ký tự '|', nhận được ${parts.length} trường.`,
    };
  }

  const cccdNumber = parts[0].trim();
  const oldIdNumber = parts[1] ? parts[1].trim() : '';
  const fullName = parts[2].trim();
  const dobRaw = parts[3].trim();
  const rawGender = parts[4].trim();
  const address = parts[5].trim();
  const issueDateRaw = parts[6] ? parts[6].trim() : '';

  // 1. Validate 12-digit CCCD
  if (!/^\d{12}$/.test(cccdNumber)) {
    return { valid: false, error: `Số định danh CCCD phải gồm đúng 12 chữ số, nhận được '${cccdNumber}'.` };
  }

  // 2. Parse Date of Birth into yyyy-MM-dd
  let dateOfBirth = '';
  if (/^\d{8}$/.test(dobRaw)) {
    const day = dobRaw.slice(0, 2);
    const month = dobRaw.slice(2, 4);
    const year = dobRaw.slice(4, 8);
    dateOfBirth = `${year}-${month}-${day}`;
  } else if (/^\d{6}$/.test(dobRaw)) {
    const day = dobRaw.slice(0, 2);
    const month = dobRaw.slice(2, 4);
    const yy = parseInt(dobRaw.slice(4, 6), 10);
    const year = yy <= 40 ? 2000 + yy : 1900 + yy;
    dateOfBirth = `${year}-${month}-${day}`;
  } else {
    return { valid: false, error: `Định dạng ngày sinh trên mã QR không hợp lệ: '${dobRaw}' (yêu cầu ddmmyyyy hoặc ddmmyy).` };
  }

  // 3. Normalize Gender
  const gender: 'Nam' | 'Nữ' =
    rawGender.toLowerCase().includes('nữ') || rawGender.toLowerCase() === 'female' ? 'Nữ' : 'Nam';

  // 4. Parse Issue Date into yyyy-MM-dd
  let issueDate = '';
  if (/^\d{8}$/.test(issueDateRaw)) {
    const day = issueDateRaw.slice(0, 2);
    const month = issueDateRaw.slice(2, 4);
    const year = issueDateRaw.slice(4, 8);
    issueDate = `${year}-${month}-${day}`;
  } else if (/^\d{6}$/.test(issueDateRaw)) {
    const day = issueDateRaw.slice(0, 2);
    const month = issueDateRaw.slice(2, 4);
    const yy = parseInt(issueDateRaw.slice(4, 6), 10);
    const year = yy <= 40 ? 2000 + yy : 1900 + yy;
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
      rawQr: cleanQr,
    },
  };
}

/**
 * Compares decoded CCCD QR data against previously typed form data to detect discrepancies.
 */
export function detectDiscrepancies(
  qrData: DecodedCccdQr,
  formData: {
    cccd?: string;
    fullName?: string;
    dob?: string;
    gender?: string;
    address?: string;
  }
): QrFieldDiscrepancy[] {
  const discrepancies: QrFieldDiscrepancy[] = [];

  // 1. Full Name Check
  if (formData.fullName && formData.fullName.trim()) {
    const typed = formData.fullName.trim();
    const qr = qrData.fullName;
    if (typed.toUpperCase() === qr.toUpperCase()) {
      if (typed !== qr) {
        discrepancies.push({
          fieldKey: 'fullName',
          fieldLabel: 'Họ và tên',
          typedValue: typed,
          qrValue: qr,
          level: 'WARNING',
          message: 'Khác biệt kiểu chữ in hoa/thường.',
        });
      }
    } else {
      discrepancies.push({
        fieldKey: 'fullName',
        fieldLabel: 'Họ và tên',
        typedValue: typed,
        qrValue: qr,
        level: 'CONFLICT',
        message: 'Họ tên đã nhập không khớp với thẻ CCCD.',
      });
    }
  }

  // 2. CCCD Number Check
  if (formData.cccd && formData.cccd.trim()) {
    const typed = formData.cccd.trim();
    const qr = qrData.cccdNumber;
    if (typed !== qr) {
      discrepancies.push({
        fieldKey: 'cccdNumber',
        fieldLabel: 'Số định danh cá nhân (CCCD)',
        typedValue: typed,
        qrValue: qr,
        level: 'CONFLICT',
        message: `Số CCCD tự nhập (${typed}) khác với mã QR (${qr}).`,
      });
    }
  }

  // 3. Date of Birth Check
  if (formData.dob && formData.dob.trim()) {
    const typed = formData.dob.trim();
    const qr = qrData.dateOfBirth;
    if (typed !== qr) {
      discrepancies.push({
        fieldKey: 'dateOfBirth',
        fieldLabel: 'Ngày sinh',
        typedValue: typed,
        qrValue: qr,
        level: 'CONFLICT',
        message: `Ngày sinh tự nhập (${typed}) không khớp với ngày sinh trên CCCD (${qr}).`,
      });
    }
  }

  // 4. Gender Check
  if (formData.gender && formData.gender.trim()) {
    const typed = formData.gender.trim();
    const qr = qrData.gender;
    if (typed !== qr) {
      discrepancies.push({
        fieldKey: 'gender',
        fieldLabel: 'Giới tính',
        typedValue: typed,
        qrValue: qr,
        level: 'CONFLICT',
        message: `Giới tính tự chọn (${typed}) khác với giới tính trên CCCD (${qr}).`,
      });
    }
  }

  // 5. Address Check
  if (formData.address && formData.address.trim()) {
    const typed = formData.address.trim();
    const qr = qrData.address;
    if (typed.toLowerCase() !== qr.toLowerCase()) {
      discrepancies.push({
        fieldKey: 'address',
        fieldLabel: 'Nơi thường trú',
        typedValue: typed,
        qrValue: qr,
        level: 'WARNING',
        message: 'Địa chỉ có sự khác biệt so với địa chỉ thường trú trên CCCD.',
      });
    }
  }

  return discrepancies;
}
