package vn.edu.uth.smartward.evaluation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

/**
 * Benchmark evaluation metrics for Module 3: Two-Stage Spatial-Semantic Triage.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Kết quả đánh giá thực nghiệm Phân hệ Phân luồng Hiện trường 2 Pha")
public class TriageBenchmarkResult {

    @Schema(description = "Tổng số báo cáo hiện trường đánh giá", example = "150")
    private int totalReports;

    @Schema(description = "Số cụm sự cố gốc được mô phỏng", example = "30")
    private int totalOriginalEvents;

    @Schema(description = "Số lượng ca biên khó (Hard evaluation cases)", example = "25")
    private int hardCasesCount;

    @Schema(description = "Độ chính xác gom cụm tổng thể (Clustering Accuracy)", example = "96.67%")
    private String overallClusteringAccuracy;

    @Schema(description = "Độ chính xác phân tách các sự cố khác danh mục cùng vị trí (Colocated Separation Rate)", example = "100.0%")
    private String colocatedSeparationRate;

    @Schema(description = "Độ chính xác phân tách các sự cố cùng danh mục ở xa (Distant Separation Rate)", example = "100.0%")
    private String distantSeparationRate;

    @Schema(description = "Thời gian xử lý trung bình mỗi phản ánh (mili-giây)", example = "4.2")
    private double averageProcessingTimeMs;
}
