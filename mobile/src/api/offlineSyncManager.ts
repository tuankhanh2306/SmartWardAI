/**
 * SmartWard AI Mobile — Offline Mutation Sync Manager
 * Tự động đẩy hàng đợi báo cáo sự cố (offline_incident_queue) và đồng bộ Ví Phiếu Hẹn QR khi có sóng 4G/Wi-Fi.
 */

import { submitCivicIncidentReport, trackCitizenDossier } from './client';
import {
  buildSmartWardPassPayload,
  getAllWalletQrPasses,
  getOfflineIncidentQueue,
  markOfflineIncidentRetry,
  removeOfflineIncident,
  upsertWalletQrPass,
} from '../storage/sqliteDb';
import type { CivicReportRequest } from '../types/api.types';

export interface OfflineIncidentFlushResult {
  totalQueued: number;
  syncedCount: number;
  failedCount: number;
}

/**
 * Attempts to flush all queued offline civic incident reports to POST /api/v1/issues/report.
 */
export async function flushOfflineIncidentQueue(
  deps: { submitApi?: typeof submitCivicIncidentReport } = {}
): Promise<OfflineIncidentFlushResult> {
  const submitApi = deps.submitApi ?? submitCivicIncidentReport;
  const queue = await getOfflineIncidentQueue();
  let syncedCount = 0;
  let failedCount = 0;

  for (const item of queue) {
    try {
      const payload = JSON.parse(item.payload_json) as CivicReportRequest;
      await submitApi(payload, { idempotencyKey: item.local_id });
      await removeOfflineIncident(item.local_id);
      syncedCount += 1;
    } catch (err) {
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
