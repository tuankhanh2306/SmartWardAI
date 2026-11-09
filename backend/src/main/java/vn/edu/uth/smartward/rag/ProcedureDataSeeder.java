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
        long currentCount = procedureRepository.count();
        if (currentCount >= 40) {
            log.info("Database already contains {} procedures. Checking unvectorized chunks...", currentCount);
            backfillMissingEmbeddings();
            return;
        }

        log.info("Seeding verified administrative procedures from classpath:db/seed/procedures/*.json...");
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();

        try {
            Resource[] resources = resolver.getResources("classpath:db/seed/procedures/*.json");
            log.info("Found {} procedure seed files to import.", resources.length);

            int seededCount = 0;
            for (Resource res : resources) {
                try (InputStream is = res.getInputStream()) {
                    JsonNode root = objectMapper.readTree(is);

                    String procCode = root.path("procedureCode").asText();
                    if (procedureRepository.findByProcedureCode(procCode).isPresent()) {
                        continue;
                    }

                    AdminProcedure proc = AdminProcedure.builder()
                            .procedureCode(procCode)
                            .portalCode(root.path("officialPortalCode").asText(null))
                            .procedureName(root.path("procedureName").asText())
                            .category(root.path("category").asText("Hành chính công"))
                            .agency(root.path("agency").asText("Ủy ban nhân dân cấp xã / phường"))
                            .processingTime(root.path("processingTime").asText("Theo quy định"))
                            .fee(root.path("fee").asText("Theo quy định"))
                            .sourceUrl(root.path("sourceUrl").asText())
                            .status("ACTIVE")
                            .build();

                    AdminProcedure savedProc = procedureRepository.save(proc);

                    // Import predefined chunks
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

                    seededCount++;
                } catch (Exception e) {
                    log.error("Failed to seed procedure from {}: {}", res.getFilename(), e.getMessage());
                }
            }

            log.info("Successfully seeded {} administrative procedures into database.", seededCount);

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
