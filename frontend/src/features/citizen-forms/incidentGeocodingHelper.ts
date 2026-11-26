import { findNearestWardByCoords } from '../../utils/geoUtils';
import { reverseGeocodeIncident } from '../civic-incident/geocodingService';

export function formatIncidentDescriptionWithAddress(prev: string, newAddress: string): string {
  const stripped = prev.replace(/^\[(?:Tại|Vị trí|Vị trí hiện trường):[^\]]*\]\s*/i, '').trim();
  const body =
    stripped ||
    'Phát hiện sự cố hư hỏng hạ tầng gây mất an toàn giao thông, đề nghị cán bộ giám sát kiểm tra xử lý khẩn cấp.';
  return newAddress.trim() ? `[Tại: ${newAddress.trim()}] ${body}` : body;
}

export function isValidVietnamesePhone(phone: string): boolean {
  const clean = phone.replace(/[\s.\-()]/g, '');
  return /^(0|\+84)(3|5|7|8|9|2)[0-9]{8,9}$/.test(clean);
}

export async function lookupReverseGeocodeBanner(
  lat: number,
  lon: number,
  presetAddress?: string
): Promise<{ address: string; banner: string }> {
  const nearest = findNearestWardByCoords(lat, lon);
  const fallbackAddress =
    presetAddress || `Gần ${nearest.ward.officeAddress} (Tọa độ: ${lat.toFixed(5)}, ${lon.toFixed(5)})`;

  if (presetAddress) {
    return {
      address: fallbackAddress,
      banner: `Đã xác định vị trí tại ${nearest.ward.name} và tự động điền địa chỉ vào tờ báo cáo.`,
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=vi`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (resp.ok) {
      const data = await resp.json();
      const addrObj = data?.address || {};
      const road =
        addrObj.road || addrObj.pedestrian || addrObj.suburb || addrObj.quarter || addrObj.hamlet || addrObj.village || '';
      const resolvedAddr =
        nearest.distanceMeters <= 60000
          ? road
            ? `${road}, ${nearest.ward.name}, Tỉnh An Giang`
            : `${nearest.ward.officeAddress}`
          : data?.display_name
          ? `${road ? road + ', ' : ''}${nearest.ward.name}, Tỉnh An Giang (GPS thực tế)`
          : fallbackAddress;

      return {
        address: resolvedAddr,
        banner: `Đã xác định vị trí "${resolvedAddr}" và tự động điền vào ô địa chỉ.`,
      };
    }
  } catch {
    // Fallback below
  }

  return {
    address: fallbackAddress,
    banner: `Đã xác định vị trí tại ${nearest.ward.name} và tự động điền vào ô địa chỉ.`,
  };
}

export async function lookupPinAddress(
  lat: number,
  lon: number,
  wardOfficeAddress: string
): Promise<string> {
  const nearest = findNearestWardByCoords(lat, lon);
  return reverseGeocodeIncident(lat, lon, wardOfficeAddress, nearest.ward.name);
}
