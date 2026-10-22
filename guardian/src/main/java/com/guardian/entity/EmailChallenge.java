package com.guardian.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "email_challenges", indexes = @Index(name = "idx_email_challenge_expiry", columnList = "expires_at"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class EmailChallenge {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false) private String email;
    @Column(nullable = false) private String purpose;
    @Column(nullable = false) private String binding;
    @Column(name = "code_hash", nullable = false) private String codeHash;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(nullable = false) private int attempts;
    @Column(nullable = false) private boolean consumed;
}
