package com.guardian.dto;

import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminLoginResponse {
    private UUID id;
    private String email;
    private String username;
    private String accessToken;
    private String refreshToken;
    private String message;
    private String role;

    public AdminLoginResponse(UUID id, String email, String username, String accessToken, String refreshToken, String message) {
        this(id, email, username, accessToken, refreshToken, message, null);
    }
}
