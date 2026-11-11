package vn.edu.uth.smartward.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.servlet.HandlerInterceptor;

@RequiredArgsConstructor
public class OfficerAuthInterceptor implements HandlerInterceptor {

    private final OfficerAuthService officerAuthService;
    private final boolean enforceOfficerAuth;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod()) || !enforceOfficerAuth) {
            return true;
        }

        String uri = request.getRequestURI();
        String method = request.getMethod();

        boolean requiresOfficerRole =
                (uri.startsWith("/api/v1/issues/clusters/") && ("PUT".equalsIgnoreCase(method) || "PATCH".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method)))
                || uri.startsWith("/api/v1/issues/spatial-index/")
                || uri.startsWith("/api/v1/rag/hitl-queue")
                || uri.startsWith("/api/v1/rag/hitl/")
                || uri.startsWith("/api/v1/dossiers/officer")
                || (uri.startsWith("/api/v1/dossiers/") && uri.endsWith("/review"))
                || uri.startsWith("/api/v1/forms/submissions")
                || (uri.startsWith("/api/v1/vault/") && !uri.startsWith("/api/v1/vault/upload") && !uri.startsWith("/api/v1/vault/view/"));

        if (!requiresOfficerRole) {
            return true;
        }

        String authHeader = request.getHeader("Authorization");
        OfficerAuthService.OfficerPrincipal principal = officerAuthService.verifyToken(authHeader);
        request.setAttribute("officerPrincipal", principal);
        return true;
    }
}
