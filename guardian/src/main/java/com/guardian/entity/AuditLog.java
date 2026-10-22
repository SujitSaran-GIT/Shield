package com.guardian.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

import com.guardian.entity.enums.EventType;

@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audits_client_created", columnList = "client_id,created_at"),
    @Index(name = "idx_event_type", columnList = "event_type"),
    @Index(name = "idx_created_at", columnList = "created_at"),
    @Index(name = "idx_ip_address", columnList = "ip_address")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "client_id")
    private String clientId;
    
    @Column(name = "client_name")
    private String clientName;
    
    @Column(name = "user_id")
    private UUID userId;
    
    @Column(name = "user_email")
    private String userEmail;
    
    @Column(name = "ip_address")
    private String ipAddress;
    
    @Column(length = 500)
    private String location;
    
    @Column(name = "user_agent", length = 1000)
    private String userAgent;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private EventType eventType;
    
    @Column(name = "status_code")
    private Integer statusCode;
    
    @Column(length = 2000)
    private String details;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
}
