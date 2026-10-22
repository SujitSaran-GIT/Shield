package com.guardian.service;

import com.guardian.dto.AdminLoginResponse;
import com.guardian.entity.*;
import com.guardian.entity.enums.EventType;
import com.guardian.repository.*;
import com.guardian.util.TokenFingerprint;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserService userService;
    private final ClientService clientService;
    private final JwtService jwtService;
    private final AuditService auditService;
    private final RateLimitService rateLimitService;
    private final GeoIpService geoIpService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserSessionRepository userSessionRepository;
    private final ClientRepository clientRepository;

    @Transactional
    public LoginResult login(String email, String password, String clientId, String clientKey,
                             String ipAddress, String userAgent) {
        checkLoginRate(ipAddress, email);
        try {
            Client client = clientService.validateClient(clientId, clientKey);
            User user = userService.authenticateUser(email, password);
            if (!Objects.equals(user.getClientId(), clientId) || user.getRole() != User.UserRole.USER)
                throw invalidCredentials();
            LoginResult result = issueTokens(user, clientId, ipAddress, userAgent);
            rateLimitService.resetFailedAttempts(ipAddress, "login");
            auditService.logEvent(EventType.LOGIN_SUCCESS, clientId, client.getName(), user.getId(),
                    user.getEmail(), ipAddress, userAgent, 200, "Login successful");
            return result;
        } catch (org.springframework.security.core.AuthenticationException | com.guardian.exception.InvalidClientException ex) {
            failedLogin(email, clientId, ipAddress, userAgent);
            throw invalidCredentials();
        }
    }

    @Transactional
    public AdminLoginResponse loginAdmin(String email, String password, String ipAddress, String userAgent) {
        checkLoginRate(ipAddress, email);
        try {
            User user = userService.authenticateUser(email, password);
            if (user.getRole() == User.UserRole.USER) throw invalidCredentials();
            LoginResult result = issueTokens(user, platformClient(), ipAddress, userAgent);
            rateLimitService.resetFailedAttempts(ipAddress, "login");
            auditService.logEvent(EventType.LOGIN_SUCCESS, platformClient(), "Shield", user.getId(),
                    user.getEmail(), ipAddress, userAgent, 200, "Administrator login successful");
            AdminLoginResponse response = new AdminLoginResponse(user.getId(), user.getEmail(), user.getUsername(),
                    result.accessToken(), result.refreshToken(), "Login successful");
            response.setRole(canonicalRole(user));
            return response;
        } catch (org.springframework.security.core.AuthenticationException ex) {
            failedLogin(email, null, ipAddress, userAgent);
            throw invalidCredentials();
        }
    }

    @Transactional
    public RegisterResult register(String username, String email, String password, String clientId,
                                   String clientKey, String ipAddress, String userAgent) {
        Client client = clientService.validateClient(clientId, clientKey);
        if (!rateLimitService.allowRegistrationAttempt(ipAddress, false))
            throw new com.guardian.exception.RateLimitExceededException("Too many registration attempts");
        User user = userService.registerUser(username, email, password, clientId);
        LoginResult result = issueTokens(user, clientId, ipAddress, userAgent);
        auditService.logEvent(EventType.USER_REGISTRATION_SUCCESS, clientId, client.getName(), user.getId(),
                user.getEmail(), ipAddress, userAgent, 201, "Verified registration successful");
        return new RegisterResult(result.accessToken(), result.refreshToken(), user);
    }

    /** Commit replay revocation even when returning an authentication error. */
    @Transactional(noRollbackFor = BadCredentialsException.class)
    public TokenRefreshResult refreshToken(String presented, String clientId, String ipAddress, String userAgent) {
        if (!jwtService.validateToken(presented) || !jwtService.isRefreshToken(presented)) throw invalidCredentials();
        // Match lifecycle operations: tenant, account, then token. Acquiring these
        // before reading the old token also prevents bulk-revocation deadlocks.
        if (!Objects.equals(clientId, jwtService.extractClientId(presented))) throw invalidCredentials();
        if (!Objects.equals(platformClient(), clientId)) clientService.lockCredentials(clientId);
        User user = userService.getUserById(jwtService.extractUserId(presented));
        userService.lockCredentials(user);
        RefreshToken old = refreshTokenRepository.findByToken(TokenFingerprint.of(presented))
                .orElseThrow(AuthService::invalidCredentials);
        if (!Objects.equals(clientId, old.getClientId())
                || !Objects.equals(jwtService.extractUserId(presented), old.getUserId())
                || !Objects.equals(jwtService.extractClientId(presented), old.getClientId())) throw invalidCredentials();
        if (Boolean.TRUE.equals(old.getRevoked())) {
            revokeUser(old.getUserId());
            auditService.logEvent(EventType.SUSPICIOUS_ACTIVITY, clientId, null, old.getUserId(), null,
                    ipAddress, userAgent, 401, "Refresh token reuse detected; all sessions revoked");
            throw invalidCredentials();
        }
        if (old.isExpired()) throw invalidCredentials();
        requireActive(user, clientId);
        old.setRevoked(true);
        refreshTokenRepository.saveAndFlush(old);
        LoginResult result = issueTokens(user, clientId, ipAddress, userAgent);
        auditService.logEvent(EventType.TOKEN_REFRESHED, clientId, null, user.getId(), user.getEmail(),
                ipAddress, userAgent, 200, "Token refreshed");
        return new TokenRefreshResult(result.accessToken(), result.refreshToken());
    }

    @Transactional
    public void logout(String token, String ipAddress, String userAgent) {
        User user = authenticateAccessToken(token);
        revokeUser(user.getId());
        auditService.logEvent(EventType.LOGOUT_SUCCESS, jwtService.extractClientId(token), null, user.getId(),
                user.getEmail(), ipAddress, userAgent, 200, "All sessions revoked by logout");
    }

    @Transactional(readOnly = true)
    public User authenticateAccessToken(String token) {
        if (!jwtService.validateToken(token) || !jwtService.isAccessToken(token)) throw invalidCredentials();
        UserSession session = userSessionRepository.findBySessionToken(TokenFingerprint.of(token))
                .orElseThrow(AuthService::invalidCredentials);
        if (!Boolean.TRUE.equals(session.getActive()) || session.isExpired()
                || !Objects.equals(session.getUserId(), jwtService.extractUserId(token))
                || !Objects.equals(session.getClientId(), jwtService.extractClientId(token))) throw invalidCredentials();
        User user = userService.getUserById(session.getUserId());
        requireActive(user, session.getClientId());
        return user;
    }

    @Transactional
    public void revokeUser(UUID userId) {
        userService.lockCredentials(userService.getUserById(userId));
        refreshTokenRepository.revokeAllUserTokens(userId);
        userSessionRepository.deactivateAllUserSessions(userId);
    }

    public void lockUserCredentials(User user) { userService.lockCredentials(user); }

    private void requireActive(User user, String clientId) {
        if (user.getStatus() != User.UserStatus.ACTIVE) throw invalidCredentials();
        if (user.getRole() == User.UserRole.USER) {
            if (!Objects.equals(user.getClientId(), clientId)) throw invalidCredentials();
            Client client = clientRepository.findByClientId(clientId).orElseThrow(AuthService::invalidCredentials);
            if (client.getStatus() != Client.ClientStatus.ACTIVE) throw invalidCredentials();
        } else if (!Objects.equals(platformClient(), clientId)) throw invalidCredentials();
    }

    private LoginResult issueTokens(User user, String clientId, String ipAddress, String userAgent) {
        String location = geoIpService.getLocation(ipAddress);
        userService.updateLastLogin(user.getId(), ipAddress, location);
        String access = jwtService.generateToken(user.getId(), user.getEmail(), clientId, canonicalRole(user));
        String refresh = jwtService.generateRefreshToken(user.getId(), user.getEmail(), clientId);
        refreshTokenRepository.save(RefreshToken.builder().token(TokenFingerprint.of(refresh)).userId(user.getId())
                .clientId(clientId).revoked(false).expiresAt(expiry(refresh)).build());
        userSessionRepository.save(UserSession.builder().sessionToken(TokenFingerprint.of(access)).userId(user.getId())
                .clientId(clientId).ipAddress(ipAddress).location(location).userAgent(userAgent)
                .expiresAt(expiry(access)).active(true).build());
        return new LoginResult(access, refresh, user);
    }

    private LocalDateTime expiry(String token) {
        return LocalDateTime.ofInstant(jwtService.extractExpiration(token).toInstant(), ZoneId.systemDefault());
    }
    private void checkLoginRate(String ip, String email) {
        if (!rateLimitService.allowLoginAttempt(ip)
                || !rateLimitService.allowAccountAttempt("login", email, 10, 15))
            throw new com.guardian.exception.RateLimitExceededException("Too many login attempts");
        if (rateLimitService.isIpBlocked(ip)) throw invalidCredentials();
    }
    private void failedLogin(String email, String clientId, String ip, String agent) {
        rateLimitService.recordFailedLogin(ip);
        auditService.logEvent(EventType.LOGIN_FAILED, clientId, null, null, email, ip, agent, 401, "Invalid credentials");
    }
    public static String canonicalRole(User user) {
        return "GUARDIAN_ADMIN".equals(user.getRole().name()) ? "SUPER_ADMIN" : user.getRole().name();
    }
    private static String platformClient() { return "GUARDIAN_SYSTEM"; }
    private static BadCredentialsException invalidCredentials() { return new BadCredentialsException("Invalid credentials"); }
    public record LoginResult(String accessToken, String refreshToken, User user) {}
    public record RegisterResult(String accessToken, String refreshToken, User user) {}
    public record TokenRefreshResult(String accessToken, String refreshToken) {}
}
