package vn.edu.uth.smartward.agent;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.edu.uth.smartward.agent.dto.AgentChatRequest;
import vn.edu.uth.smartward.agent.dto.AgentChatResponse;
import vn.edu.uth.smartward.agent.dto.AgentChatResponse.AgentStepDto;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.ai.DeterministicMockAiClient;
import vn.edu.uth.smartward.rag.RagQueryService;
import vn.edu.uth.smartward.rag.dto.LegalCitationDto;
import vn.edu.uth.smartward.rag.dto.RagAskRequest;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Central Orchestrator for SmartWard Civic AI Agent Platform (TASK-035).
 * Enforces:
 * - Role-scoped tool visibility via ToolRegistry (CITIZEN / OFFICER / ADMIN)
 * - Budget Guard: maxToolCalls <= 3 and totalTimeoutMs <= 15000ms
 * - Automatic safe fallback to RagQueryService when LLM or orchestration fails/times out
 */
@Slf4j
@Service
public class CivicSupervisorAgent {

    public static final int DEFAULT_MAX_TOOL_CALLS = 3;
    public static final long DEFAULT_TOTAL_TIMEOUT_MS = 15_000L;

    public static final String AGENT_DISCLAIMER =
            "Trợ lý SmartWard AI hỗ trợ tra cứu và điền nháp tờ khai theo quy định hành chính; " +
            "mọi hồ sơ chính thức đều cần công dân rà soát và tự xác nhận nộp theo thẩm quyền UBND cấp xã.";

    private static final Pattern WARD_CODE_PATTERN = Pattern.compile("\\b(AG_[A-Z0-9_]+)\\b", Pattern.CASE_INSENSITIVE);

    private final ToolRegistry toolRegistry;
    private final RagQueryService ragQueryService;
    private final AiModelClient aiModelClient;
    private final ObjectMapper objectMapper;
    private final PromptInjectionGuard promptInjectionGuard;
    private final AgentTraceService agentTraceService;
    private final ExecutorService toolExecutor;

    @Value("${smartward.agent.max-tool-calls:3}")
    private int maxToolCalls = DEFAULT_MAX_TOOL_CALLS;

    @Value("${smartward.agent.total-timeout-ms:15000}")
    private long totalTimeoutMs = DEFAULT_TOTAL_TIMEOUT_MS;

    @Value("${smartward.agent.llm-planner-enabled:true}")
    private boolean llmPlannerEnabled = true;

    @Autowired
    public CivicSupervisorAgent(ToolRegistry toolRegistry,
                                RagQueryService ragQueryService,
                                @Autowired(required = false) AiModelClient aiModelClient,
                                @Autowired(required = false) ObjectMapper objectMapper,
                                @Autowired(required = false) PromptInjectionGuard promptInjectionGuard,
                                @Autowired(required = false) AgentTraceService agentTraceService) {
        this.toolRegistry = toolRegistry;
        this.ragQueryService = ragQueryService;
        this.aiModelClient = aiModelClient;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.promptInjectionGuard = promptInjectionGuard != null ? promptInjectionGuard : new PromptInjectionGuard();
        this.agentTraceService = agentTraceService;
        this.toolExecutor = Executors.newFixedThreadPool(4, runnable -> {
            Thread t = new Thread(runnable, "civic-agent-worker");
            t.setDaemon(true);
            return t;
        });
    }

    CivicSupervisorAgent(ToolRegistry toolRegistry,
                         RagQueryService ragQueryService,
                         AiModelClient aiModelClient,
                         ObjectMapper objectMapper) {
        this(toolRegistry, ragQueryService, aiModelClient, objectMapper, new PromptInjectionGuard(), null);
    }

    CivicSupervisorAgent(ToolRegistry toolRegistry,
                         RagQueryService ragQueryService,
                         AiModelClient aiModelClient,
                         ObjectMapper objectMapper,
                         int maxToolCalls,
                         long totalTimeoutMs) {
        this(toolRegistry, ragQueryService, aiModelClient, objectMapper, new PromptInjectionGuard(), null);
        this.maxToolCalls = maxToolCalls;
        this.totalTimeoutMs = totalTimeoutMs;
    }

    @PreDestroy
    public void shutdown() {
        toolExecutor.shutdownNow();
    }

    public record PlannedToolCall(String toolName, Map<String, Object> args) {}

    public AgentChatResponse chat(AgentChatRequest request, AgentExecutionContext baseContext) {
        long startMs = System.currentTimeMillis();
        int effectiveMaxCalls = Math.max(1, Math.min(maxToolCalls, DEFAULT_MAX_TOOL_CALLS));
        long effectiveTimeoutMs = Math.max(200L, Math.min(totalTimeoutMs, DEFAULT_TOTAL_TIMEOUT_MS));
        long deadlineMs = startMs + effectiveTimeoutMs;

        AgentRole role = baseContext.role() != null ? baseContext.role() : AgentRole.CITIZEN;
        AgentExecutionContext ctx = new AgentExecutionContext(
                role,
                baseContext.officerBadgeId(),
                baseContext.wardCode(),
                baseContext.clientIp(),
                baseContext.sessionId(),
                request.getMessage(),
                request.getFormType(),
                request.getHistory(),
                deadlineMs
        );

        String message = request.getMessage() != null ? request.getMessage().trim() : "";

        // TASK-039: Screen prompt injection / role spoof / SQL or secret extraction before any Tool or LLM call
        PromptInjectionGuard.InspectionResult guardResult = promptInjectionGuard.inspectUserPrompt(message);
        if (guardResult.flagged()) {
            log.warn("PromptInjectionGuard blocked request (role={}, reason={})", role, guardResult.reason());
            String refusal = "Yêu cầu bị từ chối do chứa mẫu chỉ thị không hợp lệ hoặc dấu hiệu can thiệp hệ thống. "
                    + "Vui lòng đặt câu hỏi hành chính thông thường bằng tiếng Việt.";
            long latency = System.currentTimeMillis() - startMs;
            String traceId = recordTraceSafe(role, ctx.wardCode(), message, refusal, List.of(), latency, true, guardResult.reason());
            return AgentChatResponse.builder()
                    .answer(refusal)
                    .role(role.name())
                    .steps(List.of())
                    .actionCards(List.of())
                    .citations(List.of())
                    .abstained(true)
                    .fallbackUsed(false)
                    .budgetExhausted(false)
                    .injectionBlocked(true)
                    .traceId(traceId)
                    .totalLatencyMs(latency)
                    .disclaimer(AGENT_DISCLAIMER)
                    .build();
        }

        // Explicit RBAC guard when CITIZEN asks strictly for officer/admin internal ward operational analytics
        if (role == AgentRole.CITIZEN && isWardAnalyticsIntent(message)
                && !isDossierIntent(message) && !isFormDraftIntent(message, request.getFormType()) && !isLegalGuidanceIntent(message)) {
            String deniedMsg = "Chức năng thống kê vận hành nội bộ (hồ sơ quá hạn SLA, tổng hợp sự cố cấp xã) chỉ dành cho Cán bộ xã hoặc Quản trị viên đã đăng nhập.";
            long latency = System.currentTimeMillis() - startMs;
            String traceId = recordTraceSafe(role, ctx.wardCode(), message, deniedMsg, List.of(), latency, false, null);
            return AgentChatResponse.builder()
                    .answer(deniedMsg)
                    .role(role.name())
                    .steps(List.of())
                    .actionCards(List.of())
                    .citations(List.of())
                    .abstained(true)
                    .fallbackUsed(false)
                    .budgetExhausted(false)
                    .injectionBlocked(false)
                    .traceId(traceId)
                    .totalLatencyMs(latency)
                    .disclaimer(AGENT_DISCLAIMER)
                    .build();
        }

        List<PlannedToolCall> plan;
        boolean llmFallbackTriggered = false;
        try {
            plan = buildExecutionPlan(ctx);
        } catch (Exception ex) {
            log.warn("Agent planning failed ({}), falling back to deterministic plan", ex.getMessage());
            llmFallbackTriggered = true;
            plan = buildDeterministicPlan(ctx);
        }

        if (plan.isEmpty()) {
            return fallbackToRag(ctx, startMs, true, false);
        }

        boolean budgetExhausted = plan.size() > effectiveMaxCalls;
        List<PlannedToolCall> boundedPlan = plan.size() > effectiveMaxCalls
                ? plan.subList(0, effectiveMaxCalls)
                : plan;

        List<AgentStepDto> executedSteps = new ArrayList<>();
        List<AgentToolResult> results = new ArrayList<>();
        List<AgentActionCard> actionCards = new ArrayList<>();
        Map<String, LegalCitationDto> uniqueCitations = new LinkedHashMap<>();

        String discoveredProcedureName = null;
        String discoveredOfficerFeedback = null;
        boolean anyAbstained = false;

        for (int i = 0; i < boundedPlan.size(); i++) {
            long remainingMs = ctx.remainingBudgetMs();
            if (remainingMs <= 0L) {
                budgetExhausted = true;
                log.warn("CivicSupervisorAgent budget timeout reached after {} steps", i);
                break;
            }

            PlannedToolCall call = boundedPlan.get(i);
            Optional<CivicAgentTool> toolOpt = toolRegistry.findAuthorizedTool(call.toolName(), role);
            if (toolOpt.isEmpty()) {
                log.warn("Skipping unauthorized or unknown tool '{}' for role {}", call.toolName(), role);
                continue;
            }

            CivicAgentTool tool = toolOpt.get();
            Map<String, Object> effectiveArgs = new LinkedHashMap<>(call.args() != null ? call.args() : Map.of());

            // Cross-step context enrichment: pass procedureName from DossierStatusTool into LegalKnowledgeTool
            if (LegalKnowledgeTool.TOOL_NAME.equals(tool.name()) && discoveredProcedureName != null) {
                String baseQ = effectiveArgs.get("question") != null
                        ? String.valueOf(effectiveArgs.get("question"))
                        : message;
                String enrichedQ = baseQ + " (Thủ tục: " + discoveredProcedureName
                        + (discoveredOfficerFeedback != null ? "; Yêu cầu bổ sung: " + discoveredOfficerFeedback : "")
                        + ")";
                effectiveArgs.put("question", enrichedQ);
            }

            long stepStart = System.currentTimeMillis();
            try {
                AgentToolResult toolResult = CompletableFuture
                        .supplyAsync(() -> tool.execute(ctx, effectiveArgs), toolExecutor)
                        .orTimeout(remainingMs, TimeUnit.MILLISECONDS)
                        .join();

                long stepLatency = System.currentTimeMillis() - stepStart;
                executedSteps.add(AgentStepDto.builder()
                        .stepIndex(executedSteps.size() + 1)
                        .toolName(tool.name())
                        .label(tool.displayLabel())
                        .success(toolResult.success())
                        .latencyMs(stepLatency)
                        .build());

                results.add(toolResult);
                if (toolResult.actionCard() != null) {
                    actionCards.add(toolResult.actionCard());
                }
                if (toolResult.citations() != null) {
                    for (LegalCitationDto c : toolResult.citations()) {
                        if (c != null && c.getChunkCode() != null) {
                            uniqueCitations.putIfAbsent(c.getChunkCode(), c);
                        }
                    }
                }
                if (toolResult.abstained()) {
                    anyAbstained = true;
                }
                if (DossierStatusTool.TOOL_NAME.equals(tool.name()) && toolResult.success() && toolResult.data() != null) {
                    Object procName = toolResult.data().get("procedureName");
                    if (procName != null && !String.valueOf(procName).isBlank()) {
                        discoveredProcedureName = String.valueOf(procName);
                    }
                    Object feedback = toolResult.data().get("officerFeedback");
                    if (feedback != null && !String.valueOf(feedback).isBlank()) {
                        discoveredOfficerFeedback = String.valueOf(feedback);
                    }
                }
            } catch (Exception ex) {
                long stepLatency = System.currentTimeMillis() - stepStart;
                log.warn("Tool '{}' execution failed/timed out after {}ms: {}", tool.name(), stepLatency, ex.getMessage());
                executedSteps.add(AgentStepDto.builder()
                        .stepIndex(executedSteps.size() + 1)
                        .toolName(tool.name())
                        .label(tool.displayLabel())
                        .success(false)
                        .latencyMs(stepLatency)
                        .build());
                if (ctx.remainingBudgetMs() <= 0L) {
                    budgetExhausted = true;
                    break;
                }
            }
        }

        // If every step failed or timed out, safely fall back to direct RagQueryService
        boolean anySuccess = results.stream().anyMatch(AgentToolResult::success);
        if (!anySuccess && results.isEmpty()) {
            return fallbackToRag(ctx, startMs, true, budgetExhausted);
        }

        String synthesized = synthesizeAnswer(results, budgetExhausted);
        boolean allAbstained = !results.isEmpty() && results.stream().allMatch(AgentToolResult::abstained);
        long totalLatency = System.currentTimeMillis() - startMs;
        String traceId = recordTraceSafe(role, ctx.wardCode(), message, synthesized, executedSteps, totalLatency, false, null);

        return AgentChatResponse.builder()
                .answer(synthesized)
                .role(role.name())
                .steps(executedSteps)
                .actionCards(actionCards)
                .citations(new ArrayList<>(uniqueCitations.values()))
                .abstained(allAbstained || (anyAbstained && results.size() == 1))
                .fallbackUsed(llmFallbackTriggered)
                .budgetExhausted(budgetExhausted)
                .injectionBlocked(false)
                .traceId(traceId)
                .totalLatencyMs(totalLatency)
                .disclaimer(AGENT_DISCLAIMER)
                .build();
    }

    private String recordTraceSafe(AgentRole role, String wardCode, String prompt, String answer,
                                   List<AgentStepDto> steps, long latencyMs,
                                   boolean injectionFlagged, String injectionReason) {
        if (agentTraceService == null) {
            return null;
        }
        return agentTraceService.recordTrace(role, wardCode, prompt, answer, steps, latencyMs, injectionFlagged, injectionReason);
    }

    private List<PlannedToolCall> buildExecutionPlan(AgentExecutionContext ctx) {
        List<PlannedToolCall> deterministic = buildDeterministicPlan(ctx);
        if (!llmPlannerEnabled || aiModelClient == null || aiModelClient instanceof DeterministicMockAiClient) {
            return deterministic;
        }
        // Only consult external LLM planner if deterministic router produced default single RAG fallback
        // and we have plenty of budget left (> 4s). Any LLM failure falls back cleanly to deterministic plan.
        if (deterministic.size() > 1 || (deterministic.size() == 1 && !LegalKnowledgeTool.TOOL_NAME.equals(deterministic.get(0).toolName()))) {
            return deterministic;
        }
        if (ctx.remainingBudgetMs() < 4000L) {
            return deterministic;
        }

        List<CivicAgentTool> allowedTools = toolRegistry.getToolsForRole(ctx.role());
        String toolCatalog = allowedTools.stream()
                .map(t -> "- " + t.name() + ": " + t.description())
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");

        String systemPrompt = "Bạn là bộ định tuyến công cụ SmartWard AI. Chỉ chọn tối đa " + DEFAULT_MAX_TOOL_CALLS
                + " công cụ từ danh sách sau và trả về DUY NHẤT mảng JSON dạng "
                + "[{\"toolName\":\"...\",\"args\":{...}}]. Danh sách công cụ được phép:\n" + toolCatalog;

        try {
            String raw = aiModelClient.generateChatResponse(systemPrompt, ctx.originalMessage());
            List<PlannedToolCall> parsed = parseLlmPlanJson(raw, ctx.role());
            return parsed.isEmpty() ? deterministic : parsed;
        } catch (Exception ex) {
            log.warn("LLM planner unavailable ({}), using deterministic plan", ex.getMessage());
            return deterministic;
        }
    }

    List<PlannedToolCall> parseLlmPlanJson(String raw, AgentRole role) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        int start = raw.indexOf('[');
        int end = raw.lastIndexOf(']');
        if (start < 0 || end <= start) {
            return List.of();
        }
        try {
            String jsonArray = raw.substring(start, end + 1);
            List<Map<String, Object>> items = objectMapper.readValue(jsonArray, new TypeReference<>() {});
            List<PlannedToolCall> valid = new ArrayList<>();
            for (Map<String, Object> item : items) {
                Object nameObj = item.get("toolName");
                if (nameObj == null) continue;
                String name = String.valueOf(nameObj).trim();
                if (toolRegistry.findAuthorizedTool(name, role).isEmpty()) {
                    continue;
                }
                Map<String, Object> args = item.get("args") instanceof Map<?, ?> m
                        ? castArgsMap(m)
                        : Map.of();
                valid.add(new PlannedToolCall(name, args));
            }
            return valid;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    List<PlannedToolCall> buildDeterministicPlan(AgentExecutionContext ctx) {
        String message = ctx.originalMessage() != null ? ctx.originalMessage() : "";
        AgentRole role = ctx.role() != null ? ctx.role() : AgentRole.CITIZEN;
        List<PlannedToolCall> plan = new ArrayList<>();
        LinkedHashSet<String> scheduled = new LinkedHashSet<>();

        // 1. Dossier Status Lookup
        if (isDossierIntent(message) && toolRegistry.findAuthorizedTool(DossierStatusTool.TOOL_NAME, role).isPresent()) {
            Map<String, Object> args = new LinkedHashMap<>();
            String code = DossierStatusTool.extractDossierCodeFromText(message);
            String last4 = DossierStatusTool.extractLast4FromText(message);
            if (code != null) args.put("dossierCode", code);
            if (last4 != null) args.put("last4Cccd", last4);
            plan.add(new PlannedToolCall(DossierStatusTool.TOOL_NAME, args));
            scheduled.add(DossierStatusTool.TOOL_NAME);
        }

        // 2. Smart Form Draft (Draft-Only)
        if (isFormDraftIntent(message, ctx.preferredFormType())
                && toolRegistry.findAuthorizedTool(SmartFormDraftTool.TOOL_NAME, role).isPresent()) {
            Map<String, Object> args = new LinkedHashMap<>();
            args.put("formType", SmartFormDraftTool.resolveFormType(Map.of(), ctx.preferredFormType(), message));
            plan.add(new PlannedToolCall(SmartFormDraftTool.TOOL_NAME, args));
            scheduled.add(SmartFormDraftTool.TOOL_NAME);
        }

        // 3. Ward Analytics (OFFICER / ADMIN ONLY — invisible to CITIZEN via ToolRegistry)
        if (isWardAnalyticsIntent(message)
                && toolRegistry.findAuthorizedTool(WardAnalyticsTool.TOOL_NAME, role).isPresent()) {
            Map<String, Object> args = new LinkedHashMap<>();
            Matcher m = WARD_CODE_PATTERN.matcher(message);
            if (m.find()) {
                args.put("wardCode", m.group(1).toUpperCase(Locale.ROOT));
            }
            plan.add(new PlannedToolCall(WardAnalyticsTool.TOOL_NAME, args));
            scheduled.add(WardAnalyticsTool.TOOL_NAME);
        }

        // 4. Legal Knowledge RAG (triggered explicitly OR as default fallback when nothing else matched)
        boolean needsLegal = isLegalGuidanceIntent(message) || plan.isEmpty();
        if (needsLegal && !scheduled.contains(LegalKnowledgeTool.TOOL_NAME)
                && toolRegistry.findAuthorizedTool(LegalKnowledgeTool.TOOL_NAME, role).isPresent()) {
            plan.add(new PlannedToolCall(LegalKnowledgeTool.TOOL_NAME, Map.of("question", message)));
        }

        return plan;
    }

    private AgentChatResponse fallbackToRag(AgentExecutionContext ctx, long startMs, boolean fallbackUsed, boolean budgetExhausted) {
        try {
            RagAskRequest ragReq = RagAskRequest.builder()
                    .question(ctx.originalMessage())
                    .sessionId(ctx.sessionId())
                    .history(ctx.history())
                    .build();
            String clientIp = ctx.clientIp() != null ? ctx.clientIp() : "127.0.0.1";
            RagAskResponse ragResp = (ctx.officerBadgeId() != null || ctx.sessionId() != null)
                    ? ragQueryService.askQuestion(ragReq, clientIp, ctx.officerBadgeId(), ctx.sessionId())
                    : ragQueryService.askQuestion(ragReq, clientIp);

            return AgentChatResponse.builder()
                    .answer(ragResp.getAnswer())
                    .role((ctx.role() != null ? ctx.role() : AgentRole.CITIZEN).name())
                    .steps(List.of(AgentStepDto.builder()
                            .stepIndex(1)
                            .toolName(LegalKnowledgeTool.TOOL_NAME)
                            .label("Tra cứu quy định & thủ tục pháp lý (Fallback)")
                            .success(true)
                            .latencyMs(System.currentTimeMillis() - startMs)
                            .build()))
                    .actionCards(List.of())
                    .citations(ragResp.getCitations() != null ? ragResp.getCitations() : List.of())
                    .abstained(ragResp.isAbstained())
                    .fallbackUsed(fallbackUsed)
                    .budgetExhausted(budgetExhausted)
                    .totalLatencyMs(System.currentTimeMillis() - startMs)
                    .disclaimer(ragResp.getDisclaimer() != null ? ragResp.getDisclaimer() : AGENT_DISCLAIMER)
                    .build();
        } catch (Exception ex) {
            log.error("Fallback RAG execution also failed: {}", ex.getMessage());
            return AgentChatResponse.builder()
                    .answer("Hệ thống trợ lý đang tạm quá tải. Vui lòng thử lại sau ít phút hoặc liên hệ trực tiếp Bộ phận Một cửa UBND xã.")
                    .role((ctx.role() != null ? ctx.role() : AgentRole.CITIZEN).name())
                    .steps(List.of())
                    .actionCards(List.of())
                    .citations(List.of())
                    .abstained(true)
                    .fallbackUsed(true)
                    .budgetExhausted(budgetExhausted)
                    .totalLatencyMs(System.currentTimeMillis() - startMs)
                    .disclaimer(AGENT_DISCLAIMER)
                    .build();
        }
    }

    private String synthesizeAnswer(List<AgentToolResult> results, boolean budgetExhausted) {
        if (results.size() == 1) {
            String base = results.get(0).summary();
            return budgetExhausted ? base + "\n\n(Đã dừng tự động theo giới hạn ngân sách tối đa 3 bước xử lý.)" : base;
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < results.size(); i++) {
            AgentToolResult r = results.get(i);
            if (r.summary() != null && !r.summary().isBlank()) {
                if (sb.length() > 0) {
                    sb.append("\n\n");
                }
                sb.append(r.summary().trim());
            }
        }
        if (budgetExhausted) {
            sb.append("\n\n(Đã dừng tự động theo giới hạn tối đa 3 bước gọi công cụ.)");
        }
        return sb.toString();
    }

    private boolean isDossierIntent(String message) {
        if (message == null || message.isBlank()) return false;
        if (DossierStatusTool.extractDossierCodeFromText(message) != null) {
            return true;
        }
        String lower = message.toLowerCase(Locale.ROOT);
        return lower.contains("kiểm tra hồ sơ")
                || lower.contains("tra cứu hồ sơ")
                || lower.contains("tình trạng hồ sơ")
                || lower.contains("tiến độ hồ sơ");
    }

    private boolean isFormDraftIntent(String message, String preferredFormType) {
        if (preferredFormType != null && !preferredFormType.isBlank()) {
            return true;
        }
        if (message == null || message.isBlank()) return false;
        String lower = message.toLowerCase(Locale.ROOT);
        return lower.contains("điền tờ khai")
                || lower.contains("điền nháp")
                || lower.contains("tạo tờ khai")
                || lower.contains("soạn tờ khai")
                || lower.contains("lập tờ khai")
                || lower.contains("điền sẵn")
                || lower.contains("mẫu ct01")
                || lower.contains("tk-ks")
                || lower.contains("tk-kh")
                || lower.contains("tk-btxh");
    }

    private boolean isWardAnalyticsIntent(String message) {
        if (message == null || message.isBlank()) return false;
        String lower = message.toLowerCase(Locale.ROOT);
        return lower.contains("thống kê")
                || lower.contains("quá hạn sla")
                || lower.contains("sắp quá hạn")
                || lower.contains("tồn đọng")
                || lower.contains("bao nhiêu hồ sơ")
                || lower.contains("cụm sự cố")
                || lower.contains("điểm sự cố")
                || lower.contains("báo cáo vận hành");
    }

    private boolean isLegalGuidanceIntent(String message) {
        if (message == null || message.isBlank()) return false;
        String lower = message.toLowerCase(Locale.ROOT);
        return lower.contains("giấy tờ")
                || lower.contains("bổ sung")
                || lower.contains("thủ tục")
                || lower.contains("quy định")
                || lower.contains("điều kiện")
                || lower.contains("lệ phí")
                || lower.contains("bao lâu")
                || lower.contains("cần chuẩn bị")
                || lower.contains("hướng dẫn");
    }

    private Map<String, Object> castArgsMap(Map<?, ?> raw) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (Map.Entry<?, ?> e : raw.entrySet()) {
            if (e.getKey() != null && e.getValue() != null) {
                map.put(String.valueOf(e.getKey()), e.getValue());
            }
        }
        return map;
    }
}
