package vn.edu.uth.smartward.rag.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProposalCreateRequest {
    private Long proposalId;
    private ProcedureContentDto content;
    private String source;
    private String sourceRef;
}
