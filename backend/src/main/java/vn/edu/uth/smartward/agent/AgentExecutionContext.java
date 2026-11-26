package vn.edu.uth.smartward.agent;

import vn.edu.uth.smartward.rag.dto.ConversationTurnDto;

import java.util.List;

/**
 * Immutable execution context for CivicSupervisorAgent & tools.
 * Note: role, officerBadgeId, and wardCode are derived strictly from verified JWT OfficerPrincipal
 * (or defaults to CITIZEN with null wardCode for unauthenticated public users).
 */
public record AgentExecutionContext(
        AgentRole role,
        String officerBadgeId,
        String wardCode,
        String clientIp,
        String sessionId,
        String originalMessage,
        String preferredFormType,
        List<ConversationTurnDto> history,
        long deadlineEpochMs
) {
    public long remainingBudgetMs() {
        return Math.max(0L, deadlineEpochMs - System.currentTimeMillis());
    }
}
