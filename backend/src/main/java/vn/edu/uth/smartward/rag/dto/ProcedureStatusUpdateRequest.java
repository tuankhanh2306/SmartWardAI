package vn.edu.uth.smartward.rag.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcedureStatusUpdateRequest {
    private String status;
    private String reason;
}
