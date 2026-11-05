package vn.edu.uth.smartward.rag;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utility for normalizing Vietnamese text, fixing Telex typing errors,
 * standardizing Southern dialects, and expanding common administrative abbreviations.
 * Runs in pure Java with sub-millisecond execution time.
 */
public final class VietnameseTextNormalizer {

    private VietnameseTextNormalizer() {
        // Utility class
    }

    private static final Pattern COMBINING_DIACRITICS_PATTERN =
            Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    // Dialect mappings (Southern vernacular -> Standard administrative Vietnamese)
    private static final Map<String, String> DIALECT_MAP = new LinkedHashMap<>();
    static {
        DIALECT_MAP.put("tui", "tôi");
        DIALECT_MAP.put("sanh", "sinh");
        DIALECT_MAP.put("khai sanh", "khai sinh");
        DIALECT_MAP.put("chứng sanh", "chứng sinh");
        DIALECT_MAP.put("mần", "làm");
        DIALECT_MAP.put("hổng", "không");
        DIALECT_MAP.put("hong", "không");
        DIALECT_MAP.put("kô", "không");
        DIALECT_MAP.put("giá thú", "kết hôn");
        DIALECT_MAP.put("hôn thú", "kết hôn");
        DIALECT_MAP.put("hôn thư", "kết hôn");
        DIALECT_MAP.put("lấy vợ", "kết hôn");
        DIALECT_MAP.put("lấy chồng", "kết hôn");
        DIALECT_MAP.put("tiền già", "trợ cấp người cao tuổi");
        DIALECT_MAP.put("lãnh tiền già", "trợ cấp người cao tuổi");
        DIALECT_MAP.put("sổ hộ khẩu", "thường trú");
        DIALECT_MAP.put("nhập hộ khẩu", "đăng ký thường trú");
    }

    // Administrative abbreviations -> Full administrative terms
    private static final Map<String, String> ABBREVIATION_MAP = new LinkedHashMap<>();
    static {
        ABBREVIATION_MAP.put("đk", "đăng ký");
        ABBREVIATION_MAP.put("dk", "đăng ký");
        ABBREVIATION_MAP.put("cccd", "căn cước công dân");
        ABBREVIATION_MAP.put("cmnd", "chứng minh nhân dân");
        ABBREVIATION_MAP.put("ubnd", "ủy ban nhân dân");
        ABBREVIATION_MAP.put("gks", "giấy khai sinh");
        ABBREVIATION_MAP.put("gxn", "giấy xác nhận");
        ABBREVIATION_MAP.put("tthc", "thủ tục hành chính");
        ABBREVIATION_MAP.put("sao y", "chứng thực sao y bản sao");
        ABBREVIATION_MAP.put("bhxh", "bảo hiểm xã hội");
        ABBREVIATION_MAP.put("bhyt", "bảo hiểm y tế");
        ABBREVIATION_MAP.put("ko", "không");
        ABBREVIATION_MAP.put("k", "không");
        ABBREVIATION_MAP.put("đc", "được");
        ABBREVIATION_MAP.put("dc", "được");
    }

    // Common Telex typing errors for key administrative and greeting roots
    private static final Map<String, String> TELEX_CORRECTIONS = new LinkedHashMap<>();
    static {
        // Greetings
        TELEX_CORRECTIONS.put("chaogf", "chào");
        TELEX_CORRECTIONS.put("chaof", "chào");
        TELEX_CORRECTIONS.put("chaoof", "chào");
        TELEX_CORRECTIONS.put("xinchao", "xin chào");
        TELEX_CORRECTIONS.put("xin chaof", "xin chào");
        TELEX_CORRECTIONS.put("xin chaogf", "xin chào");
        TELEX_CORRECTIONS.put("xin chaoo", "xin chào");
        TELEX_CORRECTIONS.put("helo", "hello");
        TELEX_CORRECTIONS.put("helllo", "hello");

        // Help & Consultation
        TELEX_CORRECTIONS.put("giupf", "giúp");
        TELEX_CORRECTIONS.put("giups", "giúp");
        TELEX_CORRECTIONS.put("tu van", "tư vấn");
        TELEX_CORRECTIONS.put("tuw vaans", "tư vấn");
        TELEX_CORRECTIONS.put("tuw van", "tư vấn");
        TELEX_CORRECTIONS.put("ho tro", "hỗ trợ");
        TELEX_CORRECTIONS.put("howx troj", "hỗ trợ");
        TELEX_CORRECTIONS.put("ho troj", "hỗ trợ");
        TELEX_CORRECTIONS.put("huong dan", "hướng dẫn");
        TELEX_CORRECTIONS.put("huowngs daanx", "hướng dẫn");

        // Procedures
        TELEX_CORRECTIONS.put("khai sinh", "khai sinh");
        TELEX_CORRECTIONS.put("khai sanh", "khai sinh");
        TELEX_CORRECTIONS.put("ket hon", "kết hôn");
        TELEX_CORRECTIONS.put("keets hoon", "kết hôn");
        TELEX_CORRECTIONS.put("thuong tru", "thường trú");
        TELEX_CORRECTIONS.put("thuowngf trus", "thường trú");
        TELEX_CORRECTIONS.put("tam tru", "tạm trú");
        TELEX_CORRECTIONS.put("tams trus", "tạm trú");
        TELEX_CORRECTIONS.put("chung thuc", "chứng thực");
        TELEX_CORRECTIONS.put("chuwsng thuwjc", "chứng thực");
        TELEX_CORRECTIONS.put("khai tu", "khai tử");
        TELEX_CORRECTIONS.put("khai tuwr", "khai tử");
        TELEX_CORRECTIONS.put("le phi", "lệ phí");
        TELEX_CORRECTIONS.put("leej phis", "lệ phí");
        TELEX_CORRECTIONS.put("giay to", "giấy tờ");
        TELEX_CORRECTIONS.put("giaays towf", "giấy tờ");
        TELEX_CORRECTIONS.put("ho so", "hồ sơ");
        TELEX_CORRECTIONS.put("hoof sow", "hồ sơ");
    }

    /**
     * Removes Vietnamese diacritical accents and converts đ/Đ to d/D.
     */
    public static String removeAccents(String input) {
        if (input == null || input.isEmpty()) {
            return "";
        }
        String nfdNormalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        String withoutDiacritics = COMBINING_DIACRITICS_PATTERN.matcher(nfdNormalized).replaceAll("");
        return withoutDiacritics.replace('đ', 'd').replace('Đ', 'D');
    }

    /**
     * Comprehensive normalizer:
     * 1. Trim & lowercase
     * 2. Normalize Telex mis-strokes
     * 3. Translate dialect terms
     * 4. Expand administrative abbreviations
     */
    public static String normalize(String input) {
        if (input == null || input.isBlank()) {
            return "";
        }

        String normalized = input.trim().toLowerCase();

        // 1. Replace multi-word dialect & telex phrases first
        for (Map.Entry<String, String> entry : TELEX_CORRECTIONS.entrySet()) {
            normalized = replaceWordOrPhrase(normalized, entry.getKey(), entry.getValue());
        }

        for (Map.Entry<String, String> entry : DIALECT_MAP.entrySet()) {
            normalized = replaceWordOrPhrase(normalized, entry.getKey(), entry.getValue());
        }

        for (Map.Entry<String, String> entry : ABBREVIATION_MAP.entrySet()) {
            normalized = replaceWordOrPhrase(normalized, entry.getKey(), entry.getValue());
        }

        // Clean redundant whitespace
        normalized = normalized.replaceAll("\\s+", " ").trim();
        return normalized;
    }

    private static String replaceWordOrPhrase(String text, String target, String replacement) {
        String regex = "(?i)(?<=^|[^\\p{L}\\p{N}])" + Pattern.quote(target) + "(?=[^\\p{L}\\p{N}]|$)";
        return text.replaceAll(regex, Matcher.quoteReplacement(replacement));
    }
}
