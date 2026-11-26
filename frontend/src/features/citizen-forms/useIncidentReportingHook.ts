import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getLiveSubmittedIncidents,
  reportIssue,
  uploadIncidentPhoto,
  type IssueReportResponse,
  type LiveCitizenIncident,
} from '../../api/client';
import { AN_GIANG_WARDS, type WardItem } from '../../data/anGiangWards';
import { resolveVerifiedJurisdiction, validateWardPoint } from '../../utils/geoUtils';
import { civicIncidentSchema, extractZodFieldErrors } from '../../schemas/formValidation';
import {
  formatIncidentDescriptionWithAddress,
  isValidVietnamesePhone,
  lookupPinAddress,
  lookupReverseGeocodeBanner,
} from './incidentGeocodingHelper';

export function useIncidentReportingHook(
  currentWard: WardItem,
  activeTab: 'form' | 'incident' | 'tracking',
  setMyIncidents: React.Dispatch<React.SetStateAction<LiveCitizenIncident[]>>
) {
  const [category, setCategory] = useState('ROAD_DAMAGE');
  const [urgency, setUrgency] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [reporterPhone, setReporterPhone] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [incidentErrors, setIncidentErrors] = useState<Record<string, string>>({});
  const [manualWardCode, setManualWardCode] = useState<string>('');
  const manualWardSelectRef = useRef<HTMLSelectElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const incidentMapContainerRef = useRef<HTMLDivElement>(null);

  const [description, setDescription] = useState(
    `[Tại: ${currentWard.officeAddress}] Mặt đường bị sụt lún ổ gà sâu gây nguy hiểm cho người đi đường, cần cán bộ giám sát kiểm tra xử lý khẩn cấp.`
  );
  const [addressText, setAddressText] = useState(`${currentWard.officeAddress}`);
  const [latitude, setLatitude] = useState(currentWard.lat);
  const [longitude, setLongitude] = useState(currentWard.lon);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<'GPS' | 'PIN_DRAGGED' | 'WARD_DEFAULT'>('WARD_DEFAULT');
  const [isAddressManuallyEdited, setIsAddressManuallyEdited] = useState(false);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [userGpsLocation, setUserGpsLocation] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [gpsScanBanner, setGpsScanBanner] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState<IssueReportResponse | null>(null);
  const [incidentPhotos, setIncidentPhotos] = useState<Array<{ file: File; previewUrl: string }>>([]);

  const handleAddIncidentPhotos = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIncidentPhotos((prev) => {
      const remaining = Math.max(0, 3 - prev.length);
      const valid = Array.from(files)
        .filter((f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) && f.size <= 5 * 1024 * 1024)
        .slice(0, remaining)
        .map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
      return [...prev, ...valid];
    });
  }, []);

  const handleRemoveIncidentPhoto = useCallback((index: number) => {
    setIncidentPhotos((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const mapLocationToBoxes = useCallback((newAddress: string) => {
    setAddressText(newAddress);
    setDescription((prev) => formatIncidentDescriptionWithAddress(prev, newAddress));
  }, []);

  const resolvedJurisdiction = useMemo(
    () => resolveVerifiedJurisdiction(addressText, description, latitude, longitude, manualWardCode),
    [addressText, description, latitude, longitude, manualWardCode]
  );

  const unverifiedSampleWard = useMemo(
    () => AN_GIANG_WARDS.find((w) => w.coordSource === 'unverified') || null,
    []
  );

  useEffect(() => {
    if (
      locationSource === 'WARD_DEFAULT' &&
      !gpsLoading &&
      resolvedJurisdiction.ward &&
      (resolvedJurisdiction.matchedBy === 'TEXT_BOX' || resolvedJurisdiction.matchedBy === 'MANUAL_SELECT') &&
      resolvedJurisdiction.distanceMeters > 3500
    ) {
      setLatitude(resolvedJurisdiction.ward.lat);
      setLongitude(resolvedJurisdiction.ward.lon);
    }
  }, [resolvedJurisdiction, locationSource, gpsLoading]);

  const reverseGeocodeAndMap = useCallback(
    async (lat: number, lon: number, accuracyMeters: number = 8, presetAddress?: string) => {
      setLatitude(lat);
      setLongitude(lon);
      setGpsAccuracy(Math.max(3, Math.round(accuracyMeters)));
      const { address, banner } = await lookupReverseGeocodeBanner(lat, lon, presetAddress);
      mapLocationToBoxes(address);
      setGpsScanBanner(banner);
    },
    [mapLocationToBoxes]
  );

  const prevWardRef = useRef(currentWard.code);
  useEffect(() => {
    if (prevWardRef.current !== currentWard.code) {
      prevWardRef.current = currentWard.code;
      setLatitude(currentWard.lat);
      setLongitude(currentWard.lon);
      setLocationSource('WARD_DEFAULT');
      setIsAddressManuallyEdited(false);
      mapLocationToBoxes(currentWard.officeAddress);
    }
  }, [currentWard.code, currentWard.lat, currentWard.lon, currentWard.officeAddress, mapLocationToBoxes]);

  const watchIdRef = useRef<number | null>(null);
  const watchTimerRef = useRef<any>(null);
  const pinDebounceRef = useRef<any>(null);
  const locationSourceRef = useRef(locationSource);
  useEffect(() => { locationSourceRef.current = locationSource; }, [locationSource]);

  const stopActiveGpsWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (watchTimerRef.current) {
      clearTimeout(watchTimerRef.current);
      watchTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopActiveGpsWatch();
    if (pinDebounceRef.current) { clearTimeout(pinDebounceRef.current); pinDebounceRef.current = null; }
  }, [stopActiveGpsWatch]);

  const handleGetLocation = useCallback(
    (_isAutoScan: boolean = false) => {
      if (!navigator.geolocation) {
        setLocationSource('WARD_DEFAULT');
        setGpsScanBanner('Trình duyệt không hỗ trợ định vị GPS. Vui lòng bấm vào bản đồ hoặc kéo ghim để chọn vị trí sự cố.');
        return;
      }
      stopActiveGpsWatch();
      setGpsLoading(true);
      setGpsScanBanner('Đang xác định vị trí...');
      let bestPos: GeolocationPosition | null = null;

      const finishLocation = async (pos: GeolocationPosition) => {
        stopActiveGpsWatch();
        const { latitude: lat, longitude: lon, accuracy } = pos.coords;
        const acc = Math.round(accuracy || 10);
        setLatitude(lat); setLongitude(lon); setGpsAccuracy(acc);
        setUserGpsLocation({ lat, lon, accuracy: acc });
        setLocationSource('GPS');
        setGpsLoading(false);
        setGpsScanBanner(
          acc <= 30
            ? `Đã định vị thành công (Độ chính xác ~${acc} m).`
            : `GPS yếu (Độ chính xác ~${acc} m). Vui lòng kéo ghim trên bản đồ để chỉnh lại.`
        );
        if (!isAddressManuallyEdited) {
          setIsGeocodingAddress(true);
          mapLocationToBoxes('');
          try {
            const addr = await lookupPinAddress(lat, lon, currentWard.officeAddress);
            mapLocationToBoxes(addr);
            if (!addr) setGpsScanBanner(`Độ chính xác ~${acc} m. Không lấy được địa chỉ tự động, bạn có thể nhập tay hoặc gửi trực tiếp bằng tọa độ.`);
          } catch {
            mapLocationToBoxes('');
          } finally {
            setIsGeocodingAddress(false);
          }
        }
      };

      try {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) bestPos = pos;
            if (pos.coords.accuracy <= 30) void finishLocation(pos);
          },
          (err) => {
            stopActiveGpsWatch();
            setGpsLoading(false);
            if (locationSourceRef.current !== 'PIN_DRAGGED') setLocationSource('WARD_DEFAULT');
            setGpsScanBanner(
              err.code === 1 ? 'Chưa bật GPS — chạm bản đồ hoặc kéo ghim đỏ để chọn vị trí.'
                : err.code === 3 ? 'GPS yếu — chạm bản đồ hoặc kéo ghim đỏ để chọn vị trí.'
                : 'Chạm bản đồ hoặc kéo ghim đỏ để chọn vị trí sự cố.'
            );
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
        watchTimerRef.current = setTimeout(() => {
          if (bestPos) { void finishLocation(bestPos); return; }
          stopActiveGpsWatch();
          setGpsLoading(false);
          if (locationSourceRef.current !== 'PIN_DRAGGED') setLocationSource('WARD_DEFAULT');
          setGpsScanBanner('GPS yếu (không nhận được tín hiệu trong 15 giây). Vui lòng bấm vào bản đồ hoặc kéo ghim đỏ để chọn vị trí sự cố.');
        }, 15000);
      } catch {
        setGpsLoading(false);
        if (locationSourceRef.current !== 'PIN_DRAGGED') setLocationSource('WARD_DEFAULT');
        setGpsScanBanner('Lỗi khởi tạo GPS. Vui lòng chọn vị trí trên bản đồ.');
      }
    },
    [currentWard.officeAddress, isAddressManuallyEdited, mapLocationToBoxes, stopActiveGpsWatch]
  );

  const handleLocationChange = useCallback(
    (lat: number, lon: number, source: 'GPS' | 'PIN_DRAGGED', accuracyM?: number) => {
      stopActiveGpsWatch();
      setGpsLoading(false);
      setLatitude(lat); setLongitude(lon); setLocationSource(source);
      if (accuracyM !== undefined) setGpsAccuracy(accuracyM);
      else if (source === 'PIN_DRAGGED') setGpsAccuracy(5);
      if (source === 'PIN_DRAGGED') setGpsScanBanner('Đang tìm địa chỉ từ vị trí ghim...');

      if (!isAddressManuallyEdited) {
        setIsGeocodingAddress(true);
        mapLocationToBoxes('');
        if (pinDebounceRef.current) clearTimeout(pinDebounceRef.current);
        pinDebounceRef.current = setTimeout(async () => {
          try {
            const addr = await lookupPinAddress(lat, lon, currentWard.officeAddress);
            mapLocationToBoxes(addr);
            setGpsScanBanner(addr ? `Đã cập nhật vị trí từ ghim bản đồ: "${addr}"` : 'Đã cập nhật tọa độ từ ghim. Không lấy được địa chỉ tự động, bạn có thể nhập tay hoặc gửi bằng tọa độ.');
          } catch {
            mapLocationToBoxes('');
            setGpsScanBanner('Đã cập nhật tọa độ từ ghim. Bạn có thể tự nhập địa chỉ hoặc gửi trực tiếp bằng tọa độ.');
          } finally {
            setIsGeocodingAddress(false);
          }
        }, 500);
      } else if (source === 'PIN_DRAGGED') {
        setGpsScanBanner('Đã cập nhật tọa độ từ ghim bản đồ (giữ nguyên địa chỉ bạn đã nhập tay).');
      }
    },
    [currentWard.officeAddress, isAddressManuallyEdited, mapLocationToBoxes, stopActiveGpsWatch]
  );

  const handleRecenterToGps = useCallback(() => {
    if (!userGpsLocation) { handleGetLocation(false); return; }
    stopActiveGpsWatch();
    setGpsLoading(false);
    setLatitude(userGpsLocation.lat); setLongitude(userGpsLocation.lon);
    setGpsAccuracy(userGpsLocation.accuracy); setLocationSource('GPS');
    setGpsScanBanner(`Đã quay lại vị trí GPS (Độ chính xác ~${userGpsLocation.accuracy} m).`);
    if (!isAddressManuallyEdited) {
      setIsGeocodingAddress(true);
      mapLocationToBoxes('');
      lookupPinAddress(userGpsLocation.lat, userGpsLocation.lon, currentWard.officeAddress)
        .then((addr) => mapLocationToBoxes(addr))
        .catch(() => mapLocationToBoxes(''))
        .finally(() => setIsGeocodingAddress(false));
    }
  }, [userGpsLocation, handleGetLocation, isAddressManuallyEdited, currentWard.officeAddress, mapLocationToBoxes, stopActiveGpsWatch]);

  const handleResetAddressFromPin = useCallback(async () => {
    setIsAddressManuallyEdited(false);
    setIsGeocodingAddress(true);
    setGpsScanBanner('Đang tìm địa chỉ...');
    try {
      const addr = await lookupPinAddress(latitude, longitude, currentWard.officeAddress);
      mapLocationToBoxes(addr);
      setGpsScanBanner(addr ? `Đã cập nhật lại địa chỉ từ vị trí ghim bản đồ: "${addr}"` : 'Không lấy được địa chỉ tự động từ dịch vụ bản đồ. Bạn vẫn có thể gửi báo cáo bằng tọa độ.');
    } catch {
      mapLocationToBoxes('');
    } finally {
      setIsGeocodingAddress(false);
    }
  }, [latitude, longitude, currentWard.officeAddress, mapLocationToBoxes]);

  const handleAddressTextChange = useCallback((newText: string) => {
    setAddressText(newText);
    setIsAddressManuallyEdited(true);
  }, []);

  const hasAutoScannedRef = useRef(false);
  useEffect(() => {
    if (activeTab === 'incident' && !hasAutoScannedRef.current) {
      hasAutoScannedRef.current = true;
      handleGetLocation(true);
    } else if (activeTab !== 'incident') {
      hasAutoScannedRef.current = false;
    }
  }, [activeTab, handleGetLocation]);

  const handleSimulateCrossWardGps = (targetWardCode: string, streetLandmark: string) => {
    const target = AN_GIANG_WARDS.find((w) => w.code === targetWardCode);
    if (!target) return;
    stopActiveGpsWatch();
    setManualWardCode('');
    setGpsLoading(true);
    setReportResult(null);
    setTimeout(() => {
      const simLat = Number((target.lat + 0.00035).toFixed(6));
      const simLon = Number((target.lon + 0.00025).toFixed(6));
      setLocationSource('PIN_DRAGGED');
      setIsAddressManuallyEdited(false);
      void reverseGeocodeAndMap(simLat, simLon, 5, `${streetLandmark}, ${target.name}, Tỉnh An Giang`);
      setGpsLoading(false);
    }, 250);
  };

  const handleReport = async () => {
    const parsed = civicIncidentSchema.safeParse({ locationSource, latitude, longitude, description, reporterPhone });
    if (!parsed.success) {
      const errs = extractZodFieldErrors(parsed.error);
      setIncidentErrors(errs);
      setPhoneError(errs.reporterPhone || null);
      if (errs.reporterPhone) phoneInputRef.current?.focus();
      return;
    }
    setIncidentErrors({});
    setPhoneError(null);
    const cleanPhone = reporterPhone.replace(/[\s.\-()]/g, '');
    if (!resolvedJurisdiction.canAutoRoute || !resolvedJurisdiction.ward) {
      alert('Chưa xác định được xã/phường phụ trách (dữ liệu tọa độ "unverified" hoặc ngoài vùng). Vui lòng chọn đơn vị tiếp nhận thủ công trước khi gửi!');
      manualWardSelectRef.current?.focus();
      return;
    }
    const targetWard: WardItem = resolvedJurisdiction.ward;
    const geoValidation = validateWardPoint(latitude, longitude, targetWard.code);
    if (!geoValidation.valid) {
      alert(`Vị trí phản ánh không hợp lệ [${geoValidation.errorCode}]: ${geoValidation.message}`);
      return;
    }
    const finalAddressText =
      addressText.trim() || `Tọa độ hiện trường: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (${targetWard.name})`;

    setReportLoading(true);
    try {
      const uploadedPhotoKeys: string[] = [];
      for (const item of incidentPhotos.slice(0, 3)) {
        try {
          const uploaded = await uploadIncidentPhoto(item.file, targetWard.code);
          if (uploaded?.photoKey) uploadedPhotoKeys.push(uploaded.photoKey);
        } catch {}
      }
      const res = await reportIssue({
        category, latitude, longitude, addressText: finalAddressText,
        rawDescription: description.trim(), reporterPhone: cleanPhone || undefined,
        wardCode: targetWard.code, wardName: targetWard.name, reporterHomeWardName: currentWard.name,
        urgency, locationAccuracyM: gpsAccuracy || undefined, locationSource,
        photoKeys: uploadedPhotoKeys.length > 0 ? uploadedPhotoKeys : undefined,
      });
      setReportResult(res);
      incidentPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setIncidentPhotos([]);
      setMyIncidents(getLiveSubmittedIncidents());
    } catch {
      alert('Không thể gửi phản ánh tới hệ thống phân luồng.');
    } finally {
      setReportLoading(false);
    }
  };

  return {
    category, setCategory, urgency, setUrgency, reporterPhone, setReporterPhone,
    phoneError, setPhoneError, incidentErrors, setIncidentErrors,
    manualWardCode, setManualWardCode, manualWardSelectRef, phoneInputRef, incidentMapContainerRef,
    description, setDescription, addressText, handleAddressTextChange,
    latitude, setLatitude, longitude, setLongitude, gpsAccuracy, locationSource,
    isAddressManuallyEdited, isGeocodingAddress, userGpsLocation, gpsScanBanner, gpsLoading,
    reportLoading, reportResult, incidentPhotos, handleAddIncidentPhotos, handleRemoveIncidentPhoto,
    resolvedJurisdiction, unverifiedSampleWard,
    handleGetLocation, handleLocationChange, handleRecenterToGps,
    handleResetAddressFromPin, handleSimulateCrossWardGps,
    isValidPhone: isValidVietnamesePhone, handleReport,
  };
}
