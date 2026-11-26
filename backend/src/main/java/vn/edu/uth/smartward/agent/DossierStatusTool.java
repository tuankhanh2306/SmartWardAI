package vn.edu.uth.smartward.agent;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.dossier.CitizenDossierService;
import vn.edu.uth.smartward.dossier.dto.DossierTrackingResponse;

import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Wraps CitizenDossierService.trackDossier as a safe Agent Tool (TASK-036).
 * Strictly requires dossierCode + last4Cccd, preserves 5/15m rate limit, and masks PII in output.
 */
@Component
@RequiredArgsConstructor
public class DossierStatusTool implements CivicAgentTool {

    public static final String TOOL_NAME = "dossier_status_lookup";

    private static final Pattern DOSSIER_CODE_PATTERN = Pattern.compile("\\b((?:HS|SW)-[A-Za-z0-9-]+)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern LAST4_PATTERN = Pattern.compile("(?:cccd|cmnd|định danh|đuôi|4 số cuối)[^\\d]{0,20}(\\d{4})\\b", Pattern.CASE_INSENSITIVE);

    private final CitizenDossierService citizenDossierService;

    @Override
    public String name() {
        return TOOL_NAME;
    }

    @Override
    public String displayLabel() {
        return "Kiểm tra tình trạng hồ sơ";
    }

    @Override
    public String description() {
        return "Tra cứu tiến độ xử lý hồ sơ hành chính thật theo mã hồ sơ và 4 số cuối CCCD (giới hạn 5 lần/15 phút, che PII).";
    }

    @Override
    public Set<AgentRole> allowedRoles() {
        return EnumSet.of(AgentRole.CITIZEN, AgentRole.OFFICER, AgentRole.ADMIN);
    }

    @Override
    public String inputSchemaJson() {
        return "{\"type\":\"object\",\"properties\":{\"dossierCode\":{\"type\":\"string\",\"description\":\"Mã hồ sơ (VD: HS-2026-0001)\"},\"last4Cccd\":{\"type\":\"string\",\"description\":\"Đúng 4 chữ số cuối CCCD\"}},\"required\":[\"dossierCode\",\"last4Cccd\"]}";
    }

    @Override
    public AgentToolResult execute(AgentExecutionContext context, Map<String, Object> args) {
        String dossierCode = extractString(args, "dossierCode");
        String last4Cccd = extractString(args, "last4Cccd");

        if (dossierCode == null && context.originalMessage() != null) {
            dossierCode = extractDossierCodeFromText(context.originalMessage());
        }
        if (last4Cccd == null && context.originalMessage() != null) {
            last4Cccd = extractLast4FromText(context.originalMessage());
        }

        if (dossierCode == null || dossierCode.isBlank()) {
            return AgentToolResult.error(TOOL_NAME,
                    "Để tra cứu hồ sơ bảo mật, vui lòng cung cấp mã hồ sơ (ví dụ: HS-2026-0001) kèm 4 số cuối CCCD.",
                    Map.of("missingFields", List.of("dossierCode", "last4Cccd")));
        }
        if (last4Cccd == null || !last4Cccd.matches("^\\d{4}$")) {
            return AgentToolResult.error(TOOL_NAME,
                    "Vui lòng cung cấp đúng 4 chữ số cuối CCCD đi kèm mã hồ sơ " + dossierCode + " để xác thực tra cứu bảo mật.",
                    Map.of("dossierCode", dossierCode, "missingFields", List.of("last4Cccd")));
        }

        String clientIp = context.clientIp() != null ? context.clientIp() : "127.0.0.1";
        try {
            DossierTrackingResponse tracked = (context.officerBadgeId() != null || context.sessionId() != null)
                    ? citizenDossierService.trackDossier(dossierCode, last4Cccd, clientIp, context.officerBadgeId(), context.sessionId())
                    : citizenDossierService.trackDossier(dossierCode, last4Cccd, clientIp);

            String maskedCccd = maskCccd(tracked.citizenCccd(), last4Cccd);
            String statusVi = translateStatus(tracked.status());

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("dossierCode", tracked.dossierCode());
            payload.put("procedureCode", tracked.procedureCode());
            payload.put("procedureName", tracked.procedureName());
            payload.put("wardCode", tracked.wardCode());
            payload.put("maskedCccd", maskedCccd);
            payload.put("status", tracked.status());
            payload.put("statusLabel", statusVi);
            if (tracked.slaDeadline() != null) {
                payload.put("slaDeadline", tracked.slaDeadline().toString());
            }
            if (tracked.officerFeedback() != null && !tracked.officerFeedback().isBlank()) {
                payload.put("officerFeedback", tracked.officerFeedback());
            }
            if (tracked.appointmentCode() != null && !tracked.appointmentCode().isBlank()) {
                payload.put("appointmentCode", tracked.appointmentCode());
            }

            StringBuilder summary = new StringBuilder();
            summary.append("Hồ sơ ").append(tracked.dossierCode());
            if (tracked.procedureName() != null && !tracked.procedureName().isBlank()) {
                summary.append(" (").append(tracked.procedureName()).append(")");
            }
            summary.append(" — CCCD: ").append(maskedCccd)
                    .append(" — Trạng thái: **").append(statusVi).append("**.");
            if (tracked.slaDeadline() != null) {
                summary.append(" Hạn trả kết quả (SLA): ").append(tracked.slaDeadline()).append(".");
            }
            if (tracked.officerFeedback() != null && !tracked.officerFeedback().isBlank()) {
                summary.append(" Ghi chú cán bộ: ").append(tracked.officerFeedback());
            }
            if (tracked.appointmentCode() != null && !tracked.appointmentCode().isBlank()) {
                summary.append(" Mã lịch hẹn: ").append(tracked.appointmentCode()).append(".");
            }

            AgentActionCard card = new AgentActionCard(
                    "DOSSIER_STATUS",
                    "Hồ sơ " + tracked.dossierCode(),
                    statusVi + (tracked.procedureName() != null ? " • " + tracked.procedureName() : ""),
                    payload
            );

            return AgentToolResult.ok(TOOL_NAME, summary.toString(), payload, card, List.of(), false);
        } catch (BusinessException ex) {
            return AgentToolResult.error(TOOL_NAME, ex.getMessage(),
                    Map.of("dossierCode", dossierCode, "errorCode", ex.getErrorCode().getCode()));
        }
    }

    public static String extractDossierCodeFromText(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Matcher m = DOSSIER_CODE_PATTERN.matcher(text);
        return m.find() ? m.group(1).toUpperCase() : null;
    }

    public static String extractLast4FromText(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Matcher m = LAST4_PATTERN.matcher(text);
        return m.find() ? m.group(1) : null;
    }

    private static String extractString(Map<String, Object> args, String key) {
        if (args == null || args.get(key) == null) {
            return null;
        }
        String val = String.valueOf(args.get(key)).trim();
        return val.isBlank() ? null : val;
    }

    private static String maskCccd(String rawCccd, String fallbackLast4) {
        String digits = rawCccd != null ? rawCccd.replaceAll("\\D", "") : "";
        String last4 = digits.length() >= 4 ? digits.substring(digits.length() - 4) : fallbackLast4;
        return "********" + (last4 != null ? last4 : "****");
    }

    private static String translateStatus(String status) {
        if (status == null) {
            return "Đang cập nhật";
        }
        return switch (status.trim().toUpperCase()) {
            case "PENDING" -> "Chờ tiếp nhận";
            case "PROCESSING", "IN_REVIEW" -> "Đang xử lý";
            case "NEEDS_SUPPLEMENT", "RETURNED" -> "Cần bổ sung hồ sơ";
            case "APPROVED", "COMPLETED" -> "Đã duyệt / Hoàn tất";
            case "REJECTED" -> "Từ chối giải quyết";
            default -> status;
        };
    }
}
