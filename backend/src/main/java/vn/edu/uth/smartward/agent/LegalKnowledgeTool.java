package vn.edu.uth.smartward.agent;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.edu.uth.smartward.rag.RagQueryService;
import vn.edu.uth.smartward.rag.dto.RagAskRequest;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;

import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Wraps RagQueryService as a safe Agent Tool (TASK-036).
 * Preserves theta=0.78 abstention guardrail, [CHUNK_CODE] citation grounding, SQL ACL, and HITL routing.
 */
@Component
@RequiredArgsConstructor
public class LegalKnowledgeTool implements CivicAgentTool {

    public static final String TOOL_NAME = "legal_knowledge_search";

    private final RagQueryService ragQueryService;

    @Override
    public String name() {
        return TOOL_NAME;
    }

    @Override
    public String displayLabel() {
        return "Tra cứu quy định & thủ tục pháp lý";
    }

    @Override
    public String description() {
        return "Tra cứu quy định pháp luật, thành phần hồ sơ, thời hạn giải quyết và lệ phí thủ tục hành chính cấp xã qua Legal RAG (chốt chặn theta=0.78).";
    }

    @Override
    public Set<AgentRole> allowedRoles() {
        return EnumSet.of(AgentRole.CITIZEN, AgentRole.OFFICER, AgentRole.ADMIN);
    }

    @Override
    public String inputSchemaJson() {
        return "{\"type\":\"object\",\"properties\":{\"question\":{\"type\":\"string\",\"description\":\"Câu hỏi về thủ tục hoặc giấy tờ cần chuẩn bị\"}},\"required\":[\"question\"]}";
    }

    @Override
    public AgentToolResult execute(AgentExecutionContext context, Map<String, Object> args) {
        String question = args != null && args.get("question") != null
                ? String.valueOf(args.get("question")).trim()
                : "";
        if (question.isBlank()) {
            question = context.originalMessage() != null ? context.originalMessage().trim() : "";
        }
        if (question.isBlank()) {
            return AgentToolResult.error(TOOL_NAME, "Không có nội dung câu hỏi pháp lý để tra cứu.", Map.of());
        }

        RagAskRequest ragReq = RagAskRequest.builder()
                .question(question)
                .sessionId(context.sessionId())
                .history(context.history())
                .build();

        String clientIp = context.clientIp() != null ? context.clientIp() : "127.0.0.1";
        RagAskResponse ragResp = (context.officerBadgeId() != null || context.sessionId() != null)
                ? ragQueryService.askQuestion(ragReq, clientIp, context.officerBadgeId(), context.sessionId())
                : ragQueryService.askQuestion(ragReq, clientIp);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("abstained", ragResp.isAbstained());
        data.put("maxSimilarity", ragResp.getMaxSimilarity());
        data.put("appliedThreshold", ragResp.getAppliedThreshold());
        data.put("cached", ragResp.isCached());
        if (ragResp.getAbstentionReason() != null) {
            data.put("abstentionReason", ragResp.getAbstentionReason());
        }

        return AgentToolResult.ok(
                TOOL_NAME,
                ragResp.getAnswer(),
                data,
                null,
                ragResp.getCitations(),
                ragResp.isAbstained()
        );
    }
}
