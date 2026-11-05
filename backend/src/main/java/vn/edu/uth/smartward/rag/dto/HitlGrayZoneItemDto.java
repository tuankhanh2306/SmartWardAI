package vn.edu.uth.smartward.rag.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing a Gray-Zone query ([theta_lower, theta)) queued for Human-in-the-Loop (HITL) officer review.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HitlGrayZoneItemDto {
    private String id;
    private String query;
    private String wardName;
    private double similarityScore;
    private String candidateChunkCode;
    private String candidateProcedureName;
    private String legalReference;
    private String suggestedAnswer;
    private String status;
    private String createdAt;
    private String resolvedBy;
}
