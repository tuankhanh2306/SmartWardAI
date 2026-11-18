package vn.edu.uth.smartward.formcheck.strategy;

import org.springframework.stereotype.Component;
import vn.edu.uth.smartward.formcheck.CccdValidator;
import vn.edu.uth.smartward.formcheck.TextNormalizationUtils;
import vn.edu.uth.smartward.formcheck.dto.FormValidationIssue;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckRequest;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckResponse.FieldValidationItem;

import java.time.LocalDate;
import java.time.Period;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static vn.edu.uth.smartward.formcheck.strategy.FormValidationSupport.parseFlexibleDate;
import static vn.edu.uth.smartward.formcheck.strategy.FormValidationSupport.safeTrim;

@Component
public class MarriageStatusPrecheckStrategy implements FormPrecheckStrategy {

    private final CccdValidator cccdValidator;

    public MarriageStatusPrecheckStrategy() {
        this(new CccdValidator());
    }

    public MarriageStatusPrecheckStrategy(CccdValidator cccdValidator) {
        this.cccdValidator = cccdValidator != null ? cccdValidator : new CccdValidator();
    }

    @Override
    public boolean supports(String formType) {
        return "TK-KH".equalsIgnoreCase(formType);
    }

    @Override
    public void validate(
            StructuredFormPrecheckRequest req,
            Map<String, String> data,
            List<FieldValidationItem> validations,
            List<String> warnings) {

        LocalDate today = LocalDate.now();
        String mode = req.getFieldValue(req.getMarriageMode(), "marriageMode");
        String purpose = req.getFieldValue(null, "maritalCertPurpose");

        boolean isConfirmation = "MARITAL_STATUS_CONFIRMATION".equalsIgnoreCase(mode);
        boolean isMarriageReg = "MARRIAGE_REGISTRATION".equalsIgnoreCase(mode)
                || (!isConfirmation && purpose.isEmpty());

        // 1. Applicant Age Eligibility (Luật Hôn nhân & Gia đình 2014: Nam >= 20, Nữ >= 18)
        String gender = safeTrim(req.getGender());
        boolean isMale = "Nam".equalsIgnoreCase(gender);
        int requiredYears = isMale ? 20 : 18;
        LocalDate dob = parseFlexibleDate(req.getDateOfBirth());
        boolean ageValid = false;
        String ageDisplay = safeTrim(req.getDateOfBirth());
        String ageError = null;

        if (dob == null) {
            ageError = "Vui lòng nhập đầy đủ ngày tháng năm sinh trên CCCD để tính mốc tuổi kết hôn hợp pháp.";
        } else {
            Period age = Period.between(dob, today);
            ageDisplay = String.format("%s (%d tuổi %d tháng - Giới tính: %s)", req.getDateOfBirth(), age.getYears(), age.getMonths(), gender.isEmpty() ? "Nữ" : gender);
            if (age.getYears() >= requiredYears) {
                ageValid = true;
            } else {
                ageError = String.format(
                        "CHƯA ĐỦ TUỔI KẾT HÔN: Theo Điều 8 Luật Hôn nhân & Gia đình 2014, %s phải từ đủ %d tuổi trở lên (tính theo ngày tháng năm sinh). Hiện tại mới %d tuổi %d tháng!",
                        isMale ? "Nam giới" : "Nữ giới", requiredYears, age.getYears(), age.getMonths());
            }
        }
        validations.add(FieldValidationItem.builder()
                .fieldName("Độ tuổi kết hôn hợp pháp (Điều 8 Luật HN&GĐ 2014)")
                .providedValue(ageDisplay)
                .valid(ageValid)
                .errorCode(ageValid ? null : "UNDERAGE_MARRIAGE")
                .errorMessage(ageError)
                .confidenceScore(ageValid ? 0.99 : 0.25)
                .build());

        // 2. Applicant 12-digit CCCD check
        String cccd = safeTrim(req.getCitizenCccd());
        boolean cccdValid = cccd.matches("^\\d{12}$");
        validations.add(FieldValidationItem.builder()
                .fieldName("Số định danh cá nhân (12 số CCCD)")
                .providedValue(cccd)
                .valid(cccdValid)
                .errorCode(cccdValid ? null : "INVALID_CCCD_FORMAT")
                .errorMessage(cccdValid ? null : "Số định danh cá nhân / CCCD phải gồm đúng 12 chữ số.")
                .confidenceScore(cccdValid ? 0.98 : 0.45)
                .build());

        // 3. Marriage Registration Mode Validation (Bên kết hôn thứ hai)
        if (isMarriageReg) {
            String partnerName = req.getFieldValue(req.getPartnerName(), "partnerName");
            boolean partnerNameValid = partnerName.length() >= 4 && partnerName.contains(" ");
            validations.add(FieldValidationItem.builder()
                    .fieldName("Họ và tên bên kết hôn thứ hai")
                    .providedValue(partnerName.isEmpty() ? "(Để trống)" : partnerName)
                    .valid(partnerNameValid)
                    .errorCode(partnerNameValid ? null : "MISSING_PARTNER_NAME")
                    .errorMessage(partnerNameValid ? null : "Họ và tên người phối ngẫu bắt buộc ghi đầy đủ họ, chữ đệm và tên.")
                    .confidenceScore(partnerNameValid ? 0.99 : 0.35)
                    .build());

            String partnerCccd = req.getFieldValue(req.getPartnerCccd(), "partnerCccd");
            List<FormValidationIssue> partnerCccdIssues = cccdValidator.validate(partnerCccd, null, null);
            boolean partnerCccdValid = !partnerCccd.isEmpty() && partnerCccdIssues.isEmpty();
            validations.add(FieldValidationItem.builder()
                    .fieldName("Số CCCD 12 số bên kết hôn thứ hai")
                    .providedValue(partnerCccd.isEmpty() ? "(Để trống)" : partnerCccd)
                    .valid(partnerCccdValid)
                    .errorCode(partnerCccdValid ? null : "INVALID_PARTNER_CCCD")
                    .errorMessage(partnerCccdValid ? null : "Số CCCD người phối ngẫu phải gồm đủ 12 chữ số hợp lệ.")
                    .confidenceScore(partnerCccdValid ? 0.99 : 0.30)
                    .build());

            String partnerDobStr = req.getFieldValue(null, "partnerDob");
            String partnerGender = req.getFieldValue(null, "partnerGender");
            boolean partnerIsMale = !"Nữ".equalsIgnoreCase(partnerGender);
            int partnerReqYears = partnerIsMale ? 20 : 18;
            LocalDate partnerDob = parseFlexibleDate(partnerDobStr);
            boolean partnerAgeValid = false;
            String partnerErr = null;
            String partnerVal = partnerDobStr;
            if (partnerDob != null) {
                Period pAge = Period.between(partnerDob, today);
                partnerVal = String.format("%s (%d tuổi %d tháng - %s)", partnerDobStr, pAge.getYears(), pAge.getMonths(), partnerIsMale ? "Nam" : "Nữ");
                if (pAge.getYears() >= partnerReqYears) {
                    partnerAgeValid = true;
                } else {
                    partnerErr = String.format(
                            "CHƯA ĐỦ TUỔI KẾT HÔN (Bên thứ hai): %s phải từ đủ %d tuổi trở lên (hiện mới %d tuổi %d tháng).",
                            partnerIsMale ? "Nam giới" : "Nữ giới", partnerReqYears, pAge.getYears(), pAge.getMonths());
                }
            } else {
                partnerErr = "Ngày sinh của bên kết hôn thứ hai không đúng định dạng hoặc để trống.";
            }
            validations.add(FieldValidationItem.builder()
                    .fieldName("Độ tuổi Bên kết hôn thứ hai (Nam ≥ 20, Nữ ≥ 18)")
                    .providedValue(partnerVal.isEmpty() ? "(Để trống)" : partnerVal)
                    .valid(partnerAgeValid)
                    .errorCode(partnerAgeValid ? null : "PARTNER_UNDERAGE_MARRIAGE")
                    .errorMessage(partnerErr)
                    .confidenceScore(partnerAgeValid ? 0.99 : 0.25)
                    .build());

            String partnerAddress = req.getFieldValue(req.getPartnerAddress(), "partnerAddress");
            boolean partnerAddressValid = partnerAddress.length() >= 8;
            validations.add(FieldValidationItem.builder()
                    .fieldName("Nơi cư trú bên kết hôn thứ hai")
                    .providedValue(partnerAddress.isEmpty() ? "(Để trống)" : partnerAddress)
                    .valid(partnerAddressValid)
                    .errorCode(partnerAddressValid ? null : "MISSING_PARTNER_ADDRESS")
                    .errorMessage(partnerAddressValid ? null : "Địa chỉ cư trú của người phối ngẫu phải từ 8 ký tự trở lên.")
                    .confidenceScore(partnerAddressValid ? 0.98 : 0.40)
                    .build());

            String applicantEthnicity = req.getFieldValue(req.getApplicantEthnicity(), "applicantEthnicity");
            boolean appEthValid = !applicantEthnicity.isBlank();
            validations.add(FieldValidationItem.builder()
                    .fieldName("Dân tộc người nộp hồ sơ kết hôn")
                    .providedValue(applicantEthnicity.isEmpty() ? "(Để trống)" : applicantEthnicity)
                    .valid(appEthValid)
                    .errorCode(appEthValid ? null : "MISSING_APPLICANT_ETHNICITY")
                    .errorMessage(appEthValid ? null : "Dân tộc của người nộp hồ sơ không được để trống.")
                    .confidenceScore(appEthValid ? 0.99 : 0.40)
                    .build());

            String partnerEthnicity = req.getFieldValue(req.getPartnerEthnicity(), "partnerEthnicity");
            boolean partEthValid = !partnerEthnicity.isBlank();
            validations.add(FieldValidationItem.builder()
                    .fieldName("Dân tộc bên kết hôn thứ hai")
                    .providedValue(partnerEthnicity.isEmpty() ? "(Để trống)" : partnerEthnicity)
                    .valid(partEthValid)
                    .errorCode(partEthValid ? null : "MISSING_PARTNER_ETHNICITY")
                    .errorMessage(partEthValid ? null : "Dân tộc của người phối ngẫu không được để trống.")
                    .confidenceScore(partEthValid ? 0.99 : 0.40)
                    .build());

            String applicantNationality = req.getFieldValue(req.getApplicantNationality(), "applicantNationality");
            boolean appNatValid = !applicantNationality.isBlank();
            validations.add(FieldValidationItem.builder()
                    .fieldName("Quốc tịch người nộp hồ sơ kết hôn")
                    .providedValue(applicantNationality.isEmpty() ? "(Để trống)" : applicantNationality)
                    .valid(appNatValid)
                    .errorCode(appNatValid ? null : "MISSING_APPLICANT_NATIONALITY")
                    .errorMessage(appNatValid ? null : "Quốc tịch của người nộp hồ sơ không được để trống.")
                    .confidenceScore(appNatValid ? 0.99 : 0.40)
                    .build());

            String partnerNationality = req.getFieldValue(req.getPartnerNationality(), "partnerNationality");
            boolean partNatValid = !partnerNationality.isBlank();
            validations.add(FieldValidationItem.builder()
                    .fieldName("Quốc tịch bên kết hôn thứ hai")
                    .providedValue(partnerNationality.isEmpty() ? "(Để trống)" : partnerNationality)
                    .valid(partNatValid)
                    .errorCode(partNatValid ? null : "MISSING_PARTNER_NATIONALITY")
                    .errorMessage(partNatValid ? null : "Quốc tịch của người phối ngẫu không được để trống.")
                    .confidenceScore(partNatValid ? 0.99 : 0.40)
                    .build());

            if (!gender.isEmpty() && !partnerGender.isEmpty() && gender.equalsIgnoreCase(partnerGender)) {
                warnings.add("Lưu ý Luật Hôn nhân & Gia đình 2014: Khoản 2 Điều 8 quy định Nhà nước không thừa nhận hôn nhân giữa những người cùng giới tính.");
            }
        }

        // 4. Single Status Confirmation Mode or explicit purpose check
        if (isConfirmation || !purpose.isEmpty()) {
            String lowerPurpose = purpose.toLowerCase();
            boolean isVague = purpose.length() < 15
                    || lowerPurpose.equals("bổ sung hồ sơ")
                    || lowerPurpose.equals("việc cá nhân")
                    || lowerPurpose.equals("làm giấy tờ")
                    || lowerPurpose.equals("kết hôn");
            validations.add(FieldValidationItem.builder()
                    .fieldName("Mục đích sử dụng Giấy xác nhận tình trạng hôn nhân (TT 04/2020/TT-BTP)")
                    .providedValue(purpose.isEmpty() ? "(Để trống)" : purpose)
                    .valid(!isVague)
                    .errorCode(!isVague ? null : "VAGUE_MARITAL_PURPOSE")
                    .errorMessage(!isVague ? null : "SAI SÓT THƯỜNG GẶP: Không được để trống hoặc ghi chung chung ('bổ sung hồ sơ', 'việc cá nhân'). Bắt buộc ghi rõ: 'Để đăng ký kết hôn với anh/chị [Họ tên] tại UBND...' hoặc 'Để vay vốn ngân hàng / chuyển nhượng quyền sử dụng đất'.")
                    .confidenceScore(!isVague ? 0.98 : 0.35)
                    .build());
        }

        // 5. Historical Marital Status (Áp dụng cho cả 2 chế độ)
        String prevStatus = req.getFieldValue(null, "previousMaritalStatus");
        if ("DIVORCED".equalsIgnoreCase(prevStatus)) {
            String judgmentNum = req.getFieldValue(req.getDivorceJudgmentNumber(), "divorceJudgmentNumber");
            boolean judgmentValid = !judgmentNum.isBlank();
            validations.add(FieldValidationItem.builder()
                    .fieldName("Số Bản án / Quyết định ly hôn của Tòa án")
                    .providedValue(judgmentNum.isEmpty() ? "(Chưa kê khai)" : judgmentNum)
                    .valid(judgmentValid)
                    .errorCode(judgmentValid ? null : "MISSING_DIVORCE_JUDGMENT_NUMBER")
                    .errorMessage(judgmentValid ? null : "Trường hợp đã ly hôn: Bắt buộc phải kê khai Số Bản án/Quyết định ly hôn đã có hiệu lực pháp luật.")
                    .confidenceScore(judgmentValid ? 0.99 : 0.35)
                    .build());

            String judgmentDateStr = req.getFieldValue(req.getDivorceJudgmentDate(), "divorceJudgmentDate");
            LocalDate judgmentDate = parseFlexibleDate(judgmentDateStr);
            boolean dateValid = judgmentDate != null && !judgmentDate.isAfter(LocalDate.now());
            validations.add(FieldValidationItem.builder()
                    .fieldName("Ngày ban hành Bản án / Quyết định ly hôn")
                    .providedValue(judgmentDateStr.isEmpty() ? "(Để trống)" : judgmentDateStr)
                    .valid(dateValid)
                    .errorCode(dateValid ? null : "MISSING_DIVORCE_JUDGMENT_DATE")
                    .errorMessage(dateValid ? null : "Ngày ban hành Bản án/Quyết định ly hôn phải đúng định dạng và không được ở tương lai.")
                    .confidenceScore(dateValid ? 0.98 : 0.35)
                    .build());

            warnings.add("Lưu ý người đã ly hôn: Bắt buộc phải ghi rõ 'Đã ly hôn theo Bản án/Quyết định số... ngày... của Tòa án nhân dân...' và xuất trình bản sao trích lục bản án ly hôn đã có hiệu lực pháp luật.");
        } else if ("WIDOWED".equalsIgnoreCase(prevStatus)) {
            String deathCertNum = req.getFieldValue(req.getDeathCertNumber(), "deathCertNumber");
            boolean deathCertValid = !deathCertNum.isBlank();
            validations.add(FieldValidationItem.builder()
                    .fieldName("Số Giấy chứng tử / Trích lục khai tử của vợ/chồng cũ")
                    .providedValue(deathCertNum.isEmpty() ? "(Chưa kê khai)" : deathCertNum)
                    .valid(deathCertValid)
                    .errorCode(deathCertValid ? null : "MISSING_DEATH_CERT_NUMBER")
                    .errorMessage(deathCertValid ? null : "Trường hợp vợ hoặc chồng đã mất: Bắt buộc phải kê khai Số Giấy chứng tử/Trích lục khai tử.")
                    .confidenceScore(deathCertValid ? 0.99 : 0.35)
                    .build());

            String deathDateStr = req.getFieldValue(req.getDeathCertDate(), "deathCertDate");
            LocalDate deathDate = parseFlexibleDate(deathDateStr);
            boolean deathDateValid = deathDate != null && !deathDate.isAfter(LocalDate.now());
            validations.add(FieldValidationItem.builder()
                    .fieldName("Ngày cấp Giấy chứng tử / Trích lục khai tử")
                    .providedValue(deathDateStr.isEmpty() ? "(Để trống)" : deathDateStr)
                    .valid(deathDateValid)
                    .errorCode(deathDateValid ? null : "MISSING_DEATH_CERT_DATE")
                    .errorMessage(deathDateValid ? null : "Ngày cấp Giấy chứng tử/Trích lục khai tử phải đúng định dạng và không được ở tương lai.")
                    .confidenceScore(deathDateValid ? 0.98 : 0.35)
                    .build());
        }

        warnings.add("Lưu ý cư trú nhiều nơi: Nếu từng đăng ký thường trú tại nhiều xã/phường khác nhau từ khi đủ tuổi kết hôn đến nay, cần có xác nhận tình trạng hôn nhân tại các nơi cư trú trước đó.");
    }
}
