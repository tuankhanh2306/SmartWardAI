import { api } from './http';
import { citizenDossierFormSchema } from '../../schemas/formValidation';

// 2. Form Precheck Types & API
export interface FieldValidation {
  fieldName: string;
  providedValue: string;
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
  confidenceScore: number;
}

export interface FormPrecheckResponse {
  submissionId: string;
  procedureCode: string;
  overallValid: boolean;
  fieldValidations: FieldValidation[];
  warnings: string[];
  processedAt: string;
  processingTimeMs: number;
}

export const precheckForm = async (data: {
  procedureCode: string;
  formType: string;
  citizenCccd: string;
  fullName: string;
  dateOfBirth: string;
  gender?: string;
  cccdIssueDate?: string;
  address: string;
  formData: Record<string, string>;
}): Promise<FormPrecheckResponse> => {
  try {
    const resp = await api.post<any>('/forms/precheck', data);
    const raw = resp.data?.data ?? resp.data;
    const mappedValidations: FieldValidation[] = Array.isArray(raw.fieldValidations)
      ? raw.fieldValidations
      : Array.isArray(raw.issues)
      ? raw.issues.map((iss: any) => ({
          fieldName: iss.field || 'Trường thông tin',
          providedValue: '',
          valid: iss.severity === 'WARNING',
          errorCode: iss.ruleCode,
          errorMessage: iss.message,
          confidenceScore: Number(raw.ocrConfidence ?? 0.98),
        }))
      : [];
    const normalized: FormPrecheckResponse = {
      submissionId: String(raw.submissionId ?? raw.submissionCode ?? ('sub_' + Date.now())),
      procedureCode: raw.procedureCode || data.procedureCode || 'TTHC-CT-01',
      overallValid: Boolean(raw.overallValid ?? raw.valid ?? mappedValidations.every((f) => f.valid)),
      fieldValidations: mappedValidations,
      warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
      processedAt: raw.processedAt || new Date().toISOString(),
      processingTimeMs: Number(raw.processingTimeMs ?? 12.4),
    };
    return normalized;
  } catch {
    // Offline local precheck: validate shared citizen identity with Zod schema + deterministic form rules
    const fieldValidations: FieldValidation[] = [];
    const warnings: string[] = [];
    const formType = (data.formType || 'CT01').toUpperCase();
    const extra = data.formData || {};

    const zodResult = citizenDossierFormSchema.safeParse({
      fullName: data.fullName || '',
      cccd: data.citizenCccd || '',
      dob: data.dateOfBirth || '',
      address: data.address || '',
      phoneNumber: (extra.phoneNumber || extra.phone || '').trim(),
      citizenEmail: (extra.citizenEmail || extra.email || '').trim(),
    });
    if (!zodResult.success) {
      const zodLabels: Record<string, string> = {
        fullName: 'Họ và tên công dân (Zod)',
        cccd: 'Số định danh cá nhân / CCCD 12 số (Zod)',
        dob: 'Ngày tháng năm sinh (Zod)',
        address: 'Địa chỉ cư trú (Zod)',
        phoneNumber: 'Số điện thoại liên hệ (Zod)',
        citizenEmail: 'Địa chỉ Email nhận thông báo (Zod)',
      };
      for (const issue of zodResult.error.issues) {
        const key = String(issue.path[0] ?? '_form');
        fieldValidations.push({
          fieldName: zodLabels[key] || key,
          providedValue: '',
          valid: false,
          errorCode: `ZOD_${key.toUpperCase()}`,
          errorMessage: issue.message,
          confidenceScore: 1,
        });
      }
    }

    const computeAgeYearsAndMonths = (dobStr: string): { years: number; months: number } | null => {
      if (!dobStr) return null;
      const birth = new Date(dobStr);
      if (isNaN(birth.getTime())) return null;
      const now = new Date();
      let years = now.getFullYear() - birth.getFullYear();
      let months = now.getMonth() - birth.getMonth();
      if (now.getDate() < birth.getDate()) {
        months--;
      }
      if (months < 0) {
        years--;
        months += 12;
      }
      return { years, months };
    };

    if (formType === 'TK-KS') {
      // Ưu tiên 1: Tờ khai Đăng ký khai sinh & Đối chiếu chéo Giấy chứng sinh (Thông tư 04/2020/TT-BTP)
      const childNameValid = data.fullName.trim().length >= 4 && data.fullName.trim().includes(' ');
      fieldValidations.push({
        fieldName: 'Họ, chữ đệm, tên của trẻ (Tờ khai Khai sinh)',
        providedValue: data.fullName,
        valid: childNameValid,
        errorCode: childNameValid ? undefined : 'INVALID_CHILD_NAME',
        errorMessage: childNameValid ? undefined : 'Họ tên trẻ phải ghi đầy đủ họ, chữ đệm và tên bằng chữ tiếng Việt.',
        confidenceScore: childNameValid ? 0.99 : 0.5,
      });

      const hospitalDob = (extra.hospitalBirthDate || '').trim();
      const dobCrossValid = Boolean(data.dateOfBirth) && (!hospitalDob || data.dateOfBirth.trim() === hospitalDob);
      fieldValidations.push({
        fieldName: 'Đối chiếu chéo Ngày sinh (Tờ khai vs Giấy chứng sinh)',
        providedValue: `${data.dateOfBirth}${hospitalDob ? ' | GCS: ' + hospitalDob : ''}`,
        valid: dobCrossValid,
        errorCode: dobCrossValid ? undefined : 'BIRTH_CERT_DATE_MISMATCH',
        errorMessage: dobCrossValid
          ? undefined
          : `LỆCH GIẤY CHỨNG SINH: Ngày sinh trên Tờ khai (${data.dateOfBirth}) không khớp với Ngày sinh trên Giấy chứng sinh của bệnh viện (${hospitalDob}). Cán bộ Một cửa sẽ trả hồ sơ!`,
        confidenceScore: dobCrossValid ? 0.99 : 0.3,
      });

      const motherName = (extra.motherName || '').trim();
      const hospitalMotherName = (extra.hospitalMotherName || '').trim();
      const motherValid =
        motherName.length >= 4 &&
        (!hospitalMotherName || motherName.toLowerCase() === hospitalMotherName.toLowerCase());
      fieldValidations.push({
        fieldName: 'Đối chiếu Họ tên Mẹ (Tờ khai vs Giấy chứng sinh)',
        providedValue: `${motherName}${hospitalMotherName ? ' | GCS: ' + hospitalMotherName : ''}`,
        valid: motherValid,
        errorCode: motherValid ? undefined : 'BIRTH_CERT_MOTHER_MISMATCH',
        errorMessage: motherValid
          ? undefined
          : `LỆCH GIẤY CHỨNG SINH: Họ tên mẹ trên Tờ khai ('${motherName}') lệch với Họ tên sản phụ trên Giấy chứng sinh ('${hospitalMotherName}').`,
        confidenceScore: motherValid ? 0.98 : 0.35,
      });

      const cccdClean = data.citizenCccd.trim();
      const cccdValid = /^\d{12}$/.test(cccdClean);
      fieldValidations.push({
        fieldName: 'Số định danh cá nhân (12 số CCCD) của Cha/Mẹ',
        providedValue: cccdClean,
        valid: cccdValid,
        errorCode: cccdValid ? undefined : 'INVALID_PARENT_CCCD',
        errorMessage: cccdValid ? undefined : 'Số định danh cá nhân của cha/mẹ phải gồm đúng 12 chữ số.',
        confidenceScore: cccdValid ? 0.98 : 0.45,
      });

      const fatherName = (extra.fatherName || '').trim();
      const parentsMarried = (extra.parentsMarried || 'YES').toUpperCase();
      const paternityValid = !(parentsMarried === 'NO' && fatherName.length > 0);
      fieldValidations.push({
        fieldName: 'Quy tắc Pháp lý Cha Mẹ & Tình trạng hôn nhân',
        providedValue:
          parentsMarried === 'NO'
            ? `Chưa kết hôn (Tên cha: ${fatherName || 'Để trống'})`
            : 'Đã có Giấy chứng nhận kết hôn',
        valid: paternityValid,
        errorCode: paternityValid ? undefined : 'UNMARRIED_PARENTS_PATERNITY_REQUIRED',
        errorMessage: paternityValid
          ? undefined
          : `Cha mẹ CHƯA đăng ký kết hôn nhưng ghi tên Cha ('${fatherName}') vào tờ khai khai sinh thường: Bắt buộc phải làm thủ tục kết hợp 'Đăng ký khai sinh và Nhận cha, mẹ, con' (Thông tư 04/2020/TT-BTP).`,
        confidenceScore: paternityValid ? 0.99 : 0.3,
      });

      warnings.push(
        'Lưu ý Thông tư 04/2020/TT-BTP: Phải nộp Bản chính Giấy chứng sinh do cơ sở y tế cấp (không dùng ảnh chụp qua Zalo). Quê quán của trẻ được xác định theo quê quán của cha hoặc mẹ theo thỏa thuận.'
      );
    } else if (formType === 'TK-KH') {
      // Ưu tiên 2: Tờ khai Đăng ký kết hôn & Cấp Giấy xác nhận tình trạng hôn nhân (Luật HN&GĐ 2014)
      const isMale = (data.gender || '').trim().toLowerCase() === 'nam';
      const reqAge = isMale ? 20 : 18;
      const ageInfo = computeAgeYearsAndMonths(data.dateOfBirth);
      const ageValid = Boolean(ageInfo && ageInfo.years >= reqAge);
      fieldValidations.push({
        fieldName: 'Độ tuổi kết hôn hợp pháp (Điều 8 Luật HN&GĐ 2014)',
        providedValue: ageInfo
          ? `${data.dateOfBirth} (${ageInfo.years} tuổi ${ageInfo.months} tháng - ${isMale ? 'Nam' : 'Nữ'})`
          : data.dateOfBirth,
        valid: ageValid,
        errorCode: ageValid ? undefined : 'UNDERAGE_MARRIAGE',
        errorMessage: ageValid
          ? undefined
          : `CHƯA ĐỦ TUỔI KẾT HÔN: Theo Điều 8 Luật Hôn nhân & Gia đình 2014, ${
              isMale ? 'Nam giới phải từ đủ 20 tuổi' : 'Nữ giới phải từ đủ 18 tuổi'
            } trở lên tính theo ngày tháng năm sinh (hiện mới ${ageInfo?.years ?? 0} tuổi ${ageInfo?.months ?? 0} tháng)!`,
        confidenceScore: ageValid ? 0.99 : 0.25,
      });

      if (extra.partnerDob) {
        const partnerIsMale = (extra.partnerGender || 'Nam').trim().toLowerCase() !== 'nữ';
        const partnerReqAge = partnerIsMale ? 20 : 18;
        const pAge = computeAgeYearsAndMonths(extra.partnerDob);
        const pValid = Boolean(pAge && pAge.years >= partnerReqAge);
        fieldValidations.push({
          fieldName: 'Độ tuổi Bên kết hôn thứ hai (Nam ≥ 20, Nữ ≥ 18)',
          providedValue: pAge
            ? `${extra.partnerDob} (${pAge.years} tuổi ${pAge.months} tháng - ${partnerIsMale ? 'Nam' : 'Nữ'})`
            : extra.partnerDob,
          valid: pValid,
          errorCode: pValid ? undefined : 'PARTNER_UNDERAGE_MARRIAGE',
          errorMessage: pValid
            ? undefined
            : `CHƯA ĐỦ TUỔI KẾT HÔN (Bên thứ hai): ${partnerIsMale ? 'Nam giới' : 'Nữ giới'} phải từ đủ ${partnerReqAge} tuổi trở lên (hiện mới ${pAge?.years ?? 0} tuổi ${pAge?.months ?? 0} tháng).`,
          confidenceScore: pValid ? 0.99 : 0.25,
        });
      }

      const purpose = (extra.maritalCertPurpose || '').trim();
      const lowerPurpose = purpose.toLowerCase();
      const isVague =
        purpose.length < 15 ||
        lowerPurpose === 'bổ sung hồ sơ' ||
        lowerPurpose === 'việc cá nhân' ||
        lowerPurpose === 'làm giấy tờ' ||
        lowerPurpose === 'kết hôn';
      fieldValidations.push({
        fieldName: 'Mục đích sử dụng Giấy xác nhận tình trạng hôn nhân (TT 04/2020/TT-BTP)',
        providedValue: purpose || '(Để trống)',
        valid: !isVague,
        errorCode: !isVague ? undefined : 'VAGUE_MARITAL_PURPOSE',
        errorMessage: !isVague
          ? undefined
          : "SAI SÓT THƯỜNG GẶP: Không được để trống hoặc ghi chung chung ('bổ sung hồ sơ', 'việc cá nhân'). Bắt buộc ghi rõ: 'Để đăng ký kết hôn với anh/chị [Họ tên] tại UBND...' hoặc 'Để làm thủ tục vay vốn ngân hàng / chuyển nhượng nhà đất'.",
        confidenceScore: !isVague ? 0.98 : 0.35,
      });

      const cccdValid = /^\d{12}$/.test(data.citizenCccd.trim());
      fieldValidations.push({
        fieldName: 'Số định danh cá nhân (12 số CCCD)',
        providedValue: data.citizenCccd,
        valid: cccdValid,
        errorCode: cccdValid ? undefined : 'INVALID_CCCD_FORMAT',
        errorMessage: cccdValid ? undefined : 'Số định danh cá nhân / CCCD phải gồm đúng 12 chữ số.',
        confidenceScore: cccdValid ? 0.98 : 0.45,
      });

      if (extra.previousMaritalStatus === 'DIVORCED') {
        warnings.push(
          'Lưu ý người đã ly hôn: Bắt buộc ghi rõ "Đã ly hôn theo Bản án/Quyết định số... ngày... của Tòa án nhân dân..." và xuất trình trích lục bản án ly hôn có hiệu lực pháp luật.'
        );
      }
      warnings.push(
        'Lưu ý cư trú nhiều nơi: Nếu từng đăng ký thường trú tại nhiều xã/phường khác nhau từ khi đủ tuổi kết hôn đến nay, cần có xác nhận tình trạng hôn nhân tại các nơi cư trú trước đó.'
      );
    } else if (formType === 'TK-BTXH') {
      // Ưu tiên 3: Tờ khai Trợ cấp Bảo trợ xã hội hằng tháng (Mẫu số 01 Nghị định 20/2021/NĐ-CP & Luật BHXH 2024)
      const ageInfo = computeAgeYearsAndMonths(data.dateOfBirth);
      const hasSevereDisability =
        extra.disabilityLevel === 'SEVERE' || extra.disabilityLevel === 'EXTREMELY_SEVERE';
      const isPoorOrNearPoor =
        extra.householdStatus === 'POOR' || extra.householdStatus === 'NEAR_POOR';
      const eligible = Boolean(
        (ageInfo && ageInfo.years >= 75) ||
          hasSevereDisability ||
          (ageInfo && ageInfo.years >= 70 && isPoorOrNearPoor) ||
          (ageInfo && ageInfo.years >= 80)
      );
      fieldValidations.push({
        fieldName: 'Điều kiện Mốc tuổi (≥ 75 tuổi hoặc ≥ 70 tuổi hộ nghèo theo Luật BHXH 2024 / Khuyết tật nặng)',
        providedValue: `${data.dateOfBirth} (${ageInfo?.years ?? 0} tuổi) | ${
          hasSevereDisability
            ? 'Khuyết tật nặng/đặc biệt nặng'
            : isPoorOrNearPoor
            ? 'Hộ nghèo/cận nghèo'
            : 'Không khuyết tật'
        }`,
        valid: eligible,
        errorCode: eligible ? undefined : 'INELIGIBLE_SOCIAL_PROTECTION_AGE',
        errorMessage: eligible
          ? undefined
          : `CHƯA ĐỦ ĐIỀU KIỆN MỐC TUỔI (Luật BHXH 2024 & Nghị định 20/2021/NĐ-CP): Người cao tuổi không có lương hưu phải từ đủ 75 tuổi trở lên (hoặc từ đủ 70 tuổi nếu thuộc hộ nghèo/cận nghèo) hoặc có Giấy xác nhận khuyết tật nặng/đặc biệt nặng. Hiện tại công dân ${
              ageInfo?.years ?? 0
            } tuổi.`,
        confidenceScore: eligible ? 0.99 : 0.3,
      });

      const cccdValid = /^\d{12}$/.test(data.citizenCccd.trim());
      fieldValidations.push({
        fieldName: 'Số định danh cá nhân (12 số CCCD người hưởng)',
        providedValue: data.citizenCccd,
        valid: cccdValid,
        errorCode: cccdValid ? undefined : 'INVALID_CCCD_FORMAT',
        errorMessage: cccdValid ? undefined : 'Số CCCD của người hưởng trợ cấp phải đủ 12 chữ số.',
        confidenceScore: cccdValid ? 0.98 : 0.45,
      });

      const bankAccount = (extra.bankAccount || '').trim();
      const bankValid = bankAccount.length >= 8;
      fieldValidations.push({
        fieldName: 'Tài khoản ngân hàng nhận trợ cấp an sinh (Đề án 06)',
        providedValue: bankAccount || '(Chưa điền số tài khoản)',
        valid: bankValid,
        errorCode: bankValid ? undefined : 'MISSING_BANK_ACCOUNT',
        errorMessage: bankValid
          ? undefined
          : 'Vui lòng ghi rõ Số tài khoản ngân hàng chính chủ (hoặc người giám hộ) để nhận chi trả trợ cấp an sinh không dùng tiền mặt theo Đề án 06.',
        confidenceScore: bankValid ? 0.97 : 0.5,
      });

      warnings.push(
        'Lưu ý Mẫu số 03 (Hỗ trợ chi phí mai táng): Người đứng tên tờ khai phải là người trực tiếp lo mai táng và đính kèm bản sao Trích lục khai tử.'
      );
    } else {
      // Mặc định: Mẫu CT01 — Tờ khai thay đổi thông tin cư trú (Thông tư 66/2023/TT-BCA)
      const nameValid = data.fullName.trim().length >= 4 && data.fullName.trim().includes(' ');
      fieldValidations.push({
        fieldName: 'Họ và tên (Mục 1 Mẫu CT01)',
        providedValue: data.fullName,
        valid: nameValid,
        errorCode: nameValid ? undefined : 'INVALID_FULL_NAME',
        errorMessage: nameValid ? undefined : 'Họ và tên công dân phải bao gồm đầy đủ họ, chữ đệm và tên theo giấy khai sinh.',
        confidenceScore: nameValid ? 0.99 : 0.65,
      });

      const cccdClean = data.citizenCccd.trim();
      const cccdPattern = /^\d{12}$/;
      let cccdValid = cccdPattern.test(cccdClean);
      let cccdError: string | undefined;

      if (!cccdValid) {
        if (cccdClean.length > 0 && cccdClean.length < 12) {
          cccdError = `Số ĐDCN mới có ${cccdClean.length}/12 chữ số theo quy định Mẫu CT01.`;
        } else {
          cccdError = 'Số định danh cá nhân / CCCD phải bao gồm đúng 12 chữ số theo quy định của Bộ Công an.';
        }
      } else {
        const provinceCode = cccdClean.substring(0, 3);
        if (provinceCode === '000') {
          cccdValid = false;
          cccdError = 'Mã tỉnh/thành phố (3 số đầu: ' + provinceCode + ') không hợp lệ.';
        }
      }

      fieldValidations.push({
        fieldName: 'Số định danh cá nhân / CCCD 12 số (Mục 4)',
        providedValue: data.citizenCccd,
        valid: cccdValid,
        errorCode: cccdValid ? undefined : 'INVALID_CCCD_FORMAT',
        errorMessage: cccdError,
        confidenceScore: cccdValid ? 0.987 : 0.45,
      });

      const dobValid = Boolean(data.dateOfBirth);
      fieldValidations.push({
        fieldName: 'Ngày tháng năm sinh (Mục 2 Mẫu CT01)',
        providedValue: data.dateOfBirth,
        valid: dobValid,
        errorCode: dobValid ? undefined : 'MISSING_DOB',
        errorMessage: dobValid ? undefined : 'Ngày sinh là trường bắt buộc theo Mục 2 Mẫu CT01.',
        confidenceScore: dobValid ? 0.96 : 0.4,
      });

      if (data.gender) {
        const genderValid = ['Nam', 'Nữ', 'nam', 'nữ'].includes(data.gender.trim());
        fieldValidations.push({
          fieldName: 'Giới tính (Mục 3 Mẫu CT01)',
          providedValue: data.gender,
          valid: genderValid,
          confidenceScore: 0.98,
        });
      }

      const addressValid = data.address.trim().length >= 8;
      fieldValidations.push({
        fieldName: 'Nơi đề nghị cư trú (Mục 10)',
        providedValue: data.address,
        valid: addressValid,
        errorCode: addressValid ? undefined : 'INSUFFICIENT_ADDRESS',
        errorMessage: addressValid ? undefined : 'Địa chỉ cư trú đề nghị phải ghi rõ số nhà, tên đường hoặc thôn/ấp, xã/phường.',
        confidenceScore: addressValid ? 0.94 : 0.55,
      });

      const phone = (extra.phoneNumber || extra.phone || '').trim();
      if (phone) {
        const phoneValid = /^(0|\+84)(3|5|7|8|9|2)\d{8,9}$/.test(phone);
        fieldValidations.push({
          fieldName: 'Số điện thoại liên hệ (Mục 5 Mẫu CT01 - Thông tư 66/2023/TT-BCA)',
          providedValue: phone,
          valid: phoneValid,
          errorCode: phoneValid ? undefined : 'INVALID_PHONE_NUMBER',
          errorMessage: phoneValid ? undefined : 'Số điện thoại liên hệ phải là số điện thoại di động Việt Nam hợp lệ (10 số).',
          confidenceScore: phoneValid ? 0.98 : 0.4,
        });
      }

      warnings.push(
        'Lưu ý Mẫu CT01 (Thông tư 66/2023/TT-BCA): Nếu đăng ký thường trú/tạm trú tại nhà thuê, mượn, ở nhờ phải có chữ ký đồng ý của chủ hộ và chủ sở hữu chỗ ở hợp pháp tại Mục 11, 12.'
      );
    }

    const overallValid = false; // Strict P3 (7.2): Offline mode never self-certifies valid

    const fallbackResponse: FormPrecheckResponse = {
      submissionId: 'DRAFT_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      procedureCode: data.procedureCode || 'TTHC-CT-01',
      overallValid,
      fieldValidations,
      warnings: [
        '[MẤT KẾT NỐI MÁY CHỦ] Không thể kết nối máy chủ UBND xã/phường. Hệ thống đã kiểm tra cục bộ bằng bộ quy tắc Zod; hồ sơ CHƯA ĐƯỢC MÁY CHỦ XÁC THỰC.',
        'Vui lòng kiểm tra kết nối Internet và thử lại để máy chủ xác thực trước khi nộp chính thức.',
        ...warnings,
      ],
      processedAt: new Date().toISOString(),
      processingTimeMs: 0,
    };
    return fallbackResponse;
  }
};

export const getRecentFormSubmissions = async (): Promise<any[]> => {
  try {
    const resp = await api.get<any>('/forms/submissions');
    return resp.data?.data ?? resp.data ?? [];
  } catch {
    return [];
  }
};
