package vn.edu.uth.smartward.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;

import java.time.Duration;
import java.util.*;

/**
 * Production Gemini AI Client connecting to Google Generative Language API.
 * Uses gemini-embedding-001 (768 dimensions via Matryoshka MRL) and gemini-2.5-flash for multimodal OCR and chat.
 * Active in "prod" profile or when explicitly enabling "gemini" profile.
 */
@Slf4j
@Component
@Primary
@Profile({"prod", "gemini"})
public class GeminiAiClient implements AiModelClient {

    private static final String GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

    public static final String TRUNCATION_FALLBACK_NOTICE =
            "Nội dung thủ tục hành chính này rất chi tiết và vượt quá giới hạn hiển thị tự động. " +
            "Để nhận toàn bộ biểu mẫu và hướng dẫn đầy đủ, quý công dân vui lòng liên hệ trực tiếp Bộ phận Tiếp nhận và Trả kết quả (Một cửa) tại UBND cấp xã hoặc tổng đài 18001096.";

    public static final String SAFETY_BLOCKED_NOTICE =
            "Phản hồi bị giới hạn vì lý do an toàn thông tin theo quy định. Quý công dân vui lòng liên hệ trực tiếp Bộ phận Một cửa.";

    public static final String SERVICE_UNAVAILABLE_NOTICE =
            "Dịch vụ AI hiện đang được bảo trì hoặc chưa khả dụng. Quý công dân vui lòng liên hệ Bộ phận Một cửa của UBND để được hướng dẫn trực tiếp.";

    public static final String RATE_LIMIT_NOTICE =
            "Hệ thống đang phục vụ lượng lớn yêu cầu từ công dân. Quý công dân vui lòng thử lại sau ít phút.";

    public static final String NETWORK_ERROR_NOTICE =
            "Hệ thống AI đang gặp gián đoạn kết nối mạng. Quý công dân vui lòng thử lại sau hoặc liên hệ Bộ phận Một cửa để được hỗ trợ.";

    @Value("${smartward.ai.gemini.api-key:}")
    private String apiKey;

    @Value("${smartward.ai.gemini.model:gemini-2.5-flash}")
    private String chatModel = "gemini-2.5-flash";

    @Value("${smartward.ai.gemini.embedding-model:gemini-embedding-001}")
    private String embeddingModel = "gemini-embedding-001";

    @Value("${smartward.ai.gemini.embedding-dim:768}")
    private int embeddingDim = 768;

    @Value("${smartward.ai.gemini.max-output-tokens:8192}")
    private int maxOutputTokens = 8192;

    @Value("${smartward.ai.gemini.timeout-seconds:25}")
    private int timeoutSeconds = 25;

    @Value("${smartward.ai.gemini.thinking-budget:0}")
    private int thinkingBudget = 0;

    private RestClient restClient;
    private final ObjectMapper objectMapper;
    private final DeterministicMockAiClient fallbackMock = new DeterministicMockAiClient();

    @Autowired
    public GeminiAiClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        initRestClient();
    }

    public GeminiAiClient(RestClient restClient, ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.objectMapper = objectMapper;
    }

    private boolean hasApiKey() {
        return apiKey != null
                && !apiKey.trim().isEmpty()
                && !apiKey.equalsIgnoreCase("mock-key-for-local-testing")
                && !apiKey.startsWith("mock-key");
    }

    @PostConstruct
    void initRestClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(8));
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds > 0 ? timeoutSeconds : 25));
        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(GEMINI_BASE_URL)
                .build();
    }

    // Package-private accessors for testing and configuration injection
    void setRestClient(RestClient restClient) {
        this.restClient = restClient;
    }

    void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    void setChatModel(String chatModel) {
        this.chatModel = chatModel;
    }

    void setEmbeddingModel(String embeddingModel) {
        this.embeddingModel = embeddingModel;
    }

    void setMaxOutputTokens(int maxOutputTokens) {
        this.maxOutputTokens = maxOutputTokens;
    }

    void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    void setThinkingBudget(int thinkingBudget) {
        this.thinkingBudget = thinkingBudget;
    }

    @Override
    public String getEmbeddingModelId() {
        if (!hasApiKey()) {
            return fallbackMock.getEmbeddingModelId();
        }
        return (embeddingModel != null && !embeddingModel.isBlank()) ? embeddingModel : "gemini-embedding-001";
    }

    @Override
    public float[] generateEmbedding(String text) {
        if (text == null || text.trim().isEmpty()) {
            return new float[embeddingDim > 0 ? embeddingDim : 768];
        }
        if (!hasApiKey()) {
            return fallbackMock.generateEmbedding(text);
        }

        try {
            Map<String, Object> body = Map.of(
                    "model", "models/" + embeddingModel,
                    "outputDimensionality", embeddingDim > 0 ? embeddingDim : 768,
                    "content", Map.of(
                            "parts", List.of(Map.of("text", text))
                    )
            );

            String response = restClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/models/" + embeddingModel + ":embedContent")
                            .queryParam("key", apiKey != null ? apiKey : "")
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
        } catch (RestClientResponseException e) {
            log.error("Failed to generate embedding via Gemini API (HTTP {}): {}",
                    e.getStatusCode(), sanitizeMessage(e.getMessage()));
            throw new BusinessException(ErrorCode.AI_SERVICE_UNAVAILABLE, "Dịch vụ AI hiện không khả dụng. Quý công dân vui lòng thử lại sau.");
        } catch (ResourceAccessException e) {
            log.error("Network timeout while generating embedding via Gemini API: {}", sanitizeMessage(e.getMessage()));
            throw new BusinessException(ErrorCode.AI_SERVICE_UNAVAILABLE, "Dịch vụ AI hiện không khả dụng. Quý công dân vui lòng thử lại sau.");
        } catch (Exception e) {
            log.error("Unexpected error generating embedding via Gemini API: {}", sanitizeMessage(e.getMessage()));
            throw new BusinessException(ErrorCode.AI_SERVICE_UNAVAILABLE, "Dịch vụ AI hiện không khả dụng. Quý công dân vui lòng thử lại sau.");
        }

        throw new BusinessException(ErrorCode.AI_SERVICE_UNAVAILABLE, "Dịch vụ AI hiện không khả dụng. Quý công dân vui lòng thử lại sau.");
    }

    @Override
    public String generateChatResponse(String systemPrompt, String userPrompt) {
        if (!hasApiKey()) {
            return fallbackMock.generateChatResponse(systemPrompt, userPrompt);
        }
        ChatCallResult result = executeGenerateContentWithRetry(systemPrompt, userPrompt, maxOutputTokens);
        if (result.isError()) {
            return result.getErrorMessage();
        }

        if ("SAFETY".equalsIgnoreCase(result.getFinishReason())) {
            log.warn("Gemini response stopped due to SAFETY");
            return SAFETY_BLOCKED_NOTICE;
        }

        if ("MAX_TOKENS".equalsIgnoreCase(result.getFinishReason())) {
            int retryTokens = Math.min(Math.max(maxOutputTokens * 2, 8192), 16384);
            log.warn("Gemini response truncated due to MAX_TOKENS (limit={}). Retrying once with maxOutputTokens={}",
                    maxOutputTokens, retryTokens);
            ChatCallResult retryResult = executeGenerateContentWithRetry(systemPrompt, userPrompt, retryTokens);
            if (!retryResult.isError() && !"MAX_TOKENS".equalsIgnoreCase(retryResult.getFinishReason())) {
                return retryResult.getText();
            }
            log.warn("Gemini response still truncated after retry with MAX_TOKENS. Returning fallback notice.");
            return TRUNCATION_FALLBACK_NOTICE;
        }

        return result.getText();
    }

    private ChatCallResult executeGenerateContentWithRetry(String systemPrompt, String userPrompt, int tokenLimit) {
        int maxAttempts = 2;
        ChatCallResult lastResult = ChatCallResult.error(SERVICE_UNAVAILABLE_NOTICE);

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                Map<String, Object> body = new HashMap<>();
                body.put("systemInstruction", Map.of(
                        "parts", List.of(Map.of("text", systemPrompt != null ? systemPrompt : ""))
                ));
                body.put("contents", List.of(
                        Map.of("role", "user", "parts", List.of(Map.of("text", userPrompt != null ? userPrompt : "")))
                ));

                Map<String, Object> genConfig = new HashMap<>();
                genConfig.put("temperature", 0.1);
                genConfig.put("maxOutputTokens", tokenLimit);
                if (thinkingBudget >= 0) {
                    genConfig.put("thinkingConfig", Map.of("thinkingBudget", thinkingBudget));
                }
                body.put("generationConfig", genConfig);

                String response = restClient.post()
                        .uri(uriBuilder -> uriBuilder
                                .path("/models/" + chatModel + ":generateContent")
                                .queryParam("key", apiKey != null ? apiKey : "")
                                .build())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(String.class);

                JsonNode root = objectMapper.readTree(response);

                // Check prompt feedback blockReason
                JsonNode promptFeedback = root.path("promptFeedback");
                if (promptFeedback.has("blockReason") && !promptFeedback.path("blockReason").asText().isBlank()) {
                    String blockReason = promptFeedback.path("blockReason").asText();
                    log.warn("Gemini prompt blocked due to blockReason: {}", blockReason);
                    return ChatCallResult.error(SAFETY_BLOCKED_NOTICE);
                }

                // Check candidate emptiness
                JsonNode candidates = root.path("candidates");
                if (!candidates.isArray() || candidates.isEmpty()) {
                    log.warn("Gemini returned empty candidates array");
                    return ChatCallResult.error(SERVICE_UNAVAILABLE_NOTICE);
                }

                JsonNode candidate = candidates.get(0);
                String finishReason = candidate.path("finishReason").asText("");

                // Concatenate ALL parts (never just index 0)
                JsonNode partsNode = candidate.path("content").path("parts");
                StringBuilder sb = new StringBuilder();
                if (partsNode.isArray()) {
                    for (JsonNode part : partsNode) {
                        sb.append(part.path("text").asText(""));
                    }
                }

                return ChatCallResult.success(sb.toString(), finishReason);

            } catch (RestClientResponseException ex) {
                int status = ex.getStatusCode().value();
                String sanitized = sanitizeMessage(ex.getMessage());
                if (status == 400 || status == 401 || status == 403) {
                    log.warn("Gemini authentication or invalid key error (HTTP {}): {}", status, sanitized);
                    return ChatCallResult.error(SERVICE_UNAVAILABLE_NOTICE);
                } else if (status == 429) {
                    log.warn("Gemini quota/rate limit reached (HTTP 429, attempt {}/{}): {}", attempt, maxAttempts, sanitized);
                    lastResult = ChatCallResult.error(RATE_LIMIT_NOTICE);
                    if (attempt < maxAttempts) {
                        sleepBriefly(500);
                        continue;
                    }
                    return lastResult;
                } else if (status >= 500) {
                    log.warn("Gemini server error (HTTP {}, attempt {}/{}): {}", status, attempt, maxAttempts, sanitized);
                    lastResult = ChatCallResult.error(NETWORK_ERROR_NOTICE);
                    if (attempt < maxAttempts) {
                        sleepBriefly(500);
                        continue;
                    }
                    return lastResult;
                } else {
                    log.warn("Gemini client error (HTTP {}): {}", status, sanitized);
                    return ChatCallResult.error(SERVICE_UNAVAILABLE_NOTICE);
                }
            } catch (ResourceAccessException ex) {
                log.warn("Gemini network connection or timeout error (attempt {}/{}): {}",
                        attempt, maxAttempts, sanitizeMessage(ex.getMessage()));
                lastResult = ChatCallResult.error(NETWORK_ERROR_NOTICE);
                if (attempt < maxAttempts) {
                    sleepBriefly(500);
                    continue;
                }
                return lastResult;
            } catch (Exception ex) {
                log.error("Unexpected error during Gemini chat generation: {}", sanitizeMessage(ex.getMessage()));
                return ChatCallResult.error(SERVICE_UNAVAILABLE_NOTICE);
            }
        }

        return lastResult;
    }

    @Override
    public String performVisionOcr(byte[] imageBytes, String mimeType) {
        if (!hasApiKey()) {
            return fallbackMock.performVisionOcr(imageBytes, mimeType);
        }
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
                            .queryParam("key", apiKey != null ? apiKey : "")
                            .build())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode partsNode = candidates.get(0).path("content").path("parts");
                StringBuilder sb = new StringBuilder();
                if (partsNode.isArray()) {
                    for (JsonNode part : partsNode) {
                        sb.append(part.path("text").asText(""));
                    }
                }
                String rawJson = sb.toString().replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
                return rawJson;
            }

            return "{}";

        } catch (Exception e) {
            log.error("Gemini Vision OCR extraction failed: {}", sanitizeMessage(e.getMessage()));
            return "{}";
        }
    }

    private String sanitizeMessage(String msg) {
        if (msg == null) return "Unknown error";
        return msg.replaceAll("key=[A-Za-z0-9_\\-]+", "key=***")
                  .replaceAll("api_key=[A-Za-z0-9_\\-]+", "api_key=***");
    }

    private void sleepBriefly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }

    private static class ChatCallResult {
        private final String text;
        private final String finishReason;
        private final boolean error;
        private final String errorMessage;

        private ChatCallResult(String text, String finishReason, boolean error, String errorMessage) {
            this.text = text;
            this.finishReason = finishReason;
            this.error = error;
            this.errorMessage = errorMessage;
        }

        public static ChatCallResult success(String text, String finishReason) {
            return new ChatCallResult(text, finishReason, false, null);
        }

        public static ChatCallResult error(String errorMessage) {
            return new ChatCallResult(null, null, true, errorMessage);
        }

        public String getText() {
            return text;
        }

        public String getFinishReason() {
            return finishReason;
        }

        public boolean isError() {
            return error;
        }

        public String getErrorMessage() {
            return errorMessage;
        }
    }
}
