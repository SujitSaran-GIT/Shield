package com.guardian.service;

import com.guardian.config.JwtConfig;
import com.guardian.entity.*;
import com.guardian.repository.*;
import com.guardian.util.EncryptionUtil;
import com.guardian.util.TokenFingerprint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@DataJpaTest(properties = {"spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop"})
@Import({AuthService.class, UserService.class, ClientService.class, JwtService.class,
        LifecycleConcurrencyIntegrationTest.Config.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class LifecycleConcurrencyIntegrationTest {
    @Autowired AuthService auth;
    @Autowired UserService users;
    @Autowired ClientService clients;
    @Autowired JwtService jwt;
    @Autowired UserRepository userRepository;
    @Autowired ClientRepository clientRepository;
    @Autowired RefreshTokenRepository refresh;
    @Autowired UserSessionRepository sessions;
    @MockitoBean TenantAccess access;
    @MockitoBean AuditService audit;
    @MockitoBean RateLimitService rates;
    @MockitoBean GeoIpService geo;
    @MockitoBean EncryptionUtil encryption;
    private User member;
    private Client tenant;

    @TestConfiguration static class Config {
        @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(4); }
        @Bean JwtConfig jwtConfig() {
            JwtConfig c = new JwtConfig(); c.setSecret("test-only-signing-key-at-least-32-bytes-long");
            c.setIssuer("shield-tests"); c.setExpiration(60000L); c.setRefreshExpiration(120000L); return c;
        }
    }

    @BeforeEach void setup() {
        refresh.deleteAll(); sessions.deleteAll(); userRepository.deleteAll(); clientRepository.deleteAll();
        tenant = clientRepository.saveAndFlush(Client.builder().clientId("race-tenant").clientKey("hash")
                .name("Race Tenant").allowedOrigins(new ArrayList<>(List.of("https://example.com")))
                .status(Client.ClientStatus.ACTIVE).idleTimeout(1800).build());
        member = userRepository.saveAndFlush(User.builder().email("race@example.test").username("race-user")
                .passwordHash("hash").role(User.UserRole.USER).status(User.UserStatus.ACTIVE)
                .clientId(tenant.getClientId()).build());
        when(access.currentUser()).thenReturn(member);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void lifecycleChangeWaitsForRefreshAndRevokesItsSuccessor(boolean blockAccount) throws Exception {
        String old = jwt.generateRefreshToken(member.getId(), member.getEmail(), tenant.getClientId());
        refresh.saveAndFlush(RefreshToken.builder().token(TokenFingerprint.of(old)).userId(member.getId())
                .clientId(tenant.getClientId()).expiresAt(LocalDateTime.now().plusMinutes(2)).revoked(false).build());
        CountDownLatch issuing = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(geo.getLocation(any())).thenAnswer(invocation -> {
            issuing.countDown();
            if (!release.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Test issuance timed out");
            return "Unknown";
        });
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<AuthService.TokenRefreshResult> rotation = pool.submit(() ->
                    auth.refreshToken(old, tenant.getClientId(), "127.0.0.1", "race-test"));
            assertThat(issuing.await(10, TimeUnit.SECONDS)).isTrue();
            CountDownLatch changing = new CountDownLatch(1);
            Future<?> lifecycle = pool.submit(() -> {
                changing.countDown();
                if (blockAccount) users.blockUser(member.getId()); else clients.deactivateClient(tenant.getId());
            });
            assertThat(changing.await(5, TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(() -> lifecycle.get(200, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
            release.countDown();
            AuthService.TokenRefreshResult replacement = rotation.get(10, TimeUnit.SECONDS);
            lifecycle.get(10, TimeUnit.SECONDS);
            if (blockAccount) users.unblockUser(member.getId()); else clients.activateClient(tenant.getId());
            assertThat(refresh.findByUserId(member.getId())).allMatch(t -> Boolean.TRUE.equals(t.getRevoked()));
            assertThat(sessions.findByUserIdAndActiveTrue(member.getId())).isEmpty();
            assertThatThrownBy(() -> auth.refreshToken(replacement.refreshToken(), tenant.getClientId(), "127.0.0.1", "race-test"))
                    .isInstanceOf(BadCredentialsException.class);
        } finally { release.countDown(); pool.shutdownNow(); }
    }
}
