package vn.edu.uth.smartward.formcheck;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.formcheck.dto.ExtractedFormFields;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;

/**
 * OCR extraction adapter that interacts with Vision AI model and deserializes
 * raw JSON response into structured form fields with honest confidence & classification.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OcrExtractionClient {

    private static final Set<String> OFFICIAL_FORM_TYPES = Set.of(
            "TK_KS", "BIRTH_CERT", "CT01", "TK_KH", "TK_BTXH", "CCCD"
    );

    private final AiModelClient aiModelClient;
    private final ObjectMapper objectMapper;

    public ExtractedFormFields extractFields(byte[] imageBytes, String mimeType) {
        return extractFields(imageBytes, mimeType, null);
    }

    /**
     * Sends form image bytes to Vision OCR model and parses response into ExtractedFormFields.
     * Never fabricates overallConfidence = 0.95 on missing/empty output, and never treats
     * unreadable/unidentified images with 0 fields as a blank official template.
     */
    public ExtractedFormFields extractFields(byte[] imageBytes, String mimeType, String expectedFormType) {
        log.info("Performing Vision OCR extraction on image (size={} bytes, mimeType={}, expected={})",
                imageBytes != null ? imageBytes.length : 0, mimeType, expectedFormType);

        String ocrRawJson = aiModelClient.performVisionOcr(imageBytes, mimeType, expectedFormType);

        try {
            if (ocrRawJson == null || ocrRawJson.isBlank()) {
                return unavailableFields("Máy chủ OCR không trả về dữ liệu.");
            }
            String cleanedJson = ocrRawJson.trim();
            if (cleanedJson.startsWith("```json")) {
                cleanedJson = cleanedJson.substring(7);
            }
            if (cleanedJson.startsWith("```")) {
                cleanedJson = cleanedJson.substring(3);
            }
            if (cleanedJson.endsWith("```")) {
                cleanedJson = cleanedJson.substring(0, cleanedJson.length() - 3);
            }
            cleanedJson = cleanedJson.trim();

            JsonNode root = objectMapper.readTree(cleanedJson);
            if (root == null || !root.isObject() || root.isEmpty()) {
                return unavailableFields("Kết quả OCR rỗng.");
            }

            Map<String, Double> confidences = new HashMap<>();
            JsonNode confNode = root.path("fieldConfidences");
            if (confNode.isObject()) {
                Iterator<Map.Entry<String, JsonNode>> fields = confNode.fields();
                while (fields.hasNext()) {
                    Map.Entry<String, JsonNode> entry = fields.next();
                    if (entry.getValue() != null && entry.getValue().isNumber()) {
                        confidences.put(entry.getKey(), entry.getValue().asDouble());
                    }
                }
            }

            String ocrStatus = readNullableText(root, "ocrStatus");
            if (ocrStatus == null) {
                ocrStatus = "COMPLETED";
            }
            String readabilityStatus = readNullableText(root, "readabilityStatus");
            if (readabilityStatus == null) {
                readabilityStatus = "UNAVAILABLE".equalsIgnoreCase(ocrStatus) ? "NOT_EVALUATED" : "CLEAR";
            }
            String detectedType = readNullableText(root, "detectedDocumentType");
            if (detectedType == null) {
                detectedType = "UNKNOWN";
            } else {
                detectedType = detectedType.trim().toUpperCase().replace('-', '_');
            }

            // TASK-057 guardrail: NEVER mark non-official or non-clear images as blank template
            boolean rawBlank = root.path("isBlankTemplate").asBoolean(false);
            boolean safeBlankTemplate = rawBlank
                    && "CLEAR".equalsIgnoreCase(readabilityStatus)
                    && OFFICIAL_FORM_TYPES.contains(detectedType);

            double confidence = root.has("overallConfidence") && root.path("overallConfidence").isNumber()
                    ? root.path("overallConfidence").asDouble(0.0)
                    : 0.0;

            return ExtractedFormFields.builder()
                    .fullName(readNullableText(root, "fullName"))
                    .birthDate(readNullableText(root, "birthDate"))
                    .gender(readNullableText(root, "gender"))
                    .cccdNumber(readNullableText(root, "cccdNumber"))
                    .issueDate(readNullableText(root, "issueDate"))
                    .issuePlace(readNullableText(root, "issuePlace"))
                    .permanentAddress(readNullableText(root, "permanentAddress"))
                    .phoneNumber(readNullableText(root, "phoneNumber"))
                    .hostName(readNullableText(root, "hostName"))
                    .hostCccdNumber(readNullableText(root, "hostCccdNumber"))
                    .hostRelation(readNullableText(root, "hostRelation"))
                    .declarationScope(readNullableText(root, "declarationScope"))
                    .childFullName(readNullableText(root, "childFullName"))
                    .childDob(readNullableText(root, "childDob"))
                    .childGender(readNullableText(root, "childGender"))
                    .childEthnicity(readNullableText(root, "childEthnicity"))
                    .childBirthPlace(readNullableText(root, "childBirthPlace"))
                    .motherFullName(readNullableText(root, "motherFullName"))
                    .fatherFullName(readNullableText(root, "fatherFullName"))
                    .birthCertNumber(readNullableText(root, "birthCertNumber"))
                    .birthCertIssueDate(readNullableText(root, "birthCertIssueDate"))
                    .hospitalName(readNullableText(root, "hospitalName"))
                    .hasRedSeal(root.has("hasRedSeal") && root.path("hasRedSeal").isBoolean()
                            ? root.path("hasRedSeal").asBoolean()
                            : null)
                    .ocrStatus(ocrStatus)
                    .readabilityStatus(readabilityStatus)
                    .readabilityReason(readNullableText(root, "readabilityReason"))
                    .detectedDocumentType(detectedType)
                    .isBlankTemplate(safeBlankTemplate)
                    .rawTextExcerpt(readNullableText(root, "rawTextExcerpt"))
                    .overallConfidence(confidence)
                    .fieldConfidences(confidences)
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse OCR JSON response: {}", e.getMessage());
            return unavailableFields("Không thể phân tích kết quả OCR từ máy chủ.");
        }
    }

    private String readNullableText(JsonNode root, String fieldName) {
        JsonNode node = root.path(fieldName);
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        String text = node.asText("").trim();
        return text.isEmpty() ? null : text;
    }

    private ExtractedFormFields unavailableFields(String reason) {
        return ExtractedFormFields.builder()
                .ocrStatus("UNAVAILABLE")
                .readabilityStatus("NOT_EVALUATED")
                .readabilityReason(reason)
                .detectedDocumentType("UNKNOWN")
                .isBlankTemplate(false)
                .overallConfidence(0.0)
                .fieldConfidences(Map.of())
                .build();
    }
}
