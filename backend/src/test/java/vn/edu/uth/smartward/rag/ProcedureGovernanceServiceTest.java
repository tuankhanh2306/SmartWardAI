package vn.edu.uth.smartward.rag;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.audit.AuditLog;
import vn.edu.uth.smartward.audit.AuditLogRepository;
import vn.edu.uth.smartward.audit.AuditService;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.common.QueryCacheService;
import vn.edu.uth.smartward.rag.dto.*;
import vn.edu.uth.smartward.security.OfficerAuthService;
import vn.edu.uth.smartward.security.OfficerAuthService.OfficerPrincipal;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class ProcedureGovernanceServiceTest {

    private AdminProcedureRepository procedureRepository;
    private ProcedureVersionRepository versionRepository;
    private LegalChunkRepository chunkRepository;
    private AiModelClient aiModelClient;
    private QueryCacheService queryCacheService;
    private AuditLogRepository auditLogRepository;
    private AuditService auditService;
    private ProcedureGovernanceService governanceService;
    private ObjectMapper objectMapper;

    private final Map<Long, ProcedureVersion> versionStore = new LinkedHashMap<>();
    private final List<LegalChunk> chunkStore = new ArrayList<>();
    private final List<AuditLog> auditStore = new ArrayList<>();
    private final AtomicLong versionIdSeq = new AtomicLong(100);
    private AdminProcedure sampleProc;

    private OfficerPrincipal officerPrincipal;
    private OfficerPrincipal admin1Principal;
    private OfficerPrincipal admin2Principal;

    @BeforeEach
    void setUp() throws Exception {
        objectMapper = new ObjectMapper();
        procedureRepository = mock(AdminProcedureRepository.class);
        versionRepository = mock(ProcedureVersionRepository.class);
        chunkRepository = mock(LegalChunkRepository.class);
        aiModelClient = mock(AiModelClient.class);
        queryCacheService = mock(QueryCacheService.class);
        auditLogRepository = mock(AuditLogRepository.class);

        when(auditLogRepository.save(any(AuditLog.class))).thenAnswer(inv -> {
            AuditLog logEntry = inv.getArgument(0);
            auditStore.add(logEntry);
            return logEntry;
        });
        auditService = new AuditService(auditLogRepository);

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
                .createdAt(OffsetDateTime.now().minusDays(10))
                .updatedAt(OffsetDateTime.now().minusDays(10))
                .build();

        // Seed v1 PUBLISHED version
        ProcedureContentDto v1Content = ProcedureContentDto.builder()
                .trinhTu("Bước 1: Nộp tờ khai tại Bộ phận Một cửa.\nBước 2: Cán bộ tra cứu Sổ hộ tịch điện tử và cấp bản sao.")
                .thanhPhanHoSo("Tờ khai cấp bản sao trích lục hộ tịch; CCCD hoặc VNeID.")
                .thoiHanLePhi("Thời hạn giải quyết: Giải quyết ngay trong ngày\nLệ phí: 8.000 đồng / bản sao")
                .coQuanThucHien("UBND cấp xã thuộc tỉnh An Giang")
                .canCuPhapLy("Luật Hộ tịch 2014; Nghị định 123/2015/NĐ-CP")
                .build();
        String v1Json = objectMapper.writeValueAsString(v1Content);

        ProcedureVersion v1 = ProcedureVersion.builder()
                .id(1L)
                .procedure(sampleProc)
                .versionNo(1)
                .content(v1Json)
                .contentHash(ProcedureGovernanceService.sha256Hex(v1Json))
                .state("PUBLISHED")
                .createdBy("SYSTEM_SEED")
                .createdAt(OffsetDateTime.now().minusDays(10))
                .publishedAt(OffsetDateTime.now().minusDays(10))
                .reviewedBy("ADM-AG-0001")
                .source("MANUAL")
                .build();
        versionStore.put(1L, v1);
        sampleProc.setCurrentVersionId(1L);

        // Seed 4 initial chunks matching v1Content
        String overviewV1 = String.format("Thủ tục: %s. Cơ quan thực hiện: %s. %s",
                sampleProc.getProcedureName(), v1Content.getCoQuanThucHien(), v1Content.getThoiHanLePhi());
        chunkStore.add(buildChunk(10L, "TTHC-HT-04_CHUNK_001", "OVERVIEW", overviewV1));
        chunkStore.add(buildChunk(11L, "TTHC-HT-04_CHUNK_002", "PROCESS_STEP", v1Content.getTrinhTu()));
        chunkStore.add(buildChunk(12L, "TTHC-HT-04_CHUNK_003", "REQUIRED_DOCUMENTS", v1Content.getThanhPhanHoSo()));
        chunkStore.add(buildChunk(13L, "TTHC-HT-04_CHUNK_004", "LEGAL_BASIS", v1Content.getCanCuPhapLy()));

        when(procedureRepository.findByProcedureCode("TTHC-HT-04")).thenReturn(Optional.of(sampleProc));
        when(procedureRepository.searchProcedures(any(), any())).thenReturn(List.of(sampleProc));
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
                        .filter(v -> v.getProcedure().getId().equals(1L))
                        .sorted(Comparator.comparing(ProcedureVersion::getVersionNo).reversed())
                        .toList()
        );
        when(versionRepository.findByProcedureIdAndState(eq(1L), anyString())).thenAnswer(inv -> {
            String targetState = inv.getArgument(1);
            return versionStore.values().stream()
                    .filter(v -> v.getProcedure().getId().equals(1L) && targetState.equalsIgnoreCase(v.getState()))
                    .findFirst();
        });
        when(versionRepository.findByStateOrderBySubmittedAtDescCreatedAtDesc(anyString())).thenAnswer(inv -> {
            String targetState = inv.getArgument(0);
            return versionStore.values().stream()
                    .filter(v -> targetState.equalsIgnoreCase(v.getState()))
                    .toList();
        });
        when(versionRepository.findMaxVersionNoByProcedureId(1L)).thenAnswer(inv ->
                versionStore.values().stream()
                        .filter(v -> v.getProcedure().getId().equals(1L))
                        .mapToInt(ProcedureVersion::getVersionNo)
                        .max()
                        .orElse(0)
        );
        when(versionRepository.save(any(ProcedureVersion.class))).thenAnswer(inv -> {
            ProcedureVersion pv = inv.getArgument(0);
            if (pv.getId() == null) {
                pv.setId(versionIdSeq.incrementAndGet());
            }
            versionStore.put(pv.getId(), pv);
            return pv;
        });
        when(versionRepository.saveAndFlush(any(ProcedureVersion.class))).thenAnswer(inv -> {
            ProcedureVersion pv = inv.getArgument(0);
            if (pv.getId() == null) {
                pv.setId(versionIdSeq.incrementAndGet());
            }
            versionStore.put(pv.getId(), pv);
            return pv;
        });

        governanceService = new ProcedureGovernanceService(
                procedureRepository,
                versionRepository,
                chunkRepository,
                new LegalChunkingService(),
                aiModelClient,
                queryCacheService,
                auditService,
                objectMapper
        );

        long exp = Instant.now().getEpochSecond() + 3600;
        officerPrincipal = new OfficerPrincipal("CC-AG-8942", "Trần Quốc Bảo", "AG_P_LONGXUYEN", "OFFICER", "jti-off", exp);
        admin1Principal = new OfficerPrincipal("ADM-AG-0001", "Lê Văn Quản Trị", "AG_P_LONGXUYEN", "ADMIN", "jti-adm1", exp);
        admin2Principal = new OfficerPrincipal("ADM-AG-0002", "Phạm Minh Quân", "AG_P_LONGXUYEN", "ADMIN", "jti-adm2", exp);
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
                .embeddingModel("gemini-embedding-001")
                .status("ACTIVE")
                .build();
    }

    @Test
    @DisplayName("1. V10 Migration SQL is idempotent, enforces 1 PUBLISHED partial index, DEFERRABLE FK, and audit_log triggers")
    void testV10MigrationSqlIdempotencyAndConstraints() throws Exception {
        Path v10Path = Path.of("src/main/resources/db/migration/V10__procedure_governance_compact.sql");
        assertTrue(Files.exists(v10Path), "V10 migration file must exist");
        String sql = Files.readString(v10Path);

        assertThat(sql).contains("CREATE TABLE IF NOT EXISTS procedure_versions");
        assertThat(sql).contains("CREATE UNIQUE INDEX IF NOT EXISTS uq_procedure_versions_one_published");
        assertThat(sql).contains("WHERE state = 'PUBLISHED'");
        assertThat(sql).contains("DEFERRABLE INITIALLY DEFERRED");
        assertThat(sql).contains("ON CONFLICT (procedure_id, version_no) DO NOTHING");
        assertThat(sql).contains("BEFORE UPDATE OR DELETE ON audit_log");
        assertThat(sql).contains("BEFORE TRUNCATE ON audit_log");
        assertThat(sql).contains("AUDIT_LOG_IMMUTABLE");
    }

    @Test
    @DisplayName("2. Role-Based Access Control: Unauthenticated gets 401; Officer calling Admin endpoints gets 403")
    void testRbacEnforcement_unauthenticated401_officerCallingAdmin403() {
        // Unauthenticated -> 401
        assertThatThrownBy(() -> governanceService.saveOrUpdateDraft("TTHC-HT-04", new ProposalCreateRequest(), null, "127.0.0.1", "JUnit"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertEquals(ErrorCode.UNAUTHORIZED, ((BusinessException) ex).getErrorCode()));

        // Officer calling Admin queue, diff, approve, reject -> 403 FORBIDDEN
        assertThatThrownBy(() -> governanceService.listProposalsByState("PENDING_REVIEW", officerPrincipal))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertEquals(ErrorCode.FORBIDDEN, ((BusinessException) ex).getErrorCode()));

        assertThatThrownBy(() -> governanceService.getProposalDiff(1L, officerPrincipal))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertEquals(ErrorCode.FORBIDDEN, ((BusinessException) ex).getErrorCode()));

        assertThatThrownBy(() -> governanceService.approveProposal(1L, "OK", officerPrincipal, "127.0.0.1", "JUnit"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertEquals(ErrorCode.FORBIDDEN, ((BusinessException) ex).getErrorCode()));

        assertThatThrownBy(() -> governanceService.rejectProposal(1L, "Lý do", officerPrincipal, "127.0.0.1", "JUnit"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertEquals(ErrorCode.FORBIDDEN, ((BusinessException) ex).getErrorCode()));
    }

    @Test
    @DisplayName("3. Four-Eyes Principle: Creator cannot self-approve their own proposal (even when creator is ADMIN)")
    void testFourEyesPrinciple_adminCannotSelfApproveOwnProposal() {
        ProcedureContentDto content = ProcedureContentDto.builder()
                .trinhTu("Bước 1: Nộp hồ sơ trực tuyến.")
                .thanhPhanHoSo("Tờ khai + CCCD.")
                .thoiHanLePhi("Thời hạn giải quyết: 01 ngày\nLệ phí: Miễn phí")
                .coQuanThucHien("UBND cấp xã thuộc tỉnh An Giang")
                .canCuPhapLy("Luật Hộ tịch 2014")
                .build();

        // Admin 1 creates and submits a proposal
        ProcedureVersionDto draft = governanceService.saveOrUpdateDraft(
                "TTHC-HT-04",
                ProposalCreateRequest.builder().content(content).build(),
                admin1Principal,
                "127.0.0.1",
                "JUnit"
        );
        ProcedureVersionDto submitted = governanceService.submitProposal(draft.getId(), admin1Principal, "127.0.0.1", "JUnit");
        assertEquals("PENDING_REVIEW", submitted.getState());

        // Admin 1 tries to approve their own proposal -> 403 SELF_APPROVAL_FORBIDDEN
        assertThatThrownBy(() -> governanceService.approveProposal(submitted.getId(), "Tự duyệt", admin1Principal, "127.0.0.1", "JUnit"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertEquals(ErrorCode.FORBIDDEN, be.getErrorCode());
                    assertThat(be.getMessage()).contains("SELF_APPROVAL_FORBIDDEN");
                });

        // Secondary Admin (ADM-AG-0002) CAN approve Admin 1's proposal
        when(aiModelClient.generateEmbeddingResult(anyString()))
                .thenReturn(new AiModelClient.EmbeddingResult(new float[]{0.5f, 0.5f, 0.5f}, "gemini-embedding-001", 3));
        when(aiModelClient.toPgVectorString(any())).thenReturn("[0.5, 0.5, 0.5]");

        ProcedureVersionDto approved = governanceService.approveProposal(submitted.getId(), "Đồng ý phê duyệt chéo", admin2Principal, "127.0.0.1", "JUnit");
        assertEquals("PUBLISHED", approved.getState());
        assertEquals("ADM-AG-0002", approved.getReviewedBy());
    }

    @Test
    @DisplayName("4. Five-Section Validator: Proposal missing any of the 5 standard sections cannot be submitted")
    void testFiveSectionValidator_rejectsIncompleteProposal() {
        ProcedureContentDto incomplete = ProcedureContentDto.builder()
                .trinhTu("Bước 1: Nộp hồ sơ.")
                .thanhPhanHoSo("Tờ khai mẫu.")
                .thoiHanLePhi("") // Blank fee/time!
                .coQuanThucHien("UBND cấp xã")
                .canCuPhapLy("   ") // Blank legal basis!
                .build();

        ProcedureVersionDto draft = governanceService.saveOrUpdateDraft(
                "TTHC-HT-04",
                ProposalCreateRequest.builder().content(incomplete).build(),
                officerPrincipal,
                "127.0.0.1",
                "JUnit"
        );
        assertEquals("DRAFT", draft.getState());

        assertThatThrownBy(() -> governanceService.submitProposal(draft.getId(), officerPrincipal, "127.0.0.1", "JUnit"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertEquals(ErrorCode.INVALID_REQUEST, be.getErrorCode());
                    assertThat(be.getMessage()).contains("thoi_han_le_phi");
                    assertThat(be.getMessage()).contains("can_cu_phap_ly");
                });
    }

    @Test
    @DisplayName("5. Published Immutability: Officer cannot directly modify PUBLISHED version")
    void testPublishedVersionCannotBeEditedInPlace() {
        ProcedureContentDto content = ProcedureContentDto.builder()
                .trinhTu("Bước 1").thanhPhanHoSo("Hồ sơ").thoiHanLePhi("Miễn phí")
                .coQuanThucHien("UBND").canCuPhapLy("Luật").build();

        // Attempting to pass proposalId=1L (which is PUBLISHED) to saveOrUpdateDraft -> 409 CONFLICT
        assertThatThrownBy(() -> governanceService.saveOrUpdateDraft(
                "TTHC-HT-04",
                ProposalCreateRequest.builder().proposalId(1L).content(content).build(),
                officerPrincipal,
                "127.0.0.1",
                "JUnit"
        ))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertEquals(ErrorCode.CONFLICT, ((BusinessException) ex).getErrorCode()));
    }

    @Test
    @DisplayName("6. Rejection requires mandatory review_note and records audit log")
    void testRejectProposal_requiresReviewNote() {
        ProcedureContentDto content = ProcedureContentDto.builder()
                .trinhTu("Bước 1").thanhPhanHoSo("Hồ sơ").thoiHanLePhi("Lệ phí: 10.000 đồng")
                .coQuanThucHien("UBND").canCuPhapLy("Luật Hộ tịch").build();

        ProcedureVersionDto draft = governanceService.saveOrUpdateDraft(
                "TTHC-HT-04",
                ProposalCreateRequest.builder().content(content).build(),
                officerPrincipal,
                "127.0.0.1",
                "JUnit"
        );
        governanceService.submitProposal(draft.getId(), officerPrincipal, "127.0.0.1", "JUnit");

        // Blank reviewNote -> 400 INVALID_REQUEST
        assertThatThrownBy(() -> governanceService.rejectProposal(draft.getId(), "   ", admin1Principal, "127.0.0.1", "JUnit"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertEquals(ErrorCode.INVALID_REQUEST, ((BusinessException) ex).getErrorCode()));

        // Valid reviewNote -> REJECTED
        ProcedureVersionDto rejected = governanceService.rejectProposal(
                draft.getId(),
                "Cần ghi rõ căn cứ Nghị quyết HĐND tỉnh An Giang năm 2026",
                admin1Principal,
                "127.0.0.1",
                "JUnit"
        );
        assertEquals("REJECTED", rejected.getState());
        assertEquals("ADM-AG-0001", rejected.getReviewedBy());
        assertThat(auditStore).anyMatch(a -> "PROPOSAL_REJECTED".equals(a.getAction()) && a.getVersionNo() == 2);
    }

    @Test
    @DisplayName("7. Approval transitions v1 to SUPERSEDED, selectively re-embeds ONLY changed content_hash chunks, and updates RAG fee")
    void testApproveProposal_selectiveChunkReEmbeddingAndRagUpdate() {
        // Officer changes ONLY thoi_han_le_phi (fee changed from 8.000 đồng to Miễn phí 0 đồng khi nộp trực tuyến)
        // while keeping trinh_tu, thanh_phan_ho_so, co_quan_thuc_hien, can_cu_phap_ly IDENTICAL to v1!
        ProcedureContentDto v1Content = governanceService.getProcedureDetail("TTHC-HT-04").getPublishedVersion().getContent();
        ProcedureContentDto v2Content = ProcedureContentDto.builder()
                .trinhTu(v1Content.getTrinhTu()) // unchanged
                .thanhPhanHoSo(v1Content.getThanhPhanHoSo()) // unchanged
                .thoiHanLePhi("Thời hạn giải quyết: Giải quyết ngay trong ngày\nLệ phí: Miễn phí 0 đồng khi nộp trực tuyến qua Cổng DVC An Giang") // CHANGED!
                .coQuanThucHien(v1Content.getCoQuanThucHien()) // unchanged
                .canCuPhapLy(v1Content.getCanCuPhapLy()) // unchanged
                .build();

        ProcedureVersionDto draft = governanceService.saveOrUpdateDraft(
                "TTHC-HT-04",
                ProposalCreateRequest.builder().content(v2Content).build(),
                officerPrincipal,
                "127.0.0.1",
                "JUnit"
        );
        governanceService.submitProposal(draft.getId(), officerPrincipal, "127.0.0.1", "JUnit");

        // Verify Diff detects exactly 1 changed field (thoi_han_le_phi)
        ProposalDiffDto diff = governanceService.getProposalDiff(draft.getId(), admin1Principal);
        assertEquals(1, diff.getFromVersionNo());
        assertEquals(2, diff.getToVersionNo());
        long changedCount = diff.getFields().stream().filter(ProposalDiffDto.FieldDiff::isChanged).count();
        assertEquals(1, changedCount);
        assertTrue(diff.getFields().stream()
                .filter(f -> "thoi_han_le_phi".equals(f.getFieldKey()))
                .findFirst().orElseThrow().isChanged());

        when(aiModelClient.generateEmbeddingResult(anyString()))
                .thenReturn(new AiModelClient.EmbeddingResult(new float[]{0.9f, 0.8f, 0.7f}, "gemini-embedding-001", 3));
        when(aiModelClient.toPgVectorString(any())).thenReturn("[0.9, 0.8, 0.7]");

        // Admin approves v2
        ProcedureVersionDto publishedV2 = governanceService.approveProposal(
                draft.getId(),
                "Phê duyệt mức lệ phí trực tuyến 0 đồng",
                admin1Principal,
                "127.0.0.1",
                "JUnit"
        );

        assertEquals("PUBLISHED", publishedV2.getState());
        assertEquals("SUPERSEDED", versionStore.get(1L).getState(), "Old v1 must become SUPERSEDED");
        assertEquals(publishedV2.getId(), sampleProc.getCurrentVersionId());
        assertEquals("Miễn phí 0 đồng khi nộp trực tuyến qua Cổng DVC An Giang", sampleProc.getFee());

        // Verify ONLY the 1 changed chunk (OVERVIEW which includes thoi_han_le_phi) triggered generateEmbeddingResult!
        // The other 3 chunks (PROCESS_STEP, REQUIRED_DOCUMENTS, LEGAL_BASIS) had identical content_hash and were skipped!
        verify(aiModelClient, times(1)).generateEmbeddingResult(anyString());
        verify(queryCacheService, times(1)).clearAllRagCache();

        // Verify chunkStore now contains the new fee text for RAG answers
        LegalChunk updatedOverview = chunkStore.stream()
                .filter(c -> "OVERVIEW".equals(c.getChunkType()))
                .findFirst().orElseThrow();
        assertThat(updatedOverview.getContent()).contains("Miễn phí 0 đồng khi nộp trực tuyến qua Cổng DVC An Giang");
        assertEquals("[0.9, 0.8, 0.7]", updatedOverview.getEmbedding());

        // Verify AuditLog recorded beforeSnapshot and afterSnapshot
        AuditLog approveLog = auditStore.stream()
                .filter(a -> "PROPOSAL_APPROVED".equals(a.getAction()))
                .findFirst().orElseThrow();
        assertEquals("ADM-AG-0001", approveLog.getWho());
        assertEquals(2, approveLog.getVersionNo());
        assertThat(approveLog.getBeforeSnapshot()).contains("8.000 đồng / bản sao");
        assertThat(approveLog.getAfterSnapshot()).contains("Miễn phí 0 đồng khi nộp trực tuyến");
    }

    @Test
    @DisplayName("8. Fault-tolerance: When AI embedding fails during publish, existing RAG chunk content & vector are preserved")
    void testEmbeddingFailure_preservesExistingChunkContentAndVector() {
        ProcedureContentDto v1Content = governanceService.getProcedureDetail("TTHC-HT-04").getPublishedVersion().getContent();
        ProcedureContentDto v2Content = ProcedureContentDto.builder()
                .trinhTu("Bước 1 mới khi AI lỗi")
                .thanhPhanHoSo(v1Content.getThanhPhanHoSo())
                .thoiHanLePhi(v1Content.getThoiHanLePhi())
                .coQuanThucHien(v1Content.getCoQuanThucHien())
                .canCuPhapLy(v1Content.getCanCuPhapLy())
                .build();

        ProcedureVersionDto draft = governanceService.saveOrUpdateDraft(
                "TTHC-HT-04",
                ProposalCreateRequest.builder().content(v2Content).build(),
                officerPrincipal,
                "127.0.0.1",
                "JUnit"
        );
        governanceService.submitProposal(draft.getId(), officerPrincipal, "127.0.0.1", "JUnit");

        // Simulate AI embedding API failure
        when(aiModelClient.generateEmbeddingResult(anyString()))
                .thenThrow(new RuntimeException("Embedding service 503 Unavailable"));

        governanceService.approveProposal(draft.getId(), "Duyệt", admin1Principal, "127.0.0.1", "JUnit");

        // Existing PROCESS_STEP chunk must preserve its old content and old embedding vector
        LegalChunk processChunk = chunkStore.stream()
                .filter(c -> "PROCESS_STEP".equals(c.getChunkType()))
                .findFirst().orElseThrow();
        assertEquals(v1Content.getTrinhTu(), processChunk.getContent());
        assertEquals("[0.1, 0.2, 0.3]", processChunk.getEmbedding());
    }

    @Test
    @DisplayName("9. XSS & HTML Input Sanitization: Script tags and inline handlers are stripped from proposal content")
    void testInputSanitization_stripsScriptAndHtmlTags() {
        ProcedureContentDto dirty = ProcedureContentDto.builder()
                .trinhTu("<script>alert('xss')</script>Bước 1: Nộp hồ sơ <b onclick=\"evil()\">trực tiếp</b>")
                .thanhPhanHoSo("Tờ khai <img src=x onerror=\"steal()\"> chuẩn")
                .thoiHanLePhi("Lệ phí: 0 đồng")
                .coQuanThucHien("UBND cấp xã")
                .canCuPhapLy("javascript:void(0) Luật Hộ tịch")
                .build();

        ProcedureVersionDto draft = governanceService.saveOrUpdateDraft(
                "TTHC-HT-04",
                ProposalCreateRequest.builder().content(dirty).build(),
                officerPrincipal,
                "127.0.0.1",
                "JUnit"
        );

        assertThat(draft.getContent().getTrinhTu()).doesNotContain("<script>").doesNotContain("onclick");
        assertThat(draft.getContent().getThanhPhanHoSo()).doesNotContain("<img").doesNotContain("onerror");
        assertThat(draft.getContent().getCanCuPhapLy()).doesNotContain("javascript:");
    }

    @Test
    @DisplayName("10. OfficerAuthInterceptor enforces 401 on missing/expired JWT and 403 when ROLE_OFFICER calls Admin endpoints")
    void testOfficerAuthInterceptor_missingToken401_expiredToken401_officerOnAdminEndpoint403() {
        OfficerAuthService authService = new OfficerAuthService(objectMapper);
        org.springframework.test.util.ReflectionTestUtils.setField(authService, "jwtSecret", "0123456789abcdef0123456789abcdef0123456789abcdef");
        org.springframework.test.util.ReflectionTestUtils.setField(authService, "tokenTtlHours", 8);

        vn.edu.uth.smartward.security.OfficerAuthInterceptor interceptor =
                new vn.edu.uth.smartward.security.OfficerAuthInterceptor(authService, true);

        // 10a. Missing token -> 401 UNAUTHORIZED
        org.springframework.mock.web.MockHttpServletRequest reqNoToken =
                new org.springframework.mock.web.MockHttpServletRequest("GET", "/api/v1/admin/procedures");
        org.springframework.mock.web.MockHttpServletResponse resp = new org.springframework.mock.web.MockHttpServletResponse();
        assertThatThrownBy(() -> interceptor.preHandle(reqNoToken, resp, new Object()))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertEquals(ErrorCode.UNAUTHORIZED, ((BusinessException) ex).getErrorCode()));

        // 10b. Expired token -> 401 UNAUTHORIZED
        org.springframework.test.util.ReflectionTestUtils.setField(authService, "tokenTtlHours", -1);
        String expiredToken = authService.authenticate("CC-AG-8942", "8942", "AG_P_LONGXUYEN").token();
        org.springframework.test.util.ReflectionTestUtils.setField(authService, "tokenTtlHours", 8);

        org.springframework.mock.web.MockHttpServletRequest reqExpired =
                new org.springframework.mock.web.MockHttpServletRequest("GET", "/api/v1/admin/procedures");
        reqExpired.addHeader("Authorization", "Bearer " + expiredToken);
        assertThatThrownBy(() -> interceptor.preHandle(reqExpired, resp, new Object()))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertEquals(ErrorCode.UNAUTHORIZED, ((BusinessException) ex).getErrorCode()));

        // 10c. Valid OFFICER token can access /api/v1/admin/procedures and submit proposals, but gets 403 on /api/v1/admin/proposals/1/approve
        String officerToken = authService.authenticate("CC-AG-8942", "8942", "AG_P_LONGXUYEN").token();

        org.springframework.mock.web.MockHttpServletRequest reqOfficerAllowed =
                new org.springframework.mock.web.MockHttpServletRequest("POST", "/api/v1/admin/proposals/101/submit");
        reqOfficerAllowed.addHeader("Authorization", "Bearer " + officerToken);
        assertTrue(interceptor.preHandle(reqOfficerAllowed, resp, new Object()));

        org.springframework.mock.web.MockHttpServletRequest reqOfficerForbidden =
                new org.springframework.mock.web.MockHttpServletRequest("POST", "/api/v1/admin/proposals/101/approve");
        reqOfficerForbidden.addHeader("Authorization", "Bearer " + officerToken);
        assertThatThrownBy(() -> interceptor.preHandle(reqOfficerForbidden, resp, new Object()))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertEquals(ErrorCode.FORBIDDEN, ((BusinessException) ex).getErrorCode()));

        // 10d. Valid ADMIN token is allowed on /api/v1/admin/proposals/101/approve
        String adminToken = authService.authenticate("ADM-AG-0001", "9999", "AG_P_LONGXUYEN").token();
        org.springframework.mock.web.MockHttpServletRequest reqAdminAllowed =
                new org.springframework.mock.web.MockHttpServletRequest("POST", "/api/v1/admin/proposals/101/approve");
        reqAdminAllowed.addHeader("Authorization", "Bearer " + adminToken);
        assertTrue(interceptor.preHandle(reqAdminAllowed, resp, new Object()));
    }
}
