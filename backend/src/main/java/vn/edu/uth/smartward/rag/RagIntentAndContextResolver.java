package vn.edu.uth.smartward.rag;

import vn.edu.uth.smartward.rag.dto.ConversationTurnDto;

import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extracted from RagQueryService (TASK-019): Intent detection (greetings, catalog,
 * ambiguous consultation, ward office info) and multi-turn follow-up context rewriting.
 */
final class RagIntentAndContextResolver {

    private static final Set<String> EXACT_GREETINGS = Set.of(
            "hi", "hello", "hey", "alo", "chào", "xin chào", "kính chào",
            "chào bạn", "chào bot", "chào ad", "chào cán bộ", "chào ủy ban",
            "chào anh", "chào chị", "chào em",
            "bạn là ai", "ai đó", "bạn là cái gì",
            "bạn giúp được gì", "bạn có thể làm gì", "chức năng của bạn",
            "hướng dẫn sử dụng", "giới thiệu", "giới thiệu bản thân",
            "good morning", "good afternoon", "good evening", "start", "bắt đầu"
    );

    private static final List<String> PROCEDURE_KEYWORDS = List.of(
            "khai sinh", "chứng sinh", "mới sinh", "sinh con",
            "kết hôn", "lấy vợ", "lấy chồng", "hôn thú", "đăng ký kết hôn",
            "khai tử", "chứng tử", "báo tử", "người mất",
            "thường trú", "tạm trú", "ct01", "cư trú", "nhập khẩu", "hộ khẩu",
            "chứng thực", "sao y", "công chứng", "chữ ký",
            "độc thân", "tình trạng hôn nhân", "trích lục", "bảo trợ", "mai táng"
    );

    private static final List<String> PROCEDURE_LIST_PATTERNS = List.of(
            "nêu 40 thủ tục", "nêu thủ tục", "kể 40 thủ tục", "kể tên 40 thủ tục", "kể các thủ tục",
            "kể tên các thủ tục", "kể tên thủ tục", "danh sách 40 thủ tục", "danh sách thủ tục",
            "danh mục 40 thủ tục", "danh mục thủ tục", "danh mục tthc", "danh sách tthc",
            "có những thủ tục nào", "có bao nhiêu thủ tục", "gồm những thủ tục nào", "có các thủ tục nào",
            "liệt kê 40 thủ tục", "liệt kê các thủ tục", "liệt kê thủ tục",
            "các thủ tục cấp xã", "các thủ tục hành chính", "các thủ tục",
            "hỗ trợ những thủ tục gì", "hỗ trợ thủ tục nào", "hỗ trợ những gì", "danh sách dịch vụ", "40 thủ tục"
    );

    private static final List<String> TYPO_GREETINGS = List.of(
            "chaogf", "chaof", "chaoof", "xin chaof", "xin chaogf", "xin chaoo", "helo", "helllo", "xinchao"
    );

    private static final List<String> SMALL_TALK_PATTERNS = List.of(
            "hôm nay thế nào", "hôm nay ra sao", "hôm nay bạn thế nào", "ngày mới thế nào",
            "khỏe không", "bạn khỏe không", "cán bộ khỏe không", "dạo này thế nào", "thế nào rồi",
            "cảm ơn", "cam on", "thanks", "thank you", "tuyệt vời", "tốt lắm", "được rồi",
            "tạm biệt", "bye", "bye bye", "hẹn gặp lại", "ok", "oke"
    );

    private static final List<String> AMBIGUOUS_PATTERNS = List.of(
            "tu van", "giup toi", "giup minh", "giup em", "giup voi",
            "can giup", "ho tro toi", "cho toi hoi", "muon hoi",
            "can tu van", "huong dan giup", "co the tu van", "co the giup",
            "hoi chut", "can ho tro"
    );

    private static final List<String> OFFICE_PATTERNS = List.of(
            "địa chỉ ở đâu", "trụ sở ở đâu", "địa chỉ ủy ban", "địa chỉ ubnd",
            "ủy ban ở đâu", "ubnd ở đâu", "trụ sở ubnd",
            "giờ làm việc", "mấy giờ làm việc", "mấy giờ mở cửa",
            "giờ tiếp dân", "thời gian làm việc", "thứ 7 có làm việc không",
            "số điện thoại", "hotline", "liên hệ ai", "dia chi o dau", "tru so o dau"
    );

    private static final List<String> FOLLOW_UP_PATTERNS = List.of(
            "lệ phí", "chi phí", "bao nhiêu tiền", "hết bao nhiêu", "mất tiền", "mất phí", "có mất tiền không",
            "bao lâu", "mấy ngày", "thời hạn", "thời gian", "khi nào có",
            "hồ sơ", "giấy tờ", "cần gì", "chuẩn bị gì", "mang theo gì",
            "nộp ở đâu", "ở đâu", "đến đâu", "nơi nộp", "ai nộp",
            "còn", "thế còn", "vậy còn"
    );

    private static final Pattern HEADER_PROCEDURE_PATTERN = Pattern.compile(
            "(?:1\\.\\s*TÓM\\s*TẮT\\s*THỦ\\s*TỤC[:\\s]*\\n*Thủ\\s*tục\\s+)([^(\\n]+)",
            Pattern.CASE_INSENSITIVE
    );

    private RagIntentAndContextResolver() {}

    static boolean isProcedureListQuery(String query) {
        if (query == null) return false;
        String raw = query.trim().toLowerCase().replaceAll("[!?.,;:]+$", "");
        String norm = VietnameseTextNormalizer.normalize(raw);
        String unaccent = VietnameseTextNormalizer.removeAccents(norm);
        return PROCEDURE_LIST_PATTERNS.stream().anyMatch(p ->
                raw.contains(p) || norm.contains(p) || unaccent.contains(p)
        );
    }

    static boolean isGreetingOrSmallTalk(String query) {
        if (query == null) return false;
        String raw = query.trim().toLowerCase().replaceAll("[!?.,;:]+$", "");
        if (raw.isEmpty()) return false;

        String norm = VietnameseTextNormalizer.normalize(raw);
        String unaccent = VietnameseTextNormalizer.removeAccents(norm);

        if (containsProcedureKeyword(raw, norm, unaccent)) {
            return false;
        }
        if (TYPO_GREETINGS.stream().anyMatch(raw::contains)) {
            return true;
        }
        if (SMALL_TALK_PATTERNS.stream().anyMatch(p -> raw.contains(p) || norm.contains(p) || unaccent.contains(p))) {
            return true;
        }
        if (EXACT_GREETINGS.contains(raw) || EXACT_GREETINGS.contains(norm) || EXACT_GREETINGS.contains(unaccent)) {
            return true;
        }
        if (unaccent.length() <= 35) {
            if (unaccent.matches("^(hi|hello|hey|alo|chao|xin chao|kinh chao)(\\s+.*)?$")) return true;
            if (unaccent.matches("^(ban|bot)\\s+(la ai|co the lam gi|giup gi).*$")) return true;
        }
        return false;
    }

    static boolean isAmbiguousConsultation(String query) {
        if (query == null) return false;
        String raw = query.trim().toLowerCase().replaceAll("[!?.,;:]+$", "");
        if (raw.isEmpty()) return false;

        String norm = VietnameseTextNormalizer.normalize(raw);
        String unaccent = VietnameseTextNormalizer.removeAccents(norm);

        if (containsProcedureKeyword(raw, norm, unaccent) || isGreetingOrSmallTalk(query)) {
            return false;
        }
        return AMBIGUOUS_PATTERNS.stream().anyMatch(p -> unaccent.contains(p) || norm.contains(p) || raw.contains(p));
    }

    static boolean isWardOfficeQuery(String query) {
        if (query == null) return false;
        String raw = query.trim().toLowerCase();
        String norm = VietnameseTextNormalizer.normalize(raw);
        String unaccent = VietnameseTextNormalizer.removeAccents(norm);

        if (containsProcedureKeyword(raw, norm, unaccent)) {
            return false;
        }
        return OFFICE_PATTERNS.stream().anyMatch(p -> raw.contains(p) || norm.contains(p) || unaccent.contains(p));
    }

    static String resolveEffectiveQuery(String rawQuery, List<ConversationTurnDto> history) {
        if (history == null || history.isEmpty()) {
            return rawQuery;
        }
        if (!isFollowUpQuestion(rawQuery.toLowerCase())) {
            return rawQuery;
        }
        for (int i = history.size() - 1; i >= Math.max(0, history.size() - 5); i--) {
            ConversationTurnDto turn = history.get(i);
            if (turn == null) continue;
            if (turn.getProcedureCode() != null && !turn.getProcedureCode().isBlank()) {
                String procName = mapProcedureCodeToName(turn.getProcedureCode());
                if (procName != null) {
                    return "[Thủ tục " + procName + "] " + rawQuery;
                }
            }
            if (turn.getContent() != null && !turn.getContent().isBlank()) {
                String procName = extractProcedureFromText(turn.getContent());
                if (procName != null) {
                    return "[Thủ tục " + procName + "] " + rawQuery;
                }
            }
        }
        return rawQuery;
    }

    static boolean isFollowUpQuestion(String query) {
        if (query == null || query.isBlank()) return false;
        String q = query.trim().toLowerCase();
        for (String kw : PROCEDURE_KEYWORDS) {
            if (q.contains(kw)) return false;
        }
        return FOLLOW_UP_PATTERNS.stream().anyMatch(q::contains);
    }

    static String extractProcedureFromText(String text) {
        if (text == null || text.isBlank()) return null;
        if (text.contains("chưa nhận diện rõ")
                || text.contains("nằm ngoài thẩm quyền")
                || text.contains("chưa tìm thấy thông tin")) {
            return null;
        }

        Matcher m = HEADER_PROCEDURE_PATTERN.matcher(text);
        if (m.find()) {
            String headerTitle = m.group(1).trim().toLowerCase();
            if (headerTitle.contains("khai sinh")) return "Đăng ký khai sinh";
            if (headerTitle.contains("kết hôn")) return "Đăng ký kết hôn";
            if (headerTitle.contains("thường trú") || headerTitle.contains("cư trú")) return "Đăng ký thường trú (Mẫu CT01)";
            if (headerTitle.contains("tạm trú")) return "Đăng ký tạm trú";
            if (headerTitle.contains("khai tử")) return "Đăng ký khai tử";
            if (headerTitle.contains("chứng thực") || headerTitle.contains("sao y")) return "Chứng thực sao y bản sao";
            if (headerTitle.contains("hôn nhân") || headerTitle.contains("độc thân")) return "Cấp Giấy xác nhận tình trạng hôn nhân";
            if (headerTitle.contains("trích lục")) return "Cấp bản sao trích lục hộ tịch";
            if (headerTitle.contains("bảo trợ") || headerTitle.contains("người cao tuổi")) return "Trợ cấp bảo trợ xã hội";
        }

        String lower = text.toLowerCase().replaceAll("\\(ví\\s*dụ:[^)]*\\)", "");
        if (lower.contains("khai sinh") || lower.contains("sinh con") || lower.contains("mới sinh")
                || lower.contains("khai sanh") || lower.contains("sanh con") || lower.contains("mới sanh")) {
            return "Đăng ký khai sinh";
        }
        if (lower.contains("tạm trú")) return "Đăng ký tạm trú";
        if (lower.contains("thường trú") || lower.contains("cư trú") || lower.contains("ct01")
                || lower.contains("nhập khẩu") || lower.contains("hộ khẩu")) {
            return "Đăng ký thường trú (Mẫu CT01)";
        }
        if (lower.contains("khai tử") || lower.contains("chứng tử") || lower.contains("người mất")) return "Đăng ký khai tử";
        if (lower.contains("độc thân") || lower.contains("tình trạng hôn nhân")) return "Cấp Giấy xác nhận tình trạng hôn nhân";
        if (lower.contains("trích lục")) return "Cấp bản sao trích lục hộ tịch";
        if (lower.contains("bảo trợ") || lower.contains("tiền già") || lower.contains("người cao tuổi")) return "Trợ cấp bảo trợ xã hội";
        if (lower.contains("chứng thực") || lower.contains("sao y")) return "Chứng thực sao y bản sao";

        String sanitizedForMarriage = lower
                .replaceAll("giấy\\s+(?:chứng\\s+nhận\\s+)?kết\\s+hôn", "giay_to_khac")
                .replaceAll("kết\\s+hôn\\s+của\\s+cha\\s+mẹ", "giay_to_khac");
        if (sanitizedForMarriage.contains("kết hôn") || sanitizedForMarriage.contains("hôn nhân")
                || sanitizedForMarriage.contains("lấy vợ") || sanitizedForMarriage.contains("lấy chồng")) {
            return "Đăng ký kết hôn";
        }
        return null;
    }

    static String mapProcedureCodeToName(String code) {
        if (code == null) return null;
        return switch (code.trim().toUpperCase()) {
            case "TTHC-HT-01", "KS-01-DK" -> "Đăng ký khai sinh";
            case "TTHC-HT-02", "HT-02-DK" -> "Đăng ký kết hôn";
            case "TTHC-HT-03", "TTHC-HT-11" -> "Cấp Giấy xác nhận tình trạng hôn nhân";
            case "TTHC-HT-04" -> "Cấp bản sao trích lục hộ tịch";
            case "TTHC-HT-05" -> "Đăng ký khai tử";
            case "TTHC-CR-01", "CT-01" -> "Đăng ký thường trú (Mẫu CT01)";
            case "TTHC-CR-03" -> "Đăng ký tạm trú";
            case "TTHC-CR-08" -> "Xác nhận thông tin về cư trú (Mẫu CT07)";
            case "TTHC-CR-04" -> "Khai báo tạm vắng và thông báo lưu trú";
            case "TTHC-CT-01" -> "Chứng thực sao y bản sao";
            case "TTHC-BT-01" -> "Trợ cấp bảo trợ xã hội";
            default -> null;
        };
    }

    static List<String> generateProcedureSuggestions(List<LegalChunkMatch> candidateChunks) {
        if (candidateChunks == null || candidateChunks.isEmpty()) {
            return List.of("👶 Đăng ký khai sinh", "💍 Đăng ký kết hôn", "🏠 Đăng ký thường trú (CT01)", "📋 Xem 40 thủ tục");
        }
        String name = candidateChunks.get(0).getProcedureName() != null
                ? candidateChunks.get(0).getProcedureName().toLowerCase() : "";
        if (name.contains("kết hôn")) {
            return List.of("Hồ sơ kết hôn cần gì?", "Lệ phí kết hôn bao nhiêu?", "Nơi nộp hồ sơ kết hôn ở đâu?", "Thời hạn giải quyết bao lâu?");
        }
        if (name.contains("khai sinh")) {
            return List.of("Hồ sơ khai sinh cần gì?", "Lệ phí khai sinh bao nhiêu?", "Nơi nộp hồ sơ khai sinh ở đâu?", "Thời hạn giải quyết bao lâu?");
        }
        if (name.contains("thường trú") || name.contains("cư trú")) {
            return List.of("Hồ sơ thường trú gồm những gì?", "Thời hạn đăng ký thường trú?", "Nơi nộp hồ sơ thường trú?", "Hướng dẫn điền CT01");
        }
        if (name.contains("chứng thực")) {
            return List.of("Lệ phí chứng thực bản sao?", "Giấy tờ cần xuất trình khi chứng thực?", "Thời hạn trả kết quả chứng thực?");
        }
        return List.of("Hồ sơ cần những gì?", "Lệ phí bao nhiêu?", "Nơi nộp hồ sơ ở đâu?", "Thời hạn giải quyết bao lâu?");
    }

    private static boolean containsProcedureKeyword(String raw, String norm, String unaccent) {
        for (String kw : PROCEDURE_KEYWORDS) {
            if (raw.contains(kw) || norm.contains(kw) || unaccent.contains(kw)) {
                return true;
            }
        }
        return false;
    }
}
