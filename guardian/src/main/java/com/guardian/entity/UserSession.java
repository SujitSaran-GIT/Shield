package com.guardian.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_sessions", indexes = {
    @Index(name = "idx_user_id", columnList = "user_id"),
    @Index(name = "idx_session_token", columnList = "session_token", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSession {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "client_id", nullable = false)
    private String clientId;
    
    @Column(name = "session_token", nullable = false, unique = true, columnDefinition = "TEXT")
    @JsonIgnore
    private String sessionToken;
    
    @Column(name = "ip_address")
    private String ipAddress;
    
    @Column(length = 500, columnDefinition = "TEXT")
    private String location;
    
    @Column(name = "user_agent", length = 1000, columnDefinition = "TEXT")
    private String userAgent;
    
    @Column(name = "device_info", length = 500, columnDefinition = "TEXT")
    private String deviceInfo;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "last_active_at", nullable = false)
    private LocalDateTime lastActiveAt;
    
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
    
    @Column(nullable = false)
    private Boolean active = true;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        lastActiveAt = LocalDateTime.now();
    }
    
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
