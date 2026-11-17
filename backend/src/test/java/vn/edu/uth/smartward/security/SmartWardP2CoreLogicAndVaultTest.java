package vn.edu.uth.smartward.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.dossier.CitizenDossierService;
import vn.edu.uth.smartward.dossier.DossierSubmissionResponse;
import vn.edu.uth.smartward.dossier.SubmitDossierRequest;
import vn.edu.uth.smartward.triage.TwoStageTriageService;
import vn.edu.uth.smartward.vault.ZeroTrustVaultService;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DisplayName("P2 Core Logic: RAG Embedding, Vault Hardening, SLA Vietnam Time & Triage Anti-Drift")
class SmartWardP2CoreLogicAndVaultTest {

    // =========================================================================
    // 6.3: RAG & Embedding Result Record, L2 Normalization & Cosine Similarity
    // =========================================================================

    @Test
    @DisplayName("6.3: AiModelClient.EmbeddingResult holds immutable vector, modelId, and dim")
    void testEmbeddingResult_recordIntegrity() {
        float[] vector = new float[]{0.6f, 0.8f};
        AiModelClient.EmbeddingResult result = new AiModelClient.EmbeddingResult(vector, "gemini-embedding-001", 2);

        assertEquals("gemini-embedding-001", result.modelId());
        assertEquals(2, result.dim());
        assertArrayEquals(vector, result.vector());
    }

    @Test
    @DisplayName("6.3: normalizeL2 computes unit norm vector and cosineSimilarity computes accurate angle")
    void testVectorMath_normalizationAndCosine() {
        float[] unnormalized = new float[]{3.0f, 4.0f}; // Norm = 5.0
        float[] normalized = AiModelClient.normalizeL2(unnormalized);

        assertNotNull(normalized);
        assertEquals(0.6f, normalized[0], 0.0001f);
        assertEquals(0.8f, normalized[1], 0.0001f);

        double selfCosine = AiModelClient.cosineSimilarity(normalized, normalized);
        assertEquals(1.0, selfCosine, 0.0001);

        float[] orthogonal = new float[]{-0.8f, 0.6f};
        double orthoCosine = AiModelClient.cosineSimilarity(normalized, orthogonal);
        assertEquals(0.0, orthoCosine, 0.0001);
    }

    // =========================================================================
    // 6.5: Vault Hardening (Magic Bytes & Safe Viewing Order)
    // =========================================================================

    @Test
    @DisplayName("6.5: Magic bytes validation accepts valid PNG, JPEG, PDF and rejects executable/script files")
    void testVault_magicBytesValidation() {
        // Valid PNG header: 89 50 4E 47
        byte[] validPng = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        assertDoesNotThrow(() -> ZeroTrustVaultService.validateMagicBytes(validPng));

        // Valid JPEG header: FF D8 FF
        byte[] validJpeg = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0};
        assertDoesNotThrow(() -> ZeroTrustVaultService.validateMagicBytes(validJpeg));

        // Valid PDF header: 25 50 44 46 (%PDF)
        byte[] validPdf = new byte[]{0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37};
        assertDoesNotThrow(() -> ZeroTrustVaultService.validateMagicBytes(validPdf));

        // Malicious EXE header: 4D 5A (MZ)
        byte[] maliciousExe = new byte[]{0x4D, 0x5A, (byte) 0x90, 0x00};
        assertThatThrownBy(() -> ZeroTrustVaultService.validateMagicBytes(maliciousExe))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertEquals(ErrorCode.VALIDATION_FAILED, ((BusinessException) ex).getErrorCode()));

        // HTML/Script payload: <script>
        byte[] scriptPayload = "<script>alert(1)</script>".getBytes();
        assertThatThrownBy(() -> ZeroTrustVaultService.validateMagicBytes(scriptPayload))
                .isInstanceOf(BusinessException.class);
    }

    // =========================================================================
    // 6.2: SLA Deadline in Asia/Ho_Chi_Minh & Submission Idempotency
    // =========================================================================

    @Test
    @DisplayName("6.2: SLA calculation enforces strict 17:00 Vietnam time (UTC+7) and skips weekends")
    void testSla_vietnamTimezoneAndWeekendSkipping() {
        // Submit on Friday at 09:00 Vietnam time: 2026-11-20T02:00:00Z
        ZonedDateTime fridayMorning = ZonedDateTime.of(2026, 11, 20, 9, 0, 0, 0, CitizenDossierService.VN_ZONE);
        Instant deadline = CitizenDossierService.calculateWorkingDayDeadline(fridayMorning.toInstant(), 1, CitizenDossierService.VN_ZONE);

        // 1 working day after Friday is Monday at 17:00 Vietnam time (2026-11-23 17:00:00 +07:00 -> 10:00:00Z)
        ZonedDateTime deadlineVn = deadline.atZone(CitizenDossierService.VN_ZONE);
        assertEquals(java.time.DayOfWeek.MONDAY, deadlineVn.getDayOfWeek());
        assertEquals(17, deadlineVn.getHour());
        assertEquals(0, deadlineVn.getMinute());
    }

    @Test
    @DisplayName("6.2: Idempotency-Key returns cached response without duplicate database save")
    void testDossierSubmission_idempotencyKey() {
        var dossierRepo = mock(vn.edu.uth.smartward.dossier.CitizenDossierRepository.class);
        when(dossierRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CitizenDossierService service = new CitizenDossierService(
                dossierRepo,
                null,
                new com.fasterxml.jackson.databind.ObjectMapper()
        );

        SubmitDossierRequest req = SubmitDossierRequest.builder()
                .procedureCode("TTHC-CT-01")
                .wardCode("AG_P_LONGXUYEN")
                .citizenCccd("079095012345")
                .idempotencyKey("IDEMP-KEY-999")
                .build();

        DossierSubmissionResponse res1 = service.submitDossier(req);
        DossierSubmissionResponse res2 = service.submitDossier(req);

        assertNotNull(res1);
        assertNotNull(res2);
        assertEquals(res1.dossierCode(), res2.dossierCode());
        // Verify repository.save was called only once due to idempotency cache
        verify(dossierRepo, times(1)).save(any());
    }

    // =========================================================================
    // 6.4: Triage Cluster Guard (Status Whitelist & Anti-Drift)
    // =========================================================================

    @Test
    @DisplayName("6.4: Triage updateClusterStatus rejects invalid status not in whitelist")
    void testTriage_statusWhitelist() {
        var clusterRepo = mock(vn.edu.uth.smartward.triage.IssueClusterRepository.class);
        var mockCluster = vn.edu.uth.smartward.triage.IssueCluster.builder()
                .clusterCode("CLUSTER-001")
                .status("OPEN")
                .category("Giao thông")
                .centerLatitude(java.math.BigDecimal.valueOf(10.0))
                .centerLongitude(java.math.BigDecimal.valueOf(105.0))
                .build();
        when(clusterRepo.findByClusterCode("CLUSTER-001")).thenReturn(Optional.of(mockCluster));
        when(clusterRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TwoStageTriageService triageService = new TwoStageTriageService(
                mock(vn.edu.uth.smartward.triage.SpatialIndexService.class),
                clusterRepo,
                mock(vn.edu.uth.smartward.triage.CivicReportRepository.class),
                mock(AiModelClient.class)
        );

        assertThatThrownBy(() -> triageService.updateClusterStatus("CLUSTER-001", "HACKED_STATUS"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertEquals(ErrorCode.INVALID_REQUEST, ((BusinessException) ex).getErrorCode()));

        // Valid status: IN_PROGRESS
        assertDoesNotThrow(() -> triageService.updateClusterStatus("CLUSTER-001", "IN_PROGRESS"));
    }
}
