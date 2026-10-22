package com.guardian.service;

import com.guardian.entity.User;
import com.guardian.entity.enums.EventType;
import com.guardian.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PasswordRecoveryService {
    private final UserRepository users;
    private final EmailVerificationService verification;
    private final PasswordEncoder encoder;
    private final AuthService auth;
    private final AuditService audit;
    private final RateLimitService rateLimits;

    public UUID request(String email) {
        email = EmailVerificationService.normalize(email);
        if (!rateLimits.allowAccountAttempt("password-reset", email, 5, 15))
            throw new com.guardian.exception.RateLimitExceededException("Too many reset requests");
        Optional<User> user = users.findByEmail(email);
        // Deliver the same neutral verification message for unknown addresses too. This avoids
        // leaking account existence through delivery latency or SMTP failure responses.
        String binding = user.filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                .map(u -> u.getId().toString()).orElseGet(() -> UUID.randomUUID().toString());
        return verification.issue(email, "PASSWORD_RESET", binding);
    }

    @Transactional
    public void reset(String email, UUID challengeId, String code, String password, String confirmation,
                      String ip, String agent) {
        validatePassword(password, confirmation);
        User user = users.findByEmail(EmailVerificationService.normalize(email))
                .filter(u -> u.getStatus() == User.UserStatus.ACTIVE)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired verification code"));
        auth.lockUserCredentials(user);
        if (user.getStatus() != User.UserStatus.ACTIVE) throw new IllegalArgumentException("Invalid or expired verification code");
        verification.consume(challengeId, user.getEmail(), "PASSWORD_RESET", user.getId().toString(), code);
        user.setPasswordHash(encoder.encode(password));
        users.save(user);
        auth.revokeUser(user.getId());
        audit.logEvent(EventType.ADMIN_UPDATED, user.getClientId(), null, user.getId(), user.getEmail(),
                ip, agent, 200, "Password reset completed; all sessions revoked");
    }

    @Transactional
    public void change(UUID userId, String current, String password, String confirmation, String ip, String agent) {
        validatePassword(password, confirmation);
        User user = users.findById(userId).orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        auth.lockUserCredentials(user);
        if (user.getStatus() != User.UserStatus.ACTIVE) throw new BadCredentialsException("Invalid credentials");
        if (!encoder.matches(current, user.getPasswordHash())) throw new BadCredentialsException("Invalid credentials");
        user.setPasswordHash(encoder.encode(password)); users.save(user); auth.revokeUser(userId);
        audit.logEvent(EventType.ADMIN_UPDATED, user.getClientId(), null, user.getId(), user.getEmail(),
                ip, agent, 200, "Password changed; all sessions revoked");
    }

    public static void validatePassword(String password, String confirmation) {
        if (password == null || password.length() < 12 || password.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new IllegalArgumentException("Password must contain at least 12 characters and at most 72 UTF-8 bytes");
        if (!password.equals(confirmation)) throw new IllegalArgumentException("Passwords do not match");
    }

    public UUID requestEmailChange(UUID userId, String email, String currentPassword) {
        User user = reauthenticate(userId, currentPassword);
        email = EmailVerificationService.normalize(email);
        if (users.existsByEmail(email)) throw new IllegalArgumentException("Email unavailable");
        return verification.issue(email, "EMAIL_CHANGE", emailBinding(user));
    }

    @Transactional
    public void changeEmail(UUID userId, String email, UUID challengeId, String otp, String currentPassword,
                            String ip, String agent) {
        User locked = users.findById(userId).orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        auth.lockUserCredentials(locked);
        User user = reauthenticate(userId, currentPassword);
        email = EmailVerificationService.normalize(email);
        if (users.existsByEmail(email)) throw new IllegalArgumentException("Email unavailable");
        verification.consume(challengeId, email, "EMAIL_CHANGE", emailBinding(user), otp);
        user.setEmail(email); users.saveAndFlush(user); auth.revokeUser(userId);
        audit.logEvent(EventType.ADMIN_UPDATED, user.getClientId(), null, user.getId(), user.getEmail(),
                ip, agent, 200, "Verified email address changed; all sessions revoked");
    }

    private User reauthenticate(UUID userId, String current) {
        User user = users.findById(userId).orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        if (user.getStatus() != User.UserStatus.ACTIVE || current == null
                || !encoder.matches(current, user.getPasswordHash())) throw new BadCredentialsException("Invalid credentials");
        return user;
    }

    private static String emailBinding(User user) {
        return com.guardian.util.TokenFingerprint.of(user.getId() + ":" + user.getEmail());
    }
}
