import { api } from './http';

// ============================================================================
// 1.1 Citizen Dossier Database API Models (Milestone 4 - F10, F11)
// ============================================================================

export interface SubmitDossierPayload {
  dossierCode?: string;
  procedureCode: string;
  wardCode: string;
  citizenCccd: string;
  formData: Record<string, any>;
  precheckReport?: Record<string, any>;
  vaultDocIds?: string[];
  idempotencyKey?: string;
}

export interface DossierSubmissionResponse {
  dossierCode: string;
  procedureCode: string;
  wardCode: string;
  status: string;
  slaDeadline?: string | null;
  createdAt: string;
}

export interface DossierTimelineEvent {
  id: number;
  dossierCode: string;
  who: string;
  fromStatus?: string;
  toStatus: string;
  reason?: string;
  createdAt: string;
}

export interface DossierTrackingResponse {
  dossierCode: string;
  procedureCode: string;
  procedureName: string;
  wardCode: string;
  citizenCccd: string;
  status: 'PENDING' | 'APPROVED' | 'SUPPLEMENT_REQUIRED' | 'REJECTED' | string;
  slaDeadline?: string | null;
  officerFeedback?: string;
  appointmentCode?: string;
  precheckReport?: any;
  vaultDocIds?: string[];
  createdAt: string;
  updatedAt: string;
  timeline?: DossierTimelineEvent[];
}

export interface OfficerReviewPayload {
  status: 'APPROVED' | 'SUPPLEMENT_REQUIRED' | 'REJECTED';
  officerFeedback?: string;
  reviewStatus?: string;
  feedbackReason?: string;
  appointmentCode?: string;
}

export interface OfficerDossierItem {
  id: number | string;
  dossierCode: string;
  procedureCode: string;
  procedureName: string;
  wardCode: string;
  citizenCccd: string;
  citizenName: string;
  status: 'PENDING' | 'APPROVED' | 'SUPPLEMENT_REQUIRED' | 'REJECTED' | 'VALID' | 'HAS_ERRORS' | string;
  slaDeadline?: string | null;
  officerFeedback?: string;
  appointmentCode?: string;
  formData: Record<string, any>;
  precheckReport?: Record<string, any>;
  vaultDocIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export const UNVERIFIED_SLA_TEXT = 'Chưa xác định (chờ cán bộ Một cửa xác nhận)';

/**
 * Formats an optional ISO SLA deadline for citizen display; returns explicit fallback text
 * when procedural working days are unverified (sla_working_days = NULL).
 */
export function formatSlaDeadlineVi(slaDeadline?: string | null, withSeconds = false): string {
  if (!slaDeadline) {
    return UNVERIFIED_SLA_TEXT;
  }
  const parsed = new Date(slaDeadline);
  if (Number.isNaN(parsed.getTime())) {
    return UNVERIFIED_SLA_TEXT;
  }
  const datePart = parsed.toLocaleDateString('vi-VN');
  return withSeconds ? `${datePart} (17:00:00)` : `${datePart} 17:00`;
}

/**
 * Submit citizen dossier to PostgreSQL backend with Idempotency Key (7.4)
 */
export const submitDossier = async (payload: SubmitDossierPayload): Promise<DossierSubmissionResponse> => {
  const idempotencyKey = payload.idempotencyKey || `IDEMP_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const enrichedPayload = { ...payload, idempotencyKey };
  const resp = await api.post<any>('/dossiers', enrichedPayload, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  });
  const data = resp.data?.data ? resp.data.data : resp.data;
  return data as DossierSubmissionResponse;
};

/**
 * Track citizen dossier progress via dossierCode and last 4 CCCD digits from PostgreSQL
 */
export const trackDossier = async (
  dossierCode: string,
  last4Cccd?: string,
  citizenCccd?: string
): Promise<DossierTrackingResponse> => {
  const cleanCode = dossierCode.trim();
  const cleanLast4 = (last4Cccd && last4Cccd.trim().length === 4)
    ? last4Cccd.trim()
    : (citizenCccd && citizenCccd.trim().length >= 4
        ? citizenCccd.trim().substring(citizenCccd.trim().length - 4)
        : (last4Cccd || '').trim());

  // SEC-04: Secure dossier tracking via POST body with 4-digit last4Cccd
  const resp = await api.post<any>('/dossiers/track', {
    dossierCode: cleanCode,
    last4Cccd: cleanLast4,
  });
  const data = resp.data?.data ? resp.data.data : resp.data;
  return data as DossierTrackingResponse;
};

/**
 * Officer retrieves dossiers for review from PostgreSQL
 */
export const getOfficerDossiers = async (wardCode?: string, status?: string): Promise<OfficerDossierItem[]> => {
  const params: Record<string, string> = {};
  if (wardCode) params.wardCode = wardCode.trim();
  if (status) params.status = status.trim();

  const resp = await api.get<any>('/dossiers/officer/list', { params });
  const data = resp.data?.data ? resp.data.data : resp.data;
  return Array.isArray(data) ? data : [];
};

/**
 * Officer reviews, approves, or requests supplement on citizen dossier in PostgreSQL
 */
export const reviewOfficerDossier = async (
  dossierCode: string,
  payload: OfficerReviewPayload
): Promise<OfficerDossierItem> => {
  const resp = await api.put<any>(`/dossiers/${encodeURIComponent(dossierCode.trim())}/review`, payload);
  const data = resp.data?.data ? resp.data.data : resp.data;
  return data as OfficerDossierItem;
};

export interface LiveFormDossier {
  id: string;
  citizenName: string;
  procedure: string;
  formType: 'CT01' | 'Khai sinh' | 'Kết hôn' | 'Bảo trợ';
  submittedAt: string;
  status: 'PENDING' | 'VALID' | 'HAS_ERRORS';
  cccd: string;
  citizenEmail?: string;
  contactPhone?: string;
  appointmentCode?: string;
  errorCount: number;
  wardName?: string;
  officerFeedback?: string;
  reviewedBy?: string;
  vaultViewUsed?: boolean;
  vaultToken?: string;
  vaultDocId?: string;
  details: {
    dob: string;
    gender: string;
    address: string;
    confidence: number;
    sharpnessScore?: number;
    templateMatched?: boolean;
    issues: string[];
    vaultToken?: string;
  };
}

export interface EmailNotificationItem {
  id: string;
  dossierId: string;
  recipientEmail: string;
  citizenName: string;
  subject: string;
  status: 'APPROVED' | 'SUPPLEMENT_REQUIRED';
  wardName: string;
  reviewerName: string;
  feedbackText: string;
  appointmentCode?: string;
  sentAt: string;
}

const LIVE_DOSSIERS_STORAGE_KEY = 'smartward_live_dossiers_v1';
const EMAIL_NOTIFICATIONS_STORAGE_KEY = 'smartward_email_notifications_v1';

export const getCitizenEmailNotifications = (): EmailNotificationItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EMAIL_NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function sendCitizenEmailNotification(item: Omit<EmailNotificationItem, 'id' | 'sentAt'>): EmailNotificationItem {
  const now = new Date();
  const fullItem: EmailNotificationItem = {
    ...item,
    id: `EMAIL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    sentAt: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`,
  };
  if (typeof window !== 'undefined') {
    try {
      const existing = getCitizenEmailNotifications();
      localStorage.setItem(EMAIL_NOTIFICATIONS_STORAGE_KEY, JSON.stringify([fullItem, ...existing].slice(0, 30)));
    } catch {
      // ignore storage errors
    }
  }
  return fullItem;
}

export const getLiveSubmittedDossiers = (): LiveFormDossier[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LIVE_DOSSIERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function saveLiveSubmittedDossier(dossier: LiveFormDossier) {
  if (typeof window === 'undefined') return;
  try {
    // SEC-P3: Strip PII before persisting to local storage (7.3)
    const cleanCccd = dossier.cccd ? (dossier.cccd.length >= 4 ? '********' + dossier.cccd.slice(-4) : '***') : '';
    const sanitized: LiveFormDossier = {
      ...dossier,
      cccd: cleanCccd,
      contactPhone: undefined,
      citizenEmail: undefined,
      vaultToken: undefined,
      details: {
        ...dossier.details,
        address: '',
        vaultToken: undefined,
      },
    };
    const existing = getLiveSubmittedDossiers();
    const updated = [sanitized, ...existing.filter((d) => d.id !== dossier.id)].slice(0, 50);
    localStorage.setItem(LIVE_DOSSIERS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

export function updateLiveDossierStatus(
  id: string,
  status: 'PENDING' | 'VALID' | 'HAS_ERRORS',
  officerFeedback?: string,
  reviewedBy?: string,
  appointmentCode?: string
): LiveFormDossier | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = getLiveSubmittedDossiers();
    let updatedItem: LiveFormDossier | null = null;
    const next = existing.map((d) => {
      if (d.id === id) {
        updatedItem = {
          ...d,
          status,
          errorCount: status === 'VALID' ? 0 : Math.max(1, d.errorCount),
          officerFeedback: officerFeedback ?? d.officerFeedback,
          reviewedBy: reviewedBy ?? d.reviewedBy,
          appointmentCode: appointmentCode ?? d.appointmentCode,
        };
        return updatedItem;
      }
      return d;
    });
    if (updatedItem) {
      localStorage.setItem(LIVE_DOSSIERS_STORAGE_KEY, JSON.stringify(next));
    }
    return updatedItem;
  } catch {
    return null;
  }
}

export function consumeLiveDossierVaultToken(id: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const existing = getLiveSubmittedDossiers();
    const next = existing.map((d) => (d.id === id ? { ...d, vaultViewUsed: true } : d));
    localStorage.setItem(LIVE_DOSSIERS_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function isVaultTokenConsumedForDossier(_id: string): boolean {
  // P3: Authoritative consumption state is returned by the server API (HTTP 410) (7.3)
  return false;
}
