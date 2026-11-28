export type PaperForm = 'CT01' | 'TK-KS' | 'TK-KH' | 'TK-BTXH';
type FieldGroup = Record<string, string>;

export const paperGroups: Record<PaperForm, FieldGroup> = {
  CT01: { hostRelation: 'Quan hệ với chủ hộ', declarationScope: 'Nội dung đề nghị' },
  'TK-KS': {
    declarerName: 'Họ tên người đi khai',
    declarerRelation: 'Quan hệ với trẻ',
    childHometown: 'Quê quán của trẻ',
    childEthnicity: 'Dân tộc của trẻ',
    childNationality: 'Quốc tịch của trẻ',
    childBirthPlace: 'Nơi sinh của trẻ',
    childDobInWords: 'Ngày sinh của trẻ bằng chữ',
    motherYear: 'Năm sinh của mẹ',
    motherEthnicity: 'Dân tộc của mẹ',
    motherNationality: 'Quốc tịch của mẹ',
    motherResidence: 'Nơi cư trú của mẹ',
    fatherYear: 'Năm sinh của cha',
    fatherEthnicity: 'Dân tộc của cha',
    fatherNationality: 'Quốc tịch của cha',
    fatherResidence: 'Nơi cư trú của cha',
    marriageCertNumber: 'Giấy kết hôn của cha mẹ – số',
    marriageBook: 'Quyển số',
    marriageDate: 'Ngày đăng ký kết hôn',
    marriagePlace: 'Nơi đăng ký kết hôn',
    birthCertNumber: 'Số giấy chứng sinh',
    birthCertIssueDate: 'Ngày cấp giấy chứng sinh',
    copiesRequested: 'Số bản sao đề nghị (0 nếu không yêu cầu)',
  },
  'TK-KH': {
    applicantEthnicity: 'Dân tộc người yêu cầu',
    applicantNationality: 'Quốc tịch người yêu cầu',
    applicantMarriageCount: 'Lần kết hôn của người yêu cầu',
    partnerEthnicity: 'Dân tộc người phối ngẫu',
    partnerNationality: 'Quốc tịch người phối ngẫu',
    partnerMarriageCount: 'Lần kết hôn của người phối ngẫu',
    partnerAddress: 'Nơi cư trú người phối ngẫu',
  },
  'TK-BTXH': {
    currentAddress: 'Chỗ ở hiện nay',
    accountHolderName: 'Họ tên chủ tài khoản',
    bankName: 'Tên ngân hàng',
  },
};

export const memberFields: FieldGroup = {
  fullName: 'Họ tên',
  birthDate: 'Ngày sinh',
  gender: 'Giới tính',
  citizenCccd: 'Số định danh cá nhân',
  hostRelation: 'Quan hệ với chủ hộ',
};
export type PaperDraft = { fields: Record<string, string>; members: Record<string, string>[] };
export const emptyPaper: PaperDraft = { fields: {}, members: [] };

export function paperValues(form: PaperForm, draft: PaperDraft, parentsMarried?: string) {
  const values: Record<string, string> = {};
  for (const key of Object.keys(paperGroups[form])) {
    if (form === 'TK-KS' && parentsMarried === 'NO' && marriageKeys.includes(key)) continue;
    if (draft.fields[key]?.trim()) values[key] = draft.fields[key].trim();
  }
  const members = draft.members.filter((member) => Object.values(member).some((v) => v.trim()));
  if (form === 'CT01' && members.length) values.householdMembers = JSON.stringify(members);
  return values;
}
const marriageKeys = ['marriageCertNumber', 'marriageBook', 'marriageDate', 'marriagePlace'];
export function paperInputs(form: PaperForm, existing: string[], married?: string) {
  return Object.entries(paperGroups[form]).filter(
    ([key]) => !existing.includes(key) && !(married === 'NO' && marriageKeys.includes(key)),
  );
}
export function paperDetails(data: Record<string, unknown>) {
  const labels: Record<string, string> = {
    ...paperGroups.CT01,
    ...paperGroups['TK-KS'],
    ...paperGroups['TK-KH'],
    ...paperGroups['TK-BTXH'],
    motherName: 'Họ tên mẹ',
    fatherName: 'Họ tên cha',
    childName: 'Họ tên trẻ',
    hostName: 'Họ tên chủ hộ',
    hostCccd: 'Số định danh chủ hộ',
    partnerName: 'Họ tên người phối ngẫu',
    partnerDob: 'Ngày sinh người phối ngẫu',
    partnerCccd: 'Số định danh người phối ngẫu',
    declarerCccd: 'Số định danh người đi khai',
    childBirthDate: 'Ngày sinh của trẻ',
    childGender: 'Giới tính của trẻ',
    guardianName: 'Người giám hộ',
    guardianCccd: 'Số định danh người giám hộ',
    guardianPhone: 'Điện thoại người giám hộ',
    guardianRelation: 'Quan hệ người giám hộ',
    paymentMethod: 'Phương thức chi trả',
    bankAccount: 'Số tài khoản',
    socialTargetGroup: 'Nhóm đối tượng',
    bhytNumber: 'Số thẻ BHYT',
    disabilityCertNumber: 'Số giấy xác nhận khuyết tật',
    disabilityCertIssuer: 'Nơi cấp giấy xác nhận',
    disabilityCertIssueDate: 'Ngày cấp giấy xác nhận',
    poorHouseholdBookNumber: 'Số sổ hộ nghèo',
    divorceJudgmentNumber: 'Số bản án ly hôn',
    divorceJudgmentDate: 'Ngày bản án',
    deathCertNumber: 'Số giấy chứng tử',
    deathCertDate: 'Ngày giấy chứng tử',
  };
  const details = Object.entries(labels)
    .filter(([key]) => typeof data[key] === 'string' && data[key] !== '')
    .map(([key, label]) => [label, String(data[key])]);
  const members = data.householdMembers;
  if (Array.isArray(members))
    members.forEach((member, i) => {
      if (member && typeof member === 'object')
        for (const [key, label] of Object.entries(memberFields))
          if (member[key]) details.push([`Thành viên ${i + 1} · ${label}`, String(member[key])]);
    });
  return details;
}
