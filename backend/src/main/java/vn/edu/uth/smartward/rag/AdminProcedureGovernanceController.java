package vn.edu.uth.smartward.rag;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.rag.dto.*;
import vn.edu.uth.smartward.security.OfficerAuthService;
import vn.edu.uth.smartward.security.OfficerAuthService.OfficerPrincipal;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminProcedureGovernanceController {

    private final ProcedureGovernanceService governanceService;
    private final OfficerAuthService officerAuthService;

    @GetMapping("/procedures")
    public ResponseEntity<ApiResponse<List<AdminProcedureSummaryDto>>> listProcedures(
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String keyword,
            HttpServletRequest httpRequest
    ) {
        resolvePrincipal(httpRequest);
        List<AdminProcedureSummaryDto> list = governanceService.listAdminProcedures(state, keyword);
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/procedures/{code}")
    public ResponseEntity<ApiResponse<AdminProcedureDetailDto>> getProcedureDetail(
            @PathVariable("code") String code,
            HttpServletRequest httpRequest
    ) {
        resolvePrincipal(httpRequest);
        AdminProcedureDetailDto detail = governanceService.getProcedureDetail(code);
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @PostMapping("/procedures/{code}/proposals")
    public ResponseEntity<ApiResponse<ProcedureVersionDto>> createOrUpdateDraft(
            @PathVariable("code") String code,
            @RequestBody ProposalCreateRequest request,
            HttpServletRequest httpRequest
    ) {
        OfficerPrincipal principal = resolvePrincipal(httpRequest);
        ProcedureVersionDto result = governanceService.saveOrUpdateDraft(
                code,
                request,
                principal,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.ok(ApiResponse.ok("Đã lưu bản nháp đề xuất cập nhật TTHC", result));
    }

    @PostMapping("/proposals/{id}/submit")
    public ResponseEntity<ApiResponse<ProcedureVersionDto>> submitProposal(
            @PathVariable("id") Long id,
            HttpServletRequest httpRequest
    ) {
        OfficerPrincipal principal = resolvePrincipal(httpRequest);
        ProcedureVersionDto result = governanceService.submitProposal(
                id,
                principal,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.ok(ApiResponse.ok("Đã gửi đề xuất chờ Quản trị viên phê duyệt", result));
    }

    @GetMapping("/proposals")
    public ResponseEntity<ApiResponse<List<ProcedureVersionDto>>> getProposalsQueue(
            @RequestParam(value = "state", defaultValue = "PENDING_REVIEW") String state,
            HttpServletRequest httpRequest
    ) {
        OfficerPrincipal principal = resolvePrincipal(httpRequest);
        List<ProcedureVersionDto> queue = governanceService.listProposalsByState(state, principal);
        return ResponseEntity.ok(ApiResponse.ok(queue));
    }

    @GetMapping("/proposals/{id}/diff")
    public ResponseEntity<ApiResponse<ProposalDiffDto>> getProposalDiff(
            @PathVariable("id") Long id,
            HttpServletRequest httpRequest
    ) {
        OfficerPrincipal principal = resolvePrincipal(httpRequest);
        ProposalDiffDto diff = governanceService.getProposalDiff(id, principal);
        return ResponseEntity.ok(ApiResponse.ok(diff));
    }

    @PostMapping("/proposals/{id}/approve")
    public ResponseEntity<ApiResponse<ProcedureVersionDto>> approveProposal(
            @PathVariable("id") Long id,
            @RequestBody(required = false) ProposalDecisionRequest request,
            HttpServletRequest httpRequest
    ) {
        OfficerPrincipal principal = resolvePrincipal(httpRequest);
        String note = request != null ? request.getReviewNote() : null;
        ProcedureVersionDto result = governanceService.approveProposal(
                id,
                note,
                principal,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.ok(ApiResponse.ok("Đã phê duyệt và công bố phiên bản TTHC mới thành công", result));
    }

    @PostMapping("/proposals/{id}/reject")
    public ResponseEntity<ApiResponse<ProcedureVersionDto>> rejectProposal(
            @PathVariable("id") Long id,
            @RequestBody(required = false) ProposalDecisionRequest request,
            HttpServletRequest httpRequest
    ) {
        OfficerPrincipal principal = resolvePrincipal(httpRequest);
        String note = request != null ? request.getReviewNote() : null;
        ProcedureVersionDto result = governanceService.rejectProposal(
                id,
                note,
                principal,
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.ok(ApiResponse.ok("Đã từ chối đề xuất cập nhật TTHC", result));
    }

    private OfficerPrincipal resolvePrincipal(HttpServletRequest request) {
        Object attr = request.getAttribute("officerPrincipal");
        if (attr instanceof OfficerPrincipal principal) {
            return principal;
        }
        String authHeader = request.getHeader("Authorization");
        OfficerPrincipal verified = officerAuthService.verifyToken(authHeader);
        request.setAttribute("officerPrincipal", verified);
        return verified;
    }
}
