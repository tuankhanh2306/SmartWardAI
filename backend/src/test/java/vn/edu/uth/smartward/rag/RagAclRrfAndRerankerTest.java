package vn.edu.uth.smartward.rag;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.common.QueryCacheService;
import vn.edu.uth.smartward.common.RedisRateLimiter;
import vn.edu.uth.smartward.rag.dto.RagAskRequest;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RagAclRrfAndRerankerTest {

    private final LegalChunkReranker reranker = new LegalChunkReranker();

    private LegalChunkMatch match(long id, String code, String type, String procCode, String procName, String title, String content, double sim) {
        return new LegalChunkReranker.ScoredChunkMatch(id, code, type, title, content, "Luật Hộ tịch 2014", procCode, procName, sim, 0.0);
    }

    @Test
    @DisplayName("1. V17 Migration adds visibility_scope, ward_code, generated tsvector & GIN index")
    void testV17MigrationSql() throws Exception {
        Path v17 = Path.of("src/main/resources/db/migration/V17__add_legal_chunk_acl_and_fts.sql");
        assertTrue(Files.exists(v17));
        String sql = Files.readString(v17);
        assertTrue(sql.contains("visibility_scope VARCHAR(20) NOT NULL DEFAULT 'PUBLIC'"));
        assertTrue(sql.contains("ward_code VARCHAR(50)"));
        assertTrue(sql.contains("search_vector tsvector"));
        assertTrue(sql.contains("USING GIN (search_vector)"));
    }

    @Test
    @DisplayName("2. Hybrid RRF elevates chunks matched by BOTH vector and FTS above single-signal results")
    void testHybridRrfFusion() {
        LegalChunkMatch vecOnlyTop = match(1, "C-VEC", "OVERVIEW", "TTHC-01", "Thủ tục A", "Tiêu đề A", "Nội dung A", 0.84);
        LegalChunkMatch consensus = match(2, "C-BOTH", "REQUIRED_DOCUMENTS", "TTHC-CR-01", "Đăng ký thường trú CT01", "Thành phần hồ sơ CT01", "Tờ khai CT01 và giấy tờ chỗ ở hợp pháp", 0.81);
        LegalChunkMatch ftsOnly = match(3, "C-FTS", "LEGAL_BASIS", "TTHC-03", "Thủ tục C", "Căn cứ", "Nội dung C", 0.70);

        List<LegalChunkMatch> fused = reranker.fuseWithRrf(
                List.of(vecOnlyTop, consensus),
                List.of(consensus, ftsOnly),
                3
        );
        assertEquals("C-BOTH", fused.get(0).getChunkCode(), "Consensus chunk matched by vector + FTS must rank #1 under RRF");
        assertTrue(fused.get(0).getSimilarityScore() > 0.81);
    }

    @Test
    @DisplayName("3. Lightweight Reranker boosts matching section/title (MRR) without lifting out-of-scope low-sim chunks above 0.78")
    void testRerankerBoostsIntentWithoutBreakingAbstention() {
        LegalChunkMatch generic = match(1, "C-GEN", "LEGAL_BASIS", "TTHC-HT-01", "Đăng ký khai sinh", "Căn cứ pháp lý", "Luật Hộ tịch", 0.82);
        LegalChunkMatch feeChunk = match(2, "C-FEE", "OVERVIEW", "TTHC-HT-01", "Đăng ký khai sinh", "Thời hạn và lệ phí đăng ký khai sinh", "Lệ phí miễn phí 0 đồng", 0.80);

        List<LegalChunkMatch> ranked = reranker.rerank("Đăng ký khai sinh lệ phí bao nhiêu tiền?", List.of(generic, feeChunk), 2);
        assertEquals("C-FEE", ranked.get(0).getChunkCode(), "Fee query must promote OVERVIEW chunk to #1");

        // Out-of-scope low similarity chunk (0.35) MUST NOT be boosted across 0.78!
        LegalChunkMatch oos = match(9, "C-OOS", "OVERVIEW", "TTHC-HT-01", "Đăng ký khai sinh", "Lệ phí khai sinh", "Lệ phí 0 đồng", 0.35);
        List<LegalChunkMatch> oosRanked = reranker.rerank("lệ phí làm hộ chiếu bao nhiêu?", List.of(oos, generic), 2);
        LegalChunkMatch oosAfter = oosRanked.stream().filter(c -> "C-OOS".equals(c.getChunkCode())).findFirst().orElseThrow();
        assertEquals(0.35, oosAfter.getSimilarityScore(), 0.0001, "Low-similarity chunk (<0.55) must never receive rerank boost");
    }

    @Test
    @DisplayName("4. RagQueryService enforces ACL scope (CITIZEN includeOfficerScope=false vs OFFICER=true) & isolates cache")
    void testRagQueryServiceAclEnforcementAndCacheIsolation() {
        LegalChunkRepository chunkRepo = mock(LegalChunkRepository.class);
        AiModelClient aiClient = mock(AiModelClient.class);
        QueryCacheService cache = mock(QueryCacheService.class);
        RedisRateLimiter rateLimiter = mock(RedisRateLimiter.class);

        when(rateLimiter.isAllowed(anyString())).thenReturn(true);
        when(rateLimiter.isAllowed(anyString(), any(), any())).thenReturn(true);
        when(cache.buildCacheKey(any(), any(), any(), any())).thenReturn("rag:test-key");
        when(cache.getCachedResponse(anyString(), eq(RagAskResponse.class))).thenReturn(Optional.empty());
        when(aiClient.generateEmbedding(anyString())).thenReturn(new float[]{0.5f, 0.5f});
        when(aiClient.toPgVectorString(any())).thenReturn("[0.5,0.5]");
        when(aiClient.getEmbeddingModelId()).thenReturn("bkai_pho_bert_ft_v1");
        when(aiClient.generateChatResponse(anyString(), anyString())).thenReturn("1. TÓM TẮT THỦ TỤC:\nHợp lệ [PUBLIC-01].");

        LegalChunkMatch publicChunk = match(1, "PUBLIC-01", "OVERVIEW", "TTHC-HT-01", "Đăng ký khai sinh", "Khai sinh", "Nội dung công khai", 0.88);
        LegalChunkMatch internalChunk = match(2, "INTERNAL-01", "OVERVIEW", "TTHC-NB-01", "Quy trình nội bộ", "Quy trình nội bộ", "Chỉ dành cho cán bộ", 0.91);

        when(chunkRepo.findTopKSimilarChunksWithAcl(anyString(), anyString(), eq(false), any(), anyInt()))
                .thenReturn(List.of(publicChunk));
        when(chunkRepo.findTopKSimilarChunksWithAcl(anyString(), anyString(), eq(true), any(), anyInt()))
                .thenReturn(List.of(internalChunk));
        when(chunkRepo.findTopKFullTextChunksWithAcl(anyString(), anyBoolean(), any(), anyInt()))
                .thenReturn(List.of());

        RagQueryService service = new RagQueryService(chunkRepo, aiClient, cache, rateLimiter);
        ReflectionTestUtils.setField(service, "defaultThreshold", 0.78);
        ReflectionTestUtils.setField(service, "defaultThetaLower", 0.42);
        ReflectionTestUtils.setField(service, "defaultTopK", 3);

        RagAskRequest req = RagAskRequest.builder().question("Quy trình đăng ký khai sinh cần giấy tờ gì?").wardCode("AG_P_LONGXUYEN").build();

        // Citizen call -> includeOfficerScope MUST be false, never touches OFFICER cache key
        RagAskResponse citizenResp = service.askQuestion(req, "127.0.0.1", null, "sess-1");
        assertFalse(citizenResp.isAbstained());
        verify(chunkRepo).findTopKSimilarChunksWithAcl(anyString(), eq("bkai_pho_bert_ft_v1"), eq(false), eq("AG_P_LONGXUYEN"), anyInt());
        verify(cache).putResponse(eq("rag:test-key"), any());

        // Officer call -> includeOfficerScope MUST be true and cache key isolated with ::OFFICER
        RagAskResponse officerResp = service.askQuestion(req, "127.0.0.1", "CC-AG-8942", null);
        assertFalse(officerResp.isAbstained());
        verify(chunkRepo).findTopKSimilarChunksWithAcl(anyString(), eq("bkai_pho_bert_ft_v1"), eq(true), eq("AG_P_LONGXUYEN"), anyInt());
        verify(cache).putResponse(eq("rag:test-key::OFFICER"), any());
    }

    @Test
    @DisplayName("5. ProcedureDataSeeder startup sync detects mismatched embedding_model and re-embeds safely per chunk")
    void testStartupEmbeddingModelSynchronization() {
        AdminProcedureRepository procRepo = mock(AdminProcedureRepository.class);
        LegalChunkRepository chunkRepo = mock(LegalChunkRepository.class);
        AiModelClient aiClient = mock(AiModelClient.class);

        LegalChunk staleChunk = LegalChunk.builder()
                .id(1L).chunkCode("C1").title("Khai sinh").content("Nội dung").embeddingModel("old_model_v0").build();
        LegalChunk missingChunk = LegalChunk.builder()
                .id(2L).chunkCode("C2").title("Kết hôn").content("Nội dung 2").embedding(null).embeddingModel("bkai_pho_bert_ft_v1").build();

        when(aiClient.getEmbeddingModelId()).thenReturn("bkai_pho_bert_ft_v1");
        when(chunkRepo.findByEmbeddingIsNullOrEmbeddingModelNot("bkai_pho_bert_ft_v1"))
                .thenReturn(List.of(staleChunk, missingChunk));
        when(aiClient.generateEmbedding(anyString())).thenReturn(new float[]{0.2f, 0.8f});
        when(aiClient.toPgVectorString(any())).thenReturn("[0.2,0.8]");

        ProcedureDataSeeder seeder = new ProcedureDataSeeder(procRepo, chunkRepo, new ObjectMapper(), aiClient);
        int synced = seeder.synchronizeEmbeddingModelOnStartup();

        assertEquals(2, synced);
        assertEquals("bkai_pho_bert_ft_v1", staleChunk.getEmbeddingModel());
        assertEquals("[0.2,0.8]", staleChunk.getEmbedding());
        assertEquals("[0.2,0.8]", missingChunk.getEmbedding());
        verify(chunkRepo, times(2)).save(any(LegalChunk.class));
    }
}
