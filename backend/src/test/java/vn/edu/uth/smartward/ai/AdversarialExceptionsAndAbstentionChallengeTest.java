package vn.edu.uth.smartward.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.common.QueryCacheService;
import vn.edu.uth.smartward.common.RedisRateLimiter;
import vn.edu.uth.smartward.rag.LegalChunkMatch;
import vn.edu.uth.smartward.rag.LegalChunkRepository;
import vn.edu.uth.smartward.rag.RagQueryService;
import vn.edu.uth.smartward.rag.dto.RagAskRequest;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;

import java.net.SocketTimeoutException;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/**
 * Empirical Adversarial Test Suite for:
 * 1. Contract compatibility: @JsonAlias({"query", "question"}) on RagAskRequest
 * 2. Safe Abstention: S_max < 0.78, 0 Mock LLM calls, competent authority routing
 * 3. Error mapping & Security: HTTP 400/401/403/429/500/timeout, key redaction, friendly messages
 */
class AdversarialExceptionsAndAbstentionChallengeTest {

    private ObjectMapper objectMapper;
    private Validator validator;
    private RestClient.Builder restClientBuilder;
    private MockRestServiceServer mockServer;
    private GeminiAiClient geminiAiClient;

    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
    private static final String SECRET_API_KEY = "AIzaSyAdversarialChallengeKey999";
    private static final String CHAT_PATH = "/models/gemini-2.5-flash:generateContent";
    private static final String EMBED_PATH = "/models/text-embedding-004:embedContent";

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();

        restClientBuilder = RestClient.builder().baseUrl(BASE_URL);
        mockServer = MockRestServiceServer.bindTo(restClientBuilder).build();
        RestClient restClient = restClientBuilder.build();

        geminiAiClient = new GeminiAiClient(restClient, objectMapper);
        geminiAiClient.setApiKey(SECRET_API_KEY);
        geminiAiClient.setChatModel("gemini-2.5-flash");
        geminiAiClient.setMaxOutputTokens(8192);
        geminiAiClient.setTimeoutSeconds(25);
        geminiAiClient.setThinkingBudget(0);
    }

    // =========================================================================
    // SECTION 1: Contract Compatibility (@JsonAlias({"query", "question"}))
    // =========================================================================

    @Test
    @DisplayName("Contract 1a: Deserialization with 'query' field populates question property")
    void contract_deserializationWithQueryField() throws Exception {
        String json = """
            {
              "query": "Thủ tục cấp đổi thẻ căn cước tại xã",
              "topK": 5,
              "wardName": "Xã An Phú",
              "officeAddress": "Đường Thoại Ngọc Hầu"
            }
            """;

        RagAskRequest request = objectMapper.readValue(json, RagAskRequest.class);

        assertNotNull(request);
        assertEquals("Thủ tục cấp đổi thẻ căn cước tại xã", request.getQuestion());
        assertEquals(5, request.getTopK());
        assertEquals("Xã An Phú", request.getWardName());
        assertEquals("Đường Thoại Ngọc Hầu", request.getOfficeAddress());

        Set<ConstraintViolation<RagAskRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty(), "Valid request with 'query' must pass validation");
    }

    @Test
    @DisplayName("Contract 1b: Deserialization with 'question' field populates question property")
    void contract_deserializationWithQuestionField() throws Exception {
        String json = """
            {
              "question": "Thủ tục cấp đổi thẻ căn cước tại xã",
              "topK": 3
            }
            """;

        RagAskRequest request = objectMapper.readValue(json, RagAskRequest.class);

        assertNotNull(request);
        assertEquals("Thủ tục cấp đổi thẻ căn cước tại xã", request.getQuestion());
        assertEquals(3, request.getTopK());

        Set<ConstraintViolation<RagAskRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty(), "Valid request with 'question' must pass validation");
    }

    @Test
    @DisplayName("Contract 1c: Frontend dual-payload sending both 'question' and 'query' is accepted")
    void contract_deserializationWithDualFieldsFromFrontend() throws Exception {
        // Frontend client.ts sends both: { question: query, query, topK, wardName, officeAddress }
        String json = """
            {
              "question": "Làm giấy chứng sinh",
              "query": "Làm giấy chứng sinh",
              "topK": 3,
              "wardName": "Xã An Phú",
              "officeAddress": "Bộ phận Một cửa"
            }
            """;

        RagAskRequest request = objectMapper.readValue(json, RagAskRequest.class);

        assertNotNull(request);
        assertEquals("Làm giấy chứng sinh", request.getQuestion());
        assertEquals("Xã An Phú", request.getWardName());
        assertEquals("Bộ phận Một cửa", request.getOfficeAddress());

        Set<ConstraintViolation<RagAskRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty());
    }

    @Test
    @DisplayName("Contract 1d: Blank or whitespace question fails validation with @NotBlank")
    void contract_blankQuestionFailsValidation() throws Exception {
        String jsonWhitespaceQuery = "{\"query\": \"   \"}";
        RagAskRequest req1 = objectMapper.readValue(jsonWhitespaceQuery, RagAskRequest.class);
        Set<ConstraintViolation<RagAskRequest>> v1 = validator.validate(req1);
        assertFalse(v1.isEmpty(), "Whitespace query must violate @NotBlank");

        String jsonWhitespaceQuestion = "{\"question\": \"   \"}";
        RagAskRequest req2 = objectMapper.readValue(jsonWhitespaceQuestion, RagAskRequest.class);
        Set<ConstraintViolation<RagAskRequest>> v2 = validator.validate(req2);
        assertFalse(v2.isEmpty(), "Whitespace question must violate @NotBlank");
    }

    // =========================================================================
    // SECTION 2: Safe Abstention for Out-of-Scope Queries (S_max < 0.78, 0 LLM calls)
    // =========================================================================

    @ParameterizedTest(name = "Abstention query: {0} -> expected authority: {1}")
    @CsvSource({
            "Tôi muốn làm hộ chiếu phổ thông để đi du lịch nước ngoài, Cục Quản lý xuất nhập cảnh",
            "Đổi bằng lái xe ô tô hạng B2 đã hết hạn ở đâu, Sở Giao thông vận tải",
            "Hướng dẫn quyết toán thuế thu nhập cá nhân năm 2026, Chi cục Thuế"
    })
    @DisplayName("Abstention 2a: Out-of-scope queries trigger immediate backend abstention with ZERO LLM calls and correct authority")
    void abstention_outOfScopeQueriesDirectToAuthorityWithoutLLM(String query, String expectedAuthority) {
        LegalChunkRepository chunkRepo = Mockito.mock(LegalChunkRepository.class);
        AiModelClient mockAiClient = Mockito.mock(AiModelClient.class);
        QueryCacheService cacheService = Mockito.mock(QueryCacheService.class);
        RedisRateLimiter rateLimiter = Mockito.mock(RedisRateLimiter.class);

        Mockito.when(rateLimiter.isAllowed(ArgumentMatchers.anyString())).thenReturn(true);
        Mockito.when(cacheService.getCachedResponse(ArgumentMatchers.anyString(), ArgumentMatchers.eq(RagAskResponse.class)))
                .thenReturn(Optional.empty());
        Mockito.when(mockAiClient.generateEmbedding(ArgumentMatchers.anyString())).thenReturn(new float[768]);
        Mockito.when(mockAiClient.toPgVectorString(ArgumentMatchers.any())).thenReturn("[0.0]");

        // Out-of-scope queries return chunks with low similarity S_max = 0.58 < 0.78
        LegalChunkMatch lowSimChunk = createMockChunkMatch("KHAC-01", "Thủ tục khác", "Tiêu đề", "Nội dung", "Luật", 0.58);
        Mockito.when(chunkRepo.findTopKSimilarChunksWithMetadata(ArgumentMatchers.anyString(), ArgumentMatchers.anyInt()))
                .thenReturn(List.of(lowSimChunk));

        RagQueryService ragService = new RagQueryService(chunkRepo, mockAiClient, cacheService, rateLimiter);
        ReflectionTestUtils.setField(ragService, "defaultThreshold", 0.78);
        ReflectionTestUtils.setField(ragService, "defaultTopK", 3);

        RagAskRequest request = RagAskRequest.builder()
                .question(query)
                .similarityThreshold(0.78)
                .build();

        RagAskResponse response = ragService.askQuestion(request, "10.0.0.1");

        // 1. Confirm abstention flag
        assertNotNull(response);
        assertTrue(response.isAbstained(), "Response must have abstained=true");

        // 2. Confirm maxSimilarity < 0.78
        assertEquals(0.58, response.getMaxSimilarity(), 0.001);
        assertEquals(0.78, response.getAppliedThreshold(), 0.001);

        // 3. Confirm competent authority is explicitly mentioned
        assertTrue(response.getAnswer().contains(expectedAuthority),
                "Response must mention " + expectedAuthority + " but got: " + response.getAnswer());

        // 4. VERIFY THAT MOCK LLM IS NEVER INVOKED (0 REQUESTS TO generateChatResponse)
        Mockito.verify(mockAiClient, Mockito.never())
                .generateChatResponse(ArgumentMatchers.anyString(), ArgumentMatchers.anyString());

        // 5. Confirm no citations leaked when abstained
        assertTrue(response.getCitations().isEmpty(), "Citations must be empty on abstention");

        // 6. Confirm response includes mandatory legal disclaimer
        assertNotNull(response.getDisclaimer());
        assertTrue(response.getDisclaimer().contains("không thay thế quyết định chính thức"));
    }

    @Test
    @DisplayName("Abstention 2b: Boundary test: S_max = 0.779 abstains (0 LLM calls), S_max = 0.780 proceeds to LLM")
    void abstention_strictBoundaryAtThreshold() {
        LegalChunkRepository chunkRepo = Mockito.mock(LegalChunkRepository.class);
        AiModelClient mockAiClient = Mockito.mock(AiModelClient.class);
        QueryCacheService cacheService = Mockito.mock(QueryCacheService.class);
        RedisRateLimiter rateLimiter = Mockito.mock(RedisRateLimiter.class);

        Mockito.when(rateLimiter.isAllowed(ArgumentMatchers.anyString())).thenReturn(true);
        Mockito.when(cacheService.getCachedResponse(ArgumentMatchers.anyString(), ArgumentMatchers.eq(RagAskResponse.class)))
                .thenReturn(Optional.empty());
        Mockito.when(mockAiClient.generateEmbedding(ArgumentMatchers.anyString())).thenReturn(new float[768]);
        Mockito.when(mockAiClient.toPgVectorString(ArgumentMatchers.any())).thenReturn("[0.0]");

        RagQueryService ragService = new RagQueryService(chunkRepo, mockAiClient, cacheService, rateLimiter);
        ReflectionTestUtils.setField(ragService, "defaultThreshold", 0.78);
        ReflectionTestUtils.setField(ragService, "defaultTopK", 3);

        // Subcase A: S_max = 0.779 (< 0.78) -> MUST abstain
        LegalChunkMatch chunkBelow = createMockChunkMatch("HT-01", "Hộ tịch", "T", "C", "L", 0.779);
        Mockito.when(chunkRepo.findTopKSimilarChunksWithMetadata(ArgumentMatchers.anyString(), ArgumentMatchers.anyInt()))
                .thenReturn(List.of(chunkBelow));

        RagAskRequest reqBelow = RagAskRequest.builder().question("Câu hỏi gần ngưỡng").similarityThreshold(0.78).build();
        RagAskResponse respBelow = ragService.askQuestion(reqBelow, "10.0.0.1");

        assertTrue(respBelow.isAbstained(), "S_max = 0.779 must trigger abstention");
        Mockito.verify(mockAiClient, Mockito.never()).generateChatResponse(ArgumentMatchers.anyString(), ArgumentMatchers.anyString());

        // Subcase B: S_max = 0.780 (>= 0.78) -> MUST NOT abstain
        LegalChunkMatch chunkAt = createMockChunkMatch("HT-01", "Hộ tịch", "T", "C", "L", 0.780);
        Mockito.when(chunkRepo.findTopKSimilarChunksWithMetadata(ArgumentMatchers.anyString(), ArgumentMatchers.anyInt()))
                .thenReturn(List.of(chunkAt));
        Mockito.when(mockAiClient.generateChatResponse(ArgumentMatchers.anyString(), ArgumentMatchers.anyString()))
                .thenReturn("[HT-01] Hướng dẫn thủ tục đạt ngưỡng.");

        RagAskRequest reqAt = RagAskRequest.builder().question("Câu hỏi đạt ngưỡng").similarityThreshold(0.78).build();
        RagAskResponse respAt = ragService.askQuestion(reqAt, "10.0.0.1");

        assertFalse(respAt.isAbstained(), "S_max = 0.780 must proceed to LLM");
        Mockito.verify(mockAiClient, Mockito.times(1)).generateChatResponse(ArgumentMatchers.anyString(), ArgumentMatchers.anyString());
    }

    // =========================================================================
    // SECTION 3: Error Mapping, Security & Redaction (400/401/403/429/Timeout)
    // =========================================================================

    @Test
    @DisplayName("Security 3a: HTTP 400 with API key in error message -> friendly notice, key redacted in logs, no stack trace")
    void security_http400InvalidApiKeyRedacted() {
        String rawGoogleError = """
            {
              "error": {
                "code": 400,
                "message": "API key not valid. Please pass a valid API key. [key=%s]",
                "status": "INVALID_ARGUMENT"
              }
            }
            """.formatted(SECRET_API_KEY);

        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + SECRET_API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).body(rawGoogleError));

        String answer = geminiAiClient.generateChatResponse("System prompt", "User query");

        assertNotNull(answer);
        assertEquals(GeminiAiClient.SERVICE_UNAVAILABLE_NOTICE, answer);
        assertFalse(answer.contains(SECRET_API_KEY), "Secret API key must NEVER appear in client response");
        assertFalse(answer.contains("INVALID_ARGUMENT"), "Technical error codes must not appear in user response");
        assertFalse(answer.contains("Exception"), "Stack traces must not appear in user response");
        mockServer.verify();
    }

    @Test
    @DisplayName("Security 3b: HTTP 401 Unauthorized -> friendly notice, key redacted, no crash")
    void security_http401Unauthorized() {
        String rawGoogleError = """
            {
              "error": {
                "code": 401,
                "message": "Request had invalid authentication credentials. key=%s",
                "status": "UNAUTHENTICATED"
              }
            }
            """.formatted(SECRET_API_KEY);

        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + SECRET_API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED).body(rawGoogleError));

        String answer = geminiAiClient.generateChatResponse("System", "User query");

        assertEquals(GeminiAiClient.SERVICE_UNAVAILABLE_NOTICE, answer);
        assertFalse(answer.contains(SECRET_API_KEY));
        mockServer.verify();
    }

    @Test
    @DisplayName("Security 3c: HTTP 403 Forbidden -> friendly notice, key redacted, no crash")
    void security_http403Forbidden() {
        String rawGoogleError = """
            {
              "error": {
                "code": 403,
                "message": "Generative Language API has not been used in project before or it is disabled. key=%s",
                "status": "PERMISSION_DENIED"
              }
            }
            """.formatted(SECRET_API_KEY);

        mockServer.expect(requestTo(BASE_URL + CHAT_PATH + "?key=" + SECRET_API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.FORBIDDEN).body(rawGoogleError));

        String answer = geminiAiClient.generateChatResponse("System", "User query");

        assertEquals(GeminiAiClient.SERVICE_UNAVAILABLE_NOTICE, answer);
        assertFalse(answer.contains(SECRET_API_KEY));
        mockServer.verify();
    }

    @Test
    @DisplayName("Retry 3d: HTTP 429 Quota Exhaustion -> retries once with backoff, then returns RATE_LIMIT_NOTICE")
    void retry_http429QuotaExhaustionWithBackoff() {
        String rawQuotaError = """
            {
              "error": {
                "code": 429,
                "message": "Resource has been exhausted (e.g. check quota).",
                "status": "RESOURCE_EXHAUSTED"
              }
            }
            """;

        // Must expect exactly 2 requests (initial attempt + 1 retry)
        mockServer.expect(ExpectedCount.times(2), requestTo(BASE_URL + CHAT_PATH + "?key=" + SECRET_API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS).body(rawQuotaError));

        long start = System.currentTimeMillis();
        String answer = geminiAiClient.generateChatResponse("System", "User query");
        long elapsed = System.currentTimeMillis() - start;

        assertEquals(GeminiAiClient.RATE_LIMIT_NOTICE, answer);
        assertTrue(answer.contains("lượng lớn yêu cầu") || answer.contains("thử lại sau ít phút"));
        // Confirm retry backoff sleep occurred (at least ~500ms)
        assertTrue(elapsed >= 400, "Retry backoff must wait before second attempt (elapsed=" + elapsed + "ms)");
        mockServer.verify();
    }

    @Test
    @DisplayName("Retry 3e: Network Socket Timeout -> retries once with backoff, then returns NETWORK_ERROR_NOTICE")
    void retry_networkTimeoutWithBackoff() {
        // Must expect exactly 2 requests (initial attempt + 1 retry)
        mockServer.expect(ExpectedCount.times(2), requestTo(BASE_URL + CHAT_PATH + "?key=" + SECRET_API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(request -> {
                    throw new ResourceAccessException("Connect timed out", new SocketTimeoutException("Read timed out"));
                });

        long start = System.currentTimeMillis();
        String answer = geminiAiClient.generateChatResponse("System", "User query");
        long elapsed = System.currentTimeMillis() - start;

        assertEquals(GeminiAiClient.NETWORK_ERROR_NOTICE, answer);
        assertTrue(answer.contains("gián đoạn kết nối mạng"));
        // Confirm retry backoff sleep occurred (at least ~500ms)
        assertTrue(elapsed >= 400, "Retry backoff must wait before second attempt (elapsed=" + elapsed + "ms)");
        mockServer.verify();
    }

    @Test
    @DisplayName("Security 3f: Embedding generation failure -> throws BusinessException with friendly message, redacts key")
    void security_embeddingGenerationFailureThrowsSanitizedBusinessException() {
        mockServer.expect(requestTo(BASE_URL + EMBED_PATH + "?key=" + SECRET_API_KEY))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED).body("{\"error\":{\"message\":\"key=" + SECRET_API_KEY + "\"}}"));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                geminiAiClient.generateEmbedding("Văn bản cần sinh vector")
        );

        assertEquals(ErrorCode.AI_SERVICE_UNAVAILABLE, ex.getErrorCode());
        assertEquals("Dịch vụ AI hiện không khả dụng. Quý công dân vui lòng thử lại sau.", ex.getMessage());
        assertFalse(ex.getMessage().contains(SECRET_API_KEY));
        mockServer.verify();
    }

    private LegalChunkMatch createMockChunkMatch(String code, String procName, String title, String content, String legalRef, double score) {
        return new LegalChunkMatch() {
            @Override public Long getId() { return 1L; }
            @Override public String getChunkCode() { return code; }
            @Override public String getChunkType() { return "CONDITIONS"; }
            @Override public String getTitle() { return title; }
            @Override public String getContent() { return content; }
            @Override public String getLegalReference() { return legalRef; }
            @Override public String getProcedureCode() { return "T-001"; }
            @Override public String getProcedureName() { return procName; }
            @Override public Double getSimilarityScore() { return score; }
        };
    }
}
