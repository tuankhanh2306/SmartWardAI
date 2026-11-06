import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import {
  precheckForm,
  reportIssue,
  type FormPrecheckResponse,
  type IssueReportResponse
} from '../api/client';
import { extractFormWithVision, normalizeDateToYMD, type ExtractedFormFieldsResult } from '../services/geminiClient';
import { useWard } from '../context/WardContext';
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
  ArrowRight
} from 'lucide-react';


export const FormAndIssueReporting: React.FC = () => {
  const { currentWard, setWard } = useWard();
  const location = useLocation();
  const navigate = useNavigate();

  // Active Tab initialized from URL hash or default to 'form'
  const [activeTab, setActiveTab] = useState<'form' | 'incident'>(
    location.hash === '#incident' ? 'incident' : 'form'
  );

  useEffect(() => {
    if (location.hash === '#incident') {
      setActiveTab('incident');
    } else if (location.hash === '#form') {
      setActiveTab('form');
    }
  }, [location.hash]);


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

  // Specialized cross-check fields for Priority 1 (TK-KS: Birth Registration + Hospital Birth Cert)
  const [hospitalBirthDate, setHospitalBirthDate] = useState('2026-10-15');
  const [motherName, setMotherName] = useState('LÊ THỊ MỸ LINH');
  const [hospitalMotherName, setHospitalMotherName] = useState('LÊ THỊ MỸ LINH');
  const [fatherName, setFatherName] = useState('TRẦN VĂN HÙNG');
  const [parentsMarried, setParentsMarried] = useState<'YES' | 'NO'>('NO');

  // Specialized fields for Priority 2 (TK-KH: Marriage & Single Status Certificate)
  const [partnerName, setPartnerName] = useState('PHẠM VĂN MINH');
  const [partnerDob, setPartnerDob] = useState('2004-03-10');
  const [partnerGender, setPartnerGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [maritalCertPurpose, setMaritalCertPurpose] = useState('Bổ sung hồ sơ');
  const [previousMaritalStatus, setPreviousMaritalStatus] = useState<'SINGLE' | 'DIVORCED'>('SINGLE');

  // Specialized fields for Priority 3 (TK-BTXH: Social Protection Decree 20/2021/NĐ-CP)
  const [disabilityLevel, setDisabilityLevel] = useState<'NONE' | 'SEVERE' | 'EXTREMELY_SEVERE'>('NONE');
  const [bankAccount, setBankAccount] = useState('');

  const [formLoading, setFormLoading] = useState(false);
  const [precheckResult, setPrecheckResult] = useState<FormPrecheckResponse | null>(null);

  // Input Method for PC / Mobile: 'upload' (PC Desktop) vs 'camera' (Mobile/Webcam) vs 'manual'
  const [inputMode, setInputMode] = useState<'upload' | 'camera' | 'manual'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrDetails, setOcrDetails] = useState<ExtractedFormFieldsResult | null>(null);
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
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(8);
  const [gpsScanBanner, setGpsScanBanner] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState<IssueReportResponse | null>(null);
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
          `Đã quét tọa độ GPS chuẩn (bán kính hẹp R=25m, sai số ±${Math.round(accuracyMeters)}m) và tự động điền vị trí tại ${nearest.ward.name} vào ô nội dung.`
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
            `Đã quét tọa độ GPS chuẩn (bán kính R=25m, sai số ±${Math.round(accuracyMeters)}m) và cập nhật vị trí "${resolvedAddr}" vào ô nội dung.`
          );
          return;
        }
      } catch {
        // Fallback already applied
      }

      setGpsScanBanner(
        `Đã quét vị trí GPS chuẩn (bán kính R=25m, sai số ±${Math.round(accuracyMeters)}m) tại ${nearest.ward.name} và cập nhật vào ô nội dung.`
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

    const map = L.map(incidentMapContainerRef.current, {
      zoomControl: false,
    }).setView([latitude, longitude], 17);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

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

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
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
        setAddress('32/3 Ích, Khu phố 12, Phường Tp Hồ Chí Minh');
      } else {
        setFullName('NGUYỄN MINH TUẤN KHANH');
        setCccd('089205023490');
        setDob('2005-06-23');
        setGender('Nam');
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
        setDob('1949-08-20'); // 77 tuổi (< 80 tuổi và không khuyết tật)
        setCccd('089049001122');
        setDisabilityLevel('NONE');
        setBankAccount(''); // Thiếu tài khoản nhận trợ cấp Đề án 06
        setAddress(`Khóm Bình Long, ${currentWard.name}, Tỉnh An Giang`);
      } else {
        setFullName('LÊ VĂN BẢY');
        setGender('Nam');
        setDob('1943-04-10'); // 83 tuổi (>= 80 tuổi)
        setCccd('089043001122');
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
    } catch {
      alert('Không thể kết nối đến máy chủ backend để kiểm tra tờ khai.');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle File Upload from PC / Desktop
  const handleFileChange = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Vui lòng chọn tệp hình ảnh (PNG, JPG, JPEG, WEBP) hoặc PDF tờ khai.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Kích thước tệp vượt quá 10MB. Vui lòng chọn tệp nhẹ hơn.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    runVisionOcr(file);
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
    } catch {
      alert('Không thể gửi phản ánh tới hệ thống phân luồng.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 md:px-8 py-8 gap-8">
      {/* Top Segmented Navigation Tab Pill with Spring Transitions */}
      <div className="flex justify-center">
        <div className="p-1 bg-[#F2F3FF] rounded-2xl border border-[#EAEDFF] shadow-inner flex items-center gap-1">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 active:scale-95 ${
              activeTab === 'form'
                ? 'bg-[#00236F] text-white shadow-md shadow-[#00236F]/20'
                : 'text-[#444651] hover:text-[#00236F] hover:bg-[#EAEDFF]'
            }`}
          >
            <FileCheck2 className={`w-4 h-4 ${activeTab === 'form' ? 'text-[#57DFFE]' : 'text-[#757682]'}`} />
            <span>Tiền Kiểm Định Đa Tờ Khai (CT01, Khai Sinh, Kết Hôn, BTXH)</span>
          </button>

          <button
            id="incident"
            onClick={() => setActiveTab('incident')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 active:scale-95 ${
              activeTab === 'incident'
                ? 'bg-[#00236F] text-white shadow-md shadow-[#00236F]/20'
                : 'text-[#444651] hover:text-[#00236F] hover:bg-[#EAEDFF]'
            }`}
          >
            <AlertTriangle className={`w-4 h-4 ${activeTab === 'incident' ? 'text-[#57DFFE]' : 'text-[#757682]'}`} />
            <span>Báo Sự Cố Hiện Trường (GPS & AI Triage)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FORM PRECHECK ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'form' && (
        <section className="flex flex-col gap-6 animate-fadeIn">
          {/* Administrative Protocol Alert Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#EAEDFF]/80 via-white to-[#F2F3FF] border border-[#DAE2FD] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#00236F] text-white flex items-center justify-center shrink-0 shadow-sm">
                <PenTool className="w-5 h-5 text-[#57DFFE]" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base md:text-lg font-bold text-[#00236F]">
                    Hệ Thống Tiền Kiểm Định 4 Nhóm Tờ Khai Hành Chính Cốt Lõi • {currentWard.name}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCE1FF] text-[#00164E]">
                    Chống Trả Hồ Sơ Tại Một Cửa
                  </span>
                </div>
                <p className="text-xs text-[#444651] mt-1 leading-relaxed max-w-3xl">
                  <strong>Quy chuẩn bắt buộc:</strong> Hệ thống AI rà soát 12 số CCCD, đối chiếu chéo Tờ khai khai sinh với Giấy chứng sinh, kiểm tra mốc tuổi kết hôn hợp pháp (Nam ≥ 20, Nữ ≥ 18) và điều kiện trợ cấp bảo trợ xã hội.
                  <span className="text-[#BA1A1A] font-semibold"> Hệ thống chỉ nhắc nhở người dân sửa trực tiếp trên tờ khai giấy trước khi nộp</span>, bảo đảm tính pháp lý theo Nghị định 13/2023/NĐ-CP.
                </p>
              </div>
            </div>

            {/* Stepper Status Pill */}
            <div className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-xl bg-white border border-[#DAE2FD] text-[11px] font-semibold text-[#00687A]">
              <span className="w-2 h-2 rounded-full bg-[#00687A] animate-pulse" />
              <span>Đề Án 06/CP Verified</span>
            </div>
          </div>

          {/* 4-Form Priority Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                id: 'CT01' as const,
                badge: 'Bộ Công an',
                title: '1. Tờ Khai Cư Trú (Mẫu CT01)',
                desc: 'Rà soát 12 số ĐDCN, mã tỉnh, thế kỷ/giới tính & địa chỉ thường trú/tạm trú.',
              },
              {
                id: 'TK-KS' as const,
                badge: 'Ưu tiên 1 • Hộ tịch',
                title: '2. Đăng Ký Khai Sinh + GCS',
                desc: 'Đối chiếu chéo Tờ khai vs Giấy chứng sinh & kiểm tra tình trạng kết hôn cha mẹ.',
              },
              {
                id: 'TK-KH' as const,
                badge: 'Ưu tiên 2 • Tư pháp',
                title: '3. Kết Hôn & Xác Nhận Độc Thân',
                desc: 'Kiểm tra độ tuổi hợp pháp (Nam ≥ 20, Nữ ≥ 18) & mục đích xác nhận độc thân.',
              },
              {
                id: 'TK-BTXH' as const,
                badge: 'Ưu tiên 3 • An sinh',
                title: '4. Trợ Cấp Bảo Trợ Xã Hội',
                desc: 'Mẫu 01 NĐ 20/2021: Kiểm tra mốc tuổi ≥ 80, mức độ khuyết tật & tài khoản ngân hàng.',
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
                      ? 'bg-[#00236F] text-white border-[#00236F] shadow-md'
                      : 'bg-white hover:bg-[#F2F3FF] text-[#131B2E] border-[#EAEDFF]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        active ? 'bg-[#57DFFE] text-[#00236F]' : 'bg-[#EAEDFF] text-[#00236F]'
                      }`}
                    >
                      {item.badge}
                    </span>
                    {active && <CheckCircle2 className="w-4 h-4 text-[#57DFFE]" />}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-extrabold">{item.title}</div>
                    <p className={`text-[11px] mt-1 leading-snug ${active ? 'text-white/85' : 'text-[#757682]'}`}>
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Core Interactive Layout: Left Form vs Right Visual Result */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT: Input Form Card (7 Cols) */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-[#EAEDFF] shadow-sm flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EAEDFF] gap-3">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-[#00236F]" />
                  <span className="text-sm font-bold text-[#131B2E]">Thông Tin Bản Khai Giấy Cần Rà Soát</span>
                </div>

                {/* Input Method Switcher: PC Upload vs Mobile Camera vs Manual */}
                <div className="inline-flex p-1 bg-[#F2F3FF] rounded-xl border border-[#DAE2FD] self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setInputMode('upload')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      inputMode === 'upload'
                        ? 'bg-[#00236F] text-white shadow-xs'
                        : 'text-[#444651] hover:text-[#00236F]'
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
                        ? 'bg-[#00236F] text-white shadow-xs'
                        : 'text-[#444651] hover:text-[#00236F]'
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
                        ? 'bg-[#00236F] text-white shadow-xs'
                        : 'text-[#444651] hover:text-[#00236F]'
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
                          ? 'border-[#00236F] bg-[#EAEDFF]/60 scale-[1.01]'
                          : 'border-[#DAE2FD] hover:border-[#00236F] bg-[#FAF8FF] hover:bg-[#F2F3FF]'
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

                      <div className="w-14 h-14 rounded-2xl bg-[#EAEDFF] text-[#00236F] flex items-center justify-center shadow-xs">
                        <Upload className="w-7 h-7 text-[#00236F]" />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-[#131B2E]">
                          Kéo thả ảnh chụp tờ khai CT01 hoặc CCCD vào đây
                        </p>
                        <p className="text-xs text-[#757682] mt-1">
                          Hoặc <span className="text-[#00236F] font-bold underline">bấm để chọn tệp từ máy tính PC</span> (PNG, JPG, WEBP, PDF tối đa 10MB)
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#DAE2FD] text-[11px] font-semibold text-[#00687A]">
                          <Sparkles className="w-3 h-3 text-[#00687A]" />
                          <span>AI Vision OCR trích xuất tự động</span>
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadSample();
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#EAEDFF] hover:bg-[#DAE2FD] text-[11px] font-bold text-[#00236F] transition cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Dùng ảnh mẫu CT01 (Test PC)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Uploaded Image Preview Card for PC */
                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#EAEDFF] flex flex-col gap-3 shadow-xs">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-[#CBD5E1] bg-white shrink-0 shadow-xs">
                            {selectedFile?.type.startsWith('image/') ? (
                              <img src={previewUrl} alt="Bản scan tờ khai" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[#EAEDFF] text-[#00236F]">
                                <FileText className="w-7 h-7" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-[#131B2E] truncate">
                              {selectedFile?.name || 'to_khai_ct01_an_giang.jpg'}
                            </span>
                            <span className="text-[11px] text-[#757682]">
                              {selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB' : '2.14 MB'} • Đã nạp vào hệ thống
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
                            <span className="font-bold">Hệ thống AI đang quét văn bản thực tế từ ảnh tờ khai...</span>
                            <span className="text-[11px] text-[#3B82F6]">Đang nhận diện Họ tên, số CCCD, ngày sinh và địa chỉ cư trú</span>
                          </div>
                        </div>
                      )}

                      {ocrSuccess && !isOcrProcessing && (
                        <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex flex-col gap-2 text-xs text-[#065F46]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 font-bold">
                              <Check className="w-4 h-4 text-[#10B981] shrink-0" />
                              <span>{ocrDetails?.detectedDocType || 'Tài liệu hành chính'}: {ocrDetails?.message || 'Trích xuất thành công từ ảnh!'}</span>
                            </div>
                            {ocrConfidence !== null && (
                              <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white text-[#065F46] border border-[#A7F3D0] shadow-2xs">
                                Độ tin cậy OCR: {ocrConfidence}%
                              </span>
                            )}
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
                            <span className="font-bold">Không thể tự động trích xuất thông tin từ tệp này</span>
                            <span className="text-[11px] text-[#B91C1C]">{ocrError}</span>
                            <span className="text-[11px] text-[#7F1D1D] mt-1 font-medium">👉 Quý công dân vui lòng nhập trực tiếp thông tin vào các ô bên dưới để tiếp tục sơ duyệt.</span>
                          </div>
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
                    <span className="text-xs font-semibold">Khung Nhận Diện OCR Qua Camera / Webcam</span>
                    <span className="text-[11px] text-white/70 max-w-xs">
                      Hướng camera vuông góc với tờ khai CT01 hoặc CCCD để hệ thống tự động đọc thông tin.
                    </span>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="mt-2 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition cursor-pointer"
                    >
                      Mô phỏng chụp mẫu thành công
                    </button>
                  </div>
                </div>
              )}

              {/* METHOD 3: MANUAL INPUT HINT */}
              {inputMode === 'manual' && (
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B] flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-[#00236F] shrink-0" />
                  <span>Chế độ nhập tay: Đối chiếu trực tiếp thông tin từ bản khai giấy của bạn vào các ô bên dưới.</span>
                </div>
              )}

              {/* Quick Test Preset Bar for Active Form Type */}
              <div className="p-3 rounded-xl bg-[#F2F3FF] border border-[#DAE2FD] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#00236F]">
                  Bộ dữ liệu mẫu kiểm thử ({selectedFormType}):
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectFormType(selectedFormType, 'ERROR_DEMO')}
                    className="px-3 py-1.5 rounded-lg bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-bold text-[11px] transition cursor-pointer"
                  >
                    ⚠️ Nạp Mẫu Sai Sót Điển Hình
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectFormType(selectedFormType, 'VALID_DEMO')}
                    className="px-3 py-1.5 rounded-lg bg-[#EBFDF3] hover:bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] font-bold text-[11px] transition cursor-pointer"
                  >
                    ✅ Nạp Mẫu Hợp Lệ Chuẩn
                  </button>
                </div>
              </div>

              {/* Form Input Fields - Dynamic Across CT01, TK-KS, TK-KH, TK-BTXH */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Field 1: Họ, chữ đệm và tên */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#444651]">
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
                    className={`w-full h-10 px-3.5 rounded-xl border text-xs md:text-sm text-[#131B2E] focus:outline-none focus:border-[#00236F] focus:bg-white transition-all ${
                      ocrSuccess && fullName ? 'border-[#10B981]/60 bg-[#F0FDF4]/30 font-semibold' : 'bg-[#FAF8FF] border-[#EAEDFF]'
                    }`}
                  />
                </div>

                {/* Field 2: Số định danh cá nhân (12 số CCCD) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#444651]">
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
                    className={`w-full h-10 px-3.5 rounded-xl font-mono text-xs md:text-sm font-bold focus:outline-none focus:border-[#00236F] focus:bg-white transition-all tracking-wider ${
                      ocrSuccess && cccd ? 'border-[#10B981]/60 bg-[#F0FDF4]/30 text-[#00236F]' : 'bg-[#FAF8FF] border-[#EAEDFF] text-[#00236F]'
                    }`}
                  />
                </div>

                {/* Field 3: Ngày, tháng, năm sinh */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#444651]">
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
                    className={`w-full h-10 px-3.5 rounded-xl border text-xs md:text-sm text-[#131B2E] focus:outline-none focus:border-[#00236F] focus:bg-white transition-all ${
                      ocrSuccess && dob ? 'border-[#10B981]/60 bg-[#F0FDF4]/30 font-semibold' : 'bg-[#FAF8FF] border-[#EAEDFF]'
                    }`}
                  />
                </div>

                {/* Field 4: Giới tính */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#444651]">
                      4. Giới tính:
                    </label>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#131B2E]">
                      <input
                        type="radio"
                        name="ct01_gender"
                        value="Nam"
                        checked={gender === 'Nam'}
                        onChange={(e) => setGender(e.target.value)}
                        className="text-[#00236F] focus:ring-[#00236F]"
                      />
                      <span>Nam</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#131B2E]">
                      <input
                        type="radio"
                        name="ct01_gender"
                        value="Nữ"
                        checked={gender === 'Nữ'}
                        onChange={(e) => setGender(e.target.value)}
                        className="text-[#00236F] focus:ring-[#00236F]"
                      />
                      <span>Nữ</span>
                    </label>
                  </div>
                </div>

                {/* SPECIALIZED FIELDS FOR PRIORITY 1: TK-KS (Birth Registration + Hospital Cert Cross-check) */}
                {selectedFormType === 'TK-KS' && (
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-[#F2F3FF]/80 border border-[#DAE2FD] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2 text-xs font-extrabold text-[#00236F] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#00687A]" />
                      <span>Đối chiếu chéo Giấy chứng sinh bệnh viện & Tình trạng hôn nhân cha mẹ (Thông tư 04/2020/TT-BTP)</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-[#444651]">
                        Ngày sinh ghi trên Giấy chứng sinh (Bệnh viện cấp):
                      </label>
                      <input
                        type="date"
                        value={hospitalBirthDate}
                        onChange={(e) => setHospitalBirthDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#C5C5D3] bg-white text-xs text-[#131B2E]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-[#444651]">
                        Tình trạng hôn nhân của Cha & Mẹ:
                      </label>
                      <select
                        value={parentsMarried}
                        onChange={(e) => setParentsMarried(e.target.value as 'YES' | 'NO')}
                        className="w-full h-9 px-3 rounded-xl border border-[#C5C5D3] bg-white text-xs font-semibold text-[#131B2E]"
                      >
                        <option value="YES">Đã có Giấy chứng nhận đăng ký kết hôn</option>
                        <option value="NO">Chưa đăng ký kết hôn (Cần kết hợp Nhận cha, mẹ, con)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-[#444651]">
                        Họ tên Mẹ ghi trên Tờ khai khai sinh:
                      </label>
                      <input
                        type="text"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#C5C5D3] bg-white text-xs text-[#131B2E]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-[#444651]">
                        Họ tên Sản phụ ghi trên Giấy chứng sinh:
                      </label>
                      <input
                        type="text"
                        value={hospitalMotherName}
                        onChange={(e) => setHospitalMotherName(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#C5C5D3] bg-white text-xs text-[#131B2E]"
                      />
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[11px] font-bold text-[#444651]">
                        Họ tên Cha ghi trên Tờ khai (Lưu ý: Nếu chưa kết hôn mà ghi tên cha sẽ bị trả hồ sơ thường):
                      </label>
                      <input
                        type="text"
                        value={fatherName}
                        placeholder="Để trống nếu khai sinh theo mẹ và chưa làm thủ tục nhận cha con"
                        onChange={(e) => setFatherName(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#C5C5D3] bg-white text-xs text-[#131B2E]"
                      />
                    </div>
                  </div>
                )}

                {/* SPECIALIZED FIELDS FOR PRIORITY 2: TK-KH (Marriage & Single Status Certificate) */}
                {selectedFormType === 'TK-KH' && (
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-[#F2F3FF]/80 border border-[#DAE2FD] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2 text-xs font-extrabold text-[#00236F] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#00687A]" />
                      <span>Kiểm tra độ tuổi kết hôn (Nam ≥ 20, Nữ ≥ 18) & Mục đích xác nhận tình trạng hôn nhân</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-[#444651]">
                        Họ tên bên kết hôn thứ hai (Nam/Nữ):
                      </label>
                      <input
                        type="text"
                        value={partnerName}
                        onChange={(e) => setPartnerName(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#C5C5D3] bg-white text-xs text-[#131B2E]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-[#444651]">
                        Ngày sinh & Giới tính bên thứ hai:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={partnerDob}
                          onChange={(e) => setPartnerDob(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-xl border border-[#C5C5D3] bg-white text-xs text-[#131B2E]"
                        />
                        <select
                          value={partnerGender}
                          onChange={(e) => setPartnerGender(e.target.value as 'Nam' | 'Nữ')}
                          className="h-9 px-2.5 rounded-xl border border-[#C5C5D3] bg-white text-xs font-bold text-[#00236F]"
                        >
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[11px] font-bold text-[#444651]">
                        Mục đích sử dụng Giấy xác nhận tình trạng hôn nhân (Bắt buộc ghi cụ thể theo TT 04/2020/TT-BTP):
                      </label>
                      <input
                        type="text"
                        value={maritalCertPurpose}
                        placeholder="VD: Để đăng ký kết hôn với anh Phạm Văn Minh tại UBND..."
                        onChange={(e) => setMaritalCertPurpose(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#C5C5D3] bg-white text-xs text-[#131B2E]"
                      />
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[11px] font-bold text-[#444651]">
                        Tình trạng hôn nhân trước khi đăng ký:
                      </label>
                      <select
                        value={previousMaritalStatus}
                        onChange={(e) => setPreviousMaritalStatus(e.target.value as 'SINGLE' | 'DIVORCED')}
                        className="w-full h-9 px-3 rounded-xl border border-[#C5C5D3] bg-white text-xs font-semibold text-[#131B2E]"
                      >
                        <option value="SINGLE">Chưa từng kết hôn lần nào</option>
                        <option value="DIVORCED">Đã ly hôn (Cần ghi rõ số Bản án/Quyết định của Tòa án)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* SPECIALIZED FIELDS FOR PRIORITY 3: TK-BTXH (Social Protection Decree 20/2021/NĐ-CP) */}
                {selectedFormType === 'TK-BTXH' && (
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-[#F2F3FF]/80 border border-[#DAE2FD] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2 text-xs font-extrabold text-[#00236F] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#00687A]" />
                      <span>Kiểm tra điều kiện Mẫu số 01 Nghị định 20/2021/NĐ-CP & Tài khoản an sinh Đề án 06</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-[#444651]">
                        Mức độ khuyết tật (theo Giấy xác nhận của Hội đồng cấp xã):
                      </label>
                      <select
                        value={disabilityLevel}
                        onChange={(e) =>
                          setDisabilityLevel(e.target.value as 'NONE' | 'SEVERE' | 'EXTREMELY_SEVERE')
                        }
                        className="w-full h-9 px-3 rounded-xl border border-[#C5C5D3] bg-white text-xs font-semibold text-[#131B2E]"
                      >
                        <option value="NONE">Không khuyết tật (Xét theo mốc Người cao tuổi ≥ 80 tuổi)</option>
                        <option value="SEVERE">Khuyết tật nặng (Có Giấy xác nhận)</option>
                        <option value="EXTREMELY_SEVERE">Khuyết tật đặc biệt nặng (Có Giấy xác nhận)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-[#444651]">
                        Số tài khoản & Ngân hàng nhận trợ cấp (Đề án 06):
                      </label>
                      <input
                        type="text"
                        value={bankAccount}
                        placeholder="VD: 70110000889912 - VietinBank An Giang"
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#C5C5D3] bg-white text-xs text-[#131B2E]"
                      />
                    </div>
                  </div>
                )}

                {/* Field 5: Nơi đề nghị cư trú / Quê quán / Địa chỉ thường trú */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#444651]">
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
                    className={`w-full h-10 px-3.5 rounded-xl border text-xs md:text-sm text-[#131B2E] focus:outline-none focus:border-[#00236F] focus:bg-white transition-all ${
                      ocrSuccess && address ? 'border-[#10B981]/60 bg-[#F0FDF4]/30 font-semibold' : 'bg-[#FAF8FF] border-[#EAEDFF]'
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
              <div className="pt-2 flex items-center justify-between gap-3">
                <span className="text-[11px] text-[#757682]">
                  Động cơ Java Rule Engine chạy tức thì (&lt; 15ms)
                </span>

                <button
                  type="button"
                  onClick={handlePrecheck}
                  disabled={formLoading}
                  className="px-6 py-2.5 bg-[#00236F] hover:bg-[#1E3A8A] text-white rounded-xl font-semibold text-xs shadow-md shadow-[#00236F]/20 flex items-center gap-2 active:scale-95 transition-all duration-200"
                >
                  {formLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#57DFFE]" />
                      <span>Đang Kiểm Tra...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#57DFFE]" />
                      <span>Kiểm Tra Biểu Mẫu Bằng AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT: Real-Time Diagnostic Result Card (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {precheckResult ? (
                <div className="p-6 rounded-3xl bg-white border border-[#EAEDFF] shadow-sm flex flex-col gap-4 animate-scaleUp">
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-2xl flex items-start gap-3 ${
                      precheckResult.overallValid
                        ? 'bg-[#E8F5E9] border border-[#A5D6A7] text-[#2E7D32]'
                        : 'bg-[#FFEBEE] border border-[#FFCDD2] text-[#C62828]'
                    }`}
                  >
                    {precheckResult.overallValid ? (
                      <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5 text-[#2E7D32]" />
                    ) : (
                      <XCircle className="w-6 h-6 shrink-0 mt-0.5 text-[#C62828]" />
                    )}
                    <div>
                      <h3 className="font-bold text-sm">
                        {precheckResult.overallValid
                          ? 'Tờ Khai Hợp Lệ - Sẵn Sàng Nộp'
                          : 'Phát Hiện Lỗi Cần Chỉnh Sửa Bằng Bút Mực'}
                      </h3>
                      <p className="text-xs mt-1 leading-relaxed">
                        {precheckResult.overallValid
                          ? 'Tất cả các trường thông tin CCCD, thời gian và địa chỉ cư trú đều khớp logic quy định của Bộ Công an.'
                          : 'Bà con vui lòng dùng bút mực gạch ngang và ghi lại thông tin chính xác trực tiếp trên bản giấy trước khi mang đến UBND.'}
                      </p>
                    </div>
                  </div>

                  {/* Field Breakdown Diagnostic Checklist */}
                  <div className="flex flex-col divide-y divide-[#EAEDFF] text-xs">
                    {precheckResult.fieldValidations.map((field, idx) => (
                      <div key={idx} className="py-2.5 flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          {field.valid ? (
                            <CheckCircle2 className="w-4 h-4 text-[#00687A] shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[#BA1A1A] shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-semibold text-[#131B2E]">{field.fieldName}</span>
                            {field.errorMessage && (
                              <p className="text-[11px] text-[#BA1A1A] mt-0.5 font-medium leading-tight">
                                {field.errorMessage}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 ${
                            field.valid
                              ? 'bg-[#ACEDFF] text-[#004E5C]'
                              : 'bg-[#FFDAD6] text-[#93000A]'
                          }`}
                        >
                          {field.valid ? 'Hợp Lệ' : 'Sai Lệch'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Warnings if any */}
                  {precheckResult.warnings.length > 0 && (
                    <div className="p-3 rounded-xl bg-[#FFF8E1] border border-[#FFE082] text-xs text-[#8D6E63] flex flex-col gap-1">
                      <strong className="text-[#E65100]">Lưu ý bổ sung:</strong>
                      {precheckResult.warnings.map((w, idx) => (
                        <span key={idx} className="text-[11px] leading-tight">• {w}</span>
                      ))}
                    </div>
                  )}

                  {/* Footer Meta */}
                  <div className="pt-2 border-t border-[#EAEDFF] flex items-center justify-between text-[10px] text-[#757682] font-mono">
                    <span>Mã tra cứu: {precheckResult.submissionId}</span>
                    <span>Xử lý: {precheckResult.processingTimeMs}ms</span>
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div className="p-8 rounded-3xl bg-white border border-[#EAEDFF] shadow-sm flex flex-col items-center justify-center text-center text-[#757682] gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#F2F3FF] flex items-center justify-center text-[#00236F]">
                    <ShieldCheck className="w-7 h-7 text-[#00687A]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#131B2E]">Sẵn Sàng Rà Soát</h3>
                    <p className="text-xs text-[#757682] mt-1 max-w-xs leading-relaxed">
                      Điền thông tin bản khai giấy bên trái và bấm nút "Kiểm Tra Biểu Mẫu Bằng AI" để đối chiếu CSDL Đề án 06.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MANDATORY SIGNATURE CERTIFICATION WARNING & 4-GROUP PRECHECK REFERENCE */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
            {/* Red Alert Box: Signature Certification Rule */}
            <div className="lg:col-span-4 p-5 rounded-3xl bg-[#FEF2F2] border-2 border-[#FCA5A5] shadow-xs flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#BA1A1A] text-white uppercase tracking-wider">
                    Quy tắc bất di bất dịch
                  </span>
                  <span className="text-[11px] font-bold text-[#991B1B]">• Thủ tục Chứng thực</span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-[#991B1B]">
                  ⚠️ Tuyệt Đối KHÔNG Ký Tên Trước Ở Nhà!
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
                    Nếu đã ký sẵn ở nhà, hồ sơ sẽ bị hủy và bắt buộc phải in lại bản mới để ký trực tiếp.
                  </li>
                </ul>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 border border-[#FECACA] text-[11px] font-bold text-[#991B1B]">
                📌 Nhóm Đất đai (Mẫu số 09/ĐK): Cần đối chiếu kỹ Số phát hành Sổ đỏ/Sổ hồng, số thửa, tờ bản đồ và tình trạng không tranh chấp trước khi nộp.
              </div>
            </div>

            {/* 4 Core Form Groups Reference Matrix */}
            <div className="lg:col-span-8 p-5 rounded-3xl bg-white border border-[#EAEDFF] shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#EAEDFF] pb-2.5">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#00236F]">
                    Danh Mục Điểm Bắt Buộc Tiền Kiểm Tra Tại Một Cửa Cấp Xã
                  </h3>
                  <span className="text-[11px] text-[#757682]">
                    Tổng hợp các lỗi khiến bà con thường xuyên bị trả hồ sơ nhiều nhất tại UBND xã/phường
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#131B2E]">
                  <thead className="bg-[#FAF8FF] border-b border-[#EAEDFF] text-[10px] font-bold text-[#757682] uppercase">
                    <tr>
                      <th className="p-2.5">Tên Tờ Khai & Căn Cứ</th>
                      <th className="p-2.5">Điểm Bắt Buộc Đối Chiếu</th>
                      <th className="p-2.5">Sai Sót Thường Gặp Nhất</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEDFF] text-[11px]">
                    <tr>
                      <td className="p-2.5 font-bold text-[#00236F]">
                        1. Đăng ký khai sinh
                        <span className="block text-[10px] font-normal text-[#757682]">TT 04/2020/TT-BTP</span>
                      </td>
                      <td className="p-2.5">
                        Khớp từng chữ Họ tên bé, ngày sinh, giới tính với Giấy chứng sinh; 12 số CCCD cha/mẹ.
                      </td>
                      <td className="p-2.5 text-[#BA1A1A] font-medium">
                        Lệch ngày sinh với Giấy chứng sinh; cha mẹ chưa kết hôn nhưng ghi tên cha vào tờ khai thường.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-[#00236F]">
                        2. Đăng ký kết hôn & Độc thân
                        <span className="block text-[10px] font-normal text-[#757682]">Luật HN&GĐ 2014</span>
                      </td>
                      <td className="p-2.5">
                        Nam ≥ 20 tuổi, Nữ ≥ 18 tuổi (theo ngày sinh); ghi cụ thể mục đích sử dụng giấy độc thân.
                      </td>
                      <td className="p-2.5 text-[#BA1A1A] font-medium">
                        Chưa tròn tuổi theo ngày tháng sinh; ghi mục đích độc thân chung chung ("bổ sung hồ sơ").
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-[#00236F]">
                        3. Khai tử & Trích lục hộ tịch
                        <span className="block text-[10px] font-normal text-[#757682]">Luật Hộ tịch 2014</span>
                      </td>
                      <td className="p-2.5">
                        Khớp Giấy báo tử bản chính (nộp trong 15 ngày); ghi rõ năm đăng ký sự kiện hộ tịch gốc.
                      </td>
                      <td className="p-2.5 text-[#BA1A1A] font-medium">
                        Thiếu Giấy báo tử bản chính; quên năm đăng ký hộ tịch gốc khiến tra lục sổ giấy kéo dài.
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-[#00236F]">
                        4. Trợ cấp BTXH & Mai táng phí
                        <span className="block text-[10px] font-normal text-[#757682]">Mẫu 01, 02, 03 NĐ 20/2021</span>
                      </td>
                      <td className="p-2.5">
                        Người cao tuổi ≥ 80 tuổi (không lương hưu) hoặc Giấy xác nhận khuyết tật nặng + STK ngân hàng.
                      </td>
                      <td className="p-2.5 text-[#BA1A1A] font-medium">
                        Chưa đủ mốc 80 tuổi; thiếu số tài khoản ngân hàng chính chủ chi trả an sinh Đề án 06.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INCIDENT REPORTING & TWO-STAGE TRIAGE */}
      {/* ========================================================================= */}
      {activeTab === 'incident' && (
        <section className="flex flex-col gap-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#EAEDFF]/80 via-white to-[#F2F3FF] border border-[#DAE2FD] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#BA1A1A] text-white flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-[#00236F]">
                  Báo Tin Khẩn & Sự Cố Hiện Trường Liên Địa Bàn • Định Vị Chuẩn GPS (R=25m)
                </h2>
                <p className="text-xs text-[#444651] mt-1 leading-relaxed">
                  <strong>Quy trình tự động 3 bước:</strong> (1) Quét tọa độ GPS chuẩn xác cao (bán kính hẹp <strong>R=25m</strong>) và tự động điền vào ô vị trí &amp; nội dung (cho phép chỉnh tay nếu lệch) ➔ (2) Kèm <strong>Số điện thoại liên hệ</strong> để người giám sát địa bàn gọi xác minh ➔ (3) Tự động gửi về đúng <strong>UBND Xã/Phường nơi xảy ra sự cố</strong> dựa trên vị trí trong ô.
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#DAE2FD] text-[11px] font-semibold text-[#BA1A1A] shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#BA1A1A] animate-pulse" />
              <span>Trực Ban 24/7 • R=25m</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Incident Input Form (7 Cols) */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-[#EAEDFF] shadow-sm flex flex-col gap-5">
              {/* STEP 1: GPS SCAN FIRST & MAP TO LOCATION BOX */}
              <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-[#F8FAFC] border border-[#DAE2FD]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs sm:text-sm font-extrabold text-[#00236F] flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-[#BA1A1A]" />
                    <span>Bước 1: Quét Vị Trí GPS Chuẩn (R=25m) &amp; Ô Vị Trí Hiện Trường</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGetLocation(false)}
                    disabled={gpsLoading}
                    className="px-3 py-1.5 rounded-xl bg-[#00687A] hover:bg-[#004E5C] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{gpsLoading ? 'Đang Quét Vệ Tinh GPS...' : 'Quét Lại Vị Trí GPS Thực Tế'}</span>
                  </button>
                </div>

                {/* Quick Cross-Ward GPS Simulation Bar for Testing */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-[#64748B] mr-1">
                    Giả lập công dân di chuyển qua địa bàn khác:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateCrossWardGps('AG_P_CHAUDOC', 'Số 18 Đường Phan Văn Vàng')
                    }
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#EAEDFF] text-[#00236F] border border-[#CBD5E1] text-[11px] font-bold transition cursor-pointer"
                  >
                    🚗 Đi qua Phường Châu Đốc
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateCrossWardGps('AG_P_LONGXUYEN', 'Số 05 Đường Lê Triệu Kiết')
                    }
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#EAEDFF] text-[#00236F] border border-[#CBD5E1] text-[11px] font-bold transition cursor-pointer"
                  >
                    🚗 Đi qua Phường Long Xuyên
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateCrossWardGps('AG_X_ANPHU', 'Đường Thoại Ngọc Hầu')
                    }
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#EAEDFF] text-[#00236F] border border-[#CBD5E1] text-[11px] font-bold transition cursor-pointer"
                  >
                    🏠 Tại Xã An Phú
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
                      Ô vị trí sự cố (Đã tự động điền từ GPS — Bà con có thể sửa tay nếu lệch):
                    </span>
                    <span className="font-mono text-[#00687A] font-bold">
                      Sai số GPS: ±{gpsAccuracy ?? 8}m • Phạm vi gom cụm: R=25m
                    </span>
                  </div>
                  <input
                    type="text"
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    placeholder="Nhập địa chỉ cụ thể kèm tên Xã/Phường (VD: Đường Phan Văn Vàng, Phường Châu Đốc)..."
                    className="w-full h-10 px-3.5 rounded-xl bg-white border-2 border-[#00236F]/30 text-xs md:text-sm font-semibold text-[#131B2E] focus:outline-none focus:border-[#00236F] shadow-2xs"
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
                        Đơn vị nhận tin theo ô vị trí:{' '}
                        <strong className="underline text-[#00236F]">
                          UBND {resolvedJurisdiction.ward.name}
                        </strong>
                      </span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-current/20">
                      {resolvedJurisdiction.matchedBy === 'TEXT_BOX'
                        ? 'Khớp theo chữ trên ô vị trí'
                        : 'Khớp theo tọa độ GPS'}
                    </span>
                  </div>
                  {resolvedJurisdiction.ward.code !== currentWard.code ? (
                    <p className="text-[11px] leading-relaxed mt-0.5">
                      🔄 <strong>Phát hiện báo sự cố liên địa bàn:</strong> Cổng hiện tại của bạn là{' '}
                      <strong>{currentWard.name}</strong>, nhưng vị trí sự cố trên ô thuộc{' '}
                      <strong>{resolvedJurisdiction.ward.name}</strong>. Khi bấm gửi, hệ thống sẽ định tuyến hồ sơ thẳng về{' '}
                      <strong>Ban Giám Sát UBND {resolvedJurisdiction.ward.name}</strong> (Trực ban:{' '}
                      {resolvedJurisdiction.ward.phoneNumber}) để xử lý đúng phạm vi phụ trách!
                    </p>
                  ) : (
                    <p className="text-[11px] opacity-90">
                      Tin báo sẽ được chuyển trực tiếp đến Ban Giám Sát UBND {resolvedJurisdiction.ward.name} (Hotline trực ban: {resolvedJurisdiction.ward.phoneNumber}).
                    </p>
                  )}
                </div>

                {/* Coordinates & Interactive Mini-Map with tight R=25m Circle */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#757682] px-1 pt-1">
                  <span>
                    Vĩ độ (Lat): <strong className="text-[#00236F]">{latitude.toFixed(6)}</strong>
                  </span>
                  <span>
                    Kinh độ (Lon): <strong className="text-[#00236F]">{longitude.toFixed(6)}</strong>
                  </span>
                  <span className="text-[11px] font-sans text-[#00687A] font-semibold">
                    💡 Click hoặc kéo ghim đỏ để chỉnh vị trí (Vòng xanh R=25m)
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
                      { id: 'HIGH', label: '🚨 Tin Khẩn' },
                      { id: 'MEDIUM', label: '⚠️ Cần Sớm' },
                      { id: 'LOW', label: '📌 Thường' },
                    ] as const).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUrgency(u.id)}
                        className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                          urgency === u.id
                            ? 'bg-[#BA1A1A] text-white border-[#BA1A1A] shadow-xs'
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
                  <p className="text-[11px] font-semibold text-[#166534] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span>
                      SĐT hợp lệ ({reporterPhone.trim()}) — Cán bộ giám sát tại UBND {resolvedJurisdiction.ward.name} sẽ liên hệ qua số này.
                    </span>
                  </p>
                ) : (
                  <p className="text-[11px] text-[#7F1D1D]">
                    Vui lòng nhập số điện thoại di động 10 số để cán bộ trực ban liên hệ khi xuống hiện trường.
                  </p>
                )}
              </div>

              {/* STEP 3: CATEGORY & CONTENT BOX (MAPPED FROM GPS, EDITABLE BY HAND) */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#444651]">
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
                            ? 'bg-[#00236F] text-white border-[#00236F] shadow-xs'
                            : 'bg-[#FAF8FF] hover:bg-[#EAEDFF] text-[#444651] border-[#EAEDFF]'
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
                    <label className="text-xs font-bold text-[#444651]">
                      Ô nội dung chi tiết sự cố (Vị trí quét được đã map vào đây, bà con có thể chỉnh tay):
                    </label>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-xl bg-[#FAF8FF] border border-[#EAEDFF] text-xs md:text-sm text-[#131B2E] focus:outline-none focus:border-[#00236F] focus:bg-white resize-none transition-all"
                    placeholder="Mô tả mức độ nguy hiểm, kích thước, ảnh hưởng đến người đi đường..."
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[11px] text-[#64748B] font-medium">
                  📍 Nơi nhận hồ sơ: <strong className="text-[#00236F]">UBND {resolvedJurisdiction.ward.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleReport}
                  disabled={reportLoading}
                  className="w-full sm:w-auto px-6 py-3 bg-[#BA1A1A] hover:bg-[#93000A] active:scale-[0.98] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-[#BA1A1A]/20 flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
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

            {/* Incident Triage Live Result (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {reportResult ? (
                <div className="p-6 rounded-3xl bg-white border border-[#EAEDFF] shadow-sm flex flex-col gap-4 animate-scaleUp">
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
                          ? 'Đã Tự Động Gom Cụm Sự Cố Trong Bán Kính R=25m'
                          : `Đã Định Tuyến Thành Công Về UBND ${reportResult.targetWardName || resolvedJurisdiction.ward.name}`}
                      </h3>
                      <p className="text-xs mt-1 leading-relaxed">{reportResult.message}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 p-4 bg-[#FAF8FF] border border-[#EAEDFF] rounded-2xl text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#EAEDFF]">
                      <span className="text-[#757682]">Đơn vị tiếp nhận (Theo ô vị trí):</span>
                      <strong className="text-[#00236F] font-extrabold">
                        UBND {reportResult.targetWardName || resolvedJurisdiction.ward.name}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#757682]">SĐT người báo (Giám sát liên hệ):</span>
                      <strong className="font-mono text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded border border-[#FECACA]">
                        📞 {reportResult.reporterPhone || reporterPhone}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#757682]">Vị trí hiện trường ghi nhận:</span>
                      <span className="font-semibold text-[#131B2E] text-right max-w-[220px] truncate">
                        {reportResult.addressText || addressText}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#757682]">Mã cụm sự cố:</span>
                      <strong className="font-mono text-[#00236F]">{reportResult.clusterCode}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#757682]">Bán kính gom cụm chuẩn GPS:</span>
                      <span className="font-bold text-[#00687A]">
                        R = {reportResult.appliedRadiusMeters ?? 25}m (Độ chính xác cao)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#757682]">Tổng số người báo tại điểm này:</span>
                      <span className="font-bold text-[#00687A]">{reportResult.totalReportsInCluster} người dân</span>
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
                    className="w-full py-2.5 px-4 rounded-xl bg-[#00236F] hover:bg-[#1E3A8A] text-white text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <span>Kiểm Tra Trên Bàn Giám Sát UBND {reportResult.targetWardName || resolvedJurisdiction.ward.name}</span>
                    <ArrowRight className="w-4 h-4 text-[#57DFFE]" />
                  </button>
                </div>
              ) : (
                <div className="p-6 rounded-3xl bg-white border border-[#EAEDFF] shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#F2F3FF] flex items-center justify-center text-[#BA1A1A] shrink-0">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#131B2E]">
                        Định Tuyến Liên Xã/Phường &amp; Gom Cụm R=25m
                      </h3>
                      <p className="text-xs text-[#757682] mt-0.5">
                         Tự động nhận diện đúng địa bàn theo vị trí trên ô
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#334155] space-y-2 leading-relaxed">
                    <p>
                      <strong>1. Quét GPS &amp; Map vào ô trước:</strong> Ngay khi mở tab Báo sự cố, hệ thống quét GPS chuẩn (bán kính hẹp <strong>R=25m</strong>) và điền thẳng địa chỉ vào ô vị trí &amp; ô nội dung.
                    </p>
                    <p>
                      <strong>2. Chỉnh tay linh hoạt:</strong> Nếu sóng GPS lệch, bà con có thể gõ chỉnh lại địa chỉ/tên phường xã trên ô.
                    </p>
                    <p>
                      <strong>3. Gửi đúng xã/phường nơi xảy ra sự cố:</strong> Ví dụ bà con ở <em>Xã An Phú</em> nhưng đi qua <em>Phường Châu Đốc</em> thấy đường hư, hệ thống sẽ dựa vào vị trí <em>Phường Châu Đốc</em> trên ô để gửi thẳng cho <strong>UBND Phường Châu Đốc</strong> kèm SĐT để người giám sát liên hệ ngay.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default FormAndIssueReporting;
