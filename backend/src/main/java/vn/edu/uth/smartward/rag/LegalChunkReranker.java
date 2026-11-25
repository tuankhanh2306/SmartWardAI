package vn.edu.uth.smartward.rag;

import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.*;

/**
 * TASK-033 & TASK-034:
 * - Reciprocal Rank Fusion (RRF, k=60) combining pgvector Cosine search and PostgreSQL tsvector FTS.
 * - Lightweight deterministic Reranker (Step 8/9 Enterprise RAG) scoring procedure name match,
 *   section intent (OVERVIEW / REQUIRED_DOCUMENTS / PROCESS_STEP / LEGAL_BASIS), and legal keywords
 *   without inflating low-similarity out-of-scope queries across the theta=0.78 abstention guardrail.
 */
@Component
public class LegalChunkReranker {

    public static final int RRF_K = 60;
    private static final double MIN_BASE_SIM_FOR_BOOST = 0.55;
    private static final double MAX_RERANK_BOOST = 0.08;

    public record ScoredChunkMatch(
            Long id,
            String chunkCode,
            String chunkType,
            String title,
            String content,
            String legalReference,
            String procedureCode,
            String procedureName,
            Double similarityScore,
            double rrfScore
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

    /**
     * Fuses vector search results and PostgreSQL FTS results via Reciprocal Rank Fusion:
     *   rrf = 1 / (60 + r_vec) + 1 / (60 + r_fts)
     * Preserves calibrated cosine similarity scores so theta=0.78 guardrail stays accurate.
     */
    public List<LegalChunkMatch> fuseWithRrf(
            List<LegalChunkMatch> vectorMatches,
            List<LegalChunkMatch> ftsMatches,
            int limit) {
        List<LegalChunkMatch> vec = vectorMatches != null ? vectorMatches : Collections.emptyList();
        List<LegalChunkMatch> fts = ftsMatches != null ? ftsMatches : Collections.emptyList();
        if (fts.isEmpty()) return vec.size() > limit ? vec.subList(0, limit) : vec;
        if (vec.isEmpty()) return fts.size() > limit ? fts.subList(0, limit) : fts;

        Map<String, LegalChunkMatch> byCode = new LinkedHashMap<>();
        Map<String, Double> rrfScores = new HashMap<>();
        Map<String, Double> bestBaseSim = new HashMap<>();
        Map<String, Integer> hitCount = new HashMap<>();

        for (int i = 0; i < vec.size(); i++) {
            LegalChunkMatch m = vec.get(i);
            String key = chunkKey(m);
            byCode.putIfAbsent(key, m);
            rrfScores.merge(key, 1.0 / (RRF_K + i + 1), Double::sum);
            double sim = m.getSimilarityScore() != null ? m.getSimilarityScore() : 0.0;
            bestBaseSim.merge(key, sim, Math::max);
            hitCount.merge(key, 1, Integer::sum);
        }

        for (int i = 0; i < fts.size(); i++) {
            LegalChunkMatch m = fts.get(i);
            String key = chunkKey(m);
            byCode.putIfAbsent(key, m);
            rrfScores.merge(key, 1.0 / (RRF_K + i + 1), Double::sum);
            double sim = m.getSimilarityScore() != null ? m.getSimilarityScore() : 0.0;
            bestBaseSim.merge(key, sim, Math::max);
            hitCount.merge(key, 1, Integer::sum);
        }

        List<ScoredChunkMatch> fused = new ArrayList<>();
        for (Map.Entry<String, LegalChunkMatch> entry : byCode.entrySet()) {
            String key = entry.getKey();
            LegalChunkMatch m = entry.getValue();
            double baseSim = bestBaseSim.getOrDefault(key, 0.0);
            double rrf = rrfScores.getOrDefault(key, 0.0);
            // Small calibrated consensus bonus (+0.03) ONLY when BOTH vector and FTS agree on a plausible chunk
            double effectiveSim = (hitCount.getOrDefault(key, 0) >= 2 && baseSim >= MIN_BASE_SIM_FOR_BOOST)
                    ? Math.min(0.99, baseSim + 0.03)
                    : baseSim;
            fused.add(new ScoredChunkMatch(
                    m.getId(), m.getChunkCode(), m.getChunkType(), m.getTitle(), m.getContent(),
                    m.getLegalReference(), m.getProcedureCode(), m.getProcedureName(),
                    effectiveSim, rrf
            ));
        }

        fused.sort(Comparator
                .comparingDouble(ScoredChunkMatch::rrfScore).reversed()
                .thenComparing(Comparator.comparingDouble((ScoredChunkMatch s) -> s.similarityScore() != null ? s.similarityScore() : 0.0).reversed()));

        int maxSize = Math.max(1, limit);
        return new ArrayList<>(fused.size() > maxSize ? fused.subList(0, maxSize) : fused);
    }

    /**
     * Lightweight Reranker (Step 8/9): re-scores top-K candidates using procedure name overlap,
     * section intent alignment, and legal keyword matches.
     */
    public List<LegalChunkMatch> rerank(String query, List<LegalChunkMatch> candidates, int topK) {
        if (candidates == null || candidates.size() <= 1 || query == null || query.isBlank()) {
            return candidates != null ? candidates : Collections.emptyList();
        }

        String normQuery = normalizeAscii(query);
        Set<String> queryTokens = extractMeaningfulTokens(normQuery);
        String preferredSection = inferPreferredSection(normQuery);

        List<ScoredChunkMatch> rescored = new ArrayList<>(candidates.size());
        for (LegalChunkMatch m : candidates) {
            double baseSim = m.getSimilarityScore() != null ? m.getSimilarityScore() : 0.0;
            double boost = 0.0;

            if (baseSim >= MIN_BASE_SIM_FOR_BOOST) {
                // 1. Procedure name & chunk title token overlap (up to +0.045)
                String headerText = normalizeAscii((m.getProcedureName() != null ? m.getProcedureName() : "") + " " + (m.getTitle() != null ? m.getTitle() : ""));
                if (!queryTokens.isEmpty() && !headerText.isBlank()) {
                    long matched = queryTokens.stream().filter(headerText::contains).count();
                    double overlapRatio = (double) matched / queryTokens.size();
                    boost += Math.min(0.045, overlapRatio * 0.055);
                }

                // 2. Section / chunk_type intent alignment (+0.025)
                if (preferredSection != null && m.getChunkType() != null) {
                    String ct = m.getChunkType().trim().toUpperCase(Locale.ROOT);
                    if (ct.equals(preferredSection)
                            || ("REQUIRED_DOCUMENTS".equals(preferredSection) && "REQUIRED_DOCS".equals(ct))) {
                        boost += 0.025;
                    }
                }

                // 3. Explicit legal code / form symbol match (+0.02)
                String codeAndRef = normalizeAscii((m.getProcedureCode() != null ? m.getProcedureCode() : "") + " " + (m.getLegalReference() != null ? m.getLegalReference() : "") + " " + (m.getContent() != null ? m.getContent() : ""));
                for (String marker : List.of("ct01", "tk-ks", "tk-kh", "tk-btxh", "tthc-")) {
                    if (normQuery.contains(marker) && codeAndRef.contains(marker)) {
                        boost += 0.02;
                        break;
                    }
                }
            }

            double finalSim = Math.min(0.99, baseSim + Math.min(MAX_RERANK_BOOST, boost));
            double existingRrf = (m instanceof ScoredChunkMatch scm) ? scm.rrfScore() : 0.0;
            rescored.add(new ScoredChunkMatch(
                    m.getId(), m.getChunkCode(), m.getChunkType(), m.getTitle(), m.getContent(),
                    m.getLegalReference(), m.getProcedureCode(), m.getProcedureName(),
                    finalSim, existingRrf
            ));
        }

        rescored.sort(Comparator.comparingDouble((ScoredChunkMatch s) -> s.similarityScore() != null ? s.similarityScore() : 0.0).reversed());
        int maxSize = Math.max(1, topK);
        return new ArrayList<>(rescored.size() > maxSize ? rescored.subList(0, maxSize) : rescored);
    }

    private String inferPreferredSection(String normQuery) {
        if (normQuery.contains("le phi") || normQuery.contains("phi bao nhieu") || normQuery.contains("mat tien")
                || normQuery.contains("bao lau") || normQuery.contains("thoi han") || normQuery.contains("may ngay")) {
            return "OVERVIEW";
        }
        if (normQuery.contains("giay to") || normQuery.contains("ho so gom") || normQuery.contains("thanh phan")
                || normQuery.contains("can gi") || normQuery.contains("mang theo")) {
            return "REQUIRED_DOCUMENTS";
        }
        if (normQuery.contains("trinh tu") || normQuery.contains("cac buoc") || normQuery.contains("thu tuc nhu the nao")) {
            return "PROCESS_STEP";
        }
        if (normQuery.contains("can cu") || normQuery.contains("nghi dinh") || normQuery.contains("thong tu") || normQuery.contains("dieu luat")) {
            return "LEGAL_BASIS";
        }
        return null;
    }

    private Set<String> extractMeaningfulTokens(String normText) {
        Set<String> stop = Set.of("toi", "muon", "lam", "can", "gi", "nhu", "the", "nao", "cho", "hoi", "ve", "thu", "tuc", "cua", "tai", "o", "dau", "va", "co", "khong", "duoc", "la", "bao", "nhieu");
        Set<String> tokens = new LinkedHashSet<>();
        for (String t : normText.split("[^a-z0-9-]+")) {
            if (t.length() >= 2 && !stop.contains(t)) {
                tokens.add(t);
            }
        }
        return tokens;
    }

    static String normalizeAscii(String input) {
        if (input == null) return "";
        String lower = input.toLowerCase(Locale.ROOT).replace('đ', 'd');
        String decomposed = Normalizer.normalize(lower, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
    }

    private String chunkKey(LegalChunkMatch m) {
        return m.getChunkCode() != null ? m.getChunkCode() : String.valueOf(m.getId());
    }
}
