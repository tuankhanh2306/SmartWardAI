package vn.edu.uth.smartward.rag;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.ai.GeminiAiClient;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.common.QueryCacheService;
import vn.edu.uth.smartward.common.RedisRateLimiter;
import vn.edu.uth.smartward.rag.dto.LegalCitationDto;
import vn.edu.uth.smartward.rag.dto.RagAskRequest;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Core Service for Administrative Legal Retrieval-Augmented Generation (Legal RAG).
 * Implements:
 * 1. 768-dim Query Vectorization
 * 2. pgvector HNSW Cosine Similarity Retrieval
 * 3. Abstention Guardrail (theta = 0.78 default) with competent authority routing
 * 4. 5-Section Standardized Administrative Formatting
 * 5. Citation Post-verification
 * 6. Non-caching of truncated responses & Redis Distributed Cache
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RagQueryService {

    private final LegalChunkRepository chunkRepository;
    private final AiModelClient aiModelClient;
    private final QueryCacheService queryCacheService;
    private final RedisRateLimiter redisRateLimiter;

    @Value("${smartward.rag.default-threshold:0.78}")
    private double defaultThreshold;

    @Value("${smartward.rag.top-k:3}")
    private int defaultTopK;

    public static final String LEGAL_DISCLAIMER =
            "*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*";

    private static final Pattern CITATION_PATTERN = Pattern.compile("\\[([A-Za-z0-9_\\-]+)\\]");

    /**
     * Executes citizen legal inquiry with rate limit, caching, HNSW search, abstention guardrail, and citation verification.
     */
    public RagAskResponse askQuestion(RagAskRequest request, String clientIp) {
        long startTime = System.currentTimeMillis();

        // 1. Rate Limiting Check (5 req/min/IP)
        if (clientIp != null && !clientIp.isBlank()) {
            if (!redisRateLimiter.isAllowed(clientIp)) {
                log.warn("Rate limit exceeded for IP: {}", clientIp);
                throw new BusinessException(ErrorCode.RATE_LIMIT_EXCEEDED,
                        "Bạn đã gửi quá 5 yêu cầu/phút. Vui lòng chờ 1 phút trước khi hỏi tiếp.");
            }
        }

        String rawQuery = request.getQuestion().trim();

        // 2. Redis Distributed Query Cache Check
        Optional<RagAskResponse> cachedOpt = queryCacheService.getCachedResponse(rawQuery, RagAskResponse.class);
        if (cachedOpt.isPresent()) {
            RagAskResponse cached = cachedOpt.get();
            cached.setCached(true);
            cached.setResponseTimeMs(System.currentTimeMillis() - startTime);
            log.info("RAG Query served from cache: '{}'", truncate(rawQuery, 40));
            return cached;
        }

        // 3. Conversational Intent Check: Greeting & Introduction
        if (isGreetingQuery(rawQuery)) {
            return buildGreetingResponse(request.getWardName(), request.getOfficeAddress(), startTime);
        }

        // 4. Ward Office Info Check (Address, working hours, hotline)
        if (isWardOfficeQuery(rawQuery)) {
            return buildWardOfficeResponse(request.getWardName(), request.getOfficeAddress(), startTime);
        }

        // 5. Query Vectorization (768-dim)
        float[] queryEmbedding = aiModelClient.generateEmbedding(rawQuery);
        String pgVectorString = aiModelClient.toPgVectorString(queryEmbedding);

        // 6. Retrieve Top-K Chunks using pgvector HNSW
        int k = (request.getTopK() != null && request.getTopK() > 0) ? request.getTopK() : defaultTopK;
        List<LegalChunkMatch> candidateChunks = chunkRepository.findTopKSimilarChunksWithMetadata(pgVectorString, k);

        double threshold = (request.getSimilarityThreshold() != null && request.getSimilarityThreshold() > 0)
                ? request.getSimilarityThreshold() : defaultThreshold;

        double maxSimilarity = candidateChunks.isEmpty() ? 0.0 :
                candidateChunks.stream()
                        .mapToDouble(m -> m.getSimilarityScore() != null ? m.getSimilarityScore() : 0.0)
                        .max()
                        .orElse(0.0);

        log.info("RAG retrieval for query '{}': found {} candidates, maxSimilarity={}",
                truncate(rawQuery, 40), candidateChunks.size(), String.format(Locale.US, "%.4f", maxSimilarity));

        // 7. Abstention Guardrail: S_max < theta (Safe abstention without calling LLM)
        if (candidateChunks.isEmpty() || maxSimilarity < threshold) {
            long elapsed = System.currentTimeMillis() - startTime;
            String reason = String.format(Locale.US,
                    "Điểm tương đồng cao nhất (%.3f) thấp hơn ngưỡng an toàn pháp lý (%.2f).",
                    maxSimilarity, threshold);

            String abstentionAnswer = resolveAbstentionMessage(rawQuery, request.getWardName(), request.getOfficeAddress());

            RagAskResponse abstainedResponse = RagAskResponse.builder()
                    .answer(abstentionAnswer)
                    .abstained(true)
                    .abstentionReason(reason)
                    .maxSimilarity(maxSimilarity)
                    .appliedThreshold(threshold)
                    .citations(Collections.emptyList())
                    .cached(false)
                    .responseTimeMs(elapsed)
                    .disclaimer(LEGAL_DISCLAIMER)
                    .build();

            // Cache abstention for 30 minutes to conserve LLM quota on repetitive invalid queries
            queryCacheService.putResponse(rawQuery, abstainedResponse, 1800);
            return abstainedResponse;
        }

        // 6. Build Grounded Context and Invoke LLM
        String systemPrompt = buildSystemPrompt(candidateChunks, request.getWardName(), request.getOfficeAddress());
        String generatedAnswer = aiModelClient.generateChatResponse(systemPrompt, rawQuery);

        // Ensure disclaimer is always present at the end
        if (generatedAnswer != null && !generatedAnswer.contains("không thay thế quyết định chính thức")) {
            generatedAnswer = generatedAnswer.trim() + "\n\n" + LEGAL_DISCLAIMER;
        }

        // 7. Post-Verification of Legal Citations
        List<LegalCitationDto> verifiedCitations = postVerifyCitations(generatedAnswer, candidateChunks);

        long elapsed = System.currentTimeMillis() - startTime;

        RagAskResponse response = RagAskResponse.builder()
                .answer(generatedAnswer)
                .abstained(false)
                .abstentionReason(null)
                .maxSimilarity(maxSimilarity)
                .appliedThreshold(threshold)
                .citations(verifiedCitations)
                .cached(false)
                .responseTimeMs(elapsed)
                .disclaimer(LEGAL_DISCLAIMER)
                .build();

        // 8. Cache successful RAG response with standard TTL (1 hour) ONLY IF NOT TRUNCATED
        boolean isTruncated = generatedAnswer != null && (
                generatedAnswer.contains(GeminiAiClient.TRUNCATION_FALLBACK_NOTICE) ||
                generatedAnswer.contains("vượt quá giới hạn hiển thị tự động")
        );

        if (!isTruncated) {
            queryCacheService.putResponse(rawQuery, response);
        } else {
            log.warn("Response truncated, skipping caching in Redis for query: '{}'", truncate(rawQuery, 40));
        }

        return response;
    }

    /**
     * Builds structured legal prompt enforcing strict adherence to retrieved text and 5-section administrative structure.
     */
    private String buildSystemPrompt(List<LegalChunkMatch> chunks, String wardName, String officeAddress) {
        String effectiveWard = (wardName != null && !wardName.isBlank()) ? wardName : "UBND cấp xã/phường nơi tiếp nhận";
        String effectiveAddress = (officeAddress != null && !officeAddress.isBlank()) ? officeAddress : "Bộ phận Tiếp nhận và Trả kết quả (Một cửa)";

        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là công chức mẫn cán tại Bộ phận Tiếp nhận và Trả kết quả (Một cửa) thuộc ").append(effectiveWard).append(".\n");
        sb.append("NHIỆM VỤ: Hướng dẫn thủ tục hành chính công trực tiếp, chính xác, ân cần và chuẩn mực.\n\n");
        sb.append("QUY TẮC BẮT BUỘC (TUÂN THỦ 100%, KHÔNG NGOẠI LỆ):\n");
        sb.append("1. NGUYÊN TẮC TRỰC TIẾP & KHÔNG RƯỜM RÀ: TUYỆT ĐỐI CẤM các câu chào hỏi khách sáo (như 'Xin chào quý công dân', 'Chào bạn', 'Rất vui được hỗ trợ'), CẤM cảm ơn/xin lỗi lê thê, CẤM lặp lại câu hỏi. BẮT BUỘC BẮT ĐẦU NGAY BẰNG: '1. TÓM TẮT THỦ TỤC:'.\n");
        sb.append("2. CHỈ sử dụng dữ liệu trong các đoạn văn bản pháp lý được cung cấp bên dưới. TUYỆT ĐỐI KHÔNG tự suy đoán, bịa đặt điều luật hay số liệu.\n");
        sb.append("3. QUY TẮC THIẾU THÔNG TIN: Nếu trong dữ liệu chưa có thông tin về thời hạn, lệ phí hoặc địa chỉ, BẮT BUỘC ghi rõ: 'Chưa có dữ liệu, vui lòng liên hệ Bộ phận Một cửa'. TUYỆT ĐỐI KHÔNG đoán mò.\n");
        sb.append("4. BẮT BUỘC TRÍCH DẪN MÃ ĐOẠN: Khi nêu điều kiện, giấy tờ, thời hạn hoặc lệ phí, phải đính kèm mã trích dẫn dạng [MÃ_ĐOẠN] (ví dụ: [KS-01-DK]).\n");
        sb.append("5. ĐỊNH DẠNG BẮT BUỘC ĐỦ 5 PHẦN THEO ĐÚNG THỨ TỰ:\n");
        sb.append("   1. TÓM TẮT THỦ TỤC: (Tối đa 01 câu trả lời thẳng vào vấn đề chính).\n");
        sb.append("   2. THÀNH PHẦN HỒ SƠ: (Gạch đầu dòng từng loại giấy tờ phải nộp và xuất trình).\n");
        sb.append("   3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ: (Nêu rõ số ngày làm việc và mức phí cụ thể; nếu thiếu ghi 'Chưa có dữ liệu, vui lòng liên hệ Bộ phận Một cửa').\n");
        sb.append("   4. NƠI TIẾP NHẬN & XỬ LÝ: (Ghi rõ: Bộ phận Một cửa của ").append(effectiveWard).append(" - Địa chỉ: ").append(effectiveAddress).append(").\n");
        sb.append("   5. CĂN CỨ PHÁP LÝ & LƯU Ý: (Nêu mã thủ tục/điều khoản quy định và kết thúc bắt buộc bằng câu disclaimer: '").append(LEGAL_DISCLAIMER).append("').\n\n");
        sb.append("--- DỮ LIỆU CĂN CỨ PHÁP LÝ CHÍNH THỨC ĐƯỢC CUNG CẤP ---\n");

        for (LegalChunkMatch c : chunks) {
            sb.append(String.format("[MÃ: %s] Thủ tục: %s | Tiêu đề: %s | Căn cứ: %s\nNội dung: %s\n\n",
                    c.getChunkCode(),
                    c.getProcedureName() != null ? c.getProcedureName() : "Thủ tục hành chính",
                    c.getTitle(),
                    c.getLegalReference() != null ? c.getLegalReference() : "Quy định hiện hành",
                    c.getContent()));
        }

        return sb.toString();
    }

    /**
     * Resolves safe abstention guidance with competent authority identification when applicable.
     */
    private String resolveAbstentionMessage(String query, String wardName, String officeAddress) {
        String lower = query.toLowerCase();
        String specificAuthority = null;

        if (lower.contains("hộ chiếu") || lower.contains("passport") || lower.contains("xuất cảnh") || lower.contains("nhập cảnh")) {
            specificAuthority = "Cục Quản lý xuất nhập cảnh (Bộ Công an) hoặc Phòng Quản lý xuất nhập cảnh Công an tỉnh/thành phố";
        } else if (lower.contains("bằng lái") || lower.contains("giấy phép lái xe") || lower.contains("gplx") || lower.contains("đổi bằng")) {
            specificAuthority = "Sở Giao thông vận tải hoặc Trung tâm sát hạch và cấp giấy phép lái xe";
        } else if (lower.contains("thuế thu nhập cá nhân") || lower.contains("hoàn thuế") || lower.contains("mã số thuế cá nhân")) {
            specificAuthority = "Chi cục Thuế khu vực hoặc Cục Thuế tỉnh/thành phố";
        } else if (lower.contains("đăng ký doanh nghiệp") || lower.contains("thành lập công ty") || lower.contains("giấy phép kinh doanh công ty")) {
            specificAuthority = "Sở Kế hoạch và Đầu tư tỉnh/thành phố";
        } else if (lower.contains("bảo hiểm xã hội") || lower.contains("rút bhxh") || lower.contains("sổ bảo hiểm")) {
            specificAuthority = "Cơ quan Bảo hiểm xã hội cấp huyện hoặc tỉnh";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("Yêu cầu này nằm ngoài phạm vi dữ liệu thủ tục hành chính cấp xã hoặc mức độ tin cậy pháp lý không đạt ngưỡng an toàn (0.78). ");
        sb.append("Hệ thống kiên quyết từ chối suy đoán để tuân thủ quy chuẩn an toàn thông tin theo Nghị định 13/2023/NĐ-CP. ");

        if (specificAuthority != null) {
            sb.append("Thủ tục quý công dân đang quan tâm thuộc thẩm quyền giải quyết của ").append(specificAuthority).append(". ");
            sb.append("Quý công dân vui lòng liên hệ cơ quan trên để được hướng dẫn chi tiết.");
        } else {
            String wardLabel = (wardName != null && !wardName.isBlank()) ? wardName : "UBND cấp xã";
            String addrLabel = (officeAddress != null && !officeAddress.isBlank()) ? " (Địa chỉ: " + officeAddress + ")" : "";
            sb.append("Quý công dân vui lòng liên hệ trực tiếp Bộ phận Tiếp nhận và Trả kết quả (Một cửa) tại ")
              .append(wardLabel).append(addrLabel)
              .append(" hoặc Tổng đài Dịch vụ công Quốc gia 18001096 để được hỗ trợ chính xác.");
        }

        return sb.toString();
    }

    /**
     * Post-verification algorithm:
     * 1. Extracts bracketed codes [CODE] from LLM response.
     * 2. Cross-references against retrieved Top-K chunks to eliminate hallucinated references.
     * 3. If no brackets found, includes the top valid retrieved chunk so citizen has official reference.
     */
    public List<LegalCitationDto> postVerifyCitations(String answer, List<LegalChunkMatch> candidates) {
        Map<String, LegalChunkMatch> candidateMap = new LinkedHashMap<>();
        for (LegalChunkMatch c : candidates) {
            if (c.getChunkCode() != null) {
                candidateMap.put(c.getChunkCode().toUpperCase(), c);
            }
        }

        Set<String> matchedCodes = new LinkedHashSet<>();
        Matcher matcher = CITATION_PATTERN.matcher(answer);
        while (matcher.find()) {
            String code = matcher.group(1).toUpperCase();
            if (candidateMap.containsKey(code)) {
                matchedCodes.add(code);
            } else {
                log.warn("Hallucinated citation detected and discarded by post-verifier: [{}]", code);
            }
        }

        List<LegalCitationDto> results = new ArrayList<>();

        if (!matchedCodes.isEmpty()) {
            for (String code : matchedCodes) {
                LegalChunkMatch c = candidateMap.get(code);
                results.add(mapToCitationDto(c));
            }
        } else {
            // Fallback: If LLM didn't format brackets, provide top matching chunk as primary reference
            if (!candidates.isEmpty()) {
                results.add(mapToCitationDto(candidates.get(0)));
            }
        }

        return results;
    }

    private LegalCitationDto mapToCitationDto(LegalChunkMatch c) {
        String content = c.getContent() != null ? c.getContent() : "";
        String excerpt = content.length() > 200 ? content.substring(0, 197) + "..." : content;

        return LegalCitationDto.builder()
                .chunkCode(c.getChunkCode())
                .procedureName(c.getProcedureName())
                .procedureCode(c.getProcedureCode())
                .title(c.getTitle())
                .legalReference(c.getLegalReference())
                .excerpt(excerpt)
                .similarityScore(c.getSimilarityScore() != null ? c.getSimilarityScore() : 0.0)
                .build();
    }

    private static final Set<String> EXACT_GREETINGS = Set.of(
            "hi", "hello", "hey", "alo", "chào", "xin chào", "kính chào",
            "chào bạn", "chào bot", "chào ad", "chào cán bộ", "chào ủy ban",
            "chào anh", "chào chị", "chào em",
            "bạn là ai", "ai đó", "bạn là cái gì",
            "bạn giúp được gì", "bạn có thể làm gì", "chức năng của bạn",
            "hướng dẫn sử dụng", "giới thiệu", "giới thiệu bản thân",
            "good morning", "good afternoon", "good evening", "start", "bắt đầu"
    );

    private static final List<String> PROCEDURE_KEYWORDS = List.of(
            "khai sinh", "chứng sinh", "mới sinh", "sinh con",
            "kết hôn", "lấy vợ", "lấy chồng", "hôn thú", "đăng ký kết hôn",
            "khai tử", "chứng tử", "báo tử", "người mất",
            "thường trú", "tạm trú", "ct01", "cư trú", "nhập khẩu", "hộ khẩu",
            "chứng thực", "sao y", "công chứng", "chữ ký",
            "độc thân", "tình trạng hôn nhân", "trích lục", "bảo trợ", "mai táng"
    );

    boolean isGreetingQuery(String query) {
        if (query == null) return false;
        String q = query.trim().toLowerCase().replaceAll("[!?.,;:]+$", "");
        if (q.isEmpty()) return false;

        // If query contains procedure keywords, it is a PROCEDURE query, not greeting
        for (String kw : PROCEDURE_KEYWORDS) {
            if (q.contains(kw)) {
                return false;
            }
        }

        if (EXACT_GREETINGS.contains(q)) {
            return true;
        }

        if (q.length() <= 30) {
            if (q.matches("^(hi|hello|hey|alo|xin\\s+chào|chào)(\\s+.*)?$")) {
                return true;
            }
            if (q.matches("^(bạn|bot)\\s+(là\\s+ai|có\\s+thể\\s+làm\\s+gì|giúp\\s+gì).*$")) {
                return true;
            }
        }

        return false;
    }

    boolean isWardOfficeQuery(String query) {
        if (query == null) return false;
        String q = query.trim().toLowerCase();

        for (String kw : PROCEDURE_KEYWORDS) {
            if (q.contains(kw)) {
                return false;
            }
        }

        List<String> officePatterns = List.of(
                "địa chỉ ở đâu", "trụ sở ở đâu", "địa chỉ ủy ban", "địa chỉ ubnd",
                "ủy ban ở đâu", "ubnd ở đâu", "trụ sở ubnd",
                "giờ làm việc", "mấy giờ làm việc", "mấy giờ mở cửa",
                "giờ tiếp dân", "thời gian làm việc", "thứ 7 có làm việc không",
                "số điện thoại", "hotline", "liên hệ ai"
        );

        return officePatterns.stream().anyMatch(q::contains);
    }

    private RagAskResponse buildGreetingResponse(String wardName, String officeAddress, long startTime) {
        String wardLabel = (wardName != null && !wardName.isBlank()) ? wardName : "UBND cấp xã/phường";
        String answer = String.format(
                "Xin chào! Tôi là Trợ lý Pháp lý Một Cửa tại %s.\n\n" +
                "Tôi sẵn sàng hỗ trợ bà con tra cứu, giải đáp và hướng dẫn chuẩn bị hồ sơ cho các thủ tục hành chính cấp xã/phường như:\n" +
                "• Đăng ký khai sinh, kết hôn, khai tử, trích lục hộ tịch\n" +
                "• Đăng ký thường trú, tạm trú, thông tin cư trú (Mẫu CT01)\n" +
                "• Chứng thực chữ ký, chứng thực bản sao từ bản chính\n" +
                "• Cấp giấy xác nhận tình trạng hôn nhân (giấy độc thân)\n" +
                "• Các chế độ chính sách bảo trợ xã hội và tiền kiểm tra hồ sơ\n\n" +
                "Bà con đang cần tìm hiểu hoặc chuẩn bị làm thủ tục nào? Hãy nhập câu hỏi để tôi hướng dẫn chi tiết nhé!",
                wardLabel
        );

        return RagAskResponse.builder()
                .answer(answer)
                .abstained(false)
                .maxSimilarity(1.0)
                .appliedThreshold(defaultThreshold)
                .citations(Collections.emptyList())
                .cached(false)
                .responseTimeMs(System.currentTimeMillis() - startTime)
                .disclaimer("Trợ lý Pháp lý Một Cửa SmartWard AI sẵn sàng phục vụ nhân dân.")
                .build();
    }

    private RagAskResponse buildWardOfficeResponse(String wardName, String officeAddress, long startTime) {
        String wardLabel = (wardName != null && !wardName.isBlank()) ? wardName : "UBND cấp xã/phường";
        String addrLabel = (officeAddress != null && !officeAddress.isBlank()) ? officeAddress : "Trụ sở Bộ phận Tiếp nhận và Trả kết quả";
        String answer = String.format(
                "Thông tin liên hệ và thời gian làm việc của Bộ phận Tiếp nhận và Trả kết quả (Một Cửa) thuộc %s:\n\n" +
                "• Trụ sở / Địa chỉ Một cửa: %s\n" +
                "• Giờ tiếp nhận và trả kết quả: Sáng từ 07:30 – 11:30 | Chiều từ 13:30 – 17:00 (Thứ 2 đến Thứ 6; Thứ 7 làm việc buổi sáng).\n" +
                "• Cổng Dịch vụ công Quốc gia: Nộp hồ sơ trực tuyến 24/7 tại dichvucong.gov.vn\n\n" +
                "Bà con có thể đến trực tiếp trong khung giờ làm việc trên hoặc gửi câu hỏi về thủ tục hành chính để tôi hướng dẫn chuẩn bị đầy đủ hồ sơ trước khi đến nộp.",
                wardLabel, addrLabel
        );

        return RagAskResponse.builder()
                .answer(answer)
                .abstained(false)
                .maxSimilarity(1.0)
                .appliedThreshold(defaultThreshold)
                .citations(Collections.emptyList())
                .cached(false)
                .responseTimeMs(System.currentTimeMillis() - startTime)
                .disclaimer("Thông tin chính thức từ Danh bạ hành chính UBND cấp xã/phường.")
                .build();
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() > maxLen ? text.substring(0, maxLen) + "..." : text;
    }
}
