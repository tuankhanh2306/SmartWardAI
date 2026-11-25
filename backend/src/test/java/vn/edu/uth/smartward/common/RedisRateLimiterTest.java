package vn.edu.uth.smartward.common;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RedisRateLimiterTest {

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private RedisRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        rateLimiter = new RedisRateLimiter(stringRedisTemplate);
        ReflectionTestUtils.setField(rateLimiter, "maxRequestsPerMinute", 5);
    }

    @Test
    void testAllowRequest_shouldAllowWhenBelowLimit() {
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(anyString())).thenReturn(1L);

        boolean allowed = rateLimiter.allowRequest("127.0.0.1");

        assertTrue(allowed, "First request in window should be allowed");
        verify(stringRedisTemplate, times(1)).expire(anyString(), eq(Duration.ofSeconds(60)));
    }

    @Test
    void testAllowRequest_shouldBlockWhenExceedingLimit() {
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(anyString())).thenReturn(6L);

        boolean allowed = rateLimiter.allowRequest("192.168.1.100");

        assertFalse(allowed, "6th request within 1-minute window should be blocked");
    }

    @Test
    void testAllowRequest_shouldFailOpenWhenRedisThrowsException() {
        when(stringRedisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis connection refused"));

        boolean allowed = rateLimiter.allowRequest("10.0.0.1");

        assertTrue(allowed, "Rate limiter should fail open to preserve system availability if Redis is down");
    }

    @Test
    void testSharedUbndWifi_distinctCitizenSessionsHaveIndependentQuotas() {
        java.util.Map<String, Long> counters = new java.util.concurrent.ConcurrentHashMap<>();
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(anyString())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            return counters.merge(key, 1L, Long::sum);
        });

        String sharedWifiIp = "192.168.10.25";

        // Citizen A exhausts all 5 requests/min on shared UBND Wi-Fi
        for (int i = 0; i < 5; i++) {
            assertTrue(rateLimiter.isAllowed(sharedWifiIp, null, "citizen-session-A"));
        }
        assertFalse(rateLimiter.isAllowed(sharedWifiIp, null, "citizen-session-A"),
                "Citizen A should be rate-limited on 6th request");

        // Citizen B on the exact same UBND Wi-Fi IP must STILL have full independent quota
        for (int i = 0; i < 5; i++) {
            assertTrue(rateLimiter.isAllowed(sharedWifiIp, null, "citizen-session-B"),
                    "Citizen B sharing UBND Wi-Fi IP must not be blocked by Citizen A");
        }
        assertFalse(rateLimiter.isAllowed(sharedWifiIp, null, "citizen-session-B"));
    }

    @Test
    void testSharedUbndWifi_distinctOfficerJwtsHaveIndependentQuotas_andTakePrecedenceOverSession() {
        java.util.Map<String, Long> counters = new java.util.concurrent.ConcurrentHashMap<>();
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(anyString())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            return counters.merge(key, 1L, Long::sum);
        });

        String sharedCounterIp = "10.20.30.40";

        // Officer 1 exhausts quota
        for (int i = 0; i < 5; i++) {
            assertTrue(rateLimiter.isAllowed(sharedCounterIp, "CC-AG-8942", "shared-kiosk-session"));
        }
        assertFalse(rateLimiter.isAllowed(sharedCounterIp, "CC-AG-8942", "shared-kiosk-session"));

        // Officer 2 at the same counter IP (and even same browser session) has independent JWT quota
        assertTrue(rateLimiter.isAllowed(sharedCounterIp, "CC-AG-1001", "shared-kiosk-session"));
        assertTrue(counters.containsKey("smartward:ratelimit:jwt:CC-AG-8942"));
        assertTrue(counters.containsKey("smartward:ratelimit:jwt:CC-AG-1001"));
    }

    @Test
    void testDossierTracking_distinctSessionsSharingIpHaveIndependentBuckets() {
        java.util.Map<String, Long> counters = new java.util.concurrent.ConcurrentHashMap<>();
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(anyString())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            return counters.merge(key, 1L, Long::sum);
        });

        String sharedWifiIp = "192.168.10.25";
        String dossierCode = "HS-20261125-AG-0001";

        for (int i = 0; i < 5; i++) {
            assertTrue(rateLimiter.allowDossierTracking(sharedWifiIp, dossierCode, null, "sess-1"));
        }
        assertFalse(rateLimiter.allowDossierTracking(sharedWifiIp, dossierCode, null, "sess-1"));

        // Different citizen session on the same Wi-Fi IP is not blocked
        assertTrue(rateLimiter.allowDossierTracking(sharedWifiIp, dossierCode, null, "sess-2"));
    }
}
