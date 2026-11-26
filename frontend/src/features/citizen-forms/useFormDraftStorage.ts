import { useCallback, useEffect, useState } from 'react';
import type { CitizenFormType } from './useFormOcrUpload';

export const DRAFT_META_STORAGE_KEY = 'smartward_form_draft_meta_v1';
export const DRAFT_SESSION_PII_KEY = 'smartward_form_session_pii_v1';

export interface DurableFormDraftMeta {
  formType: CitizenFormType;
  procedureCode: string;
  wardCode: string;
  wardName: string;
  wizardStep: 1 | 2 | 3;
  preparedDocs: string[];
  parentsMarried?: 'YES' | 'NO';
  marriageMode?: 'MARRIAGE_REGISTRATION' | 'MARITAL_STATUS_CONFIRMATION';
  savedAt: string;
}

export interface SessionFormPiiSnapshot {
  formType: CitizenFormType;
  fullName: string;
  cccd: string;
  dob: string;
  gender: string;
  issueDate: string;
  address: string;
  phoneNumber: string;
  citizenEmail: string;
  hospitalBirthDate: string;
  motherName: string;
  hospitalMotherName: string;
  motherResidence: string;
  fatherName: string;
  fatherResidence: string;
  childBirthPlace: string;
  birthCertNumber: string;
  birthCertIssueDate: string;
}

export const REQUIRED_DOCS_CHECKLIST: Record<CitizenFormType, string[]> = {
  'TK-KS': [
    'Bản chính Giấy chứng sinh do cơ sở y tế cấp',
    'Thẻ CCCD gắn chip hoặc VNeID mức 2 của cha/mẹ',
    'Giấy chứng nhận đăng ký kết hôn (nếu cha mẹ đã kết hôn)',
  ],
  CT01: [
    'Thẻ CCCD gắn chip của người kê khai và chủ hộ',
    'Giấy tờ chứng minh chỗ ở hợp pháp (Sổ hồng / Hợp đồng thuê)',
    'Ý kiến đồng ý của chủ hộ (trên tờ khai hoặc qua VNeID)',
  ],
  'TK-KH': [
    'Thẻ CCCD gắn chip của hai bên nam, nữ',
    'Giấy xác nhận tình trạng hôn nhân (nếu cư trú khác xã)',
    'Bản án/Quyết định ly hôn hoặc Giấy chứng tử (nếu kết hôn lại)',
  ],
  'TK-BTXH': [
    'Thẻ CCCD gắn chip của người thụ hưởng (và người giám hộ nếu có)',
    'Giấy xác nhận mức độ khuyết tật hoặc Sổ hộ nghèo/cận nghèo (nếu thuộc diện)',
    'Số tài khoản ngân hàng chính chủ nhận trợ cấp Đề án 06',
  ],
};

export function readDurableDraftMeta(): DurableFormDraftMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_META_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DurableFormDraftMeta;
    if (!parsed || !parsed.formType || !parsed.wardCode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readSessionPiiSnapshot(): SessionFormPiiSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_SESSION_PII_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionFormPiiSnapshot;
  } catch {
    return null;
  }
}

export function useFormDraftStorage(params: {
  selectedFormType: CitizenFormType;
  canonicalProcedureCode: string;
  wardCode: string;
  wardName: string;
  formWizardStep: 1 | 2 | 3;
  parentsMarried: 'YES' | 'NO';
  marriageMode: 'MARRIAGE_REGISTRATION' | 'MARITAL_STATUS_CONFIRMATION';
  sessionSnapshot: SessionFormPiiSnapshot;
  submittedDossierCode?: string | null;
  onRestoreDraft: (meta: DurableFormDraftMeta, pii: SessionFormPiiSnapshot | null) => void;
  onClearFields: () => void;
}) {
  const {
    selectedFormType, canonicalProcedureCode, wardCode, wardName, formWizardStep,
    parentsMarried, marriageMode, sessionSnapshot, submittedDossierCode,
    onRestoreDraft, onClearFields,
  } = params;

  const [savedDraftMeta, setSavedDraftMeta] = useState<DurableFormDraftMeta | null>(() => readDurableDraftMeta());
  const [preparedDocs, setPreparedDocs] = useState<string[]>(() => readDurableDraftMeta()?.preparedDocs || []);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [hasRestoredSession, setHasRestoredSession] = useState(false);

  // Restore active-tab session PII automatically on reload within the same tab
  useEffect(() => {
    if (hasRestoredSession) return;
    setHasRestoredSession(true);
    const pii = readSessionPiiSnapshot();
    const meta = readDurableDraftMeta();
    if (pii && pii.formType === selectedFormType) {
      onRestoreDraft(
        meta || {
          formType: pii.formType,
          procedureCode: canonicalProcedureCode,
          wardCode,
          wardName,
          wizardStep: 2,
          preparedDocs: [],
          savedAt: new Date().toISOString(),
        },
        pii
      );
    }
  }, [hasRestoredSession, selectedFormType, canonicalProcedureCode, wardCode, wardName, onRestoreDraft]);

  // Keep current-tab sessionStorage synced while typing (wiped automatically on tab close or submit)
  useEffect(() => {
    if (typeof window === 'undefined' || submittedDossierCode) return;
    const hasAnyInput = Boolean(
      sessionSnapshot.fullName ||
        sessionSnapshot.cccd ||
        sessionSnapshot.dob ||
        sessionSnapshot.address ||
        sessionSnapshot.motherName ||
        sessionSnapshot.birthCertNumber
    );
    if (!hasAnyInput) return;
    try {
      window.sessionStorage.setItem(DRAFT_SESSION_PII_KEY, JSON.stringify(sessionSnapshot));
    } catch {
      // ignore storage quota errors
    }
  }, [sessionSnapshot, submittedDossierCode]);

  // Once dossier is officially accepted by Backend, clear draft state automatically
  useEffect(() => {
    if (!submittedDossierCode || typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(DRAFT_META_STORAGE_KEY);
      window.sessionStorage.removeItem(DRAFT_SESSION_PII_KEY);
      setSavedDraftMeta(null);
      setDraftNotice(null);
    } catch {
      // ignore
    }
  }, [submittedDossierCode]);

  const togglePreparedDoc = useCallback((docLabel: string) => {
    setPreparedDocs((prev) =>
      prev.includes(docLabel) ? prev.filter((d) => d !== docLabel) : [...prev, docLabel]
    );
  }, []);

  const handleSaveForLater = useCallback(() => {
    if (typeof window === 'undefined') return;
    const meta: DurableFormDraftMeta = {
      formType: selectedFormType,
      procedureCode: canonicalProcedureCode,
      wardCode,
      wardName,
      wizardStep: formWizardStep === 3 ? 2 : formWizardStep,
      preparedDocs,
      parentsMarried,
      marriageMode,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_META_STORAGE_KEY, JSON.stringify(meta));
    window.sessionStorage.setItem(DRAFT_SESSION_PII_KEY, JSON.stringify(sessionSnapshot));
    setSavedDraftMeta(meta);
    setDraftNotice(
      'Đã lưu tiến độ (mẫu tờ khai, địa bàn, bước đang làm và giấy tờ đã chuẩn bị). ' +
        'Lưu ý bảo mật (Luật 91/2025/QH15): Họ tên, CCCD, ngày sinh, địa chỉ và ảnh đính kèm chỉ giữ trong phiên mở trang hiện tại — nếu đóng trình duyệt mở lại sau, bạn sẽ nhập/đính kèm lại các mục cá nhân này.'
    );
  }, [
    selectedFormType, canonicalProcedureCode, wardCode, wardName,
    formWizardStep, preparedDocs, parentsMarried, marriageMode, sessionSnapshot,
  ]);

  const handleResumeSavedDraft = useCallback(() => {
    const meta = readDurableDraftMeta();
    if (!meta) return;
    const pii = readSessionPiiSnapshot();
    setPreparedDocs(meta.preparedDocs || []);
    onRestoreDraft(meta, pii && pii.formType === meta.formType ? pii : null);
    setDraftNotice(
      pii && pii.formType === meta.formType
        ? `Đã khôi phục hồ sơ nháp ${meta.formType} (${meta.wardName}) tại Bước ${meta.wizardStep}.`
        : `Đã khôi phục mẫu ${meta.formType} (${meta.wardName}) tại Bước ${meta.wizardStep} và danh sách giấy tờ. Vui lòng nhập lại Họ tên, CCCD, ngày sinh, địa chỉ (không lưu lâu dài trên máy để bảo vệ dữ liệu cá nhân).`
    );
  }, [onRestoreDraft]);

  const handleClearDraft = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DRAFT_META_STORAGE_KEY);
      window.sessionStorage.removeItem(DRAFT_SESSION_PII_KEY);
    }
    setSavedDraftMeta(null);
    setPreparedDocs([]);
    setDraftNotice('Đã xóa toàn bộ bản nháp và dữ liệu đang nhập trong phiên hiện tại.');
    onClearFields();
  }, [onClearFields]);

  return {
    savedDraftMeta,
    preparedDocs,
    draftNotice,
    setDraftNotice,
    togglePreparedDoc,
    handleSaveForLater,
    handleResumeSavedDraft,
    handleClearDraft,
  };
}
