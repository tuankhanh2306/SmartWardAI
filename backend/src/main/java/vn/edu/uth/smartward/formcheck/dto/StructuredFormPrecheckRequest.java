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

    // ==========================================
    // 1. Trường bổ sung cho CT01 (Cư trú)
    // ==========================================
    private String hostName;
    private String hostCccd;
    private String hostRelation;
    private String declarationScope;
    private String phoneNumber;

    // ==========================================
    // 2. Trường bổ sung cho TK-KS (Khai sinh)
    // ==========================================
    private String childEthnicity;
    private String childNationality;
    private String childBirthPlace;
    private String birthCertNumber;
    private String birthCertIssueDate;
    private String fatherDob;
    private String motherDob;
    private String fatherResidence;
    private String motherResidence;

    // ==========================================
    // 3. Trường bổ sung cho TK-KH (Kết hôn & Tình trạng hôn nhân)
    // ==========================================
    private String marriageMode; // "MARRIAGE_REGISTRATION" | "MARITAL_STATUS_CONFIRMATION"
    private String partnerName;
    private String partnerCccd;
    private String partnerAddress;
    private String applicantEthnicity;
    private String partnerEthnicity;
    private String applicantNationality;
    private String partnerNationality;
    private String divorceJudgmentNumber;
    private String divorceJudgmentDate;
    private String deathCertNumber;
    private String deathCertDate;

    // ==========================================
    // 4. Trường bổ sung cho TK-BTXH (Bảo trợ xã hội)
    // ==========================================
    private String poorHouseholdBookNumber;
    private String disabilityCertNumber;
    private String disabilityCertIssueDate;
    private String disabilityCertIssuer;
    private String guardianName;
    private String guardianCccd;
    private String guardianRelation;
    private String guardianPhone;

    /**
     * Reads a field value prioritizing the typed DTO property, falling back to formData map.
     */
    public String getFieldValue(String directValue, String mapKey) {
        if (directValue != null && !directValue.isBlank()) {
            return directValue.trim();
        }
        if (formData != null && formData.containsKey(mapKey) && formData.get(mapKey) != null) {
            return formData.get(mapKey).trim();
        }
        return "";
    }
}
