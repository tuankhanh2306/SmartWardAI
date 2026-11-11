import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import {
  precheckForm,
  reportIssue,
  getLiveSubmittedDossiers,
  saveLiveSubmittedDossier,
  uploadVaultDocument,
  getLiveSubmittedIncidents,
  type FormPrecheckResponse,
  type IssueReportResponse,
  type LiveFormDossier,
  type LiveCitizenIncident
} from '../api/client';
import { extractFormWithVision, normalizeDateToYMD, type ExtractedFormFieldsResult } from '../services/geminiClient';
import { useWard } from '../context/WardContext';
import A4DocumentModal from '../components/A4DocumentModal';
import { CccdQrScannerModal } from '../components/CccdQrScannerModal';
import { type DecodedCccdQr, type QrFieldDiscrepancy } from '../utils/cccdQrParser';
import {
  AN_GIANG_WARDS,
  findNearestWardByCoords,
  resolveWardFromLocationBox,
  type WardItem,
} from '../data/anGiangWards';

import {
  FileCheck2,
  AlertTriangle,
  AlertCircle,
  MapPin,
  Camera,
  CheckCircle2,
  XCircle,
  Sparkles,
  Send,
  PenTool,
  Layers,
  RefreshCw,
  ShieldCheck,
  Upload,
  Trash2,
  Check,
  FileText,
  Laptop,
  PhoneCall,
  Navigation,
  Radio,
  ArrowRight,
  FileDown,
  Volume2,
  VolumeX,
  QrCode
} from 'lucide-react';


export const FormAndIssueReporting: React.FC = () => {
  const { currentWard, setWard } = useWard();
  const location = useLocation();
  const navigate = useNavigate();

  // Active Tab initialized from URL hash or default to 'form'
  const [activeTab, setActiveTab] = useState<'form' | 'incident'>(
    location.hash === '#incident' ? 'incident' : 'form'
  );

  // REA Citizen Live Tracking State (Synchronized with Officer Dashboard actions)
  const [myDossiers, setMyDossiers] = useState<LiveFormDossier[]>(() => getLiveSubmittedDossiers());
  const [myIncidents, setMyIncidents] = useState<LiveCitizenIncident[]>(() => getLiveSubmittedIncidents());

  useEffect(() => {
    if (location.hash === '#incident') {
      setActiveTab('incident');
    } else {
      setActiveTab('form');
    }
    setMyDossiers(getLiveSubmittedDossiers());
    setMyIncidents(getLiveSubmittedIncidents());
  }, [location.hash, location.pathname]);


  // Form Precheck State (Supports 4 Core Administrative Forms: CT01, TK-KS, TK-KH, TK-BTXH)
  const [searchParams] = useSearchParams();
  const urlType = searchParams.get('type')?.toUpperCase();
  const initialType: 'CT01' | 'TK-KS' | 'TK-KH' | 'TK-BTXH' =
    urlType === 'TK-KS' || urlType === 'TK-KH' || urlType === 'TK-BTXH' || urlType === 'CT01'
      ? (urlType as any)
      : 'CT01';

  const [selectedFormType, setSelectedFormType] = useState<'CT01' | 'TK-KS' | 'TK-KH' | 'TK-BTXH'>(initialType);

  useEffect(() => {
    const type = searchParams.get('type')?.toUpperCase();
    if (type === 'TK-KS' || type === 'TK-KH' || type === 'TK-BTXH' || type === 'CT01') {
      setSelectedFormType(type as any);
    }
  }, [searchParams]);
  const [fullName, setFullName] = useState('NGUYỄN TÚ');
  const [cccd, setCccd] = useState('03103708');
  const [dob, setDob] = useState('2015-06-08');
  const [gender, setGender] = useState('Nữ');
  const [issueDate, setIssueDate] = useState('');
  const [address, setAddress] = useState('32/3 Ích, Khu phố 12, Phường Tp Hồ Chí Minh');

  // F7: Real CCCD QR Scanner Modal State & Discrepancies
  const [showCccdQrModal, setShowCccdQrModal] = useState<boolean>(false);
  const [qrDiscrepancies, setQrDiscrepancies] = useState<QrFieldDiscrepancy[]>([]);

  // F9: Zero-Trust Vault MinIO / Redis OTT State
  const [vaultDocInfo, setVaultDocInfo] = useState<{
    docId: string;
    oneTimeToken: string;
    viewUrl: string;
    expiresAt?: string;
  } | null>(null);
  const [isVaultUploading, setIsVaultUploading] = useState<boolean>(false);
  const [vaultUploadError, setVaultUploadError] = useState<string | null>(null);

  const handleCccdQrSuccess = (decoded: DecodedCccdQr, discrepancies: QrFieldDiscrepancy[]) => {
    setCccd(decoded.cccdNumber);
    setFullName(decoded.fullName);
    setDob(decoded.dateOfBirth);
    setGender(decoded.gender);
    setAddress(decoded.address);
    if (decoded.issueDate) {
      setIssueDate(decoded.issueDate);
    }
    setOcrSuccess(true);
    setOcrConfidence(100);
    setPrecheckResult(null);
    setQrDiscrepancies(discrepancies);
  };

  // Specialized fields for CT01 (Residence Declaration - Circular 66/2023/TT-BCA)
  const [phoneNumber, setPhoneNumber] = useState('0918234567');
  const [hostName, setHostName] = useState('NGUYỄN VĂN AN');
  const [hostCccd, setHostCccd] = useState('089075001234');
  const [hostRelation, setHostRelation] = useState('Con đẻ');
  const [declarationScope, setDeclarationScope] = useState('Đăng ký thường trú');

  // Specialized cross-check fields for Priority 1 (TK-KS: Birth Registration + Hospital Birth Cert)
  const [hospitalBirthDate, setHospitalBirthDate] = useState('2026-10-15');
  const [motherName, setMotherName] = useState('LÊ THỊ MỸ LINH');
  const [hospitalMotherName, setHospitalMotherName] = useState('LÊ THỊ MỸ LINH');
  const [fatherName, setFatherName] = useState('TRẦN VĂN HÙNG');
  const [parentsMarried, setParentsMarried] = useState<'YES' | 'NO'>('NO');
  const [childEthnicity, setChildEthnicity] = useState('Kinh');
  const [childNationality, setChildNationality] = useState('Việt Nam');
  const [childBirthPlace, setChildBirthPlace] = useState('Bệnh viện Đa khoa Trung tâm An Giang');
  const [birthCertNumber, setBirthCertNumber] = useState('1234/GCS');
  const [birthCertIssueDate, setBirthCertIssueDate] = useState('2026-10-16');
  const [fatherDob] = useState('1998-05-20');
  const [motherDob] = useState('2000-08-14');
  const [fatherResidence, setFatherResidence] = useState(`Ấp Bình Hòa, ${currentWard.name}, Tỉnh An Giang`);
  const [motherResidence, setMotherResidence] = useState(`Ấp Bình Hòa, ${currentWard.name}, Tỉnh An Giang`);

  // Specialized fields for Priority 2 (TK-KH: Marriage & Single Status Certificate)
  const [marriageMode, setMarriageMode] = useState<'MARRIAGE_REGISTRATION' | 'MARITAL_STATUS_CONFIRMATION'>('MARRIAGE_REGISTRATION');
  const [partnerName, setPartnerName] = useState('PHẠM VĂN MINH');
  const [partnerCccd, setPartnerCccd] = useState('089098004567');
  const [partnerDob, setPartnerDob] = useState('2004-03-10');
  const [partnerGender, setPartnerGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [partnerAddress, setPartnerAddress] = useState(`Số 45 Lê Lợi, ${currentWard.name}, Tỉnh An Giang`);
  const [applicantEthnicity, setApplicantEthnicity] = useState('Kinh');
  const [partnerEthnicity, setPartnerEthnicity] = useState('Kinh');
  const [applicantNationality] = useState('Việt Nam');
  const [partnerNationality] = useState('Việt Nam');
  const [maritalCertPurpose, setMaritalCertPurpose] = useState('Bổ sung hồ sơ');
  const [previousMaritalStatus, setPreviousMaritalStatus] = useState<'SINGLE' | 'DIVORCED' | 'WIDOWED'>('SINGLE');
  const [divorceJudgmentNumber, setDivorceJudgmentNumber] = useState('');
  const [divorceJudgmentDate, setDivorceJudgmentDate] = useState('');
  const [deathCertNumber, setDeathCertNumber] = useState('');
  const [deathCertDate, setDeathCertDate] = useState('');

  // Specialized fields for Priority 3 (TK-BTXH: Social Protection Decree 20/2021/NĐ-CP & Luật BHXH 2024)
  const [disabilityLevel, setDisabilityLevel] = useState<'NONE' | 'SEVERE' | 'EXTREMELY_SEVERE'>('NONE');
  const [householdStatus, setHouseholdStatus] = useState<'NORMAL' | 'POOR' | 'NEAR_POOR'>('NORMAL');
  const [bankAccount, setBankAccount] = useState('');
  const [poorHouseholdBookNumber, setPoorHouseholdBookNumber] = useState('');
  const [disabilityCertNumber, setDisabilityCertNumber] = useState('');
  const [disabilityCertIssueDate, setDisabilityCertIssueDate] = useState('');
  const [disabilityCertIssuer, setDisabilityCertIssuer] = useState(`Chủ tịch UBND ${currentWard.name}`);
  const [guardianName, setGuardianName] = useState('');
  const [guardianCccd, setGuardianCccd] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('Con đẻ');
  const [guardianPhone, setGuardianPhone] = useState('');

  // A4 Printable Administrative Document Modal Preview (Nghị định 30/2020/NĐ-CP)
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [formLoading, setFormLoading] = useState(false);
  const [precheckResult, setPrecheckResult] = useState<FormPrecheckResponse | null>(null);

  // Input Method for PC / Mobile: 'upload' (PC Desktop) vs 'camera' (Mobile/Webcam) vs 'manual'
  const [inputMode, setInputMode] = useState<'upload' | 'camera' | 'manual'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [, setOcrConfidence] = useState<number | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [, setOcrDetails] = useState<ExtractedFormFieldsResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Civic Incident Reporting State
  const [category, setCategory] = useState('ROAD_DAMAGE');
  const [urgency, setUrgency] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [reporterPhone, setReporterPhone] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('smartward_citizen_phone') || '';
    }
    return '';
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [description, setDescription] = useState(
    `[Tại: Khu vực trung tâm ${currentWard.name}, Tỉnh An Giang] Đoạn đường gần ${currentWard.officeAddress} bị sụt lún ổ gà sâu gây nguy hiểm cho người đi đường, cần cán bộ giám sát kiểm tra xử lý khẩn cấp.`
  );
  const [addressText, setAddressText] = useState(`${currentWard.officeAddress}`);
  const [latitude, setLatitude] = useState(currentWard.lat);
  const [longitude, setLongitude] = useState(currentWard.lon);
  const [, setGpsAccuracy] = useState<number | null>(8);
  const [gpsScanBanner, setGpsScanBanner] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState<IssueReportResponse | null>(null);

  // Text-To-Speech (Hỗ trợ người cao tuổi & khiếm thị theo Đề án 06 với 2 chế độ TẮT / MỞ)
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      } catch (err) {
        console.warn('speechSynthesis cancel warning:', err);
      }
    }
    currentUtteranceRef.current = null;
    setSpeakingId(null);
  }, []);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  const startSpeech = useCallback((text: string, id: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt của bạn hiện chưa hỗ trợ tính năng đọc âm thanh.');
      return;
    }

    stopSpeech();

    const clean = text
      .replace(/\[[A-Za-z0-9_\-]+\]/g, '')
      .replace(/[*#_~`>]/g, ' ')
      .replace(/•/g, ', ')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;

    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = 'vi-VN';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        if ('speechSynthesis' in window) {
          const voices = window.speechSynthesis.getVoices();
          const viVoice = voices.find((v) => v.lang.toLowerCase().includes('vi'));
          if (viVoice) {
            utterance.voice = viVoice;
          }
        }

        utterance.onend = () => {
          currentUtteranceRef.current = null;
          setSpeakingId(null);
        };
        utterance.onerror = () => {
          currentUtteranceRef.current = null;
          setSpeakingId(null);
        };

        currentUtteranceRef.current = utterance;
        setSpeakingId(id);
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Speech synthesis error:', err);
        setSpeakingId(null);
      }
    }, 50);
  }, [stopSpeech]);

  const toggleSpeech = useCallback((text: string, id: string) => {
    if (speakingId === id) {
      stopSpeech();
    } else {
      startSpeech(text, id);
    }
  }, [speakingId, stopSpeech, startSpeech]);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Incident Map Pin Dropper Refs
  const incidentMapContainerRef = useRef<HTMLDivElement>(null);
  const incidentMapInstanceRef = useRef<L.Map | null>(null);
  const incidentMarkerRef = useRef<L.Marker | null>(null);
  const incidentRadiusCircleRef = useRef<L.Circle | null>(null);

  // Helper to map scanned/selected location into BOTH the Location Box (addressText) and Content Box (description)
  const mapLocationToBoxes = useCallback((newAddress: string) => {
    setAddressText(newAddress);
    setDescription((prev) => {
      const stripped = prev
        .replace(/^\[(?:Tại|Vị trí|Vị trí hiện trường):[^\]]*\]\s*/i, '')
        .trim();
      const body =
        stripped ||
        'Phát hiện sự cố hư hỏng hạ tầng gây mất an toàn giao thông, đề nghị cán bộ giám sát kiểm tra xử lý khẩn cấp.';
      return `[Tại: ${newAddress}] ${body}`;
    });
  }, []);

  // Resolve target receiving Ward/Commune dynamically from the Location Box & Content Box first, then GPS coords
  const resolvedJurisdiction = useMemo(() => {
    return resolveWardFromLocationBox(addressText, description, latitude, longitude);
  }, [addressText, description, latitude, longitude]);

  // If citizen manually types a different ward name in the box (e.g. "Phường Châu Đốc"), pan GPS coords to that ward if far away
  useEffect(() => {
    if (
      resolvedJurisdiction.matchedBy === 'TEXT_BOX' &&
      resolvedJurisdiction.distanceMeters > 3500
    ) {
      setLatitude(resolvedJurisdiction.ward.lat);
      setLongitude(resolvedJurisdiction.ward.lon);
    }
  }, [resolvedJurisdiction]);

  // Reverse geocode coordinates and map into boxes
  const reverseGeocodeAndMap = useCallback(
    async (lat: number, lon: number, accuracyMeters: number = 8, presetAddress?: string) => {
      setLatitude(lat);
      setLongitude(lon);
      setGpsAccuracy(Math.max(3, Math.round(accuracyMeters)));

      const nearest = findNearestWardByCoords(lat, lon);
      const fallbackAddress =
        presetAddress ||
        `Gần ${nearest.ward.officeAddress} (Tọa độ: ${lat.toFixed(5)}, ${lon.toFixed(5)})`;

      // Immediately map fallback/preset address so UI responds in 0ms
      mapLocationToBoxes(fallbackAddress);

      if (presetAddress) {
        setGpsScanBanner(
          `Đã xác định vị trí tại ${nearest.ward.name} và tự động điền địa chỉ vào tờ báo cáo.`
        );
        return;
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
            addrObj.road ||
            addrObj.pedestrian ||
            addrObj.suburb ||
            addrObj.quarter ||
            addrObj.hamlet ||
            addrObj.village ||
            '';
          // If GPS is within An Giang (< 60km from nearest An Giang ward), attach the resolved An Giang ward name
          const resolvedAddr =
            nearest.distanceMeters <= 60000
              ? road
                ? `${road}, ${nearest.ward.name}, Tỉnh An Giang`
                : `${nearest.ward.officeAddress}`
              : data?.display_name
              ? `${road ? road + ', ' : ''}${nearest.ward.name}, Tỉnh An Giang (GPS thực tế)`
              : fallbackAddress;

          mapLocationToBoxes(resolvedAddr);
          setGpsScanBanner(
            `Đã xác định vị trí "${resolvedAddr}" và tự động điền vào ô địa chỉ.`
          );
          return;
        }
      } catch {
        // Fallback already applied
      }

      setGpsScanBanner(
        `Đã xác định vị trí tại ${nearest.ward.name} và tự động điền vào ô địa chỉ.`
      );
    },
    [mapLocationToBoxes]
  );

  // Sync with currentWard if user switches ward in Header
  const prevWardRef = useRef(currentWard.code);
  useEffect(() => {
    if (prevWardRef.current !== currentWard.code) {
      prevWardRef.current = currentWard.code;
      setLatitude(currentWard.lat);
      setLongitude(currentWard.lon);
      mapLocationToBoxes(currentWard.officeAddress);
      if (!ocrSuccess) {
        setAddress((prev) => (prev.startsWith('Số 12,') || !prev ? `Số 12, ${currentWard.officeAddress}` : prev));
      }
    }
  }, [currentWard.code, currentWard.lat, currentWard.lon, currentWard.name, currentWard.officeAddress, ocrSuccess, mapLocationToBoxes]);

  // Leaflet Interactive Pin Dropper for Incident Tab (with tight R=25m spatial circle)
  useEffect(() => {
    if (activeTab !== 'incident' || !incidentMapContainerRef.current) return;

    if (incidentMapInstanceRef.current) {
      incidentMapInstanceRef.current.remove();
      incidentMapInstanceRef.current = null;
    }

    const container = incidentMapContainerRef.current;
    const map = L.map(container, {
      zoomControl: false,
      preferCanvas: true,
    }).setView([latitude, longitude], 17);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi', {
      subdomains: ['0', '1', '2', '3'],
      attribution: '&copy; Google Maps &bull; GIS Hành chính An Giang',
      maxZoom: 20,
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

    // Tight R = 25m spatial precision circle
    const radiusCircle = L.circle([latitude, longitude], {
      radius: 25,
      color: '#00687A',
      weight: 2,
      fillColor: '#57DFFE',
      fillOpacity: 0.25,
    }).addTo(map);

    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      reverseGeocodeAndMap(pos.lat, pos.lng, 5);
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      radiusCircle.setLatLng(e.latlng);
      reverseGeocodeAndMap(e.latlng.lat, e.latlng.lng, 5);
    });

    incidentMapInstanceRef.current = map;
    incidentMarkerRef.current = marker;
    incidentRadiusCircleRef.current = radiusCircle;

    const rafId = requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    const t1 = setTimeout(() => map.invalidateSize({ animate: false }), 100);
    const t2 = setTimeout(() => map.invalidateSize({ animate: false }), 350);
    const t3 = setTimeout(() => map.invalidateSize({ animate: false }), 700);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (incidentMapInstanceRef.current) {
          incidentMapInstanceRef.current.invalidateSize({ animate: false });
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      map.remove();
      incidentMapInstanceRef.current = null;
      incidentMarkerRef.current = null;
      incidentRadiusCircleRef.current = null;
    };
  }, [activeTab]);

  // Sync marker & 25m precision circle position when GPS button or coordinates update
  useEffect(() => {
    if (incidentMarkerRef.current && incidentMapInstanceRef.current) {
      incidentMarkerRef.current.setLatLng([latitude, longitude]);
      if (incidentRadiusCircleRef.current) {
        incidentRadiusCircleRef.current.setLatLng([latitude, longitude]);
      }
      incidentMapInstanceRef.current.panTo([latitude, longitude]);
    }
  }, [latitude, longitude]);


  // Handle FormType Switching with realistic pre-populated test cases
  const handleSelectFormType = (type: 'CT01' | 'TK-KS' | 'TK-KH' | 'TK-BTXH', presetMode: 'ERROR_DEMO' | 'VALID_DEMO' = 'ERROR_DEMO') => {
    setSelectedFormType(type);
    setPrecheckResult(null);

    if (type === 'CT01') {
      if (presetMode === 'ERROR_DEMO') {
        setFullName('NGUYỄN TÚ');
        setCccd('03103708');
        setDob('2015-06-08');
        setGender('Nữ');
        setPhoneNumber('09012');
        setHostName('');
        setHostCccd('');
        setHostRelation('');
        setDeclarationScope('Đăng ký thường trú');
        setAddress('32/3 Ích, Khu phố 12, Phường Tp Hồ Chí Minh');
      } else {
        setFullName('NGUYỄN MINH TUẤN KHANH');
        setCccd('089205023490');
        setDob('2005-06-23');
        setGender('Nam');
        setPhoneNumber('0918234567');
        setHostName('NGUYỄN VĂN AN');
        setHostCccd('089075001234');
        setHostRelation('Con đẻ');
        setDeclarationScope('Đăng ký thường trú');
        setAddress(`Số 18 Đường Trần Hưng Đạo, ${currentWard.name}, Tỉnh An Giang`);
      }
    } else if (type === 'TK-KS') {
      if (presetMode === 'ERROR_DEMO') {
        setFullName('TRẦN GIA BẢO');
        setDob('2026-10-18'); // Lệch ngày sinh so với Giấy chứng sinh (15/10/2026)
        setHospitalBirthDate('2026-10-15');
        setGender('Nam');
        setMotherName('LÊ THỊ MỸ LINH');
        setHospitalMotherName('LÊ THỊ MỸ LINH');
        setCccd('089195001234');
        setFatherName('TRẦN VĂN HÙNG');
        setParentsMarried('NO'); // Chưa đăng ký kết hôn nhưng ghi tên cha vào tờ khai thường
        setAddress(`${currentWard.name}, Tỉnh An Giang`);
      } else {
        setFullName('TRẦN GIA BẢO');
        setDob('2026-10-15');
        setHospitalBirthDate('2026-10-15');
        setGender('Nam');
        setMotherName('LÊ THỊ MỸ LINH');
        setHospitalMotherName('LÊ THỊ MỸ LINH');
        setCccd('089195001234');
        setFatherName('TRẦN VĂN HÙNG');
        setParentsMarried('YES');
        setAddress(`${currentWard.name}, Tỉnh An Giang`);
      }
    } else if (type === 'TK-KH') {
      if (presetMode === 'ERROR_DEMO') {
        setFullName('NGUYỄN THỊ NGỌC TRÂM');
        setGender('Nữ');
        setDob('2009-02-15'); // Mới 17 tuổi 8 tháng (< 18 tuổi)
        setCccd('089309004567');
        setPartnerName('PHẠM VĂN MINH');
        setPartnerGender('Nam');
        setPartnerDob('2004-03-10');
        setMaritalCertPurpose('Bổ sung hồ sơ'); // Ghi chung chung
        setPreviousMaritalStatus('SINGLE');
        setAddress(`Ấp An Hòa, ${currentWard.name}, Tỉnh An Giang`);
      } else {
        setFullName('NGUYỄN THỊ NGỌC TRÂM');
        setGender('Nữ');
        setDob('2003-05-12'); // Đủ > 18 tuổi
        setCccd('089303004567');
        setPartnerName('PHẠM VĂN MINH');
        setPartnerGender('Nam');
        setPartnerDob('2001-03-10'); // Đủ > 20 tuổi
        setMaritalCertPurpose(`Để làm thủ tục đăng ký kết hôn với anh Phạm Văn Minh tại UBND ${currentWard.name}`);
        setPreviousMaritalStatus('SINGLE');
        setAddress(`Ấp An Hòa, ${currentWard.name}, Tỉnh An Giang`);
      }
    } else if (type === 'TK-BTXH') {
      if (presetMode === 'ERROR_DEMO') {
        setFullName('LÊ VĂN BẢY');
        setGender('Nam');
        setDob('1954-08-20'); // 72 tuổi (< 75 tuổi theo Luật BHXH 2024 & < 80 tuổi theo NĐ 20/2021)
        setCccd('089049001122');
        setHouseholdStatus('NORMAL');
        setDisabilityLevel('NONE');
        setBankAccount(''); // Thiếu tài khoản nhận trợ cấp Đề án 06
        setAddress(`Khóm Bình Long, ${currentWard.name}, Tỉnh An Giang`);
      } else {
        setFullName('LÊ VĂN BẢY');
        setGender('Nam');
        setDob('1949-04-10'); // 77 tuổi (>= 75 tuổi theo Luật BHXH 2024)
        setCccd('089043001122');
        setHouseholdStatus('NORMAL');
        setDisabilityLevel('NONE');
        setBankAccount('70110000889912 - VietinBank Chi nhánh An Giang');
        setAddress(`Khóm Bình Long, ${currentWard.name}, Tỉnh An Giang`);
      }
    }
  };

  // Handle Form Precheck across all 4 form types
  const handlePrecheck = async () => {
    setFormLoading(true);
    const procMap: Record<'CT01' | 'TK-KS' | 'TK-KH' | 'TK-BTXH', string> = {
      CT01: 'TTHC-CR-01',
      'TK-KS': 'TTHC-HT-01',
      'TK-KH': 'TTHC-HT-02',
      'TK-BTXH': 'TTHC-BT-01',
    };
    try {
      const res = await precheckForm({
        procedureCode: procMap[selectedFormType],
        formType: selectedFormType,
        citizenCccd: cccd,
        fullName,
        dateOfBirth: dob,
        gender,
        cccdIssueDate: issueDate,
        address,
        formData: {
          permanentAddress: address,
          gender,
          phoneNumber,
          phone: phoneNumber,
          hostName,
          hostCccd,
          hostRelation,
          declarationScope,
          householdStatus,
          hospitalBirthDate,
          motherName,
          hospitalMotherName,
          fatherName,
          parentsMarried,
          partnerName,
          partnerDob,
          partnerGender,
          maritalCertPurpose,
          previousMaritalStatus,
          disabilityLevel,
          bankAccount,
        },
      });
      setPrecheckResult(res);

      // Save to live dossiers with vaultToken and vaultDocId
      const formLabels: Record<'CT01' | 'TK-KS' | 'TK-KH' | 'TK-BTXH', 'CT01' | 'Khai sinh' | 'Kết hôn' | 'Bảo trợ'> = {
        CT01: 'CT01',
        'TK-KS': 'Khai sinh',
        'TK-KH': 'Kết hôn',
        'TK-BTXH': 'Bảo trợ',
      };
      const now = new Date();
      const nowStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const issues = res.fieldValidations ? res.fieldValidations.filter((v) => !v.valid).map((v) => v.errorMessage || v.fieldName) : [];

      saveLiveSubmittedDossier({
        id: `${selectedFormType}-${Math.floor(1000 + Math.random() * 9000)}`,
        citizenName: (fullName || 'CÔNG DÂN KÊ KHAI').toUpperCase(),
        procedure: procMap[selectedFormType],
        formType: formLabels[selectedFormType],
        submittedAt: `Vừa nộp (${nowStr})`,
        status: res.overallValid ? 'VALID' : 'HAS_ERRORS',
        cccd: cccd || 'Chưa điền',
        errorCount: issues.length,
        wardName: currentWard.name,
        vaultToken: vaultDocInfo?.oneTimeToken,
        vaultDocId: vaultDocInfo?.docId,
        details: {
          dob: dob || 'Chưa cung cấp',
          gender: gender || 'Nam',
          address: address || currentWard.name,
          confidence: 99.0,
          issues,
          vaultToken: vaultDocInfo?.oneTimeToken,
        },
      });

      setMyDossiers(getLiveSubmittedDossiers());
    } catch {
      alert('Không thể kết nối đến máy chủ backend để kiểm tra tờ khai.');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle File Upload from PC / Desktop
  const handleFileChange = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Vui lòng chọn tệp hình ảnh (PNG, JPG, JPEG, WEBP) hoặc PDF tờ khai.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước tệp vượt quá 5MB theo hạn mức Zero-Trust Vault (Nghị định 13/2023/NĐ-CP). Vui lòng chọn tệp nhẹ hơn.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // 1. Run client-side OCR
    runVisionOcr(file);

    // 2. Upload to Zero-Trust Vault with AES-256-GCM encryption & Java2D watermark
    setIsVaultUploading(true);
    setVaultUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const docType = selectedFormType === 'TK-KS' ? 'GIAY_CHUNG_SINH'
                    : selectedFormType === 'TK-KH' ? 'GIAY_XAC_NHAN_DOC_THAN'
                    : selectedFormType === 'TK-BTXH' ? 'SO_HO_NGHEO_KHUYET_TAT'
                    : 'CT01_RESIDENCE_ATTACHMENT';
      formData.append('documentType', docType);

      const vaultRes = await uploadVaultDocument(formData);
      setVaultDocInfo({
        docId: vaultRes.documentId,
        oneTimeToken: vaultRes.oneTimeToken,
        viewUrl: vaultRes.viewUrl,
        expiresAt: vaultRes.expiresAt,
      });
    } catch (err: any) {
      console.warn('Lỗi tải tệp lên Vault:', err);
      setVaultUploadError('Không thể mã hóa tệp vào Vault. Tờ khai vẫn có thể tiền kiểm tra.');
    } finally {
      setIsVaultUploading(false);
    }
  };

  const runVisionOcr = async (file: File) => {
    setIsOcrProcessing(true);
    setOcrSuccess(false);
    setOcrError(null);
    setOcrDetails(null);

    // Clear previous values so the citizen directly observes fresh field mapping from the file
    setFullName('');
    setCccd('');
    setDob('');
    setGender('');
    setIssueDate('');
    setAddress('');

    try {
      const result = await extractFormWithVision(file);
      setOcrDetails(result);

      if (result.success && result.extractedFieldsCount > 0) {
        // Direct field mapping into form state ONLY when the corresponding section is identified
        if (result.fullName) setFullName(result.fullName.toUpperCase());
        if (result.cccd) setCccd(result.cccd);
        if (result.dob) setDob(normalizeDateToYMD(result.dob));
        if (result.gender) setGender(result.gender);
        if (result.address) setAddress(result.address);

        // Note: Mẫu CT01 has NO "Ngày cấp CCCD" (Issue Date) field. Never map signing date into CCCD issue date!
        if (result.issueDate) {
          setIssueDate(normalizeDateToYMD(result.issueDate));
        }

        setOcrConfidence(Number(result.confidence.toFixed(1)));
        setOcrSuccess(true);
      } else {
        setOcrSuccess(false);
        setOcrConfidence(null);
        setOcrError(result.message || 'Không tìm thấy các mục thông tin tương ứng trên tệp này. Quý công dân vui lòng nhập trực tiếp vào các ô bên dưới.');
      }
    } catch (err: any) {
      setOcrSuccess(false);
      setOcrConfidence(null);
      setOcrError('Lỗi trong quá trình trích xuất OCR: ' + (err?.message || 'Không thể đọc ảnh. Vui lòng nhập tay.'));
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setOcrSuccess(false);
    setOcrConfidence(null);
    setOcrError(null);
    setOcrDetails(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Helper to load sample CT01 form for instant test on PC
  const handleLoadSample = () => {
    setFullName('NGUYỄN TÚ');
    setCccd('03103708');
    setDob('2015-06-08');
    setGender('Nữ');
    setIssueDate('');
    setAddress('32/3 Ích, Khu phố 12, Phường Tp Hồ Chí Minh');
    setOcrConfidence(98.5);
    setOcrSuccess(true);
    setOcrError(null);
    setOcrDetails({
      success: true,
      fullName: 'NGUYỄN TÚ',
      cccd: '03103708',
      dob: '2015-06-08',
      gender: 'Nữ',
      issueDate: '',
      address: '32/3 Ích, Khu phố 12, Phường Tp Hồ Chí Minh',
      confidence: 98.5,
      detectedDocType: 'Tờ khai CT01 cư trú (Mẫu chuẩn Bộ Công an)',
      message: 'Đã nạp bộ dữ liệu chuẩn theo Mẫu CT01 (Thông tư Bộ Công an)!',
      extractedFieldsCount: 5,
    });
  };

  // Handle High-Accuracy HTML5 Geolocation API (R=25m) and auto-map into boxes
  const handleGetLocation = useCallback(
    (isAutoScan: boolean = false) => {
      if (!navigator.geolocation) {
        if (!isAutoScan) {
          alert('Trình duyệt của bạn không hỗ trợ định vị GPS. Bạn có thể nhập hoặc chỉnh địa chỉ trực tiếp tại ô vị trí.');
        } else {
          reverseGeocodeAndMap(latitude, longitude, 8, currentWard.officeAddress);
        }
        return;
      }
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lon, accuracy } = pos.coords;
          const nearest = findNearestWardByCoords(lat, lon);
          // If auto-scanning on a desktop PC far outside An Giang (> 80km), keep current ward coords unless user clicked manual GPS scan
          if (isAutoScan && nearest.distanceMeters > 80000) {
            reverseGeocodeAndMap(currentWard.lat, currentWard.lon, 8, currentWard.officeAddress);
          } else {
            reverseGeocodeAndMap(lat, lon, accuracy || 8);
          }
          setGpsLoading(false);
        },
        () => {
          reverseGeocodeAndMap(latitude, longitude, 10, addressText || currentWard.officeAddress);
          setGpsLoading(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 8000,
        }
      );
    },
    [reverseGeocodeAndMap, latitude, longitude, currentWard.lat, currentWard.lon, currentWard.officeAddress, addressText]
  );

  // Auto-scan GPS first whenever citizen opens the "Báo Sự Cố Hiện Trường" tab
  const hasAutoScannedRef = useRef(false);
  useEffect(() => {
    if (activeTab === 'incident' && !hasAutoScannedRef.current) {
      hasAutoScannedRef.current = true;
      handleGetLocation(true);
    } else if (activeTab !== 'incident') {
      hasAutoScannedRef.current = false;
    }
  }, [activeTab, handleGetLocation]);

  // Simulate moving across wards (e.g., Citizen from Xã An Phú traveling through Phường Châu Đốc)
  const handleSimulateCrossWardGps = (targetWardCode: string, streetLandmark: string) => {
    const target = AN_GIANG_WARDS.find((w) => w.code === targetWardCode);
    if (!target) return;
    setGpsLoading(true);
    setReportResult(null);
    setTimeout(() => {
      const simLat = Number((target.lat + 0.00035).toFixed(6));
      const simLon = Number((target.lon + 0.00025).toFixed(6));
      const fullAddr = `${streetLandmark}, ${target.name}, Tỉnh An Giang`;
      reverseGeocodeAndMap(simLat, simLon, 5, fullAddr);
      setGpsLoading(false);
    }, 250);
  };

  // Validate Vietnamese phone number
  const isValidPhone = (phone: string): boolean => {
    const clean = phone.replace(/[\s.\-()]/g, '');
    return /^(0|\+84)(3|5|7|8|9|2)[0-9]{8,9}$/.test(clean);
  };

  // Handle Incident Report (Routes dynamically based on the Location Box!)
  const handleReport = async () => {
    const cleanPhone = reporterPhone.replace(/[\s.\-()]/g, '');
    if (!cleanPhone || !isValidPhone(cleanPhone)) {
      setPhoneError(
        'Khi báo tin khẩn, bắt buộc phải kèm Số điện thoại hợp lệ (10 số, VD: 0918123456) để người giám sát địa bàn liên hệ xác minh!'
      );
      phoneInputRef.current?.focus();
      return;
    }
    setPhoneError(null);

    if (!addressText.trim()) {
      alert('Vui lòng quét GPS hoặc nhập vị trí hiện trường sự cố.');
      return;
    }
    if (!description.trim()) {
      alert('Vui lòng nhập mô tả sự cố hiện trường.');
      return;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('smartward_citizen_phone', cleanPhone);
    }

    const targetWard: WardItem = resolvedJurisdiction.ward;

    setReportLoading(true);
    try {
      const res = await reportIssue({
        category,
        latitude,
        longitude,
        addressText: addressText.trim(),
        rawDescription: description.trim(),
        reporterPhone: cleanPhone,
        wardCode: targetWard.code,
        wardName: targetWard.name,
        reporterHomeWardName: currentWard.name,
        urgency,
      });
      setReportResult(res);
      setMyIncidents(getLiveSubmittedIncidents());
    } catch {
      alert('Không thể gửi phản ánh tới hệ thống phân luồng.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <main className="bg-uth-canvas bg-uth-watermark min-h-[calc(100vh-4rem)] p-3 sm:p-6 lg:p-8 flex flex-col justify-start relative">
      <div className="flex flex-col w-full max-w-7xl mx-auto gap-5 relative z-10">
        {/* Top Segmented Navigation Tab Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-[#00796B] tracking-tight">
            {activeTab === 'form'
              ? `Kiểm Tra 4 Mẫu Tờ Khai • ${currentWard.name}`
              : `Báo Sự Cố Hiện Trường (GPS) • ${currentWard.name}`}
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            {activeTab === 'form'
              ? 'Rà soát tự động 12 số CCCD, ngày sinh, điều kiện kết hôn & bảo trợ trước khi nộp quầy.'
              : 'Định vị GPS tự động và chuyển thẳng về Bàn điều hành xã/phường phụ trách.'}
          </p>
        </div>

        <div className="p-1 bg-[#E2E8F0]/70 rounded-xl border border-[#CBD5E1] flex items-center gap-1 self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveTab('form');
              navigate('/citizen/form#form', { replace: true });
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'form'
                ? 'bg-[#00796B] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#00796B]'
            }`}
          >
            <FileCheck2 className={`w-3.5 h-3.5 ${activeTab === 'form' ? 'text-[#80CBC4]' : 'text-[#64748B]'}`} />
            <span>Tờ Khai (4 Mẫu)</span>
          </button>

          <button
            id="incident"
            onClick={() => {
              setActiveTab('incident');
              navigate('/citizen/form#incident', { replace: true });
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'incident'
                ? 'bg-[#00796B] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#00796B]'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${activeTab === 'incident' ? 'text-[#80CBC4]' : 'text-[#64748B]'}`} />
            <span>Báo Sự Cố (GPS)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FORM PRECHECK ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'form' && (
        <section className="flex flex-col gap-5 animate-fadeIn">

          {/* 4-Form Priority Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                id: 'CT01' as const,
                badge: 'Cư trú',
                title: '1. Mẫu CT01 Cư Trú',
                desc: 'Kiểm tra 12 số CCCD, ngày sinh & địa chỉ cư trú.',
              },
              {
                id: 'TK-KS' as const,
                badge: 'Hộ tịch',
                title: '2. Đăng Ký Khai Sinh',
                desc: 'Đối chiếu Tờ khai với Giấy chứng sinh bệnh viện.',
              },
              {
                id: 'TK-KH' as const,
                badge: 'Tư pháp',
                title: '3. Kết Hôn & Độc Thân',
                desc: 'Kiểm tra tuổi kết hôn (Nam ≥ 20, Nữ ≥ 18) & mục đích.',
              },
              {
                id: 'TK-BTXH' as const,
                badge: 'An sinh',
                title: '4. Trợ Cấp Bảo Trợ',
                desc: 'Kiểm tra tuổi ≥ 75 (Luật BHXH 2024), mức khuyết tật & STK an sinh.',
              },
            ].map((item) => {
              const active = selectedFormType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectFormType(item.id, 'ERROR_DEMO')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    active
                      ? 'bg-[#00796B] text-white border-[#00796B] shadow-sm'
                      : 'bg-white hover:bg-[#F8FAFC] text-[#0F172A] border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        active ? 'bg-[#80CBC4] text-[#00796B]' : 'bg-[#F1F5F9] text-[#00796B]'
                      }`}
                    >
                      {item.badge}
                    </span>
                    {active && <CheckCircle2 className="w-4 h-4 text-[#80CBC4]" />}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-extrabold">{item.title}</div>
                    <p className={`text-xs mt-1 leading-snug ${active ? 'text-white/85' : 'text-[#64748B]'}`}>
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* MANDATORY SIGNATURE CERTIFICATION WARNING & 4-GROUP PRECHECK REFERENCE */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Red Alert Box: Signature Certification Rule */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-[#FEF2F2] border-2 border-[#FCA5A5] shadow-xs flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#DC2626] text-white uppercase tracking-wider">
                      Quy tắc bắt buộc
                    </span>
                    <span className="text-xs font-bold text-[#991B1B]">• Thủ tục Chứng thực</span>
                  </div>

                  {/* Text-To-Speech Button (2 Chế độ Rõ Ràng: MỞ & TẮT để nghe và tắt khi cần) */}
                  <button
                    type="button"
                    onClick={() =>
                      toggleSpeech(
                        'Quy tắc bắt buộc đối với thủ tục chứng thực: Tuyệt đối không ký tên trước ở nhà! Đối với chứng thực chữ ký và chứng thực văn bản phân chia hoặc từ chối nhận di sản thừa kế theo Nghị định 23 năm 2015: Người dân tuyệt đối không được ký tên sẵn ở nhà vào tờ khai hoặc văn bản. Chữ ký bắt buộc phải được ký trực tiếp trước mặt công chức Tư pháp Hộ tịch tại Bộ phận Một cửa. Nếu đã ký sẵn ở nhà, hồ sơ sẽ bị hủy và bắt buộc phải lập lại bản mới để ký trực tiếp.',
                        'warning-signature'
                      )
                    }
                    className={`group inline-flex items-center gap-1.5 font-bold text-[11px] px-2 py-1 rounded-lg border transition-all duration-150 cursor-pointer shadow-2xs select-none active:scale-95 ${
                      speakingId === 'warning-signature'
                        ? 'bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5] ring-2 ring-[#FECACA]'
                        : 'bg-white hover:bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
                    }`}
                    title={
                      speakingId === 'warning-signature'
                        ? 'Chế độ: ĐANG MỞ ĐỌC. Bấm vào để TẮT ngay'
                        : 'Chế độ: ĐANG TẮT. Bấm vào để MỞ nghe đọc to bằng giọng nói'
                    }
                  >
                    {speakingId === 'warning-signature' ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DC2626]"></span>
                        </span>
                        <VolumeX className="w-3.5 h-3.5 text-[#DC2626]" />
                        <span className="font-extrabold text-[#B91C1C]">Đang đọc...</span>
                        <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-[#DC2626] text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">
                          TẮT
                        </span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-[#991B1B] group-hover:scale-110 transition-transform" />
                        <span>Nghe đọc to</span>
                        <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-[#991B1B] text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">
                          MỞ
                        </span>
                      </>
                    )}
                  </button>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-[#991B1B]">
                  Tuyệt Đối KHÔNG Ký Tên Trước Ở Nhà!
                </h3>
                <p className="text-xs text-[#7F1D1D] leading-relaxed">
                  Đối với <strong>Chứng thực chữ ký</strong> và <strong>Chứng thực văn bản phân chia / từ chối nhận di sản thừa kế</strong> (Nghị định 23/2015/NĐ-CP):
                </p>
                <ul className="text-xs text-[#7F1D1D] space-y-1.5 list-disc pl-4 font-medium">
                  <li>
                    Người dân <strong>tuyệt đối không được ký tên sẵn ở nhà</strong> vào tờ khai hoặc văn bản.
                  </li>
                  <li>
                    Chữ ký bắt buộc phải được <strong>ký trực tiếp trước mặt công chức Tư pháp – Hộ tịch</strong> tại Bộ phận Một cửa.
                  </li>
                  <li>
                    Nếu đã ký sẵn ở nhà, hồ sơ sẽ bị hủy và bắt buộc phải lập lại bản mới để ký trực tiếp.
                  </li>
                </ul>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 border border-[#FECACA] text-xs font-bold text-[#991B1B]">
                Nhóm Đất đai (Mẫu số 09/ĐK): Cần đối chiếu kỹ Số phát hành Sổ đỏ/Sổ hồng, số thửa, tờ bản đồ và tình trạng không tranh chấp trước khi nộp.
              </div>
            </div>

            {/* 4 Core Form Groups Reference Matrix */}
            <div className="lg:col-span-8 p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#00796B]">
                    Danh Mục Điểm Bắt Buộc Tiền Kiểm Tra Tại Một Cửa Cấp Xã
                  </h3>
                  <span className="text-xs text-[#64748B]">
                    Tổng hợp các lỗi khiến bà con thường xuyên bị trả hồ sơ nhiều nhất tại UBND xã/phường
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#0F172A]">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#475569] uppercase">
                    <tr>
                      <th className="p-2.5">Tên Tờ Khai & Căn Cứ</th>
                      <th className="p-2.5">Điểm Bắt Buộc Đối Chiếu</th>
                      <th className="p-2.5">Sai Sót Thường Gặp Nhất</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs">
                    <tr>
                      <td className="p-2.5 font-bold text-[#00796B]">
                        1. Đăng ký khai sinh
                        <span className="block text-[11px] font-normal text-[#64748B]">TT 04/2020/TT-BTP</span>
                      </td>
                      <td className="p-2.5">
                        Khớp từng chữ Họ tên bé, ngày sinh, giới tính với Giấy chứng sinh; 12 số CCCD cha/mẹ.
                      </td>
                      <td className="p-2.5 text-[#DC2626] font-medium">
                        Lệch ngày sinh với Giấy chứng sinh; cha mẹ chưa kết hôn nhưng ghi tên cha vào tờ khai thường.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-[#00796B]">
                        2. Đăng ký kết hôn & Độc thân
                        <span className="block text-[11px] font-normal text-[#64748B]">Luật HN&GĐ 2014</span>
                      </td>
                      <td className="p-2.5">
                        Nam ≥ 20 tuổi, Nữ ≥ 18 tuổi (theo ngày sinh); ghi cụ thể mục đích sử dụng giấy độc thân.
                      </td>
                      <td className="p-2.5 text-[#DC2626] font-medium">
                        Chưa tròn tuổi theo ngày tháng sinh; ghi mục đích độc thân chung chung ("bổ sung hồ sơ").
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-[#00796B]">
                        3. Khai tử & Trích lục hộ tịch
                        <span className="block text-[11px] font-normal text-[#64748B]">Luật Hộ tịch 2014</span>
                      </td>
                      <td className="p-2.5">
                        Khớp Giấy báo tử bản chính (nộp trong 15 ngày); ghi rõ năm đăng ký sự kiện hộ tịch gốc.
                      </td>
                      <td className="p-2.5 text-[#DC2626] font-medium">
                        Thiếu Giấy báo tử bản chính; quên năm đăng ký hộ tịch gốc khiến tra lục sổ giấy kéo dài.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-[#00796B]">
                        4. Trợ cấp BTXH & Mai táng phí
                        <span className="block text-[11px] font-normal text-[#64748B]">Mẫu 01, 02, 03 NĐ 20/2021</span>
                      </td>
                      <td className="p-2.5">
                        Người cao tuổi ≥ 80 tuổi (không lương hưu) hoặc Giấy xác nhận khuyết tật nặng + STK ngân hàng.
                      </td>
                      <td className="p-2.5 text-[#DC2626] font-medium">
                        Chưa đủ mốc 80 tuổi; thiếu số tài khoản ngân hàng chính chủ chi trả an sinh Đề án 06.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Core Interactive Layout: Left Form vs Right Visual Result */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT: Input Form Card (7 Cols) */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E8F0] gap-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-[#00796B]" />
                  <span className="text-sm font-bold text-[#0F172A]">Thông Tin Bản Khai Giấy Cần Rà Soát</span>
                </div>

                {/* Input Method Switcher: PC Upload vs Mobile Camera vs Manual */}
                <div className="inline-flex p-1 bg-[#F1F5F9] rounded-xl border border-[#CBD5E1] self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setInputMode('upload')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      inputMode === 'upload'
                        ? 'bg-[#00796B] text-white shadow-xs'
                        : 'text-[#475569] hover:text-[#00796B]'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Tải ảnh PC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputMode('camera')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      inputMode === 'camera'
                        ? 'bg-[#00796B] text-white shadow-xs'
                        : 'text-[#475569] hover:text-[#00796B]'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputMode('manual')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      inputMode === 'manual'
                        ? 'bg-[#00796B] text-white shadow-xs'
                        : 'text-[#475569] hover:text-[#00796B]'
                    }`}
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Nhập tay</span>
                  </button>
                </div>
              </div>

              {/* METHOD 1: PC IMAGE UPLOAD DROPZONE */}
              {inputMode === 'upload' && (
                <div className="flex flex-col gap-3">
                  {!previewUrl ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3 ${
                        isDragging
                          ? 'border-[#00796B] bg-[#F1F5F9] scale-[1.01]'
                          : 'border-[#CBD5E1] hover:border-[#00796B] bg-[#F8FAFC] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileChange(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />

                      <div className="w-14 h-14 rounded-2xl bg-[#E2E8F0] text-[#00796B] flex items-center justify-center shadow-xs">
                        <Upload className="w-7 h-7 text-[#00796B]" />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-[#0F172A]">
                          Kéo thả ảnh chụp tờ khai hoặc thẻ CCCD vào đây
                        </p>
                        <p className="text-xs text-[#64748B] mt-1">
                          Hoặc <span className="text-[#00796B] font-bold underline">bấm để chọn tệp từ máy tính PC</span> (PNG, JPG, WEBP, PDF tối đa 10MB)
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0F766E]">
                          <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span>Tự động đọc chữ từ ảnh chụp</span>
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadSample();
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#E2E8F0] hover:bg-[#CBD5E1] text-xs font-bold text-[#00796B] transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Dùng ảnh mẫu CT01</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Uploaded Image Preview Card for PC */
                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] flex flex-col gap-3 shadow-xs">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-[#CBD5E1] bg-white shrink-0 shadow-xs">
                            {selectedFile?.type.startsWith('image/') ? (
                              <img src={previewUrl} alt="Bản scan tờ khai" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[#E2E8F0] text-[#00796B]">
                                <FileText className="w-7 h-7" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-[#0F172A] truncate">
                              {selectedFile?.name || 'to_khai_ct01_an_giang.jpg'}
                            </span>
                            <span className="text-xs text-[#64748B]">
                              {selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB' : '2.14 MB'} • Đã tải ảnh lên
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-xs font-semibold text-[#334155] transition cursor-pointer"
                          >
                            Đổi ảnh
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="p-1.5 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] transition cursor-pointer"
                            title="Xóa ảnh"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Hidden input for changing image */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileChange(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />

                      {/* OCR Status Banner */}
                      {isOcrProcessing && (
                        <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center gap-3 text-xs text-[#1E40AF]">
                          <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB] shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-bold">Đang đọc thông tin từ ảnh chụp tờ khai...</span>
                            <span className="text-[11px] text-[#3B82F6]">Đang nhận diện Họ tên, số CCCD, ngày sinh và địa chỉ cư trú</span>
                          </div>
                        </div>
                      )}

                      {ocrSuccess && !isOcrProcessing && (
                        <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex flex-col gap-2 text-xs text-[#065F46]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 font-bold">
                              <Check className="w-4 h-4 text-[#10B981] shrink-0" />
                              <span>Đã đọc thông tin từ ảnh chụp thành công</span>
                            </div>
                          </div>
                          <div className="text-[11px] text-[#047857] flex flex-wrap gap-2 pt-1 border-t border-[#A7F3D0]/50">
                            <span className="font-medium">Đã tự động điền:</span>
                            {fullName && <span className="px-2 py-0.5 bg-white/90 rounded border border-[#A7F3D0] font-semibold text-[#065F46]">Mục 1 (Họ tên): {fullName}</span>}
                            {cccd && <span className="px-2 py-0.5 bg-white/90 rounded border border-[#A7F3D0] font-semibold text-[#065F46]">Mục 4 (ĐDCN): {cccd}</span>}
                            {dob && <span className="px-2 py-0.5 bg-white/90 rounded border border-[#A7F3D0] font-semibold text-[#065F46]">Mục 2 (Sinh): {dob}</span>}
                            {gender && <span className="px-2 py-0.5 bg-white/90 rounded border border-[#A7F3D0] font-semibold text-[#065F46]">Mục 3 (Giới tính): {gender}</span>}
                            {address && <span className="px-2 py-0.5 bg-white/90 rounded border border-[#A7F3D0] font-semibold text-[#065F46] max-w-xs truncate" title={address}>Mục 10 (Nơi cư trú): {address}</span>}
                          </div>
                        </div>
                      )}

                      {ocrError && !isOcrProcessing && (
                        <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#991B1B]">
                          <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold">Không thể tự động đọc thông tin từ tệp này</span>
                            <span className="text-[11px] text-[#B91C1C]">{ocrError}</span>
                            <span className="text-[11px] text-[#7F1D1D] mt-1 font-medium">👉 Quý công dân vui lòng nhập trực tiếp thông tin vào các ô bên dưới để tiếp tục kiểm tra.</span>
                          </div>
                        </div>
                      )}

                      {/* Vault Upload Status Banner (F9) */}
                      {isVaultUploading && (
                        <div className="p-3 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] flex items-center gap-2.5 text-xs text-[#0F766E]">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#0D9488]" />
                          <span>Đang đóng dấu watermark và mã hóa AES-256-GCM lưu trữ an toàn vào MinIO...</span>
                        </div>
                      )}

                      {vaultDocInfo && !isVaultUploading && (
                        <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between gap-2 text-xs text-[#166534]">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
                            <div>
                              <span className="font-bold block">Đã lưu trữ an toàn trong Zero-Trust Vault (MinIO)</span>
                              <span className="text-[11px] text-[#15803D]">
                                Mã tài liệu: <code className="font-mono">{vaultDocInfo.docId}</code> • Mã OTT: <code className="font-mono">{vaultDocInfo.oneTimeToken.slice(0, 16)}...</code>
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] font-mono text-[10px] font-bold">
                            AES-256-GCM
                          </span>
                        </div>
                      )}

                      {vaultUploadError && !isVaultUploading && (
                        <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 text-xs text-[#DC2626]">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{vaultUploadError}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* METHOD 2: CAMERA VIEWFINDER */}
              {inputMode === 'camera' && (
                <div className="relative w-full h-52 rounded-2xl bg-[#131B2E] overflow-hidden flex items-center justify-center border-2 border-dashed border-[#57DFFE]/80 shadow-inner">
                  {/* Moving Laser Scan Line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-[#57DFFE] shadow-[0_0_12px_#57DFFE] animate-laser pointer-events-none" />
                  <div className="flex flex-col items-center gap-2 text-white/90 z-10 p-4 text-center">
                    <Camera className="w-8 h-8 text-[#57DFFE] animate-pulse" />
                    <span className="text-xs font-semibold">Chụp Ảnh Tờ Khai Hoặc Thẻ CCCD</span>
                    <span className="text-[11px] text-white/70 max-w-xs">
                      Hướng camera vuông góc với tờ khai hoặc CCCD để tự động điền thông tin.
                    </span>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="mt-2 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition cursor-pointer"
                    >
                      Chụp ảnh mẫu thử nghiệm
                    </button>
                  </div>
                </div>
              )}

              {/* METHOD 3: MANUAL INPUT HINT */}
              {inputMode === 'manual' && (
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B] flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-[#00796B] shrink-0" />
                  <span>Chế độ nhập tay: Đối chiếu trực tiếp thông tin từ bản khai giấy của bạn vào các ô bên dưới.</span>
                </div>
              )}

              {/* Quick Test Preset Bar for Active Form Type + CCCD QR Scanner */}
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#00796B]">
                  Điền nhanh thông tin mẫu:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCccdQrModal(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#00796B] hover:bg-[#00695C] text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="Mở camera hoặc tải ảnh để quét mã QR trên thẻ CCCD thật"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Quét Mã QR CCCD Thật</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectFormType(selectedFormType, 'ERROR_DEMO')}
                    className="px-3 py-1.5 rounded-lg bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-bold text-xs transition cursor-pointer"
                  >
                    Nạp Mẫu Sai Sót Điển Hình
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectFormType(selectedFormType, 'VALID_DEMO')}
                    className="px-3 py-1.5 rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] font-bold text-xs transition cursor-pointer"
                  >
                    Nạp Mẫu Hợp Lệ Chuẩn
                  </button>
                </div>
              </div>

              {/* F7: CCCD QR Discrepancy Alert Banner */}
              {qrDiscrepancies.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-start gap-2.5 animate-fadeIn">
                  <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <span className="font-bold">Đã đối soát với thẻ CCCD: Phát hiện {qrDiscrepancies.length} trường sai khác</span>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {qrDiscrepancies.map((d) => (
                        <span key={d.fieldKey} className={`px-2 py-0.5 rounded font-mono font-semibold ${d.level === 'CONFLICT' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-amber-100 text-amber-800'}`}>
                          {d.fieldLabel}: {d.typedValue || '(trống)'} vs QR: {d.qrValue}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Input Fields - Dynamic Across CT01, TK-KS, TK-KH, TK-BTXH */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Field 1: Họ, chữ đệm và tên */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#334155]">
                      {selectedFormType === 'TK-KS'
                        ? '1. Họ, chữ đệm và tên của trẻ (Trên Tờ khai Khai sinh):'
                        : selectedFormType === 'TK-KH'
                        ? '1. Họ, chữ đệm và tên người yêu cầu (Nam/Nữ):'
                        : selectedFormType === 'TK-BTXH'
                        ? '1. Họ, chữ đệm và tên người đề nghị hưởng trợ cấp xã hội:'
                        : '1. Họ, chữ đệm và tên khai sinh (Mục 1 Mẫu CT01):'}
                    </label>
                    {ocrSuccess && fullName ? (
                      <span className="text-[10px] text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full font-bold border border-[#A7F3D0] inline-flex items-center gap-1">
                        <Check className="w-3 h-3 text-[#10B981]" /> Đã map đúng Mục 1
                      </span>
                    ) : ocrSuccess && !fullName ? (
                      <span className="text-[10px] text-[#D97706] bg-[#FFFBEB] px-2 py-0.5 rounded-full font-semibold border border-[#FDE68A]">
                        Chưa thấy mục 1 (Họ tên) - vui lòng điền tay
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    placeholder="Ví dụ: NGUYỄN TÚ"
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full h-10 px-3.5 rounded-xl border text-xs md:text-sm text-[#0F172A] focus:outline-none focus:border-[#00796B] focus:bg-white transition-all ${
                      ocrSuccess && fullName ? 'border-[#10B981]/60 bg-[#F0FDF4]/30 font-semibold' : 'bg-[#F8FAFC] border-[#CBD5E1]'
                    }`}
                  />
                </div>

                {/* Field 2: Số định danh cá nhân (12 số CCCD) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#334155]">
                      {selectedFormType === 'TK-KS'
                        ? '2. Số ĐDCN / CCCD 12 số của Mẹ hoặc Cha:'
                        : '2. Số định danh cá nhân (12 chữ số CCCD):'}
                    </label>
                    {ocrSuccess && cccd ? (
                      <span className="text-[10px] text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full font-bold border border-[#A7F3D0] inline-flex items-center gap-1">
                        <Check className="w-3 h-3 text-[#10B981]" /> Đã map ({cccd.length} số)
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    value={cccd}
                    maxLength={12}
                    placeholder="12 chữ số định danh cá nhân"
                    onChange={(e) => setCccd(e.target.value)}
                    className={`w-full h-10 px-3.5 rounded-xl font-mono text-xs md:text-sm font-bold focus:outline-none focus:border-[#00796B] focus:bg-white transition-all tracking-wider ${
                      ocrSuccess && cccd ? 'border-[#10B981]/60 bg-[#F0FDF4]/30 text-[#00796B]' : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#00796B]'
                    }`}
                  />
                </div>

                {/* Field 3: Ngày, tháng, năm sinh */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#334155]">
                      {selectedFormType === 'TK-KS'
                        ? '3. Ngày sinh của trẻ ghi trên Tờ khai:'
                        : selectedFormType === 'TK-KH'
                        ? '3. Ngày sinh trên CCCD (Nam ≥ 20, Nữ ≥ 18):'
                        : selectedFormType === 'TK-BTXH'
                        ? '3. Ngày sinh người cao tuổi (Mốc ≥ 80 tuổi):'
                        : '3. Ngày, tháng, năm sinh (Mục 2 Mẫu CT01):'}
                    </label>
                  </div>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className={`w-full h-10 px-3.5 rounded-xl border text-xs md:text-sm text-[#0F172A] focus:outline-none focus:border-[#00796B] focus:bg-white transition-all ${
                      ocrSuccess && dob ? 'border-[#10B981]/60 bg-[#F0FDF4]/30 font-semibold' : 'bg-[#F8FAFC] border-[#CBD5E1]'
                    }`}
                  />
                </div>

                {/* Field 4: Giới tính */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#334155]">
                      4. Giới tính:
                    </label>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0F172A]">
                      <input
                        type="radio"
                        name="ct01_gender"
                        value="Nam"
                        checked={gender === 'Nam'}
                        onChange={(e) => setGender(e.target.value)}
                        className="text-[#00796B] focus:ring-[#00796B]"
                      />
                      <span>Nam</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0F172A]">
                      <input
                        type="radio"
                        name="ct01_gender"
                        value="Nữ"
                        checked={gender === 'Nữ'}
                        onChange={(e) => setGender(e.target.value)}
                        className="text-[#00796B] focus:ring-[#00796B]"
                      />
                      <span>Nữ</span>
                    </label>
                  </div>
                </div>

                {/* SPECIALIZED FIELDS FOR CT01: Cư trú (Thông tư 66/2023/TT-BCA) */}
                {selectedFormType === 'CT01' && (
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2 text-xs font-extrabold text-[#00796B] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#0F766E]" />
                      <span>Thông tin Tờ khai thay đổi thông tin cư trú (Mẫu CT01 - Thông tư 66/2023/TT-BCA)</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Số điện thoại liên hệ (Mục 5 Mẫu CT01):
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        placeholder="VD: 0918234567"
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Nội dung đề nghị (Mục 10 Mẫu CT01):
                      </label>
                      <select
                        value={declarationScope}
                        onChange={(e) => setDeclarationScope(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A]"
                      >
                        <option value="Đăng ký thường trú">Đăng ký thường trú</option>
                        <option value="Đăng ký tạm trú">Đăng ký tạm trú</option>
                        <option value="Tách hộ">Tách hộ</option>
                        <option value="Điều chỉnh thông tin cư trú">Điều chỉnh thông tin cư trú</option>
                        <option value="Xóa đăng ký thường trú">Xóa đăng ký thường trú</option>
                        <option value="Gia hạn tạm trú">Gia hạn tạm trú</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Họ và tên chủ hộ nơi đến (Mục 11):
                      </label>
                      <input
                        type="text"
                        value={hostName}
                        placeholder="Họ và tên chủ hộ"
                        onChange={(e) => setHostName(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Số CCCD / ĐDCN của chủ hộ (Mục 11):
                      </label>
                      <input
                        type="text"
                        value={hostCccd}
                        maxLength={12}
                        placeholder="12 chữ số CCCD chủ hộ"
                        onChange={(e) => setHostCccd(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-mono font-bold text-[#00796B]"
                      />
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-xs font-bold text-[#334155]">
                        Quan hệ với chủ hộ (Mục 12):
                      </label>
                      <select
                        value={hostRelation}
                        onChange={(e) => setHostRelation(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A]"
                      >
                        <option value="Chủ hộ">Chủ hộ (Bản thân là chủ hộ)</option>
                        <option value="Vợ/Chồng">Vợ / Chồng</option>
                        <option value="Con đẻ">Con đẻ / Con nuôi</option>
                        <option value="Bố/Mẹ">Bố đẻ / Mẹ đẻ</option>
                        <option value="Ông/Bà">Ông / Bà nội/ngoại</option>
                        <option value="Cháu ruột">Cháu ruột</option>
                        <option value="Anh/Chị/Em ruột">Anh / Chị / Em ruột</option>
                        <option value="Thuê / Mượn / Ở nhờ">Thuê / Mượn / Ở nhờ (Bắt buộc chữ ký đồng ý của chủ hộ & chủ sở hữu chỗ ở)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* SPECIALIZED FIELDS FOR PRIORITY 1: TK-KS (Birth Registration + Hospital Cert Cross-check) */}
                {selectedFormType === 'TK-KS' && (
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2 text-xs font-extrabold text-[#00796B] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#0F766E]" />
                      <span>Đối chiếu chéo Giấy chứng sinh bệnh viện & Tình trạng hôn nhân cha mẹ (Thông tư 04/2020/TT-BTP)</span>
                    </div>

                    {/* Smart Checklist: Cha mẹ chưa kết hôn */}
                    {parentsMarried === 'NO' && (
                      <div className="sm:col-span-2 p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col gap-1.5 text-xs text-amber-900 shadow-2xs">
                        <div className="font-bold flex items-center gap-1.5 text-amber-800 text-sm">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Thủ tục ghép bắt buộc: Đăng ký nhận cha, mẹ, con (TTHC-HT-06)</span>
                        </div>
                        <p className="text-xs leading-relaxed text-amber-800">
                          Theo Điều 15 Thông tư 04/2020/TT-BTP, do cha mẹ <strong>chưa đăng ký kết hôn</strong> nhưng muốn ghi tên cha vào Giấy khai sinh của con, công dân phải thực hiện đồng thời thủ tục <strong>Khai sinh kết hợp Nhận cha, mẹ, con</strong>.
                        </p>
                        <div className="text-xs font-semibold text-amber-900 mt-1">
                          Hồ sơ cần nộp kèm tại Bộ phận Một cửa:
                          <ul className="list-disc pl-5 mt-1 space-y-0.5 text-amber-800 font-normal">
                            <li>Tờ khai đăng ký nhận cha, mẹ, con theo mẫu quy định.</li>
                            <li>Chứng cứ chứng minh quan hệ cha - con (Kết luận giám định ADN hoặc văn bản cam đoan/chứng cứ thân tộc có xác nhận của người làm chứng).</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Ngày sinh ghi trên Giấy chứng sinh (Bệnh viện cấp):
                      </label>
                      <input
                        type="date"
                        value={hospitalBirthDate}
                        onChange={(e) => setHospitalBirthDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Tình trạng hôn nhân của Cha & Mẹ:
                      </label>
                      <select
                        value={parentsMarried}
                        onChange={(e) => setParentsMarried(e.target.value as 'YES' | 'NO')}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A]"
                      >
                        <option value="YES">Đã có Giấy chứng nhận đăng ký kết hôn</option>
                        <option value="NO">Chưa đăng ký kết hôn (Cần kết hợp Nhận cha, mẹ, con)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Dân tộc của trẻ:
                      </label>
                      <input
                        type="text"
                        value={childEthnicity}
                        onChange={(e) => setChildEthnicity(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Quốc tịch của trẻ:
                      </label>
                      <input
                        type="text"
                        value={childNationality}
                        onChange={(e) => setChildNationality(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-xs font-bold text-[#334155]">
                        Nơi sinh của trẻ (Tên cơ sở y tế / Bệnh viện):
                      </label>
                      <input
                        type="text"
                        value={childBirthPlace}
                        onChange={(e) => setChildBirthPlace(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Số Giấy chứng sinh:
                      </label>
                      <input
                        type="text"
                        value={birthCertNumber}
                        onChange={(e) => setBirthCertNumber(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Ngày cấp Giấy chứng sinh:
                      </label>
                      <input
                        type="date"
                        value={birthCertIssueDate}
                        onChange={(e) => setBirthCertIssueDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Họ tên Mẹ ghi trên Tờ khai khai sinh:
                      </label>
                      <input
                        type="text"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Họ tên Sản phụ ghi trên Giấy chứng sinh:
                      </label>
                      <input
                        type="text"
                        value={hospitalMotherName}
                        onChange={(e) => setHospitalMotherName(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-xs font-bold text-[#334155]">
                        Nơi cư trú của người mẹ:
                      </label>
                      <input
                        type="text"
                        value={motherResidence}
                        onChange={(e) => setMotherResidence(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Họ tên Cha ghi trên Tờ khai:
                      </label>
                      <input
                        type="text"
                        value={fatherName}
                        placeholder="Để trống nếu chưa làm thủ tục nhận cha con"
                        onChange={(e) => setFatherName(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Nơi cư trú của người cha:
                      </label>
                      <input
                        type="text"
                        value={fatherResidence}
                        onChange={(e) => setFatherResidence(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>
                  </div>
                )}

                {/* SPECIALIZED FIELDS FOR PRIORITY 2: TK-KH (Marriage & Single Status Certificate) */}
                {selectedFormType === 'TK-KH' && (
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2 text-xs font-extrabold text-[#00796B] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#0F766E]" />
                      <span>Rà soát biểu mẫu Hôn nhân & Tình trạng hôn nhân (Thông tư 04/2020/TT-BTP)</span>
                    </div>

                    {/* Toggle Switch giữa 2 chế độ */}
                    <div className="sm:col-span-2 flex items-center gap-2 p-1 bg-slate-200/80 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setMarriageMode('MARRIAGE_REGISTRATION')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                          marriageMode === 'MARRIAGE_REGISTRATION'
                            ? 'bg-[#00796B] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Đăng Ký Kết Hôn
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarriageMode('MARITAL_STATUS_CONFIRMATION')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                          marriageMode === 'MARITAL_STATUS_CONFIRMATION'
                            ? 'bg-[#00796B] text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Cấp Giấy Xác Nhận Tình Trạng Hôn Nhân
                      </button>
                    </div>

                    {marriageMode === 'MARRIAGE_REGISTRATION' ? (
                      <>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-[#334155]">
                            Họ tên bên kết hôn thứ hai (Nam/Nữ):
                          </label>
                          <input
                            type="text"
                            value={partnerName}
                            onChange={(e) => setPartnerName(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-[#334155]">
                            Số CCCD bên kết hôn thứ hai (12 số):
                          </label>
                          <input
                            type="text"
                            value={partnerCccd}
                            maxLength={12}
                            placeholder="12 chữ số CCCD"
                            onChange={(e) => setPartnerCccd(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-mono font-bold text-[#00796B]"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-[#334155]">
                            Ngày sinh & Giới tính bên thứ hai:
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={partnerDob}
                              onChange={(e) => setPartnerDob(e.target.value)}
                              className="w-full h-9 px-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                            />
                            <select
                              value={partnerGender}
                              onChange={(e) => setPartnerGender(e.target.value as 'Nam' | 'Nữ')}
                              className="h-9 px-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#00796B]"
                            >
                              <option value="Nam">Nam</option>
                              <option value="Nữ">Nữ</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-[#334155]">
                            Dân tộc hai bên (Người nộp / Bên thứ hai):
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={applicantEthnicity}
                              onChange={(e) => setApplicantEthnicity(e.target.value)}
                              placeholder="Dân tộc bạn"
                              className="w-1/2 h-9 px-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                            />
                            <input
                              type="text"
                              value={partnerEthnicity}
                              onChange={(e) => setPartnerEthnicity(e.target.value)}
                              placeholder="Dân tộc phối ngẫu"
                              className="w-1/2 h-9 px-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 sm:col-span-2">
                          <label className="text-xs font-bold text-[#334155]">
                            Nơi cư trú bên kết hôn thứ hai:
                          </label>
                          <input
                            type="text"
                            value={partnerAddress}
                            onChange={(e) => setPartnerAddress(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <label className="text-xs font-bold text-[#334155]">
                          Mục đích sử dụng Giấy xác nhận tình trạng hôn nhân (Bắt buộc ghi cụ thể theo TT 04/2020/TT-BTP):
                        </label>
                        <input
                          type="text"
                          value={maritalCertPurpose}
                          placeholder="VD: Để đăng ký kết hôn với anh Phạm Văn Minh tại UBND..."
                          onChange={(e) => setMaritalCertPurpose(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-xs font-bold text-[#334155]">
                        Tình trạng hôn nhân trước khi đăng ký:
                      </label>
                      <select
                        value={previousMaritalStatus}
                        onChange={(e) => setPreviousMaritalStatus(e.target.value as 'SINGLE' | 'DIVORCED' | 'WIDOWED')}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A]"
                      >
                        <option value="SINGLE">Chưa từng kết hôn lần nào</option>
                        <option value="DIVORCED">Đã ly hôn (Bắt buộc có Bản án/Quyết định ly hôn của Tòa án)</option>
                        <option value="WIDOWED">Vợ / Chồng đã mất (Bắt buộc có Giấy chứng tử/Trích lục khai tử)</option>
                      </select>
                    </div>

                    {/* Smart Checklist: Đã từng ly hôn */}
                    {previousMaritalStatus === 'DIVORCED' && (
                      <div className="sm:col-span-2 p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col gap-2 text-xs text-amber-900 shadow-2xs">
                        <div className="font-bold flex items-center gap-1.5 text-amber-800">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Yêu cầu văn bản Tòa án đối với người đã ly hôn:</span>
                        </div>
                        <p className="text-xs text-amber-800">
                          Bắt buộc xuất trình bản chính hoặc nộp bản sao trích lục Bản án/Quyết định ly hôn đã có hiệu lực pháp luật của Tòa án nhân dân kèm theo hồ sơ.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          <div>
                            <label className="text-[11px] font-bold text-amber-900">Số Bản án / Quyết định ly hôn:</label>
                            <input
                              type="text"
                              value={divorceJudgmentNumber}
                              placeholder="VD: 45/2023/HNGĐ-ST"
                              onChange={(e) => setDivorceJudgmentNumber(e.target.value)}
                              className="w-full h-8 px-2.5 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-amber-900">Ngày ban hành Bản án/Quyết định:</label>
                            <input
                              type="date"
                              value={divorceJudgmentDate}
                              onChange={(e) => setDivorceJudgmentDate(e.target.value)}
                              className="w-full h-8 px-2.5 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 mt-0.5"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Smart Checklist: Vợ/chồng đã mất */}
                    {previousMaritalStatus === 'WIDOWED' && (
                      <div className="sm:col-span-2 p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col gap-2 text-xs text-amber-900 shadow-2xs">
                        <div className="font-bold flex items-center gap-1.5 text-amber-800">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Yêu cầu giấy tờ đối với người có vợ/chồng đã mất:</span>
                        </div>
                        <p className="text-xs text-amber-800">
                          Bắt buộc nộp bản sao Giấy chứng tử hoặc Trích lục khai tử của vợ/chồng cũ đã mất.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          <div>
                            <label className="text-[11px] font-bold text-amber-900">Số Giấy chứng tử / Trích lục khai tử:</label>
                            <input
                              type="text"
                              value={deathCertNumber}
                              placeholder="VD: 12/TLKT-2024"
                              onChange={(e) => setDeathCertNumber(e.target.value)}
                              className="w-full h-8 px-2.5 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-amber-900">Ngày cấp Giấy chứng tử:</label>
                            <input
                              type="date"
                              value={deathCertDate}
                              onChange={(e) => setDeathCertDate(e.target.value)}
                              className="w-full h-8 px-2.5 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 mt-0.5"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SPECIALIZED FIELDS FOR PRIORITY 3: TK-BTXH (Nghị định 20/2021/NĐ-CP & Luật BHXH 2024) */}
                {selectedFormType === 'TK-BTXH' && (
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2 text-xs font-extrabold text-[#00796B] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#0F766E]" />
                      <span>Kiểm tra điều kiện Mẫu số 01 Nghị định 20/2021/NĐ-CP, Luật BHXH 2024 & Tài khoản an sinh Đề án 06</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Diện xét trợ cấp hưu trí xã hội (Luật BHXH 2024 & NĐ 20/2021):
                      </label>
                      <select
                        value={householdStatus}
                        onChange={(e) =>
                          setHouseholdStatus(e.target.value as 'NORMAL' | 'POOR' | 'NEAR_POOR')
                        }
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A]"
                      >
                        <option value="NORMAL">Hộ gia đình bình thường (Mốc tuổi hưu trí xã hội: ≥ 75 tuổi)</option>
                        <option value="POOR">Thuộc Hộ nghèo (Mốc tuổi hưởng trợ cấp: ≥ 70 tuổi)</option>
                        <option value="NEAR_POOR">Thuộc Hộ cận nghèo (Mốc tuổi hưởng trợ cấp: ≥ 70 tuổi)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#334155]">
                        Mức độ khuyết tật (nếu có Giấy xác nhận của Hội đồng cấp xã):
                      </label>
                      <select
                        value={disabilityLevel}
                        onChange={(e) =>
                          setDisabilityLevel(e.target.value as 'NONE' | 'SEVERE' | 'EXTREMELY_SEVERE')
                        }
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A]"
                      >
                        <option value="NONE">Không khuyết tật (Xét theo mốc Người cao tuổi)</option>
                        <option value="SEVERE">Khuyết tật nặng (Có Giấy xác nhận)</option>
                        <option value="EXTREMELY_SEVERE">Khuyết tật đặc biệt nặng (Có Giấy xác nhận)</option>
                      </select>
                    </div>

                    {/* Sổ hộ nghèo */}
                    {(householdStatus === 'POOR' || householdStatus === 'NEAR_POOR') && (
                      <div className="sm:col-span-2 flex flex-col gap-1 p-3 rounded-xl bg-amber-50 border border-amber-200">
                        <label className="text-xs font-bold text-amber-900">
                          Số sổ hộ nghèo / Giấy chứng nhận hộ nghèo:
                        </label>
                        <input
                          type="text"
                          value={poorHouseholdBookNumber}
                          placeholder="VD: HN-2026/08912 do UBND cấp xã cấp"
                          onChange={(e) => setPoorHouseholdBookNumber(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl border border-amber-300 bg-white text-xs text-slate-800 font-mono"
                        />
                      </div>
                    )}

                    {/* Giấy xác nhận khuyết tật */}
                    {(disabilityLevel === 'SEVERE' || disabilityLevel === 'EXTREMELY_SEVERE') && (
                      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-teal-50 border border-teal-200">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-teal-900">Số Giấy xác nhận khuyết tật:</label>
                          <input
                            type="text"
                            value={disabilityCertNumber}
                            placeholder="VD: GKT-2025/001"
                            onChange={(e) => setDisabilityCertNumber(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-teal-300 bg-white text-xs text-slate-800 font-mono"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-teal-900">Ngày cấp Giấy xác nhận:</label>
                          <input
                            type="date"
                            value={disabilityCertIssueDate}
                            onChange={(e) => setDisabilityCertIssueDate(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-teal-300 bg-white text-xs text-slate-800"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-teal-900">Cơ quan cấp (Chủ tịch UBND):</label>
                          <input
                            type="text"
                            value={disabilityCertIssuer}
                            onChange={(e) => setDisabilityCertIssuer(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-teal-300 bg-white text-xs text-slate-800"
                          />
                        </div>
                      </div>
                    )}

                    {/* Thông tin người giám hộ */}
                    <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="sm:col-span-2 text-xs font-bold text-slate-800">
                        Thông tin người giám hộ / người chăm sóc (nếu có hoặc đối tượng khuyết tật đặc biệt nặng):
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Họ và tên người giám hộ:</label>
                        <input
                          type="text"
                          value={guardianName}
                          placeholder="Họ và tên người giám hộ"
                          onChange={(e) => setGuardianName(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Số CCCD người giám hộ (12 số):</label>
                        <input
                          type="text"
                          value={guardianCccd}
                          maxLength={12}
                          placeholder="12 chữ số CCCD"
                          onChange={(e) => setGuardianCccd(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800 mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Quan hệ với người hưởng:</label>
                        <input
                          type="text"
                          value={guardianRelation}
                          placeholder="VD: Con đẻ, Bố mẹ, Vợ chồng"
                          onChange={(e) => setGuardianRelation(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Số điện thoại liên hệ:</label>
                        <input
                          type="tel"
                          value={guardianPhone}
                          placeholder="VD: 0987654321"
                          onChange={(e) => setGuardianPhone(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 mt-0.5"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-xs font-bold text-[#334155]">
                        Số tài khoản & Ngân hàng nhận trợ cấp an sinh không dùng tiền mặt (Đề án 06):
                      </label>
                      <input
                        type="text"
                        value={bankAccount}
                        placeholder="VD: 70110000889912 - VietinBank An Giang"
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>
                  </div>
                )}

                {/* Field 5: Nơi đề nghị cư trú / Quê quán / Địa chỉ thường trú */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#334155]">
                      {selectedFormType === 'TK-KS'
                        ? '5. Quê quán của trẻ & Nơi thường trú của Cha/Mẹ:'
                        : selectedFormType === 'TK-KH'
                        ? '5. Nơi thường trú / tạm trú của một trong hai bên nộp hồ sơ:'
                        : selectedFormType === 'TK-BTXH'
                        ? '5. Địa chỉ thường trú của người hưởng trợ cấp xã hội:'
                        : '5. Nơi đề nghị đăng ký thường trú / tạm trú (Mục 10 - Nội dung đề nghị):'}
                    </label>
                  </div>
                  <input
                    type="text"
                    value={address}
                    placeholder="Ví dụ: 32/3 Ích, Khu phố 12, Phường..., TP. Hồ Chí Minh"
                    onChange={(e) => setAddress(e.target.value)}
                    className={`w-full h-10 px-3.5 rounded-xl border text-xs md:text-sm text-[#0F172A] focus:outline-none focus:border-[#00796B] focus:bg-white transition-all ${
                      ocrSuccess && address ? 'border-[#10B981]/60 bg-[#F0FDF4]/30 font-semibold' : 'bg-[#F8FAFC] border-[#CBD5E1]'
                    }`}
                  />
                </div>

                {/* Official Legal Specification Notice */}
                <div className="sm:col-span-2 p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-start gap-2.5 text-xs text-[#166534]">
                  <FileText className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold">
                      {selectedFormType === 'TK-KS'
                        ? 'Quy chuẩn Thông tư 04/2020/TT-BTP (Đăng ký khai sinh):'
                        : selectedFormType === 'TK-KH'
                        ? 'Quy chuẩn Luật Hôn nhân & Gia đình 2014 & Thông tư 04/2020/TT-BTP:'
                        : selectedFormType === 'TK-BTXH'
                        ? 'Quy chuẩn Mẫu số 01, 02, 03 Nghị định 20/2021/NĐ-CP:'
                        : 'Quy chuẩn Mẫu CT01 (Thông tư Bộ Công an):'}
                    </span>
                    <span className="text-[11px] text-[#15803D]">
                      {selectedFormType === 'TK-KS'
                        ? 'Họ tên, ngày tháng năm sinh, giới tính của trẻ và họ tên mẹ phải khớp từng chữ với Giấy chứng sinh bản chính do bệnh viện cấp. Nếu cha mẹ chưa đăng ký kết hôn mà ghi tên cha thì phải làm thủ tục kết hợp Khai sinh + Nhận cha, mẹ, con.'
                        : selectedFormType === 'TK-KH'
                        ? 'Nam phải từ đủ 20 tuổi, Nữ từ đủ 18 tuổi tính theo ngày tháng năm sinh. Giấy xác nhận tình trạng hôn nhân chỉ có giá trị 06 tháng và bắt buộc ghi rõ mục đích sử dụng cụ thể.'
                        : selectedFormType === 'TK-BTXH'
                        ? 'Người cao tuổi không có lương hưu phải từ đủ 80 tuổi trở lên hoặc có Giấy xác nhận khuyết tật nặng/đặc biệt nặng; kèm số tài khoản ngân hàng chính chủ để nhận chi trả an sinh Đề án 06.'
                        : 'Tờ khai CT01 hoàn toàn không có trường "Ngày cấp CCCD" (chỉ có ngày làm đơn ở cuối tờ khai). Hệ thống chỉ quét đúng các mục cần nhập (Mục 1, 2, 3, 4, 10).'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Trigger Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-[#64748B]">
                  Đối chiếu theo đúng quy định pháp luật hành chính hiện hành
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="px-4 py-2.5 bg-white hover:bg-[#F1F5F9] text-[#00796B] border border-[#CBD5E1] rounded-xl font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer"
                    title="Xem trước và tải về file Word (.docx) hoặc PDF chuẩn Nghị định 30/2020/NĐ-CP"
                  >
                    <FileDown className="w-4 h-4 text-[#00796B]" />
                    <span>Xem & Tải Mẫu A4</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrecheck}
                    disabled={formLoading}
                    className="px-6 py-2.5 bg-[#00796B] hover:bg-[#00695C] text-white rounded-xl font-semibold text-xs shadow-xs flex items-center gap-2 active:scale-95 transition-all duration-200 cursor-pointer"
                  >
                    {formLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#80CBC4]" />
                        <span>Đang Kiểm Tra...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#80CBC4]" />
                        <span>Kiểm Tra Tờ Khai</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: Real-Time Diagnostic Result Card + Citizen REA Status Tracker (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {precheckResult ? (
                <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-4 animate-scaleUp">
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-2xl flex items-start gap-3 ${
                      precheckResult.overallValid
                        ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]'
                        : 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'
                    }`}
                  >
                    {precheckResult.overallValid ? (
                      <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5 text-[#059669]" />
                    ) : (
                      <XCircle className="w-6 h-6 shrink-0 mt-0.5 text-[#DC2626]" />
                    )}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-bold text-sm">
                          {precheckResult.overallValid
                            ? 'Tờ Khai Hợp Lệ - Đã Gửi Sơ Duyệt Lên Quầy Một Cửa'
                            : 'Phát Hiện Lỗi Cần Chỉnh Sửa Trước Khi Nộp Quầy'}
                        </h3>

                        {/* Text-To-Speech Button (2 Chế độ Rõ Ràng: MỞ & TẮT để nghe và tắt khi cần) */}
                        <button
                          type="button"
                          onClick={() => {
                            const errs = precheckResult.fieldValidations
                              .filter((f) => !f.valid)
                              .map((f) => `${f.fieldName}: ${f.errorMessage || 'chưa hợp lệ'}`)
                              .join('. ');
                            const summaryText = `Kết quả rà soát: ${
                              precheckResult.overallValid
                                ? 'Tờ khai hợp lệ, đã gửi sơ duyệt lên quầy một cửa.'
                                : `Phát hiện lỗi cần chỉnh sửa trước khi nộp quầy. Chi tiết: ${errs}`
                            }`;
                            toggleSpeech(summaryText, 'precheck-diagnostic');
                          }}
                          className={`group inline-flex items-center gap-1.5 font-bold text-xs px-2.5 py-1 rounded-xl border transition-all duration-150 cursor-pointer shadow-2xs select-none active:scale-95 ${
                            speakingId === 'precheck-diagnostic'
                              ? 'bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5] ring-2 ring-[#FECACA]'
                              : precheckResult.overallValid
                              ? 'bg-white hover:bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                              : 'bg-white hover:bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                          }`}
                          title={
                            speakingId === 'precheck-diagnostic'
                              ? 'Chế độ: ĐANG MỞ ĐỌC. Bấm vào để TẮT ngay'
                              : 'Chế độ: ĐANG TẮT. Bấm vào để MỞ nghe đọc to kết quả rà soát'
                          }
                        >
                          {speakingId === 'precheck-diagnostic' ? (
                            <>
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DC2626]"></span>
                              </span>
                              <VolumeX className="w-3.5 h-3.5 text-[#DC2626]" />
                              <span className="font-extrabold text-[#B91C1C]">Đang đọc...</span>
                              <span className="ml-0.5 px-2 py-0.5 rounded-md bg-[#DC2626] text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                TẮT
                              </span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                              <span>Nghe đọc to</span>
                              <span className="ml-0.5 px-2 py-0.5 rounded-md bg-[#00796B] text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                MỞ
                              </span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-xs mt-1 leading-relaxed">
                        {precheckResult.overallValid
                          ? 'Tất cả các trường thông tin CCCD, độ tuổi và điều kiện pháp lý đều khớp quy định. Phiếu sơ duyệt đã được đồng bộ sang Bàn Cán Bộ.'
                          : 'Bà con vui lòng chỉnh sửa lại các mục báo đỏ bên dưới trên tờ khai giấy gốc trước khi mang đến Bộ phận Một cửa.'}
                      </p>
                    </div>
                  </div>

                  {/* Field Breakdown Diagnostic Checklist */}
                  <div className="flex flex-col divide-y divide-[#E2E8F0] text-xs">
                    {precheckResult.fieldValidations.map((field, idx) => (
                      <div key={idx} className="py-2.5 flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          {field.valid ? (
                            <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-semibold text-[#0F172A]">{field.fieldName}</span>
                            {field.errorMessage && (
                              <p className="text-xs text-[#DC2626] mt-0.5 font-medium leading-tight">
                                {field.errorMessage}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 ${
                            field.valid
                              ? 'bg-[#CCFBF1] text-[#0F766E]'
                              : 'bg-[#FEE2E2] text-[#991B1B]'
                          }`}
                        >
                          {field.valid ? 'Hợp Lệ' : 'Sai Lệch'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Warnings if any */}
                  {precheckResult.warnings.length > 0 && (
                    <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex flex-col gap-1">
                      <strong className="text-[#B45309]">Lưu ý pháp lý bắt buộc:</strong>
                      {precheckResult.warnings.map((w, idx) => (
                        <span key={idx} className="text-xs leading-tight">• {w}</span>
                      ))}
                    </div>
                  )}

                  {/* Footer Meta & Quick Officer Desk Link */}
                  <div className="pt-2 border-t border-[#E2E8F0] flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-[#64748B]">
                      <span>Mã phiếu kiểm tra: <strong className="font-mono text-[#00796B]">{precheckResult.submissionId}</strong></span>
                      <span>UBND {currentWard.name}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPrintModal(true)}
                      className="w-full py-2 px-3 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <FileDown className="w-3.5 h-3.5 text-[#80CBC4]" />
                      <span>Xem & Tải Mẫu A4 (Word/PDF)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/officer/ward/${currentWard.code}?tab=FORMS`)}
                      className="w-full py-2 px-3 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#00796B] border border-[#CBD5E1] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <span>Xem Hồ Sơ Vừa Kiểm Tra Trên Bàn Cán Bộ ({currentWard.name})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div className="p-8 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col items-center justify-center text-center text-[#64748B] gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#00796B]">
                    <ShieldCheck className="w-7 h-7 text-[#0F766E]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#0F172A]">Sẵn Sàng Rà Soát 4 Mẫu Tờ Khai</h3>
                    <p className="text-xs text-[#64748B] mt-1 max-w-xs leading-relaxed">
                      Điền thông tin bản khai giấy bên trái và bấm nút "Kiểm Tra Tờ Khai" để đối chiếu quy định pháp luật và gửi sơ duyệt lên Một cửa.
                    </p>
                  </div>
                </div>
              )}

              {/* REA CLOSED-LOOP TRACKER: Citizen sees Officer's approval/supplement feedback */}
              {myDossiers.length > 0 && (
                <div className="p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <span className="text-xs font-extrabold text-[#00796B] flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-[#0F766E]" />
                      <span>Trạng Thái Hồ Sơ Sơ Duyệt Gần Đây ({myDossiers.length})</span>
                    </span>
                    <span className="text-[11px] text-[#64748B]">Đồng bộ từ Bàn Cán Bộ</span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                    {myDossiers.slice(0, 4).map((d) => (
                      <div key={d.id} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#0F172A] truncate">{d.citizenName} • {d.formType}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              d.status === 'VALID'
                                ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                                : d.status === 'HAS_ERRORS'
                                ? 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'
                                : 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
                            }`}
                          >
                            {d.status === 'VALID'
                              ? d.reviewedBy
                                ? 'Cán bộ đã duyệt sơ bộ'
                                : 'Hợp lệ • Chờ nộp quầy'
                              : d.status === 'HAS_ERRORS'
                              ? 'Cần chỉnh sửa / Bổ sung'
                              : 'Đang chờ sơ duyệt'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#64748B] truncate">{d.procedure}</span>
                        {d.officerFeedback && (
                          <div className="mt-1 p-2 rounded-lg bg-white border border-[#CBD5E1] text-[11px] text-[#00796B] font-medium">
                            <strong>Phản hồi Cán bộ ({d.reviewedBy || 'Một cửa'}):</strong> {d.officerFeedback}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INCIDENT REPORTING & TWO-STAGE TRIAGE */}
      {/* ========================================================================= */}
      {activeTab === 'incident' && (
        <section className="flex flex-col gap-5 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Incident Input Form (7 Cols) */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-5">
              {/* STEP 1: GPS SCAN FIRST & MAP TO LOCATION BOX */}
              <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs sm:text-sm font-extrabold text-[#00796B] flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-[#BA1A1A]" />
                    <span>1. Vị Trí Sự Cố Hiện Trường</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGetLocation(false)}
                    disabled={gpsLoading}
                    className="px-3 py-1.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{gpsLoading ? 'Đang định vị...' : 'Lấy Lại Vị Trí GPS'}</span>
                  </button>
                </div>

                {/* Quick Cross-Ward GPS Simulation Bar for Testing */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-[#64748B] mr-1">
                    Chọn nhanh địa điểm:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateCrossWardGps('AG_P_CHAUDOC', 'Số 18 Đường Phan Văn Vàng')
                    }
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F1F5F9] text-[#00796B] border border-[#CBD5E1] text-[11px] font-bold transition cursor-pointer"
                  >
                    🚗 Phường Châu Đốc
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateCrossWardGps('AG_P_LONGXUYEN', 'Số 05 Đường Lê Triệu Kiết')
                    }
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F1F5F9] text-[#00796B] border border-[#CBD5E1] text-[11px] font-bold transition cursor-pointer"
                  >
                    🚗 Phường Long Xuyên
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateCrossWardGps('AG_X_ANPHU', 'Đường Thoại Ngọc Hầu')
                    }
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F1F5F9] text-[#00796B] border border-[#CBD5E1] text-[11px] font-bold transition cursor-pointer"
                  >
                    🏠 Xã An Phú
                  </button>
                </div>

                {/* Live GPS Status Banner */}
                {gpsScanBanner && (
                  <div className="p-2.5 rounded-xl bg-[#ECFDF5] border border-[#86EFAC] text-[11px] text-[#166534] font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                    <span>{gpsScanBanner}</span>
                  </div>
                )}

                {/* Editable Location Input Box */}
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center justify-between text-[11px] text-[#475569]">
                    <span className="font-semibold">
                      Địa chỉ sự cố (Tự động điền từ định vị — có thể sửa tay):
                    </span>
                    <span className="text-[#0F766E] font-bold">
                      Đã định vị tự động
                    </span>
                  </div>
                  <input
                    type="text"
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    placeholder="Nhập địa chỉ cụ thể kèm tên Xã/Phường (VD: Đường Phan Văn Vàng, Phường Châu Đốc)..."
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-[#CBD5E1] text-xs md:text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#00796B] shadow-2xs"
                  />
                </div>

                {/* Dynamic Jurisdiction Routing Indicator based on Location Box */}
                <div
                  className={`p-3 rounded-xl border text-xs flex flex-col gap-1 transition-all ${
                    resolvedJurisdiction.ward.code !== currentWard.code
                      ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                      : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-[#DC2626] animate-pulse shrink-0" />
                      <span>
                        Đơn vị tiếp nhận:{' '}
                        <strong className="underline text-[#00796B]">
                          UBND {resolvedJurisdiction.ward.name}
                        </strong>
                      </span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-current/20">
                      {resolvedJurisdiction.matchedBy === 'TEXT_BOX'
                        ? 'Theo địa chỉ đã nhập'
                        : 'Theo định vị bản đồ'}
                    </span>
                  </div>
                  {resolvedJurisdiction.ward.code !== currentWard.code ? (
                    <p className="text-[11px] leading-relaxed mt-0.5">
                      🔄 <strong>Báo sự cố khác địa bàn:</strong> Vị trí sự cố thuộc{' '}
                      <strong>{resolvedJurisdiction.ward.name}</strong>. Khi bấm gửi, tin báo sẽ được chuyển thẳng về{' '}
                      <strong>UBND {resolvedJurisdiction.ward.name}</strong> (Trực ban:{' '}
                      {resolvedJurisdiction.ward.phoneNumber}) để xử lý kịp thời.
                    </p>
                  ) : (
                    <p className="text-[11px] opacity-90">
                      Tin báo sẽ được chuyển trực tiếp đến bộ phận trực ban UBND {resolvedJurisdiction.ward.name} (Hotline: {resolvedJurisdiction.ward.phoneNumber}).
                    </p>
                  )}
                </div>

                {/* Interactive Mini-Map */}
                <div className="flex items-center justify-between gap-2 text-xs text-[#64748B] px-1 pt-1">
                  <span className="text-[11px] text-[#0F766E] font-semibold">
                    💡 Bấm hoặc kéo ghim đỏ trên bản đồ để chọn chính xác vị trí sự cố
                  </span>
                </div>

                <div className="w-full h-44 sm:h-52 rounded-2xl overflow-hidden border border-[#DAE2FD] relative z-1 shadow-inner bg-[#E5E7EB]">
                  <div ref={incidentMapContainerRef} className="w-full h-full" />
                </div>
              </div>

              {/* STEP 2: MANDATORY PHONE NUMBER FOR SUPERVISOR CONTACT */}
              <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-[#FEF2F2]/60 border border-[#FECACA]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs sm:text-sm font-extrabold text-[#991B1B] flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-[#DC2626]" />
                    <span>
                      Bước 2: Số Điện Thoại Liên Hệ Khẩn Cấp <span className="text-[#DC2626]">* (Bắt buộc)</span>
                    </span>
                  </label>
                  <span className="text-[11px] font-semibold text-[#7F1D1D]">
                    Để người giám sát địa bàn liên hệ xác minh hiện trường
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-7 relative">
                    <input
                      ref={phoneInputRef}
                      type="tel"
                      value={reporterPhone}
                      onChange={(e) => {
                        setReporterPhone(e.target.value);
                        if (phoneError) setPhoneError(null);
                      }}
                      placeholder="Nhập SĐT của bạn (VD: 0918234567)..."
                      className={`w-full h-10 px-3.5 rounded-xl bg-white border-2 text-xs md:text-sm font-mono font-bold text-[#131B2E] focus:outline-none ${
                        phoneError
                          ? 'border-[#DC2626] ring-2 ring-[#FECACA]'
                          : isValidPhone(reporterPhone)
                          ? 'border-[#16A34A]'
                          : 'border-[#FCA5A5] focus:border-[#00236F]'
                      }`}
                    />
                  </div>

                  {/* Urgency Level Selector */}
                  <div className="sm:col-span-5 flex items-center gap-1.5">
                    {([
                      { id: 'HIGH', label: 'Tin Khẩn' },
                      { id: 'MEDIUM', label: 'Cần Sớm' },
                      { id: 'LOW', label: 'Thường' },
                    ] as const).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUrgency(u.id)}
                        className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          urgency === u.id
                            ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                            : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                {phoneError ? (
                  <p className="text-xs font-bold text-[#DC2626] flex items-center gap-1.5 mt-0.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{phoneError}</span>
                  </p>
                ) : isValidPhone(reporterPhone) ? (
                  <p className="text-xs font-semibold text-[#166534] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span>
                      SĐT hợp lệ ({reporterPhone.trim()}) — Cán bộ giám sát tại UBND {resolvedJurisdiction.ward.name} sẽ liên hệ qua số này.
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-[#7F1D1D]">
                    Vui lòng nhập số điện thoại di động 10 số để cán bộ trực ban liên hệ khi xuống hiện trường.
                  </p>
                )}
              </div>

              {/* STEP 3: CATEGORY & CONTENT BOX (MAPPED FROM GPS, EDITABLE BY HAND) */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#334155]">
                    Bước 3: Chọn lĩnh vực &amp; kiểm tra Ô nội dung mô tả (Đã tự động map vị trí từ GPS):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'ROAD_DAMAGE', label: 'Hạ Tầng Đường' },
                      { id: 'FLOODING', label: 'Ngập Nước' },
                      { id: 'ENVIRONMENT', label: 'Môi Trường' },
                      { id: 'LIGHTING', label: 'Chiếu Sáng' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition active:scale-95 cursor-pointer ${
                          category === cat.id
                            ? 'bg-[#00796B] text-white border-[#00796B] shadow-xs'
                            : 'bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description Content Box */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#334155]">
                      Ô nội dung chi tiết sự cố (Vị trí quét được đã map vào đây, bà con có thể chỉnh tay):
                    </label>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs md:text-sm text-[#0F172A] focus:outline-none focus:border-[#00796B] focus:bg-white resize-none transition-all"
                    placeholder="Mô tả mức độ nguy hiểm, kích thước, ảnh hưởng đến người đi đường..."
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-[#64748B] font-medium">
                  Nơi nhận hồ sơ: <strong className="text-[#00796B]">UBND {resolvedJurisdiction.ward.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleReport}
                  disabled={reportLoading}
                  className="w-full sm:w-auto px-6 py-3 bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.98] text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {reportLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang Định Tuyến Về {resolvedJurisdiction.ward.name}...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-white" />
                      <span>Gửi Báo Cáo Về UBND {resolvedJurisdiction.ward.name}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Incident Triage Live Result + Citizen Incident Tracker (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {reportResult ? (
                <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-4 animate-scaleUp">
                  <div
                    className={`p-4 rounded-2xl flex items-start gap-3 ${
                      reportResult.assignedAction === 'MERGED_INTO_EXISTING_CLUSTER'
                        ? 'bg-[#E0F7FA] border border-[#80DEEA] text-[#006064]'
                        : 'bg-[#ECFDF5] border border-[#86EFAC] text-[#166534]'
                    }`}
                  >
                    <Layers className="w-6 h-6 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-sm">
                        {reportResult.assignedAction === 'MERGED_INTO_EXISTING_CLUSTER'
                          ? 'Đã Ghi Nhận & Gom Chung Cùng Điểm Sự Cố'
                          : `Đã Chuyển Báo Cáo Về UBND ${reportResult.targetWardName || resolvedJurisdiction.ward.name}`}
                      </h3>
                      <p className="text-xs mt-1 leading-relaxed">{reportResult.message}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                      <span className="text-[#64748B]">Đơn vị tiếp nhận:</span>
                      <strong className="text-[#00796B] font-extrabold">
                        UBND {reportResult.targetWardName || resolvedJurisdiction.ward.name}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">SĐT người báo:</span>
                      <strong className="font-mono text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded border border-[#FECACA]">
                        {reportResult.reporterPhone || reporterPhone}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Vị trí hiện trường:</span>
                      <span className="font-semibold text-[#0F172A] text-right max-w-[220px] truncate">
                        {reportResult.addressText || addressText}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Mã hồ sơ sự cố:</span>
                      <strong className="font-mono text-[#00796B]">{reportResult.clusterCode}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B]">Số phản ánh tại điểm này:</span>
                      <span className="font-bold text-[#0F766E]">{reportResult.totalReportsInCluster} phản ánh</span>
                    </div>
                  </div>

                  {/* Quick button to inspect on the Target Ward's Officer Dashboard */}
                  <button
                    type="button"
                    onClick={() => {
                      const targetW =
                        AN_GIANG_WARDS.find((w) => w.code === reportResult.targetWardCode) ||
                        resolvedJurisdiction.ward;
                      setWard(targetW);
                      navigate(`/officer/ward/${targetW.code}?tab=INCIDENTS`);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <span>Xem Trên Bàn Trực Ban UBND {reportResult.targetWardName || resolvedJurisdiction.ward.name}</span>
                    <ArrowRight className="w-4 h-4 text-[#80CBC4]" />
                  </button>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#DC2626] shrink-0">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#0F172A]">
                        Hướng Dẫn Báo Sự Cố Hiện Trường
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Tự động chuyển về đúng UBND xã/phường nơi xảy ra sự cố
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#334155] space-y-2 leading-relaxed">
                    <p>
                      <strong>1. Định vị tự động:</strong> Hệ thống tự động lấy vị trí hiện tại và điền sẵn địa chỉ vào ô vị trí &amp; nội dung.
                    </p>
                    <p>
                      <strong>2. Chỉnh sửa linh hoạt:</strong> Nếu định vị lệch, bà con có thể gõ sửa lại địa chỉ hoặc kéo ghim trên bản đồ.
                    </p>
                    <p>
                      <strong>3. Gửi đúng xã/phường phụ trách:</strong> Dù bà con đang đi qua xã/phường khác, hệ thống vẫn tự động gửi báo cáo về đúng <strong>UBND xã/phường nơi có sự cố</strong> kèm SĐT để cán bộ liên hệ xác minh.
                    </p>
                  </div>
                </div>
              )}

              {/* REA CLOSED-LOOP INCIDENT TRACKER: Citizen sees Officer's dispatch/resolution status */}
              {myIncidents.length > 0 && (
                <div className="p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <span className="text-xs font-extrabold text-[#00796B] flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-[#0F766E]" />
                      <span>Tiến Độ Xử Lý Sự Cố Đã Báo ({myIncidents.length})</span>
                    </span>
                    <span className="text-[11px] text-[#64748B]">Cập nhật từ Trực ban</span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                    {myIncidents.slice(0, 4).map((inc) => (
                      <div key={inc.id} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#0F172A] truncate">{inc.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              inc.status === 'RESOLVED'
                                ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                                : inc.status === 'IN_PROGRESS'
                                ? 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]'
                                : 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
                            }`}
                          >
                            {inc.status === 'RESOLVED'
                              ? 'Đã khắc phục xong'
                              : inc.status === 'IN_PROGRESS'
                              ? 'Đang cử cán bộ xử lý'
                              : 'Chờ tiếp nhận'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#64748B] truncate">
                          UBND {inc.wardName} • {inc.address}
                        </span>
                        {inc.officerNote && (
                          <div className="mt-1 p-2 rounded-lg bg-white border border-[#CBD5E1] text-[11px] text-[#00796B] font-medium">
                            <strong>Trực ban cập nhật:</strong> {inc.officerNote}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MODAL: XEM TRƯỚC & IN TỜ KHAI CHUẨN A4 (NGHỊ ĐỊNH 30/2020/NĐ-CP)          */}
      {/* ========================================================================= */}
      <A4DocumentModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        formType={selectedFormType}
        procedureCode={
          selectedFormType === 'CT01'
            ? 'TTHC-CR-01'
            : selectedFormType === 'TK-KS'
            ? 'TTHC-HT-01'
            : selectedFormType === 'TK-KH'
            ? 'TTHC-HT-02'
            : 'TTHC-BT-01'
        }
        marriageMode={marriageMode}
        procedureTitle={
          selectedFormType === 'CT01'
            ? 'Tờ khai thay đổi thông tin cư trú (Mẫu CT01)'
            : selectedFormType === 'TK-KS'
            ? 'Tờ khai đăng ký khai sinh (Thông tư 04/2020/TT-BTP)'
            : selectedFormType === 'TK-KH'
            ? (marriageMode === 'MARRIAGE_REGISTRATION' ? 'Tờ khai đăng ký kết hôn' : 'Tờ khai cấp Giấy xác nhận tình trạng hôn nhân')
            : 'Tờ khai thông tin đề nghị trợ cấp xã hội (Nghị định 20/2021/NĐ-CP)'
        }
        legalBasis={
          selectedFormType === 'CT01'
            ? 'Theo Thông tư số 66/2023/TT-BCA của Bộ Công an'
            : selectedFormType === 'TK-KS'
            ? 'Theo Thông tư số 04/2020/TT-BTP của Bộ Tư pháp'
            : selectedFormType === 'TK-KH'
            ? 'Theo Luật Hôn nhân và Gia đình 2014 & Thông tư 04/2020/TT-BTP'
            : 'Theo Nghị định số 20/2021/NĐ-CP & Luật BHXH 2024'
        }
        initialData={{
          fullName,
          gender,
          dob,
          idNumber: cccd,
          phone: phoneNumber,
          address,
          // CT01
          hostName,
          hostCccd,
          hostRelation,
          declarationScope,
          // TK-KS
          childName: selectedFormType === 'TK-KS' ? fullName : undefined,
          birthDate: selectedFormType === 'TK-KS' ? dob : undefined,
          birthPlace: childBirthPlace,
          childEthnicity,
          childNationality,
          birthCertNumber,
          birthCertIssueDate,
          fatherName,
          fatherDob,
          fatherResidence,
          motherName,
          motherDob,
          motherResidence,
          // TK-KH
          spouseName: partnerName,
          spouseDob: partnerDob,
          spouseGender: partnerGender,
          spouseIdNumber: partnerCccd,
          spouseAddress: partnerAddress,
          applicantEthnicity,
          spouseEthnicity: partnerEthnicity,
          applicantNationality,
          spouseNationality: partnerNationality,
          maritalCertPurpose,
          divorceJudgmentNumber,
          divorceJudgmentDate,
          deathCertNumber,
          deathCertDate,
          // TK-BTXH
          householdStatus,
          poorHouseholdBookNumber,
          disabilityLevel,
          disabilityCertNumber,
          disabilityCertIssueDate,
          disabilityCertIssuer,
          bankAccount,
          guardianName,
          guardianCccd,
          guardianRelation,
          guardianPhone,
        }}
      />

      {/* F7: Real CCCD QR Scanner Modal (WebRTC & Image Upload) */}
      <CccdQrScannerModal
        isOpen={showCccdQrModal}
        onClose={() => setShowCccdQrModal(false)}
        onScanSuccess={handleCccdQrSuccess}
        currentFormData={{
          cccd,
          fullName,
          dob,
          gender,
          address,
          issueDate,
        }}
      />
      </div>
    </main>
  );
};

export default FormAndIssueReporting;
