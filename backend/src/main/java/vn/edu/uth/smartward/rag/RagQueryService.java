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

        // 3. Procedure Catalog Request ("nêu 40 thủ tục", "danh sách thủ tục"...)
        if (isProcedureListQuery(rawQuery)) {
            return buildProcedureCatalogResponse(request.getWardName(), startTime);
        }

        // 4. Conversational Intent Check: Small talk, Wellbeing, Gratitude, Greeting
        if (isGreetingOrSmallTalk(rawQuery)) {
            return buildSmallTalkResponse(rawQuery, request.getWardName(), startTime);
        }

        // 5. Ward Office Info Check (Address, working hours, hotline)
        if (isWardOfficeQuery(rawQuery)) {
            return buildWardOfficeResponse(request.getWardName(), request.getOfficeAddress(), startTime);
        }

        // 6. Query Vectorization (768-dim)
        float[] queryEmbedding = aiModelClient.generateEmbedding(rawQuery);
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

        log.info("RAG retrieval for query '{}': found {} candidates, maxSimilarity={}",
                truncate(rawQuery, 40), candidateChunks.size(), String.format(Locale.US, "%.4f", maxSimilarity));

        // 8. Abstention Guardrail: S_max < theta (Safe abstention without calling LLM)
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

        // 6.1. Strip any conversational preamble before "1. TÓM TẮT THỦ TỤC:"
        generatedAnswer = prunePreamble(generatedAnswer);

        // 6.2. Ensure Section 5 is present if omitted by LLM
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
        } else if (lower.contains("tranh chấp tài sản") || lower.contains("tranh chấp thừa kế") || lower.contains("kiện tụng") || lower.contains("khởi kiện") || lower.contains("tòa án") || (lower.contains("tranh chấp") && (lower.contains("thừa kế") || lower.contains("chia tài sản")))) {
            specificAuthority = "Tòa án nhân dân có thẩm quyền";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("Hệ thống SmartWard AI hiện chưa tìm thấy thông tin thủ tục tương ứng với câu hỏi của bà con trong phạm vi thẩm quyền của UBND cấp xã/phường. ");
        sb.append("Để đảm bảo thông tin chính xác và tuân thủ quy chuẩn an toàn theo Nghị định 13/2023/NĐ-CP, hệ thống chỉ hỗ trợ các thủ tục hành chính cấp xã (Hộ tịch, Cư trú, Chứng thực, Bảo trợ xã hội, Đất đai cơ bản). ");

        if (specificAuthority != null) {
            sb.append("Thủ tục quý công dân đang quan tâm thuộc thẩm quyền giải quyết của ").append(specificAuthority).append(". ");
            sb.append("Quý công dân vui lòng liên hệ cơ quan trên để được hướng dẫn chi tiết.");
        } else {
            String wardLabel = (wardName != null && !wardName.isBlank()) ? wardName : "UBND cấp xã";
            String addrLabel = (officeAddress != null && !officeAddress.isBlank()) ? " (Địa chỉ: " + officeAddress + ")" : "";
            sb.append("Bà con có thể gõ rõ tên thủ tục (ví dụ: 'đăng ký khai sinh', 'đăng ký kết hôn', 'nộp mẫu CT01', 'chứng thực sao y', hoặc gõ 'nêu 40 thủ tục' để xem danh mục) hoặc liên hệ trực tiếp Bộ phận Tiếp nhận và Trả kết quả (Một cửa) tại ")
              .append(wardLabel).append(addrLabel)
              .append(" hoặc Tổng đài Dịch vụ công Quốc gia 18001096 để được hỗ trợ chu đáo.");
        }

        return sb.toString();
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
        String q = query.trim().toLowerCase().replaceAll("[!?.,;:]+$", "");
        return PROCEDURE_LIST_PATTERNS.stream().anyMatch(q::contains);
    }

    boolean isGreetingOrSmallTalk(String query) {
        if (query == null) return false;
        String q = query.trim().toLowerCase().replaceAll("[!?.,;:]+$", "");
        if (q.isEmpty()) return false;

        for (String kw : PROCEDURE_KEYWORDS) {
            if (q.contains(kw)) {
                return false;
            }
        }

        // Small talk patterns
        List<String> smallTalkPatterns = List.of(
                "hôm nay thế nào", "hôm nay ra sao", "hôm nay bạn thế nào", "ngày mới thế nào",
                "khỏe không", "bạn khỏe không", "cán bộ khỏe không", "dạo này thế nào", "thế nào rồi",
                "cảm ơn", "cam on", "thanks", "thank you", "tuyệt vời", "tốt lắm", "được rồi",
                "tạm biệt", "bye", "bye bye", "hẹn gặp lại", "ok", "oke"
        );
        if (smallTalkPatterns.stream().anyMatch(p -> q.contains(p) || q.equals(p))) {
            return true;
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

        return RagAskResponse.builder()
                .answer(answer)
                .abstained(false)
                .maxSimilarity(1.0)
                .appliedThreshold(defaultThreshold)
                .citations(Collections.emptyList())
                .cached(false)
                .responseTimeMs(System.currentTimeMillis() - startTime)
                .disclaimer("Danh mục 40 TTHC cấp xã chuẩn hóa theo Nghị định 13/2023 và Đề án 06.")
                .build();
    }

    boolean isGreetingQuery(String query) {
        return isGreetingOrSmallTalk(query);
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
