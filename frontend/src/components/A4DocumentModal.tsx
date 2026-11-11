import React from 'react';
import { Printer, X } from 'lucide-react';
import { useWard } from '../context/WardContext';

export interface A4DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  formType: 'CT01' | 'TK-KS' | 'TK-KH' | 'TK-BTXH' | 'GENERAL';
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
  formType,
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

  const isCT01 = formType === 'CT01';
  const isKS = formType === 'TK-KS';
  const isKH = formType === 'TK-KH';
  const isBTXH = formType === 'TK-BTXH';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto a4-print-overlay">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col my-auto a4-print-sheet border border-[#CBD5E1] overflow-hidden">
        {/* Top Control Bar (Hidden when printing via CSS @media print) */}
        <div className="no-print bg-[#00796B] text-white px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#004D40]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center font-bold text-xs">
              A4
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Văn Bản Mẫu A4 Chuẩn Nghị Định 30/2020/NĐ-CP
              </h3>
              <p className="text-xs text-teal-100">
                {procedureTitle || (isCT01 ? 'Mẫu CT01 - Cư trú' : isKS ? 'Mẫu TK-KS - Khai sinh' : isKH ? 'Mẫu TK-KH - Kết hôn' : 'Mẫu TK-BTXH - Bảo trợ')}
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
        <div className="p-8 sm:p-12 text-[#0F172A] bg-white text-[13pt] leading-relaxed font-serif select-text max-h-[80vh] overflow-y-auto">
          {/* Header per Decree 30/2020/ND-CP */}
          <div className="grid grid-cols-12 gap-4 pb-4">
            <div className="col-span-5 text-center">
              <div className="text-[11pt] uppercase tracking-wide">
                {isCT01 ? 'CÔNG AN TỈNH AN GIANG' : 'ỦY BAN NHÂN DÂN TỈNH AN GIANG'}
              </div>
              <div className="text-[12pt] font-bold uppercase tracking-wide">
                {isCT01 ? `CÔNG AN ${currentWard.name.toUpperCase()}` : `UBND ${currentWard.name.toUpperCase()}`}
              </div>
              <div className="w-20 mx-auto my-1 border-b border-black"></div>
              <div className="text-[10pt] italic text-neutral-600">
                Mã TTHC: {procedureCode || (isCT01 ? 'TTHC-CR-01' : isKS ? 'TTHC-HT-01' : isKH ? 'TTHC-HT-02' : 'TTHC-BT-01')}
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
            <h1 className="text-[16pt] font-extrabold uppercase tracking-wide">
              {isCT01
                ? 'TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ'
                : isKS
                ? 'TỜ KHAI ĐĂNG KÝ KHAI SINH'
                : isKH
                ? 'TỜ KHAI ĐĂNG KÝ KẾT HÔN'
                : isBTXH
                ? 'TỜ KHAI THÔNG TIN ĐỀ NGHỊ TRỢ CẤP XÃ HỘI'
                : (procedureTitle ? `TỜ KHAI YÊU CẦU GIẢI QUYẾT: ${procedureTitle.toUpperCase()}` : 'TỜ KHAI HÀNH CHÍNH CẤP XÃ')}
            </h1>
            <p className="text-[11pt] italic text-neutral-700 mt-1">
              {isCT01
                ? '(Mẫu CT01 ban hành kèm theo Thông tư số 66/2023/TT-BCA ngày 17/11/2023 của Bộ trưởng Bộ Công an)'
                : isKS
                ? '(Ban hành kèm theo Thông tư số 04/2020/TT-BTP ngày 28/05/2020 của Bộ trưởng Bộ Tư pháp)'
                : isKH
                ? '(Ban hành kèm theo Thông tư số 04/2020/TT-BTP ngày 28/05/2020 của Bộ trưởng Bộ Tư pháp)'
                : isBTXH
                ? '(Mẫu số 01 ban hành kèm theo Nghị định số 20/2021/NĐ-CP & Luật Bảo hiểm xã hội 2024)'
                : `(${legalBasis || 'Theo quy định hiện hành về thủ tục hành chính cấp xã'})`}
            </p>

            <div className="mt-4 font-bold italic text-[12pt]">
              Kính gửi:{' '}
              {isCT01
                ? `Công an ${currentWard.name}`
                : `Ủy ban nhân dân ${currentWard.name}`}
            </div>
          </div>

          {/* FORM TYPE 1: CT01 */}
          {isCT01 && (
            <div className="space-y-3 text-[12pt]">
              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-12 font-medium">
                  1. Họ, chữ đệm và tên: <strong className="uppercase">{initialData.fullName || '.......................................................................'}</strong>
                </span>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-6">2. Ngày, tháng, năm sinh: <strong>{initialData.dob || '....../....../..........'}</strong></span>
                <span className="col-span-6">3. Giới tính: <strong>{initialData.gender || 'Nam / Nữ'}</strong></span>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-6">4. Số định danh cá nhân (CCCD): <strong className="font-mono">{initialData.idNumber || '................................'}</strong></span>
                <span className="col-span-6">5. Số điện thoại liên hệ: <strong className="font-mono">{initialData.phone || '................................'}</strong></span>
              </div>
              <div>
                6. Nơi thường trú hiện tại: <strong>{initialData.address || `${currentWard.name}, Tỉnh An Giang`}</strong>
              </div>
              <div>
                7. Nội dung thay đổi thông tin cư trú đề nghị giải quyết:
                <div className="p-3 my-2 border border-dashed border-neutral-400 rounded-sm italic text-neutral-800">
                  Đăng ký thường trú / Chuyển hộ khẩu về địa chỉ: {initialData.address || `UBND ${currentWard.name}`} theo quy định của Luật Cư trú 2020 và Thông tư 66/2023/TT-BCA.
                </div>
              </div>
            </div>
          )}

          {/* FORM TYPE 2: TK-KS */}
          {isKS && (
            <div className="space-y-3 text-[12pt]">
              <div>
                1. Người yêu cầu đăng ký khai sinh: <strong className="uppercase">{initialData.fullName || '...................................................'}</strong>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-6">CCCD số: <strong className="font-mono">{initialData.idNumber || '................................'}</strong></span>
                <span className="col-span-6">Nơi cư trú: <strong>{initialData.address || `${currentWard.name}, Tỉnh An Giang`}</strong></span>
              </div>
              <div className="pt-2 border-t border-neutral-300 font-bold uppercase text-[12pt]">
                Thông tin người được đăng ký khai sinh:
              </div>
              <div>
                • Họ, chữ đệm và tên trẻ: <strong className="uppercase">{initialData.childName || '...................................................'}</strong>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-6">• Giới tính: <strong>Nam / Nữ</strong></span>
                <span className="col-span-6">• Ngày, tháng, năm sinh: <strong>{initialData.birthDate || '....../....../..........'}</strong></span>
              </div>
              <div>
                • Nơi sinh: <strong>{initialData.birthPlace || `Trạm y tế / Bệnh viện tại ${currentWard.name}, Tỉnh An Giang`}</strong>
              </div>
              <div>
                • Căn cứ cấp Giấy chứng sinh số: <strong>........../GCS</strong> do cơ sở y tế cấp.
              </div>
            </div>
          )}

          {/* FORM TYPE 3: TK-KH */}
          {isKH && (
            <div className="space-y-3 text-[12pt]">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-neutral-300">
                <div className="p-2 border border-neutral-300 rounded-sm">
                  <div className="font-bold uppercase text-center mb-1">Bên Nam</div>
                  <div>Họ và tên: <strong className="uppercase">{initialData.fullName || '...................................'}</strong></div>
                  <div>Ngày sinh: <strong>{initialData.dob || '....../....../..........'}</strong></div>
                  <div>CCCD: <strong className="font-mono">{initialData.idNumber || '.............................'}</strong></div>
                  <div>Nơi cư trú: <strong>{initialData.address || `${currentWard.name}`}</strong></div>
                  <div>Tình trạng hôn nhân: <strong>Chưa đăng ký kết hôn lần nào</strong></div>
                </div>
                <div className="p-2 border border-neutral-300 rounded-sm">
                  <div className="font-bold uppercase text-center mb-1">Bên Nữ</div>
                  <div>Họ và tên: <strong className="uppercase">{initialData.spouseName || '...................................'}</strong></div>
                  <div>Ngày sinh: <strong>{initialData.spouseDob || '....../....../..........'}</strong></div>
                  <div>CCCD: <strong className="font-mono">{initialData.spouseIdNumber || '.............................'}</strong></div>
                  <div>Nơi cư trú: <strong>................................................</strong></div>
                  <div>Tình trạng hôn nhân: <strong>Chưa đăng ký kết hôn lần nào</strong></div>
                </div>
              </div>
              <div className="italic text-neutral-800 text-[11pt]">
                Hai bên tự nguyện tìm hiểu và đồng thuận đăng ký kết hôn theo quy định của Luật Hôn nhân và Gia đình 2014 & Thông tư 04/2020/TT-BTP.
              </div>
            </div>
          )}

          {/* FORM TYPE 4: TK-BTXH */}
          {isBTXH && (
            <div className="space-y-3 text-[12pt]">
              <div>
                1. Họ và tên người đề nghị hưởng trợ cấp: <strong className="uppercase">{initialData.fullName || '...................................................'}</strong>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-6">Ngày sinh: <strong>{initialData.dob || '....../....../..........'}</strong></span>
                <span className="col-span-6">CCCD số: <strong className="font-mono">{initialData.idNumber || '................................'}</strong></span>
              </div>
              <div>
                Nơi cư trú: <strong>{initialData.address || `${currentWard.name}, Tỉnh An Giang`}</strong>
              </div>
              <div className="p-3 my-2 border border-dashed border-neutral-400 rounded-sm italic text-neutral-800">
                Thuộc diện đối tượng: Người cao tuổi / Người khuyết tật đặc biệt nặng / Trẻ em có hoàn cảnh đặc biệt khó khăn theo Nghị định 20/2021/NĐ-CP và Luật Bảo hiểm xã hội 2024.
              </div>
            </div>
          )}

          {/* FORM TYPE 5: GENERAL TEMPLATE */}
          {!isCT01 && !isKS && !isKH && !isBTXH && (
            <div className="space-y-3 text-[12pt]">
              <div>
                1. Người yêu cầu giải quyết thủ tục: <strong className="uppercase">{initialData.fullName || '...................................................'}</strong>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-6">Ngày sinh: <strong>{initialData.dob || '....../....../..........'}</strong></span>
                <span className="col-span-6">CCCD: <strong className="font-mono">{initialData.idNumber || '................................'}</strong></span>
              </div>
              <div>
                Nơi cư trú hiện tại: <strong>{initialData.address || `${currentWard.name}, Tỉnh An Giang`}</strong>
              </div>
              <div>
                2. Nội dung yêu cầu giải quyết:
                <div className="p-3 my-2 border border-dashed border-neutral-400 rounded-sm text-neutral-800">
                  Đề nghị UBND {currentWard.name} tiếp nhận, thẩm định và giải quyết thủ tục <strong>{procedureTitle}</strong> theo đúng trình tự, thời hạn và quy định pháp luật.
                </div>
              </div>
              <div>
                3. Giấy tờ đính kèm theo danh mục hồ sơ:
                <ul className="list-disc pl-6 space-y-1 text-[11pt] text-neutral-700 mt-1">
                  <li>Bản sao CCCD/Hộ chiếu có chứng thực hoặc xuất trình bản chính để đối chiếu.</li>
                  <li>Các giấy tờ chuyên ngành chứng minh đủ điều kiện thụ lý hồ sơ.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Cam đoan & Ký tên */}
          <div className="pt-6 mt-4 border-t border-neutral-300">
            <p className="italic text-neutral-800 text-[11pt]">
              Tôi xin cam đoan những lời khai trên đây là hoàn toàn đúng sự thật và chịu trách nhiệm trước pháp luật về lời khai của mình.
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

        {/* Bottom Actions */}
        <div className="no-print bg-[#F8FAFC] px-6 py-3 border-t border-[#CBD5E1] flex items-center justify-between">
          <span className="text-xs text-neutral-500 italic">
            * Văn bản được chuẩn hóa định dạng phục vụ tiếp nhận trực tiếp tại Bộ phận Một cửa UBND {currentWard.name}.
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