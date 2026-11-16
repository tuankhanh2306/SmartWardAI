package vn.edu.uth.smartward.vault;

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
 * SEC-01: Fail-fast validated configuration properties for Zero-Trust Vault.
 * Strictly enforces 256-bit (>= 32 bytes) key length for AES-GCM and rejects placeholder strings.
 */
@Getter
@Setter
@Component
@Validated
@ConfigurationProperties(prefix = "smartward.vault")
public class SmartWardVaultProperties {

    @NotBlank(message = "smartward.vault.encryption-key must not be blank")
    private String encryptionKey;

    private String bucketName = "smartward-vault";
    private int tokenTtlHours = 24;
    private boolean failClosed = true;
    private String watermarkText = "CHỈ DÙNG ĐỂ SƠ DUYỆT HỒ SƠ TẠI UBND";

    private static final List<String> FORBIDDEN_KEYWORDS = List.of(
            "changeme", "devtest", "fallback"
    );

    @PostConstruct
    public void validateVaultRequirements() {
        if (encryptionKey == null || encryptionKey.isBlank()) {
            throw new IllegalStateException("SEC-01 Fail-fast: smartward.vault.encryption-key is required and cannot be blank.");
        }
        byte[] bytes = encryptionKey.trim().getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("SEC-01 Fail-fast: smartward.vault.encryption-key must be at least 32 bytes (AES-256). Found: " + bytes.length);
        }
        String lower = encryptionKey.toLowerCase();
        for (String forbidden : FORBIDDEN_KEYWORDS) {
            if (lower.contains(forbidden)) {
                throw new IllegalStateException("SEC-01 Fail-fast: smartward.vault.encryption-key contains forbidden placeholder keyword: '" + forbidden + "'. Real production secret required.");
            }
        }
    }
}
