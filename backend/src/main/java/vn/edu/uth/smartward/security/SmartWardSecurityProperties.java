package vn.edu.uth.smartward.security;

import jakarta.annotation.PostConstruct;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * SEC-01: Fail-fast validated configuration properties for SmartWard Security.
 * Strictly enforces 256-bit (>= 32 bytes) key length and rejects insecure default placeholder strings.
 */
@Getter
@Setter
@Component
@Validated
@ConfigurationProperties(prefix = "smartward.security")
public class SmartWardSecurityProperties {

    @NotBlank(message = "smartward.security.jwt-secret must not be blank")
    private String jwtSecret;

    private int tokenTtlHours = 8;
    private boolean enforceOfficerAuth = true;

    private static final List<String> FORBIDDEN_KEYWORDS = List.of(
            "changeme", "devtest", "fallback"
    );

    @PostConstruct
    public void validateSecurityRequirements() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("SEC-01 Fail-fast: smartward.security.jwt-secret is required and cannot be blank.");
        }
        byte[] bytes = jwtSecret.trim().getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("SEC-01 Fail-fast: smartward.security.jwt-secret must be at least 32 bytes (256-bit). Found: " + bytes.length);
        }
        String lower = jwtSecret.toLowerCase();
        for (String forbidden : FORBIDDEN_KEYWORDS) {
            if (lower.contains(forbidden)) {
                throw new IllegalStateException("SEC-01 Fail-fast: smartward.security.jwt-secret contains forbidden placeholder keyword: '" + forbidden + "'. Real production secret required.");
            }
        }
    }
}
