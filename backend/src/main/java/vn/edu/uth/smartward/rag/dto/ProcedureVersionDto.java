package vn.edu.uth.smartward.rag.dto;

import lombok.*;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcedureVersionDto {
    private Long id;
    private String procedureCode;
    private String procedureName;
    private String category;
    private Integer versionNo;
    private ProcedureContentDto content;
    private String contentHash;
    private String state;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime submittedAt;
    private String reviewedBy;
    private OffsetDateTime reviewedAt;
    private String reviewNote;
    private OffsetDateTime publishedAt;
    private String source;
    private String sourceRef;
    private String indexStatus;
    private Integer indexRetryCount;
    private String indexError;
    private OffsetDateTime indexedAt;
}
