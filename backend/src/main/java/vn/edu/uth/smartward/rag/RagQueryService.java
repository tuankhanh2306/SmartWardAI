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
import vn.edu.uth.smartward.rag.dto.ConversationTurnDto;
import vn.edu.uth.smartward.rag.dto.HitlGrayZoneItemDto;
import vn.edu.uth.smartward.rag.dto.LegalCitationDto;
import vn.edu.uth.smartward.rag.dto.RagAskRequest;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
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

    @Value("${smartward.rag.theta-lower:0.42}")
    private double defaultThetaLower;

    @Value("${smartward.rag.top-k:3}")
    private int defaultTopK;

    public static final String LEGAL_DISCLAIMER =
            "*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*";

    private static final Pattern CITATION_PATTERN = Pattern.compile("\\[([A-Za-z0-9_\\-]+)\\]");

    private final List<HitlGrayZoneItemDto> hitlQueue = new CopyOnWriteArrayList<>(defaultSeedHitlItems());

    private static List<HitlGrayZoneItemDto> defaultSeedHitlItems() {
        return List.of(
                HitlGrayZoneItemDto.builder()
                        .id("HITL-AG-001")
                        .query("Ba tôi già yếu đi lại khó khăn thì xã có cử người xuống tận nhà lăn tay chứng thực chữ ký được không?")
                        .wardName("Phường Mỹ Bình")
                        .similarityScore(0.612)
                        .candidateChunkCode("TTHC-CT-03-DIEU24")
                        .candidateProcedureName("Chứng thực chữ ký trong các giấy tờ, văn bản")
                        .legalReference("Khoản 2 Điều 10 & Điều 24 Nghị định 23/2015/NĐ-CP")
                        .suggestedAnswer("1. TÓM TẮT THỦ TỤC:\nNgười yêu cầu chứng thực già yếu, không thể đi lại được phép yêu cầu UBND cấp xã thực hiện chứng thực chữ ký ngoài trụ sở (tại nhà riêng).\n\n2. THÀNH PHẦN HỒ SƠ:\n- Bản chính CCCD của người yêu cầu chứng thực.\n- Văn bản, giấy tờ cần chứng thực chữ ký (điểm chỉ).\n\n3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n- Giải quyết trong ngày nhận yêu cầu.\n- Miễn thu chi phí đi lại ngoài trụ sở đối với người già yếu không thể đi lại theo quy định.\n\n4. NƠI TIẾP NHẬN & XỬ LÝ:\n- Bộ phận Một cửa UBND xã/phường tiếp nhận thông tin và cử công chức Tư pháp - Hộ tịch đến xác minh trực tiếp.\n\n5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n- Khoản 2 Điều 10 và Điều 24 Nghị định 23/2015/NĐ-CP [TTHC-CT-03-DIEU24].")
                        .status("PENDING")
                        .createdAt("2026-11-05 08:40")
                        .build(),
                HitlGrayZoneItemDto.builder()
                        .id("HITL-AG-002")
                        .query("Vợ chồng tôi làm mất giấy đăng ký kết hôn bản gốc từ năm 1998 ở xã cũ trước khi sáp nhập thì xin trích lục hay đăng ký lại?")
                        .wardName("Phường Long Xuyên")
                        .similarityScore(0.568)
                        .candidateChunkCode("TTHC-HT-05-DIEU24")
                        .candidateProcedureName("Đăng ký lại kết hôn / Cấp bản sao trích lục hộ tịch")
                        .legalReference("Điều 24 Nghị định 123/2015/NĐ-CP")
                        .suggestedAnswer("1. TÓM TẮT THỦ TỤC:\n- Nếu Sổ đăng ký kết hôn năm 1998 tại UBND xã vẫn còn lưu trữ: Thực hiện thủ tục Cấp bản sao trích lục kết hôn.\n- Nếu cả bản chính Giấy chứng nhận kết hôn và Sổ hộ tịch gốc đều bị mất/hư hỏng: Thực hiện thủ tục Đăng ký lại kết hôn.\n\n2. THÀNH PHẦN HỒ SƠ:\n- Tờ khai theo mẫu quy định.\n- Bản sao giấy tờ, tài liệu chứng minh quan hệ vợ chồng (nếu đăng ký lại).\n\n3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n- Trích lục bản sao: Giải quyết ngay trong ngày.\n- Đăng ký lại kết hôn: 05 ngày làm việc.\n\n4. NƠI TIẾP NHẬN & XỬ LÝ:\n- Bộ phận Một cửa UBND xã/phường nơi đã đăng ký trước đây hoặc nơi thường trú hiện tại.\n\n5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n- Điều 24 Nghị định 123/2015/NĐ-CP [TTHC-HT-05-DIEU24].")
                        .status("PENDING")
                        .createdAt("2026-11-05 09:15")
                        .build(),
                HitlGrayZoneItemDto.builder()
                        .id("HITL-AG-003")
                        .query("Cháu ngoại về ở nhà ông bà ngoại để đi học cấp 2 thì khai báo tạm trú hay nhập hộ khẩu thường trú?")
                        .wardName("Xã An Phú")
                        .similarityScore(0.645)
                        .candidateChunkCode("TTHC-CR-01-DIEU20")
                        .candidateProcedureName("Đăng ký thường trú / Đăng ký tạm trú (Mẫu CT01)")
                        .legalReference("Khoản 2 Điều 20 Luật Cư trú 2020")
                        .suggestedAnswer("1. TÓM TẮT THỦ TỤC:\nNgười chưa thành niên được đăng ký thường trú hoặc tạm trú tại chỗ ở hợp pháp của ông bà ngoại nếu được cha, mẹ hoặc người giám hộ và chủ hộ (ông bà ngoại) đồng ý.\n\n2. THÀNH PHẦN HỒ SƠ:\n- Tờ khai thay đổi thông tin cư trú (Mẫu CT01) có ý kiến đồng ý của cha mẹ và chủ hộ.\n- Giấy tờ chứng minh mối quan hệ nhân thân với chủ hộ (Giấy khai sinh của mẹ và của cháu).\n\n3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n- Thường trú: 07 ngày làm việc; Tạm trú: 03 ngày làm việc.\n\n4. NƠI TIẾP NHẬN & XỬ LÝ:\n- Công an cấp xã hoặc Cổng Dịch vụ công Bộ Công an / ứng dụng VNeID.\n\n5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n- Khoản 2 Điều 20 Luật Cư trú 2020 [TTHC-CR-01-DIEU20].")
                        .status("APPROVED")
                        .createdAt("2026-11-05 07:50")
                        .resolvedBy("Cán bộ Trần Thị Hương")
                        .build()
        );
    }

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

        // 3. Procedure Catalog Request ("nêu 40 thủ tục", "danh sách thủ tục"...)
        if (isProcedureListQuery(rawQuery)) {
            return buildProcedureCatalogResponse(request.getWardName(), startTime);
        }

        // 4. Conversational Intent Check: Small talk, Wellbeing, Gratitude, Greeting (including typo greetings)
        if (isGreetingOrSmallTalk(rawQuery)) {
            return buildSmallTalkResponse(rawQuery, request.getWardName(), startTime);
        }

        // 4.1. Ambiguous / Open Consultation Request ("bạn có thể tư vấn cho tôi không", "tư vấn giúp tôi"...)
        if (isAmbiguousConsultation(rawQuery)) {
            return buildAmbiguousConsultationResponse(request.getWardName(), startTime);
        }

        // 5. Ward Office Info Check (Address, working hours, hotline)
        if (isWardOfficeQuery(rawQuery)) {
            return buildWardOfficeResponse(request.getWardName(), request.getOfficeAddress(), startTime);
        }

        // 5.1. Multi-turn Context Resolution (Query Rewriting for Follow-up Inquiries)
        String effectiveQuery = resolveEffectiveQuery(rawQuery, request.getHistory());
        if (!effectiveQuery.equals(rawQuery)) {
            log.info("Contextual follow-up resolved: '{}' -> '{}'", rawQuery, effectiveQuery);
        }

        // 6. Query Vectorization (768-dim) using effectiveQuery
        float[] queryEmbedding = aiModelClient.generateEmbedding(effectiveQuery);
        String pgVectorString = aiModelClient.toPgVectorString(queryEmbedding);

        // 7. Retrieve Top-K Chunks using pgvector HNSW
        int k = (request.getTopK() != null && request.getTopK() > 0) ? request.getTopK() : defaultTopK;
        List<LegalChunkMatch> candidateChunks = chunkRepository.findTopKSimilarChunksWithMetadata(pgVectorString, k);

        double threshold = (request.getSimilarityThreshold() != null && request.getSimilarityThreshold() > 0)
                ? request.getSimilarityThreshold() : defaultThreshold;

        double maxSimilarity = candidateChunks.isEmpty() ? 0.0 :
                candidateChunks.stream()
                        .mapToDouble(m -> m.getSimilarityScore() != null ? m.getSimilarityScore() : 0.0)
                        .max()
                        .orElse(0.0);

        log.info("RAG retrieval for query '{}' (effective '{}'): found {} candidates, maxSimilarity={}",
                truncate(rawQuery, 40), truncate(effectiveQuery, 40), candidateChunks.size(), String.format(Locale.US, "%.4f", maxSimilarity));

        // 8. Abstention Guardrail: S_max < threshold (Safe abstention without calling LLM)
        if (candidateChunks.isEmpty() || maxSimilarity < threshold) {
            long elapsed = System.currentTimeMillis() - startTime;
            boolean isGrayZone = !candidateChunks.isEmpty() && maxSimilarity >= defaultThetaLower;

            String reason;
            String abstentionAnswer;

            if (isGrayZone) {
                log.warn("[HITL_QUEUE] Gray-zone query detected: '{}' (S_max={} in [theta_lower={}, theta={})). Flagged for human officer review.",
                        rawQuery, String.format(Locale.US, "%.4f", maxSimilarity), defaultThetaLower, threshold);
                LegalChunkMatch topCandidate = candidateChunks.get(0);
                reason = String.format(Locale.US,
                        "Vùng xám nghi vấn (%.3f trong khoảng [%.2f, %.2f)): Cần công dân làm rõ thêm hoặc cán bộ Một cửa hỗ trợ.",
                        maxSimilarity, defaultThetaLower, threshold);
                abstentionAnswer = resolveGrayZoneMessage(rawQuery, topCandidate, request.getWardName(), request.getOfficeAddress());
                enqueueGrayZoneItem(rawQuery, request.getWardName(), maxSimilarity, topCandidate, abstentionAnswer);
            } else {
                reason = String.format(Locale.US,
                        "Điểm tương đồng cao nhất (%.3f) thấp hơn ngưỡng an toàn pháp lý (%.2f).",
                        maxSimilarity, threshold);
                abstentionAnswer = resolveAbstentionMessage(rawQuery, request.getWardName(), request.getOfficeAddress());
            }

            List<String> defaultSuggestions = List.of(
                    "👶 Đăng ký khai sinh",
                    "💍 Đăng ký kết hôn",
                    "🏠 Đăng ký thường trú (CT01)",
                    "📋 Xem 40 thủ tục"
            );

            RagAskResponse abstainedResponse = RagAskResponse.builder()
                    .answer(abstentionAnswer)
                    .abstained(true)
                    .abstentionReason(reason)
                    .maxSimilarity(maxSimilarity)
                    .appliedThreshold(threshold)
                    .citations(Collections.emptyList())
                    .cached(false)
                    .suggestions(defaultSuggestions)
                    .responseTimeMs(elapsed)
                    .disclaimer(LEGAL_DISCLAIMER)
                    .build();

            // Cache abstention for 30 minutes to conserve LLM quota on repetitive invalid queries
            queryCacheService.putResponse(rawQuery, abstainedResponse, 1800);
            return abstainedResponse;
        }

        // 9. Build Grounded Context and Invoke LLM with Graceful Database Fallback
        String systemPrompt = buildSystemPrompt(candidateChunks, request.getWardName(), request.getOfficeAddress());
        String generatedAnswer;
        try {
            generatedAnswer = aiModelClient.generateChatResponse(systemPrompt, effectiveQuery);
            if (generatedAnswer == null || isAiFailureNotice(generatedAnswer)) {
                log.warn("AI Model returned empty or failure notice for query: '{}'. Activating structured database fallback.", truncate(rawQuery, 40));
                if (generatedAnswer != null && (generatedAnswer.contains(GeminiAiClient.TRUNCATION_FALLBACK_NOTICE) || generatedAnswer.contains("vượt quá giới hạn hiển thị tự động"))) {
                    // Keep truncation notice to maintain compatibility with adversarial safety checks
                } else {
                    generatedAnswer = buildStructuredFallbackAnswer(candidateChunks, request.getWardName(), request.getOfficeAddress());
                }
            }
        } catch (Exception ex) {
            log.error("AI Model invocation failed: {}. Falling back to structured database extraction.", ex.getMessage());
            generatedAnswer = buildStructuredFallbackAnswer(candidateChunks, request.getWardName(), request.getOfficeAddress());
        }

        // 9.1. Strip any conversational preamble before "1. TÓM TẮT THỦ TỤC:"
        generatedAnswer = prunePreamble(generatedAnswer);

        // 9.2. Ensure Section 5 is present if omitted by LLM
        if (generatedAnswer != null && !generatedAnswer.contains("5. CĂN CỨ PHÁP LÝ") && !candidateChunks.isEmpty()) {
            LegalChunkMatch topChunk = candidateChunks.get(0);
            String ref = topChunk.getLegalReference() != null ? topChunk.getLegalReference() : "Quy định pháp luật hiện hành";
            generatedAnswer = generatedAnswer.trim() + "\n\n5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n[" + topChunk.getChunkCode() + "] Căn cứ " + ref + ".\n" + LEGAL_DISCLAIMER;
        }

        // Ensure disclaimer is always present at the end
        if (generatedAnswer != null && !generatedAnswer.contains("không thay thế quyết định chính thức")) {
            generatedAnswer = generatedAnswer.trim() + "\n\n" + LEGAL_DISCLAIMER;
        }

        // 7. Post-Verification of Legal Citations
        List<LegalCitationDto> verifiedCitations = postVerifyCitations(generatedAnswer, candidateChunks);

        Set<String> validCodes = new HashSet<>();
        for (LegalChunkMatch c : candidateChunks) {
            if (c.getChunkCode() != null) {
                validCodes.add(c.getChunkCode());
            }
        }
        generatedAnswer = sanitizeAnswerCitations(generatedAnswer, validCodes);

        long elapsed = System.currentTimeMillis() - startTime;

        List<String> suggestions = generateProcedureSuggestions(candidateChunks);

        RagAskResponse response = RagAskResponse.builder()
                .answer(generatedAnswer)
                .abstained(false)
                .abstentionReason(null)
                .maxSimilarity(maxSimilarity)
                .appliedThreshold(threshold)
                .citations(verifiedCitations)
                .cached(false)
                .suggestions(suggestions)
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
    String resolveAbstentionMessage(String query, String wardName, String officeAddress) {
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
        } else if (lower.contains("lý lịch tư pháp") || lower.contains("phiếu lý lịch tư pháp") || lower.contains("lltp")) {
            specificAuthority = "Sở Tư pháp cấp tỉnh hoặc Trung tâm Lý lịch tư pháp quốc gia";
        } else if (lower.contains("biển số xe") || lower.contains("đăng ký xe máy") || lower.contains("đăng ký ô tô") || lower.contains("đăng ký xe") || lower.contains("cà vẹt xe") || lower.contains("sang tên xe")) {
            specificAuthority = "Công an cấp huyện hoặc Phòng CSGT Công an tỉnh";
        } else if (lower.contains("căn cước công dân") || lower.contains("thẻ căn cước") || lower.contains("cấp căn cước") || lower.contains("làm căn cước") || lower.contains("làm cccd") || lower.contains("căn cước")) {
            specificAuthority = "Công an cấp huyện";
        } else if (lower.contains("tạm trú") || lower.contains("thường trú") || lower.contains("tách hộ")
                || lower.contains("nhập khẩu") || lower.contains("hộ khẩu") || lower.contains("cư trú")
                || lower.contains("ct01") || lower.contains("ct07") || lower.contains("lưu trú")) {
            specificAuthority = "Công an cấp xã (Công an xã/phường/thị trấn) hoặc nộp trực tuyến qua Cổng Dịch vụ công Bộ Công an / Ứng dụng VNeID (theo Luật Cư trú 2020)";
        } else if (lower.contains("tranh chấp tài sản") || lower.contains("tranh chấp thừa kế") || lower.contains("kiện tụng") || lower.contains("khởi kiện") || lower.contains("tòa án") || (lower.contains("tranh chấp") && (lower.contains("thừa kế") || lower.contains("chia tài sản")))) {
            specificAuthority = "Tòa án nhân dân có thẩm quyền";
        }

        StringBuilder sb = new StringBuilder();

        if (specificAuthority != null) {
            sb.append("Yêu cầu này nằm ngoài thẩm quyền của UBND cấp xã và thuộc thẩm quyền giải quyết của ").append(specificAuthority).append(". ");
            sb.append("Bà con vui lòng liên hệ cơ quan trên hoặc tham khảo các thủ tục hành chính cấp xã dưới đây để được hướng dẫn.");
        } else {
            String wardLabel = (wardName != null && !wardName.isBlank()) ? wardName : "UBND cấp xã";
            String addrLabel = (officeAddress != null && !officeAddress.isBlank()) ? " (" + officeAddress + ")" : "";
            sb.append("Hệ thống SmartWard AI hiện chưa tìm thấy thông tin thủ tục tương ứng với câu hỏi của bà con trong thẩm quyền cấp xã. ");
            sb.append("Bà con vui lòng liên hệ trực tiếp Bộ phận Một cửa ").append(wardLabel).append(addrLabel)
              .append(" hoặc Tổng đài 18001096 để được hỗ trợ chu đáo.");
        }

        return sb.toString();
    }

    /**
     * Resolves gray-zone guidance when S_max is between theta_lower (0.42) and theta (0.50).
     * Provides clarifying suggestion and flags for Human-In-The-Loop (HITL) review.
     */
    String resolveGrayZoneMessage(String query, LegalChunkMatch topCandidate, String wardName, String officeAddress) {
        String baseAbstention = resolveAbstentionMessage(query, wardName, officeAddress);
        if (topCandidate != null && topCandidate.getProcedureName() != null) {
            String procName = topCandidate.getProcedureName();
            String code = topCandidate.getChunkCode() != null ? "[" + topCandidate.getChunkCode() + "]" : "";
            return baseAbstention + String.format(
                    "\n\n💡 Gợi ý: Hệ thống nhận thấy câu hỏi có thể liên quan đến thủ tục \"%s\" %s. Quý công dân có thể hỏi rõ hơn về thủ tục này (ví dụ: hồ sơ gồm những gì, thời hạn giải quyết bao lâu) để được hướng dẫn chi tiết.",
                    procName, code).trim();
        }
        return baseAbstention;
    }

    /**
     * Constructs a structured 5-part administrative answer directly from retrieved chunks
     * when the generative LLM experiences an outage, timeout, or rate limiting.
     */
    public String buildStructuredFallbackAnswer(List<LegalChunkMatch> chunks, String wardName, String officeAddress) {
        if (chunks == null || chunks.isEmpty()) {
            return "Hệ thống hiện chưa thể kết nối đến máy chủ AI và không tìm thấy dữ liệu thủ tục liên quan. Quý công dân vui lòng liên hệ Bộ phận Một cửa.";
        }

        LegalChunkMatch primary = chunks.get(0);
        String procName = primary.getProcedureName() != null ? primary.getProcedureName() : "Thủ tục hành chính";
        String effectiveWard = (wardName != null && !wardName.isBlank()) ? wardName : "UBND cấp xã/phường nơi tiếp nhận";
        String effectiveAddress = (officeAddress != null && !officeAddress.isBlank()) ? officeAddress : "Bộ phận Tiếp nhận và Trả kết quả (Một cửa)";

        StringBuilder sb = new StringBuilder();
        sb.append("1. TÓM TẮT THỦ TỤC:\n");
        sb.append(String.format("Hướng dẫn thực hiện thủ tục %s [%s] căn cứ quy định pháp luật hiện hành.\n\n",
                procName, primary.getChunkCode()));

        sb.append("2. THÀNH PHẦN HỒ SƠ:\n");
        boolean hasConditions = false;
        for (LegalChunkMatch c : chunks) {
            if ("CONDITIONS".equalsIgnoreCase(c.getChunkType()) || (c.getTitle() != null && c.getTitle().toLowerCase().contains("hồ sơ"))) {
                sb.append("• [").append(c.getChunkCode()).append("] ").append(c.getContent().trim()).append("\n");
                hasConditions = true;
            }
        }
        if (!hasConditions) {
            sb.append("• [").append(primary.getChunkCode()).append("] ").append(primary.getContent().trim()).append("\n");
        }
        sb.append("\n");

        sb.append("3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n");
        boolean hasFee = false;
        for (LegalChunkMatch c : chunks) {
            if ("TIME_FEE".equalsIgnoreCase(c.getChunkType()) || (c.getTitle() != null && c.getTitle().toLowerCase().contains("phí"))) {
                sb.append("• [").append(c.getChunkCode()).append("] ").append(c.getContent().trim()).append("\n");
                hasFee = true;
            }
        }
        if (!hasFee) {
            sb.append("• Thời hạn và lệ phí áp dụng theo biểu mức quy định tại Bộ phận Một cửa.\n");
        }
        sb.append("\n");

        sb.append("4. NƠI TIẾP NHẬN & XỬ LÝ:\n");
        sb.append("Bộ phận Tiếp nhận và Trả kết quả (Một cửa) thuộc ").append(effectiveWard)
          .append(" - Địa chỉ: ").append(effectiveAddress).append(".\n\n");

        sb.append("5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n");
        String ref = primary.getLegalReference() != null ? primary.getLegalReference() : "Quy định pháp luật hiện hành";
        sb.append("[").append(primary.getChunkCode()).append("] Căn cứ ").append(ref).append(".\n");
        sb.append("*(Ghi chú: Thông tin được trích xuất trực tiếp từ hồ sơ thủ tục hành chính chính thức)*\n\n");
        sb.append(LEGAL_DISCLAIMER);

        return sb.toString();
    }

    private boolean isAiFailureNotice(String text) {
        if (text == null || text.isBlank()) return true;
        return text.contains(GeminiAiClient.SERVICE_UNAVAILABLE_NOTICE)
                || text.contains(GeminiAiClient.RATE_LIMIT_NOTICE)
                || text.contains(GeminiAiClient.NETWORK_ERROR_NOTICE);
    }

    /**
     * Prunes any conversational preamble before "1. TÓM TẮT THỦ TỤC:"
     * ensuring response starts directly with the administrative section header.
     */
    public String prunePreamble(String answer) {
        if (answer == null || answer.isBlank()) {
            return answer;
        }

        // Match marker "1. TÓM TẮT THỦ TỤC:" with optional markdown formatting (e.g., **, #)
        Pattern markerPattern = Pattern.compile("(?i)(?:\\*\\*|#{1,3}\\s*)?1\\.\\s*TÓM TẮT THỦ TỤC:?");
        Matcher m = markerPattern.matcher(answer);
        if (m.find()) {
            int startIdx = m.start();
            if (startIdx > 0) {
                return answer.substring(startIdx).trim();
            }
        }
        return answer.trim();
    }

    /**
     * Sanitizes citation codes in the generated answer text.
     * Strips hallucinated brackets like [FAKE-99] when not matching any valid retrieved chunk code,
     * ensuring citizens never see fake citation codes in the text.
     */
    public String sanitizeAnswerCitations(String answer, Set<String> validCodes) {
        if (answer == null || answer.isBlank()) {
            return answer;
        }

        Set<String> upperValidCodes = new HashSet<>();
        if (validCodes != null) {
            for (String code : validCodes) {
                if (code != null) {
                    upperValidCodes.add(code.trim().toUpperCase());
                }
            }
        }

        Matcher matcher = CITATION_PATTERN.matcher(answer);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            String code = matcher.group(1).trim().toUpperCase();
            if (upperValidCodes.contains(code)) {
                matcher.appendReplacement(sb, Matcher.quoteReplacement(matcher.group(0)));
            } else {
                log.warn("Sanitizing hallucinated citation [{}] from answer text", code);
                matcher.appendReplacement(sb, "");
            }
        }
        matcher.appendTail(sb);

        // Normalize multiple spaces or space before period left by stripped brackets
        String cleaned = sb.toString().replaceAll(" {2,}", " ").replaceAll(" \\.", ".");
        return cleaned.trim();
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

    private static final List<String> PROCEDURE_LIST_PATTERNS = List.of(
            "nêu 40 thủ tục", "nêu thủ tục", "kể 40 thủ tục", "kể tên 40 thủ tục", "kể các thủ tục",
            "kể tên các thủ tục", "kể tên thủ tục", "danh sách 40 thủ tục", "danh sách thủ tục",
            "danh mục 40 thủ tục", "danh mục thủ tục", "danh mục tthc", "danh sách tthc",
            "có những thủ tục nào", "có bao nhiêu thủ tục", "gồm những thủ tục nào", "có các thủ tục nào",
            "liệt kê 40 thủ tục", "liệt kê các thủ tục", "liệt kê thủ tục",
            "các thủ tục cấp xã", "các thủ tục hành chính", "các thủ tục",
            "hỗ trợ những thủ tục gì", "hỗ trợ thủ tục nào", "hỗ trợ những gì", "danh sách dịch vụ", "40 thủ tục"
    );

    boolean isProcedureListQuery(String query) {
        if (query == null) return false;
        String raw = query.trim().toLowerCase().replaceAll("[!?.,;:]+$", "");
        String norm = VietnameseTextNormalizer.normalize(raw);
        String unaccent = VietnameseTextNormalizer.removeAccents(norm);
        return PROCEDURE_LIST_PATTERNS.stream().anyMatch(p ->
                raw.contains(p) || norm.contains(p) || unaccent.contains(p)
        );
    }

    boolean isGreetingOrSmallTalk(String query) {
        if (query == null) return false;
        String raw = query.trim().toLowerCase().replaceAll("[!?.,;:]+$", "");
        if (raw.isEmpty()) return false;

        String norm = VietnameseTextNormalizer.normalize(raw);
        String unaccent = VietnameseTextNormalizer.removeAccents(norm);

        for (String kw : PROCEDURE_KEYWORDS) {
            if (raw.contains(kw) || norm.contains(kw) || unaccent.contains(kw)) {
                return false;
            }
        }

        // Common Telex typos and phonetic greetings
        List<String> typoGreetingPatterns = List.of(
                "chaogf", "chaof", "chaoof", "xin chaof", "xin chaogf", "xin chaoo", "helo", "helllo", "xinchao"
        );
        for (String typo : typoGreetingPatterns) {
            if (raw.contains(typo)) {
                return true;
            }
        }

        // Small talk patterns
        List<String> smallTalkPatterns = List.of(
                "hôm nay thế nào", "hôm nay ra sao", "hôm nay bạn thế nào", "ngày mới thế nào",
                "khỏe không", "bạn khỏe không", "cán bộ khỏe không", "dạo này thế nào", "thế nào rồi",
                "cảm ơn", "cam on", "thanks", "thank you", "tuyệt vời", "tốt lắm", "được rồi",
                "tạm biệt", "bye", "bye bye", "hẹn gặp lại", "ok", "oke"
        );
        if (smallTalkPatterns.stream().anyMatch(p -> raw.contains(p) || norm.contains(p) || unaccent.contains(p))) {
            return true;
        }

        if (EXACT_GREETINGS.contains(raw) || EXACT_GREETINGS.contains(norm) || EXACT_GREETINGS.contains(unaccent)) {
            return true;
        }

        if (unaccent.length() <= 35) {
            if (unaccent.matches("^(hi|hello|hey|alo|chao|xin chao|kinh chao)(\\s+.*)?$")) {
                return true;
            }
            if (unaccent.matches("^(ban|bot)\\s+(la ai|co the lam gi|giup gi).*$")) {
                return true;
            }
        }

        return false;
    }

    private RagAskResponse buildSmallTalkResponse(String rawQuery, String wardName, long startTime) {
        String q = rawQuery.trim().toLowerCase().replaceAll("[!?.,;:]+$", "");
        String wardLabel = (wardName != null && !wardName.isBlank()) ? wardName : "UBND cấp xã/phường";
        String answer;

        if (q.contains("hôm nay thế nào") || q.contains("khỏe không") || q.contains("thế nào rồi") || q.contains("ra sao")) {
            answer = String.format(
                    "Dạ chào bà con! Hôm nay tôi vẫn hoạt động bình thường 24/7 và luôn sẵn sàng hỗ trợ giải đáp mọi thủ tục hành chính công tại %s.\n\n" +
                    "Hôm nay bà con đang cần làm giấy tờ gì hoặc có vướng mắc về thủ tục nào (như khai sinh, kết hôn, cư trú CT01, chứng thực, xác nhận độc thân...) để tôi hướng dẫn cụ thể nhé!",
                    wardLabel
            );
        } else if (q.contains("cảm ơn") || q.contains("thanks") || q.contains("tuyệt vời") || q.contains("tốt lắm") || q.equals("ok") || q.equals("oke")) {
            answer = String.format(
                    "Dạ không có gì ạ! Rất vui được hỗ trợ bà con. Chúc bà con giải quyết công việc hành chính thật nhanh chóng và thuận lợi.\n\n" +
                    "Nếu cần tra cứu thêm thủ tục hoặc tiền kiểm tra biểu mẫu tại %s, bà con cứ nhắn lại tôi nhé!",
                    wardLabel
            );
        } else if (q.contains("tạm biệt") || q.contains("bye")) {
            answer = String.format(
                    "Tạm biệt bà con! Chúc bà con một ngày vui vẻ và làm việc hiệu quả.\n\n" +
                    "Bất cứ khi nào cần tra cứu thủ tục hành chính tại %s, bà con có thể quay lại trò chuyện cùng tôi bất cứ lúc nào!",
                    wardLabel
            );
        } else {
            answer = String.format(
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
        }

        List<String> suggestions = List.of(
                "👶 Đăng ký khai sinh",
                "💍 Đăng ký kết hôn",
                "🏠 Đăng ký thường trú (CT01)",
                "📋 Xem 40 thủ tục"
        );

        return RagAskResponse.builder()
                .answer(answer)
                .abstained(false)
                .maxSimilarity(1.0)
                .appliedThreshold(defaultThreshold)
                .citations(Collections.emptyList())
                .cached(false)
                .suggestions(suggestions)
                .responseTimeMs(System.currentTimeMillis() - startTime)
                .disclaimer("Trợ lý Pháp lý Một Cửa SmartWard AI sẵn sàng phục vụ nhân dân.")
                .build();
    }

    boolean isAmbiguousConsultation(String query) {
        if (query == null) return false;
        String raw = query.trim().toLowerCase().replaceAll("[!?.,;:]+$", "");
        if (raw.isEmpty()) return false;

        String norm = VietnameseTextNormalizer.normalize(raw);
        String unaccent = VietnameseTextNormalizer.removeAccents(norm);

        for (String kw : PROCEDURE_KEYWORDS) {
            if (raw.contains(kw) || norm.contains(kw) || unaccent.contains(kw)) {
                return false;
            }
        }

        if (isGreetingOrSmallTalk(query)) {
            return false;
        }

        List<String> ambiguousPatterns = List.of(
                "tu van", "giup toi", "giup minh", "giup em", "giup voi",
                "can giup", "ho tro toi", "cho toi hoi", "muon hoi",
                "can tu van", "huong dan giup", "co the tu van", "co the giup",
                "hoi chut", "can ho tro"
        );

        return ambiguousPatterns.stream().anyMatch(p -> unaccent.contains(p) || norm.contains(p) || raw.contains(p));
    }

    private RagAskResponse buildAmbiguousConsultationResponse(String wardName, long startTime) {
        String wardLabel = (wardName != null && !wardName.isBlank()) ? wardName : "UBND cấp xã/phường";
        String answer = String.format(
                "Dạ được chứ ạ! Tôi là Trợ lý Pháp lý Một Cửa, luôn sẵn sàng hỗ trợ tư vấn các thủ tục hành chính công cho bà con tại %s.\n\n" +
                "Bà con vui lòng cho biết đang cần giải quyết công việc gì hoặc chọn nhanh một trong các lĩnh vực dưới đây để tôi hướng dẫn chi tiết hồ sơ, lệ phí và quy trình thực hiện nhé:\n" +
                "• 👶 Hộ tịch: Đăng ký khai sinh, kết hôn, trích lục, xác nhận độc thân\n" +
                "• 🏠 Cư trú: Đăng ký thường trú (Mẫu CT01), tạm trú, xác nhận CT07\n" +
                "• 📄 Chứng thực: Sao y bản sao, chứng thực chữ ký, hợp đồng giao dịch\n" +
                "• 🤝 Bảo trợ xã hội: Trợ cấp người cao tuổi, mai táng phí, người khuyết tật\n" +
                "• 🌾 Đất đai: Xác nhận hiện trạng, trích lục bản đồ địa chính",
                wardLabel
        );

        List<String> suggestions = List.of(
                "👶 Đăng ký khai sinh",
                "💍 Đăng ký kết hôn",
                "🏠 Đăng ký thường trú (CT01)",
                "📄 Chứng thực sao y",
                "📋 Xem 40 thủ tục"
        );

        return RagAskResponse.builder()
                .answer(answer)
                .abstained(false)
                .maxSimilarity(1.0)
                .appliedThreshold(defaultThreshold)
                .citations(Collections.emptyList())
                .cached(false)
                .suggestions(suggestions)
                .responseTimeMs(System.currentTimeMillis() - startTime)
                .disclaimer("Trợ lý Pháp lý Một Cửa SmartWard AI sẵn sàng phục vụ nhân dân.")
                .build();
    }

    private RagAskResponse buildProcedureCatalogResponse(String wardName, long startTime) {
        String wardLabel = (wardName != null && !wardName.isBlank()) ? wardName : "UBND cấp xã/phường";
        String answer = String.format(
                "Danh mục các thủ tục hành chính công trọng tâm cấp xã/phường được hỗ trợ tại %s gồm 5 nhóm chính:\n\n" +
                "📋 1. LĨNH VỰC HỘ TỊCH & NHÂN THÂN:\n" +
                "• [TTHC-HT-01] Đăng ký khai sinh (thông thường & lưu động)\n" +
                "• [TTHC-HT-02] Đăng ký kết hôn (trong nước)\n" +
                "• [TTHC-HT-03] Cấp Giấy xác nhận tình trạng hôn nhân (Giấy độc thân)\n" +
                "• [TTHC-HT-04] Cấp bản sao Trích lục hộ tịch (khai sinh, kết hôn, khai tử)\n" +
                "• [TTHC-HT-05] Đăng ký khai tử và giải quyết hỗ trợ mai táng\n" +
                "• [TTHC-HT-06] Đăng ký nhận cha, mẹ, con\n" +
                "• [TTHC-HT-07] Thay đổi, cải chính hộ tịch, bổ sung thông tin hộ tịch\n" +
                "• [TTHC-HT-08] Đăng ký giám hộ và chấm dứt giám hộ\n\n" +
                "🏠 2. LĨNH VỰC QUẢN LÝ CƯ TRÚ (CÔNG AN XÃ/PHƯỜNG & ĐỀ ÁN 06):\n" +
                "• [TTHC-CR-01] Đăng ký thường trú (Nộp tờ khai CT01)\n" +
                "• [TTHC-CR-02] Xóa đăng ký thường trú\n" +
                "• [TTHC-CR-03] Đăng ký tạm trú và gia hạn tạm trú\n" +
                "• [TTHC-CR-04] Khai báo tạm vắng và thông báo lưu trú\n" +
                "• [TTHC-CR-05] Xác nhận thông tin về cư trú (Mẫu CT07)\n" +
                "• [TTHC-CR-06] Tách hộ và điều chỉnh thông tin nơi cư trú\n\n" +
                "📑 3. LĨNH VỰC CHỨNG THỰC & TƯ PHÁP CƠ SỞ:\n" +
                "• [TTHC-CT-01] Chứng thực bản sao từ bản chính (Sao y văn bằng, giấy tờ)\n" +
                "• [TTHC-CT-02] Chứng thực chữ ký trong các giấy tờ, văn bản cá nhân\n" +
                "• [TTHC-CT-03] Chứng thực hợp đồng, giao dịch liên quan đến tài sản cơ bản\n" +
                "• [TTHC-CT-04] Chứng thực di chúc, văn bản từ chối nhận di sản thừa kế\n\n" +
                "🤝 4. LĨNH VỰC BẢO TRỢ XÃ HỘI & CHÍNH SÁCH CÔNG:\n" +
                "• [TTHC-BT-01] Trợ cấp xã hội hàng tháng (Người cao tuổi, khuyết tật, trẻ mồ côi)\n" +
                "• [TTHC-BT-02] Hỗ trợ chi phí mai táng cho đối tượng bảo trợ xã hội\n" +
                "• [TTHC-BT-03] Cấp thẻ Bảo hiểm Y tế cho đối tượng bảo trợ xã hội\n" +
                "• [TTHC-BT-04] Trợ giúp xã hội đột xuất cho hộ gia đình khó khăn, thiên tai\n" +
                "• [TTHC-BT-05] Thủ tục xác nhận người có công, gia đình chính sách\n\n" +
                "🌾 5. LĨNH VỰC ĐỊA CHÍNH & ĐẤT ĐAI CƠ BẢN:\n" +
                "• [TTHC-DD-01] Xác nhận hiện trạng sử dụng đất và tình trạng không có tranh chấp\n" +
                "• [TTHC-DD-02] Tiếp nhận và luân chuyển hồ sơ đăng ký biến động đất đai\n" +
                "• [TTHC-DD-03] Hòa giải tranh chấp đất đai tại cấp xã/phường\n" +
                "• [TTHC-DD-04] Trích lục bản đồ địa chính và hồ sơ thửa đất\n\n" +
                "👉 Bà con đang cần làm thủ tục nào? Hãy gõ câu hỏi hoặc tên thủ tục (ví dụ: \"khai sinh cần giấy tờ gì\", \"kết hôn mất bao lâu\", \"hướng dẫn điền CT01\") để tôi hướng dẫn chi tiết từng bước nhé!",
                wardLabel
        );

        List<String> suggestions = List.of(
                "👶 Đăng ký khai sinh",
                "💍 Đăng ký kết hôn",
                "🏠 Đăng ký thường trú (CT01)",
                "📄 Chứng thực sao y",
                "🤝 Trợ cấp bảo trợ xã hội"
        );

        return RagAskResponse.builder()
                .answer(answer)
                .abstained(false)
                .maxSimilarity(1.0)
                .appliedThreshold(defaultThreshold)
                .citations(Collections.emptyList())
                .cached(false)
                .suggestions(suggestions)
                .responseTimeMs(System.currentTimeMillis() - startTime)
                .disclaimer("Danh mục 40 TTHC cấp xã chuẩn hóa theo Nghị định 13/2023 và Đề án 06.")
                .build();
    }

    boolean isGreetingQuery(String query) {
        return isGreetingOrSmallTalk(query);
    }

    boolean isWardOfficeQuery(String query) {
        if (query == null) return false;
        String raw = query.trim().toLowerCase();
        String norm = VietnameseTextNormalizer.normalize(raw);
        String unaccent = VietnameseTextNormalizer.removeAccents(norm);

        for (String kw : PROCEDURE_KEYWORDS) {
            if (raw.contains(kw) || norm.contains(kw) || unaccent.contains(kw)) {
                return false;
            }
        }

        List<String> officePatterns = List.of(
                "địa chỉ ở đâu", "trụ sở ở đâu", "địa chỉ ủy ban", "địa chỉ ubnd",
                "ủy ban ở đâu", "ubnd ở đâu", "trụ sở ubnd",
                "giờ làm việc", "mấy giờ làm việc", "mấy giờ mở cửa",
                "giờ tiếp dân", "thời gian làm việc", "thứ 7 có làm việc không",
                "số điện thoại", "hotline", "liên hệ ai", "dia chi o dau", "tru so o dau"
        );

        return officePatterns.stream().anyMatch(p -> raw.contains(p) || norm.contains(p) || unaccent.contains(p));
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

        List<String> suggestions = List.of(
                "📋 Xem 40 thủ tục",
                "👶 Đăng ký khai sinh",
                "💍 Đăng ký kết hôn",
                "🏠 Đăng ký thường trú (CT01)"
        );

        return RagAskResponse.builder()
                .answer(answer)
                .abstained(false)
                .maxSimilarity(1.0)
                .appliedThreshold(defaultThreshold)
                .citations(Collections.emptyList())
                .cached(false)
                .suggestions(suggestions)
                .responseTimeMs(System.currentTimeMillis() - startTime)
                .disclaimer("Thông tin chính thức từ Danh bạ hành chính UBND cấp xã/phường.")
                .build();
    }

    String resolveEffectiveQuery(String rawQuery, List<ConversationTurnDto> history) {
        if (history == null || history.isEmpty()) {
            return rawQuery;
        }

        String lower = rawQuery.toLowerCase();
        boolean isFollowUp = isFollowUpQuestion(lower);
        if (!isFollowUp) {
            return rawQuery;
        }

        for (int i = history.size() - 1; i >= Math.max(0, history.size() - 5); i--) {
            ConversationTurnDto turn = history.get(i);
            if (turn == null) continue;

            if (turn.getProcedureCode() != null && !turn.getProcedureCode().isBlank()) {
                String procName = mapProcedureCodeToName(turn.getProcedureCode());
                if (procName != null) {
                    return "[Thủ tục " + procName + "] " + rawQuery;
                }
            }

            String content = turn.getContent();
            if (content != null && !content.isBlank()) {
                String procName = extractProcedureFromText(content);
                if (procName != null) {
                    return "[Thủ tục " + procName + "] " + rawQuery;
                }
            }
        }

        return rawQuery;
    }

    boolean isFollowUpQuestion(String query) {
        if (query == null || query.isBlank()) return false;
        String q = query.trim().toLowerCase();

        for (String kw : PROCEDURE_KEYWORDS) {
            if (q.contains(kw)) {
                return false;
            }
        }

        List<String> followUpPatterns = List.of(
                "lệ phí", "chi phí", "bao nhiêu tiền", "hết bao nhiêu", "mất tiền", "mất phí", "có mất tiền không",
                "bao lâu", "mấy ngày", "thời hạn", "thời gian", "khi nào có",
                "hồ sơ", "giấy tờ", "cần gì", "chuẩn bị gì", "mang theo gì",
                "nộp ở đâu", "ở đâu", "đến đâu", "nơi nộp", "ai nộp",
                "còn", "thế còn", "vậy còn"
        );

        return followUpPatterns.stream().anyMatch(q::contains);
    }

    String extractProcedureFromText(String text) {
        if (text == null || text.isBlank()) return null;

        if (text.contains("chưa nhận diện rõ") ||
            text.contains("nằm ngoài thẩm quyền") ||
            text.contains("chưa tìm thấy thông tin")) {
            return null;
        }

        java.util.regex.Matcher m = java.util.regex.Pattern.compile(
                "(?:1\\.\\s*TÓM\\s*TẮT\\s*THỦ\\s*TỤC[:\\s]*\\n*Thủ\\s*tục\\s+)([^(\\n]+)",
                java.util.regex.Pattern.CASE_INSENSITIVE
        ).matcher(text);
        if (m.find()) {
            String headerTitle = m.group(1).trim().toLowerCase();
            if (headerTitle.contains("khai sinh")) return "Đăng ký khai sinh";
            if (headerTitle.contains("kết hôn")) return "Đăng ký kết hôn";
            if (headerTitle.contains("thường trú") || headerTitle.contains("cư trú")) return "Đăng ký thường trú (Mẫu CT01)";
            if (headerTitle.contains("tạm trú")) return "Đăng ký tạm trú";
            if (headerTitle.contains("khai tử")) return "Đăng ký khai tử";
            if (headerTitle.contains("chứng thực") || headerTitle.contains("sao y")) return "Chứng thực sao y bản sao";
            if (headerTitle.contains("hôn nhân") || headerTitle.contains("độc thân")) return "Cấp Giấy xác nhận tình trạng hôn nhân";
            if (headerTitle.contains("trích lục")) return "Cấp bản sao trích lục hộ tịch";
            if (headerTitle.contains("bảo trợ") || headerTitle.contains("người cao tuổi")) return "Trợ cấp bảo trợ xã hội";
        }

        String lower = text.toLowerCase().replaceAll("\\(ví\\s*dụ:[^)]*\\)", "");

        if (lower.contains("khai sinh") || lower.contains("sinh con") || lower.contains("mới sinh") ||
            lower.contains("khai sanh") || lower.contains("sanh con") || lower.contains("mới sanh")) {
            return "Đăng ký khai sinh";
        }
        if (lower.contains("tạm trú")) {
            return "Đăng ký tạm trú";
        }
        if (lower.contains("thường trú") || lower.contains("cư trú") || lower.contains("ct01") || lower.contains("nhập khẩu") || lower.contains("hộ khẩu")) {
            return "Đăng ký thường trú (Mẫu CT01)";
        }
        if (lower.contains("khai tử") || lower.contains("chứng tử") || lower.contains("người mất")) {
            return "Đăng ký khai tử";
        }
        if (lower.contains("độc thân") || lower.contains("tình trạng hôn nhân")) {
            return "Cấp Giấy xác nhận tình trạng hôn nhân";
        }
        if (lower.contains("trích lục")) {
            return "Cấp bản sao trích lục hộ tịch";
        }
        if (lower.contains("bảo trợ") || lower.contains("tiền già") || lower.contains("người cao tuổi")) {
            return "Trợ cấp bảo trợ xã hội";
        }
        if (lower.contains("chứng thực") || lower.contains("sao y")) {
            return "Chứng thực sao y bản sao";
        }

        String sanitizedForMarriage = lower
                .replaceAll("giấy\\s+(?:chứng\\s+nhận\\s+)?kết\\s+hôn", "giay_to_khac")
                .replaceAll("kết\\s+hôn\\s+của\\s+cha\\s+mẹ", "giay_to_khac");

        if (sanitizedForMarriage.contains("kết hôn") || sanitizedForMarriage.contains("hôn nhân") ||
            sanitizedForMarriage.contains("lấy vợ") || sanitizedForMarriage.contains("lấy chồng")) {
            return "Đăng ký kết hôn";
        }

        return null;
    }

    String mapProcedureCodeToName(String code) {
        if (code == null) return null;
        String clean = code.trim().toUpperCase();
        return switch (clean) {
            case "TTHC-HT-01", "KS-01-DK" -> "Đăng ký khai sinh";
            case "TTHC-HT-02", "HT-02-DK" -> "Đăng ký kết hôn";
            case "TTHC-HT-03", "TTHC-HT-11" -> "Cấp Giấy xác nhận tình trạng hôn nhân";
            case "TTHC-HT-04" -> "Cấp bản sao trích lục hộ tịch";
            case "TTHC-HT-05" -> "Đăng ký khai tử";
            case "TTHC-CR-01", "CT-01" -> "Đăng ký thường trú (Mẫu CT01)";
            case "TTHC-CR-03" -> "Đăng ký tạm trú";
            case "TTHC-CR-08" -> "Xác nhận thông tin về cư trú (Mẫu CT07)";
            case "TTHC-CR-04" -> "Khai báo tạm vắng và thông báo lưu trú";
            case "TTHC-CT-01" -> "Chứng thực sao y bản sao";
            case "TTHC-BT-01" -> "Trợ cấp bảo trợ xã hội";
            default -> null;
        };
    }

    List<String> generateProcedureSuggestions(List<LegalChunkMatch> candidateChunks) {
        if (candidateChunks == null || candidateChunks.isEmpty()) {
            return List.of("👶 Đăng ký khai sinh", "💍 Đăng ký kết hôn", "🏠 Đăng ký thường trú (CT01)", "📋 Xem 40 thủ tục");
        }
        LegalChunkMatch primary = candidateChunks.get(0);
        String name = primary.getProcedureName() != null ? primary.getProcedureName().toLowerCase() : "";
        if (name.contains("kết hôn")) {
            return List.of("Hồ sơ kết hôn cần gì?", "Lệ phí kết hôn bao nhiêu?", "Nơi nộp hồ sơ kết hôn ở đâu?", "Thời hạn giải quyết bao lâu?");
        }
        if (name.contains("khai sinh")) {
            return List.of("Hồ sơ khai sinh cần gì?", "Lệ phí khai sinh bao nhiêu?", "Nơi nộp hồ sơ khai sinh ở đâu?", "Thời hạn giải quyết bao lâu?");
        }
        if (name.contains("thường trú") || name.contains("cư trú")) {
            return List.of("Hồ sơ thường trú gồm những gì?", "Thời hạn đăng ký thường trú?", "Nơi nộp hồ sơ thường trú?", "Hướng dẫn điền CT01");
        }
        if (name.contains("chứng thực")) {
            return List.of("Lệ phí chứng thực bản sao?", "Giấy tờ cần xuất trình khi chứng thực?", "Thời hạn trả kết quả chứng thực?");
        }
        return List.of("Hồ sơ cần những gì?", "Lệ phí bao nhiêu?", "Nơi nộp hồ sơ ở đâu?", "Thời hạn giải quyết bao lâu?");
    }

    private void enqueueGrayZoneItem(String query, String wardName, double similarityScore,
                                     LegalChunkMatch topCandidate, String draftGuidance) {
        if (query == null || query.isBlank()) return;
        boolean alreadyExists = hitlQueue.stream()
                .anyMatch(item -> query.equalsIgnoreCase(item.getQuery()));
        if (alreadyExists) return;

        String id = "HITL-AG-" + String.format(Locale.US, "%03d", hitlQueue.size() + 1);
        HitlGrayZoneItemDto newItem = HitlGrayZoneItemDto.builder()
                .id(id)
                .query(query)
                .wardName(wardName != null && !wardName.isBlank() ? wardName : "Phường Mỹ Bình")
                .similarityScore(Math.round(similarityScore * 1000.0) / 1000.0)
                .candidateChunkCode(topCandidate != null ? topCandidate.getChunkCode() : "UNKNOWN")
                .candidateProcedureName(topCandidate != null ? topCandidate.getProcedureName() : "Thủ tục hành chính cấp xã")
                .legalReference(topCandidate != null ? topCandidate.getLegalReference() : "Đang rà soát")
                .suggestedAnswer(draftGuidance)
                .status("PENDING")
                .createdAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")))
                .build();

        hitlQueue.add(0, newItem);
        if (hitlQueue.size() > 50) {
            hitlQueue.remove(hitlQueue.size() - 1);
        }
    }

    /**
     * Returns the current Human-in-the-Loop (HITL) Gray-Zone review queue.
     */
    public List<HitlGrayZoneItemDto> getHitlQueue() {
        return Collections.unmodifiableList(hitlQueue);
    }

    /**
     * Approves a Gray-Zone query with an officer-verified response and caches it into QueryCacheService
     * so future identical citizen queries immediately receive the verified answer.
     */
    public HitlGrayZoneItemDto resolveHitlItem(String id, String approvedAnswer, String officerName) {
        for (int i = 0; i < hitlQueue.size(); i++) {
            HitlGrayZoneItemDto item = hitlQueue.get(i);
            if (item.getId().equalsIgnoreCase(id)) {
                String effectiveOfficer = (officerName != null && !officerName.isBlank())
                        ? officerName.trim() : "Cán bộ Một cửa";
                HitlGrayZoneItemDto updated = HitlGrayZoneItemDto.builder()
                        .id(item.getId())
                        .query(item.getQuery())
                        .wardName(item.getWardName())
                        .similarityScore(item.getSimilarityScore())
                        .candidateChunkCode(item.getCandidateChunkCode())
                        .candidateProcedureName(item.getCandidateProcedureName())
                        .legalReference(item.getLegalReference())
                        .suggestedAnswer(approvedAnswer.trim())
                        .status("APPROVED")
                        .createdAt(item.getCreatedAt())
                        .resolvedBy(effectiveOfficer)
                        .build();

                hitlQueue.set(i, updated);

                // Immediately cache the officer-verified response for 24 hours (86400s)
                LegalCitationDto citation = LegalCitationDto.builder()
                        .chunkCode(updated.getCandidateChunkCode())
                        .procedureName(updated.getCandidateProcedureName())
                        .legalReference(updated.getLegalReference())
                        .similarityScore(updated.getSimilarityScore())
                        .build();

                RagAskResponse verifiedResponse = RagAskResponse.builder()
                        .answer(updated.getSuggestedAnswer())
                        .abstained(false)
                        .maxSimilarity(updated.getSimilarityScore())
                        .appliedThreshold(defaultThreshold)
                        .citations(List.of(citation))
                        .cached(true)
                        .suggestions(List.of("👶 Đăng ký khai sinh", "💍 Đăng ký kết hôn", "🏠 Đăng ký thường trú (CT01)", "📋 Xem 40 thủ tục"))
                        .responseTimeMs(5)
                        .disclaimer(LEGAL_DISCLAIMER)
                        .build();

                queryCacheService.putResponse(updated.getQuery(), verifiedResponse, 86400);
                log.info("[HITL_RESOLVED] Item {} approved by '{}' and cached for query: '{}'",
                        id, effectiveOfficer, truncate(updated.getQuery(), 40));
                return updated;
            }
        }
        throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy yêu cầu vùng xám với mã: " + id);
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() > maxLen ? text.substring(0, maxLen) + "..." : text;
    }
}
