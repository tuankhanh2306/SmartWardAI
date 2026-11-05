package vn.edu.uth.smartward.formcheck.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response payload for structured multi-form precheck matching frontend FormPrecheckResponse contract.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StructuredFormPrecheckResponse {
    private String submissionId;
    private String procedureCode;
    private boolean overallValid;
    private List<FieldValidationItem> fieldValidations;
    private List<String> warnings;
    private String processedAt;
    private double processingTimeMs;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FieldValidationItem {
        private String fieldName;
        private String providedValue;
        private boolean valid;
        private String errorCode;
        private String errorMessage;
        private double confidenceScore;
    }
}
