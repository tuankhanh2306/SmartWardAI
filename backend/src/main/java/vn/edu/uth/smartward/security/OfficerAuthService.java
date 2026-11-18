package vn.edu.uth.smartward.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import vn.edu.uth.smartward.audit.AuditService;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class OfficerAuthService {

    private static final String HMAC_ALGO = "HmacSHA256";
    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public static final String REVOKED_SEED_MARKER = "REVOKED_COMPROMISED_SEED";
    public static final String SEED_OFFICER_BCRYPT = "$2a$12$b0yxUyDnS/g7Q5XPOkrcb.Dwpx8CeXa9XmNDTwBF4q5joS7hmOyR6";
    public static final String SEED_ADMIN_BCRYPT = "$2a$12$DqD/Vyanu6H1jiz0cHQHN.HuU5O2XF3lqnztyiY7nQQFucJymk.n.";

    private final ObjectMapper objectMapper;
    private final StringRedisTemplate stringRedisTemplate;
    private final OfficerRepository officerRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);

    @Autowired
    public OfficerAuthService(ObjectMapper objectMapper,
                              @Autowired(required = false) StringRedisTemplate stringRedisTemplate,
                              @Autowired(required = false) OfficerRepository officerRepository,
                              @Autowired(required = false) AuditService auditService) {
        this.objectMapper = objectMapper;
        this.stringRedisTemplate = stringRedisTemplate;
        this.officerRepository = officerRepository;
        this.auditService = auditService;
    }

    public OfficerAuthService(ObjectMapper objectMapper, StringRedisTemplate stringRedisTemplate) {
        this(objectMapper, stringRedisTemplate, null, null);
    }

    public OfficerAuthService(ObjectMapper objectMapper) {
        this(objectMapper, null, null, null);
    }

    @Value("${smartward.security.jwt-secret:}")
    private String jwtSecret;

    @Value("${smartward.security.token-ttl-hours:8}")
    private int tokenTtlHours;

    @Value("${smartward.bootstrap.secret-file:}")
    private String bootstrapSecretFile;

    private final Set<String> revokedTokenIds = ConcurrentHashMap.newKeySet();

    public record OfficerPrincipal(String badgeId, String fullName, String wardCode, String role, String tokenId, long expiresAtEpochSec, boolean mustChangePin) {
        public OfficerPrincipal(String badgeId, String fullName, String wardCode, String role, String tokenId, long expiresAtEpochSec) {
            this(badgeId, fullName, wardCode, role, tokenId, expiresAtEpochSec, false);
        }
    }

    public record LoginResponse(String token, String badgeId, String fullName, String wardCode, String role, long expiresAtEpochSec, boolean mustChangePin) {
        public LoginResponse(String token, String badgeId, String fullName, String wardCode, String role, long expiresAtEpochSec) {
            this(token, badgeId, fullName, wardCode, role, expiresAtEpochSec, false);
        }
    }

    public record ChangePinResponse(String badgeId, String message, boolean success) {}

    public record OneTimePinIssueResponse(String badgeId, String oneTimePin, Instant expiresAt, boolean mustChangePin) {}

    public static boolean isCompromisedOrRevokedHash(String storedHash) {
        return storedHash == null
                || storedHash.isBlank()
                || REVOKED_SEED_MARKER.equals(storedHash)
                || SEED_OFFICER_BCRYPT.equals(storedHash)
                || SEED_ADMIN_BCRYPT.equals(storedHash);
    }

    public static String generateCsprngBase32Pin(int length) {
        int effectiveLen = Math.max(12, length);
        StringBuilder sb = new StringBuilder(effectiveLen);
        for (int i = 0; i < effectiveLen; i++) {
            sb.append(BASE32_ALPHABET.charAt(SECURE_RANDOM.nextInt(BASE32_ALPHABET.length())));
        }
        return sb.toString();
    }

    public String encodePassword(String rawPassword) {
        return passwordEncoder.encode(rawPassword);
    }

    public LoginResponse authenticate(String badgeId, String pin, String requestedWardCode) {
        if (badgeId == null || badgeId.isBlank() || pin == null || pin.isBlank()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Vui lòng nhập đầy đủ mã công chức và mật khẩu/mã PIN.");
        }
        if (officerRepository == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED,
                    "Hệ thống xác thực cán bộ yêu cầu kết nối cơ sở dữ liệu (không cho phép xác thực bộ nhớ đệm).");
        }

        String normalizedBadge = badgeId.trim().toUpperCase();
        Optional<Officer> dbOfficerOpt = officerRepository.findByBadgeIdIgnoreCase(normalizedBadge);
        if (dbOfficerOpt.isEmpty()) {
            if (auditService != null) {
                auditService.logAction(normalizedBadge, "UNKNOWN", "LOGIN_FAILED", "OFFICER", normalizedBadge, "127.0.0.1", null);
            }
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Mã công chức hoặc mật khẩu không hợp lệ.");
        }

        Officer officer = dbOfficerOpt.get();
        if (Boolean.FALSE.equals(officer.getActive())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Tài khoản cán bộ đã bị vô hiệu hóa.");
        }

        if (officer.getLockedUntil() != null && officer.getLockedUntil().isAfter(Instant.now())) {
            if (auditService != null) {
                auditService.logAction(normalizedBadge, officer.getWardCode(), "LOGIN_LOCKED", "OFFICER", normalizedBadge, "127.0.0.1", null);
            }
            throw new BusinessException(ErrorCode.UNAUTHORIZED,
                    "Tài khoản bị tạm khóa 15 phút do nhập sai thông tin 5 lần liên tiếp.");
        }

        String storedHash = officer.getPasswordHash();
        if (isCompromisedOrRevokedHash(storedHash)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED,
                    "Tài khoản chưa được cấp mã PIN khởi tạo hợp lệ hoặc mật khẩu mặc định cũ đã bị thu hồi.");
        }

        if (officer.getPinExpiresAt() != null && officer.getPinExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED,
                    "Mã PIN khởi tạo dùng một lần đã hết hạn 24 giờ. Vui lòng liên hệ Quản trị viên hoặc chạy lại bootstrap hợp lệ.");
        }

        boolean match = false;
        if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
            match = passwordEncoder.matches(pin.trim(), storedHash);
        }

        if (!match) {
            int failed = (officer.getFailedAttempts() != null ? officer.getFailedAttempts() : 0) + 1;
            if (failed >= 5) {
                officer.setLockedUntil(Instant.now().plus(Duration.ofMinutes(15)));
                officer.setFailedAttempts(0);
            } else {
                officer.setFailedAttempts(failed);
            }
            officerRepository.save(officer);
            if (auditService != null) {
                auditService.logAction(normalizedBadge, officer.getWardCode(), "LOGIN_FAILED", "OFFICER", normalizedBadge, "127.0.0.1", null);
            }
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Mã công chức hoặc mật khẩu không hợp lệ.");
        }

        boolean mustChangePin = Boolean.TRUE.equals(officer.getMustChangePin());

        officer.setFailedAttempts(0);
        officer.setLockedUntil(null);
        officer.setLastLogin(Instant.now());
        officerRepository.save(officer);

        if (auditService != null) {
            auditService.logAction(normalizedBadge, officer.getWardCode(), "LOGIN_SUCCESS", "OFFICER", normalizedBadge, "127.0.0.1", null);
        }

        String effectiveWard = "ADMIN".equalsIgnoreCase(officer.getRole()) ? "AG_PROVINCE" : officer.getWardCode();
        return issueSessionToken(officer.getBadgeId(), officer.getFullName(), effectiveWard, officer.getRole(), requestedWardCode, mustChangePin);
    }

    private LoginResponse issueSessionToken(String badgeId, String fullName, String wardCode, String role, String requestedWardCode, boolean mustChangePin) {
        if (requestedWardCode != null && !requestedWardCode.isBlank() && !requestedWardCode.trim().equalsIgnoreCase(wardCode)) {
            log.warn("SEC-09: Client submitted requestedWardCode '{}' but officer '{}' is assigned to '{}'. Overriding with account ward.",
                    requestedWardCode.trim(), badgeId, wardCode);
        }

        long nowSec = Instant.now().getEpochSecond();
        long expSec = nowSec + (tokenTtlHours * 3600L);
        String jti = UUID.randomUUID().toString();

        String token = signToken(badgeId, fullName, wardCode, role, jti, nowSec, expSec, mustChangePin);
        log.info("Issued verified officer session token for badgeId={}, wardCode={}, role={}, mustChangePin={}, jti={}",
                badgeId, wardCode, role, mustChangePin, jti);

        return new LoginResponse(token, badgeId, fullName, wardCode, role, expSec, mustChangePin);
    }

    public ChangePinResponse changePin(String badgeId, String currentPin, String newPin, String confirmPin, String authorizationHeader) {
        if (badgeId == null || badgeId.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã công chức không được để trống.");
        }
        if (currentPin == null || currentPin.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Vui lòng nhập mã PIN hiện tại.");
        }
        if (newPin == null || newPin.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Vui lòng nhập mã PIN mới.");
        }
        if (confirmPin == null || confirmPin.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Vui lòng xác nhận mã PIN mới.");
        }
        if (officerRepository == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Hệ thống xác thực cán bộ yêu cầu kết nối cơ sở dữ liệu.");
        }

        String normalizedBadge = badgeId.trim().toUpperCase();
        String cleanCurrentPin = currentPin.trim();
        String cleanNewPin = newPin.trim();
        String cleanConfirmPin = confirmPin.trim();

        if (!cleanNewPin.equals(cleanConfirmPin)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Xác nhận mã PIN mới không khớp.");
        }
        if (cleanNewPin.length() < 6 || cleanNewPin.length() > 32) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã PIN mới phải có độ dài từ 6 đến 32 ký tự.");
        }
        if (cleanNewPin.equals(cleanCurrentPin)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã PIN mới không được trùng với mã PIN hiện tại.");
        }

        if (authorizationHeader != null && !authorizationHeader.isBlank()) {
            OfficerPrincipal principal = verifyToken(authorizationHeader);
            boolean isSelf = principal.badgeId().equalsIgnoreCase(normalizedBadge);
            if (!isSelf) {
                if (principal.mustChangePin()) {
                    throw new BusinessException(ErrorCode.FORBIDDEN, "Quản trị viên bắt buộc đổi PIN cá nhân trước khi thao tác cho tài khoản khác.");
                }
                if (!"ADMIN".equalsIgnoreCase(principal.role())) {
                    throw new BusinessException(ErrorCode.FORBIDDEN, "Bạn không có quyền đổi mã PIN của cán bộ khác.");
                }
            }
        }

        Officer officer = officerRepository.findByBadgeIdIgnoreCase(normalizedBadge)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED, "Mã công chức hoặc mã PIN hiện tại không chính xác."));

        if (Boolean.FALSE.equals(officer.getActive())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Tài khoản cán bộ đã bị vô hiệu hóa.");
        }

        String storedHash = officer.getPasswordHash();
        if (isCompromisedOrRevokedHash(storedHash)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Tài khoản chưa có mã PIN khởi tạo hợp lệ hoặc đã bị thu hồi.");
        }
        if (officer.getPinExpiresAt() != null && officer.getPinExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Mã PIN dùng một lần đã hết hạn 24 giờ.");
        }

        boolean match = (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$"))
                && passwordEncoder.matches(cleanCurrentPin, storedHash);

        if (!match) {
            if (auditService != null) {
                auditService.logAction(normalizedBadge, officer.getWardCode(), "PIN_CHANGE_FAILED", "OFFICER", normalizedBadge, "127.0.0.1", null);
            }
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Mã PIN hiện tại không chính xác.");
        }

        String newHash = passwordEncoder.encode(cleanNewPin);
        officer.setPasswordHash(newHash);
        officer.setMustChangePin(false);
        officer.setPinExpiresAt(null);
        officer.setFailedAttempts(0);
        officer.setLockedUntil(null);
        officerRepository.save(officer);

        if (auditService != null) {
            auditService.logAction(normalizedBadge, officer.getWardCode(), "PIN_CHANGED", "OFFICER", normalizedBadge, "127.0.0.1", null);
        }

        cleanupBootstrapSecretFileIfAllAdminsReady(officer.getRole());

        log.info("Successfully changed PIN for officer badgeId={} in DB", normalizedBadge);
        return new ChangePinResponse(normalizedBadge, "Đổi mã PIN thành công. Vui lòng ghi nhớ mã PIN mới.", true);
    }

    public OneTimePinIssueResponse issueOneTimePin(String targetBadgeId, OfficerPrincipal adminPrincipal) {
        if (adminPrincipal == null || !"ADMIN".equalsIgnoreCase(adminPrincipal.role())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Chỉ Quản trị viên (ROLE_ADMIN) được phép cấp lại mã PIN dùng một lần.");
        }
        if (adminPrincipal.mustChangePin()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Quản trị viên phải đổi PIN lần đầu trước khi cấp PIN cho cán bộ khác.");
        }
        if (officerRepository == null) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "Thiếu kết nối OfficerRepository.");
        }
        if (targetBadgeId == null || targetBadgeId.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã công chức không được để trống.");
        }

        String normalizedTarget = targetBadgeId.trim().toUpperCase();
        Officer targetOfficer = officerRepository.findByBadgeIdIgnoreCase(normalizedTarget)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy tài khoản cán bộ: " + normalizedTarget));

        String oneTimePin = generateCsprngBase32Pin(16);
        Instant expiresAt = Instant.now().plus(Duration.ofHours(24));

        targetOfficer.setPasswordHash(passwordEncoder.encode(oneTimePin));
        targetOfficer.setMustChangePin(true);
        targetOfficer.setPinExpiresAt(expiresAt);
        targetOfficer.setFailedAttempts(0);
        targetOfficer.setLockedUntil(null);
        officerRepository.save(targetOfficer);

        if (auditService != null) {
            auditService.logAction(adminPrincipal.badgeId(), targetOfficer.getWardCode(), "ONE_TIME_PIN_ISSUED",
                    "OFFICER", normalizedTarget, "127.0.0.1", null);
        }
        log.info("Admin '{}' issued 24h one-time PIN for badgeId={} (expiresAt={})",
                adminPrincipal.badgeId(), normalizedTarget, expiresAt);

        return new OneTimePinIssueResponse(normalizedTarget, oneTimePin, expiresAt, true);
    }

    private void cleanupBootstrapSecretFileIfAllAdminsReady(String changedRole) {
        if (!"ADMIN".equalsIgnoreCase(changedRole) || bootstrapSecretFile == null || bootstrapSecretFile.isBlank()) {
            return;
        }
        try {
            boolean anyAdminStillPending = officerRepository.existsByRoleIgnoreCaseAndActiveTrueAndMustChangePinTrue("ADMIN");
            if (!anyAdminStillPending) {
                Files.deleteIfExists(Path.of(bootstrapSecretFile.trim()));
                log.info("Removed consumed admin bootstrap secret file at {}", bootstrapSecretFile.trim());
            }
        } catch (Exception e) {
            log.warn("Could not delete bootstrap secret file {}: {}", bootstrapSecretFile, e.getMessage());
        }
    }

    public OfficerPrincipal verifyToken(String rawBearerOrToken) {
        if (rawBearerOrToken == null || rawBearerOrToken.isBlank()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Thiếu thông tin xác thực cán bộ (Authorization Bearer token).");
        }

        String token = rawBearerOrToken.trim();
        if (token.regionMatches(true, 0, "Bearer ", 0, 7)) {
            token = token.substring(7).trim();
        }

        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Định dạng phiên đăng nhập cán bộ không hợp lệ.");
        }

        String signingInput = parts[0] + "." + parts[1];
        String expectedSig = hmacSha256Base64Url(signingInput);

        if (!MessageDigest.isEqual(
                expectedSig.getBytes(StandardCharsets.UTF_8),
                parts[2].getBytes(StandardCharsets.UTF_8))) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Chữ ký phiên đăng nhập cán bộ không hợp lệ hoặc đã bị giả mạo.");
        }

        try {
            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            Map<String, Object> claims = objectMapper.readValue(payloadBytes, new TypeReference<>() {});

            String sub = String.valueOf(claims.getOrDefault("sub", ""));
            String name = String.valueOf(claims.getOrDefault("name", ""));
            String wardCode = String.valueOf(claims.getOrDefault("wardCode", "AG_P_LONGXUYEN"));
            String role = String.valueOf(claims.getOrDefault("role", ""));
            String jti = String.valueOf(claims.getOrDefault("jti", ""));
            long exp = ((Number) claims.getOrDefault("exp", 0L)).longValue();
            boolean claimMustChangePin = Boolean.TRUE.equals(claims.get("mustChangePin"));

            if (Instant.now().getEpochSecond() >= exp) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED, "Phiên làm việc cán bộ đã hết hạn. Vui lòng đăng nhập lại.");
            }
            boolean isRevoked = false;
            if (stringRedisTemplate != null) {
                try {
                    isRevoked = Boolean.TRUE.equals(stringRedisTemplate.hasKey("smartward:auth:revoked:" + jti));
                } catch (Exception e) {
                    log.warn("Redis unavailable during token verification, falling back to local set: {}", e.getMessage());
                    isRevoked = revokedTokenIds.contains(jti);
                }
            } else {
                isRevoked = revokedTokenIds.contains(jti);
            }
            if (isRevoked || revokedTokenIds.contains(jti)) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED, "Phiên làm việc cán bộ đã đăng xuất.");
            }

            boolean dbMustChangePin = false;
            if (officerRepository != null) {
                Optional<Officer> officerOpt = officerRepository.findByBadgeIdIgnoreCase(sub);
                if (officerOpt.isEmpty() || Boolean.FALSE.equals(officerOpt.get().getActive())) {
                    throw new BusinessException(ErrorCode.FORBIDDEN, "Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.");
                }
                dbMustChangePin = Boolean.TRUE.equals(officerOpt.get().getMustChangePin());
            }

            if (!"OFFICER".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) {
                throw new BusinessException(ErrorCode.FORBIDDEN, "Tài khoản không có quyền truy cập hệ thống cán bộ / quản trị.");
            }

            boolean effectiveMustChangePin = claimMustChangePin || dbMustChangePin;
            return new OfficerPrincipal(sub, name, wardCode, role, jti, exp, effectiveMustChangePin);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Không thể xác minh phiên đăng nhập cán bộ.");
        }
    }

    public void revokeToken(String rawBearerOrToken) {
        try {
            OfficerPrincipal principal = verifyToken(rawBearerOrToken);
            String jti = principal.tokenId();
            long ttlSec = Math.max(1, principal.expiresAtEpochSec() - Instant.now().getEpochSecond());
            if (stringRedisTemplate != null) {
                try {
                    stringRedisTemplate.opsForValue().set("smartward:auth:revoked:" + jti, "true", Duration.ofSeconds(ttlSec));
                } catch (Exception e) {
                    log.warn("Redis unavailable during token revocation, falling back to local set: {}", e.getMessage());
                }
            }
            revokedTokenIds.add(jti);
        } catch (Exception ignored) {
            // Ignore invalid/expired token on logout
        }
    }

    private String signToken(String badgeId, String fullName, String wardCode, String role, String jti, long iat, long exp, boolean mustChangePin) {
        try {
            Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("sub", badgeId);
            payload.put("name", fullName);
            payload.put("wardCode", wardCode);
            payload.put("role", role);
            payload.put("jti", jti);
            payload.put("iat", iat);
            payload.put("exp", exp);
            payload.put("mustChangePin", mustChangePin);

            Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
            String headerB64 = encoder.encodeToString(objectMapper.writeValueAsBytes(header));
            String payloadB64 = encoder.encodeToString(objectMapper.writeValueAsBytes(payload));
            String signingInput = headerB64 + "." + payloadB64;
            String signatureB64 = hmacSha256Base64Url(signingInput);
            return signingInput + "." + signatureB64;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể khởi tạo token phiên cán bộ.");
        }
    }

    private String hmacSha256Base64Url(String signingInput) {
        byte[] secretBytes = resolveSigningSecret();
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(secretBytes, HMAC_ALGO));
            byte[] rawHmac = mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "Lỗi ký số HMAC-SHA256.");
        }
    }

    private byte[] resolveSigningSecret() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR,
                    "Cấu hình smartward.security.jwt-secret không được để trống.");
        }
        String effective = jwtSecret.trim();
        byte[] bytes = effective.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR,
                    "Cấu hình smartward.security.jwt-secret phải có độ dài tối thiểu 32 bytes.");
        }
        String lower = effective.toLowerCase();
        if (lower.contains("changeme") || lower.contains("devtest") || lower.contains("fallback")) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR,
                    "smartward.security.jwt-secret không được chứa từ khóa placeholder (ChangeMe, DevTest, Fallback).");
        }
        return bytes;
    }
}
