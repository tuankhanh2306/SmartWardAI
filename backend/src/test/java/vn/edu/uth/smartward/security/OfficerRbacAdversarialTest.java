package vn.edu.uth.smartward.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.yaml.snakeyaml.Yaml;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.common.GlobalExceptionHandler;
import vn.edu.uth.smartward.dossier.*;
import vn.edu.uth.smartward.dossier.dto.*;
import vn.edu.uth.smartward.rag.dto.HitlGrayZoneItemDto;
import vn.edu.uth.smartward.rag.dto.HitlResolveRequest;
import vn.edu.uth.smartward.rag.RagController;
import vn.edu.uth.smartward.rag.RagQueryService;
import vn.edu.uth.smartward.vault.ZeroTrustVaultService;

import java.io.File;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Milestone 4 Adversarial Verification — F12 RBAC Security & F13 Technical Compliance")
class OfficerRbacAdversarialTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private OfficerAuthService officerAuthService;

    @Mock
    private CitizenDossierService dossierService;

    @Mock
    private RagQueryService ragQueryService;

    private static final String TEST_JWT_SECRET = "SmartWardAI_UnitTest_JwtSecret_32B_Key_Strict_Security!";
    private static final String TEST_OFFICER_PIN = "OfficerRbac2026!";
    private String validOfficerToken;
    private OfficerRepository mockOfficerRepo;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockOfficerRepo = mock(OfficerRepository.class);
        String hashedPin = new BCryptPasswordEncoder(4).encode(TEST_OFFICER_PIN);
        Officer testOfficer = Officer.builder()
                .badgeId("CC-AG-8942")
                .fullName("Trần Quốc Bảo — Cán bộ Tư pháp - Hộ tịch")
                .wardCode("AG_P_LONGXUYEN")
                .role("OFFICER")
                .passwordHash(hashedPin)
                .mustChangePin(false)
                .active(true)
                .build();
        Officer pendingPinOfficer = Officer.builder()
                .badgeId("CC-AG-PENDING")
                .fullName("Cán bộ Chưa Đổi PIN")
                .wardCode("AG_P_LONGXUYEN")
                .role("OFFICER")
                .passwordHash(hashedPin)
                .mustChangePin(true)
                .active(true)
                .build();
        lenient().when(mockOfficerRepo.findByBadgeIdIgnoreCase("CC-AG-8942")).thenReturn(Optional.of(testOfficer));
        lenient().when(mockOfficerRepo.findByBadgeIdIgnoreCase("CC-AG-PENDING")).thenReturn(Optional.of(pendingPinOfficer));

        officerAuthService = new OfficerAuthService(objectMapper, null, mockOfficerRepo, null);
        ReflectionTestUtils.setField(officerAuthService, "jwtSecret", TEST_JWT_SECRET);
        ReflectionTestUtils.setField(officerAuthService, "tokenTtlHours", 8);

        CitizenDossierController dossierController = new CitizenDossierController(dossierService);
        RagController ragController = new RagController(ragQueryService);
        OfficerAuthController authController = new OfficerAuthController(officerAuthService);

        OfficerAuthInterceptor interceptor = new OfficerAuthInterceptor(officerAuthService, true);

        mockMvc = MockMvcBuilders.standaloneSetup(dossierController, ragController, authController)
                .addInterceptors(interceptor)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        OfficerAuthService.LoginResponse login = officerAuthService.authenticate("CC-AG-8942", TEST_OFFICER_PIN, "WARD-AG-01");
        validOfficerToken = "Bearer " + login.token();
    }

    // =========================================================================
    // SECTION 1: F12 RBAC & HITL Queue Protected Endpoints
    // =========================================================================
    @Nested
    @DisplayName("F12: Officer Protected Endpoints — Rejection when unauthenticated / invalid")
    class ProtectedEndpointsChallenge {

        @Test
        @DisplayName("GET /api/v1/dossiers/officer/list without token -> 401 UNAUTHORIZED")
        void getOfficerDossiers_withoutToken_shouldReturn401() throws Exception {
            mockMvc.perform(get("/api/v1/dossiers/officer/list")
                            .param("wardCode", "WARD-AG-01")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.errorCode").value("SW_401"));
        }

        @Test
        @DisplayName("GET /api/v1/dossiers/officer/list with malformed/tampered token -> 401 UNAUTHORIZED")
        void getOfficerDossiers_withTamperedToken_shouldReturn401() throws Exception {
            String tamperedToken = validOfficerToken + "corrupted_sig";
            mockMvc.perform(get("/api/v1/dossiers/officer/list")
                            .header("Authorization", tamperedToken)
                            .param("wardCode", "WARD-AG-01")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.errorCode").value("SW_401"));
        }

        @Test
        @DisplayName("PUT /api/v1/dossiers/{code}/review without token -> 401 UNAUTHORIZED")
        void reviewDossier_withoutToken_shouldReturn401() throws Exception {
            OfficerReviewRequest req = OfficerReviewRequest.builder()
                    .status("APPROVED")
                    .officerFeedback("Hồ sơ hợp lệ")
                    .build();

            mockMvc.perform(put("/api/v1/dossiers/HS-20261111-BENNGHE-0001/review")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.errorCode").value("SW_401"));
        }

        @Test
        @DisplayName("PUT /api/v1/dossiers/{code}/review with empty Bearer -> 401 UNAUTHORIZED")
        void reviewDossier_withEmptyBearer_shouldReturn401() throws Exception {
            OfficerReviewRequest req = OfficerReviewRequest.builder()
                    .status("APPROVED")
                    .officerFeedback("Hồ sơ hợp lệ")
                    .build();

            mockMvc.perform(put("/api/v1/dossiers/HS-20261111-BENNGHE-0001/review")
                            .header("Authorization", "Bearer ")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.errorCode").value("SW_401"));
        }

        @Test
        @DisplayName("GET /api/v1/rag/hitl-queue without token -> 401 UNAUTHORIZED")
        void getHitlQueue_withoutToken_shouldReturn401() throws Exception {
            mockMvc.perform(get("/api/v1/rag/hitl-queue")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.errorCode").value("SW_401"));
        }

        @Test
        @DisplayName("POST /api/v1/rag/hitl-queue/{id}/resolve without token -> 401 UNAUTHORIZED")
        void resolveHitl_withoutToken_shouldReturn401() throws Exception {
            HitlResolveRequest req = new HitlResolveRequest("Câu trả lời chính thức đã duyệt", "Trần Quốc Bảo");

            mockMvc.perform(post("/api/v1/rag/hitl-queue/HITL-AG-001/resolve")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.errorCode").value("SW_401"));
        }

        @Test
        @DisplayName("Protected endpoints with valid token -> 200 OK")
        void protectedEndpoints_withValidToken_shouldSucceed() throws Exception {
            // Dossier officer list: SEC-09 authorizes officer's own ward (AG_P_LONGXUYEN) -> 200 OK
            when(dossierService.getOfficerDossiers(eq("AG_P_LONGXUYEN"), any()))
                    .thenReturn(List.of(OfficerDossierDto.builder()
                            .id(1L)
                            .dossierCode("HS-20261111-BENNGHE-0001")
                            .procedureCode("TTHC-CT-01")
                            .procedureName("Đăng ký thường trú")
                            .wardCode("AG_P_LONGXUYEN")
                            .citizenCccd("089095012345")
                            .citizenName("NGUYEN VAN A")
                            .status("PENDING")
                            .build()));

            mockMvc.perform(get("/api/v1/dossiers/officer/list")
                            .header("Authorization", validOfficerToken)
                            .param("wardCode", "AG_P_LONGXUYEN")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data[0].dossierCode").value("HS-20261111-BENNGHE-0001"));

            // SEC-09: Cross-ward query by Officer of AG_P_LONGXUYEN for WARD-AG-01 must be blocked with 403 FORBIDDEN
            mockMvc.perform(get("/api/v1/dossiers/officer/list")
                            .header("Authorization", validOfficerToken)
                            .param("wardCode", "WARD-AG-01")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false));

            // Dossier review
            CitizenDossier mockEntity = CitizenDossier.builder()
                    .id(1L)
                    .dossierCode("HS-20261111-BENNGHE-0001")
                    .procedureCode("TTHC-CT-01")
                    .wardCode("WARD-AG-01")
                    .citizenCccd("089095012345")
                    .status("APPROVED")
                    .build();

            OfficerDossierDto mappedDto = OfficerDossierDto.builder()
                    .id(1L)
                    .dossierCode("HS-20261111-BENNGHE-0001")
                    .procedureCode("TTHC-CT-01")
                    .wardCode("WARD-AG-01")
                    .citizenCccd("089095012345")
                    .status("APPROVED")
                    .build();

            when(dossierService.reviewDossier(eq("HS-20261111-BENNGHE-0001"), any(), any()))
                    .thenReturn(mockEntity);
            when(dossierService.mapToOfficerDto(any())).thenReturn(mappedDto);

            OfficerReviewRequest revReq = OfficerReviewRequest.builder()
                    .status("APPROVED")
                    .officerFeedback("Hồ sơ hợp lệ")
                    .build();

            mockMvc.perform(put("/api/v1/dossiers/HS-20261111-BENNGHE-0001/review")
                            .header("Authorization", validOfficerToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(revReq)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("APPROVED"));

            // HITL queue
            when(ragQueryService.getHitlQueue()).thenReturn(List.of(
                    HitlGrayZoneItemDto.builder()
                            .id("HITL-AG-001")
                            .query("Câu hỏi vùng xám")
                            .similarityScore(0.65)
                            .status("PENDING")
                            .build()
            ));

            mockMvc.perform(get("/api/v1/rag/hitl-queue")
                            .header("Authorization", validOfficerToken)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data[0].id").value("HITL-AG-001"));
        }

        @Test
        @DisplayName("Revoked token after logout -> subsequent request returns 401 UNAUTHORIZED")
        void revokedToken_subsequentRequest_shouldReturn401() throws Exception {
            // Revoke token
            officerAuthService.revokeToken(validOfficerToken);

            mockMvc.perform(get("/api/v1/dossiers/officer/list")
                            .header("Authorization", validOfficerToken)
                            .param("wardCode", "WARD-AG-01")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.errorCode").value("SW_401"));
        }
    }

    // =========================================================================
    // SECTION 2: Public Endpoints Accessibility (No Bearer token required)
    // =========================================================================
    @Nested
    @DisplayName("F12: Public Endpoints — Accessible without Authorization header")
    class PublicEndpointsVerification {

        @Test
        @DisplayName("POST /api/v1/dossiers (Public submit) without Bearer -> NOT rejected by RBAC (201 Created)")
        void submitDossier_public_shouldReturn201() throws Exception {
            DossierSubmissionResponse res = DossierSubmissionResponse.builder()
                    .dossierCode("HS-20261111-BENNGHE-0001")
                    .procedureCode("TTHC-CT-01")
                    .wardCode("WARD-AG-01")
                    .status("PENDING")
                    .slaDeadline(Instant.now().plusSeconds(86400 * 3))
                    .createdAt(Instant.now())
                    .build();

            when(dossierService.submitDossier(any(SubmitDossierRequest.class))).thenReturn(res);

            SubmitDossierRequest req = SubmitDossierRequest.builder()
                    .procedureCode("TTHC-CT-01")
                    .wardCode("WARD-AG-01")
                    .citizenCccd("089095012345")
                    .formData(Map.of("fullName", "NGUYEN VAN A"))
                    .build();

            mockMvc.perform(post("/api/v1/dossiers")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.dossierCode").value("HS-20261111-BENNGHE-0001"));
        }

        @Test
        @DisplayName("GET /api/v1/dossiers/track is REMOVED (not 200), while POST /api/v1/dossiers/track returns 200 OK")
        void trackDossier_getRemoved_postReturns200() throws Exception {
            mockMvc.perform(get("/api/v1/dossiers/track")
                            .param("dossierCode", "HS-20261111-BENNGHE-0001")
                            .param("last4Cccd", "2345")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().is4xxClientError());

            DossierTrackingResponse res = DossierTrackingResponse.builder()
                    .dossierCode("HS-20261111-BENNGHE-0001")
                    .procedureCode("TTHC-HT-01")
                    .procedureName("Đăng ký khai sinh")
                    .wardCode("WARD-AG-01")
                    .citizenCccd("********2345")
                    .status("PENDING")
                    .slaDeadline(Instant.now().plusSeconds(86400 * 3))
                    .build();

            when(dossierService.trackDossier(eq("HS-20261111-BENNGHE-0001"), eq("2345"), any()))
                    .thenReturn(res);

            mockMvc.perform(post("/api/v1/dossiers/track")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"dossierCode\":\"HS-20261111-BENNGHE-0001\",\"last4Cccd\":\"2345\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.dossierCode").value("HS-20261111-BENNGHE-0001"));
        }

        @Test
        @DisplayName("Token with mustChangePin=true is blocked (403) on officer business routes via OfficerAuthInterceptor")
        void mustChangePinOfficer_blockedFromBusinessRoutes() throws Exception {
            OfficerAuthService.LoginResponse pendingLogin =
                    officerAuthService.authenticate("CC-AG-PENDING", TEST_OFFICER_PIN, null);
            assertTrue(pendingLogin.mustChangePin());

            mockMvc.perform(get("/api/v1/dossiers/officer/list")
                            .header("Authorization", "Bearer " + pendingLogin.token()))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("SW_403_MUST_CHANGE_PIN")));
        }

        @Test
        @DisplayName("POST /api/v1/officer/login without Bearer -> NOT rejected by RBAC (200 OK)")
        void officerLogin_public_shouldReturn200() throws Exception {
            OfficerAuthController.OfficerLoginRequest req =
                    new OfficerAuthController.OfficerLoginRequest("CC-AG-8942", TEST_OFFICER_PIN, "WARD-AG-01");

            mockMvc.perform(post("/api/v1/officer/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.badgeId").value("CC-AG-8942"))
                    .andExpect(jsonPath("$.data.token").isNotEmpty());
        }

        @Test
        @DisplayName("POST /api/v1/auth/officer/login alias without Bearer -> NOT rejected by RBAC (200 OK)")
        void officerLoginAlias_public_shouldReturn200() throws Exception {
            OfficerAuthController.OfficerLoginRequest req =
                    new OfficerAuthController.OfficerLoginRequest("CC-AG-8942", TEST_OFFICER_PIN, "WARD-AG-01");

            mockMvc.perform(post("/api/v1/auth/officer/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.badgeId").value("CC-AG-8942"));
        }
    }

    // =========================================================================
    // SECTION 3: F13 Technical Compliance Verifications
    // =========================================================================
    @Nested
    @DisplayName("F13: Technical Compliance — RAM limit, key lengths, RAG thresholds")
    class TechnicalComplianceVerification {

        @Test
        @DisplayName("Docker Compose: 6 containers total RAM mem_limit <= 2048 MiB")
        void dockerCompose_memoryBudgetCompliance() throws Exception {
            File dockerComposeFile = new File("../docker-compose.yml");
            if (!dockerComposeFile.exists()) {
                dockerComposeFile = new File("docker-compose.yml");
            }
            assertTrue(dockerComposeFile.exists(), "docker-compose.yml file must exist at project root");

            Yaml yaml = new Yaml();
            Map<String, Object> compose;
            try (FileInputStream fis = new FileInputStream(dockerComposeFile)) {
                compose = yaml.load(fis);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> services = (Map<String, Object>) compose.get("services");
            assertNotNull(services, "docker-compose.yml must have 'services' section");

            List<String> expectedContainers = List.of("postgres", "redis", "minio", "ai-sidecar", "backend", "frontend");
            int totalMib = 0;

            for (String containerName : expectedContainers) {
                @SuppressWarnings("unchecked")
                Map<String, Object> svc = (Map<String, Object>) services.get(containerName);
                assertNotNull(svc, "Container '" + containerName + "' must be defined in docker-compose.yml");

                Object memLimitObj = svc.get("mem_limit");
                assertNotNull(memLimitObj, "Container '" + containerName + "' must define 'mem_limit'");

                String memLimitStr = memLimitObj.toString().trim().toLowerCase();
                int mib;
                if (memLimitStr.endsWith("m") || memLimitStr.endsWith("mib")) {
                    mib = Integer.parseInt(memLimitStr.replaceAll("[^0-9]", ""));
                } else if (memLimitStr.endsWith("g") || memLimitStr.endsWith("gib")) {
                    mib = Integer.parseInt(memLimitStr.replaceAll("[^0-9]", "")) * 1024;
                } else {
                    fail("Unrecognized mem_limit format for " + containerName + ": " + memLimitStr);
                    return;
                }

                totalMib += mib;
            }

            assertEquals(2048, totalMib, "Total active RAM across the 6 containers must equal exactly 2048 MiB");
            assertTrue(totalMib <= 2048, "Total active RAM budget must be <= 2048 MiB");
        }

        @Test
        @DisplayName("Security Secret: JWT_SECRET requires >= 32 bytes (256-bit)")
        void jwtSecretLengthEnforcement() {
            // Key < 32 bytes MUST throw BusinessException
            OfficerAuthService serviceShortKey = new OfficerAuthService(new ObjectMapper(), null, mockOfficerRepo, null);
            ReflectionTestUtils.setField(serviceShortKey, "jwtSecret", "short_key_under_32_bytes!");

            BusinessException ex = assertThrows(BusinessException.class, () ->
                    serviceShortKey.authenticate("CC-AG-8942", TEST_OFFICER_PIN, "WARD-AG-01")
            );
            assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, ex.getErrorCode());
            assertTrue(ex.getMessage().contains("32 bytes"), "Error message must indicate 32 bytes requirement");

            // Key >= 32 bytes MUST succeed
            OfficerAuthService serviceValidKey = new OfficerAuthService(new ObjectMapper(), null, mockOfficerRepo, null);
            ReflectionTestUtils.setField(serviceValidKey, "jwtSecret", "SmartWardAI_ValidKey_32BytesMin!");
            assertDoesNotThrow(() ->
                    serviceValidKey.authenticate("CC-AG-8942", TEST_OFFICER_PIN, "WARD-AG-01")
            );
        }

        @Test
        @DisplayName("Security Secret: VAULT_ENCRYPTION_KEY requires >= 32 bytes (256-bit AES-GCM)")
        void vaultEncryptionKeyLengthEnforcement() {
            ZeroTrustVaultService vaultService = new ZeroTrustVaultService(null, null, null, null);

            // Key < 32 bytes MUST throw BusinessException
            ReflectionTestUtils.setField(vaultService, "rawEncryptionKey", "short_vault_key_16b!");
            BusinessException ex = assertThrows(BusinessException.class, () ->
                    ReflectionTestUtils.invokeMethod(vaultService, "getSecretKey")
            );
            assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, ex.getErrorCode());
            assertTrue(ex.getMessage().contains("32 bytes"), "Error message must indicate 32 bytes requirement for AES-256-GCM");

            // Key >= 32 bytes MUST succeed and produce 32-byte AES key
            ReflectionTestUtils.setField(vaultService, "rawEncryptionKey", "SmartWardAI_VaultKey_32BytesMin!");
            javax.crypto.SecretKey key = ReflectionTestUtils.invokeMethod(vaultService, "getSecretKey");
            assertNotNull(key);
            assertEquals("AES", key.getAlgorithm());
            assertEquals(32, key.getEncoded().length, "AES-256 key must be exactly 32 bytes");
        }

        @Test
        @DisplayName("RAG Abstention Guardrails: theta = 0.78 and theta_lower = 0.42 annotations & defaults")
        void ragThresholdDefaultsCompliance() throws Exception {
            // 1. Verify @Value annotations in RagQueryService
            org.springframework.beans.factory.annotation.Value valTheta =
                    RagQueryService.class.getDeclaredField("defaultThreshold")
                            .getAnnotation(org.springframework.beans.factory.annotation.Value.class);
            assertNotNull(valTheta, "defaultThreshold must be annotated with @Value");
            assertTrue(valTheta.value().contains("0.78"), "@Value for defaultThreshold must contain default 0.78");

            org.springframework.beans.factory.annotation.Value valThetaLower =
                    RagQueryService.class.getDeclaredField("defaultThetaLower")
                            .getAnnotation(org.springframework.beans.factory.annotation.Value.class);
            assertNotNull(valThetaLower, "defaultThetaLower must be annotated with @Value");
            assertTrue(valThetaLower.value().contains("0.42"), "@Value for defaultThetaLower must contain default 0.42");

            // 2. Verify RagAskRequest default similarityThreshold
            vn.edu.uth.smartward.rag.dto.RagAskRequest req = new vn.edu.uth.smartward.rag.dto.RagAskRequest();
            assertEquals(0.78, req.getSimilarityThreshold(), 0.0001, "RagAskRequest default threshold must be 0.78");

            // 3. Verify application.yml configuration
            File appYmlFile = new File("src/main/resources/application.yml");
            if (!appYmlFile.exists()) {
                appYmlFile = new File("backend/src/main/resources/application.yml");
            }
            assertTrue(appYmlFile.exists(), "application.yml must exist");
            Yaml yaml = new Yaml();
            Map<String, Object> ymlMap;
            try (FileInputStream fis = new FileInputStream(appYmlFile)) {
                ymlMap = yaml.load(fis);
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> smartward = (Map<String, Object>) ymlMap.get("smartward");
            @SuppressWarnings("unchecked")
            Map<String, Object> rag = (Map<String, Object>) smartward.get("rag");
            String defaultThresholdCfg = String.valueOf(rag.get("default-threshold"));
            String thetaLowerCfg = String.valueOf(rag.get("theta-lower"));
            assertTrue(defaultThresholdCfg.contains("0.78"), "smartward.rag.default-threshold must configure 0.78");
            assertTrue(thetaLowerCfg.contains("0.42"), "smartward.rag.theta-lower must configure 0.42");
        }
    }
}
