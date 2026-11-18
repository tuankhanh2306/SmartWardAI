package vn.edu.uth.smartward.rag.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcedureCreateRequest {
    private String procedureCode;
    private String portalCode;
    private String procedureName;
    private String category;
    private String formTemplateKey;
    private String sourceUrl;
    private ProcedureContentDto content;
}
