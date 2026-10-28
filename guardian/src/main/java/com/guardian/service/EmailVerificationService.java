package com.guardian.service;

import com.guardian.entity.EmailChallenge;
import com.guardian.repository.EmailChallengeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

/**
 * Email proof is bound to both a server-chosen purpose and operation context.
 */
@Service
@RequiredArgsConstructor
public class EmailVerificationService {
    private final EmailChallengeRepository repository;
    private final PasswordEncoder encoder;
    private final JavaMailSender mail;
    private final RateLimitService rateLimitService;
    private final SecureRandom random = new SecureRandom();
    @Value("${app.mail.from:shield@localhost}")
    private String from;
    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl = "http://localhost:5173";

    @Transactional
    public UUID issue(String email, String purpose, String binding) {
        email = normalize(email);
        if (!rateLimitService.allowAccountAttempt("email-verification-send", email, 5, 15)) {
            throw new com.guardian.exception.RateLimitExceededException("Too many verification requests");
        }

        String code = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));

        EmailChallenge challenge = repository.save(
                EmailChallenge.builder()
                        .email(email).purpose(purpose).binding(binding).codeHash(encoder.encode(code))
                        .expiresAt(Instant.now().plusSeconds(600))
                        .attempts(0).consumed(false).build());

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(from);
        message.setTo(email);
        message.setSubject("Your Shield verification code");
        String invitation = "SUPER_ADMIN_INVITE".equals(purpose)
                ? "\nComplete your invitation at " + frontendUrl.replaceAll("/$", "") + "/invitation?id=" + binding
                        + "\nYour inviting administrator must confirm the invitation after email verification."
                : "";
        message.setText("Your verification code is " + code + ". It expires in 10 minutes. "
                + "If you did not request this code, ignore this message." + invitation);
        try {
            mail.send(message);
        } catch (org.springframework.mail.MailException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Email delivery unavailable");
        }
        return challenge.getId();
    }

    /**
     * Separate transaction makes attempt counters and single-use consumption
     * durable on caller failure.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = IllegalArgumentException.class)
    public void consume(UUID challengeId, String email, String purpose, String binding, String code) {
        if (challengeId == null)
            throw invalid();
        EmailChallenge challenge = repository.lockById(challengeId).orElseThrow(EmailVerificationService::invalid);
        if (challenge.isConsumed() || !challenge.getExpiresAt().isAfter(Instant.now()) || challenge.getAttempts() >= 5
                || !challenge.getEmail().equals(normalize(email)) || !Objects.equals(challenge.getPurpose(), purpose)
                || !Objects.equals(challenge.getBinding(), binding))
            throw invalid();
        challenge.setAttempts(challenge.getAttempts() + 1);
        if (code == null || !code.matches("[0-9]{6}") || !encoder.matches(code, challenge.getCodeHash())) {
            repository.saveAndFlush(challenge);
            throw invalid();
        }
        challenge.setConsumed(true);
        repository.saveAndFlush(challenge);
    }

    public static String normalize(String email) {
        if (email == null || email.isBlank() || email.length() > 254 || !email.contains("@"))
            throw new IllegalArgumentException("A valid email is required");
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static IllegalArgumentException invalid() {
        return new IllegalArgumentException("Invalid or expired verification code");
    }
}
