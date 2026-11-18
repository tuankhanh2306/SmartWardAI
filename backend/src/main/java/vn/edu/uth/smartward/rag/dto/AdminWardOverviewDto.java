package vn.edu.uth.smartward.rag.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import vn.edu.uth.smartward.dossier.dto.OfficerDossierDto;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminWardOverviewDto {
    private String wardCode;
    private boolean readOnly;
    private boolean audited;
    private int totalDossiers;
    private int pendingDossiers;
    private int approvedDossiers;
    private int rejectedDossiers;
    private List<OfficerDossierDto> dossiers;
}
