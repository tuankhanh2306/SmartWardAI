package vn.edu.uth.smartward.evaluation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.edu.uth.smartward.evaluation.dto.FormBenchmarkResult;
import vn.edu.uth.smartward.evaluation.dto.FullBenchmarkReport;
import vn.edu.uth.smartward.evaluation.dto.RagBenchmarkResult;
import vn.edu.uth.smartward.evaluation.dto.TriageBenchmarkResult;
import vn.edu.uth.smartward.formcheck.CccdValidator;
import vn.edu.uth.smartward.formcheck.DateLogicValidator;
import vn.edu.uth.smartward.formcheck.MandatoryFieldValidator;

import static org.junit.jupiter.api.Assertions.*;

class ExperimentRunnerServiceTest {

    private ExperimentRunnerService runnerService;

    @BeforeEach
    void setUp() {
        runnerService = new ExperimentRunnerService(
                new ObjectMapper(),
                new CccdValidator(),
                new DateLogicValidator(),
                new MandatoryFieldValidator()
        );
    }

    @Test
    void testEvaluateRagBenchmark() {
        RagBenchmarkResult result = runnerService.evaluateRagBenchmark();

        assertNotNull(result);
        assertEquals(80, result.getTotalQuestions());
        assertEquals(65, result.getInScopeCount());
        assertEquals(15, result.getOutOfScopeCount());
        assertEquals("100.0%", result.getAbstentionAccuracy(), "Abstention on out-of-scope must be 100%");
        assertEquals("0.0%", result.getFalseAnswerRate());
        assertTrue(result.getMrr() >= 0.85);
    }

    @Test
    void testEvaluateFormBenchmark() {
        FormBenchmarkResult result = runnerService.evaluateFormBenchmark();

        assertNotNull(result);
        assertEquals(40, result.getTotalForms());
        assertEquals(20, result.getPrintedCount());
        assertEquals(20, result.getHandwrittenCount());
        assertEquals(16, result.getValidCount());
        assertEquals(24, result.getInvalidCount());
        assertEquals("100.0%", result.getAccuracy(), "Rule engine must achieve 100% accuracy on benchmark ground truth");
        assertEquals(1.0, result.getF1Score(), 0.001);
        assertEquals("100.0%", result.getCccdErrorDetectionRate());
        assertEquals("100.0%", result.getDateLogicErrorDetectionRate());
    }

    @Test
    void testEvaluateTriageBenchmark() {
        TriageBenchmarkResult result = runnerService.evaluateTriageBenchmark();

        assertNotNull(result);
        assertEquals(150, result.getTotalReports());
        assertEquals(30, result.getTotalOriginalEvents());
        assertEquals(25, result.getHardCasesCount());
        assertEquals("100.0%", result.getColocatedSeparationRate(), "Colocated different categories must be 100% separated");
        assertEquals("100.0%", result.getDistantSeparationRate(), "Distant locations must be 100% separated");
    }

    @Test
    void testRunAllBenchmarks() {
        FullBenchmarkReport fullReport = runnerService.runAllBenchmarks();

        assertNotNull(fullReport);
        assertNotNull(fullReport.getRagBenchmark());
        assertNotNull(fullReport.getFormBenchmark());
        assertNotNull(fullReport.getTriageBenchmark());
        assertNotNull(fullReport.getScientificConclusion());
        assertTrue(fullReport.getScientificConclusion().contains("100%"));
    }
}
