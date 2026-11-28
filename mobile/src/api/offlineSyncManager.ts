/**
 * SmartWard AI Mobile — Offline Mutation Sync Manager
 * Tự động đẩy hàng đợi báo cáo sự cố (offline_incident_queue) và đồng bộ Ví Phiếu Hẹn QR khi có sóng 4G/Wi-Fi.
 */

import { submitCivicIncidentReport, trackCitizenDossier, uploadIncidentPhoto } from './client';
import { classifyIncidentSyncError } from '../core/incidentSyncHistory';
import {
  buildOfficialReceiptQrPayload,
  buildSmartWardPassPayload,
  cleanupOfflineIncidentPhotos,
  getAllWalletQrPasses,
  getOfflineIncidentQueue,
  markOfflineIncidentRetry,
  removeOfflineIncident,
  updateIncidentSyncHistoryStatus,
  updateOfflineIncidentState,
  upsertIncidentSyncHistory,
  upsertWalletQrPass,
} from '../storage/sqliteDb';
import type { CivicReportRequest } from '../types/api.types';

export interface OfflineIncidentFlushResult {
  totalQueued: number;
  syncedCount: number;
  failedCount: number;
  editRequiredCount: number;
}

/**
 * Attempts to flush all queued offline civic incident reports (or one targeted localId):
 * uploads any remaining durable local photos -> submits POST /api/v1/issues/report with Idempotency-Key
 * -> records durable ACCEPTED receipt BEFORE cleaning up temp photos & removing queue entry.
 */
export async function flushOfflineIncidentQueue(
  deps: {
    localId?: string;
    submitApi?: typeof submitCivicIncidentReport;
    uploadPhotoApi?: typeof uploadIncidentPhoto;
    cleanupPhotos?: typeof cleanupOfflineIncidentPhotos;
    getQueue?: typeof getOfflineIncidentQueue;
    markRetry?: typeof markOfflineIncidentRetry;
    removeQueued?: typeof removeOfflineIncident;
    upsertHistory?: typeof upsertIncidentSyncHistory;
    updateHistoryStatus?: typeof updateIncidentSyncHistoryStatus;
  } = {}
): Promise<OfflineIncidentFlushResult> {
  const submitApi = deps.submitApi ?? submitCivicIncidentReport;
  const uploadPhotoApi = deps.uploadPhotoApi ?? uploadIncidentPhoto;
  const cleanupPhotos = deps.cleanupPhotos ?? cleanupOfflineIncidentPhotos;
  const getQueue = deps.getQueue ?? getOfflineIncidentQueue;
  const markRetry = deps.markRetry ?? markOfflineIncidentRetry;
  const removeQueued = deps.removeQueued ?? removeOfflineIncident;
  const upsertHistory = deps.upsertHistory ?? upsertIncidentSyncHistory;
  const updateHistoryStatus = deps.updateHistoryStatus ?? updateIncidentSyncHistoryStatus;

  const allQueued = await getQueue();
  const queue = deps.localId ? allQueued.filter((q) => q.local_id === deps.localId) : allQueued;
  let syncedCount = 0;
  let failedCount = 0;
  let editRequiredCount = 0;

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

    await updateHistoryStatus(item.local_id, { sync_status: 'SENDING', updated_at: Date.now() });

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
      const resp = await submitApi(payload, { idempotencyKey: item.local_id });
      const now = Date.now();

      // TASK-055: Strictly persist receipt (reportCode, clusterCode, ward) BEFORE cleaning up temp photos
      await upsertHistory({
        local_id: item.local_id,
        category: payload.category,
        title: payload.title,
        description: payload.description,
        address_text: payload.addressText,
        reporter_phone: payload.reporterPhone,
        latitude: payload.latitude,
        longitude: payload.longitude,
        location_source: payload.locationSource || 'GPS',
        target_ward_code: resp.targetWardCode || payload.wardCode || '',
        target_ward_name: resp.targetWardName || payload.wardName || '',
        sync_status: 'ACCEPTED',
        report_code: resp.reportCode || null,
        cluster_code: resp.clusterCode || null,
        error_category: null,
        last_error: null,
        retry_count: item.retry_count,
        created_at: item.created_at,
        updated_at: now,
      });

      await cleanupPhotos(uploadedUrisThisRun);
      await removeQueued(item.local_id);
      syncedCount += 1;
    } catch (err) {
      if (uploadedUrisThisRun.length > 0) {
        await cleanupPhotos(uploadedUrisThisRun);
      }
      failedCount += 1;
      const classified = classifyIncidentSyncError(err);
      if (classified.syncStatus === 'EDIT_REQUIRED') {
        editRequiredCount += 1;
      }
      await markRetry(item.local_id, classified.userMessage);
      await updateHistoryStatus(item.local_id, {
        sync_status: classified.syncStatus,
        error_category: classified.category,
        last_error: classified.userMessage,
        retry_count: item.retry_count + 1,
        updated_at: Date.now(),
      });
    }
  }

  return {
    totalQueued: queue.length,
    syncedCount,
    failedCount,
    editRequiredCount,
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
      const qrPayload =
        remote.receiptVerified && remote.officialReceiptNo && remote.receivingAgency
          ? buildOfficialReceiptQrPayload(
              remote.officialReceiptNo,
              remote.receivingAgency,
              remote.slaDeadline || pass.sla_deadline
            )
          : buildSmartWardPassPayload(pass.dossier_code, appointmentCode, pass.ward_code);

      await upsertWalletQrPass({
        ...pass,
        status: remote.status || pass.status,
        appointment_code: appointmentCode,
        officer_feedback: remote.officerFeedback ?? pass.officer_feedback,
        sla_deadline: remote.slaDeadline || pass.sla_deadline,
        qr_payload: qrPayload,
        synced_at: Date.now(),
      });
      updated += 1;
    } catch {
      // Keep offline cached copy untouched when unreachable
    }
  }

  return { checked: passes.length, updated };
}
