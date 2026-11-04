package vn.edu.uth.smartward.rag.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Request payload for citizen legal inquiry via RAG.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu hỏi đáp thủ tục hành chính qua Legal RAG")
public class RagAskRequest {

    @NotBlank(message = "Câu hỏi pháp lý không được để trống")
    @Size(max = 1000, message = "Câu hỏi không được vượt quá 1000 ký tự")
    @Schema(description = "Câu hỏi của công dân về thủ tục hành chính", example = "Tôi muốn làm khai sinh cho con mới sinh cần giấy tờ gì?")
    private String question;

    @Schema(description = "Lĩnh vực thủ tục hành chính (tùy chọn: Hộ tịch, Cư trú, Đất đai...)", example = "Hộ tịch")
    private String category;

    @Min(value = 1, message = "topK tối thiểu là 1")
    @Max(value = 10, message = "topK tối đa là 10")
    @Schema(description = "Số đoạn trích dẫn tương đồng cao nhất cần truy xuất", defaultValue = "3")
    @Builder.Default
    private Integer topK = 3;

    @Schema(description = "Ngưỡng chốt chặn từ chối trả lời (Abstention Threshold theta)", defaultValue = "0.78")
    @Builder.Default
    private Double similarityThreshold = 0.78;
}
