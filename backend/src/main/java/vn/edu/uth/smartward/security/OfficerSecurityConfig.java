package vn.edu.uth.smartward.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@ConditionalOnBean(OfficerAuthService.class)
@RequiredArgsConstructor
public class OfficerSecurityConfig implements WebMvcConfigurer {

    private final OfficerAuthService officerAuthService;

    @Value("${smartward.security.enforce-officer-auth:true}")
    private boolean enforceOfficerAuth;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new OfficerAuthInterceptor(officerAuthService, enforceOfficerAuth))
                .addPathPatterns(
                        "/api/v1/issues/clusters/**",
                        "/api/v1/issues/spatial-index/**",
                        "/api/v1/rag/hitl-queue/**",
                        "/api/v1/rag/hitl/**",
                        "/api/v1/dossiers/officer/**",
                        "/api/v1/dossiers/*/review",
                        "/api/v1/forms/submissions/**",
                        "/api/v1/vault/**"
                )
                .excludePathPatterns(
                        "/api/v1/vault/upload",
                        "/api/v1/vault/view/**"
                );
    }
}
