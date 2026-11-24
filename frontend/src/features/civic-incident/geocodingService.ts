/**
 * Geocoding Service for Citizen Incident Reporting
 * - Primary: Google Maps Geocoder API (when VITE_GOOGLE_MAPS_API_KEY is available)
 * - Fallback: Nominatim OpenStreetMap reverse geocoding
 * - Caching: in-memory key-value cache keyed by rounded coords (lat.toFixed(4), lon.toFixed(4))
 */

const geocodeCache = new Map<string, string>();

export function getCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

export async function reverseGeocodeIncident(
  lat: number,
  lon: number,
  _fallbackWardAddress: string,
  wardName: string
): Promise<string> {
  const cacheKey = getCacheKey(lat, lon);
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // 1. Try Google Maps Geocoder if window.google.maps is loaded
  if (typeof window !== 'undefined' && window.google?.maps?.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await new Promise<google.maps.GeocoderResponse | null>((resolve) => {
        geocoder.geocode(
          { location: { lat, lng: lon }, language: 'vi' },
          (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              resolve({ results });
            } else {
              resolve(null);
            }
          }
        );
      });

      if (response && response.results[0]) {
        const rawFormatted = response.results[0].formatted_address;
        const formatted =
          wardName && !rawFormatted.toLowerCase().includes(wardName.toLowerCase())
            ? `${rawFormatted} (${wardName})`
            : rawFormatted;
        geocodeCache.set(cacheKey, formatted);
        return formatted;
      }
    } catch (err) {
      console.warn('Google Geocoder failed, falling back to OSM Nominatim:', err);
    }
  }

  // 2. Fallback to OpenStreetMap Nominatim
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=vi`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      const addrObj = data?.address || {};
      const road =
        addrObj.road ||
        addrObj.pedestrian ||
        addrObj.suburb ||
        addrObj.quarter ||
        addrObj.hamlet ||
        addrObj.village ||
        '';

      let resolved = '';
      if (road) {
        resolved = `${road}, ${wardName}, Tỉnh An Giang`;
      } else if (data?.display_name) {
        const disp = String(data.display_name);
        resolved =
          wardName && !disp.toLowerCase().includes(wardName.toLowerCase())
            ? `${disp} (${wardName})`
            : disp;
      }

      if (resolved) {
        geocodeCache.set(cacheKey, resolved);
        return resolved;
      }
    }
  } catch (err) {
    console.warn('Nominatim reverse geocode failed:', err);
  }

  // 3. When geocoding fails or quota is exceeded: return empty string (do not cache error)
  // Caller leaves address box empty, shows notice, and still allows submission by coordinates.
  return '';
}

export function clearGeocodeCache(): void {
  geocodeCache.clear();
}
