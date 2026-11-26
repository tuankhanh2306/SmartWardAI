import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  FilePlus2,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react';
import {
  formatSlaDeadlineVi,
  submitDossierSupplement,
  uploadVaultDocument,
  type DossierTrackingResponse,
} from '../../api/client';
import type { WardItem } from '../../data/anGiangWards';

interface DossierNextActionCardProps {
  trackingResult: DossierTrackingResponse;
  handlingWard?: WardItem;
  trackingLast4Cccd?: string;
  onSupplementSubmitted?: (updated: DossierTrackingResponse) => void;
}

/**
 * Top-priority "Việc cần làm" card rendered ABOVE history/metadata on DossierTrackingTab (TASK-053 & TASK-054).
 * Tells the citizen immediately what action is needed next, renders structured supplement checklist + inline
 * direct supplement submission into the same dossier, and shows SUPPLEMENTED confirmation immediately.
 */
export const DossierNextActionCard: React.FC<DossierNextActionCardProps> = ({
  trackingResult,
  handlingWard,
  trackingLast4Cccd,
  onSupplementSubmitted,
}) => {
  const [citizenNote, setCitizenNote] = useState<string>('');
  const [birthCertNumber, setBirthCertNumber] = useState<string>('');
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ token: string; name: string }>>([]);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const status = (trackingResult.status || 'PENDING').toUpperCase();
  const hasVerifiedSla = Boolean(
    trackingResult.slaDeadline && !Number.isNaN(new Date(trackingResult.slaDeadline).getTime())
  );
  const updatedStr = trackingResult.updatedAt
    ? new Date(trackingResult.updatedAt).toLocaleString('vi-VN')
    : new Date(trackingResult.createdAt).toLocaleString('vi-VN');
  const officeLabel = handlingWard
    ? `Bộ phận Một cửa UBND ${handlingWard.name} (${handlingWard.officeAddress})`
    : `Bộ phận Một cửa đơn vị mã ${trackingResult.wardCode}`;

  const handleAttachSupplementFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    setSubmitError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('documentType', 'SUPPLEMENT_DOC');
      const res = await uploadVaultDocument(fd);
      const docRef = res.oneTimeToken || res.documentCode || res.documentId;
      if (docRef) {
        setUploadedDocs((prev) => [...prev, { token: docRef, name: file.name }]);
      }
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message || 'Không tải lên được tài liệu đính kèm. Bạn vẫn có thể gửi nội dung giải trình.'
      );
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleSupplementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLast4 = (trackingLast4Cccd || '').trim().slice(-4);
    if (!/^\d{4}$/.test(cleanLast4)) {
      setSubmitError('Vui lòng giữ đúng 4 số cuối CCCD ở khung tra cứu bên trái để xác thực gửi bổ sung.');
      return;
    }
    const cleanNote = citizenNote.trim();
    const updatedFields: Record<string, any> = {};
    if (birthCertNumber.trim()) {
      updatedFields.birthCertNumber = birthCertNumber.trim();
    }
    const additionalVaultDocIds = uploadedDocs.map((d) => d.token);

    if (cleanNote.length < 5 && Object.keys(updatedFields).length === 0 && additionalVaultDocIds.length === 0) {
      setSubmitError('Vui lòng nhập nội dung bổ sung (tối thiểu 5 ký tự) hoặc đính kèm tài liệu mới.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await submitDossierSupplement(trackingResult.dossierCode, {
        last4Cccd: cleanLast4,
        citizenNote: cleanNote || undefined,
        updatedFields: Object.keys(updatedFields).length > 0 ? updatedFields : undefined,
        additionalVaultDocIds: additionalVaultDocIds.length > 0 ? additionalVaultDocIds : undefined,
      });
      setCitizenNote('');
      setBirthCertNumber('');
      setUploadedDocs([]);
      onSupplementSubmitted?.(updated);
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message || 'Không gửi được hồ sơ bổ sung lúc này. Vui lòng thử lại sau.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'SUPPLEMENT_REQUIRED') {
    const requestedItems = Array.isArray(trackingResult.requestedSupplementItems)
      ? trackingResult.requestedSupplementItems.filter(Boolean)
      : [];

    return (
      <div
        data-testid="dossier-next-action-card"
        className="p-4 rounded-2xl bg-[#FEF2F2] border-2 border-[#FCA5A5] text-[#7F1D1D] flex flex-col gap-3 shadow-2xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-extrabold text-xs sm:text-sm uppercase tracking-wide text-[#991B1B]">
            <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span>Việc cần làm ngay: Bổ sung / Chỉnh sửa hồ sơ</span>
          </span>
          <span className="text-[11px] font-mono font-semibold text-[#991B1B]">
            Cập nhật: {updatedStr}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-[#FECACA] text-xs text-[#0F172A]">
          <span className="font-bold text-[#991B1B] block mb-1">Yêu cầu nguyên văn từ cán bộ thụ lý:</span>
          <p className="leading-relaxed font-medium">
            {trackingResult.officerFeedback || 'Vui lòng bổ sung giấy tờ còn thiếu theo hướng dẫn tại quầy Một cửa.'}
          </p>

          {requestedItems.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[#FEE2E2]">
              <span className="text-[11px] font-bold text-[#991B1B] block mb-1">
                Danh mục giấy tờ / trường cần bổ sung:
              </span>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[#334155]">
                {requestedItems.map((item, idx) => (
                  <li key={`${item}-${idx}`} className="font-medium">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSupplementSubmit}
          data-testid="dossier-supplement-form"
          className="p-3 rounded-xl bg-white border border-[#FECACA] flex flex-col gap-2.5 text-xs text-[#0F172A]"
        >
          <span className="font-bold text-[#881320] flex items-center gap-1.5">
            <FilePlus2 className="w-4 h-4 text-[#B90E23]" />
            <span>Gửi bổ sung trực tiếp vào hồ sơ {trackingResult.dossierCode}</span>
          </span>

          {trackingResult.procedureCode === 'TTHC-HT-01' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="supp-birth-cert-number" className="text-[11px] font-bold text-[#475569]">
                Số Giấy chứng sinh cập nhật (nếu cần sửa):
              </label>
              <input
                id="supp-birth-cert-number"
                type="text"
                value={birthCertNumber}
                onChange={(e) => setBirthCertNumber(e.target.value)}
                placeholder="VD: GCS-2026-0089"
                className="h-9 px-3 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-xs font-mono"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="supp-citizen-note" className="text-[11px] font-bold text-[#475569]">
              Nội dung bổ sung / giải trình gửi cán bộ:
            </label>
            <textarea
              id="supp-citizen-note"
              rows={2}
              value={citizenNote}
              onChange={(e) => setCitizenNote(e.target.value)}
              placeholder="VD: Đã bổ sung bản chụp Giấy chứng sinh rõ nét và cập nhật lại số hiệu..."
              className="w-full rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-2.5 text-xs focus:outline-none focus:border-[#B90E23]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[11px] font-bold text-[#334155] cursor-pointer">
              {uploadingDoc ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#B90E23]" />
              ) : (
                <FilePlus2 className="w-3.5 h-3.5 text-[#B90E23]" />
              )}
              <span>{uploadingDoc ? 'Đang mã hóa tải lên...' : 'Đính kèm ảnh / giấy tờ bổ sung'}</span>
              <input
                type="file"
                accept="image/*,.pdf"
                disabled={uploadingDoc || submitting}
                onChange={handleAttachSupplementFile}
                className="hidden"
              />
            </label>

            {uploadedDocs.length > 0 && (
              <span className="text-[11px] font-semibold text-[#065F46]">
                Đã đính kèm {uploadedDocs.length} tệp ({uploadedDocs.map((d) => d.name).join(', ')})
              </span>
            )}
          </div>

          {submitError && (
            <p role="alert" className="text-[11px] font-semibold text-[#DC2626] bg-[#FEF2F2] px-2.5 py-1.5 rounded-lg border border-[#FECACA]">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || uploadingDoc}
            className="w-full sm:w-auto self-end px-4 py-2 rounded-xl bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang gửi bổ sung...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Gửi bổ sung vào hồ sơ</span>
              </>
            )}
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#7F1D1D]">
          <span className="inline-flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>Nơi tiếp nhận bổ sung: <strong>{officeLabel}</strong></span>
          </span>
          {hasVerifiedSla && (
            <span className="font-mono font-bold">
              Hạn giải quyết: {formatSlaDeadlineVi(trackingResult.slaDeadline, false)}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (status === 'SUPPLEMENTED') {
    const suppTime = trackingResult.supplementedAt
      ? new Date(trackingResult.supplementedAt).toLocaleString('vi-VN')
      : updatedStr;
    return (
      <div
        data-testid="dossier-next-action-card"
        className="p-4 rounded-2xl bg-[#EFF6FF] border-2 border-[#93C5FD] text-[#1E3A8A] flex flex-col gap-2 shadow-2xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-extrabold text-xs sm:text-sm uppercase tracking-wide text-[#1D4ED8]">
            <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0" />
            <span>Đã tiếp nhận hồ sơ bổ sung — Chờ cán bộ thẩm định lại</span>
          </span>
          <span className="text-[11px] font-mono font-semibold text-[#1E40AF]">
            Bổ sung lúc: {suppTime}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-[#1E3A8A]">
          Nội dung và tài liệu bổ sung (lần {trackingResult.supplementCount || 1}) đã được chuyển tới{' '}
          <strong>{officeLabel}</strong> để cán bộ Một cửa xem xét lại. Lịch sử xử lý trước đó vẫn được lưu nguyên vẹn.
        </p>
        {hasVerifiedSla && (
          <div className="text-[11px] font-mono font-bold text-[#1D4ED8]">
            Hạn trả kết quả xác định: {formatSlaDeadlineVi(trackingResult.slaDeadline, false)}
          </div>
        )}
      </div>
    );
  }

  if (status === 'APPROVED') {
    return (
      <div
        data-testid="dossier-next-action-card"
        className="p-4 rounded-2xl bg-[#ECFDF5] border-2 border-[#6EE7B7] text-[#064E3B] flex flex-col gap-2.5 shadow-2xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-extrabold text-xs sm:text-sm uppercase tracking-wide text-[#065F46]">
            <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
            <span>Việc cần làm: Mang bản chính đến nhận kết quả</span>
          </span>
          <span className="text-[11px] font-mono font-semibold text-[#065F46]">
            Duyệt lúc: {updatedStr}
          </span>
        </div>

        {trackingResult.appointmentCode && (
          <div className="p-3 rounded-xl bg-white border border-[#A7F3D0] flex items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-[#065F46] block">Mã số phiếu hẹn ưu tiên:</span>
              <span className="text-[11px] text-[#047857]">
                Xuất trình mã này kèm bản chính giấy tờ (CCCD, Giấy chứng sinh...) để đối chiếu nhận kết quả ngay.
              </span>
            </div>
            <code className="font-mono font-extrabold text-sm text-[#065F46] bg-[#ECFDF5] px-3 py-1 rounded-lg border border-[#6EE7B7] shrink-0">
              {trackingResult.appointmentCode}
            </code>
          </div>
        )}

        {trackingResult.officerFeedback && (
          <p className="text-xs text-[#065F46] bg-white/80 border border-[#A7F3D0] rounded-xl px-3 py-2">
            <strong>Hướng dẫn cán bộ:</strong> {trackingResult.officerFeedback}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#065F46]">
          <span className="inline-flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>Nơi nhận kết quả: <strong>{officeLabel}</strong></span>
          </span>
          {hasVerifiedSla && (
            <span className="inline-flex items-center gap-1 font-mono font-bold">
              <CalendarCheck2 className="w-3.5 h-3.5" />
              <span>Hạn trả: {formatSlaDeadlineVi(trackingResult.slaDeadline, false)}</span>
            </span>
          )}
        </div>
      </div>
    );
  }

  if (status === 'REJECTED') {
    return (
      <div
        data-testid="dossier-next-action-card"
        className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#7F1D1D] flex flex-col gap-2"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-extrabold text-xs sm:text-sm uppercase">
            <XCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span>Hồ sơ bị từ chối tiếp nhận — Xem lý do để nộp lại đúng quy định</span>
          </span>
          <span className="text-[11px] font-mono">{updatedStr}</span>
        </div>
        {trackingResult.officerFeedback && (
          <p className="p-2.5 rounded-xl bg-white border border-[#FECACA] text-xs font-medium text-[#0F172A]">
            <strong>Lý do từ chối:</strong> {trackingResult.officerFeedback}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="dossier-next-action-card"
      className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-[#78350F] flex flex-col gap-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-extrabold text-xs sm:text-sm uppercase tracking-wide text-[#92400E]">
          <Clock className="w-4 h-4 text-[#D97706] shrink-0" />
          <span>Việc cần làm: Chờ Bộ phận Một cửa thẩm định hồ sơ</span>
        </span>
        <span className="text-[11px] font-mono font-semibold text-[#92400E]">
          Cập nhật gần nhất: {updatedStr}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-[#78350F]">
        Hồ sơ đang được thụ lý tại <strong>{officeLabel}</strong>. Bạn chưa cần đến quầy lúc này; khi có phiếu hẹn hoặc yêu cầu bổ sung, mục này sẽ hiển thị ngay đầu trang.
      </p>
      {hasVerifiedSla && (
        <div className="text-[11px] font-mono font-bold text-[#92400E]">
          Hạn trả kết quả xác định: {formatSlaDeadlineVi(trackingResult.slaDeadline, false)}
        </div>
      )}
    </div>
  );
};
