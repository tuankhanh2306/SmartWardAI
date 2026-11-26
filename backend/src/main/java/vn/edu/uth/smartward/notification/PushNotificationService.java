package vn.edu.uth.smartward.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.dossier.CitizenDossier;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * TASK-023: Manages Expo Push device tokens and sends dossier status update alerts.
 * Strictly avoids leaking citizen PII (never includes full CCCD or private notes in push body).
 */
@Slf4j
@Service
public class PushNotificationService {

    private static final Pattern EXPO_TOKEN_PATTERN =
            Pattern.compile("^(ExponentPushToken|ExpoPushToken|LocalDevPushToken)\\[[A-Za-z0-9_\\-:.]{4,180}]$");
    private static final Set<String> ALLOWED_PLATFORMS = Set.of("ios", "android", "web");
    private static final String EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

    private final NotificationDeviceTokenRepository deviceTokenRepository;
    private final NotificationDeliveryLogRepository deliveryLogRepository;
    private final ObjectMapper objectMapper;
    private final boolean expoEnabled;
    private final HttpClient httpClient;

    @Autowired
    public PushNotificationService(
            NotificationDeviceTokenRepository deviceTokenRepository,
            @Autowired(required = false) NotificationDeliveryLogRepository deliveryLogRepository,
            ObjectMapper objectMapper,
            @Value("${smartward.notifications.expo-enabled:false}") boolean expoEnabled
    ) {
        this.deviceTokenRepository = deviceTokenRepository;
        this.deliveryLogRepository = deliveryLogRepository;
        this.objectMapper = objectMapper;
        this.expoEnabled = expoEnabled;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(4))
                .build();
    }

    @Transactional
    public DeviceRegistrationResponse registerDevice(RegisterDeviceRequest req) {
        if (req == null || req.expoPushToken() == null || req.expoPushToken().isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Expo push token không được để trống.");
        }
        String token = req.expoPushToken().trim();
        if (!EXPO_TOKEN_PATTERN.matcher(token).matches()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST,
                    "Định dạng Expo push token không hợp lệ (cần ExponentPushToken[...] hoặc ExpoPushToken[...]).");
        }

        String normalizedPlatform = (req.platform() == null || req.platform().isBlank())
                ? "android"
                : req.platform().trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_PLATFORMS.contains(normalizedPlatform)) {
            normalizedPlatform = "android";
        }

        String normalizedWard = sanitizeOptional(req.wardCode(), 64);
        String normalizedDossier = sanitizeOptional(req.dossierCode(), 64);
        if (normalizedDossier != null) {
            normalizedDossier = normalizedDossier.toUpperCase(Locale.ROOT);
        }
        String normalizedLabel = sanitizeOptional(req.deviceLabel(), 120);

        NotificationDeviceToken entity = deviceTokenRepository.findByExpoPushToken(token)
                .orElseGet(() -> NotificationDeviceToken.builder().expoPushToken(token).build());

        entity.setPlatform(normalizedPlatform);
        if (normalizedWard != null) {
            entity.setWardCode(normalizedWard);
        }
        if (normalizedDossier != null) {
            entity.setDossierCode(normalizedDossier);
        }
        if (normalizedLabel != null) {
            entity.setDeviceLabel(normalizedLabel);
        }
        entity.setActive(true);
        entity.setUpdatedAt(Instant.now());

        NotificationDeviceToken saved = deviceTokenRepository.save(entity);
        log.info("Registered mobile push device id={}, platform={}, dossierCode={}",
                saved.getId(), saved.getPlatform(), saved.getDossierCode());

        return new DeviceRegistrationResponse(
                true,
                saved.getId(),
                saved.getPlatform(),
                saved.getWardCode(),
                saved.getDossierCode(),
                saved.getUpdatedAt() != null ? saved.getUpdatedAt() : Instant.now()
        );
    }

    @Transactional
    public boolean unregisterDevice(String expoPushToken) {
        if (expoPushToken == null || expoPushToken.isBlank()) {
            return false;
        }
        return deviceTokenRepository.findByExpoPushToken(expoPushToken.trim())
                .map(entity -> {
                    entity.setActive(false);
                    entity.setUpdatedAt(Instant.now());
                    deviceTokenRepository.save(entity);
                    return true;
                })
                .orElse(false);
    }

    /**
     * Dispatches dossier status change push notifications safely without ever throwing into caller transaction.
     */
    public int notifyDossierStatusChanged(CitizenDossier dossier, String oldStatus, String officerFeedback) {
        if (dossier == null || dossier.getDossierCode() == null || dossier.getDossierCode().isBlank()) {
            return 0;
        }
        try {
            List<NotificationDeviceToken> targets =
                    deviceTokenRepository.findByDossierCodeIgnoreCaseAndActiveTrue(dossier.getDossierCode());
            if (targets.isEmpty()) {
                return 0;
            }

            String title = buildNotificationTitle(dossier.getDossierCode(), dossier.getStatus());
            String body = buildNotificationBody(dossier.getDossierCode(), dossier.getStatus(), officerFeedback);
            int dispatched = 0;

            for (NotificationDeviceToken target : targets) {
                DeliveryOutcome outcome = deliverToExpo(target.getExpoPushToken(), title, body, dossier.getDossierCode(), dossier.getStatus());
                recordDeliveryLog(dossier.getDossierCode(), target.getExpoPushToken(), title, body, outcome);
                if (!"FAILED".equals(outcome.status())) {
                    dispatched++;
                }
            }
            return dispatched;
        } catch (Exception e) {
            log.warn("Push notification dispatch skipped due to error for dossier={}: {}",
                    dossier.getDossierCode(), e.getMessage());
            return 0;
        }
    }

    private DeliveryOutcome deliverToExpo(String token, String title, String body, String dossierCode, String newStatus) {
        if (!expoEnabled || token.startsWith("LocalDevPushToken[")) {
            return new DeliveryOutcome("SKIPPED_MOCK", null);
        }
        try {
            Map<String, Object> payload = Map.of(
                    "to", token,
                    "sound", "default",
                    "title", title,
                    "body", body,
                    "data", Map.of(
                            "type", "DOSSIER_STATUS_UPDATED",
                            "dossierCode", dossierCode,
                            "status", newStatus != null ? newStatus : ""
                    )
            );
            String json = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(EXPO_PUSH_ENDPOINT))
                    .timeout(Duration.ofSeconds(5))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return new DeliveryOutcome("SENT", null);
            }
            return new DeliveryOutcome("FAILED", "HTTP " + response.statusCode());
        } catch (Exception e) {
            return new DeliveryOutcome("FAILED", e.getMessage());
        }
    }

    private void recordDeliveryLog(String dossierCode, String token, String title, String body, DeliveryOutcome outcome) {
        if (deliveryLogRepository == null) return;
        try {
            deliveryLogRepository.save(NotificationDeliveryLog.builder()
                    .dossierCode(dossierCode)
                    .expoPushToken(token)
                    .title(title)
                    .body(body)
                    .status(outcome.status())
                    .errorMessage(outcome.error())
                    .build());
        } catch (Exception e) {
            log.debug("Failed to persist notification delivery log: {}", e.getMessage());
        }
    }

    static String buildNotificationTitle(String dossierCode, String status) {
        if ("APPROVED".equalsIgnoreCase(status)) {
            return "Hồ sơ " + dossierCode + " đã được chấp thuận";
        }
        if ("NEED_SUPPLEMENT".equalsIgnoreCase(status)) {
            return "Hồ sơ " + dossierCode + " cần bổ sung thông tin";
        }
        if ("REJECTED".equalsIgnoreCase(status)) {
            return "Hồ sơ " + dossierCode + " có kết quả xử lý";
        }
        return "Cập nhật tiến độ hồ sơ " + dossierCode;
    }

    static String buildNotificationBody(String dossierCode, String status, String officerFeedback) {
        String safeNote = officerFeedback == null ? "" : officerFeedback.replaceAll("\\b\\d{9,12}\\b", "***").trim();
        if (safeNote.length() > 140) {
            safeNote = safeNote.substring(0, 137) + "...";
        }
        if (!safeNote.isEmpty()) {
            return "Trạng thái mới: " + translateStatus(status) + ". Ghi chú cán bộ: " + safeNote;
        }
        return "Hồ sơ " + dossierCode + " vừa chuyển sang trạng thái: " + translateStatus(status)
                + ". Mở SmartWard AI để xem chi tiết.";
    }

    private static String translateStatus(String status) {
        if (status == null) return "Đang xử lý";
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "APPROVED" -> "Đã duyệt sơ bộ";
            case "NEED_SUPPLEMENT" -> "Cần bổ sung giấy tờ";
            case "REJECTED" -> "Từ chối tiếp nhận";
            case "PROCESSING" -> "Đang xử lý";
            default -> status;
        };
    }

    private static String sanitizeOptional(String raw, int maxLen) {
        if (raw == null || raw.isBlank()) return null;
        String clean = raw.trim();
        return clean.length() > maxLen ? clean.substring(0, maxLen) : clean;
    }

    private record DeliveryOutcome(String status, String error) {}
}
