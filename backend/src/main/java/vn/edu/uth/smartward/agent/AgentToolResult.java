package vn.edu.uth.smartward.agent;

import vn.edu.uth.smartward.rag.dto.LegalCitationDto;

import java.util.List;
import java.util.Map;

public record AgentToolResult(
        String toolName,
        boolean success,
        String summary,
        Map<String, Object> data,
        AgentActionCard actionCard,
        List<LegalCitationDto> citations,
        boolean abstained
) {
    public static AgentToolResult ok(String toolName, String summary, Map<String, Object> data,
                                     AgentActionCard actionCard, List<LegalCitationDto> citations, boolean abstained) {
        return new AgentToolResult(
                toolName,
                true,
                summary,
                data != null ? data : Map.of(),
                actionCard,
                citations != null ? citations : List.of(),
                abstained
        );
    }

    public static AgentToolResult error(String toolName, String summary, Map<String, Object> data) {
        return new AgentToolResult(
                toolName,
                false,
                summary,
                data != null ? data : Map.of(),
                null,
                List.of(),
                false
        );
    }
}
