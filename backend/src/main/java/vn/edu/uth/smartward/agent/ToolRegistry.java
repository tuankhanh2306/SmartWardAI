package vn.edu.uth.smartward.agent;

import org.springframework.stereotype.Component;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Role-scoped Tool Registry (TASK-035).
 * Ensures LLM and orchestrator only see and invoke tools permitted for the caller's verified AgentRole.
 */
@Component
public class ToolRegistry {

    private final Map<String, CivicAgentTool> toolsByName;

    public ToolRegistry(List<CivicAgentTool> tools) {
        Map<String, CivicAgentTool> map = new LinkedHashMap<>();
        if (tools != null) {
            for (CivicAgentTool tool : tools) {
                if (tool != null && tool.name() != null && !tool.name().isBlank()) {
                    map.put(tool.name().trim().toLowerCase(Locale.ROOT), tool);
                }
            }
        }
        this.toolsByName = Collections.unmodifiableMap(map);
    }

    public List<CivicAgentTool> getToolsForRole(AgentRole role) {
        AgentRole effectiveRole = role != null ? role : AgentRole.CITIZEN;
        return toolsByName.values().stream()
                .filter(tool -> tool.allowedRoles() != null && tool.allowedRoles().contains(effectiveRole))
                .toList();
    }

    public Optional<CivicAgentTool> findAuthorizedTool(String name, AgentRole role) {
        if (name == null || name.isBlank()) {
            return Optional.empty();
        }
        AgentRole effectiveRole = role != null ? role : AgentRole.CITIZEN;
        CivicAgentTool tool = toolsByName.get(name.trim().toLowerCase(Locale.ROOT));
        if (tool == null || tool.allowedRoles() == null || !tool.allowedRoles().contains(effectiveRole)) {
            return Optional.empty();
        }
        return Optional.of(tool);
    }

    public CivicAgentTool requireAuthorizedTool(String name, AgentRole role) {
        if (name == null || name.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Tên công cụ Agent không hợp lệ.");
        }
        String key = name.trim().toLowerCase(Locale.ROOT);
        CivicAgentTool tool = toolsByName.get(key);
        if (tool == null) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy công cụ Agent: " + name);
        }
        AgentRole effectiveRole = role != null ? role : AgentRole.CITIZEN;
        if (tool.allowedRoles() == null || !tool.allowedRoles().contains(effectiveRole)) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "Vai trò " + effectiveRole + " không có quyền sử dụng công cụ '" + tool.name() + "'.");
        }
        return tool;
    }
}
