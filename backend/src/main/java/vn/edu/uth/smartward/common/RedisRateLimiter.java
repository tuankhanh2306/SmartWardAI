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
    private int maxRequestsPerMinute = 5;

    @Value("${smartward.rate-limit.vault-uploads-per-window:20}")
    private int maxVaultUploadsPerWindow = 20;

    private static final String RATE_LIMIT_PREFIX = "smartward:ratelimit:";

    /**
     * Resolves the rate-limit actor identity with strict precedence:
     * 1. Authenticated Officer/Admin JWT badgeId ("jwt:<BADGE>")
     * 2. Citizen session identifier ("session:<SESSION_ID>")
     * 3. Fallback to real client IP ("<IP>")
     *
     * Prevents shared Wi-Fi / NAT networks at Commune People's Committees (UBND)
     * from causing different citizens or officers to block one another.
     */
    public String resolveActorKey(String clientIp, String officerBadgeId, String sessionId) {
        if (officerBadgeId != null && !officerBadgeId.isBlank()) {
            return "jwt:" + sanitizeKeySegment(officerBadgeId.trim().toUpperCase());
        }
        if (sessionId != null && !sessionId.isBlank()) {
            return "session:" + sanitizeKeySegment(sessionId.trim());
        }
        return (clientIp != null && !clientIp.isBlank()) ? clientIp.trim() : "anonymous";
    }

    private String sanitizeKeySegment(String raw) {
        String cleaned = raw.replaceAll("[^a-zA-Z0-9._:-]", "_");
        return cleaned.length() > 128 ? cleaned.substring(0, 128) : cleaned;
    }

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
                log.warn("Rate limit EXCEEDED for actor: {} (Count: {}/{})", clientIp, currentCount, maxRequestsPerMinute);
                return false;
            }

            log.debug("Rate limit OK for actor: {} (Count: {}/{})", clientIp, currentCount, maxRequestsPerMinute);
            return true;

        } catch (Exception e) {
            log.warn("Redis unavailable for rate-limiting, failing open to preserve availability: {}", e.getMessage());
            return true;
        }
    }

    /**
     * Checks if a caller (scoped by Officer JWT > citizen sessionId > client IP) is allowed.
     */
    public boolean allowRequest(String clientIp, String officerBadgeId, String sessionId) {
        return allowRequest(resolveActorKey(clientIp, officerBadgeId, sessionId));
    }

    /**
     * Alias for allowRequest.
     */
    public boolean isAllowed(String clientIp) {
        return allowRequest(clientIp);
    }

    /**
     * Alias for JWT / sessionId / IP scoped allowRequest.
     */
    public boolean isAllowed(String clientIp, String officerBadgeId, String sessionId) {
        return allowRequest(clientIp, officerBadgeId, sessionId);
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

    /**
     * Returns remaining requests allowed in the current minute window for a scoped actor.
     */
    public long getRemainingRequests(String clientIp, String officerBadgeId, String sessionId) {
        return getRemainingRequests(resolveActorKey(clientIp, officerBadgeId, sessionId));
    }

    private final java.util.concurrent.ConcurrentHashMap<String, TrackingWindow> inMemoryTrackingLimits = new java.util.concurrent.ConcurrentHashMap<>();

    private static class TrackingWindow {
        int count;
        long expiresAtEpochMs;
    }

    /**
     * SEC-04 Rate limiting: 5 tracking attempts per 15 minutes per (actor, dossierCode).
     * Backward-compatible IP-only overload.
     */
    public boolean allowDossierTracking(String clientIp, String dossierCode) {
        return allowDossierTracking(clientIp, dossierCode, null, null);
    }

    /**
     * SEC-04 Rate limiting: 5 tracking attempts per 15 minutes per (JWT / sessionId / IP, dossierCode).
     * Atomic Redis INCR with automatic 15-minute expiration and resilient in-memory fallback.
     */
    public boolean allowDossierTracking(String clientIp, String dossierCode, String officerBadgeId, String sessionId) {
        String actorKey = resolveActorKey(clientIp, officerBadgeId, sessionId);
        String safeCode = (dossierCode != null && !dossierCode.isBlank()) ? dossierCode.trim().toUpperCase() : "empty";
        String key = "smartward:ratelimit:track:" + actorKey + ":" + safeCode;

        try {
            if (stringRedisTemplate != null) {
                Long currentCount = stringRedisTemplate.opsForValue().increment(key);
                if (currentCount != null && currentCount == 1) {
                    stringRedisTemplate.expire(key, Duration.ofMinutes(15));
                }
                if (currentCount != null && currentCount > 5) {
                    log.warn("Dossier tracking rate limit EXCEEDED for actor: {} on dossier: {} (Count: {}/5)", actorKey, safeCode, currentCount);
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
        return allowVaultUpload(clientIp, uploadSessionId, null);
    }

    /**
     * Enforces Vault upload limits scoped by Officer JWT > X-Upload-Session > Client IP
     * so shared UBND Wi-Fi networks do not cause cross-citizen/officer lockouts.
     */
    public boolean allowVaultUpload(String clientIp, String uploadSessionId, String officerBadgeId) {
        if (officerBadgeId != null && !officerBadgeId.isBlank()) {
            String safeBadge = sanitizeKeySegment(officerBadgeId.trim().toUpperCase());
            if (!checkWindowLimit("smartward:ratelimit:vault:jwt:" + safeBadge, maxVaultUploadsPerWindow, Duration.ofMinutes(10))) {
                log.warn("Vault upload rate limit EXCEEDED for officer JWT: {} (>{} / 10m)", safeBadge, maxVaultUploadsPerWindow);
                return false;
            }
            return true;
        }

        String safeIp = (clientIp != null && !clientIp.isBlank()) ? clientIp.trim() : "anonymous";
        if (uploadSessionId != null && !uploadSessionId.isBlank()) {
            String safeSession = sanitizeKeySegment(uploadSessionId.trim());
            if (!checkWindowLimit("smartward:ratelimit:vault:session:" + safeSession, 10, Duration.ofMinutes(30))) {
                log.warn("Vault upload session quota EXCEEDED for session: {} (>10 / 30m)", safeSession);
                return false;
            }
            // High NAT ceiling per shared IP prevents volumetric abuse while keeping distinct counter sessions isolated
            int natCeiling = Math.max(maxVaultUploadsPerWindow * 5, 100);
            if (!checkWindowLimit("smartward:ratelimit:vault:nat:" + safeIp, natCeiling, Duration.ofMinutes(10))) {
                log.warn("Vault upload shared-NAT ceiling EXCEEDED for IP: {} (>{} / 10m)", safeIp, natCeiling);
                return false;
            }
            return true;
        }

        if (!checkWindowLimit("smartward:ratelimit:vault:ip:" + safeIp, maxVaultUploadsPerWindow, Duration.ofMinutes(10))) {
            log.warn("Vault upload rate limit EXCEEDED for IP: {} (>{} / 10m)", safeIp, maxVaultUploadsPerWindow);
            return false;
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
