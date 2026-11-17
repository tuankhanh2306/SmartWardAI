package vn.edu.uth.smartward.rag.dto;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProposalDiffDto {
    private Long proposalId;
    private String procedureCode;
    private String procedureName;
    private Integer fromVersionNo;
    private Integer toVersionNo;
    private String state;
    private String createdBy;
    private OffsetDateTime submittedAt;
    private List<FieldDiff> fields;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FieldDiff {
        private String fieldKey;
        private String fieldLabel;
        private String oldValue;
        private String newValue;
        private boolean changed;
    }
}
