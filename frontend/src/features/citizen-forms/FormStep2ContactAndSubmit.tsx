import React from 'react';
import { AlertCircle, Check, ChevronLeft, FileDown, Mail, RefreshCw, Sparkles } from 'lucide-react';

interface FormStep2ContactAndSubmitProps {
  citizenEmail: string;
  setCitizenEmail: (v: string) => void;
  phoneNumber: string;
  setPhoneNumber: (v: string) => void;
  formErrors: Record<string, string>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  dossierEmailInputRef: React.RefObject<HTMLInputElement | null>;
  dossierPhoneInputRef: React.RefObject<HTMLInputElement | null>;
  submitError: string | null;
  formLoading: boolean;
  visionBlocked: boolean;
  onBackStep1: () => void;
  onOpenPrintModal: () => void;
  onPrecheck: () => void;
}

export const FormStep2ContactAndSubmit: React.FC<FormStep2ContactAndSubmitProps> = ({
  citizenEmail,
  setCitizenEmail,
  phoneNumber,
  setPhoneNumber,
  formErrors,
  setFormErrors,
  dossierEmailInputRef,
  dossierPhoneInputRef,
  submitError,
  formLoading,
  visionBlocked,
  onBackStep1,
  onOpenPrintModal,
  onPrecheck,
}) => (
  <>
    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#750715] shrink-0" />
          <span className="text-xs font-extrabold text-[#0F172A]">Nhận kết quả &amp; Mã QR qua Email</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-[#F7EEDF] text-[#750715] text-[10px] font-bold">Miễn phí</span>
      </div>
      <p className="text-[11px] text-[#475569] leading-relaxed">Hệ thống gửi Phiếu hẹn QR về Email khi cán bộ duyệt hồ sơ.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="p3-citizen-email" className="text-[11px] font-bold text-[#334155]">Email nhận mã QR (*):</label>
            {citizenEmail && (
              <span className="text-[10px] text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded-full font-bold border border-[#A7F3D0] inline-flex items-center gap-1">
                <Check className="w-3 h-3 text-[#065F46]" /> Đã sẵn sàng nhận QR
              </span>
            )}
          </div>
          <input
            id="p3-citizen-email"
            ref={dossierEmailInputRef}
            type="email"
            value={citizenEmail}
            onChange={(e) => {
              setCitizenEmail(e.target.value);
              if (formErrors.citizenEmail) setFormErrors((prev) => ({ ...prev, citizenEmail: '' }));
            }}
            aria-invalid={Boolean(formErrors.citizenEmail)}
            placeholder="Ví dụ: congdan.angiang@gmail.com"
            className={`w-full h-9 px-3 rounded-xl border text-xs text-[#0F172A] focus:outline-none transition ${
              formErrors.citizenEmail ? 'border-red-500 bg-red-50/40 ring-2 ring-red-200' : citizenEmail ? 'border-[#10B981]/60 bg-[#F0FDF4]/30 font-semibold focus:border-[#B90E23]' : 'border-[#CBD5E1] bg-white focus:border-[#B90E23]'
            }`}
          />
          {formErrors.citizenEmail && <p role="alert" className="text-xs font-medium text-red-700 mt-0.5">{formErrors.citizenEmail}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="p3-citizen-phone" className="text-[11px] font-bold text-[#334155]">Số điện thoại liên hệ:</label>
            {phoneNumber && (
              <span className="text-[10px] text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded-full font-bold border border-[#A7F3D0] inline-flex items-center gap-1">
                <Check className="w-3 h-3 text-[#065F46]" /> Đã đồng bộ Mục 5
              </span>
            )}
          </div>
          <input
            id="p3-citizen-phone"
            ref={dossierPhoneInputRef}
            type="tel"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
              if (formErrors.phoneNumber) setFormErrors((prev) => ({ ...prev, phoneNumber: '' }));
            }}
            aria-invalid={Boolean(formErrors.phoneNumber)}
            placeholder="Ví dụ: 0918234567"
            className={`w-full h-9 px-3 rounded-xl border text-xs text-[#0F172A] focus:outline-none transition ${
              formErrors.phoneNumber ? 'border-red-500 bg-red-50/40 ring-2 ring-red-200' : phoneNumber ? 'border-[#10B981]/60 bg-[#F0FDF4]/30 font-semibold focus:border-[#B90E23]' : 'border-[#CBD5E1] bg-white focus:border-[#B90E23]'
            }`}
          />
          {formErrors.phoneNumber && <p role="alert" className="text-xs font-medium text-red-700 mt-0.5">{formErrors.phoneNumber}</p>}
        </div>
      </div>
    </div>

    {submitError && (
      <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#991B1B] animate-shake">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-extrabold text-sm text-[#7F1D1D]">Lỗi Nộp Hồ Sơ Lên Hệ Thống</span>
            <p className="leading-relaxed text-[#991B1B]">{submitError}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onPrecheck}
          disabled={formLoading}
          className="self-end sm:self-center px-3.5 py-1.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 gov-focus-ring"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${formLoading ? 'animate-spin' : ''}`} />
          <span>Thử lại</span>
        </button>
      </div>
    )}

    <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBackStep1}
        className="px-4 py-2.5 bg-white hover:bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer gov-focus-ring"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Quay lại Bước 1</span>
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenPrintModal}
          className="px-4 py-2.5 bg-white hover:bg-[#F1F5F9] text-[#750715] border border-[#CBD5E1] rounded-xl font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer gov-focus-ring"
        >
          <FileDown className="w-4 h-4 text-[#750715]" />
          <span>Xem mẫu A4</span>
        </button>

        <button
          type="button"
          onClick={onPrecheck}
          disabled={formLoading || visionBlocked}
          className="px-6 py-2.5 bg-[#B90E23] hover:bg-[#8F0A1B] disabled:bg-[#94A3B8] text-white rounded-xl font-semibold text-xs shadow-xs flex items-center gap-2 active:scale-95 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed gov-focus-ring"
        >
          {formLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-amber-100" />
              <span>Đang Kiểm Tra...</span>
            </>
          ) : visionBlocked ? (
            <>
              <AlertCircle className="w-4 h-4 text-white" />
              <span>Ảnh Bị Chặn (Quay Lại Bước 1)</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-100" />
              <span>Kiểm tra &amp; tiếp tục</span>
            </>
          )}
        </button>
      </div>
    </div>
  </>
);
