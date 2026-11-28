package vn.edu.uth.smartward.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SigningDelegationServiceTest {

    @Mock
    private SigningDelegationRepository delegationRepository;

    private SigningDelegationService service;

    @BeforeEach
    void setUp() {
        service = new SigningDelegationService(delegationRepository);
    }

    private SigningDelegation kienHaiActiveDelegation() {
        return SigningDelegation.builder()
                .id(1L)
                .wardCode("AG_DK_KIENHAI")
                .procedureCode("TTHC-CT-01")
                .delegateTitle("Phó Giám đốc Trung tâm Phục vụ hành chính công")
                .decisionNumber("989/QĐ-UBND")
                .sealType("TTPVHCC_SEAL")
                .validFrom(Instant.parse("2025-07-01T00:00:00Z"))
                .validTo(Instant.parse("2027-12-31T23:59:59Z"))
                .active(true)
                .build();
    }

    @Test
    @DisplayName("Valid Kien Hai Deputy Director delegation passes at valid time")
    void verifyDelegatedAuthority_kienHaiDeputy_succeeds() {
        when(delegationRepository.findByWardCodeIgnoreCaseAndProcedureCodeIgnoreCaseAndActiveTrue("AG_DK_KIENHAI", "TTHC-CT-01"))
                .thenReturn(List.of(kienHaiActiveDelegation()));

        OfficerAuthService.OfficerPrincipal officer = new OfficerAuthService.OfficerPrincipal(
                "CB-AG_DK_KIENHAI",
                "Nguyễn Văn An — Phó Giám đốc Trung tâm Phục vụ hành chính công",
                "AG_DK_KIENHAI",
                "OFFICER",
                "jti-1",
                Instant.now().getEpochSecond() + 3600
        );

        SigningDelegation result = service.verifyDelegatedSigningAuthority(
                officer, "TTHC-CT-01", Instant.parse("2026-11-28T10:00:00Z"));
        assertThat(result.getDecisionNumber()).isEqualTo("989/QĐ-UBND");
        assertThat(result.getSealType()).isEqualTo("TTPVHCC_SEAL");
    }

    @Test
    @DisplayName("Expired delegation window is rejected with FORBIDDEN")
    void verifyDelegatedAuthority_expiredDecision_throwsForbidden() {
        SigningDelegation expired = kienHaiActiveDelegation();
        expired.setValidTo(Instant.parse("2026-01-01T00:00:00Z"));
        when(delegationRepository.findByWardCodeIgnoreCaseAndProcedureCodeIgnoreCaseAndActiveTrue("AG_DK_KIENHAI", "TTHC-CT-01"))
                .thenReturn(List.of(expired));

        OfficerAuthService.OfficerPrincipal officer = new OfficerAuthService.OfficerPrincipal(
                "CB-AG_DK_KIENHAI",
                "Nguyễn Văn An — Phó Giám đốc Trung tâm Phục vụ hành chính công",
                "AG_DK_KIENHAI",
                "OFFICER",
                "jti-2",
                Instant.now().getEpochSecond() + 3600
        );

        assertThatThrownBy(() -> service.verifyDelegatedSigningAuthority(
                officer, "TTHC-CT-01", Instant.parse("2026-11-28T10:00:00Z")))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.FORBIDDEN));
    }

    @Test
    @DisplayName("Different ward or non-delegated title is rejected with FORBIDDEN")
    void verifyDelegatedAuthority_wrongIdentityOrWard_throwsForbidden() {
        when(delegationRepository.findByWardCodeIgnoreCaseAndProcedureCodeIgnoreCaseAndActiveTrue("AG_DK_KIENHAI", "TTHC-CT-01"))
                .thenReturn(List.of(kienHaiActiveDelegation()));

        OfficerAuthService.OfficerPrincipal nonDeputy = new OfficerAuthService.OfficerPrincipal(
                "CB-AG_DK_KIENHAI-STAFF",
                "Trần Thị Bình — Chuyên viên tiếp nhận",
                "AG_DK_KIENHAI",
                "OFFICER",
                "jti-3",
                Instant.now().getEpochSecond() + 3600
        );

        assertThatThrownBy(() -> service.verifyDelegatedSigningAuthority(
                nonDeputy, "TTHC-CT-01", Instant.parse("2026-11-28T10:00:00Z")))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.FORBIDDEN));
    }
}
