package vn.edu.uth.smartward.dossier;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.dossier.dto.*;
import vn.edu.uth.smartward.security.OfficerAuthService;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/dossiers")
@RequiredArgsConstructor
@Tag(name = "Citizen Dossiers", description = "Quản lý & Tiếp nhận hồ sơ trực tuyến cấp xã")
public class CitizenDossierController {

    private final CitizenDossierService dossierService;

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
        String clientIp = extractClientIp(request);
        log.info("SEC-04: Tracking dossier via POST: code='{}', clientIp='{}'", req.dossierCode(), clientIp);
        DossierTrackingResponse response = dossierService.trackDossier(req.dossierCode(), req.last4Cccd(), clientIp);
        return ResponseEntity.ok(ApiResponse.ok("Tra cứu hồ sơ thành công.", response));
    }

    @GetMapping("/track")
    @Operation(summary = "Tra cứu tiến độ hồ sơ (hỗ trợ tương thích ngược qua GET query params)")
    public ResponseEntity<ApiResponse<DossierTrackingResponse>> trackDossierGet(
            @RequestParam String dossierCode,
            @RequestParam(required = false) String last4Cccd,
            @RequestParam(required = false) String citizenCccd,
            HttpServletRequest request) {
        String clientIp = extractClientIp(request);
        String effectiveLast4 = (last4Cccd != null && !last4Cccd.isBlank())
                ? last4Cccd
                : (citizenCccd != null && citizenCccd.trim().length() >= 4
                    ? citizenCccd.trim().substring(citizenCccd.trim().length() - 4)
                    : null);
        log.info("SEC-04: Tracking dossier via GET alias: code='{}', clientIp='{}'", dossierCode, clientIp);
        DossierTrackingResponse response = dossierService.trackDossier(dossierCode, effectiveLast4, clientIp);
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

        // SEC-09 & 5.3: Ward scope isolation - server strictly enforces principal's wardCode (ADMIN can query any ward)
        String effectiveWardCode;
        if (principal != null && !"ADMIN".equalsIgnoreCase(principal.role()) && principal.wardCode() != null && !principal.wardCode().isBlank()) {
            effectiveWardCode = principal.wardCode().trim();
            if (wardCode != null && !wardCode.isBlank() && !wardCode.equalsIgnoreCase(effectiveWardCode)) {
                log.warn("SEC-09: Client attempted to override officer wardCode '{}' with '{}'. Enforcing principal wardCode.",
                        effectiveWardCode, wardCode);
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

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return "127.0.0.1";
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }
}
