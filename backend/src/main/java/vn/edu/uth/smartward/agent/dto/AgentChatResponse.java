package vn.edu.uth.smartward.agent.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.edu.uth.smartward.agent.AgentActionCard;
import vn.edu.uth.smartward.rag.dto.LegalCitationDto;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Kết quả phản hồi đa bước của CivicSupervisorAgent")
public class AgentChatResponse {

    private String answer;
    private String role;
    private List<AgentStepDto> steps;
    private List<AgentActionCard> actionCards;
    private List<LegalCitationDto> citations;
    private boolean abstained;
    private boolean fallbackUsed;
    private boolean budgetExhausted;
    private long totalLatencyMs;
    private String disclaimer;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentStepDto {
        private int stepIndex;
        private String toolName;
        private String label;
        private boolean success;
        private long latencyMs;
    }
}
