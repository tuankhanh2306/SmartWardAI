import { z } from 'zod';

/**
 * Zod Validation Schemas for SmartWard AI Forms
 * Centralizes validation across Officer Login, Citizen Dossier Precheck,
 * Civic Incident Reporting, and Dossier Tracking.
 */

export const officerLoginSchema = z.object({
  badgeId: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập Mã số thẻ công chức / quản trị.')
    .min(3, 'Mã thẻ phải có ít nhất 3 ký tự.'),
  pin: z.string().trim().min(1, 'Vui lòng nhập Mã PIN công vụ.'),
});

export const citizenDossierFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Vui lòng nhập đầy đủ Họ và tên (tối thiểu 3 ký tự).'),
  cccd: z
    .string()
    .trim()
    .regex(/^\d{12}$/, 'Số CCCD/ĐDCN phải gồm đúng 12 chữ số theo Đề án 06.'),
  dob: z.string().trim().min(1, 'Vui lòng chọn ngày, tháng, năm sinh.'),
  address: z
    .string()
    .trim()
    .min(5, 'Vui lòng nhập địa chỉ cư trú / thường trú đầy đủ.'),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^0\d{9}$/, 'Số điện thoại phải gồm đúng 10 chữ số, bắt đầu bằng số 0.'),
  citizenEmail: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập địa chỉ Email nhận thông báo & Mã QR.')
    .email('Địa chỉ Email chưa đúng định dạng (VD: congdan@gmail.com).'),
});

export const civicIncidentSchema = z.object({
  locationSource: z
    .string()
    .refine(
      (v) => v !== 'WARD_DEFAULT',
      'Vui lòng chạm bản đồ hoặc kéo ghim đỏ để xác nhận vị trí.'
    ),
  latitude: z.number().refine(Number.isFinite, 'Tọa độ vĩ độ chưa hợp lệ.'),
  longitude: z.number().refine(Number.isFinite, 'Tọa độ kinh độ chưa hợp lệ.'),
  description: z
    .string()
    .trim()
    .min(5, 'Vui lòng mô tả ngắn gọn sự cố (tối thiểu 5 ký tự).'),
  reporterPhone: z
    .string()
    .trim()
    .refine(
      (v) =>
        !v ||
        /^(0|\+84)(3|5|7|8|9|2)[0-9]{8,9}$/.test(v.replace(/[\s.\-()]/g, '')),
      'SĐT không hợp lệ (10–11 chữ số, VD: 0918234567) hoặc để trống.'
    ),
});

export const dossierTrackingSchema = z.object({
  dossierCode: z
    .string()
    .trim()
    .min(3, 'Vui lòng nhập Mã hồ sơ (VD: HS-20261111-...).'),
  last4Cccd: z
    .string()
    .trim()
    .regex(/^(\d{4}|\d{12})$/, 'Vui lòng nhập đúng 4 số cuối hoặc đủ 12 số CCCD.'),
});

/**
 * Extracts the first validation error message for each top-level field path.
 */
export function extractZodFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] ? String(issue.path[0]) : '_form';
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}
