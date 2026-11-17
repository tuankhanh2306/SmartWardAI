package vn.edu.uth.smartward.common;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
@Tag(name = "Health Check", description = "Kiểm tra trạng thái hoạt động của hệ thống SmartWard AI")
public class HealthController {

    @GetMapping
    @Operation(summary = "Kiểm tra sức khỏe hệ thống (Health check)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkHealth() {
        // SEC-03: Sanitize /health - minimal public surface, no author metadata or JVM internal memory metrics
        Map<String, Object> status = Map.of(
                "application", "SmartWard AI Backend",
                "status", "UP"
        );
        return ResponseEntity.ok(ApiResponse.ok("SmartWard AI Backend is running smoothly", status));
    }
}
