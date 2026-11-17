package vn.edu.uth.smartward.rag.dto;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminProcedureDetailDto {
    private AdminProcedureSummaryDto summary;
    private ProcedureVersionDto publishedVersion;
    private List<ProcedureVersionDto> versions;
}
