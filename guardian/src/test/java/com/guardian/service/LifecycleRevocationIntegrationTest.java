package com.guardian.service;

import com.guardian.entity.*;
import com.guardian.repository.*;
import com.guardian.util.EncryptionUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@DataJpaTest(properties = {"spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop"})
@Import({UserService.class, ClientService.class, LifecycleRevocationIntegrationTest.Config.class})
class LifecycleRevocationIntegrationTest {
    @Autowired UserService users;
    @Autowired ClientService clients;
    @Autowired UserRepository userRepository;
    @Autowired ClientRepository clientRepository;
    @Autowired RefreshTokenRepository refresh;
    @Autowired UserSessionRepository sessions;
    @Autowired jakarta.persistence.EntityManager entityManager;
    @MockitoBean TenantAccess access;
    @MockitoBean AuditService audit;
    @MockitoBean EncryptionUtil encryption;
    private Client tenant;
    private User member;

    @TestConfiguration static class Config {
        @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(4); }
    }

    @BeforeEach void setup() {
        tenant = clientRepository.saveAndFlush(Client.builder().clientId("tenant-one").clientKey("hash")
                .name("Tenant One").allowedOrigins(new java.util.ArrayList<>(List.of("https://example.com")))
                .status(Client.ClientStatus.ACTIVE).idleTimeout(1800).build());
        member = userRepository.saveAndFlush(User.builder().email("member@example.com").username("member")
                .passwordHash("hash").role(User.UserRole.USER).status(User.UserStatus.ACTIVE)
                .clientId(tenant.getClientId()).build());
        when(access.currentUser()).thenReturn(member);
        persistCredentials(member, tenant.getClientId(), "existing");
    }

    private void persistCredentials(User owner, String clientId, String token) {
        refresh.saveAndFlush(RefreshToken.builder().token(token + "-refresh").userId(owner.getId())
                .clientId(clientId).revoked(false).expiresAt(LocalDateTime.now().plusHours(1)).build());
        sessions.saveAndFlush(UserSession.builder().sessionToken(token + "-access").userId(owner.getId())
                .clientId(clientId).active(true).expiresAt(LocalDateTime.now().plusHours(1)).build());
    }

    @Test void blockingThenUnblockingCannotReviveOldCredentials() {
        users.blockUser(member.getId());
        users.unblockUser(member.getId());
        entityManager.flush(); entityManager.clear();
        assertThat(userRepository.findById(member.getId()).orElseThrow().getStatus()).isEqualTo(User.UserStatus.ACTIVE);
        assertThat(refresh.findByUserId(member.getId())).allMatch(t -> Boolean.TRUE.equals(t.getRevoked()));
        assertThat(sessions.findByUserIdAndActiveTrue(member.getId())).isEmpty();
        verify(audit).logEvent(eq(com.guardian.entity.enums.EventType.ADMIN_UPDATED), eq(tenant.getClientId()),
                isNull(), eq(member.getId()), eq(member.getEmail()), isNull(), isNull(), eq(200),
                contains("status changed to BLOCKED"));
    }

    @Test void suspensionRevokesOnlyThisClientsCredentialsEvenAfterReactivation() {
        persistCredentials(member, "other-tenant", "other");
        clients.deactivateClient(tenant.getId());
        clients.activateClient(tenant.getId());
        entityManager.flush(); entityManager.clear();
        assertThat(clientRepository.findById(tenant.getId()).orElseThrow().getStatus()).isEqualTo(Client.ClientStatus.ACTIVE);
        assertThat(refresh.findByUserId(member.getId())).filteredOn(t -> t.getClientId().equals(tenant.getClientId()))
                .allMatch(t -> Boolean.TRUE.equals(t.getRevoked()));
        assertThat(refresh.findByUserId(member.getId())).filteredOn(t -> t.getClientId().equals("other-tenant"))
                .allMatch(t -> Boolean.FALSE.equals(t.getRevoked()));
        assertThat(sessions.findByUserIdAndActiveTrue(member.getId())).extracting(UserSession::getClientId)
                .containsExactly("other-tenant");
    }

    @Test void unauthorizedBlockLeavesAccountAndCredentialsUntouched() {
        doThrow(new AccessDeniedException("denied")).when(access).requireUserManagement(any());
        assertThatThrownBy(() -> users.blockUser(member.getId())).isInstanceOf(AccessDeniedException.class);
        assertThat(member.getStatus()).isEqualTo(User.UserStatus.ACTIVE);
        assertThat(refresh.findByUserId(member.getId())).allMatch(t -> Boolean.FALSE.equals(t.getRevoked()));
        assertThat(sessions.findByUserIdAndActiveTrue(member.getId())).hasSize(1);
        verifyNoInteractions(audit);
    }

    @Test void multibytePasswordBeyondBcryptLimitIsRejectedBeforePersistence() {
        assertThatThrownBy(() -> users.registerUser("another", "another@example.com", "é".repeat(37), tenant.getClientId()))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("72 UTF-8 bytes");
        assertThat(userRepository.findByEmail("another@example.com")).isEmpty();
        assertThatCode(() -> users.registerUser("another", "another@example.com", "é".repeat(36), tenant.getClientId()))
                .doesNotThrowAnyException();
    }

    @Test void softDeletionPreservesHistoryRevokesCredentialsAndCannotBeUndoneByUnblock() {
        users.deleteUser(member.getId());
        entityManager.flush(); entityManager.clear();
        assertThat(userRepository.findById(member.getId()).orElseThrow().getStatus()).isEqualTo(User.UserStatus.DELETED);
        assertThat(refresh.findByUserId(member.getId())).hasSize(1).allMatch(t -> Boolean.TRUE.equals(t.getRevoked()));
        assertThat(sessions.findByUserId(member.getId())).hasSize(1).allMatch(s -> Boolean.FALSE.equals(s.getActive()));
        assertThatThrownBy(() -> users.unblockUser(member.getId())).isInstanceOf(IllegalArgumentException.class);
    }

    @Test void userFiltersAreCombinedWithOwnedClientScope() {
        userRepository.saveAndFlush(User.builder().email("foreign@example.com").username("foreign")
                .passwordHash("hash").role(User.UserRole.USER).status(User.UserStatus.ACTIVE).clientId("foreign").build());
        when(access.authorizedClientIds()).thenReturn(List.of(tenant.getClientId()));
        var page = org.springframework.data.domain.PageRequest.of(0, 10);
        assertThat(users.getFilteredUsers("MEMBER", User.UserStatus.ACTIVE, User.UserRole.USER, "tenant", page).getTotalElements()).isEqualTo(1);
        assertThat(users.getFilteredUsers("foreign", null, null, null, page).getTotalElements()).isZero();
        assertThat(users.getFilteredUsers(null, User.UserStatus.BLOCKED, null, null, page).getTotalElements()).isZero();
        assertThat(users.getFilteredUsers(null, null, null, "nonexistent", page).getTotalElements()).isZero();
    }
}
