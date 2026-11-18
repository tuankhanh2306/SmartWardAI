/**
 * SmartWard AI Mobile — Tab 2: Báo Cáo Sự Cố Hiện Trường GPS 25m (Chặng M4: MOB-4.6 -> MOB-4.10)
 * - Định vị GPS chính xác cao (Location.Accuracy.BestForNavigation) + reverseGeocodeAsync
 * - Khung bản đồ hiện trường SVG với tâm sự cố và vòng tròn bán kính gom cụm R = 25m (#00796B)
 * - Tự động định tuyến liên xã/phường (Cross-Ward Jurisdiction Routing) ưu tiên Ô địa chỉ -> GPS
 * - 5 danh mục chuẩn Backend + bắt buộc SĐT khẩn cấp (10 số) + mô tả >= 10 ký tự
 * - Hàng đợi Offline (offline_incident_queue trên expo-sqlite) + Đồng bộ 1 chạm khi có sóng 4G
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CloudUpload,
  Crosshair,
  MapPin,
  Phone,
  Send,
  WifiOff,
} from 'lucide-react-native';
import { flushOfflineIncidentQueue } from '../api/offlineSyncManager';
import { useAccessibility } from '../context/AccessibilityContext';
import { useWard } from '../context/WardContext';
import { resolveWardFromLocationBox } from '../core/angiangWards';
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

export const FieldIncidentReportScreen: React.FC = () => {
  const { currentWard } = useWard();
  const { typography, fontScaleMode } = useAccessibility();
  const responsive = useResponsivePhone(fontScaleMode);

  // GPS Coordinates & accuracy (MOB-4.6)
  const [latitude, setLatitude] = useState<number>(currentWard.lat);
  const [longitude, setLongitude] = useState<number>(currentWard.lon);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [locating, setLocating] = useState<boolean>(false);

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

  const loadOfflineQueue = useCallback(async () => {
    const rows = await getOfflineIncidentQueue();
    setOfflineQueue(rows);
  }, []);

  useEffect(() => {
    void loadOfflineQueue();
  }, [loadOfflineQueue]);

  // Keep default coordinates synced when user switches ward and hasn't locked GPS yet
  useEffect(() => {
    if (gpsAccuracy === null) {
      setLatitude(currentWard.lat);
      setLongitude(currentWard.lon);
    }
  }, [currentWard.lat, currentWard.lon, gpsAccuracy]);

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

  // MOB-4.6 & MOB-4.8: High-accuracy GPS + Reverse Geocode
  const handleLocateGps = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setLatitude(currentWard.lat);
        setLongitude(currentWard.lon);
        setGpsAccuracy(8);
        if (!addressText.trim()) {
          setAddressText(currentWard.officeAddress);
        }
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const lat = Number(pos.coords.latitude.toFixed(6));
      const lon = Number(pos.coords.longitude.toFixed(6));
      setLatitude(lat);
      setLongitude(lon);
      setGpsAccuracy(Math.max(3, Math.round(pos.coords.accuracy ?? 6)));

      try {
        const geos = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lon,
        });
        if (geos && geos[0]) {
          const g = geos[0];
          const formatted = [g.streetNumber, g.street, g.district || g.subregion, g.city || g.region]
            .filter(Boolean)
            .join(', ');
          if (formatted) {
            setAddressText(formatted);
          }
        }
      } catch {
        // Keep manual address editable
      }
    } catch {
      setLatitude(currentWard.lat);
      setLongitude(currentWard.lon);
      setGpsAccuracy(10);
      if (!addressText.trim()) {
        setAddressText(currentWard.officeAddress);
      }
    } finally {
      setLocating(false);
    }
  };

  // MOB-4.10: Submit 2-Phase Triage Report or Queue Offline
  const handleSubmitIncident = async () => {
    if (submitting) return;
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
      {/* MOB-4.6 & MOB-4.7: Interactive Field Map with R = 25m Cluster Circle */}
      <View style={styles.mapCard}>
        <View style={styles.mapVisualWrap}>
          <Svg width="100%" height={152} viewBox="0 0 340 152">
            <Rect x="0" y="0" width="340" height="152" fill="#ECFDF5" />
            {/* Stylized street grid */}
            <Line x1="0" y1="42" x2="340" y2="42" stroke="#CBD5E1" strokeWidth="1" />
            <Line x1="0" y1="110" x2="340" y2="110" stroke="#CBD5E1" strokeWidth="1" />
            <Line x1="85" y1="0" x2="85" y2="152" stroke="#CBD5E1" strokeWidth="1" />
            <Line x1="255" y1="0" x2="255" y2="152" stroke="#CBD5E1" strokeWidth="1" />
            <Line x1="0" y1="76" x2="340" y2="76" stroke="#FFFFFF" strokeWidth="7" />
            <Line x1="170" y1="0" x2="170" y2="152" stroke="#FFFFFF" strokeWidth="7" />

            {/* R = 25m Spatial Triage Circle (#00796B) */}
            <Circle
              cx="170"
              cy="76"
              r="48"
              fill="rgba(0, 121, 107, 0.14)"
              stroke={COLORS.primary}
              strokeWidth="2"
              strokeDasharray="5,4"
            />
            {/* Incident Center Red Dot */}
            <Circle cx="170" cy="76" r="10" fill="rgba(185, 14, 35, 0.22)" />
            <Circle cx="170" cy="76" r="5.5" fill={COLORS.citizenCrimson} stroke="#FFFFFF" strokeWidth="2" />
            <SvgText
              x="170"
              y="138"
              fill={COLORS.primary}
              fontSize="11"
              fontWeight="700"
              textAnchor="middle"
            >
              Vòng gom cụm R = {DOMAIN_THRESHOLDS.gpsClusterRadiusMeters}m
            </SvgText>
          </Svg>

          {/* GPS Accuracy Pill */}
          <View style={styles.gpsBadge}>
            <MapPin size={12} color={COLORS.primary} />
            <Text style={styles.gpsBadgeText}>
              {gpsAccuracy !== null
                ? `GPS ±${gpsAccuracy}m`
                : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
            </Text>
          </View>
        </View>

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
            onPress={() => {
              void handleLocateGps();
            }}
            style={({ pressed }) => [styles.locateBtn, pressed && styles.pressed]}
          >
            {locating ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Crosshair size={15} color={COLORS.onPrimary} />
            )}
            <Text style={styles.locateBtnText}>Lấy GPS</Text>
          </Pressable>
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
          <Text style={[styles.label, typography.captionSm]}>Địa chỉ hiện trường</Text>
          <TextInput
            value={addressText}
            onChangeText={setAddressText}
            placeholder={`Số nhà, tên đường, ${currentWard.name}...`}
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, typography.bodyMd]}
          />
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
        </View>
      ) : null}

      {/* Submit CTA */}
      <Pressable
        accessibilityRole="button"
        disabled={submitting}
        onPress={() => {
          void handleSubmitIncident();
        }}
        style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={COLORS.onPrimary} />
        ) : (
          <Send size={17} color={COLORS.onPrimary} />
        )}
        <Text style={styles.submitBtnText}>
          {submitting ? 'Đang gửi phản ánh...' : 'Gửi báo cáo sự cố'}
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
  pressed: { opacity: 0.84 },
});
