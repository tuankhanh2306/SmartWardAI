package vn.edu.uth.smartward.rag;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.common.QueryCacheService;
import vn.edu.uth.smartward.common.RedisRateLimiter;
import vn.edu.uth.smartward.rag.dto.ConversationTurnDto;
import vn.edu.uth.smartward.rag.dto.RagAskRequest;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TASK-050 (bugfix/rag-retrieval-scope):
 * Verifies unified retrieval scope (ACTIVE status, effective_date, ACL visibility_scope, ward_code)
 * across primary vector search, cross-model vector fallback, FTS, and keyword fallback,
 * removal of hardcoded 0.92 score, v2 cache prefix, and multi-turn birth registration continuity.
 */
@ExtendWith(MockitoExtension.class)
class RagRetrievalScopeTest {

    @Mock
    private LegalChunkRepository chunkRepository;

    @Mock
    private AdminProcedureRepository procedureRepository;

    @Mock
    private AiModelClient aiModelClient;

    @Mock
    private QueryCacheService queryCacheService;

    @Mock
    private RedisRateLimiter redisRateLimiter;

    @Mock
    private HitlGrayZoneRepository hitlRepository;

    private RagQueryService ragQueryService;

    @BeforeEach
    void setUp() {
        ragQueryService = new RagQueryService(chunkRepository, aiModelClient, queryCacheService, redisRateLimiter);
        ReflectionTestUtils.setField(ragQueryService, "procedureRepository", procedureRepository);
        ReflectionTestUtils.setField(ragQueryService, "hitlRepository", hitlRepository);
        ReflectionTestUtils.setField(ragQueryService, "defaultThreshold", 0.78);
        ReflectionTestUtils.setField(ragQueryService, "defaultThetaLower", 0.42);
        ReflectionTestUtils.setField(ragQueryService, "defaultTopK", 3);
    }

    @Test
    @DisplayName("1. Cross-model vector fallback strictly enforces ACL and NEVER calls unscoped findTopKSimilarChunksWithMetadata")
    void testVectorCrossModelFallback_enforcesAclAndNeverBypassesScope() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(new float[768]);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[0.1, 0.2]");
        when(aiModelClient.getEmbeddingModelId()).thenReturn("gemini-embedding-001");

        // Primary model-specific ACL query returns empty, cross-model ACL query (model=null) returns scoped chunk
        when(chunkRepository.findTopKSimilarChunksWithAcl(anyString(), eq("gemini-embedding-001"), eq(false), eq("AG_P_LONGXUYEN"), anyInt()))
                .thenReturn(Collections.emptyList());
        LegalChunkMatch scopedMatch = new RagHybridFallbackMatcher.SimpleLegalChunkMatch(
                1L, "KS-01-DK", "REQUIRED_DOCS", "Thành phần hồ sơ khai sinh",
                "Tờ khai TK-KS và Giấy chứng sinh bản chính.", "Điều 16 Luật Hộ tịch",
                "TTHC-HT-01", "Đăng ký khai sinh", 0.86
        );
        when(chunkRepository.findTopKSimilarChunksWithAcl(anyString(), isNull(), eq(false), eq("AG_P_LONGXUYEN"), anyInt()))
                .thenReturn(List.of(scopedMatch));
        when(aiModelClient.generateChatResponse(anyString(), anyString()))
                .thenReturn("1. TÓM TẮT THỦ TỤC:\nThủ tục Đăng ký khai sinh [KS-01-DK].");

        RagAskRequest req = RagAskRequest.builder()
                .question("Đăng ký khai sinh cần giấy tờ gì?")
                .wardCode("AG_P_LONGXUYEN")
                .build();

        RagAskResponse resp = ragQueryService.askQuestion(req, "127.0.0.1");

        assertFalse(resp.isAbstained());
        assertEquals("TTHC-HT-01", resp.getCitations().get(0).getProcedureCode());
        assertEquals("TTHC-HT-01", resp.getResolvedProcedureCode());
        assertEquals("TK-KS", resp.getSupportedFormType());
        verify(chunkRepository, never()).findTopKSimilarChunksWithMetadata(anyString(), anyInt());
        verify(chunkRepository, never()).findTopKSimilarChunksWithMetadata(anyString(), anyString(), anyInt());
    }

    @Test
    @DisplayName("2. Keyword fallback excludes INACTIVE procedures, INACTIVE chunks, future effective_date, OFFICER_ONLY (for citizens), and cross-ward chunks")
    void testKeywordFallback_excludesOutOfScopeChunksAndInactiveProcedures() {
        // Case A: Inactive procedure -> completely excluded
        AdminProcedure inactiveProc = AdminProcedure.builder()
                .id(10L).procedureCode("TTHC-HT-01").procedureName("Đăng ký khai sinh").status("ARCHIVED").build();
        when(procedureRepository.findByProcedureCode("TTHC-HT-01")).thenReturn(Optional.of(inactiveProc));

        assertTrue(RagHybridFallbackMatcher.tryHybridProcedureKeywordMatch(
                "làm giấy khai sinh", procedureRepository, chunkRepository, false, "AG_P_LONGXUYEN").isEmpty(),
                "ARCHIVED procedure must be excluded by keyword fallback");

        // Case B: Active procedure, but chunks are OFFICER_ONLY, future-dated, INACTIVE, or belong to another ward
        AdminProcedure activeProc = AdminProcedure.builder()
                .id(11L).procedureCode("TTHC-HT-01").procedureName("Đăng ký khai sinh").status("ACTIVE").build();
        when(procedureRepository.findByProcedureCode("TTHC-HT-01")).thenReturn(Optional.of(activeProc));

        LegalChunk officerOnlyChunk = LegalChunk.builder()
                .id(1L).procedure(activeProc).chunkCode("KS-OFF").chunkType("INTERNAL")
                .title("Nội bộ cán bộ").content("Hướng dẫn thẩm định nội bộ")
                .status("ACTIVE").effectiveDate(LocalDate.now().minusDays(1))
                .visibilityScope("OFFICER_ONLY").wardCode(null).build();

        LegalChunk futureChunk = LegalChunk.builder()
                .id(2L).procedure(activeProc).chunkCode("KS-FUT").chunkType("OVERVIEW")
                .title("Chưa có hiệu lực").content("Quy định năm sau")
                .status("ACTIVE").effectiveDate(LocalDate.now().plusDays(15))
                .visibilityScope("PUBLIC").wardCode(null).build();

        LegalChunk inactiveChunk = LegalChunk.builder()
                .id(3L).procedure(activeProc).chunkCode("KS-OLD").chunkType("OVERVIEW")
                .title("Đã hết hiệu lực").content("Quy định cũ")
                .status("INACTIVE").effectiveDate(LocalDate.now().minusYears(1))
                .visibilityScope("PUBLIC").wardCode(null).build();

        LegalChunk otherWardChunk = LegalChunk.builder()
                .id(4L).procedure(activeProc).chunkCode("KS-CD").chunkType("OVERVIEW")
                .title("Riêng Châu Đốc").content("Hướng dẫn riêng Phường Châu Đốc")
                .status("ACTIVE").effectiveDate(LocalDate.now().minusDays(5))
                .visibilityScope("PUBLIC").wardCode("AG_P_CHAUDOC").build();

        List<LegalChunk> allDbChunks = List.of(officerOnlyChunk, futureChunk, inactiveChunk, otherWardChunk);
        when(chunkRepository.findScopedActiveChunksByProcedureId(eq(11L), anyBoolean(), any())).thenReturn(Collections.emptyList());
        when(chunkRepository.findByProcedureId(11L)).thenReturn(allDbChunks);

        // Citizen in AG_P_LONGXUYEN must get ZERO chunks (and must NOT get a synthesized overview bypassing filters!)
        List<LegalChunkMatch> citizenMatches = RagHybridFallbackMatcher.tryHybridProcedureKeywordMatch(
                "sinh con cần gì", procedureRepository, chunkRepository, false, "AG_P_LONGXUYEN");
        assertTrue(citizenMatches.isEmpty(), "Citizen must not receive OFFICER_ONLY, future, inactive, or cross-ward chunks");

        // Officer in AG_P_LONGXUYEN receives ONLY the OFFICER_ONLY active chunk (not future, inactive, or cross-ward)
        List<LegalChunkMatch> officerMatches = RagHybridFallbackMatcher.tryHybridProcedureKeywordMatch(
                "sinh con cần gì", procedureRepository, chunkRepository, true, "AG_P_LONGXUYEN");
        assertEquals(1, officerMatches.size());
        assertEquals("KS-OFF", officerMatches.get(0).getChunkCode());
    }

    @Test
    @DisplayName("3. Keyword fallback removes hardcoded 0.92: vague keyword match enters gray-zone [0.42, 0.78) with suggestion & HITL")
    void testKeywordFallback_doesNotHardcode092AndRoutesGrayZoneToHitl() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(new float[768]);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[0.1, 0.2]");
        when(chunkRepository.findTopKSimilarChunksWithAcl(anyString(), any(), anyBoolean(), any(), anyInt()))
                .thenReturn(Collections.emptyList());

        AdminProcedure birthProc = AdminProcedure.builder()
                .id(1L).procedureCode("TTHC-HT-01").procedureName("Đăng ký khai sinh").status("ACTIVE").build();
        LegalChunk publicChunk = LegalChunk.builder()
                .id(100L).procedure(birthProc).chunkCode("KS-01-DK").chunkType("OVERVIEW")
                .title("Tổng quan khai sinh").content("Đăng ký khai sinh tại UBND cấp xã.")
                .status("ACTIVE").effectiveDate(LocalDate.now().minusDays(10))
                .visibilityScope("PUBLIC").build();

        when(procedureRepository.findByProcedureCode("TTHC-HT-01")).thenReturn(Optional.of(birthProc));
        when(chunkRepository.findScopedActiveChunksByProcedureId(eq(1L), eq(false), any())).thenReturn(List.of(publicChunk));
        when(chunkRepository.findByProcedureId(1L)).thenReturn(List.of(publicChunk));

        RagAskRequest req = RagAskRequest.builder()
                .question("mới sinh con")
                .wardCode("AG_P_LONGXUYEN")
                .build();

        RagAskResponse resp = ragQueryService.askQuestion(req, "127.0.0.1");

        assertTrue(resp.getMaxSimilarity() >= 0.42 && resp.getMaxSimilarity() < 0.78,
                "Uncalibrated keyword fallback score must stay in gray-zone [0.42, 0.78), got " + resp.getMaxSimilarity());
        assertTrue(resp.isAbstained(), "Gray-zone keyword match must abstain safely instead of forcing 0.92");
        assertTrue(resp.getAbstentionReason().contains("Vùng xám nghi vấn"));
        assertTrue(resp.getAnswer().contains("Đăng ký khai sinh"), "Must suggest the matched procedure to the citizen");
        verify(hitlRepository).save(any(HitlGrayZoneItem.class));
        verify(aiModelClient, never()).generateChatResponse(anyString(), anyString());
    }

    @Test
    @DisplayName("4. Three sequential follow-up turns (fee, timeframe, submission office) preserve TTHC-HT-01 Birth Registration")
    void testThreeFollowUpTurns_preserveBirthRegistrationProcedureCode() {
        when(redisRateLimiter.isAllowed(anyString())).thenReturn(true);
        when(queryCacheService.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(new float[768]);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[0.1, 0.2]");

        LegalChunkMatch birthMatch = new RagHybridFallbackMatcher.SimpleLegalChunkMatch(
                1L, "KS-01-DK", "TIME_FEE", "Thời hạn & Lệ phí khai sinh",
                "Miễn phí lệ phí đăng ký khai sinh đúng hạn; giải quyết ngay trong ngày làm việc.",
                "Luật Hộ tịch 2014", "TTHC-HT-01", "Đăng ký khai sinh", 0.89
        );
        when(chunkRepository.findTopKSimilarChunksWithAcl(anyString(), any(), anyBoolean(), any(), anyInt()))
                .thenReturn(List.of(birthMatch));
        when(aiModelClient.generateChatResponse(anyString(), anyString()))
                .thenReturn("1. TÓM TẮT THỦ TỤC:\nThủ tục Đăng ký khai sinh [KS-01-DK] miễn phí, giải quyết trong 01 ngày làm việc tại Bộ phận Một cửa UBND Phường Long Xuyên.");

        List<ConversationTurnDto> history = new java.util.ArrayList<>();
        history.add(ConversationTurnDto.builder().role("citizen").content("Thủ tục đăng ký khai sinh cần gì?").build());
        history.add(ConversationTurnDto.builder().role("assistant").content("1. TÓM TẮT THỦ TỤC:\nThủ tục Đăng ký khai sinh cần Giấy chứng sinh.").procedureCode("TTHC-HT-01").build());

        for (String followUp : List.of("còn lệ phí bao nhiêu?", "thời hạn giải quyết bao lâu?", "nơi nộp ở đâu?")) {
            RagAskResponse r = ragQueryService.askQuestion(
                    RagAskRequest.builder().question(followUp).wardCode("AG_P_LONGXUYEN").history(history).build(),
                    "127.0.0.1"
            );
            assertFalse(r.isAbstained());
            assertEquals("TTHC-HT-01", r.getCitations().get(0).getProcedureCode(),
                    "Follow-up '" + followUp + "' must retain TTHC-HT-01");
            history.add(ConversationTurnDto.builder().role("citizen").content(followUp).build());
            history.add(ConversationTurnDto.builder().role("assistant").content(r.getAnswer())
                    .procedureCode(r.getCitations().get(0).getProcedureCode()).build());
        }

        verify(aiModelClient, times(3)).generateEmbedding(argThat(q -> q.contains("Đăng ký khai sinh")));
    }

    @Test
    @DisplayName("5. QueryCacheService uses bumped v2 cache namespace (smartward:cache:rag:v2:)")
    void testQueryCacheVersionBumpedToV2() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        QueryCacheService cacheService = new QueryCacheService(redis, new ObjectMapper());
        String key = cacheService.buildCacheKey("Đăng ký khai sinh", "AG_P_LONGXUYEN", "Phường Long Xuyên", "HO_TICH");
        assertTrue(key.startsWith("smartward:cache:rag:v2:"),
                "Cache key must use v2 namespace so stale v1 answers are invalidated, got: " + key);
    }
}
