package vn.edu.uth.smartward.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import vn.edu.uth.smartward.agent.dto.AgentChatResponse.AgentStepDto;
import vn.edu.uth.smartward.common.MaskingMessageConverter;
import vn.edu.uth.smartward.security.CorrelationIdFilter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Persists PII-masked Civic AI Agent execution traces linked with X-Correlation-ID (TASK-039).
 */
@Slf4j
@Service
public class AgentTraceService {

    private final AgentTraceRepository traceRepository;
    private final ObjectMapper objectMapper;

    @Autowired
    public AgentTraceService(@Autowired(required = false) AgentTraceRepository traceRepository,
                             @Autowired(required = false) ObjectMapper objectMapper) {
        this.traceRepository = traceRepository;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public String recordTrace(AgentRole role,
                              String wardCode,
                              String rawPrompt,
                              String rawAnswer,
                              List<AgentStepDto> steps,
                              long latencyMs,
                              boolean injectionFlagged,
                              String injectionReason) {
        String traceId = "TRC-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
        String correlationId = MDC.get(CorrelationIdFilter.MDC_KEY);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }

        String maskedPrompt = MaskingMessageConverter.maskSensitiveData(truncate(rawPrompt, 1000));
        String stepsJson = serializeStepsMasked(steps);
        int estimatedTokens = estimateTokens(rawPrompt, rawAnswer);

        AgentTrace entity = AgentTrace.builder()
                .traceId(traceId)
                .correlationId(correlationId)
                .actorRole(role != null ? role.name() : AgentRole.CITIZEN.name())
                .wardCode(wardCode)
                .userPromptMasked(maskedPrompt)
                .stepsJson(stepsJson)
                .latencyMs(Math.max(0L, latencyMs))
                .tokenUsage(estimatedTokens)
                .injectionFlagged(injectionFlagged)
                .injectionReason(truncate(injectionReason, 120))
                .createdAt(Instant.now())
                .build();

        if (traceRepository != null) {
            try {
                traceRepository.save(entity);
            } catch (Exception ex) {
                log.warn("Failed to persist agent trace [{}]: {}", traceId, ex.getMessage());
            }
        }
        return traceId;
    }

    private String serializeStepsMasked(List<AgentStepDto> steps) {
        if (steps == null || steps.isEmpty()) {
            return "[]";
        }
        try {
            String rawJson = objectMapper.writeValueAsString(steps);
            return MaskingMessageConverter.maskSensitiveData(rawJson);
        } catch (Exception ex) {
            return "[]";
        }
    }

    static int estimateTokens(String prompt, String answer) {
        int chars = (prompt != null ? prompt.length() : 0) + (answer != null ? answer.length() : 0);
        return Math.max(1, (int) Math.ceil(chars / 4.0));
    }

    private static String truncate(String text, int maxLen) {
        if (text == null) return null;
        return text.length() <= maxLen ? text : text.substring(0, maxLen);
    }
}
