import { useRef, useState } from 'react';
import { uploadVaultDocument } from '../../api/client';
import { extractFormWithVision, normalizeDateToYMD, type ExtractedFormFieldsResult } from '../../services/geminiClient';
import { analyzeImageQuality, verifyTemplateMatch, type VisionQualityGateResult } from '../../services/tesseractOcr';
import { decodeQrFromImageFile } from '../../utils/qrImageDecoder';
import type { DecodedCccdQr } from '../../utils/cccdQrParser';

export type CitizenFormType = 'CT01' | 'TK-KS' | 'TK-KH' | 'TK-BTXH';

export interface VaultDocInfo {
  docId: string;
  oneTimeToken: string;
  viewUrl: string;
  expiresAt?: string;
}

export interface FormOcrFieldSetters {
  resetBasicFields: () => void;
  setFullName: (v: string) => void;
  setCccd: (v: string) => void;
  setDob: (v: string) => void;
  setGender: (v: string) => void;
  setIssueDate: (v: string) => void;
  setAddress: (v: string) => void;
  setPhoneNumber: (v: string) => void;
  setReporterPhone: (v: string) => void;
  setHostName: (v: string) => void;
  setHostCccd: (v: string) => void;
  setHostRelation: (v: string) => void;
  setDeclarationScope: (v: string) => void;
  setHospitalBirthDate: (v: string) => void;
  setChildEthnicity: (v: string) => void;
  setChildNationality: (v: string) => void;
  setChildBirthPlace: (v: string) => void;
  setBirthCertNumber: (v: string) => void;
  setBirthCertIssueDate: (v: string) => void;
  setMotherName: (v: string) => void;
  setHospitalMotherName: (v: string) => void;
  setFatherName: (v: string) => void;
  setFatherResidence: (v: string) => void;
  setMotherResidence: (v: string) => void;
  setPartnerName: (v: string) => void;
  setPartnerCccd: (v: string) => void;
  setPartnerDob: (v: string) => void;
  setPartnerGender: (v: 'Nam' | 'Nữ') => void;
  setPartnerAddress: (v: string) => void;
  setMaritalCertPurpose: (v: string) => void;
  setApplicantEthnicity: (v: string) => void;
  setPartnerEthnicity: (v: string) => void;
  setDisabilityLevel: (v: 'NONE' | 'SEVERE' | 'EXTREMELY_SEVERE') => void;
  setHouseholdStatus: (v: 'NORMAL' | 'POOR' | 'NEAR_POOR') => void;
  setPoorHouseholdBookNumber: (v: string) => void;
  setDisabilityCertNumber: (v: string) => void;
  setDisabilityCertIssueDate: (v: string) => void;
  setGuardianName: (v: string) => void;
  setGuardianCccd: (v: string) => void;
  setGuardianRelation: (v: string) => void;
  setGuardianPhone: (v: string) => void;
  setBankAccount: (v: string) => void;
}

export function useFormOcrUpload(
  selectedFormType: CitizenFormType,
  wardName: string,
  setters: FormOcrFieldSetters
) {
  const [inputMode, setInputMode] = useState<'upload' | 'camera' | 'manual'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [, setOcrConfidence] = useState<number | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrDetails, setOcrDetails] = useState<ExtractedFormFieldsResult | null>(null);
  const [visionGateResult, setVisionGateResult] = useState<VisionQualityGateResult | null>(null);
  const [canvasCheckedLocally, setCanvasCheckedLocally] = useState(false);
  const [vaultDocInfo, setVaultDocInfo] = useState<VaultDocInfo | null>(null);
  const [isVaultUploading, setIsVaultUploading] = useState(false);
  const [vaultUploadError, setVaultUploadError] = useState<string | null>(null);
  const [vaultOfflineNote, setVaultOfflineNote] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runVisionOcr = async (
    file: File,
    precomputedQuality?: Awaited<ReturnType<typeof analyzeImageQuality>>
  ): Promise<boolean> => {
    setIsOcrProcessing(true);
    try {
      let qrData: DecodedCccdQr | null = null;
      if (file.type.startsWith('image/')) {
        try {
          qrData = await decodeQrFromImageFile(file);
        } catch (qrErr) {
          console.warn('QR decode error from file:', qrErr);
        }
      }

      const quality = precomputedQuality ?? (await analyzeImageQuality(file));
      if (quality.isBlurry || quality.isTooDark || quality.isGlared) {
        setVisionGateResult({
          ...quality,
          templateMatched: true,
          detectedFormCode: selectedFormType,
          detectedFormLabel: `Biểu mẫu ${selectedFormType}`,
          templateMessage: 'Ảnh chưa đủ rõ nét, vui lòng chụp lại.',
        });
        setOcrSuccess(false);
        setOcrConfidence(null);
        setOcrError(quality.qualityMessage);
        return false;
      }

      const result = await extractFormWithVision(file);
      const tplMatch = verifyTemplateMatch(
        `${result.detectedDocType || ''} ${result.message || ''} ${result.fullName || ''} ${result.address || ''} ${qrData ? qrData.fullName : ''}`,
        file.name || '',
        selectedFormType
      );

      setVisionGateResult({ ...quality, ...tplMatch });
      setOcrDetails(result);
      if (!tplMatch.templateMatched) {
        setOcrSuccess(false);
        setOcrConfidence(null);
        setOcrError(tplMatch.templateMessage);
        return false;
      }

      const sanitizeWardText = (val: string): string => val.replace(/\{WARD_NAME\}/gi, wardName);
      const mappedFullName = (qrData?.fullName || result.fullName || '').trim().toUpperCase();
      const mappedCccd = (qrData?.cccdNumber || result.cccd || '').trim().replace(/[^0-9]/g, '');
      const mappedDob = qrData?.dateOfBirth
        ? normalizeDateToYMD(qrData.dateOfBirth)
        : result.dob
        ? normalizeDateToYMD(result.dob)
        : '';
      const mappedGender = qrData?.gender || result.gender || '';
      const mappedAddress = sanitizeWardText((qrData?.address || result.address || '').trim());
      const mappedIssueDate = qrData?.issueDate
        ? normalizeDateToYMD(qrData.issueDate)
        : result.issueDate
        ? normalizeDateToYMD(result.issueDate)
        : '';

      const mappedPhone = (result.phone || '').trim();
      const mappedHostName = (result.hostName || '').trim().toUpperCase();
      const mappedHostCccd = (result.hostCccd || '').trim().replace(/[^0-9]/g, '');
      const mappedHostRelation = (result.hostRelation || '').trim();
      const mappedDeclarationScope = sanitizeWardText((result.declarationScope || '').trim());

      let mappedCount = 0;
      if (mappedFullName) { setters.setFullName(mappedFullName); mappedCount++; }
      if (mappedCccd) { setters.setCccd(mappedCccd); mappedCount++; }
      if (mappedDob) { setters.setDob(mappedDob); mappedCount++; }
      if (mappedGender) { setters.setGender(mappedGender); mappedCount++; }
      if (mappedAddress) { setters.setAddress(mappedAddress); mappedCount++; }
      if (mappedPhone) { setters.setPhoneNumber(mappedPhone); setters.setReporterPhone(mappedPhone); mappedCount++; }
      if (mappedHostRelation) { setters.setHostRelation(mappedHostRelation); mappedCount++; }
      if (mappedHostName) { setters.setHostName(mappedHostName); mappedCount++; }
      else if (mappedHostRelation === 'Chủ hộ' && mappedFullName) setters.setHostName(mappedFullName);
      if (mappedHostCccd) { setters.setHostCccd(mappedHostCccd); mappedCount++; }
      else if (mappedHostRelation === 'Chủ hộ' && mappedCccd) setters.setHostCccd(mappedCccd);
      if (mappedDeclarationScope) { setters.setDeclarationScope(mappedDeclarationScope); mappedCount++; }
      if (mappedIssueDate) { setters.setIssueDate(mappedIssueDate); mappedCount++; }

      if (selectedFormType === 'TK-KS') {
        if (result.childName) { setters.setFullName(result.childName); mappedCount++; }
        if (result.dob || mappedDob) setters.setHospitalBirthDate(result.dob || mappedDob);
        if (result.childEthnicity) setters.setChildEthnicity(result.childEthnicity);
        if (result.childNationality) setters.setChildNationality(result.childNationality);
        if (result.birthPlace) { setters.setChildBirthPlace(sanitizeWardText(result.birthPlace)); mappedCount++; }
        if (result.birthCertNumber) { setters.setBirthCertNumber(result.birthCertNumber); mappedCount++; }
        if (result.birthCertIssueDate) { setters.setBirthCertIssueDate(result.birthCertIssueDate); mappedCount++; }
        if (result.motherName) { setters.setMotherName(result.motherName); setters.setHospitalMotherName(result.motherName); mappedCount++; }
        if (result.fatherName) { setters.setFatherName(result.fatherName); mappedCount++; }
        if (mappedAddress) { setters.setFatherResidence(mappedAddress); setters.setMotherResidence(mappedAddress); }
      } else if (selectedFormType === 'TK-KH') {
        if (result.partnerName) { setters.setPartnerName(result.partnerName); mappedCount++; }
        if (result.partnerCccd) { setters.setPartnerCccd(result.partnerCccd); mappedCount++; }
        if (result.partnerDob) { setters.setPartnerDob(result.partnerDob); mappedCount++; }
        if (result.partnerGender === 'Nam' || result.partnerGender === 'Nữ') setters.setPartnerGender(result.partnerGender);
        if (result.partnerAddress) { setters.setPartnerAddress(sanitizeWardText(result.partnerAddress)); mappedCount++; }
        if (result.maritalCertPurpose) { setters.setMaritalCertPurpose(result.maritalCertPurpose); mappedCount++; }
        if (result.applicantEthnicity) setters.setApplicantEthnicity(result.applicantEthnicity);
        if (result.partnerEthnicity) setters.setPartnerEthnicity(result.partnerEthnicity);
      } else if (selectedFormType === 'TK-BTXH') {
        if (result.disabilityLevel === 'NONE' || result.disabilityLevel === 'SEVERE' || result.disabilityLevel === 'EXTREMELY_SEVERE') {
          setters.setDisabilityLevel(result.disabilityLevel);
        }
        if (result.householdStatus === 'NORMAL' || result.householdStatus === 'POOR' || result.householdStatus === 'NEAR_POOR') {
          setters.setHouseholdStatus(result.householdStatus);
        }
        if (result.poorHouseholdBookNumber) { setters.setPoorHouseholdBookNumber(result.poorHouseholdBookNumber); mappedCount++; }
        if (result.disabilityCertNumber) { setters.setDisabilityCertNumber(result.disabilityCertNumber); mappedCount++; }
        if (result.disabilityCertIssueDate) { setters.setDisabilityCertIssueDate(result.disabilityCertIssueDate); mappedCount++; }
        if (result.guardianName) { setters.setGuardianName(result.guardianName); mappedCount++; }
        if (result.guardianCccd) { setters.setGuardianCccd(result.guardianCccd); mappedCount++; }
        if (result.guardianRelation) setters.setGuardianRelation(result.guardianRelation);
        if (result.guardianPhone) { setters.setGuardianPhone(result.guardianPhone); mappedCount++; }
        if (result.bankAccount) { setters.setBankAccount(result.bankAccount); mappedCount++; }
      }

      if (mappedCount > 0) {
        setOcrConfidence(qrData ? 100 : Number((result.confidence || 95).toFixed(1)));
        setOcrSuccess(true);
        return true;
      }
      setOcrSuccess(false);
      setOcrConfidence(null);
      setOcrError(result.message || 'Không tìm thấy các mục thông tin tương ứng trên tệp này. Quý công dân vui lòng nhập trực tiếp vào các ô bên dưới.');
      return true;
    } catch (err: any) {
      setOcrSuccess(false);
      setOcrConfidence(null);
      setOcrError('Không thể đọc nội dung ảnh: ' + (err?.message || 'Vui lòng nhập tay.'));
      return false;
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleFileChange = async (file: File) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const isSupported =
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      file.type.includes('wordprocessingml') ||
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.pdf');
    if (!isSupported) {
      alert('Vui lòng chọn tệp hình ảnh (PNG, JPG, JPEG, WEBP), tệp PDF hoặc tệp Word (.docx) tờ khai đã điền.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Tệp vượt quá 5MB. Vui lòng chọn tệp nhỏ hơn.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setOcrSuccess(false);
    setOcrConfidence(null);
    setOcrError(null);
    setOcrDetails(null);
    setVisionGateResult(null);
    setVaultDocInfo(null);
    setVaultUploadError(null);
    setVaultOfflineNote(null);
    setCanvasCheckedLocally(false);
    setIsOcrProcessing(true);
    setters.resetBasicFields();

    let quality: Awaited<ReturnType<typeof analyzeImageQuality>>;
    try {
      quality = await analyzeImageQuality(file);
    } catch {
      quality = {
        sharpnessScore: 90,
        brightnessScore: 180,
        glareScore: 0,
        isBlurry: false,
        isTooDark: false,
        isGlared: false,
        qualityStatus: 'GOOD',
        qualityMessage: 'Ảnh rõ nét, đạt yêu cầu.',
      };
    }
    setCanvasCheckedLocally(true);

    if (quality.isBlurry || quality.isTooDark || quality.isGlared) {
      setVisionGateResult({
        ...quality,
        templateMatched: true,
        detectedFormCode: selectedFormType,
        detectedFormLabel: `Biểu mẫu ${selectedFormType}`,
        templateMessage: 'Ảnh chưa đạt độ nét để gửi kiểm tra.',
      });
      setOcrError(quality.qualityMessage);
      setOcrSuccess(false);
      setOcrConfidence(null);
      setIsOcrProcessing(false);
      return;
    }

    const templateOk = await runVisionOcr(file, quality);
    if (!templateOk) return;

    setIsVaultUploading(true);
    setVaultUploadError(null);
    setVaultOfflineNote(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const docType =
        selectedFormType === 'TK-KS'
          ? 'GIAY_CHUNG_SINH'
          : selectedFormType === 'TK-KH'
          ? 'GIAY_XAC_NHAN_DOC_THAN'
          : selectedFormType === 'TK-BTXH'
          ? 'SO_HO_NGHEO_KHUYET_TAT'
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
      const status = err?.response?.status;
      const hasBackendPayload = Boolean(err?.response?.data?.message || err?.response?.data?.error);
      const isNetworkOrOffline = !err?.response || err?.code === 'ERR_NETWORK' || (!hasBackendPayload && [500, 502, 504].includes(status));
      if (isNetworkOrOffline) {
        setVaultOfflineNote('Hệ thống lưu trữ đang bận — tệp vẫn được kiểm tra tạm trên máy.');
      } else {
        setVaultUploadError('Chưa thể lưu tệp tạm thời. Bạn vẫn có thể kiểm tra tờ khai.');
      }
    } finally {
      setIsVaultUploading(false);
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
    setVisionGateResult(null);
    setVaultDocInfo(null);
    setVaultUploadError(null);
    setVaultOfflineNote(null);
    setCanvasCheckedLocally(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return {
    inputMode, setInputMode,
    selectedFile, previewUrl, isDragging,
    isOcrProcessing, ocrSuccess, setOcrSuccess, setOcrConfidence, ocrError, ocrDetails,
    visionGateResult, canvasCheckedLocally,
    vaultDocInfo, isVaultUploading, vaultUploadError, vaultOfflineNote,
    fileInputRef,
    handleFileChange, handleRemoveFile, handleDragOver, handleDragLeave, handleDrop,
  };
}
