package vn.edu.uth.smartward.evaluation;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.uth.smartward.evaluation.dto.FullBenchmarkReport;
import vn.edu.uth.smartward.evaluation.dto.RagBenchmarkResult;

import java.time.OffsetDateTime;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(EvaluationController.class)
class EvaluationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ExperimentRunnerService experimentRunnerService;

    @Test
    void testRunBenchmarks_success() throws Exception {
        FullBenchmarkReport mockReport = FullBenchmarkReport.builder()
                .projectTitle("SmartWard AI")
                .institution("UTH")
                .executedAt(OffsetDateTime.now())
                .ragBenchmark(RagBenchmarkResult.builder()
                        .totalQuestions(80)
                        .recallAt3("95.38%")
                        .abstentionAccuracy("100.0%")
                        .build())
                .scientificConclusion("Hoàn thành đánh giá thực nghiệm.")
                .build();

        when(experimentRunnerService.runAllBenchmarks()).thenReturn(mockReport);

        mockMvc.perform(post("/api/v1/evaluation/run-benchmarks")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.projectTitle").value("SmartWard AI"))
                .andExpect(jsonPath("$.data.ragBenchmark.totalQuestions").value(80))
                .andExpect(jsonPath("$.data.ragBenchmark.abstentionAccuracy").value("100.0%"));
    }

    @Test
    void testGetLatestReport_success() throws Exception {
        FullBenchmarkReport mockReport = FullBenchmarkReport.builder()
                .projectTitle("SmartWard AI")
                .institution("UTH")
                .scientificConclusion("Báo cáo sẵn sàng.")
                .build();

        when(experimentRunnerService.runAllBenchmarks()).thenReturn(mockReport);

        mockMvc.perform(get("/api/v1/evaluation/report"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.projectTitle").value("SmartWard AI"));
    }
}
