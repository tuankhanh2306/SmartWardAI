package vn.edu.uth.smartward.rag;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.common.QueryCacheService;
import vn.edu.uth.smartward.rag.dto.ProcedureContentDto;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;

/**
 * TASK-013: Asynchronous Vector Indexing Worker for Published Administrative Procedures.
 * Decouples Admin approval latency from AI Sidecar embedding calls, selectively re-embeds
 * only chunks whose content_hash changed, retries transient Sidecar busy errors with backoff,
 * and tracks PENDING_INDEX / INDEXED / FAILED state safely without degrading existing vectors.
 */
@Slf4j
@Service
public class ProcedureVectorIndexWorker {

    public static final String STATUS_PENDING = "PENDING_INDEX";
    public static final String STATUS_INDEXED = "INDEXED";
    public static final String STATUS_FAILED = "FAILED";

    private final AdminProcedureRepository procedureRepository;
    private final ProcedureVersionRepository versionRepository;
    private final LegalChunkRepository chunkRepository;
    private final LegalChunkingService chunkingService;
    private final AiModelClient aiModelClient;
    private final QueryCacheService queryCacheService;
    private final ObjectMapper objectMapper;

    @Value("${smartward.rag.index-max-attempts:3}")
    private int maxAttemptsPerRun = 3;

    @Value("${smartward.rag.index-retry-backoff-ms:300}")
    private long initialBackoffMs = 300L;

    @Value("${smartward.rag.index-max-scheduled-retries:10}")
    private int maxScheduledRetries = 10;

    @Autowired
    public ProcedureVectorIndexWorker(AdminProcedureRepository procedureRepository,
                                      ProcedureVersionRepository versionRepository,
                                      LegalChunkRepository chunkRepository,
                                      @Autowired(required = false) LegalChunkingService chunkingService,
                                      @Autowired(required = false) AiModelClient aiModelClient,
                                      @Autowired(required = false) QueryCacheService queryCacheService,
                                      @Autowired(required = false) ObjectMapper objectMapper) {
        this.procedureRepository = procedureRepository;
        this.versionRepository = versionRepository;
        this.chunkRepository = chunkRepository;
        this.chunkingService = chunkingService != null ? chunkingService : new LegalChunkingService();
        this.aiModelClient = aiModelClient;
        this.queryCacheService = queryCacheService;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    @Async
    public CompletableFuture<String> indexProcedureVersionAsync(Long procedureId, Long versionId) {
        String status = indexProcedureVersionWithRetry(procedureId, versionId);
        return CompletableFuture.completedFuture(status);
    }

    /**
     * Selectively re-embeds changed sections of a published procedure version with bounded retry.
     * Existing chunk content & vectors are preserved untouched on embedding failures.
     */
    public String indexProcedureVersionWithRetry(Long procedureId, Long versionId) {
        if (procedureId == null || versionId == null) {
            return STATUS_FAILED;
        }
        Optional<ProcedureVersion> versionOpt = versionRepository.findById(versionId);
        Optional<AdminProcedure> procOpt = procedureRepository.findById(procedureId);
        if (versionOpt.isEmpty() || procOpt.isEmpty()) {
            log.warn("Async vector indexer skipped missing procedureId={} or versionId={}", procedureId, versionId);
            return STATUS_FAILED;
        }

        ProcedureVersion version = versionOpt.get();
        AdminProcedure proc = procOpt.get();

        // Only index if this version is still the active PUBLISHED version
        if (!"PUBLISHED".equalsIgnoreCase(version.getState())) {
            log.debug("Skipping async indexing for non-PUBLISHED version {} (state={})", versionId, version.getState());
            return version.getIndexStatus();
        }

        ProcedureContentDto content = parseContent(version.getContent());
        List<String> errors = new ArrayList<>();
        boolean allSucceeded = syncChunksWithRetry(proc, content, errors);

        if (allSucceeded) {
            version.setIndexStatus(STATUS_INDEXED);
            version.setIndexError(null);
            version.setIndexedAt(OffsetDateTime.now());
            versionRepository.save(version);

            proc.setIndexStatus(STATUS_INDEXED);
            procedureRepository.save(proc);

            if (queryCacheService != null) {
                queryCacheService.clearAllRagCache();
            }
            log.info("Async vector indexing INDEXED for procedure {} v{}", proc.getProcedureCode(), version.getVersionNo());
            return STATUS_INDEXED;
        }

        int nextRetryCount = (version.getIndexRetryCount() != null ? version.getIndexRetryCount() : 0) + 1;
        String errorSummary = String.join("; ", errors);
        if (errorSummary.length() > 500) {
            errorSummary = errorSummary.substring(0, 500);
        }
        version.setIndexStatus(STATUS_FAILED);
        version.setIndexRetryCount(nextRetryCount);
        version.setIndexError(errorSummary);
        versionRepository.save(version);

        proc.setIndexStatus(STATUS_FAILED);
        procedureRepository.save(proc);

        log.warn("Async vector indexing FAILED (retry #{}) for procedure {} v{}: {}",
                nextRetryCount, proc.getProcedureCode(), version.getVersionNo(), errorSummary);
        return STATUS_FAILED;
    }

    /**
     * Background safety-net worker that retries PENDING_INDEX or FAILED published procedures
     * whenever AI Sidecar recovers from overload or restarts.
     */
    @Scheduled(fixedDelayString = "${smartward.rag.index-retry-interval-ms:60000}")
    public int retryPendingAndFailedIndexes() {
        List<ProcedureVersion> candidates = versionRepository.findByStateAndIndexStatusIn(
                "PUBLISHED", List.of(STATUS_PENDING, STATUS_FAILED));
        if (candidates == null || candidates.isEmpty()) {
            return 0;
        }
        int indexedCount = 0;
        for (ProcedureVersion v : candidates) {
            int retries = v.getIndexRetryCount() != null ? v.getIndexRetryCount() : 0;
            if (retries >= maxScheduledRetries) {
                continue;
            }
            Long procId = v.getProcedure() != null ? v.getProcedure().getId() : null;
            if (procId == null) {
                continue;
            }
            String result = indexProcedureVersionWithRetry(procId, v.getId());
            if (STATUS_INDEXED.equals(result)) {
                indexedCount++;
            }
        }
        return indexedCount;
    }

    private boolean syncChunksWithRetry(AdminProcedure proc, ProcedureContentDto newContent, List<String> errors) {
        List<LegalChunk> existingChunks = chunkRepository.findByProcedureId(proc.getId());
        if (existingChunks == null) {
            existingChunks = new ArrayList<>();
        }

        Map<String, String> sectionMap = new LinkedHashMap<>();
        String overviewContent = String.format(
                "Thủ tục: %s. Cơ quan thực hiện: %s. %s",
                proc.getProcedureName(),
                newContent.getCoQuanThucHien(),
                newContent.getThoiHanLePhi()
        );
        sectionMap.put("OVERVIEW", overviewContent);
        sectionMap.put("PROCESS_STEP", newContent.getTrinhTu());
        sectionMap.put("REQUIRED_DOCUMENTS", newContent.getThanhPhanHoSo());
        sectionMap.put("LEGAL_BASIS", newContent.getCanCuPhapLy());

        Map<String, String> sectionTitleMap = Map.of(
                "OVERVIEW", "Tổng quan, Thời hạn & Lệ phí " + proc.getProcedureName(),
                "PROCESS_STEP", "Trình tự thực hiện " + proc.getProcedureName(),
                "REQUIRED_DOCUMENTS", "Thành phần hồ sơ " + proc.getProcedureName(),
                "LEGAL_BASIS", "Căn cứ pháp lý " + proc.getProcedureName()
        );

        boolean allSucceeded = true;
        int idx = 0;
        for (Map.Entry<String, String> entry : sectionMap.entrySet()) {
            idx++;
            String chunkType = entry.getKey();
            String textContent = entry.getValue();
            String newHash = ProcedureGovernanceService.sha256Hex(textContent);

            LegalChunk existing = existingChunks.stream()
                    .filter(LegalChunk::isActivePublicCatalogChunk)
                    .filter(c -> chunkType.equalsIgnoreCase(c.getChunkType())
                            || ("REQUIRED_DOCUMENTS".equals(chunkType) && "REQUIRED_DOCS".equalsIgnoreCase(c.getChunkType())))
                    .findFirst()
                    .orElse(null);

            String title = sectionTitleMap.getOrDefault(chunkType, proc.getProcedureName() + " - " + chunkType);
            String headerPath = proc.getProcedureCode() + " > " + chunkType;

            if (existing != null) {
                String existingHash = existing.getContentHash() != null
                        ? existing.getContentHash()
                        : ProcedureGovernanceService.sha256Hex(existing.getContent());
                if (newHash.equals(existingHash) && existing.getEmbedding() != null) {
                    continue;
                }

                LegalChunk candidate = LegalChunk.builder()
                        .procedure(proc)
                        .chunkCode(existing.getChunkCode())
                        .chunkType(chunkType)
                        .title(title)
                        .content(textContent)
                        .legalReference(proc.getProcedureName() + " - " + chunkType)
                        .headerPath(headerPath)
                        .sectionName(chunkType)
                        .contentHash(newHash)
                        .build();

                if (aiModelClient != null) {
                    Optional<AiModelClient.EmbeddingResult> embOpt = generateEmbeddingWithRetry(candidate, errors);
                    if (embOpt.isPresent()) {
                        AiModelClient.EmbeddingResult emb = embOpt.get();
                        existing.setTitle(title);
                        existing.setContent(textContent);
                        existing.setContentHash(newHash);
                        existing.setHeaderPath(headerPath);
                        existing.setSectionName(chunkType);
                        existing.setEmbedding(aiModelClient.toPgVectorString(emb.vector()));
                        existing.setEmbeddingModel(emb.modelId());
                        chunkRepository.save(existing);
                    } else {
                        allSucceeded = false;
                    }
                } else {
                    existing.setTitle(title);
                    existing.setContent(textContent);
                    existing.setContentHash(newHash);
                    existing.setHeaderPath(headerPath);
                    existing.setSectionName(chunkType);
                    chunkRepository.save(existing);
                }
            } else {
                String chunkCode = String.format("%s_CHUNK_%03d", proc.getProcedureCode(), idx);
                LegalChunk created = LegalChunk.builder()
                        .procedure(proc)
                        .chunkCode(chunkCode)
                        .chunkType(chunkType)
                        .title(title)
                        .content(textContent)
                        .legalReference(proc.getProcedureName() + " - " + chunkType)
                        .headerPath(headerPath)
                        .sectionName(chunkType)
                        .contentHash(newHash)
                        .status("ACTIVE")
                        .build();

                if (aiModelClient != null) {
                    Optional<AiModelClient.EmbeddingResult> embOpt = generateEmbeddingWithRetry(created, errors);
                    if (embOpt.isPresent()) {
                        AiModelClient.EmbeddingResult emb = embOpt.get();
                        created.setEmbedding(aiModelClient.toPgVectorString(emb.vector()));
                        created.setEmbeddingModel(emb.modelId());
                        chunkRepository.save(created);
                    } else {
                        allSucceeded = false;
                    }
                } else {
                    chunkRepository.save(created);
                }
            }
        }
        return allSucceeded;
    }

    private Optional<AiModelClient.EmbeddingResult> generateEmbeddingWithRetry(LegalChunk candidate, List<String> errors) {
        String embedText = chunkingService.prepareTextForEmbedding(candidate);
        int attempts = Math.max(1, maxAttemptsPerRun);
        Exception lastEx = null;

        for (int attempt = 1; attempt <= attempts; attempt++) {
            try {
                return Optional.of(aiModelClient.generateEmbeddingResult(embedText));
            } catch (Exception e) {
                lastEx = e;
                log.warn("Embedding attempt {}/{} failed for chunk {}: {}",
                        attempt, attempts, candidate.getChunkCode(), e.getMessage());
                if (attempt < attempts && initialBackoffMs > 0) {
                    try {
                        Thread.sleep(initialBackoffMs * attempt);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        errors.add(candidate.getChunkCode() + ": " + (lastEx != null ? lastEx.getMessage() : "unknown error"));
        return Optional.empty();
    }

    private ProcedureContentDto parseContent(String json) {
        if (json == null || json.isBlank()) {
            return new ProcedureContentDto();
        }
        try {
            return objectMapper.readValue(json, ProcedureContentDto.class);
        } catch (Exception e) {
            log.warn("Failed to parse ProcedureContentDto in async worker: {}", e.getMessage());
            return new ProcedureContentDto();
        }
    }
}
