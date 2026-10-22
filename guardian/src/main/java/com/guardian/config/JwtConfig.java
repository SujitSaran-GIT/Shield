package com.guardian.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Configuration properties for JWT
 * Binds properties from application.yml with prefix "jwt"
 */
@Configuration
@ConfigurationProperties(prefix = "jwt")
@Data
@Validated
public class JwtConfig {
    
    /**
     * Secret key used for signing JWT tokens
     * Must be at least 256 bits for HS256 algorithm
     */
    @NotBlank(message = "JWT secret cannot be blank")
    private String secret;
    
    /**
     * Access token expiration time in milliseconds
     * Default: 1 hour (3600000 ms)
     */
    @NotNull(message = "JWT expiration cannot be null")
    @Positive(message = "JWT expiration must be positive")
    private Long expiration;
    
    /**
     * Refresh token expiration time in milliseconds
     * Default: 7 days (604800000 ms)
     */
    @NotNull(message = "JWT refresh expiration cannot be null")
    @Positive(message = "JWT refresh expiration must be positive")
    private Long refreshExpiration;
    
    /**
     * Issuer claim for JWT tokens
     */
    @NotBlank(message = "JWT issuer cannot be blank")
    private String issuer;
    
    /**
     * Token type prefix (e.g., "Bearer")
     */
    private String tokenPrefix = "Bearer ";
    
    /**
     * Authorization header name
     */
    private String headerName = "Authorization";
    
    /**
     * Get expiration in seconds (for convenience)
     */
    public long getExpirationInSeconds() {
        return expiration / 1000;
    }
    
    /**
     * Get refresh expiration in seconds (for convenience)
     */
    public long getRefreshExpirationInSeconds() {
        return refreshExpiration / 1000;
    }
    
    /**
     * Get expiration in days (for convenience)
     */
    public long getExpirationInDays() {
        return expiration / (1000 * 60 * 60 * 24);
    }
    
    /**
     * Get refresh expiration in days (for convenience)
     */
    public long getRefreshExpirationInDays() {
        return refreshExpiration / (1000 * 60 * 60 * 24);
    }
    
    /**
     * Validate secret key length for HS256
     */
    public boolean isSecretValid() {
        return secret != null && secret.getBytes().length >= 32; // 256 bits
    }
}
