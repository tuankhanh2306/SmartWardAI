import React from 'react';
import {
  AlertCircle, AlertTriangle, Calendar, Clock, FileCheck2, RefreshCw, Search
} from 'lucide-react';
import type { WardItem } from '../../data/anGiangWards';
import type { DossierTrackingResponse, LiveFormDossier } from '../../api/client';

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
}

export const DossierTrackingTab: React.FC<DossierTrackingTabProps> = (props) => {
  const {
    currentWard, handleTrackDossier, trackingDossierCode, setTrackingDossierCode,
    trackingLast4Cccd, setTrackingLast4Cccd, trackingError, trackingLoading,
    myDossiers, trackingResult,
  } = props;

  return (
        <section className="flex flex-col gap-5 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Tracking Form & Query Box (6 Cols) */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
                <div className="w-10 h-10 rounded-xl bg-[#00796B]/10 flex items-center justify-center text-[#00796B]">
                  <Search className="w-5 h-5 text-[#0F766E]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">Tra Cứu Tiến Độ Giải Quyết Hồ Sơ</h2>
                  <p className="text-xs text-[#64748B]">
                    Truy vấn dữ liệu thời gian thực từ cơ sở dữ liệu PostgreSQL Một cửa UBND {currentWard.name}
                  </p>
                </div>
              </div>

              <form onSubmit={handleTrackDossier} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#334155] flex items-center justify-between">
                    <span>Mã số hồ sơ (In trên biên nhận hoặc cấp khi nộp):</span>
                    <span className="text-[10px] text-[#DC2626] font-semibold">* Bắt buộc</span>
                  </label>
                  <input
                    type="text"
                    value={trackingDossierCode}
                    onChange={(e) => setTrackingDossierCode(e.target.value)}
                    placeholder="Ví dụ: HS-20261111-BENNGHE-0001"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#CBD5E1] font-mono text-xs md:text-sm text-[#0F172A] focus:outline-none focus:border-[#00796B] focus:bg-white transition-all bg-[#F8FAFC]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#334155] flex items-center justify-between">
                    <span>4 số cuối CCCD / Số định danh công dân:</span>
                    <span className="text-[10px] text-[#DC2626] font-semibold">* Xác thực bảo mật</span>
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={trackingLast4Cccd}
                    onChange={(e) => setTrackingLast4Cccd(e.target.value)}
                    placeholder="Ví dụ: 1234 (hoặc đủ 12 số CCCD)"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#CBD5E1] font-mono text-xs md:text-sm text-[#0F172A] focus:outline-none focus:border-[#00796B] focus:bg-white transition-all bg-[#F8FAFC]"
                  />
                  <span className="text-[11px] text-[#64748B]">
                    Hệ thống đối soát 4 số cuối với hồ sơ lưu trữ để bảo vệ bí mật đời tư công dân theo Nghị định 13/2023/NĐ-CP.
                  </span>
                </div>

                {trackingError && (
                  <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#DC2626]">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{trackingError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={trackingLoading}
                  className="w-full h-11 rounded-xl bg-[#00796B] hover:bg-[#00695C] text-white text-xs font-bold transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
                >
                  {trackingLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang truy vấn cơ sở dữ liệu...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Tra Cứu Tiến Độ Ngay</span>
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
                <div className="p-6 rounded-3xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-5 h-5 text-[#00796B]" />
                      <h3 className="font-bold text-sm text-[#0F172A]">Thông Tin Hồ Sơ & Kết Quả Thụ Lý</h3>
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
                        <span className="text-[#64748B]">Số định danh công dân:</span>
                        <code className="font-mono font-bold text-[#00796B]">{trackingResult.citizenCccd}</code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748B]">Đơn vị thụ lý:</span>
                        <span className="font-semibold text-[#0F172A]">UBND {currentWard.name}</span>
                      </div>
                    </div>

                    {/* SLA Deadline Box */}
                    <div className="p-3.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between text-xs text-[#1E40AF]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#2563EB] shrink-0" />
                        <div>
                          <span className="font-bold block">Thời hạn cam kết giải quyết (SLA):</span>
                          <span className="text-[11px] text-[#3B82F6]">
                            Theo quy định chuẩn dịch vụ Một cửa cấp xã
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-extrabold text-sm text-[#1D4ED8]">
                        {new Date(trackingResult.slaDeadline).toLocaleDateString('vi-VN')} 17:00
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
                          <Clock className="w-3.5 h-3.5 text-[#00796B]" />
                          <span>Lịch sử xử lý hồ sơ (Tiến trình Một cửa):</span>
                        </span>
                        <div className="space-y-2">
                          {trackingResult.timeline.map((evt, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              <div className="w-2 h-2 rounded-full bg-[#00796B] mt-1.5 shrink-0" />
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
                <div className="p-8 rounded-3xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col items-center justify-center text-center text-[#64748B] gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#00796B]">
                    <Clock className="w-7 h-7 text-[#0F766E]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#0F172A]">Chưa Có Kết Quả Tra Cứu</h3>
                    <p className="text-xs text-[#64748B] mt-1 max-w-xs leading-relaxed">
                      Nhập mã hồ sơ và 4 số cuối CCCD ở khung bên trái để xem tiến độ giải quyết, phản hồi từ cán bộ Một cửa và thời hạn cam kết SLA.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
  );
};
