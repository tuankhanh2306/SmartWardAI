/**
 * SmartWard AI Mobile — Lưu Bền Ảnh Đính Kèm, Tiến Độ Tải & Khóa Chống Gửi Trùng (TASK-058)
 * - Sao chép ảnh vào documentDirectory/dossier_attachments/ (expo-file-system/legacy) để không mất khi đóng app
 * - Lưu manifest (vai trò, số trang, mã liên kết bền documentCode, token xem 1 lần oneTimeToken, tiến độ) qua AsyncStorage
 * - Dùng lại cùng idempotencyKey khi thử gửi lại cùng nội dung hồ sơ (chống tạo hồ sơ trùng)
 */

import type { CapturedDocumentPage } from '../core/birthDocumentWorkflow';
import type { CoreFormType } from '../types/api.types';

export const DOSSIER_ATTACHMENTS_DIR_NAME = 'dossier_attachments/';
const STORAGE_PREFIX = 'smartward_dossier_attachments_v1_';

export interface PersistedSubmissionIntent {
  payloadSignature: string;
  idempotencyKey: string;
  updatedAt: number;
}

export interface PersistedDossierAttachmentState {
  formType: CoreFormType;
  pages: CapturedDocumentPage[];
  submissionIntent?: PersistedSubmissionIntent | null;
  updatedAt: number;
}

const memoryStore = new Map<string, string>();

async function readStorageRaw(key: string): Promise<string | null> {
  try {
    const mod = require('@react-native-async-storage/async-storage');
    const AsyncStorage = mod?.default ?? mod;
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {
    // Fallback to memory store in unit test / non-native environment
  }
  return memoryStore.get(key) ?? null;
}

async function writeStorageRaw(key: string, value: string): Promise<void> {
  memoryStore.set(key, value);
  try {
    const mod = require('@react-native-async-storage/async-storage');
    const AsyncStorage = mod?.default ?? mod;
    if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
      await AsyncStorage.setItem(key, value);
    }
  } catch {
    // Kept in memoryStore
  }
}

async function removeStorageRaw(key: string): Promise<void> {
  memoryStore.delete(key);
  try {
    const mod = require('@react-native-async-storage/async-storage');
    const AsyncStorage = mod?.default ?? mod;
    if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
      await AsyncStorage.removeItem(key);
    }
  } catch {
    // Removed from memoryStore
  }
}

/**
 * Copies a captured photo URI into durable app storage so it survives app restarts & cache eviction.
 */
export async function persistDossierPhotoToDurableDir(localUri: string): Promise<string> {
  if (!localUri) return localUri;
  try {
    const FileSystem = require('expo-file-system/legacy') as unknown as {
      documentDirectory?: string | null;
      makeDirectoryAsync?: (uri: string, opts?: { intermediates?: boolean }) => Promise<void>;
      copyAsync?: (opts: { from: string; to: string }) => Promise<void>;
    };
    const baseDir = FileSystem.documentDirectory;
    if (!baseDir || typeof FileSystem.copyAsync !== 'function') {
      return localUri;
    }
    const targetDir = `${baseDir}${DOSSIER_ATTACHMENTS_DIR_NAME}`;
    if (localUri.startsWith(targetDir)) {
      return localUri;
    }
    if (typeof FileSystem.makeDirectoryAsync === 'function') {
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    }
    const ext = localUri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    const dest = `${targetDir}att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await FileSystem.copyAsync({ from: localUri, to: dest });
    return dest;
  } catch {
    return localUri;
  }
}

export async function deleteDurableDossierPhoto(uri: string): Promise<boolean> {
  if (!uri) return false;
  try {
    const FileSystem = require('expo-file-system/legacy') as unknown as {
      deleteAsync?: (target: string, opts?: { idempotent?: boolean }) => Promise<void>;
    };
    if (typeof FileSystem.deleteAsync === 'function') {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      return true;
    }
  } catch {
    // Non-native fallback
  }
  return false;
}

export async function savePersistedDossierAttachments(
  formType: CoreFormType,
  pages: CapturedDocumentPage[],
  submissionIntent?: PersistedSubmissionIntent | null
): Promise<void> {
  const existing = await loadPersistedDossierAttachments(formType);
  const next: PersistedDossierAttachmentState = {
    formType,
    pages,
    submissionIntent: submissionIntent !== undefined ? submissionIntent : existing?.submissionIntent ?? null,
    updatedAt: Date.now(),
  };
  await writeStorageRaw(`${STORAGE_PREFIX}${formType}`, JSON.stringify(next));
}

export async function loadPersistedDossierAttachments(
  formType: CoreFormType
): Promise<PersistedDossierAttachmentState | null> {
  const raw = await readStorageRaw(`${STORAGE_PREFIX}${formType}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedDossierAttachmentState;
    if (!parsed || !Array.isArray(parsed.pages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearPersistedDossierAttachments(formType: CoreFormType): Promise<void> {
  await removeStorageRaw(`${STORAGE_PREFIX}${formType}`);
}

/**
 * Computes a deterministic signature of submission content so identical retries reuse the same Idempotency-Key.
 */
export function computeSubmissionPayloadSignature(params: {
  procedureCode: string;
  wardCode: string;
  citizenCccd: string;
  formData: Record<string, unknown>;
}): string {
  const sortedKeys = Object.keys(params.formData || {}).sort();
  const normalizedData: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    if (k === 'attachedDocuments') continue;
    normalizedData[k] = params.formData[k];
  }
  return JSON.stringify({
    p: params.procedureCode.trim().toUpperCase(),
    w: params.wardCode.trim().toUpperCase(),
    c: params.citizenCccd.trim(),
    d: normalizedData,
  });
}

/**
 * Returns the persisted Idempotency-Key when retrying identical dossier content (even after app restart),
 * or generates and persists a fresh Idempotency-Key when dossier content changes.
 */
export async function resolveOrCreateSubmissionIdempotencyKey(
  formType: CoreFormType,
  payloadSignature: string,
  cccdLast4: string
): Promise<string> {
  const state = await loadPersistedDossierAttachments(formType);
  if (
    state?.submissionIntent &&
    state.submissionIntent.payloadSignature === payloadSignature &&
    state.submissionIntent.idempotencyKey
  ) {
    return state.submissionIntent.idempotencyKey;
  }

  const freshKey = `MOB-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${cccdLast4}`;
  await savePersistedDossierAttachments(formType, state?.pages ?? [], {
    payloadSignature,
    idempotencyKey: freshKey,
    updatedAt: Date.now(),
  });
  return freshKey;
}

export function resetDossierAttachmentMemoryStoreForTests(): void {
  memoryStore.clear();
}
