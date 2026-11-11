import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { useWard } from '../context/WardContext';
import { getA4TemplateByCode, type A4FormTemplate } from '../data/a4FormTemplates';

export interface A4DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  formType?: 'CT01' | 'TK-KS' | 'TK-KH' | 'TK-BTXH' | 'GENERAL' | string;
  procedureCode?: string;
  procedureTitle?: string;
  legalBasis?: string;
  initialData?: {
    fullName?: string;
    gender?: string;
    dob?: string;
    idNumber?: string;
    phone?: string;
    address?: string;
    spouseName?: string;
    spouseDob?: string;
    spouseIdNumber?: string;
    childName?: string;
    birthDate?: string;
    birthPlace?: string;
  };
}

export const A4DocumentModal: React.FC<A4DocumentModalProps> = ({
  isOpen,
  onClose,
  formType = 'GENERAL',
  procedureCode,
  procedureTitle,
  legalBasis,
  initialData = {},
}) => {
  const { currentWard } = useWard();

  if (!isOpen) return null;

  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  // Lookup official A4 template from the 40 standardized schemas
  const officialTemplate: A4FormTemplate | undefined = procedureCode
    ? getA4TemplateByCode(procedureCode)
    : undefined;

  const isPolice = officialTemplate?.agencyType === 'POLICE' || formType === 'CT01';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto a4-print-overlay">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col my-auto a4-print-sheet border border-[#CBD5E1] overflow-hidden">
        {/* Top Control Bar (Hidden when printing via CSS @media print) */}
        <div className="no-print bg-[#00796B] text-white px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#004D40]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              A4
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Văn Bản Mẫu A4 Chuẩn Nghị Định 30/2020/NĐ-CP
                </h3>
                {officialTemplate && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-800/80 text-teal-100 border border-teal-500/40">
                    <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                    Đúng Mẫu Cổng DVC
                  </span>
                )}
              </div>
              <p className="text-xs text-teal-100 truncate max-w-xl">
                {officialTemplate
                  ? `${officialTemplate.formCode} • ${officialTemplate.title}`
                  : procedureTitle || 'Tờ khai hành chính cấp xã'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-white text-[#00796B] hover:bg-teal-50 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>In Tờ Khai (Ctrl + P)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable A4 Sheet Body */}
        <div
          className="p-8 sm:p-12 text-[#0F172A] bg-white text-[13pt] leading-relaxed select-text max-h-[80vh] overflow-y-auto font-administrative font-times"
          style={{ fontFamily: "'Times New Roman', 'Tinos', Times, 'Liberation Serif', serif" }}
        >
          {/* Header per Decree 30/2020/ND-CP */}
          <div className="grid grid-cols-12 gap-4 pb-4">
            <div className="col-span-5 text-center">
              <div className="text-[11pt] uppercase tracking-wide">
                {isPolice ? 'CÔNG AN TỈNH AN GIANG' : 'ỦY BAN NHÂN DÂN TỈNH AN GIANG'}
              </div>
              <div className="text-[12pt] font-bold uppercase tracking-wide">
                {isPolice
                  ? `CÔNG AN ${currentWard.name.toUpperCase()}`
                  : `UBND ${currentWard.name.toUpperCase()}`}
              </div>
              <div className="w-20 mx-auto my-1 border-b border-black"></div>
              <div className="text-[10pt] italic text-neutral-600">
                Mã TTHC: {procedureCode || 'TTHC-XÃ'}
              </div>
            </div>

            <div className="col-span-7 text-center">
              <div className="text-[12pt] font-bold uppercase tracking-wide">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </div>
              <div className="text-[13pt] font-bold">
                Độc lập - Tự do - Hạnh phúc
              </div>
              <div className="w-44 mx-auto my-1 border-b-2 border-black"></div>
              <div className="text-[11pt] italic text-right pr-4 pt-1">
                {currentWard.name}, ngày {day} tháng {month} năm {year}
              </div>
            </div>
          </div>

          {/* Title and Legal Baseline */}
          <div className="text-center my-6">
            <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase tracking-wide leading-snug">
              {officialTemplate ? officialTemplate.title : (procedureTitle ? `TỜ KHAI: ${procedureTitle.toUpperCase()}` : 'TỜ KHAI HÀNH CHÍNH CẤP XÃ')}
            </h1>
            <p className="text-[11pt] italic text-neutral-700 mt-1.5">
              {officialTemplate
                ? `${officialTemplate.legalNote} [${officialTemplate.formCode}]`
                : (legalBasis || 'Ban hành kèm theo quy định về thủ tục hành chính tại UBND cấp xã')}
            </p>

            <div className="mt-4 font-bold italic text-[12pt]">
              Kính gửi:{' '}
              {officialTemplate
                ? officialTemplate.recipient.replace('{WARD_NAME}', currentWard.name)
                : (isPolice ? `Công an ${currentWard.name}` : `Ủy ban nhân dân ${currentWard.name}`)}
            </div>
          </div>

          {/* DYNAMIC SECTIONS FROM OFFICIAL 40 TEMPLATES */}
          {officialTemplate ? (
            <div className="space-y-4 text-[12pt]">
              {officialTemplate.sections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-2.5">
                  {section.title && (
                    <div className="font-bold text-[12pt] uppercase tracking-wide text-neutral-900 pt-2 border-b border-neutral-300 pb-1">
                      {section.title}
                    </div>
                  )}

                  <div className="space-y-2">
                    {section.fields.map((field, fIdx) => {
                      if (field.type === 'grid2') {
                        return (
                          <div key={fIdx} className="grid grid-cols-12 gap-3 py-0.5">
                            <div className="col-span-12 sm:col-span-6">
                              <span>{field.label}: </span>
                              <strong className={field.isBold ? 'uppercase' : ''}>
                                {field.placeholder || '...................................................'}
                              </strong>
                            </div>
                            {field.secondLabel && (
                              <div className="col-span-12 sm:col-span-6">
                                <span>{field.secondLabel}: </span>
                                <strong>
                                  {field.secondPlaceholder || '...................................................'}
                                </strong>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div key={fIdx} className="py-0.5 leading-relaxed">
                          <span>{field.label}: </span>
                          <strong className={field.isBold ? 'uppercase' : ''}>
                            {field.placeholder || '.......................................................................'}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Fallback generic administrative form */
            <div className="space-y-3 text-[12pt]">
              <div>
                1. Người yêu cầu giải quyết thủ tục: <strong className="uppercase">{initialData.fullName || '...................................................'}</strong>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-6">Ngày sinh: <strong>{initialData.dob || '....../....../..........'}</strong></span>
                <span className="col-span-6">CCCD/Định danh: <strong className="font-mono">{initialData.idNumber || '................................'}</strong></span>
              </div>
              <div>
                Nơi cư trú hiện tại: <strong>{initialData.address || `${currentWard.name}, Tỉnh An Giang`}</strong>
              </div>
              <div>
                2. Nội dung yêu cầu giải quyết:
                <div className="p-3 my-2 border border-dashed border-neutral-400 rounded-sm text-neutral-800">
                  Đề nghị {isPolice ? `Công an ${currentWard.name}` : `UBND ${currentWard.name}`} tiếp nhận, thụ lý và giải quyết thủ tục <strong>{procedureTitle}</strong> theo đúng trình tự và quy định pháp luật.
                </div>
              </div>
              <div>
                3. Giấy tờ đính kèm theo hồ sơ:
                <ul className="list-disc pl-6 space-y-1 text-[11pt] text-neutral-700 mt-1">
                  <li>Bản sao CCCD/Định danh điện tử VNeID mức 2.</li>
                  <li>Các giấy tờ chuyên ngành theo yêu cầu của thủ tục hành chính.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Cam đoan & Ký tên */}
          <div className="pt-6 mt-6 border-t border-neutral-300">
            <p className="italic text-neutral-800 text-[11pt] leading-relaxed">
              {officialTemplate
                ? officialTemplate.commitText
                : 'Tôi xin cam đoan những lời khai trên đây là hoàn toàn đúng sự thật và chịu trách nhiệm trước pháp luật về lời khai của mình.'}
            </p>

            <div className="grid grid-cols-2 gap-4 mt-8 pt-2 text-center text-[12pt]">
              {officialTemplate?.signatures ? (
                officialTemplate.signatures.map((sig, sigIdx) => (
                  <div key={sigIdx}>
                    <div className="font-bold uppercase tracking-wide">{sig.role}</div>
                    <div className="italic text-[10pt] text-neutral-600">{sig.note}</div>
                    <div className="h-24 flex items-end justify-center font-bold uppercase text-[11pt]">
                      {sigIdx === 1 ? (initialData.fullName || '') : ''}
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div>
                    <div className="font-bold uppercase">CÁN BỘ TIẾP NHẬN MỘT CỬA</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký, ghi rõ họ tên và đóng dấu)</div>
                    <div className="h-24"></div>
                  </div>

                  <div>
                    <div className="font-bold uppercase">NGƯỜI LÀM ĐƠN / TỜ KHAI</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký và ghi rõ họ tên)</div>
                    <div className="h-24 flex items-end justify-center font-bold uppercase text-[11pt]">
                      {initialData.fullName || ''}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="no-print bg-[#F8FAFC] px-6 py-3 border-t border-[#CBD5E1] flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-neutral-500 italic">
            * Văn bản được chuẩn hóa định dạng phục vụ tiếp nhận trực tiếp tại Bộ phận Một cửa {isPolice ? `Công an ${currentWard.name}` : `UBND ${currentWard.name}`}.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Đóng Lại
          </button>
        </div>
      </div>
    </div>
  );
};

export default A4DocumentModal;
