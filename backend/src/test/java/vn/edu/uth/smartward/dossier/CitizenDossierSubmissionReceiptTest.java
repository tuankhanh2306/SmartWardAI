package vn.edu.uth.smartward.dossier;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import vn.edu.uth.smartward.dossier.dto.DossierSubmissionResponse;
import vn.edu.uth.smartward.dossier.dto.SubmitDossierRequest;
import vn.edu.uth.smartward.rag.AdminProcedureRepository;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CitizenDossierSubmissionReceiptTest {

    @Test
    void returnsPersistedVaultDocIdsAndReusesSingleDossierCodeOnIdempotentRetry() {
        CitizenDossierRepository repo = mock(CitizenDossierRepository.class);
        AdminProcedureRepository procRepo = mock(AdminProcedureRepository.class);
        ObjectMapper mapper = new ObjectMapper();
        CitizenDossierService service = new CitizenDossierService(repo, procRepo, mapper);

        AtomicReference<CitizenDossier> persisted = new AtomicReference<>();
        when(repo.findByIdempotencyKey("IDEMP-TASK058-001"))
                .thenAnswer(inv -> Optional.ofNullable(persisted.get()));
        when(repo.saveAndFlush(any(CitizenDossier.class))).thenAnswer(inv -> {
            CitizenDossier d = inv.getArgument(0);
            d.setCreatedAt(Instant.now());
            persisted.set(d);
            return d;
        });

        Map<String, Object> formData = Map.of(
                "formType", "TK-KS",
                "fullName", "NGUYỄN MINH AN",
                "dob", "15-10-2026",
                "motherName", "TRẦN THỊ HOA",
                "childBirthPlace", "Bệnh viện Sản Nhi An Giang",
                "birthCertNumber", "GCS-2026-0099"
        );
        List<String> expectedTokens = List.of("OTT_TKKS_P1", "OTT_BIRTH_CERT_P1");

        SubmitDossierRequest req = new SubmitDossierRequest(
                null,
                "TTHC-HT-01",
                "AG_P_LONGXUYEN",
                "089195001234",
                formData,
                Map.of("valid", true),
                expectedTokens,
                "IDEMP-TASK058-001"
        );

        DossierSubmissionResponse first = service.submitDossier(req);
        assertNotNull(first.dossierCode());
        assertEquals(expectedTokens, first.vaultDocIds());

        // Simulate network drop before receipt arrived -> client retries with exact same idempotencyKey
        DossierSubmissionResponse retry = service.submitDossier(req);
        assertEquals(first.dossierCode(), retry.dossierCode());
        assertEquals(expectedTokens, retry.vaultDocIds());
        verify(repo, times(1)).saveAndFlush(any(CitizenDossier.class));
    }
}
