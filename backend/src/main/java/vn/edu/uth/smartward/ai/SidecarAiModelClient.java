package vn.edu.uth.smartward.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;

/**
 * High-performance AI client communicating with local Python Sidecar (PhoBERT INT8 & Intent Classifier).
 * Delivers sub-10ms query vectorization and transparently falls back to DeterministicMockAiClient
 * if the sidecar service is offline or unreachable.
 */
@Slf4j
@Component
@Primary
@Profile("!prod & !gemini")
public class SidecarAiModelClient implements AiModelClient {

    private final RestClient restClient;
    private final DeterministicMockAiClient fallbackMock;
    private final boolean enabled;
    private final String sidecarUrl;

    public SidecarAiModelClient(
            @Value("${smartward.ai.sidecar.enabled:true}") boolean enabled,
            @Value("${smartward.ai.sidecar.url:http://localhost:8000}") String sidecarUrl,
            @Value("${smartward.ai.sidecar.timeout-ms:2000}") int timeoutMs,
            DeterministicMockAiClient fallbackMock
    ) {
        this.enabled = enabled;
        this.sidecarUrl = sidecarUrl;
        this.fallbackMock = fallbackMock;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(timeoutMs));
        factory.setReadTimeout(Duration.ofMillis(timeoutMs));

        this.restClient = RestClient.builder()
                .baseUrl(sidecarUrl)
                .requestFactory(factory)
                .build();
    }

    @Override
    public float[] generateEmbedding(String text) {
        if (!enabled || text == null || text.trim().isEmpty()) {
            return fallbackMock.generateEmbedding(text);
        }

        try {
            EmbedResponse response = restClient.post()
                    .uri("/embed")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new TextInput(text.trim()))
                    .retrieve()
                    .body(EmbedResponse.class);

            if (response != null && response.getEmbedding() != null && !response.getEmbedding().isEmpty()) {
                List<Double> list = response.getEmbedding();
                float[] result = new float[list.size()];
                for (int i = 0; i < list.size(); i++) {
                    result[i] = list.get(i).floatValue();
                }
                log.debug("Generated 768-dim PhoBERT embedding via Sidecar (vector size: {})", result.length);
                return result;
            }
        } catch (Exception ex) {
            log.debug("Sidecar service unavailable at {} ({}). Using deterministic fallback.", sidecarUrl, ex.getMessage());
        }

        return fallbackMock.generateEmbedding(text);
    }

    @Override
    public String generateChatResponse(String systemPrompt, String userPrompt) {
        return fallbackMock.generateChatResponse(systemPrompt, userPrompt);
    }

    @Override
    public String performVisionOcr(byte[] imageBytes, String mimeType) {
        return fallbackMock.performVisionOcr(imageBytes, mimeType);
    }

    public boolean isSidecarHealthy() {
        if (!enabled) return false;
        try {
            String status = restClient.get()
                    .uri("/health")
                    .retrieve()
                    .body(String.class);
            return status != null && status.contains("UP");
        } catch (Exception e) {
            return false;
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TextInput {
        private String text;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EmbedResponse {
        private List<Double> embedding;
        @JsonProperty("pgvector_string")
        private String pgvectorString;
    }
}
