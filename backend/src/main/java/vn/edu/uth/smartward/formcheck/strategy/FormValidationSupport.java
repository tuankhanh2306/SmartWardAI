package vn.edu.uth.smartward.formcheck.strategy;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

public final class FormValidationSupport {

    private FormValidationSupport() {}

    public static String safeTrim(String val) {
        return val == null ? "" : val.trim();
    }

    public static LocalDate parseFlexibleDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        String clean = dateStr.trim();
        try {
            if (clean.contains("/")) {
                return LocalDate.parse(clean, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            } else if (clean.contains("-")) {
                return LocalDate.parse(clean, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            }
        } catch (DateTimeParseException ignored) {}
        return null;
    }
}
