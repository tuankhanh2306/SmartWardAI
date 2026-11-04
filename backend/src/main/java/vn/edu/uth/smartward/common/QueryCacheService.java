package vn.edu.uth.smartward.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Optional;

/**
 * Distributed Semantic Query Cache on Redis.
 * Caches repeated citizen legal queries with TTL 1 hour (3600 seconds)
 * to reduce LLM latency from ~1200ms to < 10ms and save API quota.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QueryCacheService {

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    private static final String CACHE_PREFIX = "smartward:cache:rag:";
    private static final long DEFAULT_TTL_SECONDS = 3600; // 1 hour

    /**
     * Retrieves cached RAG response for a query.
     */
    public <T> Optional<T> getCachedResponse(String query, Class<T> targetClass) {
        String cacheKey = buildCacheKey(query);
        try {
            String jsonVal = stringRedisTemplate.opsForValue().get(cacheKey);
            if (jsonVal != null && !jsonVal.isBlank()) {
                log.info("RAG Cache HIT for query: '{}' (Key: {})", truncate(query), cacheKey);
                return Optional.of(objectMapper.readValue(jsonVal, targetClass));
            }
        } catch (Exception e) {
            log.warn("Cache read failed for key {}: {}", cacheKey, e.getMessage());
        }
        return Optional.empty();
    }

    /**
     * Stores a response in Redis cache with default 1-hour TTL.
     */
    public void putResponse(String query, Object response) {
        putResponse(query, response, DEFAULT_TTL_SECONDS);
    }

    /**
     * Stores a response in Redis cache with explicit TTL.
     */
    public void putResponse(String query, Object response, long ttlSeconds) {
        String cacheKey = buildCacheKey(query);
        try {
            String jsonVal = objectMapper.writeValueAsString(response);
            stringRedisTemplate.opsForValue().set(cacheKey, jsonVal, Duration.ofSeconds(ttlSeconds));
            log.info("Cached RAG response for query: '{}' (TTL: {}s)", truncate(query), ttlSeconds);
        } catch (Exception e) {
            log.warn("Cache write failed for key {}: {}", cacheKey, e.getMessage());
        }
    }

    /**
     * Normalizes query and generates an MD5/SHA-256 cache key.
     */
    public String buildCacheKey(String query) {
        String normalized = query == null ? "" : query.toLowerCase()
                .replaceAll("\\p{Punct}", "")
                .replaceAll("\\s+", " ")
                .trim();
        return CACHE_PREFIX + hashString(normalized);
    }

    private String hashString(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.substring(0, 16); // 16-char prefix
        } catch (NoSuchAlgorithmException e) {
            return String.valueOf(input.hashCode());
        }
    }

    private String truncate(String text) {
        if (text == null) return "";
        return text.length() > 40 ? text.substring(0, 40) + "..." : text;
    }
}
