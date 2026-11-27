package vn.edu.uth.smartward.formcheck;

import vn.edu.uth.smartward.formcheck.dto.CrossCheckStatus;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Text Normalization and Comparative Utilities for Multi-Document Cross-Check Engine.
 */
public final class TextNormalizationUtils {

    private TextNormalizationUtils() {}

    /**
     * Normalizes Unicode Canonical Decomposition to Precomposed (NFC) and collapses redundant spaces.
     */
    public static String cleanText(String s) {
        if (s == null) return "";
        String nfc = Normalizer.normalize(s.trim(), Normalizer.Form.NFC);
        return nfc.replaceAll("\\s+", " ").trim();
    }

    /**
     * Removes Vietnamese accents/diacritics for insensitive comparison.
     */
    public static String removeAccents(String s) {
        if (s == null) return "";
        String nfd = Normalizer.normalize(s, Normalizer.Form.NFD);
        String withoutAccents = nfd.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return withoutAccents.replace('đ', 'd').replace('Đ', 'D');
    }

    /**
     * Expands administrative and street abbreviations in Vietnamese addresses.
     */
    public static String expandAddressAbbreviations(String address) {
        if (address == null) return "";
        String lower = " " + cleanText(address).toLowerCase(Locale.ROOT) + " ";
        lower = lower
                .replaceAll("(?U)\\bđ\\.\\s*", "đường ")
                .replaceAll("(?U)\\bp\\.\\s*", "phường ")
                .replaceAll("(?U)\\bx\\.\\s*", "xã ")
                .replaceAll("(?U)\\btt\\.\\s*", "thị trấn ")
                .replaceAll("(?U)\\btp\\.\\s*", "thành phố ")
                .replaceAll("(?U)\\bq\\.\\s*", "quận ")
                .replaceAll("(?U)\\bh\\.\\s*", "huyện ")
                .replaceAll("(?U)\\btx\\.\\s*", "thị xã ")
                .replaceAll("(?U)\\bt\\.\\s*", "tỉnh ")
                .replaceAll("(^|[\\s,])đ\\.\\s*", "$1đường ")
                .replaceAll("(^|[\\s,])p\\.\\s*", "$1phường ")
                .replaceAll("(^|[\\s,])x\\.\\s*", "$1xã ")
                .replaceAll("(^|[\\s,])tt\\.\\s*", "$1thị trấn ")
                .replaceAll("(^|[\\s,])tp\\.\\s*", "$1thành phố ")
                .replaceAll("(^|[\\s,])q\\.\\s*", "$1quận ")
                .replaceAll("(^|[\\s,])h\\.\\s*", "$1huyện ")
                .replaceAll("(^|[\\s,])tx\\.\\s*", "$1thị xã ")
                .replaceAll("(^|[\\s,])t\\.\\s*", "$1tỉnh ");
        return cleanText(lower);
    }

    /**
     * Parses Vietnamese verbal date strings (e.g., "mười lăm tháng tám năm hai nghìn không trăm hai mươi sáu")
     * into ISO yyyy-MM-dd format.
     */
    public static String parseVerbalVietnameseDate(String text) {
        if (text == null || text.isBlank()) return "";
        String clean = cleanText(text);

        // Try standard ISO or slash format first
        if (clean.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
            return clean;
        }
        if (clean.matches("^\\d{1,2}/\\d{1,2}/\\d{4}$")) {
            try {
                LocalDate d = LocalDate.parse(clean, DateTimeFormatter.ofPattern("d/M/yyyy"));
                return d.format(DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException ignored) {}
        }
        if (clean.matches("^\\d{1,2}-\\d{1,2}-\\d{4}$")) {
            try {
                LocalDate d = LocalDate.parse(clean, DateTimeFormatter.ofPattern("d-M-yyyy"));
                return d.format(DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException ignored) {}
        }

        String lower = clean.toLowerCase(Locale.ROOT);
        int day = 0;
        int month = 0;
        int year = 0;

        // Partition string into explicit day / month / year clauses so year numerals (e.g. "... hai mươi lăm")
        // never pollute day parsing.
        int thangIdx = lower.indexOf("tháng");
        int afterMonthKeyword = 0;
        if (thangIdx >= 0) {
            afterMonthKeyword = lower.startsWith("tháng năm", thangIdx)
                    ? thangIdx + "tháng năm".length()
                    : thangIdx + "tháng".length();
        }
        int namIdx = -1;
        Matcher namMatcher = Pattern.compile("(?U)\\bnăm\\b").matcher(lower);
        if (namMatcher.find(Math.min(afterMonthKeyword, lower.length()))) {
            namIdx = namMatcher.start();
        }

        String dayClause = (thangIdx >= 0) ? lower.substring(0, thangIdx) : lower;
        String monthClause = (thangIdx >= 0)
                ? ((namIdx > thangIdx) ? lower.substring(thangIdx, namIdx) : lower.substring(thangIdx))
                : lower;
        String yearClause = (namIdx >= 0) ? lower.substring(namIdx) : lower;

        // 1. Day parsing (strictly scoped to dayClause)
        if (dayClause.contains("ba mươi mốt")) day = 31;
        else if (dayClause.contains("ba mươi")) day = 30;
        else if (dayClause.contains("hai mươi chín")) day = 29;
        else if (dayClause.contains("hai mươi tám")) day = 28;
        else if (dayClause.contains("hai mươi bảy")) day = 27;
        else if (dayClause.contains("hai mươi sáu")) day = 26;
        else if (dayClause.contains("hai mươi lăm")) day = 25;
        else if (dayClause.contains("hai mươi tư") || dayClause.contains("hai mươi bốn")) day = 24;
        else if (dayClause.contains("hai mươi ba")) day = 23;
        else if (dayClause.contains("hai mươi hai")) day = 22;
        else if (dayClause.contains("hai mươi mốt")) day = 21;
        else if (dayClause.contains("hai mươi")) day = 20;
        else if (dayClause.contains("mười chín")) day = 19;
        else if (dayClause.contains("mười tám")) day = 18;
        else if (dayClause.contains("mười bảy")) day = 17;
        else if (dayClause.contains("mười sáu")) day = 16;
        else if (dayClause.contains("mười lăm")) day = 15;
        else if (dayClause.contains("mười bốn") || dayClause.contains("mười tư")) day = 14;
        else if (dayClause.contains("mười ba")) day = 13;
        else if (dayClause.contains("mười hai")) day = 12;
        else if (dayClause.contains("mười một")) day = 11;
        else if (dayClause.contains("mười")) day = 10;
        else if (dayClause.contains("mùng chín") || dayClause.contains("mồng chín")) day = 9;
        else if (dayClause.contains("mùng tám") || dayClause.contains("mồng tám")) day = 8;
        else if (dayClause.contains("mùng bảy") || dayClause.contains("mồng bảy")) day = 7;
        else if (dayClause.contains("mùng sáu") || dayClause.contains("mồng sáu")) day = 6;
        else if (dayClause.contains("mùng năm") || dayClause.contains("mồng năm")) day = 5;
        else if (dayClause.contains("mùng bốn") || dayClause.contains("mồng bốn") || dayClause.contains("mùng tư") || dayClause.contains("mồng tư")) day = 4;
        else if (dayClause.contains("mùng ba") || dayClause.contains("mồng ba")) day = 3;
        else if (dayClause.contains("mùng hai") || dayClause.contains("mồng hai")) day = 2;
        else if (dayClause.contains("mùng một") || dayClause.contains("mồng một")) day = 1;
        else {
            Matcher m = Pattern.compile("(?:ngày\\s*)?(\\d{1,2})").matcher(dayClause);
            if (m.find()) {
                day = Integer.parseInt(m.group(1));
            }
        }

        // 2. Month parsing (strictly scoped to monthClause)
        if (monthClause.contains("tháng mười một")) month = 11;
        else if (monthClause.contains("tháng mười hai") || monthClause.contains("tháng chạp")) month = 12;
        else if (monthClause.contains("tháng mười")) month = 10;
        else if (monthClause.contains("tháng một") || monthClause.contains("tháng giêng")) month = 1;
        else if (monthClause.contains("tháng hai")) month = 2;
        else if (monthClause.contains("tháng ba")) month = 3;
        else if (monthClause.contains("tháng tư") || monthClause.contains("tháng bốn")) month = 4;
        else if (monthClause.contains("tháng năm")) month = 5;
        else if (monthClause.contains("tháng sáu")) month = 6;
        else if (monthClause.contains("tháng bảy")) month = 7;
        else if (monthClause.contains("tháng tám")) month = 8;
        else if (monthClause.contains("tháng chín")) month = 9;
        else {
            Matcher m = Pattern.compile("tháng\\s*(\\d{1,2})").matcher(monthClause);
            if (m.find()) {
                month = Integer.parseInt(m.group(1));
            }
        }

        // 3. Year parsing (strictly scoped to yearClause)
        if (yearClause.contains("hai nghìn không trăm hai mươi sáu") || yearClause.contains("2026")) year = 2026;
        else if (yearClause.contains("hai nghìn không trăm hai mươi lăm") || yearClause.contains("2025")) year = 2025;
        else if (yearClause.contains("hai nghìn không trăm hai mươi tư") || yearClause.contains("2024")) year = 2024;
        else if (yearClause.contains("hai nghìn không trăm hai mươi ba") || yearClause.contains("2023")) year = 2023;
        else if (yearClause.contains("hai nghìn không trăm hai mươi hai") || yearClause.contains("2022")) year = 2022;
        else if (yearClause.contains("hai nghìn không trăm hai mươi mốt") || yearClause.contains("2021")) year = 2021;
        else if (yearClause.contains("hai nghìn không trăm hai mươi") || yearClause.contains("2020")) year = 2020;
        else {
            Matcher m = Pattern.compile("năm\\s*(\\d{4})").matcher(yearClause);
            if (m.find()) {
                year = Integer.parseInt(m.group(1));
            }
        }

        if (day > 0 && month > 0 && year > 0) {
            return String.format("%04d-%02d-%02d", year, month, day);
        }

        return clean;
    }

    /**
     * Compares mother names and detects abbreviated middle name (e.g. "Nguyễn T. Kim Loan" vs "Nguyễn Thị Kim Loan").
     */
    public static CrossCheckStatus compareMotherNames(String declarationName, String ocrName) {
        String dNorm = cleanText(declarationName).toUpperCase(Locale.ROOT);
        String oNorm = cleanText(ocrName).toUpperCase(Locale.ROOT);

        if (dNorm.isEmpty() || oNorm.isEmpty()) return CrossCheckStatus.WARNING;
        if (dNorm.equals(oNorm)) return CrossCheckStatus.MATCH;

        // Check if middle name abbreviation pattern matches (e.g. " T. " for " THỊ ")
        String dWithoutAccent = removeAccents(dNorm);
        String oWithoutAccent = removeAccents(oNorm);

        if (dWithoutAccent.equals(oWithoutAccent)) {
            return CrossCheckStatus.WARNING;
        }

        String[] dParts = dNorm.split(" ");
        String[] oParts = oNorm.split(" ");

        if (dParts.length >= 3 && oParts.length >= 3) {
            boolean sameSurname = dParts[0].equals(oParts[0]);
            boolean sameGivenName = dParts[dParts.length - 1].equals(oParts[oParts.length - 1]);
            if (sameSurname && sameGivenName) {
                // Check if middle part is an abbreviation (e.g., "T." for "THỊ")
                String oMiddle = String.join(" ", java.util.Arrays.copyOfRange(oParts, 1, oParts.length - 1));
                if (oMiddle.contains(".") || oMiddle.length() <= 3) {
                    return CrossCheckStatus.WARNING;
                }
            }
        }

        return CrossCheckStatus.CONFLICT;
    }

    /**
     * Compares cadastral parcel numbers and detects parcel subdivision (e.g. "123-1" vs "123").
     */
    public static ParcelComparisonResult compareParcelNumbers(String declarationParcel, String certParcel) {
        String dClean = cleanText(declarationParcel);
        String cClean = cleanText(certParcel);

        if (dClean.isEmpty() || cClean.isEmpty()) {
            return new ParcelComparisonResult(CrossCheckStatus.WARNING, "PARCEL_INFO_INCOMPLETE");
        }
        if (dClean.equalsIgnoreCase(cClean)) {
            return new ParcelComparisonResult(CrossCheckStatus.MATCH, null);
        }

        if (cClean.startsWith(dClean + "-") || dClean.startsWith(cClean + "-")
                || cClean.startsWith(dClean + "/") || dClean.startsWith(cClean + "/")) {
            return new ParcelComparisonResult(CrossCheckStatus.WARNING, "PARCEL_SUBDIVISION_DETECTED");
        }

        return new ParcelComparisonResult(CrossCheckStatus.CONFLICT, "PARCEL_NUMBER_MISMATCH");
    }

    public record ParcelComparisonResult(CrossCheckStatus status, String reasonCode) {}

    /**
     * Verifies death chronology: death date must occur on or before report date.
     */
    public static ChronologyVerificationResult verifyDeathChronology(LocalDate deathDate, LocalDate reportDate) {
        if (deathDate == null || reportDate == null) {
            return new ChronologyVerificationResult(CrossCheckStatus.WARNING, "CHRONOLOGY_DATES_INCOMPLETE", true);
        }

        if (!deathDate.isAfter(reportDate)) {
            return new ChronologyVerificationResult(CrossCheckStatus.MATCH, null, true);
        }

        return new ChronologyVerificationResult(
                CrossCheckStatus.CONFLICT,
                "TEMPORAL_IMPOSSIBILITY_DEATH_AFTER_REPORT",
                false
        );
    }

    public record ChronologyVerificationResult(CrossCheckStatus status, String reasonCode, boolean valid) {}

    /**
     * Checks if red seal/stamp is present or low confidence.
     */
    public static CrossCheckStatus checkRedSeal(Double sealConfidence, Boolean hasRedSeal) {
        if (Boolean.FALSE.equals(hasRedSeal) || (sealConfidence != null && sealConfidence < 0.70)) {
            return CrossCheckStatus.WARNING;
        }
        return CrossCheckStatus.MATCH;
    }
}
