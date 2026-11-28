import { QRCodeSVG } from 'qrcode.react';
import React from 'react';
import { Clock, FileCheck2, FileDown, Mail, RefreshCw } from 'lucide-react';
import {
  getDossierStatusLabelVi,
  getLiveSubmittedDossiers,
  trackDossier,
  type DossierSubmissionResponse,
  type EmailNotificationItem,
  type LiveFormDossier,
} from '../../api/client';
import type { WardItem } from '../../data/anGiangWards';

interface FormStep3QrPassAndInboxProps {
  currentWard: WardItem;
  myDossiers: LiveFormDossier[];
  setMyDossiers: React.Dispatch<React.SetStateAction<LiveFormDossier[]>>;
  submittedDossier: DossierSubmissionResponse | null;
  trackingDossierCode: string;
  trackingLast4Cccd: string;
  qrPassRef: React.RefObject<HTMLDivElement | null>;
  isExportingQrPass: boolean;
  onDownloadQrPassPdf: () => void;
  emailNotifications: EmailNotificationItem[];
}

export const FormStep3QrPassAndInbox: React.FC<FormStep3QrPassAndInboxProps> = ({
  currentWard,
  myDossiers,
  setMyDossiers,
  submittedDossier,
  trackingDossierCode,
  trackingLast4Cccd,
  qrPassRef,
  isExportingQrPass,
  onDownloadQrPassPdf,
  emailNotifications,
}) => {
  const targetDossier =
    myDossiers.find((d) => d.id === submittedDossier?.dossierCode) ||
    myDossiers.find((d) => d.status === 'VALID' && d.appointmentCode) ||
    myDossiers[0];

  const appointmentCode = targetDossier?.appointmentCode;
  const hasRealReceipt = Boolean(
    targetDossier &&
      targetDossier.receiptVerified &&
      targetDossier.officialReceiptNo &&
      targetDossier.receivingAgency
  );
  const handleManualRefresh = async () => {
    if (trackingDossierCode && trackingLast4Cccd) {
      try {
        const res = await trackDossier(trackingDossierCode, trackingLast4Cccd);
        if (res?.dossierCode) {
          const updated = getLiveSubmittedDossiers().map((d) =>
            d.id === res.dossierCode
              ? {
                  ...d,
                  appointmentCode: res.appointmentCode || d.appointmentCode,
                  rawStatus: res.status,
                  slaDeadline: res.slaDeadline,
                  receivingAgency: res.receivingAgency ?? d.receivingAgency,
                  officialReceiptNo: res.officialReceiptNo ?? d.officialReceiptNo,
                  receiptVerified: res.receiptVerified ?? d.receiptVerified,
                  qrKind: res.qrKind ?? d.qrKind,
                  status: (res.status === 'APPROVED' || res.status === 'OFFICIALLY_ACCEPTED' || res.status === 'COMPLETED' ? 'VALID' : d.status) as any,
                  officerFeedback: res.officerFeedback || d.officerFeedback,
                  reviewedBy: d.reviewedBy,
                }
              : d
          );
          localStorage.setItem('smartward_live_dossiers_v1', JSON.stringify(updated));
          setMyDossiers(updated);
        }
      } catch {}
    } else {
      setMyDossiers(getLiveSubmittedDossiers());
    }
  };

  return (
    <>
      {myDossiers.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <span className="text-xs font-extrabold text-[#9F0C1E] flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-[#9F0C1E]" />
              <span>Trạng Thái Hồ Sơ Sơ Duyệt Gần Đây ({myDossiers.length})</span>
            </span>
            <span className="text-[11px] text-[#64748B]">Đồng bộ từ Bàn Cán Bộ</span>
          </div>
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
            {myDossiers.slice(0, 4).map((d) => (
              <div key={d.id} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#0F172A] truncate">{d.citizenName} • {d.formType}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      d.status === 'VALID'
                        ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                        : d.status === 'HAS_ERRORS'
                        ? 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'
                        : 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
                    }`}
                  >
                    {d.rawStatus
                      ? getDossierStatusLabelVi(d.rawStatus, Boolean(d.receiptVerified))
                      : d.status === 'VALID'
                      ? d.receiptVerified && d.officialReceiptNo
                        ? 'Hồ sơ đã được tiếp nhận'
                        : 'Đã gửi yêu cầu kiểm tra trước'
                      : d.status === 'HAS_ERRORS'
                      ? 'Cần bổ sung'
                      : 'Đã gửi yêu cầu kiểm tra trước'}
                  </span>
                </div>
                <span className="text-[11px] text-[#64748B] truncate">{d.procedure}</span>
                {d.officerFeedback && (
                  <div className="mt-1 p-2 rounded-lg bg-white border border-[#CBD5E1] text-[11px] text-[#9F0C1E] font-medium">
                    <strong>Phản hồi Cán bộ ({d.reviewedBy || 'Một cửa'}):</strong> {d.officerFeedback}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {targetDossier && !hasRealReceipt && (
        <div className="p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <span className="text-xs font-extrabold text-[#9F0C1E] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#9F0C1E]" />
              <span>Mã Bản Nháp SmartWard (Kiểm Tra Trước)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[10px] font-bold">
              SW_DRAFT • Chờ đối chiếu biên nhận
            </span>
          </div>
          <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-3 text-xs text-[#92400E]">
            <Clock className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-extrabold text-[#78350F]">Đã gửi yêu cầu kiểm tra trước</span>
              <p className="text-[11px] leading-relaxed text-[#92400E]">
                Mã bản nháp SmartWard <strong>{targetDossier.id}</strong> ({targetDossier.formType}) đã được lưu để hỗ trợ đối chiếu. Trạng thái sẽ chỉ chuyển sang{' '}
                <strong>“Hồ sơ đã được tiếp nhận”</strong> và cấp mã biên nhận <strong>SW_RECEIPT</strong> sau khi TTPVHCC / cơ quan tiếp nhận xác nhận và ghi nhận số biên nhận chính thức.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#64748B] px-1">
            <span>Hệ thống tự động đồng bộ tiến độ mỗi 30 giây</span>
            <button
              type="button"
              onClick={() => void handleManualRefresh()}
              className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3 text-[#9F0C1E]" />
              <span>Làm mới tiến độ</span>
            </button>
          </div>
        </div>
      )}

      {targetDossier && (
        <div className="p-5 rounded-2xl bg-white border-2 border-[#B90E23] shadow-sm flex flex-col gap-3">
          <div ref={qrPassRef} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] pb-2.5">
              <div>
                <span className="inline-block px-2 py-0.5 rounded bg-[#F7EEDF] text-[#9F0C1E] text-[10px] font-black uppercase tracking-wider mb-1">
                  {hasRealReceipt
                    ? 'PHIẾU BIÊN NHẬN CHÍNH THỨC (SW_RECEIPT)'
                    : 'MÃ BẢN NHÁP SMARTWARD (SW_DRAFT)'}
                </span>
                <h4 className="font-extrabold text-sm text-[#0F172A]">
                  {hasRealReceipt
                    ? targetDossier.receivingAgency
                    : `TTPVHCC ${targetDossier.wardName || currentWard.name}`}
                </h4>
                <p className="text-[11px] text-[#64748B]">
                  {hasRealReceipt
                    ? `Số biên nhận: ${targetDossier.officialReceiptNo}`
                    : `Mã kiểm tra trước — Chờ cấp số biên nhận khi nộp bản chính tại ${targetDossier.wardName || currentWard.name}`}
                </p>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-[#CBD5E1] shrink-0 flex flex-col items-center">
                <QRCodeSVG size={144} marginSize={4} title="Mã tra cứu tại quầy" value={hasRealReceipt
                  ? `SW_RECEIPT|${targetDossier.officialReceiptNo}|${targetDossier.receivingAgency}|${targetDossier.slaDeadline || 'TBD'}`
                  : `SW_DRAFT|${targetDossier.id}|${targetDossier.wardCode || currentWard.code}`} />
                <span className="text-[9px] font-mono font-bold text-[#9F0C1E] mt-0.5">{appointmentCode}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-[10px] text-[#64748B] block">Họ và tên công dân:</span><strong className="text-[#0F172A]">{targetDossier.citizenName}</strong></div>
              <div><span className="text-[10px] text-[#64748B] block">Mã hồ sơ sơ duyệt:</span><strong className="font-mono text-[#9F0C1E]">{targetDossier.id}</strong></div>
              <div><span className="text-[10px] text-[#64748B] block">Biểu mẫu & Thủ tục:</span><strong className="text-[#0F172A]">{targetDossier.formType} • {targetDossier.procedure}</strong></div>
              <div><span className="text-[10px] text-[#64748B] block">Cán bộ duyệt sơ bộ:</span><strong className="text-[#065F46]">{targetDossier.reviewedBy || 'Chưa có thông tin'}</strong></div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[11px] text-[#065F46] leading-relaxed">
              <strong>Hướng dẫn khi đến Bộ phận Một cửa:</strong> Bà con xuất trình Mã QR này (trên điện thoại hoặc bản PDF tải về) kèm <strong>Bản chính CCCD</strong> và giấy tờ gốc liên quan để ký nhận trực tiếp, không phải xếp hàng viết lại tờ khai.
            </div>
          </div>

          <button
            type="button"
            onClick={onDownloadQrPassPdf}
            disabled={isExportingQrPass}
            className="w-full py-2.5 px-4 rounded-xl bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-60"
          >
            <FileDown className="w-4 h-4 text-amber-100" />
            <span>{isExportingQrPass ? 'Đang tạo file PDF Phiếu Hẹn...' : 'Tải Phiếu Hẹn Có Mã QR (.pdf) Về Máy'}</span>
          </button>
        </div>
      )}

      {emailNotifications.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <span className="text-xs font-extrabold text-[#9F0C1E] flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-[#9F0C1E]" />
              <span>Hộp Thư Thông Báo Email Từ Cán Bộ ({emailNotifications.length})</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] text-[10px] font-bold">Miễn phí 100%</span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
            {emailNotifications.slice(0, 3).map((mail) => (
              <div
                key={mail.id}
                className={`p-3 rounded-xl border flex flex-col gap-1.5 text-xs ${
                  mail.status === 'APPROVED' ? 'bg-[#F0FDF4]/70 border-[#BBF7D0]' : 'bg-[#FEF2F2]/70 border-[#FECACA]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-[#0F172A] truncate">{mail.subject}</span>
                  <span className="text-[10px] font-mono text-[#64748B] shrink-0">{mail.sentAt}</span>
                </div>
                <div className="text-[11px] text-[#475569] flex flex-wrap items-center gap-2">
                  <span>Tới: <strong className="text-[#0F172A]">{mail.recipientEmail}</strong></span>
                  {mail.appointmentCode && (
                    <span className="px-1.5 py-0.5 rounded bg-white border border-[#A7F3D0] font-mono font-bold text-[#065F46] text-[10px]">
                      Mã hẹn QR: {mail.appointmentCode}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#334155] leading-relaxed bg-white/90 p-2 rounded-lg border border-[#E2E8F0]">
                  {mail.feedbackText}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
