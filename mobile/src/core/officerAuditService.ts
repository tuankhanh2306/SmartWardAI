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
import { AN_GIANG_WARDS, getWardByCode, normalizeVietnameseText } from './angiangWards';
import { maskCccdNumber, parseSmartWardPassQr } from './cccdQrParser';
import type {
  OfficerDossierDto,
  OfficerLoginResponse,
  OfficerReviewRequest,
} from '../types/api.types';

export type OfficerDossierFilter =
  | 'ALL'
  | 'SUPPLEMENTED'
  | 'PENDING'
  | 'APPROVED'
  | 'SUPPLEMENT_REQUIRED';

export interface OfficerDossierStatusMeta {
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export const OFFICER_DOSSIER_STATUS_META: Record<string, OfficerDossierStatusMeta> = {
  PENDING: {
    label: 'Chờ duyệt',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    textColor: '#B45309',
  },
  SUPPLEMENTED: {
    label: 'Vừa bổ sung',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    textColor: '#6D28D9',
  },
  APPROVED: {
    label: 'Đã duyệt',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    textColor: '#047857',
  },
  SUPPLEMENT_REQUIRED: {
    label: 'Cần bổ sung',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    textColor: '#B91C1C',
  },
  REJECTED: {
    label: 'Từ chối',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    textColor: '#B91C1C',
  },
};

export function getOfficerDossierStatusMeta(status?: string): OfficerDossierStatusMeta {
  const key = (status || 'PENDING').trim().toUpperCase();
  return (
    OFFICER_DOSSIER_STATUS_META[key] || {
      label: key || 'Chờ xử lý',
      bgColor: '#F8FAFC',
      borderColor: '#E2E8F0',
      textColor: '#334155',
    }
  );
}

/**
 * Extracts real JWT token from OfficerAuthController LoginResponse (`token` in Backend, `accessToken` fallback).
 */
export function extractOfficerSessionToken(resp: OfficerLoginResponse | null | undefined): string | null {
  if (!resp) return null;
  const candidate =
    typeof resp.token === 'string' && resp.token.trim()
      ? resp.token.trim()
      : typeof resp.accessToken === 'string' && resp.accessToken.trim()
      ? resp.accessToken.trim()
      : '';
  if (!candidate || candidate.startsWith('pending_sync_')) {
    return null;
  }
  return candidate;
}

/**
 * Matches Web RoleGateway convention (`CB-${wardCode}`).
 */
export function buildDefaultOfficerBadgeForWard(wardCode: string): string {
  const clean = (wardCode || 'AG_P_LONGXUYEN').trim().toUpperCase();
  return `CB-${clean}`;
}

export function resolveWardNameByCode(wardCode?: string | null): string {
  const clean = (wardCode || '').trim();
  if (!clean) return 'Phường Long Xuyên';
  if (clean.toUpperCase() === 'AG_PROVINCE') return 'Tỉnh An Giang';
  const match =
    getWardByCode(clean) ||
    AN_GIANG_WARDS.find((w) => w.code.toUpperCase() === clean.toUpperCase());
  return match?.name || clean;
}

export function filterOfficerDossiers(
  items: OfficerDossierDto[],
  filter: OfficerDossierFilter,
  keyword: string
): OfficerDossierDto[] {
  const normKw = normalizeVietnameseText(keyword);
  return items.filter((item) => {
    const status = (item.status || '').toUpperCase();
    if (filter !== 'ALL' && status !== filter) {
      return false;
    }
    if (!normKw) return true;
    const haystack = normalizeVietnameseText(
      `${item.dossierCode} ${item.citizenName} ${item.procedureName} ${item.procedureCode}`
    );
    return haystack.includes(normKw);
  });
}

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
  decision: OfficerReviewRequest['status'],
  officerFeedback: string,
  reviewApi: typeof reviewOfficerDossier = reviewOfficerDossier,
  extra?: { receivingAgency?: string; officialReceiptNo?: string }
): Promise<OfficerDossierDto> {
  const appointmentCode =
    decision === 'APPROVED' || decision === 'OFFICIALLY_ACCEPTED'
      ? dossier.appointmentCode || generateAppointmentCode()
      : undefined;

  const defaultFeedbackMap: Record<string, string> = {
    APPROVED: `Hồ sơ hợp lệ 100%. Mời công dân mang CCCD gốc đến TTPVHCC xuất trình mã ${appointmentCode}.`,
    OFFICIALLY_ACCEPTED: `Hồ sơ đã được tiếp nhận tại ${extra?.receivingAgency || 'TTPVHCC cấp xã'} (Số biên nhận: ${extra?.officialReceiptNo || ''}).`,
    UNDER_APPRAISAL: 'Hồ sơ đã chuyển công chức chuyên môn UBND thẩm định.',
    PENDING_UBND_SIGNATURE: 'Đã thẩm định đạt, trình Lãnh đạo UBND ký duyệt.',
    CENTER_SIGNED: 'Đã ký theo quyết định ủy quyền tại Trung tâm Phục vụ Hành chính công.',
    TRANSFERRED_AWAITING_DECISION: 'Đã gửi văn bản đề nghị sang cơ sở trợ giúp, chờ quyết định tiếp nhận.',
    READY_FOR_RETURN: 'Hồ sơ đã có kết quả giải quyết — chờ trả công dân.',
    COMPLETED: 'Công dân đã nhận kết quả giải quyết TTHC.',
    SUPPLEMENT_REQUIRED: 'Vui lòng bổ sung thông tin/giấy tờ còn thiếu theo hướng dẫn của cán bộ tiếp nhận.',
    REJECTED: 'Hồ sơ chưa đủ điều kiện tiếp nhận theo quy định.',
  };

  const payload: OfficerReviewRequest = {
    status: decision,
    officerFeedback: officerFeedback.trim() || defaultFeedbackMap[decision] || 'Đã cập nhật trạng thái hồ sơ.',
    appointmentCode,
    receivingAgency: extra?.receivingAgency,
    officialReceiptNo: extra?.officialReceiptNo,
  };

  const updated = await reviewApi(dossier.dossierCode, payload);
  return sanitizeOfficerDossierForDisplay(updated);
}
