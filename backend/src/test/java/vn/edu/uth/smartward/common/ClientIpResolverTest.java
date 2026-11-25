package vn.edu.uth.smartward.common;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * QA-3.3 / BUG-011 Security Regression Suite for ClientIpResolver:
 * Ensures edge headers (True-Client-IP / CF-Connecting-IP) are ONLY trusted
 * when the immediate TCP peer belongs to an explicit CIDR allowlist.
 */
class ClientIpResolverTest {

    @Test
    @DisplayName("QA-3.3: Untrusted private/LAN/metadata/docker-bridge peers CANNOT spoof True-Client-IP or CF-Connecting-IP")
    void untrustedInternalOrPrivatePeersCannotSpoofEdgeHeaders() {
        ClientIpResolver resolver = new ClientIpResolver(true);

        for (String untrustedPeer : List.of("192.168.1.50", "10.10.2.8", "172.17.0.5", "169.254.169.254", "198.51.100.77")) {
            HttpServletRequest req = mockRequest(untrustedPeer, "203.0.113.99", "203.0.113.88");
            assertFalse(resolver.isTrustedProxyHop(untrustedPeer), "Peer must not be trusted: " + untrustedPeer);
            assertEquals(untrustedPeer, resolver.resolve(req), "Spoofed headers must be ignored for peer: " + untrustedPeer);
        }
    }

    @Test
    @DisplayName("QA-3.3: Explicit trusted CIDR allowlist accepts Render CGNAT & Docker Nginx subnet hops")
    void explicitTrustedCidrAllowlistAcceptsEdgeHeaders() {
        ClientIpResolver resolver = new ClientIpResolver(
                true,
                List.of("172.28.0.0/24", "100.64.0.0/10", "203.0.113.10/32", "2001:db8:cafe::/48")
        );

        HttpServletRequest dockerNginxReq = mockRequest("172.28.0.5", null, "198.51.100.42");
        assertTrue(resolver.isTrustedProxyHop("172.28.0.5"));
        assertEquals("198.51.100.42", resolver.resolve(dockerNginxReq));

        HttpServletRequest renderEdgeReq = mockRequest("100.64.10.9", "198.51.100.55", null);
        assertEquals("198.51.100.55", resolver.resolve(renderEdgeReq));

        HttpServletRequest ipv6ProxyReq = mockRequest("2001:db8:cafe:1::10", "203.0.113.77", null);
        assertEquals("203.0.113.77", resolver.resolve(ipv6ProxyReq));

        // Sibling subnet 172.28.1.5 outside /24 must still be rejected
        HttpServletRequest untrustedSiblingSubnet = mockRequest("172.28.1.5", "198.51.100.99", null);
        assertEquals("172.28.1.5", resolver.resolve(untrustedSiblingSubnet));
    }

    @Test
    @DisplayName("QA-3.3: Disabling renderEdgeTrustEnabled ignores edge headers even from trusted proxy CIDRs")
    void disabledEdgeTrustIgnoresHeadersFromTrustedProxy() {
        ClientIpResolver resolver = new ClientIpResolver(false, List.of("172.28.0.0/24"));
        HttpServletRequest req = mockRequest("172.28.0.5", "198.51.100.12", "198.51.100.13");

        assertEquals("172.28.0.5", resolver.resolve(req));
    }

    @Test
    @DisplayName("QA-3.3: Empty, malformed, or /0 wildcard CIDRs fail closed")
    void emptyOrWildcardCidrsFailClosed() {
        ClientIpResolver resolver = new ClientIpResolver(true, List.of("0.0.0.0/0", "::/0", "not-a-cidr", "172.28.0.99/99"));
        HttpServletRequest req = mockRequest("198.51.100.77", "203.0.113.5", null);

        assertFalse(resolver.isTrustedProxyHop("198.51.100.77"));
        assertEquals("198.51.100.77", resolver.resolve(req));

        ClientIpResolver emptyAllowlist = new ClientIpResolver(true, Collections.emptyList());
        assertEquals("127.0.0.1", emptyAllowlist.resolve(mockRequest("127.0.0.1", "203.0.113.5", null)));
    }

    @Test
    @DisplayName("QA-3.3: Multi-value comma header in True-Client-IP falls back safely")
    void rejectsCommaDelimitedSpoofedEdgeHeader() {
        ClientIpResolver resolver = new ClientIpResolver(true, List.of("100.64.0.0/10"));
        HttpServletRequest req = mockRequest("100.64.10.9", "203.0.113.5, 198.51.100.1", "198.51.100.22");

        assertEquals("198.51.100.22", resolver.resolve(req));
    }

    private HttpServletRequest mockRequest(String remoteAddr, String trueClientIp, String cfConnectingIp) {
        HttpServletRequest req = Mockito.mock(HttpServletRequest.class);
        when(req.getRemoteAddr()).thenReturn(remoteAddr);
        when(req.getHeader("True-Client-IP")).thenReturn(trueClientIp);
        when(req.getHeader("CF-Connecting-IP")).thenReturn(cfConnectingIp);
        return req;
    }
}
