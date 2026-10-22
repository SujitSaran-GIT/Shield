package com.guardian.service;

import com.guardian.entity.*;
import com.guardian.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Exercises transactional locks and persistence, rather than simulating a lock with mocks. */
@DataJpaTest(properties={"spring.flyway.enabled=false","spring.jpa.hibernate.ddl-auto=create-drop",
        "app.bootstrap.secret=integration-test-bootstrap-secret-with-32-bytes"})
@Import({AdminService.class,UserService.class,AdminProvisioningIntegrationTest.Config.class})
@Transactional(propagation=Propagation.NOT_SUPPORTED)
class AdminProvisioningIntegrationTest {
    @Autowired AdminService service;
    @Autowired UserRepository users;
    @Autowired PlatformBootstrapRepository states;
    @Autowired AdminInvitationRepository invitations;
    @Autowired PasswordEncoder encoder;
    @MockitoBean TenantAccess access;
    @MockitoBean AuditService audit;
    @MockitoBean EmailVerificationService verification;
    @MockitoBean AuthService auth;

    @TestConfiguration static class Config {
        @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(4); }
    }

    @BeforeEach void prepareBootstrap() {
        invitations.deleteAll(); states.deleteAll();
        // This test context owns its disposable H2 database; no application data is touched.
        users.deleteAll();
        PlatformBootstrap state=new PlatformBootstrap(); state.setId(1);state.setCompleted(false);
        states.saveAndFlush(state);
    }

    @Test void concurrentBootstrapCreatesExactlyOneAdministratorAndPermanentlyCloses() throws Exception {
        List<Boolean> outcomes=race(() -> {
            try {
                service.completeBootstrap("integration-test-bootstrap-secret-with-32-bytes",
                        UUID.randomUUID()+"@example.test",null,"strong-password","strong-password",UUID.randomUUID(),"123456");
                return true;
            } catch(AccessDeniedException expected) { return false; }
        });
        assertThat(outcomes).containsExactlyInAnyOrder(true,false);
        assertThat(users.findAll()).hasSize(1).allMatch(u -> u.getRole()==User.UserRole.SUPER_ADMIN);
        assertThat(states.findById(1).orElseThrow().isCompleted()).isTrue();
        verify(verification,times(1)).consume(any(),anyString(),eq("BOOTSTRAP"),eq("initial-platform-admin"),eq("123456"));
        assertThatThrownBy(() -> service.requestBootstrap("integration-test-bootstrap-secret-with-32-bytes","other@example.test"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test void concurrentInvitationAcceptanceCannotCreateTwoAccountsOrReplay() throws Exception {
        User inviter=users.saveAndFlush(User.builder().username("inviter").email("inviter@example.test")
                .passwordHash(encoder.encode("strong-password")).role(User.UserRole.SUPER_ADMIN)
                .status(User.UserStatus.ACTIVE).clientId("GUARDIAN_SYSTEM").build());
        AdminInvitation invitation=new AdminInvitation();invitation.setEmail("recipient@example.test");
        invitation.setInvitedBy(inviter.getId());invitation.setCreatedAt(LocalDateTime.now());
        invitation.setExpiresAt(LocalDateTime.now().plusHours(1));invitation.setVerifiedAt(LocalDateTime.now());
        invitation.setConfirmedAt(LocalDateTime.now());invitation.setEnrollmentTokenHash(encoder.encode("recipient-enrollment-token"));
        UUID id=invitations.saveAndFlush(invitation).getId();
        assertThat(race(() -> {
            try {
                service.acceptInvitation(id,"recipient-enrollment-token","recipient","strong-password","strong-password");
                return true;
            } catch(IllegalArgumentException expected) { return false; }
        })).containsExactlyInAnyOrder(true,false);
        assertThat(users.count()).isEqualTo(2);
        AdminInvitation accepted=invitations.findById(id).orElseThrow();
        assertThat(accepted.getAcceptedAt()).isNotNull();assertThat(accepted.getEnrollmentTokenHash()).isNull();
    }

    private List<Boolean> race(Callable<Boolean> operation) throws Exception {
        ExecutorService pool=Executors.newFixedThreadPool(2);CountDownLatch start=new CountDownLatch(1);
        Callable<Boolean> task=() -> { start.await();return operation.call(); };
        try {
            Future<Boolean> first=pool.submit(task),second=pool.submit(task);start.countDown();
            return List.of(first.get(20,TimeUnit.SECONDS),second.get(20,TimeUnit.SECONDS));
        } finally { pool.shutdownNow(); }
    }
}
