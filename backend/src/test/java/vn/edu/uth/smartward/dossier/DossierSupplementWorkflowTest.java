package vn.edu.uth.smartward.dossier;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.uth.smartward.audit.AuditService;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.common.RedisRateLimiter;
import vn.edu.uth.smartward.dossier.dto.DossierSupplementRequest;
import vn.edu.uth.smartward.dossier.dto.DossierTrackingResponse;
import vn.edu.uth.smartward.dossier.dto.OfficerDossierDto;
import vn.edu.uth.smartward.dossier.dto.OfficerReviewRequest;
import vn.edu.uth.smartward.rag.AdminProcedureRepository;
import vn.edu.uth.smartward.security.OfficerAuthService;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TASK-054 (feature/dossier-supplement-workflow):
 * Verifies structured officer supplement requests, SEC-04 citizen authentication,
 * non-destructive supplement history & vault doc merging, DossierEvent append,
 * CONFLICT guards, officer SUPPLEMENTED/NEAR_DEADLINE queue filters, and final approval.
 */
@ExtendWith(MockitoExtension.class)
class DossierSupplementWorkflowTest {

    @Mock
    private CitizenDossierRepository dossierRepository;

    @Mock
    private AdminProcedureRepository procedureRepository;

    @Mock
    private RedisRateLimiter rateLimiter;

    @Mock
    private DossierEventRepository dossierEventRepository;

    @Mock
    private AuditService auditService;

    private ObjectMapper objectMapper;
    private CitizenDossierService service;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new CitizenDossierService(
                dossierRepository,
                procedureRepository,
                objectMapper,
                rateLimiter,
                dossierEventRepository,
                auditService
        );
    }

    private CitizenDossier sampleBirthDossier(String status) {
        return CitizenDossier.builder()
                .id(10L)
                .dossierCode("HS-20261126-AGPLONGXUYEN-0001")
                .procedureCode("TTHC-HT-01")
                .wardCode("AG_P_LONGXUYEN")
                .citizenCccd("089095012345")
                .formData("{\"formType\":\"TK-KS\",\"fullName\":\"NGUYỄN MINH AN\"}")
                .vaultDocIds("[\"DOC-INITIAL-1\"]")
                .status(status)
                .slaDeadline(Instant.now().plus(12, ChronoUnit.HOURS))
                .createdAt(Instant.now().minus(2, ChronoUnit.HOURS))
                .updatedAt(Instant.now().minus(1, ChronoUnit.HOURS))
                .build();
    }

    @Test
    @DisplayName("1. Officer requests SUPPLEMENT_REQUIRED with structured items -> stored and exposed in tracking & officer DTO")
    void testOfficerReviewStoresStructuredSupplementItems() {
        CitizenDossier dossier = sampleBirthDossier("PENDING");
        when(dossierRepository.findByDossierCodeIgnoreCase("HS-20261126-AGPLONGXUYEN-0001"))
                .thenReturn(Optional.of(dossier));
        when(dossierRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(dossierEventRepository.findByDossierCodeOrderByCreatedAtAsc(anyString()))
                .thenReturn(List.of(DossierEvent.builder()
                        .dossierCode(dossier.getDossierCode())
                        .who("CB-LX-001")
                        .fromStatus("PENDING")
                        .toStatus("SUPPLEMENT_REQUIRED")
                        .reason("Bổ sung Giấy chứng sinh rõ nét")
                        .build()));

        OfficerAuthService.OfficerPrincipal officer =
                new OfficerAuthService.OfficerPrincipal("CB-LX-001", "Cán bộ A", "AG_P_LONGXUYEN", "OFFICER", "tok-1", Instant.now().plusSeconds(3600).getEpochSecond(), false);

        CitizenDossier reviewed = service.reviewDossier(
                dossier.getDossierCode(),
                OfficerReviewRequest.builder()
                        .status("SUPPLEMENT_REQUIRED")
                        .officerFeedback("Vui lòng bổ sung bản chụp rõ nét.")
                        .requestedItems(List.of("Giấy chứng sinh bản chính", "Ảnh chụp CCCD rõ nét", " "))
                        .build(),
                officer
        );

        assertEquals("SUPPLEMENT_REQUIRED", reviewed.getStatus());
        OfficerDossierDto officerDto = service.mapToOfficerDto(reviewed);
        assertEquals(List.of("Giấy chứng sinh bản chính", "Ảnh chụp CCCD rõ nét"), officerDto.requestedSupplementItems());

        when(rateLimiter.allowDossierTracking(anyString(), anyString())).thenReturn(true);
        DossierTrackingResponse tracking = service.trackDossier(dossier.getDossierCode(), "2345", "127.0.0.1");
        assertEquals(List.of("Giấy chứng sinh bản chính", "Ảnh chụp CCCD rõ nét"), tracking.requestedSupplementItems());
    }

    @Test
    @DisplayName("2. Citizen submitting supplement with wrong last4Cccd fails with RESOURCE_NOT_FOUND & 0 DB saves")
    void testSubmitSupplementRejectsWrongCccdLast4() {
        CitizenDossier dossier = sampleBirthDossier("SUPPLEMENT_REQUIRED");
        when(rateLimiter.allowDossierTracking(anyString(), anyString())).thenReturn(true);
        when(dossierRepository.findByDossierCodeIgnoreCase(dossier.getDossierCode()))
                .thenReturn(Optional.of(dossier));

        BusinessException ex = assertThrows(BusinessException.class, () -> service.submitSupplement(
                dossier.getDossierCode(),
                DossierSupplementRequest.builder()
                        .last4Cccd("9999")
                        .citizenNote("Đã tải lên giấy chứng sinh mới.")
                        .build(),
                "127.0.0.1", null, null
        ));

        assertEquals(ErrorCode.RESOURCE_NOT_FOUND, ex.getErrorCode());
        verify(dossierRepository, never()).save(any());
        verify(dossierEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("3. Empty supplement payload fails with VALIDATION_FAILED")
    void testSubmitSupplementRejectsEmptyContent() {
        CitizenDossier dossier = sampleBirthDossier("SUPPLEMENT_REQUIRED");
        when(rateLimiter.allowDossierTracking(anyString(), anyString())).thenReturn(true);
        when(dossierRepository.findByDossierCodeIgnoreCase(dossier.getDossierCode()))
                .thenReturn(Optional.of(dossier));

        BusinessException ex = assertThrows(BusinessException.class, () -> service.submitSupplement(
                dossier.getDossierCode(),
                DossierSupplementRequest.builder()
                        .last4Cccd("2345")
                        .citizenNote("   ")
                        .build(),
                "127.0.0.1", null, null
        ));

        assertEquals(ErrorCode.VALIDATION_FAILED, ex.getErrorCode());
        verify(dossierRepository, never()).save(any());
    }

    @Test
    @DisplayName("4. Valid supplement transitions SUPPLEMENT_REQUIRED -> SUPPLEMENTED, merges docs, appends DossierEvent")
    void testSubmitSupplementNonDestructiveMergeAndEventAppend() throws Exception {
        CitizenDossier dossier = sampleBirthDossier("SUPPLEMENT_REQUIRED");
        DossierEvent initialOfficerEvt = DossierEvent.builder()
                .id(1L)
                .dossierCode(dossier.getDossierCode())
                .who("CB-LX-001")
                .fromStatus("PENDING")
                .toStatus("SUPPLEMENT_REQUIRED")
                .reason("Thiếu Số Giấy chứng sinh")
                .build();

        when(rateLimiter.allowDossierTracking(anyString(), anyString())).thenReturn(true);
        when(dossierRepository.findByDossierCodeIgnoreCase(dossier.getDossierCode()))
                .thenReturn(Optional.of(dossier));
        when(dossierRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(dossierEventRepository.findByDossierCodeOrderByCreatedAtAsc(dossier.getDossierCode()))
                .thenReturn(List.of(initialOfficerEvt, DossierEvent.builder()
                        .id(2L)
                        .dossierCode(dossier.getDossierCode())
                        .who("CITIZEN")
                        .fromStatus("SUPPLEMENT_REQUIRED")
                        .toStatus("SUPPLEMENTED")
                        .reason("Công dân đã gửi bổ sung lần 1")
                        .build()));

        DossierTrackingResponse resp = service.submitSupplement(
                dossier.getDossierCode(),
                DossierSupplementRequest.builder()
                        .last4Cccd("2345")
                        .citizenNote("Đã bổ sung số Giấy chứng sinh và bản chụp mới")
                        .updatedFields(Map.of("birthCertNumber", "GCS-2026-9911", "formType", "TAMPERED"))
                        .additionalVaultDocIds(List.of("DOC-SUPP-2"))
                        .build(),
                "127.0.0.1", null, null
        );

        assertEquals("SUPPLEMENTED", resp.status());
        assertEquals(1, resp.supplementCount());
        assertNotNull(resp.supplementedAt());
        assertEquals(2, resp.timeline().size());

        // Original doc retained + new doc appended
        assertEquals(List.of("DOC-INITIAL-1", "DOC-SUPP-2"), resp.vaultDocIds());

        // Original formType untouched, birthCertNumber updated, supplementHistory appended
        JsonNode fd = objectMapper.readTree(dossier.getFormData());
        assertEquals("TK-KS", fd.path("formType").asText());
        assertEquals("NGUYỄN MINH AN", fd.path("fullName").asText());
        assertEquals("GCS-2026-9911", fd.path("birthCertNumber").asText());
        assertEquals(1, fd.path("supplementHistory").size());

        ArgumentCaptor<DossierEvent> evtCaptor = ArgumentCaptor.forClass(DossierEvent.class);
        verify(dossierEventRepository).save(evtCaptor.capture());
        assertEquals("CITIZEN", evtCaptor.getValue().getWho());
        assertEquals("SUPPLEMENT_REQUIRED", evtCaptor.getValue().getFromStatus());
        assertEquals("SUPPLEMENTED", evtCaptor.getValue().getToStatus());
    }

    @Test
    @DisplayName("5. Re-submitting supplement when status is already SUPPLEMENTED or APPROVED throws CONFLICT")
    void testSubmitSupplementRejectsNonSupplementRequiredState() {
        CitizenDossier alreadySupplemented = sampleBirthDossier("SUPPLEMENTED");
        when(rateLimiter.allowDossierTracking(anyString(), anyString())).thenReturn(true);
        when(dossierRepository.findByDossierCodeIgnoreCase(alreadySupplemented.getDossierCode()))
                .thenReturn(Optional.of(alreadySupplemented));

        BusinessException ex = assertThrows(BusinessException.class, () -> service.submitSupplement(
                alreadySupplemented.getDossierCode(),
                DossierSupplementRequest.builder()
                        .last4Cccd("2345")
                        .citizenNote("Gửi bổ sung lần 2 khi cán bộ chưa xem")
                        .build(),
                "127.0.0.1", null, null
        ));

        assertEquals(ErrorCode.CONFLICT, ex.getErrorCode());
    }

    @Test
    @DisplayName("6. Officer filters SUPPLEMENTED & NEAR_DEADLINE return matching queue items")
    void testOfficerFiltersSupplementedAndNearDeadline() {
        CitizenDossier supplementedNear = sampleBirthDossier("SUPPLEMENTED");
        supplementedNear.setSlaDeadline(Instant.now().plus(6, ChronoUnit.HOURS));
        supplementedNear.setSupplementCount(1);

        CitizenDossier approvedTerminal = sampleBirthDossier("APPROVED");
        approvedTerminal.setDossierCode("HS-DONE-001");
        approvedTerminal.setSlaDeadline(Instant.now().plus(2, ChronoUnit.HOURS));

        CitizenDossier farPending = sampleBirthDossier("PENDING");
        farPending.setDossierCode("HS-FAR-002");
        farPending.setSlaDeadline(Instant.now().plus(72, ChronoUnit.HOURS));

        when(dossierRepository.findByWardCodeIgnoreCaseAndStatusIgnoreCaseOrderByCreatedAtDesc("AG_P_LONGXUYEN", "SUPPLEMENTED"))
                .thenReturn(List.of(supplementedNear));
        when(dossierRepository.findByWardCodeIgnoreCaseOrderByCreatedAtDesc("AG_P_LONGXUYEN"))
                .thenReturn(List.of(supplementedNear, approvedTerminal, farPending));

        List<OfficerDossierDto> supplementedList = service.getOfficerDossiers("AG_P_LONGXUYEN", "SUPPLEMENTED");
        assertEquals(1, supplementedList.size());
        assertEquals(supplementedNear.getDossierCode(), supplementedList.get(0).dossierCode());

        List<OfficerDossierDto> nearList = service.getOfficerDossiers("AG_P_LONGXUYEN", "NEAR_DEADLINE");
        assertEquals(1, nearList.size());
        assertEquals(supplementedNear.getDossierCode(), nearList.get(0).dossierCode());
    }

    @Test
    @DisplayName("7. Officer can approve a SUPPLEMENTED dossier cleanly")
    void testOfficerCanApproveSupplementedDossier() {
        CitizenDossier dossier = sampleBirthDossier("SUPPLEMENTED");
        when(dossierRepository.findByDossierCodeIgnoreCase(dossier.getDossierCode()))
                .thenReturn(Optional.of(dossier));
        when(dossierRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        OfficerAuthService.OfficerPrincipal officer =
                new OfficerAuthService.OfficerPrincipal("CB-LX-001", "Cán bộ A", "AG_P_LONGXUYEN", "OFFICER", "tok-1", Instant.now().plusSeconds(3600).getEpochSecond(), false);

        CitizenDossier approved = service.reviewDossier(
                dossier.getDossierCode(),
                OfficerReviewRequest.builder()
                        .status("APPROVED")
                        .officerFeedback("Hồ sơ bổ sung đạt yêu cầu, mời nhận kết quả.")
                        .appointmentCode("LH-20261126-7788")
                        .build(),
                officer
        );

        assertEquals("APPROVED", approved.getStatus());
        assertEquals("LH-20261126-7788", approved.getAppointmentCode());
    }
}
