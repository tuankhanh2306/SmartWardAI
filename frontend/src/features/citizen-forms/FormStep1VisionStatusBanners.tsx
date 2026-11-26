import React from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { ExtractedFormFieldsResult } from '../../services/geminiClient';
import type { VisionQualityGateResult } from '../../services/tesseractOcr';
import type { CitizenFormType, VaultDocInfo } from './useFormOcrUpload';

interface FormStep1VisionStatusBannersProps {
  selectedFormType: CitizenFormType;
  isOcrProcessing: boolean;
  ocrSuccess: boolean;
  ocrError: string | null;
  ocrDetails: ExtractedFormFieldsResult | null;
  visionGateResult: VisionQualityGateResult | null;
  vaultDocInfo: VaultDocInfo | null;
  isVaultUploading: boolean;
  vaultUploadError: string | null;
  vaultOfflineNote: string | null;
  fullName: string;
  cccd: string;
  dob: string;
  gender: string;
  address: string;
}

export const FormStep1VisionStatusBanners: React.FC<FormStep1VisionStatusBannersProps> = ({
  selectedFormType,
  isOcrProcessing,
  ocrSuccess,
  ocrError,
  ocrDetails,
  visionGateResult,
  vaultDocInfo,
  isVaultUploading,
  vaultUploadError,
  vaultOfflineNote,
  fullName,
  cccd,
  dob,
  gender,
  address,
}) => {
  const visionBlocked = Boolean(
    visionGateResult &&
      (visionGateResult.isBlurry ||
        visionGateResult.isTooDark ||
        visionGateResult.isGlared ||
        !visionGateResult.templateMatched)
  );

  return (
    <>
      {visionGateResult && !isOcrProcessing && (
        <div
          className={`p-3.5 rounded-xl border flex flex-col gap-2.5 text-xs ${
            !visionBlocked
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
              : 'bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/15 pb-2">
            <span className="font-extrabold flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Kết quả kiểm tra ảnh &amp; biểu mẫu</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                !visionBlocked ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]'
              }`}
            >
              {!visionBlocked ? 'ĐẠT CHUẨN — SẴN SÀNG GỬI' : 'CẦN CHỤP LẠI'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg bg-white border border-current/15 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0F172A] text-[11px]">1. Độ nét &amp; Ánh sáng</span>
                {!visionGateResult.isBlurry && !visionGateResult.isTooDark && !visionGateResult.isGlared ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#065F46]" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-[#991B1B]" />
                )}
              </div>
              <span className="font-mono font-extrabold text-xs">
                Nét: {visionGateResult.sharpnessScore}/100 • Sáng: {visionGateResult.brightnessScore}/255
              </span>
              <span className="text-[10px] text-[#334155] leading-tight">{visionGateResult.qualityMessage}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-current/15 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0F172A] text-[11px]">2. Khớp mục đã chọn</span>
                {visionGateResult.templateMatched ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#065F46]" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-[#991B1B]" />
                )}
              </div>
              <span className="font-mono font-extrabold text-xs">Mẫu {selectedFormType}</span>
              <span className="text-[10px] text-[#334155] leading-tight">{visionGateResult.templateMessage}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-current/15 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0F172A] text-[11px]">3. Nhận diện chữ điền</span>
                {(ocrDetails?.extractedFieldsCount ?? 0) >= 3 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#065F46]" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-[#92400E]" />
                )}
              </div>
              <span className="font-mono font-extrabold text-xs">
                {ocrDetails?.extractedFieldsCount ?? 0} mục rõ chữ
              </span>
              <span className="text-[10px] text-[#334155] leading-tight">
                {(ocrDetails?.extractedFieldsCount ?? 0) >= 3
                  ? 'Chữ viết/in rõ ràng, trích xuất tốt'
                  : 'Chưa trích xuất sâu hoặc cần nhập tay bước 2'}
              </span>
            </div>
          </div>
        </div>
      )}

      {isOcrProcessing && (
        <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center gap-3 text-xs text-[#1E3A8A]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#1D4ED8] shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold">Đang kiểm tra ảnh &amp; đọc thông tin...</span>
            <span className="text-[11px] text-[#1E40AF]">Tự kiểm tra độ nét trước khi gửi hồ sơ</span>
          </div>
        </div>
      )}

      {ocrSuccess && !isOcrProcessing && (
        <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex flex-col gap-2 text-xs text-[#065F46]">
          <div className="flex items-center gap-2 font-bold">
            <Check className="w-4 h-4 text-[#065F46] shrink-0" />
            <span>Đã đọc thông tin từ ảnh chụp thành công</span>
          </div>
          <div className="text-[11px] text-[#065F46] flex flex-wrap gap-2 pt-1 border-t border-[#A7F3D0]/50">
            <span className="font-medium">Đã tự động điền:</span>
            {fullName && <span className="px-2 py-0.5 bg-white rounded border border-[#A7F3D0] font-semibold">Mục 1 (Họ tên): {fullName}</span>}
            {cccd && <span className="px-2 py-0.5 bg-white rounded border border-[#A7F3D0] font-semibold">Mục 4 (ĐDCN): {cccd}</span>}
            {dob && <span className="px-2 py-0.5 bg-white rounded border border-[#A7F3D0] font-semibold">Mục 2 (Sinh): {dob}</span>}
            {gender && <span className="px-2 py-0.5 bg-white rounded border border-[#A7F3D0] font-semibold">Mục 3 (Giới tính): {gender}</span>}
            {address && <span className="px-2 py-0.5 bg-white rounded border border-[#A7F3D0] font-semibold max-w-xs truncate" title={address}>Mục 10 (Nơi cư trú): {address}</span>}
          </div>
        </div>
      )}

      {ocrError && !isOcrProcessing && (
        <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-xs text-[#991B1B]">
          <AlertCircle className="w-4 h-4 text-[#991B1B] shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-bold">Chưa thể sử dụng ảnh này để trích xuất tự động</span>
            <span className="text-[11px]">{ocrError}</span>
            <span className="text-[11px] text-[#7F1D1D] mt-1 font-medium">
              Quý công dân vui lòng bấm &quot;Xóa tệp&quot; để chọn ảnh rõ hơn hoặc chuyển sang chế độ &quot;Nhập tay&quot;.
            </span>
          </div>
        </div>
      )}

      {isVaultUploading && (
        <div className="p-3 rounded-xl bg-[#F7EEDF] border border-[#E5D4B3] flex items-center gap-2.5 text-xs text-[#750715]">
          <RefreshCw className="w-4 h-4 animate-spin text-[#B90E23]" />
          <span>Đang lưu tệp hồ sơ an toàn...</span>
        </div>
      )}

      {vaultDocInfo && !isVaultUploading && (
        <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between gap-2 text-xs text-[#065F46]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#065F46] shrink-0" />
            <div>
              <span className="font-bold block">Đã lưu tệp hồ sơ an toàn</span>
              <span className="text-[11px]">Mã tệp: <code className="font-mono">{vaultDocInfo.docId}</code></span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#065F46] text-[10px] font-bold">Đã bảo mật</span>
        </div>
      )}

      {vaultOfflineNote && !isVaultUploading && (
        <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center gap-2 text-xs text-[#92400E]">
          <ShieldCheck className="w-4 h-4 shrink-0 text-[#B45309]" />
          <span>{vaultOfflineNote}</span>
        </div>
      )}

      {vaultUploadError && !isVaultUploading && (
        <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 text-xs text-[#991B1B]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{vaultUploadError}</span>
        </div>
      )}
    </>
  );
};
