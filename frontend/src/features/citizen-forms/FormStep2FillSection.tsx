import { PaperFields } from './PaperFields';
import React from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  FileCheck2,
  FileText,
  QrCode,
} from 'lucide-react';
import { SpecializedFormFields } from './SpecializedFormFields';
import { FormStep2ContactAndSubmit } from './FormStep2ContactAndSubmit';
import type { useFormPrecheckWizard } from './useFormPrecheckWizard';

interface FormStep2FillSectionProps {
  wizard: ReturnType<typeof useFormPrecheckWizard>;
}

export const FormStep2FillSection: React.FC<FormStep2FillSectionProps> = ({ wizard }) => {
  const {
    selectedFormType, setFormWizardStep, setShowCccdQrModal, qrDiscrepancies,
    fullName, setFullName, cccd, setCccd, dob, setDob, gender, setGender,
    address, setAddress, citizenEmail, setCitizenEmail, phoneNumber, setPhoneNumber,
    formErrors, setFormErrors, submitError, formLoading, handlePrecheck, setShowPrintModal,
    dossierFullNameInputRef, dossierCccdInputRef, dossierDobInputRef,
    dossierAddressInputRef, dossierEmailInputRef, dossierPhoneInputRef,
    ocr,
  } = wizard;

  const visionBlocked = Boolean(
    ocr.visionGateResult &&
      (ocr.visionGateResult.isBlurry ||
        ocr.visionGateResult.isTooDark ||
        ocr.visionGateResult.isGlared ||
        !ocr.visionGateResult.templateMatched)
  );

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E8F0] gap-3">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-[#B90E23]" />
          <div>
            <h2 className="text-sm font-extrabold text-[#0F172A]">Bước 2: Nhập tờ khai ({selectedFormType})</h2>
            <span className="text-[11px] text-[#475569]">Điền đủ thông tin bắt buộc trước khi kiểm tra.</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setFormWizardStep(1)}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-xs font-bold text-[#334155] flex items-center gap-1 cursor-pointer gov-focus-ring"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Bước 1</span>
        </button>
      </div>

      <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-[#750715]">Điền nhanh từ thẻ CCCD:</span>
        <button
          type="button"
          onClick={() => setShowCccdQrModal(true)}
          className="px-3.5 py-1.5 rounded-lg bg-[#B90E23] hover:bg-[#8F0A1B] text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs gov-focus-ring"
          title="Mở camera hoặc tải ảnh để quét mã QR trên thẻ CCCD thật"
        >
          <QrCode className="w-4 h-4" />
          <span>{selectedFormType === 'TK-KS' ? 'Quét CCCD người đi khai' : 'Quét QR CCCD'}</span>
        </button>
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <div className="flex items-center justify-between">
            <label htmlFor="p3-full-name" className="text-xs font-bold text-[#334155]">
              {selectedFormType === 'TK-KS' ? '1. Họ và tên trẻ:' : selectedFormType === 'TK-KH' ? '1. Họ và tên người yêu cầu:' : selectedFormType === 'TK-BTXH' ? '1. Họ và tên người thụ hưởng:' : '1. Họ và tên khai sinh:'}
            </label>
            {ocr.ocrSuccess && fullName ? (
              <span className="text-[10px] text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded-full font-bold border border-[#A7F3D0] inline-flex items-center gap-1">
                <Check className="w-3 h-3 text-[#065F46]" /> Đã tự điền
              </span>
            ) : ocr.ocrSuccess && !fullName ? (
              <span className="text-[10px] text-[#92400E] bg-[#FFFBEB] px-2 py-0.5 rounded-full font-semibold border border-[#FDE68A]">
                Chưa thấy mục 1 (Họ tên) - vui lòng điền tay
              </span>
            ) : null}
          </div>
          <input
            id="p3-full-name"
            ref={dossierFullNameInputRef}
            type="text"
            value={fullName}
            placeholder="Ví dụ: NGUYỄN TÚ"
            onChange={(e) => {
              setFullName(e.target.value);
              if (formErrors.fullName) setFormErrors((prev) => ({ ...prev, fullName: '' }));
            }}
            aria-invalid={Boolean(formErrors.fullName)}
            className={`w-full h-10 px-3.5 rounded-xl border text-xs md:text-sm text-[#0F172A] focus:outline-none focus:bg-white transition-all ${
              formErrors.fullName ? 'border-red-500 bg-red-50/40 ring-2 ring-red-200' : ocr.ocrSuccess && fullName ? 'border-[#10B981]/60 bg-[#F0FDF4]/30 font-semibold focus:border-[#B90E23]' : 'bg-[#F8FAFC] border-[#CBD5E1] focus:border-[#B90E23]'
            }`}
          />
          {formErrors.fullName && <p role="alert" className="text-xs font-medium text-red-700 mt-0.5">{formErrors.fullName}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="p3-cccd" className="text-xs font-bold text-[#334155]">
              {selectedFormType === 'TK-KS' ? '2. Số CCCD người đi khai (12 số):' : '2. Số CCCD (12 số):'}
            </label>
            {ocr.ocrSuccess && cccd ? (
              <span className="text-[10px] text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded-full font-bold border border-[#A7F3D0] inline-flex items-center gap-1">
                <Check className="w-3 h-3 text-[#065F46]" /> Đã nhận ({cccd.length} số)
              </span>
            ) : null}
          </div>
          <input
            id="p3-cccd"
            ref={dossierCccdInputRef}
            type="text"
            value={cccd}
            maxLength={12}
            placeholder="12 chữ số định danh cá nhân"
            onChange={(e) => {
              setCccd(e.target.value);
              if (formErrors.cccd) setFormErrors((prev) => ({ ...prev, cccd: '' }));
            }}
            aria-invalid={Boolean(formErrors.cccd)}
            className={`w-full h-10 px-3.5 rounded-xl border font-mono text-xs md:text-sm font-bold focus:outline-none focus:bg-white transition-all tracking-wider ${
              formErrors.cccd ? 'border-red-500 bg-red-50/40 ring-2 ring-red-200 text-red-900' : ocr.ocrSuccess && cccd ? 'border-[#10B981]/60 bg-[#F0FDF4]/30 text-[#750715] focus:border-[#B90E23]' : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#750715] focus:border-[#B90E23]'
            }`}
          />
          {formErrors.cccd && <p role="alert" className="text-xs font-medium text-red-700 mt-0.5">{formErrors.cccd}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="p3-dob" className="text-xs font-bold text-[#334155]">
              {selectedFormType === 'TK-KS' ? '3. Ngày sinh trẻ:' : selectedFormType === 'TK-KH' ? '3. Ngày sinh (Nam ≥ 20, Nữ ≥ 18):' : selectedFormType === 'TK-BTXH' ? '3. Ngày sinh (≥ 75 tuổi):' : '3. Ngày sinh:'}
            </label>
            {ocr.ocrSuccess && dob ? (
              <span className="text-[10px] text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded-full font-bold border border-[#A7F3D0] inline-flex items-center gap-1">
                <Check className="w-3 h-3 text-[#065F46]" /> Đã tự điền
              </span>
            ) : null}
          </div>
          <input
            id="p3-dob"
            ref={dossierDobInputRef}
            type="date"
            value={dob}
            onChange={(e) => {
              setDob(e.target.value);
              if (formErrors.dob) setFormErrors((prev) => ({ ...prev, dob: '' }));
            }}
            aria-invalid={Boolean(formErrors.dob)}
            className={`w-full h-10 px-3.5 rounded-xl border text-xs md:text-sm text-[#0F172A] focus:outline-none focus:bg-white transition-all ${
              formErrors.dob ? 'border-red-500 bg-red-50/40 ring-2 ring-red-200' : ocr.ocrSuccess && dob ? 'border-[#10B981]/60 bg-[#F0FDF4]/30 font-semibold focus:border-[#B90E23]' : 'bg-[#F8FAFC] border-[#CBD5E1] focus:border-[#B90E23]'
            }`}
          />
          {formErrors.dob && <p role="alert" className="text-xs font-medium text-red-700 mt-0.5">{formErrors.dob}</p>}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <div className="flex items-center justify-between">
            <span id="p3-gender-label" className="text-xs font-bold text-[#334155]">4. Giới tính:</span>
            {ocr.ocrSuccess && gender ? (
              <span className="text-[10px] text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded-full font-bold border border-[#A7F3D0] inline-flex items-center gap-1">
                <Check className="w-3 h-3 text-[#065F46]" /> Đã tự điền ({gender})
              </span>
            ) : null}
          </div>
          <div role="radiogroup" aria-labelledby="p3-gender-label" className="flex items-center gap-4">
            {(['Nam', 'Nữ'] as const).map((g) => (
              <label key={g} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0F172A]">
                <input type="radio" name="ct01_gender" value={g} checked={gender === g} onChange={(e) => setGender(e.target.value)} className="text-[#B90E23] focus:ring-[#B90E23]" />
                <span>{g}</span>
              </label>
            ))}
          </div>
        </div>

        <SpecializedFormFields
          selectedFormType={selectedFormType}
          ocrSuccess={ocr.ocrSuccess}
          fullName={fullName}
          cccd={cccd}
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          declarationScope={wizard.declarationScope}
          setDeclarationScope={wizard.setDeclarationScope}
          hostName={wizard.hostName}
          setHostName={wizard.setHostName}
          hostCccd={wizard.hostCccd}
          setHostCccd={wizard.setHostCccd}
          hostRelation={wizard.hostRelation}
          setHostRelation={wizard.setHostRelation}
          parentsMarried={wizard.parentsMarried}
          setParentsMarried={wizard.setParentsMarried}
          hospitalBirthDate={wizard.hospitalBirthDate}
          setHospitalBirthDate={wizard.setHospitalBirthDate}
          childEthnicity={wizard.childEthnicity}
          setChildEthnicity={wizard.setChildEthnicity}
          childNationality={wizard.childNationality}
          setChildNationality={wizard.setChildNationality}
          childBirthPlace={wizard.childBirthPlace}
          setChildBirthPlace={wizard.setChildBirthPlace}
          birthCertNumber={wizard.birthCertNumber}
          setBirthCertNumber={wizard.setBirthCertNumber}
          birthCertIssueDate={wizard.birthCertIssueDate}
          setBirthCertIssueDate={wizard.setBirthCertIssueDate}
          motherName={wizard.motherName}
          setMotherName={wizard.setMotherName}
          hospitalMotherName={wizard.hospitalMotherName}
          setHospitalMotherName={wizard.setHospitalMotherName}
          motherResidence={wizard.motherResidence}
          setMotherResidence={wizard.setMotherResidence}
          fatherName={wizard.fatherName}
          setFatherName={wizard.setFatherName}
          fatherResidence={wizard.fatherResidence}
          setFatherResidence={wizard.setFatherResidence}
          marriageMode={wizard.marriageMode}
          setMarriageMode={wizard.setMarriageMode}
          partnerName={wizard.partnerName}
          setPartnerName={wizard.setPartnerName}
          partnerCccd={wizard.partnerCccd}
          setPartnerCccd={wizard.setPartnerCccd}
          partnerDob={wizard.partnerDob}
          setPartnerDob={wizard.setPartnerDob}
          partnerGender={wizard.partnerGender}
          setPartnerGender={wizard.setPartnerGender}
          applicantEthnicity={wizard.applicantEthnicity}
          setApplicantEthnicity={wizard.setApplicantEthnicity}
          partnerEthnicity={wizard.partnerEthnicity}
          setPartnerEthnicity={wizard.setPartnerEthnicity}
          applicantMarriageCount={wizard.applicantMarriageCount}
          setApplicantMarriageCount={wizard.setApplicantMarriageCount}
          partnerMarriageCount={wizard.partnerMarriageCount}
          setPartnerMarriageCount={wizard.setPartnerMarriageCount}
          partnerAddress={wizard.partnerAddress}
          setPartnerAddress={wizard.setPartnerAddress}
          maritalCertPurpose={wizard.maritalCertPurpose}
          setMaritalCertPurpose={wizard.setMaritalCertPurpose}
          previousMaritalStatus={wizard.previousMaritalStatus}
          setPreviousMaritalStatus={wizard.setPreviousMaritalStatus}
          divorceJudgmentNumber={wizard.divorceJudgmentNumber}
          setDivorceJudgmentNumber={wizard.setDivorceJudgmentNumber}
          divorceJudgmentDate={wizard.divorceJudgmentDate}
          setDivorceJudgmentDate={wizard.setDivorceJudgmentDate}
          deathCertNumber={wizard.deathCertNumber}
          setDeathCertNumber={wizard.setDeathCertNumber}
          deathCertDate={wizard.deathCertDate}
          setDeathCertDate={wizard.setDeathCertDate}
          householdStatus={wizard.householdStatus}
          setHouseholdStatus={wizard.setHouseholdStatus}
          disabilityLevel={wizard.disabilityLevel}
          setDisabilityLevel={wizard.setDisabilityLevel}
          poorHouseholdBookNumber={wizard.poorHouseholdBookNumber}
          setPoorHouseholdBookNumber={wizard.setPoorHouseholdBookNumber}
          disabilityCertNumber={wizard.disabilityCertNumber}
          setDisabilityCertNumber={wizard.setDisabilityCertNumber}
          disabilityCertIssueDate={wizard.disabilityCertIssueDate}
          setDisabilityCertIssueDate={wizard.setDisabilityCertIssueDate}
          disabilityCertIssuer={wizard.disabilityCertIssuer}
          setDisabilityCertIssuer={wizard.setDisabilityCertIssuer}
          guardianName={wizard.guardianName}
          setGuardianName={wizard.setGuardianName}
          guardianCccd={wizard.guardianCccd}
          setGuardianCccd={wizard.setGuardianCccd}
          guardianRelation={wizard.guardianRelation}
          setGuardianRelation={wizard.setGuardianRelation}
          guardianPhone={wizard.guardianPhone}
          setGuardianPhone={wizard.setGuardianPhone}
          bankAccount={wizard.bankAccount}
          setBankAccount={wizard.setBankAccount}
          socialTargetGroup={wizard.socialTargetGroup}
          setSocialTargetGroup={wizard.setSocialTargetGroup}
          hasBhyt={wizard.hasBhyt}
          setHasBhyt={wizard.setHasBhyt}
          bhytNumber={wizard.bhytNumber}
          setBhytNumber={wizard.setBhytNumber}
          paymentMethod={wizard.paymentMethod}
          setPaymentMethod={wizard.setPaymentMethod}
        />

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <div className="flex items-center justify-between">
            <label htmlFor="p3-address" className="text-xs font-bold text-[#334155]">
              {selectedFormType === 'TK-KS' ? '5. Nơi cư trú của người đi khai:' : selectedFormType === 'TK-KH' ? '5. Địa chỉ cư trú:' : selectedFormType === 'TK-BTXH' ? '5. Địa chỉ thường trú:' : '5. Địa chỉ đăng ký cư trú:'}
            </label>
            {ocr.ocrSuccess && address ? (
              <span className="text-[10px] text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded-full font-bold border border-[#A7F3D0] inline-flex items-center gap-1">
                <Check className="w-3 h-3 text-[#065F46]" /> Đã tự điền
              </span>
            ) : null}
          </div>
          <input
            id="p3-address"
            ref={dossierAddressInputRef}
            type="text"
            value={address}
            placeholder="Ví dụ: 32/3 Ích, Khu phố 12, Phường..., Tỉnh An Giang"
            onChange={(e) => {
              setAddress(e.target.value);
              if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: '' }));
            }}
            aria-invalid={Boolean(formErrors.address)}
            className={`w-full h-10 px-3.5 rounded-xl border text-xs md:text-sm text-[#0F172A] focus:outline-none focus:bg-white transition-all ${
              formErrors.address ? 'border-red-500 bg-red-50/40 ring-2 ring-red-200' : ocr.ocrSuccess && address ? 'border-[#10B981]/60 bg-[#F0FDF4]/30 font-semibold focus:border-[#B90E23]' : 'bg-[#F8FAFC] border-[#CBD5E1] focus:border-[#B90E23]'
            }`}
          />
          {(selectedFormType !== 'TK-KH' || wizard.marriageMode === 'MARRIAGE_REGISTRATION') && <PaperFields address={address} fullName={fullName} form={selectedFormType} draft={wizard.paper} onChange={wizard.setPaper} married={wizard.parentsMarried} existing={
            ["hostRelation","declarationScope","motherResidence","fatherResidence","childEthnicity","childNationality","childBirthPlace","birthCertNumber","birthCertIssueDate","applicantEthnicity","partnerEthnicity","applicantMarriageCount","partnerMarriageCount","partnerAddress"]
          } />}
          {formErrors.address && <p role="alert" className="text-xs font-medium text-red-700 mt-0.5">{formErrors.address}</p>}
        </div>

        <div className="sm:col-span-2 p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-start gap-2.5 text-xs text-[#166534]">
          <FileText className="w-4 h-4 text-[#065F46] shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-bold">
              {selectedFormType === 'TK-KS' ? 'Lưu ý Khai sinh (TT 04/2020/TT-BTP):' : selectedFormType === 'TK-KH' ? 'Lưu ý Kết hôn (Luật HNGĐ 2014):' : selectedFormType === 'TK-BTXH' ? 'Lưu ý Bảo trợ (Luật BHXH 2024):' : 'Lưu ý Mẫu CT01 (TT 66/2023/TT-BCA):'}
            </span>
            <span className="text-[11px] text-[#166534]">
              {selectedFormType === 'TK-KS' ? 'Tên, ngày sinh của trẻ và mẹ phải khớp đúng Giấy chứng sinh bản chính.' : selectedFormType === 'TK-KH' ? 'Nam đủ 20 tuổi, Nữ đủ 18 tuổi; giấy độc thân có hạn 6 tháng và nêu rõ mục đích.' : selectedFormType === 'TK-BTXH' ? 'Áp dụng từ đủ 75 tuổi (hộ nghèo/cận nghèo 70–74 tuổi) hoặc khuyết tật nặng kèm STK.' : 'Mẫu CT01 (TT 66/2023/TT-BCA) không yêu cầu Ngày cấp CCCD.'}
            </span>
          </div>
        </div>
      </div>

      <FormStep2ContactAndSubmit
        citizenEmail={citizenEmail}
        setCitizenEmail={setCitizenEmail}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        formErrors={formErrors}
        setFormErrors={setFormErrors}
        dossierEmailInputRef={dossierEmailInputRef}
        dossierPhoneInputRef={dossierPhoneInputRef}
        submitError={submitError}
        formLoading={formLoading}
        visionBlocked={visionBlocked}
        onBackStep1={() => setFormWizardStep(1)}
        onOpenPrintModal={() => setShowPrintModal(true)}
        onPrecheck={() => void handlePrecheck()}
      />
    </div>
  );
};
