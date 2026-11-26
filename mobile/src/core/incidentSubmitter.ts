/**
 * SmartWard AI Mobile — Kiểm định & Gửi Báo Cáo Sự Cố Hiện Trường GPS 25m (MOB-4.8 -> MOB-4.10)
 * - 5 danh mục chuẩn Backend (TriageController.java): ROAD_DAMAGE, FLOODING, LIGHTING_ELECTRICAL, ENVIRONMENT, ORDER_SECURITY
 * - Bắt buộc SĐT liên hệ khẩn cấp (10 chữ số VN) & mô tả >= 10 ký tự
 * - Tự động định tuyến liên xã/phường qua resolveWardFromLocationBox(addressText, lat, lon, fallbackWardCode)
 * - Khi mất mạng -> lưu ngay vào offline_incident_queue (expo-sqlite) để đồng bộ khi có sóng 4G
 */

import { submitCivicIncidentReport, uploadIncidentPhoto } from '../api/client';
import { BBOX_AN_GIANG, resolveWardFromLocationBox } from './angiangWards';
import { enqueueOfflineIncident, persistOfflineIncidentPhotos } from '../storage/sqliteDb';
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
  locationSource?: 'GPS' | 'PIN_DRAGGED' | 'WARD_DEFAULT';
  locationAccuracyM?: number;
  localPhotoUris?: string[];
}

export interface IncidentValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateIncidentDraft(input: IncidentDraftInput): IncidentValidationResult {
  const errors: string[] = [];

  if (input.locationSource === 'WARD_DEFAULT') {
    errors.push('Vị trí sự cố chưa được xác nhận. Vui lòng bấm lấy GPS hoặc kéo ghim đỏ trên bản đồ để xác nhận vị trí.');
  }

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
  } else if (input.latitude > 90 || (input.latitude > 50 && input.longitude < 20)) {
    errors.push('Tọa độ kinh độ và vĩ độ bị đảo ngược hoặc không thuộc hệ WGS84.');
  } else if (
    input.latitude < BBOX_AN_GIANG.minLat ||
    input.latitude > BBOX_AN_GIANG.maxLat ||
    input.longitude < BBOX_AN_GIANG.minLng ||
    input.longitude > BBOX_AN_GIANG.maxLng
  ) {
    errors.push('Tọa độ nằm ngoài phạm vi địa bàn Tỉnh An Giang và các Đặc khu hải đảo.');
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
  uploadPhotoApi?: typeof uploadIncidentPhoto;
  enqueueOffline?: typeof enqueueOfflineIncident;
  persistPhotos?: typeof persistOfflineIncidentPhotos;
}

/**
 * Validates, resolves target receiving UBND (Cross-Ward Jurisdiction Routing),
 * uploads up to 3 incident photos, submits to POST /api/v1/issues/report,
 * or persists photos & queues into SQLite offline_incident_queue when offline.
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
  const uploadPhotoApi = deps.uploadPhotoApi ?? uploadIncidentPhoto;
  const enqueueOffline = deps.enqueueOffline ?? enqueueOfflineIncident;
  const persistPhotos = deps.persistPhotos ?? persistOfflineIncidentPhotos;

  const routed = resolveWardFromLocationBox(
    input.addressText,
    input.latitude,
    input.longitude,
    input.fallbackWardCode
  );

  const catOption =
    INCIDENT_CATEGORY_OPTIONS.find((c) => c.key === input.category) ||
    INCIDENT_CATEGORY_OPTIONS[0];

  const pendingUris = (input.localPhotoUris ?? []).filter(Boolean).slice(0, 3);
  const uploadedPhotoKeys: string[] = [];
  let remainingUris = [...pendingUris];

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
    locationSource: input.locationSource || 'GPS',
    locationAccuracyM: input.locationAccuracyM,
  };

  try {
    for (let i = 0; i < pendingUris.length; i += 1) {
      const uploaded = await uploadPhotoApi(pendingUris[i], routed.ward.code);
      uploadedPhotoKeys.push(uploaded.photoKey);
      remainingUris = pendingUris.slice(i + 1);
    }
    if (uploadedPhotoKeys.length > 0) {
      payload.photoKeys = uploadedPhotoKeys;
    }

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
    if (uploadedPhotoKeys.length > 0) {
      payload.photoKeys = uploadedPhotoKeys;
    }
    const persistedUris = await persistPhotos(remainingUris);
    const queued = await enqueueOffline(payload, persistedUris);
    return {
      success: true,
      mode: 'QUEUED_OFFLINE',
      targetWardCode: routed.ward.code,
      targetWardName: routed.ward.name,
      matchedBy: routed.matchedBy,
      offlineLocalId: queued.local_id,
      message:
        persistedUris.length > 0
          ? `Đã lưu báo cáo kèm ${persistedUris.length} ảnh vào hàng đợi Offline (${routed.ward.name}) — Tự động gửi ngay khi có sóng 4G.`
          : `Đã lưu vào hàng đợi Offline (${routed.ward.name}) — Tự động gửi ngay khi có sóng 4G.`,
    };
  }
}
