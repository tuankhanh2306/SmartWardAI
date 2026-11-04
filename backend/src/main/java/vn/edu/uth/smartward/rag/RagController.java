package vn.edu.uth.smartward.rag;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.rag.dto.RagAskRequest;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;

/**
 * REST Controller for Citizen Legal Inquiries via Legal RAG.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/rag")
@RequiredArgsConstructor
@Tag(name = "Legal RAG", description = "Trợ lý Pháp lý và Tra cứu Thủ tục Hành chính Cấp Xã/Phường")
public class RagController {

    private final RagQueryService ragQueryService;

    @PostMapping("/ask")
    @Operation(
            summary = "Giải đáp thủ tục hành chính với căn cứ pháp lý và chốt chặn chống ảo giác",
            description = "Tiếp nhận câu hỏi của công dân, vector hóa 768 chiều, truy vấn HNSW Cosine Similarity trên pgvector. " +
                          "Nếu S_max < 0.78, hệ thống tự động từ chối trả lời để bảo đảm an toàn thông tin theo Nghị định 13/2023/NĐ-CP."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Tra cứu và phản hồi thành công (hoặc từ chối an toàn)"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Dữ liệu yêu cầu không hợp lệ"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429", description = "Vượt quá giới hạn 5 yêu cầu/phút/IP")
    })
    public ResponseEntity<ApiResponse<RagAskResponse>> askQuestion(
            @Valid @RequestBody RagAskRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = extractClientIp(httpRequest);
        log.info("Received RAG ask request from IP: '{}', query: '{}'", clientIp, request.getQuestion());

        RagAskResponse response = ragQueryService.askQuestion(request, clientIp);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    private String extractClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isBlank() || "unknown".equalsIgnoreCase(xfHeader)) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}
