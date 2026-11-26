package vn.edu.uth.smartward.rag;

import lombok.extern.slf4j.Slf4j;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.common.QueryCacheService;
import vn.edu.uth.smartward.rag.dto.HitlGrayZoneItemDto;
import vn.edu.uth.smartward.rag.dto.LegalCitationDto;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Extracted from RagQueryService (TASK-019): Manages the Human-in-the-Loop (HITL)
 * gray-zone review queue with PostgreSQL persistence and in-memory test fallback.
 */
@Slf4j
final class RagHitlQueueManager {

    private final List<HitlGrayZoneItemDto> fallbackQueue = new CopyOnWriteArrayList<>(defaultSeedHitlItems());

    synchronized void enqueueGrayZoneItem(HitlGrayZoneRepository hitlRepository,
                                          String query,
                                          String wardName,
                                          double similarityScore,
                                          LegalChunkMatch topCandidate,
                                          String draftGuidance) {
        if (query == null || query.isBlank()) return;
        String effectiveWard = (wardName != null && !wardName.isBlank()) ? wardName : "Phường Mỹ Bình";
        double roundedScore = Math.round(similarityScore * 1000.0) / 1000.0;
        String chunkCode = topCandidate != null ? topCandidate.getChunkCode() : "UNKNOWN";
        String procName = topCandidate != null ? topCandidate.getProcedureName() : "Thủ tục hành chính cấp xã";
        String legalRef = topCandidate != null ? topCandidate.getLegalReference() : "Đang rà soát";
        String createdAt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));

        if (hitlRepository != null) {
            if (hitlRepository.existsByQueryIgnoreCase(query)) {
                return;
            }
            String id = "HITL-AG-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
            HitlGrayZoneItem entity = HitlGrayZoneItem.builder()
                    .id(id)
                    .query(query)
                    .wardName(effectiveWard)
                    .similarityScore(roundedScore)
                    .candidateChunkCode(chunkCode)
                    .candidateProcedureName(procName)
                    .legalReference(legalRef)
                    .suggestedAnswer(draftGuidance)
                    .status("PENDING")
                    .createdAt(createdAt)
                    .build();
            hitlRepository.save(entity);
            return;
        }

        boolean alreadyExists = fallbackQueue.stream().anyMatch(item -> query.equalsIgnoreCase(item.getQuery()));
        if (alreadyExists) return;

        String id = "HITL-AG-" + String.format(Locale.US, "%03d", fallbackQueue.size() + 1);
        HitlGrayZoneItemDto newItem = HitlGrayZoneItemDto.builder()
                .id(id)
                .query(query)
                .wardName(effectiveWard)
                .similarityScore(roundedScore)
                .candidateChunkCode(chunkCode)
                .candidateProcedureName(procName)
                .legalReference(legalRef)
                .suggestedAnswer(draftGuidance)
                .status("PENDING")
                .createdAt(createdAt)
                .build();

        fallbackQueue.add(0, newItem);
        while (fallbackQueue.size() > 50) {
            fallbackQueue.remove(fallbackQueue.size() - 1);
        }
    }

    List<HitlGrayZoneItemDto> getHitlQueue(HitlGrayZoneRepository hitlRepository) {
        if (hitlRepository != null) {
            return hitlRepository.findAllByOrderByCreatedAtTsDesc().stream()
                    .map(RagHitlQueueManager::toHitlDto)
                    .toList();
        }
        return Collections.unmodifiableList(fallbackQueue);
    }

    HitlGrayZoneItemDto resolveHitlItem(HitlGrayZoneRepository hitlRepository,
                                        QueryCacheService queryCacheService,
                                        double defaultThreshold,
                                        String id,
                                        String approvedAnswer,
                                        String officerName) {
        String effectiveOfficer = (officerName != null && !officerName.isBlank())
                ? officerName.trim() : "Cán bộ Một cửa";

        HitlGrayZoneItemDto updated = null;
        if (hitlRepository != null) {
            HitlGrayZoneItem entity = hitlRepository.findById(id)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND,
                            "Không tìm thấy yêu cầu vùng xám với mã: " + id));
            entity.setSuggestedAnswer(approvedAnswer.trim());
            entity.setStatus("APPROVED");
            entity.setResolvedBy(effectiveOfficer);
            updated = toHitlDto(hitlRepository.save(entity));
        } else {
            for (int i = 0; i < fallbackQueue.size(); i++) {
                HitlGrayZoneItemDto item = fallbackQueue.get(i);
                if (item.getId().equalsIgnoreCase(id)) {
                    updated = HitlGrayZoneItemDto.builder()
                            .id(item.getId())
                            .query(item.getQuery())
                            .wardName(item.getWardName())
                            .similarityScore(item.getSimilarityScore())
                            .candidateChunkCode(item.getCandidateChunkCode())
                            .candidateProcedureName(item.getCandidateProcedureName())
                            .legalReference(item.getLegalReference())
                            .suggestedAnswer(approvedAnswer.trim())
                            .status("APPROVED")
                            .createdAt(item.getCreatedAt())
                            .resolvedBy(effectiveOfficer)
                            .build();
                    fallbackQueue.set(i, updated);
                    break;
                }
            }
            if (updated == null) {
                throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy yêu cầu vùng xám với mã: " + id);
            }
        }

        LegalCitationDto citation = LegalCitationDto.builder()
                .chunkCode(updated.getCandidateChunkCode())
                .procedureName(updated.getCandidateProcedureName())
                .legalReference(updated.getLegalReference())
                .similarityScore(updated.getSimilarityScore())
                .build();

        RagAskResponse verifiedResponse = RagAskResponse.builder()
                .answer(updated.getSuggestedAnswer())
                .abstained(false)
                .maxSimilarity(updated.getSimilarityScore())
                .appliedThreshold(defaultThreshold)
                .citations(List.of(citation))
                .cached(true)
                .suggestions(List.of("👶 Đăng ký khai sinh", "💍 Đăng ký kết hôn", "🏠 Đăng ký thường trú (CT01)", "📋 Xem 40 thủ tục"))
                .responseTimeMs(5)
                .disclaimer(RagQueryService.LEGAL_DISCLAIMER)
                .build();

        String ward = updated.getWardName() != null ? updated.getWardName().trim() : "";
        queryCacheService.putResponse(updated.getQuery(), verifiedResponse, 86400);
        if (!ward.isEmpty()) {
            queryCacheService.putResponse(updated.getQuery() + "::" + ward, verifiedResponse, 86400);
        }
        log.info("[HITL_RESOLVED] Item {} approved by '{}' and cached for query: '{}' (ward: '{}')",
                id, effectiveOfficer, RagPromptAndCitationHelper.truncate(updated.getQuery(), 40), ward);
        return updated;
    }

    private static HitlGrayZoneItemDto toHitlDto(HitlGrayZoneItem entity) {
        return HitlGrayZoneItemDto.builder()
                .id(entity.getId())
                .query(entity.getQuery())
                .wardName(entity.getWardName())
                .similarityScore(entity.getSimilarityScore())
                .candidateChunkCode(entity.getCandidateChunkCode())
                .candidateProcedureName(entity.getCandidateProcedureName())
                .legalReference(entity.getLegalReference())
                .suggestedAnswer(entity.getSuggestedAnswer())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .resolvedBy(entity.getResolvedBy())
                .build();
    }

    private static List<HitlGrayZoneItemDto> defaultSeedHitlItems() {
        return List.of(
                HitlGrayZoneItemDto.builder()
                        .id("HITL-AG-001")
                        .query("Ba tôi già yếu đi lại khó khăn thì xã có cử người xuống tận nhà lăn tay chứng thực chữ ký được không?")
                        .wardName("Phường Mỹ Bình")
                        .similarityScore(0.612)
                        .candidateChunkCode("TTHC-CT-02-DIEU24")
                        .candidateProcedureName("Chứng thực chữ ký trong các giấy tờ, văn bản")
                        .legalReference("Khoản 2 Điều 10 & Điều 24 Nghị định 23/2015/NĐ-CP")
                        .suggestedAnswer("1. TÓM TẮT THỦ TỤC:\nNgười yêu cầu chứng thực già yếu, không thể đi lại được phép yêu cầu UBND cấp xã thực hiện chứng thực chữ ký ngoài trụ sở (tại nhà riêng).\n\n2. THÀNH PHẦN HỒ SƠ:\n- Bản chính CCCD của người yêu cầu chứng thực.\n- Văn bản, giấy tờ cần chứng thực chữ ký (điểm chỉ).\n\n3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n- Giải quyết trong ngày nhận yêu cầu.\n- Miễn thu chi phí đi lại ngoài trụ sở đối với người già yếu không thể đi lại theo quy định.\n\n4. NƠI TIẾP NHẬN & XỬ LÝ:\n- Bộ phận Một cửa UBND xã/phường tiếp nhận thông tin và cử công chức Tư pháp - Hộ tịch đến xác minh trực tiếp.\n\n5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n- Khoản 2 Điều 10 và Điều 24 Nghị định 23/2015/NĐ-CP [TTHC-CT-02-DIEU24].")
                        .status("PENDING")
                        .createdAt("2026-11-05 08:40")
                        .build(),
                HitlGrayZoneItemDto.builder()
                        .id("HITL-AG-002")
                        .query("Vợ chồng tôi làm mất giấy đăng ký kết hôn bản gốc từ năm 1998 ở xã cũ trước khi sáp nhập thì xin trích lục hay đăng ký lại?")
                        .wardName("Phường Long Xuyên")
                        .similarityScore(0.568)
                        .candidateChunkCode("TTHC-HT-05-DIEU24")
                        .candidateProcedureName("Đăng ký lại kết hôn / Cấp bản sao trích lục hộ tịch")
                        .legalReference("Điều 24 Nghị định 123/2015/NĐ-CP")
                        .suggestedAnswer("1. TÓM TẮT THỦ TỤC:\n- Nếu Sổ đăng ký kết hôn năm 1998 tại UBND xã vẫn còn lưu trữ: Thực hiện thủ tục Cấp bản sao trích lục kết hôn.\n- Nếu cả bản chính Giấy chứng nhận kết hôn và Sổ hộ tịch gốc đều bị mất/hư hỏng: Thực hiện thủ tục Đăng ký lại kết hôn.\n\n2. THÀNH PHẦN HỒ SƠ:\n- Tờ khai theo mẫu quy định.\n- Bản sao giấy tờ, tài liệu chứng minh quan hệ vợ chồng (nếu đăng ký lại).\n\n3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n- Trích lục bản sao: Giải quyết ngay trong ngày.\n- Đăng ký lại kết hôn: 05 ngày làm việc.\n\n4. NƠI TIẾP NHẬN & XỬ LÝ:\n- Bộ phận Một cửa UBND xã/phường nơi đã đăng ký trước đây hoặc nơi thường trú hiện tại.\n\n5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n- Điều 24 Nghị định 123/2015/NĐ-CP [TTHC-HT-05-DIEU24].")
                        .status("PENDING")
                        .createdAt("2026-11-05 09:15")
                        .build(),
                HitlGrayZoneItemDto.builder()
                        .id("HITL-AG-003")
                        .query("Cháu ngoại về ở nhà ông bà ngoại để đi học cấp 2 thì khai báo tạm trú hay nhập hộ khẩu thường trú?")
                        .wardName("Xã An Phú")
                        .similarityScore(0.645)
                        .candidateChunkCode("TTHC-CR-01-DIEU20")
                        .candidateProcedureName("Đăng ký thường trú / Đăng ký tạm trú (Mẫu CT01)")
                        .legalReference("Khoản 2 Điều 20 Luật Cư trú 2020")
                        .suggestedAnswer("1. TÓM TẮT THỦ TỤC:\nNgười chưa thành niên được đăng ký thường trú hoặc tạm trú tại chỗ ở hợp pháp của ông bà ngoại nếu được cha, mẹ hoặc người giám hộ và chủ hộ (ông bà ngoại) đồng ý.\n\n2. THÀNH PHẦN HỒ SƠ:\n- Tờ khai thay đổi thông tin cư trú (Mẫu CT01) có ý kiến đồng ý của cha mẹ và chủ hộ.\n- Giấy tờ chứng minh mối quan hệ nhân thân với chủ hộ (Giấy khai sinh của mẹ và của cháu).\n\n3. THỜI HẠN GIẢI QUYẾT & LỆ PHÍ:\n- Thường trú: 07 ngày làm việc; Tạm trú: 03 ngày làm việc.\n\n4. NƠI TIẾP NHẬN & XỬ LÝ:\n- Công an cấp xã hoặc Cổng Dịch vụ công Bộ Công an / ứng dụng VNeID.\n\n5. CĂN CỨ PHÁP LÝ & LƯU Ý:\n- Khoản 2 Điều 20 Luật Cư trú 2020 [TTHC-CR-01-DIEU20].")
                        .status("APPROVED")
                        .createdAt("2026-11-05 07:50")
                        .resolvedBy("Cán bộ Trần Thị Hương")
                        .build()
        );
    }
}
