/**
 * SmartWard AI Mobile — Danh mục 96 Xã, Phường, Đặc khu Tỉnh An Giang (2026)
 * Kế thừa 100% từ Web (anGiangWardsCatalog.ts + geoUtils.ts)
 * Tổng cộng: 96 Đơn vị Hành chính (14 Phường, 79 Xã, 3 Đặc khu: Phú Quốc, Kiên Hải, Thổ Châu)
 */

import { AN_GIANG_WARDS, type WardItem } from './angiangWardsCatalog';

export { AN_GIANG_WARDS, type WardItem };

export type WardFilterType = 'ALL' | 'Phường' | 'Xã' | 'Đặc khu';

export const DEFAULT_WARD: WardItem =
  AN_GIANG_WARDS.find((w) => w.code === 'AG_P_LONGXUYEN') || AN_GIANG_WARDS[0];

export const BBOX_AN_GIANG = {
  minLat: 9.15,
  maxLat: 11.0,
  minLng: 103.35,
  maxLng: 105.7,
} as const;

export function normalizeVietnameseText(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/**
 * Calculates Haversine great-circle distance in meters between two WGS84 coordinates.
 */
export function calculateHaversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 2D Ray-casting Point-in-Polygon test. Polygon ring uses GeoJSON [lng, lat] coordinates.
 */
export function isPointInPolygon(
  lat: number,
  lon: number,
  polygonRing: [number, number][]
): boolean {
  if (!polygonRing || polygonRing.length < 3) return false;
  let inside = false;
  const x = lon;
  const y = lat;
  const n = polygonRing.length;

  let p1x = polygonRing[0][0];
  let p1y = polygonRing[0][1];

  for (let i = 1; i <= n; i++) {
    const p2x = polygonRing[i % n][0];
    const p2y = polygonRing[i % n][1];

    if (y > Math.min(p1y, p2y)) {
      if (y <= Math.max(p1y, p2y)) {
        if (x <= Math.max(p1x, p2x)) {
          if (p1y !== p2y) {
            const xinters = ((y - p1y) * (p2x - p1x)) / (p2y - p1y) + p1x;
            if (p1x === p2x || x <= xinters) {
              inside = !inside;
            }
          }
        }
      }
    }
    p1x = p2x;
    p1y = p2y;
  }

  return inside;
}

/**
 * Finds the nearest administrative ward/commune/special zone in An Giang by GPS coordinates.
 */
export function findNearestWardByGps(
  lat: number,
  lon: number
): { ward: WardItem; distanceMeters: number } {
  let bestWard = DEFAULT_WARD;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const w of AN_GIANG_WARDS) {
    const dist = calculateHaversineMeters(lat, lon, w.lat, w.lon);
    if (dist < minDistance) {
      minDistance = dist;
      bestWard = w;
    }
  }

  return { ward: bestWard, distanceMeters: Math.round(minDistance) };
}

export interface WardResolutionResult {
  ward: WardItem;
  matchedBy: 'TEXT_BOX' | 'GPS_COORDS' | 'FALLBACK';
  distanceMeters: number;
}

/**
 * Resolves receiving Ward/Commune/Special Zone with strict priority:
 * Priority 1: Ward name detected in Citizen's Location Box (`TEXT_BOX`)
 * Priority 2: Nearest ward by GPS Haversine coordinates (`GPS_COORDS`)
 * Priority 3: Fallback wardCode or DEFAULT_WARD (`FALLBACK`)
 */
export function resolveWardFromLocationBox(
  addressText: string,
  lat?: number,
  lon?: number,
  fallbackWardCode?: string
): WardResolutionResult {
  const normAddr = normalizeVietnameseText(addressText);
  const sortedWards = [...AN_GIANG_WARDS].sort((a, b) => b.name.length - a.name.length);
  const hasValidCoords =
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon);

  if (normAddr) {
    // Pass 1: Match full ward name (e.g. "Phường Long Xuyên", "Đặc khu Phú Quốc")
    for (const w of sortedWards) {
      const fullNorm = normalizeVietnameseText(w.name);
      if (fullNorm && normAddr.includes(fullNorm)) {
        const dist = hasValidCoords ? calculateHaversineMeters(lat!, lon!, w.lat, w.lon) : 0;
        return { ward: w, matchedBy: 'TEXT_BOX', distanceMeters: Math.round(dist) };
      }
    }

    // Pass 2: Match core ward name without prefix ("phuong ", "xa ", "thi tran ", "dac khu ")
    for (const w of sortedWards) {
      const coreName = normalizeVietnameseText(w.name)
        .replace(/^(phuong|xa|thi tran|dac khu)\s+/i, '')
        .trim();
      if (coreName.length >= 4) {
        const escaped = coreName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
        if (regex.test(normAddr)) {
          const dist = hasValidCoords ? calculateHaversineMeters(lat!, lon!, w.lat, w.lon) : 0;
          return { ward: w, matchedBy: 'TEXT_BOX', distanceMeters: Math.round(dist) };
        }
      }
    }
  }

  // Priority 2: GPS coordinates nearest ward
  if (hasValidCoords) {
    const nearest = findNearestWardByGps(lat!, lon!);
    return {
      ward: nearest.ward,
      matchedBy: 'GPS_COORDS',
      distanceMeters: nearest.distanceMeters,
    };
  }

  // Priority 3: Fallback ward
  const fallbackWard =
    (fallbackWardCode && AN_GIANG_WARDS.find((w) => w.code === fallbackWardCode)) || DEFAULT_WARD;
  return {
    ward: fallbackWard,
    matchedBy: 'FALLBACK',
    distanceMeters: 0,
  };
}

/**
 * Searches An Giang's 96 administrative units with diacritic-insensitive matching.
 */
export function searchAnGiangWards(
  keyword: string,
  filterType: WardFilterType = 'ALL'
): WardItem[] {
  const normKeyword = normalizeVietnameseText(keyword);
  return AN_GIANG_WARDS.filter((ward) => {
    const matchesType = filterType === 'ALL' || ward.type === filterType;
    if (!matchesType) return false;
    if (!normKeyword) return true;
    return (
      normalizeVietnameseText(ward.name).includes(normKeyword) ||
      normalizeVietnameseText(ward.code).includes(normKeyword) ||
      normalizeVietnameseText(ward.area).includes(normKeyword) ||
      normalizeVietnameseText(ward.officeAddress).includes(normKeyword)
    );
  });
}

export function getWardByCode(wardCode: string): WardItem | undefined {
  return AN_GIANG_WARDS.find((w) => w.code === wardCode);
}
