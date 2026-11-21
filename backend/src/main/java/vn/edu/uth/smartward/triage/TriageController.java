package vn.edu.uth.smartward.triage;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.security.OfficerAuthService.OfficerPrincipal;
import vn.edu.uth.smartward.triage.dto.CivicReportRequest;
import vn.edu.uth.smartward.triage.dto.CivicReportResponse;
import vn.edu.uth.smartward.triage.dto.IssueClusterDto;

import java.util.List;
import java.util.Locale;

/**
 * REST Controller for Civic Incident Reporting and Spatial-Semantic Triage.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/issues")
@RequiredArgsConstructor
@Tag(name = "Civic Triage", description = "Phân luồng và Gom cụm Phản ánh Hiện trường Đô thị 2 Pha (Redis GEO + pgvector)")
public class TriageController {

    private final TwoStageTriageService triageService;

    @PostMapping("/report")
    @Operation(
            summary = "Gửi phản ánh hiện trường (Hạ tầng, Ngập nước, Rác thải, Chiếu sáng)",
            description = "Tiếp nhận phản ánh từ công dân, kích hoạt Pha 1 (Lọc không gian Redis GEO trong bán kính R mét) " +
                          "và Pha 2 (So khớp nghiệp vụ cùng lĩnh vực & đo độ tương đồng Cosine ngữ nghĩa >= tau). " +
                          "Tự động gộp phản ánh trùng lặp vào cụm sẵn có hoặc khởi tạo cụm sự cố mới."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Tiếp nhận và phân luồng thành công"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Dữ liệu phản ánh không hợp lệ (tọa độ ngoài phạm vi, thiếu mô tả)")
    })
    public ResponseEntity<ApiResponse<CivicReportResponse>> reportIssue(
            @Valid @RequestBody CivicReportRequest request) {

        double coarseLat = request.getLatitude() != null ? request.getLatitude().doubleValue() : 0.0;
        double coarseLon = request.getLongitude() != null ? request.getLongitude().doubleValue() : 0.0;
        log.info("Received civic issue report: category='{}', coarseCoords=[{}, {}]",
                request.getCategory(),
                String.format(Locale.US, "%.3f", coarseLat),
                String.format(Locale.US, "%.3f", coarseLon));

        CivicReportResponse response = triageService.processReport(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/clusters")
    @Operation(
            summary = "Lấy danh sách cụm sự cố công khai (tọa độ làm tròn 3 chữ số thập phân, ẩn thông tin nhạy cảm)",
            description = "Phục vụ hiển thị cụm sự cố công khai cho người dân; tọa độ được làm tròn 3 chữ số thập phân (%.3f) " +
                          "và loại bỏ hoàn toàn addressText, locationAccuracyM, locationSource."
    )
    public ResponseEntity<ApiResponse<List<IssueClusterDto>>> getClusters(
            @Parameter(description = "Trạng thái cụm sự cố (mặc định: OPEN)")
            @RequestParam(value = "status", defaultValue = "OPEN") String status,

            @Parameter(description = "Lĩnh vực sự cố cần lọc (ROAD_DAMAGE, FLOODING, ENVIRONMENT, LIGHTING_ELECTRICAL, ORDER_SECURITY)")
            @RequestParam(value = "category", required = false) String category) {

        List<IssueClusterDto> publicClusters = triageService.getActiveClusters(status, category).stream()
                .map(TwoStageTriageService::sanitizeForPublic)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(publicClusters));
    }

    @GetMapping("/officer/clusters")
    @Operation(
            summary = "Lấy danh sách cụm sự cố chi tiết cho Cán bộ UBND (lọc theo địa bàn xã/phường)",
            description = "Yêu cầu xác thực cán bộ (ROLE_OFFICER). Trả về tọa độ chi tiết, địa chỉ, nguồn vị trí và sai số, " +
                          "chỉ bao gồm các cụm thuộc đơn vị hành chính của cán bộ."
    )
    public ResponseEntity<ApiResponse<List<IssueClusterDto>>> getOfficerClusters(
            @RequestParam(value = "status", defaultValue = "OPEN") String status,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "wardCode", required = false) String requestedWardCode,
            HttpServletRequest httpRequest) {

        OfficerPrincipal principal = (OfficerPrincipal) httpRequest.getAttribute("officerPrincipal");
        if (principal == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Yêu cầu xác thực cán bộ.");
        }
        if ("ADMIN".equalsIgnoreCase(principal.role())) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "Quản trị viên không truy cập trực tiếp bàn làm việc sự cố cấp xã.");
        }
        if (requestedWardCode != null && !requestedWardCode.isBlank()
                && principal.wardCode() != null && !principal.wardCode().isBlank()
                && !requestedWardCode.trim().equalsIgnoreCase(principal.wardCode().trim())) {
            log.warn("SEC-09: Officer '{}' of ward '{}' attempted cross-ward cluster query for '{}'. Blocking with 403.",
                    principal.badgeId(), principal.wardCode(), requestedWardCode.trim());
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "SEC-09: Cán bộ thuộc đơn vị " + principal.wardCode() + " không được xem cụm sự cố chi tiết của đơn vị " + requestedWardCode.trim() + ".");
        }

        List<IssueClusterDto> clusters = triageService.getOfficerClusters(status, category, principal.wardCode());
        return ResponseEntity.ok(ApiResponse.ok(clusters));
    }

    @PostMapping("/clusters/rebuild-index")
    @Operation(
            summary = "Đồng bộ và phục hồi chỉ mục không gian Redis GEO từ PostgreSQL",
            description = "Nạp lại toàn bộ tọa độ các cụm sự cố đang hoạt động (OPEN, IN_PROGRESS) trong 72 giờ gần nhất từ PostgreSQL lên Redis GEO " +
                          "nhằm đảm bảo khả năng chịu lỗi (Fault Tolerance) khi Redis khởi động lại."
    )
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> rebuildSpatialIndex() {
        int count = triageService.warmUpSpatialIndexFromDatabase();
        return ResponseEntity.ok(ApiResponse.ok(java.util.Map.of(
                "reindexedClusters", count,
                "status", "SYNCHRONIZED"
        )));
    }

    @PatchMapping("/clusters/{clusterCode}/status")
    @Operation(
            summary = "Cập nhật trạng thái cụm sự cố hiện trường (OPEN, IN_PROGRESS, RESOLVED)",
            description = "Khi cán bộ Một cửa đánh dấu sự cố là RESOLVED, cụm sự cố tự động được loại bỏ khỏi Redis GEO index."
    )
    public ResponseEntity<ApiResponse<IssueClusterDto>> updateClusterStatus(
            @PathVariable("clusterCode") String clusterCode,
            @RequestBody(required = false) java.util.Map<String, String> body,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        vn.edu.uth.smartward.security.OfficerAuthService.OfficerPrincipal principal =
                (vn.edu.uth.smartward.security.OfficerAuthService.OfficerPrincipal) httpRequest.getAttribute("officerPrincipal");
        if (principal != null) {
            log.info("SEC-09: Officer '{}' from ward '{}' updating cluster '{}' status",
                    principal.badgeId(), principal.wardCode(), clusterCode);
        }
        String newStatus = (body != null && body.containsKey("status")) ? body.get("status") : "RESOLVED";
        IssueClusterDto updated = triageService.updateClusterStatus(clusterCode, newStatus);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }
}
