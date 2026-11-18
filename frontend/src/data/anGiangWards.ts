/**
 * Danh mục Đơn vị Hành chính mới của Tỉnh An Giang (Chuẩn hóa 2026) — Barrel & Search Module
 */
import { AN_GIANG_WARDS, type WardItem } from './wards/anGiangWardsCatalog';

export { AN_GIANG_WARDS, type WardItem };

export const DEFAULT_WARD: WardItem = AN_GIANG_WARDS.find((w) => w.code === 'AG_P_LONGXUYEN') || AN_GIANG_WARDS[0];

export {
  calculateHaversineMeters,
  findNearestWardByCoords,
  resolveWardFromLocationBox,
  toLeafletLatLng,
  toGeoJsonCoord,
  validateWardPoint,
  isPointInPolygon,
} from '../utils/geoUtils';

export const searchAnGiangWards = (
  keyword: string,
  filterType: 'ALL' | 'Phường' | 'Xã' | 'Thị trấn' | 'Đặc khu' = 'ALL'
): WardItem[] => {
  const cleanKeyword = keyword.trim().toLowerCase();
  return AN_GIANG_WARDS.filter((ward) => {
    const matchesType = filterType === 'ALL' || ward.type === filterType;
    if (!matchesType) return false;
    if (!cleanKeyword) return true;
    return (
      ward.name.toLowerCase().includes(cleanKeyword) ||
      ward.code.toLowerCase().includes(cleanKeyword) ||
      ward.area.toLowerCase().includes(cleanKeyword) ||
      ward.officeAddress.toLowerCase().includes(cleanKeyword)
    );
  });
};

