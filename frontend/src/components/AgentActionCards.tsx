import React from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  FilePenLine,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { AgentActionCard, AgentStep } from '../api/client';

interface AgentActionCardsProps {
  steps?: AgentStep[];
  cards?: AgentActionCard[];
  onOpenPrefilledForm?: (payload: Record<string, any>) => void;
}

export const AgentActionCards: React.FC<AgentActionCardsProps> = ({
  steps,
  cards,
  onOpenPrefilledForm,
}) => {
  const hasSteps = Array.isArray(steps) && steps.length > 0;
  const hasCards = Array.isArray(cards) && cards.length > 0;
  if (!hasSteps && !hasCards) return null;

  return (
    <div className="mt-2.5 flex flex-col gap-2.5">
      {/* Compact friendly reasoning steps */}
      {hasSteps && (
        <div
          className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600"
          aria-label="Các bước trợ lý đã thực hiện"
        >
          <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
            <Sparkles className="w-3 h-3 text-[#00796B]" />
            <span>Đã xử lý:</span>
          </span>
          {steps.map((step, idx) => (
            <React.Fragment key={`${step.toolName}-${step.stepIndex}`}>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium ${
                  step.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>{step.label}</span>
              </span>
              {idx < steps.length - 1 && <span className="text-slate-400">→</span>}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Action Cards */}
      {hasCards &&
        cards.map((card, idx) => {
          const payload = card.payload || {};

          if (card.type === 'DOSSIER_STATUS') {
            return (
              <div
                key={`card-dossier-${idx}`}
                className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 text-slate-800 flex flex-col gap-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#0F2942]">
                    <ClipboardList className="w-4 h-4 text-sky-700 shrink-0" />
                    <span>{card.title}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-700 text-white text-[11px] font-bold">
                    {payload.statusLabel || payload.status || 'Đang xử lý'}
                  </span>
                </div>
                {payload.procedureName && (
                  <p className="text-xs text-slate-700 font-medium">{payload.procedureName}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  {payload.maskedCccd && <span>CCCD: <strong>{payload.maskedCccd}</strong></span>}
                  {payload.slaDeadline && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-700" />
                      Hạn trả: <strong>{new Date(payload.slaDeadline).toLocaleDateString('vi-VN')}</strong>
                    </span>
                  )}
                  {payload.appointmentCode && (
                    <span>Mã hẹn: <strong>{payload.appointmentCode}</strong></span>
                  )}
                </div>
                {payload.officerFeedback && (
                  <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1">
                    <strong>Ghi chú cán bộ:</strong> {payload.officerFeedback}
                  </p>
                )}
              </div>
            );
          }

          if (card.type === 'OPEN_PREFILLED_FORM') {
            const missing: Array<{ fieldName?: string; errorMessage?: string }> =
              Array.isArray(payload.missingOrInvalidFields) ? payload.missingOrInvalidFields : [];
            return (
              <div
                key={`card-draft-${idx}`}
                className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 text-slate-800 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#0F2942]">
                    <FilePenLine className="w-4 h-4 text-[#00796B] shrink-0" />
                    <span>{card.title}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-teal-300 text-[#00695C] text-[10px] font-bold">
                    Bản nháp — Chưa nộp
                  </span>
                </div>
                {card.subtitle && <p className="text-xs text-slate-600">{card.subtitle}</p>}
                {missing.length > 0 && (
                  <ul className="text-[11px] text-amber-900 bg-amber-50/80 border border-amber-200 rounded-lg px-3 py-2 list-disc list-inside space-y-0.5">
                    {missing.slice(0, 4).map((m, mIdx) => (
                      <li key={mIdx}>{m.fieldName || m.errorMessage}</li>
                    ))}
                  </ul>
                )}
                {onOpenPrefilledForm && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onOpenPrefilledForm(payload)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                    >
                      <FilePenLine className="w-3.5 h-3.5" />
                      <span>Mở tờ khai đã điền sẵn</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          }

          if (card.type === 'WARD_ANALYTICS') {
            const sla = payload.slaSummary || {};
            const inc = payload.incidentSummary || {};
            const topProcs: Array<{ procedureCode: string; count: number }> =
              Array.isArray(payload.topPendingProcedures) ? payload.topPendingProcedures : [];
            return (
              <div
                key={`card-analytics-${idx}`}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 flex flex-col gap-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#0F2942]">
                    <BarChart3 className="w-4 h-4 text-[#0F2942] shrink-0" />
                    <span>{card.title}</span>
                  </div>
                  {payload.crossWardBlocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                      <ShieldAlert className="w-3 h-3" />
                      Khóa địa bàn SEC-09
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <div className="text-base font-extrabold text-[#0F2942]">{sla.totalDossiers ?? 0}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">Tổng hồ sơ</div>
                  </div>
                  <div className="p-2 rounded-lg bg-red-50 border border-red-200">
                    <div className="text-base font-extrabold text-red-700">{sla.overdueSlaCount ?? 0}</div>
                    <div className="text-[10px] text-red-700 font-semibold">Quá hạn SLA</div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="text-base font-extrabold text-amber-800">{sla.dueWithin48hCount ?? 0}</div>
                    <div className="text-[10px] text-amber-800 font-semibold">Sắp hạn 48h</div>
                  </div>
                  <div className="p-2 rounded-lg bg-sky-50 border border-sky-200">
                    <div className="text-base font-extrabold text-sky-800">{inc.openClusterCount ?? 0}</div>
                    <div className="text-[10px] text-sky-800 font-semibold">Sự cố tồn đọng</div>
                  </div>
                </div>
                {topProcs.length > 0 && (
                  <div className="text-[11px] text-slate-600 flex flex-wrap gap-1.5 items-center">
                    <span className="font-semibold text-slate-700">Thủ tục tồn nhiều:</span>
                    {topProcs.slice(0, 3).map((p) => (
                      <span
                        key={p.procedureCode}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-semibold text-slate-800"
                      >
                        {p.procedureCode}: {p.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
    </div>
  );
};
