package vn.edu.uth.smartward.formcheck;

import org.springframework.stereotype.Component;
import vn.edu.uth.smartward.formcheck.dto.FormValidationIssue;

import java.util.*;

/**
 * Pure Java Deterministic Validator for Vietnamese Citizen Identity Cards (CCCD - 12 digits).
 * Encodes official business rules from Circular 59/2021/TT-BCA and the Law on Citizen Identity:
 * 1. Exactly 12 numeric digits
 * 2. 3-digit Province code must belong to the official 63 province/city catalogue of Vietnam
 * 3. 1-digit Century/Gender code must match year of birth and citizen gender
 * 4. 2-digit Birth Year code must match the last two digits of birth year
 */
@Component
public class CccdValidator {

    private static final Set<String> VALID_PROVINCE_CODES = Set.of(
            "001", "002", "004", "006", "008", "010", "011", "012", "014", "015", "017", "019", "020",
            "022", "024", "025", "026", "027", "030", "031", "033", "034", "035", "036", "037", "038",
            "040", "042", "044", "045", "046", "048", "049", "051", "052", "054", "056", "058", "060",
            "062", "064", "066", "067", "068", "070", "072", "074", "075", "077", "079", "080", "082",
            "083", "084", "086", "087", "089", "091", "092", "093", "094", "095", "096"
    );

    /**
     * Validates a 12-digit CCCD number against declared birth date and gender.
     *
     * @param cccdNumber   declared CCCD number
     * @param birthDateStr declared birth date (e.g. "15/08/1995" or "1995-08-15")
     * @param gender       declared gender ("Nam" or "Nữ")
     * @return List of validation issues (empty if 100% valid)
     */
    public List<FormValidationIssue> validate(String cccdNumber, String birthDateStr, String gender) {
        List<FormValidationIssue> issues = new ArrayList<>();

        if (cccdNumber == null || cccdNumber.isBlank()) {
            issues.add(FormValidationIssue.builder()
                    .field("cccdNumber")
                    .errorType("MISSING_MANDATORY_FIELD")
                    .message("Số Căn cước công dân là trường bắt buộc không được để trống")
                    .severity("ERROR")
                    .build());
            return issues;
        }

        String cleanedCccd = cccdNumber.trim();

        // 1. Check 12-digit format
        if (!cleanedCccd.matches("^\\d{12}$")) {
            issues.add(FormValidationIssue.builder()
                    .field("cccdNumber")
                    .errorType("INVALID_CCCD_LENGTH")
                    .message("Số Căn cước công dân phải đủ 12 chữ số (hiện tại có " + cleanedCccd.length() + " chữ số)")
                    .severity("ERROR")
                    .build());
            return issues;
        }

        // 2. Check Province Code (3 digits)
        String provinceCode = cleanedCccd.substring(0, 3);
        if (!VALID_PROVINCE_CODES.contains(provinceCode)) {
            issues.add(FormValidationIssue.builder()
                    .field("cccdNumber")
                    .errorType("INVALID_CCCD_PROVINCE")
                    .message("Mã tỉnh/thành phố '" + provinceCode + "' trên CCCD không tồn tại theo danh mục Bộ Công an")
                    .severity("ERROR")
                    .build());
            return issues;
        }

        // Parse birth year from birthDateStr
        Integer birthYear = extractBirthYear(birthDateStr);
        if (birthYear == null) {
            return issues; // Cannot verify century or year without valid birth date
        }

        // 3. Check Century & Gender (1 digit at index 3)
        if (gender != null && !gender.isBlank()) {
            int genderDigit = Character.getNumericValue(cleanedCccd.charAt(3));
            Integer expectedDigit = computeExpectedCenturyGenderDigit(birthYear, gender);

            if (expectedDigit != null && genderDigit != expectedDigit) {
                issues.add(FormValidationIssue.builder()
                        .field("cccdNumber")
                        .errorType("INVALID_CCCD_CENTURY_GENDER")
                        .message("Chữ số thế kỷ/giới tính '" + genderDigit + "' không khớp với năm sinh " + birthYear + " và giới tính " + gender.trim())
                        .severity("ERROR")
                        .build());
                return issues;
            }
        }

        // 4. Check Birth Year Match (2 digits at index 4..5)
        String yearOnCccd = cleanedCccd.substring(4, 6);
        String expectedYearOnCccd = String.format("%02d", birthYear % 100);

        if (!yearOnCccd.equals(expectedYearOnCccd)) {
            issues.add(FormValidationIssue.builder()
                    .field("cccdNumber")
                    .errorType("INVALID_CCCD_YEAR")
                    .message("Hai chữ số năm sinh trên CCCD '" + yearOnCccd + "' không khớp với năm sinh " + birthYear)
                    .severity("ERROR")
                    .build());
        }

        return issues;
    }

    private Integer computeExpectedCenturyGenderDigit(int birthYear, String gender) {
        boolean isMale = "Nam".equalsIgnoreCase(gender.trim());
        int century = birthYear / 100;

        return switch (century) {
            case 19 -> isMale ? 0 : 1; // 1900 - 1999
            case 20 -> isMale ? 2 : 3; // 2000 - 2099
            case 21 -> isMale ? 4 : 5; // 2100 - 2199
            case 22 -> isMale ? 6 : 7; // 2200 - 2299
            case 23 -> isMale ? 8 : 9; // 2300 - 2399
            default -> null;
        };
    }

    private Integer extractBirthYear(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        String[] parts = dateStr.trim().split("[/\\-]");
        if (parts.length == 3) {
            try {
                if (parts[2].length() == 4) {
                    return Integer.parseInt(parts[2]); // dd/MM/yyyy
                } else if (parts[0].length() == 4) {
                    return Integer.parseInt(parts[0]); // yyyy-MM-dd
                }
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }
}
