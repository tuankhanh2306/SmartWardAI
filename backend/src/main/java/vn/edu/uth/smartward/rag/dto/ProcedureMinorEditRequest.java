package vn.edu.uth.smartward.rag.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcedureMinorEditRequest {
    private String coQuanThucHien;
    private String sourceUrl;
    private String editNote;
}
