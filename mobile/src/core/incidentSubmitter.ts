/**
 * SmartWard AI Mobile — Kiểm định & Gửi Báo Cáo Sự Cố Hiện Trường GPS 25m (MOB-4.8 -> MOB-4.10)
 * - 5 danh mục chuẩn Backend (TriageController.java): ROAD_DAMAGE, FLOODING, LIGHTING_ELECTRICAL, ENVIRONMENT, ORDER_SECURITY
 * - Bắt buộc SĐT liên hệ khẩn cấp (10 chữ số VN) & mô tả >= 10 ký tự
 * - Tự động định tuyến liên xã/phường qua resolveWardFromLocationBox(addressText, lat, lon, fallbackWardCode)
 * - Khi mất mạng -> lưu ngay vào offline_incident_queue (expo-sqlite) để đồng bộ khi có sóng 4G
 */

import { submitCivicIncidentReport } from '../api/client';
import { resolveWardFromLocationBox } from './angiangWards';
import { enqueueOfflineIncident } from '../storage/sqliteDb';
import { DOMAIN_THRESHOLDS } from '../theme/tokens';
import type {
  CivicReportRequest,
  CivicReportResponse,
  IncidentCategory,
} from '../types/api.types';

export interface IncidentCategoryOption {
  key: IncidentCategory;
  label: string;
  defaultTitle: string;
}

export const INCIDENT_CATEGORY_OPTIONS: IncidentCategoryOption[] = [
  {
    key: 'ROAD_DAMAGE',
    label: 'Đường / Ổ gà',
    defaultTitle: 'Hư hỏng mặt đường / Ổ gà nguy hiểm',
  },
  {
    key: 'FLOODING',
    label: 'Ngập nước',
    defaultTitle: 'Ngập úng / Nghẹt cống thoát nước',
  },
  {
    key: 'LIGHTING_ELECTRICAL',
    label: 'Đèn đường / Điện',
    defaultTitle: 'Hỏng đèn đường / Sự cố lưới điện',
  },
  {
    key: 'ENVIRONMENT',
    label: 'Rác / Môi trường',
    defaultTitle: 'Rác thải tồn đọng / Ô nhiễm môi trường',
  },
  {
    key: 'ORDER_SECURITY',
    label: 'Trật tự đô thị',
    defaultTitle: 'Lấn chiếm lòng lề đường / Trật tự đô thị',
  },
];

const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9|2)\d{8,9}$/;

export interface IncidentDraftInput {
  category: IncidentCategory;
  title?: string;
  description: string;
  addressText: string;
  reporterPhone: string;
  latitude: number;
  longitude: number;
  fallbackWardCode: string;
}

export interface IncidentValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateIncidentDraft(input: IncidentDraftInput): IncidentValidationResult {
  const errors: string[] = [];

  if (!INCIDENT_CATEGORY_OPTIONS.some((c) => c.key === input.category)) {
    errors.push('Vui lòng chọn loại sự cố hợp lệ.');
  }

  const cleanDesc = (input.description || '').trim();
  if (cleanDesc.length < 10) {
    errors.push('Mô tả sự cố cần tối thiểu 10 ký tự để cán bộ dễ xác minh.');
  }

  const cleanPhone = (input.reporterPhone || '').trim();
  if (!VN_PHONE_REGEX.test(cleanPhone)) {
    errors.push('Bắt buộc nhập đúng Số điện thoại liên hệ xác minh khẩn cấp (10 chữ số).');
  }

  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    errors.push('Tọa độ GPS chưa hợp lệ. Vui lòng bấm Định vị GPS.');
  }

  return { valid: errors.length === 0, errors };
}

export interface IncidentSubmissionOutcome {
  success: boolean;
  mode: 'VALIDATION_FAILED' | 'SUBMITTED_ONLINE' | 'QUEUED_OFFLINE';
  errors?: string[];
  targetWardCode?: string;
  targetWardName?: string;
  matchedBy?: 'TEXT_BOX' | 'GPS_COORDS' | 'FALLBACK';
  response?: CivicReportResponse;
  offlineLocalId?: string;
  message: string;
}

export interface IncidentSubmissionDeps {
  submitApi?: typeof submitCivicIncidentReport;
  enqueueOffline?: typeof enqueueOfflineIncident;
}

/**
 * Validates, resolves target receiving UBND (Cross-Ward Jurisdiction Routing),
 * submits to POST /api/v1/issues/report, or queues into SQLite offline_incident_queue.
 */
export async function executeIncidentSubmission(
  input: IncidentDraftInput,
  deps: IncidentSubmissionDeps = {}
): Promise<IncidentSubmissionOutcome> {
  const check = validateIncidentDraft(input);
  if (!check.valid) {
    return {
      success: false,
      mode: 'VALIDATION_FAILED',
      errors: check.errors,
      message: check.errors[0] || 'Thông tin phản ánh chưa hợp lệ.',
    };
  }

  const submitApi = deps.submitApi ?? submitCivicIncidentReport;
  const enqueueOffline = deps.enqueueOffline ?? enqueueOfflineIncident;

  const routed = resolveWardFromLocationBox(
    input.addressText,
    input.latitude,
    input.longitude,
    input.fallbackWardCode
  );

  const catOption =
    INCIDENT_CATEGORY_OPTIONS.find((c) => c.key === input.category) ||
    INCIDENT_CATEGORY_OPTIONS[0];

  const payload: CivicReportRequest = {
    category: input.category,
    title: (input.title || '').trim() || catOption.defaultTitle,
    description: input.description.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    addressText: input.addressText.trim() || routed.ward.officeAddress,
    reporterPhone: input.reporterPhone.trim(),
    wardCode: routed.ward.code,
    wardName: routed.ward.name,
  };

  try {
    const resp = await submitApi(payload);
    const merged =
      resp.mergedIntoExistingCluster ||
      resp.assignedAction === 'MERGED_INTO_EXISTING_CLUSTER';
    const clusterCode = resp.clusterCode || 'CLU-NEW';
    const count = resp.reportCountInCluster ?? resp.totalReportsInCluster ?? 1;
    const radius = resp.spatialRadiusMeters ?? resp.appliedRadiusMeters ?? DOMAIN_THRESHOLDS.gpsClusterRadiusMeters;

    return {
      success: true,
      mode: 'SUBMITTED_ONLINE',
      targetWardCode: resp.targetWardCode || routed.ward.code,
      targetWardName: resp.targetWardName || routed.ward.name,
      matchedBy: routed.matchedBy,
      response: resp,
      message: merged
        ? `Đã gộp vào cụm ${clusterCode} (${count} phản ánh trong bán kính ${radius}m) tại UBND ${resp.targetWardName || routed.ward.name}.`
        : `Đã tạo cụm sự cố mới ${clusterCode} và chuyển tới UBND ${resp.targetWardName || routed.ward.name}.`,
    };
  } catch {
    const queued = await enqueueOffline(payload);
    return {
      success: true,
      mode: 'QUEUED_OFFLINE',
      targetWardCode: routed.ward.code,
      targetWardName: routed.ward.name,
      matchedBy: routed.matchedBy,
      offlineLocalId: queued.local_id,
      message: `Đã lưu vào hàng đợi Offline (${routed.ward.name}) — Tự động gửi ngay khi có sóng 4G.`,
    };
  }
}
