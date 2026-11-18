package vn.edu.uth.smartward.rag;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.rag.dto.ProcedureDetailDto;
import vn.edu.uth.smartward.rag.dto.ProcedureDto;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

@Slf4j
@Service
public class ProcedureService {

    private final AdminProcedureRepository procedureRepository;
    private final LegalChunkRepository chunkRepository;
    private final AiModelClient aiModelClient;
    private final LegalChunkingService chunkingService;

    public ProcedureService(AdminProcedureRepository procedureRepository,
                            LegalChunkRepository chunkRepository) {
        this(procedureRepository, chunkRepository, null, new LegalChunkingService());
    }

    @Autowired
    public ProcedureService(AdminProcedureRepository procedureRepository,
                            LegalChunkRepository chunkRepository,
                            @Autowired(required = false) AiModelClient aiModelClient,
                            @Autowired(required = false) LegalChunkingService chunkingService) {
        this.procedureRepository = procedureRepository;
        this.chunkRepository = chunkRepository;
        this.aiModelClient = aiModelClient;
        this.chunkingService = chunkingService != null ? chunkingService : new LegalChunkingService();
    }

    @Transactional(readOnly = true)
    public List<ProcedureDto> getProcedures(String category, String keyword) {
        log.debug("Querying procedures with category='{}', keyword='{}'", category, keyword);
        List<AdminProcedure> procedures = procedureRepository.searchProcedures(category, keyword);

        Map<Long, Integer> chunkCounts = new HashMap<>();
        List<Object[]> countResults = chunkRepository.countChunksByProcedure();
        if (countResults != null) {
            for (Object[] row : countResults) {
                if (row != null && row.length >= 2 && row[0] instanceof Number procId && row[1] instanceof Number count) {
                    chunkCounts.put(procId.longValue(), count.intValue());
                }
            }
        }

        return procedures.stream()
                .filter(p -> p.getProcedureCode() == null
                        || !ProcedureDataSeeder.SKIPPED_DEPRECATED_CODES.contains(p.getProcedureCode().trim().toUpperCase()))
                .map(p -> ProcedureDto.builder()
                .procedureCode(p.getProcedureCode())
                .officialPortalCode(p.getPortalCode())
                .procedureName(p.getProcedureName())
                .category(p.getCategory())
                .agency(p.getAgency())
                .processingTime(p.getProcessingTime())
                .fee(p.getFee())
                .status(p.getStatus())
                .chunksCount(chunkCounts.getOrDefault(p.getId(), 0))
                .build()
        ).toList();
    }

    @Transactional(readOnly = true)
    public ProcedureDetailDto getProcedureByCode(String procedureCode) {
        if (procedureCode == null || procedureCode.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã thủ tục không được để trống");
        }

        AdminProcedure proc = procedureRepository.findByProcedureCode(procedureCode)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy thủ tục với mã: " + procedureCode));

        List<LegalChunk> chunks = chunkRepository.findByProcedureId(proc.getId());

        String process = null;
        if (chunks != null) {
            process = chunks.stream()
                    .filter(c -> "PROCESS_STEP".equalsIgnoreCase(c.getChunkType()))
                    .map(LegalChunk::getContent)
                    .findFirst()
                    .orElse(null);
        }

        List<ProcedureDetailDto.ProcedureChunkDto> chunkDtos = (chunks == null || chunks.isEmpty())
                ? Collections.emptyList()
                : chunks.stream().map(c ->
                ProcedureDetailDto.ProcedureChunkDto.builder()
                        .chunkId(c.getChunkCode())
                        .chunkType(c.getChunkType())
                        .title(c.getTitle())
                        .content(c.getContent())
                        .legalReference(c.getLegalReference())
                        .build()
        ).toList();

        return ProcedureDetailDto.builder()
                .procedureCode(proc.getProcedureCode())
                .officialPortalCode(proc.getPortalCode())
                .procedureName(proc.getProcedureName())
                .category(proc.getCategory())
                .agency(proc.getAgency())
                .processingTime(proc.getProcessingTime())
                .fee(proc.getFee())
                .status(proc.getStatus())
                .chunksCount(chunks != null ? chunks.size() : 0)
                .process(process)
                .sourceUrl(proc.getSourceUrl())
                .chunks(chunkDtos)
                .build();
    }

    /**
     * Safely reindexes administrative procedure legal chunks (Bước 5 Re-indexing).
     * Idempotent: Skips chunks whose contentHash matches the database, saving AI model quota.
     */
    @Transactional
    public Map<String, Object> reindexProcedures(String procedureCode, boolean forceAll) {
        log.info("Admin triggered procedure re-indexing: code='{}', forceAll={}", procedureCode, forceAll);
        List<LegalChunk> targetChunks;
        if (procedureCode != null && !procedureCode.isBlank()) {
            AdminProcedure proc = procedureRepository.findByProcedureCode(procedureCode)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy thủ tục: " + procedureCode));
            targetChunks = chunkRepository.findByProcedureId(proc.getId());
        } else {
            targetChunks = chunkRepository.findAll();
        }

        int reindexed = 0;
        int skipped = 0;
        String activeModelId = (aiModelClient != null && aiModelClient.getEmbeddingModelId() != null)
                ? aiModelClient.getEmbeddingModelId()
                : "bkai_pho_bert_ft_v1";

        for (LegalChunk chunk : targetChunks) {
            String embedText = chunkingService.prepareTextForEmbedding(chunk);
            String currentHash = sha256Hex(chunk.getContent());
            boolean hashChanged = chunk.getContentHash() == null || !chunk.getContentHash().equals(currentHash);
            boolean modelMismatched = !activeModelId.equals(chunk.getEmbeddingModel());
            boolean missingEmbedding = chunk.getEmbedding() == null;

            if (forceAll || hashChanged || modelMismatched || missingEmbedding) {
                if (aiModelClient != null) {
                    try {
                        AiModelClient.EmbeddingResult embResult = aiModelClient.generateEmbeddingResult(embedText);
                        chunk.setEmbedding(aiModelClient.toPgVectorString(embResult.vector()));
                        chunk.setEmbeddingModel(embResult.modelId());
                        chunk.setContentHash(currentHash);
                        chunkRepository.save(chunk);
                        reindexed++;
                    } catch (Exception e) {
                        log.warn("Failed to generate embedding for chunk {}: {}", chunk.getChunkCode(), e.getMessage());
                    }
                } else {
                    chunk.setContentHash(currentHash);
                    chunkRepository.save(chunk);
                    reindexed++;
                }
            } else {
                skipped++;
            }
        }

        log.info("Procedure re-indexing completed: target={}, reindexed={}, skipped={}",
                targetChunks.size(), reindexed, skipped);

        return Map.of(
                "procedureCode", procedureCode != null ? procedureCode : "ALL",
                "totalChunks", targetChunks.size(),
                "reindexed", reindexed,
                "skippedUnchanged", skipped,
                "modelId", activeModelId
        );
    }

    private String sha256Hex(String text) {
        if (text == null) return "";
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
