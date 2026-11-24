/**
 * SmartWard AI Mobile — Tab 2: Báo Cáo Sự Cố Hiện Trường GPS 25m (Chặng M4: MOB-4.6 -> MOB-4.10)
 * - Định vị GPS chính xác cao (Location.Accuracy.BestForNavigation) + reverseGeocodeAsync
 * - Khung bản đồ hiện trường SVG với tâm sự cố và vòng tròn bán kính gom cụm R = 25m (#00796B)
 * - Tự động định tuyến liên xã/phường (Cross-Ward Jurisdiction Routing) ưu tiên Ô địa chỉ -> GPS
 * - 5 danh mục chuẩn Backend + bắt buộc SĐT khẩn cấp (10 số) + mô tả >= 10 ký tự
 * - Hàng đợi Offline (offline_incident_queue trên expo-sqlite) + Đồng bộ 1 chạm khi có sóng 4G
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CloudUpload,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  Send,
  Settings,
  Shield,
  WifiOff,
} from 'lucide-react-native';
import { MobileIncidentMap } from '../components/MobileIncidentMap';
import { flushOfflineIncidentQueue } from '../api/offlineSyncManager';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { findNearestWardByGps, resolveWardFromLocationBox } from '../core/angiangWards';
import {
  executeIncidentSubmission,
  INCIDENT_CATEGORY_OPTIONS,
  type IncidentSubmissionOutcome,
} from '../core/incidentSubmitter';
import {
  getOfflineIncidentQueue,
  type OfflineIncidentQueueRow,
} from '../storage/sqliteDb';
import { useResponsivePhone } from '../theme/responsive';
import {
  COLORS,
  DOMAIN_THRESHOLDS,
  MIN_TOUCH_TARGET,
  RADIUS,
  SPACING,
} from '../theme/tokens';
import type { IncidentCategory } from '../types/api.types';

const mobileGeocodeCache = new Map<string, string>();

function getMobileGeocodeCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

export const FieldIncidentReportScreen: React.FC = () => {
  const { currentWard } = useWard();
  const { typography, fontScaleMode } = useAccessibility();
  const responsive = useResponsivePhone(fontScaleMode);

  // GPS Coordinates & accuracy (MOB-4.6)
  const [latitude, setLatitude] = useState<number>(currentWard.lat);
  const [longitude, setLongitude] = useState<number>(currentWard.lon);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [userGpsLocation, setUserGpsLocation] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [gpsBanner, setGpsBanner] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<'GPS' | 'PIN_DRAGGED' | 'WARD_DEFAULT'>('WARD_DEFAULT');
  const [isAddressManuallyEdited, setIsAddressManuallyEdited] = useState<boolean>(false);

  // Watch subscription & timer refs for clean termination without race conditions
  const watchSubRef = useRef<Location.LocationSubscription | null>(null);
  const webWatchIdRef = useRef<number | null>(null);
  const watchTimeoutRef = useRef<any>(null);
  const pinDebounceRef = useRef<any>(null);
  const locationSourceRef = useRef<'GPS' | 'PIN_DRAGGED' | 'WARD_DEFAULT'>(locationSource);
  useEffect(() => {
    locationSourceRef.current = locationSource;
  }, [locationSource]);

  // Form fields (MOB-4.8 & MOB-4.9)
  const [category, setCategory] = useState<IncidentCategory>('ROAD_DAMAGE');
  const [addressText, setAddressText] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [reporterPhone, setReporterPhone] = useState<string>('');

  // Submission & Offline Queue state (MOB-4.10)
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [flushing, setFlushing] = useState<boolean>(false);
  const [outcome, setOutcome] = useState<IncidentSubmissionOutcome | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<OfflineIncidentQueueRow[]>([]);
  const [flushNotice, setFlushNotice] = useState<string | null>(null);

  const stopAllGpsWatchers = useCallback(() => {
    if (watchSubRef.current) {
      try {
        watchSubRef.current.remove();
      } catch {}
      watchSubRef.current = null;
    }
    if (webWatchIdRef.current !== null && typeof navigator !== 'undefined' && (navigator as any).geolocation) {
      try {
        (navigator as any).geolocation.clearWatch(webWatchIdRef.current);
      } catch {}
      webWatchIdRef.current = null;
    }
    if (watchTimeoutRef.current) {
      clearTimeout(watchTimeoutRef.current);
      watchTimeoutRef.current = null;
    }
  }, []);

  const loadOfflineQueue = useCallback(async () => {
    const rows = await getOfflineIncidentQueue();
    setOfflineQueue(rows);
  }, []);

  useEffect(() => {
    void loadOfflineQueue();
  }, [loadOfflineQueue]);

  // Reset default unconfirmed coordinates when user switches ward in Header
  const prevWardCodeRef = useRef<string>(currentWard.code);
  useEffect(() => {
    if (prevWardCodeRef.current !== currentWard.code) {
      prevWardCodeRef.current = currentWard.code;
      stopAllGpsWatchers();
      setLocating(false);
      setLatitude(currentWard.lat);
      setLongitude(currentWard.lon);
      setGpsAccuracy(null);
      setLocationSource('WARD_DEFAULT');
      setIsAddressManuallyEdited(false);
      setAddressText('');
    }
  }, [currentWard.code, currentWard.lat, currentWard.lon, stopAllGpsWatchers]);

  // MOB-4.8: Live Cross-Ward Jurisdiction Routing
  const routedJurisdiction = useMemo(
    () =>
      resolveWardFromLocationBox(
        addressText,
        latitude,
        longitude,
        currentWard.code
      ),
    [addressText, latitude, longitude, currentWard.code]
  );

  // Cleanup watch subscription and debounce timers on unmount
  useEffect(() => {
    return () => {
      stopAllGpsWatchers();
      if (pinDebounceRef.current) {
        clearTimeout(pinDebounceRef.current);
        pinDebounceRef.current = null;
      }
    };
  }, [stopAllGpsWatchers]);

  const resolveAddressFromCoords = useCallback(
    async (lat: number, lon: number): Promise<string> => {
      const cacheKey = getMobileGeocodeCacheKey(lat, lon);
      if (mobileGeocodeCache.has(cacheKey)) {
        return mobileGeocodeCache.get(cacheKey)!;
      }
      const nearest = findNearestWardByGps(lat, lon);
      try {
        const geos = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (geos && geos[0]) {
          const g = geos[0];
          const raw = [g.streetNumber, g.street, g.district || g.subregion, g.city || g.region]
            .filter(Boolean)
            .join(', ');
          if (raw) {
            const withWard =
              nearest.ward.name && !raw.toLowerCase().includes(nearest.ward.name.toLowerCase())
                ? `${raw} (${nearest.ward.name})`
                : raw;
            mobileGeocodeCache.set(cacheKey, withWard);
            return withWard;
          }
        }
      } catch {
        // Reverse geocoding unavailable or quota reached
      }
      return '';
    },
    []
  );

  const handleLocationChange = (lat: number, lon: number, source: 'PIN_DRAGGED') => {
    // Cancel any ongoing background GPS watcher so it never overwrites the user's dragged pin
    stopAllGpsWatchers();
    setLocating(false);

    setLatitude(lat);
    setLongitude(lon);
    setLocationSource(source);
    setGpsAccuracy(5);
    setGpsBanner('Đang tìm địa chỉ...');

    if (!isAddressManuallyEdited) {
      setIsGeocoding(true);
      if (pinDebounceRef.current) {
        clearTimeout(pinDebounceRef.current);
      }
      pinDebounceRef.current = setTimeout(async () => {
        try {
          const formatted = await resolveAddressFromCoords(lat, lon);
          setAddressText(formatted);
          if (formatted) {
            setGpsBanner(`Đã cập nhật vị trí từ ghim bản đồ: "${formatted}"`);
          } else {
            setGpsBanner('Đã cập nhật tọa độ từ ghim. Không lấy được địa chỉ tự động, bạn vẫn có thể gửi bằng tọa độ.');
          }
        } catch {
          setAddressText('');
          setGpsBanner('Đã cập nhật tọa độ từ ghim bản đồ.');
        } finally {
          setIsGeocoding(false);
        }
      }, 500);
    } else {
      setGpsBanner('Đã cập nhật tọa độ từ ghim bản đồ (giữ nguyên địa chỉ bạn đã nhập tay).');
    }
  };

  // High-accuracy GPS + Reverse Geocode (Location.Accuracy.High, watchPosition up to 15s or <= 30m)
  const handleLocateGps = async () => {
    if (locating) return;
    stopAllGpsWatchers();
    setLocating(true);
    setPermissionDenied(false);
    setGpsBanner('Đang xác định vị trí...');

    // Web Fallback ONLY when running on Web platform (e.g. Safari on iOS / Chrome on Android)
    const nav =
      Platform.OS === 'web' && typeof navigator !== 'undefined'
        ? (navigator as unknown as {
            geolocation?: {
              watchPosition: (
                success: (pos: { coords: { latitude: number; longitude: number; accuracy?: number } }) => void,
                error: (err: any) => void,
                options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }
              ) => number;
              clearWatch: (id: number) => void;
            };
          })
        : undefined;

    if (Platform.OS === 'web' && nav?.geolocation) {
      let bestPos: { coords: { latitude: number; longitude: number; accuracy?: number } } | null = null;

      const finishWeb = async (pos: { coords: { latitude: number; longitude: number; accuracy?: number } }) => {
        stopAllGpsWatchers();
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        const acc = Math.max(3, Math.round(pos.coords.accuracy ?? 10));
        setLatitude(lat);
        setLongitude(lon);
        setGpsAccuracy(acc);
        setUserGpsLocation({ lat, lon, accuracy: acc });
        setLocationSource('GPS');
        setGpsBanner(
          acc <= 30
            ? `Độ chính xác ~${acc} m.`
            : `GPS yếu (Độ chính xác ~${acc} m). Bạn có thể kéo ghim để chỉnh lại.`
        );
        setLocating(false);

        if (!isAddressManuallyEdited) {
          setIsGeocoding(true);
          const formatted = await resolveAddressFromCoords(lat, lon);
          setAddressText(formatted);
          setIsGeocoding(false);
        }
      };

      webWatchIdRef.current = nav.geolocation.watchPosition(
        (pos) => {
          if (!bestPos || (pos.coords.accuracy ?? 999) < (bestPos.coords.accuracy ?? 999)) {
            bestPos = pos;
          }
          if (pos.coords.accuracy && pos.coords.accuracy <= 30) {
            void finishWeb(pos);
          }
        },
        (err) => {
          console.warn('Web geolocation error:', err);
          stopAllGpsWatchers();
          if (locationSourceRef.current !== 'PIN_DRAGGED') {
            setLocationSource('WARD_DEFAULT');
          }
          if (err?.code === 1) {
            setPermissionDenied(true);
            setGpsBanner('Chưa cấp quyền vị trí. Vui lòng bật quyền vị trí hoặc chạm/kéo ghim đỏ trên bản đồ để chọn vị trí sự cố.');
          } else {
            setGpsBanner('GPS yếu. Vui lòng bấm vào bản đồ hoặc kéo ghim để chọn vị trí sự cố.');
          }
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );

      watchTimeoutRef.current = setTimeout(() => {
        if (bestPos) {
          void finishWeb(bestPos);
        } else {
          stopAllGpsWatchers();
          if (locationSourceRef.current !== 'PIN_DRAGGED') {
            setLocationSource('WARD_DEFAULT');
          }
          setGpsBanner('GPS yếu (hết 15s chờ). Vui lòng chạm bản đồ hoặc kéo ghim để chọn vị trí.');
          setLocating(false);
        }
      }, 15000);
      return;
    }

    // Native App (Expo Location API — iOS & Android)
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        if (locationSourceRef.current !== 'PIN_DRAGGED') {
          setLocationSource('WARD_DEFAULT');
        }
        setPermissionDenied(true);
        setGpsBanner('Chưa cấp quyền vị trí. Vui lòng mở Cài đặt để cấp quyền hoặc chạm/kéo ghim đỏ trên bản đồ.');
        setLocating(false);
        return;
      }

      let bestPos: Location.LocationObject | null = null;

      const finishNative = async (pos: Location.LocationObject) => {
        stopAllGpsWatchers();

        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        const acc = Math.max(3, Math.round(pos.coords.accuracy ?? 10));
        setLatitude(lat);
        setLongitude(lon);
        setGpsAccuracy(acc);
        setUserGpsLocation({ lat, lon, accuracy: acc });
        setLocationSource('GPS');
        setGpsBanner(
          acc <= 30
            ? `Độ chính xác ~${acc} m.`
            : `GPS yếu (Độ chính xác ~${acc} m). Bạn có thể kéo ghim đỏ để chỉnh lại.`
        );
        setLocating(false);

        if (!isAddressManuallyEdited) {
          setIsGeocoding(true);
          const formatted = await resolveAddressFromCoords(lat, lon);
          setAddressText(formatted);
          setIsGeocoding(false);
        }
      };

      watchSubRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (pos) => {
          if (!bestPos || (pos.coords.accuracy ?? 999) < (bestPos.coords.accuracy ?? 999)) {
            bestPos = pos;
          }
          if (pos.coords.accuracy !== null && pos.coords.accuracy <= 30) {
            void finishNative(pos);
          }
        }
      );

      watchTimeoutRef.current = setTimeout(() => {
        if (bestPos) {
          void finishNative(bestPos);
        } else {
          stopAllGpsWatchers();
          if (locationSourceRef.current !== 'PIN_DRAGGED') {
            setLocationSource('WARD_DEFAULT');
          }
          setGpsBanner('GPS yếu (không nhận được tín hiệu trong 15s). Vui lòng bấm vào bản đồ hoặc kéo ghim để chọn vị trí sự cố.');
          setLocating(false);
        }
      }, 15000);
    } catch (err) {
      console.warn('Native location watch error:', err);
      stopAllGpsWatchers();
      if (locationSourceRef.current !== 'PIN_DRAGGED') {
        setLocationSource('WARD_DEFAULT');
      }
      setGpsBanner('GPS yếu hoặc không thể kết nối vệ tinh. Vui lòng chạm vào bản đồ để chọn vị trí sự cố.');
      setLocating(false);
    }
  };

  // MOB-4.10: Submit 2-Phase Triage Report or Queue Offline
  const handleSubmitIncident = async () => {
    if (submitting) return;

    if (locationSource === 'WARD_DEFAULT') {
      setOutcome({
        success: false,
        mode: 'VALIDATION_FAILED',
        errors: ['Vui lòng bấm vào bản đồ hoặc kéo ghim đỏ để xác nhận vị trí sự cố trước khi gửi.'],
        message: 'Vui lòng xác nhận vị trí sự cố bằng cách chạm bản đồ hoặc kéo ghim đỏ trước khi gửi.',
      });
      return;
    }

    setSubmitting(true);
    setOutcome(null);
    setFlushNotice(null);

    const res = await executeIncidentSubmission({
      category,
      description,
      addressText,
      reporterPhone,
      latitude,
      longitude,
      fallbackWardCode: currentWard.code,
      locationSource,
      locationAccuracyM: gpsAccuracy ?? undefined,
    });

    setOutcome(res);
    if (res.success) {
      setDescription('');
      await loadOfflineQueue();
    }
    setSubmitting(false);
  };

  const handleFlushQueue = async () => {
    if (flushing) return;
    setFlushing(true);
    setFlushNotice(null);
    const res = await flushOfflineIncidentQueue();
    await loadOfflineQueue();
    setFlushNotice(
      res.syncedCount > 0
        ? `Đã đồng bộ thành công ${res.syncedCount}/${res.totalQueued} báo cáo lên máy chủ.`
        : 'Chưa kết nối được máy chủ. Các báo cáo vẫn được giữ an toàn trong hàng đợi.'
    );
    setFlushing(false);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: responsive.horizontalPadding },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Interactive Google Map with R = 25m Cluster Circle & Draggable Marker */}
      <MobileIncidentMap
        latitude={latitude}
        longitude={longitude}
        locationSource={locationSource}
        userGpsLocation={userGpsLocation}
        gpsAccuracy={gpsAccuracy}
        locating={locating}
        onLocateGps={() => {
          void handleLocateGps();
        }}
        onLocationChange={(lat, lon, src) => {
          handleLocationChange(lat, lon, src);
        }}
        wardName={currentWard.name}
      />

      {/* GPS Banner thông báo trạng thái + Nút mở cài đặt khi bị từ chối quyền */}
      {gpsBanner && (
        <View style={styles.gpsBannerWrap}>
          <Text style={styles.gpsBannerText}>{gpsBanner}</Text>
          {permissionDenied && (
            <Pressable
              onPress={() => {
                void Linking.openSettings();
              }}
              style={{
                marginTop: 4,
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: '#92400E',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 6,
              }}
            >
              <Settings size={12} color="#FFFFFF" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                Mở Cài đặt vị trí
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Tọa độ mô phỏng An Giang (Dành cho việc test nhanh trên Safari iOS / thiết bị ngồi trong nhà) */}
      <View style={styles.presetSection}>
        <Text style={styles.presetTitle}>📍 Điểm thử nghiệm An Giang (Bấm để test định tuyến GPS tức thì):</Text>
        <View style={styles.presetWrap}>
          {[
            { label: 'Xã An Phú', lat: 10.7061, lon: 105.1206, addr: 'Đường tỉnh 957, Xã An Phú, Tỉnh An Giang' },
            { label: 'TP. Long Xuyên', lat: 10.3700, lon: 105.4300, addr: 'Số 18 Trần Hưng Đạo, Phường Long Xuyên, Tỉnh An Giang' },
            { label: 'TX. Tân Châu', lat: 10.8000, lon: 105.2400, addr: 'Đường Nguyễn Huệ, Phường Long Hưng, TX Tân Châu' },
            { label: 'H. Chợ Mới', lat: 10.4500, lon: 105.4200, addr: 'Đường DT942, Xã Long Điền A, Huyện Chợ Mới' },
          ].map((preset, idx) => (
            <Pressable
              key={idx}
              onPress={() => {
                stopAllGpsWatchers();
                setLocating(false);
                setPermissionDenied(false);
                setLatitude(preset.lat);
                setLongitude(preset.lon);
                setGpsAccuracy(4);
                setLocationSource('PIN_DRAGGED');
                setIsAddressManuallyEdited(false);
                setAddressText(preset.addr);
                setGpsBanner(`Đã ghim GPS tại ${preset.label} (${preset.lat}, ${preset.lon}). Vòng gom cụm R = 25m đã kích hoạt.`);
              }}
              style={({ pressed }) => [styles.presetChip, pressed && styles.pressed]}
            >
              <Text style={styles.presetChipText}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* MOB-4.8: Live Cross-Ward Routing Card */}
      <View style={styles.routingCard}>
        <Building2 size={16} color={COLORS.primary} />
        <Text style={styles.routingText} numberOfLines={2}>
          Chuyển về: <Text style={styles.routingBold}>UBND {routedJurisdiction.ward.name}</Text>
          {routedJurisdiction.matchedBy === 'TEXT_BOX' ? ' (theo địa chỉ)' : ' (theo GPS)'}
        </Text>
      </View>

      {/* MOB-4.9: Incident Form Card */}
      <View style={[styles.formCard, { padding: responsive.cardPadding }]}>
        <Text style={[styles.label, typography.bodyBold]}>Loại sự cố</Text>
        <View style={styles.categoryWrap}>
          {INCIDENT_CATEGORY_OPTIONS.map((opt) => {
            const active = category === opt.key;
            return (
              <Pressable
                key={opt.key}
                accessibilityRole="button"
                onPress={() => setCategory(opt.key)}
                style={[styles.catChip, active && styles.catChipActive]}
              >
                <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.field}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={[styles.label, typography.captionSm]}>
              {isGeocoding ? 'Địa chỉ hiện trường (Đang tìm địa chỉ...)' : 'Địa chỉ hiện trường'}
            </Text>
            {isAddressManuallyEdited && (
              <Pressable
                onPress={async () => {
                  setIsAddressManuallyEdited(false);
                  setIsGeocoding(true);
                  try {
                    const formatted = await resolveAddressFromCoords(latitude, longitude);
                    setAddressText(formatted);
                  } catch {} finally {
                    setIsGeocoding(false);
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <RotateCcw size={11} color={COLORS.citizenCrimson} />
                <Text style={{ fontSize: 11, color: COLORS.citizenCrimson, fontWeight: '700' }}>
                  Lấy lại địa chỉ từ ghim
                </Text>
              </Pressable>
            )}
          </View>
          <TextInput
            value={addressText}
            onChangeText={(t) => {
              setAddressText(t);
              setIsAddressManuallyEdited(true);
            }}
            placeholder={`Số nhà, tên đường, ${currentWard.name}...`}
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Shield size={12} color={COLORS.textMuted} />
            <Text style={{ fontSize: 10, color: COLORS.textMuted, fontStyle: 'italic', flex: 1 }}>
              Vị trí chỉ được sử dụng để xử lý sự cố hiện trường và có thể được gửi tới dịch vụ bản đồ để xác định địa chỉ chính xác.
            </Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, typography.captionSm]}>
            Mô tả sự cố (tối thiểu 10 ký tự) *
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Mô tả rõ tình trạng để cán bộ xử lý nhanh..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            style={[styles.input, styles.multiline, typography.bodyMd]}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.phoneLabelRow}>
            <Phone size={13} color={COLORS.citizenCrimson} />
            <Text style={[styles.label, typography.captionSm]}>
              Số điện thoại xác minh khẩn cấp (10 số) *
            </Text>
          </View>
          <TextInput
            value={reporterPhone}
            onChangeText={(v) => setReporterPhone(v.replace(/[^0-9]/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="0918234567"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
        </View>
      </View>

      {/* Submission Result */}
      {outcome ? (
        <View
          style={[
            styles.resultBox,
            outcome.mode === 'VALIDATION_FAILED'
              ? styles.resultErr
              : outcome.mode === 'QUEUED_OFFLINE'
              ? styles.resultWarn
              : styles.resultOk,
          ]}
        >
          <View style={styles.resultTop}>
            {outcome.mode === 'VALIDATION_FAILED' ? (
              <AlertTriangle size={16} color={COLORS.errorAccent} />
            ) : outcome.mode === 'QUEUED_OFFLINE' ? (
              <WifiOff size={16} color={COLORS.warningText} />
            ) : (
              <CheckCircle2 size={16} color={COLORS.successText} />
            )}
            <Text
              style={[
                styles.resultText,
                outcome.mode === 'VALIDATION_FAILED'
                  ? styles.textErr
                  : outcome.mode === 'QUEUED_OFFLINE'
                  ? styles.textWarn
                  : styles.textOk,
              ]}
            >
              {outcome.message}
            </Text>
          </View>

          {outcome.errors && outcome.errors.length > 1
            ? outcome.errors.slice(1).map((e, i) => (
                <Text key={i} style={styles.subErrText}>
                  • {e}
                </Text>
              ))
            : null}

          {outcome.success && (
            <View style={styles.outcomeNavRow}>
              <Pressable
                onPress={() => {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
                  void Linking.openURL(url);
                }}
                style={styles.outcomeNavBtn}
              >
                <Navigation size={13} color="#FFFFFF" />
                <Text style={styles.outcomeNavBtnText}>Chỉ đường Google Maps</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
                  void Linking.openURL(url);
                }}
                style={styles.outcomeMapBtn}
              >
                <ExternalLink size={13} color={COLORS.citizenCrimson} />
                <Text style={styles.outcomeMapBtnText}>Xem bản đồ</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}

      {/* Submit CTA */}
      <Pressable
        accessibilityRole="button"
        disabled={submitting || locationSource === 'WARD_DEFAULT'}
        onPress={() => {
          void handleSubmitIncident();
        }}
        style={({ pressed }) => [
          styles.submitBtn,
          locationSource === 'WARD_DEFAULT' && { backgroundColor: COLORS.textMuted },
          pressed && styles.pressed,
        ]}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={COLORS.onPrimary} />
        ) : locationSource === 'WARD_DEFAULT' ? (
          <MapPin size={17} color={COLORS.onPrimary} />
        ) : (
          <Send size={17} color={COLORS.onPrimary} />
        )}
        <Text style={styles.submitBtnText}>
          {submitting
            ? 'Đang gửi phản ánh...'
            : locationSource === 'WARD_DEFAULT'
            ? 'Chạm bản đồ để xác nhận vị trí'
            : 'Gửi báo cáo sự cố'}
        </Text>
      </Pressable>

      {/* MOB-4.10: Offline Mutation Queue Strip */}
      {offlineQueue.length > 0 ? (
        <View style={styles.offlineBanner}>
          <View style={styles.offlineLeft}>
            <WifiOff size={15} color={COLORS.warningText} />
            <Text style={styles.offlineText}>
              {offlineQueue.length} báo cáo đang chờ sóng 4G để gửi tự động
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={flushing}
            onPress={() => {
              void handleFlushQueue();
            }}
            style={styles.flushBtn}
          >
            {flushing ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <CloudUpload size={14} color={COLORS.onPrimary} />
            )}
            <Text style={styles.flushBtnText}>Gửi lại</Text>
          </Pressable>
        </View>
      ) : null}

      {flushNotice ? <Text style={styles.flushNotice}>{flushNotice}</Text> : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.citizenSurface,
  },
  content: {
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.md,
  },
  mapCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
  },
  mapVisualWrap: {
    position: 'relative',
    width: '100%',
    height: 152,
  },
  gpsBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  gpsBadgeText: {
    color: COLORS.primary,
    fontSize: 11.5,
    fontWeight: '800',
  },
  mapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  coordCol: {
    flex: 1,
    minWidth: 0,
  },
  coordLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  coordValue: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  locateBtn: {
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locateBtnText: {
    color: COLORS.onPrimary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  gpsBannerWrap: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: 3,
  },
  gpsBannerText: {
    fontSize: 11.5,
    color: '#92400E',
    lineHeight: 16,
    fontWeight: '600',
  },
  presetSection: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.sm,
    gap: 6,
  },
  presetTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  presetChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  routingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  routingText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    flex: 1,
  },
  routingBold: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: SPACING.sm,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catChip: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.mutedSurface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    justifyContent: 'center',
  },
  catChipActive: {
    backgroundColor: COLORS.citizenCrimson,
    borderColor: COLORS.citizenCrimson,
  },
  catChipText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  catChipTextActive: {
    color: COLORS.onPrimary,
  },
  field: {
    gap: 4,
  },
  phoneLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  label: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  input: {
    minHeight: MIN_TOUCH_TARGET - 4,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.borderDefault,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    color: COLORS.textPrimary,
  },
  multiline: {
    minHeight: 78,
    textAlignVertical: 'top',
  },
  resultBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    gap: 4,
  },
  resultOk: { backgroundColor: COLORS.successBg, borderColor: COLORS.successBorder },
  resultWarn: { backgroundColor: COLORS.warningBg, borderColor: COLORS.warningBorder },
  resultErr: { backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBorder },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  resultText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    lineHeight: 19,
  },
  subErrText: {
    color: COLORS.errorText,
    fontSize: 12,
    marginLeft: 22,
  },
  textOk: { color: COLORS.successText },
  textWarn: { color: COLORS.warningText },
  textErr: { color: COLORS.errorText },
  submitBtn: {
    minHeight: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.citizenCrimson,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  submitBtnText: {
    color: COLORS.onPrimary,
    fontSize: 14.5,
    fontWeight: '800',
  },
  offlineBanner: {
    backgroundColor: COLORS.warningBg,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  offlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  offlineText: {
    color: COLORS.warningText,
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  flushBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  flushBtnText: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  flushNotice: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  outcomeNavRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  outcomeNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.officerNavy,
    paddingVertical: 9,
    borderRadius: 8,
  },
  outcomeNavBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  outcomeMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  outcomeMapBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pressed: { opacity: 0.84 },
});
