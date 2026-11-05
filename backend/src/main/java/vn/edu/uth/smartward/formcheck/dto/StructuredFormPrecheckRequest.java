package vn.edu.uth.smartward.formcheck.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Request payload for structured multi-form precheck (CT01, Birth Registration TK-KS,
 * Marriage & Single Status TK-KH, Social Protection TK-BTXH).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StructuredFormPrecheckRequest {
    private String procedureCode;
    private String formType;
    private String citizenCccd;
    private String fullName;
    private String dateOfBirth;
    private String gender;
    private String cccdIssueDate;
    private String address;
    private Map<String, String> formData;
}
