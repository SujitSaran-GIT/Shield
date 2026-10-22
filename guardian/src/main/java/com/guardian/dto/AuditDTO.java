package com.guardian.dto;

import com.guardian.entity.AuditLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditDTO {
    private UUID id;
    private String clientId;
    private String clientName;
    private UUID userId;
    private String userEmail;
    private String ipAddress;
    private String location;
    private String eventType;
    private Integer statusCode;
    private String details;
    private LocalDateTime createdAt;
    
    public static AuditDTO fromEntity(AuditLog audit) {
        return AuditDTO.builder()
                .id(audit.getId())
                .clientId(audit.getClientId())
                .clientName(audit.getClientName())
                .userId(audit.getUserId())
                .userEmail(audit.getUserEmail())
                .ipAddress(audit.getIpAddress())
                .location(audit.getLocation())
                .eventType(audit.getEventType().name())
                .statusCode(audit.getStatusCode())
                .details(audit.getDetails())
                .createdAt(audit.getCreatedAt())
                .build();
    }
}
