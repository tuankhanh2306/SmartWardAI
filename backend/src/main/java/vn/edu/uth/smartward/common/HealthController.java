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
        Map<String, Object> status = Map.of(
                "application", "SmartWard AI Backend",
                "status", "UP",
                "institution", "Trường Đại học Giao thông vận tải TP.HCM (UTH)",
                "author", "Nguyễn Minh Tuấn Khánh",
                "serverTime", Instant.now().toString(),
                "jvmMemoryFreeMb", Runtime.getRuntime().freeMemory() / (1024 * 1024),
                "jvmMemoryTotalMb", Runtime.getRuntime().totalMemory() / (1024 * 1024)
        );
        return ResponseEntity.ok(ApiResponse.ok("SmartWard AI Backend is running smoothly", status));
    }
}
