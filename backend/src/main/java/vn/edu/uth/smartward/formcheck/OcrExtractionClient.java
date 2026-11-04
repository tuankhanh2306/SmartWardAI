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

/**
 * OCR extraction adapter that interacts with Vision AI model and deserializes
 * raw JSON response into structured form fields with field-level confidence scores.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OcrExtractionClient {

    private final AiModelClient aiModelClient;
    private final ObjectMapper objectMapper;

    /**
     * Sends form image bytes to Vision OCR model and parses response into ExtractedFormFields.
     */
    public ExtractedFormFields extractFields(byte[] imageBytes, String mimeType) {
        log.info("Performing Vision OCR extraction on image (size={} bytes, mimeType={})",
                imageBytes != null ? imageBytes.length : 0, mimeType);

        String ocrRawJson = aiModelClient.performVisionOcr(imageBytes, mimeType);

        try {
            // Strip any accidental markdown formatting if present
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

            Map<String, Double> confidences = new HashMap<>();
            JsonNode confNode = root.path("fieldConfidences");
            if (confNode.isObject()) {
                Iterator<Map.Entry<String, JsonNode>> fields = confNode.fields();
                while (fields.hasNext()) {
                    Map.Entry<String, JsonNode> entry = fields.next();
                    confidences.put(entry.getKey(), entry.getValue().asDouble(1.0));
                }
            }

            return ExtractedFormFields.builder()
                    .fullName(root.path("fullName").asText(null))
                    .birthDate(root.path("birthDate").asText(null))
                    .gender(root.path("gender").asText(null))
                    .cccdNumber(root.path("cccdNumber").asText(null))
                    .issueDate(root.path("issueDate").asText(null))
                    .issuePlace(root.path("issuePlace").asText(null))
                    .permanentAddress(root.path("permanentAddress").asText(null))
                    .overallConfidence(root.path("overallConfidence").asDouble(0.95))
                    .fieldConfidences(confidences)
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse OCR JSON response: {}. Raw: {}", e.getMessage(), ocrRawJson);
            return ExtractedFormFields.builder()
                    .overallConfidence(0.0)
                    .fieldConfidences(Map.of())
                    .build();
        }
    }
}
