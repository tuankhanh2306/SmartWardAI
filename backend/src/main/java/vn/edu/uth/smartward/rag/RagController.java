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
import vn.edu.uth.smartward.rag.dto.HitlGrayZoneItemDto;
import vn.edu.uth.smartward.rag.dto.HitlResolveRequest;
import vn.edu.uth.smartward.rag.dto.RagAskRequest;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;

import java.util.List;

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

    @GetMapping("/hitl-queue")
    @Operation(
            summary = "Danh sách câu hỏi vùng xám (0.42 <= S_max < 0.78) chờ cán bộ Tư pháp - Hộ tịch duyệt (Human-in-the-Loop)",
            description = "Lấy hàng đợi các câu hỏi có điểm tương đồng nằm trong vùng xám để cán bộ chỉnh sửa hoặc phê duyệt nạp vào bộ nhớ đệm Redis."
    )
    public ResponseEntity<ApiResponse<List<HitlGrayZoneItemDto>>> getHitlQueue() {
        return ResponseEntity.ok(ApiResponse.ok(ragQueryService.getHitlQueue()));
    }

    @PostMapping("/hitl-queue/{id}/resolve")
    @Operation(
            summary = "Cán bộ phê duyệt câu trả lời vùng xám và nạp trực tiếp vào bộ nhớ đệm Redis RAG",
            description = "Cập nhật trạng thái APPROVED cho câu hỏi vùng xám và lưu câu trả lời chính thống vào Redis QueryCacheService (TTL 24 giờ)."
    )
    public ResponseEntity<ApiResponse<HitlGrayZoneItemDto>> resolveHitlItem(
            @PathVariable("id") String id,
            @Valid @RequestBody HitlResolveRequest request) {
        log.info("Officer '{}' resolving HITL gray-zone item '{}'", request.getOfficerName(), id);
        HitlGrayZoneItemDto resolved = ragQueryService.resolveHitlItem(
                id,
                request.getApprovedAnswer(),
                request.getOfficerName()
        );
        return ResponseEntity.ok(ApiResponse.ok(resolved));
    }

    private String extractClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isBlank() || "unknown".equalsIgnoreCase(xfHeader)) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}
