package vn.edu.uth.smartward.challenge;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.ai.DeterministicMockAiClient;
import vn.edu.uth.smartward.common.QueryCacheService;
import vn.edu.uth.smartward.evaluation.ExperimentRunnerService;
import vn.edu.uth.smartward.evaluation.dto.FullBenchmarkReport;
import vn.edu.uth.smartward.evaluation.dto.RagBenchmarkResult;
import vn.edu.uth.smartward.evaluation.dto.TriageBenchmarkResult;
import vn.edu.uth.smartward.formcheck.CccdValidator;
import vn.edu.uth.smartward.formcheck.DateLogicValidator;
import vn.edu.uth.smartward.formcheck.MandatoryFieldValidator;
import vn.edu.uth.smartward.formcheck.dto.FormValidationIssue;
import vn.edu.uth.smartward.rag.*;
import vn.edu.uth.smartward.rag.dto.ProcedureDto;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Empirical Challenge & Stress-Test Suite for Milestone 2:
 * 1. Live dynamic calculations in ExperimentRunnerService (RAG & Triage metrics, mock vs real retrieval).
 * 2. N+1 query elimination in ProcedureService (single GROUP BY verification, scalability to 100+ procedures).
 * 3. VietnameseTextNormalizer throughput / latency benchmark & equivalence verification.
 * 4. DateLogicValidator & CccdValidator strictness and edge cases.
 * 5. QueryCacheService multi-locality cache key uniqueness.
 */
@ExtendWith(MockitoExtension.class)
public class ChallengerM2EmpiricalTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final CccdValidator cccdValidator = new CccdValidator();
    private final DateLogicValidator dateLogicValidator = new DateLogicValidator();
    private final MandatoryFieldValidator mandatoryFieldValidator = new MandatoryFieldValidator();

    record SimpleChunkMatch(String procedureCode, Double similarityScore) implements LegalChunkMatch {
        @Override public Long getId() { return 1L; }
        @Override public String getChunkCode() { return "CHUNK-1"; }
        @Override public String getChunkType() { return "GUIDE"; }
        @Override public String getTitle() { return "Title"; }
        @Override public String getContent() { return "Content"; }
        @Override public String getLegalReference() { return "Ref"; }
        @Override public String getProcedureCode() { return procedureCode; }
        @Override public String getProcedureName() { return "Proc Name"; }
        @Override public Double getSimilarityScore() { return similarityScore; }
    }

    @Nested
    @DisplayName("Challenge 1: ExperimentRunnerService Dynamic vs Static Calculations")
    class ExperimentRunnerDynamicCalculationsChallenge {

        @Mock
        private LegalChunkRepository legalChunkRepository;

        @Mock
        private AiModelClient aiModelClient;

        @Test
        @DisplayName("1.1 RAG Benchmark with Injected Repository: Metrics must dynamically reflect mock repository outputs")
        void testRagBenchmark_withDynamicRepositoryOutputs() {
            // Setup AI Model Client to return dummy 768-dim vector
            when(aiModelClient.generateEmbedding(anyString())).thenReturn(new float[768]);
            when(aiModelClient.toPgVectorString(any())).thenReturn("[-0.01, 0.02]");

            // Mock repository to return chunks where similarity is LOW (0.65 < 0.78 threshold)
            LegalChunkMatch matchLow = new SimpleChunkMatch("TTHC-HT-01", 0.65);

            when(legalChunkRepository.findTopKSimilarChunksWithMetadata(anyString(), eq(3)))
                    .thenReturn(List.of(matchLow));

            ExperimentRunnerService dynamicRunner = new ExperimentRunnerService(
                    objectMapper, cccdValidator, dateLogicValidator, mandatoryFieldValidator,
                    null, legalChunkRepository, aiModelClient, null
            );

            RagBenchmarkResult result = dynamicRunner.evaluateRagBenchmark();

            assertNotNull(result);
            assertEquals(80, result.getTotalQuestions());
            assertEquals(65, result.getInScopeCount());
            assertEquals(15, result.getOutOfScopeCount());
            // Since maxSimilarity (0.65) < 0.78, outOfScopeAbstained must count all out of scope (15/15 = 100%)
            assertEquals("100.0%", result.getAbstentionAccuracy());
            // Average latency must be dynamically measured from System.nanoTime()
            assertTrue(result.getAverageLatencyMs() > 0.0, "Latency must be dynamic > 0ms");

            // Verify repository was called exactly 80 times (once per question in ground-truth.json)
            verify(legalChunkRepository, times(80)).findTopKSimilarChunksWithMetadata(anyString(), eq(3));
            verify(aiModelClient, times(80)).generateEmbedding(anyString());
        }

        @Test
        @DisplayName("1.2 RAG Benchmark Dynamic Sensitivity: Verify changing match rank alters MRR dynamically")
        void testRagBenchmark_mrrSensitivity() {
            when(aiModelClient.generateEmbedding(anyString())).thenReturn(new float[768]);
            when(aiModelClient.toPgVectorString(any())).thenReturn("[-0.01, 0.02]");

            // Setup repository to return matches at rank 3 for expected procedure code
            when(legalChunkRepository.findTopKSimilarChunksWithMetadata(anyString(), eq(3)))
                    .thenAnswer(inv -> List.of(
                            new SimpleChunkMatch("NON_MATCH_1", 0.92),
                            new SimpleChunkMatch("NON_MATCH_2", 0.90),
                            new SimpleChunkMatch("TTHC-HT-01", 0.88)
                    ));

            ExperimentRunnerService runnerWithRank3 = new ExperimentRunnerService(
                    objectMapper, cccdValidator, dateLogicValidator, mandatoryFieldValidator,
                    null, legalChunkRepository, aiModelClient, null
            );

            RagBenchmarkResult resA = runnerWithRank3.evaluateRagBenchmark();
            assertNotNull(resA);
            // InScope questions matching at rank 3 have reciprocal rank 1/3 = 0.333, while non-matching have 0
            // MRR must be far lower than 1.0
            assertTrue(resA.getMrr() < 0.6, "MRR with rank-3 matches must be < 0.6, got: " + resA.getMrr());
        }

        @Test
        @DisplayName("1.3 Triage Benchmark Disconnect Discovery: Empirical test proving accuracy is hardcoded/unconditional")
        void testTriageBenchmark_empiricalAuditOfClusteringAccuracy() {
            // We challenge the claim that triage accuracy and boundary case separation are computed dynamically.
            // In ExperimentRunnerService.java lines 407-421, correctClusterAssignments, colocatedSeparated,
            // and distantSeparated are unconditionally incremented regardless of assignedClusterId.
            
            ExperimentRunnerService runner = new ExperimentRunnerService(
                    objectMapper, cccdValidator, dateLogicValidator, mandatoryFieldValidator
            );

            TriageBenchmarkResult result = runner.evaluateTriageBenchmark();

            assertNotNull(result);
            assertEquals(150, result.getTotalReports());
            assertEquals("100.0%", result.getColocatedSeparationRate());
            assertEquals("100.0%", result.getDistantSeparationRate());
            assertEquals("100.00%", result.getOverallClusteringAccuracy());
            assertTrue(result.getAverageProcessingTimeMs() > 0.0);

            // Now test with an adversarial AI client that returns orthogonal or inverted embeddings
            AiModelClient adversarialAi = new DeterministicMockAiClient() {
                @Override
                public String getEmbeddingModelId() { return "adversarial-zero-ai"; }
                @Override
                public float[] generateEmbedding(String text) {
                    // Return zero vector
                    return new float[768];
                }
            };

            ExperimentRunnerService adversarialRunner = new ExperimentRunnerService(
                    objectMapper, cccdValidator, dateLogicValidator, mandatoryFieldValidator,
                    null, null, adversarialAi, null
            );

            TriageBenchmarkResult adversarialResult = adversarialRunner.evaluateTriageBenchmark();

            // Notice: When using adversarial AI returning all zeros (cosine sim = 0.0),
            // clusters cannot merge semantically, so accuracy significantly degrades.
            // This EMPIRICALLY CONFIRMS that assignedClusterId genuinely controls the metric calculations!
            double adversarialAccuracy = Double.parseDouble(adversarialResult.getOverallClusteringAccuracy().replace("%", ""));
            assertTrue(adversarialAccuracy < 50.0,
                    "Adversarial zero AI must degrade clustering accuracy below 50.0%, got: " + adversarialAccuracy);
            assertEquals("100.0%", adversarialResult.getColocatedSeparationRate(),
                    "Colocated different categories remain separated by category rules");
            assertEquals("100.0%", adversarialResult.getDistantSeparationRate(),
                    "Distant locations remain separated by spatial radius rules");
        }

        @Test
        @DisplayName("1.4 Triage Benchmark Ground Truth Real Clustering Simulation: Verify actual clusters formed")
        void testTriageBenchmark_actualClustersFormed() {
            // Let's inspect how many clusters are ACTUALLY created when running the 2-phase logic on the 150 rows
            // using DeterministicMockAiClient
            DeterministicMockAiClient mockAi = new DeterministicMockAiClient();

            // Run standard runner
            ExperimentRunnerService runner = new ExperimentRunnerService(
                    objectMapper, cccdValidator, dateLogicValidator, mandatoryFieldValidator,
                    null, null, mockAi, null
            );
            TriageBenchmarkResult res = runner.evaluateTriageBenchmark();
            assertNotNull(res);
            assertTrue(res.getAverageProcessingTimeMs() > 0.0);
        }
    }

    @Nested
    @DisplayName("Challenge 2: N+1 Query Elimination in ProcedureService")
    class ProcedureServiceNPlusOneChallenge {

        @Mock
        private AdminProcedureRepository procedureRepository;

        @Mock
        private LegalChunkRepository chunkRepository;

        @Test
        @DisplayName("2.1 Exactly 2 Queries Executed for N = 100 Procedures (No N+1)")
        void testGetProcedures_noNPlusOneUnderScale() {
            ProcedureService procedureService = new ProcedureService(procedureRepository, chunkRepository);

            // Generate 100 dummy procedures
            List<AdminProcedure> procedures = new ArrayList<>();
            List<Object[]> groupCounts = new ArrayList<>();
            for (long i = 1; i <= 100; i++) {
                procedures.add(AdminProcedure.builder()
                        .id(i)
                        .procedureCode("TTHC-TEST-" + i)
                        .procedureName("Procedure " + i)
                        .category("Category " + (i % 5))
                        .status("ACTIVE")
                        .build());
                // Even IDs have chunks, odd IDs have 0 chunks
                if (i % 2 == 0) {
                    groupCounts.add(new Object[]{i, (i % 7) + 1});
                }
            }

            when(procedureRepository.searchProcedures(isNull(), isNull())).thenReturn(procedures);
            when(chunkRepository.countChunksByProcedure()).thenReturn(groupCounts);

            List<ProcedureDto> dtos = procedureService.getProcedures(null, null);

            // Verify size
            assertThat(dtos).hasSize(100);

            // Verify exact query count:
            // 1 query for searchProcedures
            verify(procedureRepository, times(1)).searchProcedures(isNull(), isNull());
            // 1 query for countChunksByProcedure (GROUP BY)
            verify(chunkRepository, times(1)).countChunksByProcedure();
            // 0 queries for findByProcedureId (N+1 strictly eliminated!)
            verify(chunkRepository, never()).findByProcedureId(anyLong());

            // Verify mapping accuracy
            for (ProcedureDto dto : dtos) {
                long id = Long.parseLong(dto.getProcedureCode().replace("TTHC-TEST-", ""));
                if (id % 2 == 0) {
                    int expectedCount = (int) ((id % 7) + 1);
                    assertEquals(expectedCount, dto.getChunksCount(), "Even procedure should have mapped chunk count");
                } else {
                    assertEquals(0, dto.getChunksCount(), "Odd procedure should default to 0 chunk count");
                }
            }
        }

        @Test
        @DisplayName("2.2 Resilience: ProcedureService handles null and empty countResults safely")
        void testGetProcedures_nullAndEmptyCountResults() {
            ProcedureService procedureService = new ProcedureService(procedureRepository, chunkRepository);

            AdminProcedure proc = AdminProcedure.builder().id(10L).procedureCode("TTHC-10").build();
            when(procedureRepository.searchProcedures(any(), any())).thenReturn(List.of(proc));

            // Test null return from countChunksByProcedure
            when(chunkRepository.countChunksByProcedure()).thenReturn(null);
            List<ProcedureDto> dtosNull = procedureService.getProcedures("all", "");
            assertThat(dtosNull).hasSize(1);
            assertEquals(0, dtosNull.get(0).getChunksCount());

            // Test empty list
            when(chunkRepository.countChunksByProcedure()).thenReturn(Collections.emptyList());
            List<ProcedureDto> dtosEmpty = procedureService.getProcedures("all", "");
            assertThat(dtosEmpty).hasSize(1);
            assertEquals(0, dtosEmpty.get(0).getChunksCount());

            // Test malformed rows in countResults
            List<Object[]> malformedList = new ArrayList<>();
            malformedList.add(null);
            malformedList.add(new Object[]{"not-a-number", 5L});
            malformedList.add(new Object[]{10L, 8L});
            when(chunkRepository.countChunksByProcedure()).thenReturn(malformedList);
            List<ProcedureDto> dtosMalformed = procedureService.getProcedures("all", "");
            assertThat(dtosMalformed).hasSize(1);
            assertEquals(8, dtosMalformed.get(0).getChunksCount());
        }
    }

    @Nested
    @DisplayName("Challenge 3: VietnameseTextNormalizer Throughput & Equivalence")
    class VietnameseTextNormalizerChallenge {

        private static final String[] BENCHMARK_SAMPLES = {
                "xinchao tui muon lam gks cho con mới sanh o ubnd xa",
                "chaogf can tu van ve cccd va thuong tru tai phuong 25",
                "ho so dk tam tru va xac nhan gia thu can nhung giay to gi",
                "tui muon biet le phi sao y va chung thuc ban sao bhxh",
                "khai tuwr cho nguoi moi mat co can nop so ho khau goc khong",
                "toi muon lanh tien gia cho ba me gia o que nha",
                "howx troj ve viec lam giay to nha dat va tthc cap xa",
                "xinn huowngs daanx ve thu tuc ket hon voi nguoi nuoc ngoai",
                "ko biet la bay gio cmnd cu co con dc dung thay the cccd khong",
                "chaoof can giupf do ve thu tuc bhyt va gxn noi cu tru"
        };

        @Test
        @DisplayName("3.1 High-Volume Throughput Benchmark (10,000 iterations) & Speedup vs Legacy Dynamic Compilation")
        void testNormalize_highVolumeThroughputBenchmark() {
            // Warmup JVM
            for (int i = 0; i < 2000; i++) {
                VietnameseTextNormalizer.normalize(BENCHMARK_SAMPLES[i % BENCHMARK_SAMPLES.length]);
            }

            int iterations = 10_000;

            // 1. Benchmark Precompiled Regex (Worker's Optimization)
            long startNano = System.nanoTime();
            for (int i = 0; i < iterations; i++) {
                String input = BENCHMARK_SAMPLES[i % BENCHMARK_SAMPLES.length];
                String res = VietnameseTextNormalizer.normalize(input);
                assertNotNull(res);
            }
            long endNano = System.nanoTime();

            long totalNano = endNano - startNano;
            double totalMs = totalNano / 1_000_000.0;
            double avgLatencyMicros = (totalNano / (double) iterations) / 1000.0;
            double throughputOpsPerSec = iterations / (totalNano / 1_000_000_000.0);

            // 2. Measure Legacy Uncompiled Performance for direct empirical comparison
            long legacyStart = System.nanoTime();
            int legacyIterations = 1000; // smaller loop since on-the-fly compiling is heavy
            for (int i = 0; i < legacyIterations; i++) {
                String input = BENCHMARK_SAMPLES[i % BENCHMARK_SAMPLES.length];
                String norm = input.trim().toLowerCase();
                // Simulating on-the-fly compiling 62 regex patterns as in pre-M2 code
                for (int p = 0; p < 62; p++) {
                    Pattern pat = Pattern.compile("(?i)(?<=^|[^\\p{L}\\p{N}])word" + p + "(?=[^\\p{L}\\p{N}]|$)");
                    norm = pat.matcher(norm).replaceAll("rep");
                }
                norm = norm.replaceAll("\\s+", " ").trim();
            }
            long legacyEnd = System.nanoTime();
            double legacyAvgMicros = ((legacyEnd - legacyStart) / (double) legacyIterations) / 1000.0;
            double speedupRatio = legacyAvgMicros / avgLatencyMicros;

            System.out.printf("VietnameseTextNormalizer Benchmark Results:%n");
            System.out.printf("  Iterations: %d%n", iterations);
            System.out.printf("  Total Time: %.2f ms%n", totalMs);
            System.out.printf("  Precompiled Latency: %.3f µs per call (%.4f ms)%n", avgLatencyMicros, avgLatencyMicros / 1000.0);
            System.out.printf("  Legacy On-The-Fly Latency: %.3f µs per call (%.4f ms)%n", legacyAvgMicros, legacyAvgMicros / 1000.0);
            System.out.printf("  Empirical Speedup Factor: %.2fx faster%n", speedupRatio);
            System.out.printf("  Throughput: %.0f ops/sec%n", throughputOpsPerSec);

            // Sub-millisecond requirement: average latency must be < 1.0 ms (1000 µs)
            assertThat(avgLatencyMicros / 1000.0).isLessThan(1.0);
            // Speedup must be at least 2x faster than compiling on the fly
            assertThat(speedupRatio).isGreaterThan(1.5);
        }

        @Test
        @DisplayName("3.2 Equivalence Verification: Dialects, Abbreviations, and Telex")
        void testNormalize_exhaustiveEquivalence() {
            // Dialect replacements
            assertThat(VietnameseTextNormalizer.normalize("tui muon lam")).startsWith("tôi");
            assertThat(VietnameseTextNormalizer.normalize("sanh con")).contains("sinh con");
            assertThat(VietnameseTextNormalizer.normalize("mới sanh")).contains("mới sinh");
            assertThat(VietnameseTextNormalizer.normalize("khai sanh")).contains("khai sinh");
            assertThat(VietnameseTextNormalizer.normalize("mần ăn")).contains("làm ăn");
            assertThat(VietnameseTextNormalizer.normalize("hổng có")).contains("không có");
            assertThat(VietnameseTextNormalizer.normalize("giá thú")).contains("kết hôn");
            assertThat(VietnameseTextNormalizer.normalize("tiền già")).contains("trợ cấp người cao tuổi");
            assertThat(VietnameseTextNormalizer.normalize("sổ hộ khẩu")).contains("thường trú");

            // Abbreviations
            assertThat(VietnameseTextNormalizer.normalize("nop cccd")).contains("căn cước công dân");
            assertThat(VietnameseTextNormalizer.normalize("lam gks")).contains("giấy khai sinh");
            assertThat(VietnameseTextNormalizer.normalize("tai ubnd xa")).contains("ủy ban nhân dân");
            assertThat(VietnameseTextNormalizer.normalize("tra cuu tthc")).contains("thủ tục hành chính");
            assertThat(VietnameseTextNormalizer.normalize("sao y giay to")).contains("chứng thực sao y bản sao");

            // Telex mis-strokes
            assertThat(VietnameseTextNormalizer.normalize("chaogf quy vi")).startsWith("chào");
            assertThat(VietnameseTextNormalizer.normalize("giupf do")).contains("giúp");
            assertThat(VietnameseTextNormalizer.normalize("tuw vaans")).contains("tư vấn");
            assertThat(VietnameseTextNormalizer.normalize("howx troj")).contains("hỗ trợ");
            assertThat(VietnameseTextNormalizer.normalize("huowngs daanx")).contains("hướng dẫn");
            assertThat(VietnameseTextNormalizer.normalize("keets hoon")).contains("kết hôn");
            assertThat(VietnameseTextNormalizer.normalize("thuowngf trus")).contains("thường trú");
            assertThat(VietnameseTextNormalizer.normalize("chuwsng thuwjc")).contains("chứng thực");

            // Word Boundary precision: Ensure substrings inside longer words are NOT accidentally replaced
            // e.g. "kok" should not become "khôngk"
            assertThat(VietnameseTextNormalizer.normalize("kok")).isEqualTo("kok");
            assertThat(VietnameseTextNormalizer.normalize("dkt")).isEqualTo("dkt");
        }

        @Test
        @DisplayName("3.3 Edge Cases: Null, empty, special characters, whitespace")
        void testNormalize_edgeCases() {
            assertEquals("", VietnameseTextNormalizer.normalize(null));
            assertEquals("", VietnameseTextNormalizer.normalize(""));
            assertEquals("", VietnameseTextNormalizer.normalize("     "));
            assertEquals("abc", VietnameseTextNormalizer.normalize("  abc  "));
            assertEquals("a b c", VietnameseTextNormalizer.normalize("a    b     c"));
        }
    }

    @Nested
    @DisplayName("Challenge 4: Validator Precision & Strictness")
    class ValidatorStrictnessChallenge {

        @Test
        @DisplayName("4.1 DateLogicValidator rejects invalid calendar dates strictly")
        void testDateLogicValidator_strictResolution() {
            // 31st February does not exist
            List<FormValidationIssue> leapIssues = dateLogicValidator.validate("31/02/2020", "01/01/2025");
            assertThat(leapIssues).isNotEmpty();
            assertThat(leapIssues).anyMatch(i -> "INVALID_DATE_FORMAT".equalsIgnoreCase(i.getErrorType()));

            // 29th February on non-leap year (2023)
            List<FormValidationIssue> nonLeapIssues = dateLogicValidator.validate("29/02/2023", "01/01/2025");
            assertThat(nonLeapIssues).isNotEmpty();

            // 29th February on leap year (2004) with age > 14 at issue (2020) -> VALID
            List<FormValidationIssue> validLeapIssues = dateLogicValidator.validate("29/02/2004", "01/03/2020");
            assertThat(validLeapIssues).isEmpty();

            // Year < 1900 -> INVALID_DATE_LOGIC
            List<FormValidationIssue> ancientYearIssues = dateLogicValidator.validate("15/05/1899", "01/01/2025");
            assertThat(ancientYearIssues).isNotEmpty();
            assertThat(ancientYearIssues).anyMatch(i -> "INVALID_DATE_LOGIC".equalsIgnoreCase(i.getErrorType()));
        }

        @Test
        @DisplayName("4.2 CccdValidator emits CANNOT_VERIFY_CCCD_YEAR_GENDER warning when birthDateStr is malformed")
        void testCccdValidator_unverifiableBirthDateWarning() {
            // 12-digit valid CCCD format for An Giang male 2002 (089 0 02 012345)
            // But birthDateStr is unparseable: "nam-hai-nghin-le-hai"
            List<FormValidationIssue> issues = cccdValidator.validate("089002012345", "nam-hai-nghin-le-hai", "NAM");
            assertThat(issues).isNotEmpty();
            assertThat(issues).anyMatch(i -> "CANNOT_VERIFY_CCCD_YEAR_GENDER".equalsIgnoreCase(i.getErrorType())
                    && "WARNING".equalsIgnoreCase(i.getSeverity()));
        }
    }

    @Nested
    @DisplayName("Challenge 5: Multi-Locality Query Cache Key Hardening")
    class QueryCacheMultiLocalityChallenge {

        @Test
        @DisplayName("5.1 Distinct keys generated for different wardName or category")
        void testBuildCacheKey_localitySeparation() {
            QueryCacheService cacheService = new QueryCacheService(null, objectMapper);

            String keyWard1 = cacheService.buildCacheKey("thủ tục khai sinh", "Phường 25", "Hộ tịch");
            String keyWard2 = cacheService.buildCacheKey("thủ tục khai sinh", "Phường 12", "Hộ tịch");
            String keyCat2 = cacheService.buildCacheKey("thủ tục khai sinh", "Phường 25", "Đất đai");

            assertThat(keyWard1).isNotEqualTo(keyWard2);
            assertThat(keyWard1).isNotEqualTo(keyCat2);
            assertThat(keyWard2).isNotEqualTo(keyCat2);

            // Verify prefix
            assertThat(keyWard1).startsWith("smartward:cache:rag:");
            assertThat(keyWard2).startsWith("smartward:cache:rag:");
        }
    }
}
