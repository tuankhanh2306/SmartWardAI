/**
 * SmartWard AI Mobile — Nghiệp vụ Bàn Cán Bộ Di Động (MOB-5.2 -> MOB-5.5)
 * - Quét & tra cứu Mã QR Phiếu hẹn công dân (GET /api/v1/dossiers/officer/by-qr)
 * - Xem ảnh giấy tờ Zero-Trust Vault 1 lần trong RAM (GET /api/v1/vault/view/{token} -> 410 Gone ở lần 2)
 * - Sinh mã hẹn chuẩn LH-YYYYMMDD-XXXX & gửi phê duyệt (PUT /api/v1/dossiers/{code}/review)
 * - Che mờ CCCD chuẩn ********1234 theo Nghị định 13/2023/NĐ-CP
 */

import {
  fetchVaultDocumentOneTime,
  lookupOfficerDossierByQr,
  reviewOfficerDossier,
} from '../api/client';
import { maskCccdNumber, parseSmartWardPassQr } from './cccdQrParser';
import type { OfficerDossierDto, OfficerReviewRequest } from '../types/api.types';

export const VAULT_410_GONE_MESSAGE =
  'HTTP 410 GONE — Liên kết xem 1 lần đã tự hủy trên Redis theo Luật Bảo vệ DLCN 91/2025/QH15 & NĐ 356/2025/NĐ-CP.';

/**
 * Generates standard Vietnamese One-Stop Appointment Code: LH-YYYYMMDD-XXXX.
 */
export function generateAppointmentCode(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `LH-${yyyy}${mm}${dd}-${suffix}`;
}

/**
 * Guarantees every citizen CCCD rendered on the Officer mobile screen is masked as ********1234.
 */
export function sanitizeOfficerDossierForDisplay(
  dossier: OfficerDossierDto
): OfficerDossierDto {
  const cccd = (dossier.citizenCccd || '').trim();
  const masked = cccd.startsWith('********') ? cccd : maskCccdNumber(cccd);
  return {
    ...dossier,
    citizenCccd: masked,
  };
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa === 'function' ? btoa(binary) : '';
}

export interface VaultOneTimeViewResult {
  success: boolean;
  consumed410: boolean;
  dataUri?: string;
  byteLength?: number;
  message: string;
}

/**
 * Fetches a Zero-Trust Vault document into memory ONLY (never persists to disk/photo gallery).
 * Explicitly surfaces HTTP 410 Gone when the Redis GETDEL one-time token was already consumed.
 */
export async function loadVaultImageInMemoryOnly(
  token: string,
  fetcher: typeof fetchVaultDocumentOneTime = fetchVaultDocumentOneTime
): Promise<VaultOneTimeViewResult> {
  const cleanToken = (token || '').trim();
  if (!cleanToken) {
    return {
      success: false,
      consumed410: false,
      message: 'Token tài liệu Vault không hợp lệ.',
    };
  }

  try {
    const buffer = await fetcher(cleanToken);
    const b64 = arrayBufferToBase64(buffer);
    return {
      success: true,
      consumed410: false,
      dataUri: b64 ? `data:image/jpeg;base64,${b64}` : undefined,
      byteLength: buffer.byteLength,
      message: 'Đã giải mã AES-256-GCM & hiển thị trong RAM (Token đã tự hủy trên Redis).',
    };
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 410) {
      return {
        success: false,
        consumed410: true,
        message: VAULT_410_GONE_MESSAGE,
      };
    }
    return {
      success: false,
      consumed410: false,
      message:
        status === 403
          ? 'HTTP 403 FORBIDDEN — Bạn không có quyền truy cập tài liệu này.'
          : 'Không thể tải tài liệu từ Zero-Trust Vault. Vui lòng kiểm tra kết nối máy chủ.',
    };
  }
}

/**
 * Looks up a citizen dossier by scanned QR code (SMARTWARD_PASS|..., HS-..., LH-...)
 * via GET /api/v1/dossiers/officer/by-qr (enforcing SEC-09 ward isolation on Backend).
 */
export async function lookupDossierByScannedCounterQr(
  rawQr: string,
  lookupApi: typeof lookupOfficerDossierByQr = lookupOfficerDossierByQr
): Promise<{
  success: boolean;
  dossier?: OfficerDossierDto;
  crossWardBlocked?: boolean;
  message: string;
}> {
  const parsed = parseSmartWardPassQr(rawQr);
  if (!parsed.valid) {
    return {
      success: false,
      message: 'Mã QR không đúng định dạng Phiếu hẹn SmartWard (SMARTWARD_PASS / HS-... / LH-...).',
    };
  }

  try {
    const found = await lookupApi(parsed.rawCode);
    const safeDossier = sanitizeOfficerDossierForDisplay(found);
    return {
      success: true,
      dossier: safeDossier,
      message: `Đã tìm thấy hồ sơ ${safeDossier.dossierCode} tại quầy.`,
    };
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 403) {
      return {
        success: false,
        crossWardBlocked: true,
        message: 'HTTP 403 FORBIDDEN (SEC-09) — Hồ sơ thuộc địa bàn xã/phường khác, cán bộ không được phép xem.',
      };
    }
    return {
      success: false,
      message: 'Không tìm thấy hồ sơ tương ứng với mã QR vừa quét.',
    };
  }
}

/**
 * Approves or requests supplement on a citizen dossier via PUT /api/v1/dossiers/{dossierCode}/review.
 */
export async function submitOfficerDossierDecision(
  dossier: OfficerDossierDto,
  decision: 'APPROVED' | 'SUPPLEMENT_REQUIRED',
  officerFeedback: string,
  reviewApi: typeof reviewOfficerDossier = reviewOfficerDossier
): Promise<OfficerDossierDto> {
  const appointmentCode =
    decision === 'APPROVED'
      ? dossier.appointmentCode || generateAppointmentCode()
      : undefined;

  const payload: OfficerReviewRequest = {
    status: decision,
    officerFeedback:
      officerFeedback.trim() ||
      (decision === 'APPROVED'
        ? `Hồ sơ hợp lệ 100%. Mời công dân mang CCCD gốc đến Bộ phận Một cửa xuất trình mã QR ${appointmentCode}.`
        : 'Vui lòng bổ sung thông tin/giấy tờ còn thiếu theo hướng dẫn của cán bộ Một cửa.'),
    appointmentCode,
  };

  const updated = await reviewApi(dossier.dossierCode, payload);
  return sanitizeOfficerDossierForDisplay(updated);
}
