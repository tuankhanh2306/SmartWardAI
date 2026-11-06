package vn.edu.uth.smartward.triage.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

/**
 * Triage result returned after spatial-semantic clustering.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Kết quả phân luồng và gom cụm phản ánh hiện trường 2 pha")
public class CivicReportResponse {

    @Schema(description = "Mã biên nhận phản ánh của công dân", example = "RPT_20261104_123456_A1B2")
    private String reportCode;

    @Schema(description = "Mã cụm sự cố được gán vào", example = "CLUST_20261104_001")
    private String clusterCode;

    @Schema(description = "Phản ánh này tạo cụm mới hay gộp vào cụm đã có", example = "false")
    private boolean newCluster;

    @Schema(description = "Lĩnh vực sự cố được phân loại", example = "ROAD_DAMAGE")
    private String category;

    @Schema(description = "Tổng số lượt công dân đã phản ánh về cụm sự cố này", example = "4")
    private int clusterReportCount;

    @Schema(description = "Khoảng cách địa lý từ vị trí phản ánh đến tâm cụm (mét)", example = "4.5")
    private Double distanceToCenterMeters;

    @Schema(description = "Độ tương đồng ngữ nghĩa Cosine Similarity với tâm cụm", example = "0.895")
    private Double similarityScore;

    @Schema(description = "Thông báo kết quả phân luồng cho công dân")
    private String message;

    @Schema(description = "Số điện thoại liên hệ của người dân báo tin khẩn")
    private String reporterPhone;

    @Schema(description = "Địa chỉ hiện trường đã ghi nhận")
    private String addressText;

    @Schema(description = "Đơn vị xã/phường nhận bàn giao theo vị trí trên ô")
    private String targetWardName;
}
