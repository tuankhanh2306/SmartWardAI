package vn.edu.uth.smartward.triage.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Incident cluster DTO for ward officer map view and dashboard.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Thông tin cụm sự cố hiện trường phục vụ bản đồ cán bộ UBND")
public class IssueClusterDto {

    @Schema(description = "ID cụm sự cố", example = "1")
    private Long id;

    @Schema(description = "Mã định danh cụm sự cố", example = "CLUST_20261104_001")
    private String clusterCode;

    @Schema(description = "Lĩnh vực sự cố (ROAD_DAMAGE, FLOODING, GARBAGE...)", example = "ROAD_DAMAGE")
    private String category;

    @Schema(description = "Tiêu đề tóm tắt sự cố", example = "Đoạn trước số 15 Võ Oanh có ổ gà khá sâu")
    private String title;

    @Schema(description = "Tọa độ vĩ độ tâm cụm", example = "10.8035600")
    private BigDecimal centerLatitude;

    @Schema(description = "Tọa độ kinh độ tâm cụm", example = "106.7142160")
    private BigDecimal centerLongitude;

    @Schema(description = "Số lượng phản ánh trùng lặp đã gộp vào cụm", example = "5")
    private Integer reportCount;

    @Schema(description = "Trạng thái xử lý (OPEN, IN_PROGRESS, RESOLVED)", example = "OPEN")
    private String status;

    @Schema(description = "Thời điểm nhận phản ánh đầu tiên")
    private OffsetDateTime firstReportedAt;

    @Schema(description = "Thời điểm nhận phản ánh gần nhất")
    private OffsetDateTime lastReportedAt;
}
