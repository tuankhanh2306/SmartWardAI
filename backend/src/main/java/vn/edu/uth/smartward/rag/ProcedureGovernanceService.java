package vn.edu.uth.smartward.rag;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.audit.AuditService;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.common.QueryCacheService;
import vn.edu.uth.smartward.rag.dto.*;
import vn.edu.uth.smartward.security.OfficerAuthService.OfficerPrincipal;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.*;

@Slf4j
@Service
public class ProcedureGovernanceService {

    private static final int MAX_SECTION_LENGTH = 15000;

    private final AdminProcedureRepository procedureRepository;
    private final ProcedureVersionRepository versionRepository;
    private final LegalChunkRepository chunkRepository;
    private final LegalChunkingService chunkingService;
    private final AiModelClient aiModelClient;
    private final QueryCacheService queryCacheService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @Autowired
    public ProcedureGovernanceService(AdminProcedureRepository procedureRepository,
                                      ProcedureVersionRepository versionRepository,
                                      LegalChunkRepository chunkRepository,
                                      @Autowired(required = false) LegalChunkingService chunkingService,
                                      @Autowired(required = false) AiModelClient aiModelClient,
                                      @Autowired(required = false) QueryCacheService queryCacheService,
                                      @Autowired(required = false) AuditService auditService,
                                      @Autowired(required = false) ObjectMapper objectMapper) {
        this.procedureRepository = procedureRepository;
        this.versionRepository = versionRepository;
        this.chunkRepository = chunkRepository;
        this.chunkingService = chunkingService != null ? chunkingService : new LegalChunkingService();
        this.aiModelClient = aiModelClient;
        this.queryCacheService = queryCacheService;
        this.auditService = auditService;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    @Transactional(readOnly = true)
    public List<AdminProcedureSummaryDto> listAdminProcedures(String stateFilter, String keyword) {
        List<AdminProcedure> procedures = procedureRepository.searchProcedures(null, keyword);
        List<AdminProcedureSummaryDto> result = new ArrayList<>();

        for (AdminProcedure proc : procedures) {
            List<ProcedureVersion> versions = versionRepository.findByProcedureIdOrderByVersionNoDesc(proc.getId());
            AdminProcedureSummaryDto summary = buildSummaryDto(proc, versions);

            if (stateFilter != null && !stateFilter.isBlank() && !"ALL".equalsIgnoreCase(stateFilter)) {
                if ("PENDING_REVIEW".equalsIgnoreCase(stateFilter) && summary.getPendingProposalsCount() == 0) {
                    continue;
                }
                if ("INCOMPLETE".equalsIgnoreCase(stateFilter) && summary.isComplete()) {
                    continue;
                }
                if ("ACTIVE".equalsIgnoreCase(stateFilter) && !"ACTIVE".equalsIgnoreCase(summary.getStatus())) {
                    continue;
                }
            }
            result.add(summary);
        }
        return result;
    }

    @Transactional(readOnly = true)
    public AdminProcedureDetailDto getProcedureDetail(String procedureCode) {
        AdminProcedure proc = findProcedureOrThrow(procedureCode);
        List<ProcedureVersion> versions = versionRepository.findByProcedureIdOrderByVersionNoDesc(proc.getId());
        AdminProcedureSummaryDto summary = buildSummaryDto(proc, versions);

        ProcedureVersion publishedEntity = versions.stream()
                .filter(v -> "PUBLISHED".equalsIgnoreCase(v.getState()))
                .findFirst()
                .orElse(null);

        ProcedureVersionDto publishedDto = publishedEntity != null
                ? toVersionDto(proc, publishedEntity)
                : buildSynthesizedV1Dto(proc);

        List<ProcedureVersionDto> versionDtos = versions.isEmpty()
                ? List.of(publishedDto)
                : versions.stream().map(v -> toVersionDto(proc, v)).toList();

        return AdminProcedureDetailDto.builder()
                .summary(summary)
                .publishedVersion(publishedDto)
                .versions(versionDtos)
                .build();
    }

    @Transactional
    public ProcedureVersionDto saveOrUpdateDraft(String procedureCode,
                                                 ProposalCreateRequest request,
                                                 OfficerPrincipal principal,
                                                 String ip,
                                                 String userAgent) {
        requireAuthenticated(principal);
        if (request == null || request.getContent() == null) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Nội dung đề xuất (content) không được để trống.");
        }

        AdminProcedure proc = findProcedureOrThrow(procedureCode);
        ProcedureContentDto sanitizedContent = sanitizeContent(request.getContent());
        String contentJson = serializeContent(sanitizedContent);
        String contentHash = sha256Hex(contentJson);

        ProcedureVersion targetVersion;
        String auditAction;
        String beforeJson = null;

        if (request.getProposalId() != null) {
            targetVersion = versionRepository.findById(request.getProposalId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND,
                            "Không tìm thấy bản nháp với ID: " + request.getProposalId()));

            if (!targetVersion.getProcedure().getId().equals(proc.getId())) {
                throw new BusinessException(ErrorCode.INVALID_REQUEST, "Bản đề xuất không thuộc thủ tục " + procedureCode);
            }
            if (!"DRAFT".equalsIgnoreCase(targetVersion.getState())) {
                throw new BusinessException(ErrorCode.CONFLICT,
                        "Không thể chỉnh sửa trực tiếp phiên bản ở trạng thái '" + targetVersion.getState() + "'. Chỉ được sửa bản DRAFT.");
            }
            beforeJson = targetVersion.getContent();
            targetVersion.setContent(contentJson);
            targetVersion.setContentHash(contentHash);
            if (request.getSourceRef() != null) {
                targetVersion.setSourceRef(sanitizeString(request.getSourceRef(), 500));
            }
            auditAction = "PROPOSAL_DRAFT_UPDATED";
        } else {
            int nextVersion = versionRepository.findMaxVersionNoByProcedureId(proc.getId()) + 1;
            if (nextVersion == 1) {
                // Ensure v1 exists first if not yet seeded in procedure_versions
                nextVersion = 2;
            }
            String source = (request.getSource() != null && !request.getSource().isBlank())
                    ? request.getSource().trim().toUpperCase()
                    : "MANUAL";

            targetVersion = ProcedureVersion.builder()
                    .procedure(proc)
                    .versionNo(nextVersion)
                    .content(contentJson)
                    .contentHash(contentHash)
                    .state("DRAFT")
                    .createdBy(principal.badgeId())
                    .source(source)
                    .sourceRef(sanitizeString(request.getSourceRef(), 500))
                    .build();
            auditAction = "PROPOSAL_DRAFT_CREATED";
        }

        ProcedureVersion saved = versionRepository.save(targetVersion);
        if (auditService != null) {
            auditService.logProcedureAction(
                    principal.badgeId(),
                    principal.wardCode(),
                    auditAction,
                    "PROCEDURE",
                    proc.getProcedureCode(),
                    saved.getVersionNo(),
                    beforeJson,
                    contentJson,
                    ip,
                    userAgent
            );
        }

        return toVersionDto(proc, saved);
    }

    @Transactional
    public ProcedureVersionDto submitProposal(Long proposalId,
                                              OfficerPrincipal principal,
                                              String ip,
                                              String userAgent) {
        requireAuthenticated(principal);
        ProcedureVersion proposal = versionRepository.findById(proposalId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy đề xuất ID: " + proposalId));

        if (!"DRAFT".equalsIgnoreCase(proposal.getState())) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Chỉ có thể gửi duyệt đề xuất đang ở trạng thái DRAFT (trạng thái hiện tại: " + proposal.getState() + ").");
        }

        ProcedureContentDto content = parseContent(proposal.getContent());
        validateFiveSectionsOrThrow(content);

        proposal.setState("PENDING_REVIEW");
        proposal.setSubmittedAt(OffsetDateTime.now());
        ProcedureVersion saved = versionRepository.save(proposal);

        AdminProcedure proc = proposal.getProcedure();
        if (auditService != null) {
            auditService.logProcedureAction(
                    principal.badgeId(),
                    principal.wardCode(),
                    "PROPOSAL_SUBMITTED",
                    "PROCEDURE",
                    proc.getProcedureCode(),
                    saved.getVersionNo(),
                    null,
                    saved.getContent(),
                    ip,
                    userAgent
            );
        }

        return toVersionDto(proc, saved);
    }

    @Transactional(readOnly = true)
    public List<ProcedureVersionDto> listProposalsByState(String state, OfficerPrincipal principal) {
        requireAdmin(principal);
        String targetState = (state == null || state.isBlank()) ? "PENDING_REVIEW" : state.trim().toUpperCase();
        List<ProcedureVersion> list = versionRepository.findByStateOrderBySubmittedAtDescCreatedAtDesc(targetState);
        return list.stream().map(v -> toVersionDto(v.getProcedure(), v)).toList();
    }

    @Transactional(readOnly = true)
    public ProposalDiffDto getProposalDiff(Long proposalId, OfficerPrincipal principal) {
        requireAdmin(principal);
        ProcedureVersion proposal = versionRepository.findById(proposalId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy đề xuất ID: " + proposalId));

        AdminProcedure proc = proposal.getProcedure();
        Optional<ProcedureVersion> publishedOpt = versionRepository.findByProcedureIdAndState(proc.getId(), "PUBLISHED");

        ProcedureContentDto oldContent = publishedOpt
                .map(v -> parseContent(v.getContent()))
                .orElseGet(() -> synthesizeContentFromProcedure(proc));
        Integer fromVersionNo = publishedOpt.map(ProcedureVersion::getVersionNo).orElse(1);

        ProcedureContentDto newContent = parseContent(proposal.getContent());

        List<ProposalDiffDto.FieldDiff> diffs = List.of(
                buildFieldDiff("trinh_tu", "1. Trình tự thực hiện", oldContent.getTrinhTu(), newContent.getTrinhTu()),
                buildFieldDiff("thanh_phan_ho_so", "2. Thành phần hồ sơ", oldContent.getThanhPhanHoSo(), newContent.getThanhPhanHoSo()),
                buildFieldDiff("thoi_han_le_phi", "3. Thời hạn giải quyết & Lệ phí", oldContent.getThoiHanLePhi(), newContent.getThoiHanLePhi()),
                buildFieldDiff("co_quan_thuc_hien", "4. Cơ quan thực hiện", oldContent.getCoQuanThucHien(), newContent.getCoQuanThucHien()),
                buildFieldDiff("can_cu_phap_ly", "5. Căn cứ pháp lý", oldContent.getCanCuPhapLy(), newContent.getCanCuPhapLy())
        );

        return ProposalDiffDto.builder()
                .proposalId(proposal.getId())
                .procedureCode(proc.getProcedureCode())
                .procedureName(proc.getProcedureName())
                .fromVersionNo(fromVersionNo)
                .toVersionNo(proposal.getVersionNo())
                .state(proposal.getState())
                .createdBy(proposal.getCreatedBy())
                .submittedAt(proposal.getSubmittedAt())
                .fields(diffs)
                .build();
    }

    @Transactional
    public ProcedureVersionDto approveProposal(Long proposalId,
                                               String reviewNote,
                                               OfficerPrincipal adminPrincipal,
                                               String ip,
                                               String userAgent) {
        requireAdmin(adminPrincipal);

        ProcedureVersion proposal = versionRepository.findById(proposalId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy đề xuất ID: " + proposalId));

        if (!"PENDING_REVIEW".equalsIgnoreCase(proposal.getState())) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Chỉ có thể phê duyệt đề xuất ở trạng thái PENDING_REVIEW (trạng thái hiện tại: " + proposal.getState() + ").");
        }

        // Strict Four-Eyes Principle: Creator cannot approve their own proposal (even if ADMIN)
        if (adminPrincipal.badgeId().equalsIgnoreCase(proposal.getCreatedBy())) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "SELF_APPROVAL_FORBIDDEN: Người tạo đề xuất (" + proposal.getCreatedBy() + ") không được phép tự duyệt đề xuất của chính mình.");
        }

        ProcedureContentDto newContent = parseContent(proposal.getContent());
        validateFiveSectionsOrThrow(newContent);

        AdminProcedure proc = proposal.getProcedure();
        Optional<ProcedureVersion> currentPublishedOpt = versionRepository.findByProcedureIdAndState(proc.getId(), "PUBLISHED");
        String beforeSnapshot = null;

        if (currentPublishedOpt.isPresent()) {
            ProcedureVersion oldPublished = currentPublishedOpt.get();
            beforeSnapshot = oldPublished.getContent();
            oldPublished.setState("SUPERSEDED");
            versionRepository.saveAndFlush(oldPublished);
        } else {
            beforeSnapshot = serializeContent(synthesizeContentFromProcedure(proc));
        }

        // Synchronize RAG chunks selectively (only changed content_hash chunks are re-embedded)
        // If embedding fails, abort/preserve old chunks and throw or rollback cleanly
        syncRagChunksSelectively(proc, newContent);

        OffsetDateTime now = OffsetDateTime.now();
        proposal.setState("PUBLISHED");
        proposal.setReviewedBy(adminPrincipal.badgeId());
        proposal.setReviewedAt(now);
        proposal.setPublishedAt(now);
        proposal.setReviewNote(reviewNote != null && !reviewNote.isBlank()
                ? sanitizeString(reviewNote, 1000)
                : "Đã phê duyệt và công bố phiên bản v" + proposal.getVersionNo());

        ProcedureVersion saved = versionRepository.saveAndFlush(proposal);

        // Update AdminProcedure metadata to match newly published version
        proc.setCurrentVersionId(saved.getId());
        proc.setAgency(newContent.getCoQuanThucHien());
        updateProcedureTimeAndFeeMetadata(proc, newContent.getThoiHanLePhi());
        procedureRepository.save(proc);

        if (queryCacheService != null) {
            queryCacheService.clearAllRagCache();
        }

        if (auditService != null) {
            auditService.logProcedureAction(
                    adminPrincipal.badgeId(),
                    adminPrincipal.wardCode(),
                    "PROPOSAL_APPROVED",
                    "PROCEDURE",
                    proc.getProcedureCode(),
                    saved.getVersionNo(),
                    beforeSnapshot,
                    saved.getContent(),
                    ip,
                    userAgent
            );
        }

        return toVersionDto(proc, saved);
    }

    @Transactional
    public ProcedureVersionDto rejectProposal(Long proposalId,
                                              String reviewNote,
                                              OfficerPrincipal adminPrincipal,
                                              String ip,
                                              String userAgent) {
        requireAdmin(adminPrincipal);

        if (reviewNote == null || reviewNote.trim().isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST,
                    "Vui lòng nhập lý do từ chối đề xuất (review_note là bắt buộc khi từ chối).");
        }

        ProcedureVersion proposal = versionRepository.findById(proposalId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy đề xuất ID: " + proposalId));

        if (!"PENDING_REVIEW".equalsIgnoreCase(proposal.getState())) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Chỉ có thể từ chối đề xuất đang ở trạng thái PENDING_REVIEW.");
        }

        proposal.setState("REJECTED");
        proposal.setReviewedBy(adminPrincipal.badgeId());
        proposal.setReviewedAt(OffsetDateTime.now());
        proposal.setReviewNote(sanitizeString(reviewNote, 1000));

        ProcedureVersion saved = versionRepository.save(proposal);
        AdminProcedure proc = proposal.getProcedure();

        if (auditService != null) {
            auditService.logProcedureAction(
                    adminPrincipal.badgeId(),
                    adminPrincipal.wardCode(),
                    "PROPOSAL_REJECTED",
                    "PROCEDURE",
                    proc.getProcedureCode(),
                    saved.getVersionNo(),
                    null,
                    saved.getContent(),
                    ip,
                    userAgent
            );
        }

        return toVersionDto(proc, saved);
    }

    /**
     * Selective RAG chunk re-embedding upon publishing a new procedure version:
     * - Compares content_hash of each section against existing chunks in DB.
     * - Only chunks whose content_hash changed are re-embedded.
     * - If AI embedding fails, keeps existing chunks untouched so RAG service never degrades.
     */
    private void syncRagChunksSelectively(AdminProcedure proc, ProcedureContentDto newContent) {
        List<LegalChunk> existingChunks = chunkRepository.findByProcedureId(proc.getId());
        if (existingChunks == null) {
            existingChunks = new ArrayList<>();
        }

        Map<String, String> sectionMap = new LinkedHashMap<>();
        String overviewContent = String.format(
                "Thủ tục: %s. Cơ quan thực hiện: %s. %s",
                proc.getProcedureName(),
                newContent.getCoQuanThucHien(),
                newContent.getThoiHanLePhi()
        );
        sectionMap.put("OVERVIEW", overviewContent);
        sectionMap.put("PROCESS_STEP", newContent.getTrinhTu());
        sectionMap.put("REQUIRED_DOCUMENTS", newContent.getThanhPhanHoSo());
        sectionMap.put("LEGAL_BASIS", newContent.getCanCuPhapLy());

        Map<String, String> sectionTitleMap = Map.of(
                "OVERVIEW", "Tổng quan, Thời hạn & Lệ phí " + proc.getProcedureName(),
                "PROCESS_STEP", "Trình tự thực hiện " + proc.getProcedureName(),
                "REQUIRED_DOCUMENTS", "Thành phần hồ sơ " + proc.getProcedureName(),
                "LEGAL_BASIS", "Căn cứ pháp lý " + proc.getProcedureName()
        );

        int idx = 0;
        for (Map.Entry<String, String> entry : sectionMap.entrySet()) {
            idx++;
            String chunkType = entry.getKey();
            String textContent = entry.getValue();
            String newHash = sha256Hex(textContent);

            LegalChunk existing = existingChunks.stream()
                    .filter(c -> chunkType.equalsIgnoreCase(c.getChunkType())
                            || ("REQUIRED_DOCUMENTS".equals(chunkType) && "REQUIRED_DOCS".equalsIgnoreCase(c.getChunkType())))
                    .findFirst()
                    .orElse(null);

            if (existing != null) {
                String existingHash = existing.getContentHash() != null
                        ? existing.getContentHash()
                        : sha256Hex(existing.getContent());

                if (newHash.equals(existingHash)) {
                    // Unchanged section -> skip embedding call completely!
                    log.debug("Chunk {} ({}) unchanged (hash={}), skipping re-embedding", existing.getChunkCode(), chunkType, newHash);
                    continue;
                }

                // Content changed -> re-embed only this chunk
                String title = sectionTitleMap.getOrDefault(chunkType, proc.getProcedureName() + " - " + chunkType);
                String headerPath = proc.getProcedureCode() + " > " + chunkType;

                LegalChunk candidate = LegalChunk.builder()
                        .procedure(proc)
                        .chunkCode(existing.getChunkCode())
                        .chunkType(chunkType)
                        .title(title)
                        .content(textContent)
                        .legalReference(proc.getProcedureName() + " - " + chunkType)
                        .headerPath(headerPath)
                        .sectionName(chunkType)
                        .contentHash(newHash)
                        .build();

                if (aiModelClient != null) {
                    try {
                        String embedText = chunkingService.prepareTextForEmbedding(candidate);
                        AiModelClient.EmbeddingResult emb = aiModelClient.generateEmbeddingResult(embedText);
                        existing.setTitle(title);
                        existing.setContent(textContent);
                        existing.setContentHash(newHash);
                        existing.setHeaderPath(headerPath);
                        existing.setSectionName(chunkType);
                        existing.setEmbedding(aiModelClient.toPgVectorString(emb.vector()));
                        existing.setEmbeddingModel(emb.modelId());
                        chunkRepository.save(existing);
                    } catch (Exception e) {
                        log.warn("Embedding failed for updated chunk {} ({}): {}. Preserving existing chunk content & vector.",
                                existing.getChunkCode(), chunkType, e.getMessage());
                    }
                } else {
                    existing.setTitle(title);
                    existing.setContent(textContent);
                    existing.setContentHash(newHash);
                    existing.setHeaderPath(headerPath);
                    existing.setSectionName(chunkType);
                    chunkRepository.save(existing);
                }
            } else {
                // Create new chunk if none existed for this section
                String chunkCode = String.format("%s_CHUNK_%03d", proc.getProcedureCode(), idx);
                String title = sectionTitleMap.getOrDefault(chunkType, proc.getProcedureName() + " - " + chunkType);
                String headerPath = proc.getProcedureCode() + " > " + chunkType;

                LegalChunk created = LegalChunk.builder()
                        .procedure(proc)
                        .chunkCode(chunkCode)
                        .chunkType(chunkType)
                        .title(title)
                        .content(textContent)
                        .legalReference(proc.getProcedureName() + " - " + chunkType)
                        .headerPath(headerPath)
                        .sectionName(chunkType)
                        .contentHash(newHash)
                        .status("ACTIVE")
                        .build();

                if (aiModelClient != null) {
                    try {
                        String embedText = chunkingService.prepareTextForEmbedding(created);
                        AiModelClient.EmbeddingResult emb = aiModelClient.generateEmbeddingResult(embedText);
                        created.setEmbedding(aiModelClient.toPgVectorString(emb.vector()));
                        created.setEmbeddingModel(emb.modelId());
                        chunkRepository.save(created);
                    } catch (Exception e) {
                        log.warn("Embedding failed for new chunk {}: {}", chunkCode, e.getMessage());
                    }
                } else {
                    chunkRepository.save(created);
                }
            }
        }
    }

    private void updateProcedureTimeAndFeeMetadata(AdminProcedure proc, String thoiHanLePhi) {
        if (thoiHanLePhi == null || thoiHanLePhi.isBlank()) return;
        String[] lines = thoiHanLePhi.split("\\r?\\n");
        for (String line : lines) {
            String trimmed = line.trim();
            String lower = trimmed.toLowerCase(Locale.ROOT);
            if (lower.startsWith("thời hạn") || lower.startsWith("thoi han")) {
                int colon = trimmed.indexOf(':');
                if (colon != -1 && colon + 1 < trimmed.length()) {
                    proc.setProcessingTime(trimmed.substring(colon + 1).trim());
                }
            } else if (lower.startsWith("lệ phí") || lower.startsWith("le phi") || lower.startsWith("mức phí")) {
                int colon = trimmed.indexOf(':');
                if (colon != -1 && colon + 1 < trimmed.length()) {
                    proc.setFee(trimmed.substring(colon + 1).trim());
                }
            }
        }
        // If single-line or free-form fee update
        if (lines.length == 1 && (thoiHanLePhi.toLowerCase(Locale.ROOT).contains("đồng")
                || thoiHanLePhi.toLowerCase(Locale.ROOT).contains("miễn phí")
                || thoiHanLePhi.toLowerCase(Locale.ROOT).contains("vnđ"))) {
            proc.setFee(thoiHanLePhi.trim());
        }
    }

    public void validateFiveSectionsOrThrow(ProcedureContentDto content) {
        if (content == null) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Nội dung 5 mục chuẩn không được để trống.");
        }
        List<String> missing = new ArrayList<>();
        if (isBlank(content.getTrinhTu())) missing.add("trinh_tu (Trình tự thực hiện)");
        if (isBlank(content.getThanhPhanHoSo())) missing.add("thanh_phan_ho_so (Thành phần hồ sơ)");
        if (isBlank(content.getThoiHanLePhi())) missing.add("thoi_han_le_phi (Thời hạn & Lệ phí)");
        if (isBlank(content.getCoQuanThucHien())) missing.add("co_quan_thuc_hien (Cơ quan thực hiện)");
        if (isBlank(content.getCanCuPhapLy())) missing.add("can_cu_phap_ly (Căn cứ pháp lý)");

        if (!missing.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST,
                    "Không thể gửi duyệt/công bố: Thiếu mục bắt buộc trong khung 5 mục chuẩn: " + String.join(", ", missing));
        }
    }

    private AdminProcedure findProcedureOrThrow(String code) {
        if (code == null || code.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã thủ tục hành chính không được để trống.");
        }
        return procedureRepository.findByProcedureCode(code.trim())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy thủ tục hành chính: " + code));
    }

    private void requireAuthenticated(OfficerPrincipal principal) {
        if (principal == null || principal.badgeId() == null || principal.badgeId().isBlank()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Yêu cầu đăng nhập tài khoản Cán bộ / Quản trị viên.");
        }
    }

    private void requireAdmin(OfficerPrincipal principal) {
        requireAuthenticated(principal);
        if (!"ADMIN".equalsIgnoreCase(principal.role())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Thao tác này chỉ dành cho Quản trị viên (ROLE_ADMIN).");
        }
    }

    private AdminProcedureSummaryDto buildSummaryDto(AdminProcedure proc, List<ProcedureVersion> versions) {
        ProcedureVersion published = versions.stream()
                .filter(v -> "PUBLISHED".equalsIgnoreCase(v.getState()))
                .findFirst()
                .orElse(null);

        ProcedureContentDto content = published != null
                ? parseContent(published.getContent())
                : synthesizeContentFromProcedure(proc);

        int completeness = content.countFilledSections();
        int pendingCount = (int) versions.stream().filter(v -> "PENDING_REVIEW".equalsIgnoreCase(v.getState())).count();
        int draftCount = (int) versions.stream().filter(v -> "DRAFT".equalsIgnoreCase(v.getState())).count();

        return AdminProcedureSummaryDto.builder()
                .id(proc.getId())
                .procedureCode(proc.getProcedureCode())
                .portalCode(proc.getPortalCode())
                .procedureName(proc.getProcedureName())
                .category(proc.getCategory())
                .status(proc.getStatus())
                .formTemplateKey(proc.getFormTemplateKey() != null ? proc.getFormTemplateKey() : "GENERAL")
                .currentVersionNo(published != null ? published.getVersionNo() : 1)
                .publishedAt(published != null ? published.getPublishedAt() : proc.getUpdatedAt())
                .completeness(completeness)
                .complete(completeness == 5)
                .pendingProposalsCount(pendingCount)
                .draftProposalsCount(draftCount)
                .fee(proc.getFee())
                .processingTime(proc.getProcessingTime())
                .agency(proc.getAgency())
                .build();
    }

    private ProcedureVersionDto toVersionDto(AdminProcedure proc, ProcedureVersion v) {
        return ProcedureVersionDto.builder()
                .id(v.getId())
                .procedureCode(proc.getProcedureCode())
                .procedureName(proc.getProcedureName())
                .category(proc.getCategory())
                .versionNo(v.getVersionNo())
                .content(parseContent(v.getContent()))
                .contentHash(v.getContentHash())
                .state(v.getState())
                .createdBy(v.getCreatedBy())
                .createdAt(v.getCreatedAt())
                .submittedAt(v.getSubmittedAt())
                .reviewedBy(v.getReviewedBy())
                .reviewedAt(v.getReviewedAt())
                .reviewNote(v.getReviewNote())
                .publishedAt(v.getPublishedAt())
                .source(v.getSource())
                .sourceRef(v.getSourceRef())
                .build();
    }

    private ProcedureVersionDto buildSynthesizedV1Dto(AdminProcedure proc) {
        ProcedureContentDto content = synthesizeContentFromProcedure(proc);
        String json = serializeContent(content);
        return ProcedureVersionDto.builder()
                .id(proc.getCurrentVersionId())
                .procedureCode(proc.getProcedureCode())
                .procedureName(proc.getProcedureName())
                .category(proc.getCategory())
                .versionNo(1)
                .content(content)
                .contentHash(sha256Hex(json))
                .state("PUBLISHED")
                .createdBy("SYSTEM_SEED")
                .createdAt(proc.getCreatedAt())
                .submittedAt(proc.getCreatedAt())
                .reviewedBy("ADM-AG-0001")
                .reviewedAt(proc.getUpdatedAt())
                .reviewNote("Khởi tạo danh mục 40 TTHC chuẩn hóa phiên bản v1")
                .publishedAt(proc.getUpdatedAt())
                .source("MANUAL")
                .sourceRef(proc.getSourceUrl())
                .build();
    }

    public ProcedureContentDto synthesizeContentFromProcedure(AdminProcedure proc) {
        List<LegalChunk> chunks = chunkRepository != null && proc.getId() != null
                ? chunkRepository.findByProcedureId(proc.getId())
                : Collections.emptyList();

        String trinhTu = extractChunkText(chunks, "PROCESS_STEP",
                "Bước 1: Nộp hồ sơ tại Bộ phận Một cửa UBND cấp xã hoặc trực tuyến trên Cổng Dịch vụ công.\nBước 2: Công chức Một cửa kiểm tra tính hợp lệ, đầy đủ của hồ sơ.\nBước 3: Thẩm định, phê duyệt và trả kết quả theo phiếu hẹn.");
        String thanhPhan = extractChunkText(chunks, "REQUIRED_DOCUMENTS",
                "Tờ khai theo mẫu quy định; Bản chính Căn cước công dân hoặc VNeID mức độ 2; Các giấy tờ chứng minh liên quan.");
        String thoiHanLePhi = "Thời hạn giải quyết: " + (proc.getProcessingTime() != null ? proc.getProcessingTime() : "Theo quy định hiện hành")
                + "\nLệ phí: " + (proc.getFee() != null ? proc.getFee() : "Miễn phí / Theo quy định HĐND tỉnh An Giang");
        String coQuan = proc.getAgency() != null ? proc.getAgency() : "UBND cấp xã thuộc tỉnh An Giang";
        String canCu = extractChunkText(chunks, "LEGAL_BASIS",
                "Quyết định công bố danh mục TTHC chuẩn hóa năm 2026 của UBND tỉnh An Giang.");

        return ProcedureContentDto.builder()
                .trinhTu(trinhTu)
                .thanhPhanHoSo(thanhPhan)
                .thoiHanLePhi(thoiHanLePhi)
                .coQuanThucHien(coQuan)
                .canCuPhapLy(canCu)
                .build();
    }

    private String extractChunkText(List<LegalChunk> chunks, String type, String fallback) {
        if (chunks == null || chunks.isEmpty()) return fallback;
        StringBuilder sb = new StringBuilder();
        for (LegalChunk c : chunks) {
            if (type.equalsIgnoreCase(c.getChunkType())
                    || ("REQUIRED_DOCUMENTS".equals(type) && "REQUIRED_DOCS".equalsIgnoreCase(c.getChunkType()))) {
                if (!sb.isEmpty()) sb.append("\n\n");
                sb.append(c.getContent());
            }
        }
        return sb.isEmpty() ? fallback : sb.toString();
    }

    private ProposalDiffDto.FieldDiff buildFieldDiff(String key, String label, String oldVal, String newVal) {
        String cleanOld = oldVal != null ? oldVal.trim() : "";
        String cleanNew = newVal != null ? newVal.trim() : "";
        return ProposalDiffDto.FieldDiff.builder()
                .fieldKey(key)
                .fieldLabel(label)
                .oldValue(cleanOld)
                .newValue(cleanNew)
                .changed(!cleanOld.equals(cleanNew))
                .build();
    }

    private ProcedureContentDto sanitizeContent(ProcedureContentDto raw) {
        return ProcedureContentDto.builder()
                .trinhTu(sanitizeString(raw.getTrinhTu(), MAX_SECTION_LENGTH))
                .thanhPhanHoSo(sanitizeString(raw.getThanhPhanHoSo(), MAX_SECTION_LENGTH))
                .thoiHanLePhi(sanitizeString(raw.getThoiHanLePhi(), MAX_SECTION_LENGTH))
                .coQuanThucHien(sanitizeString(raw.getCoQuanThucHien(), MAX_SECTION_LENGTH))
                .canCuPhapLy(sanitizeString(raw.getCanCuPhapLy(), MAX_SECTION_LENGTH))
                .build();
    }

    private String sanitizeString(String input, int maxLen) {
        if (input == null) return "";
        String cleaned = input
                .replaceAll("(?i)<script[^>]*>[\\s\\S]*?</script>", "")
                .replaceAll("(?i)javascript\\s*:", "")
                .replaceAll("(?i)on\\w+\\s*=\\s*[\"'][^\"']*[\"']", "")
                .replaceAll("<[^>]+>", "")
                .trim();
        if (cleaned.length() > maxLen) {
            cleaned = cleaned.substring(0, maxLen);
        }
        return cleaned;
    }

    private String serializeContent(ProcedureContentDto dto) {
        try {
            return objectMapper.writeValueAsString(dto);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "Lỗi chuyển đổi dữ liệu JSONB: " + e.getMessage());
        }
    }

    private ProcedureContentDto parseContent(String json) {
        if (json == null || json.isBlank()) {
            return new ProcedureContentDto();
        }
        try {
            return objectMapper.readValue(json, ProcedureContentDto.class);
        } catch (Exception e) {
            log.warn("Failed to parse ProcedureContentDto from JSON: {}", e.getMessage());
            return new ProcedureContentDto();
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    public static String sha256Hex(String text) {
        if (text == null) return "";
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
