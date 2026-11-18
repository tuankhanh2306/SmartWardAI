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

    @Autowired
    public CitizenDossierController(CitizenDossierService dossierService,
                                    @Autowired(required = false) ClientIpResolver clientIpResolver) {
        this.dossierService = dossierService;
        this.clientIpResolver = clientIpResolver != null ? clientIpResolver : new ClientIpResolver();
    }

    public CitizenDossierController(CitizenDossierService dossierService) {
        this(dossierService, new ClientIpResolver());
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
            HttpServletRequest request) {
        String clientIp = clientIpResolver.resolve(request);
        log.info("SEC-04: Tracking dossier via POST: code='{}', clientIp='{}'", req.dossierCode(), clientIp);
        DossierTrackingResponse response = dossierService.trackDossier(req.dossierCode(), req.last4Cccd(), clientIp);
        return ResponseEntity.ok(ApiResponse.ok("Tra cứu hồ sơ thành công.", response));
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
