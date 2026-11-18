package vn.edu.uth.smartward.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

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

    @Test
    void testAuthenticate_defaultWardCode_isLongXuyen() {
        OfficerAuthService.LoginResponse login = officerAuthService.authenticate("CC-AG-8942", "8942", null);
        assertEquals("AG_P_LONGXUYEN", login.wardCode());

        OfficerAuthService.OfficerPrincipal principal = officerAuthService.verifyToken("Bearer " + login.token());
        assertEquals("AG_P_LONGXUYEN", principal.wardCode());
    }

    @Test
    @SuppressWarnings("unchecked")
    void testRedisJwtRevocation() {
        StringRedisTemplate mockRedis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> mockOps = mock(ValueOperations.class);
        when(mockRedis.opsForValue()).thenReturn(mockOps);

        OfficerAuthService serviceWithRedis = new OfficerAuthService(new ObjectMapper(), mockRedis);
        ReflectionTestUtils.setField(serviceWithRedis, "jwtSecret", "SmartWardAI_UnitTest_JwtSecret_32B!");
        ReflectionTestUtils.setField(serviceWithRedis, "tokenTtlHours", 8);

        OfficerAuthService.LoginResponse login = serviceWithRedis.authenticate("CC-AG-8942", "8942", null);
        serviceWithRedis.revokeToken("Bearer " + login.token());

        verify(mockOps).set(
                startsWith("smartward:auth:revoked:"),
                eq("true"),
                any(Duration.class)
        );

        when(mockRedis.hasKey(startsWith("smartward:auth:revoked:"))).thenReturn(true);
        BusinessException ex = assertThrows(BusinessException.class, () ->
                serviceWithRedis.verifyToken("Bearer " + login.token())
        );
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    void testAuthenticate_ignoresClientSuppliedWardCode_alwaysUsesAccountWard() {
        // SEC-09: Client supplies spoofed ward 'WARD-HACKED-99'
        OfficerAuthService.LoginResponse login = officerAuthService.authenticate("CC-AG-8942", "8942", "WARD-HACKED-99");
        assertEquals("AG_P_LONGXUYEN", login.wardCode(), "Ward code must be strictly taken from officer account, ignoring client override");

        OfficerAuthService.OfficerPrincipal principal = officerAuthService.verifyToken("Bearer " + login.token());
        assertEquals("AG_P_LONGXUYEN", principal.wardCode());
    }

    @Test
    void testResolveSigningSecret_rejectsChangeMeDevTestFallback() {
        // SEC-01: Rejects placeholder strings
        OfficerAuthService badSecretService = new OfficerAuthService(new ObjectMapper());
        ReflectionTestUtils.setField(badSecretService, "jwtSecret", "SmartWardAI_ChangeMe_In_Prod_Secret_Key_32B!");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                badSecretService.authenticate("CC-AG-8942", "8942", null)
        );
        assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("placeholder"));
    }

    @Test
    void testAuthenticate_allWardsOfficerAccounts_success() {
        // Test Phu Quoc Special Zone Officer
        OfficerAuthService.LoginResponse loginPQ = officerAuthService.authenticate("CB-AG_DK_PHUQUOC", "8942", null);
        assertNotNull(loginPQ.token());
        assertEquals("CB-AG_DK_PHUQUOC", loginPQ.badgeId());
        assertEquals("AG_DK_PHUQUOC", loginPQ.wardCode());
        assertEquals("OFFICER", loginPQ.role());

        // Test My Binh Ward Officer
        OfficerAuthService.LoginResponse loginMB = officerAuthService.authenticate("CB-AG_P_MYBINH", "8942", null);
        assertNotNull(loginMB.token());
        assertEquals("AG_P_MYBINH", loginMB.wardCode());

        // Test Vinh An Commune Officer with fallback PIN 2026
        OfficerAuthService.LoginResponse loginVA = officerAuthService.authenticate("CB-AG_X_VINHAN", "2026", null);
        assertNotNull(loginVA.token());
        assertEquals("AG_X_VINHAN", loginVA.wardCode());

        // Test invalid PIN rejection
        BusinessException ex = assertThrows(BusinessException.class, () ->
                officerAuthService.authenticate("CB-AG_DK_PHUQUOC", "9999", null)
        );
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    void testChangePin_success_andLoginWithNewPin() {
        // Change PIN from default 8942 to new PIN 987654
        OfficerAuthService.ChangePinResponse resp = officerAuthService.changePin(
                "CB-AG_DK_PHUQUOC",
                "8942",
                "987654",
                "987654",
                null
        );
        assertNotNull(resp);
        assertTrue(resp.success());
        assertEquals("CB-AG_DK_PHUQUOC", resp.badgeId());

        // Authenticate with new PIN must succeed
        OfficerAuthService.LoginResponse newLogin = officerAuthService.authenticate("CB-AG_DK_PHUQUOC", "987654", null);
        assertNotNull(newLogin.token());
        assertEquals("CB-AG_DK_PHUQUOC", newLogin.badgeId());

        // Old PIN must now fail
        BusinessException ex = assertThrows(BusinessException.class, () ->
                officerAuthService.authenticate("CB-AG_DK_PHUQUOC", "8942", null)
        );
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    void testChangePin_wrongCurrentPin_shouldReject() {
        BusinessException ex = assertThrows(BusinessException.class, () ->
                officerAuthService.changePin("CB-AG_DK_PHUQUOC", "0000", "987654", "987654", null)
        );
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    void testChangePin_mismatchedConfirmPin_shouldReject() {
        BusinessException ex = assertThrows(BusinessException.class, () ->
                officerAuthService.changePin("CB-AG_DK_PHUQUOC", "8942", "987654", "987655", null)
        );
        assertEquals(ErrorCode.INVALID_REQUEST, ex.getErrorCode());
    }

    @Test
    void testChangePin_sameAsCurrentPin_shouldReject() {
        BusinessException ex = assertThrows(BusinessException.class, () ->
                officerAuthService.changePin("CB-AG_DK_PHUQUOC", "8942", "8942", "8942", null)
        );
        assertEquals(ErrorCode.INVALID_REQUEST, ex.getErrorCode());
    }

    @Test
    void testChangePin_tooShortPin_shouldReject() {
        BusinessException ex = assertThrows(BusinessException.class, () ->
                officerAuthService.changePin("CB-AG_DK_PHUQUOC", "8942", "12", "12", null)
        );
        assertEquals(ErrorCode.INVALID_REQUEST, ex.getErrorCode());
    }

    @Test
    void testAdminWardCode_isAgProvince_andMustChangePinInitially() {
        OfficerAuthService.LoginResponse adminLogin = officerAuthService.authenticate("ADM-AG-0001", "9999", null);
        assertEquals("ADM-AG-0001", adminLogin.badgeId());
        assertEquals("ADMIN", adminLogin.role());
        assertEquals("AG_PROVINCE", adminLogin.wardCode(), "Admin ward_code must be AG_PROVINCE, not a commune");
        assertTrue(adminLogin.mustChangePin(), "First login must flag mustChangePin=true");

        officerAuthService.changePin("ADM-AG-0001", "9999", "AdminNewPin2026!", "AdminNewPin2026!", null);
        OfficerAuthService.LoginResponse afterChange = officerAuthService.authenticate("ADM-AG-0001", "AdminNewPin2026!", null);
        assertFalse(afterChange.mustChangePin(), "After changing PIN, mustChangePin must be false");
    }

    @Test
    void testProductionProfile_rejectsDefaultInMemoryPinAndSeedHashes() {
        OfficerAuthService prodService = new OfficerAuthService(new ObjectMapper());
        ReflectionTestUtils.setField(prodService, "jwtSecret", "SmartWardAI_UnitTest_JwtSecret_32B!");
        ReflectionTestUtils.setField(prodService, "tokenTtlHours", 8);
        ReflectionTestUtils.setField(prodService, "activeProfile", "prod");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                prodService.authenticate("ADM-AG-0001", "9999", null)
        );
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }
}
