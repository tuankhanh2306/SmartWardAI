package vn.edu.uth.smartward.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import vn.edu.uth.smartward.audit.AuditService;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OfficerAuthServiceTest {

    private static final String TEST_JWT_SECRET = "SmartWardAI_UnitTest_JwtSecret_32B!";
    private static final String OFFICER_PIN = "OfficerSecure2026!";
    private static final String SECOND_OFFICER_PIN = "SecondOfficer2026!";
    private static final String ADMIN_INIT_PIN = "AdminInitPin2026!";

    private OfficerAuthService officerAuthService;
    private OfficerRepository officerRepository;
    private Map<String, Officer> dbStore;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);

    @BeforeEach
    void setUp() {
        dbStore = new ConcurrentHashMap<>();
        seedAccount("CC-AG-8942", "Trần Quốc Bảo", "AG_P_LONGXUYEN", "OFFICER", OFFICER_PIN, false, null);
        seedAccount("CC-AG-1001", "Nguyễn Thị Minh Khai", "AG_P_LONGXUYEN", "OFFICER", SECOND_OFFICER_PIN, false, null);
        seedAccount("CB-AG_DK_PHUQUOC", "Cán bộ Đặc khu Phú Quốc", "AG_DK_PHUQUOC", "OFFICER", OFFICER_PIN, true, Instant.now().plus(Duration.ofHours(24)));
        seedAccount("CB-AG_P_MYBINH", "Cán bộ Phường Mỹ Bình", "AG_P_MYBINH", "OFFICER", OFFICER_PIN, false, null);
        seedAccount("CB-AG_X_VINHAN", "Cán bộ Xã Vĩnh An", "AG_X_VINHAN", "OFFICER", SECOND_OFFICER_PIN, false, null);
        seedAccount("ADM-AG-0001", "Lê Văn Quản Trị", "AG_PROVINCE", "ADMIN", ADMIN_INIT_PIN, true, Instant.now().plus(Duration.ofHours(24)));

        officerRepository = createInMemoryOfficerRepo(dbStore);
        officerAuthService = new OfficerAuthService(new ObjectMapper(), null, officerRepository, null);
        ReflectionTestUtils.setField(officerAuthService, "jwtSecret", TEST_JWT_SECRET);
        ReflectionTestUtils.setField(officerAuthService, "tokenTtlHours", 8);
    }

    private void seedAccount(String badgeId, String fullName, String wardCode, String role,
                             String rawPin, boolean mustChangePin, Instant pinExpiresAt) {
        dbStore.put(badgeId.toUpperCase(), Officer.builder()
                .badgeId(badgeId.toUpperCase())
                .fullName(fullName)
                .wardCode(wardCode)
                .role(role)
                .passwordHash(encoder.encode(rawPin))
                .mustChangePin(mustChangePin)
                .pinExpiresAt(pinExpiresAt)
                .failedAttempts(0)
                .active(true)
                .build());
    }

    private OfficerRepository createInMemoryOfficerRepo(Map<String, Officer> store) {
        OfficerRepository repo = mock(OfficerRepository.class);
        when(repo.findByBadgeIdIgnoreCase(anyString())).thenAnswer(inv -> {
            String key = inv.<String>getArgument(0).trim().toUpperCase();
            return Optional.ofNullable(store.get(key));
        });
        when(repo.save(any(Officer.class))).thenAnswer(inv -> {
            Officer o = inv.getArgument(0);
            store.put(o.getBadgeId().toUpperCase(), o);
            return o;
        });
        when(repo.existsByRoleIgnoreCaseAndActiveTrueAndMustChangePinTrue(anyString())).thenAnswer(inv -> {
            String r = inv.getArgument(0);
            return store.values().stream()
                    .anyMatch(o -> r.equalsIgnoreCase(o.getRole())
                            && Boolean.TRUE.equals(o.getActive())
                            && Boolean.TRUE.equals(o.getMustChangePin()));
        });
        return repo;
    }

    @Test
    void testAuthenticateAndVerifyToken_success() {
        OfficerAuthService.LoginResponse login = officerAuthService.authenticate("CC-AG-8942", OFFICER_PIN, "WARD-AG-01");
        assertNotNull(login.token());
        assertEquals("CC-AG-8942", login.badgeId());
        assertEquals("OFFICER", login.role());
        assertFalse(login.mustChangePin());

        OfficerAuthService.OfficerPrincipal principal = officerAuthService.verifyToken("Bearer " + login.token());
        assertEquals("CC-AG-8942", principal.badgeId());
        assertEquals("OFFICER", principal.role());
        assertFalse(principal.mustChangePin());
    }

    @Test
    void testAuthenticate_rejectsWithoutRepositoryOrLegacyShortPins() {
        OfficerAuthService noRepoService = new OfficerAuthService(new ObjectMapper());
        ReflectionTestUtils.setField(noRepoService, "jwtSecret", TEST_JWT_SECRET);

        BusinessException noRepoEx = assertThrows(BusinessException.class, () ->
                noRepoService.authenticate("CC-AG-8942", "8942", null)
        );
        assertEquals(ErrorCode.UNAUTHORIZED, noRepoEx.getErrorCode());

        assertThrows(BusinessException.class, () -> officerAuthService.authenticate("CC-AG-8942", "8942", null));
        assertThrows(BusinessException.class, () -> officerAuthService.authenticate("CC-AG-1001", "2026", null));
        assertThrows(BusinessException.class, () -> officerAuthService.authenticate("ADM-AG-0001", "9999", null));
    }

    @Test
    void testAuthenticate_rejectsRevokedOrCompromisedSeedHashes() {
        dbStore.get("CC-AG-8942").setPasswordHash(OfficerAuthService.REVOKED_SEED_MARKER);
        assertEquals(ErrorCode.UNAUTHORIZED, assertThrows(BusinessException.class, () ->
                officerAuthService.authenticate("CC-AG-8942", OFFICER_PIN, null)).getErrorCode());

        dbStore.get("CC-AG-1001").setPasswordHash(OfficerAuthService.SEED_OFFICER_BCRYPT);
        assertEquals(ErrorCode.UNAUTHORIZED, assertThrows(BusinessException.class, () ->
                officerAuthService.authenticate("CC-AG-1001", "8942", null)).getErrorCode());

        dbStore.get("ADM-AG-0001").setPasswordHash(OfficerAuthService.SEED_ADMIN_BCRYPT);
        assertEquals(ErrorCode.UNAUTHORIZED, assertThrows(BusinessException.class, () ->
                officerAuthService.authenticate("ADM-AG-0001", "9999", null)).getErrorCode());
    }

    @Test
    void testAuthenticate_withArbitraryBadgeOrPin_shouldReject() {
        BusinessException ex = assertThrows(BusinessException.class, () ->
                officerAuthService.authenticate("CC-FAKE-9999", "WrongPin123!", "WARD-AG-01")
        );
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    void testVerifyToken_whenTamperedSignature_shouldReject() {
        OfficerAuthService.LoginResponse login = officerAuthService.authenticate("CC-AG-8942", OFFICER_PIN, "WARD-AG-01");
        String tampered = login.token().substring(0, login.token().length() - 2) + "aa";
        BusinessException ex = assertThrows(BusinessException.class, () ->
                officerAuthService.verifyToken("Bearer " + tampered)
        );
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    void testRevokeToken_shouldPreventSubsequentVerification() {
        OfficerAuthService.LoginResponse login = officerAuthService.authenticate("CC-AG-8942", OFFICER_PIN, "WARD-AG-01");
        officerAuthService.revokeToken("Bearer " + login.token());
        BusinessException ex = assertThrows(BusinessException.class, () ->
                officerAuthService.verifyToken("Bearer " + login.token())
        );
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    void testAuthenticate_defaultWardCode_isLongXuyen() {
        OfficerAuthService.LoginResponse login = officerAuthService.authenticate("CC-AG-8942", OFFICER_PIN, null);
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

        OfficerAuthService serviceWithRedis = new OfficerAuthService(new ObjectMapper(), mockRedis, officerRepository, null);
        ReflectionTestUtils.setField(serviceWithRedis, "jwtSecret", TEST_JWT_SECRET);
        ReflectionTestUtils.setField(serviceWithRedis, "tokenTtlHours", 8);

        OfficerAuthService.LoginResponse login = serviceWithRedis.authenticate("CC-AG-8942", OFFICER_PIN, null);
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
        OfficerAuthService.LoginResponse login = officerAuthService.authenticate("CC-AG-8942", OFFICER_PIN, "WARD-HACKED-99");
        assertEquals("AG_P_LONGXUYEN", login.wardCode(), "Ward code must be strictly taken from officer account, ignoring client override");

        OfficerAuthService.OfficerPrincipal principal = officerAuthService.verifyToken("Bearer " + login.token());
        assertEquals("AG_P_LONGXUYEN", principal.wardCode());
    }

    @Test
    void testResolveSigningSecret_rejectsChangeMeDevTestFallback() {
        OfficerAuthService badSecretService = new OfficerAuthService(new ObjectMapper(), null, officerRepository, null);
        ReflectionTestUtils.setField(badSecretService, "jwtSecret", "SmartWardAI_ChangeMe_In_Prod_Secret_Key_32B!");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                badSecretService.authenticate("CC-AG-8942", OFFICER_PIN, null)
        );
        assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("placeholder"));
    }

    @Test
    void testAuthenticate_allWardsOfficerAccounts_success() {
        OfficerAuthService.LoginResponse loginPQ = officerAuthService.authenticate("CB-AG_DK_PHUQUOC", OFFICER_PIN, null);
        assertNotNull(loginPQ.token());
        assertEquals("CB-AG_DK_PHUQUOC", loginPQ.badgeId());
        assertEquals("AG_DK_PHUQUOC", loginPQ.wardCode());
        assertEquals("OFFICER", loginPQ.role());

        OfficerAuthService.LoginResponse loginMB = officerAuthService.authenticate("CB-AG_P_MYBINH", OFFICER_PIN, null);
        assertNotNull(loginMB.token());
        assertEquals("AG_P_MYBINH", loginMB.wardCode());

        OfficerAuthService.LoginResponse loginVA = officerAuthService.authenticate("CB-AG_X_VINHAN", SECOND_OFFICER_PIN, null);
        assertNotNull(loginVA.token());
        assertEquals("AG_X_VINHAN", loginVA.wardCode());

        BusinessException ex = assertThrows(BusinessException.class, () ->
                officerAuthService.authenticate("CB-AG_DK_PHUQUOC", "9999", null)
        );
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    void testChangePin_success_andLoginWithNewPin() {
        OfficerAuthService.ChangePinResponse resp = officerAuthService.changePin(
                "CB-AG_DK_PHUQUOC",
                OFFICER_PIN,
                "987654New!",
                "987654New!",
                null
        );
        assertNotNull(resp);
        assertTrue(resp.success());
        assertEquals("CB-AG_DK_PHUQUOC", resp.badgeId());

        OfficerAuthService.LoginResponse newLogin = officerAuthService.authenticate("CB-AG_DK_PHUQUOC", "987654New!", null);
        assertNotNull(newLogin.token());
        assertFalse(newLogin.mustChangePin());

        BusinessException ex = assertThrows(BusinessException.class, () ->
                officerAuthService.authenticate("CB-AG_DK_PHUQUOC", OFFICER_PIN, null)
        );
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    void testChangePin_validationRejects() {
        assertEquals(ErrorCode.UNAUTHORIZED, assertThrows(BusinessException.class, () ->
                officerAuthService.changePin("CB-AG_DK_PHUQUOC", "WrongPin123", "987654", "987654", null)).getErrorCode());
        assertEquals(ErrorCode.INVALID_REQUEST, assertThrows(BusinessException.class, () ->
                officerAuthService.changePin("CB-AG_DK_PHUQUOC", OFFICER_PIN, "987654", "987655", null)).getErrorCode());
        assertEquals(ErrorCode.INVALID_REQUEST, assertThrows(BusinessException.class, () ->
                officerAuthService.changePin("CB-AG_DK_PHUQUOC", OFFICER_PIN, OFFICER_PIN, OFFICER_PIN, null)).getErrorCode());
        assertEquals(ErrorCode.INVALID_REQUEST, assertThrows(BusinessException.class, () ->
                officerAuthService.changePin("CB-AG_DK_PHUQUOC", OFFICER_PIN, "12", "12", null)).getErrorCode());
    }

    @Test
    void testAdminWardCode_isAgProvince_andMustChangePinInitially() {
        OfficerAuthService.LoginResponse adminLogin = officerAuthService.authenticate("ADM-AG-0001", ADMIN_INIT_PIN, null);
        assertEquals("ADM-AG-0001", adminLogin.badgeId());
        assertEquals("ADMIN", adminLogin.role());
        assertEquals("AG_PROVINCE", adminLogin.wardCode(), "Admin ward_code must be AG_PROVINCE, not a commune");
        assertTrue(adminLogin.mustChangePin(), "First login must flag mustChangePin=true");

        officerAuthService.changePin("ADM-AG-0001", ADMIN_INIT_PIN, "AdminNewPin2026!", "AdminNewPin2026!", null);
        OfficerAuthService.LoginResponse afterChange = officerAuthService.authenticate("ADM-AG-0001", "AdminNewPin2026!", null);
        assertFalse(afterChange.mustChangePin(), "After changing PIN, mustChangePin must be false");
    }

    @Test
    void testOneTimePinExpiryAndAdminReissue() {
        dbStore.get("ADM-AG-0001").setPinExpiresAt(Instant.now().minusSeconds(60));
        BusinessException expiredEx = assertThrows(BusinessException.class, () ->
                officerAuthService.authenticate("ADM-AG-0001", ADMIN_INIT_PIN, null));
        assertEquals(ErrorCode.UNAUTHORIZED, expiredEx.getErrorCode());

        OfficerAuthService.OfficerPrincipal unreadyAdmin = new OfficerAuthService.OfficerPrincipal(
                "ADM-AG-0001", "Admin", "AG_PROVINCE", "ADMIN", "j1", Instant.now().getEpochSecond() + 3600, true);
        assertEquals(ErrorCode.FORBIDDEN, assertThrows(BusinessException.class, () ->
                officerAuthService.issueOneTimePin("CC-AG-8942", unreadyAdmin)).getErrorCode());

        OfficerAuthService.OfficerPrincipal readyAdmin = new OfficerAuthService.OfficerPrincipal(
                "ADM-AG-0001", "Admin", "AG_PROVINCE", "ADMIN", "j2", Instant.now().getEpochSecond() + 3600, false);
        OfficerAuthService.OneTimePinIssueResponse issued = officerAuthService.issueOneTimePin("CC-AG-8942", readyAdmin);
        assertEquals(16, issued.oneTimePin().length());
        assertTrue(issued.mustChangePin());

        OfficerAuthService.LoginResponse otpLogin = officerAuthService.authenticate("CC-AG-8942", issued.oneTimePin(), null);
        assertTrue(otpLogin.mustChangePin());
    }

    @Test
    void testAuthenticate_logsRealClientIp_notHardcodedLocalhost() {
        AuditService auditService = mock(AuditService.class);
        OfficerAuthService auditedAuth = new OfficerAuthService(new ObjectMapper(), null, officerRepository, auditService);
        ReflectionTestUtils.setField(auditedAuth, "jwtSecret", TEST_JWT_SECRET);
        ReflectionTestUtils.setField(auditedAuth, "tokenTtlHours", 8);

        assertThrows(BusinessException.class, () ->
                auditedAuth.authenticate("CC-AG-8942", "WrongPin!", null, "203.0.113.45"));
        verify(auditService).logAction("CC-AG-8942", "AG_P_LONGXUYEN", "LOGIN_FAILED", "OFFICER", "CC-AG-8942", "203.0.113.45", null);

        OfficerAuthService.LoginResponse ok = auditedAuth.authenticate("CC-AG-8942", OFFICER_PIN, null, "203.0.113.45");
        assertNotNull(ok.token());
        verify(auditService).logAction("CC-AG-8942", "AG_P_LONGXUYEN", "LOGIN_SUCCESS", "OFFICER", "CC-AG-8942", "203.0.113.45", null);
    }

    @Test
    @SuppressWarnings("unchecked")
    void testRedisIpLockout_blocksAttackerIpWithoutLockingOutCounterIp() {
        AuditService auditService = mock(AuditService.class);
        StringRedisTemplate mockRedis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> mockOps = mock(ValueOperations.class);
        Map<String, Integer> counters = new ConcurrentHashMap<>();
        when(mockRedis.opsForValue()).thenReturn(mockOps);
        when(mockOps.get(anyString())).thenAnswer(inv -> {
            Integer v = counters.get(inv.<String>getArgument(0));
            return v != null ? String.valueOf(v) : null;
        });
        when(mockOps.increment(anyString())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            int next = counters.merge(key, 1, Integer::sum);
            return (long) next;
        });

        OfficerAuthService svc = new OfficerAuthService(new ObjectMapper(), mockRedis, officerRepository, auditService);
        ReflectionTestUtils.setField(svc, "jwtSecret", TEST_JWT_SECRET);
        ReflectionTestUtils.setField(svc, "tokenTtlHours", 8);

        // Attacker IP fails 5 times on known badge CC-AG-8942
        for (int i = 0; i < 5; i++) {
            assertThrows(BusinessException.class, () ->
                    svc.authenticate("CC-AG-8942", "WrongPin!", null, "203.0.113.99"));
        }

        // 6th attempt from attacker IP is locked even with any PIN
        assertThrows(BusinessException.class, () ->
                svc.authenticate("CC-AG-8942", OFFICER_PIN, null, "203.0.113.99"));
        verify(auditService).logAction("CC-AG-8942", "AG_P_LONGXUYEN", "LOGIN_LOCKED", "OFFICER", "CC-AG-8942", "203.0.113.99", null);

        // Real officer at UBND counter IP (10.0.0.15) is NOT locked out (prevents badgeId DoS)
        OfficerAuthService.LoginResponse counterLogin = svc.authenticate("CC-AG-8942", OFFICER_PIN, null, "10.0.0.15");
        assertNotNull(counterLogin.token());
    }

    @Test
    @SuppressWarnings("unchecked")
    void testRevokedTokenIds_isStrictlyBoundedAgainstMemoryGrowth() {
        Set<String> revokedSet = (Set<String>) ReflectionTestUtils.getField(officerAuthService, "revokedTokenIds");
        assertNotNull(revokedSet);
        for (int i = 0; i < 2000; i++) {
            revokedSet.add("pre-jti-" + i);
        }
        assertEquals(2000, revokedSet.size());

        OfficerAuthService.LoginResponse login = officerAuthService.authenticate("CC-AG-8942", OFFICER_PIN, null);
        officerAuthService.revokeToken("Bearer " + login.token());
        assertEquals(1, revokedSet.size(), "revokeToken must bound fallback revokedTokenIds set instead of growing unboundedly");
        assertThrows(BusinessException.class, () -> officerAuthService.verifyToken("Bearer " + login.token()));
    }

    @Test
    void testNimbusJwt_rejectsAlgNoneAndExpiredTokens() throws Exception {
        // Unsigned alg:none JWT attack
        String algNoneHeader = java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"none\",\"typ\":\"JWT\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String forgedPayload = java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"sub\":\"ADM-AG-0001\",\"role\":\"ADMIN\",\"jti\":\"forged-1\",\"exp\":4102444800}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String algNoneToken = algNoneHeader + "." + forgedPayload + ".";

        BusinessException algNoneEx = assertThrows(BusinessException.class, () ->
                officerAuthService.verifyToken("Bearer " + algNoneToken)
        );
        assertEquals(ErrorCode.UNAUTHORIZED, algNoneEx.getErrorCode());

        // Properly signed HS256 JWT that is already expired
        com.nimbusds.jose.JWSHeader hs256Header = new com.nimbusds.jose.JWSHeader.Builder(com.nimbusds.jose.JWSAlgorithm.HS256)
                .type(com.nimbusds.jose.JOSEObjectType.JWT)
                .build();
        com.nimbusds.jwt.JWTClaimsSet expiredClaims = new com.nimbusds.jwt.JWTClaimsSet.Builder()
                .subject("CC-AG-8942")
                .jwtID("expired-jti-1")
                .issueTime(java.util.Date.from(Instant.now().minusSeconds(7200)))
                .expirationTime(java.util.Date.from(Instant.now().minusSeconds(60)))
                .claim("name", "Trần Quốc Bảo")
                .claim("wardCode", "AG_P_LONGXUYEN")
                .claim("role", "OFFICER")
                .build();
        com.nimbusds.jwt.SignedJWT expiredJwt = new com.nimbusds.jwt.SignedJWT(hs256Header, expiredClaims);
        expiredJwt.sign(new com.nimbusds.jose.crypto.MACSigner(TEST_JWT_SECRET.getBytes(java.nio.charset.StandardCharsets.UTF_8)));

        BusinessException expiredEx = assertThrows(BusinessException.class, () ->
                officerAuthService.verifyToken("Bearer " + expiredJwt.serialize())
        );
        assertEquals(ErrorCode.UNAUTHORIZED, expiredEx.getErrorCode());
    }

    @Test
    @SuppressWarnings("unchecked")
    void testRedisBlacklist_failsClosedWhenRedisIsUnavailable() {
        StringRedisTemplate mockRedis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> mockOps = mock(ValueOperations.class);
        when(mockRedis.opsForValue()).thenReturn(mockOps);

        OfficerAuthService serviceWithRedis = new OfficerAuthService(new ObjectMapper(), mockRedis, officerRepository, null);
        ReflectionTestUtils.setField(serviceWithRedis, "jwtSecret", TEST_JWT_SECRET);
        ReflectionTestUtils.setField(serviceWithRedis, "tokenTtlHours", 8);

        OfficerAuthService.LoginResponse login = serviceWithRedis.authenticate("CC-AG-8942", OFFICER_PIN, null);

        // Simulate Redis outage during verifyToken -> MUST fail closed (503 STORAGE_UNAVAILABLE)
        when(mockRedis.hasKey(startsWith("smartward:auth:revoked:")))
                .thenThrow(new RuntimeException("Redis connection refused"));

        BusinessException verifyEx = assertThrows(BusinessException.class, () ->
                serviceWithRedis.verifyToken("Bearer " + login.token())
        );
        assertEquals(ErrorCode.STORAGE_UNAVAILABLE, verifyEx.getErrorCode());

        // Simulate Redis outage during revokeToken write -> MUST fail closed (503 STORAGE_UNAVAILABLE)
        reset(mockRedis);
        when(mockRedis.opsForValue()).thenReturn(mockOps);
        when(mockRedis.hasKey(startsWith("smartward:auth:revoked:"))).thenReturn(false);
        doThrow(new RuntimeException("Redis OOM / read-only"))
                .when(mockOps).set(startsWith("smartward:auth:revoked:"), eq("true"), any(Duration.class));

        BusinessException revokeEx = assertThrows(BusinessException.class, () ->
                serviceWithRedis.revokeToken("Bearer " + login.token())
        );
        assertEquals(ErrorCode.STORAGE_UNAVAILABLE, revokeEx.getErrorCode());
    }
}
