package vn.edu.uth.smartward.rag;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.rag.dto.ProcedureDetailDto;
import vn.edu.uth.smartward.rag.dto.ProcedureDto;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/procedures")
@RequiredArgsConstructor
public class ProcedureController {

    private final ProcedureService procedureService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProcedureDto>>> getProcedures(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword
    ) {
        log.info("Fetching public procedures: category='{}', keyword='{}'", category, keyword);
        List<ProcedureDto> result = procedureService.getProcedures(category, keyword);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{code}")
    public ResponseEntity<ApiResponse<ProcedureDetailDto>> getProcedureByCode(@PathVariable("code") String code) {
        log.info("Fetching public procedure detail: code='{}'", code);
        ProcedureDetailDto result = procedureService.getProcedureByCode(code);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/reindex")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> reindexProcedures(
            @RequestParam(required = false) String procedureCode,
            @RequestParam(defaultValue = "false") boolean forceAll
    ) {
        log.info("Admin request to reindex procedures: code='{}', forceAll={}", procedureCode, forceAll);
        java.util.Map<String, Object> result = procedureService.reindexProcedures(procedureCode, forceAll);
        return ResponseEntity.ok(ApiResponse.ok("Tái lập chỉ mục thủ tục hành chính thành công", result));
    }
}
