/**
 * SmartWard AI Mobile — Offline Mutation Sync Manager
 * Tự động đẩy hàng đợi báo cáo sự cố (offline_incident_queue) và đồng bộ Ví Phiếu Hẹn QR khi có sóng 4G/Wi-Fi.
 */

import { submitCivicIncidentReport, trackCitizenDossier, uploadIncidentPhoto } from './client';
import {
  buildSmartWardPassPayload,
  cleanupOfflineIncidentPhotos,
  getAllWalletQrPasses,
  getOfflineIncidentQueue,
  markOfflineIncidentRetry,
  removeOfflineIncident,
  updateOfflineIncidentState,
  upsertWalletQrPass,
} from '../storage/sqliteDb';
import type { CivicReportRequest } from '../types/api.types';

export interface OfflineIncidentFlushResult {
  totalQueued: number;
  syncedCount: number;
  failedCount: number;
}

/**
 * Attempts to flush all queued offline civic incident reports:
 * uploads any remaining durable local photos -> submits POST /api/v1/issues/report with Idempotency-Key -> cleans up temp files.
 */
export async function flushOfflineIncidentQueue(
  deps: {
    submitApi?: typeof submitCivicIncidentReport;
    uploadPhotoApi?: typeof uploadIncidentPhoto;
    cleanupPhotos?: typeof cleanupOfflineIncidentPhotos;
  } = {}
): Promise<OfflineIncidentFlushResult> {
  const submitApi = deps.submitApi ?? submitCivicIncidentReport;
  const uploadPhotoApi = deps.uploadPhotoApi ?? uploadIncidentPhoto;
  const cleanupPhotos = deps.cleanupPhotos ?? cleanupOfflineIncidentPhotos;
  const queue = await getOfflineIncidentQueue();
  let syncedCount = 0;
  let failedCount = 0;

  for (const item of queue) {
    const payload = JSON.parse(item.payload_json) as CivicReportRequest;
    let remainingUris: string[] = [];
    try {
      const parsed = item.photo_uris_json ? JSON.parse(item.photo_uris_json) : [];
      if (Array.isArray(parsed)) {
        remainingUris = parsed.filter((u): u is string => typeof u === 'string' && u.length > 0);
      }
    } catch {
      remainingUris = [];
    }

    const uploadedUrisThisRun: string[] = [];
    const photoKeys = Array.isArray(payload.photoKeys) ? [...payload.photoKeys] : [];

    try {
      while (remainingUris.length > 0) {
        const nextUri = remainingUris[0];
        const uploaded = await uploadPhotoApi(nextUri, payload.wardCode || 'AG_P_LONGXUYEN');
        photoKeys.push(uploaded.photoKey);
        uploadedUrisThisRun.push(nextUri);
        remainingUris = remainingUris.slice(1);
        payload.photoKeys = photoKeys.slice(0, 3);
        // Checkpoint progress immediately so retries never re-upload already stored photos
        await updateOfflineIncidentState(item.local_id, payload, remainingUris);
      }

      if (photoKeys.length > 0) {
        payload.photoKeys = photoKeys.slice(0, 3);
      }
      await submitApi(payload, { idempotencyKey: item.local_id });
      await cleanupPhotos(uploadedUrisThisRun);
      await removeOfflineIncident(item.local_id);
      syncedCount += 1;
    } catch (err) {
      if (uploadedUrisThisRun.length > 0) {
        await cleanupPhotos(uploadedUrisThisRun);
      }
      failedCount += 1;
      const message = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ';
      await markOfflineIncidentRetry(item.local_id, message);
    }
  }

  return {
    totalQueued: queue.length,
    syncedCount,
    failedCount,
  };
}

/**
 * Refreshes status & appointmentCode for all locally cached QR passes from PostgreSQL backend.
 */
export async function syncWalletQrPassesFromServer(): Promise<{
  checked: number;
  updated: number;
}> {
  const passes = await getAllWalletQrPasses();
  let updated = 0;

  for (const pass of passes) {
    try {
      const remote = await trackCitizenDossier({
        dossierCode: pass.dossier_code,
        last4Cccd: pass.citizen_last4,
      });

      const appointmentCode = remote.appointmentCode || pass.appointment_code;
      await upsertWalletQrPass({
        ...pass,
        status: remote.status || pass.status,
        appointment_code: appointmentCode,
        officer_feedback: remote.officerFeedback ?? pass.officer_feedback,
        sla_deadline: remote.slaDeadline || pass.sla_deadline,
        qr_payload: buildSmartWardPassPayload(pass.dossier_code, appointmentCode, pass.ward_code),
        synced_at: Date.now(),
      });
      updated += 1;
    } catch {
      // Keep offline cached copy untouched when unreachable
    }
  }

  return { checked: passes.length, updated };
}
