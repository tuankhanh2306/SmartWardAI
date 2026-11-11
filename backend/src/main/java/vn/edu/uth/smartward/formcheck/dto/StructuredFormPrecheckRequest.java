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
    private String citizenEmail;

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
     * Reads a field value prioritizing the typed DTO property, falling back to formData map and aliases.
     */
    public String getFieldValue(String directValue, String mapKey) {
        if (directValue != null && !directValue.isBlank()) {
            return directValue.trim();
        }
        if (formData != null && mapKey != null) {
            if (formData.containsKey(mapKey) && formData.get(mapKey) != null && !formData.get(mapKey).isBlank()) {
                return formData.get(mapKey).trim();
            }
            String aliasVal = resolveFromAliases(mapKey);
            if (aliasVal != null && !aliasVal.isBlank()) {
                return aliasVal.trim();
            }
        }
        return "";
    }

    private String resolveFromAliases(String key) {
        if (formData == null || key == null) return null;
        return switch (key) {
            case "fatherName" -> getFirstNonBlank("fatherFullName", "father_full_name", "father_name");
            case "motherResidence" -> getFirstNonBlank("motherAddress", "mother_address", "mother_residence");
            case "fatherResidence" -> {
                String val = getFirstNonBlank("fatherAddress", "father_address", "father_residence");
                if (val != null && !val.isBlank()) yield val;
                yield getFirstNonBlank("motherAddress", "mother_address", "mother_residence");
            }
            case "applicantEthnicity" -> getFirstNonBlank("ethnicity", "applicant_ethnicity", "childEthnicity");
            case "applicantNationality" -> getFirstNonBlank("nationality", "applicant_nationality", "childNationality");
            case "childEthnicity" -> getFirstNonBlank("child_ethnicity");
            case "childNationality" -> getFirstNonBlank("child_nationality");
            case "partnerAddress" -> getFirstNonBlank("partnerResidence", "partner_address", "partner_residence");
            case "partnerEthnicity" -> getFirstNonBlank("partner_ethnicity");
            case "partnerNationality" -> getFirstNonBlank("partner_nationality");
            default -> null;
        };
    }

    private String getFirstNonBlank(String... keys) {
        if (formData == null) return null;
        for (String k : keys) {
            if (formData.containsKey(k) && formData.get(k) != null && !formData.get(k).isBlank()) {
                return formData.get(k).trim();
            }
        }
        return null;
    }
}
