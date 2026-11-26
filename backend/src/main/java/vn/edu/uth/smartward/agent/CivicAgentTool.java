package vn.edu.uth.smartward.agent;

import java.util.Map;
import java.util.Set;

/**
 * Contract for safe domain tools exposed to CivicSupervisorAgent (TASK-035).
 */
public interface CivicAgentTool {

    String name();

    String displayLabel();

    String description();

    Set<AgentRole> allowedRoles();

    String inputSchemaJson();

    AgentToolResult execute(AgentExecutionContext context, Map<String, Object> args);
}
