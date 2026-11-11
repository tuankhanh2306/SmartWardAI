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
import vn.edu.uth.smartward.rag.AdminProcedure;
import vn.edu.uth.smartward.rag.AdminProcedureRepository;
import vn.edu.uth.smartward.security.OfficerAuthService;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CitizenDossierServiceTest {

    @Mock
    private CitizenDossierRepository dossierRepository;

    @Mock
    private AdminProcedureRepository procedureRepository;

    private ObjectMapper objectMapper;
    private CitizenDossierService dossierService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        dossierService = new CitizenDossierService(dossierRepository, procedureRepository, objectMapper);
    }

    @Test
    @DisplayName("Submit dossier successfully with auto-generated code and 3-day SLA")
    void submitDossier_autoGenerateCode_success() {
        when(dossierRepository.countByDossierCodeStartingWith(any())).thenReturn(0L);
        when(dossierRepository.existsByDossierCode(any())).thenReturn(false);
        when(dossierRepository.save(any(CitizenDossier.class))).thenAnswer(invocation -> {
            CitizenDossier arg = invocation.getArgument(0);
            arg.setId(101L);
            arg.setCreatedAt(Instant.now());
            return arg;
        });

        SubmitDossierRequest req = SubmitDossierRequest.builder()
                .procedureCode("TTHC-CT-01")
                .wardCode("WARD-AG-01")
                .citizenCccd("089095012345")
                .formData(Map.of("fullName", "NGUYEN VAN A", "address", "Ben Nghe"))
                .precheckReport(Map.of("overallValid", true))
                .vaultDocIds(List.of("DOC_001"))
                .build();

        DossierSubmissionResponse res = dossierService.submitDossier(req);

        assertThat(res).isNotNull();
        assertThat(res.dossierCode()).startsWith("HS-");
        assertThat(res.procedureCode()).isEqualTo("TTHC-CT-01");
        assertThat(res.wardCode()).isEqualTo("WARD-AG-01");
        assertThat(res.status()).isEqualTo("PENDING");
        assertThat(res.slaDeadline()).isNotNull();

        verify(dossierRepository, times(1)).save(any(CitizenDossier.class));
    }

    @Test
    @DisplayName("Submit vital civil registration (Birth HT-01) assigns 1-day statutory SLA")
    void submitDossier_vitalRecord_1DaySla() {
        when(dossierRepository.countByDossierCodeStartingWith(any())).thenReturn(0L);
        when(dossierRepository.existsByDossierCode(any())).thenReturn(false);
        when(dossierRepository.save(any(CitizenDossier.class))).thenAnswer(inv -> inv.getArgument(0));

        SubmitDossierRequest req = SubmitDossierRequest.builder()
                .procedureCode("TTHC-HT-01")
                .wardCode("WARD-AG-01")
                .citizenCccd("089095012345")
                .formData(Map.of("childName", "NGUYEN CON"))
                .build();

        DossierSubmissionResponse res = dossierService.submitDossier(req);
        assertThat(res.status()).isEqualTo("PENDING");
        // Verify SLA deadline is computed
        assertThat(res.slaDeadline()).isAfter(Instant.now());
    }

    @Test
    @DisplayName("Submit dossier with client custom code and duplicate check")
    void submitDossier_duplicateCustomCode_throwsException() {
        when(dossierRepository.existsByDossierCode("HS-CUSTOM-001")).thenReturn(true);

        SubmitDossierRequest req = SubmitDossierRequest.builder()
                .dossierCode("HS-CUSTOM-001")
                .procedureCode("TTHC-CR-01")
                .wardCode("WARD-AG-01")
                .citizenCccd("089095012345")
                .formData(Map.of("fullName", "Test"))
                .build();

        assertThatThrownBy(() -> dossierService.submitDossier(req))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.INVALID_REQUEST));
    }

    @Test
    @DisplayName("Submit dossier missing CCCD throws INVALID_REQUEST")
    void submitDossier_missingCccd_throwsException() {
        SubmitDossierRequest req = SubmitDossierRequest.builder()
                .procedureCode("TTHC-CR-01")
                .wardCode("WARD-AG-01")
                .citizenCccd("   ")
                .build();

        assertThatThrownBy(() -> dossierService.submitDossier(req))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.INVALID_REQUEST));
    }

    @Test
    @DisplayName("Track dossier with matching last 4 digits of CCCD succeeds")
    void trackDossier_matchingLast4_success() {
        CitizenDossier mockEntity = CitizenDossier.builder()
                .id(1L)
                .dossierCode("HS-20261111-BENNGHE-0001")
                .procedureCode("TTHC-CR-01")
                .wardCode("WARD-AG-01")
                .citizenCccd("089095012345")
                .status("PENDING")
                .slaDeadline(Instant.now().plusSeconds(86400))
                .formData("{\"fullName\": \"Nguyen Van A\"}")
                .precheckReport("{\"overallValid\": true}")
                .vaultDocIds("[\"DOC_1\"]")
                .build();

        when(dossierRepository.findByDossierCodeIgnoreCase("HS-20261111-BENNGHE-0001"))
                .thenReturn(Optional.of(mockEntity));
        when(procedureRepository.findByProcedureCode("TTHC-CR-01"))
                .thenReturn(Optional.of(AdminProcedure.builder().procedureName("Dang ky khai sinh").build()));

        DossierTrackingResponse res = dossierService.trackDossier("HS-20261111-BENNGHE-0001", "2345", null);

        assertThat(res.dossierCode()).isEqualTo("HS-20261111-BENNGHE-0001");
        assertThat(res.procedureName()).isEqualTo("Dang ky khai sinh");
        assertThat(res.citizenCccd()).isEqualTo("********2345");
        assertThat(res.status()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("Track dossier with matching 12-digit citizenCccd succeeds (derives last 4)")
    void trackDossier_matching12DigitCccd_success() {
        CitizenDossier mockEntity = CitizenDossier.builder()
                .id(1L)
                .dossierCode("HS-20261111-BENNGHE-0001")
                .procedureCode("TTHC-CR-01")
                .wardCode("WARD-AG-01")
                .citizenCccd("089095012345")
                .status("PENDING")
                .slaDeadline(Instant.now().plusSeconds(86400))
                .build();

        when(dossierRepository.findByDossierCodeIgnoreCase("hs-20261111-bennghe-0001"))
                .thenReturn(Optional.of(mockEntity));

        DossierTrackingResponse res = dossierService.trackDossier("hs-20261111-bennghe-0001", null, "089095012345");
        assertThat(res.citizenCccd()).isEqualTo("********2345");
    }

    @Test
    @DisplayName("Track dossier with mismatched last 4 digits throws RESOURCE_NOT_FOUND")
    void trackDossier_mismatchedLast4_throwsNotFound() {
        CitizenDossier mockEntity = CitizenDossier.builder()
                .id(1L)
                .dossierCode("HS-20261111-0001")
                .citizenCccd("089095012345")
                .build();

        when(dossierRepository.findByDossierCodeIgnoreCase("HS-20261111-0001"))
                .thenReturn(Optional.of(mockEntity));

        assertThatThrownBy(() -> dossierService.trackDossier("HS-20261111-0001", "9999", null))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Test
    @DisplayName("Track non-existent dossier throws RESOURCE_NOT_FOUND")
    void trackDossier_nonExistent_throwsNotFound() {
        when(dossierRepository.findByDossierCodeIgnoreCase("HS-NON-EXISTENT"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> dossierService.trackDossier("HS-NON-EXISTENT", "1234", null))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Test
    @DisplayName("Officer review dossier to APPROVED with appointment code")
    void reviewDossier_approve_success() {
        CitizenDossier mockEntity = CitizenDossier.builder()
                .id(1L)
                .dossierCode("HS-123")
                .wardCode("WARD-AG-01")
                .status("PENDING")
                .build();

        when(dossierRepository.findByDossierCodeIgnoreCase("HS-123")).thenReturn(Optional.of(mockEntity));
        when(dossierRepository.save(any(CitizenDossier.class))).thenAnswer(inv -> inv.getArgument(0));

        OfficerAuthService.OfficerPrincipal principal = new OfficerAuthService.OfficerPrincipal(
                "CC-AG-8942", "Nguyen Van B", "WARD-AG-01", "OFFICER", "jti-1", Instant.now().getEpochSecond() + 3600);

        OfficerReviewRequest req = OfficerReviewRequest.builder()
                .status("APPROVED")
                .officerFeedback("Hồ sơ hợp lệ")
                .appointmentCode("LH-20261115-001")
                .build();

        CitizenDossier updated = dossierService.reviewDossier("HS-123", req, principal);
        assertThat(updated.getStatus()).isEqualTo("APPROVED");
        assertThat(updated.getOfficerFeedback()).isEqualTo("Hồ sơ hợp lệ");
        assertThat(updated.getAppointmentCode()).isEqualTo("LH-20261115-001");
    }

    @Test
    @DisplayName("Officer review dossier to REJECTED without reason throws VALIDATION_FAILED")
    void reviewDossier_rejectWithoutReason_throwsValidationFailed() {
        CitizenDossier mockEntity = CitizenDossier.builder()
                .id(1L)
                .dossierCode("HS-123")
                .wardCode("WARD-AG-01")
                .status("PENDING")
                .build();

        when(dossierRepository.findByDossierCodeIgnoreCase("HS-123")).thenReturn(Optional.of(mockEntity));

        OfficerReviewRequest req = OfficerReviewRequest.builder()
                .status("REJECTED")
                .officerFeedback("   ")
                .build();

        assertThatThrownBy(() -> dossierService.reviewDossier("HS-123", req, null))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.VALIDATION_FAILED));
    }

    @Test
    @DisplayName("Cross-ward unauthorized officer review attempt is strictly blocked (FORBIDDEN)")
    void reviewDossier_crossWardBlocked_throwsForbidden() {
        CitizenDossier mockEntity = CitizenDossier.builder()
                .id(1L)
                .dossierCode("HS-WARD-02-001")
                .wardCode("WARD-AG-02") // Dossier is in Ward 2
                .status("PENDING")
                .build();

        when(dossierRepository.findByDossierCodeIgnoreCase("HS-WARD-02-001")).thenReturn(Optional.of(mockEntity));

        // Officer belongs to Ward 1
        OfficerAuthService.OfficerPrincipal officerFromWard1 = new OfficerAuthService.OfficerPrincipal(
                "CC-AG-8942", "Tran Thi Huong", "WARD-AG-01", "OFFICER", "jti-2", Instant.now().getEpochSecond() + 3600);

        OfficerReviewRequest req = OfficerReviewRequest.builder()
                .status("APPROVED")
                .officerFeedback("Duyet")
                .build();

        assertThatThrownBy(() -> dossierService.reviewDossier("HS-WARD-02-001", req, officerFromWard1))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.FORBIDDEN));
    }

    @Test
    @DisplayName("calculateWorkingDayDeadline skips Jan 1 New Year holiday and weekends")
    void calculateWorkingDayDeadline_acrossNewYearAndWeekend() {
        // Thursday Dec 31, 2026 at 16:30 UTC
        Instant dec31 = ZonedDateTime.of(2026, 12, 31, 16, 30, 0, 0, ZoneOffset.UTC).toInstant();
        Instant deadline = CitizenDossierService.calculateWorkingDayDeadline(dec31, 3);

        ZonedDateTime zdt = deadline.atZone(ZoneOffset.UTC);
        // Friday Jan 1 (Holiday) -> skipped
        // Saturday Jan 2 & Sunday Jan 3 -> skipped
        // Monday Jan 4 -> Day 1
        // Tuesday Jan 5 -> Day 2
        // Wednesday Jan 6 -> Day 3
        assertThat(zdt.getYear()).isEqualTo(2027);
        assertThat(zdt.getMonthValue()).isEqualTo(1);
        assertThat(zdt.getDayOfMonth()).isEqualTo(6);
        assertThat(zdt.getHour()).isEqualTo(17);
        assertThat(zdt.getMinute()).isEqualTo(0);
    }
}
