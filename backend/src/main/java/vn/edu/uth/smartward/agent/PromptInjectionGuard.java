package vn.edu.uth.smartward.agent;

import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Prompt Injection & Indirect Instruction Override Guard (TASK-039).
 * Screens both direct citizen/officer prompts and externally crawled web text before LLM/Tool invocation.
 */
@Component
public class PromptInjectionGuard {

    public record InspectionResult(boolean flagged, String reason, String sanitizedText) {
        public static InspectionResult safe(String text) {
            return new InspectionResult(false, null, text);
        }

        public static InspectionResult blocked(String reason) {
            return new InspectionResult(true, reason, "");
        }
    }

    private record Rule(String code, Pattern pattern) {}

    private static final List<Rule> RULES = List.of(
            new Rule("SYSTEM_OVERRIDE", Pattern.compile(
                    "(?:ignore|disregard|forget|override|bypass)\\s+(?:all\\s+)?(?:previous|prior|above|system|safety)\\s+(?:instructions?|prompts?|rules?|guardrails?)",
                    Pattern.CASE_INSENSITIVE
            )),
            new Rule("SYSTEM_OVERRIDE_VI", Pattern.compile(
                    "(?:bo\\s+qua|quen\\s+het|huy\\s+bo|vo\\s+hieu\\s+hoa)\\s+(?:moi\\s+|tat\\s+ca\\s+)?(?:chi\\s+dan|huong\\s+dan|quy\\s+tac|lenh\\s+he\\s+thong|gioi\\s+han)",
                    Pattern.CASE_INSENSITIVE
            )),
            new Rule("ROLE_SPOOF", Pattern.compile(
                    "(?:you\\s+are\\s+now|act\\s+as|pretend\\s+to\\s+be|switch\\s+role\\s+to|elevate\\s+to|grant\\s+me)\\s+(?:an?\\s+)?(?:system|root|admin|role_admin|role_officer|developer\\s+mode|dan\\b)",
                    Pattern.CASE_INSENSITIVE
            )),
            new Rule("ROLE_SPOOF_VI", Pattern.compile(
                    "(?:gia\\s+lam|dong\\s+vai|chuyen\\s+quyen\\s+sang|cap\\s+quyen)\\s+(?:admin|quan\\s+tri\\s+vien|role_admin|he\\s+thong|can\\s+bo\\s+cap\\s+cao)",
                    Pattern.CASE_INSENSITIVE
            )),
            new Rule("PROMPT_EXFILTRATION", Pattern.compile(
                    "(?:reveal|print|dump|show|output|leak)\\s+(?:your\\s+)?(?:system\\s+prompt|hidden\\s+instructions|secret\\s+key|jwt_secret|vault_encryption_key|env\\s+vars|application\\.yml)",
                    Pattern.CASE_INSENSITIVE
            )),
            new Rule("SECRET_EXTRACTION_VI", Pattern.compile(
                    "(?:in\\s+ra|cho\\s+xem|tiet\\s+lo|xuat\\s+ra)\\s+(?:toan\\s+bo\\s+)?(?:system\\s+prompt|khoa\\s+bi\\s+mat|jwt_secret|vault_encryption_key|mat\\s+khau\\s+db|bien\\s+moi\\s+truong)",
                    Pattern.CASE_INSENSITIVE
            )),
            new Rule("SQL_INJECTION_PAYLOAD", Pattern.compile(
                    "(?:union\\s+all?\\s+select|drop\\s+table|delete\\s+from\\s+[a-z_]+|insert\\s+into\\s+[a-z_]+|;\\s*select\\s+\\*\\s+from|--\\s*$|'\\s*or\\s*'1'\\s*=\\s*'1)",
                    Pattern.CASE_INSENSITIVE
            )),
            new Rule("DELIMITER_SPOOF", Pattern.compile(
                    "(?:^|\\n)\\s*(?:\\[\\s*system\\s*\\]|<\\|im_start\\|>\\s*system|###\\s*system\\s*instructions?|<system>)",
                    Pattern.CASE_INSENSITIVE
            ))
    );

    public InspectionResult inspectUserPrompt(String input) {
        if (input == null || input.isBlank()) {
            return InspectionResult.safe("");
        }
        String folded = foldForMatching(input);
        for (Rule rule : RULES) {
            if (rule.pattern().matcher(input).find() || rule.pattern().matcher(folded).find()) {
                return InspectionResult.blocked(rule.code());
            }
        }
        return InspectionResult.safe(input.trim());
    }

    /**
     * Screens & strips injected prompt directives embedded in external / crawled web documents
     * before the content is fed into RAG/Agent context windows.
     */
    public InspectionResult sanitizeExternalContent(String crawledText) {
        if (crawledText == null || crawledText.isBlank()) {
            return InspectionResult.safe("");
        }
        StringBuilder cleaned = new StringBuilder();
        boolean flagged = false;
        String firstReason = null;

        for (String line : crawledText.split("\\R")) {
            InspectionResult lineCheck = inspectUserPrompt(line);
            if (lineCheck.flagged()) {
                flagged = true;
                if (firstReason == null) {
                    firstReason = lineCheck.reason();
                }
            } else {
                if (cleaned.length() > 0) {
                    cleaned.append('\n');
                }
                cleaned.append(line);
            }
        }
        return new InspectionResult(flagged, firstReason, cleaned.toString().trim());
    }

    private static String foldForMatching(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
        return normalized.toLowerCase(Locale.ROOT);
    }
}
