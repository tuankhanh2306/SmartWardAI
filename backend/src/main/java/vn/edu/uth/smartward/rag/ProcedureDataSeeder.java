package vn.edu.uth.smartward.rag;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProcedureDataSeeder implements CommandLineRunner {

    private final AdminProcedureRepository procedureRepository;
    private final LegalChunkRepository chunkRepository;
    private final ObjectMapper objectMapper;
    private final vn.edu.uth.smartward.ai.AiModelClient aiModelClient;

    public static final List<String> SKIPPED_DEPRECATED_CODES = List.of("TTHC-BT-06", "TTHC-CR-05", "TTHC-CT-03");

    @Override
    public void run(String... args) {
        log.info("Starting non-destructive initial seeding check for administrative procedures...");

        // Clean up any deprecated procedures previously seeded in database so catalog strictly has 40 TTHC
        for (String deprecatedCode : SKIPPED_DEPRECATED_CODES) {
            try {
                procedureRepository.findByProcedureCode(deprecatedCode).ifPresent(proc -> {
                    chunkRepository.deleteAll(chunkRepository.findByProcedureId(proc.getId()));
                    procedureRepository.delete(proc);
                    log.info("Removed deprecated procedure {} from database.", deprecatedCode);
                });
            } catch (Exception ex) {
                log.warn("Could not delete deprecated procedure {}, marking INACTIVE: {}", deprecatedCode, ex.getMessage());
                procedureRepository.findByProcedureCode(deprecatedCode).ifPresent(proc -> {
                    proc.setStatus("INACTIVE");
                    procedureRepository.save(proc);
                });
            }
        }

        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();

        try {
            Resource[] resources = resolver.getResources("classpath:db/seed/procedures/*.json");
            log.info("Found {} procedure seed files to check (insert-only, never overwrite DB).", resources.length);

            int seededCount = 0;
            for (Resource res : resources) {
                try (InputStream is = res.getInputStream()) {
                    JsonNode root = objectMapper.readTree(is);

                    String procCode = root.path("procedureCode").asText();
                    if (procCode == null || procCode.isBlank()) {
                        continue;
                    }
                    if (SKIPPED_DEPRECATED_CODES.contains(procCode.trim().toUpperCase())) {
                        log.debug("Skipping deprecated seed file for procedureCode={}", procCode);
                        continue;
                    }

                    if (procedureRepository.existsByProcedureCode(procCode)
                            || procedureRepository.findByProcedureCode(procCode).isPresent()) {
                        log.debug("Procedure {} already exists in database; preserving governance state and chunks.", procCode);
                        continue;
                    }

                    AdminProcedure proc = AdminProcedure.builder()
                            .procedureCode(procCode)
                            .portalCode(root.path("officialPortalCode").asText(null))
                            .procedureName(root.path("procedureName").asText(procCode))
                            .category(root.path("category").asText("Hành chính công"))
                            .agency(root.path("agency").asText("Ủy ban nhân dân cấp xã / phường"))
                            .processingTime(root.path("processingTime").asText("Theo quy định"))
                            .fee(root.path("fee").asText("Theo quy định"))
                            .sourceUrl(root.path("sourceUrl").asText(null))
                            .status("ACTIVE")
                            .build();

                    AdminProcedure savedProc = procedureRepository.save(proc);

                    JsonNode chunksNode = root.path("chunks");
                    if (chunksNode.isArray()) {
                        for (JsonNode cNode : chunksNode) {
                            String chunkCode = cNode.path("chunkId").asText();
                            if (chunkCode == null || chunkCode.isBlank()) {
                                continue;
                            }

                            try {
                                if (chunkRepository.findByChunkCode(chunkCode).isPresent()) {
                                    continue;
                                }

                                String chunkType = cNode.path("chunkType").asText("OVERVIEW");
                                String title = cNode.path("title").asText();
                                String content = cNode.path("content").asText();
                                String legalRef = cNode.path("legalReference").asText();

                                LegalChunk chunk = LegalChunk.builder()
                                        .procedure(savedProc)
                                        .chunkCode(chunkCode)
                                        .chunkType(chunkType)
                                        .title(title)
                                        .content(content)
                                        .legalReference(legalRef)
                                        .status("ACTIVE")
                                        .effectiveDate(LocalDate.now())
                                        .build();

                                if (cNode.has("headerPath")) {
                                    chunk.setHeaderPath(cNode.path("headerPath").asText());
                                }
                                if (cNode.has("contentHash")) {
                                    chunk.setContentHash(cNode.path("contentHash").asText());
                                }
                                if (cNode.has("sourceUrl")) {
                                    chunk.setSourceUrl(cNode.path("sourceUrl").asText());
                                }
                                if (cNode.has("pipelineVersion")) {
                                    chunk.setPipelineVersion(cNode.path("pipelineVersion").asText());
                                }

                                String activeModelId = aiModelClient.getEmbeddingModelId() != null
                                        ? aiModelClient.getEmbeddingModelId()
                                        : "bkai_pho_bert_ft_v1";

                                if (cNode.has("embedding") && !cNode.path("embedding").asText().isBlank()) {
                                    chunk.setEmbedding(cNode.path("embedding").asText());
                                    chunk.setEmbeddingModel("bkai_pho_bert_ft_v1");
                                } else {
                                    try {
                                        chunk.setEmbedding(aiModelClient.toPgVectorString(aiModelClient.generateEmbedding(title + " " + content)));
                                        chunk.setEmbeddingModel(activeModelId);
                                    } catch (Exception embedEx) {
                                        log.warn("Embedding generation skipped for chunk {}: {}. Using fallback zero vector.", chunkCode, embedEx.getMessage());
                                        chunk.setEmbedding("[" + String.join(",", Collections.nCopies(768, "0.0")) + "]");
                                        chunk.setEmbeddingModel("fallback_zero_v1");
                                    }
                                }

                                chunkRepository.save(chunk);
                            } catch (Exception chunkEx) {
                                log.warn("Failed to insert chunk {} for procedure {}: {}", chunkCode, procCode, chunkEx.getMessage());
                            }
                        }
                    }

                    seededCount++;
                } catch (Exception e) {
                    log.error("Failed to seed procedure from {}: {}", res.getFilename(), e.getMessage());
                }
            }

            log.info("Non-destructive procedure seeding completed: {} new procedures inserted.", seededCount);
            backfillMissingEmbeddings();

        } catch (Exception e) {
            log.warn("Could not load seed resources (normal during offline test environments): {}", e.getMessage());
        }
    }

    /**
     * TASK-034: Detects legal chunks missing vectors or embedded under a different embedding_model_id
     * and synchronizes them safely per chunk so a new deployment never returns empty RAG results.
     */
    public int synchronizeEmbeddingModelOnStartup() {
        try {
            String activeModelId = (aiModelClient != null && aiModelClient.getEmbeddingModelId() != null && !aiModelClient.getEmbeddingModelId().isBlank())
                    ? aiModelClient.getEmbeddingModelId()
                    : "bkai_pho_bert_ft_v1";
            List<LegalChunk> mismatchedOrMissing = chunkRepository.findByEmbeddingIsNullOrEmbeddingModelNot(activeModelId);
            if (mismatchedOrMissing == null || mismatchedOrMissing.isEmpty()) {
                return 0;
            }
            log.info("TASK-034: Synchronizing vector embeddings for {} chunks to active model '{}'...",
                    mismatchedOrMissing.size(), activeModelId);
            int synced = 0;
            for (LegalChunk c : mismatchedOrMissing) {
                try {
                    float[] emb = aiModelClient.generateEmbedding(c.getTitle() + " " + c.getContent());
                    if (emb == null || emb.length == 0) continue;
                    c.setEmbedding(aiModelClient.toPgVectorString(emb));
                    c.setEmbeddingModel(activeModelId);
                    chunkRepository.save(c);
                    synced++;
                } catch (Exception perChunkEx) {
                    log.warn("Embedding sync failed for chunk {}: {} (continuing remaining chunks)",
                            c.getChunkCode(), perChunkEx.getMessage());
                }
            }
            log.info("TASK-034: Synchronized {}/{} chunk embeddings under active model '{}'.",
                    synced, mismatchedOrMissing.size(), activeModelId);
            return synced;
        } catch (Exception e) {
            log.warn("Could not synchronize embeddings on startup: {}", e.getMessage());
            return 0;
        }
    }

    private void backfillMissingEmbeddings() {
        synchronizeEmbeddingModelOnStartup();
    }
}
