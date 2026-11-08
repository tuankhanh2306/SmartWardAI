package vn.edu.uth.smartward.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class OfficerAuthService {

    private static final String HMAC_ALGO = "HmacSHA256";
    private final ObjectMapper objectMapper;

    @Value("${smartward.security.jwt-secret:}")
    private String jwtSecret;

    @Value("${smartward.security.token-ttl-hours:8}")
    private int tokenTtlHours;

    private final Set<String> revokedTokenIds = ConcurrentHashMap.newKeySet();

    public record OfficerAccount(String badgeId, String fullName, String wardCode, String role, String pinSha256) {}

    public record OfficerPrincipal(String badgeId, String fullName, String wardCode, String role, String tokenId, long expiresAtEpochSec) {}

    public record LoginResponse(String token, String badgeId, String fullName, String wardCode, String role, long expiresAtEpochSec) {}

    private static final Map<String, OfficerAccount> AUTHORIZED_OFFICERS = Map.of(
            "CC-AG-8942", new OfficerAccount(
                    "CC-AG-8942",
                    "Trần Quốc Bảo — Cán bộ Tư pháp - Hộ tịch",
                    "WARD-AG-01",
                    "OFFICER",
                    sha256Hex("8942")
            ),
            "CC-AG-1001", new OfficerAccount(
                    "CC-AG-1001",
                    "Nguyễn Thị Minh Khai — Cán bộ Địa chính - Đô thị",
                    "WARD-AG-01",
                    "OFFICER",
                    sha256Hex("2026")
            )
    );

    public LoginResponse authenticate(String badgeId, String pin, String requestedWardCode) {
        if (badgeId == null || badgeId.isBlank() || pin == null || pin.isBlank()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Vui lòng nhập đầy đủ mã công chức và mã PIN.");
        }

        String normalizedBadge = badgeId.trim().toUpperCase();
        OfficerAccount account = AUTHORIZED_OFFICERS.get(normalizedBadge);
        String candidateHash = sha256Hex(pin.trim());

        if (account == null || !MessageDigest.isEqual(
                account.pinSha256().getBytes(StandardCharsets.UTF_8),
                candidateHash.getBytes(StandardCharsets.UTF_8))) {
            log.warn("Failed officer authentication attempt for badgeId={}", normalizedBadge);
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Mã công chức hoặc mã PIN không hợp lệ.");
        }

        String wardCode = (requestedWardCode != null && !requestedWardCode.isBlank())
                ? requestedWardCode.trim()
                : account.wardCode();

        long nowSec = Instant.now().getEpochSecond();
        long expSec = nowSec + (tokenTtlHours * 3600L);
        String jti = UUID.randomUUID().toString();

        String token = signToken(account.badgeId(), account.fullName(), wardCode, account.role(), jti, nowSec, expSec);
        log.info("Issued verified officer session token for badgeId={}, wardCode={}, jti={}", account.badgeId(), wardCode, jti);

        return new LoginResponse(token, account.badgeId(), account.fullName(), wardCode, account.role(), expSec);
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
            String wardCode = String.valueOf(claims.getOrDefault("wardCode", "WARD-AG-01"));
            String role = String.valueOf(claims.getOrDefault("role", ""));
            String jti = String.valueOf(claims.getOrDefault("jti", ""));
            long exp = ((Number) claims.getOrDefault("exp", 0L)).longValue();

            if (Instant.now().getEpochSecond() >= exp) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED, "Phiên làm việc cán bộ đã hết hạn. Vui lòng đăng nhập lại.");
            }
            if (revokedTokenIds.contains(jti)) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED, "Phiên làm việc cán bộ đã đăng xuất.");
            }
            if (!"OFFICER".equals(role) || !AUTHORIZED_OFFICERS.containsKey(sub)) {
                throw new BusinessException(ErrorCode.FORBIDDEN, "Tài khoản không có quyền truy cập phân hệ cán bộ.");
            }

            return new OfficerPrincipal(sub, name, wardCode, role, jti, exp);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Không thể xác minh phiên đăng nhập cán bộ.");
        }
    }

    public void revokeToken(String rawBearerOrToken) {
        try {
            OfficerPrincipal principal = verifyToken(rawBearerOrToken);
            revokedTokenIds.add(principal.tokenId());
        } catch (Exception ignored) {
            // Ignore invalid/expired token on logout
        }
    }

    private String signToken(String badgeId, String fullName, String wardCode, String role, String jti, long iat, long exp) {
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
        String effective = (jwtSecret != null && !jwtSecret.isBlank())
                ? jwtSecret.trim()
                : "SmartWardAI_Fallback_DevOnly_Secret_32B!";
        byte[] bytes = effective.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR,
                    "Cấu hình smartward.security.jwt-secret phải có độ dài tối thiểu 32 bytes.");
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
