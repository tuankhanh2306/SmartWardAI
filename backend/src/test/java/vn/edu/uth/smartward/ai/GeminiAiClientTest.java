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
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import vn.edu.uth.smartward.common.QueryCacheService;
import vn.edu.uth.smartward.common.RedisRateLimiter;
import vn.edu.uth.smartward.rag.LegalChunkRepository;
import vn.edu.uth.smartward.rag.RagQueryService;
import vn.edu.uth.smartward.rag.dto.RagAskRequest;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;

import java.net.SocketTimeoutException;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GeminiAiClientTest {

    private ObjectMapper objectMapper;
    private RestClient.Builder restClientBuilder;
    private MockRestServiceServer mockServer;
    private GeminiAiClient geminiAiClient;

    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
    private static final String API_KEY = "test-secret-api-key-12345";
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

    @Test
    @DisplayName("Scenario 1: Long response (birth registration) completes without truncation")
    void scenario1_longResponseCompletesWithoutTruncation() {
        String longText = """
            1. TÓM TẮT THỦ TỤC:
            Thủ tục đăng ký khai sinh tại Xã An Phú được giải quyết trong 01 ngày làm việc.

            2. THÀNH PHẦN HỒ SƠ:
            - Tờ khai đăng ký khai sinh theo mẫu.
            - Giấy chứng sinh do Trạm y tế xã hoặc bệnh viện cấp.
            - Bản chính Căn cước công dân của cha và mẹ.
            - Giấy chứng nhận kết hôn của cha mẹ (nếu có).

            3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:
            - Thời hạn: Trong 01 ngày làm việc.
            - Lệ phí: Miễn phí hoàn toàn khi đăng ký đúng hạn trong vòng 60 ngày.

            4. NƠI TIẾP NHẬN & XỬ LÝ:
            Bộ phận Tiếp nhận và Trả kết quả (Một cửa) UBND Xã An Phú (Đường Thoại Ngọc Hầu, Xã An Phú, An Giang).

            5. CĂN CỨ PHÁP LÝ & LƯU Ý:
            [TTHC-HT-01] Luật Hộ tịch 2014 và Nghị định 123/2015/NĐ-CP.
            *Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*
            """;

        String mockResponseBody = """
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
            """.formatted(objectMapper.valueToTree(longText).toString());

        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.systemInstruction.parts[0].text").exists())
                .andExpect(jsonPath("$.generationConfig.maxOutputTokens").value(8192))
                .andRespond(withSuccess(mockResponseBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("Hệ thống chỉ dẫn", "Làm khai sinh tại An Phú");

        assertNotNull(result);
        assertTrue(result.startsWith("1. TÓM TẮT THỦ TỤC:"));
        assertTrue(result.contains("2. THÀNH PHẦN HỒ SƠ:"));
        assertTrue(result.contains("3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:"));
        assertTrue(result.contains("4. NƠI TIẾP NHẬN & XỬ LÝ:"));
        assertTrue(result.contains("5. CĂN CỨ PHÁP LÝ & LƯU Ý:"));
        assertTrue(result.contains("*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Scenario 2: Candidate returns MAX_TOKENS -> retries once; if still MAX_TOKENS returns fallback notice")
    void scenario2_maxTokensHandledPerR1e() {
        String truncatedBody = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [
                      { "text": "1. TÓM TẮT: Thủ tục này cần chuẩn bị hồ sơ gồm..." }
                    ],
                    "role": "model"
                  },
                  "finishReason": "MAX_TOKENS",
                  "index": 0
                }
              ]
            }
            """;

        // Call 1: initial call with 8192 tokens returns MAX_TOKENS
        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.generationConfig.maxOutputTokens").value(8192))
                .andRespond(withSuccess(truncatedBody, MediaType.APPLICATION_JSON));

        // Call 2: retry call with 16384 tokens still returns MAX_TOKENS
        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.generationConfig.maxOutputTokens").value(16384))
                .andRespond(withSuccess(truncatedBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("System", "Thủ tục phức tạp");

        assertNotNull(result);
        assertEquals(GeminiAiClient.TRUNCATION_FALLBACK_NOTICE, result);
        assertTrue(result.contains("vượt quá giới hạn hiển thị tự động"));
        mockServer.verify();
    }

    @Test
    @DisplayName("Scenario 3: Multi-part response concatenated properly from candidate parts[]")
    void scenario3_multiPartConcatenation() {
        String multiPartBody = """
            {
              "candidates": [
                {
                  "content": {
                    "parts": [
                      { "text": "Phần 1: TÓM TẮT THỦ TỤC. " },
                      { "text": "Phần 2: THÀNH PHẦN HỒ SƠ. " },
                      { "text": "Phần 3: THỜI HẠN & LỆ PHÍ." }
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
                .andRespond(withSuccess(multiPartBody, MediaType.APPLICATION_JSON));

        String result = geminiAiClient.generateChatResponse("System", "Câu hỏi kiểm tra multi-part");

        assertNotNull(result);
        assertEquals("Phần 1: TÓM TẮT THỦ TỤC. Phần 2: THÀNH PHẦN HỒ SƠ. Phần 3: THỜI HẠN & LỆ PHÍ.", result);
        mockServer.verify();
    }

    @Test
    @DisplayName("Scenario 4: Format check: 5 sections in order, zero conversational pleasantries")
    void scenario4_formatCheckZeroPleasantries() {
        DeterministicMockAiClient mockClient = new DeterministicMockAiClient();
        String response = mockClient.generateChatResponse("[MÃ: KS-01-DK]", "Tôi muốn đăng ký khai sinh cho con");

        assertNotNull(response);
        // Zero pleasantries check
        assertFalse(response.startsWith("Xin chào"), "Response must NOT start with pleasantries");
        assertFalse(response.toLowerCase().contains("chào bạn"), "Response must NOT contain conversational greeting");
        assertFalse(response.toLowerCase().contains("cảm ơn bạn"), "Response must NOT contain pleasantry");

        // Starts directly with section 1
        assertTrue(response.startsWith("1. TÓM TẮT THỦ TỤC:"));

        // 5 sections in strict order
        int idx1 = response.indexOf("1. TÓM TẮT THỦ TỤC:");
        int idx2 = response.indexOf("2. THÀNH PHẦN HỒ SƠ:");
        int idx3 = response.indexOf("3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:");
        int idx4 = response.indexOf("4. NƠI TIẾP NHẬN & XỬ LÝ:");
        int idx5 = response.indexOf("5. CĂN CỨ PHÁP LÝ & LƯU Ý:");

        assertTrue(idx1 != -1 && idx2 != -1 && idx3 != -1 && idx4 != -1 && idx5 != -1, "All 5 sections must be present");
        assertTrue(idx1 < idx2 && idx2 < idx3 && idx3 < idx4 && idx4 < idx5, "Sections must appear in strictly ascending order");
    }

    @Test
    @DisplayName("Scenario 5: Missing fee/address displays 'Chưa có dữ liệu, vui lòng liên hệ Bộ phận Một cửa'")
    void scenario5_missingDataFallbackRule() {
        DeterministicMockAiClient mockClient = new DeterministicMockAiClient();
        String response = mockClient.generateChatResponse("[MÃ: TTHC-09]", "Thủ tục này thiếu lệ phí và không có địa chỉ");

        assertNotNull(response);
        assertTrue(response.contains("Chưa có dữ liệu, vui lòng liên hệ Bộ phận Một cửa"),
                "Missing data must trigger fallback notice without hallucinations");
    }

    @Test
    @DisplayName("Scenario 6.1: HTTP 400 Bad Request / Invalid API key mapped to friendly message without leaking key")
    void scenario6_error400MappedWithoutKeyLeak() {
        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).body("{\"error\":{\"message\":\"API key not valid\"}}"));

        String resp = geminiAiClient.generateChatResponse("System", "Test 400");
        assertEquals(GeminiAiClient.SERVICE_UNAVAILABLE_NOTICE, resp);
        assertFalse(resp.contains(API_KEY), "API key must never leak into response");
        mockServer.verify();
    }

    @Test
    @DisplayName("Scenario 6.2: HTTP 401 Unauthorized mapped to friendly message")
    void scenario6_error401Mapped() {
        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED).body("{\"error\":{\"message\":\"Unauthorized\"}}"));

        String resp = geminiAiClient.generateChatResponse("System", "Test 401");
        assertEquals(GeminiAiClient.SERVICE_UNAVAILABLE_NOTICE, resp);
        mockServer.verify();
    }

    @Test
    @DisplayName("Scenario 6.3: HTTP 403 Forbidden mapped to friendly message")
    void scenario6_error403Mapped() {
        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.FORBIDDEN).body("{\"error\":{\"message\":\"Forbidden\"}}"));

        String resp = geminiAiClient.generateChatResponse("System", "Test 403");
        assertEquals(GeminiAiClient.SERVICE_UNAVAILABLE_NOTICE, resp);
        mockServer.verify();
    }

    @Test
    @DisplayName("Scenario 6.4: HTTP 429 Quota Exceeded retries once then returns friendly notice")
    void scenario6_error429QuotaExceeded() {
        mockServer.expect(ExpectedCount.times(2), requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).body("{\"error\":{\"message\":\"Resource exhausted\"}}"));

        String resp = geminiAiClient.generateChatResponse("System", "Test 429");
        assertEquals(GeminiAiClient.RATE_LIMIT_NOTICE, resp);
        mockServer.verify();
    }

    @Test
    @DisplayName("Scenario 6.5: HTTP 500 Internal Server Error retries once then returns friendly notice")
    void scenario6_error500ServerError() {
        mockServer.expect(ExpectedCount.times(2), requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":{\"message\":\"Internal error\"}}"));

        String resp = geminiAiClient.generateChatResponse("System", "Test 500");
        assertEquals(GeminiAiClient.NETWORK_ERROR_NOTICE, resp);
        mockServer.verify();
    }

    @Test
    @DisplayName("Scenario 6.6: Network/Socket Timeout retries once then returns friendly notice")
    void scenario6_networkTimeout() {
        mockServer.expect(ExpectedCount.times(2), requestTo(BASE_URL + CHAT_PATH + "?key=" + API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(request -> {
                    throw new org.springframework.web.client.ResourceAccessException("Read timed out", new SocketTimeoutException("Read timed out"));
                });

        String resp = geminiAiClient.generateChatResponse("System", "Test Timeout");
        assertEquals(GeminiAiClient.NETWORK_ERROR_NOTICE, resp);
        mockServer.verify();
    }

    @Test
    @DisplayName("Scenario 7: Safe abstention (S_max < theta) refuse safely at backend without calling LLM")
    void scenario7_safeAbstentionGuardrailRefusesWithoutCallingLLM() {
        LegalChunkRepository chunkRepo = Mockito.mock(LegalChunkRepository.class);
        AiModelClient mockAiClient = Mockito.mock(AiModelClient.class);
        QueryCacheService cacheService = Mockito.mock(QueryCacheService.class);
        RedisRateLimiter rateLimiter = Mockito.mock(RedisRateLimiter.class);

        Mockito.when(rateLimiter.isAllowed(ArgumentMatchers.anyString())).thenReturn(true);
        Mockito.when(mockAiClient.generateEmbedding(ArgumentMatchers.anyString())).thenReturn(new float[768]);
        Mockito.when(mockAiClient.toPgVectorString(ArgumentMatchers.any())).thenReturn("[0.0]");

        RagQueryService ragService = new RagQueryService(chunkRepo, mockAiClient, cacheService, rateLimiter);
        ReflectionTestUtils.setField(ragService, "defaultThreshold", 0.78);
        ReflectionTestUtils.setField(ragService, "defaultTopK", 3);

        RagAskRequest outOfScopeRequest = RagAskRequest.builder()
                .question("Thủ tục làm hộ chiếu phổ thông và đổi bằng lái xe ô tô")
                .similarityThreshold(0.78)
                .build();

        RagAskResponse response = ragService.askQuestion(outOfScopeRequest, "127.0.0.1");

        assertNotNull(response);
        assertTrue(response.isAbstained(), "System must abstain on out-of-scope question");
        assertTrue(response.getAnswer().contains("Cục Quản lý xuất nhập cảnh") || response.getAnswer().contains("Sở Giao thông vận tải"));

        // VERIFY MOCK AI RECEIVES ZERO REQUESTS TO GENERATE CHAT
        Mockito.verify(mockAiClient, Mockito.never()).generateChatResponse(ArgumentMatchers.anyString(), ArgumentMatchers.anyString());
    }

    @Test
    @DisplayName("Scenario 8: Legal disclaimer is always present on administrative answers")
    void scenario8_disclaimerAlwaysPresent() {
        DeterministicMockAiClient mockClient = new DeterministicMockAiClient();

        String[] testQueries = {
                "Tôi muốn đăng ký khai sinh cho con",
                "Thủ tục đăng ký kết hôn tại xã",
                "Đăng ký thường trú theo mẫu CT01",
                "Thủ tục chứng thực chữ ký"
        };

        for (String q : testQueries) {
            String resp = mockClient.generateChatResponse("[MÃ: TTHC-HT-01]", q);
            assertNotNull(resp);
            assertTrue(resp.contains("*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*"),
                    "Disclaimer must be present on query: " + q);
        }
    }
}
