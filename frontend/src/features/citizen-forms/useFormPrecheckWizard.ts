import { useEffect, useRef, useState } from 'react';
import {
  getCitizenEmailNotifications,
  getLiveSubmittedDossiers,
  precheckForm,
  saveLiveSubmittedDossier,
  submitDossier,
  type DossierSubmissionResponse,
  type EmailNotificationItem,
  type FormPrecheckResponse,
  type LiveFormDossier,
} from '../../api/client';
import { normalizeDateToYMD } from '../../services/geminiClient';
import { exportElementToPdf } from '../../utils/pdfExporter';
import type { DecodedCccdQr, QrFieldDiscrepancy } from '../../utils/cccdQrParser';
import type { WardItem } from '../../data/anGiangWards';
import { citizenDossierFormSchema, extractZodFieldErrors } from '../../schemas/formValidation';
import { useFormOcrUpload, type CitizenFormType } from './useFormOcrUpload';

export function useFormPrecheckWizard(params: {
  currentWard: WardItem;
  initialType: CitizenFormType;
  searchTypeParam: string | null;
  agentDraftState: any;
  setActiveTab: (tab: 'form' | 'incident' | 'tracking') => void;
  setReporterPhone: (phone: string) => void;
  myDossiers: LiveFormDossier[];
  setMyDossiers: React.Dispatch<React.SetStateAction<LiveFormDossier[]>>;
  setEmailNotifications: React.Dispatch<React.SetStateAction<EmailNotificationItem[]>>;
  setTrackingDossierCode: (code: string) => void;
  setTrackingLast4Cccd: (last4: string) => void;
}) {
  const {
    currentWard,
    initialType,
    searchTypeParam,
    agentDraftState,
    setActiveTab,
    setReporterPhone,
    myDossiers,
    setMyDossiers,
    setEmailNotifications,
    setTrackingDossierCode,
    setTrackingLast4Cccd,
  } = params;

  const [selectedFormType, setSelectedFormType] = useState<CitizenFormType>(initialType);
  const [formWizardStep, setFormWizardStep] = useState<1 | 2 | 3>(1);
  const [showReferenceTable, setShowReferenceTable] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showCccdQrModal, setShowCccdQrModal] = useState(false);
  const [qrDiscrepancies, setQrDiscrepancies] = useState<QrFieldDiscrepancy[]>([]);
  const [fullName, setFullName] = useState(''); const [cccd, setCccd] = useState('');
  const [dob, setDob] = useState(''); const [gender, setGender] = useState('Nam');
  const [issueDate, setIssueDate] = useState(''); const [address, setAddress] = useState('');
  const [citizenEmail, setCitizenEmail] = useState(''); const [phoneNumber, setPhoneNumber] = useState('');
  const [hostName, setHostName] = useState(''); const [hostCccd, setHostCccd] = useState('');
  const [hostRelation, setHostRelation] = useState('Chủ hộ'); const [declarationScope, setDeclarationScope] = useState('Đăng ký thường trú');
  const [hospitalBirthDate, setHospitalBirthDate] = useState(''); const [motherName, setMotherName] = useState('');
  const [hospitalMotherName, setHospitalMotherName] = useState(''); const [fatherName, setFatherName] = useState('');
  const [parentsMarried, setParentsMarried] = useState<'YES' | 'NO'>('YES');
  const [childEthnicity, setChildEthnicity] = useState('Kinh'); const [childNationality, setChildNationality] = useState('Việt Nam');
  const [childBirthPlace, setChildBirthPlace] = useState(''); const [birthCertNumber, setBirthCertNumber] = useState('');
  const [birthCertIssueDate, setBirthCertIssueDate] = useState(''); const [fatherDob] = useState(''); const [motherDob] = useState('');
  const [fatherResidence, setFatherResidence] = useState(''); const [motherResidence, setMotherResidence] = useState('');
  const [marriageMode, setMarriageMode] = useState<'MARRIAGE_REGISTRATION' | 'MARITAL_STATUS_CONFIRMATION'>('MARRIAGE_REGISTRATION');
  const [partnerName, setPartnerName] = useState(''); const [partnerCccd, setPartnerCccd] = useState('');
  const [partnerDob, setPartnerDob] = useState(''); const [partnerGender, setPartnerGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [partnerAddress, setPartnerAddress] = useState(''); const [applicantEthnicity, setApplicantEthnicity] = useState('Kinh');
  const [partnerEthnicity, setPartnerEthnicity] = useState('Kinh'); const [applicantNationality] = useState('Việt Nam');
  const [partnerNationality] = useState('Việt Nam'); const [applicantMarriageCount, setApplicantMarriageCount] = useState('1');
  const [partnerMarriageCount, setPartnerMarriageCount] = useState('1'); const [maritalCertPurpose, setMaritalCertPurpose] = useState('');
  const [previousMaritalStatus, setPreviousMaritalStatus] = useState<'SINGLE' | 'DIVORCED' | 'WIDOWED'>('SINGLE');
  const [divorceJudgmentNumber, setDivorceJudgmentNumber] = useState(''); const [divorceJudgmentDate, setDivorceJudgmentDate] = useState('');
  const [deathCertNumber, setDeathCertNumber] = useState(''); const [deathCertDate, setDeathCertDate] = useState('');
  const [disabilityLevel, setDisabilityLevel] = useState<'NONE' | 'SEVERE' | 'EXTREMELY_SEVERE'>('NONE');
  const [householdStatus, setHouseholdStatus] = useState<'NORMAL' | 'POOR' | 'NEAR_POOR'>('NORMAL');
  const [bankAccount, setBankAccount] = useState(''); const [poorHouseholdBookNumber, setPoorHouseholdBookNumber] = useState('');
  const [disabilityCertNumber, setDisabilityCertNumber] = useState(''); const [disabilityCertIssueDate, setDisabilityCertIssueDate] = useState('');
  const [disabilityCertIssuer, setDisabilityCertIssuer] = useState(''); const [guardianName, setGuardianName] = useState('');
  const [guardianCccd, setGuardianCccd] = useState(''); const [guardianRelation, setGuardianRelation] = useState('Con đẻ');
  const [guardianPhone, setGuardianPhone] = useState(''); const [socialTargetGroup, setSocialTargetGroup] = useState<string>('ELDERLY_PENSION');
  const [hasBhyt, setHasBhyt] = useState<'YES' | 'NO'>('YES'); const [bhytNumber, setBhytNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'BANK' | 'CASH' | 'EWALLET'>('BANK');

  const [formLoading, setFormLoading] = useState(false);
  const [precheckResult, setPrecheckResult] = useState<FormPrecheckResponse | null>(null);
  const [submittedDossier, setSubmittedDossier] = useState<DossierSubmissionResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isExportingQrPass, setIsExportingQrPass] = useState(false);

  const qrPassRef = useRef<HTMLDivElement>(null);
  const dossierFullNameInputRef = useRef<HTMLInputElement>(null);
  const dossierCccdInputRef = useRef<HTMLInputElement>(null);
  const dossierDobInputRef = useRef<HTMLInputElement>(null);
  const dossierAddressInputRef = useRef<HTMLInputElement>(null);
  const dossierEmailInputRef = useRef<HTMLInputElement>(null);
  const dossierPhoneInputRef = useRef<HTMLInputElement>(null);

  const ocr = useFormOcrUpload(selectedFormType, currentWard.name, {
    resetBasicFields: () => {
      setFullName(''); setCccd(''); setDob(''); setGender(''); setIssueDate('');
      setAddress(''); setPhoneNumber(''); setHostName(''); setHostCccd('');
      setHostRelation('Chủ hộ'); setDeclarationScope('Đăng ký thường trú');
    },
    setFullName, setCccd, setDob, setGender, setIssueDate, setAddress,
    setPhoneNumber, setReporterPhone, setHostName, setHostCccd, setHostRelation, setDeclarationScope,
    setHospitalBirthDate, setChildEthnicity, setChildNationality, setChildBirthPlace,
    setBirthCertNumber, setBirthCertIssueDate, setMotherName, setHospitalMotherName,
    setFatherName, setFatherResidence, setMotherResidence,
    setPartnerName, setPartnerCccd, setPartnerDob, setPartnerGender, setPartnerAddress,
    setMaritalCertPurpose, setApplicantEthnicity, setPartnerEthnicity,
    setDisabilityLevel, setHouseholdStatus, setPoorHouseholdBookNumber,
    setDisabilityCertNumber, setDisabilityCertIssueDate, setGuardianName, setGuardianCccd,
    setGuardianRelation, setGuardianPhone, setBankAccount,
  });

  useEffect(() => {
    const type = searchTypeParam?.toUpperCase();
    if (type === 'TK-KS' || type === 'TK-KH' || type === 'TK-BTXH' || type === 'CT01') {
      setSelectedFormType(type);
    }
  }, [searchTypeParam]);

  useEffect(() => {
    if (!agentDraftState || typeof agentDraftState !== 'object') return;
    const rawType = String(agentDraftState.formType || '').toUpperCase();
    if (rawType === 'CT01' || rawType === 'TK-KS' || rawType === 'TK-KH' || rawType === 'TK-BTXH') {
      setSelectedFormType(rawType);
    }
    if (typeof agentDraftState.fullName === 'string' && agentDraftState.fullName.trim()) setFullName(agentDraftState.fullName.trim());
    if (typeof agentDraftState.citizenCccd === 'string' && agentDraftState.citizenCccd.trim()) setCccd(agentDraftState.citizenCccd.trim());
    if (typeof agentDraftState.dateOfBirth === 'string' && agentDraftState.dateOfBirth.trim()) {
      setDob(normalizeDateToYMD(agentDraftState.dateOfBirth.trim()) || agentDraftState.dateOfBirth.trim());
    }
    if (typeof agentDraftState.gender === 'string' && agentDraftState.gender.trim()) setGender(agentDraftState.gender.trim());
    if (typeof agentDraftState.address === 'string' && agentDraftState.address.trim()) setAddress(agentDraftState.address.trim());
    if (typeof agentDraftState.phoneNumber === 'string' && agentDraftState.phoneNumber.trim()) setPhoneNumber(agentDraftState.phoneNumber.trim());
    const nestedMother = agentDraftState.formData?.motherName;
    if (typeof nestedMother === 'string' && nestedMother.trim()) setMotherName(nestedMother.trim());
    setActiveTab('form');
    setFormWizardStep(1);
  }, [agentDraftState, setActiveTab]);

  useEffect(() => {
    if (selectedFormType === 'CT01' && hostRelation === 'Chủ hộ') {
      if (fullName && hostName !== fullName) setHostName(fullName);
      if (cccd && hostCccd !== cccd) setHostCccd(cccd);
    }
  }, [selectedFormType, hostRelation, fullName, cccd, hostName, hostCccd]);

  const handleCccdQrSuccess = (decoded: DecodedCccdQr, discrepancies: QrFieldDiscrepancy[]) => {
    setCccd(decoded.cccdNumber);
    setFullName(decoded.fullName);
    setDob(decoded.dateOfBirth);
    setGender(decoded.gender);
    setAddress(decoded.address);
    if (decoded.issueDate) setIssueDate(decoded.issueDate);
    ocr.setOcrSuccess(true);
    ocr.setOcrConfidence(100);
    setPrecheckResult(null);
    setQrDiscrepancies(discrepancies);
  };

  const handleSelectFormType = (type: CitizenFormType) => {
    setSelectedFormType(type);
    setPrecheckResult(null);
    setFormErrors({});
    setSubmitError(null);
  };

  const handlePrecheck = async () => {
    if (
      ocr.visionGateResult &&
      (ocr.visionGateResult.isBlurry ||
        ocr.visionGateResult.isTooDark ||
        ocr.visionGateResult.isGlared ||
        !ocr.visionGateResult.templateMatched)
    ) {
      const reason = !ocr.visionGateResult.templateMatched
        ? ocr.visionGateResult.templateMessage
        : ocr.visionGateResult.qualityMessage;
      setSubmitError(`CHỐT CHẶN CHẤT LƯỢNG ẢNH: ${reason}. Vui lòng chụp lại ảnh rõ nét hoặc chọn đúng biểu mẫu ở Bước 1.`);
      return;
    }

    const parsed = citizenDossierFormSchema.safeParse({ fullName, cccd, dob, address, phoneNumber, citizenEmail });
    if (!parsed.success) {
      const errs = extractZodFieldErrors(parsed.error);
      setFormErrors(errs);
      setSubmitError('Vui lòng kiểm tra và chỉnh sửa các mục báo đỏ bên dưới.');
      if (errs.fullName) dossierFullNameInputRef.current?.focus();
      else if (errs.cccd) dossierCccdInputRef.current?.focus();
      else if (errs.dob) dossierDobInputRef.current?.focus();
      else if (errs.address) dossierAddressInputRef.current?.focus();
      else if (errs.citizenEmail) dossierEmailInputRef.current?.focus();
      else if (errs.phoneNumber) dossierPhoneInputRef.current?.focus();
      return;
    }

    setFormErrors({});
    const { fullName: cleanFullName, cccd: cleanCccd, phoneNumber: cleanPhone, citizenEmail: cleanEmail } = parsed.data;
    if (cleanFullName.length < 3 || !/^\d{12}$/.test(cleanCccd) || !/^0\d{9}$/.test(cleanPhone)) {
      setSubmitError('Dữ liệu định danh (Họ tên, CCCD 12 số, SĐT 10 số) chưa đạt chuẩn quy định.');
      return;
    }

    setSubmitError(null);
    setFormLoading(true);
    const procMap: Record<CitizenFormType, string> = {
      CT01: 'TTHC-CR-01', 'TK-KS': 'TTHC-HT-01', 'TK-KH': 'TTHC-HT-02', 'TK-BTXH': 'TTHC-BT-01',
    };
    const procCodeMap: Record<CitizenFormType, string> = {
      CT01: 'TTHC-CT-01', 'TK-KS': 'TTHC-CR-01', 'TK-KH': 'TTHC-CR-03', 'TK-BTXH': 'TTHC-BT-01',
    };
    const formLabels: Record<CitizenFormType, 'CT01' | 'Khai sinh' | 'Kết hôn' | 'Bảo trợ'> = {
      CT01: 'CT01', 'TK-KS': 'Khai sinh', 'TK-KH': 'Kết hôn', 'TK-BTXH': 'Bảo trợ',
    };

    try {
      const res = await precheckForm({
        procedureCode: procMap[selectedFormType],
        formType: selectedFormType,
        citizenCccd: cleanCccd,
        fullName: cleanFullName,
        dateOfBirth: dob,
        gender,
        cccdIssueDate: issueDate,
        address,
        formData: {
          permanentAddress: address, gender, phoneNumber: cleanPhone, phone: cleanPhone,
          citizenEmail: cleanEmail, email: cleanEmail,
          hostName, hostCccd, hostRelation, declarationScope, householdStatus,
          hospitalBirthDate, motherName, hospitalMotherName, fatherName, parentsMarried,
          partnerName, partnerDob, partnerGender, maritalCertPurpose, previousMaritalStatus,
          disabilityLevel, bankAccount,
        },
      });
      setPrecheckResult(res);

      if (res.submissionId.startsWith('DRAFT_')) {
        setSubmitError(
          'Thiết bị đang ở chế độ ngoại tuyến. Bản sơ duyệt hiện tại chỉ là bản nháp nội bộ và chưa được máy chủ xác thực. ' +
          'Vui lòng kết nối Internet để nộp chính thức lên Bộ phận Một cửa UBND xã/phường.'
        );
        return;
      }

      let submitRes: DossierSubmissionResponse;
      try {
        submitRes = await submitDossier({
          procedureCode: procCodeMap[selectedFormType],
          wardCode: currentWard.code,
          citizenCccd: cleanCccd,
          idempotencyKey: `IDEMP_${cleanCccd}_${procCodeMap[selectedFormType]}_${Date.now()}`,
          formData: {
            fullName: cleanFullName, dob: dob || '1990-01-01', gender: gender || 'Nam',
            address: address || currentWard.name, phone: cleanPhone, email: cleanEmail, citizenEmail: cleanEmail,
            sharpnessScore: ocr.visionGateResult?.sharpnessScore ?? 96,
            templateMatched: ocr.visionGateResult?.templateMatched ?? true,
            formType: selectedFormType,
          },
          precheckReport: res,
          vaultDocIds: ocr.vaultDocInfo?.docId ? [ocr.vaultDocInfo.docId] : [],
        });
      } catch (submitErr: any) {
        console.error('[DossierSubmissionFailed]', submitErr?.message);
        setSubmitError(
          'Không thể nộp hồ sơ lên hệ thống. Vui lòng kiểm tra kết nối mạng và thử lại. ' +
          'Hồ sơ CHƯA được ghi nhận, không có mã hồ sơ nào được cấp.'
        );
        return; // Dừng hẳn: không tạo bản ghi giả trên localStorage, không sinh mã hẹn hay QR
      }

      setSubmittedDossier(submitRes);
      setTrackingDossierCode(submitRes.dossierCode);
      if (cleanCccd.length >= 4) setTrackingLast4Cccd(cleanCccd.slice(-4));

      const now = new Date();
      const nowStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const issues = res.fieldValidations ? res.fieldValidations.filter((v) => !v.valid).map((v) => v.errorMessage || v.fieldName) : [];

      saveLiveSubmittedDossier({
        id: submitRes.dossierCode,
        citizenName: cleanFullName.toUpperCase(),
        procedure: procMap[selectedFormType],
        formType: formLabels[selectedFormType],
        submittedAt: `Vừa nộp (${nowStr})`,
        status: res.overallValid ? 'VALID' : 'HAS_ERRORS',
        cccd: cleanCccd,
        citizenEmail: cleanEmail,
        contactPhone: cleanPhone,
        appointmentCode: undefined,
        errorCount: issues.length,
        wardName: currentWard.name,
        vaultToken: ocr.vaultDocInfo?.oneTimeToken,
        vaultDocId: ocr.vaultDocInfo?.docId,
        details: {
          dob: dob || 'Chưa cung cấp', gender: gender || 'Nam', address: address || currentWard.name,
          confidence: 99.0, sharpnessScore: ocr.visionGateResult?.sharpnessScore ?? 96,
          templateMatched: ocr.visionGateResult?.templateMatched ?? true, issues,
          vaultToken: ocr.vaultDocInfo?.oneTimeToken,
        },
      });

      setMyDossiers(getLiveSubmittedDossiers());
      setEmailNotifications(getCitizenEmailNotifications());
      setFormWizardStep(3);
    } catch {
      alert('Không thể kết nối hệ thống để kiểm tra tờ khai.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleWizardStepClick = (targetStep: 1 | 2 | 3) => {
    if (targetStep === 1) { setFormWizardStep(1); return; }
    if (targetStep === 2) {
      if (ocr.visionGateResult && (ocr.visionGateResult.isBlurry || ocr.visionGateResult.isTooDark || ocr.visionGateResult.isGlared || !ocr.visionGateResult.templateMatched)) {
        alert('Ảnh tải lên ở Bước 1 chưa đạt chuẩn chất lượng. Vui lòng kiểm tra lại ảnh trước khi nhập tờ khai.');
        return;
      }
      setFormWizardStep(2);
      return;
    }
    if (precheckResult) { setFormWizardStep(3); return; }
    void handlePrecheck();
  };

  const handleDownloadQrPassPdf = async () => {
    if (!qrPassRef.current) return;
    try {
      setIsExportingQrPass(true);
      const code = submittedDossier?.dossierCode || myDossiers[0]?.id || 'PHIEU-HEN';
      await exportElementToPdf(qrPassRef.current, `Phieu_Hen_So_Duyet_QR_${code}.pdf`);
    } catch (err) {
      console.error('Lỗi tải Phiếu hẹn PDF:', err);
    } finally {
      setIsExportingQrPass(false);
    }
  };

  return {
    selectedFormType, formWizardStep, setFormWizardStep,
    showReferenceTable, setShowReferenceTable,
    showPrintModal, setShowPrintModal,
    showCccdQrModal, setShowCccdQrModal, qrDiscrepancies,
    fullName, setFullName, cccd, setCccd, dob, setDob, gender, setGender,
    issueDate, setIssueDate, address, setAddress, citizenEmail, setCitizenEmail, phoneNumber, setPhoneNumber,
    hostName, setHostName, hostCccd, setHostCccd, hostRelation, setHostRelation, declarationScope, setDeclarationScope,
    hospitalBirthDate, setHospitalBirthDate, motherName, setMotherName, hospitalMotherName, setHospitalMotherName,
    fatherName, setFatherName, parentsMarried, setParentsMarried, childEthnicity, setChildEthnicity,
    childNationality, setChildNationality, childBirthPlace, setChildBirthPlace, birthCertNumber, setBirthCertNumber,
    birthCertIssueDate, setBirthCertIssueDate, fatherDob, motherDob, fatherResidence, setFatherResidence, motherResidence, setMotherResidence,
    marriageMode, setMarriageMode, partnerName, setPartnerName, partnerCccd, setPartnerCccd, partnerDob, setPartnerDob,
    partnerGender, setPartnerGender, partnerAddress, setPartnerAddress, applicantEthnicity, setApplicantEthnicity,
    partnerEthnicity, setPartnerEthnicity, applicantNationality, partnerNationality, applicantMarriageCount, setApplicantMarriageCount,
    partnerMarriageCount, setPartnerMarriageCount, maritalCertPurpose, setMaritalCertPurpose, previousMaritalStatus, setPreviousMaritalStatus,
    divorceJudgmentNumber, setDivorceJudgmentNumber, divorceJudgmentDate, setDivorceJudgmentDate, deathCertNumber, setDeathCertNumber,
    deathCertDate, setDeathCertDate,
    disabilityLevel, setDisabilityLevel, householdStatus, setHouseholdStatus, bankAccount, setBankAccount,
    poorHouseholdBookNumber, setPoorHouseholdBookNumber, disabilityCertNumber, setDisabilityCertNumber,
    disabilityCertIssueDate, setDisabilityCertIssueDate, disabilityCertIssuer, setDisabilityCertIssuer,
    guardianName, setGuardianName, guardianCccd, setGuardianCccd, guardianRelation, setGuardianRelation,
    guardianPhone, setGuardianPhone, socialTargetGroup, setSocialTargetGroup, hasBhyt, setHasBhyt,
    bhytNumber, setBhytNumber, paymentMethod, setPaymentMethod,
    formLoading, precheckResult, submittedDossier, submitError, formErrors, setFormErrors,
    isExportingQrPass, qrPassRef,
    dossierFullNameInputRef, dossierCccdInputRef, dossierDobInputRef,
    dossierAddressInputRef, dossierEmailInputRef, dossierPhoneInputRef,
    ocr,
    handleCccdQrSuccess, handleSelectFormType, handleWizardStepClick, handlePrecheck, handleDownloadQrPassPdf,
  };
}
