package com.guardian.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="platform_bootstrap") @Getter @Setter @NoArgsConstructor
public class PlatformBootstrap {
    @Id private Integer id;
    @Column(nullable=false) private boolean completed;
    private LocalDateTime completedAt;
    private UUID administratorId;
}
