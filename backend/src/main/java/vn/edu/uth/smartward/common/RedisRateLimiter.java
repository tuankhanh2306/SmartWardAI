package vn.edu.uth.smartward.common;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Distributed Token/Window Rate Limiter powered by Redis.
 * Enforces strict limits (default: 5 requests/minute per client IP)
 * to protect Gemini Free-Tier API limits and prevent DoS attacks.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RedisRateLimiter {

    private final StringRedisTemplate stringRedisTemplate;

    @Value("${smartward.rate-limit.requests-per-minute:5}")
    private int maxRequestsPerMinute;

    private static final String RATE_LIMIT_PREFIX = "smartward:ratelimit:";

    /**
     * Checks if a client IP is allowed to execute a new request.
     * Uses atomic Redis INCR with automatic 60-second window expiry.
     *
     * @param clientIp IP address of the caller
     * @return true if allowed, false if rate limit exceeded
     */
    public boolean allowRequest(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            clientIp = "anonymous";
        }

        String key = RATE_LIMIT_PREFIX + clientIp;
        try {
            Long currentCount = stringRedisTemplate.opsForValue().increment(key);

            if (currentCount != null && currentCount == 1) {
                // Set TTL of 60 seconds on first request in window
                stringRedisTemplate.expire(key, Duration.ofSeconds(60));
            }

            if (currentCount != null && currentCount > maxRequestsPerMinute) {
                log.warn("Rate limit EXCEEDED for IP: {} (Count: {}/{})", clientIp, currentCount, maxRequestsPerMinute);
                return false;
            }

            log.debug("Rate limit OK for IP: {} (Count: {}/{})", clientIp, currentCount, maxRequestsPerMinute);
            return true;

        } catch (Exception e) {
            log.warn("Redis unavailable for rate-limiting, failing open to preserve availability: {}", e.getMessage());
            return true;
        }
    }

    /**
     * Returns remaining requests allowed in the current minute window.
     */
    public long getRemainingRequests(String clientIp) {
        String key = RATE_LIMIT_PREFIX + clientIp;
        try {
            String val = stringRedisTemplate.opsForValue().get(key);
            long count = val != null ? Long.parseLong(val) : 0;
            return Math.max(0, maxRequestsPerMinute - count);
        } catch (Exception e) {
            return maxRequestsPerMinute;
        }
    }
}
