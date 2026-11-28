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
  getDossierStatusLabelVi,
  type DossierSubmissionResponse,
  type FormPrecheckResponse,
} from '../../api/client';
import type { WardItem } from '../../data/anGiangWards';
import { PROCEDURES_CATALOG } from '../../data/proceduresCatalog';

const W1_POLICE_PROCEDURES = new Set([
  'TTHC-CR-01',
  'TTHC-CR-03',
  'TTHC-CR-06',
  'TTHC-CR-07',
  'TTHC-CR-08',
]);

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
}) => {
  const procMeta = PROCEDURES_CATALOG.find(
    (p) => p.code.toUpperCase() === canonicalProcedureCode.trim().toUpperCase()
  );
  const isExternalPoliceCt01 =
    W1_POLICE_PROCEDURES.has(canonicalProcedureCode.trim().toUpperCase()) ||
    procMeta?.submissionMode === 'EXTERNAL_CHANNEL_ONLY';
  const isOfficiallyAccepted = Boolean(
    submittedDossier?.receiptVerified &&
      submittedDossier?.officialReceiptNo &&
      submittedDossier?.receivingAgency
  );
  const submittedHeadline = isOfficiallyAccepted
    ? 'Hồ Sơ Đã Được Tiếp Nhận'
    : 'Đã Gửi Yêu Cầu Kiểm Tra Trước';

  return (
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
                  ? submittedHeadline
                  : precheckResult.overallValid
                  ? isExternalPoliceCt01
                    ? 'Tờ Khai CT01 Hợp Lệ — Sẵn Sàng Nộp Công An Cấp Xã / VNeID'
                    : 'Tờ Khai Hợp Lệ — Sẵn Sàng Gửi Kiểm Tra Trước'
                  : 'Phát Hiện Lỗi Cần Chỉnh Sửa Trước Khi Nộp'}
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
                ? isOfficiallyAccepted
                  ? `Hồ sơ thủ tục ${canonicalProcedureCode} đã được tiếp nhận tại ${submittedDossier.receivingAgency} với số biên nhận ${submittedDossier.officialReceiptNo}.`
                  : `SmartWard đã lưu yêu cầu kiểm tra trước (${canonicalProcedureCode}) và cấp mã bản nháp ${submittedDossier.dossierCode}. Hồ sơ chỉ chuyển sang trạng thái "Hồ sơ đã được tiếp nhận" sau khi cơ quan tiếp nhận đối chiếu và ghi nhận số biên nhận chính thức.`
                : precheckResult.overallValid
                ? isExternalPoliceCt01
                  ? 'Thủ tục cư trú CT01 thuộc thẩm quyền giải quyết của Công an cấp xã (hoặc nộp trực tuyến qua VNeID / Cổng DVC Bộ Công an). Bản nháp chỉ hỗ trợ bạn chuẩn bị và in tờ khai A4, không chuyển vào hàng đợi duyệt của UBND.'
                  : 'Tờ khai mới chỉ kiểm tra trên trình duyệt. Bấm "Gửi yêu cầu kiểm tra trước" bên dưới để tạo mã bản nháp SmartWard gửi tới TTPVHCC đối chiếu.'
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

          {!submittedDossier && precheckResult.overallValid && isExternalPoliceCt01 && (
            <div
              data-testid="ct01-police-routing-card"
              className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-950 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-sky-900">
                  Phương án 3A • Kênh giải quyết: Công an cấp xã / VNeID
                </span>
                <span className="px-2 py-0.5 rounded bg-white border border-sky-300 text-[10px] font-bold text-sky-900">
                  Không gửi UBND xã
                </span>
              </div>
              <p className="leading-relaxed text-sky-900">
                Theo phân luồng cư trú (CT01), SmartWard giúp bạn kiểm tra lỗi trường thông tin, xuất tờ khai A4 chuẩn NĐ 30/2020 và giữ bản nháp trên máy. Vui lòng nộp trực tiếp tại{' '}
                <strong>Công an {currentWard.name}</strong> hoặc qua{' '}
                <strong>VNeID / Cổng Dịch vụ công Bộ Công an</strong>.
              </p>
            </div>
          )}

          {!submittedDossier && precheckResult.overallValid && !isExternalPoliceCt01 && (
            <button
              type="button"
              onClick={onSubmitDossier}
              disabled={submitLoading || isPrecheckDirty}
              className="w-full py-3 px-4 rounded-xl bg-[#0F766E] hover:bg-[#115E59] disabled:bg-slate-400 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm gov-focus-ring"
            >
              {submitLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang gửi yêu cầu kiểm tra trước tới TTPVHCC {currentWard.name}...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Gửi yêu cầu kiểm tra trước tới TTPVHCC {currentWard.name}</span>
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
      <div
        className={`p-5 rounded-2xl border shadow-xs flex flex-col gap-3 ${
          isOfficiallyAccepted ? 'bg-[#F0FDF4] border-[#86EFAC]' : 'bg-[#FFFBEB] border-[#FDE68A]'
        }`}
      >
        <div className={`flex items-center justify-between gap-2 ${isOfficiallyAccepted ? 'text-[#166534]' : 'text-[#92400E]'}`}>
          <div className="flex items-center gap-2">
            {isOfficiallyAccepted ? (
              <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-[#D97706] shrink-0" />
            )}
            <div>
              <span className="font-extrabold text-sm block">{submittedHeadline}</span>
              <span className="text-[11px]">
                {isOfficiallyAccepted
                  ? `${submittedDossier.receivingAgency} đã xác nhận tiếp nhận với số biên nhận ${submittedDossier.officialReceiptNo}.`
                  : `SmartWard đã ghi nhận yêu cầu kiểm tra trước cho ${currentWard.name} (chưa phải biên nhận tiếp nhận chính thức).`}
              </span>
            </div>
          </div>
          <span
            data-testid="qr-kind-badge"
            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border shrink-0 ${
              isOfficiallyAccepted
                ? 'bg-white text-[#065F46] border-[#86EFAC]'
                : 'bg-white text-[#92400E] border-[#FCD34D]'
            }`}
          >
            {submittedDossier.qrKind || (isOfficiallyAccepted ? 'SW_RECEIPT' : 'SW_DRAFT')}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white/80 border border-slate-200 flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#64748B]">
              {isOfficiallyAccepted ? 'Mã hồ sơ & Số biên nhận:' : 'Mã bản nháp SmartWard:'}
            </span>
            <code className="font-mono font-bold text-[#0F2942] bg-[#E2E8F0] px-2 py-0.5 rounded text-xs">
              {isOfficiallyAccepted && submittedDossier.officialReceiptNo
                ? `${submittedDossier.dossierCode} • ${submittedDossier.officialReceiptNo}`
                : submittedDossier.dossierCode}
            </code>
          </div>
          {submittedDossier.receivingAgency && (
            <div className="flex items-center justify-between">
              <span className="text-[#64748B]">Cơ quan tiếp nhận:</span>
              <span className="font-semibold text-[#0F172A]">{submittedDossier.receivingAgency}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[#64748B]">Thời hạn giải quyết:</span>
            <span className="font-semibold text-[#166534]">
              {formatSlaDeadlineVi(submittedDossier.slaDeadline, true)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#64748B]">Trạng thái:</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#92400E]">
              {getDossierStatusLabelVi(submittedDossier.status, isOfficiallyAccepted)}
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
};
