package vn.edu.uth.smartward.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import vn.edu.uth.smartward.common.ApiResponse;

import java.util.List;

/**
 * Spring Security Configuration with Strict Allowlist Access Filter Chain.
 * Enforces SEC-02 & SEC-03:
 * - Stateless JWT/HMAC token session management
 * - Strict public allowlist
 * - Role-based authorization: OFFICER for administrative dossiers/HITL/vault, ADMIN for evaluation and index rebuild
 * - anyRequest().denyAll() at chain termination
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class OfficerSecurityConfig {

    private final CorrelationIdFilter correlationIdFilter;
    private final OfficerTokenAuthenticationFilter tokenFilter;
    private final ObjectMapper objectMapper;

    @Value("${smartward.cors.allowed-origins:http://localhost:3000,http://localhost:5173,http://localhost:8081,http://10.0.2.2:8081,http://192.168.*.*:*,exp://*}")
    private List<String> allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding("UTF-8");
                            ApiResponse<Void> apiResp = ApiResponse.error("Yêu cầu xác thực cán bộ (401 Unauthorized).", "SW_401");
                            response.getWriter().write(objectMapper.writeValueAsString(apiResp));
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding("UTF-8");
                            boolean mustChangePinBlocked = Boolean.TRUE.equals(request.getAttribute("mustChangePinBlocked"));
                            ApiResponse<Void> apiResp = mustChangePinBlocked
                                    ? ApiResponse.error("Bắt buộc đổi mã PIN lần đầu trước khi sử dụng chức năng nghiệp vụ.", "SW_403_MUST_CHANGE_PIN")
                                    : ApiResponse.error("Không có quyền truy cập tài nguyên này (403 Forbidden).", "SW_403");
                            response.getWriter().write(objectMapper.writeValueAsString(apiResp));
                        })
                )
                .addFilterBefore(correlationIdFilter, SecurityContextHolderFilter.class)
                .addFilterBefore(tokenFilter, UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        // 1. CORS Preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // 2. Public Minimal Surface (SEC-02 allowlist)
                        .requestMatchers(HttpMethod.GET, "/", "/health", "/api/v1/health").permitAll()
                        .requestMatchers(HttpMethod.POST,
                                "/api/v1/auth/officer/login", "/api/v1/officer/login", "/api/v1/auth/login",
                                "/api/v1/auth/officer/change-pin", "/api/v1/officer/change-pin", "/api/v1/auth/change-pin"
                        ).permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/rag/ask", "/api/v1/rag/feedback").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/agent/chat").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/voice/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/procedures/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/issues/report", "/api/v1/issues/photos").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/issues/clusters/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/forms/precheck").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/dossiers").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/dossiers/track").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/vault/upload").permitAll()

                        // 3. API Documentation (dev/staging/test/eval)
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // 4. Procedure Governance Shared Operations (SEC-02: OFFICER or ADMIN)
                        .requestMatchers(HttpMethod.GET, "/api/v1/admin/procedures", "/api/v1/admin/procedures/*").hasAnyRole("OFFICER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/procedures/*/proposals").hasAnyRole("OFFICER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/proposals/*/submit").hasAnyRole("OFFICER", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/admin/procedures/*/minor-edit").hasAnyRole("OFFICER", "ADMIN")

                        // 5. Admin Privileged Operations (SEC-03: ADMIN only)
                        .requestMatchers(HttpMethod.GET, "/api/v1/admin/proposals", "/api/v1/admin/proposals/*/diff").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/proposals/*/approve", "/api/v1/admin/proposals/*/reject").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/procedures").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/admin/procedures/*/status").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/procedures/*/rollback/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/admin/wards/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/officers/*/issue-pin").hasRole("ADMIN")
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/issues/clusters/rebuild-index").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/procedures/reindex").hasRole("ADMIN")
                        .requestMatchers("/api/v1/evaluation/**").hasRole("ADMIN")

                        // 6. Officer Protected Operations (SEC-02: OFFICER role strictly isolated from ADMIN)
                        .requestMatchers("/api/v1/dossiers/officer/**").hasRole("OFFICER")
                        .requestMatchers("/api/v1/dossiers/*/review").hasRole("OFFICER")
                        .requestMatchers("/api/v1/rag/hitl-queue/**", "/api/v1/rag/hitl/**").hasRole("OFFICER")
                        .requestMatchers("/api/v1/issues/officer/**").hasRole("OFFICER")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/issues/clusters/*/status").hasRole("OFFICER")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/issues/clusters/*/status").hasRole("OFFICER")
                        .requestMatchers("/api/v1/forms/submissions/**").hasRole("OFFICER")
                        .requestMatchers("/api/v1/vault/**").hasRole("OFFICER")
                        .requestMatchers("/api/v1/auth/officer/me", "/api/v1/auth/officer/logout",
                                         "/api/v1/officer/me", "/api/v1/officer/logout",
                                         "/api/v1/auth/me", "/api/v1/auth/logout").hasAnyRole("OFFICER", "ADMIN", "PIN_CHANGE_ONLY")

                        // 7. Strict Deny All on Everything Else
                        .anyRequest().denyAll()
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> safeOrigins = (allowedOrigins == null ? List.<String>of() : allowedOrigins).stream()
                .map(String::trim)
                .filter(o -> !o.isEmpty() && !"*".equals(o))
                .toList();
        if (safeOrigins.isEmpty()) {
            safeOrigins = List.of(
                    "http://localhost:3000",
                    "http://localhost:5173",
                    "http://localhost:8081",
                    "http://10.0.2.2:8081",
                    "http://192.168.*.*:*",
                    "exp://*"
            );
        }
        config.setAllowedOriginPatterns(safeOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("X-Correlation-ID", "X-Correlation-Id", "Content-Disposition"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
