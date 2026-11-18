import React from 'react';
import { AlertTriangle, Check, Sparkles } from 'lucide-react';

export interface SpecializedFormFieldsProps {
  selectedFormType: 'CT01' | 'TK-KS' | 'TK-KH' | 'TK-BTXH';
  ocrSuccess: boolean;
  fullName: string;
  cccd: string;
  phoneNumber: string;
  setPhoneNumber: (v: string) => void;
  declarationScope: string;
  setDeclarationScope: (v: string) => void;
  hostName: string;
  setHostName: (v: string) => void;
  hostCccd: string;
  setHostCccd: (v: string) => void;
  hostRelation: string;
  setHostRelation: (v: string) => void;
  parentsMarried: 'YES' | 'NO';
  setParentsMarried: (v: 'YES' | 'NO') => void;
  hospitalBirthDate: string;
  setHospitalBirthDate: (v: string) => void;
  childEthnicity: string;
  setChildEthnicity: (v: string) => void;
  childNationality: string;
  setChildNationality: (v: string) => void;
  childBirthPlace: string;
  setChildBirthPlace: (v: string) => void;
  birthCertNumber: string;
  setBirthCertNumber: (v: string) => void;
  birthCertIssueDate: string;
  setBirthCertIssueDate: (v: string) => void;
  motherName: string;
  setMotherName: (v: string) => void;
  hospitalMotherName: string;
  setHospitalMotherName: (v: string) => void;
  motherResidence: string;
  setMotherResidence: (v: string) => void;
  fatherName: string;
  setFatherName: (v: string) => void;
  fatherResidence: string;
  setFatherResidence: (v: string) => void;
  marriageMode: 'MARRIAGE_REGISTRATION' | 'MARITAL_STATUS_CONFIRMATION';
  setMarriageMode: (v: 'MARRIAGE_REGISTRATION' | 'MARITAL_STATUS_CONFIRMATION') => void;
  partnerName: string;
  setPartnerName: (v: string) => void;
  partnerCccd: string;
  setPartnerCccd: (v: string) => void;
  partnerDob: string;
  setPartnerDob: (v: string) => void;
  partnerGender: 'Nam' | 'Nữ';
  setPartnerGender: (v: 'Nam' | 'Nữ') => void;
  applicantEthnicity: string;
  setApplicantEthnicity: (v: string) => void;
  partnerEthnicity: string;
  setPartnerEthnicity: (v: string) => void;
  partnerAddress: string;
  setPartnerAddress: (v: string) => void;
  maritalCertPurpose: string;
  setMaritalCertPurpose: (v: string) => void;
  previousMaritalStatus: 'SINGLE' | 'DIVORCED' | 'WIDOWED';
  setPreviousMaritalStatus: (v: 'SINGLE' | 'DIVORCED' | 'WIDOWED') => void;
  divorceJudgmentNumber: string;
  setDivorceJudgmentNumber: (v: string) => void;
  divorceJudgmentDate: string;
  setDivorceJudgmentDate: (v: string) => void;
  deathCertNumber: string;
  setDeathCertNumber: (v: string) => void;
  deathCertDate: string;
  setDeathCertDate: (v: string) => void;
  householdStatus: 'NORMAL' | 'POOR' | 'NEAR_POOR';
  setHouseholdStatus: (v: 'NORMAL' | 'POOR' | 'NEAR_POOR') => void;
  disabilityLevel: 'NONE' | 'SEVERE' | 'EXTREMELY_SEVERE';
  setDisabilityLevel: (v: 'NONE' | 'SEVERE' | 'EXTREMELY_SEVERE') => void;
  poorHouseholdBookNumber: string;
  setPoorHouseholdBookNumber: (v: string) => void;
  disabilityCertNumber: string;
  setDisabilityCertNumber: (v: string) => void;
  disabilityCertIssueDate: string;
  setDisabilityCertIssueDate: (v: string) => void;
  disabilityCertIssuer: string;
  setDisabilityCertIssuer: (v: string) => void;
  guardianName: string;
  setGuardianName: (v: string) => void;
  guardianCccd: string;
  setGuardianCccd: (v: string) => void;
  guardianRelation: string;
  setGuardianRelation: (v: string) => void;
  guardianPhone: string;
  setGuardianPhone: (v: string) => void;
  bankAccount: string;
  setBankAccount: (v: string) => void;
}

export const SpecializedFormFields: React.FC<SpecializedFormFieldsProps> = (props) => {
  const {
    selectedFormType, ocrSuccess, fullName, cccd,
    phoneNumber, setPhoneNumber, declarationScope, setDeclarationScope,
    hostName, setHostName, hostCccd, setHostCccd, hostRelation, setHostRelation,
    parentsMarried, setParentsMarried, hospitalBirthDate, setHospitalBirthDate,
    childEthnicity, setChildEthnicity, childNationality, setChildNationality,
    childBirthPlace, setChildBirthPlace, birthCertNumber, setBirthCertNumber,
    birthCertIssueDate, setBirthCertIssueDate, motherName, setMotherName,
    hospitalMotherName, setHospitalMotherName, motherResidence, setMotherResidence,
    fatherName, setFatherName, fatherResidence, setFatherResidence,
    marriageMode, setMarriageMode, partnerName, setPartnerName,
    partnerCccd, setPartnerCccd, partnerDob, setPartnerDob,
    partnerGender, setPartnerGender, applicantEthnicity, setApplicantEthnicity,
    partnerEthnicity, setPartnerEthnicity, partnerAddress, setPartnerAddress,
    maritalCertPurpose, setMaritalCertPurpose, previousMaritalStatus, setPreviousMaritalStatus,
    divorceJudgmentNumber, setDivorceJudgmentNumber, divorceJudgmentDate, setDivorceJudgmentDate,
    deathCertNumber, setDeathCertNumber, deathCertDate, setDeathCertDate,
    householdStatus, setHouseholdStatus, disabilityLevel, setDisabilityLevel,
    poorHouseholdBookNumber, setPoorHouseholdBookNumber, disabilityCertNumber, setDisabilityCertNumber,
    disabilityCertIssueDate, setDisabilityCertIssueDate, disabilityCertIssuer, setDisabilityCertIssuer,
    guardianName, setGuardianName, guardianCccd, setGuardianCccd,
    guardianRelation, setGuardianRelation, guardianPhone, setGuardianPhone,
    bankAccount, setBankAccount,
  } = props;

  return (
    <>
                {/* SPECIALIZED FIELDS FOR CT01: Cư trú (Thông tư 66/2023/TT-BCA) */}
                {selectedFormType === 'CT01' && (
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2 text-xs font-extrabold text-[#750715] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#B90E23]" />
                      <span>Thông tin Tờ khai thay đổi thông tin cư trú (Mẫu CT01 ban hành kèm theo TT 66/2023/TT-BCA, sửa đổi tại TT 53/2025/TT-BCA &amp; TT 116/2026/TT-BCA)</span>
                    </div>

                    <details className="sm:col-span-2 rounded-xl bg-amber-50/80 border border-amber-200 px-3.5 py-2 text-[11px] text-slate-700">
                      <summary className="cursor-pointer font-bold text-amber-950 select-none">
                        Xem hướng dẫn Chú thích (1) – (8) khi điền Mẫu CT01 (Chỉ hiển thị trên Web, tự động ẩn khi xuất phôi A4 nộp cán bộ)
                      </summary>
                      <div className="mt-2 space-y-1 border-t border-amber-200/80 pt-2 leading-relaxed">
                        <div><strong>(1) Kính gửi:</strong> Cơ quan đăng ký cư trú (Công an cấp xã).</div>
                        <div><strong>(2) Mục 7 (Chủ hộ):</strong> Ghi thông tin chủ hộ gia đình mới khi đăng ký thường trú, tạm trú, tách hộ.</div>
                        <div><strong>(3) Mục 10 (Nội dung đề nghị):</strong> Ghi rõ ràng, cụ thể địa chỉ nơi đề nghị đăng ký thường trú/tạm trú hoặc xác nhận thông tin cư trú.</div>
                        <div><strong>(4), (5), (6) Ý kiến Chủ hộ / Chủ sở hữu chỗ ở hợp pháp / Cha mẹ, người giám hộ:</strong> Có thể ký trực tiếp vào Tờ khai, xác nhận qua ứng dụng VNeID hoặc lập văn bản đồng ý riêng.</div>
                        <div><strong>(7) Người kê khai:</strong> Ký, ghi rõ họ tên khi nộp trực tiếp (không cần ký lặp lại ở nhiều ô nếu đồng thời là chủ hộ/chủ sở hữu chỗ ở).</div>
                        <div><strong>(8) Xác nhận qua VNeID:</strong> Chỉ điền họ tên &amp; Số ĐDCN ở dòng cuối ô (5), (6) khi lấy ý kiến đồng ý qua ứng dụng VNeID.</div>
                      </div>
                    </details>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor="p3-ct01-phone" className="text-xs font-bold text-[#334155]">
                          Số điện thoại liên hệ (Mục 5 Mẫu CT01):
                        </label>
                        {ocrSuccess && phoneNumber ? (
                          <span className="text-[10px] text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded-full font-bold border border-[#A7F3D0] inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-[#065F46]" /> Đã map Mục 5
                          </span>
                        ) : null}
                      </div>
                      <input
                        id="p3-ct01-phone"
                        type="tel"
                        value={phoneNumber}
                        placeholder="VD: 0918234567"
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className={`w-full h-9 px-3 rounded-xl border text-xs text-[#0F172A] transition-all ${
                          ocrSuccess && phoneNumber ? 'border-[#10B981]/60 bg-[#F0FDF4]/30' : 'bg-white border-[#CBD5E1]'
                        }`}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor="p3-ct01-scope" className="text-xs font-bold text-[#334155]">
                          Nội dung đề nghị (Mục 10 Mẫu CT01):
                        </label>
                        {ocrSuccess && declarationScope ? (
                          <span className="text-[10px] text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded-full font-bold border border-[#A7F3D0] inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-[#065F46]" /> Đã map Mục 10
                          </span>
                        ) : null}
                      </div>
                      <select
                        id="p3-ct01-scope"
                        value={declarationScope}
                        onChange={(e) => setDeclarationScope(e.target.value)}
                        className={`w-full h-9 px-3 rounded-xl border text-xs font-semibold text-[#0F172A] transition-all ${
                          ocrSuccess && declarationScope ? 'border-[#10B981]/60 bg-[#F0FDF4]/30' : 'bg-white border-[#CBD5E1]'
                        }`}
                      >
                        <option value="Đăng ký thường trú">Đăng ký thường trú</option>
                        <option value="Đăng ký tạm trú">Đăng ký tạm trú</option>
                        <option value="Tách hộ">Tách hộ</option>
                        <option value="Điều chỉnh thông tin cư trú">Điều chỉnh thông tin cư trú</option>
                        <option value="Xóa đăng ký thường trú">Xóa đăng ký thường trú</option>
                        <option value="Gia hạn tạm trú">Gia hạn tạm trú</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor="p3-ct01-host-name" className="text-xs font-bold text-[#334155]">
                          Họ, chữ đệm và tên chủ hộ (Mục 7 Mẫu CT01):
                        </label>
                        {ocrSuccess && hostName ? (
                          <span className="text-[10px] text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded-full font-bold border border-[#A7F3D0] inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-[#065F46]" /> Đã map Mục 7
                          </span>
                        ) : null}
                      </div>
                      <input
                        id="p3-ct01-host-name"
                        type="text"
                        value={hostName}
                        placeholder="Họ, chữ đệm và tên chủ hộ"
                        onChange={(e) => setHostName(e.target.value)}
                        className={`w-full h-9 px-3 rounded-xl border text-xs text-[#0F172A] transition-all ${
                          ocrSuccess && hostName ? 'border-[#10B981]/60 bg-[#F0FDF4]/30 font-semibold' : 'bg-white border-[#CBD5E1]'
                        }`}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor="p3-ct01-host-cccd" className="text-xs font-bold text-[#334155]">
                          Số định danh cá nhân của chủ hộ (Mục 9 - 12 ô):
                        </label>
                        {ocrSuccess && hostCccd ? (
                          <span className="text-[10px] text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded-full font-bold border border-[#A7F3D0] inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-[#065F46]" /> Đã map Mục 9 ({hostCccd.length} số)
                          </span>
                        ) : null}
                      </div>
                      <input
                        id="p3-ct01-host-cccd"
                        type="text"
                        value={hostCccd}
                        maxLength={12}
                        placeholder="12 chữ số định danh cá nhân chủ hộ"
                        onChange={(e) => setHostCccd(e.target.value)}
                        className={`w-full h-9 px-3 rounded-xl border text-xs font-mono font-bold text-[#004D40] transition-all ${
                          ocrSuccess && hostCccd ? 'border-[#10B981]/60 bg-[#F0FDF4]/30' : 'bg-white border-[#CBD5E1]'
                        }`}
                      />
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="p3-ct01-host-rel" className="text-xs font-bold text-[#334155]">
                          Mối quan hệ với chủ hộ (Mục 8 Mẫu CT01):
                        </label>
                        {ocrSuccess && hostRelation ? (
                          <span className="text-[10px] text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded-full font-bold border border-[#A7F3D0] inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-[#065F46]" /> Đã map Mục 8
                          </span>
                        ) : null}
                      </div>
                      <select
                        id="p3-ct01-host-rel"
                        value={hostRelation}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHostRelation(val);
                          if (val === 'Chủ hộ') {
                            setHostName(fullName || 'NGUYỄN VĂN AN');
                            setHostCccd(cccd || '089092023490');
                          } else if (val === 'Con đẻ') {
                            if (!hostName || hostName === fullName) setHostName('NGUYỄN VĂN AN');
                            if (!hostCccd || hostCccd === cccd) setHostCccd('089075001234');
                          }
                        }}
                        className={`w-full h-9 px-3 rounded-xl border text-xs font-semibold text-[#0F172A] transition-all ${
                          ocrSuccess && hostRelation ? 'border-[#10B981]/60 bg-[#F0FDF4]/30' : 'bg-white border-[#CBD5E1]'
                        }`}
                      >
                        <option value="Chủ hộ">Chủ hộ (Bản thân là chủ hộ)</option>
                        <option value="Vợ/Chồng">Vợ / Chồng</option>
                        <option value="Con đẻ">Con đẻ / Con nuôi</option>
                        <option value="Bố/Mẹ">Bố đẻ / Mẹ đẻ</option>
                        <option value="Ông/Bà">Ông / Bà nội/ngoại</option>
                        <option value="Cháu ruột">Cháu ruột</option>
                        <option value="Anh/Chị/Em ruột">Anh / Chị / Em ruột</option>
                        <option value="Thuê / Mượn / Ở nhờ">Thuê / Mượn / Ở nhờ (Bắt buộc chữ ký đồng ý của chủ hộ & chủ sở hữu chỗ ở)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* SPECIALIZED FIELDS FOR PRIORITY 1: TK-KS (Birth Registration + Hospital Cert Cross-check) */}
                {selectedFormType === 'TK-KS' && (
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2 text-xs font-extrabold text-[#750715] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#B90E23]" />
                      <span>Đối chiếu chéo Giấy chứng sinh bệnh viện &amp; Tình trạng hôn nhân cha mẹ (Phụ lục 5 - Thông tư 04/2024/TT-BTP sửa đổi Thông tư 04/2020/TT-BTP)</span>
                    </div>

                    {/* Smart Checklist: Cha mẹ chưa kết hôn */}
                    {parentsMarried === 'NO' && (
                      <div className="sm:col-span-2 p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col gap-1.5 text-xs text-amber-900 shadow-2xs">
                        <div className="font-bold flex items-center gap-1.5 text-amber-900 text-sm">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Thủ tục ghép bắt buộc: Đăng ký nhận cha, mẹ, con (TTHC-HT-06)</span>
                        </div>
                        <p className="text-xs leading-relaxed text-amber-900">
                          Theo Điều 15 Thông tư 04/2020/TT-BTP, do cha mẹ <strong>chưa đăng ký kết hôn</strong> nhưng muốn ghi tên cha vào Giấy khai sinh của con, công dân phải thực hiện đồng thời thủ tục <strong>Khai sinh kết hợp Nhận cha, mẹ, con</strong>.
                        </p>
                        <div className="text-xs font-semibold text-amber-900 mt-1">
                          Hồ sơ cần nộp kèm tại Bộ phận Một cửa:
                          <ul className="list-disc pl-5 mt-1 space-y-0.5 text-amber-900 font-normal">
                            <li>Tờ khai đăng ký nhận cha, mẹ, con theo mẫu quy định.</li>
                            <li>Chứng cứ chứng minh quan hệ cha - con (Kết luận giám định ADN hoặc văn bản cam đoan/chứng cứ thân tộc có xác nhận của người làm chứng).</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      <label htmlFor="p3-ks-hospital-dob" className="text-xs font-bold text-[#334155]">
                        Ngày sinh ghi trên Giấy chứng sinh (Bệnh viện cấp):
                      </label>
                      <input
                        id="p3-ks-hospital-dob"
                        type="date"
                        value={hospitalBirthDate}
                        onChange={(e) => setHospitalBirthDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="p3-ks-parents-married" className="text-xs font-bold text-[#334155]">
                        Tình trạng hôn nhân của Cha & Mẹ:
                      </label>
                      <select
                        id="p3-ks-parents-married"
                        value={parentsMarried}
                        onChange={(e) => setParentsMarried(e.target.value as 'YES' | 'NO')}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A]"
                      >
                        <option value="YES">Đã có Giấy chứng nhận đăng ký kết hôn</option>
                        <option value="NO">Chưa đăng ký kết hôn (Cần kết hợp Nhận cha, mẹ, con)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="p3-ks-ethnicity" className="text-xs font-bold text-[#334155]">
                        Dân tộc của trẻ:
                      </label>
                      <input
                        id="p3-ks-ethnicity"
                        type="text"
                        value={childEthnicity}
                        onChange={(e) => setChildEthnicity(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="p3-ks-nationality" className="text-xs font-bold text-[#334155]">
                        Quốc tịch của trẻ:
                      </label>
                      <input
                        id="p3-ks-nationality"
                        type="text"
                        value={childNationality}
                        onChange={(e) => setChildNationality(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label htmlFor="p3-ks-birthplace" className="text-xs font-bold text-[#334155]">
                        Nơi sinh của trẻ (Tên cơ sở y tế / Bệnh viện):
                      </label>
                      <input
                        id="p3-ks-birthplace"
                        type="text"
                        value={childBirthPlace}
                        onChange={(e) => setChildBirthPlace(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="p3-ks-cert-num" className="text-xs font-bold text-[#334155]">
                        Số Giấy chứng sinh:
                      </label>
                      <input
                        id="p3-ks-cert-num"
                        type="text"
                        value={birthCertNumber}
                        onChange={(e) => setBirthCertNumber(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="p3-ks-cert-date" className="text-xs font-bold text-[#334155]">
                        Ngày cấp Giấy chứng sinh:
                      </label>
                      <input
                        id="p3-ks-cert-date"
                        type="date"
                        value={birthCertIssueDate}
                        onChange={(e) => setBirthCertIssueDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="p3-ks-mother-name" className="text-xs font-bold text-[#334155]">
                        Họ tên Mẹ ghi trên Tờ khai khai sinh:
                      </label>
                      <input
                        id="p3-ks-mother-name"
                        type="text"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="p3-ks-hospital-mother" className="text-xs font-bold text-[#334155]">
                        Họ tên Sản phụ ghi trên Giấy chứng sinh:
                      </label>
                      <input
                        id="p3-ks-hospital-mother"
                        type="text"
                        value={hospitalMotherName}
                        onChange={(e) => setHospitalMotherName(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label htmlFor="p3-ks-mother-res" className="text-xs font-bold text-[#334155]">
                        Nơi cư trú của người mẹ:
                      </label>
                      <input
                        id="p3-ks-mother-res"
                        type="text"
                        value={motherResidence}
                        onChange={(e) => setMotherResidence(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="p3-ks-father-name" className="text-xs font-bold text-[#334155]">
                        Họ tên Cha ghi trên Tờ khai:
                      </label>
                      <input
                        id="p3-ks-father-name"
                        type="text"
                        value={fatherName}
                        placeholder="Để trống nếu chưa làm thủ tục nhận cha con"
                        onChange={(e) => setFatherName(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="p3-ks-father-res" className="text-xs font-bold text-[#334155]">
                        Nơi cư trú của người cha:
                      </label>
                      <input
                        id="p3-ks-father-res"
                        type="text"
                        value={fatherResidence}
                        onChange={(e) => setFatherResidence(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>
                  </div>
                )}

                {/* SPECIALIZED FIELDS FOR PRIORITY 2: TK-KH (Marriage & Single Status Certificate) */}
                {selectedFormType === 'TK-KH' && (
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2 text-xs font-extrabold text-[#750715] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#B90E23]" />
                      <span>Rà soát biểu mẫu Hôn nhân &amp; Tình trạng hôn nhân (Phụ lục 5 - Thông tư 04/2024/TT-BTP sửa đổi Thông tư 04/2020/TT-BTP)</span>
                    </div>

                    {/* Toggle Switch giữa 2 chế độ */}
                    <div className="sm:col-span-2 flex items-center gap-2 p-1 bg-slate-200/80 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setMarriageMode('MARRIAGE_REGISTRATION')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer gov-focus-ring ${
                          marriageMode === 'MARRIAGE_REGISTRATION'
                            ? 'bg-[#B90E23] text-white shadow-xs'
                            : 'text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        Đăng Ký Kết Hôn
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarriageMode('MARITAL_STATUS_CONFIRMATION')}
                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer gov-focus-ring ${
                          marriageMode === 'MARITAL_STATUS_CONFIRMATION'
                            ? 'bg-[#B90E23] text-white shadow-xs'
                            : 'text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        Cấp Giấy Xác Nhận Tình Trạng Hôn Nhân
                      </button>
                    </div>

                    {marriageMode === 'MARRIAGE_REGISTRATION' ? (
                      <>
                        <div className="flex flex-col gap-1">
                          <label htmlFor="p3-kh-partner-name" className="text-xs font-bold text-[#334155]">
                            Họ tên bên kết hôn thứ hai (Nam/Nữ):
                          </label>
                          <input
                            id="p3-kh-partner-name"
                            type="text"
                            value={partnerName}
                            onChange={(e) => setPartnerName(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label htmlFor="p3-kh-partner-cccd" className="text-xs font-bold text-[#334155]">
                            Số CCCD bên kết hôn thứ hai (12 số):
                          </label>
                          <input
                            id="p3-kh-partner-cccd"
                            type="text"
                            value={partnerCccd}
                            maxLength={12}
                            placeholder="12 chữ số CCCD"
                            onChange={(e) => setPartnerCccd(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-mono font-bold text-[#004D40]"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label htmlFor="p3-kh-partner-dob" className="text-xs font-bold text-[#334155]">
                            Ngày sinh & Giới tính bên thứ hai:
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              id="p3-kh-partner-dob"
                              aria-label="Ngày sinh bên kết hôn thứ hai"
                              type="date"
                              value={partnerDob}
                              onChange={(e) => setPartnerDob(e.target.value)}
                              className="w-full h-9 px-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                            />
                            <select
                              id="p3-kh-partner-gender"
                              aria-label="Giới tính bên kết hôn thứ hai"
                              value={partnerGender}
                              onChange={(e) => setPartnerGender(e.target.value as 'Nam' | 'Nữ')}
                              className="h-9 px-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#004D40]"
                            >
                              <option value="Nam">Nam</option>
                              <option value="Nữ">Nữ</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label htmlFor="p3-kh-ethnicity-self" className="text-xs font-bold text-[#334155]">
                            Dân tộc hai bên (Người nộp / Bên thứ hai):
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              id="p3-kh-ethnicity-self"
                              aria-label="Dân tộc người nộp"
                              type="text"
                              value={applicantEthnicity}
                              onChange={(e) => setApplicantEthnicity(e.target.value)}
                              placeholder="Dân tộc bạn"
                              className="w-1/2 h-9 px-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                            />
                            <input
                              id="p3-kh-ethnicity-partner"
                              aria-label="Dân tộc bên phối ngẫu"
                              type="text"
                              value={partnerEthnicity}
                              onChange={(e) => setPartnerEthnicity(e.target.value)}
                              placeholder="Dân tộc phối ngẫu"
                              className="w-1/2 h-9 px-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 sm:col-span-2">
                          <label htmlFor="p3-kh-partner-addr" className="text-xs font-bold text-[#334155]">
                            Nơi cư trú bên kết hôn thứ hai:
                          </label>
                          <input
                            id="p3-kh-partner-addr"
                            type="text"
                            value={partnerAddress}
                            onChange={(e) => setPartnerAddress(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col gap-1 sm:col-span-2">
                        <label htmlFor="p3-kh-purpose" className="text-xs font-bold text-[#334155]">
                          Mục đích sử dụng Giấy xác nhận tình trạng hôn nhân (Bắt buộc ghi cụ thể theo TT 04/2020/TT-BTP):
                        </label>
                        <input
                          id="p3-kh-purpose"
                          type="text"
                          value={maritalCertPurpose}
                          placeholder="VD: Để đăng ký kết hôn với anh Phạm Văn Minh tại UBND..."
                          onChange={(e) => setMaritalCertPurpose(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label htmlFor="p3-kh-prev-status" className="text-xs font-bold text-[#334155]">
                        Tình trạng hôn nhân trước khi đăng ký:
                      </label>
                      <select
                        id="p3-kh-prev-status"
                        value={previousMaritalStatus}
                        onChange={(e) => setPreviousMaritalStatus(e.target.value as 'SINGLE' | 'DIVORCED' | 'WIDOWED')}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A]"
                      >
                        <option value="SINGLE">Chưa từng kết hôn lần nào</option>
                        <option value="DIVORCED">Đã ly hôn (Bắt buộc có Bản án/Quyết định ly hôn của Tòa án)</option>
                        <option value="WIDOWED">Vợ / Chồng đã mất (Bắt buộc có Giấy chứng tử/Trích lục khai tử)</option>
                      </select>
                    </div>

                    {/* Smart Checklist: Đã từng ly hôn */}
                    {previousMaritalStatus === 'DIVORCED' && (
                      <div className="sm:col-span-2 p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col gap-2 text-xs text-amber-900 shadow-2xs">
                        <div className="font-bold flex items-center gap-1.5 text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Yêu cầu văn bản Tòa án đối với người đã ly hôn:</span>
                        </div>
                        <p className="text-xs text-amber-900">
                          Bắt buộc xuất trình bản chính hoặc nộp bản sao trích lục Bản án/Quyết định ly hôn đã có hiệu lực pháp luật của Tòa án nhân dân kèm theo hồ sơ.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          <div>
                            <label htmlFor="p3-kh-divorce-num" className="text-[11px] font-bold text-amber-900">Số Bản án / Quyết định ly hôn:</label>
                            <input
                              id="p3-kh-divorce-num"
                              type="text"
                              value={divorceJudgmentNumber}
                              placeholder="VD: 45/2023/HNGĐ-ST"
                              onChange={(e) => setDivorceJudgmentNumber(e.target.value)}
                              className="w-full h-8 px-2.5 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 mt-0.5"
                            />
                          </div>
                          <div>
                            <label htmlFor="p3-kh-divorce-date" className="text-[11px] font-bold text-amber-900">Ngày ban hành Bản án/Quyết định:</label>
                            <input
                              id="p3-kh-divorce-date"
                              type="date"
                              value={divorceJudgmentDate}
                              onChange={(e) => setDivorceJudgmentDate(e.target.value)}
                              className="w-full h-8 px-2.5 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 mt-0.5"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Smart Checklist: Vợ/chồng đã mất */}
                    {previousMaritalStatus === 'WIDOWED' && (
                      <div className="sm:col-span-2 p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col gap-2 text-xs text-amber-900 shadow-2xs">
                        <div className="font-bold flex items-center gap-1.5 text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Yêu cầu giấy tờ đối với người có vợ/chồng đã mất:</span>
                        </div>
                        <p className="text-xs text-amber-900">
                          Bắt buộc nộp bản sao Giấy chứng tử hoặc Trích lục khai tử của vợ/chồng cũ đã mất.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          <div>
                            <label htmlFor="p3-kh-death-num" className="text-[11px] font-bold text-amber-900">Số Giấy chứng tử / Trích lục khai tử:</label>
                            <input
                              id="p3-kh-death-num"
                              type="text"
                              value={deathCertNumber}
                              placeholder="VD: 12/TLKT-2024"
                              onChange={(e) => setDeathCertNumber(e.target.value)}
                              className="w-full h-8 px-2.5 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 mt-0.5"
                            />
                          </div>
                          <div>
                            <label htmlFor="p3-kh-death-date" className="text-[11px] font-bold text-amber-900">Ngày cấp Giấy chứng tử:</label>
                            <input
                              id="p3-kh-death-date"
                              type="date"
                              value={deathCertDate}
                              onChange={(e) => setDeathCertDate(e.target.value)}
                              className="w-full h-8 px-2.5 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 mt-0.5"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SPECIALIZED FIELDS FOR PRIORITY 3: TK-BTXH (Nghị định 20/2021/NĐ-CP & Luật BHXH 2024) */}
                {selectedFormType === 'TK-BTXH' && (
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2 text-xs font-extrabold text-[#750715] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#B90E23]" />
                      <span>Kiểm tra điều kiện Mẫu số 1a-1đ Nghị định 20/2021/NĐ-CP, Nghị định 76/2024/NĐ-CP, Luật BHXH 2024 &amp; Tài khoản an sinh Đề án 06</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="p3-btxh-household" className="text-xs font-bold text-[#334155]">
                        Diện xét trợ cấp hưu trí xã hội (Luật BHXH 2024 & NĐ 20/2021):
                      </label>
                      <select
                        id="p3-btxh-household"
                        value={householdStatus}
                        onChange={(e) =>
                          setHouseholdStatus(e.target.value as 'NORMAL' | 'POOR' | 'NEAR_POOR')
                        }
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A]"
                      >
                        <option value="NORMAL">Hộ gia đình bình thường (Mốc tuổi hưu trí xã hội: ≥ 75 tuổi)</option>
                        <option value="POOR">Thuộc Hộ nghèo (Mốc tuổi hưởng trợ cấp: ≥ 70 tuổi)</option>
                        <option value="NEAR_POOR">Thuộc Hộ cận nghèo (Mốc tuổi hưởng trợ cấp: ≥ 70 tuổi)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="p3-btxh-disability" className="text-xs font-bold text-[#334155]">
                        Mức độ khuyết tật (nếu có Giấy xác nhận của Hội đồng cấp xã):
                      </label>
                      <select
                        id="p3-btxh-disability"
                        value={disabilityLevel}
                        onChange={(e) =>
                          setDisabilityLevel(e.target.value as 'NONE' | 'SEVERE' | 'EXTREMELY_SEVERE')
                        }
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A]"
                      >
                        <option value="NONE">Không khuyết tật (Xét theo mốc Người cao tuổi)</option>
                        <option value="SEVERE">Khuyết tật nặng (Có Giấy xác nhận)</option>
                        <option value="EXTREMELY_SEVERE">Khuyết tật đặc biệt nặng (Có Giấy xác nhận)</option>
                      </select>
                    </div>

                    {/* Sổ hộ nghèo */}
                    {(householdStatus === 'POOR' || householdStatus === 'NEAR_POOR') && (
                      <div className="sm:col-span-2 flex flex-col gap-1 p-3 rounded-xl bg-amber-50 border border-amber-200">
                        <label htmlFor="p3-btxh-poor-book" className="text-xs font-bold text-amber-900">
                          Số sổ hộ nghèo / Giấy chứng nhận hộ nghèo:
                        </label>
                        <input
                          id="p3-btxh-poor-book"
                          type="text"
                          value={poorHouseholdBookNumber}
                          placeholder="VD: HN-2026/08912 do UBND cấp xã cấp"
                          onChange={(e) => setPoorHouseholdBookNumber(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl border border-amber-300 bg-white text-xs text-slate-800 font-mono"
                        />
                      </div>
                    )}

                    {/* Giấy xác nhận khuyết tật */}
                    {(disabilityLevel === 'SEVERE' || disabilityLevel === 'EXTREMELY_SEVERE') && (
                      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#FBF9F5] border border-[#E5D4B3]">
                        <div className="flex flex-col gap-1">
                          <label htmlFor="p3-btxh-dis-num" className="text-xs font-bold text-[#750715]">Số Giấy xác nhận khuyết tật:</label>
                          <input
                            id="p3-btxh-dis-num"
                            type="text"
                            value={disabilityCertNumber}
                            placeholder="VD: GKT-2025/001"
                            onChange={(e) => setDisabilityCertNumber(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-[#E5D4B3] bg-white text-xs text-slate-800 font-mono"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label htmlFor="p3-btxh-dis-date" className="text-xs font-bold text-[#750715]">Ngày cấp Giấy xác nhận:</label>
                          <input
                            id="p3-btxh-dis-date"
                            type="date"
                            value={disabilityCertIssueDate}
                            onChange={(e) => setDisabilityCertIssueDate(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-[#E5D4B3] bg-white text-xs text-slate-800"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label htmlFor="p3-btxh-dis-issuer" className="text-xs font-bold text-[#750715]">Cơ quan cấp (Chủ tịch UBND):</label>
                          <input
                            id="p3-btxh-dis-issuer"
                            type="text"
                            value={disabilityCertIssuer}
                            onChange={(e) => setDisabilityCertIssuer(e.target.value)}
                            className="w-full h-9 px-3 rounded-xl border border-[#E5D4B3] bg-white text-xs text-slate-800"
                          />
                        </div>
                      </div>
                    )}

                    {/* Thông tin người giám hộ */}
                    <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="sm:col-span-2 text-xs font-bold text-slate-800">
                        Thông tin người giám hộ / người chăm sóc (nếu có hoặc đối tượng khuyết tật đặc biệt nặng):
                      </div>
                      <div>
                        <label htmlFor="p3-btxh-guard-name" className="text-[11px] font-bold text-slate-700">Họ và tên người giám hộ:</label>
                        <input
                          id="p3-btxh-guard-name"
                          type="text"
                          value={guardianName}
                          placeholder="Họ và tên người giám hộ"
                          onChange={(e) => setGuardianName(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 mt-0.5"
                        />
                      </div>
                      <div>
                        <label htmlFor="p3-btxh-guard-cccd" className="text-[11px] font-bold text-slate-700">Số CCCD người giám hộ (12 số):</label>
                        <input
                          id="p3-btxh-guard-cccd"
                          type="text"
                          value={guardianCccd}
                          maxLength={12}
                          placeholder="12 chữ số CCCD"
                          onChange={(e) => setGuardianCccd(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800 mt-0.5"
                        />
                      </div>
                      <div>
                        <label htmlFor="p3-btxh-guard-rel" className="text-[11px] font-bold text-slate-700">Quan hệ với người hưởng:</label>
                        <input
                          id="p3-btxh-guard-rel"
                          type="text"
                          value={guardianRelation}
                          placeholder="VD: Con đẻ, Bố mẹ, Vợ chồng"
                          onChange={(e) => setGuardianRelation(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 mt-0.5"
                        />
                      </div>
                      <div>
                        <label htmlFor="p3-btxh-guard-phone" className="text-[11px] font-bold text-slate-700">Số điện thoại liên hệ:</label>
                        <input
                          id="p3-btxh-guard-phone"
                          type="tel"
                          value={guardianPhone}
                          placeholder="VD: 0987654321"
                          onChange={(e) => setGuardianPhone(e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 mt-0.5"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label htmlFor="p3-btxh-bank" className="text-xs font-bold text-[#334155]">
                        Số tài khoản & Ngân hàng nhận trợ cấp an sinh không dùng tiền mặt (Đề án 06):
                      </label>
                      <input
                        id="p3-btxh-bank"
                        type="text"
                        value={bankAccount}
                        placeholder="VD: 70110000889912 - VietinBank An Giang"
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />
                    </div>
                  </div>
                )}
    </>
  );
};
