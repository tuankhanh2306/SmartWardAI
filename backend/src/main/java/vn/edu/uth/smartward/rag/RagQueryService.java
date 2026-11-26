package vn.edu.uth.smartward.rag;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
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

import java.util.*;

/**
 * Core Orchestrator for Administrative Legal Retrieval-Augmented Generation (Legal RAG).
 * Modularized under TASK-019 into focused helpers:
 * - RagPromptAndCitationHelper (prompts, abstention, fallback formatting, citation verification)
 * - RagIntentAndContextResolver (intents, multi-turn context resolution, suggestions)
 * - RagConversationalResponseBuilder (small-talk, catalog, ward office info)
 * - RagHitlQueueManager (Human-in-the-Loop gray-zone queue)
 * - RagHybridFallbackMatcher (keyword fallback retrieval)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RagQueryService {

    private final LegalChunkRepository chunkRepository;
    private final AiModelClient aiModelClient;
    private final QueryCacheService queryCacheService;
    private final RedisRateLimiter redisRateLimiter;

    @Autowired(required = false)
    private AdminProcedureRepository procedureRepository;

    @Autowired(required = false)
    private HitlGrayZoneRepository hitlRepository;

    @Autowired(required = false)
    private org.springframework.core.env.Environment environment;

    @Autowired(required = false)
    private LegalChunkReranker reranker;

    @Autowired(required = false)
    private vn.edu.uth.smartward.ward.WardRegistryService wardRegistryService;

    private final RagHitlQueueManager hitlQueueManager = new RagHitlQueueManager();

    public record WardOfficeInfo(String wardCode, String wardName, String officeAddress) {}

    public static final Map<String, WardOfficeInfo> REGISTERED_WARDS = Map.of(
            "AG_P_LONGXUYEN", new WardOfficeInfo("AG_P_LONGXUYEN", "UBND Phường Long Xuyên, Tỉnh An Giang", "Đường Trần Hưng Đạo, Phường Long Xuyên, TP. Long Xuyên, Tỉnh An Giang"),
            "WARD-AG-01", new WardOfficeInfo("WARD-AG-01", "UBND Phường Mỹ Bình, Tỉnh An Giang", "Đường Thoại Ngọc Hầu, Phường Mỹ Bình, TP. Long Xuyên, Tỉnh An Giang"),
            "WARD-AG-02", new WardOfficeInfo("WARD-AG-02", "UBND Xã An Phú, Tỉnh An Giang", "Đường Thoại Ngọc Hầu, Xã An Phú, Huyện An Phú, Tỉnh An Giang")
    );

    public static final String LEGAL_DISCLAIMER =
            "*Lưu ý: Thông tin hướng dẫn trên chỉ mang tính chất tham khảo, không thay thế quyết định chính thức của công chức tiếp nhận hồ sơ tại Bộ phận Một cửa.*";

    @Value("${smartward.rag.default-threshold:0.78}")
    private double defaultThreshold;

    @Value("${smartward.rag.theta-lower:0.42}")
    private double defaultThetaLower;

    @Value("${smartward.rag.top-k:3}")
    private int defaultTopK;

    public RagAskResponse askQuestion(RagAskRequest request, String clientIp) {
        return askQuestion(request, clientIp, null, request != null ? request.getSessionId() : null);
    }

    public RagAskResponse askQuestion(RagAskRequest request, String clientIp, String officerBadgeId, String sessionId) {
        long startTime = System.currentTimeMillis();
        enforceRateLimit(clientIp, officerBadgeId, sessionId);

        String rawQuery = request.getQuestion().trim();
        String effectiveQuery = resolveEffectiveQuery(rawQuery, request.getHistory());
        if (!effectiveQuery.equals(rawQuery)) {
            log.info("Contextual follow-up resolved: '{}' -> '{}'", rawQuery, effectiveQuery);
        }

        WardOfficeInfo resolvedWard = resolveWardOffice(request);
        boolean includeOfficerScope = (officerBadgeId != null && !officerBadgeId.isBlank());
        String cacheKey = buildScopedCacheKey(effectiveQuery, resolvedWard, request.getCategory(), includeOfficerScope);

        Optional<RagAskResponse> cachedOpt = queryCacheService.getCachedResponse(cacheKey, RagAskResponse.class);
        if (cachedOpt.isPresent()) {
            RagAskResponse cached = cachedOpt.get();
            cached.setCached(true);
            cached.setResponseTimeMs(System.currentTimeMillis() - startTime);
            log.info("RAG Query served from cache: '{}'", RagPromptAndCitationHelper.truncate(rawQuery, 40));
            return cached;
        }

        if (isProcedureListQuery(rawQuery)) {
            return RagConversationalResponseBuilder.buildProcedureCatalogResponse(
                    procedureRepository, resolvedWard.wardName(), defaultThreshold, startTime);
        }
        if (isGreetingOrSmallTalk(rawQuery)) {
            return RagConversationalResponseBuilder.buildSmallTalkResponse(
                    rawQuery, resolvedWard.wardName(), defaultThreshold, startTime);
        }
        if (isAmbiguousConsultation(rawQuery)) {
            return RagConversationalResponseBuilder.buildAmbiguousConsultationResponse(
                    resolvedWard.wardName(), defaultThreshold, startTime);
        }
        if (isWardOfficeQuery(rawQuery)) {
            return RagConversationalResponseBuilder.buildWardOfficeResponse(
                    resolvedWard.wardName(), resolvedWard.officeAddress(), defaultThreshold, startTime);
        }

        int k = isEvalOrTestProfile() && request.getTopK() != null && request.getTopK() > 0
                ? request.getTopK() : defaultTopK;
        double threshold = isEvalOrTestProfile() && request.getSimilarityThreshold() != null && request.getSimilarityThreshold() > 0
                ? request.getSimilarityThreshold() : defaultThreshold;

        List<LegalChunkMatch> candidateChunks = retrieveAndRerankChunks(
                effectiveQuery, includeOfficerScope, resolvedWard.wardCode(), k);
        double maxSimilarity = computeMaxSimilarity(candidateChunks);

        log.info("RAG retrieval for query '{}' (effective '{}'): found {} candidates, maxSimilarity={}",
                RagPromptAndCitationHelper.truncate(rawQuery, 40),
                RagPromptAndCitationHelper.truncate(effectiveQuery, 40),
                candidateChunks.size(),
                String.format(Locale.US, "%.4f", maxSimilarity));

        if ((candidateChunks.isEmpty() || maxSimilarity < threshold) && procedureRepository != null) {
            List<LegalChunkMatch> hybridMatches = RagHybridFallbackMatcher.tryHybridProcedureKeywordMatch(
                    effectiveQuery, procedureRepository, chunkRepository, includeOfficerScope, resolvedWard.wardCode());
            if (!hybridMatches.isEmpty()) {
                double hybridMax = computeMaxSimilarity(hybridMatches);
                if (candidateChunks.isEmpty() || hybridMax > maxSimilarity) {
                    candidateChunks = hybridMatches;
                    maxSimilarity = hybridMax;
                }
            }
        }

        if (candidateChunks.isEmpty() || maxSimilarity < threshold) {
            return buildAndCacheAbstention(rawQuery, candidateChunks, maxSimilarity, threshold, resolvedWard, cacheKey, startTime);
        }

        String generatedAnswer = generateGroundedAnswer(rawQuery, effectiveQuery, candidateChunks, resolvedWard);
        List<LegalCitationDto> verifiedCitations = postVerifyCitations(generatedAnswer, candidateChunks);
        Set<String> validCodes = new HashSet<>();
        for (LegalChunkMatch c : candidateChunks) {
            if (c.getChunkCode() != null) validCodes.add(c.getChunkCode());
        }
        generatedAnswer = sanitizeAnswerCitations(generatedAnswer, validCodes);

        String resolvedProcCode = resolvePrimaryProcedureCode(candidateChunks, verifiedCitations);
        String supportedFormType = mapProcedureToSupportedFormType(resolvedProcCode);

        RagAskResponse response = RagAskResponse.builder()
                .answer(generatedAnswer)
                .abstained(false)
                .abstentionReason(null)
                .maxSimilarity(maxSimilarity)
                .appliedThreshold(threshold)
                .citations(verifiedCitations)
                .cached(false)
                .suggestions(generateProcedureSuggestions(candidateChunks))
                .resolvedProcedureCode(resolvedProcCode)
                .supportedFormType(supportedFormType)
                .responseTimeMs(System.currentTimeMillis() - startTime)
                .disclaimer(LEGAL_DISCLAIMER)
                .build();

        boolean isTruncated = generatedAnswer != null && (
                generatedAnswer.contains(GeminiAiClient.TRUNCATION_FALLBACK_NOTICE)
                        || generatedAnswer.contains("vượt quá giới hạn hiển thị tự động"));
        if (!isTruncated) {
            queryCacheService.putResponse(cacheKey, response);
        } else {
            log.warn("Response truncated, skipping caching in Redis for query: '{}'",
                    RagPromptAndCitationHelper.truncate(rawQuery, 40));
        }
        return response;
    }

    private void enforceRateLimit(String clientIp, String officerBadgeId, String sessionId) {
        boolean hasActorOverride = (officerBadgeId != null && !officerBadgeId.isBlank())
                || (sessionId != null && !sessionId.isBlank());
        if (hasActorOverride) {
            if (!redisRateLimiter.isAllowed(clientIp, officerBadgeId, sessionId)) {
                log.warn("Rate limit exceeded for actor (officer={}, hasSession={}, ip={})",
                        officerBadgeId != null ? officerBadgeId : "-", sessionId != null, clientIp);
                throw new BusinessException(ErrorCode.RATE_LIMIT_EXCEEDED,
                        "Bạn đã vượt quá giới hạn tần suất hỏi đáp trong phút hiện tại. Vui lòng chờ 1 phút trước khi hỏi tiếp.");
            }
        } else if (clientIp != null && !clientIp.isBlank() && !redisRateLimiter.isAllowed(clientIp)) {
            log.warn("Rate limit exceeded for IP: {}", clientIp);
            throw new BusinessException(ErrorCode.RATE_LIMIT_EXCEEDED,
                    "Bạn đã gửi quá 5 yêu cầu/phút. Vui lòng chờ 1 phút trước khi hỏi tiếp.");
        }
    }

    private WardOfficeInfo resolveWardOffice(RagAskRequest request) {
        String wardCode = request.getWardCode();
        String wardName = request.getWardName();
        String officeAddress = request.getOfficeAddress();

        if (wardCode != null && !wardCode.isBlank()) {
            String normalizedCode = wardCode.trim().toUpperCase();
            if (wardRegistryService != null) {
                try {
                    vn.edu.uth.smartward.ward.WardDto dto = wardRegistryService.getWardByCode(normalizedCode);
                    if (dto != null) {
                        wardCode = dto.code();
                        if (wardName == null || wardName.isBlank()) {
                            wardName = "UBND " + dto.name() + ", " + dto.province();
                        }
                        if (officeAddress == null || officeAddress.isBlank()) {
                            officeAddress = dto.officeAddress();
                        }
                    }
                } catch (Exception ignored) {
                    // Fallback to legacy REGISTERED_WARDS map if code is test fixture like WARD-AG-01
                }
            }
            WardOfficeInfo info = REGISTERED_WARDS.get(normalizedCode);
            if (info != null) {
                wardCode = info.wardCode();
                wardName = info.wardName();
                officeAddress = info.officeAddress();
            }
        }
        if (wardName != null && wardName.length() > 120) wardName = wardName.substring(0, 120);
        if (officeAddress != null && officeAddress.length() > 300) officeAddress = officeAddress.substring(0, 300);
        return new WardOfficeInfo(wardCode, wardName, officeAddress);
    }

    static String resolvePrimaryProcedureCode(List<LegalChunkMatch> chunks, List<LegalCitationDto> citations) {
        if (citations != null) {
            for (LegalCitationDto c : citations) {
                if (c != null && c.getProcedureCode() != null && !c.getProcedureCode().isBlank()) {
                    return c.getProcedureCode().trim().toUpperCase();
                }
            }
        }
        if (chunks != null) {
            for (LegalChunkMatch m : chunks) {
                if (m != null && m.getProcedureCode() != null && !m.getProcedureCode().isBlank()) {
                    return m.getProcedureCode().trim().toUpperCase();
                }
            }
        }
        return null;
    }

    public static String mapProcedureToSupportedFormType(String procedureCode) {
        if (procedureCode == null || procedureCode.isBlank()) return null;
        return switch (procedureCode.trim().toUpperCase()) {
            case "TTHC-HT-01", "KS-01-DK" -> "TK-KS";
            case "TTHC-HT-02", "TTHC-HT-11", "HT-02-DK" -> "TK-KH";
            case "TTHC-BT-01" -> "TK-BTXH";
            case "TTHC-CR-01", "CT-01" -> "CT01";
            default -> null;
        };
    }

    private String buildScopedCacheKey(String effectiveQuery, WardOfficeInfo ward, String category, boolean includeOfficerScope) {
        String cacheKey = queryCacheService.buildCacheKey(effectiveQuery, ward.wardCode(), ward.wardName(), category);
        if (cacheKey == null) {
            String safeWard = (ward.wardName() != null && !ward.wardName().isBlank()) ? ward.wardName().trim() : "";
            cacheKey = safeWard.isEmpty() ? effectiveQuery : (effectiveQuery + "::" + safeWard);
        }
        return includeOfficerScope ? cacheKey + "::OFFICER" : cacheKey;
    }

    private List<LegalChunkMatch> retrieveAndRerankChunks(String effectiveQuery, boolean includeOfficerScope,
                                                          String wardCode, int k) {
        String pgVectorString = null;
        try {
            float[] embedding = aiModelClient.generateEmbedding(effectiveQuery);
            pgVectorString = aiModelClient.toPgVectorString(embedding);
        } catch (Exception ex) {
            log.warn("Query vectorization failed: {}. Continuing with hybrid keyword retrieval.", ex.getMessage());
        }

        String activeModelId = aiModelClient.getEmbeddingModelId();
        int retrievalPoolSize = Math.max(k * 2, 6);
        List<LegalChunkMatch> vectorCandidates = Collections.emptyList();

        if (pgVectorString != null) {
            try {
                vectorCandidates = chunkRepository.findTopKSimilarChunksWithAcl(
                        pgVectorString, activeModelId, includeOfficerScope, wardCode, retrievalPoolSize);
            } catch (Exception aclEx) {
                log.debug("ACL vector query with model filter failed: {}", aclEx.getMessage());
            }
            if ((vectorCandidates == null || vectorCandidates.isEmpty())
                    && activeModelId != null && !activeModelId.isBlank()) {
                log.info("Zero ACL chunks found for model '{}'. Retrying ACL-scoped retrieval across active models.", activeModelId);
                try {
                    vectorCandidates = chunkRepository.findTopKSimilarChunksWithAcl(
                            pgVectorString, null, includeOfficerScope, wardCode, retrievalPoolSize);
                } catch (Exception crossModelEx) {
                    log.debug("Cross-model ACL vector query fallback failed: {}", crossModelEx.getMessage());
                }
            }
        }

        List<LegalChunkMatch> ftsCandidates = Collections.emptyList();
        try {
            List<LegalChunkMatch> ftsRaw = chunkRepository.findTopKFullTextChunksWithAcl(
                    effectiveQuery, includeOfficerScope, wardCode, retrievalPoolSize);
            if (ftsRaw != null) ftsCandidates = ftsRaw;
        } catch (Exception ftsEx) {
            log.debug("FTS retrieval unavailable or mocked empty: {}", ftsEx.getMessage());
        }

        LegalChunkReranker activeReranker = (reranker != null) ? reranker : new LegalChunkReranker();
        List<LegalChunkMatch> fused = activeReranker.fuseWithRrf(
                vectorCandidates != null ? vectorCandidates : Collections.emptyList(), ftsCandidates, retrievalPoolSize);
        return activeReranker.rerank(effectiveQuery, fused, k);
    }

    private RagAskResponse buildAndCacheAbstention(String rawQuery, List<LegalChunkMatch> candidateChunks,
                                                   double maxSimilarity, double threshold, WardOfficeInfo ward,
                                                   String cacheKey, long startTime) {
        boolean isGrayZone = !candidateChunks.isEmpty() && maxSimilarity >= defaultThetaLower;
        String reason;
        String abstentionAnswer;

        if (isGrayZone) {
            log.warn("[HITL_QUEUE] Gray-zone query detected: '{}' (S_max={} in [theta_lower={}, theta={})). Flagged for human officer review.",
                    RagPromptAndCitationHelper.sanitizeForLog(rawQuery),
                    String.format(Locale.US, "%.4f", maxSimilarity), defaultThetaLower, threshold);
            LegalChunkMatch topCandidate = candidateChunks.get(0);
            reason = String.format(Locale.US,
                    "Vùng xám nghi vấn (%.3f trong khoảng [%.2f, %.2f)): Cần công dân làm rõ thêm hoặc cán bộ Một cửa hỗ trợ.",
                    maxSimilarity, defaultThetaLower, threshold);
            abstentionAnswer = resolveGrayZoneMessage(rawQuery, topCandidate, ward.wardName(), ward.officeAddress());
            hitlQueueManager.enqueueGrayZoneItem(hitlRepository, rawQuery, ward.wardName(), maxSimilarity, topCandidate, abstentionAnswer);
        } else {
            reason = String.format(Locale.US,
                    "Điểm tương đồng cao nhất (%.3f) thấp hơn ngưỡng an toàn pháp lý (%.2f).",
                    maxSimilarity, threshold);
            abstentionAnswer = resolveAbstentionMessage(rawQuery, ward.wardName(), ward.officeAddress());
        }

        RagAskResponse abstainedResponse = RagAskResponse.builder()
                .answer(abstentionAnswer)
                .abstained(true)
                .abstentionReason(reason)
                .maxSimilarity(maxSimilarity)
                .appliedThreshold(threshold)
                .citations(Collections.emptyList())
                .cached(false)
                .suggestions(List.of("👶 Đăng ký khai sinh", "💍 Đăng ký kết hôn", "🏠 Đăng ký thường trú (CT01)", "📋 Xem 40 thủ tục"))
                .responseTimeMs(System.currentTimeMillis() - startTime)
                .disclaimer(LEGAL_DISCLAIMER)
                .build();

        queryCacheService.putResponse(cacheKey, abstainedResponse, 30);
        return abstainedResponse;
    }

    private String generateGroundedAnswer(String rawQuery, String effectiveQuery,
                                          List<LegalChunkMatch> candidateChunks, WardOfficeInfo ward) {
        String systemPrompt = RagPromptAndCitationHelper.buildSystemPrompt(candidateChunks, ward.wardName(), ward.officeAddress());
        String generatedAnswer;
        try {
            String guardedQuery = "<<<CITIZEN_INPUT_START>>>\n" + effectiveQuery + "\n<<<CITIZEN_INPUT_END>>>";
            generatedAnswer = aiModelClient.generateChatResponse(systemPrompt, guardedQuery);
            if (generatedAnswer == null || RagPromptAndCitationHelper.isAiFailureNotice(generatedAnswer)) {
                log.warn("AI Model returned empty or failure notice for query: '{}'. Activating structured database fallback.",
                        RagPromptAndCitationHelper.truncate(rawQuery, 40));
                if (generatedAnswer == null
                        || (!generatedAnswer.contains(GeminiAiClient.TRUNCATION_FALLBACK_NOTICE)
                        && !generatedAnswer.contains("vượt quá giới hạn hiển thị tự động"))) {
                    generatedAnswer = buildStructuredFallbackAnswer(candidateChunks, ward.wardName(), ward.officeAddress());
                }
            }
        } catch (Exception ex) {
            log.error("AI Model invocation failed: {}. Falling back to structured database extraction.", ex.getMessage());
            generatedAnswer = buildStructuredFallbackAnswer(candidateChunks, ward.wardName(), ward.officeAddress());
        }

        generatedAnswer = prunePreamble(generatedAnswer);
        if (generatedAnswer != null && !generatedAnswer.contains("5. CĂN CỨ PHÁP LÝ") && !candidateChunks.isEmpty()) {
            LegalChunkMatch topChunk = candidateChunks.get(0);
            String ref = topChunk.getLegalReference() != null ? topChunk.getLegalReference() : "Quy định pháp luật hiện hành";
            generatedAnswer = generatedAnswer.trim() + "\n\n5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n["
                    + topChunk.getChunkCode() + "] Căn cứ " + ref + ".\n" + LEGAL_DISCLAIMER;
        }
        if (generatedAnswer != null && !generatedAnswer.contains("không thay thế quyết định chính thức")) {
            generatedAnswer = generatedAnswer.trim() + "\n\n" + LEGAL_DISCLAIMER;
        }
        return generatedAnswer;
    }

    private boolean isEvalOrTestProfile() {
        if (environment == null) return false;
        for (String profile : environment.getActiveProfiles()) {
            if ("eval".equalsIgnoreCase(profile) || "test".equalsIgnoreCase(profile)) return true;
        }
        return false;
    }

    private static double computeMaxSimilarity(List<LegalChunkMatch> chunks) {
        return chunks.stream()
                .mapToDouble(m -> m.getSimilarityScore() != null ? m.getSimilarityScore() : 0.0)
                .max().orElse(0.0);
    }

    // --- Delegating facades preserving 100% public & package-private compatibility ---
    String resolveAbstentionMessage(String query, String wardName, String officeAddress) { return RagPromptAndCitationHelper.resolveAbstentionMessage(query, wardName, officeAddress); }
    String resolveGrayZoneMessage(String query, LegalChunkMatch topCandidate, String wardName, String officeAddress) { return RagPromptAndCitationHelper.resolveGrayZoneMessage(query, topCandidate, wardName, officeAddress); }
    public String buildStructuredFallbackAnswer(List<LegalChunkMatch> chunks, String wardName, String officeAddress) { return RagPromptAndCitationHelper.buildStructuredFallbackAnswer(chunks, wardName, officeAddress); }
    public String prunePreamble(String answer) { return RagPromptAndCitationHelper.prunePreamble(answer); }
    public String sanitizeAnswerCitations(String answer, Set<String> validCodes) { return RagPromptAndCitationHelper.sanitizeAnswerCitations(answer, validCodes); }
    public List<LegalCitationDto> postVerifyCitations(String answer, List<LegalChunkMatch> candidates) { return RagPromptAndCitationHelper.postVerifyCitations(answer, candidates); }
    boolean isProcedureListQuery(String query) { return RagIntentAndContextResolver.isProcedureListQuery(query); }
    boolean isGreetingOrSmallTalk(String query) { return RagIntentAndContextResolver.isGreetingOrSmallTalk(query); }
    boolean isGreetingQuery(String query) { return RagIntentAndContextResolver.isGreetingOrSmallTalk(query); }
    boolean isAmbiguousConsultation(String query) { return RagIntentAndContextResolver.isAmbiguousConsultation(query); }
    boolean isWardOfficeQuery(String query) { return RagIntentAndContextResolver.isWardOfficeQuery(query); }
    String resolveEffectiveQuery(String rawQuery, List<ConversationTurnDto> history) { return RagIntentAndContextResolver.resolveEffectiveQuery(rawQuery, history); }
    boolean isFollowUpQuestion(String query) { return RagIntentAndContextResolver.isFollowUpQuestion(query); }
    String extractProcedureFromText(String text) { return RagIntentAndContextResolver.extractProcedureFromText(text); }
    String mapProcedureCodeToName(String code) { return RagIntentAndContextResolver.mapProcedureCodeToName(code); }
    List<String> generateProcedureSuggestions(List<LegalChunkMatch> chunks) { return RagIntentAndContextResolver.generateProcedureSuggestions(chunks); }
    public List<HitlGrayZoneItemDto> getHitlQueue() { return hitlQueueManager.getHitlQueue(hitlRepository); }
    public HitlGrayZoneItemDto resolveHitlItem(String id, String approvedAnswer, String officerName) { return hitlQueueManager.resolveHitlItem(hitlRepository, queryCacheService, defaultThreshold, id, approvedAnswer, officerName); }
}
