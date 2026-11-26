import React from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { formatSlaDeadlineVi, type DossierTrackingResponse } from '../../api/client';
import type { WardItem } from '../../data/anGiangWards';

interface DossierNextActionCardProps {
  trackingResult: DossierTrackingResponse;
  handlingWard?: WardItem;
}

/**
 * Top-priority "Việc cần làm" card rendered ABOVE history/metadata on DossierTrackingTab (TASK-053).
 * Tells the citizen immediately what action is needed next, shows verbatim officer feedback or
 * official appointment pass, and only renders SLA deadline when Backend has verified it.
 */
export const DossierNextActionCard: React.FC<DossierNextActionCardProps> = ({
  trackingResult,
  handlingWard,
}) => {
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

  if (status === 'SUPPLEMENT_REQUIRED') {
    return (
      <div
        data-testid="dossier-next-action-card"
        className="p-4 rounded-2xl bg-[#FEF2F2] border-2 border-[#FCA5A5] text-[#7F1D1D] flex flex-col gap-2.5 shadow-2xs"
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
        </div>

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
