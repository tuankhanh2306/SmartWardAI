package vn.edu.uth.smartward.formcheck;

import org.springframework.stereotype.Component;
import vn.edu.uth.smartward.formcheck.dto.FormValidationIssue;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure Java Deterministic Validator for Administrative Date Logic.
 * Verifies:
 * 1. Valid date formatting (dd/MM/yyyy or yyyy-MM-dd)
 * 2. Temporal sequence: birthDate < issueDate <= today
 * 3. Citizen minimum age of 14 at the date of CCCD issuance (Law on Citizen Identity)
 */
@Component
public class DateLogicValidator {

    private static final DateTimeFormatter FORMAT_DMY = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter FORMAT_YMD = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * Validates birth date and card issue date logic.
     */
    public List<FormValidationIssue> validate(String birthDateStr, String issueDateStr) {
        List<FormValidationIssue> issues = new ArrayList<>();

        LocalDate birthDate = parseDate(birthDateStr);
        LocalDate issueDate = parseDate(issueDateStr);

        if (birthDateStr != null && !birthDateStr.isBlank() && birthDate == null) {
            issues.add(FormValidationIssue.builder()
                    .field("birthDate")
                    .errorType("INVALID_DATE_FORMAT")
                    .message("Ngày sinh không đúng định dạng (yêu cầu ngày/tháng/năm, ví dụ: 15/08/1995)")
                    .severity("ERROR")
                    .build());
        }

        if (issueDateStr != null && !issueDateStr.isBlank() && issueDate == null) {
            issues.add(FormValidationIssue.builder()
                    .field("issueDate")
                    .errorType("INVALID_DATE_FORMAT")
                    .message("Ngày cấp thẻ không đúng định dạng (yêu cầu ngày/tháng/năm, ví dụ: 20/09/2021)")
                    .severity("ERROR")
                    .build());
        }

        if (birthDate == null || issueDate == null) {
            return issues;
        }

        LocalDate today = LocalDate.now();

        // 1. Issue date cannot be in the future
        if (issueDate.isAfter(today)) {
            issues.add(FormValidationIssue.builder()
                    .field("issueDate")
                    .errorType("INVALID_DATE_LOGIC")
                    .message("Ngày cấp thẻ (" + issueDateStr + ") không thể xảy ra trong tương lai")
                    .severity("ERROR")
                    .build());
            return issues;
        }

        // 2. Birth date cannot be after issue date
        if (birthDate.isAfter(issueDate)) {
            issues.add(FormValidationIssue.builder()
                    .field("issueDate")
                    .errorType("INVALID_DATE_LOGIC")
                    .message("Ngày cấp thẻ (" + issueDateStr + ") không thể xảy ra trước ngày sinh (" + birthDateStr + ")")
                    .severity("ERROR")
                    .build());
            return issues;
        }

        // 3. Citizen must be at least 14 years old when CCCD was issued
        Period ageAtIssuance = Period.between(birthDate, issueDate);
        if (ageAtIssuance.getYears() < 14) {
            issues.add(FormValidationIssue.builder()
                    .field("issueDate")
                    .errorType("INVALID_DATE_LOGIC")
                    .message("Công dân chưa đủ 14 tuổi tại thời điểm cấp CCCD (Tuổi khi cấp: " + ageAtIssuance.getYears() + ")")
                    .severity("ERROR")
                    .build());
        }

        return issues;
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        String clean = dateStr.trim();
        try {
            if (clean.contains("/")) {
                return LocalDate.parse(clean, FORMAT_DMY);
            } else if (clean.contains("-")) {
                return LocalDate.parse(clean, FORMAT_YMD);
            }
        } catch (DateTimeParseException ignored) {}
        return null;
    }
}
