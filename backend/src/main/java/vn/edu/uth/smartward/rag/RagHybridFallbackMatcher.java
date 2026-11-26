package vn.edu.uth.smartward.rag;

import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Extracted from RagQueryService (TASK-019) & hardened in TASK-050:
 * - Enforces identical ACTIVE status, effective_date <= CURRENT_DATE, ACL visibility_scope,
 *   and ward_code filters as vector & FTS retrieval.
 * - Removes hardcoded 0.92 score: computes bounded conservative lexical score in [0.54, 0.72]
 *   (within gray-zone [0.42, 0.78)) so uncalibrated keyword matches suggest the procedure / ask
 *   the citizen to clarify instead of bypassing the theta=0.78 safety guardrail.
 */
@Slf4j
final class RagHybridFallbackMatcher {

    private RagHybridFallbackMatcher() {}

    record SimpleLegalChunkMatch(
            Long id,
            String chunkCode,
            String chunkType,
            String title,
            String content,
            String legalReference,
            String procedureCode,
            String procedureName,
            Double similarityScore
    ) implements LegalChunkMatch {
        @Override public Long getId() { return id; }
        @Override public String getChunkCode() { return chunkCode; }
        @Override public String getChunkType() { return chunkType; }
        @Override public String getTitle() { return title; }
        @Override public String getContent() { return content; }
        @Override public String getLegalReference() { return legalReference; }
        @Override public String getProcedureCode() { return procedureCode; }
        @Override public String getProcedureName() { return procedureName; }
        @Override public Double getSimilarityScore() { return similarityScore; }
    }

    static List<LegalChunkMatch> tryHybridProcedureKeywordMatch(String query,
                                                                AdminProcedureRepository procedureRepository,
                                                                LegalChunkRepository chunkRepository) {
        return tryHybridProcedureKeywordMatch(query, procedureRepository, chunkRepository, false, null);
    }

    static List<LegalChunkMatch> tryHybridProcedureKeywordMatch(String query,
                                                                AdminProcedureRepository procedureRepository,
                                                                LegalChunkRepository chunkRepository,
                                                                boolean includeOfficerScope,
                                                                String wardCode) {
        if (query == null || query.isBlank() || procedureRepository == null || chunkRepository == null) {
            return Collections.emptyList();
        }
        String matchedCode = matchProcedureCode(query.toLowerCase(Locale.ROOT));
        if (matchedCode == null) {
            return Collections.emptyList();
        }

        Optional<AdminProcedure> procOpt = procedureRepository.findByProcedureCode(matchedCode);
        if (procOpt.isEmpty() && "TTHC-HT-13".equals(matchedCode)) {
            procOpt = procedureRepository.findByProcedureCode("TTHC-HT-03");
        }
        if (procOpt.isEmpty()) {
            return Collections.emptyList();
        }

        AdminProcedure proc = procOpt.get();
        if (proc.getStatus() != null && !"ACTIVE".equalsIgnoreCase(proc.getStatus().trim())) {
            log.info("Hybrid Keyword Match skipped inactive procedure '{}' (status={})",
                    proc.getProcedureCode(), proc.getStatus());
            return Collections.emptyList();
        }

        List<LegalChunk> scopedChunks = loadAndFilterScopedChunks(
                chunkRepository, proc.getId(), includeOfficerScope, wardCode);
        List<LegalChunk> rawAllChunks = chunkRepository.findByProcedureId(proc.getId());

        // If chunks exist in DB for this procedure, but ALL were excluded by status/date/ACL/ward filters,
        // strictly return empty rather than synthesizing an unscoped overview!
        if (scopedChunks.isEmpty() && rawAllChunks != null && !rawAllChunks.isEmpty()) {
            log.info("Hybrid Keyword Match excluded all {} chunks of '{}' due to scope/ACL/effectiveDate filters.",
                    rawAllChunks.size(), proc.getProcedureCode());
            return Collections.emptyList();
        }

        double calibratedGrayScore = computeConservativeKeywordScore(query, proc);
        log.info("Hybrid Keyword Match: mapped query '{}' to procedure '{}' ({}) with {} scoped chunks, score={}",
                RagPromptAndCitationHelper.truncate(query, 40),
                proc.getProcedureName(), proc.getProcedureCode(), scopedChunks.size(),
                String.format(Locale.US, "%.3f", calibratedGrayScore));

        List<LegalChunkMatch> matches = new ArrayList<>();
        if (!scopedChunks.isEmpty()) {
            for (LegalChunk c : scopedChunks) {
                matches.add(new SimpleLegalChunkMatch(
                        c.getId(), c.getChunkCode(), c.getChunkType(), c.getTitle(),
                        c.getContent(), c.getLegalReference(),
                        proc.getProcedureCode(), proc.getProcedureName(), calibratedGrayScore
                ));
            }
        } else {
            matches.add(new SimpleLegalChunkMatch(
                    proc.getId(),
                    proc.getProcedureCode() + "_CHUNK_001",
                    "OVERVIEW",
                    "Tổng quan " + proc.getProcedureName(),
                    "Thủ tục: " + proc.getProcedureName()
                            + ". Cơ quan giải quyết: " + (proc.getAgency() != null ? proc.getAgency() : "UBND cấp xã / phường")
                            + ". Thời hạn giải quyết: " + (proc.getProcessingTime() != null ? proc.getProcessingTime() : "Theo quy định")
                            + ". Lệ phí: " + (proc.getFee() != null ? proc.getFee() : "Miễn phí / theo quy định")
                            + ". Thực hiện tại Bộ phận Tiếp nhận và Trả kết quả (Một cửa).",
                    proc.getProcedureName(),
                    proc.getProcedureCode(),
                    proc.getProcedureName(),
                    calibratedGrayScore
            ));
        }
        return matches;
    }

    private static List<LegalChunk> loadAndFilterScopedChunks(LegalChunkRepository chunkRepository,
                                                              Long procedureId,
                                                              boolean includeOfficerScope,
                                                              String wardCode) {
        List<LegalChunk> candidates = null;
        try {
            candidates = chunkRepository.findScopedActiveChunksByProcedureId(procedureId, includeOfficerScope, wardCode);
        } catch (Exception ex) {
            log.debug("Scoped native query unavailable, falling back to in-memory scope filter: {}", ex.getMessage());
        }
        if (candidates == null || candidates.isEmpty()) {
            candidates = chunkRepository.findByProcedureId(procedureId);
        }
        if (candidates == null || candidates.isEmpty()) {
            return Collections.emptyList();
        }
        LocalDate today = LocalDate.now();
        String normWard = (wardCode != null && !wardCode.isBlank()) ? wardCode.trim() : null;

        List<LegalChunk> filtered = new ArrayList<>();
        for (LegalChunk c : candidates) {
            if (c == null) continue;
            if (c.getStatus() != null && !"ACTIVE".equalsIgnoreCase(c.getStatus().trim())) continue;
            if (c.getEffectiveDate() != null && c.getEffectiveDate().isAfter(today)) continue;

            String vis = c.getVisibilityScope() != null ? c.getVisibilityScope().trim() : "PUBLIC";
            boolean visAllowed = "PUBLIC".equalsIgnoreCase(vis)
                    || (includeOfficerScope && "OFFICER_ONLY".equalsIgnoreCase(vis));
            if (!visAllowed) continue;

            String chunkWard = c.getWardCode() != null ? c.getWardCode().trim() : "";
            if (!chunkWard.isEmpty() && normWard != null && !chunkWard.equalsIgnoreCase(normWard)) continue;
            if (!chunkWard.isEmpty() && normWard == null) continue;

            filtered.add(c);
        }
        return filtered;
    }

    /**
     * Computes a bounded lexical confidence score strictly inside the gray-zone [0.54, 0.72]
     * (< theta=0.78, >= theta_lower=0.42) while keyword scoring remains uncalibrated,
     * so keyword-only hits suggest the procedure / ask for clarification rather than
     * bypassing the 0.78 legal abstention guardrail.
     */
    static double computeConservativeKeywordScore(String query, AdminProcedure proc) {
        String normQ = LegalChunkReranker.normalizeAscii(query);
        String normProc = LegalChunkReranker.normalizeAscii(
                (proc.getProcedureName() != null ? proc.getProcedureName() : "") + " "
                        + (proc.getProcedureCode() != null ? proc.getProcedureCode() : ""));
        double score = 0.56;
        if (proc.getProcedureCode() != null && normQ.contains(proc.getProcedureCode().toLowerCase(Locale.ROOT))) {
            score += 0.10;
        }
        int matchedIntentTerms = 0;
        for (String term : List.of("ho so", "giay to", "le phi", "thoi han", "bao lau", "noi nop", "o dau", "dieu kien")) {
            if (normQ.contains(term)) matchedIntentTerms++;
        }
        score += Math.min(0.06, matchedIntentTerms * 0.03);
        if (normQ.split("\\s+").length <= 3 && !normProc.isBlank()) {
            score = Math.min(score, 0.60);
        }
        return Math.max(0.54, Math.min(0.72, score));
    }

    private static String matchProcedureCode(String lower) {
        if (lower.contains("khai sinh") || lower.contains("giấy khai sinh") || lower.contains("chứng sinh") || lower.contains("sinh con") || lower.contains("mới sinh")) {
            return "TTHC-HT-01";
        } else if (lower.contains("kết hôn") || lower.contains("đăng ký kết hôn") || lower.contains("hôn thú") || lower.contains("giá thú") || lower.contains("lấy vợ") || lower.contains("lấy chồng")) {
            return "TTHC-HT-02";
        } else if (lower.contains("khai tử") || lower.contains("giấy chứng tử") || lower.contains("báo tử") || lower.contains("người mất") || lower.contains("người chết")) {
            return "TTHC-HT-13";
        } else if (lower.contains("trích lục") || lower.contains("bản sao trích lục") || lower.contains("xin lại khai sinh") || lower.contains("xin lại kết hôn")) {
            return "TTHC-HT-04";
        } else if (lower.contains("độc thân") || lower.contains("tình trạng hôn nhân") || lower.contains("chưa kết hôn")) {
            return "TTHC-HT-11";
        } else if (lower.contains("chứng thực chữ ký") || lower.contains("lăn tay") || lower.contains("điểm chỉ")) {
            return "TTHC-CT-02";
        } else if (lower.contains("sao y") || lower.contains("chứng thực bản sao") || lower.contains("chứng giấy")) {
            return "TTHC-CT-01";
        } else if (lower.contains("mai táng") || lower.contains("tiền mai táng") || lower.contains("chi phí mai táng") || lower.contains("chết có trợ cấp")) {
            return "TTHC-BT-02";
        } else if (lower.contains("tiền già") || lower.contains("trợ cấp người cao tuổi") || lower.contains("trợ cấp xã hội") || lower.contains("bảo trợ xã hội")) {
            return "TTHC-BT-01";
        } else if (lower.contains("ct01") || lower.contains("thường trú") || lower.contains("nhập hộ khẩu") || lower.contains("nhập khẩu")) {
            return "TTHC-CR-01";
        } else if (lower.contains("tạm trú") || lower.contains("đăng ký tạm trú")) {
            return "TTHC-CR-03";
        } else if (lower.contains("lưu trú") || lower.contains("thông báo lưu trú")) {
            return "TTHC-CR-06";
        } else if (lower.contains("tạm vắng") || lower.contains("khai báo tạm vắng")) {
            return "TTHC-CR-07";
        } else if (lower.contains("biến động đất") || lower.contains("sang tên đất") || lower.contains("chuyển nhượng quyền sử dụng") || lower.contains("tặng cho đất")) {
            return "TTHC-DC-01";
        } else if (lower.contains("sổ đỏ") || lower.contains("cấp sổ") || lower.contains("đăng ký đất đai")) {
            return "TTHC-DC-02";
        } else if (lower.contains("giấy phép xây dựng") || lower.contains("xin phép xây nhà") || lower.contains("xây dựng nhà ở")) {
            return "TTHC-XD-01";
        }
        return null;
    }
}
