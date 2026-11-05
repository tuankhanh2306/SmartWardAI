package vn.edu.uth.smartward.ai;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SidecarAiModelClientTest {

    @Mock
    private DeterministicMockAiClient fallbackMock;

    private SidecarAiModelClient sidecarClient;

    @BeforeEach
    void setUp() {
        sidecarClient = new SidecarAiModelClient(true, "http://localhost:8000", 100, fallbackMock);
    }

    @Test
    @DisplayName("When sidecar is disabled, should delegate immediately to fallback mock")
    void testGenerateEmbedding_whenDisabled_shouldUseFallback() {
        SidecarAiModelClient disabledClient = new SidecarAiModelClient(false, "http://localhost:8000", 100, fallbackMock);
        float[] mockVec = new float[768];
        when(fallbackMock.generateEmbedding("khai sinh")).thenReturn(mockVec);

        float[] result = disabledClient.generateEmbedding("khai sinh");

        assertNotNull(result);
        assertEquals(768, result.length);
        verify(fallbackMock).generateEmbedding("khai sinh");
    }

    @Test
    @DisplayName("When sidecar is unreachable, should catch exception and return fallback embedding")
    void testGenerateEmbedding_whenSidecarUnreachable_shouldFallbackGracefully() {
        // http://localhost:8000 is not running during this unit test
        float[] mockVec = new float[768];
        mockVec[0] = 0.5f;
        when(fallbackMock.generateEmbedding(anyString())).thenReturn(mockVec);

        float[] result = sidecarClient.generateEmbedding("Thủ tục kết hôn");

        assertNotNull(result);
        assertEquals(768, result.length);
        assertEquals(0.5f, result[0]);
        verify(fallbackMock).generateEmbedding("Thủ tục kết hôn");
    }

    @Test
    @DisplayName("Delegates chat and vision OCR directly to fallback mock")
    void testChatAndOcr_delegateToFallback() {
        when(fallbackMock.generateChatResponse("sys", "user")).thenReturn("mock chat response");
        when(fallbackMock.performVisionOcr(new byte[]{1, 2}, "image/png")).thenReturn("{\"status\":\"ok\"}");

        String chat = sidecarClient.generateChatResponse("sys", "user");
        String ocr = sidecarClient.performVisionOcr(new byte[]{1, 2}, "image/png");

        assertEquals("mock chat response", chat);
        assertEquals("{\"status\":\"ok\"}", ocr);
    }
}
