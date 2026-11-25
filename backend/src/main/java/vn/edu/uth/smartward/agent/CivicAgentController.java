package vn.edu.uth.smartward.agent;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.uth.smartward.agent.dto.AgentChatRequest;
import vn.edu.uth.smartward.agent.dto.AgentChatResponse;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.common.ClientIpResolver;
import vn.edu.uth.smartward.security.OfficerAuthService;

import java.util.Locale;

/**
 * Unified Multi-Step Civic AI Agent Endpoint (TASK-035).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/agent")
@Tag(name = "Civic AI Agent", description = "Điều phối Trợ lý AI Đa bước (Pháp lý, Tra cứu hồ sơ, Điền nháp tờ khai, Thống kê xã)")
public class CivicAgentController {

    private final CivicSupervisorAgent supervisorAgent;
    private final ClientIpResolver clientIpResolver;
    private final OfficerAuthService officerAuthService;

    @Autowired
    public CivicAgentController(CivicSupervisorAgent supervisorAgent,
                                @Autowired(required = false) ClientIpResolver clientIpResolver,
                                @Autowired(required = false) OfficerAuthService officerAuthService) {
        this.supervisorAgent = supervisorAgent;
        this.clientIpResolver = clientIpResolver != null ? clientIpResolver : new ClientIpResolver();
        this.officerAuthService = officerAuthService;
    }

    @PostMapping("/chat")
    @Operation(
            summary = "Hội thoại đa bước với CivicSupervisorAgent",
            description = "Tự động phân quyền công cụ theo vai trò (CITIZEN / OFFICER / ADMIN), giới hạn tối đa 3 bước gọi Tool / 15 giây, và tự fallback về Legal RAG."
    )
    public ResponseEntity<ApiResponse<AgentChatResponse>> chat(
            @Valid @RequestBody AgentChatRequest request,
            @RequestHeader(value = "X-Session-Id", required = false) String headerSessionId,
            HttpServletRequest httpRequest) {

        String clientIp = clientIpResolver.resolve(httpRequest);
        OfficerAuthService.OfficerPrincipal principal = resolveVerifiedPrincipal(httpRequest);

        AgentRole role = AgentRole.CITIZEN;
        String officerBadgeId = null;
        String wardCode = null;
        if (principal != null && !principal.mustChangePin()) {
            String rawRole = principal.role() != null ? principal.role().trim().toUpperCase(Locale.ROOT) : "OFFICER";
            role = "ADMIN".equals(rawRole) ? AgentRole.ADMIN : AgentRole.OFFICER;
            officerBadgeId = principal.badgeId();
            wardCode = principal.wardCode();
        }

        String effectiveSessionId = (request.getSessionId() != null && !request.getSessionId().isBlank())
                ? request.getSessionId().trim()
                : (headerSessionId != null && !headerSessionId.isBlank() ? headerSessionId.trim() : null);

        AgentExecutionContext context = new AgentExecutionContext(
                role,
                officerBadgeId,
                wardCode,
                clientIp,
                effectiveSessionId,
                request.getMessage(),
                request.getFormType(),
                request.getHistory(),
                System.currentTimeMillis() + CivicSupervisorAgent.DEFAULT_TOTAL_TIMEOUT_MS
        );

        AgentChatResponse response = supervisorAgent.chat(request, context);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    private OfficerAuthService.OfficerPrincipal resolveVerifiedPrincipal(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        Object attr = request.getAttribute("officerPrincipal");
        if (attr instanceof OfficerAuthService.OfficerPrincipal principal) {
            return principal;
        }
        if (officerAuthService != null) {
            return officerAuthService.tryVerifyToken(request.getHeader("Authorization")).orElse(null);
        }
        return null;
    }
}
