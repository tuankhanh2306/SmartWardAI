package vn.edu.uth.smartward.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.common.HealthController;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Phase 4: DevOps, CI/CD, Observability & Infrastructure Hardening Tests")
class SmartWardP4DevOpsObservabilityTest {

    private final CorrelationIdFilter correlationIdFilter = new CorrelationIdFilter();
    private final HealthController healthController = new HealthController();

    @Test
    @DisplayName("8.4 Correlation ID: Generates UUID when header is absent and propagates in response")
    void testCorrelationId_generatedWhenAbsent() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/health");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> mdcValueDuringFilter = new AtomicReference<>();

        MockFilterChain filterChain = new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) {
                mdcValueDuringFilter.set(MDC.get(CorrelationIdFilter.MDC_KEY));
            }
        };

        correlationIdFilter.doFilter(request, response, filterChain);

        String responseHeader = response.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER);
        assertNotNull(responseHeader, "X-Correlation-ID response header must not be null");
        assertFalse(responseHeader.isBlank(), "X-Correlation-ID response header must not be blank");
        assertEquals(responseHeader, mdcValueDuringFilter.get(), "MDC must capture the same correlationId as response header");
        assertNull(MDC.get(CorrelationIdFilter.MDC_KEY), "MDC must be cleared after filter chain completes");
    }

    @Test
    @DisplayName("8.4 Correlation ID: Preserves valid incoming X-Correlation-ID")
    void testCorrelationId_preservesValidIncoming() throws Exception {
        String customTraceId = "TRACE-ABC-123456789";
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/dossiers");
        request.addHeader(CorrelationIdFilter.CORRELATION_ID_HEADER, customTraceId);
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> mdcValue = new AtomicReference<>();

        MockFilterChain filterChain = new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) {
                mdcValue.set(MDC.get(CorrelationIdFilter.MDC_KEY));
            }
        };

        correlationIdFilter.doFilter(request, response, filterChain);

        assertEquals(customTraceId, response.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER));
        assertEquals(customTraceId, mdcValue.get());
        assertNull(MDC.get(CorrelationIdFilter.MDC_KEY));
    }

    @Test
    @DisplayName("8.4 Correlation ID: Replaces malicious injection headers with clean UUID")
    void testCorrelationId_sanitizesMaliciousHeader() throws Exception {
        String maliciousHeader = "<script>alert(1)</script>\r\nInjected-Header: evil";
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/procedures");
        request.addHeader(CorrelationIdFilter.CORRELATION_ID_HEADER, maliciousHeader);
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> mdcValue = new AtomicReference<>();

        MockFilterChain filterChain = new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) {
                mdcValue.set(MDC.get(CorrelationIdFilter.MDC_KEY));
            }
        };

        correlationIdFilter.doFilter(request, response, filterChain);

        String resultHeader = response.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER);
        assertNotEquals(maliciousHeader, resultHeader, "Malicious header must not be echoed back");
        assertNotNull(resultHeader);
        assertTrue(resultHeader.matches("^[a-zA-Z0-9-]{10,}$"), "Sanitized correlationId must be a valid token/UUID");
        assertEquals(resultHeader, mdcValue.get());
    }

    @Test
    @DisplayName("8.4 Observability: /health endpoint returns HTTP 200 with sanitized status")
    void testHealthEndpoint_sanitizedStatus() {
        var responseEntity = healthController.checkHealth();
        assertEquals(200, responseEntity.getStatusCode().value());

        ApiResponse<Map<String, Object>> body = responseEntity.getBody();
        assertNotNull(body);
        assertTrue(body.success());
        assertEquals("UP", body.data().get("status"));
        assertEquals("SmartWard AI Backend", body.data().get("application"));
        assertNull(body.data().get("jvmMemory"), "JVM internal memory metrics must remain unexposed (SEC-03)");
    }

    @Test
    @DisplayName("8.3 Infrastructure Hardening: docker-compose.yml does not expose ai-sidecar host port")
    void testDockerCompose_sidecarPortNotExposed() throws IOException {
        File dcFile = new File("../docker-compose.yml");
        if (!dcFile.exists()) {
            dcFile = new File("docker-compose.yml");
        }
        assertTrue(dcFile.exists(), "docker-compose.yml must exist");
        String content = Files.readString(dcFile.toPath());

        // Under ai-sidecar service, port 8000:8000 must not be published to host
        int sidecarIdx = content.indexOf("  ai-sidecar:");
        assertTrue(sidecarIdx > 0, "ai-sidecar service must be present");
        int backendIdx = content.indexOf("  backend:", sidecarIdx);
        assertTrue(backendIdx > sidecarIdx, "backend service must follow ai-sidecar");

        String sidecarBlock = content.substring(sidecarIdx, backendIdx);
        assertFalse(sidecarBlock.contains("8000:8000"),
                "ai-sidecar must not publish port 8000 to the host network (8.3 SEC-07)");
        assertTrue(sidecarBlock.contains("smartward-internal"),
                "ai-sidecar must be connected to internal network");
    }

    @Test
    @DisplayName("8.3 Nginx Hardening: nginx.conf includes essential security headers and 10M body limit")
    void testNginx_securityHeadersConfigured() throws IOException {
        File nginxFile = new File("../frontend/nginx.conf");
        if (!nginxFile.exists()) {
            nginxFile = new File("frontend/nginx.conf");
        }
        assertTrue(nginxFile.exists(), "frontend/nginx.conf must exist");
        String content = Files.readString(nginxFile.toPath());

        assertTrue(content.contains("X-Content-Type-Options \"nosniff\""), "Missing nosniff header");
        assertTrue(content.contains("X-Frame-Options \"DENY\""), "Missing X-Frame-Options header");
        assertTrue(content.contains("Referrer-Policy"), "Missing Referrer-Policy header");
        assertTrue(content.contains("Content-Security-Policy"), "Missing CSP header");
        assertTrue(content.contains("client_max_body_size 10M"), "client_max_body_size must be configured to 10M");
    }

    @Test
    @DisplayName("8.5 Backup & Restore: Shell and PowerShell backup scripts exist")
    void testBackupScripts_exist() {
        File backupSh = new File("../scripts/backup_db.sh");
        File restoreSh = new File("../scripts/restore_db.sh");
        File backupPs = new File("../scripts/backup_db.ps1");
        File restorePs = new File("../scripts/restore_db.ps1");

        assertTrue(backupSh.exists() || new File("scripts/backup_db.sh").exists(), "scripts/backup_db.sh must exist");
        assertTrue(restoreSh.exists() || new File("scripts/restore_db.sh").exists(), "scripts/restore_db.sh must exist");
        assertTrue(backupPs.exists() || new File("scripts/backup_db.ps1").exists(), "scripts/backup_db.ps1 must exist");
        assertTrue(restorePs.exists() || new File("scripts/restore_db.ps1").exists(), "scripts/restore_db.ps1 must exist");
    }
}
