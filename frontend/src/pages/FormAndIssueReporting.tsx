import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, Clock, FileCheck2, ShieldCheck } from 'lucide-react';
import {
  getCitizenEmailNotifications,
  getLiveSubmittedDossiers,
  getLiveSubmittedIncidents,
  type EmailNotificationItem,
  type LiveCitizenIncident,
  type LiveFormDossier,
} from '../api/client';
import { useWard } from '../context/WardContext';
import { CccdQrScannerModal } from '../components/CccdQrScannerModal';
import { CivicIncidentTab } from '../features/civic-incident/CivicIncidentTab';
import { DossierTrackingTab } from '../features/dossier-tracking/DossierTrackingTab';
import { useSpeechReader } from '../features/citizen-forms/useSpeechReader';
import { useDossierTrackingHook } from '../features/citizen-forms/useDossierTrackingHook';
import { useIncidentReportingHook } from '../features/citizen-forms/useIncidentReportingHook';
import { useFormPrecheckWizard } from '../features/citizen-forms/useFormPrecheckWizard';
import { FormWizardStepper } from '../features/citizen-forms/FormWizardStepper';
import { FormStep1TemplateAndRules } from '../features/citizen-forms/FormStep1TemplateAndRules';
import { FormStep1UploadSection } from '../features/citizen-forms/FormStep1UploadSection';
import { FormStep2FillSection } from '../features/citizen-forms/FormStep2FillSection';
import { FormStep3PrecheckReport } from '../features/citizen-forms/FormStep3PrecheckReport';
import { FormStep3QrPassAndInbox } from '../features/citizen-forms/FormStep3QrPassAndInbox';
import { FormDraftBanner } from '../features/citizen-forms/FormDraftBanner';
import { useFormDraftStorage } from '../features/citizen-forms/useFormDraftStorage';
import { resolveSupportedFormTypeByProcedure } from '../features/citizen-forms/procedureFormMap';
import type { CitizenFormType } from '../features/citizen-forms/useFormOcrUpload';

const A4DocumentModal = React.lazy(() => import('../components/A4DocumentModal'));

/**
 * Citizen Portal Form Precheck Wizard, Field Incident Reporting & Dossier Tracking Shell.
 * Modularized under TASK-019 into focused hooks and step components (<400 lines each).
 */
export const FormAndIssueReporting: React.FC = () => {
  const { currentWard, allWards, setWard } = useWard();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'form' | 'incident' | 'tracking'>(
    location.hash === '#incident' ? 'incident' : location.hash === '#tracking' ? 'tracking' : 'form'
  );
  const [myDossiers, setMyDossiers] = useState<LiveFormDossier[]>(() => getLiveSubmittedDossiers());
  const [myIncidents, setMyIncidents] = useState<LiveCitizenIncident[]>(() => getLiveSubmittedIncidents());
  const [emailNotifications, setEmailNotifications] = useState<EmailNotificationItem[]>(() => getCitizenEmailNotifications());

  useEffect(() => {
    setActiveTab(
      location.hash === '#incident' ? 'incident' : location.hash === '#tracking' ? 'tracking' : 'form'
    );
    setMyDossiers(getLiveSubmittedDossiers());
    setMyIncidents(getLiveSubmittedIncidents());
    setEmailNotifications(getCitizenEmailNotifications());
  }, [location.hash, location.pathname]);

  const { speakingId, toggleSpeech } = useSpeechReader();
  const tracking = useDossierTrackingHook(setMyDossiers);
  const incident = useIncidentReportingHook(currentWard, activeTab, setMyIncidents);

  const urlProc = searchParams.get('procedure')?.trim().toUpperCase();
  const mappedFromProc = resolveSupportedFormTypeByProcedure(urlProc);
  const urlType = searchParams.get('type')?.toUpperCase();
  const initialType: CitizenFormType =
    mappedFromProc ||
    (urlType === 'TK-KS' || urlType === 'TK-KH' || urlType === 'TK-BTXH' || urlType === 'CT01'
      ? urlType
      : 'CT01');

  // TASK-052: Validate ?ward= against commune catalog and persist across reloads
  const urlWardParam = searchParams.get('ward')?.trim().toUpperCase();
  useEffect(() => {
    if (!urlWardParam || urlWardParam === 'AG_PROVINCE') return;
    const validMatch = allWards.find((w) => w.code.toUpperCase() === urlWardParam);
    if (validMatch && validMatch.code !== currentWard.code) {
      setWard(validMatch);
    }
  }, [urlWardParam, allWards, currentWard.code, setWard]);

  const wizard = useFormPrecheckWizard({
    currentWard,
    initialType,
    searchTypeParam: mappedFromProc || searchParams.get('type'),
    agentDraftState: (location.state as any)?.agentDraft,
    setActiveTab,
    setReporterPhone: incident.setReporterPhone,
    myDossiers,
    setMyDossiers,
    setEmailNotifications,
    setTrackingDossierCode: tracking.setTrackingDossierCode,
    setTrackingLast4Cccd: tracking.setTrackingLast4Cccd,
  });

  const draft = useFormDraftStorage({
    selectedFormType: wizard.selectedFormType,
    canonicalProcedureCode: wizard.canonicalProcedureCode,
    wardCode: currentWard.code,
    wardName: currentWard.name,
    formWizardStep: wizard.formWizardStep,
    parentsMarried: wizard.parentsMarried,
    marriageMode: wizard.marriageMode,
    sessionSnapshot: {
      formType: wizard.selectedFormType,
      fullName: wizard.fullName,
      cccd: wizard.cccd,
      dob: wizard.dob,
      gender: wizard.gender,
      issueDate: wizard.issueDate,
      address: wizard.address,
      phoneNumber: wizard.phoneNumber,
      citizenEmail: wizard.citizenEmail,
      hospitalBirthDate: wizard.hospitalBirthDate,
      motherName: wizard.motherName,
      hospitalMotherName: wizard.hospitalMotherName,
      motherResidence: wizard.motherResidence,
      fatherName: wizard.fatherName,
      fatherResidence: wizard.fatherResidence,
      childBirthPlace: wizard.childBirthPlace,
      birthCertNumber: wizard.birthCertNumber,
      birthCertIssueDate: wizard.birthCertIssueDate,
    },
    submittedDossierCode: wizard.submittedDossier?.dossierCode || null,
    onRestoreDraft: (meta, pii) => {
      const targetWard = allWards.find((w) => w.code.toUpperCase() === meta.wardCode.toUpperCase());
      if (targetWard && targetWard.code !== currentWard.code) {
        setWard(targetWard);
      }
      wizard.restoreDraftState(meta, pii as any);
    },
    onClearFields: wizard.clearAllFormInputs,
  });

  const switchTab = (tab: 'form' | 'incident' | 'tracking') => {
    setActiveTab(tab);
    navigate(`/citizen/form#${tab}`, { replace: true });
  };

  return (
    <main className="bg-[#F5F6F8] min-h-[calc(100vh-4rem)] p-3 sm:p-6 lg:p-8 flex flex-col justify-start relative">
      <div className="flex flex-col w-full max-w-7xl mx-auto gap-5 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-base sm:text-xl font-extrabold text-[#881320] uppercase tracking-wide">
              {activeTab === 'form'
                ? `Kiểm Tra 4 Mẫu Tờ Khai • ${currentWard.name}`
                : activeTab === 'incident'
                ? `Báo Sự Cố Hiện Trường • ${currentWard.name}`
                : `Tra Cứu Tiến Độ Hồ Sơ • ${currentWard.name}`}
            </h1>
            <span className="block w-14 h-[3px] bg-[#B90E23] mt-1.5 mb-1.5" />
            <p className="text-xs text-slate-600">
              {activeTab === 'form'
                ? 'Kiểm tra nhanh CCCD, ngày sinh và lỗi tờ khai trước khi nộp.'
                : activeTab === 'incident'
                ? 'Chạm bản đồ hoặc bật GPS để gửi đúng UBND.'
                : 'Tra cứu tiến độ hồ sơ bằng Mã hồ sơ và 4 số cuối CCCD.'}
            </p>
          </div>

          <div className="w-full sm:w-auto max-w-full p-1 bg-[#F7EEDF] rounded-xl border border-[#E5D4B3] flex flex-wrap sm:flex-nowrap items-center gap-1 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => switchTab('form')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer gov-focus-ring ${
                activeTab === 'form' ? 'bg-[#B90E23] text-white shadow-xs' : 'text-[#2B1B17] hover:text-[#9F0C1E] hover:bg-white/60'
              }`}
            >
              <FileCheck2 className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'form' ? 'text-amber-100' : 'text-[#5C4033]'}`} />
              <span>Tờ Khai (4 Mẫu)</span>
            </button>

            <button
              id="tab-incident"
              type="button"
              onClick={() => switchTab('incident')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer gov-focus-ring ${
                activeTab === 'incident' ? 'bg-[#B90E23] text-white shadow-xs' : 'text-[#2B1B17] hover:text-[#9F0C1E] hover:bg-white/60'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'incident' ? 'text-amber-100' : 'text-[#5C4033]'}`} />
              <span>Báo Sự Cố</span>
            </button>

            <button
              id="tab-tracking"
              type="button"
              onClick={() => switchTab('tracking')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer gov-focus-ring ${
                activeTab === 'tracking' ? 'bg-[#B90E23] text-white shadow-xs' : 'text-[#2B1B17] hover:text-[#9F0C1E] hover:bg-white/60'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'tracking' ? 'text-amber-100' : 'text-[#5C4033]'}`} />
              <span>Tra Cứu Hồ Sơ</span>
            </button>
          </div>
        </div>

        {activeTab === 'form' && (
          <section className="flex flex-col gap-5 animate-fadeIn">
            <FormWizardStepper
              formWizardStep={wizard.formWizardStep}
              hasPrecheckResult={Boolean(wizard.precheckResult)}
              onStepClick={wizard.handleWizardStepClick}
            />

            <FormDraftBanner
              selectedFormType={wizard.selectedFormType}
              currentWardCode={currentWard.code}
              formWizardStep={wizard.formWizardStep}
              savedDraftMeta={draft.savedDraftMeta}
              preparedDocs={draft.preparedDocs}
              draftNotice={draft.draftNotice}
              hasSubmittedDossier={Boolean(wizard.submittedDossier)}
              onTogglePreparedDoc={draft.togglePreparedDoc}
              onSaveForLater={draft.handleSaveForLater}
              onResumeDraft={draft.handleResumeSavedDraft}
              onClearDraft={draft.handleClearDraft}
            />

            {wizard.formWizardStep === 1 && (
              <div className="flex flex-col gap-5">
                <FormStep1TemplateAndRules
                  selectedFormType={wizard.selectedFormType}
                  onSelectFormType={wizard.handleSelectFormType}
                  showReferenceTable={wizard.showReferenceTable}
                  onToggleReferenceTable={() => wizard.setShowReferenceTable((prev) => !prev)}
                  speakingId={speakingId}
                  toggleSpeech={toggleSpeech}
                />
                <FormStep1UploadSection
                  selectedFormType={wizard.selectedFormType}
                  inputMode={wizard.ocr.inputMode}
                  setInputMode={wizard.ocr.setInputMode}
                  selectedFile={wizard.ocr.selectedFile}
                  previewUrl={wizard.ocr.previewUrl}
                  isDragging={wizard.ocr.isDragging}
                  isOcrProcessing={wizard.ocr.isOcrProcessing}
                  ocrSuccess={wizard.ocr.ocrSuccess}
                  ocrError={wizard.ocr.ocrError}
                  ocrDetails={wizard.ocr.ocrDetails}
                  visionGateResult={wizard.ocr.visionGateResult}
                  canvasCheckedLocally={wizard.ocr.canvasCheckedLocally}
                  vaultDocInfo={wizard.ocr.vaultDocInfo}
                  isVaultUploading={wizard.ocr.isVaultUploading}
                  vaultUploadError={wizard.ocr.vaultUploadError}
                  vaultOfflineNote={wizard.ocr.vaultOfflineNote}
                  fileInputRef={wizard.ocr.fileInputRef}
                  fullName={wizard.fullName}
                  cccd={wizard.cccd}
                  dob={wizard.dob}
                  gender={wizard.gender}
                  address={wizard.address}
                  handleFileChange={wizard.ocr.handleFileChange}
                  handleRemoveFile={wizard.ocr.handleRemoveFile}
                  handleDragOver={wizard.ocr.handleDragOver}
                  handleDragLeave={wizard.ocr.handleDragLeave}
                  handleDrop={wizard.ocr.handleDrop}
                  onOpenQrModal={() => wizard.setShowCccdQrModal(true)}
                  onOpenPrintModal={() => wizard.setShowPrintModal(true)}
                  onNextStep={() => wizard.setFormWizardStep(2)}
                />
              </div>
            )}

            {wizard.formWizardStep === 2 && <FormStep2FillSection wizard={wizard} />}

            {wizard.formWizardStep === 3 && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-3 rounded-2xl border border-[#CBD5E1] shadow-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#B90E23]" />
                    <span className="text-xs sm:text-sm font-extrabold text-[#0F172A]">
                      Bước 3: Kết Quả Đối Chiếu Pháp Luật, Phiếu Hẹn QR & Xuất Mẫu A4
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => wizard.setFormWizardStep(2)}
                    className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-xs font-bold text-[#334155] flex items-center gap-1 cursor-pointer gov-focus-ring"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa lại tờ khai (Bước 2)</span>
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  <FormStep3PrecheckReport
                    currentWard={currentWard}
                    canonicalProcedureCode={wizard.canonicalProcedureCode}
                    precheckResult={wizard.precheckResult}
                    submittedDossier={wizard.submittedDossier}
                    isPrecheckDirty={wizard.isPrecheckDirty}
                    submitLoading={wizard.submitLoading}
                    submitError={wizard.submitError}
                    speakingId={speakingId}
                    toggleSpeech={toggleSpeech}
                    onEditStep2={() => wizard.setFormWizardStep(2)}
                    onSubmitDossier={() => void wizard.handleSubmitDossier()}
                    onOpenPrintModal={() => wizard.setShowPrintModal(true)}
                    onOpenTrackingTab={() => switchTab('tracking')}
                  />
                  <FormStep3QrPassAndInbox
                    currentWard={currentWard}
                    myDossiers={myDossiers}
                    setMyDossiers={setMyDossiers}
                    submittedDossier={wizard.submittedDossier}
                    trackingDossierCode={tracking.trackingDossierCode}
                    trackingLast4Cccd={tracking.trackingLast4Cccd}
                    qrPassRef={wizard.qrPassRef}
                    isExportingQrPass={wizard.isExportingQrPass}
                    onDownloadQrPassPdf={() => void wizard.handleDownloadQrPassPdf()}
                    emailNotifications={emailNotifications}
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'incident' && (
          <CivicIncidentTab
            currentWard={currentWard}
            manualWardCode={incident.manualWardCode}
            setManualWardCode={incident.setManualWardCode}
            handleGetLocation={incident.handleGetLocation}
            gpsLoading={incident.gpsLoading}
            handleSimulateCrossWardGps={incident.handleSimulateCrossWardGps}
            unverifiedSampleWard={incident.unverifiedSampleWard}
            locationSource={incident.locationSource}
            addressText={incident.addressText}
            setAddressText={incident.handleAddressTextChange}
            resolvedJurisdiction={incident.resolvedJurisdiction}
            manualWardSelectRef={incident.manualWardSelectRef}
            setLatitude={incident.setLatitude}
            setLongitude={incident.setLongitude}
            category={incident.category}
            setCategory={incident.setCategory}
            urgency={incident.urgency}
            setUrgency={incident.setUrgency}
            description={incident.description}
            setDescription={incident.setDescription}
            phoneInputRef={incident.phoneInputRef}
            reporterPhone={incident.reporterPhone}
            setReporterPhone={incident.setReporterPhone}
            phoneError={incident.phoneError}
            setPhoneError={incident.setPhoneError}
            isValidPhone={incident.isValidPhone}
            handleReport={incident.handleReport}
            reportLoading={incident.reportLoading}
            gpsScanBanner={incident.gpsScanBanner}
            gpsAccuracy={incident.gpsAccuracy}
            latitude={incident.latitude}
            longitude={incident.longitude}
            incidentMapContainerRef={incident.incidentMapContainerRef}
            reportResult={incident.reportResult}
            myIncidents={myIncidents}
            userGpsLocation={incident.userGpsLocation}
            onLocationChange={(lat, lon, src, acc) => {
              incident.setIncidentErrors((prev) => ({ ...prev, locationSource: '' }));
              incident.handleLocationChange(lat, lon, src, acc);
            }}
            onRecenterToGps={incident.handleRecenterToGps}
            isAddressManuallyEdited={incident.isAddressManuallyEdited}
            isGeocodingAddress={incident.isGeocodingAddress}
            onResetAddressFromPin={incident.handleResetAddressFromPin}
            incidentErrors={incident.incidentErrors}
            onClearIncidentError={(field) => incident.setIncidentErrors((prev) => ({ ...prev, [field]: '' }))}
            incidentPhotos={incident.incidentPhotos}
            onAddIncidentPhotos={incident.handleAddIncidentPhotos}
            onRemoveIncidentPhoto={incident.handleRemoveIncidentPhoto}
          />
        )}

        {activeTab === 'tracking' && (
          <DossierTrackingTab
            currentWard={currentWard}
            handleTrackDossier={tracking.handleTrackDossier}
            trackingDossierCode={tracking.trackingDossierCode}
            setTrackingDossierCode={tracking.setTrackingDossierCode}
            trackingLast4Cccd={tracking.trackingLast4Cccd}
            setTrackingLast4Cccd={tracking.setTrackingLast4Cccd}
            trackingError={tracking.trackingError}
            trackingLoading={tracking.trackingLoading}
            myDossiers={myDossiers}
            trackingResult={tracking.trackingResult}
            onSupplementSubmitted={(updated) => tracking.setTrackingResult(updated)}
            trackingFieldErrors={tracking.trackingFieldErrors}
            onClearTrackingError={(field) => tracking.setTrackingFieldErrors((prev) => ({ ...prev, [field]: '' }))}
          />
        )}

        {wizard.showPrintModal && (
          <React.Suspense fallback={null}>
            <A4DocumentModal
              isOpen={wizard.showPrintModal}
              onClose={() => wizard.setShowPrintModal(false)}
              formType={wizard.selectedFormType}
              procedureCode={
                wizard.selectedFormType === 'CT01' ? 'TTHC-CR-01'
                  : wizard.selectedFormType === 'TK-KS' ? 'TTHC-HT-01'
                  : wizard.selectedFormType === 'TK-KH' ? (wizard.marriageMode === 'MARRIAGE_REGISTRATION' ? 'TTHC-HT-02' : 'TTHC-HT-11')
                  : 'TTHC-BT-01'
              }
              marriageMode={wizard.marriageMode}
              procedureTitle={
                wizard.selectedFormType === 'CT01'
                  ? 'Tờ khai thay đổi thông tin cư trú (Mẫu CT01 - TT 66/2023 & TT 53/2025/TT-BCA)'
                  : wizard.selectedFormType === 'TK-KS'
                  ? 'Tờ khai đăng ký khai sinh (Phụ lục 5 - Thông tư 04/2024/TT-BTP & TT 04/2020/TT-BTP)'
                  : wizard.selectedFormType === 'TK-KH'
                  ? (wizard.marriageMode === 'MARRIAGE_REGISTRATION'
                      ? 'Tờ khai đăng ký kết hôn (Phụ lục 5 - Thông tư 04/2024/TT-BTP)'
                      : 'Tờ khai cấp Giấy xác nhận tình trạng hôn nhân (Phụ lục 5 - Thông tư 04/2024/TT-BTP)')
                  : 'Tờ khai thông tin đề nghị trợ cấp xã hội (Nghị định 20/2021/NĐ-CP, NĐ 76/2024 & Luật BHXH 2024)'
              }
              legalBasis={
                wizard.selectedFormType === 'CT01' ? 'Theo Thông tư số 66/2023/TT-BCA & Thông tư số 53/2025/TT-BCA của Bộ Công an'
                  : wizard.selectedFormType === 'TK-KS' ? 'Theo Thông tư số 04/2024/TT-BTP (sửa đổi, bổ sung Thông tư số 04/2020/TT-BTP) của Bộ Tư pháp'
                  : wizard.selectedFormType === 'TK-KH' ? 'Theo Luật Hôn nhân và Gia đình 2014 & Thông tư 04/2024/TT-BTP (sửa đổi TT 04/2020/TT-BTP)'
                  : 'Theo Nghị định số 20/2021/NĐ-CP, Nghị định số 76/2024/NĐ-CP & Luật BHXH 2024'
              }
              initialData={{
                fullName: wizard.fullName, gender: wizard.gender, dob: wizard.dob, idNumber: wizard.cccd,
                phone: wizard.phoneNumber, address: wizard.address,
                hostName: wizard.hostName, hostCccd: wizard.hostCccd, hostRelation: wizard.hostRelation, declarationScope: wizard.declarationScope,
                childName: wizard.selectedFormType === 'TK-KS' ? wizard.fullName : undefined,
                birthDate: wizard.selectedFormType === 'TK-KS' ? wizard.dob : undefined,
                birthPlace: wizard.childBirthPlace, childEthnicity: wizard.childEthnicity, childNationality: wizard.childNationality,
                birthCertNumber: wizard.birthCertNumber, birthCertIssueDate: wizard.birthCertIssueDate,
                fatherName: wizard.fatherName, fatherDob: wizard.fatherDob, fatherResidence: wizard.fatherResidence,
                motherName: wizard.motherName, motherDob: wizard.motherDob, motherResidence: wizard.motherResidence,
                spouseName: wizard.partnerName, spouseDob: wizard.partnerDob, spouseGender: wizard.partnerGender,
                spouseIdNumber: wizard.partnerCccd, spouseAddress: wizard.partnerAddress,
                applicantEthnicity: wizard.applicantEthnicity, spouseEthnicity: wizard.partnerEthnicity,
                applicantNationality: wizard.applicantNationality, spouseNationality: wizard.partnerNationality,
                applicantMarriageCount: wizard.applicantMarriageCount, spouseMarriageCount: wizard.partnerMarriageCount,
                issueDate: wizard.issueDate, maritalCertPurpose: wizard.maritalCertPurpose,
                divorceJudgmentNumber: wizard.divorceJudgmentNumber, divorceJudgmentDate: wizard.divorceJudgmentDate,
                deathCertNumber: wizard.deathCertNumber, deathCertDate: wizard.deathCertDate,
                householdStatus: wizard.householdStatus, poorHouseholdBookNumber: wizard.poorHouseholdBookNumber,
                disabilityLevel: wizard.disabilityLevel, disabilityCertNumber: wizard.disabilityCertNumber,
                disabilityCertIssueDate: wizard.disabilityCertIssueDate, disabilityCertIssuer: wizard.disabilityCertIssuer,
                bankAccount: wizard.bankAccount, guardianName: wizard.guardianName, guardianCccd: wizard.guardianCccd,
                guardianRelation: wizard.guardianRelation, guardianPhone: wizard.guardianPhone,
                socialTargetGroup: wizard.socialTargetGroup, hasBhyt: wizard.hasBhyt, bhytNumber: wizard.bhytNumber, paymentMethod: wizard.paymentMethod,
              }}
            />
          </React.Suspense>
        )}

        <CccdQrScannerModal
          isOpen={wizard.showCccdQrModal}
          onClose={() => wizard.setShowCccdQrModal(false)}
          onScanSuccess={wizard.handleCccdQrSuccess}
          currentFormData={{
            cccd: wizard.cccd, fullName: wizard.fullName, dob: wizard.dob,
            gender: wizard.gender, address: wizard.address, issueDate: wizard.issueDate,
          }}
        />
      </div>
    </main>
  );
};

export default FormAndIssueReporting;
