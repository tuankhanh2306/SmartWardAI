package vn.edu.uth.smartward.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.common.ClientIpResolver;

import java.util.Map;

@RestController
@RequestMapping({"/api/v1/auth/officer", "/api/v1/officer", "/api/v1/auth"})
public class OfficerAuthController {

    private final OfficerAuthService officerAuthService;
    private final ClientIpResolver clientIpResolver;

    @Autowired
    public OfficerAuthController(OfficerAuthService officerAuthService,
                                 @Autowired(required = false) ClientIpResolver clientIpResolver) {
        this.officerAuthService = officerAuthService;
        this.clientIpResolver = clientIpResolver != null ? clientIpResolver : new ClientIpResolver();
    }

    public OfficerAuthController(OfficerAuthService officerAuthService) {
        this(officerAuthService, new ClientIpResolver());
    }

    public record OfficerLoginRequest(
            @NotBlank(message = "Mã công chức không được để trống") String badgeId,
            @NotBlank(message = "Mã PIN không được để trống") String pin,
            String wardCode
    ) {}

    public record OfficerChangePinRequest(
            @NotBlank(message = "Mã công chức không được để trống") String badgeId,
            @NotBlank(message = "Mã PIN hiện tại không được để trống") String currentPin,
            @NotBlank(message = "Mã PIN mới không được để trống") String newPin,
            @NotBlank(message = "Xác nhận mã PIN mới không được để trống") String confirmPin
    ) {}

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<OfficerAuthService.LoginResponse>> login(
            @Valid @RequestBody OfficerLoginRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = clientIpResolver.resolve(httpRequest);
        OfficerAuthService.LoginResponse response = officerAuthService.authenticate(
                request.badgeId(),
                request.pin(),
                request.wardCode(),
                clientIp
        );
        return ResponseEntity.ok(ApiResponse.ok("Xác thực cán bộ thành công.", response));
    }

    @PostMapping("/change-pin")
    public ResponseEntity<ApiResponse<OfficerAuthService.ChangePinResponse>> changePin(
            @Valid @RequestBody OfficerChangePinRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            HttpServletRequest httpRequest) {
        String clientIp = clientIpResolver.resolve(httpRequest);
        OfficerAuthService.ChangePinResponse response = officerAuthService.changePin(
                request.badgeId(),
                request.currentPin(),
                request.newPin(),
                request.confirmPin(),
                authorization,
                clientIp
        );
        return ResponseEntity.ok(ApiResponse.ok("Đổi mã PIN cán bộ thành công.", response));
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
