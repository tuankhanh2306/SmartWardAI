import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { CitizenFormType } from './useFormOcrUpload';

interface FormStep1TemplateAndRulesProps {
  selectedFormType: CitizenFormType;
  onSelectFormType: (type: CitizenFormType) => void;
  showReferenceTable: boolean;
  onToggleReferenceTable: () => void;
  speakingId: string | null;
  toggleSpeech: (text: string, id: string) => void;
}

const FORM_OPTIONS: Array<{ id: CitizenFormType; badge: string; title: string; desc: string }> = [
  { id: 'CT01', badge: 'Cư trú', title: 'CT01 — Cư trú', desc: 'CCCD, ngày sinh & địa chỉ.' },
  { id: 'TK-KS', badge: 'Hộ tịch', title: 'Khai sinh', desc: 'Đối chiếu giấy chứng sinh.' },
  { id: 'TK-KH', badge: 'Tư pháp', title: 'Kết hôn & Độc thân', desc: 'Độ tuổi & tình trạng hôn nhân.' },
  { id: 'TK-BTXH', badge: 'An sinh', title: 'Bảo trợ xã hội', desc: 'Độ tuổi, trợ cấp & STK.' },
];

export const FormStep1TemplateAndRules: React.FC<FormStep1TemplateAndRulesProps> = ({
  selectedFormType,
  onSelectFormType,
  showReferenceTable,
  onToggleReferenceTable,
  speakingId,
  toggleSpeech,
}) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {FORM_OPTIONS.map((item) => {
        const active = selectedFormType === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectFormType(item.id)}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 gov-focus-ring ${
              active
                ? 'bg-[#B90E23] text-white border-[#8F0A1B] shadow-sm'
                : 'bg-white hover:bg-[#FEF2F2]/40 text-[#0F172A] border-slate-200 hover:border-[#FECACA]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  active ? 'bg-[#F7EEDF] text-[#750715]' : 'bg-[#F1F5F9] text-[#334155]'
                }`}
              >
                {item.badge}
              </span>
              {active && <CheckCircle2 className="w-4 h-4 text-amber-200" />}
            </div>
            <div>
              <div className="text-xs sm:text-sm font-extrabold">{item.title}</div>
              <p className={`text-xs mt-1 leading-snug ${active ? 'text-amber-50' : 'text-[#475569]'}`}>
                {item.desc}
              </p>
            </div>
          </button>
        );
      })}
    </div>

    <div className="flex flex-col gap-3.5">
      <div className="w-full p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] shadow-xs flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#DC2626] text-white uppercase tracking-wider">
              Quy tắc bắt buộc
            </span>
            <span className="text-xs font-bold text-[#991B1B]">• Chứng thực</span>
          </div>

          <button
            type="button"
            onClick={() =>
              toggleSpeech(
                'Quy tắc bắt buộc đối với thủ tục chứng thực: Tuyệt đối không ký tên trước ở nhà! Đối với chứng thực chữ ký và chứng thực văn bản phân chia hoặc từ chối nhận di sản thừa kế theo Nghị định 23 năm 2015: Người dân tuyệt đối không được ký tên sẵn ở nhà vào tờ khai hoặc văn bản. Chữ ký bắt buộc phải được ký trực tiếp trước mặt công chức Tư pháp Hộ tịch tại Bộ phận Một cửa.',
                'warning-signature'
              )
            }
            aria-pressed={speakingId === 'warning-signature'}
            className={`group inline-flex items-center gap-1.5 font-bold text-[11px] px-2 py-1 rounded-lg border transition-all duration-150 cursor-pointer shadow-2xs select-none ${
              speakingId === 'warning-signature'
                ? 'bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5] ring-2 ring-[#FECACA]'
                : 'bg-white hover:bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
            }`}
          >
            {speakingId === 'warning-signature' ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-[#DC2626]" />
                <span className="font-extrabold text-[#991B1B]">Đang đọc...</span>
                <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-[#DC2626] text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">
                  TẮT
                </span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#991B1B]" />
                <span>Nghe đọc to</span>
                <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-[#991B1B] text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">
                  MỞ
                </span>
              </>
            )}
          </button>
        </div>

        <h3 className="text-sm font-extrabold text-[#991B1B] flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
          <span>Không ký tên trước ở nhà</span>
        </h3>
        <p className="text-xs text-[#7F1D1D] leading-relaxed">
          Chứng thực chữ ký &amp; thừa kế (NĐ 23/2015): phải ký trực tiếp trước mặt công chức Một cửa. Đất đai: kiểm kỹ số Sổ đỏ/Sổ hồng.
        </p>
      </div>

      <div className="w-full rounded-2xl bg-white border border-[#CBD5E1] shadow-xs overflow-hidden">
        <button
          type="button"
          aria-expanded={showReferenceTable}
          aria-controls="p3-reference-matrix-body"
          onClick={onToggleReferenceTable}
          className="w-full p-4 flex items-center justify-between gap-3 text-left bg-white hover:bg-[#F8FAFC] transition cursor-pointer gov-focus-ring"
        >
          <div>
            <span className="text-xs sm:text-sm font-extrabold text-[#750715] block">
              Bảng đối chiếu 4 nhóm hồ sơ
            </span>
            <span className="text-[11px] text-[#475569]">Lỗi hay gặp &amp; giấy tờ cần mang</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] text-xs font-bold shrink-0">
            <span>{showReferenceTable ? 'Thu gọn' : 'Xem bảng'}</span>
            {showReferenceTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {showReferenceTable && (
          <div id="p3-reference-matrix-body" className="px-4 pb-4 pt-2 border-t border-[#E2E8F0] overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0F172A]">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#334155] uppercase">
                <tr>
                  <th className="p-2">Tên Tờ Khai & Căn Cứ</th>
                  <th className="p-2">Điểm Bắt Buộc Đối Chiếu</th>
                  <th className="p-2">Sai Sót Thường Gặp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                <tr>
                  <td className="p-2 font-bold text-[#750715]">
                    1. Đăng ký khai sinh
                    <span className="block text-[11px] font-normal text-[#475569]">TT 04/2020/TT-BTP</span>
                  </td>
                  <td className="p-2">Khớp Họ tên bé, ngày sinh, giới tính với Giấy chứng sinh; 12 số CCCD cha/mẹ.</td>
                  <td className="p-2 text-[#991B1B] font-medium">Lệch ngày sinh với Giấy chứng sinh; cha mẹ chưa kết hôn nhưng ghi tên cha vào tờ khai thường.</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-[#750715]">
                    2. Kết hôn & Độc thân
                    <span className="block text-[11px] font-normal text-[#475569]">Luật HN&GĐ 2014</span>
                  </td>
                  <td className="p-2">Nam ≥ 20 tuổi, Nữ ≥ 18 tuổi; ghi rõ mục đích sử dụng giấy xác nhận độc thân.</td>
                  <td className="p-2 text-[#991B1B] font-medium">Chưa đủ tuổi theo ngày tháng sinh; ghi mục đích chung chung ("bổ sung hồ sơ").</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-[#750715]">
                    3. Khai tử & Trích lục
                    <span className="block text-[11px] font-normal text-[#475569]">Luật Hộ tịch 2014</span>
                  </td>
                  <td className="p-2">Khớp Giấy báo tử bản chính (15 ngày); ghi đúng năm đăng ký hộ tịch gốc.</td>
                  <td className="p-2 text-[#991B1B] font-medium">Thiếu Giấy báo tử bản chính; quên năm đăng ký hộ tịch gốc.</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-[#750715]">
                    4. Trợ cấp BTXH
                    <span className="block text-[11px] font-normal text-[#475569]">Luật BHXH 2024 & NĐ 20/2021</span>
                  </td>
                  <td className="p-2">Người cao tuổi từ đủ 75 tuổi (hộ nghèo/cận nghèo 70–74 tuổi theo Luật BHXH 41/2024/QH15) hoặc khuyết tật nặng + STK an sinh.</td>
                  <td className="p-2 text-[#991B1B] font-medium">Chưa đủ mốc tuổi hoặc thiếu số tài khoản ngân hàng chính chủ Đề án 06.</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </>
);
