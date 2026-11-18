package vn.edu.uth.smartward.common;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.util.regex.Pattern;

/**
 * Resolves the authoritative client IP address without naively trusting spoofable X-Forwarded-For headers.
 * - Local / Docker Compose mode: relies on Tomcat RemoteIpValve configured with explicit Nginx internal-proxies
 *   and returns request.getRemoteAddr().
 * - Render Edge mode (renderEdgeTrustEnabled=true): trusts edge-overwritten single-IP headers
 *   (True-Client-IP / CF-Connecting-IP) ONLY when the immediate TCP peer is an internal/private/loopback/CGNAT
 *   ingress hop of the Render runtime.
 */
@Slf4j
@Component
public class ClientIpResolver {

    private static final Pattern IPV4_LITERAL = Pattern.compile(
            "^(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}$"
    );
    private static final Pattern IPV6_CHARS = Pattern.compile("^[0-9a-fA-F:]+$");

    @Value("${smartward.security.render-edge-trust-enabled:false}")
    private boolean renderEdgeTrustEnabled;

    public ClientIpResolver() {
    }

    public ClientIpResolver(boolean renderEdgeTrustEnabled) {
        this.renderEdgeTrustEnabled = renderEdgeTrustEnabled;
    }

    public String resolve(HttpServletRequest request) {
        if (request == null) {
            return "127.0.0.1";
        }
        String remoteAddr = normalizeIp(request.getRemoteAddr());
        if (remoteAddr == null) {
            remoteAddr = "127.0.0.1";
        }

        if (renderEdgeTrustEnabled && isInternalProxyHop(remoteAddr)) {
            String edgeIp = extractValidSingleIp(request.getHeader("True-Client-IP"));
            if (edgeIp == null) {
                edgeIp = extractValidSingleIp(request.getHeader("CF-Connecting-IP"));
            }
            if (edgeIp != null) {
                return edgeIp;
            }
        }

        return remoteAddr;
    }

    private String extractValidSingleIp(String headerVal) {
        if (headerVal == null) {
            return null;
        }
        String trimmed = headerVal.trim();
        if (trimmed.isEmpty() || trimmed.contains(",") || trimmed.length() > 45) {
            return null;
        }
        if (IPV4_LITERAL.matcher(trimmed).matches()) {
            return trimmed;
        }
        if (trimmed.contains(":") && IPV6_CHARS.matcher(trimmed).matches()) {
            try {
                return InetAddress.getByName(trimmed).getHostAddress();
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }

    private boolean isInternalProxyHop(String ip) {
        if (!isLiteralIp(ip)) {
            return false;
        }
        try {
            InetAddress addr = InetAddress.getByName(ip);
            if (addr.isLoopbackAddress() || addr.isSiteLocalAddress() || addr.isLinkLocalAddress()) {
                return true;
            }
            if (addr instanceof Inet4Address) {
                byte[] b = addr.getAddress();
                int b0 = b[0] & 0xFF;
                int b1 = b[1] & 0xFF;
                // RFC 6598 CGNAT 100.64.0.0/10 used by cloud/container ingress meshes
                return b0 == 100 && b1 >= 64 && b1 <= 127;
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isLiteralIp(String ip) {
        return ip != null && (IPV4_LITERAL.matcher(ip).matches() || (ip.contains(":") && IPV6_CHARS.matcher(ip).matches()));
    }

    private String normalizeIp(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
