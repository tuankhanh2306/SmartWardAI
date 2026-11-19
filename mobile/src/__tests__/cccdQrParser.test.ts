import { describe, expect, it } from 'vitest';
import {
  detectDiscrepancies,
  maskCccdNumber,
  parseCccdQrString,
  parseSmartWardPassQr,
} from '../core/cccdQrParser';

describe('cccdQrParser — Bộ giải mã QR CCCD 7 trường BCA & Phiếu hẹn QR', () => {
  const VALID_QR =
    '089205023490|352123456|NGUYỄN MINH TUẤN KHANH|23062005|Nam|Số 18 Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang|15082022';

  it('giải mã chính xác chuỗi QR CCCD 7 trường chuẩn Bộ Công An', () => {
    const res = parseCccdQrString(VALID_QR);
    expect(res.valid).toBe(true);
    expect(res.data).toMatchObject({
      cccdNumber: '089205023490',
      oldIdNumber: '352123456',
      fullName: 'NGUYỄN MINH TUẤN KHANH',
      dateOfBirth: '2005-06-23',
      gender: 'Nam',
      address: 'Số 18 Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang',
      issueDate: '2022-08-15',
    });
  });

  it('hỗ trợ chuỗi QR 6 trường (không có ngày cấp) và giới tính Nữ', () => {
    const qr6 = '089198001234||TRẦN THỊ MAI|05031998|Nữ|Phường Châu Đốc, Tỉnh An Giang';
    const res = parseCccdQrString(qr6);
    expect(res.valid).toBe(true);
    expect(res.data?.gender).toBe('Nữ');
    expect(res.data?.dateOfBirth).toBe('1998-03-05');
    expect(res.data?.issueDate).toBe('');
  });

  it('hỗ trợ ngày sinh định dạng 6 số ddmmyy', () => {
    const qrShort = '089205023490||LÊ VĂN AN|150995|Nam|Xã An Phú, Tỉnh An Giang|010122';
    const res = parseCccdQrString(qrShort);
    expect(res.valid).toBe(true);
    expect(res.data?.dateOfBirth).toBe('1995-09-15');
    expect(res.data?.issueDate).toBe('2022-01-01');
  });

  it('từ chối mã QR có số CCCD không đủ 12 chữ số', () => {
    const bad = '0892050234|123|NGUYỄN VĂN A|01011990|Nam|Long Xuyên|01012022';
    const res = parseCccdQrString(bad);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('12 chữ số');
  });

  it('từ chối mã QR có cấu trúc thiếu trường (< 6 trường)', () => {
    const res = parseCccdQrString('089205023490|NGUYỄN VĂN A|01011990');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('6-7 trường');
  });

  it('từ chối ngày sinh sai định dạng trên mã QR', () => {
    const badDob = '089205023490||NGUYỄN VĂN A|2005-06-23|Nam|Long Xuyên|01012022';
    const res = parseCccdQrString(badDob);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('ngày sinh');
  });

  it('phát hiện WARNING khi lệch hoa/thường họ tên và CONFLICT khi lệch CCCD/ngày sinh', () => {
    const parsed = parseCccdQrString(VALID_QR);
    expect(parsed.data).toBeDefined();

    const diffs = detectDiscrepancies(parsed.data!, {
      fullName: 'Nguyễn Minh Tuấn Khanh',
      cccd: '089205029999',
      dob: '2005-06-24',
      gender: 'Nữ',
      address: 'Địa chỉ mới tại Long Xuyên',
    });

    expect(diffs.find((d) => d.fieldKey === 'fullName')?.level).toBe('WARNING');
    expect(diffs.find((d) => d.fieldKey === 'cccdNumber')?.level).toBe('CONFLICT');
    expect(diffs.find((d) => d.fieldKey === 'dateOfBirth')?.level).toBe('CONFLICT');
    expect(diffs.find((d) => d.fieldKey === 'gender')?.level).toBe('CONFLICT');
    expect(diffs.find((d) => d.fieldKey === 'address')?.level).toBe('WARNING');
  });

  it('không báo sai lệch khi thông tin khớp hoàn toàn với thẻ CCCD', () => {
    const parsed = parseCccdQrString(VALID_QR);
    const diffs = detectDiscrepancies(parsed.data!, {
      fullName: 'NGUYỄN MINH TUẤN KHANH',
      cccd: '089205023490',
      dob: '2005-06-23',
      gender: 'Nam',
      address: 'Số 18 Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang',
    });
    expect(diffs).toHaveLength(0);
  });

  it('che mờ số CCCD chuẩn Nghị định 13/2023/NĐ-CP dạng ********1234', () => {
    expect(maskCccdNumber('089205023490')).toBe('********3490');
    expect(maskCccdNumber('123')).toBe('********');
  });

  it('giải mã chính xác QR Phiếu Hẹn Điện Tử (SMARTWARD_PASS, HS-..., LH-...)', () => {
    const full = parseSmartWardPassQr('SMARTWARD_PASS|HS-20261118-0001|LH-20261118-8899|AG_P_LONGXUYEN');
    expect(full).toEqual({
      valid: true,
      rawCode: 'SMARTWARD_PASS|HS-20261118-0001|LH-20261118-8899|AG_P_LONGXUYEN',
      dossierCode: 'HS-20261118-0001',
      appointmentCode: 'LH-20261118-8899',
      wardCode: 'AG_P_LONGXUYEN',
    });

    expect(parseSmartWardPassQr('HS-20261118-0001').dossierCode).toBe('HS-20261118-0001');
    expect(parseSmartWardPassQr('LH-20261118-8899').appointmentCode).toBe('LH-20261118-8899');
    expect(parseSmartWardPassQr('INVALID').valid).toBe(false);
  });
});
