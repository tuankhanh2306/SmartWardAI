package vn.edu.uth.smartward.dossier;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.dossier.dto.DossierSubmissionResponse;
import vn.edu.uth.smartward.dossier.dto.DossierTrackingResponse;
import vn.edu.uth.smartward.dossier.dto.OfficerDossierDto;
import vn.edu.uth.smartward.dossier.dto.OfficerReviewRequest;
import vn.edu.uth.smartward.dossier.dto.SubmitDossierRequest;
import vn.edu.uth.smartward.rag.AdminProcedureRepository;
import vn.edu.uth.smartward.security.OfficerAuthService;
import vn.edu.uth.smartward.security.SigningDelegation;
import vn.edu.uth.smartward.security.SigningDelegationRepository;
import vn.edu.uth.smartward.security.SigningDelegationService;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProcedureWorkflowReformTest {

    @Mock
    private CitizenDossierRepository dossierRepository;

    @Mock
    private AdminProcedureRepository procedureRepository;

    @Mock
    private SigningDelegationRepository delegationRepository;

    private CitizenDossierService service;

    @Mock
    private vn.edu.uth.smartward.security.OfficerRepository officerRepository;

    @BeforeEach
    void setUp() {
        SigningDelegationService delegationService = new SigningDelegationService(delegationRepository, officerRepository);
        service = new CitizenDossierService(
                dossierRepository,
                procedureRepository,
                new ObjectMapper(),
                null,
                null,
                null,
                null,
                delegationService
        );
    }

    @Test
    @DisplayName("Condition 1: Reference-only procedure (BT-05, XD-01) is blocked from submission")
    void submitDossier_referenceOnlyProcedure_rejected() {
        SubmitDossierRequest bt05Req = SubmitDossierRequest.builder()
                .procedureCode("TTHC-BT-05")
                .wardCode("AG_P_LONGXUYEN")
                .citizenCccd("089205023490")
                .formData(Map.of("fullName", "NGUYỄN VĂN A"))
                .build();

        assertThatThrownBy(() -> service.submitDossier(bt05Req))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.VALIDATION_FAILED));
    }

    @Test
    @DisplayName("Condition 2: Police residence codes (CR-01, CR-03, CR-06, CR-07, CR-08) never enter UBND officer queue")
    void getOfficerDossiers_excludesPoliceExternalDossiers() {
        CitizenDossier cr01 = CitizenDossier.builder()
                .id(1L).dossierCode("HS-CR01-1").procedureCode("TTHC-CR-01").wardCode("AG_P_LONGXUYEN")
                .citizenCccd("089205023490").status("PENDING").routingChannel("POLICE_EXTERNAL").build();
        CitizenDossier ht01 = CitizenDossier.builder()
                .id(2L).dossierCode("HS-HT01-1").procedureCode("TTHC-HT-01").wardCode("AG_P_LONGXUYEN")
                .citizenCccd("089205023490").status("PENDING").routingChannel("TTPVHCC_UBND")
                .formData("{\"childName\":\"BÉ AN\"}").build();

        when(dossierRepository.findByWardCodeIgnoreCaseOrderByCreatedAtDesc("AG_P_LONGXUYEN"))
                .thenReturn(List.of(cr01, CitizenDossier.builder().procedureCode("TTHC-CR-02").routingChannel("TTPVHCC_UBND").build(), ht01));

        List<OfficerDossierDto> queue = service.getOfficerDossiers("AG_P_LONGXUYEN", null);
        assertThat(queue).hasSize(1);
        assertThat(queue.get(0).dossierCode()).isEqualTo("HS-HT01-1");
    }

    @Test
    @DisplayName("Condition 3: HT-01 initial submission yields SW_DRAFT; OFFICIALLY_ACCEPTED requires agency & receipt no")
    void birthDossierLifecycle_draftThenOfficialReceiptAndReturn() {
        when(dossierRepository.existsByDossierCode(any())).thenReturn(false);
        when(dossierRepository.saveAndFlush(any(CitizenDossier.class))).thenAnswer(inv -> {
            CitizenDossier d = inv.getArgument(0);
            d.setId(99L);
            d.setCreatedAt(Instant.now());
            return d;
        });

        SubmitDossierRequest req = SubmitDossierRequest.builder()
                .procedureCode("TTHC-HT-01")
                .wardCode("AG_P_LONGXUYEN")
                .citizenCccd("089205023490")
                .formData(Map.of(
                        "formType", "TK-KS",
                        "declarerName", "TRẦN THỊ MẸ",
                        "fullName", "NGUYỄN BÉ AN",
                        "dob", "10-05-2026",
                        "motherName", "TRẦN THỊ MẸ",
                        "childBirthPlace", "Bệnh viện Sản Nhi An Giang",
                        "birthCertNumber", "GCS-2026-888"
                ))
                .vaultDocIds(List.of("OTT_1"))
                .build();

        DossierSubmissionResponse sub = service.submitDossier(req);
        assertThat(sub.qrKind()).isEqualTo("SW_DRAFT");
        assertThat(sub.receiptVerified()).isFalse();

        CitizenDossier stored = CitizenDossier.builder()
                .id(99L)
                .dossierCode(sub.dossierCode())
                .procedureCode("TTHC-HT-01")
                .wardCode("AG_P_LONGXUYEN")
                .citizenCccd("089205023490")
                .status("PENDING")
                .routingChannel("TTPVHCC_UBND")
                .build();
        when(dossierRepository.findByDossierCodeIgnoreCase(sub.dossierCode())).thenReturn(Optional.of(stored));
        when(dossierRepository.save(any(CitizenDossier.class))).thenAnswer(inv -> inv.getArgument(0));

        OfficerAuthService.OfficerPrincipal officer = new OfficerAuthService.OfficerPrincipal(
                "CB-AG_P_LONGXUYEN", "Cán bộ Một cửa", "AG_P_LONGXUYEN", "OFFICER", "jti-1", Instant.now().getEpochSecond() + 3600);

        // Missing officialReceiptNo must be rejected
        assertThatThrownBy(() -> service.reviewDossier(
                sub.dossierCode(),
                OfficerReviewRequest.builder().status("OFFICIALLY_ACCEPTED").receivingAgency("TTPVHCC Phường Long Xuyên").build(),
                officer
        )).isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.VALIDATION_FAILED));

        assertThatThrownBy(() -> service.reviewDossier(sub.dossierCode(), OfficerReviewRequest.builder()
                .status("APPROVED").receivingAgency("TTPVHCC").officialReceiptNo("BN-X").build(), officer))
                .isInstanceOf(BusinessException.class);
        assertThat(stored.getReceiptVerifiedAt()).isNull();
        assertThat(service.lookupOfficerDossierByQr("SW_DRAFT|" + sub.dossierCode() + "|AG_P_LONGXUYEN", officer).dossierCode())
                .isEqualTo(sub.dossierCode());

        // Recording both receivingAgency and officialReceiptNo transitions to SW_RECEIPT
        service.reviewDossier(
                sub.dossierCode(),
                OfficerReviewRequest.builder()
                        .status("OFFICIALLY_ACCEPTED")
                        .receivingAgency("TTPVHCC Phường Long Xuyên")
                        .officialReceiptNo("BN-2026-0042")
                        .appointmentCode("LH-20261128-0042")
                        .build(),
                officer
        );

        DossierTrackingResponse tracked = service.trackDossier(sub.dossierCode(), "3490", "127.0.0.1");
        when(dossierRepository.findTop2ByWardCodeIgnoreCaseAndReceivingAgencyIgnoreCaseAndOfficialReceiptNoIgnoreCaseAndReceiptVerifiedAtIsNotNull(
                officer.wardCode(), stored.getReceivingAgency(), stored.getOfficialReceiptNo())).thenReturn(List.of(stored));
        assertThat(service.lookupOfficerDossierByQr("SW_RECEIPT|BN-2026-0042|TTPVHCC Phường Long Xuyên|TBD", officer).dossierCode())
                .isEqualTo(sub.dossierCode());
        assertThat(tracked.qrKind()).isEqualTo("SW_RECEIPT");
        assertThat(tracked.receiptVerified()).isTrue();
        assertThat(tracked.receivingAgency()).isEqualTo("TTPVHCC Phường Long Xuyên");
        assertThat(tracked.officialReceiptNo()).isEqualTo("BN-2026-0042");

        assertThatThrownBy(() -> service.reviewDossier(sub.dossierCode(), OfficerReviewRequest.builder().status("COMPLETED").build(), officer))
                .isInstanceOf(BusinessException.class);
        service.reviewDossier(sub.dossierCode(), OfficerReviewRequest.builder().status("UNDER_APPRAISAL").build(), officer);
        service.reviewDossier(sub.dossierCode(), OfficerReviewRequest.builder().status("PENDING_UBND_SIGNATURE").build(), officer);
        // Transitions: READY_FOR_RETURN -> COMPLETED
        service.reviewDossier(sub.dossierCode(), OfficerReviewRequest.builder().status("READY_FOR_RETURN").build(), officer);
        assertThat(stored.getStatus()).isEqualTo("READY_FOR_RETURN");
        service.reviewDossier(sub.dossierCode(), OfficerReviewRequest.builder().status("COMPLETED").build(), officer);
        assertThat(stored.getStatus()).isEqualTo("COMPLETED");
    }

    @Test
    @DisplayName("Condition 4: CENTER_SIGNED enforces SigningDelegationService check")
    void reviewDossier_centerSigned_enforcesDelegation() {
        CitizenDossier stored = CitizenDossier.builder()
                .id(55L)
                .dossierCode("HS-CT01-55")
                .procedureCode("TTHC-CT-01")
                .wardCode("AG_DK_KIENHAI")
                .citizenCccd("089205023490")
                .status("OFFICIALLY_ACCEPTED")
                .build();
        when(dossierRepository.findByDossierCodeIgnoreCase("HS-CT01-55")).thenReturn(Optional.of(stored));
        when(dossierRepository.save(any(CitizenDossier.class))).thenAnswer(inv -> inv.getArgument(0));
        when(delegationRepository.findByWardCodeIgnoreCaseAndProcedureCodeIgnoreCaseAndActiveTrue("AG_DK_KIENHAI", "TTHC-CT-01"))
                .thenReturn(List.of(SigningDelegation.builder()
                        .wardCode("AG_DK_KIENHAI")
                        .procedureCode("TTHC-CT-01")
                        .delegateTitle("Phó Giám đốc Trung tâm Phục vụ hành chính công")
                        .decisionNumber("989/QĐ-UBND")
                        .sealType("TTPVHCC_SEAL")
                        .validFrom(Instant.now().minusSeconds(3600))
                        .validTo(Instant.now().plusSeconds(3600))
                        .active(true)
                        .build()));

        OfficerAuthService.OfficerPrincipal unauthorizedStaff = new OfficerAuthService.OfficerPrincipal(
                "CB-AG_DK_KIENHAI-1", "Chuyên viên Một cửa", "AG_DK_KIENHAI", "OFFICER", "jti-1", Instant.now().getEpochSecond() + 3600);
        assertThatThrownBy(() -> service.reviewDossier(
                "HS-CT01-55",
                OfficerReviewRequest.builder().status("CENTER_SIGNED").build(),
                unauthorizedStaff
        )).isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.FORBIDDEN));

        OfficerAuthService.OfficerPrincipal authorizedDeputy = new OfficerAuthService.OfficerPrincipal(
                "CB-AG_DK_KIENHAI", "Lê Văn B — Phó Giám đốc Trung tâm Phục vụ hành chính công", "AG_DK_KIENHAI", "OFFICER", "jti-2", Instant.now().getEpochSecond() + 3600);
        when(officerRepository.findByBadgeIdIgnoreCase("CB-AG_DK_KIENHAI")).thenReturn(java.util.Optional.of(
                vn.edu.uth.smartward.security.Officer.builder().wardCode("AG_DK_KIENHAI").active(true)
                        .jobTitle("Phó Giám đốc Trung tâm Phục vụ hành chính công").build()));
        CitizenDossier signed = service.reviewDossier(
                "HS-CT01-55",
                OfficerReviewRequest.builder().status("CENTER_SIGNED").build(),
                authorizedDeputy
        );
        assertThat(signed.getStatus()).isEqualTo("CENTER_SIGNED");
        assertThat(signed.getOfficerFeedback()).contains("989/QĐ-UBND");
    }
}
