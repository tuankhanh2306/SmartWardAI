package vn.edu.uth.smartward.evaluation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.OffsetDateTime;

/**
 * Unified Comprehensive Benchmark Evaluation Report across all 4 modules.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Báo cáo Tổng hợp Đo lường Thực nghiệm Khoa học Đề tài Tốt nghiệp UTH")
public class FullBenchmarkReport {

    @Schema(description = "Tên đề tài nghiên cứu", example = "SmartWard AI - Administrative Support & Civic Triage")
    private String projectTitle;

    @Schema(description = "Đơn vị thực hiện", example = "Trường Đại học Giao thông vận tải TP.HCM (UTH)")
    private String institution;

    @Schema(description = "Thời điểm thực thi kiểm định thực nghiệm")
    private OffsetDateTime executedAt;

    @Schema(description = "Kết quả kiểm định Phân hệ 1: Legal RAG & Abstention Guardrail (80 câu hỏi)")
    private RagBenchmarkResult ragBenchmark;

    @Schema(description = "Kết quả kiểm định Phân hệ 2: Form Rule Engine (40 biểu mẫu Mẫu CT01)")
    private FormBenchmarkResult formBenchmark;

    @Schema(description = "Kết quả kiểm định Phân hệ 3: Two-Stage Spatial-Semantic Triage (150 phản ánh)")
    private TriageBenchmarkResult triageBenchmark;

    @Schema(description = "Tổng kết khoa học và kết luận bảo vệ đồ án")
    private String scientificConclusion;
}
