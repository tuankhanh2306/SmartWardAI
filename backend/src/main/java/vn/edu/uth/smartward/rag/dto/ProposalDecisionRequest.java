package vn.edu.uth.smartward.rag.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProposalDecisionRequest {
    private String reviewNote;
}
