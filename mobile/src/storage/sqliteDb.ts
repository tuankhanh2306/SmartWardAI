/**
 * SmartWard AI Mobile — Cơ sở dữ liệu Cục bộ Offline (expo-sqlite)
 * Database: smartward_mobile.db
 * 3 Bảng theo Đặc tả SW-PLAN-MOBILE-2026 Mục 5:
 *   1. cached_procedures        — 40 TTHC An Giang 2026 (Tra cứu Offline 100%)
 *   2. wallet_qr_passes         — Ví Phiếu Hẹn Điện Tử Có Mã QR (Không cần sóng 4G)
 *   3. offline_incident_queue   — Hàng đợi Gửi Phản ánh Sự cố khi mất sóng
 */

import type { CivicReportRequest, ProcedureItem } from '../types/api.types';

export const SQLITE_DB_NAME = 'smartward_mobile.db';

export interface CachedProcedureRow {
  procedure_code: string;
  procedure_name: string;
  category: string;
  processing_time: string | null;
  fee_text: string | null;
  required_docs: string; // JSON string
  legal_basis: string | null;
  form_type: string | null;
  updated_at: number;
}

export interface WalletQrPassRow {
  dossier_code: string;
  appointment_code: string | null;
  procedure_code: string;
  procedure_name: string;
  ward_code: string;
  ward_name: string;
  citizen_name: string;
  citizen_cccd_mask: string; // '********3490'
  citizen_last4: string; // '3490'
  citizen_email: string | null;
  status: string; // 'PENDING' | 'APPROVED' | 'SUPPLEMENT_REQUIRED' | 'REJECTED'
  officer_feedback: string | null;
  sla_deadline: string | null;
  qr_payload: string; // 'SMARTWARD_PASS|HS-...|LH-...|AG_P_LONGXUYEN'
  synced_at: number;
}

export interface OfflineIncidentQueueRow {
  local_id: string;
  payload_json: string;
  retry_count: number;
  last_error: string | null;
  created_at: number;
}

export const SQLITE_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS cached_procedures (
    procedure_code   TEXT PRIMARY KEY NOT NULL,
    procedure_name   TEXT NOT NULL,
    category         TEXT NOT NULL,
    processing_time  TEXT,
    fee_text         TEXT,
    required_docs    TEXT NOT NULL,
    legal_basis      TEXT,
    form_type        TEXT,
    updated_at       INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS wallet_qr_passes (
    dossier_code      TEXT PRIMARY KEY NOT NULL,
    appointment_code  TEXT,
    procedure_code    TEXT NOT NULL,
    procedure_name    TEXT NOT NULL,
    ward_code         TEXT NOT NULL,
    ward_name         TEXT NOT NULL,
    citizen_name      TEXT NOT NULL,
    citizen_cccd_mask TEXT NOT NULL,
    citizen_last4     TEXT NOT NULL,
    citizen_email     TEXT,
    status            TEXT NOT NULL,
    officer_feedback  TEXT,
    sla_deadline      TEXT,
    qr_payload        TEXT NOT NULL,
    synced_at         INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS offline_incident_queue (
    local_id          TEXT PRIMARY KEY NOT NULL,
    payload_json      TEXT NOT NULL,
    retry_count       INTEGER DEFAULT 0,
    last_error        TEXT,
    created_at        INTEGER NOT NULL
  );`,
] as const;

interface MinimalSQLiteDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: unknown[]): Promise<unknown>;
  getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]>;
}

let dbInstance: MinimalSQLiteDatabase | null = null;
let initialized = false;

// Graceful in-memory fallback when running unit tests in pure Node (without Expo native SQLite)
const memoryProcedures = new Map<string, CachedProcedureRow>();
const memoryWalletPasses = new Map<string, WalletQrPassRow>();
const memoryIncidentQueue = new Map<string, OfflineIncidentQueueRow>();

async function getDatabase(): Promise<MinimalSQLiteDatabase | null> {
  if (initialized) return dbInstance;
  initialized = true;
  try {
    const SQLite = await import('expo-sqlite');
    if (typeof SQLite.openDatabaseAsync === 'function') {
      const db = await SQLite.openDatabaseAsync(SQLITE_DB_NAME);
      for (const stmt of SQLITE_SCHEMA_STATEMENTS) {
        await db.execAsync(stmt);
      }
      dbInstance = db as unknown as MinimalSQLiteDatabase;
      return dbInstance;
    }
  } catch {
    dbInstance = null;
  }
  return null;
}

export async function initLocalDatabase(): Promise<void> {
  await getDatabase();
}

// ============================================================================
// 1. cached_procedures CRUD
// ============================================================================

export async function upsertCachedProcedures(items: ProcedureItem[]): Promise<void> {
  const now = Date.now();
  const db = await getDatabase();

  for (const item of items) {
    const row: CachedProcedureRow = {
      procedure_code: item.procedureCode,
      procedure_name: item.procedureName,
      category: item.category,
      processing_time: item.processingTime || null,
      fee_text: item.fee || null,
      required_docs: JSON.stringify([]),
      legal_basis: item.officialPortalCode || null,
      form_type: item.formType || null,
      updated_at: now,
    };

    if (db) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_procedures
          (procedure_code, procedure_name, category, processing_time, fee_text, required_docs, legal_basis, form_type, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        row.procedure_code,
        row.procedure_name,
        row.category,
        row.processing_time,
        row.fee_text,
        row.required_docs,
        row.legal_basis,
        row.form_type,
        row.updated_at
      );
    } else {
      memoryProcedures.set(row.procedure_code, row);
    }
  }
}

export async function getCachedProcedures(): Promise<CachedProcedureRow[]> {
  const db = await getDatabase();
  if (db) {
    return db.getAllAsync<CachedProcedureRow>(
      'SELECT * FROM cached_procedures ORDER BY procedure_code ASC'
    );
  }
  return Array.from(memoryProcedures.values()).sort((a, b) =>
    a.procedure_code.localeCompare(b.procedure_code)
  );
}

// ============================================================================
// 2. wallet_qr_passes CRUD
// ============================================================================

export function buildSmartWardPassPayload(
  dossierCode: string,
  appointmentCode: string | null | undefined,
  wardCode: string
): string {
  return `SMARTWARD_PASS|${dossierCode}|${appointmentCode || 'PENDING'}|${wardCode}`;
}

export async function upsertWalletQrPass(row: WalletQrPassRow): Promise<void> {
  const db = await getDatabase();
  if (db) {
    await db.runAsync(
      `INSERT OR REPLACE INTO wallet_qr_passes
        (dossier_code, appointment_code, procedure_code, procedure_name, ward_code, ward_name,
         citizen_name, citizen_cccd_mask, citizen_last4, citizen_email, status, officer_feedback,
         sla_deadline, qr_payload, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.dossier_code,
      row.appointment_code,
      row.procedure_code,
      row.procedure_name,
      row.ward_code,
      row.ward_name,
      row.citizen_name,
      row.citizen_cccd_mask,
      row.citizen_last4,
      row.citizen_email,
      row.status,
      row.officer_feedback,
      row.sla_deadline,
      row.qr_payload,
      row.synced_at
    );
  } else {
    memoryWalletPasses.set(row.dossier_code, row);
  }
}

export async function getAllWalletQrPasses(): Promise<WalletQrPassRow[]> {
  const db = await getDatabase();
  if (db) {
    return db.getAllAsync<WalletQrPassRow>(
      'SELECT * FROM wallet_qr_passes ORDER BY synced_at DESC'
    );
  }
  return Array.from(memoryWalletPasses.values()).sort((a, b) => b.synced_at - a.synced_at);
}

export async function deleteWalletQrPass(dossierCode: string): Promise<void> {
  const db = await getDatabase();
  if (db) {
    await db.runAsync('DELETE FROM wallet_qr_passes WHERE dossier_code = ?', dossierCode);
  } else {
    memoryWalletPasses.delete(dossierCode);
  }
}

// ============================================================================
// 3. offline_incident_queue CRUD
// ============================================================================

export async function enqueueOfflineIncident(
  payload: CivicReportRequest
): Promise<OfflineIncidentQueueRow> {
  const row: OfflineIncidentQueueRow = {
    local_id: `OFFLINE_INC_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    payload_json: JSON.stringify(payload),
    retry_count: 0,
    last_error: null,
    created_at: Date.now(),
  };

  const db = await getDatabase();
  if (db) {
    await db.runAsync(
      `INSERT INTO offline_incident_queue (local_id, payload_json, retry_count, last_error, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      row.local_id,
      row.payload_json,
      row.retry_count,
      row.last_error,
      row.created_at
    );
  } else {
    memoryIncidentQueue.set(row.local_id, row);
  }
  return row;
}

export async function getOfflineIncidentQueue(): Promise<OfflineIncidentQueueRow[]> {
  const db = await getDatabase();
  if (db) {
    return db.getAllAsync<OfflineIncidentQueueRow>(
      'SELECT * FROM offline_incident_queue ORDER BY created_at ASC'
    );
  }
  return Array.from(memoryIncidentQueue.values()).sort((a, b) => a.created_at - b.created_at);
}

export async function markOfflineIncidentRetry(localId: string, errorMessage: string): Promise<void> {
  const db = await getDatabase();
  if (db) {
    await db.runAsync(
      'UPDATE offline_incident_queue SET retry_count = retry_count + 1, last_error = ? WHERE local_id = ?',
      errorMessage,
      localId
    );
  } else {
    const existing = memoryIncidentQueue.get(localId);
    if (existing) {
      memoryIncidentQueue.set(localId, {
        ...existing,
        retry_count: existing.retry_count + 1,
        last_error: errorMessage,
      });
    }
  }
}

export async function removeOfflineIncident(localId: string): Promise<void> {
  const db = await getDatabase();
  if (db) {
    await db.runAsync('DELETE FROM offline_incident_queue WHERE local_id = ?', localId);
  } else {
    memoryIncidentQueue.delete(localId);
  }
}
