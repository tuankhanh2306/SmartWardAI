package vn.edu.uth.smartward.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import vn.edu.uth.smartward.dossier.CitizenDossier;
import vn.edu.uth.smartward.dossier.CitizenDossierRepository;
import vn.edu.uth.smartward.dossier.CitizenDossierService;
import vn.edu.uth.smartward.dossier.dto.DossierSubmissionResponse;
import vn.edu.uth.smartward.dossier.dto.SubmitDossierRequest;
import vn.edu.uth.smartward.rag.HitlGrayZoneItem;
import vn.edu.uth.smartward.rag.HitlGrayZoneRepository;
import vn.edu.uth.smartward.rag.LegalChunk;
import vn.edu.uth.smartward.rag.LegalChunkRepository;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real infrastructure integration smoke test:
 * Boots the FULL Spring Boot context WITHOUT excluding DataSource, JPA, Flyway, or Redis auto-configurations,
 * running Flyway V1..V14 + seed migrations against real PostgreSQL (pgvector:pg16) and Redis (7.2.5-alpine)
 * with Hibernate ddl-auto=validate.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
                "spring.jpa.hibernate.ddl-auto=validate",
                "spring.flyway.enabled=true",
                "spring.flyway.locations=classpath:db/migration,classpath:db/seed",
                "spring.flyway.out-of-order=false",
                "smartward.security.jwt-secret=sw_sec_real_it_8f9b4c2e1a7d6e3f5b0c9a8d7e6f5a4b_2026",
                "smartward.vault.encryption-key=sw_vlt_real_it_3a7e9c1f5b8d2a6e0c4f7b9e1d3a5c7f_2026",
                "smartward.bootstrap.init-admins=false",
                "smartward.ai.sidecar.enabled=false",
                "smartward.ai.gemini.api-key=mock-key-for-local-testing"
        }
)
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@DisplayName("Real Boot Smoke Test: Full @SpringBootTest + Flyway V1..V14 + ddl-auto=validate + Redis AOF/noeviction")
class RealDatabaseAndRedisBootSmokeTest {

    private static final String REDIS_PASS = "smartward_it_redis_secret";

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("pgvector/pgvector:pg16").asCompatibleSubstituteFor("postgres")
    )
            .withDatabaseName("smartward_it_db")
            .withUsername("smartward")
            .withPassword("smartward_it_secret");

    @Container
    static GenericContainer<?> redis = new GenericContainer<>(
            DockerImageName.parse("redis:7.2.5-alpine")
    )
            .withExposedPorts(6379)
            .withCommand(
                    "redis-server",
                    "--requirepass", REDIS_PASS,
                    "--appendonly", "yes",
                    "--maxmemory", "100mb",
                    "--maxmemory-policy", "noeviction"
            );

    @DynamicPropertySource
    static void registerDynamicProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
        registry.add("spring.data.redis.password", () -> REDIS_PASS);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CitizenDossierService dossierService;

    @Autowired
    private CitizenDossierRepository dossierRepository;

    @Autowired
    private HitlGrayZoneRepository hitlRepository;

    @Autowired
    private LegalChunkRepository legalChunkRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Test
    @DisplayName("Full context boots against PostgreSQL + Redis, /api/v1/health returns UP, null SLA & HITL persist")
    void fullContextBootAndCorePersistence() throws Exception {
        // 1. Live /api/v1/health returns HTTP 200 & status UP
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"));

        // 2. Unverified procedure SLA persists as NULL into real PostgreSQL citizen_dossiers
        DossierSubmissionResponse submission = dossierService.submitDossier(SubmitDossierRequest.builder()
                .procedureCode("TTHC-CT-01")
                .wardCode("AG_P_LONGXUYEN")
                .citizenCccd("089095001234")
                .formData(Map.of("fullName", "NGUYEN VAN TEST"))
                .build());
        assertThat(submission.slaDeadline()).isNull();

        CitizenDossier persistedDossier = dossierRepository.findByDossierCodeIgnoreCase(submission.dossierCode())
                .orElseThrow();
        assertThat(persistedDossier.getSlaDeadline()).isNull();

        // 3. HITL queue seeded in V14 exists in PostgreSQL and supports persistence across restarts
        assertThat(hitlRepository.findById("HITL-AG-001")).isPresent();
        HitlGrayZoneItem createdHitl = hitlRepository.saveAndFlush(HitlGrayZoneItem.builder()
                .id("HITL-IT-001")
                .query("Câu hỏi kiểm thử tồn tại sau restart?")
                .wardName("Phường Long Xuyên")
                .similarityScore(0.55)
                .candidateChunkCode("TTHC-CT-01")
                .candidateProcedureName("Chứng thực")
                .legalReference("Nghị định thử nghiệm")
                .suggestedAnswer("Đang chờ cán bộ duyệt")
                .status("PENDING")
                .createdAt("2026-11-20 09:00")
                .build());
        assertThat(hitlRepository.findById(createdHitl.getId())).isPresent();

        // 4. Real Redis with --appendonly yes and --maxmemory-policy noeviction accepts and deletes keys
        stringRedisTemplate.opsForValue().set("smartward:it:ott", "DOC_IT_01", Duration.ofMinutes(5));
        assertThat(stringRedisTemplate.opsForValue().get("smartward:it:ott")).isEqualTo("DOC_IT_01");
        stringRedisTemplate.delete("smartward:it:ott");
        assertThat(stringRedisTemplate.opsForValue().get("smartward:it:ott")).isNull();

        // 5. Real PostgreSQL pgvector insert + merge update + Idempotency-Key on /api/v1/issues/report
        String issueBody = objectMapper.writeValueAsString(Map.of(
                "category", "LIGHTING",
                "description", "Đèn đường Nguyễn Huệ bị tắt gây mất an toàn giao thông ban đêm",
                "latitude", 10.3839654,
                "longitude", 105.4267168,
                "wardCode", "AG_P_LONGXUYEN",
                "locationSource", "GPS"
        ));
        MvcResult rpt1 = mockMvc.perform(post("/api/v1/issues/report")
                        .header("Idempotency-Key", "IT-PGVEC-01")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(issueBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.newCluster").value(true))
                .andReturn();
        JsonNode rpt1Data = objectMapper.readTree(rpt1.getResponse().getContentAsString()).path("data");
        String firstReportCode = rpt1Data.path("reportCode").asText();
        String clusterCode = rpt1Data.path("clusterCode").asText();
        assertThat(firstReportCode).isNotBlank();
        assertThat(clusterCode).isNotBlank();

        // Replay with same Idempotency-Key returns exact same reportCode
        mockMvc.perform(post("/api/v1/issues/report")
                        .header("Idempotency-Key", "IT-PGVEC-01")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(issueBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reportCode").value(firstReportCode));

        // Second distinct report merges into the cluster and executes UPDATE issue_clusters SET center_embedding = CAST(? AS vector)
        mockMvc.perform(post("/api/v1/issues/report")
                        .header("Idempotency-Key", "IT-PGVEC-02")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(issueBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.newCluster").value(false))
                .andExpect(jsonPath("$.data.clusterCode").value(clusterCode))
                .andExpect(jsonPath("$.data.clusterReportCount").value(2));

        // 6. Real PostgreSQL pgvector update on legal_chunks.embedding succeeds without PSQLException
        List<LegalChunk> chunks = legalChunkRepository.findAll();
        assertThat(chunks).isNotEmpty();
        LegalChunk targetChunk = chunks.get(0);
        String vec768 = "[" + String.join(",", Collections.nCopies(768, "0.01")) + "]";
        targetChunk.setEmbedding(vec768);
        legalChunkRepository.saveAndFlush(targetChunk);
    }
}
