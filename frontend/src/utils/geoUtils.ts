/**
 * Geo Utilities and Coordinate Integrity Validators for SmartWard AI
 * Unified coordinate transformation between GeoJSON [lng, lat] and Leaflet [lat, lng]
 * Implements SEC/GEO point-in-polygon and territorial boundary validation.
 */

import { AN_GIANG_WARDS, DEFAULT_WARD, type WardItem } from '../data/anGiangWards';

export type GeoValidationError = 'OUT_OF_BBOX' | 'OUT_OF_WARD' | 'ON_WATER' | 'SWAPPED_SUSPECT';

export interface GeoValidationResult {
  valid: boolean;
  errorCode?: GeoValidationError;
  message?: string;
  ward?: WardItem;
}

// Bounding Box for Greater An Giang & Island Special Zones
// Lat: [9.15, 11.00], Lng: [103.35, 105.70]
export const BBOX_AN_GIANG = {
  minLat: 9.15,
  maxLat: 11.00,
  minLng: 103.35,
  maxLng: 105.70,
};

/**
 * Converts GeoJSON [lng, lat] to Leaflet [lat, lng].
 * Throws or alerts if suspect coordinate swap detected.
 */
export function toLeafletLatLng(coords: [number, number]): [number, number] {
  const [lng, lat] = coords;
  // If latitude is > 90 or longitude is suspiciously small, check for swap
  if (Math.abs(lng) <= 90 && Math.abs(lat) > 90) {
    // Already [lat, lng] passed by mistake
    return [lng, lat];
  }
  return [lat, lng];
}

/**
 * Converts Leaflet [lat, lng] to GeoJSON RFC 7946 [lng, lat].
 */
export function toGeoJsonCoord(lat: number, lng: number): [number, number] {
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    // Swapped input
    return [lat, lng];
  }
  return [lng, lat];
}

/**
 * Calculates Haversine distance in meters between two WGS84 coordinates.
 */
export function calculateHaversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
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
 * 2D Ray-casting Point-in-Polygon test.
 * Coordinates in polygon ring are GeoJSON [lng, lat].
 */
export function isPointInPolygon(lat: number, lon: number, polygonRing: [number, number][]): boolean {
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
 * Validates a coordinate point against territorial boundaries and safety checks.
 * BƯỚC 2: Shared Coordinate Validator
 */
export function validateWardPoint(
  lat: number,
  lng: number,
  wardCode?: string
): GeoValidationResult {
  // 1. Check for swapped coordinates (Lat > 15 or Lng < 15 or Lat > 90)
  if (lat > 90 || (lat > 50 && lng < 20)) {
    return {
      valid: false,
      errorCode: 'SWAPPED_SUSPECT',
      message: 'Tọa độ kinh độ và vĩ độ bị đảo ngược hoặc không thuộc hệ WGS84.',
    };
  }

  // 2. Check Bounding Box
  if (
    lat < BBOX_AN_GIANG.minLat ||
    lat > BBOX_AN_GIANG.maxLat ||
    lng < BBOX_AN_GIANG.minLng ||
    lng > BBOX_AN_GIANG.maxLng
  ) {
    return {
      valid: false,
      errorCode: 'OUT_OF_BBOX',
      message: 'Tọa độ nằm ngoài phạm vi địa bàn Tỉnh An Giang và các Đặc khu hải đảo.',
    };
  }

  // Find ward
  const targetWard = wardCode
    ? AN_GIANG_WARDS.find((w) => w.code === wardCode)
    : findNearestWardByCoords(lat, lng).ward;

  if (!targetWard) {
    return {
      valid: false,
      errorCode: 'OUT_OF_WARD',
      message: 'Không tìm thấy đơn vị hành chính phù hợp.',
    };
  }

  // 3. On-water / Offshore detection (e.g. Kiên Hải old 9.7915 was offshore water)
  if (targetWard.type === 'Đặc khu') {
    const islandDist = calculateHaversineMeters(lat, lng, targetWard.lat, targetWard.lon);
    if (islandDist > 8000) {
      return {
        valid: false,
        errorCode: 'ON_WATER',
        message: `Tọa độ rơi vào vùng biển mở ngoài đảo ${targetWard.name}. Vui lòng chọn vị trí trên đất liền.`,
        ward: targetWard,
      };
    }
  }

  // 4. Point-in-polygon verification
  if (targetWard.boundary && targetWard.boundary.length >= 3) {
    const inside = isPointInPolygon(lat, lng, targetWard.boundary);
    if (!inside) {
      // Check distance to ward center (allow up to 5000m tolerance if boundary vertex rounding)
      const dist = calculateHaversineMeters(lat, lng, targetWard.lat, targetWard.lon);
      if (dist > 5000) {
        return {
          valid: false,
          errorCode: 'OUT_OF_WARD',
          message: `Vị trí phản ánh nằm ngoài ranh giới hành chính của ${targetWard.name}.`,
          ward: targetWard,
        };
      }
    }
  }

  return {
    valid: true,
    ward: targetWard,
  };
}

/**
 * Finds the nearest administrative ward/commune in An Giang from GPS coordinates.
 */
export function findNearestWardByCoords(
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

/**
 * Resolves the target receiving Ward/Commune based on the Citizen's Location Box (addressText)
 * and Description Box first (allowing manual override if GPS drifted), falling back to GPS coordinates.
 */
export function resolveWardFromLocationBox(
  addressText: string,
  descriptionText: string,
  lat: number,
  lon: number
): {
  ward: WardItem;
  matchedBy: 'TEXT_BOX' | 'GPS_COORDS';
  distanceMeters: number;
} {
  const norm = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();

  const normAddr = norm(addressText);
  const normDesc = norm(descriptionText);

  // Sort wards with longer names first to avoid partial substring matching
  const sortedWards = [...AN_GIANG_WARDS].sort((a, b) => b.name.length - a.name.length);

  // 1. Check full ward name in addressText
  if (normAddr) {
    for (const w of sortedWards) {
      const fullNorm = norm(w.name);
      if (fullNorm && normAddr.includes(fullNorm)) {
        const dist = calculateHaversineMeters(lat, lon, w.lat, w.lon);
        return { ward: w, matchedBy: 'TEXT_BOX', distanceMeters: Math.round(dist) };
      }
    }

    // 2. Check core place name without prefix ("phuong ", "xa ", "thi tran ", "dac khu ")
    for (const w of sortedWards) {
      const coreName = norm(w.name).replace(/^(phuong|xa|thi tran|dac khu)\s+/i, '').trim();
      if (coreName.length >= 4) {
        const regex = new RegExp(`(^|[^a-z0-9])${coreName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
        if (regex.test(normAddr)) {
          const dist = calculateHaversineMeters(lat, lon, w.lat, w.lon);
          return { ward: w, matchedBy: 'TEXT_BOX', distanceMeters: Math.round(dist) };
        }
      }
    }
  }

  // 3. Check descriptionText
  if (normDesc) {
    for (const w of sortedWards) {
      const fullNorm = norm(w.name);
      if (fullNorm && normDesc.includes(fullNorm)) {
        const dist = calculateHaversineMeters(lat, lon, w.lat, w.lon);
        return { ward: w, matchedBy: 'TEXT_BOX', distanceMeters: Math.round(dist) };
      }
    }
  }

  // 4. Fallback to GPS nearest ward
  const nearest = findNearestWardByCoords(lat, lon);
  return {
    ward: nearest.ward,
    matchedBy: 'GPS_COORDS',
    distanceMeters: nearest.distanceMeters,
  };
}

export function isWardCoordVerified(ward?: WardItem | null): boolean {
  return Boolean(ward && ward.coordSource && ward.coordSource !== 'unverified');
}

export interface JurisdictionResolution {
  ward: WardItem | null;
  matchedBy: 'MANUAL_SELECT' | 'TEXT_BOX' | 'GPS_COORDS' | 'UNDETERMINED';
  distanceMeters: number;
  isVerified: boolean;
  canAutoRoute: boolean;
  statusReason: string;
}

/**
 * Resolves verified target jurisdiction from Single Source of Truth (AN_GIANG_WARDS).
 * Never auto-routes when coordinate data is 'unverified' or outside province boundaries
 * unless citizen explicitly picks the administrative unit manually.
 */
export function resolveVerifiedJurisdiction(
  addressText: string,
  descriptionText: string,
  lat: number,
  lon: number,
  manualWardCode?: string
): JurisdictionResolution {
  if (manualWardCode) {
    const manualWard = AN_GIANG_WARDS.find((w) => w.code === manualWardCode);
    if (manualWard) {
      const dist = calculateHaversineMeters(lat, lon, manualWard.lat, manualWard.lon);
      return {
        ward: manualWard,
        matchedBy: 'MANUAL_SELECT',
        distanceMeters: Math.round(dist),
        isVerified: isWardCoordVerified(manualWard),
        canAutoRoute: true,
        statusReason: 'Công dân đã chọn trực tiếp đơn vị tiếp nhận từ danh mục An Giang.',
      };
    }
  }

  const inProvinceBbox =
    lat >= BBOX_AN_GIANG.minLat &&
    lat <= BBOX_AN_GIANG.maxLat &&
    lon >= BBOX_AN_GIANG.minLng &&
    lon <= BBOX_AN_GIANG.maxLng;

  const raw = resolveWardFromLocationBox(addressText, descriptionText, lat, lon);

  if (raw.matchedBy === 'GPS_COORDS' && !inProvinceBbox) {
    return {
      ward: null,
      matchedBy: 'UNDETERMINED',
      distanceMeters: raw.distanceMeters,
      isVerified: false,
      canAutoRoute: false,
      statusReason: 'Vị trí GPS nằm ngoài phạm vi địa bàn Tỉnh An Giang.',
    };
  }

  const verified = isWardCoordVerified(raw.ward);
  if (!verified) {
    return {
      ward: raw.ward,
      matchedBy: raw.matchedBy,
      distanceMeters: raw.distanceMeters,
      isVerified: false,
      canAutoRoute: false,
      statusReason: `Dữ liệu tọa độ của ${raw.ward.name} đang ở trạng thái "unverified", không tự động chuyển tuyến.`,
    };
  }

  return {
    ward: raw.ward,
    matchedBy: raw.matchedBy,
    distanceMeters: raw.distanceMeters,
    isVerified: true,
    canAutoRoute: true,
    statusReason:
      raw.matchedBy === 'TEXT_BOX'
        ? 'Xác định theo địa chỉ nhập từ nguồn dữ liệu đã xác minh.'
        : 'Xác định theo định vị bản đồ GIS từ nguồn đã xác minh.',
  };
}
