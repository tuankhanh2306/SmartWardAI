package vn.edu.uth.smartward.rag.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload for an officer to approve and cache a Gray-Zone RAG query.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HitlResolveRequest {
    @NotBlank(message = "Nội dung phản hồi chuẩn hóa của cán bộ không được để trống")
    private String approvedAnswer;

    private String officerName;
}
