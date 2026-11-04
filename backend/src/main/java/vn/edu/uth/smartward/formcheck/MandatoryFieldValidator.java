package vn.edu.uth.smartward.formcheck;

import org.springframework.stereotype.Component;
import vn.edu.uth.smartward.formcheck.dto.ExtractedFormFields;
import vn.edu.uth.smartward.formcheck.dto.FormValidationIssue;

import java.util.ArrayList;
import java.util.List;

/**
 * Validates mandatory fields across administrative declaration forms (e.g. Mẫu CT01).
 */
@Component
public class MandatoryFieldValidator {

    public List<FormValidationIssue> validate(ExtractedFormFields fields) {
        List<FormValidationIssue> issues = new ArrayList<>();
        if (fields == null) {
            issues.add(FormValidationIssue.builder()
                    .field("form")
                    .errorType("MISSING_MANDATORY_FIELD")
                    .message("Không tìm thấy dữ liệu trường thông tin trên biểu mẫu")
                    .severity("ERROR")
                    .build());
            return issues;
        }

        checkField(issues, "fullName", fields.getFullName(), "Họ và tên là trường bắt buộc không được để trống");
        checkField(issues, "birthDate", fields.getBirthDate(), "Ngày tháng năm sinh là trường bắt buộc không được để trống");
        checkField(issues, "gender", fields.getGender(), "Giới tính là trường bắt buộc không được để trống");
        checkField(issues, "cccdNumber", fields.getCccdNumber(), "Số Căn cước công dân là trường bắt buộc không được để trống");
        checkField(issues, "permanentAddress", fields.getPermanentAddress(), "Nơi thường trú là trường bắt buộc không được để trống");

        return issues;
    }

    private void checkField(List<FormValidationIssue> issues, String fieldName, String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            issues.add(FormValidationIssue.builder()
                    .field(fieldName)
                    .errorType("MISSING_MANDATORY_FIELD")
                    .message(message)
                    .severity("ERROR")
                    .build());
        }
    }
}
