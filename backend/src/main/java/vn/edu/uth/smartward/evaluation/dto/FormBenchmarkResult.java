package vn.edu.uth.smartward.evaluation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

/**
 * Benchmark evaluation metrics for Module 2: Deterministic Form Rule Engine.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Kết quả đánh giá thực nghiệm Động cơ Quy tắc Biểu mẫu Hành chính")
public class FormBenchmarkResult {

    @Schema(description = "Tổng số biểu mẫu kiểm định (40 tờ khai Mẫu CT01)", example = "40")
    private int totalForms;

    @Schema(description = "Số tờ khai in (Printed)", example = "20")
    private int printedCount;

    @Schema(description = "Số tờ khai viết tay (Handwritten)", example = "20")
    private int handwrittenCount;

    @Schema(description = "Số tờ khai chuẩn hợp lệ đối chứng (Valid control)", example = "16")
    private int validCount;

    @Schema(description = "Số tờ khai cài cắm lỗi vi phạm (Invalid)", example = "24")
    private int invalidCount;

    @Schema(description = "Độ chính xác kiểm định tổng thể (Accuracy)", example = "100.0%")
    private String accuracy;

    @Schema(description = "Độ nhạy phát hiện tờ khai hợp lệ (Recall)", example = "100.0%")
    private String recall;

    @Schema(description = "Độ chuẩn xác phân loại (Precision)", example = "100.0%")
    private String precision;

    @Schema(description = "Điểm F1-Score của Động cơ quy tắc", example = "1.000")
    private double f1Score;

    @Schema(description = "Tỷ lệ phát hiện lỗi số CCCD (12 số, mã tỉnh 63, thế kỷ, năm sinh)", example = "100.0%")
    private String cccdErrorDetectionRate;

    @Schema(description = "Tỷ lệ phát hiện lỗi logic ngày tháng và độ tuổi", example = "100.0%")
    private String dateLogicErrorDetectionRate;
}
