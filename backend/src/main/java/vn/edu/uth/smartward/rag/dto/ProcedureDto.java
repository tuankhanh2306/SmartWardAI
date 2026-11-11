package vn.edu.uth.smartward.rag.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProcedureDto {
    private String procedureCode;
    private String officialPortalCode;
    private String procedureName;
    private String category;
    private String agency;
    private String processingTime;
    private String fee;
    private String status;
    private Integer chunksCount;
}
