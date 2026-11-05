package vn.edu.uth.smartward.rag;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.common.QueryCacheService;
import vn.edu.uth.smartward.common.RedisRateLimiter;
import vn.edu.uth.smartward.rag.dto.ConversationTurnDto;
import vn.edu.uth.smartward.rag.dto.LegalCitationDto;
import vn.edu.uth.smartward.rag.dto.RagAskRequest;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RagQueryServiceTest {

    @Mock
    private LegalChunkRepository chunkRepository;

    @Mock
    private AiModelClient aiModelClient;

    @Mock
    private QueryCacheService queryCacheService;

    @Mock
    private RedisRateLimiter redisRateLimiter;

    private RagQueryService ragQueryService;

    @BeforeEach
    void setUp() {
        ragQueryService = new RagQueryService(chunkRepository, aiModelClient, queryCacheService, redisRateLimiter);
        ReflectionTestUtils.setField(ragQueryService, "defaultThreshold", 0.78);
        ReflectionTestUtils.setField(ragQueryService, "defaultTopK", 3);
    }

    @Test
    void testAskQuestion_whenRateLimitExceeded_shouldThrowBusinessException() {
        when(redisRateLimiter.isAllowed("192.168.1.10")).thenReturn(false);

        RagAskRequest request = RagAskRequest.builder()
                .question("Tôi muốn làm khai sinh")
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () ->
                ragQueryService.askQuestion(request, "192.168.1.10")
        );

        assertEquals(ErrorCode.RATE_LIMIT_EXCEEDED, ex.getErrorCode());
        verifyNoInteractions(aiModelClient);
    }

    @Test
    void testAskQuestion_whenCacheHit_shouldReturnCachedResponse() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);

        RagAskResponse cachedResp = RagAskResponse.builder()
                .answer("Đáp án đã được lưu trong bộ nhớ đệm")
                .abstained(false)
                .maxSimilarity(0.92)
                .build();

        when(queryCacheService.getCachedResponse(eq("Thủ tục làm hộ khẩu"), eq(RagAskResponse.class)))
                .thenReturn(Optional.of(cachedResp));

        RagAskRequest request = RagAskRequest.builder()
                .question("Thủ tục làm hộ khẩu")
                .build();

        RagAskResponse response = ragQueryService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        assertTrue(response.isCached());
        assertEquals("Đáp án đã được lưu trong bộ nhớ đệm", response.getAnswer());
        verify(chunkRepository, never()).findTopKSimilarChunksWithMetadata(anyString(), anyInt());
    }

    @Test
    void testAskQuestion_whenSimilarityBelowThreshold_shouldAbstain() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());

        float[] mockVector = new float[768];
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(mockVector);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[0.1, 0.2]");

        LegalChunkMatch lowMatch = createMockChunkMatch("CT-01", "Cư trú", "Tiêu đề", "Nội dung", "Luật cư trú", 0.65);
        when(chunkRepository.findTopKSimilarChunksWithMetadata(anyString(), eq(3)))
                .thenReturn(List.of(lowMatch));

        RagAskRequest request = RagAskRequest.builder()
                .question("Hôm nay thời tiết thế nào?")
                .similarityThreshold(0.78)
                .build();

        RagAskResponse response = ragQueryService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        assertTrue(response.isAbstained(), "System must abstain when S_max < theta");
        assertEquals(0.65, response.getMaxSimilarity());
        assertTrue(response.getCitations().isEmpty());
        assertTrue(response.getAnswer().contains("chưa tìm thấy thông tin thủ tục"));
        verify(aiModelClient, never()).generateChatResponse(anyString(), anyString());
        verify(queryCacheService).putResponse(anyString(), any(RagAskResponse.class), eq(1800L));
    }

    @Test
    void testAskQuestion_whenSimilarityAboveThreshold_shouldReturnAnswerAndVerifiedCitations() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());

        float[] mockVector = new float[768];
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(mockVector);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[0.1, 0.2]");

        LegalChunkMatch match = createMockChunkMatch("KS-01-DK", "Đăng ký khai sinh", "Điều kiện", "Giấy tờ gồm giấy chứng sinh...", "Điều 15 Luật Hộ tịch", 0.88);
        when(chunkRepository.findTopKSimilarChunksWithMetadata(anyString(), eq(3)))
                .thenReturn(List.of(match));

        when(aiModelClient.generateChatResponse(anyString(), anyString()))
                .thenReturn("[KS-01-DK] Thủ tục đăng ký khai sinh giải quyết trong 1 ngày làm việc.");

        RagAskRequest request = RagAskRequest.builder()
                .question("Làm khai sinh mất bao lâu?")
                .build();

        RagAskResponse response = ragQueryService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        assertFalse(response.isAbstained());
        assertEquals(0.88, response.getMaxSimilarity());
        assertEquals(1, response.getCitations().size());
        assertEquals("KS-01-DK", response.getCitations().get(0).getChunkCode());
        assertEquals("Đăng ký khai sinh", response.getCitations().get(0).getProcedureName());
        assertNotNull(response.getDisclaimer());
        verify(queryCacheService).putResponse(anyString(), eq(response));
    }

    @Test
    void testAskQuestion_whenGreetingQuery_shouldReturnFriendlyGreetingWithoutLLM() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());

        RagAskRequest request = RagAskRequest.builder()
                .question("hi")
                .wardName("Xã An Phú, Tỉnh An Giang")
                .officeAddress("Đường Thoại Ngọc Hầu, Xã An Phú")
                .build();

        RagAskResponse response = ragQueryService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        assertFalse(response.isAbstained(), "Greetings must NOT be abstained");
        assertEquals(1.0, response.getMaxSimilarity());
        assertTrue(response.getAnswer().contains("Xin chào! Tôi là Trợ lý Pháp lý Một Cửa tại Xã An Phú, Tỉnh An Giang"));
        assertTrue(response.getAnswer().contains("Đăng ký khai sinh, kết hôn, khai tử"));
        verifyNoInteractions(aiModelClient);
        verify(chunkRepository, never()).findTopKSimilarChunksWithMetadata(anyString(), anyInt());
    }

    @Test
    void testAskQuestion_whenWardOfficeQuery_shouldReturnWardOfficeInfoWithoutLLM() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());

        RagAskRequest request = RagAskRequest.builder()
                .question("trụ sở ủy ban ở đâu và mấy giờ làm việc?")
                .wardName("Phường Mỹ Thới")
                .officeAddress("123 Trần Hưng Đạo, Phường Mỹ Thới")
                .build();

        RagAskResponse response = ragQueryService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        assertFalse(response.isAbstained());
        assertEquals(1.0, response.getMaxSimilarity());
        assertTrue(response.getAnswer().contains("Phường Mỹ Thới"));
        assertTrue(response.getAnswer().contains("123 Trần Hưng Đạo, Phường Mỹ Thới"));
        assertTrue(response.getAnswer().contains("Giờ tiếp nhận và trả kết quả"));
        verifyNoInteractions(aiModelClient);
    }

    @Test
    void testAskQuestion_whenWellbeingQuery_shouldReturnFriendlySmallTalkWithoutLLM() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());

        RagAskRequest request = RagAskRequest.builder()
                .question("hôm nay thế nào")
                .wardName("Xã An Phú, Tỉnh An Giang")
                .build();

        RagAskResponse response = ragQueryService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        assertFalse(response.isAbstained(), "Wellbeing/small talk must NOT be abstained");
        assertEquals(1.0, response.getMaxSimilarity());
        assertTrue(response.getAnswer().contains("hoạt động bình thường 24/7"));
        assertTrue(response.getAnswer().contains("Xã An Phú, Tỉnh An Giang"));
        verifyNoInteractions(aiModelClient);
    }

    @Test
    void testAskQuestion_whenProcedureListQuery_shouldReturn40ProceduresCatalogWithoutLLM() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());

        RagAskRequest request = RagAskRequest.builder()
                .question("nêu 40 thủ tục")
                .wardName("Xã An Phú, Tỉnh An Giang")
                .build();

        RagAskResponse response = ragQueryService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        assertFalse(response.isAbstained(), "Procedure catalog query must NOT be abstained");
        assertEquals(1.0, response.getMaxSimilarity());
        assertTrue(response.getAnswer().contains("LĨNH VỰC HỘ TỊCH & NHÂN THÂN"));
        assertTrue(response.getAnswer().contains("TTHC-HT-01"));
        assertTrue(response.getAnswer().contains("TTHC-CR-01"));
        assertTrue(response.getAnswer().contains("TTHC-CT-01"));
        verifyNoInteractions(aiModelClient);
    }

    @Test
    void testPostVerifyCitations_shouldFilterHallucinatedChunkCodes() {
        LegalChunkMatch validChunk = createMockChunkMatch("KS-01-DK", "Khai sinh", "Hồ sơ", "Nội dung", "Luật", 0.85);

        String answerWithHallucination = "Theo quy định tại [KS-01-DK] bạn cần nộp giấy khai sinh, và theo [BIA-DAT-99] bạn phải đóng tiền.";

        List<LegalCitationDto> verified = ragQueryService.postVerifyCitations(answerWithHallucination, List.of(validChunk));

        assertEquals(1, verified.size(), "Hallucinated citation [BIA-DAT-99] must be stripped");
        assertEquals("KS-01-DK", verified.get(0).getChunkCode());
    }

    @Test
    void testAskQuestion_whenGrayZone_shouldAbstainWithSuggestionAndHitlLog() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());

        float[] mockVector = new float[768];
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(mockVector);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[0.1, 0.2]");

        LegalChunkMatch match = createMockChunkMatch("HT-02-DK", "Đăng ký kết hôn", "Điều kiện", "Nam từ đủ 20 tuổi...", "Luật Hôn nhân", 0.46);
        when(chunkRepository.findTopKSimilarChunksWithMetadata(anyString(), eq(3)))
                .thenReturn(List.of(match));

        ReflectionTestUtils.setField(ragQueryService, "defaultThreshold", 0.50);
        ReflectionTestUtils.setField(ragQueryService, "defaultThetaLower", 0.42);

        RagAskRequest request = RagAskRequest.builder()
                .question("Muốn lấy vợ cần làm sao")
                .build();

        RagAskResponse response = ragQueryService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        assertTrue(response.isAbstained(), "Gray zone queries must abstain safely");
        assertTrue(response.getAbstentionReason().contains("Vùng xám nghi vấn"));
        assertTrue(response.getAnswer().contains("Đăng ký kết hôn"));
        assertTrue(response.getAnswer().contains("Gợi ý: Hệ thống nhận thấy câu hỏi có thể liên quan đến thủ tục"));
        verify(aiModelClient, never()).generateChatResponse(anyString(), anyString());
    }

    @Test
    void testAskQuestion_whenResidenceQuery_shouldRouteToCongAnXaAndVNeID() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());

        float[] mockVector = new float[768];
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(mockVector);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[0.1, 0.2]");

        // Below theta_lower, pure out-of-scope abstention
        when(chunkRepository.findTopKSimilarChunksWithMetadata(anyString(), eq(3)))
                .thenReturn(Collections.emptyList());

        RagAskRequest request = RagAskRequest.builder()
                .question("Tôi muốn làm thủ tục tạm trú thì đến đâu?")
                .build();

        RagAskResponse response = ragQueryService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        assertTrue(response.isAbstained());
        assertTrue(response.getAnswer().contains("Công an cấp xã"));
        assertTrue(response.getAnswer().contains("VNeID"));
    }

    @Test
    void testAskQuestion_whenAiFails_shouldUseStructuredFallbackAnswer() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());

        float[] mockVector = new float[768];
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(mockVector);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[0.1, 0.2]");

        LegalChunkMatch match = createMockChunkMatch("KS-01-DK", "Đăng ký khai sinh", "Hồ sơ khai sinh", "Bao gồm giấy chứng sinh và CCCD cha mẹ.", "Luật Hộ tịch", 0.90);
        when(chunkRepository.findTopKSimilarChunksWithMetadata(anyString(), eq(3)))
                .thenReturn(List.of(match));

        // Simulate AI service failure (e.g. Gemini 429 quota exhausted or network error)
        when(aiModelClient.generateChatResponse(anyString(), anyString()))
                .thenThrow(new RuntimeException("Gemini 429 Resource Exhausted"));

        RagAskRequest request = RagAskRequest.builder()
                .question("Thủ tục làm khai sinh cho bé")
                .wardName("UBND Xã Vĩnh Lộc")
                .officeAddress("Số 1 Đường Liên Ấp")
                .build();

        RagAskResponse response = ragQueryService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        assertFalse(response.isAbstained(), "Should gracefully answer via database extraction even when AI fails");
        assertTrue(response.getAnswer().contains("1. TÓM TẮT THỦ TỤC:"));
        assertTrue(response.getAnswer().contains("2. THÀNH PHẦN HỒ SƠ:"));
        assertTrue(response.getAnswer().contains("3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:"));
        assertTrue(response.getAnswer().contains("4. NƠI TIẾP NHẬN & XỬ LÝ:"));
        assertTrue(response.getAnswer().contains("5. CĂN CỨ PHÁP LÝ & LƯU Ý:"));
        assertTrue(response.getAnswer().contains("*(Ghi chú: Thông tin được trích xuất trực tiếp từ hồ sơ thủ tục hành chính chính thức)*"));
    }

    @Test
    void testAskQuestion_whenTypoGreeting_shouldWelcomeWithChips() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());

        RagAskRequest request = RagAskRequest.builder()
                .question("chaogf ban")
                .wardName("Xã An Phú, Tỉnh An Giang")
                .build();

        RagAskResponse response = ragQueryService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        assertFalse(response.isAbstained(), "Typo greetings must NOT be abstained");
        assertEquals(1.0, response.getMaxSimilarity());
        assertTrue(response.getAnswer().contains("Trợ lý Pháp lý Một Cửa tại Xã An Phú, Tỉnh An Giang"));
        assertNotNull(response.getSuggestions(), "Greetings must include quick suggestion chips");
        assertFalse(response.getSuggestions().isEmpty());
        assertTrue(response.getSuggestions().stream().anyMatch(s -> s.contains("khai sinh")));
        verifyNoInteractions(aiModelClient);
    }

    @Test
    void testAskQuestion_whenAmbiguousConsultation_shouldClarifyNeeds() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());

        RagAskRequest request = RagAskRequest.builder()
                .question("bạn có thể tư vấn cho tôi không")
                .wardName("UBND Phường Mỹ Thới")
                .build();

        RagAskResponse response = ragQueryService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        assertFalse(response.isAbstained(), "Ambiguous consultation requests must NOT be abstained");
        assertEquals(1.0, response.getMaxSimilarity());
        assertTrue(response.getAnswer().contains("UBND Phường Mỹ Thới"));
        assertTrue(response.getAnswer().contains("Hộ tịch"));
        assertTrue(response.getAnswer().contains("Cư trú"));
        assertTrue(response.getAnswer().contains("Chứng thực"));
        assertNotNull(response.getSuggestions(), "Must provide suggestion chips for civic domains");
        assertFalse(response.getSuggestions().isEmpty());
        verifyNoInteractions(aiModelClient);
    }

    @Test
    void testAskQuestion_whenMultiTurnFollowUp_shouldResolveProcedureContext() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());

        float[] mockVector = new float[768];
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(mockVector);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[0.1, 0.2]");

        LegalChunkMatch feeChunk = createMockChunkMatch("HT-02-FEE", "Đăng ký kết hôn", "Lệ phí", "Miễn phí cho công dân Việt Nam cư trú trong nước.", "Luật Hôn nhân", 0.89);
        when(chunkRepository.findTopKSimilarChunksWithMetadata(anyString(), eq(3)))
                .thenReturn(List.of(feeChunk));

        when(aiModelClient.generateChatResponse(anyString(), anyString()))
                .thenReturn("1. TÓM TẮT THỦ TỤC: Đăng ký kết hôn hoàn toàn miễn phí.\n2. THÀNH PHẦN HỒ SƠ: CCCD và Giấy xác nhận độc thân.\n3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ: 01 ngày làm việc, Miễn phí.\n4. NƠI TIẾP NHẬN: Một cửa UBND xã.\n5. CĂN CỨ PHÁP LÝ & LƯU Ý: [HT-02-FEE] Căn cứ Luật Hôn nhân.");

        List<ConversationTurnDto> history = List.of(
                ConversationTurnDto.builder()
                        .role("citizen")
                        .content("Tôi muốn đăng ký kết hôn cần giấy tờ gì?")
                        .procedureCode("TTHC-HT-02")
                        .build(),
                ConversationTurnDto.builder()
                        .role("assistant")
                        .content("Để đăng ký kết hôn bạn cần chuẩn bị tờ khai và giấy xác nhận tình trạng hôn nhân.")
                        .procedureCode("TTHC-HT-02")
                        .build()
        );

        RagAskRequest request = RagAskRequest.builder()
                .question("còn lệ phí bao nhiêu?")
                .history(history)
                .build();

        RagAskResponse response = ragQueryService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        assertFalse(response.isAbstained(), "Multi-turn follow-up must be resolved and answered");
        assertEquals(0.89, response.getMaxSimilarity());
        assertTrue(response.getAnswer().contains("Đăng ký kết hôn"));
        assertNotNull(response.getSuggestions(), "Must provide subsequent follow-up suggestions");
        assertFalse(response.getSuggestions().isEmpty());

        // Verify that the query vectorization received the contextual procedure prefix
        verify(aiModelClient).generateEmbedding(argThat(query -> query.contains("Đăng ký kết hôn") && query.contains("còn lệ phí bao nhiêu?")));
    }

    @Test
    void testAskQuestion_whenOutOfScope_shouldReturnConciseRefusalWithinTwoSentences() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());

        float[] mockVector = new float[768];
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(mockVector);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[0.1, 0.2]");

        when(chunkRepository.findTopKSimilarChunksWithMetadata(anyString(), eq(3)))
                .thenReturn(Collections.emptyList());

        RagAskRequest request = RagAskRequest.builder()
                .question("làm hộ chiếu đi nước ngoài")
                .wardName("Xã An Phú")
                .build();

        RagAskResponse response = ragQueryService.askQuestion(request, "127.0.0.1");

        assertNotNull(response);
        assertTrue(response.isAbstained(), "Out-of-scope query must be safely abstained");
        assertTrue(response.getAnswer().contains("Cục Quản lý xuất nhập cảnh") || response.getAnswer().contains("Phòng Quản lý xuất nhập cảnh"));

        // Sentence count verification: Must be strictly <= 2 sentences
        String[] sentences = response.getAnswer().split("(?<=[.!?])\\s+");
        assertTrue(sentences.length <= 2, "Safe refusal must be concise and not exceed 2 sentences (actual: " + sentences.length + ")");
        assertNotNull(response.getSuggestions(), "Must include suggestion chips redirecting citizen to valid procedures");
        assertFalse(response.getSuggestions().isEmpty());
    }

    @Test
    void testResolveHitlItem_shouldApproveItemAndCacheVerifiedResponseFor24Hours() {
        var queue = ragQueryService.getHitlQueue();
        assertFalse(queue.isEmpty(), "HITL queue must be seeded with initial gray-zone items");

        String targetId = queue.get(0).getId();
        String targetQuery = queue.get(0).getQuery();
        String approvedText = "Hướng dẫn chính thức đã được cán bộ Tư pháp phê duyệt cho trường hợp mất giấy chứng sinh.";

        var resolved = ragQueryService.resolveHitlItem(targetId, approvedText, "Đ/c Nguyễn Văn Hòa");

        assertNotNull(resolved);
        assertEquals("APPROVED", resolved.getStatus());
        assertEquals("Đ/c Nguyễn Văn Hòa", resolved.getResolvedBy());
        assertEquals(approvedText, resolved.getSuggestedAnswer());
        verify(queryCacheService).putResponse(eq(targetQuery), any(RagAskResponse.class), eq(86400L));
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
