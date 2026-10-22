package com.guardian.service;

import com.guardian.config.JwtConfig;
import com.guardian.entity.*;
import com.guardian.repository.*;
import com.guardian.util.TokenFingerprint;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.*;
import org.springframework.security.authentication.BadCredentialsException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@DataJpaTest(properties = {"spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
        "jwt.secret=test-only-signing-key-at-least-32-bytes-long", "jwt.issuer=shield-tests",
        "jwt.expiration=60000", "jwt.refresh-expiration=120000"})
@Import({AuthService.class, JwtService.class, TokenRotationIntegrationTest.Config.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class TokenRotationIntegrationTest {
    @Autowired AuthService auth;
    @Autowired JwtService jwt;
    @Autowired RefreshTokenRepository refresh;
    @Autowired UserSessionRepository sessions;
    @MockitoBean UserService users;
    @MockitoBean ClientService clients;
    @MockitoBean AuditService audit;
    @MockitoBean RateLimitService rates;
    @MockitoBean GeoIpService geo;
    private User user;
    @TestConfiguration static class Config {
        @Bean JwtConfig jwtConfig() {
            JwtConfig c = new JwtConfig(); c.setSecret("test-only-signing-key-at-least-32-bytes-long");
            c.setIssuer("shield-tests"); c.setExpiration(60000L); c.setRefreshExpiration(120000L); return c;
        }
    }
    @BeforeEach void setup() {
        refresh.deleteAll(); sessions.deleteAll();
        user = User.builder().id(UUID.randomUUID()).email("admin@example.test").username("admin-test")
                .role(User.UserRole.SUPER_ADMIN).status(User.UserStatus.ACTIVE).clientId("GUARDIAN_SYSTEM").build();
        when(users.getUserById(user.getId())).thenReturn(user);
        when(geo.getLocation(any())).thenReturn("Unknown");
    }
    private String initialToken() {
        String token = jwt.generateRefreshToken(user.getId(), user.getEmail(), "GUARDIAN_SYSTEM");
        refresh.saveAndFlush(RefreshToken.builder().token(TokenFingerprint.of(token)).userId(user.getId())
                .clientId("GUARDIAN_SYSTEM").expiresAt(LocalDateTime.now().plusMinutes(2)).revoked(false).build());
        return token;
    }
    @Test void rotationPersistsNewSessionAndReplayCommitsRevocation() {
        String old = initialToken();
        var replacement = auth.refreshToken(old, "GUARDIAN_SYSTEM", "127.0.0.1", "test");
        assertThat(auth.authenticateAccessToken(replacement.accessToken()).getId()).isEqualTo(user.getId());
        assertThatThrownBy(() -> auth.refreshToken(old, "GUARDIAN_SYSTEM", "127.0.0.1", "test"))
                .isInstanceOf(BadCredentialsException.class);
        assertThat(refresh.findByUserId(user.getId())).allMatch(t -> Boolean.TRUE.equals(t.getRevoked()));
        assertThat(sessions.findByUserIdAndActiveTrue(user.getId())).isEmpty();
        assertThatThrownBy(() -> auth.authenticateAccessToken(replacement.accessToken())).isInstanceOf(BadCredentialsException.class);
    }
    @Test void simultaneousRefreshCannotCreateTwoActiveSuccessors() throws Exception {
        String old = initialToken();
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<Boolean> rotate = () -> { start.await(); try {
            auth.refreshToken(old, "GUARDIAN_SYSTEM", "127.0.0.1", "test"); return true;
        } catch (BadCredentialsException expected) { return false; } };
        try {
            Future<Boolean> a = pool.submit(rotate); Future<Boolean> b = pool.submit(rotate); start.countDown();
            assertThat(List.of(a.get(10, TimeUnit.SECONDS), b.get(10, TimeUnit.SECONDS))).containsExactlyInAnyOrder(true, false);
            assertThat(refresh.findByUserId(user.getId())).allMatch(t -> Boolean.TRUE.equals(t.getRevoked()));
            assertThat(sessions.findByUserIdAndActiveTrue(user.getId())).isEmpty();
        } finally { pool.shutdownNow(); }
    }
    @Test void refreshTokensCannotActAsAccessAndBlockedAccountsCannotRefresh() {
        String old = initialToken();
        assertThatThrownBy(() -> auth.authenticateAccessToken(old)).isInstanceOf(BadCredentialsException.class);
        user.setStatus(User.UserStatus.BLOCKED);
        assertThatThrownBy(() -> auth.refreshToken(old, "GUARDIAN_SYSTEM", "127.0.0.1", "test"))
                .isInstanceOf(BadCredentialsException.class);
    }
}
