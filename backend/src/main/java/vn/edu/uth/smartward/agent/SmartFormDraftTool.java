package vn.edu.uth.smartward.agent;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.edu.uth.smartward.formcheck.FormPrecheckService;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckRequest;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckResponse;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckResponse.FieldValidationItem;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Draft-Only Smart Form Extraction & Precheck Tool (TASK-037).
 * Wraps FormPrecheckService.validateStructuredDraft for CT01, TK-KS, TK-KH, and TK-BTXH.
 * STRICT INVARIANT: Never submits dossiers or performs any database write.
 */
@Component
@RequiredArgsConstructor
public class SmartFormDraftTool implements CivicAgentTool {

    public static final String TOOL_NAME = "smart_form_draft";

    private static final Pattern CCCD_12_PATTERN = Pattern.compile("\\b(\\d{12})\\b");
    private static final Pattern DATE_PATTERN = Pattern.compile("\\b(\\d{1,2}/\\d{1,2}/\\d{4}|\\d{4}-\\d{2}-\\d{2})\\b");
    private static final Pattern PHONE_PATTERN = Pattern.compile("\\b((?:0|\\+84)(?:3|5|7|8|9|2)\\d{8,9})\\b");
    private static final Pattern NAME_PATTERN = Pattern.compile(
            "(?:họ(?:\\s+và)?\\s+tên|tên(?:\\s+tôi|\\s+bé|\\s+trẻ)?\\s+là|tôi\\s+là)\\s*:?\\s*([\\p{L}][\\p{L}\\s]{2,50}?)(?=,|\\.|;|\\s+(?:sinh|ngày|cccd|cmnd|sđt|điện thoại|ở|tại|địa chỉ|giới tính|nam|nữ)|$)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern MOTHER_PATTERN = Pattern.compile(
            "(?:tên\\s+mẹ|mẹ\\s+là|người\\s+mẹ)\\s*:?\\s*([\\p{L}][\\p{L}\\s]{2,50}?)(?=,|\\.|;|\\s+(?:sinh|cha|bố|cccd|ở|tại|địa chỉ)|$)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern ADDRESS_PATTERN = Pattern.compile(
            "(?:địa\\s+chỉ|thường\\s+trú\\s+tại|tạm\\s+trú\\s+tại|cư\\s+trú\\s+tại|ở\\s+tại)\\s*:?\\s*([^.;\\n]{8,140}?)(?=,\\s*(?:cccd|sđt|điện thoại|sinh|tên|giới tính)|\\.|;|$)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private final FormPrecheckService formPrecheckService;

    @Override
    public String name() {
        return TOOL_NAME;
    }

    @Override
    public String displayLabel() {
        return "Điền nháp & kiểm tra tờ khai (Draft-Only)";
    }

    @Override
    public String description() {
        return "Trích xuất thông tin người dân cung cấp để tạo bản nháp JSON cho 4 tờ khai (CT01, TK-KS, TK-KH, TK-BTXH) và báo trường còn thiếu. Tuyệt đối không tự nộp hồ sơ.";
    }

    @Override
    public Set<AgentRole> allowedRoles() {
        return EnumSet.of(AgentRole.CITIZEN, AgentRole.OFFICER, AgentRole.ADMIN);
    }

    @Override
    public String inputSchemaJson() {
        return "{\"type\":\"object\",\"properties\":{\"formType\":{\"type\":\"string\",\"enum\":[\"CT01\",\"TK-KS\",\"TK-KH\",\"TK-BTXH\"]},\"fullName\":{\"type\":\"string\"},\"citizenCccd\":{\"type\":\"string\"},\"dateOfBirth\":{\"type\":\"string\"},\"gender\":{\"type\":\"string\"},\"address\":{\"type\":\"string\"},\"phoneNumber\":{\"type\":\"string\"}},\"required\":[\"formType\"]}";
    }

    @Override
    public AgentToolResult execute(AgentExecutionContext context, Map<String, Object> args) {
        String sourceText = context.originalMessage() != null ? context.originalMessage() : "";
        String formType = resolveFormType(args, context.preferredFormType(), sourceText);
        String procedureCode = mapProcedureCode(formType);

        String fullName = firstNonBlank(extractString(args, "fullName"), matchGroup(NAME_PATTERN, sourceText));
        String citizenCccd = firstNonBlank(extractString(args, "citizenCccd"), matchGroup(CCCD_12_PATTERN, sourceText));
        String dateOfBirth = firstNonBlank(extractString(args, "dateOfBirth"), matchGroup(DATE_PATTERN, sourceText));
        String gender = firstNonBlank(extractString(args, "gender"), inferGender(sourceText));
        String address = firstNonBlank(extractString(args, "address"), matchGroup(ADDRESS_PATTERN, sourceText));
        String phoneNumber = firstNonBlank(extractString(args, "phoneNumber"), matchGroup(PHONE_PATTERN, sourceText));

        Map<String, String> formData = new LinkedHashMap<>();
        if (args != null && args.get("formData") instanceof Map<?, ?> rawFormData) {
            for (Map.Entry<?, ?> entry : rawFormData.entrySet()) {
                if (entry.getKey() != null && entry.getValue() != null) {
                    formData.put(String.valueOf(entry.getKey()), String.valueOf(entry.getValue()).trim());
                }
            }
        }
        String motherName = firstNonBlank(extractString(args, "motherName"), matchGroup(MOTHER_PATTERN, sourceText));
        if (motherName != null && !formData.containsKey("motherName")) {
            formData.put("motherName", motherName);
        }
        if (phoneNumber != null && !formData.containsKey("phoneNumber")) {
            formData.put("phoneNumber", phoneNumber);
        }

        StructuredFormPrecheckRequest precheckReq = StructuredFormPrecheckRequest.builder()
                .formType(formType)
                .procedureCode(procedureCode)
                .fullName(fullName)
                .citizenCccd(citizenCccd)
                .dateOfBirth(dateOfBirth)
                .gender(gender)
                .address(address)
                .phoneNumber(phoneNumber)
                .formData(formData)
                .build();

        // Read-only deterministic validation: 0 DB writes guaranteed
        StructuredFormPrecheckResponse precheck = formPrecheckService.validateStructuredDraft(precheckReq);

        List<Map<String, Object>> missingOrInvalidFields = new ArrayList<>();
        if (precheck.getFieldValidations() != null) {
            for (FieldValidationItem item : precheck.getFieldValidations()) {
                if (!item.isValid()) {
                    Map<String, Object> issue = new LinkedHashMap<>();
                    issue.put("fieldName", item.getFieldName());
                    issue.put("errorCode", item.getErrorCode());
                    issue.put("errorMessage", item.getErrorMessage());
                    missingOrInvalidFields.add(issue);
                }
            }
        }

        Map<String, Object> draftPayload = new LinkedHashMap<>();
        draftPayload.put("formType", formType);
        draftPayload.put("procedureCode", procedureCode);
        draftPayload.put("fullName", fullName != null ? fullName : "");
        draftPayload.put("citizenCccd", citizenCccd != null ? citizenCccd : "");
        draftPayload.put("dateOfBirth", dateOfBirth != null ? dateOfBirth : "");
        draftPayload.put("gender", gender != null ? gender : "");
        draftPayload.put("address", address != null ? address : "");
        draftPayload.put("phoneNumber", phoneNumber != null ? phoneNumber : "");
        draftPayload.put("formData", formData);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("draftOnly", true);
        data.put("formType", formType);
        data.put("procedureCode", procedureCode);
        data.put("overallValid", precheck.isOverallValid());
        data.put("draftPayload", draftPayload);
        data.put("missingOrInvalidFields", missingOrInvalidFields);
        data.put("warnings", precheck.getWarnings() != null ? precheck.getWarnings() : List.of());

        String formLabel = getFormLabel(formType);
        StringBuilder summary = new StringBuilder();
        summary.append("Đã tạo **bản nháp ").append(formLabel).append(" (").append(formType).append(")** — chế độ chỉ điền nháp (chưa nộp lên hệ thống). ");
        if (precheck.isOverallValid()) {
            summary.append("Các trường thông tin chính đã hợp lệ. Bạn có thể bấm nút \"Mở tờ khai đã điền sẵn\" để rà soát và tự xác nhận nộp.");
        } else {
            summary.append("Còn ").append(missingOrInvalidFields.size()).append(" mục cần bổ sung/chỉnh sửa trước khi nộp: ");
            List<String> names = missingOrInvalidFields.stream()
                    .map(m -> String.valueOf(m.get("fieldName")))
                    .limit(4)
                    .toList();
            summary.append(String.join("; ", names)).append(".");
        }

        AgentActionCard card = new AgentActionCard(
                "OPEN_PREFILLED_FORM",
                "Mở tờ khai đã điền sẵn (" + formType + ")",
                precheck.isOverallValid()
                        ? "Bản nháp hợp lệ — bấm để rà soát và tự xác nhận nộp"
                        : "Còn " + missingOrInvalidFields.size() + " mục cần bổ sung trước khi nộp",
                data
        );

        return AgentToolResult.ok(TOOL_NAME, summary.toString(), data, card, List.of(), false);
    }

    public static String resolveFormType(Map<String, Object> args, String preferredFormType, String text) {
        String candidate = firstNonBlank(extractString(args, "formType"), preferredFormType);
        if (candidate != null) {
            String upper = candidate.trim().toUpperCase(Locale.ROOT);
            if (Set.of("CT01", "TK-KS", "TK-KH", "TK-BTXH").contains(upper)) {
                return upper;
            }
        }
        String lower = text != null ? text.toLowerCase(Locale.ROOT) : "";
        if (lower.contains("khai sinh") || lower.contains("tk-ks") || lower.contains("giấy chứng sinh")) {
            return "TK-KS";
        }
        if (lower.contains("kết hôn") || lower.contains("tình trạng hôn nhân") || lower.contains("độc thân") || lower.contains("tk-kh")) {
            return "TK-KH";
        }
        if (lower.contains("bảo trợ") || lower.contains("trợ cấp") || lower.contains("khuyết tật") || lower.contains("người cao tuổi") || lower.contains("tk-btxh")) {
            return "TK-BTXH";
        }
        return "CT01";
    }

    private static String mapProcedureCode(String formType) {
        return switch (formType) {
            case "TK-KS" -> "TTHC-HT-01";
            case "TK-KH" -> "TTHC-HT-02";
            case "TK-BTXH" -> "TTHC-BTXH-01";
            default -> "TTHC-CT-01";
        };
    }

    private static String getFormLabel(String formType) {
        return switch (formType) {
            case "TK-KS" -> "Tờ khai Đăng ký khai sinh";
            case "TK-KH" -> "Tờ khai Đăng ký kết hôn / Tình trạng hôn nhân";
            case "TK-BTXH" -> "Tờ khai Trợ cấp xã hội";
            default -> "Tờ khai thay đổi thông tin cư trú";
        };
    }

    private static String inferGender(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.matches(".*\\b(giới tính\\s*:?\\s*nữ|nữ giới|chị\\s+|bà\\s+).*")) {
            return "Nữ";
        }
        if (lower.matches(".*\\b(giới tính\\s*:?\\s*nam|nam giới|anh\\s+|ông\\s+).*")) {
            return "Nam";
        }
        return null;
    }

    private static String matchGroup(Pattern pattern, String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Matcher m = pattern.matcher(text);
        if (m.find()) {
            String val = m.group(1).trim();
            return val.isBlank() ? null : val;
        }
        return null;
    }

    private static String extractString(Map<String, Object> args, String key) {
        if (args == null || args.get(key) == null) {
            return null;
        }
        String val = String.valueOf(args.get(key)).trim();
        return val.isBlank() ? null : val;
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a.trim();
        if (b != null && !b.isBlank()) return b.trim();
        return null;
    }
}
