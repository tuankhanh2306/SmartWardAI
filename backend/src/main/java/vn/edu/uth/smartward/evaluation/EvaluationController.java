package vn.edu.uth.smartward.evaluation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.evaluation.dto.FullBenchmarkReport;

/**
 * REST Controller for Scientific Benchmark Evaluation Runner.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/evaluation")
@RequiredArgsConstructor
@Tag(name = "Scientific Evaluation", description = "Đánh giá Thực nghiệm Khoa học Đề tài Tốt nghiệp (Recall@3, MRR, F1-Score, Abstention Rate)")
public class EvaluationController {

    private final ExperimentRunnerService experimentRunnerService;

    @PostMapping("/run-benchmarks")
    @Operation(
            summary = "Chạy toàn bộ bộ kiểm thử thực nghiệm (80 câu RAG, 40 tờ khai, 150 phản ánh)",
            description = "Tự động đo lường và tính toán các chỉ số khoa học: Recall@3, MRR, Abstention Accuracy, " +
                          "F1-score kiểm định biểu mẫu, tỷ lệ phân tách ca biên khó phục vụ báo cáo khóa luận tốt nghiệp UTH."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Thực thi thành công, trả về báo cáo số liệu thực nghiệm")
    })
    public ResponseEntity<ApiResponse<FullBenchmarkReport>> runBenchmarks() {
        log.info("Received request to execute full scientific benchmark evaluation.");
        FullBenchmarkReport report = experimentRunnerService.runAllBenchmarks();
        return ResponseEntity.ok(ApiResponse.ok(report));
    }

    @GetMapping("/report")
    @Operation(summary = "Xem báo cáo số liệu thực nghiệm khoa học mới nhất")
    public ResponseEntity<ApiResponse<FullBenchmarkReport>> getLatestReport() {
        FullBenchmarkReport report = experimentRunnerService.runAllBenchmarks();
        return ResponseEntity.ok(ApiResponse.ok(report));
    }
}
