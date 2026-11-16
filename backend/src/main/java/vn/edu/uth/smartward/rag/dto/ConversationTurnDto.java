package vn.edu.uth.smartward.rag.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Representation of a single turn in a multi-turn citizen consultation session.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Lượt trao đổi trong hội thoại nhiều bước giữa công dân và trợ lý AI")
public class ConversationTurnDto {

    @Schema(description = "Vai trò người gửi: citizen, user, bot, hoặc assistant", example = "citizen")
    private String role;

    @Size(max = 500, message = "Nội dung mỗi lượt hội thoại không được vượt quá 500 ký tự")
    @Schema(description = "Nội dung câu hỏi hoặc phản hồi của lượt hội thoại", example = "Thủ tục đăng ký kết hôn cần giấy tờ gì?")
    private String content;

    @Schema(description = "Mã thủ tục hành chính liên quan (nếu đã xác định)", example = "TTHC-HT-02")
    private String procedureCode;
}
