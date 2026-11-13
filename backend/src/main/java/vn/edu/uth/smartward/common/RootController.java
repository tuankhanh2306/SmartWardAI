package vn.edu.uth.smartward.common;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Root and Health Entrypoint for Cloud Load Balancers, Pingers, and Direct Browser Visits.
 */
@RestController
@Tag(name = "Root & System Entry", description = "Thông tin trạng thái máy chủ SmartWard AI")
public class RootController {

    @GetMapping(value = {"/", "/health"})
    @Operation(summary = "Thông tin chào đón và trạng thái hệ thống")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRootInfo() {
        Map<String, Object> info = Map.of(
                "application", "SmartWard AI Backend API",
                "status", "UP",
                "version", "1.0.0",
                "institution", "Trường Đại học Giao thông vận tải TP.HCM (UTH)",
                "author", "Nguyễn Minh Tuấn Khánh",
                "apiDocs", "/swagger-ui.html",
                "frontendUrl", "https://smartward-frontend-production.up.railway.app",
                "serverTime", Instant.now().toString()
        );
        return ResponseEntity.ok(ApiResponse.ok("SmartWard AI Backend API is active and operational", info));
    }
}
