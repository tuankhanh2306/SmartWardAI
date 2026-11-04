package vn.edu.uth.smartward.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Production Gemini AI Client connecting to Google Generative Language API.
 * Uses text-embedding-004 (768 dimensions) and gemini-2.5-flash for multimodal OCR and chat.
 * Active in "prod" profile or when explicitly enabling "gemini" profile.
 */
@Slf4j
@Component
@Primary
@Profile({"prod", "gemini"})
public class GeminiAiClient implements AiModelClient {

    private static final String GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

    @Value("${smartward.ai.gemini.api-key:}")
    private String apiKey;

    @Value("${smartward.ai.gemini.model:gemini-2.5-flash}")
    private String chatModel;

    @Value("${smartward.ai.gemini.embedding-model:text-embedding-004}")
    private String embeddingModel;

    @Value("${smartward.ai.gemini.embedding-dim:768}")
    private int embeddingDim;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiAiClient(ObjectMapper objectMapper) {
        this.restClient = RestClient.builder()
                .baseUrl(GEMINI_BASE_URL)
                .build();
        this.objectMapper = objectMapper;
    }

    @Override
    public float[] generateEmbedding(String text) {
        if (text == null || text.trim().isEmpty()) {
            return new float[embeddingDim];
        }

        try {
            Map<String, Object> body = Map.of(
                    "model", "models/" + embeddingModel,
                    "content", Map.of(
                            "parts", List.of(Map.of("text", text))
                    )
            );

            String response = restClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/models/" + embeddingModel + ":embedContent")
                            .queryParam("key", apiKey)
                            .build())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            JsonNode values = root.path("embedding").path("values");

            if (values.isArray() && values.size() > 0) {
                float[] vector = new float[values.size()];
                double sumSq = 0.0;
                for (int i = 0; i < values.size(); i++) {
                    vector[i] = (float) values.get(i).asDouble();
                    sumSq += vector[i] * vector[i];
                }
                // Normalize to unit length
                float norm = (float) Math.sqrt(sumSq);
                if (norm > 0) {
                    for (int i = 0; i < vector.length; i++) {
                        vector[i] /= norm;
                    }
                }
                return vector;
            }
        } catch (Exception e) {
            log.error("Failed to generate embedding via Gemini API: {}", e.getMessage());
        }

        // Fallback to zero vector if call fails
        return new float[embeddingDim];
    }

    @Override
    public String generateChatResponse(String systemPrompt, String userPrompt) {
        try {
            Map<String, Object> body = Map.of(
                    "systemInstruction", Map.of(
                            "parts", List.of(Map.of("text", systemPrompt))
                    ),
                    "contents", List.of(
                            Map.of("role", "user", "parts", List.of(Map.of("text", userPrompt)))
                    ),
                    "generationConfig", Map.of(
                            "temperature", 0.1,
                            "maxOutputTokens", 1024
                    )
            );

            String response = restClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/models/" + chatModel + ":generateContent")
                            .queryParam("key", apiKey)
                            .build())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();

        } catch (Exception e) {
            log.error("Gemini chat generation failed: {}", e.getMessage());
            return "Hiện tại hệ thống AI đang gặp gián đoạn kết nối. Quý công dân vui lòng thử lại sau.";
        }
    }

    @Override
    public String performVisionOcr(byte[] imageBytes, String mimeType) {
        try {
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);

            String ocrInstruction = """
                Bạn là hệ thống trích xuất OCR biểu mẫu hành chính Việt Nam.
                Hãy đọc bức ảnh tờ khai và xuất ra duy nhất một đối tượng JSON với cấu trúc:
                {
                  "fullName": "...",
                  "birthDate": "DD/MM/YYYY",
                  "gender": "Nam/Nữ",
                  "cccdNumber": "12 chữ số",
                  "issueDate": "DD/MM/YYYY",
                  "issuePlace": "...",
                  "permanentAddress": "...",
                  "overallConfidence": 0.95
                }
                Không thêm markdown hay văn bản nào khác ngoài JSON.
                """;

            Map<String, Object> body = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(
                                    Map.of("text", ocrInstruction),
                                    Map.of("inlineData", Map.of("mimeType", mimeType, "data", base64Image))
                            ))
                    ),
                    "generationConfig", Map.of("temperature", 0.0)
            );

            String response = restClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/models/" + chatModel + ":generateContent")
                            .queryParam("key", apiKey)
                            .build())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            String rawJson = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();

            // Strip markdown block ```json ... ``` if model wraps it
            rawJson = rawJson.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            return rawJson;

        } catch (Exception e) {
            log.error("Gemini Vision OCR extraction failed: {}", e.getMessage());
            return "{}";
        }
    }
}
