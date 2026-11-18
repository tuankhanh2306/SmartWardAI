package vn.edu.uth.smartward.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.edu.uth.smartward.audit.AuditLog;
import vn.edu.uth.smartward.audit.AuditLogRepository;
import vn.edu.uth.smartward.audit.AuditService;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.common.GlobalExceptionHandler;
import vn.edu.uth.smartward.dossier.*;
import vn.edu.uth.smartward.dossier.dto.*;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("P1 Authentication, Authorization, Audit & State Machine Verification")
class SmartWardP1AuthAndAuditTest {

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);

    // =========================================================================
    // 5.1: Database Officers, BCrypt Password & 5-Failure Lockout Policy
    // =========================================================================

    @Test
    @DisplayName("5.1: BCrypt cost 12 authentication succeeds for valid password")
    void testOfficerAuth_bCryptSuccess() {
        OfficerRepository officerRepo = mock(OfficerRepository.class);
        AuditService auditService = mock(AuditService.class);

        String rawPassword = "SecureOfficerPassword2026!";
        String hash = passwordEncoder.encode(rawPassword);

        Officer officer = Officer.builder()
                .badgeId("CC-AG-8942")
                .fullName("Trần Quốc Bảo")
                .wardCode("AG_P_LONGXUYEN")
                .role("OFFICER")
                .passwordHash(hash)
                .failedAttempts(0)
                .active(true)
                .build();

        when(officerRepo.findByBadgeIdIgnoreCase("CC-AG-8942")).thenReturn(Optional.of(officer));

        OfficerAuthService authService = new OfficerAuthService(
                new com.fasterxml.jackson.databind.ObjectMapper(),
                null,
                officerRepo,
                auditService
        );
        org.springframework.test.util.ReflectionTestUtils.setField(authService, "jwtSecret", "sw_sec_8f9b4c2e1a7d6e3f5b0c9a8d7e6f5a4b_prod_2026_auth");
        org.springframework.test.util.ReflectionTestUtils.setField(authService, "tokenTtlHours", 8);

        OfficerAuthService.LoginResponse response = authService.authenticate("CC-AG-8942", rawPassword, "AG_P_LONGXUYEN");
        assertNotNull(response);
        assertEquals("CC-AG-8942", response.badgeId());
        assertEquals("AG_P_LONGXUYEN", response.wardCode());
        assertEquals(0, officer.getFailedAttempts());
        assertNull(officer.getLockedUntil());
        verify(officerRepo, atLeastOnce()).save(officer);
    }

    @Test
    @DisplayName("5.1: 5 failed attempts locks officer account for 15 minutes")
    void testOfficerAuth_lockoutAfter5Failures() {
        OfficerRepository officerRepo = mock(OfficerRepository.class);
        AuditService auditService = mock(AuditService.class);

        Officer officer = Officer.builder()
                .badgeId("CC-AG-8942")
                .fullName("Trần Quốc Bảo")
                .wardCode("AG_P_LONGXUYEN")
                .role("OFFICER")
                .passwordHash(passwordEncoder.encode("CorrectPassword123!"))
                .failedAttempts(4)
                .active(true)
                .build();

        when(officerRepo.findByBadgeIdIgnoreCase("CC-AG-8942")).thenReturn(Optional.of(officer));

        OfficerAuthService authService = new OfficerAuthService(
                new com.fasterxml.jackson.databind.ObjectMapper(),
                null,
                officerRepo,
                auditService
        );
        org.springframework.test.util.ReflectionTestUtils.setField(authService, "jwtSecret", "sw_sec_8f9b4c2e1a7d6e3f5b0c9a8d7e6f5a4b_prod_2026_auth");

        // 5th failed attempt should trigger 15-min lockout
        assertThatThrownBy(() -> authService.authenticate("CC-AG-8942", "WrongPassword!", "AG_P_LONGXUYEN"))
                .isInstanceOf(BusinessException.class);

        assertNotNull(officer.getLockedUntil());
        assertTrue(officer.getLockedUntil().isAfter(Instant.now().plus(Duration.ofMinutes(14))));

        // Subsequent attempt while locked must be immediately rejected with lockout message
        assertThatThrownBy(() -> authService.authenticate("CC-AG-8942", "CorrectPassword123!", "AG_P_LONGXUYEN"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("tạm khóa 15 phút");
    }

    // =========================================================================
    // 5.3: Tenant Isolation (Cross-Ward Access Control)
    // =========================================================================

    @Test
    @DisplayName("5.3: Officer from Ward A reviewing dossier from Ward B is blocked with 403 Forbidden")
    void testTenantIsolation_crossWardBlocked() {
        CitizenDossierRepository dossierRepo = mock(CitizenDossierRepository.class);
        AuditService auditService = mock(AuditService.class);

        CitizenDossier dossierWardB = CitizenDossier.builder()
                .dossierCode("HS-WARD-B-001")
                .wardCode("WARD-B")
                .status("PENDING")
                .build();

        when(dossierRepo.findByDossierCodeIgnoreCase("HS-WARD-B-001")).thenReturn(Optional.of(dossierWardB));

        CitizenDossierService service = new CitizenDossierService(
                dossierRepo,
                null,
                new com.fasterxml.jackson.databind.ObjectMapper(),
                null,
                null,
                auditService
        );

        OfficerAuthService.OfficerPrincipal officerWardA = new OfficerAuthService.OfficerPrincipal(
                "CC-AG-8942", "Trần Quốc Bảo", "WARD-A", "OFFICER", "jti-1", Instant.now().getEpochSecond() + 3600);

        OfficerReviewRequest req = OfficerReviewRequest.builder()
                .status("APPROVED")
                .officerFeedback("Đồng ý phê duyệt")
                .build();

        assertThatThrownBy(() -> service.reviewDossier("HS-WARD-B-001", req, officerWardA))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertEquals(ErrorCode.FORBIDDEN, be.getErrorCode());
                });
    }

    // =========================================================================
    // 5.4: Immutable Audit Trail Logging
    // =========================================================================

    @Test
    @DisplayName("5.4: AuditService persists audit entries into repository without failing caller")
    void testAuditService_persistsEntry() {
        List<AuditLog> savedLogs = new ArrayList<>();
        AuditLogRepository auditRepo = mock(AuditLogRepository.class);
        when(auditRepo.save(any(AuditLog.class))).thenAnswer(inv -> {
            AuditLog entry = inv.getArgument(0);
            savedLogs.add(entry);
            return entry;
        });

        AuditService auditService = new AuditService(auditRepo);
        auditService.logAction("CC-AG-8942", "AG_P_LONGXUYEN", "DOSSIER_REVIEW_APPROVED", "DOSSIER", "HS-20261111-001", "127.0.0.1", "Mozilla/5.0");

        assertEquals(1, savedLogs.size());
        assertEquals("CC-AG-8942", savedLogs.get(0).getWho());
        assertEquals("AG_P_LONGXUYEN", savedLogs.get(0).getWard());
        assertEquals("DOSSIER_REVIEW_APPROVED", savedLogs.get(0).getAction());
        assertEquals("HS-20261111-001", savedLogs.get(0).getEntityId());
    }

    // =========================================================================
    // 5.5: Dossier State Machine & Optimistic Locking Concurrency
    // =========================================================================

    @Test
    @DisplayName("5.5: Attempting to modify terminal state (APPROVED/REJECTED) throws 409 Conflict")
    void testStateMachine_terminalStateThrows409() {
        CitizenDossierRepository dossierRepo = mock(CitizenDossierRepository.class);

        CitizenDossier approvedDossier = CitizenDossier.builder()
                .dossierCode("HS-TERMINAL-01")
                .wardCode("AG_P_LONGXUYEN")
                .status("APPROVED")
                .build();

        when(dossierRepo.findByDossierCodeIgnoreCase("HS-TERMINAL-01")).thenReturn(Optional.of(approvedDossier));

        CitizenDossierService service = new CitizenDossierService(
                dossierRepo,
                null,
                new com.fasterxml.jackson.databind.ObjectMapper()
        );

        OfficerAuthService.OfficerPrincipal principal = new OfficerAuthService.OfficerPrincipal(
                "CC-AG-8942", "Trần Quốc Bảo", "AG_P_LONGXUYEN", "OFFICER", "jti-1", Instant.now().getEpochSecond() + 3600);

        OfficerReviewRequest req = OfficerReviewRequest.builder()
                .status("REJECTED")
                .officerFeedback("Hủy kết quả")
                .build();

        assertThatThrownBy(() -> service.reviewDossier("HS-TERMINAL-01", req, principal))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertEquals(ErrorCode.CONFLICT, be.getErrorCode());
                    assertTrue(be.getMessage().contains("trạng thái kết thúc"));
                });
    }

    @Test
    @DisplayName("5.5: Reviewing with REJECTED or SUPPLEMENT_REQUIRED requires mandatory reason")
    void testStateMachine_mandatoryReasonRequired() {
        CitizenDossierRepository dossierRepo = mock(CitizenDossierRepository.class);

        CitizenDossier pendingDossier = CitizenDossier.builder()
                .dossierCode("HS-REJECT-NO-REASON")
                .wardCode("AG_P_LONGXUYEN")
                .status("PENDING")
                .build();

        when(dossierRepo.findByDossierCodeIgnoreCase("HS-REJECT-NO-REASON")).thenReturn(Optional.of(pendingDossier));

        CitizenDossierService service = new CitizenDossierService(
                dossierRepo,
                null,
                new com.fasterxml.jackson.databind.ObjectMapper()
        );

        OfficerAuthService.OfficerPrincipal principal = new OfficerAuthService.OfficerPrincipal(
                "CC-AG-8942", "Trần Quốc Bảo", "AG_P_LONGXUYEN", "OFFICER", "jti-1", Instant.now().getEpochSecond() + 3600);

        OfficerReviewRequest req = OfficerReviewRequest.builder()
                .status("REJECTED")
                .officerFeedback("") // Blank reason
                .build();

        assertThatThrownBy(() -> service.reviewDossier("HS-REJECT-NO-REASON", req, principal))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertEquals(ErrorCode.VALIDATION_FAILED, be.getErrorCode());
                    assertTrue(be.getMessage().contains("Bắt buộc phải nhập lý do"));
                });
    }

    @Test
    @DisplayName("5.5: Concurrent update collision (OptimisticLockingFailureException) returns HTTP 409 Conflict")
    void testOptimisticLocking_returns409Conflict() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        OptimisticLockingFailureException ex = new OptimisticLockingFailureException(
                "Row was updated or deleted by another transaction (or unsaved-value mapping was incorrect)");

        ResponseEntity<ApiResponse<Void>> response = handler.handleOptimisticLockingFailure(ex);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("SW_409_CONFLICT", response.getBody().errorCode());
        assertTrue(response.getBody().message().contains("cập nhật đồng thời"));
    }
}
