import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  FileText,
  AlertTriangle,
  FileDown,
  Loader2,
  Check,
  Eye,
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
    applicantMarriageCount?: string;
    spouseMarriageCount?: string;
    issueDate?: string;
    idIssuePlace?: string;
    spouseIssueDate?: string;
    spouseIdIssuePlace?: string;
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

/**
 * Realistic standard sample data for on-screen reference & AI OCR scanning.
 * Used when the citizen previews the form so AI can extract 100% of fields with high accuracy.
 */
function getStandardSampleData(category: string, wardName: string) {
  if (category === 'CT01') {
    return {
      fullName: 'NGUYỄN MINH TUẤN KHANH',
      dob: '12/08/1998',
      gender: 'Nam',
      idNumber: '089205023490',
      phone: '0918234567',
      address: `Số 18 Đường Trần Hưng Đạo, Khóm 3, ${wardName}, Tỉnh An Giang`,
      tempAddress: 'Không có',
      currentAddress: `Số 18 Đường Trần Hưng Đạo, Khóm 3, ${wardName}, Tỉnh An Giang`,
      hostName: 'NGUYỄN VĂN BÌNH',
      hostCccd: '089075001234',
      hostRelation: 'Con đẻ',
      declarationScope: `Đăng ký thường trú tại Số 18 Đường Trần Hưng Đạo, Khóm 3, ${wardName}, Tỉnh An Giang`,
      tableRow: {
        tt: '1',
        fullName: 'NGUYỄN MINH TUẤN KHANH',
        dob: '12/08/1998',
        gender: 'Nam',
        idNumber: '089205023490',
      },
      hostSignName: 'NGUYỄN VĂN BÌNH',
      ownerSignName: 'NGUYỄN VĂN BÌNH',
      applicantSignName: 'NGUYỄN MINH TUẤN KHANH',
    };
  }

  if (category === 'TK-KS') {
    return {
      applicantName: 'NGUYỄN VĂN MINH',
      applicantDob: '15/06/1992',
      applicantResidence: `Số 45 Lê Lợi, ${wardName}, Tỉnh An Giang`,
      applicantIdDoc: 'CCCD số 089092001456 do Cục Cảnh sát QLHC về TTXH cấp ngày 10/05/2022',
      applicantRelation: 'Cha đẻ',
      fullName: 'NGUYỄN GIA BẢO',
      childName: 'NGUYỄN GIA BẢO',
      dob: '15/05/2024',
      birthDate: '15/05/2024',
      birthDateInWords: 'Ngày mười lăm tháng năm năm hai nghìn không trăm hai mươi tư',
      gender: 'Nam',
      childEthnicity: 'Kinh',
      childNationality: 'Việt Nam',
      birthPlace: `Bệnh viện Đa khoa ${wardName}, Tỉnh An Giang`,
      hometown: `${wardName}, Tỉnh An Giang`,
      birthCertNumber: '128/GCS-BVAG',
      birthCertIssueDate: '16/05/2024',
      motherName: 'TRẦN THỊ HỒNG',
      motherDob: '20/10/1995',
      motherEthnicity: 'Kinh',
      motherNationality: 'Việt Nam',
      motherResidence: `Số 45 Lê Lợi, ${wardName}, Tỉnh An Giang`,
      motherIdDoc: 'CCCD số 089195007890 do Cục Cảnh sát QLHC về TTXH cấp ngày 12/08/2021',
      fatherName: 'NGUYỄN VĂN MINH',
      fatherDob: '15/06/1992',
      fatherEthnicity: 'Kinh',
      fatherNationality: 'Việt Nam',
      fatherResidence: `Số 45 Lê Lợi, ${wardName}, Tỉnh An Giang`,
      fatherIdDoc: 'CCCD số 089092001456 do Cục Cảnh sát QLHC về TTXH cấp ngày 10/05/2022',
      applicantSignName: 'NGUYỄN VĂN MINH',
    };
  }

  if (category === 'TK-KH') {
    return {
      fullName: 'TRẦN HẢI N.',
      dob: '23/08/1987',
      gender: 'Nam',
      idNumber: '089087001122',
      issueDate: '10/07/2021',
      idIssuePlace: 'Cục CSQLHC về TTXH',
      address: `Số 45 Lê Lợi, ${wardName}, Tỉnh An Giang`,
      applicantEthnicity: 'Kinh',
      applicantNationality: 'Việt Nam',
      applicantMarriageCount: '1',
      spouseName: 'NGUYỄN THỊ H.',
      spouseDob: '26/05/1991',
      spouseGender: 'Nữ',
      spouseIdNumber: '089191003344',
      spouseIssueDate: '15/08/2022',
      spouseIdIssuePlace: 'Cục CSQLHC về TTXH',
      spouseAddress: `Số 12 Nguyễn Huệ, ${wardName}, Tỉnh An Giang`,
      spouseEthnicity: 'Kinh',
      spouseNationality: 'Việt Nam',
      spouseMarriageCount: '1',
      femaleName: 'NGUYỄN THỊ H.',
      femaleDob: '26/05/1991',
      femaleIdNumber: '089191003344',
      femaleAddress: `Số 12 Nguyễn Huệ, ${wardName}, Tỉnh An Giang`,
      maritalCertPurpose: `Để làm thủ tục đăng ký kết hôn với chị Nguyễn Thị H. tại UBND ${wardName}`,
      applicantSignName: 'TRẦN HẢI N.',
      spouseSignName: 'NGUYỄN THỊ H.',
    };
  }

  if (category === 'TK-BTXH') {
    return {
      fullName: 'NGUYỄN VĂN PHÚC',
      dob: '12/03/1948',
      gender: 'Nam',
      idNumber: '089048000123',
      address: `Số 56 Tôn Đức Thắng, ${wardName}, Tỉnh An Giang`,
      householdStatus: 'Người cao tuổi từ đủ 75 tuổi trở lên không có lương hưu',
      poorHouseholdBookNumber: 'HN-89021/UBND',
      disabilityLevel: 'Đặc biệt nặng',
      disabilityCertNumber: 'KT-045/UBND',
      disabilityCertIssueDate: '15/04/2021',
      disabilityCertIssuer: `UBND ${wardName}`,
      guardianName: 'NGUYỄN VĂN HẢI',
      guardianRelation: 'Con đẻ',
      guardianCccd: '089078004567',
      bankAccount: `089048000123 - Ngân hàng VietinBank Chi nhánh ${wardName}`,
      applicantSignName: 'NGUYỄN VĂN PHÚC',
    };
  }

  if (category === 'CHUNG-THUC') {
    return {
      fullName: 'TRẦN VĂN ĐỨC',
      dob: '25/11/1988',
      gender: 'Nam',
      idNumber: '089088005678',
      address: `Số 78 Lý Tự Trọng, ${wardName}, Tỉnh An Giang`,
      applicantSignName: 'TRẦN VĂN ĐỨC',
    };
  }

  if (category === 'DAT-DAI') {
    return {
      fullName: 'LÊ HOÀNG PHƯỚC',
      dob: '18/04/1979',
      gender: 'Nam',
      idNumber: '089079009876',
      phone: '0918234567',
      address: `Số 102 Thoại Ngọc Hầu, ${wardName}, Tỉnh An Giang`,
      plotNumber: '125',
      mapSheetNumber: '14',
      landArea: '150.5',
      applicantSignName: 'LÊ HOÀNG PHƯỚC',
    };
  }

  if (category === 'XAY-DUNG') {
    return {
      fullName: 'LÊ HOÀNG PHƯỚC',
      dob: '18/04/1979',
      gender: 'Nam',
      idNumber: '089079009876',
      phone: '0918234567',
      address: `Số 102 Thoại Ngọc Hầu, ${wardName}, Tỉnh An Giang`,
      applicantSignName: 'LÊ HOÀNG PHƯỚC',
    };
  }

  if (category === 'KHAI-TU') {
    return {
      fullName: 'NGUYỄN VĂN AN',
      idNumber: '089090001234',
      address: `Số 18 Trần Hưng Đạo, ${wardName}, Tỉnh An Giang`,
      deceasedName: 'NGUYỄN VĂN THÀNH',
      deceasedDob: '10/04/1940',
      deceasedGender: 'Nam',
      deceasedTime: '06 giờ 30 phút, ngày 10/02/2026',
      deathNoticeNumber: '45/GBT-YT',
      applicantSignName: 'NGUYỄN VĂN AN',
    };
  }

  if (category === 'MAI-TANG-PHI') {
    return {
      fullName: 'NGUYỄN VĂN AN',
      idNumber: '089090001234',
      address: `Số 18 Trần Hưng Đạo, ${wardName}, Tỉnh An Giang`,
      deathExtractNumber: '88/TLKT-UBND',
      bankAccount: `089048000123 - Ngân hàng VietinBank Chi nhánh ${wardName}`,
      applicantSignName: 'NGUYỄN VĂN AN',
    };
  }

  if (category === 'MOI-TRUONG') {
    return {
      fullName: 'NGUYỄN VĂN AN',
      idNumber: '089090001234',
      phone: '0918234567',
      address: `Số 18 Trần Hưng Đạo, ${wardName}, Tỉnh An Giang`,
      applicantSignName: 'NGUYỄN VĂN AN',
    };
  }

  // GENERAL Fallback
  return {
    fullName: 'NGUYỄN VĂN AN',
    dob: '15/05/1990',
    gender: 'Nam',
    idNumber: '089090001234',
    phone: '0918234567',
    address: `Số 18 Đường Trần Hưng Đạo, ${wardName}, Tỉnh An Giang`,
    applicantSignName: 'NGUYỄN VĂN AN',
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
  const blankPrintableA4Ref = useRef<HTMLDivElement>(null);

  // View Mode: 'SAMPLE_FILLED' (On-screen guide with complete sample data for reference & AI OCR) vs 'BLANK' (Blank template)
  const [viewMode, setViewMode] = useState<'SAMPLE_FILLED' | 'BLANK'>('SAMPLE_FILLED');

  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfExportSuccess, setPdfExportSuccess] = useState(false);

  // Ensure scroll position resets to top on modal open
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

  // Resolve exact procedureCode (especially when TK-KH switches between Marriage Registration and Marital Status Confirmation)
  const effectiveProcedureCode = (() => {
    if (
      (formType === 'TK-KH' || procedureCode === 'TTHC-HT-02') &&
      marriageMode === 'MARITAL_STATUS_CONFIRMATION'
    ) {
      return 'TTHC-HT-11';
    }
    if (procedureCode) return procedureCode;
    if (formType === 'CT01') return 'TTHC-CR-01';
    if (formType === 'TK-KS') return 'TTHC-HT-01';
    if (formType === 'TK-KH') return 'TTHC-HT-02';
    if (formType === 'TK-BTXH') return 'TTHC-BT-01';
    if (formType === 'CHUNG-THUC') return 'TTHC-CT-01';
    if (formType === 'DAT-DAI') return 'TTHC-DC-01';
    if (formType === 'XAY-DUNG') return 'TTHC-XD-01';
    if (formType === 'KHAI-TU') return 'TTHC-CR-02';
    if (formType === 'MAI-TANG-PHI') return 'TTHC-BT-02';
    if (formType === 'MOI-TRUONG') return 'TTHC-MT-01';
    return 'TTHC-CẤP-XÃ';
  })();

  // Resolve category strictly for the exact procedure code so other procedures (e.g., TTHC-DC-02, TTHC-XD-02, TTHC-BT-03..05, TTHC-CT-03..08)
  // render their exact officialTemplate from A4_FORM_TEMPLATES, matching .docx and .pdf 100%!
  const resolvedCategory = (() => {
    if (effectiveProcedureCode === 'TTHC-CR-01') return 'CT01';
    if (effectiveProcedureCode === 'TTHC-HT-01') return 'TK-KS';
    if (effectiveProcedureCode === 'TTHC-HT-02' || (formType === 'TK-KH' && effectiveProcedureCode === 'TTHC-HT-11')) {
      return 'TK-KH';
    }
    if (effectiveProcedureCode === 'TTHC-BT-01') return 'TK-BTXH';
    if (effectiveProcedureCode === 'TTHC-CT-01' || effectiveProcedureCode === 'TTHC-CT-02') return 'CHUNG-THUC';
    if (effectiveProcedureCode === 'TTHC-DC-01') return 'DAT-DAI';
    if (effectiveProcedureCode === 'TTHC-XD-01') return 'XAY-DUNG';
    if (effectiveProcedureCode === 'TTHC-CR-02') return 'KHAI-TU';
    if (effectiveProcedureCode === 'TTHC-BT-02') return 'MAI-TANG-PHI';
    if (effectiveProcedureCode === 'TTHC-MT-01') return 'MOI-TRUONG';
    return 'GENERAL';
  })();

  // Lookup official A4 template from the 40 standardized schemas
  const officialTemplate: A4FormTemplate | undefined = effectiveProcedureCode
    ? getA4TemplateByCode(effectiveProcedureCode)
    : undefined;

  const isPolice =
    officialTemplate?.agencyType === 'POLICE' ||
    resolvedCategory === 'CT01' ||
    effectiveProcedureCode === 'TTHC-CR-01';

  const isMarriageReg =
    resolvedCategory === 'TK-KH' &&
    effectiveProcedureCode === 'TTHC-HT-02' &&
    marriageMode !== 'MARITAL_STATUS_CONFIRMATION';

  const formatDisplayDate = (raw?: string): string => {
    if (!raw || !raw.trim()) return '';
    const trimmed = raw.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return trimmed;
  };

  const effectiveTemplate: A4FormTemplate = officialTemplate || {
    procedureCode: effectiveProcedureCode || 'TTHC-CẤP-XÃ',
    formCode: 'Mẫu Tờ khai chuẩn NĐ 30/2020/NĐ-CP',
    agencyType: isPolice ? 'POLICE' : 'COMMUNE_UBND',
    title: procedureTitle ? `TỜ KHAI YÊU CẦU GIẢI QUYẾT: ${procedureTitle.toUpperCase()}` : 'TỜ KHAI HÀNH CHÍNH CẤP XÃ',
    legalNote: legalBasis || 'Ban hành kèm theo quy định về thủ tục hành chính tại UBND cấp xã',
    recipient: isPolice ? 'Công an {WARD_NAME}' : 'Ủy ban nhân dân {WARD_NAME}',
    sections: [
      {
        title: 'I. THÔNG TIN NGƯỜI YÊU CẦU',
        fields: [
          { label: '1. Họ, chữ đệm và tên', placeholder: '...................................................', isBold: true },
          { label: '2. Ngày sinh', placeholder: '....../....../..........', type: 'grid2', secondLabel: '3. Giới tính', secondPlaceholder: 'Nam / Nữ' },
          { label: '4. Số định danh cá nhân / CCCD', placeholder: '................................', type: 'grid2', secondLabel: '5. Số điện thoại', secondPlaceholder: '................................' },
          { label: '6. Nơi cư trú hiện tại', placeholder: `${currentWard.name}, Tỉnh An Giang` },
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

  /**
   * Always downloads a 100% BLANK TEMPLATE (Phôi Mẫu Trắng) in Word (.docx) format
   * Contains only dotted lines and blank signature fields for citizens to fill.
   */
  const handleDownloadDocx = async () => {
    try {
      setIsExportingDocx(true);
      await exportA4TemplateToDocx(effectiveTemplate, currentWard.name, {});
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Lỗi xuất file Word (.docx):', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  /**
   * Always downloads a 100% BLANK TEMPLATE (Phôi Mẫu Trắng) in PDF (.pdf) format
   * Renders from the off-screen blankPrintableA4Ref container.
   */
  const handleDownloadPdf = async () => {
    if (!blankPrintableA4Ref.current) return;
    try {
      setIsExportingPdf(true);
      const filename = `${effectiveTemplate.procedureCode || 'TO-KHAI'}_PHOI_MAU_TRANG_${currentWard.name.replace(/\s+/g, '_')}.pdf`;
      await exportElementToPdf(blankPrintableA4Ref.current, filename);
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

  /**
   * Renders the complete legal A4 document body
   * @param isBlank If true, outputs pure dotted lines and blank signatures (for Blank Template & PDF download, 100% unified with Word .docx)
   *                If false, outputs standard filled sample data (for Reference & AI OCR Scanning)
   */
  const renderDocumentContent = (isBlank: boolean) => {
    const sampleData = getStandardSampleData(resolvedCategory, currentWard.name);

    // Merge citizen initialData with standard sampleData when not in blank mode
    const cleanInitialData = Object.fromEntries(
      Object.entries(initialData || {}).filter(([_, v]) => typeof v === 'string' && v.trim().length > 0)
    );

    const activeData: Record<string, any> = isBlank
      ? {}
      : {
          ...sampleData,
          ...cleanInitialData,
        };

    const val = (v?: string, sampleFallback: string = blankDot, blankPlaceholder: string = blankDot) => {
      if (isBlank) return blankPlaceholder;
      return v && v.trim() ? v.trim() : sampleFallback;
    };

    /**
     * Renders the official 12-cell bordered box grid for 12-digit Personal Identification Numbers (Số định danh cá nhân / CCCD)
     */
    const renderIdBoxes = (rawId?: string, customFallbackId: string = '089205023490') => {
      const effectiveId = isBlank ? '' : (rawId && rawId.trim() ? rawId.trim() : customFallbackId);
      const cleanDigits = effectiveId.replace(/\s+/g, '').slice(0, 12);
      const cells = Array.from({ length: 12 }, (_, idx) => (isBlank ? '' : cleanDigits[idx] || ''));

      return (
        <span className="inline-flex items-center align-middle ml-1.5 my-0.5">
          {!isBlank && effectiveId && <span className="sr-only">{effectiveId}</span>}
          <span className="inline-grid grid-cols-12 border border-black bg-white">
            {cells.map((digit, idx) => (
              <span
                key={idx}
                className={`w-6 h-7 sm:w-6.5 sm:h-7.5 flex items-center justify-center font-mono font-bold text-[11pt] text-black leading-none ${
                  idx < 11 ? 'border-r border-black' : ''
                }`}
              >
                {digit}
              </span>
            ))}
          </span>
        </span>
      );
    };

    return (
      <div
        className="p-6 sm:p-10 md:p-12 text-[#0F172A] bg-white text-[13pt] leading-relaxed select-text font-administrative font-times"
        style={{ fontFamily: "'Times New Roman', 'Tinos', Times, 'Liberation Serif', serif" }}
      >
        {/* Header: For Mẫu CT01, use exact BCA standard (Top-right form code + Centered Quốc hiệu - Tiêu ngữ, NO left agency name & NO top date line) */}
        {resolvedCategory === 'CT01' ? (
          <div className="pb-2">
            <div className="text-right text-[9.5pt] italic text-neutral-800 mb-1">
              Mẫu CT01 ban hành kèm theo Thông tư số 66/2023/TT-BCA (sửa đổi tại Thông tư số 53/2025/TT-BCA &amp; TT 116/2026/TT-BCA)
            </div>
            <div className="text-center">
              <div className="text-[12pt] font-bold uppercase tracking-wide">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </div>
              <div className="text-[13pt] font-bold">
                Độc lập – Tự do – Hạnh phúc
              </div>
              <div className="w-44 mx-auto mt-1 border-b border-black"></div>
            </div>
          </div>
        ) : resolvedCategory === 'TK-KS' ? (
          <div className="pb-2 text-center">
            <div className="text-[12pt] font-bold uppercase tracking-wide">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </div>
            <div className="text-[12.5pt] font-bold inline-block border-b border-black pb-0.5 px-2">
              Độc lập - Tự do - Hạnh phúc
            </div>
          </div>
        ) : isMarriageReg ? (
          <div className="flex items-start justify-between gap-3 sm:gap-5 pb-3">
            <div className="w-20 h-28 sm:w-24 sm:h-[116px] border border-black shrink-0 flex items-center justify-center text-[11pt]">
              Ảnh
            </div>
            <div className="flex-1 text-center pt-0.5">
              <div className="text-[11pt] sm:text-[11.5pt] font-bold uppercase tracking-wide">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </div>
              <div className="text-[11.5pt] sm:text-[12pt] font-bold">
                Độc lập – Tự do – Hạnh phúc
              </div>
              <h1 className="text-[14.5pt] sm:text-[16pt] font-extrabold uppercase mt-3 sm:mt-4 tracking-wide">
                TỜ KHAI ĐĂNG KÝ KẾT HÔN
              </h1>
              <div className="mt-2.5 font-medium text-[11.5pt]">
                Kính gửi: Ủy ban nhân dân {currentWard.name}
              </div>
            </div>
            <div className="w-20 h-28 sm:w-24 sm:h-[116px] border border-black shrink-0 flex items-center justify-center text-[11pt]">
              Ảnh
            </div>
          </div>
        ) : (
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
                Mã TTHC: {effectiveProcedureCode}
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
                {currentWard.name}, ngày {isBlank ? '......' : day} tháng {isBlank ? '......' : month} năm {year}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. MẪU CT01: CƯ TRÚ (TT 66/2023/TT-BCA, TT 53/2025 & TT 116/2026/TT-BCA)   */}
        {/* ========================================================================= */}
        {resolvedCategory === 'CT01' && (
          <div className="space-y-2.5">
            <div className="text-center my-2">
              <h1 className="text-[14pt] sm:text-[15pt] font-extrabold uppercase">
                TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ
              </h1>
              <div className="mt-1.5 font-bold text-[12pt]">
                Kính gửi{!isBlank && <sup className="font-normal">(1)</sup>}: {isBlank ? '............................................................................' : `Công an ${currentWard.name}`}
              </div>
            </div>

            <div className="space-y-2 text-[11.5pt]">
              <div>
                1. Họ, chữ đệm và tên khai sinh: <strong className="uppercase">{val(activeData.fullName, blankDot, '..............................................................................')}</strong>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-7">
                  2. Ngày, tháng, năm sinh: <strong>{val(activeData.dob, '....../....../..........', '............./................/................')}</strong>
                </div>
                <div className="col-span-5">
                  3. Giới tính: <strong>{val(activeData.gender, 'Nam', '...................')}</strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 py-0.5">
                <span>4. Số định danh cá nhân:</span>
                {renderIdBoxes(activeData.idNumber, '089205023490')}
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">
                  5. Số điện thoại liên hệ: <strong>{val(activeData.phone, shortDot, '............................')}</strong>
                </div>
                <div className="col-span-6">
                  6. Email: <strong>{val(activeData.email, 'congdan@angiang.gov.vn', '........................')}</strong>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-7">
                  7. Họ, chữ đệm và tên chủ hộ{!isBlank && <sup className="font-normal">(2)</sup>}: <strong className="uppercase">{val(activeData.hostName, blankDot, '..................................')}</strong>
                </div>
                <div className="col-span-5">
                  8. Mối quan hệ với chủ hộ: <strong>{val(activeData.hostRelation, shortDot, '............................')}</strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 py-0.5">
                <span>9. Số định danh cá nhân của chủ hộ:</span>
                {renderIdBoxes(activeData.hostCccd, '089075001234')}
              </div>

              <div>
                10. Nội dung đề nghị{!isBlank && <sup className="font-normal">(3)</sup>}:{' '}
                <strong>
                  {val(
                    activeData.declarationScope,
                    `Đăng ký thường trú tại ${activeData.address || currentWard.name}`,
                    '..................................................................................................................'
                  )}
                </strong>
                {isBlank && (
                  <div className="mt-1">
                    ......................................................................................................................................................................
                  </div>
                )}
              </div>

              <div>
                11. Những thành viên trong hộ gia đình cùng thay đổi:
                <table className="w-full mt-1 border-collapse border border-black text-center text-[10.5pt]">
                  <thead>
                    <tr className="font-bold bg-neutral-50">
                      <th className="border border-black py-1 px-1 w-[6%]">TT</th>
                      <th className="border border-black py-1 px-2 w-[26%]">Họ, chữ đệm và tên</th>
                      <th className="border border-black py-1 px-1 w-[16%]">Ngày, tháng, năm sinh</th>
                      <th className="border border-black py-1 px-1 w-[10%]">Giới tính</th>
                      <th className="border border-black py-1 px-1 w-[22%]">Số định danh cá nhân</th>
                      <th className="border border-black py-1 px-1 w-[20%]">Mối quan hệ với chủ hộ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 1, 2, 3].map((rowIdx) => {
                      const isFirstFilled = rowIdx === 0 && !isBlank;
                      return (
                        <tr key={rowIdx} className="h-6.5">
                          <td className="border border-black py-0.5 px-1">{isFirstFilled ? '1' : ''}</td>
                          <td className="border border-black py-0.5 px-2 font-semibold uppercase">
                            {isFirstFilled ? val(activeData.fullName, '', '') : ''}
                          </td>
                          <td className="border border-black py-0.5 px-1">
                            {isFirstFilled ? val(activeData.dob, '', '') : ''}
                          </td>
                          <td className="border border-black py-0.5 px-1">
                            {isFirstFilled ? val(activeData.gender, '', '') : ''}
                          </td>
                          <td className="border border-black py-0.5 px-1 font-mono">
                            {isFirstFilled ? val(activeData.idNumber, '', '') : ''}
                          </td>
                          <td className="border border-black py-0.5 px-1">
                            {isFirstFilled ? val(activeData.hostRelation, '', '') : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bảng 4 ô chữ ký chuẩn Mẫu CT01 (Gói gọn trong 1 trang A4, tự động ẩn số (4)-(8) khi xuất Phôi Mẫu Trắng / PDF / DOCX) */}
            <table className="w-full mt-2.5 border-collapse border border-black text-center text-[10pt]">
              <thead>
                <tr className="align-top">
                  <th className="border border-black p-1.5 w-1/4 font-normal">
                    <div className="italic text-[9.5pt]">......, ngày......tháng....năm......</div>
                    <div className="font-bold uppercase mt-0.5">
                      Ý KIẾN CỦA CHỦ HỘ{!isBlank && <sup className="font-normal">(4)</sup>}
                    </div>
                  </th>
                  <th className="border border-black p-1.5 w-1/4 font-normal">
                    <div className="italic text-[9.5pt]">......, ngày......tháng....năm......</div>
                    <div className="font-bold uppercase mt-0.5">
                      Ý KIẾN CỦA CHỦ SỞ HỮU CHỖ Ở HỢP PHÁP{!isBlank && <sup className="font-normal">(5)</sup>}
                    </div>
                  </th>
                  <th className="border border-black p-1.5 w-1/4 font-normal">
                    <div className="italic text-[9.5pt]">......, ngày......tháng....năm......</div>
                    <div className="font-bold uppercase mt-0.5">
                      Ý KIẾN CỦA CHA HOẶC MẸ HOẶC NGƯỜI GIÁM HỘ{!isBlank && <sup className="font-normal">(6)</sup>}
                    </div>
                  </th>
                  <th className="border border-black p-1.5 w-1/4 font-normal">
                    <div className="italic text-[9.5pt]">......, ngày......tháng....năm......</div>
                    <div className="font-bold uppercase mt-0.5">
                      NGƯỜI KÊ KHAI{!isBlank && <sup className="font-normal">(7)</sup>}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="h-20 align-bottom">
                  <td className="border border-black p-1.5 font-bold uppercase">
                    {isBlank ? '' : (activeData.hostSignName || activeData.hostName || '')}
                  </td>
                  <td className="border border-black p-1.5 font-bold uppercase">
                    {isBlank ? '' : (activeData.ownerSignName || activeData.hostName || '')}
                  </td>
                  <td className="border border-black p-1.5 font-bold uppercase"></td>
                  <td className="border border-black p-1.5 font-bold uppercase">
                    {isBlank ? '' : (activeData.applicantSignName || activeData.fullName || '')}
                  </td>
                </tr>
                <tr className="text-left text-[9.5pt]">
                  <td className="border border-black p-1.5"></td>
                  <td className="border border-black p-1.5 space-y-0.5">
                    <div>{!isBlank && <sup>(8) </sup>}Họ và tên: ...........................</div>
                    <div>{!isBlank && <sup>(8) </sup>}Số định danh cá nhân: ............</div>
                  </td>
                  <td className="border border-black p-1.5 space-y-0.5">
                    <div>{!isBlank && <sup>(8) </sup>}Họ và tên: ...........................</div>
                    <div>{!isBlank && <sup>(8) </sup>}Số định danh cá nhân: ............</div>
                  </td>
                  <td className="border border-black p-1.5"></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. MẪU TK-KS: KHAI SINH (PHỤ LỤC 5 TT 04/2024/TT-BTP & TT 04/2020/TT-BTP) */}
        {/* ========================================================================= */}
        {resolvedCategory === 'TK-KS' && (
          <div className="space-y-2 text-[11.5pt] leading-snug">
            {!isBlank && (
              <span className="sr-only">
                Thông tư số 04/2024/TT-BTP sửa đổi Thông tư số 04/2020/TT-BTP Giấy chứng sinh {activeData.birthCertNumber || ''}
              </span>
            )}

            <div className="text-center my-2">
              <h1 className="text-[14pt] sm:text-[15pt] font-extrabold uppercase">
                TỜ KHAI ĐĂNG KÝ KHAI SINH
              </h1>
              <div className="mt-1.5 text-[11.5pt]">
                Kính gửi:{!isBlank && <sup className="font-normal"> (1)</sup>}{' '}
                {isBlank ? (
                  '..................................................................................'
                ) : (
                  <strong>Ủy ban nhân dân {currentWard.name}</strong>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div>
                <strong>Họ, chữ đệm, tên người yêu cầu:</strong>{' '}
                <span className="uppercase font-semibold">
                  {val(
                    activeData.applicantName || activeData.fatherName || activeData.motherName,
                    'NGUYỄN VĂN MINH',
                    '......................................................................................'
                  )}
                </span>
              </div>

              <div>
                Ngày, tháng, năm sinh:{' '}
                <span>
                  {val(
                    activeData.applicantDob || activeData.fatherDob,
                    '15/06/1992',
                    '.......................................................................................................'
                  )}
                </span>
              </div>

              <div>
                Nơi cư trú:{!isBlank && <sup> (2)</sup>}{' '}
                <span>
                  {val(
                    activeData.applicantResidence || activeData.fatherResidence || activeData.motherResidence,
                    `Số 45 Lê Lợi, ${currentWard.name}, Tỉnh An Giang`,
                    '........................................................................................................................'
                  )}
                </span>
                {isBlank && (
                  <div className="mt-0.5">
                    ................................................................................................................................................
                  </div>
                )}
              </div>

              <div>
                Giấy tờ tùy thân:{!isBlank && <sup> (3)</sup>}{' '}
                <span>
                  {val(
                    activeData.applicantIdDoc || (activeData.idNumber ? `Căn cước công dân số ${activeData.idNumber}` : undefined),
                    'CCCD số 089092001456 do Cục Cảnh sát QLHC về TTXH cấp ngày 10/05/2022',
                    '................................................................................................................'
                  )}
                </span>
                {isBlank && (
                  <div className="mt-0.5">
                    ................................................................................................................................................
                  </div>
                )}
              </div>

              <div>
                Quan hệ với người được khai sinh:{' '}
                <span>
                  {val(
                    activeData.applicantRelation,
                    'Cha đẻ',
                    '..........................................................................................'
                  )}
                </span>
              </div>

              <div className="pt-1 font-bold">
                Đề nghị cơ quan đăng ký khai sinh cho người dưới đây:
              </div>

              <div>
                <strong>Họ, chữ đệm, tên:</strong>{' '}
                <strong className="uppercase">
                  {val(
                    activeData.childName || activeData.fullName,
                    'NGUYỄN GIA BẢO',
                    '...................................................................................................................'
                  )}
                </strong>
              </div>

              <div>
                Ngày, tháng, năm sinh:{' '}
                <strong>
                  {val(
                    activeData.birthDate || activeData.dob,
                    '15/05/2024',
                    '..................................................'
                  )}
                </strong>{' '}
                ghi bằng chữ:{' '}
                <span>
                  {val(
                    activeData.birthDateInWords,
                    'Ngày mười lăm tháng năm năm hai nghìn không trăm hai mươi tư',
                    '.............................................'
                  )}
                </span>
                {isBlank && (
                  <div className="mt-0.5">
                    ................................................................................................................................................
                  </div>
                )}
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-4">
                  Giới tính: <strong>{val(activeData.gender, 'Nam', '......................')}</strong>
                </div>
                <div className="col-span-4">
                  Dân tộc: <strong>{val(activeData.childEthnicity, 'Kinh', '......................')}</strong>
                </div>
                <div className="col-span-4">
                  Quốc tịch: <strong>{val(activeData.childNationality, 'Việt Nam', '............................')}</strong>
                </div>
              </div>

              <div>
                Nơi sinh:{!isBlank && <sup> (4)</sup>}{' '}
                <span>
                  {val(
                    activeData.birthPlace,
                    `Bệnh viện Đa khoa ${currentWard.name}, Tỉnh An Giang`,
                    '...........................................................................................................................'
                  )}
                </span>
                {isBlank && (
                  <div className="mt-0.5">
                    ................................................................................................................................................
                  </div>
                )}
              </div>

              <div>
                Quê quán:{' '}
                <span>
                  {val(
                    activeData.hometown || activeData.fatherResidence,
                    `${currentWard.name}, Tỉnh An Giang`,
                    '..............................................................................................................................'
                  )}
                </span>
              </div>

              {/* Thông tin người mẹ */}
              <div className="pt-0.5">
                <strong>Họ, chữ đệm, tên người mẹ:</strong>{' '}
                <strong className="uppercase">
                  {val(
                    activeData.motherName,
                    'TRẦN THỊ HỒNG',
                    '....................................................................................................'
                  )}
                </strong>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  Năm sinh:{!isBlank && <sup> (5)</sup>}{' '}
                  <span>{val(activeData.motherDob, '20/10/1995', '....................................')}</span>
                </div>
                <div className="col-span-3">
                  Dân tộc:{!isBlank && <sup> (2)</sup>}{' '}
                  <span>{val(activeData.motherEthnicity, 'Kinh', '.................')}</span>
                </div>
                <div className="col-span-4">
                  Quốc tịch:{!isBlank && <sup> (2)</sup>}{' '}
                  <span>{val(activeData.motherNationality, 'Việt Nam', '......................')}</span>
                </div>
              </div>

              <div>
                Nơi cư trú:{!isBlank && <sup> (2)</sup>}{' '}
                <span>
                  {val(
                    activeData.motherResidence,
                    `Số 45 Lê Lợi, ${currentWard.name}, Tỉnh An Giang`,
                    '........................................................................................................................'
                  )}
                </span>
                {isBlank && (
                  <div className="mt-0.5">
                    ................................................................................................................................................
                  </div>
                )}
              </div>

              <div>
                Giấy tờ tùy thân:{!isBlank && <sup> (3)</sup>}{' '}
                <span>
                  {val(
                    activeData.motherIdDoc,
                    'CCCD số 089195007890 do Cục Cảnh sát QLHC về TTXH cấp ngày 12/08/2021',
                    '................................................................................................................'
                  )}
                </span>
              </div>

              {/* Thông tin người cha */}
              <div className="pt-0.5">
                <strong>Họ, chữ đệm, tên người cha:</strong>{' '}
                <strong className="uppercase">
                  {val(
                    activeData.fatherName,
                    'NGUYỄN VĂN MINH',
                    '....................................................................................................'
                  )}
                </strong>
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  Năm sinh:{!isBlank && <sup> (5)</sup>}{' '}
                  <span>{val(activeData.fatherDob, '15/06/1992', '....................................')}</span>
                </div>
                <div className="col-span-3">
                  Dân tộc:{!isBlank && <sup> (2)</sup>}{' '}
                  <span>{val(activeData.fatherEthnicity, 'Kinh', '.................')}</span>
                </div>
                <div className="col-span-4">
                  Quốc tịch:{!isBlank && <sup> (2)</sup>}{' '}
                  <span>{val(activeData.fatherNationality, 'Việt Nam', '......................')}</span>
                </div>
              </div>

              <div>
                Nơi cư trú:{!isBlank && <sup> (2)</sup>}{' '}
                <span>
                  {val(
                    activeData.fatherResidence,
                    `Số 45 Lê Lợi, ${currentWard.name}, Tỉnh An Giang`,
                    '........................................................................................................................'
                  )}
                </span>
                {isBlank && (
                  <div className="mt-0.5">
                    ................................................................................................................................................
                  </div>
                )}
              </div>

              <div>
                Giấy tờ tùy thân:{!isBlank && <sup> (3)</sup>}{' '}
                <span>
                  {val(
                    activeData.fatherIdDoc,
                    'CCCD số 089092001456 do Cục Cảnh sát QLHC về TTXH cấp ngày 10/05/2022',
                    '................................................................................................................'
                  )}
                </span>
              </div>

              <div className="italic pt-0.5">
                Thông tin về Giấy chứng nhận kết hôn của cha, mẹ trẻ (nếu cha, mẹ trẻ đã ĐKKH):
                <br />
                {isBlank ? (
                  'Số: ............., Quyển số: ............., đăng ký ngày ..... tháng ..... năm .......... tại ...........................................'
                ) : (
                  <span>
                    Số: <strong>45/2020</strong>, Quyển số: <strong>01/2020</strong>, đăng ký ngày <strong>12</strong> tháng <strong>10</strong> năm <strong>2020</strong> tại <strong>UBND {currentWard.name}</strong>
                  </span>
                )}
              </div>

              <div className="pt-1">
                Tôi cam đoan nội dung đề nghị đăng ký khai sinh trên đây là đúng sự thật, được sự thỏa thuận nhất trí của các bên liên quan theo quy định pháp luật.
                <br />
                Tôi chịu hoàn toàn trách nhiệm trước pháp luật về nội dung cam đoan của mình.
              </div>
            </div>

            {/* Khối chữ ký Người yêu cầu (bên phải) & Đề nghị cấp bản sao (bên trái dưới đường kẻ đôi) */}
            <div className="grid grid-cols-12 gap-4 pt-2 items-end">
              <div className="col-span-6 pt-12">
                <div className="border-t-2 border-b border-black h-1 w-64 mb-1.5"></div>
                <div className="text-[10.5pt] flex items-center flex-wrap gap-1.5">
                  <span>Đề nghị cấp bản sao{!isBlank && <sup>(6)</sup>}:</span>
                  <span className="inline-flex items-center gap-1">
                    Có
                    <span className="inline-flex w-4 h-4 border border-black items-center justify-center text-[10pt] font-bold">
                      {isBlank ? '' : 'X'}
                    </span>
                  </span>
                  <span>,</span>
                  <span className="inline-flex items-center gap-1">
                    Không
                    <span className="inline-flex w-4 h-4 border border-black items-center justify-center text-[10pt]"></span>
                  </span>
                </div>
                <div className="text-[10.5pt] mt-1">
                  Số lượng: {isBlank ? '.......' : <strong>02</strong>} bản
                </div>
              </div>

              <div className="col-span-6 text-center">
                <div className="italic text-[11pt]">
                  Làm tại: {isBlank ? '...........................' : currentWard.name}, ngày {isBlank ? '........' : day} tháng {isBlank ? '........' : month} năm {isBlank ? '.............' : year}
                </div>
                <div className="font-bold text-[11.5pt] mt-1">Người yêu cầu</div>
                <div className="italic text-[10pt] text-neutral-700">(Ký, ghi rõ họ, chữ đệm, tên)</div>
                <div className="h-16 flex items-end justify-center font-bold uppercase text-[11pt]">
                  {isBlank ? '' : (activeData.applicantSignName || activeData.fatherName || activeData.fullName || '')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. MẪU TK-KH: KẾT HÔN & XÁC NHẬN TÌNH TRẠNG HÔN NHÂN                     */}
        {/* ========================================================================= */}
        {resolvedCategory === 'TK-KH' && (() => {
          const isApplicantFemale = activeData.gender === 'Nữ';
          const femaleParty = {
            name: val(isApplicantFemale ? activeData.fullName : activeData.spouseName, 'NGUYỄN THỊ H.', blankDot),
            dob: formatDisplayDate(val(isApplicantFemale ? activeData.dob : activeData.spouseDob, '26/05/1991', '....../....../..........')),
            ethnicity: val(isApplicantFemale ? activeData.applicantEthnicity : activeData.spouseEthnicity, 'Kinh', shortDot),
            nationality: val(isApplicantFemale ? activeData.applicantNationality : activeData.spouseNationality, 'Việt Nam', shortDot),
            address: val(isApplicantFemale ? activeData.address : activeData.spouseAddress, `${currentWard.name}, Tỉnh An Giang`, blankDot),
            idNumber: val(isApplicantFemale ? activeData.idNumber : activeData.spouseIdNumber, '089191003344', ''),
            issueDate: val(isApplicantFemale ? activeData.issueDate : activeData.spouseIssueDate, '15/08/2022', ''),
            issuer: val(isApplicantFemale ? activeData.idIssuePlace : activeData.spouseIdIssuePlace, 'Cục CSQLHC về TTXH', ''),
            marriageCount: val(isApplicantFemale ? activeData.applicantMarriageCount : activeData.spouseMarriageCount, '1', shortDot),
          };
          const maleParty = {
            name: val(isApplicantFemale ? activeData.spouseName : activeData.fullName, 'TRẦN HẢI N.', blankDot),
            dob: formatDisplayDate(val(isApplicantFemale ? activeData.spouseDob : activeData.dob, '23/08/1987', '....../....../..........')),
            ethnicity: val(isApplicantFemale ? activeData.spouseEthnicity : activeData.applicantEthnicity, 'Kinh', shortDot),
            nationality: val(isApplicantFemale ? activeData.spouseNationality : activeData.applicantNationality, 'Việt Nam', shortDot),
            address: val(isApplicantFemale ? activeData.spouseAddress : activeData.address, `${currentWard.name}, Tỉnh An Giang`, blankDot),
            idNumber: val(isApplicantFemale ? activeData.spouseIdNumber : activeData.idNumber, '089087001122', ''),
            issueDate: val(isApplicantFemale ? activeData.spouseIssueDate : activeData.issueDate, '10/07/2021', ''),
            issuer: val(isApplicantFemale ? activeData.spouseIdIssuePlace : activeData.idIssuePlace, 'Cục CSQLHC về TTXH', ''),
            marriageCount: val(isApplicantFemale ? activeData.spouseMarriageCount : activeData.applicantMarriageCount, '1', shortDot),
          };

          const formatIdDoc = (p: typeof femaleParty) => {
            if (isBlank) {
              return (
                <div className="space-y-1 text-[10.5pt]">
                  <div>Số CCCD/CMND: .........................</div>
                  <div>Do: .............................................</div>
                  <div>Cấp ngày: ....../....../..........</div>
                </div>
              );
            }
            const formattedDate = formatDisplayDate(p.issueDate) || '....../....../..........';
            return (
              <span>
                Căn cước công dân số: <span className="font-semibold">{p.idNumber}</span> do {p.issuer} cấp ngày {formattedDate}
              </span>
            );
          };

          return (
            <div className="space-y-4">
              {!isMarriageReg && (
                <div className="text-center my-4">
                  <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                    TỜ KHAI CẤP GIẤY XÁC NHẬN TÌNH TRẠNG HÔN NHÂN
                  </h1>
                  <p className="text-[11pt] italic text-neutral-700 mt-1">
                    (Ban hành kèm theo Thông tư số 04/2024/TT-BTP ngày 06/06/2024 sửa đổi, bổ sung Thông tư số 04/2020/TT-BTP ngày 28/05/2020 của Bộ Tư pháp) [Phụ lục 5 - TT 04/2024/TT-BTP]
                  </p>
                  <div className="mt-3 font-bold italic text-[12pt]">
                    Kính gửi: Ủy ban nhân dân {currentWard.name}
                  </div>
                </div>
              )}

              {!isMarriageReg ? (
                <>
                  <div className="space-y-2.5 text-[12pt]">
                    <div>1. Họ, chữ đệm và tên: <strong className="uppercase">{val(activeData.fullName, blankDot, blankDot)}</strong></div>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-6">2. Ngày, tháng, năm sinh: <strong>{formatDisplayDate(val(activeData.dob, '15/06/1992', '....../....../..........'))}</strong></div>
                      <div className="col-span-6">3. Giới tính: <strong>{val(activeData.gender, 'Nam / Nữ', shortDot)}</strong></div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>4. Số định danh cá nhân (CCCD):</span>
                      {renderIdBoxes(activeData.idNumber, '089092001456')}
                    </div>
                    <div>5. Nơi thường trú / cư trú: <strong>{val(activeData.address, `${currentWard.name}, Tỉnh An Giang`, blankDot)}</strong></div>
                    <div>
                      6. Tình trạng hôn nhân hiện tại: <strong>{isBlank ? blankDot : 'Chưa đăng ký kết hôn với ai'}</strong>
                    </div>
                    <div>
                      7. Mục đích sử dụng Giấy xác nhận: <strong className="text-teal-900">{val(activeData.maritalCertPurpose, 'Để làm thủ tục kết hôn / chuyển nhượng QSDĐ', blankDot)}</strong>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-neutral-300">
                    <p className="italic text-[11pt] text-neutral-800 mb-4">
                      Tôi xin cam đoan tình trạng hôn nhân nêu trên là hoàn toàn đúng sự thật và chịu trách nhiệm trước pháp luật.
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-center text-[12pt]">
                      <div>
                        <div className="font-bold uppercase">CÔNG CHỨC TƯ PHÁP - HỘ TỊCH</div>
                        <div className="italic text-[10pt] text-neutral-600">(Ký, ghi rõ họ tên)</div>
                        <div className="h-20"></div>
                      </div>
                      <div>
                        <div className="font-bold uppercase">NGƯỜI LÀM TỜ KHAI</div>
                        <div className="italic text-[10pt] text-neutral-600">(Ký và ghi rõ họ tên)</div>
                        <div className="h-20 flex items-end justify-center font-bold uppercase text-[11pt]">
                          {isBlank ? '' : (activeData.applicantSignName || activeData.fullName || '')}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4 text-[11.5pt]">
                  {!isBlank && (
                    <span className="sr-only">
                      BÊN NAM BÊN NỮ Điều 8 Luật Hôn nhân &amp; Gia đình 2014 (Ký trực tiếp trước mặt công chức tiếp nhận)
                    </span>
                  )}
                  <table className="w-full border-collapse border border-black text-[11pt]">
                    <colgroup>
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '36%' }} />
                      <col style={{ width: '36%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="border border-black px-2.5 py-2 text-center font-bold">Thông tin</th>
                        <th className="border border-black px-2.5 py-2 text-center font-bold">Bên nữ</th>
                        <th className="border border-black px-2.5 py-2 text-center font-bold">Bên nam</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black px-2.5 py-2 align-top">Họ, chữ đệm, tên</td>
                        <td className="border border-black px-2.5 py-2 align-top font-semibold uppercase">{femaleParty.name}</td>
                        <td className="border border-black px-2.5 py-2 align-top font-semibold uppercase">{maleParty.name}</td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2.5 py-2 align-top">Ngày, tháng, năm sinh</td>
                        <td className="border border-black px-2.5 py-2 align-top">{femaleParty.dob}</td>
                        <td className="border border-black px-2.5 py-2 align-top">{maleParty.dob}</td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2.5 py-2 align-top">Dân tộc</td>
                        <td className="border border-black px-2.5 py-2 align-top">{femaleParty.ethnicity}</td>
                        <td className="border border-black px-2.5 py-2 align-top">{maleParty.ethnicity}</td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2.5 py-2 align-top">Quốc tịch</td>
                        <td className="border border-black px-2.5 py-2 align-top">{femaleParty.nationality}</td>
                        <td className="border border-black px-2.5 py-2 align-top">{maleParty.nationality}</td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2.5 py-2 align-top">Nơi cư trú</td>
                        <td className="border border-black px-2.5 py-2 align-top">{femaleParty.address}</td>
                        <td className="border border-black px-2.5 py-2 align-top">{maleParty.address}</td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2.5 py-2 align-top">Giấy tờ tùy thân</td>
                        <td className="border border-black px-2.5 py-2 align-top">{formatIdDoc(femaleParty)}</td>
                        <td className="border border-black px-2.5 py-2 align-top">{formatIdDoc(maleParty)}</td>
                      </tr>
                      <tr>
                        <td className="border border-black px-2.5 py-2 align-top">Kết hôn lần thứ mấy</td>
                        <td className="border border-black px-2.5 py-2 align-top">{femaleParty.marriageCount}</td>
                        <td className="border border-black px-2.5 py-2 align-top">{maleParty.marriageCount}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="space-y-1 text-[11pt] leading-relaxed pt-1">
                    <p className="indent-8">
                      Chúng tôi cam đoan những lời khai trên đây là đúng sự thật, việc kết hôn của chúng tôi là tự nguyện, không vi phạm quy định của Luật hôn nhân và gia đình Việt Nam.
                    </p>
                    <p className="indent-8">
                      Chúng tôi chịu hoàn toàn trách nhiệm trước pháp luật về cam đoan của mình.
                    </p>
                    <p className="indent-8">
                      Đề nghị Quý cơ quan đăng ký.
                    </p>
                  </div>

                  <div className="text-right italic text-[11pt] pr-4 pt-1">
                    Tỉnh An Giang, ngày {isBlank ? '......' : String(day).padStart(2, '0')} tháng {isBlank ? '......' : String(month).padStart(2, '0')} năm {isBlank ? '........' : year}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center text-[11.5pt] pt-2">
                    <div>
                      <div className="font-bold">Bên nữ</div>
                      <div className="text-[10.5pt]">(Ký, ghi rõ họ, chữ đệm, tên)</div>
                      <div className="h-20 flex items-end justify-center font-medium text-[11pt]">
                        {isBlank ? '' : (isApplicantFemale ? (activeData.applicantSignName || femaleParty.name) : (activeData.spouseSignName || femaleParty.name))}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold">Bên nam</div>
                      <div className="text-[10.5pt]">(Ký, ghi rõ họ, chữ đệm, tên)</div>
                      <div className="h-20 flex items-end justify-center font-medium text-[11pt]">
                        {isBlank ? '' : (isApplicantFemale ? (activeData.spouseSignName || maleParty.name) : (activeData.applicantSignName || maleParty.name))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* 4. MẪU TK-BTXH: BẢO TRỢ XÃ HỘI (NGHỊ ĐỊNH 20/2021, NĐ 76/2024 & BHXH 2024)*/}
        {/* ========================================================================= */}
        {resolvedCategory === 'TK-BTXH' && (
          <div className="space-y-4">
            <div className="text-center my-4">
              <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                TỜ KHAI THÔNG TIN ĐỀ NGHỊ TRỢ CẤP XÃ HỘI HẰNG THÁNG
              </h1>
              <p className="text-[11pt] italic text-neutral-700 mt-1">
                (Mẫu số 1a, 1b, 1c, 1d, 1đ ban hành kèm theo Nghị định số 20/2021/NĐ-CP &amp; Luật BHXH 2024, sửa đổi tại Nghị định số 76/2024/NĐ-CP)
              </p>
              <div className="mt-3 font-bold italic text-[12pt]">
                Kính gửi: Ủy ban nhân dân {currentWard.name}
              </div>
            </div>

            <div className="space-y-2.5 text-[12pt]">
              <div>1. Họ và tên người đề nghị: <strong className="uppercase">{val(activeData.fullName, blankDot, blankDot)}</strong></div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">Ngày sinh: <strong>{val(activeData.dob, '....../....../..........', '....../....../..........')}</strong></div>
                <div className="col-span-6">Giới tính: <strong>{val(activeData.gender, 'Nam / Nữ', shortDot)}</strong></div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span>Số định danh cá nhân / CCCD:</span>
                {renderIdBoxes(activeData.idNumber, '089048000123')}
              </div>
              <div>Nơi thường trú: <strong>{val(activeData.address, `${currentWard.name}, Tỉnh An Giang`, blankDot)}</strong></div>
              <div>
                2. Thuộc diện trợ cấp: <strong>{val(activeData.householdStatus, 'Người cao tuổi từ đủ 75 tuổi trở lên không có lương hưu', blankDot)}</strong>
              </div>
              {activeData.poorHouseholdBookNumber && !isBlank && (
                <div>Số sổ hộ nghèo / Giấy chứng nhận: <strong className="font-mono">{val(activeData.poorHouseholdBookNumber)}</strong></div>
              )}
              {activeData.disabilityCertNumber && !isBlank && (
                <div>Giấy xác nhận khuyết tật số: <strong className="font-mono">{val(activeData.disabilityCertNumber)}</strong>, ngày cấp: <strong>{val(activeData.disabilityCertIssueDate, shortDot, shortDot)}</strong> do <strong>{val(activeData.disabilityCertIssuer, `UBND ${currentWard.name}`, shortDot)}</strong> cấp.</div>
              )}
              <div>
                3. Người giám hộ / chăm sóc (nếu có): <strong>{val(activeData.guardianName, shortDot, shortDot)}</strong> (Quan hệ: <strong>{val(activeData.guardianRelation, shortDot, shortDot)}</strong>, CCCD: <strong className="font-mono">{val(activeData.guardianCccd, shortDot, shortDot)}</strong>)
              </div>
              <div>
                4. Hình thức nhận trợ cấp: Tài khoản ngân hàng số: <strong className="font-mono text-teal-800">{val(activeData.bankAccount, 'Đăng ký tài khoản nhận trợ cấp theo Đề án 06', blankDot)}</strong>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-neutral-300">
              <p className="italic text-[11pt] text-neutral-800 mb-4">
                Tôi xin cam đoan những thông tin kê khai trên là hoàn toàn đúng sự thật và chịu trách nhiệm trước pháp luật.
              </p>
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
                    {isBlank ? '' : (activeData.applicantSignName || activeData.fullName || '')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. NHÓM CHỨNG THỰC: CT-01/02 (NGHỊ ĐỊNH 23/2015/NĐ-CP & TT 01/2020)       */}
        {/* ========================================================================= */}
        {resolvedCategory === 'CHUNG-THUC' && (
          <div className="space-y-4">
            <div className="text-center my-4">
              <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                {effectiveProcedureCode === 'TTHC-CT-02'
                  ? 'BẢN DỊCH VÀ LỜI CHỨNG THỰC CHỮ KÝ NGƯỜI DỊCH'
                  : 'VĂN BẢN YÊU CẦU CHỨNG THỰC CHỮ KÝ / HỢP ĐỒNG GIAO DỊCH'}
              </h1>
              <p className="text-[11pt] italic text-neutral-700 mt-1">
                (Theo quy định tại Nghị định số 23/2015/NĐ-CP &amp; Thông tư số 01/2020/TT-BTP của Bộ Tư pháp)
              </p>
              <div className="mt-3 font-bold italic text-[12pt]">
                Kính gửi: Bộ phận Một cửa - Ủy ban nhân dân {currentWard.name}
              </div>
            </div>

            <div className="space-y-2.5 text-[12pt]">
              <div>1. Người yêu cầu chứng thực: <strong className="uppercase">{val(activeData.fullName, blankDot, blankDot)}</strong></div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">Ngày sinh: <strong>{val(activeData.dob, '....../....../..........', '....../....../..........')}</strong></div>
                <div className="col-span-6">CCCD số: <strong className="font-mono">{val(activeData.idNumber, shortDot, shortDot)}</strong></div>
              </div>
              <div>Nơi cư trú: <strong>{val(activeData.address, `${currentWard.name}, Tỉnh An Giang`, blankDot)}</strong></div>
              <div>
                2. Nội dung yêu cầu chứng thực: <strong>{isBlank ? blankDot : 'Chứng thực chữ ký / điểm chỉ trên văn bản giấy tờ theo quy định pháp luật.'}</strong>
              </div>

              {effectiveProcedureCode === 'TTHC-CT-02' && (
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
                Ngày {isBlank ? '......' : day} tháng {isBlank ? '......' : month} năm {year}, tại Bộ phận Một cửa Ủy ban nhân dân {currentWard.name}, tỉnh An Giang.
                <br />
                Tôi: <strong>.............................................................</strong> - Chức vụ: <strong>Chủ tịch / Phó Chủ tịch UBND {currentWard.name}</strong>
                <br />
                <strong>CHỨNG THỰC:</strong> Ông/Bà <strong>{val(activeData.fullName, shortDot, shortDot).toUpperCase()}</strong>, số CCCD: <strong>{val(activeData.idNumber, shortDot, shortDot)}</strong> đã ký/điểm chỉ trước mặt tôi; cam đoan chịu trách nhiệm về nội dung giấy tờ.
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
        {/* 6. NHÓM ĐẤT ĐAI: DC-01 (MẪU 11/ĐK NGHỊ ĐỊNH 101/2024/NĐ-CP)               */}
        {/* ========================================================================= */}
        {resolvedCategory === 'DAT-DAI' && (
          <div className="space-y-4">
            <div className="text-center my-4">
              <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                ĐƠN ĐĂNG KÝ BIẾN ĐỘNG ĐẤT ĐAI, TÀI SẢN GẮN LIỀN VỚI ĐẤT
              </h1>
              <p className="text-[11pt] italic text-neutral-700 mt-1">
                (Mẫu số 11/ĐK ban hành kèm theo Nghị định số 101/2024/NĐ-CP ngày 29/07/2024 của Chính phủ &amp; Nghị định 151/2025/NĐ-CP)
              </p>
              <div className="mt-3 font-bold italic text-[12pt]">
                Kính gửi: Ủy ban nhân dân {currentWard.name} - Chi nhánh Văn phòng Đăng ký đất đai
              </div>
            </div>

            <div className="space-y-2.5 text-[12pt]">
              <div>1. Người sử dụng đất: <strong className="uppercase">{val(activeData.fullName, blankDot, blankDot)}</strong></div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">Số CCCD/ĐDCN: <strong className="font-mono">{val(activeData.idNumber, shortDot, shortDot)}</strong></div>
                <div className="col-span-6">Điện thoại: <strong>{val(activeData.phone, shortDot, shortDot)}</strong></div>
              </div>
              <div>Địa chỉ liên hệ: <strong>{val(activeData.address, `${currentWard.name}, Tỉnh An Giang`, blankDot)}</strong></div>

              <div className="font-bold uppercase text-neutral-900 border-b border-neutral-300 pb-1 pt-2">
                2. THÔNG TIN THỬA ĐẤT ĐỀ NGHỊ ĐĂNG KÝ BIẾN ĐỘNG
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">Thửa đất số: <strong>{val(activeData.plotNumber, shortDot, shortDot)}</strong></div>
                <div className="col-span-6">Tờ bản đồ số: <strong>{val(activeData.mapSheetNumber, shortDot, shortDot)}</strong></div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">Diện tích: <strong>{val(activeData.landArea ? `${activeData.landArea} m²` : undefined, '............ m²', '............ m²')}</strong></div>
                <div className="col-span-6">Mục đích sử dụng: <strong>{isBlank ? shortDot : 'Đất ở tại đô thị / nông thôn'}</strong></div>
              </div>
              <div>Giấy chứng nhận QSDĐ đã cấp số: <strong>................................</strong>, ngày cấp: <strong>....../....../..........</strong></div>
              <div>
                3. Nội dung biến động đề nghị: <strong>{isBlank ? blankDot : 'Đăng ký chuyển nhượng / Tặng cho / Thừa kế / Đính chính thông tin thửa đất'}</strong>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-neutral-300">
              <p className="italic text-[11pt] text-neutral-800 mb-4">
                Tôi xin cam đoan nội dung kê khai trên đơn là đúng sự thật và chịu trách nhiệm trước pháp luật.
              </p>
              <div className="grid grid-cols-2 gap-4 text-center text-[12pt]">
                <div>
                  <div className="font-bold uppercase">Ý KIẾN KIỂM TRA ĐỊA CHÍNH XÃ</div>
                  <div className="italic text-[10pt] text-neutral-600">(Ký, ghi rõ họ tên)</div>
                  <div className="h-20"></div>
                </div>
                <div>
                  <div className="font-bold uppercase">NGƯỜI VIẾT ĐƠN</div>
                  <div className="italic text-[10pt] text-neutral-600">(Ký và ghi rõ họ tên)</div>
                  <div className="h-20 flex items-end justify-center font-bold uppercase text-[11pt]">
                    {isBlank ? '' : (activeData.applicantSignName || activeData.fullName || '')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. NHÓM XÂY DỰNG: XD-01 (MẪU 01 NGHỊ ĐỊNH 175/2024/NĐ-CP & 15/2021/NĐ-CP) */}
        {/* ========================================================================= */}
        {resolvedCategory === 'XAY-DUNG' && (
          <div className="space-y-4">
            <div className="text-center my-4">
              <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                ĐƠN ĐỀ NGHỊ CẤP GIẤY PHÉP XÂY DỰNG NHÀ Ở RIÊNG LẺ
              </h1>
              <p className="text-[11pt] italic text-neutral-700 mt-1">
                (Mẫu số 01 Phụ lục II ban hành kèm theo Nghị định số 175/2024/NĐ-CP thay thế Nghị định số 15/2021/NĐ-CP của Chính phủ)
              </p>
              <div className="mt-3 font-bold italic text-[12pt]">
                Kính gửi: Ủy ban nhân dân {currentWard.name} / Phòng Kinh tế và Hạ tầng
              </div>
            </div>

            <div className="space-y-2.5 text-[12pt]">
              <div>1. Chủ đầu tư: <strong className="uppercase">{val(activeData.fullName, blankDot, blankDot)}</strong></div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">Số định danh cá nhân / CCCD: <strong className="font-mono">{val(activeData.idNumber, shortDot, shortDot)}</strong></div>
                <div className="col-span-6">Số điện thoại: <strong>{val(activeData.phone, shortDot, shortDot)}</strong></div>
              </div>
              <div>Địa chỉ liên lạc: <strong>{val(activeData.address, `${currentWard.name}, Tỉnh An Giang`, blankDot)}</strong></div>

              <div className="font-bold uppercase text-neutral-900 border-b border-neutral-300 pb-1 pt-2">
                2. THÔNG SỐ CÔNG TRÌNH XÂY DỰNG
              </div>
              <div>Địa điểm xây dựng: <strong>{val(activeData.address, `${currentWard.name}, Tỉnh An Giang`, blankDot)}</strong> (Thửa đất số: ......)</div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">Cốt nền xây dựng: <strong>{isBlank ? '........... m' : '+0.45 m'}</strong></div>
                <div className="col-span-6">Mật độ xây dựng: <strong>{isBlank ? '........... %' : '75 %'}</strong></div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">Diện tích sàn tầng 1: <strong>{isBlank ? '........... m²' : '85.0 m²'}</strong></div>
                <div className="col-span-6">Tổng diện tích sàn: <strong>{isBlank ? '........... m²' : '170.0 m²'}</strong></div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">Chiều cao công trình: <strong>{isBlank ? '........... m' : '7.5 m'}</strong></div>
                <div className="col-span-6">Số tầng: <strong>{isBlank ? '........... tầng' : '02 tầng (kể cả tum)'}</strong></div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-neutral-300">
              <p className="italic text-[11pt] text-neutral-800 mb-4">
                Tôi cam đoan thi công đúng ranh giới đất ở hợp pháp, đúng chỉ giới xây dựng, đảm bảo an toàn cho các công trình liền kề và tuân thủ quy chuẩn xây dựng.
              </p>
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
                    {isBlank ? '' : (activeData.applicantSignName || activeData.fullName || '')}
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
                TỜ KHAI LIÊN THÔNG ĐIỆN TỬ: ĐĂNG KÝ KHAI TỬ, XÓA THƯỜNG TRÚ &amp; MAI TÁNG PHÍ
              </h1>
              <p className="text-[11pt] italic text-neutral-700 mt-1">
                (Mẫu số 02 Phụ lục ban hành kèm theo Nghị định số 63/2024/NĐ-CP ngày 10/06/2024 &amp; Đề án 06 Chính phủ)
              </p>
              <div className="mt-3 font-bold italic text-[12pt]">
                Kính gửi: Ủy ban nhân dân {currentWard.name}
              </div>
            </div>

            <div className="space-y-2.5 text-[12pt]">
              <div>1. Người yêu cầu khai tử: <strong className="uppercase">{val(activeData.fullName, blankDot, blankDot)}</strong></div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">CCCD người yêu cầu: <strong className="font-mono">{val(activeData.idNumber, shortDot, shortDot)}</strong></div>
                <div className="col-span-6">Quan hệ với người chết: <strong>{isBlank ? shortDot : 'Con đẻ / Thân nhân'}</strong></div>
              </div>

              <div className="font-bold uppercase text-neutral-900 border-b border-neutral-300 pb-1 pt-2">
                2. THÔNG TIN NGƯỜI ĐÃ CHẾT
              </div>
              <div>Họ, chữ đệm, tên: <strong className="uppercase">{val(activeData.deceasedName, blankDot, blankDot)}</strong></div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">Ngày tháng năm sinh: <strong>{val(activeData.deceasedDob, '....../....../..........', '....../....../..........')}</strong></div>
                <div className="col-span-6">Giới tính: <strong>{val(activeData.deceasedGender, 'Nam / Nữ', shortDot)}</strong></div>
              </div>
              <div>Nơi thường trú cuối cùng: <strong>{val(activeData.address, `${currentWard.name}, Tỉnh An Giang`, blankDot)}</strong></div>
              <div>Đã chết vào lúc: <strong>{val(activeData.deceasedTime, '...... giờ ...... phút, ngày ....../....../2026', '...... giờ ...... phút, ngày ....../....../..........')}</strong></div>
              <div>Giấy báo tử số: <strong>{val(activeData.deathNoticeNumber, '................................', shortDot)}</strong> do Cơ sở y tế cấp.</div>
              <div>
                3. Lựa chọn dịch vụ liên thông: {isBlank ? '[ ] Đăng ký khai tử; [ ] Xóa đăng ký thường trú; [ ] Hỗ trợ chi phí mai táng Đề án 06.' : '[x] Đăng ký khai tử; [x] Xóa đăng ký thường trú; [x] Hỗ trợ chi phí mai táng Đề án 06.'}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-neutral-300">
              <p className="italic text-[11pt] text-neutral-800 mb-4">
                Tôi xin cam đoan những lời khai trên đây là đúng sự thật và chịu trách nhiệm trước pháp luật.
              </p>
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
                    {isBlank ? '' : (activeData.applicantSignName || activeData.fullName || '')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 9. NHÓM MAI TÁNG PHÍ: BT-02 (MẪU 04 NGHỊ ĐỊNH 20/2021 & NĐ 76/2024)       */}
        {/* ========================================================================= */}
        {resolvedCategory === 'MAI-TANG-PHI' && (
          <div className="space-y-4">
            <div className="text-center my-4">
              <h1 className="text-[15pt] sm:text-[16pt] font-extrabold uppercase">
                TỜ KHAI ĐỀ NGHỊ HỖ TRỢ CHI PHÍ MAI TÁNG &amp; TRỢ CẤP ĐỘC LẬP
              </h1>
              <p className="text-[11pt] italic text-neutral-700 mt-1">
                (Mẫu số 04 ban hành kèm theo Nghị định số 20/2021/NĐ-CP &amp; Nghị định số 76/2024/NĐ-CP của Chính phủ)
              </p>
              <div className="mt-3 font-bold italic text-[12pt]">
                Kính gửi: Ủy ban nhân dân {currentWard.name}
              </div>
            </div>

            <div className="space-y-2.5 text-[12pt]">
              <div>1. Người đứng tên kê khai: <strong className="uppercase">{val(activeData.fullName, blankDot, blankDot)}</strong></div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">Số CCCD: <strong className="font-mono">{val(activeData.idNumber, shortDot, shortDot)}</strong></div>
                <div className="col-span-6">Quan hệ với người chết: <strong>{isBlank ? shortDot : 'Người trực tiếp đứng ra lo mai táng'}</strong></div>
              </div>
              <div>Nơi cư trú: <strong>{val(activeData.address, `${currentWard.name}, Tỉnh An Giang`, blankDot)}</strong></div>
              <div>2. Đề nghị hỗ trợ chi phí mai táng cho đối tượng: <strong>{isBlank ? blankDot : 'Người cao tuổi / Người khuyết tật nặng / Người có công'}</strong></div>
              <div>Trích lục khai tử số: <strong>{val(activeData.deathExtractNumber, '................................', shortDot)}</strong></div>
              <div>
                3. Số tài khoản nhận hỗ trợ: <strong className="font-mono text-teal-800">{val(activeData.bankAccount, 'Đăng ký tài khoản nhận trợ cấp theo Đề án 06', blankDot)}</strong>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-neutral-300">
              <p className="italic text-[11pt] text-neutral-800 mb-4">
                Tôi xin cam đoan những thông tin kê khai trên là đúng sự thật và đã trực tiếp đứng ra tổ chức mai táng cho người quá cố.
              </p>
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
                    {isBlank ? '' : (activeData.applicantSignName || activeData.fullName || '')}
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
                (Mẫu số 47 Phụ lục II ban hành kèm theo Thông tư số 02/2022/TT-BTNMT của Bộ TN&amp;MT &amp; Nghị định số 05/2025/NĐ-CP)
              </p>
              <div className="mt-3 font-bold italic text-[12pt]">
                Kính gửi: Ủy ban nhân dân {currentWard.name}
              </div>
            </div>

            <div className="space-y-2.5 text-[12pt]">
              <div>1. Tên chủ cơ sở: <strong className="uppercase">{val(activeData.fullName, blankDot, blankDot)}</strong></div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">Số CCCD / Mã số thuế: <strong className="font-mono">{val(activeData.idNumber, shortDot, shortDot)}</strong></div>
                <div className="col-span-6">Số điện thoại: <strong>{val(activeData.phone, shortDot, shortDot)}</strong></div>
              </div>
              <div>Địa chỉ cơ sở: <strong>{val(activeData.address, `${currentWard.name}, Tỉnh An Giang`, blankDot)}</strong></div>
              <div>
                2. Quy mô, công suất hoạt động: {isBlank ? blankDot : 'Cơ sở thương mại, dịch vụ, sản xuất quy mô hộ gia đình, không thuộc đối tượng phải lập ĐTM.'}
              </div>
              <div>
                3. Nguồn phát sinh và biện pháp xử lý chất thải:
                <ul className="list-disc pl-6 space-y-1 text-[11pt] text-neutral-700 mt-1">
                  <li>Nước thải: {isBlank ? blankDot : 'Thu gom qua hệ thống thoát nước chung, xử lý bằng bể tự hoại 3 ngăn.'}</li>
                  <li>Rác thải sinh hoạt: {isBlank ? blankDot : 'Hợp đồng thu gom định kỳ với Công ty Môi trường đô thị.'}</li>
                  <li>Tiếng ồn, bụi: {isBlank ? blankDot : 'Bố trí vách ngăn, hoạt động đúng khung giờ quy định.'}</li>
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
                    {isBlank ? '' : (activeData.applicantSignName || activeData.fullName || '')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 11. GENERAL / STANDARDIZED TEMPLATE RENDERER (FOR ALL OTHER TTHC-*)      */}
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
                  Kính gửi: {officialTemplate.recipient.replace(/\{WARD_NAME\}/g, currentWard.name)}
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
                      const rawPlaceholder = field.placeholder
                        ? field.placeholder.replace(/\{WARD_NAME\}/g, currentWard.name)
                        : '';
                      const rawSecondPlaceholder = field.secondPlaceholder
                        ? field.secondPlaceholder.replace(/\{WARD_NAME\}/g, currentWard.name)
                        : '';
                      const isIdField =
                        field.label.includes('CCCD') ||
                        field.label.includes('định danh') ||
                        field.label.includes('ĐDCN');
                      const isSecondIdField =
                        field.secondLabel &&
                        (field.secondLabel.includes('CCCD') ||
                          field.secondLabel.includes('định danh') ||
                          field.secondLabel.includes('ĐDCN'));

                      const dynamicVal = field.label.includes('Họ, chữ đệm') || field.label.includes('Họ và tên')
                        ? val(activeData.fullName, rawPlaceholder || blankDot, blankDot)
                        : field.label.includes('Ngày, tháng, năm sinh') || field.label.includes('Ngày sinh')
                        ? val(activeData.dob, rawPlaceholder || '....../....../..........', '....../....../..........')
                        : isIdField
                        ? val(activeData.idNumber, rawPlaceholder || shortDot, shortDot)
                        : field.label.includes('Nơi thường trú') || field.label.includes('Nơi ở') || field.label.includes('Nơi cư trú')
                        ? val(activeData.address, rawPlaceholder || `${currentWard.name}, Tỉnh An Giang`, blankDot)
                        : val(activeData[field.label] || (isBlank ? undefined : rawPlaceholder), blankDot, blankDot);

                      if (field.type === 'grid2') {
                        return (
                          <div key={fIdx} className="grid grid-cols-12 gap-3 py-0.5 items-center">
                            <div className="col-span-12 sm:col-span-6">
                              <span>{field.label}: </span>
                              {isIdField ? (
                                renderIdBoxes(activeData.idNumber, rawPlaceholder || '089090001234')
                              ) : (
                                <strong className={field.isBold ? 'uppercase' : ''}>
                                  {dynamicVal}
                                </strong>
                              )}
                            </div>
                            {field.secondLabel && (
                              <div className="col-span-12 sm:col-span-6">
                                <span>{field.secondLabel}: </span>
                                {isSecondIdField ? (
                                  renderIdBoxes(undefined, rawSecondPlaceholder || '089090001234')
                                ) : (
                                  <strong>
                                    {isBlank ? shortDot : (rawSecondPlaceholder || shortDot)}
                                  </strong>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div key={fIdx} className="py-0.5 leading-relaxed flex flex-wrap items-center gap-1.5">
                          <span>{field.label}: </span>
                          {isIdField ? (
                            renderIdBoxes(activeData.idNumber, rawPlaceholder || '089090001234')
                          ) : (
                            <strong className={field.isBold ? 'uppercase' : ''}>
                              {dynamicVal}
                            </strong>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-6 mt-6 border-t border-neutral-300">
                <p className="italic text-neutral-800 text-[11pt] leading-relaxed">
                  {officialTemplate.commitText.replace(/\{WARD_NAME\}/g, currentWard.name)}
                </p>
                <div
                  className={`grid ${
                    officialTemplate.signatures.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
                  } gap-4 mt-8 pt-2 text-center text-[12pt]`}
                >
                  {officialTemplate.signatures.map((sig, idx) => (
                    <div key={idx}>
                      <div className="font-bold uppercase">{sig.role}</div>
                      <div className="italic text-[10pt] text-neutral-600">{sig.note}</div>
                      <div className="h-24 flex items-end justify-center font-bold uppercase text-[11pt]">
                        {idx === officialTemplate.signatures.length - 1 && !isBlank
                          ? activeData.applicantSignName || activeData.fullName || ''
                          : ''}
                      </div>
                    </div>
                  ))}
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
                1. Người yêu cầu giải quyết thủ tục: <strong className="uppercase">{val(activeData.fullName, blankDot, blankDot)}</strong>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-6">Ngày sinh: <strong>{val(activeData.dob, '....../....../..........', '....../....../..........')}</strong></span>
                <span className="col-span-6">CCCD/Định danh: <strong className="font-mono">{val(activeData.idNumber, shortDot, shortDot)}</strong></span>
              </div>
              <div>
                Nơi cư trú hiện tại: <strong>{val(activeData.address, `${currentWard.name}, Tỉnh An Giang`, blankDot)}</strong>
              </div>
              <div>
                2. Nội dung yêu cầu giải quyết:
                <div className="p-3 my-2 border border-dashed border-neutral-400 rounded-sm text-neutral-800">
                  {isBlank ? (
                    '........................................................................................................................................................................................................'
                  ) : (
                    <>Đề nghị {isPolice ? `Công an ${currentWard.name}` : `UBND ${currentWard.name}`} tiếp nhận, thụ lý và giải quyết thủ tục <strong>{procedureTitle}</strong> theo đúng trình tự và quy định pháp luật.</>
                  )}
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
                      {isBlank ? '' : (activeData.applicantSignName || activeData.fullName || '')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden a4-print-overlay">
      <div className="relative bg-white w-full max-w-4xl max-h-[94vh] rounded-2xl shadow-2xl flex flex-col my-auto a4-print-sheet border border-[#CBD5E1] overflow-hidden">
        {/* Top Control Bar */}
        <div className="no-print shrink-0 bg-[#00796B] text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#004D40]">
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

          {/* Action Buttons & View Mode Controls */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Mode Switcher: Xem Mẫu Điền Ví Dụ vs Xem Phôi Mẫu Trắng */}
            <div className="flex items-center bg-teal-900/60 p-1 rounded-xl border border-teal-500/30 gap-1">
              <button
                type="button"
                onClick={() => setViewMode('SAMPLE_FILLED')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'SAMPLE_FILLED'
                    ? 'bg-white text-teal-900 shadow-sm'
                    : 'text-teal-100 hover:text-white hover:bg-white/10'
                }`}
                title="Xem mẫu đã điền ví dụ đầy đủ thông tin chuẩn để tham khảo cách kê khai hoặc quét AI"
              >
                <Eye className="w-3.5 h-3.5 text-teal-600" />
                <span>Mẫu Điền Ví Dụ (Tham Khảo &amp; Quét AI)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('BLANK')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'BLANK'
                    ? 'bg-white text-teal-900 shadow-sm'
                    : 'text-teal-100 hover:text-white hover:bg-white/10'
                }`}
                title="Xem trước phôi mẫu trắng (các dòng chấm để tự điền)"
              >
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                <span>Phôi Mẫu Trắng</span>
              </button>
            </div>

            {/* Action 1: Tải Mẫu Word (.docx) -> LUÔN XUẤT PHÔI TRẮNG */}
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isExportingDocx}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-60"
              title="Tải phôi mẫu trắng Word (.docx) chuẩn Nghị định 30/2020/NĐ-CP (chỉ có dòng chấm) để tự điền"
            >
              {isExportingDocx ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang Tạo Phôi Word...</span>
                </>
              ) : exportSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Đã Tải Phôi Trắng (.docx)</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Tải Mẫu Word (.docx)</span>
                </>
              )}
            </button>

            {/* Action 2: Tải File PDF (.pdf) -> LUÔN XUẤT PHÔI TRẮNG */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-60"
              title="Tải phôi mẫu trắng PDF (.pdf) chuẩn pháp lý (chỉ có dòng chấm) để in ra hoặc tự điền"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang Tạo Phôi PDF...</span>
                </>
              ) : pdfExportSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-sky-200" />
                  <span>Đã Tải Phôi Trắng (.pdf)</span>
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

        {/* Citizen Guidance Bar */}
        <div className="no-print shrink-0 bg-teal-50 border-b border-teal-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-teal-950">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-teal-700 text-white font-bold text-[10px] uppercase shrink-0">
              {viewMode === 'SAMPLE_FILLED' ? 'Mẫu ví dụ chuẩn' : 'Phôi mẫu trắng'}
            </span>
            <span className="leading-tight">
              {viewMode === 'SAMPLE_FILLED' ? (
                <>
                  Màn hình đang hiển thị <strong>Mẫu Hướng Dẫn Điền Ví Dụ Chuẩn</strong> (có đầy đủ thông tin mẫu để bà con tham khảo cách kê khai hoặc chụp quét AI tự động). Khi bấm <strong>"Tải Mẫu Word (.docx)"</strong> hoặc <strong>"Tải File PDF (.pdf)"</strong>, hệ thống tự động xuất <strong>Phôi Mẫu Trắng hoàn toàn</strong> (đồng nhất 100% với tab Phôi Mẫu Trắng) để bà con tự điền.
                </>
              ) : (
                <>
                  Màn hình đang hiển thị <strong>Phôi Mẫu Trắng Tiêu Chuẩn</strong> (chỉ có các dòng chấm để tự điền, đồng nhất 100% với bản tải về Word .docx và PDF .pdf). Bà con có thể chuyển sang <strong>"Mẫu Điền Ví Dụ"</strong> để xem hướng dẫn cách ghi.
                </>
              )}
            </span>
          </div>
        </div>

        {/* Visible Scrollable Printable A4 Sheet Body */}
        <div
          ref={printableA4Ref}
          tabIndex={0}
          role="region"
          aria-label="Nội dung bản xem trước A4"
          className="flex-1 overflow-y-auto focus:outline-none"
        >
          {renderDocumentContent(viewMode === 'BLANK')}

          {/* Khung hướng dẫn Chú thích (1) -> (8) dành riêng cho giao diện Web (Tự động cắt bỏ khi xuất PDF/Word để gói gọn 1 trang A4) */}
          {resolvedCategory === 'CT01' && (
            <div className="no-print mx-6 sm:mx-10 md:mx-12 mb-8 p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-xs text-slate-800 space-y-1.5 shadow-2xs">
              <div className="font-extrabold text-amber-950 flex items-center justify-between gap-2 border-b border-amber-200 pb-1.5">
                <span>HƯỚNG DẪN GHI TỜ KHAI MẪU CT01 — CHÚ THÍCH (1) ĐẾN (8) CỦA BỘ CÔNG AN</span>
                <span className="px-2 py-0.5 rounded bg-amber-200/80 text-amber-950 text-[10px] font-bold">
                  Chỉ hiển thị trên Web • Tự động ẩn khi in/xuất A4
                </span>
              </div>
              <div><strong>(1) Kính gửi:</strong> Cơ quan đăng ký cư trú (Công an xã, phường, thị trấn).</div>
              <div><strong>(2) Họ, chữ đệm và tên chủ hộ:</strong> Trường hợp đăng ký thường trú, đăng ký tạm trú, tách hộ ghi thông tin chủ hộ gia đình mới.</div>
              <div><strong>(3) Nội dung đề nghị:</strong> Ghi rõ ràng, cụ thể nội dung đề nghị (Ví dụ: ghi chi tiết thông tin nơi đề nghị đăng ký thường trú, tạm trú hoặc xác nhận thông tin về cư trú). Trường hợp địa giới hành chính đã có sự thay đổi thì ghi thông tin theo địa giới hành chính mới, đồng thời ghi chú địa giới hành chính theo giấy tờ chứng minh chỗ ở hợp pháp.</div>
              <div><strong>(4) Ý kiến của chủ hộ:</strong> Áp dụng đối với các trường hợp tại khoản 2, 3, 5, 6 Điều 20; khoản 1 Điều 25; điểm a khoản 1 Điều 26 Luật Cư trú. Thực hiện theo 1 trong 3 phương thức: a) Ký, ghi rõ họ tên trực tiếp vào Tờ khai; b) Xác nhận qua ứng dụng VNeID / DVC trực tuyến; c) Có văn bản riêng ghi rõ nội dung đồng ý (không phải công chứng, chứng thực).</div>
              <div><strong>(5) Ý kiến của chủ sở hữu chỗ ở hợp pháp:</strong> Áp dụng đối với các trường hợp tại khoản 2, 3, 4, 5, 6 Điều 20; khoản 1 Điều 25; điểm a khoản 1 Điều 26 Luật Cư trú. Thực hiện qua chữ ký trực tiếp trên Tờ khai, qua ứng dụng VNeID hoặc văn bản riêng.</div>
              <div><strong>(6) Ý kiến của cha, mẹ hoặc người giám hộ:</strong> Áp dụng đối với người chưa thành niên, người hạn chế hoặc không đủ năng lực hành vi dân sự có thay đổi thông tin về cư trú.</div>
              <div><strong>(7) Người kê khai:</strong> Trường hợp nộp trực tiếp thì ký, ghi rõ họ tên; nộp qua Cổng dịch vụ công hoặc VNeID thì không phải ký vào mục này. Nếu người kê khai đồng thời là chủ hộ / chủ sở hữu chỗ ở hợp pháp / cha, mẹ, người giám hộ thì chỉ cần ký ở 1 mục tương ứng.</div>
              <div><strong>(8) Xác nhận qua VNeID:</strong> Chỉ kê khai họ tên và số định danh cá nhân vào ô này khi đề nghị xác nhận nội dung đồng ý thông qua ứng dụng định danh quốc gia (VNeID).</div>
            </div>
          )}

          {/* Khung hướng dẫn Chú thích (1) -> (6) cho Tờ khai đăng ký khai sinh (TK-KS) trên giao diện Web */}
          {resolvedCategory === 'TK-KS' && (
            <div className="no-print mx-6 sm:mx-10 md:mx-12 mb-8 p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-xs text-slate-800 space-y-1.5 shadow-2xs">
              <div className="font-extrabold text-amber-950 flex items-center justify-between gap-2 border-b border-amber-200 pb-1.5">
                <span>HƯỚNG DẪN GHI TỜ KHAI ĐĂNG KÝ KHAI SINH — CHÚ THÍCH (1) ĐẾN (6) CỦA BỘ TƯ PHÁP</span>
                <span className="px-2 py-0.5 rounded bg-amber-200/80 text-amber-950 text-[10px] font-bold">
                  Chỉ hiển thị trên Web • Tự động ẩn khi in/xuất A4
                </span>
              </div>
              <div><strong>(1) Kính gửi:</strong> Ghi rõ tên cơ quan đăng ký khai sinh (Ủy ban nhân dân cấp xã).</div>
              <div><strong>(2) Nơi cư trú, Dân tộc, Quốc tịch:</strong> Chỉ ghi trong trường hợp người có yêu cầu đăng ký hộ tịch chưa có/không cung cấp số định danh cá nhân/căn cước công dân/thẻ căn cước/chứng minh nhân dân; không cung cấp đầy đủ thông tin ngày, tháng, năm sinh. Trường hợp phải cung cấp thông tin &ldquo;Nơi cư trú&rdquo; thì ghi theo nơi đăng ký thường trú; nếu không có nơi đăng ký thường trú thì ghi theo nơi đăng ký tạm trú; trường hợp không có nơi đăng ký thường trú và nơi đăng ký tạm trú thì ghi theo nơi ở hiện tại.</div>
              <div><strong>(3) Giấy tờ tùy thân:</strong> Ghi số định danh cá nhân/căn cước công dân/thẻ căn cước (ví dụ: Căn cước công dân số 025188001010 do Cục Cảnh sát QLHC về TTXH cấp ngày 20/11/2021). Trường hợp không có số định danh cá nhân/căn cước công dân/thẻ căn cước thì ghi giấy tờ hợp lệ thay thế (hộ chiếu, chứng minh nhân dân,...).</div>
              <div><strong>(4) Nơi sinh:</strong> Trường hợp sinh tại cơ sở y tế thì ghi rõ tên cơ sở y tế và địa chỉ trụ sở cơ sở y tế đó. Trường hợp sinh ra ngoài cơ sở y tế thì ghi địa danh của 03 cấp hành chính (xã, huyện, tỉnh), nơi sinh ra.</div>
              <div><strong>(5) Năm sinh của cha, mẹ:</strong> Ghi đầy đủ ngày, tháng sinh của cha, mẹ (nếu có).</div>
              <div><strong>(6) Đề nghị cấp bản sao:</strong> Đề nghị đánh dấu X vào ô nếu có yêu cầu cấp bản sao và ghi rõ số lượng.</div>
            </div>
          )}
        </div>

        {/* Hidden off-screen A4 container used exclusively for rendering 100% BLANK PDF export */}
        <div
          ref={blankPrintableA4Ref}
          style={{
            position: 'fixed',
            left: '-9999px',
            top: '-9999px',
            width: '794px',
            background: '#ffffff',
            color: '#000000',
            zIndex: -999,
          }}
        >
          {renderDocumentContent(true)}
        </div>

        {/* Bottom Actions */}
        <div className="no-print bg-[#F8FAFC] px-6 py-3 border-t border-[#CBD5E1] flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-neutral-500 italic">
            * Văn bản được chuẩn hóa định dạng theo Nghị định 30/2020/NĐ-CP và các Thông tư/Nghị định mới nhất hiện hành (TT 66/2023 &amp; 53/2025/TT-BCA, TT 04/2024/TT-BTP, NĐ 63/2024, NĐ 76/2024, NĐ 101/2024, NĐ 175/2024). Bản tải về đồng nhất 100% với Phôi Mẫu Trắng.
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
