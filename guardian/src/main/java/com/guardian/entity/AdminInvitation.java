package com.guardian.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="admin_invitations") @Getter @Setter @NoArgsConstructor
public class AdminInvitation {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private String email;
    @Column(nullable=false) private UUID invitedBy;
    @Column(nullable=false) private LocalDateTime createdAt;
    @Column(nullable=false) private LocalDateTime expiresAt;
    private UUID challengeId;
    private LocalDateTime verifiedAt;
    private LocalDateTime confirmedAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime revokedAt;
    private String enrollmentTokenHash;
}
