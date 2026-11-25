package vn.edu.uth.smartward.agent.connector;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;
import vn.edu.uth.smartward.agent.PromptInjectionGuard;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Reference CivicDataConnector reading bundled administrative procedure JSON seed files (TASK-041).
 * Screens all ingested text through PromptInjectionGuard to prevent indirect prompt injection.
 */
@Slf4j
@Component
public class LocalProcedureJsonConnector implements CivicDataConnector {

    private static final String RESOURCE_PATTERN = "classpath:db/seed/procedures/*.json";

    private final ObjectMapper objectMapper;
    private final PromptInjectionGuard injectionGuard;
    private final PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();

    @Autowired
    public LocalProcedureJsonConnector(@Autowired(required = false) ObjectMapper objectMapper,
                                       @Autowired(required = false) PromptInjectionGuard injectionGuard) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.injectionGuard = injectionGuard != null ? injectionGuard : new PromptInjectionGuard();
    }

    @Override
    public String sourceId() {
        return "local-procedure-json";
    }

    @Override
    public String sourceName() {
        return "Kho JSON 40 Thủ tục hành chính cấp xã";
    }

    @Override
    public List<CivicDocumentRecord> fetchDocuments(int limit) {
        int safeLimit = limit > 0 ? Math.min(limit, 100) : 40;
        List<CivicDocumentRecord> records = new ArrayList<>();
        try {
            Resource[] resources = resolver.getResources(RESOURCE_PATTERN);
            for (Resource res : resources) {
                if (records.size() >= safeLimit) break;
                try (InputStream is = res.getInputStream()) {
                    JsonNode root = objectMapper.readTree(is);
                    String code = root.path("procedureCode").asText(res.getFilename());
                    String name = root.path("procedureName").asText(code);
                    String category = root.path("category").asText("GENERAL");
                    String rawContent = extractCombinedText(root);
                    String safeContent = injectionGuard.sanitizeExternalContent(rawContent).sanitizedText();

                    Map<String, String> meta = new LinkedHashMap<>();
                    meta.put("category", category);
                    meta.put("procedureCode", code);

                    records.add(new CivicDocumentRecord(
                            code,
                            name,
                            safeContent,
                            "classpath:db/seed/procedures/" + res.getFilename(),
                            "PUBLIC",
                            null,
                            meta
                    ));
                } catch (Exception itemEx) {
                    log.debug("Skipped unreadable procedure JSON [{}]: {}", res.getFilename(), itemEx.getMessage());
                }
            }
        } catch (Exception ex) {
            log.warn("LocalProcedureJsonConnector failed to scan resources: {}", ex.getMessage());
        }
        return records;
    }

    @Override
    public boolean isHealthy() {
        try {
            Resource[] resources = resolver.getResources(RESOURCE_PATTERN);
            return resources.length > 0;
        } catch (Exception ex) {
            return false;
        }
    }

    private static String extractCombinedText(JsonNode root) {
        StringBuilder sb = new StringBuilder();
        if (root.hasNonNull("procedureName")) {
            sb.append(root.get("procedureName").asText()).append('\n');
        }
        if (root.hasNonNull("legalBasis")) {
            sb.append(root.get("legalBasis").asText()).append('\n');
        }
        JsonNode chunks = root.path("chunks");
        if (chunks.isArray()) {
            for (JsonNode c : chunks) {
                if (c.hasNonNull("title")) sb.append(c.get("title").asText()).append(": ");
                if (c.hasNonNull("content")) sb.append(c.get("content").asText()).append('\n');
            }
        }
        return sb.toString().trim();
    }
}
