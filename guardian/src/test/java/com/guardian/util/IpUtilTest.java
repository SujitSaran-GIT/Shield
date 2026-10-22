package com.guardian.util;

import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockHttpServletRequest;
import static org.assertj.core.api.Assertions.*;

class IpUtilTest {
    @AfterEach void resetTrust() { new IpUtil(""); }

    @Test void arbitraryForwardedHeadersCannotSpoofClientIp() {
        new IpUtil("");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.20");
        request.addHeader("X-Forwarded-For", "8.8.8.8");
        request.addHeader("HTTP_CLIENT_IP", "1.1.1.1");
        assertThat(IpUtil.getClientIpAddress(request)).isEqualTo("203.0.113.20");
    }

    @Test void trustedProxyChainStopsAtFirstUntrustedHopFromRight() {
        new IpUtil("10.0.0.0/8");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.2");
        request.addHeader("X-Forwarded-For", "1.1.1.1, 203.0.113.7, 10.0.0.1");
        assertThat(IpUtil.getClientIpAddress(request)).isEqualTo("203.0.113.7");
    }

    @Test void malformedForwardedChainFallsBackToPeer() {
        new IpUtil("127.0.0.1");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Forwarded-For", "attacker.example.com");
        assertThat(IpUtil.getClientIpAddress(request)).isEqualTo("127.0.0.1");
    }

    @Test void normalizerRejectsHostnamesPortsAndAmbiguousIpFormats() {
        for (String value : new String[]{"example.com", "127.1", "010.0.0.1", "8.8.8.8:443", "256.1.2.3", "::1%0"})
            assertThat(IpUtil.normalize(value)).isNull();
        assertThat(IpUtil.normalize("8.8.8.8")).isEqualTo("8.8.8.8");
        assertThat(IpUtil.normalize("2001:4860:4860::8888")).isNotNull();
    }
}
