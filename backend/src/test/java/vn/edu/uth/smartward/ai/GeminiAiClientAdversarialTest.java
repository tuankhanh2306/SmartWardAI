package vn.edu.uth.smartward.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import vn.edu.uth.smartward.common.QueryCacheService;
import vn.edu.uth.smartward.common.RedisRateLimiter;
import vn.edu.uth.smartward.rag.LegalChunkMatch;
import vn.edu.uth.smartward.rag.LegalChunkRepository;
import vn.edu.uth.smartward.rag.RagQueryService;
import vn.edu.uth.smartward.rag.dto.RagAskRequest;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/**
 * Adversarial test suite challenging Truncation Elimination, Multi-part Parsing,
 * finishReason handling, and Redis cache bypass for SmartWard AI.
 */
class GeminiAiClientAdversarialTest {

    private ObjectMapper objectMapper;
    private RestClient.Builder restClientBuilder;
    private MockRestServiceServer mockServer;
    private GeminiAiClient geminiAiClient;

    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
    private static final String API_KEY = "test-adversarial-api-key-99999";
    private static final String CHAT_PATH = "/models/gemini-2.5-flash:generateContent";

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        restClientBuilder = RestClient.builder().baseUrl(BASE_URL);
        mockServer = MockRestServiceServer.bindTo(restClientBuilder).build();
        RestClient restClient = restClientBuilder.build();

        geminiAiClient = new GeminiAiClient(restClient, objectMapper);
        geminiAiClient.setApiKey(API_KEY);
        geminiAiClient.setChatModel("gemini-2.5-flash");
        geminiAiClient.setMaxOutputTokens(8192);
        geminiAiClient.setTimeoutSeconds(25);
        geminiAiClient.setThinkingBudget(0);
    }

    // =========================================================================
    // CATEGORY A: Multi-Part Parser Stress-Testing
    // =========================================================================

    @Test
    @DisplayName("Adversarial A1: Multi-part with 0 parts array returns empty string without crashing")
    void testMultiPart_zeroPartsArray() {
        String mockBody = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [],
                    "role": "model"
                  },
                  "finishReason": "STOP",
                  "index": 0
                }
              ]
            }
            """;

        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(mockBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("System", "Zero parts test");
        assertNotNull(result);
        assertEquals("", result);
        mockServer.verify();
    }

    @Test
    @DisplayName("Adversarial A2: Missing content or parts node in candidate does not throw NPE")
    void testMultiPart_missingContentOrParts() {
        String mockBody = """
            {
              "candidates": [
                {
                  "finishReason": "STOP",
                  "index": 0
                }
              ]
            }
            """;

        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(mockBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("System", "Missing content test");
        assertNotNull(result);
        assertEquals("", result);
        mockServer.verify();
    }

    @Test
    @DisplayName("Adversarial A3: Single 1-part response parses directly")
    void testMultiPart_onePart() {
        String mockBody = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [
                      { "text": "Duy nhất một phần nội dung." }
                    ],
                    "role": "model"
                  },
                  "finishReason": "STOP",
                  "index": 0
                }
              ]
            }
            """;

        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(mockBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("System", "One part");
        assertEquals("Duy nhất một phần nội dung.", result);
        mockServer.verify();
    }

    @Test
    @DisplayName("Adversarial A4: 5 consecutive parts are concatenated in strict order")
    void testMultiPart_fivePartsInOrder() {
        String mockBody = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [
                      { "text": "1. TÓM TẮT: Đăng ký khai sinh.\\n" },
                      { "text": "2. HỒ SƠ: Gồm 33 giấy tờ.\\n" },
                      { "text": "3. THỜI HẠN: 01 ngày; LỆ PHÍ: 0đ.\\n" },
                      { "text": "4. NƠI TIẾP NHẬN: Một cửa UBND Xã An Phú.\\n" },
                      { "text": "5. CĂN CỨ: Luật Hộ tịch 2014." }
                    ],
                    "role": "model"
                  },
                  "finishReason": "STOP",
                  "index": 0
                }
              ]
            }
            """;

        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(mockBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("System", "Five parts");
        assertNotNull(result);
        assertTrue(result.startsWith("1. TÓM TẮT:"));
        assertTrue(result.contains("2. HỒ SƠ:"));
        assertTrue(result.contains("3. THỜI HẠN:"));
        assertTrue(result.contains("4. NƠI TIẾP NHẬN:"));
        assertTrue(result.contains("5. CĂN CỨ:"));
        assertEquals("1. TÓM TẮT: Đăng ký khai sinh.\n2. HỒ SƠ: Gồm 33 giấy tờ.\n3. THỜI HẠN: 01 ngày; LỆ PHÍ: 0đ.\n4. NƠI TIẾP NHẬN: Một cửa UBND Xã An Phú.\n5. CĂN CỨ: Luật Hộ tịch 2014.", result);
        mockServer.verify();
    }

    @Test
    @DisplayName("Adversarial A5: Whitespace-only parts concatenate safely without throwing NPE")
    void testMultiPart_whitespaceParts() {
        String mockBody = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [
                      { "text": "   " },
                      { "text": "\\n\\t" },
                      { "text": "   " }
                    ],
                    "role": "model"
                  },
                  "finishReason": "STOP",
                  "index": 0
                }
              ]
            }
            """;

        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(mockBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("System", "Whitespace parts");
        assertNotNull(result);
        assertEquals("   \n\t   ", result);
        mockServer.verify();
    }

    @Test
    @DisplayName("Adversarial A6: Null text, missing text property, and invalid part nodes are tolerated")
    void testMultiPart_nullAndMissingTextFields() {
        String mockBody = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [
                      { "text": null },
                      { "unexpectedField": "ignore_me" },
                      { "text": "Văn bản hợp lệ sau null" }
                    ],
                    "role": "model"
                  },
                  "finishReason": "STOP",
                  "index": 0
                }
              ]
            }
            """;

        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(mockBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("System", "Null fields test");
        assertNotNull(result);
        assertEquals("Văn bản hợp lệ sau null", result);
        mockServer.verify();
    }

    // =========================================================================
    // CATEGORY B: finishReason Handling & Retry Mechanisms
    // =========================================================================

    @Test
    @DisplayName("Adversarial B1: finishReason == MAX_TOKENS triggers retry with 16k tokens; retry SUCCESS returns full text")
    void testFinishReason_maxTokens_retrySucceeds() {
        String truncatedBody = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [
                      { "text": "1. TÓM TẮT: Đang liệt kê dở dang giấy tờ số 1..." }
                    ],
                    "role": "model"
                  },
                  "finishReason": "MAX_TOKENS",
                  "index": 0
                }
              ]
            }
            """;

        String retrySuccessBody = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [
                      { "text": "1. TÓM TẮT: Đăng ký khai sinh.\\n2. HỒ SƠ: Đủ toàn bộ 33 tài liệu.\\n3. LỆ PHÍ: 0đ." }
                    ],
                    "role": "model"
                  },
                  "finishReason": "STOP",
                  "index": 0
                }
              ]
            }
            """;

        // Call 1: 8192 tokens -> returns MAX_TOKENS
        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.generationConfig.maxOutputTokens").value(8192))
                .andRespond(withSuccess(truncatedBody, MediaType.APPLICATION_JSON));

        // Call 2: Retry with 16384 tokens -> returns STOP with full text
        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.generationConfig.maxOutputTokens").value(16384))
                .andRespond(withSuccess(retrySuccessBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("System", "Khai sinh 33 hồ sơ");
        assertNotNull(result);
        assertTrue(result.contains("Đủ toàn bộ 33 tài liệu"), "Must return full text from successful retry");
        assertFalse(result.contains(GeminiAiClient.TRUNCATION_FALLBACK_NOTICE), "Should not fall back if retry succeeded");
        mockServer.verify();
    }

    @Test
    @DisplayName("Adversarial B2: finishReason == MAX_TOKENS retry also hits MAX_TOKENS -> returns friendly fallback notice")
    void testFinishReason_maxTokens_retryStillTruncated() {
        String truncatedBody = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [
                      { "text": "Cụm từ dở dang..." }
                    ],
                    "role": "model"
                  },
                  "finishReason": "MAX_TOKENS",
                  "index": 0
                }
              ]
            }
            """;

        // Call 1
        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.generationConfig.maxOutputTokens").value(8192))
                .andRespond(withSuccess(truncatedBody, MediaType.APPLICATION_JSON));

        // Call 2
        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.generationConfig.maxOutputTokens").value(16384))
                .andRespond(withSuccess(truncatedBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("System", "Thủ tục siêu dài");
        assertEquals(GeminiAiClient.TRUNCATION_FALLBACK_NOTICE, result);
        assertTrue(result.contains("vượt quá giới hạn hiển thị tự động"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Adversarial B3: finishReason == SAFETY returns safety notice without throwing")
    void testFinishReason_safety() {
        String safetyBody = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [],
                    "role": "model"
                  },
                  "finishReason": "SAFETY",
                  "index": 0
                }
              ]
            }
            """;

        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(safetyBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("System", "Prompt nhạy cảm");
        assertEquals(GeminiAiClient.SAFETY_BLOCKED_NOTICE, result);
        assertTrue(result.contains("an toàn thông tin"));
        mockServer.verify();
    }

    // =========================================================================
    // CATEGORY C: Candidate Emptiness & Prompt Feedback blockReason
    // =========================================================================

    @Test
    @DisplayName("Adversarial C1: promptFeedback.blockReason returns safety blocked notice without exception")
    void testPromptFeedback_blockReason() {
        String blockedBody = """
            {
              "promptFeedback": {
                "blockReason": "SAFETY",
                "safetyRatings": [
                  { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "probability": "HIGH" }
                ]
              }
            }
            """;

        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(blockedBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("System", "Thủ tục bị block");
        assertEquals(GeminiAiClient.SAFETY_BLOCKED_NOTICE, result);
        mockServer.verify();
    }

    @Test
    @DisplayName("Adversarial C2: Empty candidates array returns service unavailable notice")
    void testEmptyCandidatesArray() {
        String emptyCandidatesBody = """
            {
              "candidates": []
            }
            """;

        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(emptyCandidatesBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("System", "Candidates rỗng");
        assertEquals(GeminiAiClient.SERVICE_UNAVAILABLE_NOTICE, result);
        mockServer.verify();
    }

    @Test
    @DisplayName("Adversarial C3: Missing candidates node returns service unavailable notice without crash")
    void testMissingCandidatesNode() {
        String missingNodeBody = """
            {
              "usageMetadata": { "promptTokenCount": 10 }
            }
            """;

        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(missingNodeBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("System", "Không có candidates");
        assertEquals(GeminiAiClient.SERVICE_UNAVAILABLE_NOTICE, result);
        mockServer.verify();
    }

    // =========================================================================
    // CATEGORY D: Redis Cache Integrity on Truncation
    // =========================================================================

    @Test
    @DisplayName("Adversarial D1: Redis cache strictly OMITS saving truncated responses")
    void testRedisCache_strictlyOmittedOnTruncation() {
        LegalChunkRepository chunkRepo = Mockito.mock(LegalChunkRepository.class);
        AiModelClient mockAiClient = Mockito.mock(AiModelClient.class);
        QueryCacheService cacheService = Mockito.mock(QueryCacheService.class);
        RedisRateLimiter rateLimiter = Mockito.mock(RedisRateLimiter.class);

        Mockito.when(rateLimiter.isAllowed(ArgumentMatchers.anyString())).thenReturn(true);
        Mockito.when(mockAiClient.generateEmbedding(ArgumentMatchers.anyString())).thenReturn(new float[768]);
        Mockito.when(mockAiClient.toPgVectorString(ArgumentMatchers.any())).thenReturn("[0.0]");

        // Return a chunk with high similarity so S_max >= 0.78
        LegalChunkMatch match = Mockito.mock(LegalChunkMatch.class);
        Mockito.when(match.getChunkCode()).thenReturn("KS-01-DK");
        Mockito.when(match.getProcedureName()).thenReturn("Đăng ký khai sinh");
        Mockito.when(match.getTitle()).thenReturn("Điều kiện đăng ký");
        Mockito.when(match.getLegalReference()).thenReturn("Luật Hộ tịch 2014");
        Mockito.when(match.getContent()).thenReturn("Cha mẹ có trách nhiệm đăng ký khai sinh cho con trong 60 ngày.");
        Mockito.when(match.getSimilarityScore()).thenReturn(0.92);

        Mockito.when(chunkRepo.findTopKSimilarChunksWithMetadata(ArgumentMatchers.anyString(), ArgumentMatchers.anyInt()))
                .thenReturn(List.of(match));

        // LLM returns TRUNCATION_FALLBACK_NOTICE
        Mockito.when(mockAiClient.generateChatResponse(ArgumentMatchers.anyString(), ArgumentMatchers.anyString()))
                .thenReturn(GeminiAiClient.TRUNCATION_FALLBACK_NOTICE);

        RagQueryService ragService = new RagQueryService(chunkRepo, mockAiClient, cacheService, rateLimiter);
        ReflectionTestUtils.setField(ragService, "defaultThreshold", 0.78);
        ReflectionTestUtils.setField(ragService, "defaultTopK", 3);

        RagAskRequest request = RagAskRequest.builder()
                .question("Thủ tục đăng ký khai sinh cho con")
                .similarityThreshold(0.78)
                .build();

        RagAskResponse response = ragService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        assertTrue(response.getAnswer().contains("vượt quá giới hạn hiển thị tự động"));

        // CRITICAL CHECK: queryCacheService.putResponse MUST NEVER BE CALLED!
        Mockito.verify(cacheService, Mockito.never()).putResponse(ArgumentMatchers.anyString(), ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Adversarial D2: Redis cache STORES response when response is complete and not truncated")
    void testRedisCache_storesCompleteResponse() {
        LegalChunkRepository chunkRepo = Mockito.mock(LegalChunkRepository.class);
        AiModelClient mockAiClient = Mockito.mock(AiModelClient.class);
        QueryCacheService cacheService = Mockito.mock(QueryCacheService.class);
        RedisRateLimiter rateLimiter = Mockito.mock(RedisRateLimiter.class);

        Mockito.when(rateLimiter.isAllowed(ArgumentMatchers.anyString())).thenReturn(true);
        Mockito.when(mockAiClient.generateEmbedding(ArgumentMatchers.anyString())).thenReturn(new float[768]);
        Mockito.when(mockAiClient.toPgVectorString(ArgumentMatchers.any())).thenReturn("[0.0]");

        LegalChunkMatch match = Mockito.mock(LegalChunkMatch.class);
        Mockito.when(match.getChunkCode()).thenReturn("KS-01-DK");
        Mockito.when(match.getProcedureName()).thenReturn("Đăng ký khai sinh");
        Mockito.when(match.getTitle()).thenReturn("Điều kiện đăng ký");
        Mockito.when(match.getLegalReference()).thenReturn("Luật Hộ tịch 2014");
        Mockito.when(match.getContent()).thenReturn("Cha mẹ có trách nhiệm đăng ký khai sinh cho con trong 60 ngày.");
        Mockito.when(match.getSimilarityScore()).thenReturn(0.92);

        Mockito.when(chunkRepo.findTopKSimilarChunksWithMetadata(ArgumentMatchers.anyString(), ArgumentMatchers.anyInt()))
                .thenReturn(List.of(match));

        String completeAnswer = "1. TÓM TẮT THỦ TỤC:\nĐăng ký khai sinh trong 01 ngày.\n2. THÀNH PHẦN HỒ SƠ:\n- Giấy chứng sinh [KS-01-DK].";
        Mockito.when(mockAiClient.generateChatResponse(ArgumentMatchers.anyString(), ArgumentMatchers.anyString()))
                .thenReturn(completeAnswer);

        RagQueryService ragService = new RagQueryService(chunkRepo, mockAiClient, cacheService, rateLimiter);
        ReflectionTestUtils.setField(ragService, "defaultThreshold", 0.78);
        ReflectionTestUtils.setField(ragService, "defaultTopK", 3);

        RagAskRequest request = RagAskRequest.builder()
                .question("Thủ tục đăng ký khai sinh cho con")
                .similarityThreshold(0.78)
                .build();

        RagAskResponse response = ragService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        // CRITICAL CHECK: queryCacheService.putResponse MUST BE CALLED exactly once!
        Mockito.verify(cacheService, Mockito.times(1)).putResponse(ArgumentMatchers.eq("Thủ tục đăng ký khai sinh cho con"), ArgumentMatchers.any(RagAskResponse.class));
    }

    // =========================================================================
    // CATEGORY E: Token Limits & Capacity Verification
    // =========================================================================

    @Test
    @DisplayName("Adversarial E1: maxOutputTokens: 8192 configuration prevents truncation on long 33-doc procedural queries")
    void testTokenCapacity_longProceduralQueryDoesNotTruncate() {
        // Build a massive response containing 33 distinct documents (typical of TTHC-HT-01)
        StringBuilder largeResponse = new StringBuilder();
        largeResponse.append("1. TÓM TẮT THỦ TỤC:\nThủ tục đăng ký khai sinh tại Xã An Phú hoàn tất trong 01 ngày làm việc.\n\n");
        largeResponse.append("2. THÀNH PHẦN HỒ SƠ (33 LOẠI GIẤY TỜ):\n");
        for (int i = 1; i <= 33; i++) {
            largeResponse.append(String.format("- Giấy tờ %02d: Bản chính hoặc bản sao chứng thực của tài liệu quy định tại Điều %d Nghị định 123/2015/NĐ-CP kèm xác nhận của cơ quan có thẩm quyền.\n", i, i));
        }
        largeResponse.append("\n3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n- Thời hạn: 01 ngày.\n- Lệ phí: Miễn phí.\n\n");
        largeResponse.append("4. NƠI TIẾP NHẬN & XỬ LÝ:\nBộ phận Một cửa UBND Xã An Phú.\n\n");
        largeResponse.append("5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n[TTHC-HT-01] Luật Hộ tịch 2014.\n*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*");

        String fullContent = largeResponse.toString();
        // Verify response length in characters and estimated tokens
        int charCount = fullContent.length();
        int estimatedTokens = (int) (charCount / 2.0); // conservative ratio for Vietnamese syllables
        assertTrue(charCount > 3000, "Simulated 33 documents must exceed 3,000 characters");
        assertTrue(estimatedTokens > 1500, "Estimated tokens must exceed 1,500 tokens (which previously broke 1024 limit)");

        // Under 8192 tokens, this fits with over 6,000 tokens of headroom
        assertTrue(estimatedTokens < 8192, "Must comfortably fit inside 8192 token limit");

        String mockBody = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [
                      { "text": %s }
                    ],
                    "role": "model"
                  },
                  "finishReason": "STOP",
                  "index": 0
                }
              ]
            }
            """.formatted(objectMapper.valueToTree(fullContent).toString());

        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.generationConfig.maxOutputTokens").value(8192))
                .andRespond(withSuccess(mockBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("System prompt", "Khai sinh 33 giấy tờ");

        assertNotNull(result);
        assertEquals(fullContent, result);
        assertTrue(result.contains("Giấy tờ 33:"), "Must include the 33rd document without cut-off");
        mockServer.verify();
    }
}
