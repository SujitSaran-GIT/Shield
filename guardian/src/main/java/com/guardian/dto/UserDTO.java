package com.guardian.dto;

import com.guardian.entity.User;
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
public class UserDTO {
    private UUID id;
    private String username;
    private String email;
    private String clientName;
    private String role;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
    private String lastLoginIp;
    private String lastLoginLocation;

    public static UserDTO fromEntity(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .clientName(user.getClientId()) // Default to clientId, will be overridden when client name is available
                .role(user.getRole() == User.UserRole.GUARDIAN_ADMIN ? "SUPER_ADMIN" : user.getRole().name())
                .status(user.getStatus().name())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .lastLoginIp(user.getLastLoginIp())
                .lastLoginLocation(user.getLastLoginLocation())
                .build();
    }

    public static UserDTO fromEntityWithClientName(User user, String clientName) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .clientName(clientName)
                .role(user.getRole() == User.UserRole.GUARDIAN_ADMIN ? "SUPER_ADMIN" : user.getRole().name())
                .status(user.getStatus().name())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .lastLoginIp(user.getLastLoginIp())
                .lastLoginLocation(user.getLastLoginLocation())
                .build();
    }
}

