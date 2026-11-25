package vn.edu.uth.smartward.triage.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

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

    @Schema(description = "Lĩnh vực sự cố (ROAD_DAMAGE, FLOODING, ENVIRONMENT, LIGHTING_ELECTRICAL, ORDER_SECURITY)", example = "ROAD_DAMAGE")
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

    @Schema(description = "Địa chỉ hiện trường đại diện")
    private String addressText;

    @Schema(description = "Nguồn gốc tọa độ (GPS, PIN_DRAGGED, MANUAL)")
    private String locationSource;

    @Schema(description = "Sai số định vị (m)")
    private Double locationAccuracyM;

    @Schema(description = "Mã đơn vị hành chính cấp xã/phường", example = "AG_P_LONGXUYEN")
    private String wardCode;

    @Schema(description = "Thời điểm nhận phản ánh đầu tiên")
    private OffsetDateTime firstReportedAt;

    @Schema(description = "Thời điểm nhận phản ánh gần nhất")
    private OffsetDateTime lastReportedAt;

    @Schema(description = "Danh sách đường dẫn xem ảnh hiện trường dành riêng cho Cán bộ UBND (bị xóa sạch ở API công khai)")
    private List<String> photoUrls;

    @Schema(description = "Tổng số ảnh hiện trường đính kèm trong cụm (0 ở API công khai)")
    private Integer photoCount;

    @Schema(description = "Danh sách phản ánh con trong cụm (chỉ trả về cho Cán bộ UBND)")
    private List<ClusterReportItem> reports;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ClusterReportItem {
        private String reportCode;
        private String description;
        private OffsetDateTime submittedAt;
        private List<String> photoUrls;
    }
}
