package vn.edu.uth.smartward.rag;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.common.ClientIpResolver;
import vn.edu.uth.smartward.rag.dto.HitlGrayZoneItemDto;
import vn.edu.uth.smartward.rag.dto.HitlResolveRequest;
import vn.edu.uth.smartward.rag.dto.RagAskRequest;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;
import vn.edu.uth.smartward.security.OfficerAuthService;

import java.util.List;

/**
 * REST Controller for Citizen Legal Inquiries via Legal RAG.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/rag")
@Tag(name = "Legal RAG", description = "Trợ lý Pháp lý và Tra cứu Thủ tục Hành chính Cấp Xã/Phường")
public class RagController {

    private final RagQueryService ragQueryService;
    private final ClientIpResolver clientIpResolver;
    private final OfficerAuthService officerAuthService;

    @Autowired
    public RagController(RagQueryService ragQueryService,
                         @Autowired(required = false) ClientIpResolver clientIpResolver,
                         @Autowired(required = false) OfficerAuthService officerAuthService) {
        this.ragQueryService = ragQueryService;
        this.clientIpResolver = clientIpResolver != null ? clientIpResolver : new ClientIpResolver();
        this.officerAuthService = officerAuthService;
    }

    public RagController(RagQueryService ragQueryService) {
        this(ragQueryService, new ClientIpResolver(), null);
    }

    @PostMapping("/ask")
    @Operation(
            summary = "Giải đáp thủ tục hành chính với căn cứ pháp lý và chốt chặn chống ảo giác",
            description = "Tiếp nhận câu hỏi của công dân, vector hóa 768 chiều, truy vấn HNSW Cosine Similarity trên pgvector. " +
                          "Nếu S_max < 0.78, hệ thống tự động từ chối trả lời để bảo đảm độ chính xác thông tin và an toàn tra cứu pháp lý."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Tra cứu và phản hồi thành công (hoặc từ chối an toàn)"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Dữ liệu yêu cầu không hợp lệ"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429", description = "Vượt quá giới hạn yêu cầu/phút theo phiên hoặc tài khoản cán bộ")
    })
    public ResponseEntity<ApiResponse<RagAskResponse>> askQuestion(
            @Valid @RequestBody RagAskRequest request,
            @RequestHeader(value = "X-Session-Id", required = false) String headerSessionId,
            HttpServletRequest httpRequest) {

        String clientIp = extractClientIp(httpRequest);
        String officerBadgeId = resolveOfficerBadgeId(httpRequest);
        String effectiveSessionId = (request.getSessionId() != null && !request.getSessionId().isBlank())
                ? request.getSessionId().trim()
                : (headerSessionId != null && !headerSessionId.isBlank() ? headerSessionId.trim() : null);

        log.info("Received RAG ask request from IP: '{}', officer: '{}', hasSession: {}, query: '{}'",
                clientIp, officerBadgeId != null ? officerBadgeId : "-", effectiveSessionId != null,
                sanitizeForLog(request.getQuestion()));

        RagAskResponse response = (officerBadgeId != null || effectiveSessionId != null)
                ? ragQueryService.askQuestion(request, clientIp, officerBadgeId, effectiveSessionId)
                : ragQueryService.askQuestion(request, clientIp);
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
            @Valid @RequestBody HitlResolveRequest request,
            HttpServletRequest httpRequest) {
        vn.edu.uth.smartward.security.OfficerAuthService.OfficerPrincipal principal =
                (vn.edu.uth.smartward.security.OfficerAuthService.OfficerPrincipal) httpRequest.getAttribute("officerPrincipal");
        String effectiveOfficerName = (principal != null && principal.fullName() != null && !principal.fullName().isBlank())
                ? principal.fullName()
                : request.getOfficerName();

        log.info("Officer '{}' resolving HITL gray-zone item '{}'", effectiveOfficerName, id);
        HitlGrayZoneItemDto resolved = ragQueryService.resolveHitlItem(
                id,
                request.getApprovedAnswer(),
                effectiveOfficerName
        );
        return ResponseEntity.ok(ApiResponse.ok(resolved));
    }

    public record RagFeedbackRequest(String query, Boolean useful, String comments) {}

    @PostMapping("/feedback")
    @Operation(
            summary = "Ghi nhận phản hồi của công dân về chất lượng câu trả lời RAG (hữu ích / không hữu ích)",
            description = "Thu thập phản hồi để đánh giá chất lượng mô hình và bổ sung dữ liệu huấn luyện."
    )
    public ResponseEntity<ApiResponse<Void>> submitRagFeedback(
            @RequestBody RagFeedbackRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        log.info("Received RAG feedback from IP {}: query='{}', useful={}",
                clientIp, sanitizeForLog(request != null ? request.query() : ""),
                request != null ? request.useful() : null);
        return ResponseEntity.ok(ApiResponse.ok("Cảm ơn bạn đã đóng góp phản hồi.", null));
    }

    private String extractClientIp(HttpServletRequest request) {
        return clientIpResolver.resolve(request);
    }

    private String resolveOfficerBadgeId(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        Object attr = request.getAttribute("officerPrincipal");
        if (attr instanceof OfficerAuthService.OfficerPrincipal principal && principal.badgeId() != null && !principal.badgeId().isBlank()) {
            return principal.badgeId();
        }
        if (officerAuthService != null) {
            return officerAuthService.tryVerifyToken(request.getHeader("Authorization"))
                    .map(OfficerAuthService.OfficerPrincipal::badgeId)
                    .orElse(null);
        }
        return null;
    }

    private String sanitizeForLog(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String redacted = text.replaceAll("\\d{9,12}", "***REDACTED_ID***");
        return redacted.length() > 60 ? redacted.substring(0, 60) : redacted;
    }
}
