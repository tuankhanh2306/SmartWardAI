import React, { useEffect, useRef } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { AlertTriangle, Crosshair, MapPin } from 'lucide-react-native';
import { COLORS, DOMAIN_THRESHOLDS } from '../theme/tokens';

export interface MobileIncidentMapProps {
  latitude: number;
  longitude: number;
  locationSource: 'GPS' | 'PIN_DRAGGED' | 'WARD_DEFAULT';
  userGpsLocation?: { lat: number; lon: number; accuracy: number } | null;
  gpsAccuracy: number | null;
  locating: boolean;
  onLocateGps: () => void;
  onLocationChange: (lat: number, lon: number, source: 'PIN_DRAGGED') => void;
  wardName: string;
}

// Conditionally load react-native-maps only on native platforms
let NativeMapView: any = null;
let NativeMarker: any = null;
let NativeCircle: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    NativeMapView = Maps.default;
    NativeMarker = Maps.Marker;
    NativeCircle = Maps.Circle;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch (err) {
    console.warn('react-native-maps could not be loaded:', err);
  }
}

export const MobileIncidentMap: React.FC<MobileIncidentMapProps> = ({
  latitude,
  longitude,
  locationSource,
  userGpsLocation,
  gpsAccuracy,
  locating,
  onLocateGps,
  onLocationChange,
  wardName,
}) => {
  const mapRef = useRef<any>(null);
  const googleMapsKey = (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();
  const isNativeMapAvailable = Platform.OS !== 'web' && NativeMapView !== null;

  // Smoothly animate camera when coordinates change without locking user pan/zoom gestures
  useEffect(() => {
    if (isNativeMapAvailable && mapRef.current?.animateToRegion) {
      try {
        mapRef.current.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          320
        );
      } catch {
        // Ignore animation error before map layout completes
      }
    }
  }, [isNativeMapAvailable, latitude, longitude]);

  const handleMapTapOrLongPress = (e: any) => {
    const coords = e?.nativeEvent?.coordinate;
    if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
      onLocationChange(
        Number(coords.latitude.toFixed(6)),
        Number(coords.longitude.toFixed(6)),
        'PIN_DRAGGED'
      );
    }
  };

  return (
    <View style={styles.mapCard}>
      {/* Map display */}
      <View style={styles.mapVisualWrap}>
        {isNativeMapAvailable ? (
          <NativeMapView
            ref={mapRef}
            provider={googleMapsKey ? PROVIDER_GOOGLE : undefined}
            style={styles.nativeMap}
            initialRegion={{
              latitude,
              longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
            onPress={handleMapTapOrLongPress}
            onLongPress={handleMapTapOrLongPress}
          >
            {/* User GPS Accuracy Circle (Blue) */}
            {NativeCircle && userGpsLocation && (
              <NativeCircle
                center={{ latitude: userGpsLocation.lat, longitude: userGpsLocation.lon }}
                radius={Math.max(5, Math.round(userGpsLocation.accuracy || 15))}
                strokeColor="#2563EB"
                fillColor="rgba(59, 130, 246, 0.14)"
                strokeWidth={1.5}
              />
            )}

            {/* R = 25m Spatial Clustering Circle */}
            {NativeCircle && (
              <NativeCircle
                center={{ latitude, longitude }}
                radius={DOMAIN_THRESHOLDS.gpsClusterRadiusMeters}
                strokeColor={COLORS.primary}
                fillColor="rgba(0, 121, 107, 0.16)"
                strokeWidth={2}
              />
            )}

            {/* Draggable Incident Red Pin */}
            {NativeMarker && (
              <NativeMarker
                coordinate={{ latitude, longitude }}
                draggable
                onDragEnd={handleMapTapOrLongPress}
                title="Vị trí sự cố"
                description={`Địa bàn ${wardName} (Chạm/kéo để dời ghim)`}
                pinColor={COLORS.citizenCrimson}
              />
            )}
          </NativeMapView>
        ) : (
          /* Web / Fallback SVG interactive pin simulator */
          <Pressable
            style={styles.svgFallbackWrap}
            onPress={(e) => {
              // Simulate small coordinate offset on tap for Web preview
              const { locationX, locationY } = e.nativeEvent;
              const deltaLat = (76 - locationY) * 0.00003;
              const deltaLon = (locationX - 170) * 0.00003;
              onLocationChange(
                Number((latitude + deltaLat).toFixed(6)),
                Number((longitude + deltaLon).toFixed(6)),
                'PIN_DRAGGED'
              );
            }}
          >
            <Svg width="100%" height={165} viewBox="0 0 340 165">
              <Rect x="0" y="0" width="340" height="165" fill="#E8F4F8" />
              {/* Street grid */}
              <Line x1="0" y1="42" x2="340" y2="42" stroke="#CBD5E1" strokeWidth="1" />
              <Line x1="0" y1="120" x2="340" y2="120" stroke="#CBD5E1" strokeWidth="1" />
              <Line x1="85" y1="0" x2="85" y2="165" stroke="#CBD5E1" strokeWidth="1" />
              <Line x1="255" y1="0" x2="255" y2="165" stroke="#CBD5E1" strokeWidth="1" />
              <Line x1="0" y1="82" x2="340" y2="82" stroke="#FFFFFF" strokeWidth="7" />
              <Line x1="170" y1="0" x2="170" y2="165" stroke="#FFFFFF" strokeWidth="7" />

              {/* R = 25m spatial circle */}
              <Circle
                cx="170"
                cy="82"
                r="48"
                fill="rgba(0, 121, 107, 0.14)"
                stroke={COLORS.primary}
                strokeWidth="2"
                strokeDasharray="5,4"
              />
              {/* Center Pin Indicator */}
              <Circle cx="170" cy="82" r="10" fill="rgba(185, 14, 35, 0.22)" />
              <Circle
                cx="170"
                cy="82"
                r="5.5"
                fill={COLORS.citizenCrimson}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <SvgText
                x="170"
                y="148"
                fill={COLORS.primary}
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
              >
                Vòng gom cụm R = {DOMAIN_THRESHOLDS.gpsClusterRadiusMeters}m • Bấm để dời ghim
              </SvgText>
            </Svg>
          </Pressable>
        )}

        {/* Warning banner when location is unconfirmed default ward center */}
        {locationSource === 'WARD_DEFAULT' && (
          <View style={styles.unconfirmedBanner}>
            <AlertTriangle size={13} color="#92400E" />
            <Text style={styles.unconfirmedText}>
              Tọa độ trụ sở xã. Chạm/kéo ghim đỏ để chọn vị trí sự cố.
            </Text>
          </View>
        )}

        {/* Accuracy badge */}
        <View style={styles.gpsBadge}>
          <MapPin size={12} color={COLORS.primary} />
          <Text style={styles.gpsBadgeText}>
            {locationSource === 'PIN_DRAGGED'
              ? 'Ghim kéo thả'
              : gpsAccuracy !== null
              ? `GPS ±${gpsAccuracy}m`
              : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
          </Text>
        </View>
      </View>

      {/* Map footer with coords and Locate button */}
      <View style={styles.mapFooter}>
        <View style={styles.coordCol}>
          <Text style={styles.coordLabel}>Tọa độ hiện trường</Text>
          <Text style={styles.coordValue} numberOfLines={1}>
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={locating}
          onPress={onLocateGps}
          style={({ pressed }) => [styles.locateBtn, pressed && styles.pressed]}
        >
          <Crosshair size={15} color={COLORS.onPrimary} />
          <Text style={styles.locateBtnText}>
            {locating ? 'Đang dò GPS...' : 'Về vị trí của tôi'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
    marginBottom: 12,
  },
  mapVisualWrap: {
    height: 165,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  nativeMap: {
    width: '100%',
    height: '100%',
  },
  svgFallbackWrap: {
    width: '100%',
    height: '100%',
  },
  unconfirmedBanner: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  unconfirmedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  gpsBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    zIndex: 10,
  },
  gpsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  mapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  coordCol: {
    flex: 1,
    marginRight: 10,
  },
  coordLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  coordValue: {
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  locateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.citizenCrimson,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  locateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.onPrimary,
  },
  pressed: {
    opacity: 0.8,
  },
});

/** Read-only location supplied by the officer cluster endpoint. */
export function IncidentLocationPreview({ latitude, longitude }: { latitude: number; longitude: number }) {
  if (!NativeMapView || !NativeMarker) return null;
  const point = { latitude, longitude };
  return (
    <NativeMapView
      style={{ height: 180, width: '100%' }}
      region={{ ...point, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
      scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
    >
      <NativeMarker coordinate={point} title="Vị trí cụm sự cố" />
    </NativeMapView>
  );
}
