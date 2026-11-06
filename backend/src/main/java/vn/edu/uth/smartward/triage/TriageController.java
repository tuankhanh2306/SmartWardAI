package vn.edu.uth.smartward.triage;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.triage.dto.CivicReportRequest;
import vn.edu.uth.smartward.triage.dto.CivicReportResponse;
import vn.edu.uth.smartward.triage.dto.IssueClusterDto;

import java.util.List;

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

        log.info("Received civic issue report: category='{}', coords=[{}, {}]",
                request.getCategory(), request.getLatitude(), request.getLongitude());

        CivicReportResponse response = triageService.processReport(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/clusters")
    @Operation(
            summary = "Lấy danh sách các cụm sự cố hiện trường phục vụ bản đồ cán bộ UBND",
            description = "Truy vấn danh sách cụm sự cố phục vụ hiển thị lớp bản đồ số (GIS) tại bàn làm việc cán bộ, " +
                          "hỗ trợ lọc theo trạng thái xử lý (OPEN, IN_PROGRESS, RESOLVED) và lĩnh vực sự cố."
    )
    public ResponseEntity<ApiResponse<List<IssueClusterDto>>> getClusters(
            @Parameter(description = "Trạng thái cụm sự cố (mặc định: OPEN)")
            @RequestParam(value = "status", defaultValue = "OPEN") String status,

            @Parameter(description = "Lĩnh vực sự cố cần lọc (ROAD_DAMAGE, FLOODING, GARBAGE...)")
            @RequestParam(value = "category", required = false) String category) {

        List<IssueClusterDto> clusters = triageService.getActiveClusters(status, category);
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
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String newStatus = (body != null && body.containsKey("status")) ? body.get("status") : "RESOLVED";
        IssueClusterDto updated = triageService.updateClusterStatus(clusterCode, newStatus);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }
}
