import React from 'react';
import { BookmarkCheck, CheckSquare, PlayCircle, Save, ShieldAlert, Square, Trash2 } from 'lucide-react';
import { REQUIRED_DOCS_CHECKLIST, type DurableFormDraftMeta } from './useFormDraftStorage';
import type { CitizenFormType } from './useFormOcrUpload';

interface FormDraftBannerProps {
  selectedFormType: CitizenFormType;
  currentWardCode: string;
  formWizardStep: 1 | 2 | 3;
  savedDraftMeta: DurableFormDraftMeta | null;
  preparedDocs: string[];
  draftNotice: string | null;
  hasSubmittedDossier: boolean;
  onTogglePreparedDoc: (doc: string) => void;
  onSaveForLater: () => void;
  onResumeDraft: () => void;
  onClearDraft: () => void;
}

export const FormDraftBanner: React.FC<FormDraftBannerProps> = ({
  selectedFormType,
  currentWardCode,
  formWizardStep,
  savedDraftMeta,
  preparedDocs,
  draftNotice,
  hasSubmittedDossier,
  onTogglePreparedDoc,
  onSaveForLater,
  onResumeDraft,
  onClearDraft,
}) => {
  if (hasSubmittedDossier) return null;

  const docs = REQUIRED_DOCS_CHECKLIST[selectedFormType] || [];
  const canResumeDifferentState = Boolean(
    savedDraftMeta &&
      (savedDraftMeta.formType !== selectedFormType ||
        savedDraftMeta.wardCode !== currentWardCode ||
        savedDraftMeta.wizardStep !== formWizardStep)
  );

  return (
    <div className="p-4 rounded-2xl bg-white border border-[#CBD5E1] shadow-2xs flex flex-col gap-3">
      {/* Resume Saved Draft Prompt */}
      {savedDraftMeta && canResumeDifferentState && (
        <div className="p-3 rounded-xl bg-teal-50/90 border border-teal-200 flex flex-wrap items-center justify-between gap-2.5 text-xs text-teal-950">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4 text-[#00796B] shrink-0" />
            <span>
              Bạn có hồ sơ đang làm dở: <strong>Mẫu {savedDraftMeta.formType}</strong> •{' '}
              <strong>UBND {savedDraftMeta.wardName}</strong> (Bước {savedDraftMeta.wizardStep}, lưu lúc{' '}
              {new Date(savedDraftMeta.savedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onResumeDraft}
              className="px-3 py-1.5 rounded-lg bg-[#00796B] hover:bg-[#00695C] text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-2xs gov-focus-ring"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Tiếp tục hồ sơ đang làm</span>
            </button>
          </div>
        </div>
      )}

      {/* Prepared Documents Checklist + Save / Clear Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-xs font-extrabold text-[#0F2942]">
            Giấy tờ cần chuẩn bị ({selectedFormType}) — Đánh dấu để ghi nhớ tiến độ:
          </span>
          <div className="flex flex-wrap gap-2">
            {docs.map((doc) => {
              const checked = preparedDocs.includes(doc);
              return (
                <button
                  key={doc}
                  type="button"
                  onClick={() => onTogglePreparedDoc(doc)}
                  aria-pressed={checked}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer gov-focus-ring text-left ${
                    checked
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {checked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span>{doc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
          <button
            type="button"
            onClick={onSaveForLater}
            className="px-3.5 py-2 rounded-xl bg-[#0F2942] hover:bg-[#1E3A5F] text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs gov-focus-ring"
          >
            <Save className="w-3.5 h-3.5 text-sky-300" />
            <span>Lưu để làm sau</span>
          </button>

          <button
            type="button"
            onClick={onClearDraft}
            className="px-3 py-2 rounded-xl bg-white hover:bg-red-50 text-[#991B1B] border border-[#FECACA] text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer gov-focus-ring"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa bản nháp</span>
          </button>
        </div>
      </div>

      {/* Explicit Privacy & Draft Scope Notice */}
      {draftNotice && (
        <div
          role="status"
          className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-[11px] text-amber-950 flex items-start gap-2 leading-relaxed"
        >
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>{draftNotice}</span>
        </div>
      )}
    </div>
  );
};
