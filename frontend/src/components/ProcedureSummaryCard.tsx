import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileDown,
  FilePenLine,
  FileText,
  Scale,
} from 'lucide-react';
import type { WardItem } from '../data/anGiangWards';
import { resolveSupportedFormTypeByProcedure } from '../features/citizen-forms/procedureFormMap';

const DEFAULT_WORKING_HOURS = 'Sáng: 07:00 – 11:00 | Chiều: 13:00 – 17:00 (Thứ 2 – Thứ 6)';

export interface ProcedureSummaryCardProps {
  procedureCode: string;
  procedureName: string;
  category?: string;
  feeLabel?: string;
  isFeeExempt?: boolean;
  supportedFormType?: string | null;
  requiredDocsSummary?: string[];
  legalBasis?: string;
  ward: WardItem;
  compact?: boolean;
  onStartForm: (procedureCode: string, supportedFormType: string, wardCode: string) => void;
  onViewDocsAndOffice: (procedureCode: string) => void;
}

/**
 * Shared Procedure Summary Card used across both Legal Assistant Chat and Procedures Catalog (TASK-052).
 * - Renders "Bắt đầu điền" when an online form template exists (TK-KS, CT01, TK-KH, TK-BTXH).
 * - Renders "Xem giấy tờ và nơi nộp" for the remaining 36 procedures without online templates.
 * - Displays ward-scoped receiving office & working hours, explicitly noting when working hours are default config.
 */
export const ProcedureSummaryCard: React.FC<ProcedureSummaryCardProps> = ({
  procedureCode,
  procedureName,
  category,
  feeLabel,
  isFeeExempt = false,
  supportedFormType,
  requiredDocsSummary = [],
  legalBasis,
  ward,
  compact = false,
  onStartForm,
  onViewDocsAndOffice,
}) => {
  const [showOfficeDetails, setShowOfficeDetails] = useState(false);

  const effectiveFormType =
    supportedFormType !== undefined
      ? supportedFormType
      : resolveSupportedFormTypeByProcedure(procedureCode);

  const workingHours = ward.workingHours || DEFAULT_WORKING_HOURS;
  const isDefaultWorkingHours =
    !ward.workingHours || ward.workingHours.trim() === DEFAULT_WORKING_HOURS;

  return (
    <article
      data-testid={`procedure-card-${procedureCode}`}
      className={`rounded-xl border border-slate-200/90 hover:border-[#FCA5A5] transition-all bg-white flex flex-col justify-between gap-3 ${
        compact ? 'p-3.5 mt-2 shadow-2xs' : 'h-full p-4 hover:shadow-sm'
      }`}
    >
      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#FEF2F2] text-[#9F0C1E] border border-[#FECACA] shrink-0">
              {procedureCode}
            </span>
            {effectiveFormType && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 shrink-0">
                Mẫu {effectiveFormType}
              </span>
            )}
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
              isFeeExempt
                ? 'text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0]'
                : 'text-slate-700 bg-slate-100 border border-slate-200'
            }`}
          >
            {feeLabel || (isFeeExempt ? 'Miễn phí' : 'Theo quy định')}
          </span>
        </div>

        <h3 className="font-bold text-sm text-slate-900 leading-snug">{procedureName}</h3>

        {requiredDocsSummary.length > 0 && (
          <div className="text-xs text-slate-700 bg-slate-50/90 border border-slate-200/80 rounded-lg px-2.5 py-2 flex flex-col gap-1">
            <span className="font-semibold text-slate-800 flex items-center gap-1 text-[11px]">
              <FileText className="w-3.5 h-3.5 text-[#9F0C1E] shrink-0" />
              <span>Giấy tờ chính cần chuẩn bị:</span>
            </span>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600">
              {requiredDocsSummary.slice(0, 2).map((doc, i) => (
                <li key={i} className="line-clamp-1">
                  {doc}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-[11px] text-slate-600 flex flex-col gap-1">
          <div className="flex items-start gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#0F766E] shrink-0 mt-0.5" />
            <span className="line-clamp-1">
              Nơi nộp: <strong className="text-slate-800">Bộ phận Một cửa UBND {ward.name}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowOfficeDetails((prev) => !prev)}
            aria-expanded={showOfficeDetails}
            className="self-start inline-flex items-center gap-1 text-[11px] font-semibold text-[#9F0C1E] hover:underline cursor-pointer gov-focus-ring rounded"
          >
            <span>{showOfficeDetails ? 'Ẩn địa chỉ & giờ làm việc' : 'Xem địa chỉ, giờ làm việc & căn cứ'}</span>
            {showOfficeDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showOfficeDetails && (
            <div className="mt-1 p-2.5 rounded-lg bg-[#F8FAFC] border border-slate-200 flex flex-col gap-1 text-[11px] text-slate-700">
              <div>
                <strong>Địa chỉ trụ sở:</strong> {ward.officeAddress}
              </div>
              <div className="flex items-start gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Giờ tiếp nhận:</strong> {workingHours}{' '}
                  {isDefaultWorkingHours && (
                    <em className="text-slate-500">(cấu hình giờ hành chính mặc định)</em>
                  )}
                </span>
              </div>
              {legalBasis && (
                <div className="flex items-start gap-1">
                  <Scale className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Nguồn / Căn cứ:</strong> {legalBasis}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-500 truncate min-w-0">
          {category || 'Thủ tục cấp xã'}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {effectiveFormType ? (
            <>
              <button
                type="button"
                onClick={() => onViewDocsAndOffice(procedureCode)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-[#B90E23] hover:bg-[#FEF2F2] text-slate-700 hover:text-[#9F0C1E] text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer gov-focus-ring"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Mẫu A4</span>
              </button>
              <button
                type="button"
                onClick={() => onStartForm(procedureCode, effectiveFormType, ward.code)}
                className="px-3 py-1.5 rounded-lg bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs gov-focus-ring"
              >
                <FilePenLine className="w-3.5 h-3.5" />
                <span>Bắt đầu điền</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onViewDocsAndOffice(procedureCode)}
              className="px-3 py-1.5 rounded-lg bg-[#0F2942] hover:bg-[#1E3A5F] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs gov-focus-ring"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Xem giấy tờ và nơi nộp</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
