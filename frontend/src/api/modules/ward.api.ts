import api from './http';
import type { WardItem } from '../../data/anGiangWards';

export interface WardListApiResponse {
  totalCount: number;
  source: string;
  updatedAt: string;
  wards: WardItem[];
}

const WARDS_CACHE_KEY = 'smartward_wards_catalog_cache_v1';
const WARDS_CACHE_TTL_MS = 15 * 60 * 1000;

interface CachedWardsPayload {
  cachedAt: number;
  wards: WardItem[];
}

export function loadCachedWards(): WardItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(WARDS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedWardsPayload;
    if (!parsed || !Array.isArray(parsed.wards) || parsed.wards.length === 0) {
      return null;
    }
    return parsed.wards.filter((w) => w && w.code && w.code !== 'AG_PROVINCE');
  } catch {
    return null;
  }
}

export function isWardsCacheFresh(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(WARDS_CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as CachedWardsPayload;
    return Boolean(parsed?.cachedAt && Date.now() - parsed.cachedAt < WARDS_CACHE_TTL_MS);
  } catch {
    return false;
  }
}

export async function fetchWardsFromBackend(options?: {
  includeBoundary?: boolean;
  timeoutMs?: number;
}): Promise<WardItem[] | null> {
  try {
    const resp = await api.get('/wards', {
      params: { includeBoundary: options?.includeBoundary ?? true },
      timeout: options?.timeoutMs ?? 5000,
    });
    const payload: WardListApiResponse | undefined = resp.data?.data ?? resp.data;
    const list = Array.isArray(payload?.wards) ? payload.wards : [];
    const normalized: WardItem[] = list
      .filter((w) => w && w.code && w.code !== 'AG_PROVINCE')
      .map((w) => ({
        ...w,
        area: w.area || w.province || 'Tỉnh An Giang',
        province: w.province || 'Tỉnh An Giang',
        phoneNumber: w.phoneNumber || '(0296) 3855 100',
        workingHours: w.workingHours || 'Sáng: 07:00 – 11:00 | Chiều: 13:00 – 17:00 (Thứ 2 – Thứ 6)',
        onlineServices: Array.isArray(w.onlineServices) ? w.onlineServices : [],
        totalOpenIncidents: typeof w.totalOpenIncidents === 'number' ? w.totalOpenIncidents : 0,
        solvedRate: typeof w.solvedRate === 'number' ? w.solvedRate : 97.5,
      }));

    if (normalized.length > 0 && typeof window !== 'undefined') {
      try {
        const cachePayload: CachedWardsPayload = {
          cachedAt: Date.now(),
          wards: normalized,
        };
        window.localStorage.setItem(WARDS_CACHE_KEY, JSON.stringify(cachePayload));
      } catch {
        // Ignore storage quota issues
      }
      return normalized;
    }
    return null;
  } catch {
    return null;
  }
}
