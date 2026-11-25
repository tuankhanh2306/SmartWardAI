package vn.edu.uth.smartward.dossier;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.common.ClientIpResolver;
import vn.edu.uth.smartward.dossier.dto.*;
import vn.edu.uth.smartward.security.OfficerAuthService;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/dossiers")
public class CitizenDossierController {

    private final CitizenDossierService dossierService;
    private final ClientIpResolver clientIpResolver;
    private final OfficerAuthService officerAuthService;

    @Autowired
    public CitizenDossierController(CitizenDossierService dossierService,
                                    @Autowired(required = false) ClientIpResolver clientIpResolver,
                                    @Autowired(required = false) OfficerAuthService officerAuthService) {
        this.dossierService = dossierService;
        this.clientIpResolver = clientIpResolver != null ? clientIpResolver : new ClientIpResolver();
        this.officerAuthService = officerAuthService;
    }

    public CitizenDossierController(CitizenDossierService dossierService,
                                    ClientIpResolver clientIpResolver) {
        this(dossierService, clientIpResolver, null);
    }

    public CitizenDossierController(CitizenDossierService dossierService) {
        this(dossierService, new ClientIpResolver(), null);
    }

    @PostMapping
    @Operation(summary = "Nộp hồ sơ trực tuyến vào cơ sở dữ liệu PostgreSQL")
    public ResponseEntity<ApiResponse<DossierSubmissionResponse>> submitDossier(
            @Valid @RequestBody SubmitDossierRequest req) {
        log.info("Received dossier submission request: procedureCode={}, wardCode={}",
                req.procedureCode(), req.wardCode());
        DossierSubmissionResponse response = dossierService.submitDossier(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("DOSSIER_SUBMITTED", response));
    }

    @PostMapping("/track")
    @Operation(summary = "SEC-04: Tra cứu tiến độ hồ sơ an toàn qua POST body với 4 số cuối CCCD")
    public ResponseEntity<ApiResponse<DossierTrackingResponse>> trackDossier(
            @Valid @RequestBody DossierTrackingRequest req,
            @RequestHeader(value = "X-Session-Id", required = false) String sessionId,
            HttpServletRequest request) {
        String clientIp = clientIpResolver.resolve(request);
        String officerBadgeId = resolveOfficerBadgeId(request);
        log.info("SEC-04: Tracking dossier via POST: code='{}', clientIp='{}', officer='{}', hasSession={}",
                req.dossierCode(), clientIp, officerBadgeId != null ? officerBadgeId : "-",
                sessionId != null && !sessionId.isBlank());
        boolean hasActorOverride = (officerBadgeId != null && !officerBadgeId.isBlank())
                || (sessionId != null && !sessionId.isBlank());
        DossierTrackingResponse response = hasActorOverride
                ? dossierService.trackDossier(req.dossierCode(), req.last4Cccd(), clientIp, officerBadgeId, sessionId)
                : dossierService.trackDossier(req.dossierCode(), req.last4Cccd(), clientIp);
        return ResponseEntity.ok(ApiResponse.ok("Tra cứu hồ sơ thành công.", response));
    }

    private String resolveOfficerBadgeId(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        Object attr = request.getAttribute("officerPrincipal");
        if (attr instanceof OfficerAuthService.OfficerPrincipal principal && principal.badgeId() != null && !principal.badgeId().isBlank()) {
            return principal.badgeId();
        }
        if (officerAuthService != null) {
            return officerAuthService.tryVerifyToken(request.getHeader("Authorization"))
                    .map(OfficerAuthService.OfficerPrincipal::badgeId)
                    .orElse(null);
        }
        return null;
    }

    @GetMapping("/officer/list")
    @Operation(summary = "Danh sách hồ sơ nộp trực tuyến dành cho Cán bộ Một Cửa thụ lý")
    public ResponseEntity<ApiResponse<List<OfficerDossierDto>>> getOfficerDossiers(
            @RequestParam(required = false) String wardCode,
            @RequestParam(required = false) String status,
            HttpServletRequest request) {
        OfficerAuthService.OfficerPrincipal principal =
                (OfficerAuthService.OfficerPrincipal) request.getAttribute("officerPrincipal");

        // SEC-09 & 5.3: Strict Ward Scope Isolation - Officer of Ward A querying Ward B returns 403 FORBIDDEN
        String effectiveWardCode;
        if (principal != null) {
            if ("ADMIN".equalsIgnoreCase(principal.role())) {
                throw new vn.edu.uth.smartward.common.BusinessException(
                        vn.edu.uth.smartward.common.ErrorCode.FORBIDDEN,
                        "Quản trị viên không truy cập trực tiếp bàn làm việc cán bộ cấp xã. Vui lòng dùng cổng giám sát chỉ đọc /api/v1/admin/wards/{wardCode}/overview."
                );
            }
            if (principal.wardCode() != null && !principal.wardCode().isBlank()) {
                effectiveWardCode = principal.wardCode().trim();
                if (wardCode != null && !wardCode.isBlank() && !wardCode.trim().equalsIgnoreCase(effectiveWardCode)) {
                    log.warn("SEC-09: Officer '{}' of ward '{}' attempted cross-ward dossier query for '{}'. Blocking with 403.",
                            principal.badgeId(), effectiveWardCode, wardCode);
                    throw new vn.edu.uth.smartward.common.BusinessException(
                            vn.edu.uth.smartward.common.ErrorCode.FORBIDDEN,
                            "SEC-09: Cán bộ thuộc đơn vị " + effectiveWardCode + " không có quyền truy cập dữ liệu hồ sơ của đơn vị " + wardCode.trim() + "."
                    );
                }
            } else {
                effectiveWardCode = (wardCode != null && !wardCode.isBlank()) ? wardCode.trim() : null;
            }
        } else {
            effectiveWardCode = (wardCode != null && !wardCode.isBlank()) ? wardCode.trim() : null;
        }

        log.info("Officer fetching dossiers: effectiveWardCode='{}', status='{}'", effectiveWardCode, status);
        List<OfficerDossierDto> list = dossierService.getOfficerDossiers(effectiveWardCode, status);
        return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách hồ sơ thành công.", list));
    }

    @GetMapping("/officer/by-qr")
    @Operation(summary = "MOB-0.5: Tra cứu hồ sơ công dân tại quầy bằng mã QR phiếu hẹn (SMARTWARD_PASS|HS-...|LH-...)")
    public ResponseEntity<ApiResponse<OfficerDossierDto>> lookupOfficerDossierByQr(
            @RequestParam("code") String code,
            HttpServletRequest request) {
        OfficerAuthService.OfficerPrincipal principal =
                (OfficerAuthService.OfficerPrincipal) request.getAttribute("officerPrincipal");
        log.info("MOB-0.5: Officer QR pass lookup requested: code='{}'", code);
        OfficerDossierDto dto = dossierService.lookupOfficerDossierByQr(code, principal);
        return ResponseEntity.ok(ApiResponse.ok("Tra cứu hồ sơ theo mã QR thành công.", dto));
    }

    @PutMapping("/{dossierCode}/review")
    @Operation(summary = "Cán bộ phê duyệt tiếp nhận, yêu cầu bổ sung hoặc từ chối hồ sơ")
    public ResponseEntity<ApiResponse<OfficerDossierDto>> reviewDossier(
            @PathVariable String dossierCode,
            @RequestBody OfficerReviewRequest req,
            HttpServletRequest request) {
        log.info("Officer reviewing dossier: code='{}', status='{}'", dossierCode, req.getEffectiveStatus());
        OfficerAuthService.OfficerPrincipal principal =
                (OfficerAuthService.OfficerPrincipal) request.getAttribute("officerPrincipal");

        CitizenDossier updated = dossierService.reviewDossier(dossierCode, req, principal);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật trạng thái hồ sơ thành công.",
                dossierService.mapToOfficerDto(updated)));
    }
}
