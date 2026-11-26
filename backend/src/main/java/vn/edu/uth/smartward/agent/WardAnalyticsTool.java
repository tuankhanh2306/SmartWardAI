package vn.edu.uth.smartward.agent;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.dossier.CitizenDossier;
import vn.edu.uth.smartward.dossier.CitizenDossierRepository;
import vn.edu.uth.smartward.triage.TwoStageTriageService;
import vn.edu.uth.smartward.triage.dto.IssueClusterDto;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Parameterized Ward Operational Analytics Tool for OFFICER & ADMIN (TASK-038).
 * Replaces unsafe raw Text-to-SQL with 3 fixed parameterized queries.
 * Enforces SEC-09: for ROLE_OFFICER, wardCode is hard-bound to JWT OfficerPrincipal.
 */
@Component
@RequiredArgsConstructor
public class WardAnalyticsTool implements CivicAgentTool {

    public static final String TOOL_NAME = "ward_analytics";
    private static final String PROVINCE_SCOPE = "AG_PROVINCE";
    private static final Set<String> ACTIVE_DOSSIER_STATUSES = Set.of("PENDING", "PROCESSING", "IN_REVIEW", "NEEDS_SUPPLEMENT", "RETURNED");

    private final CitizenDossierRepository dossierRepository;
    private final TwoStageTriageService triageService;

    @Override
    public String name() {
        return TOOL_NAME;
    }

    @Override
    public String displayLabel() {
        return "Thống kê vận hành SLA & cụm sự cố cấp xã";
    }

    @Override
    public String description() {
        return "Thống kê có tham số hóa cố định cho Cán bộ/Admin: hồ sơ sắp quá hạn SLA, top thủ tục chờ xử lý/trả bổ sung, và cụm sự cố tồn đọng theo địa bàn.";
    }

    @Override
    public Set<AgentRole> allowedRoles() {
        return EnumSet.of(AgentRole.OFFICER, AgentRole.ADMIN);
    }

    @Override
    public String inputSchemaJson() {
        return "{\"type\":\"object\",\"properties\":{\"wardCode\":{\"type\":\"string\",\"description\":\"Mã xã/phường (chỉ áp dụng cho ADMIN; OFFICER luôn bị khóa cứng theo địa bàn JWT)\"},\"focus\":{\"type\":\"string\",\"enum\":[\"ALL\",\"SLA\",\"PROCEDURES\",\"INCIDENTS\"]}}}";
    }

    @Override
    public AgentToolResult execute(AgentExecutionContext context, Map<String, Object> args) {
        if (context == null || context.role() == null || !allowedRoles().contains(context.role())) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "Chỉ Cán bộ xã hoặc Quản trị viên mới có quyền xem thống kê vận hành.");
        }

        String requestedWard = (args != null && args.get("wardCode") != null)
                ? String.valueOf(args.get("wardCode")).trim()
                : null;
        if (requestedWard != null && requestedWard.isBlank()) {
            requestedWard = null;
        }

        boolean crossWardBlocked = false;
        String effectiveWardCode;

        if (context.role() == AgentRole.OFFICER) {
            if (context.wardCode() == null || context.wardCode().isBlank()) {
                throw new BusinessException(ErrorCode.FORBIDDEN,
                        "Tài khoản cán bộ chưa được gắn mã địa bàn hợp lệ (SEC-09).");
            }
            effectiveWardCode = context.wardCode().trim();
            if (requestedWard != null && !requestedWard.equalsIgnoreCase(effectiveWardCode)) {
                crossWardBlocked = true;
            }
        } else {
            effectiveWardCode = requestedWard != null ? requestedWard : PROVINCE_SCOPE;
        }

        Map<String, Object> slaSummary = getWardSlaSummary(effectiveWardCode);
        List<Map<String, Object>> topProcedures = getTopPendingProcedures(effectiveWardCode);
        Map<String, Object> incidentSummary = getOpenIncidentClustersByCategory(effectiveWardCode);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("wardCode", effectiveWardCode);
        payload.put("crossWardBlocked", crossWardBlocked);
        payload.put("slaSummary", slaSummary);
        payload.put("topPendingProcedures", topProcedures);
        payload.put("incidentSummary", incidentSummary);

        StringBuilder summary = new StringBuilder();
        if (crossWardBlocked) {
            summary.append("Lưu ý bảo mật (SEC-09): Tài khoản cán bộ chỉ được xem số liệu thuộc địa bàn được phân công (**")
                    .append(effectiveWardCode).append("**), yêu cầu truy vấn địa bàn khác đã bị khóa về địa bàn của bạn. ");
        }
        summary.append("Thống kê địa bàn **").append(effectiveWardCode).append("**: ")
                .append("Tổng ").append(slaSummary.get("totalDossiers")).append(" hồ sơ (")
                .append(slaSummary.get("activeCount")).append(" đang xử lý/chờ duyệt, ")
                .append(slaSummary.get("needsSupplementCount")).append(" trả bổ sung, **")
                .append(slaSummary.get("overdueSlaCount")).append(" quá hạn SLA**, **")
                .append(slaSummary.get("dueWithin48hCount")).append(" sắp quá hạn trong 48h**). ")
                .append("Cụm sự cố hiện trường đang mở/xử lý: **").append(incidentSummary.get("openClusterCount")).append("** cụm.");

        if (!topProcedures.isEmpty()) {
            Map<String, Object> top = topProcedures.get(0);
            summary.append(" Thủ tục tồn nhiều nhất: ")
                    .append(top.get("procedureCode")).append(" (").append(top.get("count")).append(" hồ sơ).");
        }

        AgentActionCard card = new AgentActionCard(
                "WARD_ANALYTICS",
                "Thống kê vận hành — " + effectiveWardCode,
                "Quá hạn SLA: " + slaSummary.get("overdueSlaCount")
                        + " • Sắp hạn 48h: " + slaSummary.get("dueWithin48hCount")
                        + " • Sự cố tồn đọng: " + incidentSummary.get("openClusterCount"),
                payload
        );

        return AgentToolResult.ok(TOOL_NAME, summary.toString(), payload, card, List.of(), false);
    }

    /**
     * Fixed parameterized query 1: Ward SLA & status summary.
     */
    public Map<String, Object> getWardSlaSummary(String effectiveWardCode) {
        List<CitizenDossier> dossiers = loadDossiersByScope(effectiveWardCode);
        Instant now = Instant.now();
        Instant soonCutoff = now.plus(Duration.ofHours(48));

        long activeCount = 0;
        long needsSupplementCount = 0;
        long overdueSlaCount = 0;
        long dueWithin48hCount = 0;

        for (CitizenDossier d : dossiers) {
            String st = d.getStatus() != null ? d.getStatus().trim().toUpperCase() : "";
            boolean isActive = ACTIVE_DOSSIER_STATUSES.contains(st);
            if (isActive) {
                activeCount++;
            }
            if ("NEEDS_SUPPLEMENT".equals(st) || "RETURNED".equals(st)) {
                needsSupplementCount++;
            }
            if (isActive && d.getSlaDeadline() != null) {
                if (d.getSlaDeadline().isBefore(now)) {
                    overdueSlaCount++;
                } else if (!d.getSlaDeadline().isAfter(soonCutoff)) {
                    dueWithin48hCount++;
                }
            }
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalDossiers", dossiers.size());
        summary.put("activeCount", activeCount);
        summary.put("needsSupplementCount", needsSupplementCount);
        summary.put("overdueSlaCount", overdueSlaCount);
        summary.put("dueWithin48hCount", dueWithin48hCount);
        return summary;
    }

    /**
     * Fixed parameterized query 2: Top pending / returned procedures in the ward.
     */
    public List<Map<String, Object>> getTopPendingProcedures(String effectiveWardCode) {
        List<CitizenDossier> dossiers = loadDossiersByScope(effectiveWardCode);
        Map<String, Long> counts = dossiers.stream()
                .filter(d -> d.getStatus() != null && ACTIVE_DOSSIER_STATUSES.contains(d.getStatus().trim().toUpperCase()))
                .collect(Collectors.groupingBy(
                        d -> d.getProcedureCode() != null ? d.getProcedureCode() : "UNKNOWN",
                        Collectors.counting()
                ));

        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
                .limit(5)
                .map(e -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("procedureCode", e.getKey());
                    row.put("count", e.getValue());
                    return row;
                })
                .toList();
    }

    /**
     * Fixed parameterized query 3: Open / in-progress field incident clusters grouped by category.
     */
    public Map<String, Object> getOpenIncidentClustersByCategory(String effectiveWardCode) {
        List<IssueClusterDto> openClusters = triageService.getOfficerClusters("OPEN", null, effectiveWardCode);
        List<IssueClusterDto> inProgressClusters = triageService.getOfficerClusters("IN_PROGRESS", null, effectiveWardCode);

        Map<String, IssueClusterDto> unique = new LinkedHashMap<>();
        if (openClusters != null) {
            for (IssueClusterDto c : openClusters) {
                if (c != null && c.getClusterCode() != null) {
                    unique.putIfAbsent(c.getClusterCode(), c);
                }
            }
        }
        if (inProgressClusters != null) {
            for (IssueClusterDto c : inProgressClusters) {
                if (c != null && c.getClusterCode() != null) {
                    unique.putIfAbsent(c.getClusterCode(), c);
                }
            }
        }

        Map<String, Long> byCategory = unique.values().stream()
                .collect(Collectors.groupingBy(
                        c -> c.getCategory() != null ? c.getCategory() : "OTHER",
                        LinkedHashMap::new,
                        Collectors.counting()
                ));

        List<Map<String, Object>> topClusters = unique.values().stream()
                .sorted(Comparator.comparingInt((IssueClusterDto c) -> c.getReportCount() != null ? c.getReportCount() : 0).reversed())
                .limit(5)
                .map(c -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("clusterCode", c.getClusterCode());
                    item.put("category", c.getCategory());
                    item.put("title", c.getTitle());
                    item.put("reportCount", c.getReportCount());
                    item.put("status", c.getStatus());
                    return item;
                })
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("openClusterCount", unique.size());
        result.put("byCategory", byCategory);
        result.put("topClusters", topClusters);
        return result;
    }

    private List<CitizenDossier> loadDossiersByScope(String effectiveWardCode) {
        if (effectiveWardCode == null || effectiveWardCode.isBlank() || PROVINCE_SCOPE.equalsIgnoreCase(effectiveWardCode)) {
            List<CitizenDossier> all = dossierRepository.findAllByOrderByCreatedAtDesc();
            return all != null ? all : List.of();
        }
        List<CitizenDossier> scoped = dossierRepository.findByWardCodeIgnoreCaseOrderByCreatedAtDesc(effectiveWardCode);
        return scoped != null ? scoped : List.of();
    }
}
