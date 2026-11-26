package vn.edu.uth.smartward.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.catalina.filters.RemoteIpFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.audit.AuditLogRepository;
import vn.edu.uth.smartward.audit.AuditService;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ClientIpResolver;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.dossier.CitizenDossierRepository;
import vn.edu.uth.smartward.dossier.DossierEventRepository;
import vn.edu.uth.smartward.formcheck.FormSubmissionRepository;
import vn.edu.uth.smartward.rag.AdminProcedure;
import vn.edu.uth.smartward.rag.AdminProcedureRepository;
import vn.edu.uth.smartward.rag.LegalChunkRepository;
import vn.edu.uth.smartward.rag.ProcedureDataSeeder;
import vn.edu.uth.smartward.rag.ProcedureVersionRepository;
import vn.edu.uth.smartward.triage.CivicReportRepository;
import vn.edu.uth.smartward.triage.IssueClusterRepository;
import vn.edu.uth.smartward.triage.TwoStageTriageService;
import vn.edu.uth.smartward.vault.VaultDocumentRepository;
import vn.edu.uth.smartward.ward.WardRegistryRepository;
import vn.edu.uth.smartward.notification.NotificationDeliveryLogRepository;
import vn.edu.uth.smartward.notification.NotificationDeviceTokenRepository;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
                "spring.autoconfigure.exclude="
                        + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
                        + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
                        + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration,"
                        + "org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration,"
                        + "org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration",
                "smartward.security.jwt-secret=sw_sec_8f9b4c2e1a7d6e3f5b0c9a8d7e6f5a4b_smoke_2026_auth",
                "smartward.vault.encryption-key=sw_vlt_3a7e9c1f5b8d2a6e0c4f7b9e1d3a5c7f_smoke_2026_enc",
                "smartward.bootstrap.init-admins=false",
                "SIDECAR_ENABLED=false"
        }
)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("P0 Emergency Smoke Test: Full @SpringBootTest Context, Non-Destructive Seeder, Bootstrap & Anti-Spoof")
class FullSpringContextSmokeTest {

    @Autowired
    private ApplicationContext context;

    @Autowired
    private Environment environment;

    @Autowired
    private MockMvc mockMvc;

    @MockBean private AuditLogRepository auditLogRepository;
    @MockBean private CitizenDossierRepository citizenDossierRepository;
    @MockBean private DossierEventRepository dossierEventRepository;
    @MockBean private FormSubmissionRepository formSubmissionRepository;
    @MockBean private AdminProcedureRepository adminProcedureRepository;
    @MockBean private LegalChunkRepository legalChunkRepository;
    @MockBean private ProcedureVersionRepository procedureVersionRepository;
    @MockBean private OfficerRepository officerRepository;
    @MockBean private CivicReportRepository civicReportRepository;
    @MockBean private IssueClusterRepository issueClusterRepository;
    @MockBean private VaultDocumentRepository vaultDocumentRepository;
    @MockBean private WardRegistryRepository wardRegistryRepository;
    @MockBean private NotificationDeviceTokenRepository notificationDeviceTokenRepository;
    @MockBean private NotificationDeliveryLogRepository notificationDeliveryLogRepository;
    @MockBean private StringRedisTemplate stringRedisTemplate;
    @MockBean private RedisConnectionFactory redisConnectionFactory;

    @Test
    @DisplayName("1. Full Spring ApplicationContext boots with TwoStageTriageService & public /api/v1/health responds 200 UP")
    void fullApplicationContextBootsCleanly() throws Exception {
        assertNotNull(context.getBean(TwoStageTriageService.class));
        assertNotNull(context.getBean(ProcedureDataSeeder.class));
        assertNotNull(context.getBean(OfficerAuthService.class));
        assertNotNull(context.getBean(AdminBootstrapRunner.class));
        assertNotNull(context.getBean(DevTestOfficerSeeder.class));
        assertNotNull(context.getBean(ClientIpResolver.class));

        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"));
    }

    @Test
    @DisplayName("2. Flyway out-of-order is strictly locked to false across environment and YAML configs")
    void flywayOutOfOrder_mustRemainDisabled() throws Exception {
        assertEquals("false", environment.getProperty("spring.flyway.out-of-order"));

        for (String relPath : List.of(
                "src/main/resources/application.yml",
                "src/main/resources/application-dev.yml",
                "src/main/resources/application-prod.yml")) {
            Path p = resolveBackendFile(relPath);
            String yml = Files.readString(p);
            assertTrue(yml.contains("out-of-order: false"),
                    relPath + " must explicitly enforce spring.flyway.out-of-order: false");
            assertFalse(yml.contains("out-of-order: true"),
                    relPath + " must NEVER enable out-of-order migrations");
        }
    }

    @Test
    @DisplayName("3. ProcedureDataSeeder is non-destructive (never deletes or overwrites existing procedures)")
    void procedureDataSeeder_neverOverwritesOrDeletesExistingProcedures() {
        AdminProcedureRepository mockProcRepo = mock(AdminProcedureRepository.class);
        LegalChunkRepository mockChunkRepo = mock(LegalChunkRepository.class);
        AiModelClient mockAi = mock(AiModelClient.class);

        when(mockProcRepo.existsByProcedureCode(anyString())).thenReturn(true);
        when(mockChunkRepo.findByEmbeddingIsNullOrEmbeddingModelNot(anyString())).thenReturn(List.of());

        ProcedureDataSeeder seeder = new ProcedureDataSeeder(mockProcRepo, mockChunkRepo, new ObjectMapper(), mockAi);
        seeder.run();

        verify(mockProcRepo, never()).delete(any(AdminProcedure.class));
        verify(mockProcRepo, never()).save(any(AdminProcedure.class));
        verify(mockChunkRepo, never()).save(any());
    }

    @Test
    @DisplayName("4. AdminBootstrapRunner rejects repo paths, enforces 24h expiry/renewal, skips completed admins, and deletes file after PIN change")
    void adminBootstrapRunner_enforcesExternalSecretFileAnd24hLifecycle(@TempDir Path externalTempDir) throws Exception {
        Path insideRepo = resolveBackendFile("bootstrap-leak-test.txt");
        BusinessException repoPathEx = assertThrows(BusinessException.class, () ->
                AdminBootstrapRunner.validateSecretFilePath(insideRepo.toString()));
        assertEquals(ErrorCode.FORBIDDEN, repoPathEx.getErrorCode());

        Map<String, Officer> store = new ConcurrentHashMap<>();
        OfficerRepository mockRepo = mock(OfficerRepository.class);
        when(mockRepo.findByBadgeIdIgnoreCase(anyString())).thenAnswer(inv ->
                Optional.ofNullable(store.get(inv.<String>getArgument(0).trim().toUpperCase())));
        when(mockRepo.save(any(Officer.class))).thenAnswer(inv -> {
            Officer o = inv.getArgument(0);
            store.put(o.getBadgeId().toUpperCase(), o);
            return o;
        });
        when(mockRepo.existsByRoleIgnoreCaseAndActiveTrueAndMustChangePinTrue(anyString())).thenAnswer(inv -> {
            String role = inv.getArgument(0);
            return store.values().stream().anyMatch(o ->
                    role.equalsIgnoreCase(o.getRole())
                            && Boolean.TRUE.equals(o.getActive())
                            && Boolean.TRUE.equals(o.getMustChangePin()));
        });

        // Pre-seed revoked legacy hashes from V6/V10 to simulate upgrade from compromised state
        store.put("ADM-AG-0001", Officer.builder()
                .badgeId("ADM-AG-0001").fullName("Admin 1").wardCode("AG_PROVINCE").role("ADMIN")
                .passwordHash(OfficerAuthService.REVOKED_SEED_MARKER).mustChangePin(true).active(true).build());
        store.put("ADM-AG-0002", Officer.builder()
                .badgeId("ADM-AG-0002").fullName("Admin 2").wardCode("AG_PROVINCE").role("ADMIN")
                .passwordHash(OfficerAuthService.REVOKED_SEED_MARKER).mustChangePin(true).active(true).build());

        Path secretFile = externalTempDir.resolve("admin_bootstrap_pins.secret");
        OfficerAuthService authService = new OfficerAuthService(new ObjectMapper(), null, mockRepo, mock(AuditService.class));
        ReflectionTestUtils.setField(authService, "jwtSecret", "sw_sec_8f9b4c2e1a7d6e3f5b0c9a8d7e6f5a4b_smoke_2026_auth");
        ReflectionTestUtils.setField(authService, "tokenTtlHours", 8);
        ReflectionTestUtils.setField(authService, "bootstrapSecretFile", secretFile.toString());

        AdminBootstrapRunner runner = new AdminBootstrapRunner(mockRepo, authService, mock(AuditService.class));
        ReflectionTestUtils.setField(runner, "initAdmins", true);
        ReflectionTestUtils.setField(runner, "secretFilePath", secretFile.toString());

        List<String> issued = runner.executeBootstrap();
        assertEquals(List.of("ADM-AG-0001", "ADM-AG-0002"), issued);
        assertTrue(Files.exists(secretFile));

        List<String> lines = Files.readAllLines(secretFile);
        String pin1 = extractPin(lines, "ADM-AG-0001");
        String pin2 = extractPin(lines, "ADM-AG-0002");
        assertEquals(16, pin1.length());
        assertEquals(16, pin2.length());

        // Simulate 24h expiration for ADM-AG-0001 -> login rejected -> renewal succeeds
        store.get("ADM-AG-0001").setPinExpiresAt(Instant.now().minus(Duration.ofMinutes(5)));
        assertEquals(ErrorCode.UNAUTHORIZED, assertThrows(BusinessException.class, () ->
                authService.authenticate("ADM-AG-0001", pin1, null)).getErrorCode());

        List<String> renewed = runner.executeBootstrap();
        assertEquals(List.of("ADM-AG-0001"), renewed, "Only expired pending admin should be renewed");
        String renewedPin1 = extractPin(Files.readAllLines(secretFile), "ADM-AG-0001");
        assertNotEquals(pin1, renewedPin1);

        // Admin 1 and Admin 2 change PIN -> mustChangePin=false -> secret file deleted -> re-run skips
        authService.changePin("ADM-AG-0001", renewedPin1, "Admin1StrongPin2026!", "Admin1StrongPin2026!", null);
        assertTrue(Files.exists(secretFile), "Secret file remains until ALL pending bootstrapped admins finish PIN change");

        authService.changePin("ADM-AG-0002", pin2, "Admin2StrongPin2026!", "Admin2StrongPin2026!", null);
        assertFalse(Files.exists(secretFile), "Secret file must be removed once all admins change initial PINs");

        assertTrue(runner.executeBootstrap().isEmpty(), "Bootstrap must never overwrite completed admins");
    }

    @Test
    @DisplayName("5. Real client IP anti-spoofing verified for Docker Nginx, Render Edge, and direct untrusted peer")
    void clientIpResolution_blocksSpoofedForwardedHeadersAcrossAllPaths() throws Exception {
        // Path 1: Docker Compose Nginx container (172.28.0.5) inside internal-proxies passes X-Forwarded-For=$remote_addr
        RemoteIpFilter remoteIpFilter = new RemoteIpFilter();
        remoteIpFilter.setInternalProxies("127\\.0\\.0\\.1|0:0:0:0:0:0:0:1|172\\.28\\.0\\.\\d+");

        ClientIpResolver dockerResolver = new ClientIpResolver(false);
        MockHttpServletRequest dockerReq = new MockHttpServletRequest("POST", "/api/v1/dossiers/track");
        dockerReq.setRemoteAddr("172.28.0.5");
        dockerReq.addHeader("X-Forwarded-For", "198.51.100.55");
        AtomicReference<String> resolvedDockerIp = new AtomicReference<>();
        FilterChain dockerChain = (req, res) -> resolvedDockerIp.set(dockerResolver.resolve((HttpServletRequest) req));
        remoteIpFilter.doFilter(dockerReq, new MockHttpServletResponse(), dockerChain);
        assertEquals("198.51.100.55", resolvedDockerIp.get());

        // Path 2: Render Edge ingress hop (100.64.10.9) sets True-Client-IP while attacker prepended spoofed X-Forwarded-For
        ClientIpResolver renderResolver = new ClientIpResolver(true);
        MockHttpServletRequest renderReq = new MockHttpServletRequest("POST", "/api/v1/vault/upload");
        renderReq.setRemoteAddr("100.64.10.9");
        renderReq.addHeader("X-Forwarded-For", "203.0.113.99, 198.51.100.42");
        renderReq.addHeader("True-Client-IP", "198.51.100.42");
        assertEquals("198.51.100.42", renderResolver.resolve(renderReq));

        // Path 3: Direct connection from untrusted public IP (198.51.100.77) spoofing X-Forwarded-For & True-Client-IP
        MockHttpServletRequest directSpoofReq = new MockHttpServletRequest("POST", "/api/v1/dossiers/track");
        directSpoofReq.setRemoteAddr("198.51.100.77");
        directSpoofReq.addHeader("X-Forwarded-For", "203.0.113.99");
        directSpoofReq.addHeader("True-Client-IP", "203.0.113.99");

        AtomicReference<String> resolvedDirectDocker = new AtomicReference<>();
        remoteIpFilter.doFilter(directSpoofReq, new MockHttpServletResponse(),
                (req, res) -> resolvedDirectDocker.set(dockerResolver.resolve((HttpServletRequest) req)));
        assertEquals("198.51.100.77", resolvedDirectDocker.get());
        assertEquals("198.51.100.77", renderResolver.resolve(directSpoofReq));
    }

    @Test
    @DisplayName("6. Repo source hygiene: zero hardcoded personal emails or offline mock tokens")
    void repositorySource_containsNoPersonalEmailOrOfflineMockToken() throws Exception {
        for (String rel : List.of(
                "backend/src/main/java/vn/edu/uth/smartward/config/OpenApiConfig.java",
                "backend/src/main/java/vn/edu/uth/smartward/security/OfficerAuthService.java",
                "frontend/src/context/RoleContext.tsx",
                "frontend/src/api/modules/http.ts",
                "frontend/src/pages/FormAndIssueReporting.tsx",
                "frontend/src/pages/PerWardDashboard.tsx",
                "frontend/src/features/officer-dashboard/OfficerDashboardDrawers.tsx",
                "frontend/scripts/test_dossier_submission_integrity.mjs")) {
            Path path = resolveRepoFile(rel);
            String src = Files.readString(path);
            assertFalse(src.contains("khanhblue06@gmail.com"), rel + " must not contain hardcoded personal email");
            assertFalse(src.contains("sig_offline_verified"), rel + " must not contain fake offline JWT signature");
            assertFalse(src.contains("verifyOfficerCredentials"), rel + " must not contain offline frontend credential check");
            assertFalse(src.contains("AUTHORIZED_OFFICERS"), rel + " must not contain hardcoded officer map");
        }
    }

    private String extractPin(List<String> lines, String badgeId) {
        return lines.stream()
                .filter(l -> l.startsWith(badgeId + "="))
                .map(l -> l.substring(badgeId.length() + 1).trim())
                .findFirst()
                .orElseThrow(() -> new AssertionError("Missing PIN for " + badgeId));
    }

    private Path resolveBackendFile(String rel) {
        Path direct = Path.of(rel);
        if (Files.exists(direct) || rel.equals("bootstrap-leak-test.txt")) {
            return direct.toAbsolutePath().normalize();
        }
        return Path.of("backend").resolve(rel).toAbsolutePath().normalize();
    }

    private Path resolveRepoFile(String rel) {
        Path direct = Path.of(rel);
        if (Files.exists(direct)) {
            return direct.toAbsolutePath().normalize();
        }
        Path parent = Path.of("..").resolve(rel);
        if (Files.exists(parent)) {
            return parent.toAbsolutePath().normalize();
        }
        throw new AssertionError("Could not locate repo file: " + rel);
    }
}
