import React from 'react';
import {
  ArrowRight,
  Camera,
  FileCheck2,
  FileDown,
  FileText,
  Laptop,
  PenTool,
  QrCode,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import type { ExtractedFormFieldsResult } from '../../services/geminiClient';
import type { VisionQualityGateResult } from '../../services/tesseractOcr';
import type { CitizenFormType, VaultDocInfo } from './useFormOcrUpload';
import { FormStep1VisionStatusBanners } from './FormStep1VisionStatusBanners';

interface FormStep1UploadSectionProps {
  selectedFormType: CitizenFormType;
  inputMode: 'upload' | 'camera' | 'manual';
  setInputMode: (mode: 'upload' | 'camera' | 'manual') => void;
  selectedFile: File | null;
  previewUrl: string | null;
  isDragging: boolean;
  isOcrProcessing: boolean;
  ocrSuccess: boolean;
  ocrError: string | null;
  ocrDetails: ExtractedFormFieldsResult | null;
  visionGateResult: VisionQualityGateResult | null;
  canvasCheckedLocally: boolean;
  vaultDocInfo: VaultDocInfo | null;
  isVaultUploading: boolean;
  vaultUploadError: string | null;
  vaultOfflineNote: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  fullName: string;
  cccd: string;
  dob: string;
  gender: string;
  address: string;
  handleFileChange: (file: File) => void;
  handleRemoveFile: () => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  onOpenQrModal: () => void;
  onOpenPrintModal: () => void;
  onNextStep: () => void;
}

export const FormStep1UploadSection: React.FC<FormStep1UploadSectionProps> = (props) => {
  const {
    inputMode, setInputMode, selectedFile, previewUrl, isDragging, visionGateResult,
    canvasCheckedLocally, fileInputRef, handleFileChange, handleRemoveFile,
    handleDragOver, handleDragLeave, handleDrop, onOpenQrModal, onOpenPrintModal, onNextStep,
  } = props;

  const visionBlocked = Boolean(
    visionGateResult &&
      (visionGateResult.isBlurry ||
        visionGateResult.isTooDark ||
        visionGateResult.isGlared ||
        !visionGateResult.templateMatched)
  );

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E8F0] gap-3">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-[#B90E23]" />
          <span className="text-sm font-bold text-[#0F172A]">Tải ảnh / quét giấy tờ</span>
        </div>

        <div className="grid grid-cols-3 sm:inline-flex w-full sm:w-auto max-w-full p-1 bg-[#F1F5F9] rounded-xl border border-[#CBD5E1] gap-1">
          <button
            type="button"
            onClick={() => setInputMode('upload')}
            className={`flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all cursor-pointer gov-focus-ring ${
              inputMode === 'upload' ? 'bg-[#B90E23] text-white shadow-xs' : 'text-[#334155] hover:text-[#750715]'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 shrink-0" />
            <span>Tải ảnh PC</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('camera')}
            className={`flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all cursor-pointer gov-focus-ring ${
              inputMode === 'camera' ? 'bg-[#B90E23] text-white shadow-xs' : 'text-[#334155] hover:text-[#750715]'
            }`}
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span>Camera</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setInputMode('manual');
              handleRemoveFile();
            }}
            className={`flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all cursor-pointer gov-focus-ring ${
              inputMode === 'manual' ? 'bg-[#B90E23] text-white shadow-xs' : 'text-[#334155] hover:text-[#750715]'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 shrink-0" />
            <span>Nhập tay</span>
          </button>
        </div>
      </div>

      {inputMode === 'upload' && (
        <div className="flex flex-col gap-3">
          {!previewUrl ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative p-5 sm:p-7 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-3.5 ${
                isDragging ? 'border-[#B90E23] bg-[#F1F5F9] scale-[1.01]' : 'border-[#CBD5E1] hover:border-[#B90E23] bg-[#F8FAFC]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleFileChange(e.target.files[0]);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-xl flex flex-col items-center justify-center gap-2.5 py-2 px-3 rounded-xl hover:bg-white/70 transition cursor-pointer gov-focus-ring"
              >
                <span className="w-12 h-12 rounded-2xl bg-[#E2E8F0] text-[#750715] flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6 text-[#750715]" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-[#0F172A]">
                    Kéo thả ảnh tờ khai, CCCD, Word (.docx) hoặc PDF
                  </span>
                  <span className="block text-xs text-[#475569] mt-1">
                    Hoặc <span className="text-[#750715] font-bold underline">bấm chọn tệp</span> (JPG, PNG, DOCX, PDF ≤ 5MB)
                  </span>
                </span>
              </button>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#CBD5E1] text-xs font-semibold text-[#750715]">
                  <Sparkles className="w-3.5 h-3.5 text-[#B90E23]" />
                  <span>Tự kiểm độ nét &amp; ánh sáng tại trình duyệt</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-[#CBD5E1] bg-white shrink-0 shadow-xs">
                    {selectedFile?.type.startsWith('image/') ? (
                      <img src={previewUrl} alt="Bản scan tờ khai" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#E2E8F0] text-[#750715]">
                        <FileText className="w-7 h-7" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[#0F172A] truncate">
                      {selectedFile?.name || 'Tệp đã tải lên'}
                    </span>
                    <span className="text-xs text-[#475569]">
                      {selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB • ' : ''}
                      {canvasCheckedLocally ? 'Đã kiểm tra độ nét' : 'Đang phân tích tệp'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-xs font-semibold text-[#334155] transition cursor-pointer gov-focus-ring"
                  >
                    Đổi tệp
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#991B1B] transition cursor-pointer gov-focus-ring"
                    aria-label="Xóa tệp đã tải"
                    title="Xóa tệp"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleFileChange(e.target.files[0]);
                }}
                className="hidden"
              />
            </div>
          )}

          <FormStep1VisionStatusBanners
            selectedFormType={props.selectedFormType}
            isOcrProcessing={props.isOcrProcessing}
            ocrSuccess={props.ocrSuccess}
            ocrError={props.ocrError}
            ocrDetails={props.ocrDetails}
            visionGateResult={props.visionGateResult}
            vaultDocInfo={props.vaultDocInfo}
            isVaultUploading={props.isVaultUploading}
            vaultUploadError={props.vaultUploadError}
            vaultOfflineNote={props.vaultOfflineNote}
            fullName={props.fullName}
            cccd={props.cccd}
            dob={props.dob}
            gender={props.gender}
            address={props.address}
          />
        </div>
      )}

      {inputMode === 'camera' && (
        <div className="relative w-full h-52 rounded-2xl bg-[#131B2E] overflow-hidden flex items-center justify-center border-2 border-dashed border-[#57DFFE]/80 shadow-inner">
          <input
            id="p3-camera-capture-input"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            capture="environment"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
                setInputMode('upload');
              }
            }}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2 text-white z-10 p-4 text-center">
            <Camera className="w-8 h-8 text-[#57DFFE]" />
            <span className="text-xs font-semibold">Chụp Ảnh Tờ Khai Hoặc Thẻ CCCD</span>
            <span className="text-[11px] text-slate-200 max-w-xs">
              Hướng camera vuông góc với tờ khai hoặc CCCD để tự động kiểm độ nét và điền thông tin.
            </span>
            <label
              htmlFor="p3-camera-capture-input"
              className="mt-2 px-3 py-1.5 rounded-lg bg-[#B90E23] hover:bg-[#8F0A1B] text-white text-xs font-semibold transition cursor-pointer"
            >
              Mở camera / Chọn ảnh thật
            </label>
          </div>
        </div>
      )}

      {inputMode === 'manual' && (
        <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#334155] flex items-center gap-2">
          <PenTool className="w-4 h-4 text-[#B90E23] shrink-0" />
          <span>Chuyển sang Bước 2 để nhập trực tiếp thông tin tờ khai.</span>
        </div>
      )}

      <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenQrModal}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F1F5F9] text-[#750715] border border-[#CBD5E1] font-bold text-xs transition cursor-pointer flex items-center gap-1.5 gov-focus-ring"
          >
            <QrCode className="w-4 h-4" />
            <span>Quét QR CCCD</span>
          </button>
          <button
            type="button"
            onClick={onOpenPrintModal}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F1F5F9] text-[#750715] border border-[#CBD5E1] font-bold text-xs transition cursor-pointer flex items-center gap-1.5 gov-focus-ring"
          >
            <FileDown className="w-4 h-4" />
            <span>Xem mẫu A4</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onNextStep}
          disabled={visionBlocked}
          className="px-5 py-2.5 rounded-xl bg-[#B90E23] hover:bg-[#8F0A1B] disabled:bg-[#94A3B8] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer disabled:cursor-not-allowed gov-focus-ring"
        >
          <span>Tiếp tục Bước 2</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
