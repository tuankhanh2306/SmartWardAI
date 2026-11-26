import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileDown,
  RefreshCw,
  Send,
  ShieldCheck,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import {
  formatSlaDeadlineVi,
  type DossierSubmissionResponse,
  type FormPrecheckResponse,
} from '../../api/client';
import type { WardItem } from '../../data/anGiangWards';

interface FormStep3PrecheckReportProps {
  currentWard: WardItem;
  canonicalProcedureCode: string;
  precheckResult: FormPrecheckResponse | null;
  submittedDossier: DossierSubmissionResponse | null;
  isPrecheckDirty: boolean;
  submitLoading: boolean;
  submitError: string | null;
  speakingId: string | null;
  toggleSpeech: (text: string, id: string) => void;
  onEditStep2: () => void;
  onSubmitDossier: () => void;
  onOpenPrintModal: () => void;
  onOpenTrackingTab: () => void;
}

export const FormStep3PrecheckReport: React.FC<FormStep3PrecheckReportProps> = ({
  currentWard,
  canonicalProcedureCode,
  precheckResult,
  submittedDossier,
  isPrecheckDirty,
  submitLoading,
  submitError,
  speakingId,
  toggleSpeech,
  onEditStep2,
  onSubmitDossier,
  onOpenPrintModal,
  onOpenTrackingTab,
}) => (
  <>
    {precheckResult ? (
      <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-4 animate-scaleUp">
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
                {submittedDossier
                  ? 'Đã Tiếp Nhận Hồ Sơ Chính Thức Tại Bộ Phận Một Cửa'
                  : precheckResult.overallValid
                  ? 'Tờ Khai Hợp Lệ — Sẵn Sàng Gửi Hồ Sơ Lên UBND'
                  : 'Phát Hiện Lỗi Cần Chỉnh Sửa Trước Khi Gửi Hồ Sơ'}
              </h3>

              <button
                type="button"
                onClick={() => {
                  const errs = precheckResult.fieldValidations
                    .filter((f) => !f.valid)
                    .map((f) => `${f.fieldName}: ${f.errorMessage || 'chưa hợp lệ'}`)
                    .join('. ');
                  const summaryText = `Kết quả kiểm tra: ${
                    submittedDossier
                      ? `Hồ sơ đã được tiếp nhận với mã ${submittedDossier.dossierCode}.`
                      : precheckResult.overallValid
                      ? 'Tờ khai hợp lệ, quý công dân có thể bấm Gửi hồ sơ lên Ủy ban nhân dân.'
                      : `Phát hiện lỗi cần chỉnh sửa trước khi gửi. Chi tiết: ${errs}`
                  }`;
                  toggleSpeech(summaryText, 'precheck-diagnostic');
                }}
                aria-pressed={speakingId === 'precheck-diagnostic'}
                className={`group inline-flex items-center gap-1.5 font-bold text-xs px-2.5 py-1 rounded-xl border transition-all duration-150 cursor-pointer shadow-2xs select-none ${
                  speakingId === 'precheck-diagnostic'
                    ? 'bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5] ring-2 ring-[#FECACA]'
                    : precheckResult.overallValid
                    ? 'bg-white hover:bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                    : 'bg-white hover:bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                }`}
              >
                {speakingId === 'precheck-diagnostic' ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-[#DC2626]" />
                    <span className="font-extrabold text-[#991B1B]">Đang đọc...</span>
                    <span className="ml-0.5 px-2 py-0.5 rounded-md bg-[#DC2626] text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                      TẮT
                    </span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Nghe đọc to</span>
                    <span className="ml-0.5 px-2 py-0.5 rounded-md bg-[#B90E23] text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                      MỞ
                    </span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs mt-1 leading-relaxed">
              {submittedDossier
                ? `Hồ sơ thủ tục ${canonicalProcedureCode} đã được máy chủ xác nhận và cấp mã chính thức.`
                : precheckResult.overallValid
                ? 'Tờ khai mới chỉ hoàn tất bước Kiểm tra (chưa gửi lên UBND). Bấm "Gửi hồ sơ chính thức" bên dưới để nộp vào Bộ phận Một cửa.'
                : 'Bà con vui lòng quay lại Bước 2 chỉnh sửa các mục báo đỏ trước khi gửi.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col divide-y divide-[#E2E8F0] text-xs">
          {precheckResult.fieldValidations.map((field, idx) => (
            <div key={idx} className="py-2.5 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                {field.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-[#065F46] shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#991B1B] shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold text-[#0F172A]">{field.fieldName}</span>
                  {field.errorMessage && (
                    <p className="text-xs text-[#991B1B] mt-0.5 font-medium leading-tight">{field.errorMessage}</p>
                  )}
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 ${
                  field.valid ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]'
                }`}
              >
                {field.valid ? 'Hợp Lệ' : 'Sai Lệch'}
              </span>
            </div>
          ))}
        </div>

        {precheckResult.warnings.length > 0 && (
          <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex flex-col gap-1">
            <strong className="text-[#92400E]">Lưu ý pháp lý bắt buộc:</strong>
            {precheckResult.warnings.map((w, idx) => (
              <span key={idx} className="text-xs leading-tight">• {w}</span>
            ))}
          </div>
        )}

        {isPrecheckDirty && !submittedDossier && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Nội dung tờ khai đã thay đổi sau lần kiểm tra trước. Vui lòng quay lại Bước 2 để kiểm tra lại trước khi gửi.</span>
            </div>
            <button
              type="button"
              onClick={onEditStep2}
              className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shrink-0 cursor-pointer"
            >
              Kiểm tra lại
            </button>
          </div>
        )}

        {submitError && !submittedDossier && (
          <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#991B1B]">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-extrabold text-sm text-[#7F1D1D]">Chưa Xác Nhận Được Kết Quả Gửi</span>
                <p className="leading-relaxed">{submitError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onSubmitDossier}
              disabled={submitLoading || isPrecheckDirty}
              className="px-3.5 py-1.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${submitLoading ? 'animate-spin' : ''}`} />
              <span>Thử lại gửi hồ sơ</span>
            </button>
          </div>
        )}

        <div className="pt-2 border-t border-[#E2E8F0] flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-[#475569]">
            <span>
              Mã phiếu kiểm tra: <strong className="font-mono text-[#750715]">{precheckResult.submissionId}</strong> • Mã thủ tục: <strong className="font-mono text-[#0F2942]">{canonicalProcedureCode}</strong>
            </span>
            <span>UBND {currentWard.name}</span>
          </div>

          {!submittedDossier && precheckResult.overallValid && (
            <button
              type="button"
              onClick={onSubmitDossier}
              disabled={submitLoading || isPrecheckDirty}
              className="w-full py-3 px-4 rounded-xl bg-[#0F766E] hover:bg-[#115E59] disabled:bg-slate-400 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm gov-focus-ring"
            >
              {submitLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang Gửi Hồ Sơ Lên UBND {currentWard.name}...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Gửi Hồ Sơ Chính Thức Lên UBND {currentWard.name}</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenPrintModal}
            className="w-full py-2.5 px-3 rounded-xl bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs gov-focus-ring"
          >
            <FileDown className="w-4 h-4 text-amber-100" />
            <span>Xem &amp; Tải Mẫu A4 (Word/PDF chuẩn NĐ 30/2020/NĐ-CP)</span>
          </button>

          {submittedDossier && (
            <button
              type="button"
              onClick={onOpenTrackingTab}
              className="w-full py-2 px-3 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#750715] border border-[#CBD5E1] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer gov-focus-ring"
            >
              <span>Theo Dõi Tiến Độ &amp; Mã QR Tại Tab Tra Cứu ({currentWard.name})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    ) : (
      <div className="p-8 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col items-center justify-center text-center text-[#475569] gap-3">
        <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#750715]">
          <ShieldCheck className="w-7 h-7 text-[#B90E23]" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-[#0F172A]">Chưa Có Kết Quả Kiểm Tra Cho Phiên Hiện Tại</h3>
          <p className="text-xs text-[#475569] mt-1 max-w-md leading-relaxed">
            Vui lòng quay lại Bước 2 để điền thông tin tờ khai và bấm &quot;Kiểm tra tờ khai&quot;, hoặc bấm nút bên dưới để xem trước mẫu A4.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          <button
            type="button"
            onClick={onEditStep2}
            className="px-4 py-2 rounded-xl bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer gov-focus-ring"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại Bước 2 để Kiểm tra</span>
          </button>
          <button
            type="button"
            onClick={onOpenPrintModal}
            className="px-4 py-2 rounded-xl bg-white hover:bg-[#F1F5F9] text-[#750715] border border-[#CBD5E1] text-xs font-bold flex items-center gap-1.5 cursor-pointer gov-focus-ring"
          >
            <FileDown className="w-4 h-4" />
            <span>Xem &amp; Tải Mẫu A4</span>
          </button>
        </div>
      </div>
    )}

    {submittedDossier && (
      <div className="p-5 rounded-2xl bg-[#F0FDF4] border border-[#86EFAC] shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[#166534]">
          <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
          <div>
            <span className="font-extrabold text-sm block">Đã Tiếp Nhận Hồ Sơ Chính Thức</span>
            <span className="text-[11px] text-[#15803D]">Máy chủ UBND {currentWard.name} đã xác nhận và cấp mã hồ sơ.</span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white/80 border border-[#BBF7D0] flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#64748B]">Mã hồ sơ chính thức:</span>
            <code className="font-mono font-bold text-[#0F2942] bg-[#E2E8F0] px-2 py-0.5 rounded text-xs">
              {submittedDossier.dossierCode}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#64748B]">Thời hạn giải quyết:</span>
            <span className="font-semibold text-[#166534]">
              {formatSlaDeadlineVi(submittedDossier.slaDeadline, true)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#64748B]">Trạng thái:</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#92400E]">
              {submittedDossier.status} • Đã tiếp nhận chờ cán bộ thụ lý
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenTrackingTab}
          className="w-full py-2.5 rounded-xl bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <Clock className="w-4 h-4" />
          <span>Chuyển Sang Tab Tra Cứu Tiến Độ</span>
        </button>
      </div>
    )}
  </>
);
