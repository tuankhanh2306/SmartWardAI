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

    @GetMapping("/track")
    @Operation(summary = "Tra cứu tiến độ hồ sơ bằng mã hồ sơ và 4 số cuối CCCD")
    public ResponseEntity<ApiResponse<DossierTrackingResponse>> trackDossier(
            @RequestParam String dossierCode,
            @RequestParam(required = false) String last4Cccd,
            @RequestParam(required = false) String citizenCccd) {
        log.info("Tracking dossier: code='{}', last4Cccd='{}', citizenCccd='{}'",
                dossierCode, last4Cccd, citizenCccd);
        DossierTrackingResponse response = dossierService.trackDossier(dossierCode, last4Cccd, citizenCccd);
        return ResponseEntity.ok(ApiResponse.ok("Tra cứu hồ sơ thành công.", response));
    }

    @GetMapping("/officer/list")
    @Operation(summary = "Danh sách hồ sơ nộp trực tuyến dành cho Cán bộ Một Cửa thụ lý")
    public ResponseEntity<ApiResponse<List<OfficerDossierDto>>> getOfficerDossiers(
            @RequestParam(required = false) String wardCode,
            @RequestParam(required = false) String status) {
        log.info("Officer fetching dossiers: wardCode='{}', status='{}'", wardCode, status);
        List<OfficerDossierDto> list = dossierService.getOfficerDossiers(wardCode, status);
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
