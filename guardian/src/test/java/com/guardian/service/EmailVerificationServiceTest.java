package com.guardian.service;

import com.guardian.entity.EmailChallenge;
import com.guardian.repository.EmailChallengeRepository;
import org.junit.jupiter.api.*;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.mockito.ArgumentCaptor;

class EmailVerificationServiceTest {
    private final EmailChallengeRepository repository = mock(EmailChallengeRepository.class);
    private final JavaMailSender mail = mock(JavaMailSender.class);
    private final RateLimitService rate = mock(RateLimitService.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final EmailVerificationService service = new EmailVerificationService(repository, encoder, mail, rate);
    private EmailChallenge challenge;
    @BeforeEach void setup() {
        challenge = EmailChallenge.builder().id(UUID.randomUUID()).email("user@example.test").purpose("ENROLL")
                .binding("tenant").codeHash(encoder.encode("123456")).expiresAt(Instant.now().plusSeconds(600)).build();
        when(repository.lockById(challenge.getId())).thenReturn(Optional.of(challenge));
        when(repository.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
    }
    @Test void validCodeIsSingleUse() {
        service.consume(challenge.getId(), "USER@example.test", "ENROLL", "tenant", "123456");
        assertThat(challenge.isConsumed()).isTrue();
        assertThatThrownBy(() -> service.consume(challenge.getId(), "user@example.test", "ENROLL", "tenant", "123456"))
                .isInstanceOf(IllegalArgumentException.class);
    }
    @Test void wrongCodesAreBounded() {
        for (int i = 0; i < 5; i++) assertThatThrownBy(() -> service.consume(challenge.getId(),
                "user@example.test", "ENROLL", "tenant", "999999")).isInstanceOf(IllegalArgumentException.class);
        assertThat(challenge.getAttempts()).isEqualTo(5);
        assertThatThrownBy(() -> service.consume(challenge.getId(), "user@example.test", "ENROLL", "tenant", "123456"))
                .isInstanceOf(IllegalArgumentException.class);
    }
    @Test void expiredCodeAndWrongContextAreRejected() {
        assertThatThrownBy(() -> service.consume(challenge.getId(), "user@example.test", "RESET", "tenant", "123456"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.consume(challenge.getId(), "other@example.test", "ENROLL", "tenant", "123456"))
                .isInstanceOf(IllegalArgumentException.class);
        challenge.setExpiresAt(Instant.now().minusSeconds(1));
        assertThatThrownBy(() -> service.consume(challenge.getId(), "user@example.test", "ENROLL", "tenant", "123456"))
                .isInstanceOf(IllegalArgumentException.class);
    }
    @Test void onlyHashedCodeIsPersistedAndDeliveryIsReal() {
        when(rate.allowAccountAttempt(anyString(), anyString(), anyInt(), anyInt())).thenReturn(true);
        when(repository.save(any())).thenAnswer(i -> { EmailChallenge c = i.getArgument(0); c.setId(UUID.randomUUID()); return c; });
        UUID id = service.issue("USER@example.test", "ENROLL", "tenant");
        var persisted = ArgumentCaptor.forClass(EmailChallenge.class);
        var delivered = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(repository).save(persisted.capture()); verify(mail).send(delivered.capture());
        String text = delivered.getValue().getText();
        String code = text.substring(text.indexOf("is ") + 3, text.indexOf("is ") + 9);
        assertThat(id).isNotNull(); assertThat(persisted.getValue().getCodeHash()).doesNotContain(code);
        assertThat(encoder.matches(code, persisted.getValue().getCodeHash())).isTrue();
    }
}
