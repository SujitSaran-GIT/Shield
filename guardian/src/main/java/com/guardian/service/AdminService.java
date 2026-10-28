package com.guardian.service;

import com.guardian.entity.*;
import com.guardian.entity.User.UserRole;
import com.guardian.entity.User.UserStatus;
import com.guardian.entity.enums.EventType;
import com.guardian.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminService {
    private final UserRepository userRepository;
    private final UserService userService;
    private final AuditService auditService;
    private final TenantAccess access;
    private final PlatformBootstrapRepository bootstrap;
    private final AdminInvitationRepository invitations;
    private final ClientRepository clients;
    private final EmailVerificationService verification;
    private final PasswordEncoder encoder;
    private final AuthService auth;
    @Value("${app.bootstrap.secret:}")
    private String bootstrapSecret;
    @Value("${app.enrollment.client-admin-public-enabled:false}")
    private boolean publicEnrollment;

    public User registerAdmin(String username, String email, String password, String role, String ip, String agent) {
        throw new AccessDeniedException("Use verified bootstrap, enrollment or invitation provisioning");
    }

    @Transactional
    public UUID requestBootstrap(String secret, String email) {
        checkBootstrapSecret(secret);
        PlatformBootstrap state = lockBootstrap();
        ensureUninitialized(state);
        return verification.issue(normalize(email), "BOOTSTRAP", "initial-platform-admin");
    }

    @Transactional
    public User completeBootstrap(String secret, String email, String username, String password, String confirmation,
            UUID challengeId, String code) {
        checkBootstrapSecret(secret);
        PlatformBootstrap state = lockBootstrap();
        ensureUninitialized(state);
        email = normalize(email);
        checkPassword(password, confirmation);
        verification.consume(challengeId, email, "BOOTSTRAP", "initial-platform-admin", code);
        ensureInternalClient();
        User user = userService.registerAdminUser(generatedUsername(email), email, password, UserRole.SUPER_ADMIN);
        state.setCompleted(true);
        state.setCompletedAt(LocalDateTime.now());
        state.setAdministratorId(user.getId());
        bootstrap.save(state);
        event(user, EventType.ADMIN_CREATED, "Initial platform administrator provisioned");
        return user;
    }

    public UUID requestEnrollment(String email) {
        requirePublicEnrollment();
        return verification.issue(normalize(email), "CLIENT_ADMIN_ENROLL", "own-tenant-only");
    }

    @Transactional
    public User completeEnrollment(String email, String username, String password, String confirmation,
            UUID challengeId, String code) {
        requirePublicEnrollment();
        email = normalize(email);
        checkPassword(password, confirmation);
        verification.consume(challengeId, email, "CLIENT_ADMIN_ENROLL", "own-tenant-only", code);
        User user = userService.registerAdminUser(username, email, password, UserRole.CLIENT_ADMIN);
        event(user, EventType.ADMIN_CREATED, "Verified client administrator enrolled under public own-tenant policy");
        return user;
    }

    @Transactional
    public AdminInvitation invite(String email) {
        access.requireSuperAdmin();
        email = normalize(email);
        if (userRepository.existsByEmail(email))
            throw new IllegalArgumentException("Email already registered");
        AdminInvitation invite = new AdminInvitation();
        invite.setEmail(email);
        invite.setInvitedBy(access.currentUser().getId());
        invite.setCreatedAt(LocalDateTime.now());
        invite.setExpiresAt(LocalDateTime.now().plusHours(24));
        invitations.saveAndFlush(invite);
        invite.setChallengeId(verification.issue(email, "SUPER_ADMIN_INVITE", invite.getId().toString()));
        event(access.currentUser(), EventType.ADMIN_CREATED,
                "Platform administrator invitation created: " + invite.getId());
        return invitations.save(invite);
    }

    @Transactional
    public String verifyInvitation(UUID id, String code) {

        AdminInvitation invite = activeInvitation(id);

        if (invite.getVerifiedAt() != null)
            throw new IllegalArgumentException("Invitation already verified");

        verification.consume(invite.getChallengeId(), invite.getEmail(), "SUPER_ADMIN_INVITE", id.toString(), code);
        
        String token = randomToken();
        invite.setEnrollmentTokenHash(encoder.encode(token));
        invite.setVerifiedAt(LocalDateTime.now());
        invitations.save(invite);
        return token;
    }

    @Transactional
    public void confirmInvitation(UUID id) {
        access.requireSuperAdmin();
        AdminInvitation invite = activeInvitation(id);
        if (!invite.getInvitedBy().equals(access.currentUser().getId()))
            throw new AccessDeniedException("Only the inviting administrator may confirm");
        if (invite.getVerifiedAt() == null)
            throw new IllegalArgumentException("Recipient must verify email first");
        invite.setConfirmedAt(LocalDateTime.now());
        invitations.save(invite);
        event(access.currentUser(), EventType.ADMIN_UPDATED, "Platform administrator invitation confirmed: " + id);
    }

    @Transactional
    public User acceptInvitation(UUID id, String token, String username, String password, String confirmation) {
        AdminInvitation invite = activeInvitation(id);
        if (invite.getVerifiedAt() == null || invite.getConfirmedAt() == null || token == null
                || !encoder.matches(token, invite.getEnrollmentTokenHash()))
            throw new AccessDeniedException("Invitation verification and inviter confirmation required");
        User inviter = userRepository.findById(invite.getInvitedBy())
                .orElseThrow(() -> new AccessDeniedException("Invitation unavailable"));
        if (inviter.getStatus() != UserStatus.ACTIVE || !isPlatformRole(inviter.getRole()))
            throw new AccessDeniedException("Invitation unavailable");
        checkPassword(password, confirmation);
        User user = userService.registerAdminUser(username, invite.getEmail(), password, UserRole.SUPER_ADMIN);
        invite.setAcceptedAt(LocalDateTime.now());
        invite.setEnrollmentTokenHash(null);
        invitations.save(invite);
        event(user, EventType.ADMIN_CREATED, "Platform administrator invitation accepted: " + id);
        return user;
    }

    @Transactional
    public void revokeInvitation(UUID id) {
        access.requireSuperAdmin();
        AdminInvitation invite = activeInvitation(id);
        invite.setRevokedAt(LocalDateTime.now());
        invite.setEnrollmentTokenHash(null);
        invitations.save(invite);
        event(access.currentUser(), EventType.ADMIN_UPDATED, "Platform administrator invitation revoked: " + id);
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<AdminInvitation> listInvitations(
            org.springframework.data.domain.Pageable pageable) {
        access.requireSuperAdmin();
        return invitations.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public User getAdminById(UUID id) {
        access.requireSuperAdmin();
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Administrator not found"));
        if (!isPlatformRole(user.getRole()) && user.getRole() != UserRole.CLIENT_ADMIN)
            throw new IllegalArgumentException("Administrator not found");
        return user;
    }

    public User updateAdminRole(UUID id, String role) {
        throw new AccessDeniedException(
                "Administrative privileges require a verified invitation; role mutation is disabled");
    }

    @Transactional
    public void deactivateAdmin(UUID id) {
        changeStatus(id, UserStatus.SUSPENDED);
    }

    @Transactional
    public void activateAdmin(UUID id) {
        changeStatus(id, UserStatus.ACTIVE);
    }

    private void changeStatus(UUID id, UserStatus status) {
        access.requireSuperAdmin();
        lockBootstrap();
        User user = getAdminById(id);
        userService.lockCredentials(user);
        if (access.currentUser().getId().equals(id))
            throw new IllegalArgumentException("Cannot suspend your own administrator account");
        user.setStatus(status);
        userRepository.save(user);
        if (status != UserStatus.ACTIVE)
            auth.revokeUser(user.getId());
        event(user, EventType.ADMIN_UPDATED, "Administrator status changed to " + status);
    }

    @Transactional
    public User updateUsername(String username) {
        User user = access.currentUser();
        if (username == null || !username.matches("[A-Za-z0-9_.-]{3,50}"))
            throw new IllegalArgumentException("Invalid username");
        if (!username.equals(user.getUsername()) && userRepository.existsByUsernameIgnoreCase(username))
            throw new IllegalArgumentException("Username unavailable");
        user.setUsername(username);
        userRepository.saveAndFlush(user);
        event(user, EventType.ADMIN_UPDATED, "Profile username updated");
        return user;
    }

    private PlatformBootstrap lockBootstrap() {
        return bootstrap.lockState()
                .orElseThrow(() -> new IllegalStateException("Bootstrap state missing; run migrations"));
    }

    private void ensureUninitialized(PlatformBootstrap state) {
        if (state.isCompleted()
                || userRepository.existsByRoleIn(List.of(UserRole.SUPER_ADMIN, UserRole.GUARDIAN_ADMIN)))
            throw new AccessDeniedException("Platform initialization is closed");
    }

    private void checkBootstrapSecret(String supplied) {
        if (bootstrapSecret.length() < 32 || supplied == null || !MessageDigest
                .isEqual(bootstrapSecret.getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8)))
            throw new AccessDeniedException("Bootstrap authorization failed");
    }

    private void requirePublicEnrollment() {
        if (!publicEnrollment)
            throw new AccessDeniedException("Public client administrator enrollment is disabled");
    }

    private AdminInvitation activeInvitation(UUID id) {
        AdminInvitation invite = invitations.lockById(id)
                .orElseThrow(() -> new IllegalArgumentException("Invitation unavailable"));
        if (invite.getAcceptedAt() != null || invite.getRevokedAt() != null
                || !invite.getExpiresAt().isAfter(LocalDateTime.now()))
            throw new IllegalArgumentException("Invitation unavailable");
        return invite;
    }

    private void ensureInternalClient() {
        if (!clients.existsByClientId("GUARDIAN_SYSTEM"))
            clients.save(Client.builder().clientId("GUARDIAN_SYSTEM").clientKey(encoder.encode(randomToken()))
                    .name("Shield internal platform").description("Internal identity only; no shared human credential")
                    .allowedOrigins(List.of()).idleTimeout(1800).status(Client.ClientStatus.ACTIVE).build());
    }

    private static String generatedUsername(String email) {
        String prefix = email.substring(0, email.indexOf('@')).replaceAll("[^A-Za-z0-9_.-]", "_");
        return prefix.substring(0, Math.min(prefix.length(), 30)) + "_" + UUID.randomUUID().toString().substring(0, 12);
    }

    private static String normalize(String email) {
        if (email == null || !email.trim().matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+"))
            throw new IllegalArgumentException("Invalid email");
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static void checkPassword(String password, String confirmation) {
        PasswordRecoveryService.validatePassword(password, confirmation);
    }

    private static boolean isPlatformRole(UserRole role) {
        return role == UserRole.SUPER_ADMIN || role == UserRole.GUARDIAN_ADMIN;
    }

    private static String randomToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private void event(User user, EventType type, String details) {
        auditService.logEvent(type, "GUARDIAN_SYSTEM", "Shield", user.getId(), user.getEmail(), null, null, 200,
                details);
    }
}
