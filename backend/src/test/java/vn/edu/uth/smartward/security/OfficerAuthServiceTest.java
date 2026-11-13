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
}
