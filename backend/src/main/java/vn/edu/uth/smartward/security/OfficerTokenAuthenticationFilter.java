package vn.edu.uth.smartward.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Spring Security OncePerRequestFilter to authenticate SmartWard officers and admins.
 * Validates Authorization Bearer tokens against OfficerAuthService and sets up SecurityContext.
 */
@Slf4j
@Component
public class OfficerTokenAuthenticationFilter extends OncePerRequestFilter {

    private final OfficerAuthService officerAuthService;

    public OfficerTokenAuthenticationFilter(@Autowired(required = false) OfficerAuthService officerAuthService) {
        this.officerAuthService = officerAuthService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (officerAuthService != null && authHeader != null && authHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            try {
                OfficerAuthService.OfficerPrincipal principal = officerAuthService.verifyToken(authHeader);
                List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                String rawRole = principal.role() != null ? principal.role().trim().toUpperCase() : "OFFICER";
                authorities.add(new SimpleGrantedAuthority("ROLE_" + rawRole));

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(principal, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);

                // Preserve request attribute for backward compatibility with existing controller lookups
                request.setAttribute("officerPrincipal", principal);
            } catch (Exception ex) {
                log.debug("Token authentication check failed: {}", ex.getMessage());
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
