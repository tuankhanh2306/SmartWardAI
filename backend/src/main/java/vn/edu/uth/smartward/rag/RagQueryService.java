package vn.edu.uth.smartward.rag;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.edu.uth.smartward.ai.AiModelClient;
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
 * 3. Abstention Guardrail (theta = 0.78 default)
 * 4. Citation Post-verification
 * 5. Redis Rate Limiting & Distributed Cache
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
            "Thông tin phản hồi tự động từ hệ thống SmartWard AI chỉ mang tính chất hướng dẫn, tham khảo thủ tục hành chính tại UBND cấp xã. " +
            "Để hoàn thiện hồ sơ chính thức, quý công dân vui lòng đối chiếu văn bản quy phạm pháp luật hiện hành hoặc liên hệ trực tiếp Bộ phận Tiếp nhận và Trả kết quả (Một cửa).";

    private static final String ABSTENTION_MESSAGE =
            "Yêu cầu này nằm ngoài phạm vi dữ liệu thủ tục hành chính cấp xã hoặc mức độ tin cậy pháp lý không đạt ngưỡng an toàn (0.78). " +
            "Hệ thống kiên quyết từ chối suy đoán để tuân thủ quy chuẩn an toàn thông tin theo Nghị định 13/2023/NĐ-CP. " +
            "Quý công dân vui lòng liên hệ trực tiếp Bộ phận Tiếp nhận và Trả kết quả (Một cửa) tại UBND cấp xã hoặc Tổng đài Dịch vụ công Quốc gia 18001096 để được hỗ trợ chính xác.";

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

        // 3. Query Vectorization (768-dim)
        float[] queryEmbedding = aiModelClient.generateEmbedding(rawQuery);
        String pgVectorString = aiModelClient.toPgVectorString(queryEmbedding);

        // 4. Retrieve Top-K Chunks using pgvector HNSW
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

        // 5. Abstention Guardrail: S_max < theta
        if (candidateChunks.isEmpty() || maxSimilarity < threshold) {
            long elapsed = System.currentTimeMillis() - startTime;
            String reason = String.format(Locale.US,
                    "Điểm tương đồng cao nhất (%.3f) thấp hơn ngưỡng an toàn pháp lý (%.2f).",
                    maxSimilarity, threshold);

            RagAskResponse abstainedResponse = RagAskResponse.builder()
                    .answer(ABSTENTION_MESSAGE)
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

        // 6. Build Context and Invoke LLM
        String systemPrompt = buildSystemPrompt(candidateChunks);
        String generatedAnswer = aiModelClient.generateChatResponse(systemPrompt, rawQuery);

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

        // 8. Cache successful RAG response with standard TTL (1 hour)
        queryCacheService.putResponse(rawQuery, response);
        return response;
    }

    /**
     * Builds structured legal prompt enforcing strict adherence to retrieved text.
     */
    private String buildSystemPrompt(List<LegalChunkMatch> chunks) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là Trợ lý Pháp lý Hành chính công SmartWard AI, hỗ trợ giải đáp thủ tục cấp xã/phường cho công dân.\n");
        sb.append("QUY TẮC BẮT BUỘC:\n");
        sb.append("1. CHỈ sử dụng thông tin trong các đoạn văn bản pháp lý được cung cấp dưới đây.\n");
        sb.append("2. TUYỆT ĐỐI KHÔNG tự suy diễn, bịa đặt hoặc đưa ra thông tin không có trong tài liệu đính kèm.\n");
        sb.append("3. BẮT BUỘC trích dẫn rõ mã đoạn luật dạng [MÃ_ĐOẠN] (ví dụ: [KS-01-DK]) khi nêu bất kỳ điều kiện, thời hạn, phí hoặc hồ sơ nào.\n");
        sb.append("4. Nếu trong văn bản không đủ thông tin để trả lời trọn vẹn, hãy nói rõ những phần chưa có cơ sở pháp lý.\n");
        sb.append("5. Ngôn ngữ trang trọng, chuẩn mực hành chính Việt Nam.\n\n");
        sb.append("--- CĂN CỨ PHÁP LÝ ĐƯỢC CUNG CẤP ---\n");

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

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() > maxLen ? text.substring(0, maxLen) + "..." : text;
    }
}
