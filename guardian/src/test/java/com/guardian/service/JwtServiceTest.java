package com.guardian.service;

import com.guardian.config.JwtConfig;
import org.junit.jupiter.api.*;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class JwtServiceTest {
    private JwtService jwt;
    private JwtConfig config;
    @BeforeEach void setup() {
        config = new JwtConfig(); config.setSecret("test-only-signing-key-at-least-32-bytes-long");
        config.setIssuer("shield-tests"); config.setExpiration(60000L); config.setRefreshExpiration(120000L);
        jwt = new JwtService(config);
    }
    @Test void uuidClaimsRoundTripAndTokensAreUnique() {
        UUID id = UUID.randomUUID();
        String first = jwt.generateToken(id, "user@example.test", "tenant", "USER");
        assertThat(jwt.validateToken(first)).isTrue();
        assertThat(jwt.extractUserId(first)).isEqualTo(id);
        assertThat(jwt.isAccessToken(first)).isTrue();
        assertThat(first).isNotEqualTo(jwt.generateToken(id, "user@example.test", "tenant", "USER"));
    }
    @Test void refreshAndAccessAreDistinguished() {
        String token = jwt.generateRefreshToken(UUID.randomUUID(), "user@example.test", "tenant");
        assertThat(jwt.isAccessToken(token)).isFalse(); assertThat(jwt.isRefreshToken(token)).isTrue();
    }
    @Test void unexpectedIssuerIsRejected() {
        String token = jwt.generateToken(UUID.randomUUID(), "user@example.test", "tenant", "USER");
        config.setIssuer("different-issuer"); assertThat(jwt.validateToken(token)).isFalse();
    }
    @Test void expiredAndMalformedTokensAreRejected() {
        config.setExpiration(-10000L);
        assertThat(jwt.validateToken(jwt.generateToken(UUID.randomUUID(), "u@example.test", "tenant", "USER"))).isFalse();
        assertThat(jwt.validateToken("malformed")).isFalse();
    }
}
