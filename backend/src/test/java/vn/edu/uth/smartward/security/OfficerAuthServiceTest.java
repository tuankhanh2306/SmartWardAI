package vn.edu.uth.smartward.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;

import static org.junit.jupiter.api.Assertions.*;

class OfficerAuthServiceTest {

    private OfficerAuthService officerAuthService;

    @BeforeEach
    void setUp() {
        officerAuthService = new OfficerAuthService(new ObjectMapper());
        ReflectionTestUtils.setField(officerAuthService, "jwtSecret", "SmartWardAI_UnitTest_JwtSecret_32B!");
        ReflectionTestUtils.setField(officerAuthService, "tokenTtlHours", 8);
    }

    @Test
    void testAuthenticateAndVerifyToken_success() {
        OfficerAuthService.LoginResponse login = officerAuthService.authenticate("CC-AG-8942", "8942", "WARD-AG-01");
        assertNotNull(login.token());
        assertEquals("CC-AG-8942", login.badgeId());
        assertEquals("OFFICER", login.role());

        OfficerAuthService.OfficerPrincipal principal = officerAuthService.verifyToken("Bearer " + login.token());
        assertEquals("CC-AG-8942", principal.badgeId());
        assertEquals("OFFICER", principal.role());
    }

    @Test
    void testAuthenticate_withArbitraryBadgeOrPin_shouldReject() {
        BusinessException ex = assertThrows(BusinessException.class, () ->
                officerAuthService.authenticate("CC-FAKE-9999", "1234", "WARD-AG-01")
        );
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    void testVerifyToken_whenTamperedSignature_shouldReject() {
        OfficerAuthService.LoginResponse login = officerAuthService.authenticate("CC-AG-8942", "8942", "WARD-AG-01");
        String tampered = login.token().substring(0, login.token().length() - 2) + "aa";
        BusinessException ex = assertThrows(BusinessException.class, () ->
                officerAuthService.verifyToken("Bearer " + tampered)
        );
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    void testRevokeToken_shouldPreventSubsequentVerification() {
        OfficerAuthService.LoginResponse login = officerAuthService.authenticate("CC-AG-8942", "8942", "WARD-AG-01");
        officerAuthService.revokeToken("Bearer " + login.token());
        BusinessException ex = assertThrows(BusinessException.class, () ->
                officerAuthService.verifyToken("Bearer " + login.token())
        );
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }
}
