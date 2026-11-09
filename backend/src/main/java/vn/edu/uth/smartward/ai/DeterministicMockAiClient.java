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
    public static final String MODEL_ID = "deterministic-mock-v1";

    @Override
    public String getEmbeddingModelId() {
        return MODEL_ID;
    }

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
        String chunkCode = "TTHC-01";
        if (systemPrompt != null) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\[MÃ:\\s*([A-Za-z0-9_\\-]+)\\]").matcher(systemPrompt);
            if (m.find()) {
                chunkCode = m.group(1);
            }
        }

        String lower = userPrompt.toLowerCase();
        boolean missingFeeOrAddress = lower.contains("thiếu lệ phí") || lower.contains("không có lệ phí") ||
                                      lower.contains("thiếu địa chỉ") || lower.contains("không có địa chỉ");

        String feeText = missingFeeOrAddress ? "Chưa có dữ liệu, vui lòng liên hệ Bộ phận Một cửa" :
                "Miễn lệ phí hoàn toàn khi đăng ký đúng thời hạn quy định.";
        String addressText = missingFeeOrAddress ? "Chưa có dữ liệu, vui lòng liên hệ Bộ phận Một cửa" :
                "Bộ phận Tiếp nhận và Trả kết quả (Một cửa) thuộc UBND cấp xã/phường nơi tiếp nhận hồ sơ.";

        StringBuilder sb = new StringBuilder();
        sb.append("1. TÓM TẮT THỦ TỤC:\n");

        if (lower.contains("khai sinh")) {
            sb.append("Thủ tục đăng ký khai sinh cho trẻ mới sinh được giải quyết trong 01 ngày làm việc tại Ủy ban nhân dân cấp xã.\n\n");
            sb.append("2. THÀNH PHẦN HỒ SƠ:\n");
            sb.append("- Tờ khai đăng ký khai sinh theo mẫu quy định.\n");
            sb.append("- Giấy chứng sinh do cơ sở y tế có thẩm quyền cấp (hoặc văn bản thay thế theo luật định).\n");
            sb.append("- Xuất trình bản chính Căn cước công dân hoặc Hộ chiếu của cha, mẹ để đối chiếu.\n");
            sb.append("- Giấy chứng nhận kết hôn của cha mẹ (trường hợp cha mẹ đã đăng ký kết hôn).\n\n");
            sb.append("3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n");
            sb.append("- Thời hạn giải quyết: Trong ngày làm việc tiếp nhận đủ hồ sơ hợp lệ.\n");
            sb.append("- Lệ phí: ").append(feeText).append("\n\n");
            sb.append("4. NƠI TIẾP NHẬN & XỬ LÝ:\n");
            sb.append(addressText).append("\n\n");
            sb.append("5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n");
            sb.append("[").append(chunkCode).append("] Căn cứ Luật Hộ tịch 2014 và Nghị định 123/2015/NĐ-CP của Chính phủ.\n");
            sb.append("*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*");
            return sb.toString();
        } else if (lower.contains("kết hôn")) {
            sb.append("Thủ tục đăng ký kết hôn được giải quyết ngay trong ngày làm việc khi hai bên nam nữ có mặt và nộp đủ hồ sơ hợp lệ.\n\n");
            sb.append("2. THÀNH PHẦN HỒ SƠ:\n");
            sb.append("- Tờ khai đăng ký kết hôn theo mẫu quy định (hai bên cùng ký tên).\n");
            sb.append("- Bản chính Căn cước công dân của hai bên nam, nữ.\n");
            sb.append("- Giấy xác nhận tình trạng hôn nhân (nếu cư trú khác địa bàn đăng ký kết hôn).\n\n");
            sb.append("3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n");
            sb.append("- Thời hạn giải quyết: Ngay trong ngày làm việc tiếp nhận hồ sơ.\n");
            sb.append("- Lệ phí: ").append(feeText).append("\n\n");
            sb.append("4. NƠI TIẾP NHẬN & XỬ LÝ:\n");
            sb.append(addressText).append("\n\n");
            sb.append("5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n");
            sb.append("[").append(chunkCode).append("] Căn cứ Luật Hộ tịch 2014 và Nghị định 123/2015/NĐ-CP của Chính phủ.\n");
            sb.append("*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*");
            return sb.toString();
        } else if (lower.contains("thường trú")) {
            sb.append("Thủ tục đăng ký thường trú được tiếp nhận và giải quyết trong tối đa 07 ngày làm việc.\n\n");
            sb.append("2. THÀNH PHẦN HỒ SƠ:\n");
            sb.append("- Tờ khai thay đổi thông tin cư trú (Mẫu CT01).\n");
            sb.append("- Giấy tờ, tài liệu chứng minh chỗ ở hợp pháp (Sổ hồng, hợp đồng thuê nhà...).\n");
            sb.append("- Bản chính Căn cước công dân của người yêu cầu đăng ký.\n\n");
            sb.append("3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n");
            sb.append("- Thời hạn giải quyết: Tối đa 07 ngày làm việc kể từ ngày nhận đủ hồ sơ.\n");
            sb.append("- Lệ phí: ").append(feeText).append("\n\n");
            sb.append("4. NƠI TIẾP NHẬN & XỬ LÝ:\n");
            sb.append(addressText).append("\n\n");
            sb.append("5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n");
            sb.append("[").append(chunkCode).append("] Căn cứ Luật Cư trú 2020 và Thông tư số 56/2021/TT-BCA của Bộ Công an.\n");
            sb.append("*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*");
            return sb.toString();
        }

        sb.append("Thủ tục hành chính được tiếp nhận và hướng dẫn giải quyết theo quy định pháp luật hành chính hiện hành.\n\n");
        sb.append("2. THÀNH PHẦN HỒ SƠ:\n");
        sb.append("- Tờ khai hành chính theo mẫu quy định tương ứng với thủ tục yêu cầu.\n");
        sb.append("- Bản sao có chứng thực hoặc bản chính kèm theo giấy tờ tùy thân hợp lệ.\n\n");
        sb.append("3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n");
        sb.append("- Thời hạn giải quyết: ").append(missingFeeOrAddress ? "Chưa có dữ liệu, vui lòng liên hệ Bộ phận Một cửa" : "Theo quy định niêm yết công khai").append(".\n");
        sb.append("- Lệ phí: ").append(feeText).append("\n\n");
        sb.append("4. NƠI TIẾP NHẬN & XỬ LÝ:\n");
        sb.append(addressText).append("\n\n");
        sb.append("5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n");
        sb.append("[").append(chunkCode).append("] Căn cứ quy định pháp luật hiện hành và văn bản niêm yết tại UBND cấp xã.\n");
        sb.append("*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*");
        return sb.toString();
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
