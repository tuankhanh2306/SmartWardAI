package vn.edu.uth.smartward.agent;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import vn.edu.uth.smartward.common.MaskingMessageConverter;
import vn.edu.uth.smartward.rag.dto.ConversationTurnDto;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Short-lived Redis conversational memory for CivicSupervisorAgent (TASK-041).
 * Invariants:
 * - Key namespace: smartward:agent:mem:<sessionId> (strictly isolated from Vault OTT & Redis GEO keys)
 * - TTL: 30 minutes sliding expiration
 * - Max 6 turns AND hard <= 8 KB UTF-8 JSON cap to protect Redis 100 MiB noeviction budget
 * - All user & assistant turns are PII-masked via MaskingMessageConverter before writing
 */
@Slf4j
@Service
public class AgentSessionMemoryService {

    public static final String KEY_PREFIX = "smartward:agent:mem:";
    public static final Duration SESSION_TTL = Duration.ofMinutes(30);
    public static final int MAX_TURNS = 6;
    public static final int MAX_BYTES_PER_SESSION = 8 * 1024;
    static final int MAX_TURN_CHARS = 480;

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Autowired
    public AgentSessionMemoryService(@Autowired(required = false) StringRedisTemplate redisTemplate,
                                     @Autowired(required = false) ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public String buildKey(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return null;
        }
        String sanitized = sessionId.trim().replaceAll("[^A-Za-z0-9_\\-:.]", "");
        if (sanitized.isEmpty()) {
            return null;
        }
        if (sanitized.length() > 64) {
            sanitized = sanitized.substring(0, 64);
        }
        return KEY_PREFIX + sanitized;
    }

    public List<ConversationTurnDto> getHistory(String sessionId) {
        String key = buildKey(sessionId);
        if (key == null || redisTemplate == null) {
            return List.of();
        }
        try {
            String raw = redisTemplate.opsForValue().get(key);
            if (raw == null || raw.isBlank()) {
                return List.of();
            }
            List<ConversationTurnDto> parsed = objectMapper.readValue(raw, new TypeReference<>() {});
            return parsed != null ? parsed : List.of();
        } catch (Exception ex) {
            log.debug("Unable to read agent session memory [{}]: {}", key, ex.getMessage());
            return List.of();
        }
    }

    public List<ConversationTurnDto> appendExchange(String sessionId,
                                                    String rawUserMessage,
                                                    String rawAssistantAnswer,
                                                    String procedureCode) {
        String key = buildKey(sessionId);
        if (key == null || redisTemplate == null) {
            return List.of();
        }

        List<ConversationTurnDto> turns = new ArrayList<>(getHistory(sessionId));
        if (rawUserMessage != null && !rawUserMessage.isBlank()) {
            turns.add(ConversationTurnDto.builder()
                    .role("citizen")
                    .content(sanitizeAndTruncate(rawUserMessage, MAX_TURN_CHARS))
                    .procedureCode(procedureCode)
                    .build());
        }
        if (rawAssistantAnswer != null && !rawAssistantAnswer.isBlank()) {
            turns.add(ConversationTurnDto.builder()
                    .role("assistant")
                    .content(sanitizeAndTruncate(rawAssistantAnswer, MAX_TURN_CHARS))
                    .procedureCode(procedureCode)
                    .build());
        }

        while (turns.size() > MAX_TURNS) {
            turns.remove(0);
        }

        try {
            String serialized = enforceByteBudget(turns);
            redisTemplate.opsForValue().set(key, serialized, SESSION_TTL);
            return turns;
        } catch (Exception ex) {
            log.warn("Failed to persist agent session memory [{}]: {}", key, ex.getMessage());
            return turns;
        }
    }

    public void clearSession(String sessionId) {
        String key = buildKey(sessionId);
        if (key == null || redisTemplate == null) {
            return;
        }
        try {
            redisTemplate.delete(key);
        } catch (Exception ex) {
            log.debug("Failed to clear agent session memory [{}]: {}", key, ex.getMessage());
        }
    }

    String enforceByteBudget(List<ConversationTurnDto> turns) throws Exception {
        String json = objectMapper.writeValueAsString(turns);
        while (json.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES_PER_SESSION && turns.size() > 1) {
            turns.remove(0);
            json = objectMapper.writeValueAsString(turns);
        }
        if (json.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES_PER_SESSION && !turns.isEmpty()) {
            ConversationTurnDto last = turns.get(turns.size() - 1);
            String c = last.getContent() != null ? last.getContent() : "";
            while (json.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES_PER_SESSION && c.length() > 32) {
                c = c.substring(0, c.length() / 2);
                last.setContent(c);
                json = objectMapper.writeValueAsString(turns);
            }
        }
        return json;
    }

    private static String sanitizeAndTruncate(String text, int maxChars) {
        String masked = MaskingMessageConverter.maskSensitiveData(text.trim());
        return masked.length() <= maxChars ? masked : masked.substring(0, maxChars);
    }
}
