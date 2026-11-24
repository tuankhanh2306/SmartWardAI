import React, { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, MapPin, AlertCircle } from 'lucide-react';

export interface IncidentLocationMapProps {
  latitude: number;
  longitude: number;
  locationSource: 'GPS' | 'PIN_DRAGGED' | 'WARD_DEFAULT';
  userGpsLocation?: { lat: number; lon: number; accuracy: number } | null;
  gpsAccuracy?: number | null;
  gpsLoading?: boolean;
  onLocationChange: (lat: number, lon: number, source: 'GPS' | 'PIN_DRAGGED', accuracyM?: number) => void;
  onRecenterToGps: () => void;
  wardName: string;
}

export const IncidentLocationMap: React.FC<IncidentLocationMapProps> = ({
  latitude,
  longitude,
  locationSource,
  userGpsLocation,
  gpsAccuracy,
  gpsLoading,
  onLocationChange,
  onRecenterToGps,
  wardName,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapEngine, setMapEngine] = useState<'GOOGLE' | 'LEAFLET'>('LEAFLET');
  const [googleLoadError, setGoogleLoadError] = useState<string | null>(null);

  // References for Google Maps instance
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const googleMarkerRef = useRef<google.maps.Marker | null>(null);
  const googleCircleRef = useRef<google.maps.Circle | null>(null);
  const googleUserDotRef = useRef<google.maps.Marker | null>(null);
  const googleUserAccuracyCircleRef = useRef<google.maps.Circle | null>(null);

  // References for Leaflet instance
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkerRef = useRef<L.Marker | null>(null);
  const leafletCircleRef = useRef<L.Circle | null>(null);
  const leafletUserDotRef = useRef<L.CircleMarker | null>(null);
  const leafletUserAccuracyCircleRef = useRef<L.Circle | null>(null);

  // Always keep latest callback ref to prevent stale closures in imperative map listeners
  const onLocationChangeRef = useRef(onLocationChange);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  const googleApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

  // Try loading Google Maps if API key is present
  useEffect(() => {
    if (!googleApiKey) {
      setMapEngine('LEAFLET');
      return;
    }

    try {
      setOptions({
        key: googleApiKey,
        v: 'weekly',
      });

      Promise.all([importLibrary('maps'), importLibrary('places'), importLibrary('geometry')])
        .then(() => {
          setMapEngine('GOOGLE');
        })
        .catch((err) => {
          console.warn('Google Maps loader failed, switching to Leaflet/OSM fallback:', err);
          setGoogleLoadError('Không thể tải Google Maps API. Đã chuyển sang chế độ dự phòng OpenStreetMap.');
          setMapEngine('LEAFLET');
        });
    } catch (err) {
      console.warn('Google Maps setOptions failed:', err);
      setMapEngine('LEAFLET');
    }
  }, [googleApiKey]);

  // Clean up leaflet when switching engine or unmounting
  const destroyLeaflet = useCallback(() => {
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
      leafletMarkerRef.current = null;
      leafletCircleRef.current = null;
      leafletUserDotRef.current = null;
      leafletUserAccuracyCircleRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      destroyLeaflet();
      googleMapRef.current = null;
      googleMarkerRef.current = null;
      googleCircleRef.current = null;
      googleUserDotRef.current = null;
      googleUserAccuracyCircleRef.current = null;
    };
  }, [destroyLeaflet]);

  // Initialize or update Google Map
  useEffect(() => {
    if (mapEngine !== 'GOOGLE' || !containerRef.current || !window.google?.maps) return;

    destroyLeaflet();

    if (!googleMapRef.current) {
      const map = new google.maps.Map(containerRef.current, {
        center: { lat: latitude, lng: longitude },
        zoom: 17,
        mapTypeId: 'roadmap',
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_BOTTOM,
        },
      });
      googleMapRef.current = map;

      // Pin marker (Incident point)
      const pinIcon: google.maps.Icon = {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new google.maps.Size(38, 38),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(19, 38),
      };

      const marker = new google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map,
        draggable: true,
        icon: pinIcon,
        title: 'Kéo thả để điều chỉnh vị trí sự cố',
        animation: google.maps.Animation.DROP,
      });
      googleMarkerRef.current = marker;

      // Spatial cluster radius circle (R = 25m)
      const circle = new google.maps.Circle({
        strokeColor: '#B90E23',
        strokeOpacity: 0.8,
        strokeWeight: 1.5,
        fillColor: '#FECACA',
        fillOpacity: 0.2,
        map,
        center: { lat: latitude, lng: longitude },
        radius: 25,
      });
      googleCircleRef.current = circle;

      // Drag event (always calls latest ref callback, avoiding stale closure)
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) {
          const newLat = Number(pos.lat().toFixed(6));
          const newLng = Number(pos.lng().toFixed(6));
          circle.setCenter({ lat: newLat, lng: newLng });
          onLocationChangeRef.current(newLat, newLng, 'PIN_DRAGGED', 5);
        }
      });

      // Map click event to drop pin
      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const newLat = Number(e.latLng.lat().toFixed(6));
          const newLng = Number(e.latLng.lng().toFixed(6));
          marker.setPosition({ lat: newLat, lng: newLng });
          circle.setCenter({ lat: newLat, lng: newLng });
          onLocationChangeRef.current(newLat, newLng, 'PIN_DRAGGED', 5);
        }
      });
    } else {
      // Update existing Google Map
      const pos = { lat: latitude, lng: longitude };
      googleMapRef.current.panTo(pos);
      if (googleMarkerRef.current) {
        googleMarkerRef.current.setPosition(pos);
      }
      if (googleCircleRef.current) {
        googleCircleRef.current.setCenter(pos);
      }
    }

    // Render / update user blue dot + GPS accuracy circle
    if (googleMapRef.current && userGpsLocation) {
      const userPos = { lat: userGpsLocation.lat, lng: userGpsLocation.lon };
      const accRadius = Math.max(5, Math.round(userGpsLocation.accuracy || 15));
      if (!googleUserAccuracyCircleRef.current) {
        googleUserAccuracyCircleRef.current = new google.maps.Circle({
          strokeColor: '#2563EB',
          strokeOpacity: 0.5,
          strokeWeight: 1,
          fillColor: '#3B82F6',
          fillOpacity: 0.14,
          map: googleMapRef.current,
          center: userPos,
          radius: accRadius,
          clickable: false,
        });
      } else {
        googleUserAccuracyCircleRef.current.setCenter(userPos);
        googleUserAccuracyCircleRef.current.setRadius(accRadius);
      }

      if (!googleUserDotRef.current) {
        googleUserDotRef.current = new google.maps.Marker({
          position: userPos,
          map: googleMapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#2563EB',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2.5,
          },
          title: `Vị trí của bạn (sai số ±${accRadius}m)`,
        });
      } else {
        googleUserDotRef.current.setPosition(userPos);
      }
    }
  }, [mapEngine, latitude, longitude, userGpsLocation, destroyLeaflet]);

  // Initialize or update Leaflet Map
  useEffect(() => {
    if (mapEngine !== 'LEAFLET' || !containerRef.current) return;

    if (!leafletMapRef.current) {
      const map = L.map(containerRef.current, {
        zoomControl: false,
        preferCanvas: true,
      }).setView([latitude, longitude], 17);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // 100% compliant OpenStreetMap tile layer (no raw google tile URL)
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &bull; Dữ liệu GIS An Giang 2026',
        maxZoom: 19,
        keepBuffer: 4,
      });

      tileLayer.on('tileerror', (err: any) => {
        const tile = err?.tile as HTMLImageElement | undefined;
        const coords = err?.coords;
        if (tile && coords && !tile.dataset.fallback) {
          tile.dataset.fallback = '1';
          tile.src = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${coords.z}/${coords.x}/${coords.y}.png`;
        }
      });

      tileLayer.addTo(map);
      leafletMapRef.current = map;

      const pinIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 -ml-1 -mt-3 cursor-pointer">
            <div class="w-7 h-7 rounded-full bg-[#BA1A1A] border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold ring-2 ring-red-300">
              !
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([latitude, longitude], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);
      leafletMarkerRef.current = marker;

      const circle = L.circle([latitude, longitude], {
        radius: 25,
        color: '#B90E23',
        weight: 1.5,
        fillColor: '#FECACA',
        fillOpacity: 0.25,
      }).addTo(map);
      leafletCircleRef.current = circle;

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        circle.setLatLng(pos);
        onLocationChangeRef.current(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)), 'PIN_DRAGGED', 5);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        circle.setLatLng(e.latlng);
        onLocationChangeRef.current(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)), 'PIN_DRAGGED', 5);
      });
    } else {
      leafletMapRef.current.panTo([latitude, longitude]);
      leafletMarkerRef.current?.setLatLng([latitude, longitude]);
      leafletCircleRef.current?.setLatLng([latitude, longitude]);
    }

    // User GPS Blue Dot + Accuracy Circle in Leaflet
    if (leafletMapRef.current && userGpsLocation) {
      const accRadius = Math.max(5, Math.round(userGpsLocation.accuracy || 15));
      if (!leafletUserAccuracyCircleRef.current) {
        leafletUserAccuracyCircleRef.current = L.circle([userGpsLocation.lat, userGpsLocation.lon], {
          radius: accRadius,
          color: '#2563EB',
          weight: 1,
          opacity: 0.5,
          fillColor: '#3B82F6',
          fillOpacity: 0.14,
          interactive: false,
        }).addTo(leafletMapRef.current);
      } else {
        leafletUserAccuracyCircleRef.current.setLatLng([userGpsLocation.lat, userGpsLocation.lon]);
        leafletUserAccuracyCircleRef.current.setRadius(accRadius);
      }

      if (!leafletUserDotRef.current) {
        leafletUserDotRef.current = L.circleMarker([userGpsLocation.lat, userGpsLocation.lon], {
          radius: 7,
          fillColor: '#2563EB',
          color: '#FFFFFF',
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.95,
        }).addTo(leafletMapRef.current);
      } else {
        leafletUserDotRef.current.setLatLng([userGpsLocation.lat, userGpsLocation.lon]);
      }
    }
  }, [mapEngine, latitude, longitude, userGpsLocation]);

  return (
    <div className="relative w-full h-64 sm:h-72 lg:h-[340px] rounded-2xl overflow-hidden border border-[#CBD5E1] shadow-inner bg-[#E2E8F0]">
      {/* Map DOM Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Engine Badge */}
      <div className="absolute top-2.5 left-2.5 z-[1000] flex flex-col gap-1 pointer-events-none">
        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm bg-white/95 backdrop-blur text-[#0F172A] border border-[#CBD5E1] flex items-center gap-1.5 pointer-events-auto">
          <MapPin className="w-3 h-3 text-[#B90E23]" />
          <span>{mapEngine === 'GOOGLE' ? 'Google Maps JavaScript API' : 'Bản đồ OpenStreetMap (Dự phòng)'}</span>
        </span>
        {googleLoadError && (
          <span className="px-2 py-0.5 rounded-md text-[9.5px] bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
            {googleLoadError}
          </span>
        )}
      </div>

      {/* Recenter Button */}
      <button
        type="button"
        onClick={onRecenterToGps}
        disabled={gpsLoading}
        title="Về vị trí GPS của tôi"
        className="absolute top-2.5 right-2.5 z-[1000] px-3 py-1.5 rounded-xl bg-white hover:bg-[#F8FAFC] active:scale-95 text-[#0F172A] border border-[#CBD5E1] shadow-md text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
      >
        <Compass className={`w-3.5 h-3.5 text-[#2563EB] ${gpsLoading ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">{gpsLoading ? 'Đang dò GPS...' : 'Về vị trí của tôi'}</span>
      </button>

      {/* Unconfirmed Location Warning Overlay */}
      {locationSource === 'WARD_DEFAULT' && (
        <div className="absolute bottom-2 left-2 right-2 z-[1000] p-2.5 rounded-xl bg-[#FFFBEB] border border-[#F59E0B] shadow-md flex items-start gap-2 text-xs text-[#92400E]">
          <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-extrabold">Chưa xác nhận vị trí sự cố!</p>
            <p className="text-[11px] leading-tight opacity-95">
              Tọa độ hiện tại đang đặt ở trụ sở UBND {wardName}. Vui lòng chạm vào bản đồ hoặc kéo ghim đỏ đến đúng vị trí sự cố trước khi gửi.
            </p>
          </div>
        </div>
      )}

      {/* Accuracy Tag */}
      {gpsAccuracy && locationSource === 'GPS' && (
        <div className="absolute bottom-2 right-2 z-[1000] px-2 py-0.5 rounded-md bg-white/90 backdrop-blur text-[10px] font-mono font-bold text-[#065F46] border border-[#86EFAC] shadow-xs">
          GPS sai số: ±{gpsAccuracy}m
        </div>
      )}
    </div>
  );
};
