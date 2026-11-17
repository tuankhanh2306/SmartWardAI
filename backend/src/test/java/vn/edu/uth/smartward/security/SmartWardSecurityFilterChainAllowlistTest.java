package vn.edu.uth.smartward.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.uth.smartward.common.HealthController;
import vn.edu.uth.smartward.dossier.CitizenDossierController;
import vn.edu.uth.smartward.dossier.CitizenDossierService;
import vn.edu.uth.smartward.evaluation.EvaluationController;
import vn.edu.uth.smartward.evaluation.ExperimentRunnerService;
import vn.edu.uth.smartward.evaluation.dto.FullBenchmarkReport;
import vn.edu.uth.smartward.formcheck.FormCheckController;
import vn.edu.uth.smartward.formcheck.FormPrecheckService;
import vn.edu.uth.smartward.rag.ProcedureController;
import vn.edu.uth.smartward.rag.ProcedureService;
import vn.edu.uth.smartward.rag.RagController;
import vn.edu.uth.smartward.rag.RagQueryService;
import vn.edu.uth.smartward.triage.TriageController;
import vn.edu.uth.smartward.triage.TwoStageTriageService;
import vn.edu.uth.smartward.vault.VaultController;
import vn.edu.uth.smartward.vault.ZeroTrustVaultService;

import java.util.Collections;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {
        HealthController.class,
        OfficerAuthController.class,
        ProcedureController.class,
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
        OfficerAuthService.class
})
@ActiveProfiles({"test", "eval"})
@TestPropertySource(properties = {
        "smartward.security.jwt-secret=SmartWardAI_UnitTest_JwtSecret_32B_Key_Strict_Security!",
        "smartward.security.token-ttl-hours=8"
})
@DisplayName("SEC-02 & SEC-03: Spring Security Allowlist Filter Chain & Surface Reduction Verification")
class SmartWardSecurityFilterChainAllowlistTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OfficerAuthService officerAuthService;

    @Autowired
    private ObjectMapper objectMapper;

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

    private String officerBearerToken;
    private String adminBearerToken;

    @BeforeEach
    void setUp() {
        OfficerAuthService.LoginResponse officerLogin =
                officerAuthService.authenticate("CC-AG-8942", "8942", null);
        officerBearerToken = "Bearer " + officerLogin.token();

        OfficerAuthService.LoginResponse adminLogin =
                officerAuthService.authenticate("ADM-AG-0001", "9999", null);
        adminBearerToken = "Bearer " + adminLogin.token();
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
    @DisplayName("POST /api/v1/auth/officer/login is PUBLIC")
    void publicLoginEndpoint_isPermitted() throws Exception {
        Map<String, String> body = Map.of(
                "badgeId", "CC-AG-8942",
                "pin", "8942"
        );
        mockMvc.perform(post("/api/v1/auth/officer/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty());
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
    @DisplayName("POST /api/v1/dossiers/track is PUBLIC")
    void publicTrackEndpoint_isPermitted() throws Exception {
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
}
