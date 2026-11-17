package vn.edu.uth.smartward.rag.dto;

import lombok.*;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminProcedureSummaryDto {
    private Long id;
    private String procedureCode;
    private String portalCode;
    private String procedureName;
    private String category;
    private String status;
    private String formTemplateKey;
    private Integer currentVersionNo;
    private OffsetDateTime publishedAt;
    private int completeness;
    private boolean complete;
    private int pendingProposalsCount;
    private int draftProposalsCount;
    private String fee;
    private String processingTime;
    private String agency;
}
