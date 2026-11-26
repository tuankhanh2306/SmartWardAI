package vn.edu.uth.smartward.dossier;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.dossier.dto.DossierSubmissionResponse;
import vn.edu.uth.smartward.dossier.dto.SubmitDossierRequest;
import vn.edu.uth.smartward.rag.AdminProcedureRepository;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * TASK-051 (bugfix/dossier-submission-integrity):
 * Verifies canonical formType<->procedureCode enforcement, required TK-KS fields,
 * PostgreSQL-backed idempotency surviving Backend restarts & concurrent races,
 * CONFLICT rejection when mutating payload under same idempotencyKey, and read-only legacy mismatch audit.
 */
@ExtendWith(MockitoExtension.class)
class DossierSubmissionIntegrityTest {

    @Mock
    private CitizenDossierRepository dossierRepository;

    @Mock
    private AdminProcedureRepository procedureRepository;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
    }

    private Map<String, Object> validBirthFormData() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("formType", "TK-KS");
        m.put("fullName", "NGUYỄN MINH AN");
        m.put("dob", "2026-11-20");
        m.put("gender", "Nam");
        m.put("motherName", "TRẦN THỊ HỒNG");
        m.put("hospitalMotherName", "TRẦN THỊ HỒNG");
        m.put("hospitalBirthDate", "2026-11-20");
        m.put("childBirthPlace", "Bệnh viện Sản Nhi An Giang");
        m.put("birthCertNumber", "GCS-2026-0089");
        m.put("birthCertIssueDate", "2026-11-20");
        m.put("motherResidence", "Phường Long Xuyên, Tỉnh An Giang");
        return m;
    }

    @Test
    @DisplayName("1. Rejects mismatched formType vs procedureCode (e.g. TK-KS sent with TTHC-CR-01)")
    void testRejectsMismatchedFormTypeAndProcedureCode() {
        CitizenDossierService service = new CitizenDossierService(dossierRepository, procedureRepository, objectMapper);
        SubmitDossierRequest badReq = SubmitDossierRequest.builder()
                .procedureCode("TTHC-CR-01")
                .wardCode("AG_P_LONGXUYEN")
                .citizenCccd("089095012345")
                .formData(validBirthFormData())
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () -> service.submitDossier(badReq));
        assertEquals(ErrorCode.VALIDATION_FAILED, ex.getErrorCode());
        verify(dossierRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("2. Rejects TK-KS submission missing mandatory birth registration fields")
    void testRejectsIncompleteBirthRegistrationPayload() {
        CitizenDossierService service = new CitizenDossierService(dossierRepository, procedureRepository, objectMapper);
        Map<String, Object> incomplete = validBirthFormData();
        incomplete.put("birthCertNumber", ""); // missing required field

        SubmitDossierRequest req = SubmitDossierRequest.builder()
                .procedureCode("TTHC-HT-01")
                .wardCode("AG_P_LONGXUYEN")
                .citizenCccd("089095012345")
                .formData(incomplete)
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () -> service.submitDossier(req));
        assertEquals(ErrorCode.VALIDATION_FAILED, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Số Giấy chứng sinh"));
    }

    @Test
    @DisplayName("3. Same UUID idempotencyKey + same payload returns original dossierCode even after Backend restart; mutated payload throws 409 CONFLICT")
    void testPersistedIdempotencyAcrossRestartAndConflictOnPayloadMutation() {
        Map<String, CitizenDossier> dbByKey = new LinkedHashMap<>();
        when(dossierRepository.findByIdempotencyKey(anyString())).thenAnswer(inv -> Optional.ofNullable(dbByKey.get(inv.getArgument(0))));
        when(dossierRepository.saveAndFlush(any(CitizenDossier.class))).thenAnswer(inv -> {
            CitizenDossier d = inv.getArgument(0);
            d.setId(1L);
            d.setCreatedAt(Instant.now());
            if (d.getIdempotencyKey() != null) {
                dbByKey.put(d.getIdempotencyKey(), d);
            }
            return d;
        });

        String uuidKey = "550e8400-e29b-41d4-a716-446655440000";
        SubmitDossierRequest req1 = SubmitDossierRequest.builder()
                .procedureCode("TTHC-HT-01")
                .wardCode("AG_P_LONGXUYEN")
                .citizenCccd("089095012345")
                .idempotencyKey(uuidKey)
                .formData(validBirthFormData())
                .build();

        // Instance 1 creates the dossier
        CitizenDossierService instanceBeforeRestart = new CitizenDossierService(dossierRepository, procedureRepository, objectMapper);
        DossierSubmissionResponse first = instanceBeforeRestart.submitDossier(req1);
        assertEquals("TTHC-HT-01", first.procedureCode());
        assertTrue(first.dossierCode().startsWith("HS-"));

        // Instance 2 (fresh empty RAM cache after Backend restart) retries exact same key + payload -> returns SAME dossierCode!
        CitizenDossierService instanceAfterRestart = new CitizenDossierService(dossierRepository, procedureRepository, objectMapper);
        DossierSubmissionResponse retry = instanceAfterRestart.submitDossier(req1);
        assertEquals(first.dossierCode(), retry.dossierCode());
        verify(dossierRepository, times(1)).saveAndFlush(any());

        // Mutated payload reusing same idempotencyKey -> MUST fail with CONFLICT (409)
        Map<String, Object> mutatedData = validBirthFormData();
        mutatedData.put("fullName", "NGUYỄN MINH KHÁC");
        SubmitDossierRequest mutatedReq = SubmitDossierRequest.builder()
                .procedureCode("TTHC-HT-01")
                .wardCode("AG_P_LONGXUYEN")
                .citizenCccd("089095012345")
                .idempotencyKey(uuidKey)
                .formData(mutatedData)
                .build();

        BusinessException conflict = assertThrows(BusinessException.class, () -> instanceAfterRestart.submitDossier(mutatedReq));
        assertEquals(ErrorCode.CONFLICT, conflict.getErrorCode());
    }

    @Test
    @DisplayName("4. Concurrent duplicate submissions racing on unique index return the winning dossierCode")
    void testConcurrentUniqueConstraintRaceReturnsWinnerDossier() {
        CitizenDossierService service = new CitizenDossierService(dossierRepository, procedureRepository, objectMapper);
        String uuidKey = "concurrent-uuid-001";
        Map<String, Object> form = validBirthFormData();

        SubmitDossierRequest req = SubmitDossierRequest.builder()
                .procedureCode("TTHC-HT-01")
                .wardCode("AG_P_LONGXUYEN")
                .citizenCccd("089095012345")
                .idempotencyKey(uuidKey)
                .formData(form)
                .build();

        // First lookup sees empty, then saveAndFlush throws DataIntegrityViolationException because concurrent thread just committed
        CitizenDossier committedByPeer = CitizenDossier.builder()
                .dossierCode("HS-AGPLONGXUYEN-20261126-RACE01")
                .procedureCode("TTHC-HT-01")
                .wardCode("AG_P_LONGXUYEN")
                .citizenCccd("089095012345")
                .status("PENDING")
                .idempotencyKey(uuidKey)
                .createdAt(Instant.now())
                .build();

        when(dossierRepository.findByIdempotencyKey(uuidKey))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(committedByPeer));
        when(dossierRepository.saveAndFlush(any(CitizenDossier.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint uq_citizen_dossiers_idempotency_key"));

        DossierSubmissionResponse res = service.submitDossier(req);
        assertEquals("HS-AGPLONGXUYEN-20261126-RACE01", res.dossierCode());
    }

    @Test
    @DisplayName("5. Read-only legacy mismatch audit flags old TK-KS dossiers saved under TTHC-CR-01 without mutating them")
    void testAuditLegacyMismatchedDossiers_isReadOnly() {
        CitizenDossierService service = new CitizenDossierService(dossierRepository, procedureRepository, objectMapper);
        CitizenDossier legacyBad = CitizenDossier.builder()
                .dossierCode("HS-LEGACY-001")
                .procedureCode("TTHC-CR-01")
                .formData("{\"formType\":\"TK-KS\",\"fullName\":\"BE A\"}")
                .build();
        CitizenDossier validNew = CitizenDossier.builder()
                .dossierCode("HS-NEW-002")
                .procedureCode("TTHC-HT-01")
                .formData("{\"formType\":\"TK-KS\",\"fullName\":\"BE B\"}")
                .build();

        when(dossierRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(legacyBad, validNew));

        List<String> report = service.auditLegacyMismatchedDossiers();
        assertEquals(1, report.size());
        assertEquals("HS-LEGACY-001:TK-KS!=TTHC-CR-01", report.get(0));
        verify(dossierRepository, never()).save(any());
        verify(dossierRepository, never()).saveAndFlush(any());
    }
}
