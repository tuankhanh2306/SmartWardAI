package vn.edu.uth.smartward.rag;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.common.QueryCacheService;
import vn.edu.uth.smartward.rag.dto.ProcedureContentDto;
import vn.edu.uth.smartward.rag.dto.ProcedureVersionDto;
import vn.edu.uth.smartward.rag.dto.ProposalCreateRequest;
import vn.edu.uth.smartward.security.OfficerAuthService.OfficerPrincipal;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class ProcedureAsyncVectorIndexTest {

    private AdminProcedureRepository procedureRepository;
    private ProcedureVersionRepository versionRepository;
    private LegalChunkRepository chunkRepository;
    private AiModelClient aiModelClient;
    private QueryCacheService queryCacheService;
    private ObjectMapper objectMapper;

    private ProcedureVectorIndexWorker indexWorker;
    private ProcedureGovernanceService governanceService;

    private final Map<Long, ProcedureVersion> versionStore = new LinkedHashMap<>();
    private final List<LegalChunk> chunkStore = new ArrayList<>();
    private final AtomicLong versionIdSeq = new AtomicLong(200);
    private AdminProcedure sampleProc;

    private OfficerPrincipal officerPrincipal;
    private OfficerPrincipal adminPrincipal;

    @BeforeEach
    void setUp() throws Exception {
        objectMapper = new ObjectMapper();
        procedureRepository = mock(AdminProcedureRepository.class);
        versionRepository = mock(ProcedureVersionRepository.class);
        chunkRepository = mock(LegalChunkRepository.class);
        aiModelClient = mock(AiModelClient.class);
        queryCacheService = mock(QueryCacheService.class);

        sampleProc = AdminProcedure.builder()
                .id(1L)
                .procedureCode("TTHC-HT-04")
                .portalCode("1.000894")
                .procedureName("Cấp bản sao Trích lục hộ tịch")
                .category("Hộ tịch")
                .agency("UBND cấp xã thuộc tỉnh An Giang")
                .processingTime("Giải quyết ngay trong ngày")
                .fee("8.000 đồng / bản sao")
                .status("ACTIVE")
                .formTemplateKey("GENERAL")
                .indexStatus("INDEXED")
                .createdAt(OffsetDateTime.now().minusDays(5))
                .updatedAt(OffsetDateTime.now().minusDays(5))
                .build();

        ProcedureContentDto v1Content = ProcedureContentDto.builder()
                .trinhTu("Bước 1: Nộp tờ khai.")
                .thanhPhanHoSo("Tờ khai + CCCD.")
                .thoiHanLePhi("Thời hạn: Trong ngày\nLệ phí: 8.000 đồng")
                .coQuanThucHien("UBND cấp xã thuộc tỉnh An Giang")
                .canCuPhapLy("Luật Hộ tịch 2014")
                .build();
        String v1Json = objectMapper.writeValueAsString(v1Content);

        ProcedureVersion v1 = ProcedureVersion.builder()
                .id(1L)
                .procedure(sampleProc)
                .versionNo(1)
                .content(v1Json)
                .contentHash(ProcedureGovernanceService.sha256Hex(v1Json))
                .state("PUBLISHED")
                .indexStatus("INDEXED")
                .indexRetryCount(0)
                .createdBy("SYSTEM_SEED")
                .build();
        versionStore.put(1L, v1);
        sampleProc.setCurrentVersionId(1L);

        String overviewV1 = String.format("Thủ tục: %s. Cơ quan thực hiện: %s. %s",
                sampleProc.getProcedureName(), v1Content.getCoQuanThucHien(), v1Content.getThoiHanLePhi());
        chunkStore.add(buildChunk(10L, "TTHC-HT-04_CHUNK_001", "OVERVIEW", overviewV1));
        chunkStore.add(buildChunk(11L, "TTHC-HT-04_CHUNK_002", "PROCESS_STEP", v1Content.getTrinhTu()));
        chunkStore.add(buildChunk(12L, "TTHC-HT-04_CHUNK_003", "REQUIRED_DOCUMENTS", v1Content.getThanhPhanHoSo()));
        chunkStore.add(buildChunk(13L, "TTHC-HT-04_CHUNK_004", "LEGAL_BASIS", v1Content.getCanCuPhapLy()));

        when(procedureRepository.findByProcedureCode("TTHC-HT-04")).thenReturn(Optional.of(sampleProc));
        when(procedureRepository.findById(1L)).thenReturn(Optional.of(sampleProc));
        when(procedureRepository.save(any(AdminProcedure.class))).thenAnswer(inv -> inv.getArgument(0));

        when(chunkRepository.findByProcedureId(1L)).thenAnswer(inv -> new ArrayList<>(chunkStore));
        when(chunkRepository.save(any(LegalChunk.class))).thenAnswer(inv -> {
            LegalChunk c = inv.getArgument(0);
            chunkStore.removeIf(existing -> existing.getChunkCode().equals(c.getChunkCode()));
            chunkStore.add(c);
            return c;
        });

        when(versionRepository.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(versionStore.get(inv.getArgument(0))));
        when(versionRepository.findByProcedureIdOrderByVersionNoDesc(1L)).thenAnswer(inv ->
                versionStore.values().stream()
                        .sorted(Comparator.comparing(ProcedureVersion::getVersionNo).reversed())
                        .toList());
        when(versionRepository.findByProcedureIdAndState(eq(1L), anyString())).thenAnswer(inv -> {
            String st = inv.getArgument(1);
            return versionStore.values().stream().filter(v -> st.equalsIgnoreCase(v.getState())).findFirst();
        });
        when(versionRepository.findByStateAndIndexStatusIn(eq("PUBLISHED"), anyList())).thenAnswer(inv -> {
            List<String> statuses = inv.getArgument(1);
            return versionStore.values().stream()
                    .filter(v -> "PUBLISHED".equalsIgnoreCase(v.getState()) && statuses.contains(v.getIndexStatus()))
                    .toList();
        });
        when(versionRepository.findMaxVersionNoByProcedureId(1L)).thenAnswer(inv ->
                versionStore.values().stream().mapToInt(ProcedureVersion::getVersionNo).max().orElse(0));
        when(versionRepository.save(any(ProcedureVersion.class))).thenAnswer(inv -> {
            ProcedureVersion pv = inv.getArgument(0);
            if (pv.getId() == null) pv.setId(versionIdSeq.incrementAndGet());
            versionStore.put(pv.getId(), pv);
            return pv;
        });
        when(versionRepository.saveAndFlush(any(ProcedureVersion.class))).thenAnswer(inv -> {
            ProcedureVersion pv = inv.getArgument(0);
            if (pv.getId() == null) pv.setId(versionIdSeq.incrementAndGet());
            versionStore.put(pv.getId(), pv);
            return pv;
        });

        indexWorker = new ProcedureVectorIndexWorker(
                procedureRepository,
                versionRepository,
                chunkRepository,
                new LegalChunkingService(),
                aiModelClient,
                queryCacheService,
                objectMapper
        );
        ReflectionTestUtils.setField(indexWorker, "maxAttemptsPerRun", 3);
        ReflectionTestUtils.setField(indexWorker, "initialBackoffMs", 5L);

        governanceService = new ProcedureGovernanceService(
                procedureRepository,
                versionRepository,
                chunkRepository,
                new LegalChunkingService(),
                aiModelClient,
                queryCacheService,
                null,
                objectMapper
        );

        long exp = Instant.now().getEpochSecond() + 3600;
        officerPrincipal = new OfficerPrincipal("CC-AG-8942", "Trần Quốc Bảo", "AG_P_LONGXUYEN", "OFFICER", "j1", exp);
        adminPrincipal = new OfficerPrincipal("ADM-AG-0001", "Lê Văn Quản Trị", "AG_PROVINCE", "ADMIN", "j2", exp);
    }

    private LegalChunk buildChunk(Long id, String code, String type, String content) {
        return LegalChunk.builder()
                .id(id)
                .procedure(sampleProc)
                .chunkCode(code)
                .chunkType(type)
                .title(sampleProc.getProcedureName() + " - " + type)
                .content(content)
                .contentHash(ProcedureGovernanceService.sha256Hex(content))
                .embedding("[0.1, 0.2, 0.3]")
                .embeddingModel("bkai_pho_bert_ft_v1")
                .status("ACTIVE")
                .build();
    }

    @Test
    @DisplayName("1. V15 Migration adds index_status, index_retry_count, index_error, indexed_at idempotently")
    void testV15MigrationSqlExistsAndIsIdempotent() throws Exception {
        Path v15 = Path.of("src/main/resources/db/migration/V15__add_procedure_index_status.sql");
        assertTrue(Files.exists(v15), "V15 migration file must exist");
        String sql = Files.readString(v15);
        assertTrue(sql.contains("ADD COLUMN IF NOT EXISTS index_status"));
        assertTrue(sql.contains("ADD COLUMN IF NOT EXISTS index_retry_count"));
        assertTrue(sql.contains("ADD COLUMN IF NOT EXISTS index_error"));
        assertTrue(sql.contains("ADD COLUMN IF NOT EXISTS indexed_at"));
        assertTrue(sql.contains("PENDING_INDEX"));
    }

    @Test
    @DisplayName("2. Admin approval returns IMMEDIATELY with PENDING_INDEX while slow Sidecar indexes asynchronously")
    void testApproveProposal_returnsImmediatelyWhileBackgroundWorkerIndexes() throws Exception {
        CountDownLatch sidecarStarted = new CountDownLatch(1);
        CountDownLatch allowSidecarFinish = new CountDownLatch(1);
        ExecutorService bgPool = Executors.newSingleThreadExecutor();

        ProcedureVectorIndexWorker asyncSpyWorker = spy(indexWorker);
        doAnswer(inv -> {
            Long procId = inv.getArgument(0);
            Long verId = inv.getArgument(1);
            return CompletableFuture.supplyAsync(() -> indexWorker.indexProcedureVersionWithRetry(procId, verId), bgPool);
        }).when(asyncSpyWorker).indexProcedureVersionAsync(anyLong(), anyLong());
        governanceService.setVectorIndexWorker(asyncSpyWorker);

        when(aiModelClient.generateEmbeddingResult(anyString())).thenAnswer(inv -> {
            sidecarStarted.countDown();
            assertTrue(allowSidecarFinish.await(5, TimeUnit.SECONDS));
            return new AiModelClient.EmbeddingResult(new float[]{0.8f, 0.7f, 0.6f}, "bkai_pho_bert_ft_v1", 3);
        });
        when(aiModelClient.toPgVectorString(any())).thenReturn("[0.8, 0.7, 0.6]");

        ProcedureContentDto v2Content = ProcedureContentDto.builder()
                .trinhTu("Bước 1: Nộp tờ khai.")
                .thanhPhanHoSo("Tờ khai + CCCD.")
                .thoiHanLePhi("Thời hạn: Trong ngày\nLệ phí: Miễn phí 0 đồng")
                .coQuanThucHien("UBND cấp xã thuộc tỉnh An Giang")
                .canCuPhapLy("Luật Hộ tịch 2014")
                .build();

        ProcedureVersionDto draft = governanceService.saveOrUpdateDraft(
                "TTHC-HT-04", ProposalCreateRequest.builder().content(v2Content).build(),
                officerPrincipal, "127.0.0.1", "JUnit");
        governanceService.submitProposal(draft.getId(), officerPrincipal, "127.0.0.1", "JUnit");

        long startMs = System.currentTimeMillis();
        ProcedureVersionDto approved = governanceService.approveProposal(
                draft.getId(), "Duyệt nhanh bất đồng bộ", adminPrincipal, "127.0.0.1", "JUnit");
        long elapsedMs = System.currentTimeMillis() - startMs;

        // Admin approval must NOT block waiting for Sidecar!
        assertEquals("PUBLISHED", approved.getState());
        assertEquals("PENDING_INDEX", approved.getIndexStatus());
        assertTrue(elapsedMs < 500, "Admin approval should return immediately without waiting for AI Sidecar");

        // Now let the background worker finish and verify pgvector & index_status transition to INDEXED
        assertTrue(sidecarStarted.await(3, TimeUnit.SECONDS), "Background worker should invoke Sidecar");
        allowSidecarFinish.countDown();
        bgPool.shutdown();
        assertTrue(bgPool.awaitTermination(5, TimeUnit.SECONDS));

        ProcedureVersion indexedVersion = versionStore.get(approved.getId());
        assertEquals("INDEXED", indexedVersion.getIndexStatus());
        assertEquals("INDEXED", sampleProc.getIndexStatus());
        assertNotNull(indexedVersion.getIndexedAt());
        LegalChunk updatedOverview = chunkStore.stream()
                .filter(c -> "OVERVIEW".equals(c.getChunkType()))
                .findFirst().orElseThrow();
        assertEquals("[0.8, 0.7, 0.6]", updatedOverview.getEmbedding());
    }

    @Test
    @DisplayName("3. Worker retries transient Sidecar busy error automatically and succeeds on attempt 2")
    void testWorker_retriesTransientBusyErrorAndReachesIndexed() {
        AtomicInteger calls = new AtomicInteger(0);
        when(aiModelClient.generateEmbeddingResult(anyString())).thenAnswer(inv -> {
            if (calls.incrementAndGet() == 1) {
                throw new RuntimeException("503 AI Sidecar busy");
            }
            return new AiModelClient.EmbeddingResult(new float[]{0.4f, 0.5f, 0.6f}, "bkai_pho_bert_ft_v1", 3);
        });
        when(aiModelClient.toPgVectorString(any())).thenReturn("[0.4, 0.5, 0.6]");

        ProcedureVersion v2 = createPublishedPendingVersion("Bước 1 mới (retry transient)");
        String result = indexWorker.indexProcedureVersionWithRetry(1L, v2.getId());

        assertEquals("INDEXED", result);
        assertEquals("INDEXED", v2.getIndexStatus());
        assertEquals("INDEXED", sampleProc.getIndexStatus());
        assertNull(v2.getIndexError());
        assertEquals(2, calls.get());
        verify(queryCacheService, atLeastOnce()).clearAllRagCache();
    }

    @Test
    @DisplayName("4. Persistent Sidecar outage marks FAILED, preserves old vector, and scheduled retry recovers to INDEXED")
    void testWorker_marksFailedOnOutagePreservesOldVector_thenScheduledRetryRecovers() {
        when(aiModelClient.generateEmbeddingResult(anyString()))
                .thenThrow(new RuntimeException("Connection refused to ai-sidecar:8000"));

        ProcedureVersion v2 = createPublishedPendingVersion("Bước 1 mới khi Sidecar sập");
        String firstResult = indexWorker.indexProcedureVersionWithRetry(1L, v2.getId());

        assertEquals("FAILED", firstResult);
        assertEquals("FAILED", v2.getIndexStatus());
        assertEquals("FAILED", sampleProc.getIndexStatus());
        assertEquals(1, v2.getIndexRetryCount());
        assertNotNull(v2.getIndexError());

        // Old PROCESS_STEP vector must remain untouched during outage
        LegalChunk unchangedProcess = chunkStore.stream()
                .filter(c -> "PROCESS_STEP".equals(c.getChunkType()))
                .findFirst().orElseThrow();
        assertEquals("Bước 1: Nộp tờ khai.", unchangedProcess.getContent());
        assertEquals("[0.1, 0.2, 0.3]", unchangedProcess.getEmbedding());

        // Sidecar comes back online -> scheduled retry worker heals FAILED -> INDEXED
        reset(aiModelClient);
        when(aiModelClient.generateEmbeddingResult(anyString()))
                .thenReturn(new AiModelClient.EmbeddingResult(new float[]{0.9f, 0.9f, 0.9f}, "bkai_pho_bert_ft_v1", 3));
        when(aiModelClient.toPgVectorString(any())).thenReturn("[0.9, 0.9, 0.9]");

        int recovered = indexWorker.retryPendingAndFailedIndexes();
        assertEquals(1, recovered);
        assertEquals("INDEXED", v2.getIndexStatus());
        assertEquals("INDEXED", sampleProc.getIndexStatus());
        assertNull(v2.getIndexError());
        LegalChunk healedProcess = chunkStore.stream()
                .filter(c -> "PROCESS_STEP".equals(c.getChunkType()))
                .findFirst().orElseThrow();
        assertEquals("Bước 1 mới khi Sidecar sập", healedProcess.getContent());
        assertEquals("[0.9, 0.9, 0.9]", healedProcess.getEmbedding());
    }

    private ProcedureVersion createPublishedPendingVersion(String newTrinhTu) {
        try {
            ProcedureContentDto v2Content = ProcedureContentDto.builder()
                    .trinhTu(newTrinhTu)
                    .thanhPhanHoSo("Tờ khai + CCCD.")
                    .thoiHanLePhi("Thời hạn: Trong ngày\nLệ phí: 8.000 đồng")
                    .coQuanThucHien("UBND cấp xã thuộc tỉnh An Giang")
                    .canCuPhapLy("Luật Hộ tịch 2014")
                    .build();
            String json = objectMapper.writeValueAsString(v2Content);
            versionStore.get(1L).setState("SUPERSEDED");
            ProcedureVersion v2 = ProcedureVersion.builder()
                    .id(versionIdSeq.incrementAndGet())
                    .procedure(sampleProc)
                    .versionNo(2)
                    .content(json)
                    .contentHash(ProcedureGovernanceService.sha256Hex(json))
                    .state("PUBLISHED")
                    .indexStatus("PENDING_INDEX")
                    .indexRetryCount(0)
                    .createdBy("CC-AG-8942")
                    .reviewedBy("ADM-AG-0001")
                    .build();
            versionStore.put(v2.getId(), v2);
            sampleProc.setCurrentVersionId(v2.getId());
            sampleProc.setIndexStatus("PENDING_INDEX");
            return v2;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
