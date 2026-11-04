package vn.edu.uth.smartward.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QueryCacheServiceTest {

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private QueryCacheService cacheService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        cacheService = new QueryCacheService(stringRedisTemplate, objectMapper);
    }

    @Test
    void testBuildCacheKey_shouldNormalizeWhitespaceAndPunctuation() {
        String q1 = "Làm khai sinh mất bao lâu???";
        String q2 = "  làm khai sinh mất bao lâu   ";

        String key1 = cacheService.buildCacheKey(q1);
        String key2 = cacheService.buildCacheKey(q2);

        assertEquals(key1, key2, "Normalized queries should generate the same cache key");
        assertTrue(key1.startsWith("smartward:cache:rag:"));
    }

    @Test
    void testGetCachedResponse_shouldReturnEmptyWhenKeyNotFound() {
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn(null);

        Optional<String> result = cacheService.getCachedResponse("câu hỏi chưa từng hỏi", String.class);

        assertTrue(result.isEmpty());
    }

    @Test
    void testGetCachedResponse_shouldReturnParsedObjectOnHit() {
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn("\"Đáp án từ cache\"");

        Optional<String> result = cacheService.getCachedResponse("thủ tục kết hôn", String.class);

        assertTrue(result.isPresent());
        assertEquals("Đáp án từ cache", result.get());
    }
}
