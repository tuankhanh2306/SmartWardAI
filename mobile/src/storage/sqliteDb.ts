/**
 * SmartWard AI Mobile — Cơ sở dữ liệu Cục bộ Offline (expo-sqlite)
 * Database: smartward_mobile.db
 * 3 Bảng theo Đặc tả SW-PLAN-MOBILE-2026 Mục 5:
 *   1. cached_procedures        — 40 TTHC An Giang 2026 (Tra cứu Offline 100%)
 *   2. wallet_qr_passes         — Ví Phiếu Hẹn Điện Tử Có Mã QR (Không cần sóng 4G)
 *   3. offline_incident_queue   — Hàng đợi Gửi Phản ánh Sự cố khi mất sóng
 */

import type { CivicReportRequest, IncidentCategory, ProcedureItem } from '../types/api.types';
import type { IncidentErrorCategory, IncidentSyncStatus } from '../core/incidentSyncHistory';
import {
  buildSqlCipherPragmaKeyStatement,
  decryptWalletField,
  encryptWalletField,
  getOrCreateSqliteMasterKeyHex,
} from './sqliteEncryption';

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
  photo_uris_json?: string;
  retry_count: number;
  last_error: string | null;
  created_at: number;
}

export interface IncidentSyncHistoryRow {
  local_id: string;
  category: IncidentCategory;
  title: string;
  description: string;
  address_text: string;
  reporter_phone: string;
  latitude: number;
  longitude: number;
  location_source: string;
  target_ward_code: string;
  target_ward_name: string;
  sync_status: IncidentSyncStatus;
  report_code: string | null;
  cluster_code: string | null;
  error_category: IncidentErrorCategory | null;
  last_error: string | null;
  retry_count: number;
  created_at: number;
  updated_at: number;
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
    photo_uris_json   TEXT DEFAULT '[]',
    retry_count       INTEGER DEFAULT 0,
    last_error        TEXT,
    created_at        INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS incident_sync_history (
    local_id          TEXT PRIMARY KEY NOT NULL,
    category          TEXT NOT NULL,
    title             TEXT NOT NULL,
    description       TEXT NOT NULL,
    address_text      TEXT NOT NULL,
    reporter_phone    TEXT NOT NULL,
    latitude          REAL NOT NULL,
    longitude         REAL NOT NULL,
    location_source   TEXT NOT NULL,
    target_ward_code  TEXT NOT NULL,
    target_ward_name  TEXT NOT NULL,
    sync_status       TEXT NOT NULL,
    report_code       TEXT,
    cluster_code      TEXT,
    error_category    TEXT,
    last_error        TEXT,
    retry_count       INTEGER DEFAULT 0,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL
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
const memoryIncidentHistory = new Map<string, IncidentSyncHistoryRow>();

async function getDatabase(): Promise<MinimalSQLiteDatabase | null> {
  if (initialized) return dbInstance;
  initialized = true;
  try {
    const SQLite = require('expo-sqlite') as typeof import('expo-sqlite');
    if (typeof SQLite.openDatabaseAsync === 'function') {
      const db = await SQLite.openDatabaseAsync(SQLITE_DB_NAME);
      try {
        const masterKeyHex = await getOrCreateSqliteMasterKeyHex();
        await db.execAsync(buildSqlCipherPragmaKeyStatement(masterKeyHex));
      } catch {
        // Native SQLCipher pragma unavailable in non-SQLCipher runtime; column-level AES-256-GCM still active
      }
      for (const stmt of SQLITE_SCHEMA_STATEMENTS) {
        await db.execAsync(stmt);
      }
      try {
        await db.execAsync("ALTER TABLE offline_incident_queue ADD COLUMN photo_uris_json TEXT DEFAULT '[]';");
      } catch {
        // Column already exists on fresh or migrated DB
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
  if (!appointmentCode || appointmentCode === 'PENDING') {
    return `SW_DRAFT|${dossierCode}|${wardCode}`;
  }
  return `SW_DRAFT|${dossierCode}|${appointmentCode}|${wardCode}`;
}

export function buildOfficialReceiptQrPayload(
  officialReceiptNo: string,
  receivingAgency: string,
  dueDate?: string | null
): string {
  return `SW_RECEIPT|${officialReceiptNo}|${receivingAgency}|${dueDate || 'TBD'}`;
}

export async function upsertWalletQrPass(row: WalletQrPassRow): Promise<void> {
  const [
    encCitizenName,
    encCccdMask,
    encLast4,
    encEmail,
    encFeedback,
    encQrPayload,
  ] = await Promise.all([
    encryptWalletField(row.citizen_name),
    encryptWalletField(row.citizen_cccd_mask),
    encryptWalletField(row.citizen_last4),
    encryptWalletField(row.citizen_email),
    encryptWalletField(row.officer_feedback),
    encryptWalletField(row.qr_payload),
  ]);

  const encryptedRow: WalletQrPassRow = {
    ...row,
    citizen_name: encCitizenName ?? '',
    citizen_cccd_mask: encCccdMask ?? '',
    citizen_last4: encLast4 ?? '',
    citizen_email: encEmail,
    officer_feedback: encFeedback,
    qr_payload: encQrPayload ?? '',
  };

  const db = await getDatabase();
  if (db) {
    await db.runAsync(
      `INSERT OR REPLACE INTO wallet_qr_passes
        (dossier_code, appointment_code, procedure_code, procedure_name, ward_code, ward_name,
         citizen_name, citizen_cccd_mask, citizen_last4, citizen_email, status, officer_feedback,
         sla_deadline, qr_payload, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      encryptedRow.dossier_code,
      encryptedRow.appointment_code,
      encryptedRow.procedure_code,
      encryptedRow.procedure_name,
      encryptedRow.ward_code,
      encryptedRow.ward_name,
      encryptedRow.citizen_name,
      encryptedRow.citizen_cccd_mask,
      encryptedRow.citizen_last4,
      encryptedRow.citizen_email,
      encryptedRow.status,
      encryptedRow.officer_feedback,
      encryptedRow.sla_deadline,
      encryptedRow.qr_payload,
      encryptedRow.synced_at
    );
  } else {
    memoryWalletPasses.set(encryptedRow.dossier_code, encryptedRow);
  }
}

async function decryptWalletQrPassRow(row: WalletQrPassRow): Promise<WalletQrPassRow> {
  const [
    citizenName,
    cccdMask,
    last4,
    email,
    feedback,
    qrPayload,
  ] = await Promise.all([
    decryptWalletField(row.citizen_name),
    decryptWalletField(row.citizen_cccd_mask),
    decryptWalletField(row.citizen_last4),
    decryptWalletField(row.citizen_email),
    decryptWalletField(row.officer_feedback),
    decryptWalletField(row.qr_payload),
  ]);

  return {
    ...row,
    citizen_name: citizenName ?? '',
    citizen_cccd_mask: cccdMask ?? '',
    citizen_last4: last4 ?? '',
    citizen_email: email,
    officer_feedback: feedback,
    qr_payload: qrPayload ?? '',
  };
}

export async function getAllWalletQrPasses(): Promise<WalletQrPassRow[]> {
  const db = await getDatabase();
  const rawRows = db
    ? await db.getAllAsync<WalletQrPassRow>('SELECT * FROM wallet_qr_passes ORDER BY synced_at DESC')
    : Array.from(memoryWalletPasses.values()).sort((a, b) => b.synced_at - a.synced_at);

  return Promise.all(rawRows.map(decryptWalletQrPassRow));
}

export function getRawMemoryWalletPassForTests(dossierCode: string): WalletQrPassRow | undefined {
  return memoryWalletPasses.get(dossierCode);
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
// 3. offline_incident_queue CRUD & Durable Offline Photo Storage (TASK-030)
// ============================================================================

export const OFFLINE_INCIDENT_PHOTOS_DIR_NAME = 'offline_incident_photos/';

export async function persistOfflineIncidentPhotos(localUris: string[]): Promise<string[]> {
  if (!localUris || localUris.length === 0) return [];
  try {
    const FileSystem = require('expo-file-system/legacy') as unknown as {
      documentDirectory?: string | null;
      makeDirectoryAsync?: (uri: string, opts?: { intermediates?: boolean }) => Promise<void>;
      copyAsync?: (opts: { from: string; to: string }) => Promise<void>;
    };
    const baseDir = FileSystem.documentDirectory;
    if (!baseDir || typeof FileSystem.copyAsync !== 'function') {
      return localUris.slice(0, 3);
    }
    const targetDir = `${baseDir}${OFFLINE_INCIDENT_PHOTOS_DIR_NAME}`;
    if (typeof FileSystem.makeDirectoryAsync === 'function') {
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    }
    const persisted: string[] = [];
    for (const uri of localUris.slice(0, 3)) {
      if (uri.startsWith(targetDir)) {
        persisted.push(uri);
        continue;
      }
      const ext = uri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
      const dest = `${targetDir}inc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      persisted.push(dest);
    }
    return persisted;
  } catch {
    return localUris.slice(0, 3);
  }
}

export async function cleanupOfflineIncidentPhotos(localUris: string[]): Promise<void> {
  if (!localUris || localUris.length === 0) return;
  try {
    const FileSystem = require('expo-file-system/legacy') as unknown as {
      deleteAsync?: (uri: string, opts?: { idempotent?: boolean }) => Promise<void>;
    };
    if (typeof FileSystem.deleteAsync !== 'function') return;
    for (const uri of localUris) {
      if (uri.includes(OFFLINE_INCIDENT_PHOTOS_DIR_NAME)) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    }
  } catch {
    // Best-effort cleanup
  }
}

export async function enqueueOfflineIncident(
  payload: CivicReportRequest,
  localPhotoUris: string[] = []
): Promise<OfflineIncidentQueueRow> {
  const row: OfflineIncidentQueueRow = {
    local_id: `OFFLINE_INC_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    payload_json: JSON.stringify(payload),
    photo_uris_json: JSON.stringify(localPhotoUris.slice(0, 3)),
    retry_count: 0,
    last_error: null,
    created_at: Date.now(),
  };

  const db = await getDatabase();
  if (db) {
    await db.runAsync(
      `INSERT INTO offline_incident_queue (local_id, payload_json, photo_uris_json, retry_count, last_error, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      row.local_id,
      row.payload_json,
      row.photo_uris_json ?? '[]',
      row.retry_count,
      row.last_error,
      row.created_at
    );
  } else {
    memoryIncidentQueue.set(row.local_id, row);
  }
  return row;
}

export async function updateOfflineIncidentState(
  localId: string,
  payload: CivicReportRequest,
  remainingPhotoUris: string[]
): Promise<void> {
  const payloadJson = JSON.stringify(payload);
  const photoUrisJson = JSON.stringify(remainingPhotoUris.slice(0, 3));
  const db = await getDatabase();
  if (db) {
    await db.runAsync(
      'UPDATE offline_incident_queue SET payload_json = ?, photo_uris_json = ? WHERE local_id = ?',
      payloadJson,
      photoUrisJson,
      localId
    );
  } else {
    const existing = memoryIncidentQueue.get(localId);
    if (existing) {
      memoryIncidentQueue.set(localId, {
        ...existing,
        payload_json: payloadJson,
        photo_uris_json: photoUrisJson,
      });
    }
  }
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

// ============================================================================
// 4. incident_sync_history CRUD — Durable Receipt & Per-Incident Sync Log (TASK-055)
// ============================================================================

export async function upsertIncidentSyncHistory(row: IncidentSyncHistoryRow): Promise<void> {
  const db = await getDatabase();
  if (db) {
    await db.runAsync(
      `INSERT OR REPLACE INTO incident_sync_history
        (local_id, category, title, description, address_text, reporter_phone, latitude, longitude,
         location_source, target_ward_code, target_ward_name, sync_status, report_code, cluster_code,
         error_category, last_error, retry_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      row.local_id,
      row.category,
      row.title,
      row.description,
      row.address_text,
      row.reporter_phone,
      row.latitude,
      row.longitude,
      row.location_source,
      row.target_ward_code,
      row.target_ward_name,
      row.sync_status,
      row.report_code,
      row.cluster_code,
      row.error_category,
      row.last_error,
      row.retry_count,
      row.created_at,
      row.updated_at
    );
  } else {
    memoryIncidentHistory.set(row.local_id, row);
  }
}

export async function getIncidentSyncHistory(): Promise<IncidentSyncHistoryRow[]> {
  const db = await getDatabase();
  if (db) {
    return db.getAllAsync<IncidentSyncHistoryRow>(
      'SELECT * FROM incident_sync_history ORDER BY updated_at DESC, created_at DESC'
    );
  }
  return Array.from(memoryIncidentHistory.values()).sort(
    (a, b) => b.updated_at - a.updated_at || b.created_at - a.created_at
  );
}

export async function updateIncidentSyncHistoryStatus(
  localId: string,
  patch: Partial<IncidentSyncHistoryRow>
): Promise<void> {
  const existing = (await getIncidentSyncHistory()).find((item) => item.local_id === localId);
  if (!existing) return;
  await upsertIncidentSyncHistory({
    ...existing,
    ...patch,
    local_id: existing.local_id,
    updated_at: patch.updated_at ?? Date.now(),
  });
}

export async function deleteIncidentSyncHistory(localId: string): Promise<void> {
  const db = await getDatabase();
  if (db) {
    await db.runAsync('DELETE FROM incident_sync_history WHERE local_id = ?', localId);
  } else {
    memoryIncidentHistory.delete(localId);
  }
}
