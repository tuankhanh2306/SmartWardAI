package vn.edu.uth.smartward.ai;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DeterministicMockAiClientTest {

    private DeterministicMockAiClient aiClient;

    @BeforeEach
    void setUp() {
        aiClient = new DeterministicMockAiClient();
    }

    @Test
    void testGenerateEmbedding_shouldProduce768DimUnitNormalizedVector() {
        String text = "Thủ tục đăng ký khai sinh tại UBND xã";
        float[] vector = aiClient.generateEmbedding(text);

        assertNotNull(vector);
        assertEquals(768, vector.length, "Embedding must have exactly 768 dimensions");

        // Verify L2 norm ~ 1.0
        double sumSq = 0.0;
        for (float v : vector) {
            sumSq += v * v;
        }
        double norm = Math.sqrt(sumSq);
        assertEquals(1.0, norm, 1e-4, "Embedding must be unit L2 normalized");
    }

    @Test
    void testGenerateEmbedding_mustBeDeterministic() {
        String text = "Đăng ký thường trú cho công dân";
        float[] v1 = aiClient.generateEmbedding(text);
        float[] v2 = aiClient.generateEmbedding(text);

        assertArrayEquals(v1, v2, "Identical input text must yield identical embedding vector");
    }

    @Test
    void testToPgVectorString_shouldFormatCorrectly() {
        float[] sample = new float[]{0.1f, -0.2f, 0.5f};
        String pgStr = aiClient.toPgVectorString(sample);

        assertTrue(pgStr.startsWith("["));
        assertTrue(pgStr.endsWith("]"));
        assertTrue(pgStr.contains("0.1, -0.2, 0.5"));
    }

    @Test
    void testPerformVisionOcr_shouldContainStructuredJson() {
        byte[] mockBytes = new byte[]{1, 2, 3, 4};
        String ocrJson = aiClient.performVisionOcr(mockBytes, "image/png");

        assertNotNull(ocrJson);
        assertTrue(ocrJson.contains("fullName"));
        assertTrue(ocrJson.contains("cccdNumber"));
        assertTrue(ocrJson.contains("079095012345"));
        assertTrue(ocrJson.contains("overallConfidence"));
    }

    @Test
    void testGenerateChatResponse_shouldProvideKeywordBasedResponse() {
        String response = aiClient.generateChatResponse("System", "Tôi muốn đăng ký khai sinh cho con");
        assertNotNull(response);
        assertTrue(response.contains("khai sinh"));
        assertTrue(response.contains("Luật Hộ tịch"));
    }
}
