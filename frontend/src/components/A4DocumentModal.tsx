import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  FileText,
  AlertTriangle,
  FileDown,
  Loader2,
  Check,
} from 'lucide-react';
import { useWard } from '../context/WardContext';
import { getA4TemplateByCode, type A4FormTemplate } from '../data/a4FormTemplates';
import { exportA4TemplateToDocx } from '../utils/docxExporter';
import { exportElementToPdf } from '../utils/pdfExporter';

export type AdministrativeFormType =
  | 'CT01'
  | 'TK-KS'
  | 'TK-KH'
  | 'TK-BTXH'
  | 'CHUNG-THUC'
  | 'DAT-DAI'
  | 'XAY-DUNG'
  | 'KHAI-TU'
  | 'MAI-TANG-PHI'
  | 'MOI-TRUONG'
  | 'GENERAL'
  | string;

export interface A4DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  formType?: AdministrativeFormType;
  procedureCode?: string;
  procedureTitle?: string;
  legalBasis?: string;
  marriageMode?: 'MARRIAGE_REGISTRATION' | 'MARITAL_STATUS_CONFIRMATION';
  initialData?: {
    fullName?: string;
    gender?: string;
    dob?: string;
    idNumber?: string;
    phone?: string;
    address?: string;
    // TK-KS
    childName?: string;
    birthDate?: string;
    birthPlace?: string;
    childEthnicity?: string;
    childNationality?: string;
    birthCertNumber?: string;
    birthCertIssueDate?: string;
    fatherName?: string;
    fatherDob?: string;
    fatherResidence?: string;
    motherName?: string;
    motherDob?: string;
    motherResidence?: string;
    // TK-KH
    spouseName?: string;
    spouseDob?: string;
    spouseGender?: string;
    spouseIdNumber?: string;
    spouseAddress?: string;
    applicantEthnicity?: string;
    spouseEthnicity?: string;
    applicantNationality?: string;
    spouseNationality?: string;
    maritalCertPurpose?: string;
    divorceJudgmentNumber?: string;
    divorceJudgmentDate?: string;
    deathCertNumber?: string;
    deathCertDate?: string;
    // CT01
    hostName?: string;
    hostCccd?: string;
    hostRelation?: string;
    declarationScope?: string;
    // TK-BTXH
    householdStatus?: string;
    poorHouseholdBookNumber?: string;
    disabilityLevel?: string;
    disabilityCertNumber?: string;
    disabilityCertIssueDate?: string;
    disabilityCertIssuer?: string;
    bankAccount?: string;
    guardianName?: string;
    guardianCccd?: string;
    guardianRelation?: string;
    guardianPhone?: string;
    // Generic
    [key: string]: any;
  };
}

export const A4DocumentModal: React.FC<A4DocumentModalProps> = ({
  isOpen,
  onClose,
  formType = 'GENERAL',
  procedureCode,
  procedureTitle,
  legalBasis,
  marriageMode = 'MARRIAGE_REGISTRATION',
  initialData = {},
}) => {
  const { currentWard } = useWard();
  const printableA4Ref = useRef<HTMLDivElement>(null);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfExportSuccess, setPdfExportSuccess] = useState(false);

  // Ensure scroll position resets to top on modal open so the official administrative header is always visible
  useEffect(() => {
    if (isOpen && printableA4Ref.current) {
      printableA4Ref.current.scrollTop = 0;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  // Resolve category
  const resolvedCategory = (() => {
    if (formType === 'CT01' || procedureCode === 'TTHC-CR-01') return 'CT01';
    if (formType === 'TK-KS' || procedureCode === 'TTHC-HT-01') return 'TK-KS';
    if (formType === 'TK-KH' || procedureCode === 'TTHC-HT-02') return 'TK-KH';
    if (formType === 'TK-BTXH' || procedureCode === 'TTHC-BT-01') return 'TK-BTXH';
    if (formType === 'CHUNG-THUC' || procedureCode?.startsWith('TTHC-CT-')) return 'CHUNG-THUC';
    if (formType === 'DAT-DAI' || procedureCode?.startsWith('TTHC-DC-')) return 'DAT-DAI';
    if (formType === 'XAY-DUNG' || procedureCode?.startsWith('TTHC-XD-')) return 'XAY-DUNG';
    if (formType === 'KHAI-TU' || procedureCode === 'TTHC-CR-02') return 'KHAI-TU';
    if (formType === 'MAI-TANG-PHI' || procedureCode?.startsWith('TTHC-BT-')) return 'MAI-TANG-PHI';
    if (formType === 'MOI-TRUONG' || procedureCode?.startsWith('TTHC-MT-')) return 'MOI-TRUONG';
    return formType || 'GENERAL';
  })();

  const isPolice = resolvedCategory === 'CT01' || procedureCode === 'TTHC-CR-01' || procedureCode?.includes('CR-');

  // Lookup official A4 template from the 40 standardized schemas if needed as fallback
  const officialTemplate: A4FormTemplate | undefined = procedureCode
    ? getA4TemplateByCode(procedureCode)
    : undefined;

  const effectiveTemplate: A4FormTemplate = officialTemplate || {
    procedureCode: procedureCode || 'TTHC-CẤP-XÃ',
    formCode: 'Mẫu Tờ khai chuẩn NĐ 30/2020/NĐ-CP',
    agencyType: isPolice ? 'POLICE' : 'COMMUNE_UBND',
    title: procedureTitle ? `TỜ KHAI YÊU CẦU GIẢI QUYẾT: ${procedureTitle.toUpperCase()}` : 'TỜ KHAI HÀNH CHÍNH CẤP XÃ',
    legalNote: legalBasis || 'Ban hành kèm theo quy định về thủ tục hành chính tại UBND cấp xã',
    recipient: isPolice ? 'Công an {WARD_NAME}' : 'Ủy ban nhân dân {WARD_NAME}',
    sections: [
      {
        title: 'I. THÔNG TIN NGƯỜI YÊU CẦU',
        fields: [
          { label: '1. Họ, chữ đệm và tên', placeholder: initialData.fullName || '...................................................', isBold: true },
          { label: '2. Ngày sinh', placeholder: initialData.dob || '....../....../..........', type: 'grid2', secondLabel: '3. Giới tính', secondPlaceholder: initialData.gender || 'Nam / Nữ' },
          { label: '4. Số định danh cá nhân / CCCD', placeholder: initialData.idNumber || '................................', type: 'grid2', secondLabel: '5. Số điện thoại', secondPlaceholder: initialData.phone || '................................' },
          { label: '6. Nơi cư trú hiện tại', placeholder: initialData.address || `${currentWard.name}, Tỉnh An Giang` },
        ],
      },
      {
        title: 'II. NỘI DUNG YÊU CẦU GIẢI QUYẾT',
        fields: [
          { label: '1. Nội dung đề nghị', placeholder: `Đề nghị giải quyết thủ tục ${procedureTitle || ''} theo đúng quy định pháp luật.` },
          { label: '2. Hồ sơ tài liệu kèm theo', placeholder: 'Bản sao CCCD/Định danh điện tử VNeID và các giấy tờ chuyên ngành liên quan.' },
        ],
      },
    ],
    commitText: 'Tôi xin cam đoan những lời khai trên đây là hoàn toàn đúng sự thật và chịu trách nhiệm trước pháp luật về lời khai của mình.',
    signatures: [
      { role: 'CÁN BỘ TIẾP NHẬN MỘT CỬA', note: '(Ký, ghi rõ họ tên và đóng dấu)' },
      { role: 'NGƯỜI LÀM ĐƠN / TỜ KHAI', note: '(Ký và ghi rõ họ tên)' },
    ],
  };

  const handleDownloadDocx = async () => {
    try {
      setIsExportingDocx(true);
      await exportA4TemplateToDocx(effectiveTemplate, currentWard.name, initialData);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Lỗi xuất file Word (.docx):', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printableA4Ref.current) return;
    try {
      setIsExportingPdf(true);
      const filename = `${effectiveTemplate.procedureCode || 'TO-KHAI'}_${currentWard.name.replace(/\s+/g, '_')}.pdf`;
      await exportElementToPdf(printableA4Ref.current, filename);
      setPdfExportSuccess(true);
      setTimeout(() => setPdfExportSuccess(false), 3000);
    } catch (err) {
      console.error('Lỗi xuất file PDF (.pdf):', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const blankDot = '...................................................';
  const shortDot = '........................';

  // Helper to render value or blank dotted line
  const val = (v?: string, fallback: string = blankDot) => {
    return v && v.trim() ? v.trim() : fallback;
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden a4-print-overlay">
      <div className="relative bg-white w-full max-w-4xl max-h-[94vh] rounded-2xl shadow-2xl flex flex-col my-auto a4-print-sheet border border-[#CBD5E1] overflow-hidden">
        {/* Top Control Bar (Chỉ có tải Word .docx và tải PDF .pdf, không in ấn) */}
        <div className="no-print shrink-0 bg-[#00796B] text-white px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#004D40]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              A4
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Văn Bản Mẫu A4 Chuẩn Nghị Định 30/2020/NĐ-CP
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-800/80 text-teal-100 border border-teal-500/40">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  Chuẩn Cổng DVC Quốc Gia
                </span>
              </div>
              <p className="text-xs text-teal-100 truncate max-w-xl">
                {procedureTitle || (officialTemplate ? officialTemplate.title : 'Tờ khai hành chính cấp xã/phường')}
              </p>
            </div>
          </div>

          {/* Action Buttons: Tải Word (.docx) & Tải PDF (.pdf) */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Action 1: Tải File Word (.docx) */}
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isExportingDocx}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-60"
              title="Tải mẫu văn bản Word (.docx) chuẩn Nghị định 30/2020/NĐ-CP để lưu về máy và tự điền"
            >
              {isExportingDocx ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang Tạo File Word...</span>
                </>
              ) : exportSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Đã Tải Xong (.docx)</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Tải Mẫu Word (.docx)</span>
                </>
              )}
            </button>

            {/* Action 2: Tải File PDF (.pdf) trực tiếp về máy */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-60"
              title="Tải trực tiếp tệp PDF tiêu chuẩn về thiết bị để lưu trữ hoặc nộp dịch vụ công trực tuyến"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang Tạo File PDF...</span>
                </>
              ) : pdfExportSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-sky-200" />
                  <span>Đã Tải Xong (.pdf)</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-sky-200" />
                  <span>Tải File PDF (.pdf)</span>
                </>
              )}
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

        {/* Citizen Guidance Bar (Hidden when printing via CSS @media print) */}
        <div className="no-print shrink-0 bg-teal-50 border-b border-teal-200 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs text-teal-950">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-teal-700 text-white font-bold text-[10px] uppercase shrink-0">
              Tiện ích tải về máy
            </span>
            <span className="leading-tight">
              Bà con bấm <strong>"Tải Mẫu Word (.docx)"</strong> để lưu file về máy tính/điện thoại tự điền thông tin, hoặc bấm <strong>"Tải File PDF (.pdf)"</strong> để tải trực tiếp tệp PDF nộp hồ sơ dịch vụ công trực tuyến.
            </span>
          </div>
        </div>

        {/* Printable A4 Sheet Body */}
        <div
          ref={printableA4Ref}
          className="flex-1 overflow-y-auto p-6 sm:p-10 md:p-12 text-[#0F172A] bg-white text-[13pt] leading-relaxed select-text font-administrative font-times"
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
                Mã TTHC: {procedureCode || 'TTHC-CẤP-XÃ'}
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

          {/* ========================================================================= */}
          {/* 1. MẪU CT01: CƯ TRÚ (THÔNG TƯ 66/2023/TT-BCA)                            */}
          {/* ========================================================================= */}
          {resolvedCategory === 'CT01' && (
            <div className="space-y-4">
              <div className="text-center my-4">
                <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                  TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ
                </h1>
                <p className="text-[11pt] italic text-neutral-700 mt-1">
                  (Mẫu CT01 ban hành kèm theo Thông tư số 66/2023/TT-BCA ngày 17/11/2023 của Bộ Công an)
                </p>
                <div className="mt-3 font-bold italic text-[12pt]">
                  Kính gửi: Công an {currentWard.name}
                </div>
              </div>

              <div className="space-y-2.5 text-[12pt]">
                <div>1. Họ, chữ đệm và tên: <strong className="uppercase">{val(initialData.fullName)}</strong></div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">2. Ngày, tháng, năm sinh: <strong>{val(initialData.dob, '....../....../..........')}</strong></div>
                  <div className="col-span-6">3. Giới tính: <strong>{val(initialData.gender, '............')}</strong></div>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">4. Số định danh cá nhân / CCCD: <strong className="font-mono">{val(initialData.idNumber, '........................')}</strong></div>
                  <div className="col-span-6">5. Số điện thoại: <strong>{val(initialData.phone, shortDot)}</strong></div>
                </div>
                <div>6. Nơi thường trú hiện tại: <strong>{val(initialData.address, `${currentWard.name}, Tỉnh An Giang`)}</strong></div>
                <div>7. Nơi tạm trú: <strong>{shortDot}</strong></div>
                <div>8. Nơi ở hiện tại: <strong>{val(initialData.address, `${currentWard.name}, Tỉnh An Giang`)}</strong></div>
                <div>9. Họ và tên chủ hộ: <strong>{val(initialData.hostName)}</strong></div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Số ĐDCN/CCCD chủ hộ: <strong className="font-mono">{val(initialData.hostCccd, shortDot)}</strong></div>
                  <div className="col-span-6">Quan hệ với chủ hộ: <strong>{val(initialData.hostRelation, shortDot)}</strong></div>
                </div>
                <div>
                  10. Nội dung đề nghị: <strong>{val(initialData.declarationScope, 'Đăng ký thường trú / tạm trú theo quy định')}</strong>
                </div>
                <div>
                  11. Những người cùng thay đổi thông tin cư trú:
                  <div className="mt-1 border border-black text-center text-[11pt]">
                    <div className="grid grid-cols-12 font-bold border-b border-black py-1 bg-neutral-100">
                      <div className="col-span-1 border-r border-black">TT</div>
                      <div className="col-span-4 border-r border-black">Họ và tên</div>
                      <div className="col-span-2 border-r border-black">Ngày sinh</div>
                      <div className="col-span-2 border-r border-black">Giới tính</div>
                      <div className="col-span-3">Số ĐDCN / CCCD</div>
                    </div>
                    <div className="grid grid-cols-12 py-1.5 border-b border-neutral-300">
                      <div className="col-span-1 border-r border-black">1</div>
                      <div className="col-span-4 border-r border-black font-semibold uppercase">{val(initialData.fullName, shortDot)}</div>
                      <div className="col-span-2 border-r border-black">{val(initialData.dob, '....../....../....')}</div>
                      <div className="col-span-2 border-r border-black">{val(initialData.gender, '....')}</div>
                      <div className="col-span-3 font-mono">{val(initialData.idNumber, shortDot)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chữ ký CT01 */}
              <div className="pt-6 mt-6 border-t border-neutral-300">
                <div className="grid grid-cols-3 gap-2 text-center text-[11pt]">
                  <div>
                    <div className="font-bold uppercase">Ý KIẾN CỦA CHỦ HỘ</div>
                    <div className="italic text-[9.5pt] text-neutral-600">(Ký, ghi rõ họ tên)</div>
                    <div className="h-20"></div>
                    <div className="font-bold">{val(initialData.hostName, shortDot)}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">CHỦ SỞ HỮU CHỖ Ở</div>
                    <div className="italic text-[9.5pt] text-neutral-600">(Ký, ghi rõ họ tên)</div>
                    <div className="h-20"></div>
                    <div className="font-bold">{shortDot}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">NGƯỜI KÊ KHAI</div>
                    <div className="italic text-[9.5pt] text-neutral-600">(Ký, ghi rõ họ tên)</div>
                    <div className="h-20 flex items-end justify-center font-bold uppercase text-[11pt]">
                      {initialData.fullName || ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. MẪU TK-KS: KHAI SINH (THÔNG TƯ 04/2020/TT-BTP)                         */}
          {/* ========================================================================= */}
          {resolvedCategory === 'TK-KS' && (
            <div className="space-y-4">
              <div className="text-center my-4">
                <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                  TỜ KHAI ĐĂNG KÝ KHAI SINH
                </h1>
                <p className="text-[11pt] italic text-neutral-700 mt-1">
                  (Ban hành kèm theo Thông tư số 04/2020/TT-BTP ngày 28/05/2020 của Bộ Tư pháp)
                </p>
                <div className="mt-3 font-bold italic text-[12pt]">
                  Kính gửi: Ủy ban nhân dân {currentWard.name}
                </div>
              </div>

              <div className="space-y-2.5 text-[12pt]">
                <div className="font-bold uppercase text-neutral-900 border-b border-neutral-300 pb-1">
                  I. THÔNG TIN NGƯỜI ĐƯỢC KHAI SINH
                </div>
                <div>Họ, chữ đệm, tên: <strong className="uppercase">{val(initialData.childName || initialData.fullName)}</strong></div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Ngày, tháng, năm sinh: <strong>{val(initialData.birthDate || initialData.dob, '....../....../..........')}</strong></div>
                  <div className="col-span-6">Giới tính: <strong>{val(initialData.gender, 'Nam / Nữ')}</strong></div>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Dân tộc: <strong>{val(initialData.childEthnicity, 'Kinh')}</strong></div>
                  <div className="col-span-6">Quốc tịch: <strong>{val(initialData.childNationality, 'Việt Nam')}</strong></div>
                </div>
                <div>Nơi sinh (Cơ sở y tế): <strong>{val(initialData.birthPlace, 'Bệnh viện Đa khoa')}</strong></div>
                <div>Số Giấy chứng sinh: <strong>{val(initialData.birthCertNumber, shortDot)}</strong>, ngày cấp: <strong>{val(initialData.birthCertIssueDate, '....../....../..........')}</strong></div>

                <div className="font-bold uppercase text-neutral-900 border-b border-neutral-300 pb-1 pt-2">
                  II. THÔNG TIN CHA, MẸ
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Họ tên mẹ: <strong className="uppercase">{val(initialData.motherName, shortDot)}</strong></div>
                  <div className="col-span-6">Ngày sinh mẹ: <strong>{val(initialData.motherDob, '....../....../....')}</strong></div>
                </div>
                <div>Nơi cư trú của mẹ: <strong>{val(initialData.motherResidence, `${currentWard.name}, Tỉnh An Giang`)}</strong></div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Họ tên cha: <strong className="uppercase">{val(initialData.fatherName, shortDot)}</strong></div>
                  <div className="col-span-6">Ngày sinh cha: <strong>{val(initialData.fatherDob, '....../....../....')}</strong></div>
                </div>
                <div>Nơi cư trú của cha: <strong>{val(initialData.fatherResidence, `${currentWard.name}, Tỉnh An Giang`)}</strong></div>
              </div>

              <div className="pt-6 mt-6 border-t border-neutral-300">
                <p className="italic text-[11pt] text-neutral-800">
                  Tôi cam đoan những lời khai trên đây là đúng sự thật và chịu trách nhiệm trước pháp luật về cam đoan của mình.
                </p>
                <div className="grid grid-cols-2 gap-4 mt-6 text-center text-[12pt]">
                  <div>
                    <div className="font-bold uppercase">CÔNG CHỨC TƯ PHÁP - HỘ TỊCH</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký, ghi rõ họ tên)</div>
                    <div className="h-20"></div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">NGƯỜI ĐI KHAI SINH</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký và ghi rõ họ tên)</div>
                    <div className="h-20 flex items-end justify-center font-bold uppercase text-[11pt]">
                      {initialData.fullName || ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. MẪU TK-KH: KẾT HÔN & XÁC NHẬN TÌNH TRẠNG HÔN NHÂN                     */}
          {/* ========================================================================= */}
          {resolvedCategory === 'TK-KH' && (
            <div className="space-y-4">
              <div className="text-center my-4">
                <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                  {marriageMode === 'MARITAL_STATUS_CONFIRMATION'
                    ? 'TỜ KHAI CẤP GIẤY XÁC NHẬN TÌNH TRẠNG HÔN NHÂN'
                    : 'TỜ KHAI ĐĂNG KÝ KẾT HÔN'}
                </h1>
                <p className="text-[11pt] italic text-neutral-700 mt-1">
                  (Ban hành kèm theo Thông tư số 04/2020/TT-BTP ngày 28/05/2020 của Bộ Tư pháp)
                </p>
                <div className="mt-3 font-bold italic text-[12pt]">
                  Kính gửi: Ủy ban nhân dân {currentWard.name}
                </div>
              </div>

              {marriageMode === 'MARITAL_STATUS_CONFIRMATION' ? (
                /* Chế độ Xác nhận tình trạng hôn nhân */
                <div className="space-y-2.5 text-[12pt]">
                  <div>1. Họ, chữ đệm và tên: <strong className="uppercase">{val(initialData.fullName)}</strong></div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-6">Ngày sinh: <strong>{val(initialData.dob, '....../....../..........')}</strong></div>
                    <div className="col-span-6">Giới tính: <strong>{val(initialData.gender, 'Nam / Nữ')}</strong></div>
                  </div>
                  <div>CCCD/Định danh cá nhân: <strong className="font-mono">{val(initialData.idNumber, shortDot)}</strong></div>
                  <div>Nơi cư trú hiện tại: <strong>{val(initialData.address, `${currentWard.name}, Tỉnh An Giang`)}</strong></div>
                  <div>
                    Tình trạng hôn nhân hiện tại: <strong>Chưa đăng ký kết hôn với ai / Đã ly hôn theo Bản án</strong>
                  </div>
                  <div>
                    Mục đích sử dụng Giấy xác nhận: <strong className="text-teal-900">{val(initialData.maritalCertPurpose, 'Để làm thủ tục chuyển nhượng quyền sử dụng đất / Vay vốn ngân hàng')}</strong>
                  </div>
                </div>
              ) : (
                /* Chế độ Đăng ký kết hôn: 2 cột Nam & Nữ */
                <div className="space-y-3 text-[12pt]">
                  <div className="grid grid-cols-2 gap-4 border border-black p-3 text-[11.5pt]">
                    {/* Cột Bên Nam */}
                    <div className="space-y-1.5 border-r border-black pr-3">
                      <div className="font-bold uppercase text-center border-b border-black pb-1">BÊN NAM</div>
                      <div>Họ tên: <strong className="uppercase">{val(initialData.gender === 'Nam' ? initialData.fullName : initialData.spouseName)}</strong></div>
                      <div>Ngày sinh: <strong>{val(initialData.gender === 'Nam' ? initialData.dob : initialData.spouseDob, '....../....../....')}</strong></div>
                      <div>Dân tộc: <strong>{val(initialData.gender === 'Nam' ? initialData.applicantEthnicity : initialData.spouseEthnicity, 'Kinh')}</strong></div>
                      <div>Quốc tịch: <strong>Việt Nam</strong></div>
                      <div>CCCD: <strong className="font-mono">{val(initialData.gender === 'Nam' ? initialData.idNumber : initialData.spouseIdNumber, shortDot)}</strong></div>
                      <div>Nơi cư trú: <strong>{val(initialData.gender === 'Nam' ? initialData.address : initialData.spouseAddress, `${currentWard.name}, An Giang`)}</strong></div>
                      <div>Kết hôn lần thứ: <strong>01</strong></div>
                    </div>

                    {/* Cột Bên Nữ */}
                    <div className="space-y-1.5 pl-1">
                      <div className="font-bold uppercase text-center border-b border-black pb-1">BÊN NỮ</div>
                      <div>Họ tên: <strong className="uppercase">{val(initialData.gender === 'Nữ' ? initialData.fullName : initialData.spouseName)}</strong></div>
                      <div>Ngày sinh: <strong>{val(initialData.gender === 'Nữ' ? initialData.dob : initialData.spouseDob, '....../....../....')}</strong></div>
                      <div>Dân tộc: <strong>{val(initialData.gender === 'Nữ' ? initialData.applicantEthnicity : initialData.spouseEthnicity, 'Kinh')}</strong></div>
                      <div>Quốc tịch: <strong>Việt Nam</strong></div>
                      <div>CCCD: <strong className="font-mono">{val(initialData.gender === 'Nữ' ? initialData.idNumber : initialData.spouseIdNumber, shortDot)}</strong></div>
                      <div>Nơi cư trú: <strong>{val(initialData.gender === 'Nữ' ? initialData.address : initialData.spouseAddress, `${currentWard.name}, An Giang`)}</strong></div>
                      <div>Kết hôn lần thứ: <strong>01</strong></div>
                    </div>
                  </div>

                  <p className="italic text-[11pt] text-neutral-800">
                    Chúng tôi cam đoan việc kết hôn là hoàn toàn tự nguyện, không vi phạm Điều 8 Luật Hôn nhân & Gia đình 2014 và cùng chịu trách nhiệm trước pháp luật.
                  </p>
                </div>
              )}

              <div className="pt-6 mt-6 border-t border-neutral-300">
                <div className="grid grid-cols-2 gap-4 text-center text-[12pt]">
                  <div>
                    <div className="font-bold uppercase">BÊN NAM</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký trực tiếp trước mặt công chức tiếp nhận)</div>
                    <div className="h-20 flex items-end justify-center font-bold uppercase text-[11pt]">
                      {initialData.gender === 'Nam' ? (initialData.fullName || '') : (initialData.spouseName || '')}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">BÊN NỮ</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký trực tiếp trước mặt công chức tiếp nhận)</div>
                    <div className="h-20 flex items-end justify-center font-bold uppercase text-[11pt]">
                      {initialData.gender === 'Nữ' ? (initialData.fullName || '') : (initialData.spouseName || '')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. MẪU TK-BTXH: BẢO TRỢ XÃ HỘI (NGHỊ ĐỊNH 20/2021/NĐ-CP)                 */}
          {/* ========================================================================= */}
          {resolvedCategory === 'TK-BTXH' && (
            <div className="space-y-4">
              <div className="text-center my-4">
                <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                  TỜ KHAI THÔNG TIN ĐỀ NGHỊ TRỢ CẤP XÃ HỘI HẰNG THÁNG
                </h1>
                <p className="text-[11pt] italic text-neutral-700 mt-1">
                  (Mẫu số 01 ban hành kèm theo Nghị định số 20/2021/NĐ-CP & Luật BHXH 2024)
                </p>
                <div className="mt-3 font-bold italic text-[12pt]">
                  Kính gửi: Ủy ban nhân dân {currentWard.name}
                </div>
              </div>

              <div className="space-y-2.5 text-[12pt]">
                <div>1. Họ và tên người đề nghị: <strong className="uppercase">{val(initialData.fullName)}</strong></div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Ngày sinh: <strong>{val(initialData.dob, '....../....../..........')}</strong></div>
                  <div className="col-span-6">Giới tính: <strong>{val(initialData.gender, 'Nam / Nữ')}</strong></div>
                </div>
                <div>Số định danh cá nhân / CCCD: <strong className="font-mono">{val(initialData.idNumber, shortDot)}</strong></div>
                <div>Nơi thường trú: <strong>{val(initialData.address, `${currentWard.name}, Tỉnh An Giang`)}</strong></div>
                <div>
                  2. Thuộc diện trợ cấp: <strong>Người cao tuổi từ đủ 75 tuổi trở lên không có lương hưu / Khuyết tật nặng / Hộ nghèo</strong>
                </div>
                {initialData.poorHouseholdBookNumber && (
                  <div>Số sổ hộ nghèo / Giấy chứng nhận: <strong className="font-mono">{initialData.poorHouseholdBookNumber}</strong></div>
                )}
                {initialData.disabilityCertNumber && (
                  <div>Giấy xác nhận khuyết tật số: <strong className="font-mono">{initialData.disabilityCertNumber}</strong>, ngày cấp: <strong>{initialData.disabilityCertIssueDate || shortDot}</strong> do <strong>{initialData.disabilityCertIssuer || `UBND ${currentWard.name}`}</strong> cấp.</div>
                )}
                <div>
                  3. Người giám hộ / chăm sóc (nếu có): <strong>{val(initialData.guardianName, shortDot)}</strong> (Quan hệ: <strong>{val(initialData.guardianRelation, shortDot)}</strong>, CCCD: <strong className="font-mono">{val(initialData.guardianCccd, shortDot)}</strong>)
                </div>
                <div>
                  4. Hình thức nhận trợ cấp: Tài khoản ngân hàng số: <strong className="font-mono text-teal-800">{val(initialData.bankAccount, 'Chưa đăng ký số tài khoản - nhận tiền mặt tại bưu điện')}</strong> (Chi trả theo Đề án 06 Chính phủ)
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-neutral-300">
                <div className="grid grid-cols-2 gap-4 text-center text-[12pt]">
                  <div>
                    <div className="font-bold uppercase">XÁC NHẬN CỦA TRƯỞNG ẤP/KHÓM</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký, ghi rõ họ tên)</div>
                    <div className="h-20"></div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">NGƯỜI LÀM ĐƠN / GIÁM HỘ</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký và ghi rõ họ tên)</div>
                    <div className="h-20 flex items-end justify-center font-bold uppercase text-[11pt]">
                      {initialData.fullName || ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. NHÓM CHỨNG THỰC: CT-01..08 (NGHỊ ĐỊNH 23/2015/NĐ-CP & TT 01/2020)       */}
          {/* ========================================================================= */}
          {resolvedCategory === 'CHUNG-THUC' && (
            <div className="space-y-4">
              <div className="text-center my-4">
                <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                  {procedureCode === 'TTHC-CT-02'
                    ? 'BẢN DỊCH VÀ LỜI CHỨNG THỰC CHỮ KÝ NGƯỜI DỊCH'
                    : 'VĂN BẢN YÊU CẦU CHỨNG THỰC CHỮ KÝ / HỢP ĐỒNG GIAO DỊCH'}
                </h1>
                <p className="text-[11pt] italic text-neutral-700 mt-1">
                  (Theo quy định tại Nghị định số 23/2015/NĐ-CP & Thông tư số 01/2020/TT-BTP của Bộ Tư pháp)
                </p>
                <div className="mt-3 font-bold italic text-[12pt]">
                  Kính gửi: Bộ phận Một cửa - Ủy ban nhân dân {currentWard.name}
                </div>
              </div>

              <div className="space-y-2.5 text-[12pt]">
                <div>1. Người yêu cầu chứng thực: <strong className="uppercase">{val(initialData.fullName)}</strong></div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Ngày sinh: <strong>{val(initialData.dob, '....../....../..........')}</strong></div>
                  <div className="col-span-6">CCCD số: <strong className="font-mono">{val(initialData.idNumber, shortDot)}</strong></div>
                </div>
                <div>Nơi cư trú: <strong>{val(initialData.address, `${currentWard.name}, Tỉnh An Giang`)}</strong></div>
                <div>
                  2. Nội dung yêu cầu chứng thực: <strong>Chứng thực chữ ký / điểm chỉ trên văn bản giấy tờ theo quy định pháp luật.</strong>
                </div>

                {procedureCode === 'TTHC-CT-02' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11pt] italic">
                    <strong>Lời cam đoan của người dịch:</strong> "Tôi cam đoan đã dịch chính xác nội dung từ tiếng nước ngoài sang tiếng Việt (hoặc ngược lại) và hoàn toàn chịu trách nhiệm trước pháp luật về tính chính xác của bản dịch."
                  </div>
                )}

                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-900 text-[11pt] font-semibold">
                  <AlertTriangle className="w-4 h-4 inline mr-1 text-teal-700" />
                  LƯU Ý QUAN TRỌNG: Người yêu cầu chứng thực phải ký trực tiếp trước mặt người thực hiện chứng thực tại Bộ phận Một cửa UBND (Không ký trước ở nhà).
                </div>
              </div>

              {/* Lời chứng thực của UBND cấp xã */}
              <div className="pt-6 mt-6 border-t-2 border-black space-y-2 text-[11.5pt]">
                <div className="font-bold uppercase text-center text-[12pt]">
                  LỜI CHỨNG THỰC CHỮ KÝ (Mẫu chuẩn Nghị định 23/2015/NĐ-CP)
                </div>
                <p className="leading-relaxed">
                  Ngày {day} tháng {month} năm {year}, tại Bộ phận Một cửa Ủy ban nhân dân {currentWard.name}, tỉnh An Giang.
                  <br />
                  Tôi: <strong>.............................................................</strong> - Chức vụ: <strong>Chủ tịch / Phó Chủ tịch UBND {currentWard.name}</strong>
                  <br />
                  <strong>CHỨNG THỰC:</strong> Ông/Bà <strong>{val(initialData.fullName, shortDot).toUpperCase()}</strong>, số CCCD: <strong>{val(initialData.idNumber, shortDot)}</strong> đã ký/điểm chỉ trước mặt tôi; cam đoan chịu trách nhiệm về nội dung giấy tờ.
                </p>
                <div className="grid grid-cols-2 gap-4 text-center text-[11pt] pt-2">
                  <div className="text-left pl-4">
                    Số chứng thực: ........ Quyển số: ........-SCT/CK,CĐ
                  </div>
                  <div>
                    <div className="font-bold uppercase">CHỦ TỊCH / PHÓ CHỦ TỊCH</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký, ghi rõ họ tên và đóng dấu)</div>
                    <div className="h-24"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 6. NHÓM ĐẤT ĐAI: DC-01/02 (MẪU 22 / MẪU 25 NGHỊ ĐỊNH 101/2024/NĐ-CP)     */}
          {/* ========================================================================= */}
          {resolvedCategory === 'DAT-DAI' && (
            <div className="space-y-4">
              <div className="text-center my-4">
                <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                  ĐƠN ĐĂNG KÝ BIẾN ĐỘNG ĐẤT ĐAI, TÀI SẢN GẮN LIỀN VỚI ĐẤT
                </h1>
                <p className="text-[11pt] italic text-neutral-700 mt-1">
                  (Mẫu số 22 ban hành kèm theo Nghị định số 101/2024/NĐ-CP ngày 29/07/2024 của Chính phủ)
                </p>
                <div className="mt-3 font-bold italic text-[12pt]">
                  Kính gửi: Ủy ban nhân dân {currentWard.name} - Chi nhánh Văn phòng Đăng ký đất đai
                </div>
              </div>

              <div className="space-y-2.5 text-[12pt]">
                <div>1. Người sử dụng đất: <strong className="uppercase">{val(initialData.fullName)}</strong></div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Số CCCD/ĐDCN: <strong className="font-mono">{val(initialData.idNumber, shortDot)}</strong></div>
                  <div className="col-span-6">Điện thoại: <strong>{val(initialData.phone, shortDot)}</strong></div>
                </div>
                <div>Địa chỉ liên hệ: <strong>{val(initialData.address, `${currentWard.name}, Tỉnh An Giang`)}</strong></div>

                <div className="font-bold uppercase text-neutral-900 border-b border-neutral-300 pb-1 pt-2">
                  2. THÔNG TIN THỬA ĐẤT ĐỀ NGHỊ ĐĂNG KÝ BIẾN ĐỘNG
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Thửa đất số: <strong>{shortDot}</strong></div>
                  <div className="col-span-6">Tờ bản đồ số: <strong>{shortDot}</strong></div>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Diện tích: <strong>............ m²</strong></div>
                  <div className="col-span-6">Mục đích sử dụng: <strong>Đất ở tại đô thị / nông thôn</strong></div>
                </div>
                <div>Giấy chứng nhận QSDĐ đã cấp số: <strong>................................</strong>, ngày cấp: <strong>....../....../..........</strong></div>
                <div>
                  3. Nội dung biến động đề nghị: <strong>Đăng ký chuyển nhượng / Tặng cho / Thừa kế / Đính chính thông tin thửa đất</strong>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-neutral-300">
                <div className="grid grid-cols-2 gap-4 text-center text-[12pt]">
                  <div>
                    <div className="font-bold uppercase">Ý KIẾN KIỂM TRA ĐỊA CHÍNH XÃ</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký, ghi rõ họ tên)</div>
                    <div className="h-20"></div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">NGƯỜI NỘP ĐƠN</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký và ghi rõ họ tên)</div>
                    <div className="h-20 flex items-end justify-center font-bold uppercase text-[11pt]">
                      {initialData.fullName || ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 7. NHÓM XÂY DỰNG: XD-01/02 (MẪU 01 NGHỊ ĐỊNH 15/2021/NĐ-CP)               */}
          {/* ========================================================================= */}
          {resolvedCategory === 'XAY-DUNG' && (
            <div className="space-y-4">
              <div className="text-center my-4">
                <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                  ĐƠN ĐỀ NGHỊ CẤP GIẤY PHÉP XÂY DỰNG NHÀ Ở RIÊNG LẺ
                </h1>
                <p className="text-[11pt] italic text-neutral-700 mt-1">
                  (Mẫu số 01 Phụ lục II ban hành kèm theo Nghị định số 15/2021/NĐ-CP của Chính phủ)
                </p>
                <div className="mt-3 font-bold italic text-[12pt]">
                  Kính gửi: Ủy ban nhân dân {currentWard.name} / Phòng Quản lý Đô thị
                </div>
              </div>

              <div className="space-y-2.5 text-[12pt]">
                <div>1. Chủ đầu tư: <strong className="uppercase">{val(initialData.fullName)}</strong></div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Số định danh cá nhân / CCCD: <strong className="font-mono">{val(initialData.idNumber, shortDot)}</strong></div>
                  <div className="col-span-6">Số điện thoại: <strong>{val(initialData.phone, shortDot)}</strong></div>
                </div>
                <div>Địa chỉ liên lạc: <strong>{val(initialData.address, `${currentWard.name}, Tỉnh An Giang`)}</strong></div>

                <div className="font-bold uppercase text-neutral-900 border-b border-neutral-300 pb-1 pt-2">
                  2. THÔNG SỐ CÔNG TRÌNH XÂY DỰNG
                </div>
                <div>Địa điểm xây dựng: <strong>{val(initialData.address, `${currentWard.name}, Tỉnh An Giang`)}</strong> (Thửa đất số: ......)</div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Cốt nền xây dựng: <strong>+0.45 m</strong></div>
                  <div className="col-span-6">Mật độ xây dựng: <strong>........... %</strong></div>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Diện tích sàn tầng 1: <strong>........... m²</strong></div>
                  <div className="col-span-6">Tổng diện tích sàn: <strong>........... m²</strong></div>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Chiều cao công trình: <strong>........... m</strong></div>
                  <div className="col-span-6">Số tầng: <strong>02 tầng (kể cả tum)</strong></div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-neutral-300">
                <div className="grid grid-cols-2 gap-4 text-center text-[12pt]">
                  <div>
                    <div className="font-bold uppercase">CÁN BỘ THỤ LÝ HỒ SƠ</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký, ghi rõ họ tên)</div>
                    <div className="h-20"></div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">CHỦ ĐẦU TƯ</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký và ghi rõ họ tên)</div>
                    <div className="h-20 flex items-end justify-center font-bold uppercase text-[11pt]">
                      {initialData.fullName || ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 8. NHÓM KHAI TỬ LIÊN THÔNG: CR-02 (MẪU 02 NGHỊ ĐỊNH 63/2024/NĐ-CP)        */}
          {/* ========================================================================= */}
          {resolvedCategory === 'KHAI-TU' && (
            <div className="space-y-4">
              <div className="text-center my-4">
                <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                  TỜ KHAI LIÊN THÔNG ĐIỆN TỬ: ĐĂNG KÝ KHAI TỬ, XÓA THƯỜNG TRÚ & MAI TÁNG PHÍ
                </h1>
                <p className="text-[11pt] italic text-neutral-700 mt-1">
                  (Mẫu số 02 ban hành kèm theo Nghị định số 63/2024/NĐ-CP & Đề án 06 Chính phủ)
                </p>
                <div className="mt-3 font-bold italic text-[12pt]">
                  Kính gửi: Ủy ban nhân dân {currentWard.name}
                </div>
              </div>

              <div className="space-y-2.5 text-[12pt]">
                <div>1. Người yêu cầu khai tử: <strong className="uppercase">{val(initialData.fullName)}</strong></div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">CCCD người yêu cầu: <strong className="font-mono">{val(initialData.idNumber, shortDot)}</strong></div>
                  <div className="col-span-6">Quan hệ với người chết: <strong>Con đẻ / Thân nhân</strong></div>
                </div>

                <div className="font-bold uppercase text-neutral-900 border-b border-neutral-300 pb-1 pt-2">
                  2. THÔNG TIN NGƯỜI ĐÃ CHẾT
                </div>
                <div>Họ, chữ đệm, tên: <strong className="uppercase">....................................................................</strong></div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Ngày tháng năm sinh: <strong>....../....../..........</strong></div>
                  <div className="col-span-6">Giới tính: <strong>Nam / Nữ</strong></div>
                </div>
                <div>Nơi thường trú cuối cùng: <strong>{val(initialData.address, `${currentWard.name}, Tỉnh An Giang`)}</strong></div>
                <div>Đã chết vào lúc: <strong>...... giờ ...... phút, ngày ....../....../2026</strong></div>
                <div>Giấy báo tử số: <strong>................................</strong> do Cơ sở y tế cấp.</div>
                <div>
                  3. Lựa chọn dịch vụ liên thông: [x] Đăng ký khai tử; [x] Xóa đăng ký thường trú; [x] Hỗ trợ chi phí mai táng Đề án 06.
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-neutral-300">
                <div className="grid grid-cols-2 gap-4 text-center text-[12pt]">
                  <div>
                    <div className="font-bold uppercase">CÔNG CHỨC TƯ PHÁP - HỘ TỊCH</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký, ghi rõ họ tên)</div>
                    <div className="h-20"></div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">NGƯỜI YÊU CẦU</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký và ghi rõ họ tên)</div>
                    <div className="h-20 flex items-end justify-center font-bold uppercase text-[11pt]">
                      {initialData.fullName || ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 9. NHÓM MAI TÁNG PHÍ & NGƯỜI CÓ CÔNG: BT-02..05 (MẪU 03 NGHỊ ĐỊNH 20/2021) */}
          {/* ========================================================================= */}
          {resolvedCategory === 'MAI-TANG-PHI' && (
            <div className="space-y-4">
              <div className="text-center my-4">
                <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                  TỜ KHAI ĐỀ NGHỊ HỖ TRỢ CHI PHÍ MAI TÁNG & TRỢ CẤP ĐỘC LẬP
                </h1>
                <p className="text-[11pt] italic text-neutral-700 mt-1">
                  (Mẫu số 03 ban hành kèm theo Nghị định số 20/2021/NĐ-CP của Chính phủ)
                </p>
                <div className="mt-3 font-bold italic text-[12pt]">
                  Kính gửi: Ủy ban nhân dân {currentWard.name}
                </div>
              </div>

              <div className="space-y-2.5 text-[12pt]">
                <div>1. Người đứng tên kê khai: <strong className="uppercase">{val(initialData.fullName)}</strong></div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Số CCCD: <strong className="font-mono">{val(initialData.idNumber, shortDot)}</strong></div>
                  <div className="col-span-6">Quan hệ với người chết: <strong>Người trực tiếp đứng ra lo mai táng</strong></div>
                </div>
                <div>Nơi cư trú: <strong>{val(initialData.address, `${currentWard.name}, Tỉnh An Giang`)}</strong></div>
                <div>2. Đề nghị hỗ trợ chi phí mai táng cho đối tượng: <strong>Người cao tuổi / Người khuyết tật nặng / Người có công</strong></div>
                <div>Trích lục khai tử số: <strong>................................</strong> ngày cấp: <strong>....../....../..........</strong></div>
                <div>
                  3. Số tài khoản nhận hỗ trợ: <strong className="font-mono text-teal-800">{val(initialData.bankAccount, 'Đăng ký tài khoản nhận trợ cấp theo Đề án 06')}</strong>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-neutral-300">
                <div className="grid grid-cols-2 gap-4 text-center text-[12pt]">
                  <div>
                    <div className="font-bold uppercase">ỦY BAN NHÂN DÂN {currentWard.name.toUpperCase()}</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký, đóng dấu duyệt hỗ trợ)</div>
                    <div className="h-20"></div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">NGƯỜI KÊ KHAI</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký và ghi rõ họ tên)</div>
                    <div className="h-20 flex items-end justify-center font-bold uppercase text-[11pt]">
                      {initialData.fullName || ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 10. NHÓM MÔI TRƯỜNG: MT-01 (MẪU 47 THÔNG TƯ 02/2022/TT-BTNMT)              */}
          {/* ========================================================================= */}
          {resolvedCategory === 'MOI-TRUONG' && (
            <div className="space-y-4">
              <div className="text-center my-4">
                <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                  BẢN ĐĂNG KÝ MÔI TRƯỜNG CỦA CƠ SỞ SẢN XUẤT, KINH DOANH, DỊCH VỤ
                </h1>
                <p className="text-[11pt] italic text-neutral-700 mt-1">
                  (Mẫu số 47 Phụ lục II ban hành kèm theo Thông tư số 02/2022/TT-BTNMT của Bộ TN&MT)
                </p>
                <div className="mt-3 font-bold italic text-[12pt]">
                  Kính gửi: Ủy ban nhân dân {currentWard.name}
                </div>
              </div>

              <div className="space-y-2.5 text-[12pt]">
                <div>1. Tên chủ cơ sở: <strong className="uppercase">{val(initialData.fullName)}</strong></div>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">Số CCCD / Mã số thuế: <strong className="font-mono">{val(initialData.idNumber, shortDot)}</strong></div>
                  <div className="col-span-6">Số điện thoại: <strong>{val(initialData.phone, shortDot)}</strong></div>
                </div>
                <div>Địa chỉ cơ sở: <strong>{val(initialData.address, `${currentWard.name}, Tỉnh An Giang`)}</strong></div>
                <div>
                  2. Quy mô, công suất hoạt động: Cơ sở thương mại, dịch vụ, sản xuất quy mô hộ gia đình, không thuộc đối tượng phải lập ĐTM.
                </div>
                <div>
                  3. Nguồn phát sinh và biện pháp xử lý chất thải:
                  <ul className="list-disc pl-6 space-y-1 text-[11pt] text-neutral-700 mt-1">
                    <li>Nước thải: Thu gom qua hệ thống thoát nước chung, xử lý bằng bể tự hoại 3 ngăn.</li>
                    <li>Rác thải sinh hoạt: Hợp đồng thu gom định kỳ với Công ty Môi trường đô thị.</li>
                    <li>Tiếng ồn, bụi: Bố trí vách ngăn, hoạt động đúng khung giờ quy định.</li>
                  </ul>
                </div>
                <div>
                  4. Cam kết: Cơ sở cam kết thực hiện đúng Luật Bảo vệ Môi trường 2020 và chịu sự kiểm tra giám sát của UBND {currentWard.name}.
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-neutral-300">
                <div className="grid grid-cols-2 gap-4 text-center text-[12pt]">
                  <div>
                    <div className="font-bold uppercase">TIẾP NHẬN BẢN ĐĂNG KÝ (UBND XÃ)</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký, ghi ngày tiếp nhận và đóng dấu)</div>
                    <div className="h-20"></div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">ĐẠI DIỆN CƠ SỞ</div>
                    <div className="italic text-[10pt] text-neutral-600">(Ký và ghi rõ họ tên)</div>
                    <div className="h-20 flex items-end justify-center font-bold uppercase text-[11pt]">
                      {initialData.fullName || ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 11. GENERAL / OFFICIAL TEMPLATE FALLBACK                                 */}
          {/* ========================================================================= */}
          {resolvedCategory === 'GENERAL' && (
            officialTemplate ? (
              <div className="space-y-4 text-[12pt]">
                <div className="text-center my-4">
                  <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                    {officialTemplate.title}
                  </h1>
                  <p className="text-[11pt] italic text-neutral-700 mt-1">
                    {officialTemplate.legalNote} [{officialTemplate.formCode}]
                  </p>
                  <div className="mt-3 font-bold italic text-[12pt]">
                    Kính gửi: {officialTemplate.recipient.replace('{WARD_NAME}', currentWard.name)}
                  </div>
                </div>

                {officialTemplate.sections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-2.5">
                    {section.title && (
                      <div className="font-bold text-[12pt] uppercase tracking-wide text-neutral-900 pt-2 border-b border-neutral-300 pb-1">
                        {section.title}
                      </div>
                    )}

                    <div className="space-y-2">
                      {section.fields.map((field, fIdx) => {
                        const dynamicVal = field.label.includes('Họ, chữ đệm') || field.label.includes('Họ và tên')
                          ? (initialData.fullName || blankDot)
                          : field.label.includes('Ngày, tháng, năm sinh')
                          ? (initialData.dob || '....../....../..........')
                          : field.label.includes('CCCD') || field.label.includes('định danh')
                          ? (initialData.idNumber || shortDot)
                          : field.label.includes('Nơi thường trú') || field.label.includes('Nơi ở')
                          ? (initialData.address || `${currentWard.name}, Tỉnh An Giang`)
                          : (field.placeholder || blankDot);

                        if (field.type === 'grid2') {
                          return (
                            <div key={fIdx} className="grid grid-cols-12 gap-3 py-0.5">
                              <div className="col-span-12 sm:col-span-6">
                                <span>{field.label}: </span>
                                <strong className={field.isBold ? 'uppercase' : ''}>
                                  {dynamicVal}
                                </strong>
                              </div>
                              {field.secondLabel && (
                                <div className="col-span-12 sm:col-span-6">
                                  <span>{field.secondLabel}: </span>
                                  <strong>
                                    {field.secondPlaceholder || shortDot}
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
                              {dynamicVal}
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="pt-6 mt-6 border-t border-neutral-300">
                  <p className="italic text-neutral-800 text-[11pt] leading-relaxed">
                    {officialTemplate.commitText}
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-8 pt-2 text-center text-[12pt]">
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
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-[12pt]">
                <div className="text-center my-4">
                  <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                    {procedureTitle ? `TỜ KHAI: ${procedureTitle.toUpperCase()}` : 'TỜ KHAI HÀNH CHÍNH CẤP XÃ'}
                  </h1>
                  <p className="text-[11pt] italic text-neutral-700 mt-1">
                    {legalBasis || 'Ban hành kèm theo quy định về thủ tục hành chính tại UBND cấp xã'}
                  </p>
                  <div className="mt-3 font-bold italic text-[12pt]">
                    Kính gửi: {isPolice ? `Công an ${currentWard.name}` : `Ủy ban nhân dân ${currentWard.name}`}
                  </div>
                </div>

                <div>
                  1. Người yêu cầu giải quyết thủ tục: <strong className="uppercase">{val(initialData.fullName)}</strong>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-6">Ngày sinh: <strong>{val(initialData.dob, '....../....../..........')}</strong></span>
                  <span className="col-span-6">CCCD/Định danh: <strong className="font-mono">{val(initialData.idNumber, shortDot)}</strong></span>
                </div>
                <div>
                  Nơi cư trú hiện tại: <strong>{val(initialData.address, `${currentWard.name}, Tỉnh An Giang`)}</strong>
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

                <div className="pt-6 mt-6 border-t border-neutral-300">
                  <div className="grid grid-cols-2 gap-4 mt-8 pt-2 text-center text-[12pt]">
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
                  </div>
                </div>
              </div>
            )
          )}
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
