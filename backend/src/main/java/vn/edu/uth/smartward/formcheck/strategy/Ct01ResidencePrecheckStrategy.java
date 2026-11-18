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
public class Ct01ResidencePrecheckStrategy implements FormPrecheckStrategy {

    private final CccdValidator cccdValidator;

    public Ct01ResidencePrecheckStrategy() {
        this(new CccdValidator());
    }

    public Ct01ResidencePrecheckStrategy(CccdValidator cccdValidator) {
        this.cccdValidator = cccdValidator != null ? cccdValidator : new CccdValidator();
    }

    @Override
    public boolean supports(String formType) {
        return "CT01".equalsIgnoreCase(formType) || "CT01_RESIDENCE_DECLARATION".equalsIgnoreCase(formType);
    }

    @Override
    public void validate(
            StructuredFormPrecheckRequest req,
            Map<String, String> data,
            List<FieldValidationItem> validations,
            List<String> warnings) {
        validateForm(req, validations, warnings);
    }

    public void validateForm(
            StructuredFormPrecheckRequest req,
            List<FieldValidationItem> validations,
            List<String> warnings) {

        String fullName = safeTrim(req.getFullName());
        boolean nameValid = fullName.length() >= 4 && fullName.contains(" ");
        validations.add(FieldValidationItem.builder()
                .fieldName("Họ, chữ đệm và tên (Mục 1 Mẫu CT01)")
                .providedValue(fullName)
                .valid(nameValid)
                .errorCode(nameValid ? null : "INVALID_FULL_NAME")
                .errorMessage(nameValid ? null : "Họ và tên công dân phải ghi đầy đủ họ, chữ đệm và tên theo giấy khai sinh.")
                .confidenceScore(nameValid ? 0.99 : 0.65)
                .build());

        String cccd = safeTrim(req.getCitizenCccd());
        List<FormValidationIssue> cccdIssues = cccdValidator.validate(cccd, req.getDateOfBirth(), req.getGender());
        boolean cccdValid = cccdIssues.isEmpty();
        validations.add(FieldValidationItem.builder()
                .fieldName("Số định danh cá nhân / CCCD 12 số (Mục 4)")
                .providedValue(cccd)
                .valid(cccdValid)
                .errorCode(cccdValid ? null : cccdIssues.get(0).getErrorType())
                .errorMessage(cccdValid ? null : cccdIssues.get(0).getMessage())
                .confidenceScore(cccdValid ? 0.99 : 0.45)
                .build());

        LocalDate dob = parseFlexibleDate(req.getDateOfBirth());
        boolean dobValid = dob != null && !dob.isAfter(LocalDate.now());
        validations.add(FieldValidationItem.builder()
                .fieldName("Ngày tháng năm sinh (Mục 2 Mẫu CT01)")
                .providedValue(safeTrim(req.getDateOfBirth()))
                .valid(dobValid)
                .errorCode(dobValid ? null : "INVALID_DOB")
                .errorMessage(dobValid ? null : "Ngày tháng năm sinh bắt buộc nhập đúng định dạng và không được ở tương lai.")
                .confidenceScore(dobValid ? 0.98 : 0.40)
                .build());

        String addr = safeTrim(req.getAddress());
        boolean addrValid = addr.length() >= 8;
        validations.add(FieldValidationItem.builder()
                .fieldName("Nơi đề nghị đăng ký cư trú (Mục 10)")
                .providedValue(addr)
                .valid(addrValid)
                .errorCode(addrValid ? null : "INSUFFICIENT_ADDRESS")
                .errorMessage(addrValid ? null : "Địa chỉ cư trú đề nghị phải ghi rõ số nhà, đường/ấp, xã/phường.")
                .confidenceScore(addrValid ? 0.95 : 0.55)
                .build());

        Map<String, String> data = req.getFormData() != null ? req.getFormData() : Collections.emptyMap();
        String phone = req.getFieldValue(req.getPhoneNumber(), "phoneNumber");
        if (phone.isEmpty()) {
            phone = safeTrim(data.get("phone"));
        }
        if (!phone.isEmpty()) {
            boolean phoneValid = phone.matches("^(0|\\+84)(3|5|7|8|9|2)\\d{8,9}$");
            validations.add(FieldValidationItem.builder()
                    .fieldName("Số điện thoại liên hệ (Mục 5 Mẫu CT01 - Thông tư 66/2023/TT-BCA)")
                    .providedValue(phone)
                    .valid(phoneValid)
                    .errorCode(phoneValid ? null : "INVALID_PHONE_NUMBER")
                    .errorMessage(phoneValid ? null : "Số điện thoại liên hệ phải là số điện thoại di động Việt Nam hợp lệ (10 số).")
                    .confidenceScore(phoneValid ? 0.98 : 0.40)
                    .build());
        }

        // Kiểm tra điều kiện cư trú theo Thông tư 116/2026/TT-BCA (Mẫu CT01 mới) & Nghị định 154/2024/NĐ-CP
        String hostRelation = req.getFieldValue(req.getHostRelation(), "hostRelation");
        String declarationScope = req.getFieldValue(req.getDeclarationScope(), "declarationScope");
        String hostName = req.getFieldValue(req.getHostName(), "hostName");
        String hostCccd = req.getEffectiveHostCccd();

        String lowerRelation = hostRelation.toLowerCase();
        boolean isRentingOrBorrowing = lowerRelation.contains("thuê")
                || lowerRelation.contains("mượn")
                || lowerRelation.contains("ở nhờ");

        boolean hasHostCccd = !hostCccd.isEmpty();

        // Rule Engine TT 116/2026/TT-BCA: Nếu hostCccdNumber được cung cấp
        if (hasHostCccd) {
            String hostDob = req.getFieldValue(req.getHostBirthDate(), "hostBirthDate");
            if (hostDob.isEmpty()) {
                hostDob = req.getFieldValue("", "hostDob");
            }
            if (hostDob.isEmpty()) {
                hostDob = req.getFieldValue("", "hostDateOfBirth");
            }
            String hostGender = req.getFieldValue(req.getHostGender(), "hostGender");

            // 1. Kiểm tra 12 chữ số CCCD chủ hộ qua CccdValidator
            List<FormValidationIssue> hostCccdIssues = cccdValidator.validate(hostCccd, hostDob.isEmpty() ? null : hostDob, hostGender.isEmpty() ? null : hostGender);
            boolean hostCccdValid = hostCccdIssues.isEmpty();
            validations.add(FieldValidationItem.builder()
                    .fieldName("Số định danh cá nhân / CCCD 12 số của chủ hộ (Mục 11 Mẫu CT01)")
                    .providedValue(hostCccd)
                    .valid(hostCccdValid)
                    .errorCode(hostCccdValid ? null : "INVALID_HOST_CCCD")
                    .errorMessage(hostCccdValid ? null : (hostCccdIssues.isEmpty() ? "Số định danh cá nhân / CCCD của chủ hộ không hợp lệ." : hostCccdIssues.get(0).getMessage()))
                    .confidenceScore(hostCccdValid ? 0.99 : 0.30)
                    .build());

            // 2. Kiểm tra độ tuổi chủ hộ >= 18 tuổi
            Integer hostBirthYear = null;
            if (!hostDob.isEmpty()) {
                LocalDate parsedDob = parseFlexibleDate(hostDob);
                if (parsedDob != null) {
                    hostBirthYear = parsedDob.getYear();
                }
            }
            if (hostBirthYear == null && hostCccd.matches("^\\d{12}$")) {
                int centuryDigit = Character.getNumericValue(hostCccd.charAt(3));
                int century = switch (centuryDigit) {
                    case 0, 1 -> 1900;
                    case 2, 3 -> 2000;
                    case 4, 5 -> 2100;
                    case 6, 7 -> 2200;
                    case 8, 9 -> 2300;
                    default -> 1900;
                };
                try {
                    hostBirthYear = century + Integer.parseInt(hostCccd.substring(4, 6));
                } catch (Exception ignored) {}
            }

            if (hostBirthYear != null) {
                int currentYear = LocalDate.now().getYear();
                int hostAge = currentYear - hostBirthYear;
                boolean hostAgeValid = hostAge >= 18;
                validations.add(FieldValidationItem.builder()
                        .fieldName("Độ tuổi của chủ hộ / chủ sở hữu chỗ ở hợp pháp (Mục 11 Mẫu CT01 - Thông tư 116/2026/TT-BCA)")
                        .providedValue(hostAge + " tuổi (năm sinh: " + hostBirthYear + ")")
                        .valid(hostAgeValid)
                        .errorCode(hostAgeValid ? null : "INVALID_HOST_AGE")
                        .errorMessage(hostAgeValid ? null : "Chủ hộ / chủ sở hữu chỗ ở hợp pháp chưa đủ 18 tuổi (yêu cầu từ đủ 18 tuổi trở lên theo Thông tư 116/2026/TT-BCA và Luật Cư trú).")
                        .confidenceScore(hostAgeValid ? 0.99 : 0.40)
                        .build());
            }

            // 3. Nếu vneidHostConfirmed == true: Miễn nộp bản giấy ý kiến chủ hộ
            if (req.isVneidHostConfirmed()) {
                warnings.add("ĐÃ XÁC NHẬN QUA VNEID: Chủ hộ đã xác nhận đồng ý cho đăng ký cư trú trực tiếp trên ứng dụng VNeID theo Thông tư 116/2026/TT-BCA. Miễn nộp văn bản đồng ý bằng giấy có chữ ký của chủ hộ.");
            }
        }

        if (isRentingOrBorrowing) {
            // 1. Kiểm tra Họ tên chủ hộ / chủ sở hữu chỗ ở
            boolean hostNameValid = hostName.length() >= 4 && hostName.contains(" ");
            validations.add(FieldValidationItem.builder()
                    .fieldName("Họ và tên chủ hộ / người cho ở nhờ (Mục 11 Mẫu CT01)")
                    .providedValue(hostName.isEmpty() ? "(Để trống)" : hostName)
                    .valid(hostNameValid)
                    .errorCode(hostNameValid ? null : "MISSING_HOST_NAME")
                    .errorMessage(hostNameValid ? null : "Trường hợp đăng ký cư trú tại chỗ ở thuê, mượn, ở nhờ: Bắt buộc phải kê khai đầy đủ Họ và tên của chủ hộ/chủ sở hữu chỗ ở hợp pháp.")
                    .confidenceScore(hostNameValid ? 0.99 : 0.35)
                    .build());

            // 2. Nếu chưa có hostCccd (để trống)
            if (!hasHostCccd) {
                validations.add(FieldValidationItem.builder()
                        .fieldName("Số định danh cá nhân / CCCD 12 số của chủ hộ (Mục 11)")
                        .providedValue("(Để trống)")
                        .valid(false)
                        .errorCode("INVALID_HOST_CCCD")
                        .errorMessage("Số định danh cá nhân / CCCD của chủ hộ phải đủ 12 chữ số hợp lệ theo quy định của Bộ Công an.")
                        .confidenceScore(0.30)
                        .build());
            }

            // 3. Quan hệ với chủ hộ
            boolean relationValid = !hostRelation.isBlank();
            validations.add(FieldValidationItem.builder()
                    .fieldName("Mối quan hệ với chủ hộ (Mục 12 Mẫu CT01)")
                    .providedValue(hostRelation)
                    .valid(relationValid)
                    .errorCode(relationValid ? null : "MISSING_HOST_RELATION")
                    .errorMessage(relationValid ? null : "Vui lòng chọn rõ mối quan hệ với chủ hộ tại Mục 12 Mẫu CT01.")
                    .confidenceScore(relationValid ? 0.99 : 0.40)
                    .build());

            // 4. Nội dung đề nghị đăng ký cư trú
            boolean scopeValid = !declarationScope.isBlank();
            validations.add(FieldValidationItem.builder()
                    .fieldName("Nội dung đề nghị đăng ký cư trú (Mục 10 Mẫu CT01)")
                    .providedValue(declarationScope)
                    .valid(scopeValid)
                    .errorCode(scopeValid ? null : "MISSING_DECLARATION_SCOPE")
                    .errorMessage(scopeValid ? null : "Nội dung đề nghị đăng ký cư trú (Mục 10 Mẫu CT01) không được để trống.")
                    .confidenceScore(scopeValid ? 0.99 : 0.40)
                    .build());

            if (req.isVneidHostConfirmed()) {
                warnings.add("Lưu ý Mẫu CT01 (Thông tư 116/2026/TT-BCA): Chủ hộ đã xác nhận đồng ý qua ứng dụng VNeID, công dân được miễn nộp văn bản đồng ý bằng giấy.");
            } else {
                warnings.add("Lưu ý Mẫu CT01 (Thông tư 116/2026/TT-BCA): Trường hợp đăng ký thường trú, tạm trú tại chỗ ở thuê, mượn, ở nhờ bắt buộc phải có chữ ký đồng ý của chủ hộ và chủ sở hữu chỗ ở hợp pháp tại Mục 11, Mục 12 và hợp đồng thuê mượn chỗ ở theo Điều 20 Luật Cư trú 2020.");
            }
        } else if (!hasHostCccd) {
            warnings.add("Lưu ý Mẫu CT01 (Thông tư 116/2026/TT-BCA): Nếu đăng ký thường trú/tạm trú tại nhà thuê, mượn, ở nhờ phải có chữ ký đồng ý của chủ hộ và chủ sở hữu chỗ ở hợp pháp tại Mục 11, 12.");
        }
    }
}
