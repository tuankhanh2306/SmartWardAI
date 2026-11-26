import React, { useEffect, useState } from 'react';
import {
  AlertCircle, AlertTriangle, BookOpen, BrainCircuit, Camera, Check,
  CheckCircle2, ExternalLink, FileCheck2, Mail, Navigation, PhoneCall, RefreshCw, ShieldCheck, Sparkles, UserCheck, X, ZoomIn
} from 'lucide-react';
import type { WardItem } from '../../data/anGiangWards';
import { fetchOfficerIncidentPhotoBlobUrl, type HitlGrayZoneItem } from '../../api/client';

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
  handleRequestSupplement: (id: string, requestedItems?: string[]) => void;
}

const SUPPLEMENT_PRESET_CHIPS = [
  'Giấy chứng sinh bản chính / bản chụp rõ nét',
  'Ảnh chụp CCCD rõ nét 2 mặt',
  'Giấy chứng nhận kết hôn',
  'Chỉnh sửa thông tin tờ khai',
  'Giấy tờ chứng minh nơi cư trú',
];

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

  // TASK-031: Load authenticated SEC-09 field incident photos & Lightbox modal
  const [incidentPhotoBlobs, setIncidentPhotoBlobs] = useState<string[]>([]);
  const [incidentPhotosLoading, setIncidentPhotosLoading] = useState(false);
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState<string | null>(null);
  const [selectedSupplementItems, setSelectedSupplementItems] = useState<string[]>([]);

  useEffect(() => {
    setSelectedSupplementItems([]);
  }, [selectedDossier?.id]);

  const selectedPhotoUrlsKey = Array.isArray(selectedIncident?.photoUrls)
    ? (selectedIncident.photoUrls as string[]).join('|')
    : '';

  useEffect(() => {
    let active = true;
    const createdUrls: string[] = [];
    setLightboxPhotoUrl(null);
    if (!selectedPhotoUrlsKey) {
      setIncidentPhotoBlobs([]);
      setIncidentPhotosLoading(false);
      return;
    }
    const urls = selectedPhotoUrlsKey.split('|').filter(Boolean);
    setIncidentPhotosLoading(true);
    Promise.all(
      urls.map(async (u) => {
        try {
          const blobUrl = await fetchOfficerIncidentPhotoBlobUrl(u);
          createdUrls.push(blobUrl);
          return blobUrl;
        } catch {
          return null;
        }
      })
    ).then((loaded) => {
      if (!active) return;
      setIncidentPhotoBlobs(loaded.filter((x): x is string => Boolean(x)));
      setIncidentPhotosLoading(false);
    });
    return () => {
      active = false;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [selectedPhotoUrlsKey]);

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
            <div className="p-5 border-b-2 border-slate-200 flex items-center justify-between bg-bca-masthead text-white">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-white/20 text-[#FDE047]">
                  <AlertTriangle className="w-6 h-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-base sm:text-lg text-white">
                      {selectedIncident.id}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold ${
                        selectedIncident.urgency === 'HIGH'
                          ? 'bg-red-500 text-white'
                          : selectedIncident.urgency === 'MEDIUM'
                          ? 'bg-amber-400 text-amber-950'
                          : 'bg-emerald-400 text-emerald-950'
                      }`}
                    >
                      {selectedIncident.urgency}
                    </span>
                  </div>
                  <span className="text-xs text-white/80 block mt-0.5 font-medium">
                    Tiếp nhận lúc: {selectedIncident.reportedTime}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 cursor-pointer"
              >
                <X className="w-6 h-6" />
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

              {/* TASK-031: Field Incident Photos Grid + Click-to-Zoom Lightbox */}
              {((selectedIncident.photoUrls && selectedIncident.photoUrls.length > 0) || incidentPhotosLoading) && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-[#0F2942] flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#00687A]" />
                    <span>Ảnh hiện trường do người dân chụp ({selectedIncident.photoUrls?.length || 0} ảnh):</span>
                  </span>
                  {incidentPhotosLoading ? (
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B] flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00687A]" />
                      <span>Đang tải ảnh hiện trường bảo mật (SEC-09)...</span>
                    </div>
                  ) : incidentPhotoBlobs.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {incidentPhotoBlobs.map((blobUrl, idx) => (
                        <button
                          key={blobUrl}
                          type="button"
                          onClick={() => setLightboxPhotoUrl(blobUrl)}
                          className="group relative aspect-square rounded-xl overflow-hidden border border-[#CBD5E1] bg-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                          aria-label={`Phóng to ảnh hiện trường ${idx + 1}`}
                        >
                          <img
                            src={blobUrl}
                            alt={`Ảnh hiện trường ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-90">
                            <ZoomIn className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      Không tải được ảnh hiện trường (kiểm tra quyền đơn vị xã/phường hoặc kết nối MinIO).
                    </div>
                  )}
                </div>
              )}

              {/* Location and Reporter Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col justify-between">
                  <div>
                    <span className="text-[#64748B] block text-[11px] font-medium">Địa chỉ phát sinh:</span>
                    <span className="font-bold text-[#0F172A] mt-0.5 block">{selectedIncident.address}</span>
                    {selectedIncident.lat && selectedIncident.lon ? (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] text-[#00687A]">
                          Tọa độ: {selectedIncident.lat.toFixed(5)}, {selectedIncident.lon.toFixed(5)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                          {selectedIncident.locationSource === 'PIN_DRAGGED'
                            ? 'Ghim kéo thả'
                            : selectedIncident.locationSource === 'MANUAL'
                            ? 'Nhập tay'
                            : 'Định vị GPS'}
                          {selectedIncident.locationAccuracyM ? ` (±${selectedIncident.locationAccuracyM}m)` : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-amber-700 text-xs font-semibold mt-1 block">Chưa có vị trí</span>
                    )}
                  </div>

                  {selectedIncident.lat && selectedIncident.lon && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedIncident.lat},${selectedIncident.lon}&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-[#1E3A8A] hover:bg-[#1E40AF] text-white text-[11px] font-bold inline-flex items-center gap-1.5 shadow-2xs transition"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Chỉ đường Google Maps</span>
                      </a>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedIncident.lat},${selectedIncident.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px] font-bold inline-flex items-center gap-1 transition"
                      >
                        <ExternalLink className="w-3 h-3 text-red-600" />
                        <span>Xem bản đồ</span>
                      </a>
                    </div>
                  )}
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

          {lightboxPhotoUrl && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
              onClick={() => setLightboxPhotoUrl(null)}
            >
              <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setLightboxPhotoUrl(null)}
                  className="self-end px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Đóng ảnh</span>
                </button>
                <img
                  src={lightboxPhotoUrl}
                  alt="Ảnh hiện trường sự cố phóng to"
                  className="max-w-full max-h-[82vh] rounded-xl object-contain shadow-2xl border border-white/20"
                />
              </div>
            </div>
          )}
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
            <div className="p-5 border-b-2 border-slate-200 flex items-center justify-between bg-bca-masthead text-white">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-white/20 text-[#FDE047]">
                  <FileCheck2 className="w-6 h-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-base sm:text-lg text-white">
                      {selectedDossier.id}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold ${
                        selectedDossier.status === 'VALID'
                          ? 'bg-emerald-400 text-emerald-950'
                          : selectedDossier.status === 'HAS_ERRORS'
                          ? 'bg-red-400 text-red-950'
                          : 'bg-amber-400 text-amber-950'
                      }`}
                    >
                      {selectedDossier.status === 'VALID'
                        ? 'Hợp lệ'
                        : selectedDossier.status === 'HAS_ERRORS'
                        ? `${selectedDossier.errorCount} lỗi cần sửa`
                        : 'Chờ sơ duyệt'}
                    </span>
                  </div>
                  <span className="text-xs text-white/80 block mt-0.5 font-medium">
                    Thời gian tiếp nhận: {selectedDossier.submittedAt}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDossier(null)}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 cursor-pointer"
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

              {(selectedDossier.rawStatus || '').toUpperCase() === 'SUPPLEMENTED' && (
                <div className="p-3.5 rounded-2xl bg-[#EFF6FF] border border-[#93C5FD] text-xs text-[#1E3A8A] flex flex-col gap-1">
                  <span className="font-extrabold uppercase tracking-wide text-[#1D4ED8]">
                    Công dân vừa gửi bổ sung hồ sơ (Lần {selectedDossier.supplementCount || 1})
                  </span>
                  <span className="text-[11px]">
                    Cập nhật lúc:{' '}
                    {selectedDossier.supplementedAt
                      ? new Date(selectedDossier.supplementedAt).toLocaleString('vi-VN')
                      : selectedDossier.submittedAt}
                    . Vui lòng rà soát lại nội dung/tài liệu bổ sung để phê duyệt cấp phiếu hẹn.
                  </span>
                </div>
              )}

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
                        {selectedDossier.contactPhone || 'Chưa cung cấp SĐT'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TK-KS Birth Registration Specialized Fields (TASK-051) */}
              {selectedDossier.formType === 'Khai sinh' &&
                ((selectedDossier.details as any)?.motherName ||
                  (selectedDossier.details as any)?.birthCertNumber ||
                  (selectedDossier.details as any)?.childBirthPlace) && (
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col gap-2 text-xs">
                    <span className="font-bold text-[#750715] uppercase tracking-wider">
                      Thông Tin Hộ Tịch Khai Sinh (TTHC-HT-01 • Mẫu TK-KS)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <span className="text-[#64748B] block">Họ tên Mẹ:</span>
                        <span className="font-bold text-[#0F172A] uppercase">
                          {(selectedDossier.details as any)?.motherName || 'Chưa khai'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Họ tên Cha:</span>
                        <span className="font-bold text-[#0F172A] uppercase">
                          {(selectedDossier.details as any)?.fatherName || 'Không khai / Chưa nhận cha con'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Số Giấy chứng sinh:</span>
                        <span className="font-mono font-bold text-[#0F2942]">
                          {(selectedDossier.details as any)?.birthCertNumber || 'Chưa khai'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Dân tộc / Tình trạng hôn nhân cha mẹ:</span>
                        <span className="font-semibold text-[#0F172A]">
                          {(selectedDossier.details as any)?.childEthnicity || 'Kinh'} •{' '}
                          {(selectedDossier.details as any)?.parentsMarried === 'NO' ? 'Chưa ĐKKH' : 'Đã ĐKKH'}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[#64748B] block">Nơi sinh (Cơ sở y tế):</span>
                        <span className="font-semibold text-[#0F172A]">
                          {(selectedDossier.details as any)?.childBirthPlace || 'Chưa khai'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

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
                          ? 'Token xem 1 lần đã tự hủy vĩnh viễn trên Redis theo quy định bảo vệ dữ liệu cá nhân'
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

                {/* BANNER ĐỎ CẢNH BÁO TỰ HỦY TÀI LIỆU MỘT LẦN (HTTP 410 GONE) */}
                {(vaultStatus === 'CONSUMED_410' || (vaultTokenConsumed && !showVaultScan)) && (
                  <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#991B1B] animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold">Tài liệu bảo mật đã tự hủy theo quy định bảo vệ dữ liệu cá nhân</span>
                      <span className="text-[11px] text-[#B91C1C]">
                        Mã token truy cập một lần (One-Time Token) đã bị tiêu hủy vĩnh viễn khỏi Redis sau khi hoàn tất lượt xem đầu tiên. Mọi nỗ lực truy cập lại đều bị máy chủ từ chối với mã phản hồi HTTP 410 GONE để chống sao chép và bảo vệ quyền riêng tư công dân.
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

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-[#334155]">
                  Chọn nhanh giấy tờ / trường yêu cầu bổ sung (nếu thiếu):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SUPPLEMENT_PRESET_CHIPS.map((chip) => {
                    const active = selectedSupplementItems.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() =>
                          setSelectedSupplementItems((prev) =>
                            prev.includes(chip) ? prev.filter((x) => x !== chip) : [...prev, chip]
                          )
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          active
                            ? 'bg-[#FEF2F2] border-[#DC2626] text-[#991B1B]'
                            : 'bg-white border-[#CBD5E1] text-[#475569] hover:bg-slate-50'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}
                        {chip}
                      </button>
                    );
                  })}
                </div>
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
                  onClick={() => handleRequestSupplement(selectedDossier.id, selectedSupplementItems)}
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
