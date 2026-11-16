package vn.edu.uth.smartward.security;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.LoggingEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import vn.edu.uth.smartward.common.*;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("P0 Hardening & Guardrails Verification (SEC-05, SEC-06, SEC-08)")
class SmartWardP0HardeningAndSafetyTest {

    // =========================================================================
    // SEC-05: RAG Cache Key Isolation Between Wards
    // =========================================================================

    @Test
    @DisplayName("SEC-05: Cache keys for the same question are strictly isolated between different ward codes")
    void testQueryCacheKey_isolatedBetweenWards() {
        QueryCacheService cacheService = new QueryCacheService(null, null);

        String question = "Thủ tục đăng ký khai sinh cho trẻ mới sinh cần những giấy tờ gì?";
        String keyWard1 = cacheService.buildCacheKey(question, "AG_P_LONGXUYEN", "UBND Phường Long Xuyên", "Hộ tịch");
        String keyWard2 = cacheService.buildCacheKey(question, "WARD-AG-01", "UBND Phường Mỹ Bình", "Hộ tịch");

        assertNotNull(keyWard1);
        assertNotNull(keyWard2);
        assertNotEquals(keyWard1, keyWard2, "Cache key must be isolated by wardCode to prevent cross-ward contamination");
    }

    // =========================================================================
    // SEC-06: Unified Exception Handling & Zero Leaks
    // =========================================================================

    @Test
    @DisplayName("SEC-06: Generic exception returns HTTP 500, correlationId, and zero internal class/message leaks")
    void testGlobalExceptionHandler_noInternalClassLeaks() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        NullPointerException leakException = new NullPointerException("Fatal error in org.hibernate.engine.internal.SessionImpl");
        ResponseEntity<ApiResponse<Void>> response = handler.handleGenericException(leakException);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().success());
        assertNotNull(response.getBody().correlationId());
        assertFalse(response.getBody().correlationId().isBlank());

        String message = response.getBody().message();
        assertFalse(message.contains("NullPointerException"), "Response must NOT leak exception class name");
        assertFalse(message.contains("SessionImpl"), "Response must NOT leak internal class package paths");
        assertTrue(message.contains(response.getBody().correlationId()), "Response must provide tracking correlationId");
    }

    @Test
    @DisplayName("SEC-06: DataIntegrityViolationException returns HTTP 409 Conflict with correlationId")
    void testGlobalExceptionHandler_dataIntegrityViolationReturns409() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        DataIntegrityViolationException ex = new DataIntegrityViolationException("duplicate key value violates unique constraint citizen_dossiers_code_key");
        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().success());
        assertEquals("SW_409_CONFLICT", response.getBody().errorCode());
        assertNotNull(response.getBody().correlationId());
    }

    // =========================================================================
    // SEC-08: Log Hygiene — PII & Token Redaction and Filename Sanitization
    // =========================================================================

    @Test
    @DisplayName("SEC-08: MaskingMessageConverter redacts 9-12 digit CCCD numbers and phone numbers")
    void testMaskingMessageConverter_redactsCccdAndPhone() {
        MaskingMessageConverter converter = new MaskingMessageConverter();
        Logger logger = (Logger) LoggerFactory.getLogger("TestLogger");

        String rawMessage = "Citizen with CCCD 079095012345 and phone 0912345678 submitted document";
        LoggingEvent event = new LoggingEvent("TestClass", logger, Level.INFO, rawMessage, null, null);

        String masked = converter.convert(event);
        assertFalse(masked.contains("079095012345"), "CCCD must be masked");
        assertFalse(masked.contains("0912345678"), "Phone number must be masked");
        assertTrue(masked.contains("***REDACTED_CCCD***"));
        assertTrue(masked.contains("***REDACTED_PHONE***"));
    }

    @Test
    @DisplayName("SEC-08: MaskingMessageConverter redacts Vault One-Time Tokens (OTT_...) and Bearer JWTs")
    void testMaskingMessageConverter_redactsVaultTokensAndJwt() {
        MaskingMessageConverter converter = new MaskingMessageConverter();
        Logger logger = (Logger) LoggerFactory.getLogger("TestLogger");

        String rawMessage = "Accessing OTT_3a7e9c1f5b8d2a6e0c4f7b9e1d3a5c7f with header Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature";
        LoggingEvent event = new LoggingEvent("TestClass", logger, Level.INFO, rawMessage, null, null);

        String masked = converter.convert(event);
        assertFalse(masked.contains("OTT_3a7e9c1f5b8d2a6e0c4f7b9e1d3a5c7f"), "Vault OTT token must be masked");
        assertFalse(masked.contains("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"), "JWT token must be masked");
        assertTrue(masked.contains("OTT_***REDACTED***"));
        assertTrue(masked.contains("Bearer ***REDACTED_JWT***"));
    }

    @Test
    @DisplayName("SEC-08: FilenameUtils sanitizes path traversal, control chars, and limits length")
    void testFilenameUtils_sanitizesPathTraversalAndSpecialChars() {
        String dangerousFilename = "../../etc/passwd\r\n\tmalicious<script>alert(1)</script>.png";
        String sanitized = FilenameUtils.sanitizeFilename(dangerousFilename);

        assertFalse(sanitized.contains(".."));
        assertFalse(sanitized.contains("/"));
        assertFalse(sanitized.contains("\\"));
        assertFalse(sanitized.contains("<"));
        assertFalse(sanitized.contains(">"));
        assertFalse(sanitized.contains("\r"));
        assertFalse(sanitized.contains("\n"));
        assertTrue(sanitized.endsWith(".png"));
    }

    @Test
    @DisplayName("SEC-08: FilenameUtils.maskToken masks Vault OTT tokens")
    void testFilenameUtils_maskToken() {
        String token = "OTT_998877665544332211";
        String masked = FilenameUtils.maskToken(token);

        assertTrue(masked.startsWith("OTT_9988***REDACTED***"));
        assertFalse(masked.contains("77665544332211"));
    }
}
