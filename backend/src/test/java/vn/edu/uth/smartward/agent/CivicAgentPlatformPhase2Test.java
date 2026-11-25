package vn.edu.uth.smartward.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import vn.edu.uth.smartward.agent.dto.AgentChatRequest;
import vn.edu.uth.smartward.agent.dto.AgentChatResponse;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.dossier.CitizenDossier;
import vn.edu.uth.smartward.dossier.CitizenDossierRepository;
import vn.edu.uth.smartward.dossier.CitizenDossierService;
import vn.edu.uth.smartward.dossier.dto.DossierTrackingResponse;
import vn.edu.uth.smartward.formcheck.CccdValidator;
import vn.edu.uth.smartward.formcheck.DateLogicValidator;
import vn.edu.uth.smartward.formcheck.FormPrecheckService;
import vn.edu.uth.smartward.formcheck.FormSubmissionRepository;
import vn.edu.uth.smartward.formcheck.MandatoryFieldValidator;
import vn.edu.uth.smartward.formcheck.OcrExtractionClient;
import vn.edu.uth.smartward.rag.RagQueryService;
import vn.edu.uth.smartward.rag.dto.LegalCitationDto;
import vn.edu.uth.smartward.rag.dto.RagAskRequest;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;
import vn.edu.uth.smartward.security.OfficerAuthService;
import vn.edu.uth.smartward.triage.TwoStageTriageService;
import vn.edu.uth.smartward.triage.dto.IssueClusterDto;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("Civic AI Agent Platform Phase 2 (TASK-035..TASK-038)")
class CivicAgentPlatformPhase2Test {

    private FormPrecheckService buildRealPrecheckService(FormSubmissionRepository submissionRepo) {
        return new FormPrecheckService(
                mock(OcrExtractionClient.class),
                new MandatoryFieldValidator(),
                new CccdValidator(),
                new DateLogicValidator(),
                submissionRepo,
                new ObjectMapper()
        );
    }

    @Test
    @DisplayName("TASK-035 & TASK-038: ToolRegistry hides ward_analytics from CITIZEN and exposes it to OFFICER/ADMIN")
    void toolRegistryEnforcesRoleVisibility() {
        LegalKnowledgeTool legalTool = new LegalKnowledgeTool(mock(RagQueryService.class));
        DossierStatusTool dossierTool = new DossierStatusTool(mock(CitizenDossierService.class));
        SmartFormDraftTool formTool = new SmartFormDraftTool(buildRealPrecheckService(mock(FormSubmissionRepository.class)));
        WardAnalyticsTool analyticsTool = new WardAnalyticsTool(mock(CitizenDossierRepository.class), mock(TwoStageTriageService.class));

        ToolRegistry registry = new ToolRegistry(List.of(legalTool, dossierTool, formTool, analyticsTool));

        List<String> citizenTools = registry.getToolsForRole(AgentRole.CITIZEN).stream().map(CivicAgentTool::name).toList();
        assertEquals(List.of("legal_knowledge_search", "dossier_status_lookup", "smart_form_draft"), citizenTools);
        assertFalse(citizenTools.contains(WardAnalyticsTool.TOOL_NAME));
        assertTrue(registry.findAuthorizedTool(WardAnalyticsTool.TOOL_NAME, AgentRole.CITIZEN).isEmpty());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> registry.requireAuthorizedTool(WardAnalyticsTool.TOOL_NAME, AgentRole.CITIZEN));
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());

        assertTrue(registry.findAuthorizedTool(WardAnalyticsTool.TOOL_NAME, AgentRole.OFFICER).isPresent());
        assertTrue(registry.findAuthorizedTool(WardAnalyticsTool.TOOL_NAME, AgentRole.ADMIN).isPresent());
    }

    @Test
    @DisplayName("TASK-036: Multi-step citizen query tracks real dossier (masked PII) + enriches Legal RAG with citations")
    void citizenMultiStepDossierAndLegalKnowledgeFlow() {
        RagQueryService ragService = mock(RagQueryService.class);
        CitizenDossierService dossierService = mock(CitizenDossierService.class);

        when(dossierService.trackDossier(eq("HS-2026-0001"), eq("1234"), anyString())).thenReturn(
                DossierTrackingResponse.builder()
                        .dossierCode("HS-2026-0001")
                        .procedureCode("TTHC-CT-01")
                        .procedureName("Đăng ký thường trú")
                        .wardCode("AG_P_LONGXUYEN")
                        .citizenCccd("089098001234")
                        .status("NEEDS_SUPPLEMENT")
                        .officerFeedback("Thiếu hợp đồng thuê nhà công chứng")
                        .slaDeadline(Instant.now().plus(Duration.ofDays(2)))
                        .build()
        );

        LegalCitationDto citation = LegalCitationDto.builder()
                .chunkCode("CT-01-HS")
                .procedureName("Đăng ký thường trú")
                .title("Thành phần hồ sơ")
                .similarityScore(0.91)
                .build();

        when(ragService.askQuestion(any(RagAskRequest.class), anyString())).thenReturn(
                RagAskResponse.builder()
                        .answer("Theo [CT-01-HS], công dân cần bổ sung Tờ khai CT01 và giấy tờ chứng minh chỗ ở hợp pháp.")
                        .abstained(false)
                        .maxSimilarity(0.91)
                        .appliedThreshold(0.78)
                        .citations(List.of(citation))
                        .build()
        );

        ToolRegistry registry = new ToolRegistry(List.of(
                new LegalKnowledgeTool(ragService),
                new DossierStatusTool(dossierService),
                new SmartFormDraftTool(buildRealPrecheckService(mock(FormSubmissionRepository.class))),
                new WardAnalyticsTool(mock(CitizenDossierRepository.class), mock(TwoStageTriageService.class))
        ));

        CivicSupervisorAgent agent = new CivicSupervisorAgent(registry, ragService, null, new ObjectMapper());
        AgentChatRequest req = AgentChatRequest.builder()
                .message("Kiểm tra hồ sơ HS-2026-0001 CCCD đuôi 1234 và cho biết cần bổ sung giấy tờ gì?")
                .build();
        AgentExecutionContext ctx = new AgentExecutionContext(
                AgentRole.CITIZEN, null, null, "127.0.0.1", null, req.getMessage(), null, null,
                System.currentTimeMillis() + 15000L
        );

        AgentChatResponse resp = agent.chat(req, ctx);

        assertEquals("CITIZEN", resp.getRole());
        assertEquals(2, resp.getSteps().size());
        assertEquals(DossierStatusTool.TOOL_NAME, resp.getSteps().get(0).getToolName());
        assertEquals(LegalKnowledgeTool.TOOL_NAME, resp.getSteps().get(1).getToolName());
        assertTrue(resp.getAnswer().contains("********1234"), "CCCD must be masked in response");
        assertFalse(resp.getAnswer().contains("089098001234"), "Raw 12-digit CCCD must never leak");
        assertTrue(resp.getAnswer().contains("[CT-01-HS]"));
        assertEquals(1, resp.getCitations().size());
        assertEquals(1, resp.getActionCards().size());
        assertEquals("DOSSIER_STATUS", resp.getActionCards().get(0).type());
        assertFalse(resp.isAbstained());
    }

    @Test
    @DisplayName("TASK-036: DossierStatusTool rejects missing last4Cccd without calling trackDossier")
    void dossierToolRequiresLast4Cccd() {
        CitizenDossierService dossierService = mock(CitizenDossierService.class);
        DossierStatusTool tool = new DossierStatusTool(dossierService);
        AgentExecutionContext ctx = new AgentExecutionContext(
                AgentRole.CITIZEN, null, null, "127.0.0.1", null,
                "Kiểm tra hồ sơ HS-2026-0001 giúp tôi", null, null,
                System.currentTimeMillis() + 15000L
        );

        AgentToolResult result = tool.execute(ctx, Map.of("dossierCode", "HS-2026-0001"));

        assertFalse(result.success());
        assertTrue(result.summary().contains("4 chữ số cuối CCCD"));
        verifyNoInteractions(dossierService);
    }

    @Test
    @DisplayName("TASK-037: SmartFormDraftTool extracts natural language into CT01 draft JSON with 0 DB writes")
    void smartFormDraftToolIsStrictlyDraftOnlyWithZeroDbWrites() {
        FormSubmissionRepository submissionRepo = mock(FormSubmissionRepository.class);
        FormPrecheckService precheckService = buildRealPrecheckService(submissionRepo);
        SmartFormDraftTool draftTool = new SmartFormDraftTool(precheckService);

        AgentExecutionContext ctx = new AgentExecutionContext(
                AgentRole.CITIZEN, null, null, "127.0.0.1", null,
                "Điền tờ khai mẫu CT01 giúp tôi: tên tôi là Nguyễn Văn An, sinh ngày 15/05/1995, giới tính Nam, CCCD 089095001234, địa chỉ 12 Trần Hưng Đạo, phường Long Xuyên, SĐT 0912345678",
                null, null,
                System.currentTimeMillis() + 15000L
        );

        AgentToolResult result = draftTool.execute(ctx, Map.of());

        assertTrue(result.success());
        assertEquals(Boolean.TRUE, result.data().get("draftOnly"));
        assertEquals("CT01", result.data().get("formType"));
        assertNotNull(result.actionCard());
        assertEquals("OPEN_PREFILLED_FORM", result.actionCard().type());

        @SuppressWarnings("unchecked")
        Map<String, Object> draft = (Map<String, Object>) result.data().get("draftPayload");
        assertEquals("Nguyễn Văn An", draft.get("fullName"));
        assertEquals("089095001234", draft.get("citizenCccd"));
        assertEquals("15/05/1995", draft.get("dateOfBirth"));
        assertEquals("Nam", draft.get("gender"));
        assertEquals("0912345678", draft.get("phoneNumber"));

        // Crucial Draft-Only invariant: 0 DB writes
        verifyNoInteractions(submissionRepo);
    }

    @Test
    @DisplayName("TASK-038: WardAnalyticsTool enforces SEC-09 ward binding for OFFICER and blocks CITIZEN")
    void wardAnalyticsToolEnforcesSec09AndBlocksCitizen() {
        CitizenDossierRepository dossierRepo = mock(CitizenDossierRepository.class);
        TwoStageTriageService triageService = mock(TwoStageTriageService.class);

        CitizenDossier overdue = CitizenDossier.builder()
                .dossierCode("HS-1").procedureCode("TTHC-CT-01").wardCode("AG_P_LONGXUYEN")
                .status("PENDING").slaDeadline(Instant.now().minus(Duration.ofHours(5))).build();
        CitizenDossier dueSoon = CitizenDossier.builder()
                .dossierCode("HS-2").procedureCode("TTHC-HT-01").wardCode("AG_P_LONGXUYEN")
                .status("NEEDS_SUPPLEMENT").slaDeadline(Instant.now().plus(Duration.ofHours(12))).build();

        when(dossierRepo.findByWardCodeIgnoreCaseOrderByCreatedAtDesc("AG_P_LONGXUYEN"))
                .thenReturn(List.of(overdue, dueSoon));
        when(triageService.getOfficerClusters(eq("OPEN"), isNull(), eq("AG_P_LONGXUYEN")))
                .thenReturn(List.of(IssueClusterDto.builder()
                        .clusterCode("CL-1").category("ROAD_DAMAGE").title("Ổ gà đường Trần Hưng Đạo").reportCount(4).status("OPEN").build()));
        when(triageService.getOfficerClusters(eq("IN_PROGRESS"), isNull(), eq("AG_P_LONGXUYEN")))
                .thenReturn(List.of());

        WardAnalyticsTool tool = new WardAnalyticsTool(dossierRepo, triageService);

        // 1. CITIZEN direct call -> FORBIDDEN
        AgentExecutionContext citizenCtx = new AgentExecutionContext(
                AgentRole.CITIZEN, null, null, "127.0.0.1", null, "Thống kê quá hạn SLA", null, null,
                System.currentTimeMillis() + 15000L
        );
        BusinessException citizenEx = assertThrows(BusinessException.class, () -> tool.execute(citizenCtx, Map.of()));
        assertEquals(ErrorCode.FORBIDDEN, citizenEx.getErrorCode());

        // 2. OFFICER of AG_P_LONGXUYEN requesting AG_X_CHAUDOC -> hard-locked to AG_P_LONGXUYEN
        AgentExecutionContext officerCtx = new AgentExecutionContext(
                AgentRole.OFFICER, "CC-AG-8942", "AG_P_LONGXUYEN", "127.0.0.1", null,
                "Thống kê hồ sơ quá hạn SLA của AG_X_CHAUDOC", null, null,
                System.currentTimeMillis() + 15000L
        );
        AgentToolResult result = tool.execute(officerCtx, Map.of("wardCode", "AG_X_CHAUDOC"));

        assertTrue(result.success());
        assertEquals("AG_P_LONGXUYEN", result.data().get("wardCode"));
        assertEquals(Boolean.TRUE, result.data().get("crossWardBlocked"));
        assertNotNull(result.actionCard());
        assertEquals("WARD_ANALYTICS", result.actionCard().type());

        @SuppressWarnings("unchecked")
        Map<String, Object> sla = (Map<String, Object>) result.data().get("slaSummary");
        assertEquals(1L, sla.get("overdueSlaCount"));
        assertEquals(1L, sla.get("dueWithin48hCount"));
        assertEquals(1L, sla.get("needsSupplementCount"));

        verify(dossierRepo, never()).findByWardCodeIgnoreCaseOrderByCreatedAtDesc("AG_X_CHAUDOC");
        verify(triageService, never()).getOfficerClusters(anyString(), any(), eq("AG_X_CHAUDOC"));
    }

    @Test
    @DisplayName("TASK-035: Budget Guard caps tool calls at 3 and falls back safely on LLM 503 or tool timeout")
    void supervisorEnforcesMax3ToolCallsAndLlm503Fallback() {
        RagQueryService ragService = mock(RagQueryService.class);
        when(ragService.askQuestion(any(RagAskRequest.class), anyString())).thenReturn(
                RagAskResponse.builder()
                        .answer("Kết quả tra cứu RAG chuẩn.")
                        .abstained(false)
                        .maxSimilarity(0.88)
                        .appliedThreshold(0.78)
                        .citations(List.of())
                        .build()
        );

        // Case A: LLM planner returns 5 tool calls -> hard-capped at 3
        AiModelClient overPlanningLlm = mock(AiModelClient.class);
        when(overPlanningLlm.generateChatResponse(anyString(), anyString())).thenReturn(
                "[{\"toolName\":\"legal_knowledge_search\",\"args\":{\"question\":\"q1\"}},"
                        + "{\"toolName\":\"legal_knowledge_search\",\"args\":{\"question\":\"q2\"}},"
                        + "{\"toolName\":\"legal_knowledge_search\",\"args\":{\"question\":\"q3\"}},"
                        + "{\"toolName\":\"legal_knowledge_search\",\"args\":{\"question\":\"q4\"}},"
                        + "{\"toolName\":\"legal_knowledge_search\",\"args\":{\"question\":\"q5\"}}]"
        );

        ToolRegistry registry = new ToolRegistry(List.of(new LegalKnowledgeTool(ragService)));
        CivicSupervisorAgent agent = new CivicSupervisorAgent(registry, ragService, overPlanningLlm, new ObjectMapper(), 3, 15000L);

        AgentChatRequest req = AgentChatRequest.builder().message("Hỏi chung về thủ tục hành chính").build();
        AgentExecutionContext ctx = new AgentExecutionContext(
                AgentRole.CITIZEN, null, null, "127.0.0.1", null, req.getMessage(), null, null,
                System.currentTimeMillis() + 15000L
        );

        AgentChatResponse cappedResp = agent.chat(req, ctx);
        assertEquals(3, cappedResp.getSteps().size(), "Must hard-cap at 3 tool calls");
        assertTrue(cappedResp.isBudgetExhausted());

        // Case B: LLM throws 503 -> safe fallback to deterministic RAG
        AiModelClient failingLlm = mock(AiModelClient.class);
        when(failingLlm.generateChatResponse(anyString(), anyString()))
                .thenThrow(new RuntimeException("503 Service Unavailable"));
        CivicSupervisorAgent fallbackAgent = new CivicSupervisorAgent(registry, ragService, failingLlm, new ObjectMapper(), 3, 15000L);

        AgentChatResponse fallbackResp = fallbackAgent.chat(req, ctx);
        assertFalse(fallbackResp.isAbstained());
        assertEquals(1, fallbackResp.getSteps().size());
        assertTrue(fallbackResp.getAnswer().contains("Kết quả tra cứu RAG chuẩn"));
    }

    @Test
    @DisplayName("TASK-035: CivicAgentController maps mustChangePin officer to CITIZEN and active officer to OFFICER")
    void controllerMapsRolesSafely() {
        CivicSupervisorAgent mockSupervisor = mock(CivicSupervisorAgent.class);
        when(mockSupervisor.chat(any(), any())).thenAnswer(inv -> {
            AgentExecutionContext ctx = inv.getArgument(1);
            return AgentChatResponse.builder()
                    .answer("OK")
                    .role(ctx.role().name())
                    .steps(List.of())
                    .actionCards(List.of())
                    .citations(List.of())
                    .build();
        });

        CivicAgentController controller = new CivicAgentController(mockSupervisor, null, null);
        AgentChatRequest req = AgentChatRequest.builder().message("Xin chào").build();

        // 1. Active officer
        MockHttpServletRequest officerHttp = new MockHttpServletRequest();
        officerHttp.setAttribute("officerPrincipal",
                new OfficerAuthService.OfficerPrincipal("CC-AG-8942", "Trần Quốc Bảo", "AG_P_LONGXUYEN", "OFFICER", "tid-1", 9999999999L, false));
        ApiResponse<AgentChatResponse> officerResp = controller.chat(req, null, officerHttp).getBody();
        assertNotNull(officerResp);
        assertEquals("OFFICER", officerResp.data().getRole());

        // 2. Officer with mustChangePin = true must NOT gain OFFICER privileges
        MockHttpServletRequest pendingPinHttp = new MockHttpServletRequest();
        pendingPinHttp.setAttribute("officerPrincipal",
                new OfficerAuthService.OfficerPrincipal("CB-NEW-0001", "Cán bộ mới", "AG_P_LONGXUYEN", "OFFICER", "tid-2", 9999999999L, true));
        ApiResponse<AgentChatResponse> pendingResp = controller.chat(req, null, pendingPinHttp).getBody();
        assertNotNull(pendingResp);
        assertEquals("CITIZEN", pendingResp.data().getRole());
    }
}
