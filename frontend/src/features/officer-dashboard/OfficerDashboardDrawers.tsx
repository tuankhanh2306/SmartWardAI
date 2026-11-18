import React from 'react';
import {
  AlertCircle, AlertTriangle, BookOpen, BrainCircuit, Check,
  CheckCircle2, FileCheck2, Mail, PhoneCall, RefreshCw, ShieldCheck, Sparkles, UserCheck, X
} from 'lucide-react';
import type { WardItem } from '../../data/anGiangWards';
import type { HitlGrayZoneItem } from '../../api/client';

export interface OfficerDashboardDrawersProps {
  ward: WardItem;
  selectedIncident: any;
  setSelectedIncident: (v: any) => void;
  updateIncidentStatus: (id: string, status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED') => void;
  selectedHitlItem: HitlGrayZoneItem | null;
  setSelectedHitlItem: (v: HitlGrayZoneItem | null) => void;
  draftAnswers: Record<string, string>;
  setDraftAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  resolvingId: string | null;
  handleApproveHitl: (item: HitlGrayZoneItem) => void;
  selectedDossier: any;
  setSelectedDossier: (v: any) => void;
  vaultStatus: 'IDLE' | 'LOADING' | 'VIEWING' | 'CONSUMED_410' | 'ERROR';
  vaultTokenConsumed: boolean;
  showVaultScan: boolean;
  vaultLoading: boolean;
  handleCloseVaultDocument: () => void;
  handleOpenVaultDocument: () => void;
  vaultImageBlobUrl: string | null;
  vaultError: string | null;
  officerCustomNote: string;
  setOfficerCustomNote: (v: string) => void;
  handleApproveDossier: (id: string) => void;
  handleRequestSupplement: (id: string) => void;
}

export const OfficerDashboardDrawers: React.FC<OfficerDashboardDrawersProps> = (props) => {
  const {
    ward, selectedIncident, setSelectedIncident, updateIncidentStatus,
    selectedHitlItem, setSelectedHitlItem, draftAnswers, setDraftAnswers,
    resolvingId, handleApproveHitl, selectedDossier, setSelectedDossier,
    vaultStatus, vaultTokenConsumed, showVaultScan, vaultLoading,
    handleCloseVaultDocument, handleOpenVaultDocument, vaultImageBlobUrl,
    vaultError, officerCustomNote, setOfficerCustomNote,
    handleApproveDossier, handleRequestSupplement,
  } = props;

  return (
    <>
      {/* ========================================================================= */}
      {/* 5. PROGRESSIVE DISCLOSURE DRAWER: SLIDE-OVER FOR SELECTED INCIDENT        */}
      {/* ========================================================================= */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fadeIn">
          {/* Backdrop click to close */}
          <div
            className="flex-1"
            onClick={() => setSelectedIncident(null)}
          />

          {/* Drawer Body */}
          <div className="w-full sm:w-[500px] md:w-[540px] bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#CBD5E1] animate-slideLeft z-10">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#0F2942] text-white">
                  <AlertTriangle className="w-5 h-5 text-[#38BDF8]" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#0F2942]">
                      {selectedIncident.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        selectedIncident.urgency === 'HIGH'
                          ? 'bg-[#FEE2E2] text-[#DC2626]'
                          : selectedIncident.urgency === 'MEDIUM'
                          ? 'bg-[#FEF3C7] text-[#D97706]'
                          : 'bg-[#F0FDFA] text-[#00687A]'
                      }`}
                    >
                      {selectedIncident.urgency}
                    </span>
                  </div>
                  <span className="text-xs text-[#64748B] block mt-0.5">
                    Thời gian tiếp nhận: {selectedIncident.reportedTime}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              {/* Incident Title & Category */}
              <div>
                <span className="text-xs font-bold text-[#00687A] uppercase tracking-wider block mb-1">
                  Lĩnh vực: {selectedIncident.category}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#0F172A] leading-snug">
                  {selectedIncident.title}
                </h3>
              </div>

              {/* Duplicate Reports Merged Indicator */}
              <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E40AF] flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
                <span>
                  Đã tổng hợp <strong>{selectedIncident.duplicatesMerged} phản ánh cùng điểm sự cố</strong> từ người dân trên địa bàn.
                </span>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-[#475569]">Mô tả chi tiết hiện trường:</span>
                <p className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs sm:text-sm text-[#0F172A] leading-relaxed">
                  {selectedIncident.description || 'Không có mô tả chi tiết bổ sung.'}
                </p>
              </div>

              {/* Location and Reporter Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px] font-medium">Địa chỉ phát sinh:</span>
                  <span className="font-bold text-[#0F172A] mt-0.5 block">{selectedIncident.address}</span>
                  <span className="font-mono text-[10px] text-[#00687A] mt-1 block">
                    Tọa độ: {selectedIncident.lat.toFixed(4)}, {selectedIncident.lon.toFixed(4)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
                  <span className="text-[#991B1B] block text-[11px] font-bold">
                    SĐT người dân báo tin khẩn (Giám sát liên hệ):
                  </span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-mono font-extrabold text-sm text-[#DC2626]">
                      {selectedIncident.reporterPhone || '0912.***.***'}
                    </span>
                    {selectedIncident.reporterPhone && (
                      <a
                        href={`tel:${selectedIncident.reporterPhone.replace(/\*/g, '0')}`}
                        className="px-2.5 py-1 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Gọi xác minh</span>
                      </a>
                    )}
                  </div>
                  <span className="text-[11px] text-[#16A34A] mt-1 block font-semibold">
                    {selectedIncident.reporterHomeWardName &&
                    selectedIncident.reporterHomeWardName !== ward.name
                      ? `Công dân từ ${selectedIncident.reporterHomeWardName} báo khi đi qua địa bàn`
                      : 'Kèm SĐT bắt buộc để người giám sát liên hệ'}
                  </span>
                </div>
              </div>

              {/* Officer Note */}
              {selectedIncident.officerNote && (
                <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs">
                  <span className="font-bold text-[#166534] block mb-1">Ghi chú cán bộ phụ trách:</span>
                  <p className="text-[#14532D] leading-relaxed">{selectedIncident.officerNote}</p>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col gap-2.5">
              <span className="text-xs font-bold text-[#475569]">Chuyển đổi trạng thái xử lý:</span>
              <div className="flex items-center gap-2">
                {selectedIncident.status !== 'IN_PROGRESS' && (
                  <button
                    type="button"
                    onClick={() => updateIncidentStatus(selectedIncident.id, 'IN_PROGRESS')}
                    className="flex-1 py-2.5 rounded-xl bg-[#0F2942] hover:bg-[#1E3A5F] text-white text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    Tiếp Nhận Xử Lý
                  </button>
                )}

                {selectedIncident.status !== 'RESOLVED' && (
                  <button
                    type="button"
                    onClick={() => updateIncidentStatus(selectedIncident.id, 'RESOLVED')}
                    className="flex-1 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    Báo Cáo Hoàn Thành
                  </button>
                )}

                {selectedIncident.status === 'RESOLVED' && (
                  <button
                    type="button"
                    onClick={() => updateIncidentStatus(selectedIncident.id, 'PENDING')}
                    className="flex-1 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#475569] text-xs font-bold transition cursor-pointer"
                  >
                    Mở Lại Xử Lý
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] text-xs font-bold hover:bg-[#F1F5F9] cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. PROGRESSIVE DISCLOSURE MODAL: HITL REVIEW & APPROVAL                   */}
      {/* ========================================================================= */}
      {selectedHitlItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl border border-[#CBD5E1] overflow-hidden flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0F2942] text-white flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5 text-[#38BDF8]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-[#0F2942]">
                    Duyệt Nội Dung Hướng Dẫn: {selectedHitlItem.id}
                  </h3>
                  <span className="text-xs text-[#64748B]">
                    Thủ tục liên quan: {selectedHitlItem.candidateProcedureName}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHitlItem(null)}
                className="p-1.5 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1]">
                <span className="text-xs font-bold text-[#64748B] uppercase block mb-1">
                  Câu hỏi gốc của công dân ({selectedHitlItem.wardName}):
                </span>
                <p className="text-sm font-bold text-[#0F172A]">
                  “{selectedHitlItem.query}”
                </p>
                <div className="mt-2 pt-2 border-t border-[#E2E8F0] text-xs text-[#00687A] font-semibold flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>Căn cứ pháp lý gợi ý: {selectedHitlItem.legalReference} ({selectedHitlItem.candidateProcedureName})</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#0F2942] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#0F766E]" />
                    Nội dung trả lời chuẩn hóa (Cán bộ có thể chỉnh sửa trực tiếp trước khi duyệt):
                  </span>
                </label>
                <textarea
                  rows={6}
                  value={draftAnswers[selectedHitlItem.id] ?? selectedHitlItem.suggestedAnswer}
                  onChange={(e) =>
                    setDraftAnswers((prev) => ({
                      ...prev,
                      [selectedHitlItem.id]: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white p-3.5 text-xs sm:text-sm text-[#0F172A] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setDraftAnswers((prev) => ({
                    ...prev,
                    [selectedHitlItem.id]: selectedHitlItem.suggestedAnswer,
                  }))
                }
                className="px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-xs font-bold text-[#475569] transition cursor-pointer"
              >
                Khôi phục bản nháp AI
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedHitlItem(null)}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] text-xs font-bold hover:bg-[#F1F5F9] cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={resolvingId === selectedHitlItem.id}
                  onClick={() => handleApproveHitl(selectedHitlItem)}
                  className="px-4 py-2 rounded-xl bg-[#0F2942] hover:bg-[#1E3A5F] text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#38BDF8]" />
                  <span>
                    {resolvingId === selectedHitlItem.id
                      ? 'Đang lưu...'
                      : 'Phê Duyệt Hướng Dẫn'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. PROGRESSIVE DISCLOSURE DRAWER: SLIDE-OVER FOR SELECTED DOSSIER         */}
      {/* ========================================================================= */}
      {selectedDossier && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fadeIn">
          {/* Backdrop click to close */}
          <div
            className="flex-1"
            onClick={() => setSelectedDossier(null)}
          />

          {/* Drawer Body */}
          <div className="w-full sm:w-[500px] md:w-[560px] bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#CBD5E1] animate-slideLeft z-10">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#0F2942] text-white">
                  <FileCheck2 className="w-5 h-5 text-[#38BDF8]" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#0F2942]">
                      {selectedDossier.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        selectedDossier.status === 'VALID'
                          ? 'bg-[#ECFDF5] text-[#166534] border border-[#86EFAC]'
                          : selectedDossier.status === 'HAS_ERRORS'
                          ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                          : 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                      }`}
                    >
                      {selectedDossier.status === 'VALID'
                        ? 'Hợp lệ'
                        : selectedDossier.status === 'HAS_ERRORS'
                        ? `${selectedDossier.errorCount} lỗi cần sửa`
                        : 'Chờ sơ duyệt'}
                    </span>
                  </div>
                  <span className="text-xs text-[#64748B] block mt-0.5">
                    Thời gian tiếp nhận: {selectedDossier.submittedAt}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDossier(null)}
                className="p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              {/* Procedure & Form Title */}
              <div>
                <span className="text-xs font-bold text-[#00687A] uppercase tracking-wider block mb-1">
                  Mẫu Biểu: {selectedDossier.formType}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#0F172A] leading-snug">
                  {selectedDossier.procedure}
                </h3>
              </div>

              {/* Citizen Identity Card */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-2.5">
                <span className="text-xs font-bold text-[#0F2942] uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#0F766E]" />
                  Thông Tin Định Danh Công Dân (Đề án 06/CP)
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[#64748B] block">Họ và tên:</span>
                    <span className="font-bold text-[#0F172A] text-sm uppercase">
                      {selectedDossier.citizenName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Số định danh (CCCD 12 số):</span>
                    <span className="font-mono font-bold text-[#0F2942]">
                      {selectedDossier.cccd}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Ngày tháng năm sinh:</span>
                    <span className="font-semibold text-[#0F172A]">
                      {selectedDossier.details?.dob || 'Chưa cung cấp'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Giới tính:</span>
                    <span className="font-semibold text-[#0F172A]">
                      {selectedDossier.details?.gender || 'Chưa xác định'}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#E2E8F0] text-xs">
                  <span className="text-[#64748B] block">Địa chỉ thường trú / tạm trú kê khai:</span>
                  <span className="font-semibold text-[#0F172A] mt-0.5 block">
                    {selectedDossier.details?.address || `Xã ${ward.name}, An Giang`}
                  </span>
                </div>

                {/* Email & SĐT nhận thông báo kết quả sơ duyệt (Không dùng SMS) */}
                <div className="pt-2 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-white border border-[#CBD5E1] flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#00796B] shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#64748B] block">Email nhận Phiếu hẹn & Kết quả:</span>
                      <span className="font-mono font-bold text-[#00796B] truncate block">
                        {selectedDossier.citizenEmail || 'Chưa cung cấp email'}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-[#CBD5E1] flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-[#0F2942] shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#64748B] block">SĐT định danh tra cứu:</span>
                      <span className="font-mono font-bold text-[#0F172A] truncate block">
                        {selectedDossier.contactPhone || '0918234567'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Vision Gate Verification Summary */}
              <div className="p-3.5 rounded-2xl bg-[#F0FDFA] border border-[#99F6E4] flex items-center justify-between gap-3 text-xs text-[#0F766E]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0D9488] shrink-0" />
                  <div>
                    <span className="font-bold block">Chốt Chặn AI Thị Giác: Đã Xác Thực Trước Khi Nộp</span>
                    <span className="text-[11px] text-[#0F766E]/90">
                      Độ sắc nét: <strong>{selectedDossier.details?.sharpnessScore ?? 96}/100</strong> • Khớp đúng biểu mẫu <strong>{selectedDossier.formType}</strong>
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] font-mono text-[10px] font-bold shrink-0">
                  AI GATE PASS
                </span>
              </div>

              {/* Precheck Results */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[#475569] flex items-center justify-between">
                  <span>Kết Quả Kiểm Tra Hồ Sơ:</span>
                  <span className="text-[#0F766E] font-semibold">
                    Đối chiếu tự động
                  </span>
                </span>

                {selectedDossier.status === 'VALID' || selectedDossier.errorCount === 0 ? (
                  <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#86EFAC] text-xs text-[#166534] flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Tờ khai hợp lệ chuẩn quy định</span>
                      <p className="text-[11px] text-[#15803D] mt-0.5 leading-relaxed">
                        Các trường thông tin bắt buộc (CCCD 12 số, ngày sinh, địa chỉ, quan hệ nhân thân) đã khớp quy định. Đủ điều kiện tiếp nhận và cấp phiếu hẹn trả kết quả.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#DC2626] flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
                      <span>Phát hiện {selectedDossier.errorCount} điểm không phù hợp cần điều chỉnh:</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-[11px] text-[#B91C1C]">
                      {(selectedDossier.details?.issues && selectedDossier.details.issues.length > 0) ? (
                        selectedDossier.details.issues.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))
                      ) : (
                        <li>Thiếu tài liệu đính kèm hoặc sai lệch thông tin kê khai so với căn cước công dân.</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Document Preview (Zero-Trust One-Time Token Vault — Burn After Reading) */}
              <div className="flex flex-col gap-2.5">
                <div className="p-3.5 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] text-xs text-[#0F766E] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#0D9488] shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold">Kho Lưu Trữ Tạm Xem 1 Lần (Zero-Trust OTT Vault)</span>
                      <span className="text-[11px] text-[#0F766E]/80">
                        {vaultStatus === 'CONSUMED_410' || (vaultTokenConsumed && !showVaultScan)
                          ? 'Token xem 1 lần đã tự hủy vĩnh viễn trên Redis (Nghị định 13/2023/NĐ-CP)'
                          : 'Bản chụp đính kèm chỉ mở được duy nhất 01 lần để bảo vệ dữ liệu cá nhân'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={vaultLoading || (vaultStatus === 'CONSUMED_410' && !showVaultScan)}
                    onClick={() => {
                      if (showVaultScan) {
                        handleCloseVaultDocument();
                      } else {
                        handleOpenVaultDocument();
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                      vaultStatus === 'CONSUMED_410' && !showVaultScan
                        ? 'bg-[#E2E8F0] text-[#64748B] cursor-not-allowed'
                        : vaultLoading
                        ? 'bg-[#0F2942]/70 text-white cursor-wait'
                        : 'bg-[#0F2942] hover:bg-[#1E3A5F] text-white cursor-pointer active:scale-95'
                    }`}
                  >
                    {vaultLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#57DFFE]" />
                        <span>Đang giải mã...</span>
                      </>
                    ) : showVaultScan ? (
                      'Đóng & Tự Hủy Phiên'
                    ) : vaultStatus === 'CONSUMED_410' || vaultTokenConsumed ? (
                      'Đã Tự Hủy (HTTP 410)'
                    ) : (
                      'Mở Bản Chụp (1 Lần)'
                    )}
                  </button>
                </div>

                {/* BANNER ĐỎ CẢNH BÁO TỰ HỦY NGHỊ ĐỊNH 13/2023/NĐ-CP (HTTP 410 GONE) */}
                {(vaultStatus === 'CONSUMED_410' || (vaultTokenConsumed && !showVaultScan)) && (
                  <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#991B1B] animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold">Tài liệu bảo mật đã tự hủy theo Nghị định 13/2023/NĐ-CP</span>
                      <span className="text-[11px] text-[#B91C1C]">
                        Mã token truy cập một lần (One-Time Token) đã bị tiêu hủy vĩnh viễn khỏi Redis bằng lệnh nguyên tử GETDEL. Mọi nỗ lực truy cập lại đều bị máy chủ từ chối với mã phản hồi HTTP 410 GONE để chống sao chép và bảo vệ quyền riêng tư công dân.
                      </span>
                    </div>
                  </div>
                )}

                {/* KHUNG HIỂN THỊ HÌNH ẢNH THẬT ĐÃ GIẢI MÃ TỪ MINIO KÈM WATERMARK */}
                {showVaultScan && vaultImageBlobUrl && (
                  <div className="relative p-3 rounded-2xl bg-[#0F172A] border-2 border-[#0F2942] shadow-2xl overflow-hidden select-none animate-fadeIn flex flex-col items-center">
                    <div className="w-full text-center text-xs text-white py-1.5 font-bold flex items-center justify-between px-2 bg-slate-800/80 rounded-t-xl mb-2">
                      <span className="flex items-center gap-1.5 text-[#57DFFE]">
                        <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                        Bản chụp giải mã từ MinIO (AES-256-GCM)
                      </span>
                      <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-mono font-bold tracking-wider animate-pulse">
                        XEM 1 LẦN DUY NHẤT
                      </span>
                    </div>

                    {/* THẺ IMG HIỂN THỊ ẢNH THẬT TỪ BLOB URL */}
                    <div className="relative w-full max-h-96 flex items-center justify-center bg-black/40 rounded-lg overflow-hidden border border-slate-700">
                      <img
                        src={vaultImageBlobUrl}
                        alt="Bản chụp tài liệu công dân có đóng dấu watermark Java2D"
                        className="max-h-96 w-auto object-contain rounded select-none pointer-events-none"
                      />
                    </div>

                    <div className="w-full text-center text-[11px] text-slate-300 py-2 mt-2 border-t border-slate-700/80 flex items-center justify-between px-2">
                      <span className="text-left text-slate-400">
                        Dấu mờ bảo mật: <strong>CHỈ DÙNG ĐỂ SƠ DUYỆT HỒ SƠ TẠI UBND</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleCloseVaultDocument}
                        className="px-2.5 py-1 rounded bg-red-700 hover:bg-red-800 text-white font-bold text-[11px] transition cursor-pointer"
                      >
                        Đóng ngay
                      </button>
                    </div>
                  </div>
                )}

                {/* LỖI TRUY XUẤT NẾU CÓ */}
                {vaultError && vaultStatus === 'ERROR' && (
                  <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{vaultError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer / Officer Actions */}
            <div className="p-5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col gap-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#334155] flex items-center justify-between">
                  <span>Nội dung phản hồi gửi tự động qua Email công dân ({selectedDossier.citizenEmail || 'Chưa cung cấp email'}):</span>
                  <span className="text-[10px] text-[#00796B] font-semibold">Miễn phí 100% • Kèm Phiếu hẹn QR</span>
                </label>
                <textarea
                  rows={2}
                  value={officerCustomNote}
                  onChange={(e) => setOfficerCustomNote(e.target.value)}
                  placeholder="Nhập ghi chú hướng dẫn cụ thể (VD: Mời ông/bà mang CCCD gốc và Giấy chứng sinh bản chính đến Quầy số 2 trước 16h30)..."
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#00796B]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApproveDossier(selectedDossier.id)}
                  className="flex-1 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Duyệt Hợp Lệ & Gửi Email + Mã QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestSupplement(selectedDossier.id)}
                  className="flex-1 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Yêu Cầu Bổ Sung (Gửi Email)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDossier(null)}
                className="w-full py-2 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] text-xs font-bold hover:bg-[#F1F5F9] cursor-pointer"
              >
                Đóng ngăn thẩm định
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
