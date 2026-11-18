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
public class SocialProtectionPrecheckStrategy implements FormPrecheckStrategy {

    private final CccdValidator cccdValidator;

    public SocialProtectionPrecheckStrategy() {
        this(new CccdValidator());
    }

    public SocialProtectionPrecheckStrategy(CccdValidator cccdValidator) {
        this.cccdValidator = cccdValidator != null ? cccdValidator : new CccdValidator();
    }

    @Override
    public boolean supports(String formType) {
        return "TK-BTXH".equalsIgnoreCase(formType);
    }

    @Override
    public void validate(
            StructuredFormPrecheckRequest req,
            Map<String, String> data,
            List<FieldValidationItem> validations,
            List<String> warnings) {

        LocalDate today = LocalDate.now();
        LocalDate dob = parseFlexibleDate(req.getDateOfBirth());
        String disabilityLevel = safeTrim(data.get("disabilityLevel"));
        boolean hasSevereDisability = "SEVERE".equalsIgnoreCase(disabilityLevel) || "EXTREMELY_SEVERE".equalsIgnoreCase(disabilityLevel);
        String householdStatus = safeTrim(data.get("householdStatus"));
        boolean isPoorOrNearPoor = "POOR".equalsIgnoreCase(householdStatus) || "NEAR_POOR".equalsIgnoreCase(householdStatus);

        boolean ageOrDisabilityValid = false;
        String eligibilityMsg = null;
        String ageDisplay = safeTrim(req.getDateOfBirth());
        if (dob != null) {
            int years = Period.between(dob, today).getYears();
            ageDisplay = String.format("%s (%d tuổi)", req.getDateOfBirth(), years);
            // Cập nhật chuẩn Luật Bảo hiểm xã hội 2024 (số 41/2024/QH15) & Nghị định 20/2021/NĐ-CP:
            // Người cao tuổi không có lương hưu từ đủ 75 tuổi trở lên (hoặc từ đủ 70 tuổi đối với hộ nghèo, cận nghèo)
            // hoặc có xác nhận khuyết tật nặng/đặc biệt nặng.
            if (years >= 75 || hasSevereDisability || (years >= 70 && isPoorOrNearPoor)) {
                ageOrDisabilityValid = true;
            } else {
                eligibilityMsg = String.format(
                        "CHƯA ĐỦ ĐIỀU KIỆN MỐC TUỔI (Luật BHXH 2024 & Nghị định 20/2021/NĐ-CP): Người cao tuổi không có lương hưu phải từ đủ 75 tuổi trở lên (hoặc từ đủ 70 tuổi nếu thuộc hộ nghèo/cận nghèo) hoặc có Giấy xác nhận khuyết tật nặng/đặc biệt nặng. Hiện tại công dân %d tuổi.",
                        years);
            }
        } else {
            eligibilityMsg = "Ngày tháng năm sinh của người đề nghị trợ cấp không hợp lệ.";
        }

        validations.add(FieldValidationItem.builder()
                .fieldName("Điều kiện Mốc tuổi (≥ 75 tuổi hoặc ≥ 70 tuổi hộ nghèo theo Luật BHXH 2024 / Khuyết tật nặng)")
                .providedValue(ageDisplay + (hasSevereDisability ? " | Khuyết tật nặng/đặc biệt nặng" : isPoorOrNearPoor ? " | Hộ nghèo/cận nghèo" : " | Không khuyết tật"))
                .valid(ageOrDisabilityValid)
                .errorCode(ageOrDisabilityValid ? null : "INELIGIBLE_SOCIAL_PROTECTION_AGE")
                .errorMessage(eligibilityMsg)
                .confidenceScore(ageOrDisabilityValid ? 0.99 : 0.30)
                .build());

        String cccd = safeTrim(req.getCitizenCccd());
        boolean cccdValid = cccd.matches("^\\d{12}$");
        validations.add(FieldValidationItem.builder()
                .fieldName("Số định danh cá nhân (12 số CCCD người hưởng)")
                .providedValue(cccd)
                .valid(cccdValid)
                .errorCode(cccdValid ? null : "INVALID_CCCD_FORMAT")
                .errorMessage(cccdValid ? null : "Số CCCD của người hưởng trợ cấp phải đủ 12 chữ số.")
                .confidenceScore(cccdValid ? 0.98 : 0.45)
                .build());

        String bankAccount = safeTrim(data.get("bankAccount"));
        boolean bankValid = bankAccount.length() >= 8;
        validations.add(FieldValidationItem.builder()
                .fieldName("Tài khoản ngân hàng nhận trợ cấp an sinh (Đề án 06)")
                .providedValue(bankAccount.isEmpty() ? "(Chưa điền số tài khoản)" : bankAccount)
                .valid(bankValid)
                .errorCode(bankValid ? null : "MISSING_BANK_ACCOUNT")
                .errorMessage(bankValid ? null : "Vui lòng ghi rõ Số tài khoản ngân hàng và Tên ngân hàng chính chủ (hoặc người giám hộ) để chi trả trợ cấp không dùng tiền mặt theo Đề án 06.")
                .confidenceScore(bankValid ? 0.97 : 0.50)
                .build());

        // Kiểm tra Hộ nghèo / cận nghèo
        if (isPoorOrNearPoor) {
            String poorBook = req.getFieldValue(req.getPoorHouseholdBookNumber(), "poorHouseholdBookNumber");
            boolean poorBookValid = !poorBook.isBlank();
            validations.add(FieldValidationItem.builder()
                    .fieldName("Số sổ hộ nghèo / cận nghèo (UBND cấp xã cấp)")
                    .providedValue(poorBook.isEmpty() ? "(Để trống)" : poorBook)
                    .valid(poorBookValid)
                    .errorCode(poorBookValid ? null : "MISSING_POOR_HOUSEHOLD_NUMBER")
                    .errorMessage(poorBookValid ? null : "Hộ nghèo / cận nghèo bắt buộc phải kê khai Số sổ hộ nghèo hoặc Giấy chứng nhận hộ nghèo do UBND cấp xã cấp.")
                    .confidenceScore(poorBookValid ? 0.99 : 0.35)
                    .build());
        }

        // Kiểm tra Người khuyết tật nặng / đặc biệt nặng
        if (hasSevereDisability) {
            String certNum = req.getFieldValue(req.getDisabilityCertNumber(), "disabilityCertNumber");
            boolean certNumValid = !certNum.isBlank();
            validations.add(FieldValidationItem.builder()
                    .fieldName("Số Giấy xác nhận mức độ khuyết tật")
                    .providedValue(certNum.isEmpty() ? "(Để trống)" : certNum)
                    .valid(certNumValid)
                    .errorCode(certNumValid ? null : "MISSING_DISABILITY_CERT_NUMBER")
                    .errorMessage(certNumValid ? null : "Người khuyết tật nặng / đặc biệt nặng bắt buộc phải kê khai Số Giấy xác nhận mức độ khuyết tật.")
                    .confidenceScore(certNumValid ? 0.99 : 0.35)
                    .build());

            String certDateStr = req.getFieldValue(req.getDisabilityCertIssueDate(), "disabilityCertIssueDate");
            LocalDate certDate = parseFlexibleDate(certDateStr);
            boolean certDateValid = certDate != null && !certDate.isAfter(LocalDate.now());
            validations.add(FieldValidationItem.builder()
                    .fieldName("Ngày cấp Giấy xác nhận khuyết tật")
                    .providedValue(certDateStr.isEmpty() ? "(Để trống)" : certDateStr)
                    .valid(certDateValid)
                    .errorCode(certDateValid ? null : "MISSING_DISABILITY_CERT_DATE")
                    .errorMessage(certDateValid ? null : "Ngày cấp Giấy xác nhận mức độ khuyết tật phải đúng định dạng và không ở tương lai.")
                    .confidenceScore(certDateValid ? 0.98 : 0.35)
                    .build());

            String certIssuer = req.getFieldValue(req.getDisabilityCertIssuer(), "disabilityCertIssuer");
            boolean certIssuerValid = !certIssuer.isBlank();
            validations.add(FieldValidationItem.builder()
                    .fieldName("Cơ quan cấp Giấy xác nhận khuyết tật")
                    .providedValue(certIssuer.isEmpty() ? "(Để trống)" : certIssuer)
                    .valid(certIssuerValid)
                    .errorCode(certIssuerValid ? null : "MISSING_DISABILITY_CERT_ISSUER")
                    .errorMessage(certIssuerValid ? null : "Cơ quan cấp Giấy xác nhận mức độ khuyết tật (Chủ tịch UBND cấp xã) không được để trống.")
                    .confidenceScore(certIssuerValid ? 0.98 : 0.35)
                    .build());
        }

        // Cụm thông tin người giám hộ (nếu có kê khai hoặc đối tượng là khuyết tật đặc biệt nặng)
        String guardianName = req.getFieldValue(req.getGuardianName(), "guardianName");
        String guardianCccd = req.getFieldValue(req.getGuardianCccd(), "guardianCccd");
        String guardianRelation = req.getFieldValue(req.getGuardianRelation(), "guardianRelation");
        String guardianPhone = req.getFieldValue(req.getGuardianPhone(), "guardianPhone");

        boolean hasGuardianDeclared = !guardianName.isEmpty() || !guardianCccd.isEmpty() || "EXTREMELY_SEVERE".equalsIgnoreCase(disabilityLevel);
        if (hasGuardianDeclared) {
            boolean gNameValid = guardianName.length() >= 4 && guardianName.contains(" ");
            validations.add(FieldValidationItem.builder()
                    .fieldName("Họ và tên người giám hộ / chăm sóc")
                    .providedValue(guardianName.isEmpty() ? "(Để trống)" : guardianName)
                    .valid(gNameValid)
                    .errorCode(gNameValid ? null : "MISSING_GUARDIAN_NAME")
                    .errorMessage(gNameValid ? null : "Họ và tên người giám hộ phải ghi đầy đủ họ và tên hợp lệ.")
                    .confidenceScore(gNameValid ? 0.99 : 0.40)
                    .build());

            List<FormValidationIssue> gCccdIssues = cccdValidator.validate(guardianCccd, null, null);
            boolean gCccdValid = !guardianCccd.isEmpty() && gCccdIssues.isEmpty();
            validations.add(FieldValidationItem.builder()
                    .fieldName("Số định danh cá nhân / CCCD người giám hộ")
                    .providedValue(guardianCccd.isEmpty() ? "(Để trống)" : guardianCccd)
                    .valid(gCccdValid)
                    .errorCode(gCccdValid ? null : "INVALID_GUARDIAN_CCCD")
                    .errorMessage(gCccdValid ? null : "Số CCCD người giám hộ phải đủ 12 chữ số hợp lệ.")
                    .confidenceScore(gCccdValid ? 0.99 : 0.35)
                    .build());

            boolean gRelValid = !guardianRelation.isBlank();
            validations.add(FieldValidationItem.builder()
                    .fieldName("Quan hệ của người giám hộ với người hưởng")
                    .providedValue(guardianRelation.isEmpty() ? "(Để trống)" : guardianRelation)
                    .valid(gRelValid)
                    .errorCode(gRelValid ? null : "MISSING_GUARDIAN_RELATION")
                    .errorMessage(gRelValid ? null : "Quan hệ của người giám hộ không được để trống.")
                    .confidenceScore(gRelValid ? 0.99 : 0.40)
                    .build());

            if (!guardianPhone.isEmpty()) {
                boolean gPhoneValid = guardianPhone.matches("^(0|\\+84)(3|5|7|8|9|2)\\d{8,9}$");
                validations.add(FieldValidationItem.builder()
                        .fieldName("Số điện thoại người giám hộ")
                        .providedValue(guardianPhone)
                        .valid(gPhoneValid)
                        .errorCode(gPhoneValid ? null : "INVALID_GUARDIAN_PHONE")
                        .errorMessage(gPhoneValid ? null : "Số điện thoại người giám hộ phải là số di động Việt Nam hợp lệ (10 số).")
                        .confidenceScore(gPhoneValid ? 0.98 : 0.40)
                        .build());
            }
        }

        warnings.add("Lưu ý Mẫu số 03 (Hỗ trợ chi phí mai táng): Người đứng tên tờ khai phải là người trực tiếp lo mai táng và đính kèm bản sao Trích lục khai tử.");
    }
}
