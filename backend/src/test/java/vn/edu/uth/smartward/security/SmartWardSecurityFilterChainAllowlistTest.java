package vn.edu.uth.smartward.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.uth.smartward.common.ClientIpResolver;
import vn.edu.uth.smartward.common.GlobalExceptionHandler;
import vn.edu.uth.smartward.common.HealthController;
import vn.edu.uth.smartward.common.RedisRateLimiter;
import vn.edu.uth.smartward.common.RootController;
import vn.edu.uth.smartward.dossier.CitizenDossierController;
import vn.edu.uth.smartward.dossier.CitizenDossierService;
import vn.edu.uth.smartward.evaluation.EvaluationController;
import vn.edu.uth.smartward.evaluation.ExperimentRunnerService;
import vn.edu.uth.smartward.evaluation.dto.FullBenchmarkReport;
import vn.edu.uth.smartward.formcheck.FormCheckController;
import vn.edu.uth.smartward.formcheck.FormPrecheckService;
import vn.edu.uth.smartward.rag.AdminProcedureGovernanceController;
import vn.edu.uth.smartward.rag.ProcedureController;
import vn.edu.uth.smartward.rag.ProcedureGovernanceService;
import vn.edu.uth.smartward.rag.ProcedureService;
import vn.edu.uth.smartward.rag.RagController;
import vn.edu.uth.smartward.rag.RagQueryService;
import vn.edu.uth.smartward.rag.dto.AdminWardOverviewDto;
import vn.edu.uth.smartward.rag.dto.ProposalDecisionRequest;
import vn.edu.uth.smartward.triage.TriageController;
import vn.edu.uth.smartward.triage.TwoStageTriageService;
import vn.edu.uth.smartward.vault.VaultController;
import vn.edu.uth.smartward.vault.ZeroTrustVaultService;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {
        RootController.class,
        HealthController.class,
        OfficerAuthController.class,
        ProcedureController.class,
        AdminProcedureGovernanceController.class,
        CitizenDossierController.class,
        RagController.class,
        TriageController.class,
        FormCheckController.class,
        VaultController.class,
        EvaluationController.class
})
@Import({
        CorrelationIdFilter.class,
        OfficerSecurityConfig.class,
        OfficerTokenAuthenticationFilter.class,
        OfficerAuthService.class,
        ClientIpResolver.class,
        GlobalExceptionHandler.class
})
@ActiveProfiles({"test", "eval"})
@TestPropertySource(properties = {
        "smartward.security.jwt-secret=SmartWardAI_UnitTest_JwtSecret_32B_Key_Strict_Security!",
        "smartward.security.token-ttl-hours=8",
        "smartward.cors.allowed-origins=http://localhost:3000"
})
@DisplayName("SEC-02 & SEC-03: Spring Security Allowlist Filter Chain & Surface Reduction Verification")
class SmartWardSecurityFilterChainAllowlistTest {

    private static final String OFFICER_PASS = "OfficerTestPass2026!";
    private static final String ADMIN_PASS = "AdminTestPass2026!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OfficerAuthService officerAuthService;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OfficerRepository officerRepository;

    @MockBean
    private RedisRateLimiter redisRateLimiter;

    @MockBean
    private RagQueryService ragQueryService;

    @MockBean
    private ProcedureService procedureService;

    @MockBean
    private TwoStageTriageService triageService;

    @MockBean
    private CitizenDossierService dossierService;

    @MockBean
    private FormPrecheckService formPrecheckService;

    @MockBean
    private ZeroTrustVaultService vaultService;

    @MockBean
    private ExperimentRunnerService experimentRunnerService;

    @MockBean
    private ProcedureGovernanceService procedureGovernanceService;

    private String officerBearerToken;
    private String adminBearerToken;
    private String pendingPinBearerToken;

    @BeforeEach
    void setUp() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
        String officerHash = encoder.encode(OFFICER_PASS);
        String adminHash = encoder.encode(ADMIN_PASS);

        Officer officer1 = Officer.builder()
                .badgeId("CC-AG-8942").fullName("Trần Quốc Bảo").wardCode("AG_P_LONGXUYEN")
                .role("OFFICER").passwordHash(officerHash).mustChangePin(false).active(true).build();
        Officer officer2 = Officer.builder()
                .badgeId("CC-AG-1001").fullName("Nguyễn Thị Minh Khai").wardCode("AG_P_LONGXUYEN")
                .role("OFFICER").passwordHash(officerHash).mustChangePin(false).active(true).build();
        Officer officerPending = Officer.builder()
                .badgeId("CB-NEW-0001").fullName("Cán bộ Chưa Đổi PIN").wardCode("AG_P_LONGXUYEN")
                .role("OFFICER").passwordHash(officerHash).mustChangePin(true).active(true).build();
        Officer admin1 = Officer.builder()
                .badgeId("ADM-AG-0001").fullName("Lê Văn Quản Trị").wardCode("AG_PROVINCE")
                .role("ADMIN").passwordHash(adminHash).mustChangePin(false).active(true).build();

        when(officerRepository.findByBadgeIdIgnoreCase("CC-AG-8942")).thenReturn(Optional.of(officer1));
        when(officerRepository.findByBadgeIdIgnoreCase("CC-AG-1001")).thenReturn(Optional.of(officer2));
        when(officerRepository.findByBadgeIdIgnoreCase("CB-NEW-0001")).thenReturn(Optional.of(officerPending));
        when(officerRepository.findByBadgeIdIgnoreCase("ADM-AG-0001")).thenReturn(Optional.of(admin1));
        when(officerRepository.save(any(Officer.class))).thenAnswer(inv -> inv.getArgument(0));
        when(redisRateLimiter.allowVaultUpload(any(), any())).thenReturn(true);

        OfficerAuthService.LoginResponse officerLogin =
                officerAuthService.authenticate("CC-AG-8942", OFFICER_PASS, null);
        officerBearerToken = "Bearer " + officerLogin.token();

        OfficerAuthService.LoginResponse adminLogin =
                officerAuthService.authenticate("ADM-AG-0001", ADMIN_PASS, null);
        adminBearerToken = "Bearer " + adminLogin.token();

        OfficerAuthService.LoginResponse pendingLogin =
                officerAuthService.authenticate("CB-NEW-0001", OFFICER_PASS, null);
        pendingPinBearerToken = "Bearer " + pendingLogin.token();
    }

    // =========================================================================
    // 1. PUBLIC ALLOWLIST ENDPOINTS (permitAll)
    // =========================================================================

    @Test
    @DisplayName("GET /api/v1/health is PUBLIC, returns UP, and is sanitized (no author/JVM leaks)")
    void publicHealthEndpoint_isSanitizedAndPermitted() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"))
                .andExpect(jsonPath("$.data.author").doesNotExist())
                .andExpect(jsonPath("$.data.institution").doesNotExist())
                .andExpect(jsonPath("$.data.jvmMemoryFreeMb").doesNotExist())
                .andExpect(jsonPath("$.data.jvmMemoryTotalMb").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/v1/auth/officer/login succeeds with valid DB password and rejects short default PINs (401)")
    void publicLoginEndpoint_isPermitted() throws Exception {
        Map<String, String> validBody = Map.of(
                "badgeId", "CC-AG-8942",
                "pin", OFFICER_PASS
        );
        mockMvc.perform(post("/api/v1/auth/officer/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty());

        Map<String, String> legacyShortBody = Map.of(
                "badgeId", "CC-AG-8942",
                "pin", "8942"
        );
        mockMvc.perform(post("/api/v1/auth/officer/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(legacyShortBody)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("SW_401"));
    }

    @Test
    @DisplayName("GET / and GET /health are PUBLIC")
    void rootAndHealthEndpoints_arePublic() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("CORS allows configured origin http://localhost:3000 and rejects untrusted origin")
    void cors_allowsConfiguredOriginAndRejectsWildcardEvilOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/health")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));

        mockMvc.perform(options("/api/v1/health")
                        .header("Origin", "https://evil-attacker.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    @DisplayName("GET /api/v1/procedures is PUBLIC")
    void publicProceduresEndpoint_isPermitted() throws Exception {
        when(procedureService.getProcedures(any(), any())).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/procedures"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("POST /api/v1/dossiers/track is PUBLIC and GET /api/v1/dossiers/track is DENIED (removed)")
    void publicTrackEndpoint_postPermitted_getDenied() throws Exception {
        when(dossierService.trackDossier(anyString(), any(), anyString()))
                .thenReturn(null);

        Map<String, String> body = Map.of(
                "dossierCode", "HS-20261111-0001",
                "last4Cccd", "1234"
        );
        mockMvc.perform(post("/api/v1/dossiers/track")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/dossiers/track")
                        .param("dossierCode", "HS-20261111-0001")
                        .param("last4Cccd", "1234"))
                .andExpect(status().is4xxClientError());
    }

    // =========================================================================
    // 2. OFFICER PROTECTED ENDPOINTS — Rejection without token (401)
    // =========================================================================

    @Test
    @DisplayName("GET /api/v1/dossiers/officer/list without token returns 401 SW_401")
    void officerDossiers_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/dossiers/officer/list"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("SW_401"));
    }

    @Test
    @DisplayName("GET /api/v1/rag/hitl-queue without token returns 401 SW_401")
    void hitlQueue_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/rag/hitl-queue"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("SW_401"));
    }

    @Test
    @DisplayName("GET /api/v1/auth/officer/me without token returns 401 SW_401")
    void officerMe_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/auth/officer/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("SW_401"));
    }

    @Test
    @DisplayName("GET /api/v1/auth/officer/me with valid OFFICER token returns 200 OK")
    void officerMe_withValidOfficerToken_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/auth/officer/me")
                        .header("Authorization", officerBearerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.badgeId").value("CC-AG-8942"))
                .andExpect(jsonPath("$.data.role").value("OFFICER"));
    }

    // =========================================================================
    // 3. ADMIN PRIVILEGED ENDPOINTS — SEC-03 Surface Reduction
    // =========================================================================

    @Test
    @DisplayName("POST /api/v1/issues/clusters/rebuild-index without token returns 401 SW_401")
    void rebuildIndex_withoutToken_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/issues/clusters/rebuild-index"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("SW_401"));
    }

    @Test
    @DisplayName("POST /api/v1/issues/clusters/rebuild-index with OFFICER token returns 403 SW_403")
    void rebuildIndex_withOfficerToken_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/issues/clusters/rebuild-index")
                        .header("Authorization", officerBearerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("SW_403"));
    }

    @Test
    @DisplayName("POST /api/v1/issues/clusters/rebuild-index with ADMIN token returns 200 OK")
    void rebuildIndex_withAdminToken_returns200() throws Exception {
        when(triageService.warmUpSpatialIndexFromDatabase()).thenReturn(5);

        mockMvc.perform(post("/api/v1/issues/clusters/rebuild-index")
                        .header("Authorization", adminBearerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reindexedClusters").value(5));
    }

    @Test
    @DisplayName("GET /api/v1/evaluation/report with OFFICER token returns 403 SW_403")
    void evaluationReport_withOfficerToken_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/evaluation/report")
                        .header("Authorization", officerBearerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("SW_403"));
    }

    @Test
    @DisplayName("GET /api/v1/evaluation/report with ADMIN token returns 200 OK")
    void evaluationReport_withAdminToken_returns200() throws Exception {
        FullBenchmarkReport mockReport = FullBenchmarkReport.builder()
                .projectTitle("SmartWard AI")
                .institution("UTH")
                .scientificConclusion("Cached benchmark available.")
                .build();
        when(experimentRunnerService.getLatestReport()).thenReturn(mockReport);

        mockMvc.perform(get("/api/v1/evaluation/report")
                        .header("Authorization", adminBearerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.projectTitle").value("SmartWard AI"));
    }

    // =========================================================================
    // 4. STRICT DENY ALL UNMAPPED ENDPOINTS
    // =========================================================================

    @Test
    @DisplayName("Unmapped endpoint /api/v1/arbitrary-unmapped without token returns 401")
    void unmappedEndpoint_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/arbitrary-unmapped"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("SW_401"));
    }

    @Test
    @DisplayName("Unmapped endpoint /api/v1/arbitrary-unmapped with token returns 403")
    void unmappedEndpoint_withToken_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/arbitrary-unmapped")
                        .header("Authorization", officerBearerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("SW_403"));
    }

    // =========================================================================
    // 5. /api/v1/admin/** GOVERNANCE & ROLE ISOLATION VIA REAL MOCKMVC FILTER CHAIN
    // =========================================================================

    @Test
    @DisplayName("Admin governance endpoints without token return 401 SW_401")
    void adminGovernance_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/admin/procedures"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("SW_401"));

        mockMvc.perform(get("/api/v1/admin/proposals"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("SW_401"));

        mockMvc.perform(post("/api/v1/admin/proposals/1/approve"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("SW_401"));

        mockMvc.perform(get("/api/v1/admin/wards/AG_P_LONGXUYEN/overview"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("SW_401"));
    }

    @Test
    @DisplayName("OFFICER calling admin-only governance endpoints returns 403 SW_403")
    void adminOnlyGovernance_withOfficerToken_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/proposals")
                        .header("Authorization", officerBearerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("SW_403"));

        mockMvc.perform(get("/api/v1/admin/proposals/1/diff")
                        .header("Authorization", officerBearerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("SW_403"));

        mockMvc.perform(post("/api/v1/admin/proposals/1/approve")
                        .header("Authorization", officerBearerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("SW_403"));

        mockMvc.perform(post("/api/v1/admin/proposals/1/reject")
                        .header("Authorization", officerBearerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("SW_403"));

        mockMvc.perform(post("/api/v1/admin/procedures")
                        .header("Authorization", officerBearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("SW_403"));

        mockMvc.perform(patch("/api/v1/admin/procedures/TTHC-HT-04/status")
                        .header("Authorization", officerBearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INACTIVE\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("SW_403"));

        mockMvc.perform(post("/api/v1/admin/procedures/TTHC-HT-04/rollback/1")
                        .header("Authorization", officerBearerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("SW_403"));

        mockMvc.perform(get("/api/v1/admin/wards/AG_P_LONGXUYEN/overview")
                        .header("Authorization", officerBearerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("SW_403"));
    }

    @Test
    @DisplayName("ADMIN self-approving own proposal via MockMvc returns 403 FORBIDDEN")
    void adminSelfApproval_viaMockMvc_returns403() throws Exception {
        when(procedureGovernanceService.approveProposal(any(), any(), any(), any(), any()))
                .thenThrow(new BusinessException(ErrorCode.FORBIDDEN,
                        "SELF_APPROVAL_FORBIDDEN: Người tạo đề xuất (ADM-AG-0001) không được phép tự duyệt đề xuất của chính mình."));

        ProposalDecisionRequest body = new ProposalDecisionRequest("Tự duyệt");
        mockMvc.perform(post("/api/v1/admin/proposals/10/approve")
                        .header("Authorization", adminBearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("ADMIN is blocked (403) from Officer dossier workspace and review endpoints; uses read-only /api/v1/admin/wards/{wardCode}/overview")
    void adminBlockedFromOfficerDossierReview_andUsesReadOnlyWardOverview() throws Exception {
        // Admin cannot access officer dossier list or review dossiers in place of officer
        mockMvc.perform(get("/api/v1/dossiers/officer/list")
                        .header("Authorization", adminBearerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/v1/dossiers/HS-20261118-001/review")
                        .header("Authorization", adminBearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"APPROVED\"}"))
                .andExpect(status().isForbidden());

        // Admin CAN access read-only ward overview endpoint
        when(procedureGovernanceService.getAdminWardReadOnlyOverview(anyString(), any(), any(), any()))
                .thenReturn(AdminWardOverviewDto.builder()
                        .wardCode("AG_P_LONGXUYEN")
                        .readOnly(true)
                        .audited(true)
                        .totalDossiers(2)
                        .build());

        mockMvc.perform(get("/api/v1/admin/wards/AG_P_LONGXUYEN/overview")
                        .header("Authorization", adminBearerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.readOnly").value(true))
                .andExpect(jsonPath("$.data.audited").value(true));
    }

    @Test
    @DisplayName("SEC-09: Officer of Ward A querying dossiers of Ward B returns 403 FORBIDDEN")
    void officerWardA_queryingWardB_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/dossiers/officer/list")
                        .param("wardCode", "AG_P_CHAUDOC")
                        .header("Authorization", officerBearerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /api/v1/admin/officers/{badgeId}/issue-pin requires ADMIN role (OFFICER -> 403, ADMIN -> 200)")
    void adminIssueOneTimePin_adminOnly() throws Exception {
        mockMvc.perform(post("/api/v1/admin/officers/CC-AG-8942/issue-pin")
                        .header("Authorization", officerBearerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("SW_403"));

        mockMvc.perform(post("/api/v1/admin/officers/CC-AG-8942/issue-pin")
                        .header("Authorization", adminBearerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.badgeId").value("CC-AG-8942"))
                .andExpect(jsonPath("$.data.mustChangePin").value(true));
    }

    @Test
    @DisplayName("Token with mustChangePin=true is blocked (403 SW_403_MUST_CHANGE_PIN) on officer routes, allowed on /me and /logout")
    void mustChangePinToken_onlyAllowedOnSelfServiceEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/dossiers/officer/list")
                        .header("Authorization", pendingPinBearerToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("SW_403_MUST_CHANGE_PIN"));

        mockMvc.perform(get("/api/v1/auth/officer/me")
                        .header("Authorization", pendingPinBearerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mustChangePin").value(true));

        mockMvc.perform(post("/api/v1/auth/officer/logout")
                        .header("Authorization", pendingPinBearerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.revoked").value(true));
    }

    @Test
    @DisplayName("Reusing logged-out token returns 401 UNAUTHORIZED (jti revoked)")
    void reusingLoggedOutToken_returns401() throws Exception {
        OfficerAuthService.LoginResponse tempLogin =
                officerAuthService.authenticate("CC-AG-1001", OFFICER_PASS, null);
        String tempBearer = "Bearer " + tempLogin.token();

        // 1. Valid before logout
        mockMvc.perform(get("/api/v1/auth/officer/me")
                        .header("Authorization", tempBearer))
                .andExpect(status().isOk());

        // 2. Call POST /api/v1/auth/officer/logout
        mockMvc.perform(post("/api/v1/auth/officer/logout")
                        .header("Authorization", tempBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.revoked").value(true));

        // 3. Reusing revoked token returns 401 SW_401
        mockMvc.perform(get("/api/v1/auth/officer/me")
                        .header("Authorization", tempBearer))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("SW_401"));
    }
}
