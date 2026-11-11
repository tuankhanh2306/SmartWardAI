package vn.edu.uth.smartward.rag.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProcedureDetailDto {
    private String procedureCode;
    private String officialPortalCode;
    private String procedureName;
    private String category;
    private String agency;
    private String processingTime;
    private String fee;
    private String status;
    private Integer chunksCount;
    private String process;
    private String sourceUrl;
    private List<ProcedureChunkDto> chunks;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ProcedureChunkDto {
        private String chunkId;
        private String chunkType;
        private String title;
        private String content;
        private String legalReference;
    }
}
