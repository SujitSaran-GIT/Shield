package com.guardian.service;

import com.guardian.config.JwtConfig;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.security.Key;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

/**
 * Enhanced JWT Service using JwtConfig
 * This is an improved version that uses the JwtConfig class
 * You can replace the original JwtService with this one
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class JwtService {
    
    private final JwtConfig jwtConfig;
    
    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtConfig.getSecret().getBytes(StandardCharsets.UTF_8));
    }
    
    public String generateToken(UUID userId, String email, String clientId, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("email", email);
        claims.put("clientId", clientId);
        claims.put("role", role);
        claims.put("type", "access");
        
        return createToken(claims, email, jwtConfig.getExpiration());
    }
    
    public String generateRefreshToken(UUID userId, String email, String clientId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("email", email);
        claims.put("clientId", clientId);
        claims.put("type", "refresh");
        
        return createToken(claims, email, jwtConfig.getRefreshExpiration());
    }
    
    private String createToken(Map<String, Object> claims, String subject, Long expiration) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);
        
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .claims(claims)
                .subject(subject)
                .issuer(jwtConfig.getIssuer())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }
    
    public boolean validateToken(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (Exception e) {
            log.debug("JWT rejected");
            return false;
        }
    }
    
    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }
    
    public UUID extractUserId(String token) {
        return extractClaim(token, claims -> UUID.fromString(claims.get("userId", String.class)));
    }
    
    public String extractClientId(String token) {
        return extractClaim(token, claims -> claims.get("clientId", String.class));
    }
    
    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class));
    }
    
    public String extractTokenType(String token) {
        return extractClaim(token, claims -> claims.get("type", String.class));
    }
    
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
    
    public Date extractIssuedAt(String token) {
        return extractClaim(token, Claims::getIssuedAt);
    }
    
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }
    
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .setSigningKey(getSigningKey())
                .requireIssuer(jwtConfig.getIssuer())
                .build()
                .parseClaimsJws(token)
                .getPayload();
    }
    
    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
    
    public boolean isAccessToken(String token) {
        return "access".equals(extractTokenType(token));
    }
    
    public boolean isRefreshToken(String token) {
        return "refresh".equals(extractTokenType(token));
    }
    
    public long getTimeUntilExpiration(String token) {
        Date expiration = extractExpiration(token);
        return expiration.getTime() - System.currentTimeMillis();
    }
}
