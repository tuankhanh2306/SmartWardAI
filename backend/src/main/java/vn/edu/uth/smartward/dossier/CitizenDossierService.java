package vn.edu.uth.smartward.dossier;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.rag.AdminProcedureRepository;
import vn.edu.uth.smartward.security.OfficerAuthService;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CitizenDossierService {

    private final CitizenDossierRepository dossierRepository;
    private final AdminProcedureRepository procedureRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public DossierSubmissionResponse submitDossier(SubmitDossierRequest req) {
        if (req.procedureCode() == null || req.procedureCode().isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã thủ tục hành chính không được để trống.");
        }
        if (req.wardCode() == null || req.wardCode().isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã xã/phường không được để trống.");
        }
        if (req.citizenCccd() == null || req.citizenCccd().isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Số CCCD công dân không được để trống.");
        }

        String normalizedCccd = req.citizenCccd().trim();
        String dossierCode = (req.dossierCode() != null && !req.dossierCode().isBlank())
                ? req.dossierCode().trim()
                : generateDossierCode(req.wardCode());

        // Check uniqueness if client provided custom dossierCode
        if (req.dossierCode() != null && !req.dossierCode().isBlank() && dossierRepository.existsByDossierCode(dossierCode)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã hồ sơ '" + dossierCode + "' đã tồn tại trên hệ thống.");
        }

        String procedureCode = req.procedureCode().trim();
        int workingDays = resolveStatutoryWorkingDays(procedureCode);
        Instant slaDeadline = calculateWorkingDayDeadline(Instant.now(), workingDays);

        String formDataJson = serializeToJson(req.formData(), "{}");
        String precheckReportJson = serializeToJson(req.precheckReport(), null);
        String vaultDocIdsJson = serializeToJson(req.vaultDocIds(), "[]");

        CitizenDossier entity = CitizenDossier.builder()
                .dossierCode(dossierCode)
                .procedureCode(procedureCode)
                .wardCode(req.wardCode().trim())
                .citizenCccd(normalizedCccd)
                .formData(formDataJson)
                .precheckReport(precheckReportJson)
                .vaultDocIds(vaultDocIdsJson)
                .status("PENDING")
                .slaDeadline(slaDeadline)
                .build();

        CitizenDossier saved = dossierRepository.save(entity);
        log.info("Citizen dossier submitted successfully: dossierCode={}, procedure={}, ward={}, cccd=****{}",
                saved.getDossierCode(), saved.getProcedureCode(), saved.getWardCode(),
                normalizedCccd.length() >= 4 ? normalizedCccd.substring(normalizedCccd.length() - 4) : normalizedCccd);

        return DossierSubmissionResponse.builder()
                .dossierCode(saved.getDossierCode())
                .procedureCode(saved.getProcedureCode())
                .wardCode(saved.getWardCode())
                .status(saved.getStatus())
                .slaDeadline(saved.getSlaDeadline())
                .createdAt(saved.getCreatedAt() != null ? saved.getCreatedAt() : Instant.now())
                .build();
    }

    @Transactional(readOnly = true)
    public DossierTrackingResponse trackDossier(String dossierCode, String last4Cccd, String citizenCccd) {
        if (dossierCode == null || dossierCode.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã hồ sơ không được để trống.");
        }

        String cleanCode = dossierCode.trim();
        CitizenDossier dossier = dossierRepository.findByDossierCodeIgnoreCase(cleanCode)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Không tìm thấy hồ sơ với mã: " + cleanCode));

        String targetLast4 = (last4Cccd != null && !last4Cccd.isBlank()) ? last4Cccd.trim() : null;
        if (targetLast4 == null && citizenCccd != null && !citizenCccd.isBlank()) {
            String cleanCccd = citizenCccd.trim();
            targetLast4 = cleanCccd.length() > 4 ? cleanCccd.substring(cleanCccd.length() - 4) : cleanCccd;
        }

        if (targetLast4 == null || targetLast4.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Vui lòng cung cấp 4 số cuối CCCD để tra cứu bảo mật.");
        }

        String entityCccd = dossier.getCitizenCccd() != null ? dossier.getCitizenCccd().trim() : "";
        if (!entityCccd.endsWith(targetLast4)) {
            log.warn("Unauthorized tracking attempt: dossierCode={}, inputLast4={}, entityCccdEnd={}",
                    cleanCode, targetLast4, entityCccd.length() >= 4 ? entityCccd.substring(entityCccd.length() - 4) : "NONE");
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND,
                    "Không tìm thấy hồ sơ hoặc 4 số cuối CCCD không trùng khớp với hồ sơ lưu trữ.");
        }

        String procedureName = resolveProcedureName(dossier.getProcedureCode());
        String maskedCccd = maskCccd(entityCccd);

        Object precheckObj = deserializeFromJson(dossier.getPrecheckReport());
        Object vaultObj = deserializeFromJson(dossier.getVaultDocIds());

        return DossierTrackingResponse.builder()
                .dossierCode(dossier.getDossierCode())
                .procedureCode(dossier.getProcedureCode())
                .procedureName(procedureName)
                .wardCode(dossier.getWardCode())
                .citizenCccd(maskedCccd)
                .status(dossier.getStatus())
                .slaDeadline(dossier.getSlaDeadline())
                .officerFeedback(dossier.getOfficerFeedback())
                .appointmentCode(dossier.getAppointmentCode())
                .precheckReport(precheckObj)
                .vaultDocIds(vaultObj)
                .createdAt(dossier.getCreatedAt())
                .updatedAt(dossier.getUpdatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<OfficerDossierDto> getOfficerDossiers(String wardCode, String status) {
        boolean hasWard = (wardCode != null && !wardCode.isBlank() && !"ALL".equalsIgnoreCase(wardCode.trim()));
        boolean hasStatus = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status.trim()));

        List<CitizenDossier> list;
        if (hasWard && hasStatus) {
            list = dossierRepository.findByWardCodeIgnoreCaseAndStatusIgnoreCaseOrderByCreatedAtDesc(wardCode.trim(), status.trim());
        } else if (hasWard) {
            list = dossierRepository.findByWardCodeIgnoreCaseOrderByCreatedAtDesc(wardCode.trim());
        } else if (hasStatus) {
            list = dossierRepository.findByStatusIgnoreCaseOrderByCreatedAtDesc(status.trim());
        } else {
            list = dossierRepository.findAllByOrderByCreatedAtDesc();
        }

        return list.stream().map(this::mapToOfficerDto).toList();
    }

    @Transactional
    public CitizenDossier reviewDossier(String dossierCode, OfficerReviewRequest req, OfficerAuthService.OfficerPrincipal principal) {
        if (dossierCode == null || dossierCode.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã hồ sơ không được để trống.");
        }

        CitizenDossier dossier = dossierRepository.findByDossierCodeIgnoreCase(dossierCode.trim())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Không tìm thấy hồ sơ: " + dossierCode));

        // Cross-ward tenant isolation defense
        if (principal != null && principal.wardCode() != null && !principal.wardCode().isBlank()) {
            String officerWard = principal.wardCode().trim();
            String dossierWard = dossier.getWardCode() != null ? dossier.getWardCode().trim() : "";
            if (!officerWard.equalsIgnoreCase(dossierWard)) {
                log.warn("Cross-ward unauthorized review blocked: officerWard={}, dossierWard={}", officerWard, dossierWard);
                throw new BusinessException(ErrorCode.FORBIDDEN,
                        "Cán bộ thuộc đơn vị " + officerWard + " không có thẩm quyền xử lý hồ sơ thuộc " + dossierWard + ".");
            }
        }

        String effectiveStatus = req.getEffectiveStatus();
        if (effectiveStatus == null || (!effectiveStatus.equals("APPROVED") && !effectiveStatus.equals("SUPPLEMENT_REQUIRED") && !effectiveStatus.equals("REJECTED"))) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST,
                    "Trạng thái phê duyệt không hợp lệ. Phải là APPROVED, SUPPLEMENT_REQUIRED hoặc REJECTED.");
        }

        String effectiveFeedback = req.getEffectiveFeedback();
        if (("REJECTED".equals(effectiveStatus) || "SUPPLEMENT_REQUIRED".equals(effectiveStatus)) && (effectiveFeedback == null || effectiveFeedback.isBlank())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "Bắt buộc phải nhập lý do/ý kiến khi từ chối hoặc yêu cầu bổ sung hồ sơ.");
        }

        dossier.setStatus(effectiveStatus);
        dossier.setOfficerFeedback(effectiveFeedback);
        if (req.appointmentCode() != null && !req.appointmentCode().isBlank()) {
            dossier.setAppointmentCode(req.appointmentCode().trim());
        }

        CitizenDossier saved = dossierRepository.save(dossier);
        log.info("Officer updated dossier: code={}, newStatus={}, appointment={}",
                saved.getDossierCode(), saved.getStatus(), saved.getAppointmentCode());
        return saved;
    }

    public OfficerDossierDto mapToOfficerDto(CitizenDossier dossier) {
        String procedureName = resolveProcedureName(dossier.getProcedureCode());
        Object formDataObj = deserializeFromJson(dossier.getFormData());
        Object precheckObj = deserializeFromJson(dossier.getPrecheckReport());
        Object vaultObj = deserializeFromJson(dossier.getVaultDocIds());

        String citizenName = extractCitizenName(formDataObj);

        return OfficerDossierDto.builder()
                .id(dossier.getId())
                .dossierCode(dossier.getDossierCode())
                .procedureCode(dossier.getProcedureCode())
                .procedureName(procedureName)
                .wardCode(dossier.getWardCode())
                .citizenCccd(dossier.getCitizenCccd())
                .citizenName(citizenName)
                .status(dossier.getStatus())
                .slaDeadline(dossier.getSlaDeadline())
                .officerFeedback(dossier.getOfficerFeedback())
                .appointmentCode(dossier.getAppointmentCode())
                .formData(formDataObj)
                .precheckReport(precheckObj)
                .vaultDocIds(vaultObj)
                .createdAt(dossier.getCreatedAt())
                .updatedAt(dossier.getUpdatedAt())
                .build();
    }

    public String generateDossierCode(String wardCode) {
        String cleanWard = (wardCode != null && !wardCode.isBlank())
                ? wardCode.trim().replaceAll("[^a-zA-Z0-9]", "").toUpperCase()
                : "WARD";
        if (cleanWard.startsWith("WARD")) {
            cleanWard = cleanWard.substring(4);
            if (cleanWard.isEmpty()) cleanWard = "AG";
        }
        String dateStr = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC).format(Instant.now());
        String prefix = "HS-" + dateStr + "-" + cleanWard + "-";

        long count = dossierRepository.countByDossierCodeStartingWith(prefix);
        String candidate = String.format("%s%04d", prefix, count + 1);
        int attempts = 0;
        while (dossierRepository.existsByDossierCode(candidate) && attempts < 100) {
            attempts++;
            candidate = String.format("%s%04d", prefix, count + 1 + attempts);
        }
        return candidate;
    }

    public static Instant calculateWorkingDayDeadline(Instant submissionTime, int workingDays) {
        ZonedDateTime current = submissionTime.atZone(ZoneOffset.UTC);
        int added = 0;
        while (added < workingDays) {
            current = current.plusDays(1);
            DayOfWeek dow = current.getDayOfWeek();
            boolean isWeekend = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY);
            boolean isNewYearDay = (current.getMonthValue() == 1 && current.getDayOfMonth() == 1);
            if (!isWeekend && !isNewYearDay) {
                added++;
            }
        }
        return current.withHour(17).withMinute(0).withSecond(0).withNano(0).toInstant();
    }

    private int resolveStatutoryWorkingDays(String procedureCode) {
        if (procedureCode == null) return 3;
        String clean = procedureCode.trim().toUpperCase();
        if (clean.contains("HT-01") || clean.contains("HT-13") || clean.contains("CR-02")) {
            return 1; // 1-day statutory SLA for Vital Civil Registrations (Birth / Death)
        }
        return 3;
    }

    private String resolveProcedureName(String procedureCode) {
        if (procedureCode == null || procedureCode.isBlank()) {
            return "Thủ tục hành chính cấp xã";
        }
        try {
            return procedureRepository.findByProcedureCode(procedureCode.trim())
                    .map(p -> p.getProcedureName())
                    .orElseGet(() -> mapFallbackProcedureName(procedureCode));
        } catch (Exception e) {
            return mapFallbackProcedureName(procedureCode);
        }
    }

    private String mapFallbackProcedureName(String code) {
        if (code == null) return "Thủ tục hành chính cấp xã";
        String c = code.trim().toUpperCase();
        if (c.contains("CR-01") || c.contains("HT-01")) return "Đăng ký khai sinh";
        if (c.contains("CR-02") || c.contains("HT-13")) return "Đăng ký khai tử liên thông";
        if (c.contains("CR-03") || c.contains("HT-02")) return "Đăng ký kết hôn";
        if (c.contains("CT-01")) return "Đăng ký thường trú";
        if (c.contains("DC-01")) return "Đăng ký biến động quyền sử dụng đất";
        if (c.contains("BT-01")) return "Trợ cấp xã hội hàng tháng";
        return "Thủ tục " + code;
    }

    private String maskCccd(String cccd) {
        if (cccd == null || cccd.length() < 4) return "************";
        String last4 = cccd.substring(cccd.length() - 4);
        return "********" + last4;
    }

    private String extractCitizenName(Object formDataObj) {
        if (formDataObj == null) return "CÔNG DÂN KÊ KHAI";
        try {
            if (formDataObj instanceof Map<?, ?> map) {
                for (String key : List.of("fullName", "citizenName", "hoTen", "childName", "husbandName", "wifeName")) {
                    Object val = map.get(key);
                    if (val instanceof String s && !s.isBlank()) return s.trim().toUpperCase();
                }
            }
            JsonNode node = objectMapper.valueToTree(formDataObj);
            for (String key : List.of("fullName", "citizenName", "hoTen", "childName", "husbandName", "wifeName")) {
                if (node.hasNonNull(key) && !node.get(key).asText().isBlank()) {
                    return node.get(key).asText().trim().toUpperCase();
                }
            }
        } catch (Exception ignored) {}
        return "CÔNG DÂN KÊ KHAI";
    }

    private String serializeToJson(Object obj, String defaultValue) {
        if (obj == null) return defaultValue;
        if (obj instanceof String s) {
            String trimmed = s.trim();
            if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
        }
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.warn("Failed to serialize object to JSON string: {}", e.getMessage());
            return defaultValue;
        }
    }

    private Object deserializeFromJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<Object>() {});
        } catch (Exception e) {
            return json;
        }
    }
}
