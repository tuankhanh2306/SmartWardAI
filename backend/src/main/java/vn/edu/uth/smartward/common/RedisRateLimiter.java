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
     * Alias for allowRequest.
     */
    public boolean isAllowed(String clientIp) {
        return allowRequest(clientIp);
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

    private final java.util.concurrent.ConcurrentHashMap<String, TrackingWindow> inMemoryTrackingLimits = new java.util.concurrent.ConcurrentHashMap<>();

    private static class TrackingWindow {
        int count;
        long expiresAtEpochMs;
    }

    /**
     * SEC-04 Rate limiting: 5 tracking attempts per 15 minutes per (IP, dossierCode).
     * Atomic Redis INCR with automatic 15-minute expiration and resilient in-memory fallback.
     */
    public boolean allowDossierTracking(String clientIp, String dossierCode) {
        String safeIp = (clientIp != null && !clientIp.isBlank()) ? clientIp.trim() : "anonymous";
        String safeCode = (dossierCode != null && !dossierCode.isBlank()) ? dossierCode.trim().toUpperCase() : "empty";
        String key = "smartward:ratelimit:track:" + safeIp + ":" + safeCode;

        try {
            if (stringRedisTemplate != null) {
                Long currentCount = stringRedisTemplate.opsForValue().increment(key);
                if (currentCount != null && currentCount == 1) {
                    stringRedisTemplate.expire(key, Duration.ofMinutes(15));
                }
                if (currentCount != null && currentCount > 5) {
                    log.warn("Dossier tracking rate limit EXCEEDED for IP: {} on dossier: {} (Count: {}/5)", safeIp, safeCode, currentCount);
                    return false;
                }
                return true;
            }
        } catch (Exception e) {
            log.warn("Redis unavailable for dossier tracking rate limit, using in-memory guard: {}", e.getMessage());
        }

        long now = System.currentTimeMillis();
        TrackingWindow window = inMemoryTrackingLimits.compute(key, (k, existing) -> {
            if (existing == null || existing.expiresAtEpochMs < now) {
                TrackingWindow nw = new TrackingWindow();
                nw.count = 1;
                nw.expiresAtEpochMs = now + (15 * 60 * 1000L);
                return nw;
            }
            existing.count++;
            return existing;
        });

        if (window.count > 5) {
            log.warn("In-memory tracking rate limit EXCEEDED for key {} (Count: {}/5)", key, window.count);
            return false;
        }
        return true;
    }

    private final java.util.concurrent.ConcurrentHashMap<String, TrackingWindow> inMemoryVaultLimits = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * Enforces Vault upload limits: 20 uploads / 10 minutes per real client IP,
     * plus optional session quota of 10 uploads / 30 minutes per X-Upload-Session.
     */
    public boolean allowVaultUpload(String clientIp, String uploadSessionId) {
        String safeIp = (clientIp != null && !clientIp.isBlank()) ? clientIp.trim() : "anonymous";
        if (!checkWindowLimit("smartward:ratelimit:vault:ip:" + safeIp, 20, Duration.ofMinutes(10))) {
            log.warn("Vault upload rate limit EXCEEDED for IP: {} (>20 / 10m)", safeIp);
            return false;
        }
        if (uploadSessionId != null && !uploadSessionId.isBlank()) {
            String safeSession = uploadSessionId.trim().replaceAll("[^a-zA-Z0-9._-]", "_");
            if (!checkWindowLimit("smartward:ratelimit:vault:session:" + safeSession, 10, Duration.ofMinutes(30))) {
                log.warn("Vault upload session quota EXCEEDED for session: {} (>10 / 30m)", safeSession);
                return false;
            }
        }
        return true;
    }

    private boolean checkWindowLimit(String key, int maxLimit, Duration ttl) {
        try {
            if (stringRedisTemplate != null) {
                Long currentCount = stringRedisTemplate.opsForValue().increment(key);
                if (currentCount != null && currentCount == 1) {
                    stringRedisTemplate.expire(key, ttl);
                }
                if (currentCount != null && currentCount > maxLimit) {
                    return false;
                }
                return true;
            }
        } catch (Exception e) {
            log.warn("Redis unavailable for vault rate limit, falling back to in-memory guard: {}", e.getMessage());
        }

        long now = System.currentTimeMillis();
        long ttlMs = ttl.toMillis();
        TrackingWindow window = inMemoryVaultLimits.compute(key, (k, existing) -> {
            if (existing == null || existing.expiresAtEpochMs < now) {
                TrackingWindow nw = new TrackingWindow();
                nw.count = 1;
                nw.expiresAtEpochMs = now + ttlMs;
                return nw;
            }
            existing.count++;
            return existing;
        });
        return window.count <= maxLimit;
    }
}
