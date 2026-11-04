package vn.edu.uth.smartward.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Random;

/**
 * Deterministic Mock AI Client for Zero-Cost Offline Testing & Local Development.
 * Produces reproducible 768-dimensional normalized embeddings and OCR outputs
 * without consuming Google Gemini API quotas.
 */
@Slf4j
@Component
@Profile("!prod & !gemini")
public class DeterministicMockAiClient implements AiModelClient {

    private static final int EMBEDDING_DIM = 768;

    @Override
    public float[] generateEmbedding(String text) {
        if (text == null || text.trim().isEmpty()) {
            return new float[EMBEDDING_DIM];
        }

        // Generate deterministic seed from text SHA-256 hash
        long seed = computeHashSeed(text.trim().toLowerCase());
        Random random = new Random(seed);

        float[] vector = new float[EMBEDDING_DIM];
        double sumSquares = 0.0;

        for (int i = 0; i < EMBEDDING_DIM; i++) {
            // Gaussian distribution around 0.0
            vector[i] = (float) random.nextGaussian();
            sumSquares += vector[i] * vector[i];
        }

        // L2 Unit Normalization (required for Cosine Similarity)
        float norm = (float) Math.sqrt(sumSquares);
        if (norm > 0) {
            for (int i = 0; i < EMBEDDING_DIM; i++) {
                vector[i] /= norm;
            }
        }

        log.debug("Generated deterministic mock embedding (dim={}, seed={}) for text snippet: '{}'",
                EMBEDDING_DIM, seed, text.length() > 30 ? text.substring(0, 30) + "..." : text);
        return vector;
    }

    @Override
    public String generateChatResponse(String systemPrompt, String userPrompt) {
        log.info("Mock AI generating chat response for user prompt: '{}'",
                userPrompt.length() > 50 ? userPrompt.substring(0, 50) + "..." : userPrompt);

        // Extract first chunk code from systemPrompt if available for realistic citation testing
        String chunkPrefix = "";
        if (systemPrompt != null) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\[MÃ:\\s*([A-Za-z0-9_\\-]+)\\]").matcher(systemPrompt);
            if (m.find()) {
                chunkPrefix = "[" + m.group(1) + "] ";
            }
        }

        // Deterministic answer based on keywords
        String lower = userPrompt.toLowerCase();
        if (lower.contains("khai sinh")) {
            return chunkPrefix + "Thủ tục đăng ký khai sinh được giải quyết trong 01 ngày làm việc tại Ủy ban nhân dân cấp xã. " +
                    "Hồ sơ cần nộp bao gồm: Giấy chứng sinh (hoặc văn bản thay thế), Tờ khai đăng ký khai sinh, và xuất trình CCCD của cha mẹ. " +
                    "(Căn cứ: Luật Hộ tịch 2014 & Nghị định 123/2015/NĐ-CP).";
        } else if (lower.contains("kết hôn")) {
            return chunkPrefix + "Thủ tục đăng ký kết hôn được giải quyết ngay trong ngày làm việc sau khi hai bên nam nữ có mặt và nộp đủ hồ sơ hợp lệ. " +
                    "Thủ tục hoàn toàn miễn phí khi đăng ký đúng hạn. (Căn cứ: Luật Hộ tịch 2014 & Nghị định 123/2015/NĐ-CP).";
        } else if (lower.contains("thường trú")) {
            return chunkPrefix + "Thủ tục đăng ký thường trú được tiếp nhận tại Công an cấp xã/phường. " +
                    "Hồ sơ gồm Tờ khai thay đổi thông tin cư trú (Mẫu CT01) và giấy tờ chứng minh chỗ ở hợp pháp. " +
                    "Thời hạn giải quyết tối đa 07 ngày làm việc. (Căn cứ: Luật Cư trú 2020).";
        }

        return chunkPrefix + "Theo quy định pháp luật hành chính hiện hành tại Ủy ban nhân dân cấp xã, thủ tục được tiếp nhận tại Bộ phận Một cửa. " +
                "Công dân vui lòng chuẩn bị đầy đủ hồ sơ theo hướng dẫn niêm yết.";
    }

    @Override
    public String performVisionOcr(byte[] imageBytes, String mimeType) {
        int byteSize = imageBytes != null ? imageBytes.length : 0;
        log.info("Mock AI performing vision OCR on image (size={} bytes, mimeType={})", byteSize, mimeType);

        // Return structured OCR JSON simulation matching Form Rule Engine schema
        return """
            {
              "fullName": "NGUYỄN VĂN AN",
              "birthDate": "15/08/1995",
              "gender": "Nam",
              "cccdNumber": "079095012345",
              "issueDate": "20/09/2021",
              "issuePlace": "Cục Cảnh sát QLHC về TTXH",
              "permanentAddress": "Số 15 Võ Oanh, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh",
              "overallConfidence": 0.945,
              "fieldConfidences": {
                "fullName": 0.98,
                "birthDate": 0.96,
                "gender": 0.99,
                "cccdNumber": 0.95,
                "issueDate": 0.92,
                "permanentAddress": 0.89
              }
            }
            """;
    }

    private long computeHashSeed(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            long seed = 0;
            for (int i = 0; i < 8; i++) {
                seed = (seed << 8) | (hash[i] & 0xFF);
            }
            return seed;
        } catch (NoSuchAlgorithmException e) {
            return input.hashCode();
        }
    }
}
