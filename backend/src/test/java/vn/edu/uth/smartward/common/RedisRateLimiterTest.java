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
}
