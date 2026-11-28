package vn.edu.uth.smartward.dossier;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.common.RedisRateLimiter;
import vn.edu.uth.smartward.dossier.dto.*;
import vn.edu.uth.smartward.rag.AdminProcedure;
import vn.edu.uth.smartward.rag.AdminProcedureRepository;
import vn.edu.uth.smartward.security.OfficerAuthService;
import vn.edu.uth.smartward.security.SigningDelegation;
import vn.edu.uth.smartward.security.SigningDelegationService;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class CitizenDossierService {

    private record Routing(String mode, String group) {}
    private static final Routing DEFAULT_ROUTING = new Routing("", "");
    private static final Map<String, Routing> ROUTING = loadRouting();

    private static Map<String, Routing> loadRouting() {
        var resolver = new org.springframework.core.io.support.PathMatchingResourcePatternResolver();
        var mapper = new ObjectMapper();
        Map<String, Routing> modes = new java.util.HashMap<>();
        try {
            for (var resource : resolver.getResources("classpath:db/seed/procedures/*.json")) {
                try (var input = resource.getInputStream()) {
                    JsonNode seed = mapper.readTree(input);
                    modes.put(seed.required("procedureCode").asText(), new Routing(seed.required("submissionMode").asText(), seed.required("workflowGroup").asText()));
                }
            }
        } catch (java.io.IOException error) {
            throw new IllegalStateException("Không đọc được danh mục định tuyến", error);
        }
        if (modes.isEmpty()) throw new IllegalStateException("Danh mục định tuyến trống");
        return Map.copyOf(modes);
    }
    private static final Set<String> ALLOWED_OFFICER_TARGET_STATUSES = Set.of(
            "RECEIVED",
            "OFFICIALLY_ACCEPTED",
            "UNDER_APPRAISAL",
            "PENDING_UBND_SIGNATURE",
            "TRANSFERRED_AWAITING_DECISION",
            "CENTER_SIGNED",
            "READY_FOR_RETURN",
            "COMPLETED",
            "APPROVED",
            "SUPPLEMENT_REQUIRED",
            "REJECTED"
    );

    private final CitizenDossierRepository dossierRepository;
    private final AdminProcedureRepository procedureRepository;
    private final ObjectMapper objectMapper;
    private final RedisRateLimiter rateLimiter;
    private final DossierEventRepository dossierEventRepository;
    private final vn.edu.uth.smartward.audit.AuditService auditService;
    private final vn.edu.uth.smartward.notification.PushNotificationService pushNotificationService;
    private final SigningDelegationService signingDelegationService;
    private record CachedIdempotencyEntry(String payloadHash, DossierSubmissionResponse response) {}
    private static final int MAX_IDEMPOTENCY_CACHE_SIZE = 1000;
    private final Map<String, CachedIdempotencyEntry> idempotencyCache = new java.util.concurrent.ConcurrentHashMap<>();

    public static final java.time.ZoneId VN_ZONE = java.time.ZoneId.of("Asia/Ho_Chi_Minh");

    @Autowired
    public CitizenDossierService(CitizenDossierRepository dossierRepository,
                                 AdminProcedureRepository procedureRepository,
                                 ObjectMapper objectMapper,
                                 @Autowired(required = false) RedisRateLimiter rateLimiter,
                                 @Autowired(required = false) DossierEventRepository dossierEventRepository,
                                 @Autowired(required = false) vn.edu.uth.smartward.audit.AuditService auditService,
                                 @Autowired(required = false) vn.edu.uth.smartward.notification.PushNotificationService pushNotificationService,
                                 @Autowired(required = false) SigningDelegationService signingDelegationService) {
        this.dossierRepository = dossierRepository;
        this.procedureRepository = procedureRepository;
        this.objectMapper = objectMapper;
        this.rateLimiter = rateLimiter;
        this.dossierEventRepository = dossierEventRepository;
        this.auditService = auditService;
        this.pushNotificationService = pushNotificationService;
        this.signingDelegationService = signingDelegationService;
    }

    public CitizenDossierService(CitizenDossierRepository dossierRepository,
                                 AdminProcedureRepository procedureRepository,
                                 ObjectMapper objectMapper,
                                 RedisRateLimiter rateLimiter,
                                 DossierEventRepository dossierEventRepository,
                                 vn.edu.uth.smartward.audit.AuditService auditService,
                                 vn.edu.uth.smartward.notification.PushNotificationService pushNotificationService) {
        this(dossierRepository, procedureRepository, objectMapper, rateLimiter, dossierEventRepository, auditService, pushNotificationService, null);
    }

    public CitizenDossierService(CitizenDossierRepository dossierRepository,
                                 AdminProcedureRepository procedureRepository,
                                 ObjectMapper objectMapper,
                                 RedisRateLimiter rateLimiter,
                                 DossierEventRepository dossierEventRepository,
                                 vn.edu.uth.smartward.audit.AuditService auditService) {
        this(dossierRepository, procedureRepository, objectMapper, rateLimiter, dossierEventRepository, auditService, null);
    }

    public CitizenDossierService(CitizenDossierRepository dossierRepository,
                                 AdminProcedureRepository procedureRepository,
                                 ObjectMapper objectMapper,
                                 RedisRateLimiter rateLimiter) {
        this(dossierRepository, procedureRepository, objectMapper, rateLimiter, null, null);
    }

    public CitizenDossierService(CitizenDossierRepository dossierRepository,
                                 AdminProcedureRepository procedureRepository,
                                 ObjectMapper objectMapper) {
        this(dossierRepository, procedureRepository, objectMapper, null, null, null);
    }

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

        String procedureCode = req.procedureCode().trim().toUpperCase();
        String wardCode = req.wardCode().trim();
        String normalizedCccd = req.citizenCccd().trim();
        if (!normalizedCccd.matches("^\\d{12}$")) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Số CCCD công dân phải gồm đúng 12 chữ số.");
        }

        validateProcedureAndFormData(procedureCode, req.formData());

        String formDataJson = serializeToJson(req.formData(), "{}");
        String precheckReportJson = serializeToJson(req.precheckReport(), null);
        String vaultDocIdsJson = serializeToJson(req.vaultDocIds(), "[]");
        String cleanIdempKey = (req.idempotencyKey() != null && !req.idempotencyKey().isBlank())
                ? req.idempotencyKey().trim()
                : null;
        String payloadHash = computeSubmissionPayloadHash(procedureCode, wardCode, normalizedCccd, req.formData());

        if (cleanIdempKey != null) {
            Optional<CitizenDossier> existingOpt = dossierRepository.findByIdempotencyKey(cleanIdempKey);
            if (existingOpt.isPresent()) {
                return verifyAndBuildIdempotentResponse(existingOpt.get(), payloadHash, cleanIdempKey);
            }
            CachedIdempotencyEntry cachedEntry = idempotencyCache.get(cleanIdempKey);
            if (cachedEntry != null) {
                if (cachedEntry.payloadHash() != null && !cachedEntry.payloadHash().equals(payloadHash)) {
                    throw new BusinessException(
                            ErrorCode.CONFLICT,
                            "Khóa chống gửi trùng (idempotencyKey) đã được sử dụng cho một nội dung hồ sơ khác. Vui lòng tạo lượt gửi mới."
                    );
                }
                return cachedEntry.response();
            }
        }

        // Check duplicate if client passed a custom dossierCode
        if (req.dossierCode() != null && !req.dossierCode().isBlank() && dossierRepository.existsByDossierCode(req.dossierCode().trim())) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã hồ sơ '" + req.dossierCode().trim() + "' đã tồn tại trên hệ thống.");
        }

        // SEC-04: Server strictly generates dossier code with unpredictable suffix; client cannot dictate code
        String dossierCode = generateDossierCode(wardCode);

        Integer workingDays = resolveStatutoryWorkingDays(procedureCode);
        Instant slaDeadline = (workingDays != null && workingDays > 0)
                ? calculateWorkingDayDeadline(Instant.now(), workingDays, VN_ZONE)
                : null;
        if ("EXTERNAL_CHANNEL_ONLY".equals(ROUTING.getOrDefault(procedureCode, DEFAULT_ROUTING).mode())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Thủ tục này được nộp qua kênh chuyên ngành hoặc liên thông.");
        }
        String routingChannel = "TTPVHCC_UBND";

        CitizenDossier entity = CitizenDossier.builder()
                .dossierCode(dossierCode)
                .procedureCode(procedureCode)
                .wardCode(wardCode)
                .citizenCccd(normalizedCccd)
                .formData(formDataJson)
                .precheckReport(precheckReportJson)
                .vaultDocIds(vaultDocIdsJson)
                .status("PENDING")
                .slaDeadline(slaDeadline)
                .idempotencyKey(cleanIdempKey)
                .payloadHash(payloadHash)
                .routingChannel(routingChannel)
                .build();

        CitizenDossier saved;
        try {
            saved = dossierRepository.saveAndFlush(entity);
            if (saved == null) {
                saved = dossierRepository.save(entity);
            }
        } catch (org.springframework.dao.DataIntegrityViolationException dupEx) {
            if (cleanIdempKey != null) {
                Optional<CitizenDossier> raced = dossierRepository.findByIdempotencyKey(cleanIdempKey);
                if (raced.isPresent()) {
                    return verifyAndBuildIdempotentResponse(raced.get(), payloadHash, cleanIdempKey);
                }
            }
            throw dupEx;
        }

        log.info("Citizen dossier submitted successfully: dossierCode={}, procedure={}, ward={}",
                saved.getDossierCode(), saved.getProcedureCode(), saved.getWardCode());

        DossierSubmissionResponse response = DossierSubmissionResponse.builder()
                .dossierCode(saved.getDossierCode())
                .procedureCode(saved.getProcedureCode())
                .wardCode(saved.getWardCode())
                .status(saved.getStatus())
                .slaDeadline(saved.getSlaDeadline())
                .createdAt(saved.getCreatedAt() != null ? saved.getCreatedAt() : Instant.now())
                .vaultDocIds(deserializeStringList(saved.getVaultDocIds()))
                .routingChannel(saved.getRoutingChannel() != null ? saved.getRoutingChannel() : routingChannel)
                .qrKind(resolveQrKind(saved))
                .receiptVerified(isReceiptVerified(saved))
                .build();

        if (cleanIdempKey != null) {
            if (idempotencyCache.size() >= MAX_IDEMPOTENCY_CACHE_SIZE) {
                idempotencyCache.clear();
            }
            idempotencyCache.put(cleanIdempKey, new CachedIdempotencyEntry(payloadHash, response));
        }

        return response;
    }

    private DossierSubmissionResponse verifyAndBuildIdempotentResponse(
            CitizenDossier existing, String incomingPayloadHash, String idempotencyKey) {
        if (existing.getPayloadHash() != null && !existing.getPayloadHash().equals(incomingPayloadHash)) {
            throw new BusinessException(
                    ErrorCode.CONFLICT,
                    "Khóa chống gửi trùng (idempotencyKey) đã được sử dụng cho một nội dung hồ sơ khác. Vui lòng tạo lượt gửi mới."
            );
        }
        log.info("Returning persisted idempotent dossier '{}' for key={}", existing.getDossierCode(), idempotencyKey);
        return DossierSubmissionResponse.builder()
                .dossierCode(existing.getDossierCode())
                .procedureCode(existing.getProcedureCode())
                .wardCode(existing.getWardCode())
                .status(existing.getStatus())
                .slaDeadline(existing.getSlaDeadline())
                .createdAt(existing.getCreatedAt() != null ? existing.getCreatedAt() : Instant.now())
                .vaultDocIds(deserializeStringList(existing.getVaultDocIds()))
                .routingChannel(existing.getRoutingChannel() != null ? existing.getRoutingChannel() : "TTPVHCC_UBND")
                .qrKind(resolveQrKind(existing))
                .receiptVerified(isReceiptVerified(existing))
                .build();
    }

    private void validateProcedureAndFormData(String procedureCode, Object rawFormData) {
        if (!procedureCode.matches("^TTHC-[A-Z]{2,4}-\\d{2}$")) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "Mã thủ tục hành chính '" + procedureCode + "' không đúng định dạng chuẩn (TTHC-XX-NN).");
        }
        if ("REFERENCE_ONLY".equals(ROUTING.getOrDefault(procedureCode, DEFAULT_ROUTING).mode())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "Thủ tục '" + procedureCode + "' hiện chỉ hỗ trợ tra cứu hướng dẫn (đang chờ xác minh quy trình tại An Giang hoặc thuộc thẩm quyền ngoài cấp xã), chưa mở nộp hồ sơ sơ duyệt.");
        }
        if (rawFormData == null) return;
        JsonNode node = objectMapper.valueToTree(rawFormData);
        if (node == null || !node.isObject()) return;

        String formType = node.path("formType").asText("").trim().toUpperCase();
        if (!formType.isEmpty()) {
            boolean mappingOk = switch (formType) {
                case "TK-KS" -> "TTHC-HT-01".equals(procedureCode);
                case "CT01" -> "TTHC-CR-01".equals(procedureCode);
                case "TK-KH" -> "TTHC-HT-02".equals(procedureCode) || "TTHC-HT-11".equals(procedureCode);
                case "TK-BTXH" -> "TTHC-BT-01".equals(procedureCode);
                default -> false;
            };
            if (!mappingOk) {
                throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                        "Loại tờ khai '" + formType + "' không khớp với mã thủ tục '" + procedureCode + "'.");
            }
        }

        if ("TK-KS".equals(formType)) {
            requireJsonField(node, List.of("fullName", "childName"), "Họ và tên trẻ");
            requireJsonField(node, List.of("dob", "dateOfBirth"), "Ngày sinh của trẻ");
            requireJsonField(node, List.of("motherName"), "Họ và tên người mẹ");
            requireJsonField(node, List.of("childBirthPlace"), "Nơi sinh của trẻ");
            requireJsonField(node, List.of("birthCertNumber"), "Số Giấy chứng sinh");
        }
    }

    private void requireJsonField(JsonNode node, List<String> keys, String label) {
        for (String k : keys) {
            String v = node.path(k).asText("").trim();
            if (!v.isEmpty()) return;
        }
        throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                "Thiếu thông tin bắt buộc trên tờ khai Khai sinh: " + label + ".");
    }

    private String computeSubmissionPayloadHash(String procedureCode, String wardCode, String cccd, Object formData) {
        try {
            ObjectMapper sortedMapper = objectMapper.copy()
                    .configure(com.fasterxml.jackson.databind.SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
            JsonNode tree = formData != null ? sortedMapper.valueToTree(formData) : sortedMapper.createObjectNode();
            String canonicalForm = sortedMapper.writeValueAsString(tree);
            String canonical = procedureCode + "|" + wardCode.toUpperCase() + "|" + cccd + "|" + canonicalForm;
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(canonical.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            return Integer.toHexString((procedureCode + "|" + wardCode + "|" + cccd).hashCode());
        }
    }

    /**
     * TASK-051: Read-only audit of legacy dossiers whose stored formData.formType
     * disagrees with procedureCode (never mutates historical records).
     */
    @Transactional(readOnly = true)
    public List<String> auditLegacyMismatchedDossiers() {
        List<CitizenDossier> all = dossierRepository.findAllByOrderByCreatedAtDesc();
        List<String> mismatches = new java.util.ArrayList<>();
        for (CitizenDossier d : all) {
            if (d.getFormData() == null || d.getFormData().isBlank()) continue;
            try {
                JsonNode node = objectMapper.readTree(d.getFormData());
                String formType = node.path("formType").asText("").trim().toUpperCase();
                if (formType.isEmpty()) continue;
                String proc = d.getProcedureCode() != null ? d.getProcedureCode().trim().toUpperCase() : "";
                boolean ok = switch (formType) {
                    case "TK-KS" -> "TTHC-HT-01".equals(proc);
                    case "CT01" -> "TTHC-CR-01".equals(proc);
                    case "TK-KH" -> "TTHC-HT-02".equals(proc) || "TTHC-HT-11".equals(proc);
                    case "TK-BTXH" -> "TTHC-BT-01".equals(proc);
                    default -> true;
                };
                if (!ok) {
                    mismatches.add(d.getDossierCode() + ":" + formType + "!=" + proc);
                }
            } catch (Exception ignored) {
            }
        }
        return mismatches;
    }

    @Transactional(readOnly = true)
    public DossierTrackingResponse trackDossier(String dossierCode, String last4Cccd, String clientIpOrLegacyCccd) {
        return trackDossier(dossierCode, last4Cccd, clientIpOrLegacyCccd, null, null);
    }

    @Transactional(readOnly = true)
    public DossierTrackingResponse trackDossier(String dossierCode, String last4Cccd, String clientIpOrLegacyCccd,
                                                String officerBadgeId, String sessionId) {
        if (dossierCode == null || dossierCode.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã hồ sơ không được để trống.");
        }

        String effectiveLast4 = (last4Cccd != null && !last4Cccd.isBlank()) ? last4Cccd.trim() : null;
        String clientIp = "127.0.0.1";

        if (clientIpOrLegacyCccd != null && !clientIpOrLegacyCccd.isBlank()) {
            String trimmed = clientIpOrLegacyCccd.trim();
            if (trimmed.length() >= 4 && trimmed.matches("^\\d+$")) {
                if (effectiveLast4 == null) {
                    effectiveLast4 = trimmed.substring(trimmed.length() - 4);
                }
            } else {
                clientIp = trimmed;
            }
        }

        if (effectiveLast4 == null || effectiveLast4.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Vui lòng cung cấp 4 số cuối CCCD để tra cứu bảo mật.");
        }

        // SEC-04: Strict 4-digit regex validation
        if (!effectiveLast4.matches("^\\d{4}$")) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "4 số cuối CCCD phải bao gồm đúng 4 chữ số (0-9).");
        }

        String cleanCode = dossierCode.trim();

        // SEC-04 & TASK-016: Rate limiting 5 attempts per 15 minutes per (JWT / sessionId / IP, dossierCode)
        if (rateLimiter != null) {
            boolean hasActorOverride = (officerBadgeId != null && !officerBadgeId.isBlank())
                    || (sessionId != null && !sessionId.isBlank());
            boolean allowed = hasActorOverride
                    ? rateLimiter.allowDossierTracking(clientIp, cleanCode, officerBadgeId, sessionId)
                    : rateLimiter.allowDossierTracking(clientIp, cleanCode);
            if (!allowed) {
                log.warn("Rate limit exceeded for dossier tracking (officer={}, hasSession={}, ip={})",
                        officerBadgeId != null ? officerBadgeId : "-", sessionId != null, clientIp);
                throw new BusinessException(ErrorCode.RATE_LIMIT_EXCEEDED,
                        "Bạn đã tra cứu sai quá 5 lần trong 15 phút. Vui lòng thử lại sau 15 phút.");
            }
        }

        final String GENERIC_NOT_FOUND_MSG = "Không tìm thấy hồ sơ hoặc 4 số cuối CCCD không trùng khớp với hồ sơ lưu trữ.";

        Optional<CitizenDossier> optionalDossier = dossierRepository.findByDossierCodeIgnoreCase(cleanCode);
        if (optionalDossier.isEmpty()) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, GENERIC_NOT_FOUND_MSG);
        }

        CitizenDossier dossier = optionalDossier.get();
        String entityCccd = dossier.getCitizenCccd() != null ? dossier.getCitizenCccd().trim() : "";
        if (entityCccd.length() < 4) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, GENERIC_NOT_FOUND_MSG);
        }

        String entityLast4 = entityCccd.substring(entityCccd.length() - 4);

        // SEC-04: Constant-time comparison to prevent timing attacks
        boolean match = MessageDigest.isEqual(
                entityLast4.getBytes(StandardCharsets.UTF_8),
                effectiveLast4.getBytes(StandardCharsets.UTF_8)
        );

        if (!match) {
            // SEC-04: Zero PII logging - never log input last4 or stored CCCD
            log.warn("Dossier tracking verification failed: 4-digit CCCD mismatch for dossierCode={}", cleanCode);
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, GENERIC_NOT_FOUND_MSG);
        }

        List<DossierEvent> timeline = (dossierEventRepository != null)
                ? dossierEventRepository.findByDossierCodeOrderByCreatedAtAsc(cleanCode)
                : java.util.Collections.emptyList();

        return buildTrackingResponse(dossier, timeline);
    }

    /**
     * TASK-054: Citizen submits supplemental information/documents into a dossier currently in SUPPLEMENT_REQUIRED.
     * Verifies 4-digit CCCD with rate limiting + constant-time check, non-destructively preserves history,
     * appends a new DossierEvent, and transitions status to SUPPLEMENTED.
     */
    @Transactional
    public DossierTrackingResponse submitSupplement(
            String dossierCode,
            DossierSupplementRequest req,
            String clientIp,
            String officerBadgeId,
            String sessionId) {
        if (dossierCode == null || dossierCode.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã hồ sơ không được để trống.");
        }
        String last4 = (req != null && req.last4Cccd() != null) ? req.last4Cccd().trim() : "";
        if (!last4.matches("^\\d{4}$")) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Vui lòng cung cấp đúng 4 số cuối CCCD để xác thực bổ sung hồ sơ.");
        }

        String cleanCode = dossierCode.trim();
        String resolvedIp = (clientIp != null && !clientIp.isBlank()) ? clientIp.trim() : "127.0.0.1";

        if (rateLimiter != null) {
            boolean hasActorOverride = (officerBadgeId != null && !officerBadgeId.isBlank())
                    || (sessionId != null && !sessionId.isBlank());
            boolean allowed = hasActorOverride
                    ? rateLimiter.allowDossierTracking(resolvedIp, cleanCode, officerBadgeId, sessionId)
                    : rateLimiter.allowDossierTracking(resolvedIp, cleanCode);
            if (!allowed) {
                throw new BusinessException(ErrorCode.RATE_LIMIT_EXCEEDED,
                        "Bạn đã thao tác sai quá 5 lần trong 15 phút. Vui lòng thử lại sau 15 phút.");
            }
        }

        final String genericNotFoundMsg = "Không tìm thấy hồ sơ hoặc 4 số cuối CCCD không trùng khớp với hồ sơ lưu trữ.";
        CitizenDossier dossier = dossierRepository.findByDossierCodeIgnoreCase(cleanCode)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, genericNotFoundMsg));

        String entityCccd = dossier.getCitizenCccd() != null ? dossier.getCitizenCccd().trim() : "";
        if (entityCccd.length() < 4) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, genericNotFoundMsg);
        }
        String entityLast4 = entityCccd.substring(entityCccd.length() - 4);
        boolean match = MessageDigest.isEqual(
                entityLast4.getBytes(StandardCharsets.UTF_8),
                last4.getBytes(StandardCharsets.UTF_8)
        );
        if (!match) {
            log.warn("Dossier supplement verification failed: 4-digit CCCD mismatch for dossierCode={}", cleanCode);
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, genericNotFoundMsg);
        }

        String currentStatus = dossier.getStatus() != null ? dossier.getStatus().trim().toUpperCase() : "PENDING";
        if (!"SUPPLEMENT_REQUIRED".equals(currentStatus)) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Hồ sơ hiện đang ở trạng thái " + currentStatus + ", không ở trạng thái yêu cầu bổ sung (SUPPLEMENT_REQUIRED).");
        }

        String note = req.citizenNote() != null ? req.citizenNote().trim() : "";
        Map<String, Object> safeUpdatedFields = new java.util.LinkedHashMap<>();
        if (req.updatedFields() != null) {
            for (Map.Entry<String, Object> entry : req.updatedFields().entrySet()) {
                if (entry.getKey() == null || entry.getKey().isBlank()) continue;
                String k = entry.getKey().trim();
                if ("formType".equalsIgnoreCase(k) || "procedureCode".equalsIgnoreCase(k)) continue;
                Object val = entry.getValue();
                if (val != null && !String.valueOf(val).trim().isEmpty()) {
                    safeUpdatedFields.put(k, val);
                }
            }
        }

        List<String> cleanNewDocs = new java.util.ArrayList<>();
        if (req.additionalVaultDocIds() != null) {
            for (String docId : req.additionalVaultDocIds()) {
                if (docId != null && !docId.isBlank()) {
                    cleanNewDocs.add(docId.trim());
                }
            }
        }

        if (note.length() < 5 && safeUpdatedFields.isEmpty() && cleanNewDocs.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "Vui lòng nhập nội dung giải trình/bổ sung tối thiểu 5 ký tự hoặc đính kèm tài liệu bổ sung.");
        }

        int nextRound = (dossier.getSupplementCount() != null ? dossier.getSupplementCount() : 0) + 1;
        Instant now = Instant.now();

        // Non-destructive update to formData JSON: preserve existing fields & append supplementHistory entry
        com.fasterxml.jackson.databind.node.ObjectNode formObj;
        try {
            JsonNode parsed = (dossier.getFormData() != null && !dossier.getFormData().isBlank())
                    ? objectMapper.readTree(dossier.getFormData())
                    : objectMapper.createObjectNode();
            formObj = (parsed != null && parsed.isObject())
                    ? (com.fasterxml.jackson.databind.node.ObjectNode) parsed
                    : objectMapper.createObjectNode();
        } catch (Exception e) {
            formObj = objectMapper.createObjectNode();
        }
        for (Map.Entry<String, Object> entry : safeUpdatedFields.entrySet()) {
            formObj.set(entry.getKey(), objectMapper.valueToTree(entry.getValue()));
        }
        com.fasterxml.jackson.databind.node.ArrayNode historyArr = formObj.has("supplementHistory") && formObj.get("supplementHistory").isArray()
                ? (com.fasterxml.jackson.databind.node.ArrayNode) formObj.get("supplementHistory")
                : objectMapper.createArrayNode();
        com.fasterxml.jackson.databind.node.ObjectNode roundNode = objectMapper.createObjectNode();
        roundNode.put("round", nextRound);
        roundNode.put("submittedAt", now.toString());
        if (!note.isEmpty()) {
            roundNode.put("citizenNote", note);
        }
        if (!safeUpdatedFields.isEmpty()) {
            roundNode.set("updatedKeys", objectMapper.valueToTree(safeUpdatedFields.keySet()));
        }
        roundNode.put("additionalDocCount", cleanNewDocs.size());
        historyArr.add(roundNode);
        formObj.set("supplementHistory", historyArr);
        dossier.setFormData(serializeToJson(formObj, "{}"));

        // Non-destructive append of additionalVaultDocIds (deduplicated)
        if (!cleanNewDocs.isEmpty()) {
            java.util.LinkedHashSet<String> mergedDocs = new java.util.LinkedHashSet<>(deserializeStringList(dossier.getVaultDocIds()));
            mergedDocs.addAll(cleanNewDocs);
            dossier.setVaultDocIds(serializeToJson(new java.util.ArrayList<>(mergedDocs), "[]"));
        }

        dossier.setStatus("SUPPLEMENTED");
        dossier.setSupplementedAt(now);
        dossier.setSupplementCount(nextRound);

        CitizenDossier saved = dossierRepository.save(dossier);

        StringBuilder eventReason = new StringBuilder();
        eventReason.append("Công dân đã gửi bổ sung lần ").append(nextRound);
        if (!note.isEmpty()) {
            eventReason.append(": ").append(note);
        }
        if (!cleanNewDocs.isEmpty()) {
            eventReason.append(" (+").append(cleanNewDocs.size()).append(" tài liệu đính kèm)");
        }

        if (dossierEventRepository != null) {
            DossierEvent event = DossierEvent.builder()
                    .dossierCode(saved.getDossierCode())
                    .who("CITIZEN")
                    .fromStatus("SUPPLEMENT_REQUIRED")
                    .toStatus("SUPPLEMENTED")
                    .reason(eventReason.toString())
                    .build();
            dossierEventRepository.save(event);
        }

        if (auditService != null) {
            auditService.logAction(
                    "CITIZEN",
                    saved.getWardCode(),
                    "DOSSIER_CITIZEN_SUPPLEMENT",
                    "DOSSIER",
                    saved.getDossierCode(),
                    resolvedIp,
                    null
            );
        }

        List<DossierEvent> timeline = (dossierEventRepository != null)
                ? dossierEventRepository.findByDossierCodeOrderByCreatedAtAsc(cleanCode)
                : java.util.Collections.emptyList();

        return buildTrackingResponse(saved, timeline);
    }

    private DossierTrackingResponse buildTrackingResponse(CitizenDossier dossier, List<DossierEvent> timeline) {
        String entityCccd = dossier.getCitizenCccd() != null ? dossier.getCitizenCccd().trim() : "";
        return DossierTrackingResponse.builder()
                .dossierCode(dossier.getDossierCode())
                .procedureCode(dossier.getProcedureCode())
                .procedureName(resolveProcedureName(dossier.getProcedureCode()))
                .wardCode(dossier.getWardCode())
                .citizenCccd(maskCccd(entityCccd))
                .status(dossier.getStatus())
                .slaDeadline(dossier.getSlaDeadline())
                .officerFeedback(dossier.getOfficerFeedback())
                .appointmentCode(dossier.getAppointmentCode())
                .precheckReport(deserializeFromJson(dossier.getPrecheckReport()))
                .vaultDocIds(deserializeFromJson(dossier.getVaultDocIds()))
                .createdAt(dossier.getCreatedAt())
                .updatedAt(dossier.getUpdatedAt())
                .timeline(timeline)
                .requestedSupplementItems(deserializeStringList(dossier.getRequestedSupplementItems()))
                .supplementedAt(dossier.getSupplementedAt())
                .supplementCount(dossier.getSupplementCount() != null ? dossier.getSupplementCount() : 0)
                .routingChannel(dossier.getRoutingChannel() != null ? dossier.getRoutingChannel() : "TTPVHCC_UBND")
                .receivingAgency(dossier.getReceivingAgency())
                .officialReceiptNo(dossier.getOfficialReceiptNo())
                .receiptVerifiedAt(dossier.getReceiptVerifiedAt())
                .qrKind(resolveQrKind(dossier))
                .receiptVerified(isReceiptVerified(dossier))
                .build();
    }

    @Transactional(readOnly = true)
    public DossierTrackingResponse trackDossier(String dossierCode, String last4Cccd) {
        return trackDossier(dossierCode, last4Cccd, "127.0.0.1");
    }

    @Transactional(readOnly = true)
    public List<OfficerDossierDto> getOfficerDossiers(String wardCode, String status) {
        boolean hasWard = (wardCode != null && !wardCode.isBlank() && !"ALL".equalsIgnoreCase(wardCode.trim()));
        boolean hasStatus = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status.trim()));
        boolean filterNearDeadline = hasStatus && "NEAR_DEADLINE".equalsIgnoreCase(status.trim());

        List<CitizenDossier> list;
        if (filterNearDeadline) {
            List<CitizenDossier> base = hasWard
                    ? dossierRepository.findByWardCodeIgnoreCaseOrderByCreatedAtDesc(wardCode.trim())
                    : dossierRepository.findAllByOrderByCreatedAtDesc();
            Instant threshold = Instant.now().plus(java.time.Duration.ofHours(24));
            list = base.stream()
                    .filter(d -> {
                        String st = d.getStatus() != null ? d.getStatus().trim().toUpperCase() : "PENDING";
                        boolean terminal = "APPROVED".equals(st) || "REJECTED".equals(st);
                        return !terminal && d.getSlaDeadline() != null && !d.getSlaDeadline().isAfter(threshold);
                    })
                    .toList();
        } else if (hasWard && hasStatus) {
            list = dossierRepository.findByWardCodeIgnoreCaseAndStatusIgnoreCaseOrderByCreatedAtDesc(wardCode.trim(), status.trim());
        } else if (hasWard) {
            list = dossierRepository.findByWardCodeIgnoreCaseOrderByCreatedAtDesc(wardCode.trim());
        } else if (hasStatus) {
            list = dossierRepository.findByStatusIgnoreCaseOrderByCreatedAtDesc(status.trim());
        } else {
            list = dossierRepository.findAllByOrderByCreatedAtDesc();
        }

        if (auditService != null) {
            auditService.logAction(
                    wardCode != null ? wardCode.trim() : "OFFICER",
                    wardCode != null ? wardCode.trim() : "ALL",
                    "DOSSIER_LIST_VIEW",
                    "DOSSIER",
                    null,
                    "127.0.0.1",
                    null
            );
        }

        return list.stream()
                .filter(d -> !isExternalDossier(d))
                .map(this::mapToOfficerDto)
                .toList();
    }

    private boolean isExternalDossier(CitizenDossier dossier) {
        if (dossier == null) return false;
        String channel = dossier.getRoutingChannel() != null ? dossier.getRoutingChannel().trim().toUpperCase() : "";
        if ("POLICE_EXTERNAL".equals(channel)) return true;
        String proc = dossier.getProcedureCode() != null ? dossier.getProcedureCode().trim().toUpperCase() : "";
        return "EXTERNAL_CHANNEL_ONLY".equals(ROUTING.getOrDefault(proc, DEFAULT_ROUTING).mode());
    }

    private boolean isReceiptVerified(CitizenDossier dossier) {
        if (dossier == null) return false;
        return dossier.getOfficialReceiptNo() != null
                && !dossier.getOfficialReceiptNo().isBlank()
                && dossier.getReceivingAgency() != null
                && !dossier.getReceivingAgency().isBlank();
    }

    private String resolveQrKind(CitizenDossier dossier) {
        return isReceiptVerified(dossier) ? "SW_RECEIPT" : "SW_DRAFT";
    }

    /**
     * MOB-0.5: Officer counter QR pass lookup supporting:
     * - Full SmartWard QR payload: SMARTWARD_PASS|{dossierCode}|{appointmentCode}|{wardCode}
     * - Direct dossier code: HS-...
     * - Direct appointment code: LH-YYYYMMDD-XXXX
     * Enforces SEC-09 strict ward isolation and masks citizen CCCD.
     */
    @Transactional(readOnly = true)
    public OfficerDossierDto lookupOfficerDossierByQr(String rawCode, OfficerAuthService.OfficerPrincipal principal) {
        if (rawCode == null || rawCode.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã QR hoặc mã phiếu hẹn không được để trống.");
        }

        if (principal != null && "ADMIN".equalsIgnoreCase(principal.role())) {
            throw new BusinessException(
                    ErrorCode.FORBIDDEN,
                    "Quản trị viên không truy cập trực tiếp quầy thẩm định hồ sơ cấp xã."
            );
        }

        String trimmed = rawCode.trim();
        String candidateDossierCode = null;
        String candidateAppointmentCode = null;

        Optional<CitizenDossier> found = Optional.empty();
        if (trimmed.startsWith("SW_RECEIPT|")) {
            String[] fields = trimmed.split("\\|", -1);
            if (fields.length != 4 || principal == null || principal.wardCode() == null) {
                throw new BusinessException(ErrorCode.INVALID_REQUEST, "Biên nhận hoặc đơn vị tra cứu không hợp lệ.");
            }
            List<CitizenDossier> matches = dossierRepository
                    .findTop2ByWardCodeIgnoreCaseAndReceivingAgencyIgnoreCaseAndOfficialReceiptNoIgnoreCaseAndReceiptVerifiedAtIsNotNull(
                            principal.wardCode(), fields[2], fields[1]);
            if (matches.size() > 1) throw new BusinessException(ErrorCode.CONFLICT, "Trùng số biên nhận. Hãy tra bằng mã hồ sơ.");
            found = matches.stream().findFirst();
        } else if (trimmed.startsWith("SW_DRAFT|")) {
            String[] fields = trimmed.split("\\|", -1);
            if (fields.length != 3 && fields.length != 4) throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã bản nháp không hợp lệ.");
            candidateDossierCode = fields[1];
        } else if (trimmed.toUpperCase().startsWith("SMARTWARD_PASS|")) {
            String[] parts = trimmed.split("\\|", -1);
            if (parts.length > 1 && !parts[1].isBlank()) {
                candidateDossierCode = parts[1].trim();
            }
            if (parts.length > 2 && !parts[2].isBlank()) {
                candidateAppointmentCode = parts[2].trim();
            }
        } else if (trimmed.toUpperCase().startsWith("LH-")) {
            candidateAppointmentCode = trimmed;
        } else {
            candidateDossierCode = trimmed;
            candidateAppointmentCode = trimmed;
        }

        if (candidateDossierCode != null && !candidateDossierCode.isBlank()) {
            found = dossierRepository.findByDossierCodeIgnoreCase(candidateDossierCode);
        }
        if (found.isEmpty() && candidateAppointmentCode != null && !candidateAppointmentCode.isBlank()) {
            found = dossierRepository.findByAppointmentCodeIgnoreCase(candidateAppointmentCode);
        }

        CitizenDossier dossier = found.orElseThrow(() -> new BusinessException(
                ErrorCode.RESOURCE_NOT_FOUND,
                "Không tìm thấy hồ sơ tương ứng với mã QR / lịch hẹn: " + trimmed
        ));

        // SEC-09: Strict Ward Isolation
        if (principal != null && principal.wardCode() != null && !principal.wardCode().isBlank()) {
            String officerWard = principal.wardCode().trim();
            String dossierWard = dossier.getWardCode() != null ? dossier.getWardCode().trim() : "";
            if (!officerWard.equalsIgnoreCase(dossierWard)) {
                log.warn("SEC-09: Officer '{}' of ward '{}' attempted cross-ward QR lookup for dossier '{}' (ward '{}').",
                        principal.badgeId(), officerWard, dossier.getDossierCode(), dossierWard);
                if (auditService != null) {
                    auditService.logAction(principal.badgeId(), officerWard, "CROSS_WARD_QR_LOOKUP_BLOCKED",
                            "DOSSIER", dossier.getDossierCode(), "127.0.0.1", null);
                }
                throw new BusinessException(
                        ErrorCode.FORBIDDEN,
                        "SEC-09: Cán bộ thuộc đơn vị " + officerWard + " không có quyền tra cứu phiếu hẹn thuộc đơn vị " + dossierWard + "."
                );
            }
        }

        if (auditService != null) {
            String actor = principal != null ? principal.badgeId() : "OFFICER";
            String ward = principal != null && principal.wardCode() != null ? principal.wardCode() : dossier.getWardCode();
            auditService.logAction(actor, ward, "DOSSIER_QR_LOOKUP", "DOSSIER", dossier.getDossierCode(), "127.0.0.1", null);
        }

        return mapToOfficerDto(dossier);
    }

    @Transactional
    public CitizenDossier reviewDossier(String dossierCode, OfficerReviewRequest req, OfficerAuthService.OfficerPrincipal principal) {
        if (dossierCode == null || dossierCode.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã hồ sơ không được để trống.");
        }

        CitizenDossier dossier = dossierRepository.findByDossierCodeIgnoreCase(dossierCode.trim())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Không tìm thấy hồ sơ: " + dossierCode));

        // 1. Cross-ward tenant isolation defense & Admin non-interference (SEC-09 & 5.3)
        if (principal != null && "ADMIN".equalsIgnoreCase(principal.role())) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "Quản trị viên chỉ có quyền xem dữ liệu liên xã, không được phép duyệt hồ sơ thay cán bộ cấp xã.");
        }
        if (principal != null && principal.wardCode() != null && !principal.wardCode().isBlank()) {
            String officerWard = principal.wardCode().trim();
            String dossierWard = dossier.getWardCode() != null ? dossier.getWardCode().trim() : "";
            if (!officerWard.equalsIgnoreCase(dossierWard)) {
                log.warn("Cross-ward unauthorized review blocked: officerWard={}, dossierWard={}", officerWard, dossierWard);
                if (auditService != null) {
                    auditService.logAction(principal.badgeId(), officerWard, "CROSS_WARD_REVIEW_BLOCKED", "DOSSIER", dossierCode, "127.0.0.1", null);
                }
                throw new BusinessException(ErrorCode.FORBIDDEN,
                        "Cán bộ thuộc đơn vị " + officerWard + " không có thẩm quyền xử lý hồ sơ thuộc " + dossierWard + ".");
            }
        }

        if (isExternalDossier(dossier)) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Hồ sơ này thuộc kênh chuyên ngành hoặc liên thông.");
        }
        String effectiveStatus = req.getEffectiveStatus();
        if (effectiveStatus == null || !ALLOWED_OFFICER_TARGET_STATUSES.contains(effectiveStatus)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST,
                    "Trạng thái phê duyệt không hợp lệ: " + effectiveStatus);
        }

        // 2. Strict State Machine Transition Rules (5.5 + 2026 TTPVHCC/UBND Reform)
        String oldStatus = dossier.getStatus() != null ? dossier.getStatus().trim().toUpperCase() : "PENDING";
        if (("APPROVED".equals(oldStatus) && !"OFFICIALLY_ACCEPTED".equals(effectiveStatus)) || "COMPLETED".equals(oldStatus) || "REJECTED".equals(oldStatus)) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Hồ sơ đã ở trạng thái kết thúc (" + oldStatus + "), không thể tiếp tục thay đổi trạng thái.");
        }
        if (oldStatus.equals(effectiveStatus)) {
            throw new BusinessException(ErrorCode.CONFLICT,
                    "Hồ sơ hiện đã ở trạng thái " + effectiveStatus + ".");
        }

        boolean transitionAllowed = switch (effectiveStatus) {
            case "OFFICIALLY_ACCEPTED", "RECEIVED", "APPROVED" -> Set.of("PENDING", "RECEIVED", "APPROVED", "SUPPLEMENTED").contains(oldStatus);
            case "UNDER_APPRAISAL" -> "OFFICIALLY_ACCEPTED".equals(oldStatus);
            case "TRANSFERRED_AWAITING_DECISION" -> "UNDER_APPRAISAL".equals(oldStatus)
                    && "W4".equals(ROUTING.getOrDefault(dossier.getProcedureCode(), DEFAULT_ROUTING).group());
            case "PENDING_UBND_SIGNATURE" -> "UNDER_APPRAISAL".equals(oldStatus);
            case "CENTER_SIGNED" -> Set.of("OFFICIALLY_ACCEPTED", "UNDER_APPRAISAL", "PENDING_UBND_SIGNATURE").contains(oldStatus);
            case "READY_FOR_RETURN" -> Set.of("PENDING_UBND_SIGNATURE", "CENTER_SIGNED", "TRANSFERRED_AWAITING_DECISION").contains(oldStatus);
            case "COMPLETED" -> "READY_FOR_RETURN".equals(oldStatus);
            default -> !Set.of("READY_FOR_RETURN", "CENTER_SIGNED").contains(oldStatus);
        };
        if (!transitionAllowed) {
            throw new BusinessException(ErrorCode.CONFLICT, "Không thể chuyển hồ sơ từ " + oldStatus + " sang " + effectiveStatus + ".");
        }

        String effectiveFeedback = req.getEffectiveFeedback();
        if (("REJECTED".equals(effectiveStatus) || "SUPPLEMENT_REQUIRED".equals(effectiveStatus))
                && (effectiveFeedback == null || effectiveFeedback.isBlank())) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "Bắt buộc phải nhập lý do/ý kiến khi từ chối hoặc yêu cầu bổ sung hồ sơ.");
        }

        String reqAgency = req.receivingAgency() != null ? req.receivingAgency().trim() : "";
        String reqReceiptNo = req.officialReceiptNo() != null ? req.officialReceiptNo().trim() : "";
        if ("OFFICIALLY_ACCEPTED".equals(effectiveStatus)) {
            if (reqAgency.isEmpty() || reqReceiptNo.isEmpty() || reqAgency.contains("|") || reqReceiptNo.contains("|") || reqReceiptNo.length() > 64 || reqAgency.length() > 255) {
                throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                        "Phải ghi nhận đầy đủ Cơ quan tiếp nhận và Mã số biên nhận chính thức trước khi chuyển trạng thái Đã tiếp nhận.");
            }
            if (dossier.getReceiptVerifiedAt() != null && (!reqAgency.equals(dossier.getReceivingAgency())
                    || !reqReceiptNo.equals(dossier.getOfficialReceiptNo()))) {
                throw new BusinessException(ErrorCode.CONFLICT, "Biên nhận đã xác nhận phải giữ nguyên số và cơ quan tiếp nhận.");
            }
            dossier.setReceivingAgency(reqAgency);
            dossier.setOfficialReceiptNo(reqReceiptNo);
            if (dossier.getReceiptVerifiedAt() == null) {
                dossier.setReceiptVerifiedAt(Instant.now());
            }
        } else if (!reqAgency.isEmpty() || !reqReceiptNo.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Chỉ ghi biên nhận ở bước xác nhận tiếp nhận.");
        }

        if ("CENTER_SIGNED".equals(effectiveStatus)) {
            if (signingDelegationService == null) {
                throw new BusinessException(ErrorCode.FORBIDDEN,
                        "Chức năng ký ủy quyền tại Trung tâm PVHCC chưa sẵn sàng do thiếu dịch vụ kiểm tra văn bản ủy quyền.");
            }
            SigningDelegation verifiedDelegation = signingDelegationService.verifyDelegatedSigningAuthority(
                    principal, dossier.getProcedureCode(), Instant.now()
            );
            if (effectiveFeedback == null || effectiveFeedback.isBlank()) {
                effectiveFeedback = "Đã ký theo ủy quyền (" + verifiedDelegation.getDecisionNumber() + ")";
            }
        }

        dossier.setStatus(effectiveStatus);
        dossier.setOfficerFeedback(effectiveFeedback);
        if ("SUPPLEMENT_REQUIRED".equals(effectiveStatus)) {
            List<String> cleanedItems = new java.util.ArrayList<>();
            if (req.requestedItems() != null) {
                for (String item : req.requestedItems()) {
                    if (item != null && !item.isBlank()) {
                        cleanedItems.add(item.trim());
                        if (cleanedItems.size() >= 10) break;
                    }
                }
            }
            dossier.setRequestedSupplementItems(serializeToJson(cleanedItems, "[]"));
        }
        if (req.appointmentCode() != null && !req.appointmentCode().isBlank()) {
            dossier.setAppointmentCode(req.appointmentCode().trim());
        }

        CitizenDossier saved = dossierRepository.save(dossier);
        log.info("Officer updated dossier: code={}, fromStatus={}, toStatus={}, appointment={}",
                saved.getDossierCode(), oldStatus, saved.getStatus(), saved.getAppointmentCode());

        // 3. Record Dossier Event History (5.5)
        if (dossierEventRepository != null) {
            DossierEvent event = DossierEvent.builder()
                    .dossierCode(saved.getDossierCode())
                    .who(principal != null ? principal.badgeId() : "OFFICER")
                    .fromStatus(oldStatus)
                    .toStatus(effectiveStatus)
                    .reason(effectiveFeedback)
                    .build();
            dossierEventRepository.save(event);
        }

        // 4. Record Immutable Audit Log (5.4)
        if (auditService != null) {
            auditService.logAction(
                    principal != null ? principal.badgeId() : "OFFICER",
                    saved.getWardCode(),
                    "DOSSIER_REVIEW_" + effectiveStatus,
                    "DOSSIER",
                    saved.getDossierCode(),
                    "127.0.0.1",
                    null
            );
        }

        // 5. Trigger Mobile Push Notification (TASK-023)
        if (pushNotificationService != null) {
            pushNotificationService.notifyDossierStatusChanged(saved, oldStatus, effectiveFeedback);
        }

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
                .citizenCccd(maskCccd(dossier.getCitizenCccd()))
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
                .requestedSupplementItems(deserializeStringList(dossier.getRequestedSupplementItems()))
                .supplementedAt(dossier.getSupplementedAt())
                .supplementCount(dossier.getSupplementCount() != null ? dossier.getSupplementCount() : 0)
                .routingChannel(dossier.getRoutingChannel() != null ? dossier.getRoutingChannel() : "TTPVHCC_UBND")
                .receivingAgency(dossier.getReceivingAgency())
                .officialReceiptNo(dossier.getOfficialReceiptNo())
                .receiptVerifiedAt(dossier.getReceiptVerifiedAt())
                .qrKind(resolveQrKind(dossier))
                .receiptVerified(isReceiptVerified(dossier))
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

    /**
     * Statutory Vietnamese Lunar public holidays for 2026-2027 (Labor Code 2019 Art. 111 & 112):
     * - 2026 Tet Binh Ngo (5 working days: Mon 16/02 -> Fri 20/02/2026) & Hung Kings' Commemoration (Sun 26/04 + Mon 27/04 compensatory)
     * - 2027 Tet Dinh Mui (Fri 05/02 -> Thu 11/02/2027 incl. weekend compensatory days) & Hung Kings' Commemoration (Fri 16/04/2027)
     */
    private static final java.util.Set<java.time.LocalDate> VIETNAM_LUNAR_PUBLIC_HOLIDAYS = java.util.Set.of(
            // 2026 Tết Nguyên Đán Bính Ngọ (29 tháng Chạp -> Mùng 4 Tết)
            java.time.LocalDate.of(2026, 2, 16),
            java.time.LocalDate.of(2026, 2, 17),
            java.time.LocalDate.of(2026, 2, 18),
            java.time.LocalDate.of(2026, 2, 19),
            java.time.LocalDate.of(2026, 2, 20),
            // 2026 Giỗ Tổ Hùng Vương (10/3 ÂL rơi vào Chủ Nhật 26/04 -> nghỉ bù Thứ Hai 27/04)
            java.time.LocalDate.of(2026, 4, 26),
            java.time.LocalDate.of(2026, 4, 27),
            // 2027 Tết Nguyên Đán Đinh Mùi (29 tháng Chạp 05/02 -> Mùng 4 09/02 + 2 ngày nghỉ bù 10-11/02)
            java.time.LocalDate.of(2027, 2, 5),
            java.time.LocalDate.of(2027, 2, 6),
            java.time.LocalDate.of(2027, 2, 7),
            java.time.LocalDate.of(2027, 2, 8),
            java.time.LocalDate.of(2027, 2, 9),
            java.time.LocalDate.of(2027, 2, 10),
            java.time.LocalDate.of(2027, 2, 11),
            // 2027 Giỗ Tổ Hùng Vương (10/3 ÂL = Thứ Sáu 16/04/2027)
            java.time.LocalDate.of(2027, 4, 16)
    );

    public static Instant calculateWorkingDayDeadline(Instant submissionTime, int workingDays) {
        return calculateWorkingDayDeadline(submissionTime, workingDays, ZoneOffset.UTC);
    }

    public static Instant calculateWorkingDayDeadline(Instant submissionTime, int workingDays, java.time.ZoneId zoneId) {
        if (submissionTime == null) {
            submissionTime = Instant.now();
        }
        if (workingDays <= 0) {
            workingDays = 1;
        }
        if (zoneId == null) {
            zoneId = ZoneOffset.UTC;
        }

        ZonedDateTime current = submissionTime.atZone(zoneId);
        int added = 0;
        while (added < workingDays) {
            current = current.plusDays(1);
            DayOfWeek dow = current.getDayOfWeek();
            boolean isWeekend = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY);

            // Statutory Vietnamese Public Holidays: Solar (1/1, 30/4, 1/5, 2-3/9) + Lunar (Tet & Hung Kings 2026-2027)
            int month = current.getMonthValue();
            int day = current.getDayOfMonth();
            boolean isSolarHoliday = (month == 1 && day == 1)
                    || (month == 4 && day == 30)
                    || (month == 5 && day == 1)
                    || (month == 9 && (day == 2 || day == 3));
            boolean isLunarHoliday = VIETNAM_LUNAR_PUBLIC_HOLIDAYS.contains(current.toLocalDate());

            if (!isWeekend && !isSolarHoliday && !isLunarHoliday) {
                added++;
            }
        }
        // Strict 17:00:00 (5:00 PM) business day cutoff (6.2)
        return current.withHour(17).withMinute(0).withSecond(0).withNano(0).toInstant();
    }

    /**
     * Resolves verified statutory SLA working days strictly from DB configuration.
     * Returns NULL when sla_working_days has not been verified/configured so the UI displays
     * "Chưa xác định (chờ cán bộ Một cửa xác nhận)" instead of a guessed deadline.
     */
    private Integer resolveStatutoryWorkingDays(String procedureCode) {
        if (procedureCode == null || procedureCode.isBlank() || procedureRepository == null) {
            return null;
        }
        try {
            return procedureRepository.findByProcedureCode(procedureCode.trim())
                    .map(AdminProcedure::getSlaWorkingDays)
                    .filter(days -> days != null && days > 0)
                    .orElse(null);
        } catch (Exception e) {
            return null;
        }
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
        if (code == null) return "Thủ tục hành chính";
        String c = code.trim().toUpperCase();
        if (c.contains("CR-01")) return "Đăng ký thường trú";
        if (c.contains("CR-02")) return "Liên thông điện tử: Khai tử, xóa đăng ký thường trú, mai táng phí, tử tuất";
        if (c.contains("CR-03")) return "Đăng ký tạm trú";
        if (c.contains("HT-01")) return "Đăng ký khai sinh";
        if (c.contains("HT-02")) return "Đăng ký kết hôn";
        if (c.contains("HT-11")) return "Cấp Giấy xác nhận tình trạng hôn nhân";
        if (c.contains("HT-13")) return "Đăng ký khai tử (trong nước)";
        if (c.contains("CT-01")) return "Chứng thực bản sao từ bản chính";
        if (c.contains("DC-01")) return "Đăng ký biến động quyền sử dụng đất";
        if (c.contains("BT-01")) return "Trợ cấp xã hội hằng tháng";
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
                for (String key : List.of("declarerName", "fullName", "citizenName", "hoTen", "childName", "husbandName", "wifeName")) {
                    Object val = map.get(key);
                    if (val instanceof String s && !s.isBlank()) return s.trim().toUpperCase();
                }
            }
            JsonNode node = objectMapper.valueToTree(formDataObj);
            for (String key : List.of("declarerName", "fullName", "citizenName", "hoTen", "childName", "husbandName", "wifeName")) {
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

    private List<String> deserializeStringList(String json) {
        if (json == null || json.isBlank()) return java.util.Collections.emptyList();
        try {
            List<String> parsed = objectMapper.readValue(json, new TypeReference<List<String>>() {});
            return parsed != null ? parsed : java.util.Collections.emptyList();
        } catch (Exception e) {
            return java.util.Collections.emptyList();
        }
    }
}
