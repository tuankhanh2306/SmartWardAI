package vn.edu.uth.smartward.voice;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service orchestrating offline Text-To-Speech (TTS) via local Python Sidecar (Piper TTS ONNX).
 * Incorporates an in-memory LRU cache to avoid re-synthesizing frequently spoken answers.
 */
@Slf4j
@Service
public class VoiceService {

    private static final int MAX_CACHE_ENTRIES = 200;

    private final RestClient restClient;
    private final boolean enabled;
    private final String sidecarUrl;

    // Fast in-memory LRU cache for synthesized audio chunks
    private final Map<String, byte[]> audioCache = new LinkedHashMap<>(MAX_CACHE_ENTRIES, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, byte[]> eldest) {
            return size() > MAX_CACHE_ENTRIES;
        }
    };

    public VoiceService(
            @Value("${smartward.ai.sidecar.enabled:true}") boolean enabled,
            @Value("${smartward.ai.sidecar.url:http://localhost:8000}") String sidecarUrl,
            @Value("${smartward.ai.voice.timeout-seconds:10}") int timeoutSeconds
    ) {
        this.enabled = enabled;
        this.sidecarUrl = sidecarUrl;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));

        this.restClient = RestClient.builder()
                .baseUrl(sidecarUrl)
                .requestFactory(factory)
                .build();
    }

    /**
     * Synthesize spoken audio for the given Vietnamese text.
     *
     * @param text Raw or cleaned administrative text.
     * @return Byte array of WAV audio data.
     */
    public byte[] synthesize(String text) {
        if (!enabled) {
            throw new IllegalStateException("Voice synthesis is disabled in current environment profile");
        }
        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException("Text cannot be empty for voice synthesis");
        }

        String cleanText = text.trim();
        String cacheKey = computeHash(cleanText);

        synchronized (audioCache) {
            byte[] cached = audioCache.get(cacheKey);
            if (cached != null && cached.length > 0) {
                log.debug("Returning cached audio for hash: {}", cacheKey);
                return cached;
            }
        }

        try {
            log.info("Requesting Piper TTS synthesis from sidecar at: {}/tts", sidecarUrl);
            byte[] wavBytes = restClient.post()
                    .uri("/tts")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("text", cleanText))
                    .retrieve()
                    .body(byte[].class);

            if (wavBytes == null || wavBytes.length == 0) {
                throw new IllegalStateException("Sidecar returned empty audio bytes");
            }

            synchronized (audioCache) {
                audioCache.put(cacheKey, wavBytes);
            }

            return wavBytes;
        } catch (Exception ex) {
            log.error("Failed to synthesize speech via Sidecar: {}", ex.getMessage());
            throw new RuntimeException("Sidecar voice synthesis unavailable: " + ex.getMessage(), ex);
        }
    }

    private String computeHash(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            return String.valueOf(input.hashCode());
        }
    }
}
