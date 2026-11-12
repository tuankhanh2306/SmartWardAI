package vn.edu.uth.smartward.rag;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.ArrayList;
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

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Starting synchronization and seeding of verified administrative procedures...");

        // 1. Remove deprecated duplicate records if present in database
        List<String> deprecatedCodes = List.of("TTHC-BT-06", "TTHC-CR-05", "TTHC-CT-03");
        for (String deprecatedCode : deprecatedCodes) {
            procedureRepository.findByProcedureCode(deprecatedCode).ifPresent(proc -> {
                log.info("Removing deprecated duplicate procedure from database: {}", deprecatedCode);
                procedureRepository.delete(proc);
            });
        }

        // 2. Load and upsert all standard seed procedures from classpath
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();

        try {
            Resource[] resources = resolver.getResources("classpath:db/seed/procedures/*.json");
            log.info("Found {} procedure seed files to synchronize.", resources.length);

            int seededCount = 0;
            for (Resource res : resources) {
                try (InputStream is = res.getInputStream()) {
                    JsonNode root = objectMapper.readTree(is);

                    String procCode = root.path("procedureCode").asText();
                    if (procCode == null || procCode.isBlank()) {
                        continue;
                    }

                    Optional<AdminProcedure> existingOpt = procedureRepository.findByProcedureCode(procCode);
                    AdminProcedure proc;
                    boolean isNew = existingOpt.isEmpty();
                    if (isNew) {
                        proc = AdminProcedure.builder()
                                .procedureCode(procCode)
                                .build();
                    } else {
                        proc = existingOpt.get();
                    }

                    proc.setPortalCode(root.path("officialPortalCode").asText(proc.getPortalCode()));
                    proc.setProcedureName(root.path("procedureName").asText(proc.getProcedureName()));
                    proc.setCategory(root.path("category").asText(proc.getCategory() != null ? proc.getCategory() : "Hành chính công"));
                    proc.setAgency(root.path("agency").asText(proc.getAgency() != null ? proc.getAgency() : "Ủy ban nhân dân cấp xã / phường"));
                    proc.setProcessingTime(root.path("processingTime").asText(proc.getProcessingTime() != null ? proc.getProcessingTime() : "Theo quy định"));
                    proc.setFee(root.path("fee").asText(proc.getFee() != null ? proc.getFee() : "Theo quy định"));
                    proc.setSourceUrl(root.path("sourceUrl").asText(proc.getSourceUrl()));
                    proc.setStatus("ACTIVE");

                    AdminProcedure savedProc = procedureRepository.save(proc);

                    // Import predefined chunks if newly inserted or if no chunks exist for this procedure
                    List<LegalChunk> existingChunks = chunkRepository.findByProcedureId(savedProc.getId());
                    if (existingChunks.isEmpty()) {
                        JsonNode chunksNode = root.path("chunks");
                        List<LegalChunk> chunkList = new ArrayList<>();

                        if (chunksNode.isArray()) {
                            for (JsonNode cNode : chunksNode) {
                                String chunkCode = cNode.path("chunkId").asText();
                                String chunkType = cNode.path("chunkType").asText("OVERVIEW");
                                String title = cNode.path("title").asText();
                                String content = cNode.path("content").asText();
                                String legalRef = cNode.path("legalReference").asText();

                                String activeModelId = aiModelClient.getEmbeddingModelId() != null
                                        ? aiModelClient.getEmbeddingModelId()
                                        : "bkai_pho_bert_ft_v1";
                                String embeddingStr;
                                String chunkModelId;
                                if ("bkai_pho_bert_ft_v1".equalsIgnoreCase(activeModelId)
                                        && cNode.has("embedding")
                                        && !cNode.path("embedding").asText().isBlank()) {
                                    embeddingStr = cNode.path("embedding").asText();
                                    chunkModelId = "bkai_pho_bert_ft_v1";
                                } else {
                                    embeddingStr = aiModelClient.toPgVectorString(aiModelClient.generateEmbedding(title + " " + content));
                                    chunkModelId = activeModelId;
                                }

                                chunkList.add(LegalChunk.builder()
                                        .procedure(savedProc)
                                        .chunkCode(chunkCode)
                                        .chunkType(chunkType)
                                        .title(title)
                                        .content(content)
                                        .legalReference(legalRef)
                                        .embedding(embeddingStr)
                                        .embeddingModel(chunkModelId)
                                        .status("ACTIVE")
                                        .effectiveDate(LocalDate.now())
                                        .build());
                            }
                        }

                        if (!chunkList.isEmpty()) {
                            chunkRepository.saveAll(chunkList);
                        }
                    }

                    seededCount++;
                } catch (Exception e) {
                    log.error("Failed to seed procedure from {}: {}", res.getFilename(), e.getMessage());
                }
            }

            log.info("Successfully synchronized {} administrative procedures into database.", seededCount);
            backfillMissingEmbeddings();

        } catch (Exception e) {
            log.warn("Could not load seed resources (normal during offline test environments): {}", e.getMessage());
        }
    }

    private void backfillMissingEmbeddings() {
        try {
            String activeModelId = aiModelClient.getEmbeddingModelId() != null
                    ? aiModelClient.getEmbeddingModelId()
                    : "bkai_pho_bert_ft_v1";
            List<LegalChunk> mismatchedOrMissing = chunkRepository.findByEmbeddingIsNullOrEmbeddingModelNot(activeModelId);
            if (!mismatchedOrMissing.isEmpty()) {
                log.info("Synchronizing vector embeddings for {} chunks to active model '{}'...",
                        mismatchedOrMissing.size(), activeModelId);
                for (LegalChunk c : mismatchedOrMissing) {
                    float[] emb = aiModelClient.generateEmbedding(c.getTitle() + " " + c.getContent());
                    c.setEmbedding(aiModelClient.toPgVectorString(emb));
                    c.setEmbeddingModel(activeModelId);
                }
                chunkRepository.saveAll(mismatchedOrMissing);
                log.info("Successfully synchronized embeddings for {} chunks under model '{}'.",
                        mismatchedOrMissing.size(), activeModelId);
            }
        } catch (Exception e) {
            log.warn("Could not synchronize embeddings: {}", e.getMessage());
        }
    }
}
