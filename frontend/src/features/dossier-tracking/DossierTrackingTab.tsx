import React from 'react';
import {
  AlertCircle, AlertTriangle, Calendar, Clock, FileCheck2, RefreshCw, Search
} from 'lucide-react';
import type { WardItem } from '../../data/anGiangWards';
import { useWard } from '../../context/WardContext';
import { formatSlaDeadlineVi, type DossierTrackingResponse, type LiveFormDossier } from '../../api/client';

export interface DossierTrackingTabProps {
  currentWard: WardItem;
  handleTrackDossier: (e?: React.FormEvent) => void;
  trackingDossierCode: string;
  setTrackingDossierCode: (v: string) => void;
  trackingLast4Cccd: string;
  setTrackingLast4Cccd: (v: string) => void;
  trackingError: string | null;
  trackingLoading: boolean;
  myDossiers: LiveFormDossier[];
  trackingResult: DossierTrackingResponse | null;
  trackingFieldErrors?: Record<string, string>;
  onClearTrackingError?: (field: string) => void;
}

export const DossierTrackingTab: React.FC<DossierTrackingTabProps> = (props) => {
  const {
    currentWard, handleTrackDossier, trackingDossierCode, setTrackingDossierCode,
    trackingLast4Cccd, setTrackingLast4Cccd, trackingError, trackingLoading,
    myDossiers, trackingResult, trackingFieldErrors, onClearTrackingError,
  } = props;
  const { allWards } = useWard();
  const handlingWard = trackingResult?.wardCode
    ? allWards.find((w) => w.code.toUpperCase() === trackingResult.wardCode.trim().toUpperCase())
    : undefined;
  const DEFAULT_HOURS = 'Sáng: 07:00 – 11:00 | Chiều: 13:00 – 17:00 (Thứ 2 – Thứ 6)';

  return (
        <section className="flex flex-col gap-5 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Tracking Form & Query Box (6 Cols) */}
            <div className="lg:col-span-6 p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_6px_28px_rgba(15,23,42,0.05)] flex flex-col gap-5">
              <div className="border-b border-slate-200 pb-0">
                <div className="flex items-center gap-3 pb-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#9F0C1E] shrink-0">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-[#881320] uppercase tracking-wide">
                      Tra cứu tiến độ hồ sơ
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Dữ liệu trực tuyến UBND {currentWard.name}
                    </p>
                  </div>
                </div>
                <span className="block w-14 h-[3px] bg-[#B90E23]" />
              </div>

              <form onSubmit={handleTrackDossier} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="tracking-dossier-code" className="text-xs font-bold text-[#334155] flex items-center justify-between">
                    <span>Mã hồ sơ:</span>
                    <span className="text-[10px] text-[#991B1B] font-semibold">* Bắt buộc</span>
                  </label>
                  <input
                    id="tracking-dossier-code"
                    type="text"
                    value={trackingDossierCode}
                    onChange={(e) => {
                      setTrackingDossierCode(e.target.value);
                      if (trackingFieldErrors?.dossierCode) onClearTrackingError?.('dossierCode');
                    }}
                    aria-invalid={Boolean(trackingFieldErrors?.dossierCode)}
                    placeholder="VD: HS-2026...-0001"
                    className={`w-full h-11 px-3.5 rounded-xl border font-mono text-xs md:text-sm text-[#0F172A] focus:outline-none focus:bg-white transition-all bg-[#F8FAFC] ${
                      trackingFieldErrors?.dossierCode
                        ? 'border-red-500 ring-2 ring-red-200'
                        : 'border-[#CBD5E1] focus:border-[#B90E23]'
                    }`}
                  />
                  {trackingFieldErrors?.dossierCode && (
                    <p role="alert" className="text-xs font-medium text-red-700">
                      {trackingFieldErrors.dossierCode}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="tracking-last4-cccd" className="text-xs font-bold text-[#334155] flex items-center justify-between">
                    <span>4 số cuối CCCD:</span>
                    <span className="text-[10px] text-[#991B1B] font-semibold">* Bảo mật</span>
                  </label>
                  <input
                    id="tracking-last4-cccd"
                    type="text"
                    maxLength={12}
                    value={trackingLast4Cccd}
                    onChange={(e) => {
                      setTrackingLast4Cccd(e.target.value);
                      if (trackingFieldErrors?.last4Cccd) onClearTrackingError?.('last4Cccd');
                    }}
                    aria-invalid={Boolean(trackingFieldErrors?.last4Cccd)}
                    placeholder="VD: 1234 (hoặc 12 số)"
                    className={`w-full h-11 px-3.5 rounded-xl border font-mono text-xs md:text-sm text-[#0F172A] focus:outline-none focus:bg-white transition-all bg-[#F8FAFC] ${
                      trackingFieldErrors?.last4Cccd
                        ? 'border-red-500 ring-2 ring-red-200'
                        : 'border-[#CBD5E1] focus:border-[#B90E23]'
                    }`}
                  />
                  {trackingFieldErrors?.last4Cccd && (
                    <p role="alert" className="text-xs font-medium text-red-700">
                      {trackingFieldErrors.last4Cccd}
                    </p>
                  )}
                  <span className="text-[11px] text-slate-600">
                    Dùng để xác thực bảo mật hồ sơ của bạn.
                  </span>
                </div>

                {trackingError && (
                  <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#991B1B]">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{trackingError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={trackingLoading}
                  className="w-full h-11 rounded-xl bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs sm:text-sm font-bold transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-60 gov-focus-ring"
                >
                  {trackingLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang truy vấn cơ sở dữ liệu...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Tra cứu ngay</span>
                    </>
                  )}
                </button>
              </form>

              {/* Quick links to recently submitted dossiers */}
              {myDossiers.length > 0 && (
                <div className="pt-2 border-t border-[#E2E8F0] flex flex-col gap-2">
                  <span className="text-xs font-bold text-[#64748B]">Hồ sơ đã nộp trong phiên làm việc:</span>
                  <div className="flex flex-wrap gap-2">
                    {myDossiers.slice(0, 3).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setTrackingDossierCode(d.id);
                          if (d.cccd && d.cccd.length >= 4) {
                            setTrackingLast4Cccd(d.cccd.slice(-4));
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] border border-[#CBD5E1] text-[11px] font-mono font-semibold transition cursor-pointer"
                      >
                        {d.id} ({d.formType})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Detailed Progress Result Card (6 Cols) */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              {trackingResult ? (
                <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-[0_6px_28px_rgba(15,23,42,0.05)] flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-5 h-5 text-[#B90E23]" />
                      <h3 className="font-extrabold text-sm text-[#881320] uppercase tracking-wide">
                        Thông Tin Hồ Sơ &amp; Kết Quả Thụ Lý
                      </h3>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border ${
                        trackingResult.status === 'APPROVED'
                          ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                          : trackingResult.status === 'SUPPLEMENT_REQUIRED'
                          ? 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                          : trackingResult.status === 'REJECTED'
                          ? 'bg-[#FEE2E2] text-[#7F1D1D] border-[#FCA5A5]'
                          : 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                      }`}
                    >
                      {trackingResult.status === 'APPROVED'
                        ? 'ĐÃ TIẾP NHẬN / PHÊ DUYỆT'
                        : trackingResult.status === 'SUPPLEMENT_REQUIRED'
                        ? 'YÊU CẦU BỔ SUNG'
                        : trackingResult.status === 'REJECTED'
                        ? 'TỪ CHỐI TIẾP NHẬN'
                        : 'ĐANG XỬ LÝ (PENDING)'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748B]">Mã hồ sơ:</span>
                        <code className="font-mono font-bold text-sm text-[#0F2942] bg-[#E2E8F0] px-2 py-0.5 rounded">
                          {trackingResult.dossierCode}
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748B]">Thủ tục hành chính:</span>
                        <span className="font-bold text-[#0F172A] text-right max-w-xs">{trackingResult.procedureName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Số định danh công dân:</span>
                        <code className="font-mono font-bold text-[#9F0C1E]">{trackingResult.citizenCccd}</code>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[#64748B] shrink-0">Đơn vị thụ lý:</span>
                        <div className="text-right">
                          <span className="font-semibold text-[#0F172A] block">
                            {handlingWard
                              ? `UBND ${handlingWard.name}`
                              : trackingResult.wardCode
                              ? `Đơn vị mã ${trackingResult.wardCode}`
                              : `UBND ${currentWard.name}`}
                          </span>
                          {handlingWard && (
                            <>
                              <span className="text-[11px] text-[#475569] block mt-0.5">
                                {handlingWard.officeAddress}
                              </span>
                              <span className="text-[10px] text-[#64748B] block">
                                {handlingWard.workingHours || DEFAULT_HOURS}
                                {(!handlingWard.workingHours ||
                                  handlingWard.workingHours.trim() === DEFAULT_HOURS) &&
                                  ' (giờ mặc định)'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* SLA Deadline Box */}
                    <div className="p-3.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between text-xs text-[#1E40AF]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#2563EB] shrink-0" />
                        <div>
                          <span className="font-bold block">Hạn trả kết quả dự kiến:</span>
                          <span className="text-[11px] text-[#3B82F6]">
                            Theo quy định chuẩn dịch vụ Một cửa cấp xã
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-extrabold text-sm text-[#1D4ED8]">
                        {formatSlaDeadlineVi(trackingResult.slaDeadline, false)}
                      </span>
                    </div>

                    {/* Officer Feedback */}
                    {trackingResult.officerFeedback && (
                      <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex flex-col gap-1 text-xs text-[#92400E]">
                        <span className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
                          <span>Ý kiến cán bộ tiếp nhận:</span>
                        </span>
                        <p className="text-xs leading-relaxed text-[#78350F] pl-5">{trackingResult.officerFeedback}</p>
                      </div>
                    )}

                    {/* Appointment Code */}
                    {trackingResult.appointmentCode && (
                      <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between text-xs text-[#166534]">
                        <div>
                          <span className="font-bold block">Mã số lịch hẹn nhận kết quả:</span>
                          <span className="text-[11px] text-[#15803D]">
                            Vui lòng mang theo bản chính giấy tờ để đối chiếu
                          </span>
                        </div>
                        <code className="font-mono font-extrabold text-sm text-[#15803D] bg-white px-2.5 py-1 rounded-lg border border-[#86EFAC]">
                          {trackingResult.appointmentCode}
                        </code>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1">
                      <span>Thời điểm nộp: {new Date(trackingResult.createdAt).toLocaleString('vi-VN')}</span>
                      <span>Cập nhật: {new Date(trackingResult.updatedAt).toLocaleString('vi-VN')}</span>
                    </div>

                    {/* P3: Timeline lấy từ dossier_events (7.4) */}
                    {trackingResult.timeline && trackingResult.timeline.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex flex-col gap-2">
                        <span className="font-bold text-xs text-[#0F172A] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#B90E23]" />
                          <span>Lịch sử xử lý hồ sơ (Tiến trình Một cửa):</span>
                        </span>
                        <div className="space-y-2">
                          {trackingResult.timeline.map((evt, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              <div className="w-2 h-2 rounded-full bg-[#B90E23] mt-1.5 shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-slate-800">{evt.toStatus}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {new Date(evt.createdAt).toLocaleString('vi-VN')}
                                  </span>
                                </div>
                                {evt.reason && (
                                  <p className="text-slate-600 text-[11px] mt-0.5">{evt.reason}</p>
                                )}
                                <span className="text-[10px] text-slate-400">Cán bộ phụ trách: {evt.who}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-[0_6px_28px_rgba(15,23,42,0.05)] flex flex-col items-center justify-center text-center text-slate-600 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-center text-[#9F0C1E]">
                    <Clock className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#0F172A]">Chưa Có Kết Quả Tra Cứu</h3>
                    <p className="text-xs text-[#64748B] mt-1 max-w-xs leading-relaxed">
                      Nhập mã hồ sơ và 4 số cuối CCCD ở khung bên trái để xem tiến độ giải quyết, phản hồi từ cán bộ Một cửa và hạn trả kết quả dự kiến.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
  );
};
