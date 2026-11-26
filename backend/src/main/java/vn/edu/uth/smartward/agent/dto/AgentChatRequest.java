package vn.edu.uth.smartward.agent.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.edu.uth.smartward.rag.dto.ConversationTurnDto;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Yêu cầu hội thoại đa bước với CivicSupervisorAgent")
public class AgentChatRequest {

    @NotBlank(message = "Nội dung câu hỏi hoặc yêu cầu không được để trống.")
    @Size(max = 2000, message = "Nội dung yêu cầu không được vượt quá 2000 ký tự.")
    @Schema(description = "Câu hỏi hoặc yêu cầu tiếng Việt của công dân / cán bộ")
    private String message;

    @Schema(description = "Mã phiên hội thoại (tùy chọn)")
    private String sessionId;

    @Schema(description = "Mã biểu mẫu ưu tiên nếu đang thao tác tờ khai (CT01, TK-KS, TK-KH, TK-BTXH)")
    private String formType;

    @Schema(description = "Lịch sử hội thoại gần nhất (tối đa 6 lượt)")
    private List<ConversationTurnDto> history;
}
