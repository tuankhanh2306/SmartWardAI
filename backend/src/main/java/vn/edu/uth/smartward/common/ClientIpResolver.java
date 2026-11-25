package vn.edu.uth.smartward.common;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Resolves the authoritative client IP address without trusting spoofable X-Forwarded-For headers.
 * - Local / Docker Compose mode: relies on Tomcat RemoteIpValve configured with explicit Nginx internal-proxies
 *   and returns request.getRemoteAddr().
 * - Edge Proxy mode (renderEdgeTrustEnabled=true): trusts edge-overwritten single-IP headers
 *   (True-Client-IP / CF-Connecting-IP) ONLY when request.getRemoteAddr() belongs to an explicitly configured
 *   trusted CIDR allowlist (smartward.security.trusted-proxy-cidrs), failing closed against untrusted LAN/CGNAT peers.
 */
@Slf4j
@Component
public class ClientIpResolver {

    public static final String DEFAULT_TRUSTED_PROXY_CIDRS =
            "127.0.0.1/32,::1/128,172.28.0.0/24,100.64.0.0/10";

    private static final Pattern IPV4_LITERAL = Pattern.compile(
            "^(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}$"
    );
    private static final Pattern IPV6_CHARS = Pattern.compile("^[0-9a-fA-F:]+$");

    @Value("${smartward.security.render-edge-trust-enabled:false}")
    private boolean renderEdgeTrustEnabled;

    @Value("${smartward.security.trusted-proxy-cidrs:" + DEFAULT_TRUSTED_PROXY_CIDRS + "}")
    private String trustedProxyCidrsRaw = DEFAULT_TRUSTED_PROXY_CIDRS;

    private volatile List<CidrBlock> trustedProxyCidrs;

    public ClientIpResolver() {
        this.trustedProxyCidrs = parseCidrs(splitCidrs(DEFAULT_TRUSTED_PROXY_CIDRS));
    }

    public ClientIpResolver(boolean renderEdgeTrustEnabled) {
        this.renderEdgeTrustEnabled = renderEdgeTrustEnabled;
        this.trustedProxyCidrs = parseCidrs(splitCidrs(DEFAULT_TRUSTED_PROXY_CIDRS));
    }

    public ClientIpResolver(boolean renderEdgeTrustEnabled, List<String> trustedProxyCidrs) {
        this.renderEdgeTrustEnabled = renderEdgeTrustEnabled;
        this.trustedProxyCidrs = parseCidrs(trustedProxyCidrs);
    }

    @PostConstruct
    void init() {
        this.trustedProxyCidrs = parseCidrs(splitCidrs(trustedProxyCidrsRaw));
    }

    public String resolve(HttpServletRequest request) {
        if (request == null) {
            return "127.0.0.1";
        }
        String remoteAddr = normalizeIp(request.getRemoteAddr());
        if (remoteAddr == null) {
            remoteAddr = "127.0.0.1";
        }

        if (renderEdgeTrustEnabled && isTrustedProxyHop(remoteAddr)) {
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

    public boolean isTrustedProxyHop(String ip) {
        if (!isLiteralIp(ip)) {
            return false;
        }
        List<CidrBlock> cidrs = this.trustedProxyCidrs;
        if (cidrs == null || cidrs.isEmpty()) {
            return false;
        }
        try {
            byte[] candidate = InetAddress.getByName(ip).getAddress();
            for (CidrBlock block : cidrs) {
                if (block.matches(candidate)) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return false;
        }
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

    private static List<String> splitCidrs(String raw) {
        if (raw == null || raw.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private List<CidrBlock> parseCidrs(List<String> specs) {
        if (specs == null || specs.isEmpty()) {
            return Collections.emptyList();
        }
        List<CidrBlock> parsed = new ArrayList<>();
        for (String spec : specs) {
            CidrBlock block = CidrBlock.parse(spec);
            if (block != null) {
                parsed.add(block);
            } else {
                log.warn("[ClientIpResolver] Ignoring invalid or overly broad trusted proxy CIDR entry: '{}'", spec);
            }
        }
        return List.copyOf(parsed);
    }

    private static final class CidrBlock {
        private final byte[] network;
        private final int prefixLength;

        private CidrBlock(byte[] network, int prefixLength) {
            this.network = network;
            this.prefixLength = prefixLength;
        }

        static CidrBlock parse(String rawSpec) {
            if (rawSpec == null || rawSpec.isBlank()) {
                return null;
            }
            String trimmed = rawSpec.trim();
            int slashIdx = trimmed.indexOf('/');
            String ipPart = slashIdx >= 0 ? trimmed.substring(0, slashIdx).trim() : trimmed;
            if (!(IPV4_LITERAL.matcher(ipPart).matches() || (ipPart.contains(":") && IPV6_CHARS.matcher(ipPart).matches()))) {
                return null;
            }
            try {
                InetAddress addr = InetAddress.getByName(ipPart);
                byte[] bytes = addr.getAddress();
                int maxBits = (addr instanceof Inet4Address) ? 32 : 128;
                int prefix = maxBits;
                if (slashIdx >= 0) {
                    prefix = Integer.parseInt(trimmed.substring(slashIdx + 1).trim());
                }
                // Fail-closed: never allow /0 wildcard CIDR to trust arbitrary Internet peers
                if (prefix < 1 || prefix > maxBits) {
                    return null;
                }
                return new CidrBlock(bytes, prefix);
            } catch (Exception e) {
                return null;
            }
        }

        boolean matches(byte[] candidate) {
            if (candidate == null || candidate.length != network.length) {
                return false;
            }
            int fullBytes = prefixLength / 8;
            for (int i = 0; i < fullBytes; i++) {
                if (candidate[i] != network[i]) {
                    return false;
                }
            }
            int remainderBits = prefixLength % 8;
            if (remainderBits > 0) {
                int mask = (0xFF << (8 - remainderBits)) & 0xFF;
                return (candidate[fullBytes] & mask) == (network[fullBytes] & mask);
            }
            return true;
        }
    }
}
