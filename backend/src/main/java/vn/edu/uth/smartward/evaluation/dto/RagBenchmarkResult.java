package vn.edu.uth.smartward.evaluation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

/**
 * Benchmark evaluation metrics for Module 1: Legal RAG & Abstention Guardrail.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Kết quả đánh giá thực nghiệm Phân hệ Legal RAG")
public class RagBenchmarkResult {

    @Schema(description = "Tổng số câu hỏi đánh giá", example = "80")
    private int totalQuestions;

    @Schema(description = "Số câu hỏi đúng phạm vi thủ tục cấp xã (In-Scope)", example = "65")
    private int inScopeCount;

    @Schema(description = "Số câu hỏi bẫy / ngoài phạm vi (Out-of-Scope)", example = "15")
    private int outOfScopeCount;

    @Schema(description = "Tỷ lệ tìm trúng thủ tục trong Top-3 (Recall@3)", example = "95.38%")
    private String recallAt3;

    @Schema(description = "Điểm xếp hạng nghịch đảo trung bình (Mean Reciprocal Rank - MRR)", example = "0.912")
    private double mrr;

    @Schema(description = "Độ chính xác kích hoạt chốt chặn từ chối (Abstention Accuracy trên Out-of-Scope)", example = "100.0%")
    private String abstentionAccuracy;

    @Schema(description = "Tỷ lệ trả lời sai / ảo giác trên câu hỏi ngoài phạm vi (False Answer Rate)", example = "0.0%")
    private String falseAnswerRate;

    @Schema(description = "Độ chính xác trích dẫn căn cứ pháp lý (Citation Precision)", example = "98.46%")
    private String citationPrecision;

    @Schema(description = "Thời gian phản hồi trung bình (mili-giây)", example = "18.5")
    private double averageLatencyMs;
}
