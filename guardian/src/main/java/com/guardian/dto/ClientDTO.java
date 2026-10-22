package com.guardian.dto;

import com.guardian.entity.Client;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClientDTO {
    private UUID id;
    private String clientId;
    private String name;
    private String description;
    private List<String> allowedOrigins;
    private Integer idleTimeout;
    private String status;
    private LocalDateTime createdAt;
    private long userCount;

    public static ClientDTO fromEntity(Client client) {
        return ClientDTO.builder()
                .id(client.getId())
                .clientId(client.getClientId())
                .name(client.getName())
                .description(client.getDescription())
                .allowedOrigins(client.getAllowedOrigins())
                .idleTimeout(client.getIdleTimeout())
                .status(client.getStatus().name())
                .createdAt(client.getCreatedAt())
                .userCount(0) // Will be set by service/controller
                .build();
    }

    public static ClientDTO fromEntityWithUserCount(Client client, long userCount) {
        return ClientDTO.builder()
                .id(client.getId())
                .clientId(client.getClientId())
                .name(client.getName())
                .description(client.getDescription())
                .allowedOrigins(client.getAllowedOrigins())
                .idleTimeout(client.getIdleTimeout())
                .status(client.getStatus().name())
                .createdAt(client.getCreatedAt())
                .userCount(userCount)
                .build();
    }
}
