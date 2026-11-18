package vn.edu.uth.smartward.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.edu.uth.smartward.dossier.CitizenDossier;
import vn.edu.uth.smartward.dossier.CitizenDossierRepository;
import vn.edu.uth.smartward.dossier.CitizenDossierService;
import vn.edu.uth.smartward.dossier.DossierEvent;
import vn.edu.uth.smartward.dossier.DossierEventRepository;
import vn.edu.uth.smartward.dossier.dto.DossierTrackingResponse;
import vn.edu.uth.smartward.rag.RagController;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@DisplayName("P3 UX & Privacy: Dossier Timeline, RAG Feedback & Safe Tracking")
class SmartWardP3FrontendAndUxTest {

    @Test
    @DisplayName("7.4: trackDossier loads chronological timeline from dossier_events table")
    void testTrackDossier_includesEventTimeline() {
        var dossierRepo = mock(CitizenDossierRepository.class);
        var eventRepo = mock(DossierEventRepository.class);

        CitizenDossier mockDossier = CitizenDossier.builder()
                .dossierCode("HS-20261117-BENNGHE-0001")
                .procedureCode("TTHC-CT-01")
                .wardCode("WARD-BENNGHE")
                .citizenCccd("079095012345")
                .status("APPROVED")
                .slaDeadline(Instant.now().plusSeconds(86400 * 2))
                .createdAt(Instant.now().minusSeconds(7200))
                .updatedAt(Instant.now())
                .build();

        when(dossierRepo.findByDossierCodeIgnoreCase("HS-20261117-BENNGHE-0001"))
                .thenReturn(Optional.of(mockDossier));

        DossierEvent event1 = DossierEvent.builder()
                .id(1L)
                .dossierCode("HS-20261117-BENNGHE-0001")
                .who("CITIZEN")
                .fromStatus(null)
                .toStatus("PENDING")
                .reason("Công dân nộp hồ sơ trực tuyến")
                .createdAt(Instant.now().minusSeconds(7200))
                .build();

        DossierEvent event2 = DossierEvent.builder()
                .id(2L)
                .dossierCode("HS-20261117-BENNGHE-0001")
                .who("CC-AG-8942")
                .fromStatus("PENDING")
                .toStatus("APPROVED")
                .reason("Hồ sơ hợp lệ, đủ điều kiện phê duyệt")
                .createdAt(Instant.now().minusSeconds(1800))
                .build();

        when(eventRepo.findByDossierCodeOrderByCreatedAtAsc("HS-20261117-BENNGHE-0001"))
                .thenReturn(List.of(event1, event2));

        CitizenDossierService service = new CitizenDossierService(
                dossierRepo,
                null,
                new com.fasterxml.jackson.databind.ObjectMapper(),
                null,
                eventRepo,
                null
        );

        DossierTrackingResponse response = service.trackDossier("HS-20261117-BENNGHE-0001", "2345");

        assertThat(response).isNotNull();
        assertThat(response.dossierCode()).isEqualTo("HS-20261117-BENNGHE-0001");
        assertThat(response.citizenCccd()).isEqualTo("********2345");
        assertThat(response.timeline()).isNotNull();
        assertThat(response.timeline()).hasSize(2);
        assertThat(response.timeline().get(0).getToStatus()).isEqualTo("PENDING");
        assertThat(response.timeline().get(1).getToStatus()).isEqualTo("APPROVED");
        assertThat(response.timeline().get(1).getWho()).isEqualTo("CC-AG-8942");
    }

    @Test
    @DisplayName("7.4: RagFeedbackRequest holds query and useful flag correctly")
    void testRagFeedback_recordModel() {
        RagController.RagFeedbackRequest req = new RagController.RagFeedbackRequest(
                "Thủ tục đăng ký khai sinh",
                true,
                "Rất hữu ích"
        );
        assertThat(req.query()).isEqualTo("Thủ tục đăng ký khai sinh");
        assertThat(req.useful()).isTrue();
        assertThat(req.comments()).isEqualTo("Rất hữu ích");
    }
}
