package vn.edu.uth.smartward.rag.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.List;

/**
 * Citizen legal inquiry response with citations, similarity metrics, and disclaimer.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Kết quả giải đáp pháp lý của hệ thống SmartWard AI")
public class RagAskResponse {

    @Schema(description = "Nội dung câu trả lời hoặc hướng dẫn thủ tục")
    private String answer;

    @Schema(description = "Trạng thái từ chối trả lời (true nếu S_max < theta hoặc ngoài phạm vi)", example = "false")
    private boolean abstained;

    @Schema(description = "Lý do hệ thống từ chối trả lời (khi abstained = true)")
    private String abstentionReason;

    @Schema(description = "Điểm tương đồng Cosine cao nhất tìm thấy trong CSDL", example = "0.864")
    private double maxSimilarity;

    @Schema(description = "Ngưỡng chốt chặn an toàn được áp dụng (theta)", example = "0.78")
    private double appliedThreshold;

    @Schema(description = "Danh sách các căn cứ pháp lý đã được hậu kiểm tra trích dẫn")
    private List<LegalCitationDto> citations;

    @Schema(description = "Phản hồi có được lấy từ Redis Cache hay không", example = "false")
    private boolean cached;

    @Schema(description = "Thời gian phản hồi tính bằng mili-giây", example = "45")
    private long responseTimeMs;

    @Schema(description = "Tuyên bố miễn trừ trách nhiệm pháp lý")
    private String disclaimer;
}
