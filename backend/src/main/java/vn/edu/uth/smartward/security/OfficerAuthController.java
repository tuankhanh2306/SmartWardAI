package vn.edu.uth.smartward.security;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.uth.smartward.common.ApiResponse;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth/officer")
@RequiredArgsConstructor
public class OfficerAuthController {

    private final OfficerAuthService officerAuthService;

    public record OfficerLoginRequest(
            @NotBlank(message = "Mã công chức không được để trống") String badgeId,
            @NotBlank(message = "Mã PIN không được để trống") String pin,
            String wardCode
    ) {}

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<OfficerAuthService.LoginResponse>> login(
            @Valid @RequestBody OfficerLoginRequest request) {
        OfficerAuthService.LoginResponse response = officerAuthService.authenticate(
                request.badgeId(),
                request.pin(),
                request.wardCode()
        );
        return ResponseEntity.ok(ApiResponse.ok("Xác thực cán bộ thành công.", response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<OfficerAuthService.OfficerPrincipal>> currentOfficer(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        OfficerAuthService.OfficerPrincipal principal = officerAuthService.verifyToken(authorization);
        return ResponseEntity.ok(ApiResponse.ok("Phiên làm việc cán bộ hợp lệ.", principal));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Map<String, Object>>> logout(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        officerAuthService.revokeToken(authorization);
        return ResponseEntity.ok(ApiResponse.ok("Đã đăng xuất phiên cán bộ.", Map.of("revoked", true)));
    }
}
