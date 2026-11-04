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
        assertTrue(response.getAnswer().contains("từ chối"));
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
    void testPostVerifyCitations_shouldFilterHallucinatedChunkCodes() {
        LegalChunkMatch validChunk = createMockChunkMatch("KS-01-DK", "Khai sinh", "Hồ sơ", "Nội dung", "Luật", 0.85);

        String answerWithHallucination = "Theo quy định tại [KS-01-DK] bạn cần nộp giấy khai sinh, và theo [BIA-DAT-99] bạn phải đóng tiền.";

        List<LegalCitationDto> verified = ragQueryService.postVerifyCitations(answerWithHallucination, List.of(validChunk));

        assertEquals(1, verified.size(), "Hallucinated citation [BIA-DAT-99] must be stripped");
        assertEquals("KS-01-DK", verified.get(0).getChunkCode());
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
