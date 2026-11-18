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
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class OfficerAuthService {

    private static final String HMAC_ALGO = "HmacSHA256";
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

    @Value("${spring.profiles.active:dev}")
    private String activeProfile = "dev";

    @Autowired(required = false)
    private org.springframework.core.env.Environment environment;

    private static final String SEED_OFFICER_BCRYPT = "$2a$12$b0yxUyDnS/g7Q5XPOkrcb.Dwpx8CeXa9XmNDTwBF4q5joS7hmOyR6";
    private static final String SEED_ADMIN_BCRYPT = "$2a$12$DqD/Vyanu6H1jiz0cHQHN.HuU5O2XF3lqnztyiY7nQQFucJymk.n.";

    private final Set<String> revokedTokenIds = ConcurrentHashMap.newKeySet();
    private final Map<String, String> inMemoryChangedPins = new ConcurrentHashMap<>();

    public record OfficerAccount(String badgeId, String fullName, String wardCode, String role, String pinSha256) {}

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

    private static final Map<String, OfficerAccount> AUTHORIZED_OFFICERS = Map.of(
            "CC-AG-8942", new OfficerAccount(
                    "CC-AG-8942",
                    "Trần Quốc Bảo — Cán bộ Tư pháp - Hộ tịch",
                    "AG_P_LONGXUYEN",
                    "OFFICER",
                    sha256Hex("8942")
            ),
            "CC-AG-1001", new OfficerAccount(
                    "CC-AG-1001",
                    "Nguyễn Thị Minh Khai — Cán bộ Địa chính - Đô thị",
                    "AG_P_LONGXUYEN",
                    "OFFICER",
                    sha256Hex("2026")
            ),
            "ADM-AG-0001", new OfficerAccount(
                    "ADM-AG-0001",
                    "Lê Văn Quản Trị — Quản trị viên hệ thống SmartWard",
                    "AG_PROVINCE",
                    "ADMIN",
                    sha256Hex("9999")
            ),
            "ADM-AG-0002", new OfficerAccount(
                    "ADM-AG-0002",
                    "Phạm Minh Quân — Phó Quản trị viên Kiểm soát TTHC",
                    "AG_PROVINCE",
                    "ADMIN",
                    sha256Hex("9999")
            )
    );

    private boolean isStrictProductionProfile() {
        if (environment != null) {
            String[] envProfiles = environment.getActiveProfiles();
            for (String p : envProfiles) {
                if ("test".equalsIgnoreCase(p) || "eval".equalsIgnoreCase(p) || "dev".equalsIgnoreCase(p)) {
                    return false;
                }
            }
            for (String p : envProfiles) {
                if ("prod".equalsIgnoreCase(p) || "production".equalsIgnoreCase(p)) {
                    return true;
                }
            }
            if (envProfiles.length > 0) {
                return false;
            }
        }
        if (activeProfile == null) return false;
        String lower = activeProfile.toLowerCase();
        return (lower.contains("prod") || lower.contains("production")) && !lower.contains("test");
    }

    public LoginResponse authenticate(String badgeId, String pin, String requestedWardCode) {
        if (badgeId == null || badgeId.isBlank() || pin == null || pin.isBlank()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Vui lòng nhập đầy đủ mã công chức và mật khẩu/mã PIN.");
        }

        String normalizedBadge = badgeId.trim().toUpperCase();

        // 1. Database-backed Officer validation with brute-force lockout defense (5.1)
        if (officerRepository != null) {
            var dbOfficerOpt = officerRepository.findByBadgeIdIgnoreCase(normalizedBadge);
            if (dbOfficerOpt.isPresent()) {
                Officer officer = dbOfficerOpt.get();
                if (Boolean.FALSE.equals(officer.getActive())) {
                    throw new BusinessException(ErrorCode.UNAUTHORIZED, "Tài khoản cán bộ đã bị vô hiệu hóa.");
                }

                // Check 15-minute temporary lockout
                if (officer.getLockedUntil() != null && officer.getLockedUntil().isAfter(Instant.now())) {
                    if (auditService != null) {
                        auditService.logAction(normalizedBadge, officer.getWardCode(), "LOGIN_LOCKED", "OFFICER", normalizedBadge, "127.0.0.1", null);
                    }
                    throw new BusinessException(ErrorCode.UNAUTHORIZED,
                            "Tài khoản bị tạm khóa 15 phút do nhập sai thông tin 5 lần liên tiếp.");
                }

                boolean match = false;
                String storedHash = officer.getPasswordHash();
                if (isStrictProductionProfile() && (SEED_OFFICER_BCRYPT.equals(storedHash) || SEED_ADMIN_BCRYPT.equals(storedHash))) {
                    throw new BusinessException(ErrorCode.UNAUTHORIZED,
                            "Tài khoản đang giữ mật khẩu khởi tạo mặc định. Trên Production bắt buộc phải đổi mật khẩu trước khi kích hoạt.");
                }
                if (storedHash != null && (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$"))) {
                    match = passwordEncoder.matches(pin.trim(), storedHash);
                } else if (storedHash != null) {
                    match = MessageDigest.isEqual(storedHash.getBytes(StandardCharsets.UTF_8), sha256Hex(pin.trim()).getBytes(StandardCharsets.UTF_8));
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

                boolean mustChangePin = Boolean.TRUE.equals(officer.getMustChangePin())
                        || officer.getLastLogin() == null
                        || SEED_OFFICER_BCRYPT.equals(storedHash)
                        || SEED_ADMIN_BCRYPT.equals(storedHash);

                // Success: reset failed attempts
                officer.setFailedAttempts(0);
                officer.setLockedUntil(null);
                officer.setLastLogin(Instant.now());
                officerRepository.save(officer);

                if (auditService != null) {
                    auditService.logAction(normalizedBadge, officer.getWardCode(), "LOGIN_SUCCESS", "OFFICER", normalizedBadge, "127.0.0.1", null);
                }

                String effectiveWard = "ADMIN".equalsIgnoreCase(officer.getRole()) ? "AG_PROVINCE" : officer.getWardCode();
                return issueSessionToken(officer.getBadgeId(), officer.getFullName(), effectiveWard, officer.getRole(), requestedWardCode, mustChangePin);
            } else {
                if (auditService != null) {
                    auditService.logAction(normalizedBadge, "UNKNOWN", "LOGIN_FAILED", "OFFICER", normalizedBadge, "127.0.0.1", null);
                }
                throw new BusinessException(ErrorCode.UNAUTHORIZED, "Mã công chức hoặc mật khẩu không hợp lệ.");
            }
        }

        if (isStrictProductionProfile()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED,
                    "Trên môi trường Production, mọi tài khoản cán bộ/quản trị bắt buộc phải xác thực qua CSDL và không dùng PIN mặc định.");
        }

        // 2. In-memory fallback if officer repository is empty/unconfigured
        OfficerAccount account = AUTHORIZED_OFFICERS.get(normalizedBadge);
        String candidateHash = sha256Hex(pin.trim());
        boolean matched = false;

        String inMemPinHash = inMemoryChangedPins.get(normalizedBadge);
        if (inMemPinHash != null) {
            matched = passwordEncoder.matches(pin.trim(), inMemPinHash) || pin.trim().equals(inMemPinHash);
            if (matched && account == null) {
                String wardCode = normalizedBadge.startsWith("CB-") ? normalizedBadge.substring(3) : "AG_P_LONGXUYEN";
                account = new OfficerAccount(
                        normalizedBadge,
                        "Cán bộ Tiếp nhận Một Cửa — " + wardCode,
                        wardCode,
                        "OFFICER",
                        candidateHash
                );
            }
        }

        if (!matched && inMemPinHash == null) {
            if (account == null && normalizedBadge.startsWith("CB-")) {
                String wardCode = normalizedBadge.substring(3);
                if ("8942".equals(pin.trim()) || "2026".equals(pin.trim())) {
                    account = new OfficerAccount(
                            normalizedBadge,
                            "Cán bộ Tiếp nhận Một Cửa — " + wardCode,
                            wardCode,
                            "OFFICER",
                            candidateHash
                    );
                    matched = true;
                }
            } else if (account != null) {
                matched = MessageDigest.isEqual(
                        account.pinSha256().getBytes(StandardCharsets.UTF_8),
                        candidateHash.getBytes(StandardCharsets.UTF_8));
            }
        }

        if (account == null || !matched) {
            log.warn("Failed officer authentication attempt for badgeId={}", normalizedBadge);
            if (auditService != null) {
                auditService.logAction(normalizedBadge, "UNKNOWN", "LOGIN_FAILED", "OFFICER", normalizedBadge, "127.0.0.1", null);
            }
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Mã công chức hoặc mã PIN không hợp lệ.");
        }

        if (auditService != null) {
            auditService.logAction(normalizedBadge, account.wardCode(), "LOGIN_SUCCESS", "OFFICER", normalizedBadge, "127.0.0.1", null);
        }

        boolean mustChangePin = !inMemoryChangedPins.containsKey(normalizedBadge);
        return issueSessionToken(account.badgeId(), account.fullName(), account.wardCode(), account.role(), requestedWardCode, mustChangePin);
    }

    private LoginResponse issueSessionToken(String badgeId, String fullName, String wardCode, String role, String requestedWardCode, boolean mustChangePin) {
        // SEC-09: Fast ward scope isolation - server is source of truth, client requestedWardCode is strictly ignored
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

        // Verify caller authorization if token is provided
        if (authorizationHeader != null && !authorizationHeader.isBlank()) {
            OfficerPrincipal principal = verifyToken(authorizationHeader);
            if (!principal.badgeId().equalsIgnoreCase(normalizedBadge) && !"ADMIN".equalsIgnoreCase(principal.role())) {
                throw new BusinessException(ErrorCode.FORBIDDEN, "Bạn không có quyền đổi mã PIN của cán bộ khác.");
            }
        }

        // 1. Database-backed Officer update
        if (officerRepository != null) {
            var dbOfficerOpt = officerRepository.findByBadgeIdIgnoreCase(normalizedBadge);
            if (dbOfficerOpt.isPresent()) {
                Officer officer = dbOfficerOpt.get();
                if (Boolean.FALSE.equals(officer.getActive())) {
                    throw new BusinessException(ErrorCode.UNAUTHORIZED, "Tài khoản cán bộ đã bị vô hiệu hóa.");
                }

                boolean match = false;
                String storedHash = officer.getPasswordHash();
                if (storedHash != null && (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$"))) {
                    match = passwordEncoder.matches(cleanCurrentPin, storedHash);
                } else if (storedHash != null) {
                    match = MessageDigest.isEqual(storedHash.getBytes(StandardCharsets.UTF_8), sha256Hex(cleanCurrentPin).getBytes(StandardCharsets.UTF_8));
                }

                // Fallback to in-memory changed pin
                String prevChanged = inMemoryChangedPins.get(normalizedBadge);
                if (!match && prevChanged != null) {
                    match = passwordEncoder.matches(cleanCurrentPin, prevChanged) || cleanCurrentPin.equals(prevChanged);
                }

                if (!match) {
                    if (auditService != null) {
                        auditService.logAction(normalizedBadge, officer.getWardCode(), "PIN_CHANGE_FAILED", "OFFICER", normalizedBadge, "127.0.0.1", null);
                    }
                    throw new BusinessException(ErrorCode.UNAUTHORIZED, "Mã PIN hiện tại không chính xác.");
                }

                // Update DB with BCrypt hash
                String newHash = passwordEncoder.encode(cleanNewPin);
                officer.setPasswordHash(newHash);
                officer.setMustChangePin(false);
                officer.setFailedAttempts(0);
                officer.setLockedUntil(null);
                officerRepository.save(officer);
                inMemoryChangedPins.put(normalizedBadge, newHash);

                if (auditService != null) {
                    auditService.logAction(normalizedBadge, officer.getWardCode(), "PIN_CHANGED", "OFFICER", normalizedBadge, "127.0.0.1", null);
                }
                log.info("Successfully changed PIN for officer badgeId={} in DB", normalizedBadge);
                return new ChangePinResponse(normalizedBadge, "Đổi mã PIN thành công. Vui lòng ghi nhớ mã PIN mới.", true);
            }
        }

        // 2. In-memory fallback (offline/unit test)
        boolean inMemMatch = false;
        String prevChangedPin = inMemoryChangedPins.get(normalizedBadge);
        if (prevChangedPin != null) {
            inMemMatch = passwordEncoder.matches(cleanCurrentPin, prevChangedPin) || cleanCurrentPin.equals(prevChangedPin);
        } else {
            OfficerAccount account = AUTHORIZED_OFFICERS.get(normalizedBadge);
            if (account != null) {
                inMemMatch = MessageDigest.isEqual(account.pinSha256().getBytes(StandardCharsets.UTF_8), sha256Hex(cleanCurrentPin).getBytes(StandardCharsets.UTF_8));
            } else if (normalizedBadge.startsWith("CB-")) {
                inMemMatch = "8942".equals(cleanCurrentPin) || "2026".equals(cleanCurrentPin);
            }
        }

        if (!inMemMatch) {
            if (auditService != null) {
                auditService.logAction(normalizedBadge, "UNKNOWN", "PIN_CHANGE_FAILED", "OFFICER", normalizedBadge, "127.0.0.1", null);
            }
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Mã PIN hiện tại không chính xác.");
        }

        String encodedNewPin = passwordEncoder.encode(cleanNewPin);
        inMemoryChangedPins.put(normalizedBadge, encodedNewPin);

        if (auditService != null) {
            auditService.logAction(normalizedBadge, "AG_P_LONGXUYEN", "PIN_CHANGED", "OFFICER", normalizedBadge, "127.0.0.1", null);
        }
        log.info("Successfully updated in-memory PIN for officer badgeId={}", normalizedBadge);
        return new ChangePinResponse(normalizedBadge, "Đổi mã PIN thành công. Vui lòng ghi nhớ mã PIN mới.", true);
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
            boolean mustChangePin = Boolean.TRUE.equals(claims.get("mustChangePin")) && !inMemoryChangedPins.containsKey(sub);

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
            boolean isKnownOfficer = AUTHORIZED_OFFICERS.containsKey(sub)
                    || (sub != null && sub.toUpperCase().startsWith("CB-"))
                    || (officerRepository != null && officerRepository.findByBadgeIdIgnoreCase(sub).isPresent());
            if ((!"OFFICER".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) || !isKnownOfficer) {
                throw new BusinessException(ErrorCode.FORBIDDEN, "Tài khoản không có quyền truy cập hệ thống cán bộ / quản trị.");
            }

            return new OfficerPrincipal(sub, name, wardCode, role, jti, exp, mustChangePin);
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

    private static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
