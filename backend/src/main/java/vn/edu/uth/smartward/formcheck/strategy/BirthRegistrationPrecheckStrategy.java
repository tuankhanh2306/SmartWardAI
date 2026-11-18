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
public class BirthRegistrationPrecheckStrategy implements FormPrecheckStrategy {

    private final CccdValidator cccdValidator;

    public BirthRegistrationPrecheckStrategy() {
        this(new CccdValidator());
    }

    public BirthRegistrationPrecheckStrategy(CccdValidator cccdValidator) {
        this.cccdValidator = cccdValidator != null ? cccdValidator : new CccdValidator();
    }

    @Override
    public boolean supports(String formType) {
        return "TK-KS".equalsIgnoreCase(formType);
    }

    @Override
    public void validate(
            StructuredFormPrecheckRequest req,
            Map<String, String> data,
            List<FieldValidationItem> validations,
            List<String> warnings) {

        // 1. Child Full Name
        String childName = safeTrim(req.getFullName());
        boolean childNameValid = childName.length() >= 4 && childName.contains(" ");
        validations.add(FieldValidationItem.builder()
                .fieldName("Họ, chữ đệm, tên của trẻ (Tờ khai Khai sinh)")
                .providedValue(childName)
                .valid(childNameValid)
                .errorCode(childNameValid ? null : "INVALID_CHILD_NAME")
                .errorMessage(childNameValid ? null : "Họ tên trẻ phải bao gồm đầy đủ họ, chữ đệm và tên bằng chữ tiếng Việt.")
                .confidenceScore(childNameValid ? 0.99 : 0.50)
                .build());

        // 2. Cross-check Child Date of Birth vs Hospital Birth Certificate (Giấy chứng sinh)
        LocalDate declaredDob = parseFlexibleDate(req.getDateOfBirth());
        LocalDate hospitalDob = parseFlexibleDate(data.get("hospitalBirthDate"));
        boolean dobCrossCheckValid = declaredDob != null && (hospitalDob == null || declaredDob.equals(hospitalDob));
        String dobError = null;
        if (declaredDob == null) {
            dobError = "Ngày sinh của trẻ trên tờ khai không hợp lệ.";
        } else if (hospitalDob != null && !declaredDob.equals(hospitalDob)) {
            dobError = String.format(
                    "LỆCH GIẤY CHỨNG SINH: Ngày sinh trên Tờ khai (%s) không khớp với Ngày sinh trên Giấy chứng sinh của bệnh viện (%s). Cán bộ Tư pháp sẽ từ chối hồ sơ nếu lệch ngày sinh!",
                    req.getDateOfBirth(), data.get("hospitalBirthDate"));
        }
        validations.add(FieldValidationItem.builder()
                .fieldName("Đối chiếu chéo Ngày sinh (Tờ khai vs Giấy chứng sinh)")
                .providedValue(safeTrim(req.getDateOfBirth()) + (hospitalDob != null ? " | GCS: " + data.get("hospitalBirthDate") : ""))
                .valid(dobCrossCheckValid)
                .errorCode(dobCrossCheckValid ? null : "BIRTH_CERT_DATE_MISMATCH")
                .errorMessage(dobError)
                .confidenceScore(dobCrossCheckValid ? 0.99 : 0.30)
                .build());

        // 3. Cross-check Mother Name (Tờ khai vs Giấy chứng sinh)
        String motherName = safeTrim(data.get("motherName"));
        String hospitalMotherName = safeTrim(data.get("hospitalMotherName"));
        boolean motherValid = motherName.length() >= 4
                && (hospitalMotherName.isEmpty() || motherName.equalsIgnoreCase(hospitalMotherName));
        String motherErr = null;
        if (motherName.length() < 4) {
            motherErr = "Họ tên người mẹ là thông tin bắt buộc trên Tờ khai khai sinh và Giấy chứng sinh.";
        } else if (!hospitalMotherName.isEmpty() && !motherName.equalsIgnoreCase(hospitalMotherName)) {
            motherErr = String.format(
                    "LỆCH GIẤY CHỨNG SINH: Họ tên mẹ trên Tờ khai ('%s') khác với Họ tên sản phụ trên Giấy chứng sinh ('%s').",
                    motherName, hospitalMotherName);
        }
        validations.add(FieldValidationItem.builder()
                .fieldName("Đối chiếu Họ tên Mẹ (Tờ khai vs Giấy chứng sinh)")
                .providedValue(motherName + (!hospitalMotherName.isEmpty() ? " | GCS: " + hospitalMotherName : ""))
                .valid(motherValid)
                .errorCode(motherValid ? null : "BIRTH_CERT_MOTHER_MISMATCH")
                .errorMessage(motherErr)
                .confidenceScore(motherValid ? 0.98 : 0.35)
                .build());

        // 4. Parent 12-digit CCCD Check
        String parentCccd = safeTrim(req.getCitizenCccd());
        boolean cccdValid = parentCccd.matches("^\\d{12}$");
        validations.add(FieldValidationItem.builder()
                .fieldName("Số định danh cá nhân (12 số CCCD) của Cha/Mẹ")
                .providedValue(parentCccd)
                .valid(cccdValid)
                .errorCode(cccdValid ? null : "INVALID_PARENT_CCCD")
                .errorMessage(cccdValid ? null : "Số định danh cá nhân của cha/mẹ phải gồm đúng 12 chữ số theo quy định.")
                .confidenceScore(cccdValid ? 0.98 : 0.45)
                .build());

        // 5. Parents Marital Status vs Father Name Declaration
        String fatherName = req.getFieldValue(null, "fatherName");
        String parentsMarried = req.getFieldValue(null, "parentsMarried");
        String combinedPaternity = req.getFieldValue(null, "combinedPaternityProcedure");
        boolean paternityRuleValid = true;
        String paternityErr = null;
        if ("NO".equalsIgnoreCase(parentsMarried) && !fatherName.isEmpty() && !"true".equalsIgnoreCase(combinedPaternity)) {
            paternityRuleValid = false;
            paternityErr = "Cha mẹ CHƯA đăng ký kết hôn nhưng ghi tên Cha ('" + fatherName + "') vào tờ khai khai sinh thường: " +
                    "Bắt buộc phải làm thủ tục kết hợp 'Đăng ký khai sinh và Nhận cha, mẹ, con' (Thông tư 04/2020/TT-BTP).";
        }
        validations.add(FieldValidationItem.builder()
                .fieldName("Quy tắc Pháp lý Cha Mẹ & Tình trạng hôn nhân")
                .providedValue("NO".equalsIgnoreCase(parentsMarried) ? ("Chưa kết hôn (Tên cha: " + (fatherName.isEmpty() ? "Để trống" : fatherName) + ("true".equalsIgnoreCase(combinedPaternity) ? " - Thủ tục kết hợp)" : ")")) : "Đã có Giấy chứng nhận kết hôn")
                .valid(paternityRuleValid)
                .errorCode(paternityRuleValid ? null : "UNMARRIED_PARENTS_PATERNITY_REQUIRED")
                .errorMessage(paternityErr)
                .confidenceScore(paternityRuleValid ? 0.99 : 0.30)
                .build());

        // 6. Child Ethnicity & Nationality (Thông tư 04/2020/TT-BTP)
        String childEthnicity = req.getFieldValue(req.getChildEthnicity(), "childEthnicity");
        boolean childEthnicityValid = !childEthnicity.isBlank();
        validations.add(FieldValidationItem.builder()
                .fieldName("Dân tộc của trẻ (Thông tư 04/2020/TT-BTP)")
                .providedValue(childEthnicity.isEmpty() ? "(Để trống)" : childEthnicity)
                .valid(childEthnicityValid)
                .errorCode(childEthnicityValid ? null : "MISSING_CHILD_ETHNICITY")
                .errorMessage(childEthnicityValid ? null : "Dân tộc của trẻ em là trường thông tin bắt buộc theo Thông tư 04/2020/TT-BTP.")
                .confidenceScore(childEthnicityValid ? 0.99 : 0.40)
                .build());

        String childNationality = req.getFieldValue(req.getChildNationality(), "childNationality");
        boolean childNationalityValid = !childNationality.isBlank();
        validations.add(FieldValidationItem.builder()
                .fieldName("Quốc tịch của trẻ (Thông tư 04/2020/TT-BTP)")
                .providedValue(childNationality.isEmpty() ? "(Để trống)" : childNationality)
                .valid(childNationalityValid)
                .errorCode(childNationalityValid ? null : "MISSING_CHILD_NATIONALITY")
                .errorMessage(childNationalityValid ? null : "Quốc tịch của trẻ em là trường thông tin bắt buộc theo Thông tư 04/2020/TT-BTP.")
                .confidenceScore(childNationalityValid ? 0.99 : 0.40)
                .build());

        // 7. Child Birth Place
        String childBirthPlace = req.getFieldValue(req.getChildBirthPlace(), "childBirthPlace");
        boolean childBirthPlaceValid = childBirthPlace.length() >= 6;
        validations.add(FieldValidationItem.builder()
                .fieldName("Nơi sinh của trẻ (Cơ sở y tế / Nơi sinh thực tế)")
                .providedValue(childBirthPlace.isEmpty() ? "(Để trống)" : childBirthPlace)
                .valid(childBirthPlaceValid)
                .errorCode(childBirthPlaceValid ? null : "MISSING_CHILD_BIRTH_PLACE")
                .errorMessage(childBirthPlaceValid ? null : "Nơi sinh của trẻ phải ghi rõ tên cơ sở y tế hoặc địa danh hành chính cấp xã, huyện, tỉnh nơi sinh.")
                .confidenceScore(childBirthPlaceValid ? 0.99 : 0.35)
                .build());

        // 8. Birth Certificate Number & Issue Date
        String birthCertNumber = req.getFieldValue(req.getBirthCertNumber(), "birthCertNumber");
        boolean birthCertNumberValid = !birthCertNumber.isBlank();
        validations.add(FieldValidationItem.builder()
                .fieldName("Số Giấy chứng sinh")
                .providedValue(birthCertNumber.isEmpty() ? "(Để trống)" : birthCertNumber)
                .valid(birthCertNumberValid)
                .errorCode(birthCertNumberValid ? null : "MISSING_BIRTH_CERT_NUMBER")
                .errorMessage(birthCertNumberValid ? null : "Số Giấy chứng sinh là thông tin bắt buộc để đối chiếu dữ liệu hộ tịch điện tử.")
                .confidenceScore(birthCertNumberValid ? 0.99 : 0.40)
                .build());

        String birthCertIssueDateStr = req.getFieldValue(req.getBirthCertIssueDate(), "birthCertIssueDate");
        LocalDate birthCertIssueDate = parseFlexibleDate(birthCertIssueDateStr);
        boolean birthCertIssueDateValid = birthCertIssueDate != null && !birthCertIssueDate.isAfter(LocalDate.now());
        validations.add(FieldValidationItem.builder()
                .fieldName("Ngày cấp Giấy chứng sinh")
                .providedValue(birthCertIssueDateStr.isEmpty() ? "(Để trống)" : birthCertIssueDateStr)
                .valid(birthCertIssueDateValid)
                .errorCode(birthCertIssueDateValid ? null : "INVALID_BIRTH_CERT_ISSUE_DATE")
                .errorMessage(birthCertIssueDateValid ? null : "Ngày cấp Giấy chứng sinh phải đúng định dạng và không được ở tương lai.")
                .confidenceScore(birthCertIssueDateValid ? 0.98 : 0.35)
                .build());

        // 9. Mother Residence
        String motherResidence = req.getFieldValue(req.getMotherResidence(), "motherResidence");
        boolean motherResidenceValid = motherResidence.length() >= 8;
        validations.add(FieldValidationItem.builder()
                .fieldName("Nơi cư trú của người mẹ")
                .providedValue(motherResidence.isEmpty() ? "(Để trống)" : motherResidence)
                .valid(motherResidenceValid)
                .errorCode(motherResidenceValid ? null : "MISSING_MOTHER_RESIDENCE")
                .errorMessage(motherResidenceValid ? null : "Nơi cư trú của người mẹ phải ghi rõ địa chỉ thường trú hoặc tạm trú hợp pháp.")
                .confidenceScore(motherResidenceValid ? 0.98 : 0.40)
                .build());

        // 10. Father Residence (if Father declared)
        if (!fatherName.isEmpty()) {
            String fatherResidence = req.getFieldValue(req.getFatherResidence(), "fatherResidence");
            boolean fatherResidenceValid = fatherResidence.length() >= 8;
            validations.add(FieldValidationItem.builder()
                    .fieldName("Nơi cư trú của người cha")
                    .providedValue(fatherResidence.isEmpty() ? "(Để trống)" : fatherResidence)
                    .valid(fatherResidenceValid)
                    .errorCode(fatherResidenceValid ? null : "MISSING_FATHER_RESIDENCE")
                    .errorMessage(fatherResidenceValid ? null : "Nơi cư trú của người cha phải ghi rõ địa chỉ thường trú hoặc tạm trú hợp pháp.")
                    .confidenceScore(fatherResidenceValid ? 0.98 : 0.40)
                    .build());
        }

        // 11. Optional Parent DOB
        String fatherDobStr = req.getFieldValue(req.getFatherDob(), "fatherDob");
        if (!fatherDobStr.isEmpty()) {
            LocalDate fDob = parseFlexibleDate(fatherDobStr);
            boolean fDobValid = fDob != null && !fDob.isAfter(LocalDate.now());
            validations.add(FieldValidationItem.builder()
                    .fieldName("Ngày sinh của người cha")
                    .providedValue(fatherDobStr)
                    .valid(fDobValid)
                    .errorCode(fDobValid ? null : "INVALID_FATHER_DOB")
                    .errorMessage(fDobValid ? null : "Ngày sinh của người cha không hợp lệ hoặc ở tương lai.")
                    .confidenceScore(fDobValid ? 0.98 : 0.40)
                    .build());
        }

        String motherDobStr = req.getFieldValue(req.getMotherDob(), "motherDob");
        if (!motherDobStr.isEmpty()) {
            LocalDate mDob = parseFlexibleDate(motherDobStr);
            boolean mDobValid = mDob != null && !mDob.isAfter(LocalDate.now());
            validations.add(FieldValidationItem.builder()
                    .fieldName("Ngày sinh của người mẹ")
                    .providedValue(motherDobStr)
                    .valid(mDobValid)
                    .errorCode(mDobValid ? null : "INVALID_MOTHER_DOB")
                    .errorMessage(mDobValid ? null : "Ngày sinh của người mẹ không hợp lệ hoặc ở tương lai.")
                    .confidenceScore(mDobValid ? 0.98 : 0.40)
                    .build());
        }

        warnings.add("Lưu ý Thông tư 04/2020/TT-BTP: Phải nộp Bản chính Giấy chứng sinh do cơ sở y tế cấp (không chấp nhận ảnh chụp qua Zalo). Quê quán của trẻ được xác định theo quê quán của cha hoặc mẹ theo thỏa thuận.");
    }
}
