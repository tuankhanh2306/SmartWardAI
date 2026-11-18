package vn.edu.uth.smartward.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

@Configuration
public class CorsConfig {

    @Value("${smartward.cors.allowed-origins:http://localhost:3000,http://localhost:5173,http://localhost:8081,http://10.0.2.2:8081,http://192.168.*.*:*,exp://*}")
    private List<String> allowedOrigins;

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
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
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("X-Correlation-ID", "X-Correlation-Id", "Content-Disposition"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
