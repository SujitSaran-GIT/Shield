package com.guardian.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "clients", indexes = {
    @Index(name = "idx_clients_client_id", columnList = "client_id", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Client {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "client_id", nullable = false, unique = true)
    private String clientId;
    
    @Column(name = "client_key", nullable = false)
    @JsonIgnore
    private String clientKey;

    @Column(name = "owner_user_id")
    private UUID ownerUserId;

    @Transient
    @JsonIgnore
    private String provisionedSecret;


    @Column(nullable = false)
    private String name;
    
    @Column(length = 1000)
    private String description;

    @ElementCollection
    @CollectionTable(name = "client_allowed_origins", joinColumns = @JoinColumn(name = "client_id"))
    @Column(name = "allowed_origin")
    private List<String> allowedOrigins;

    @Column(name = "idle_timeout")
    private Integer idleTimeout = 1800; // 30 minutes default
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClientStatus status = ClientStatus.ACTIVE;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public enum ClientStatus {
        ACTIVE, INACTIVE, SUSPENDED
    }
}
