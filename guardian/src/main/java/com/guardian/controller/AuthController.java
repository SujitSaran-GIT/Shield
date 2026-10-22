package com.guardian.controller;

import com.guardian.dto.*;
import com.guardian.dto.AdminLoginResponse;
import com.guardian.service.AuthService;
import com.guardian.service.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import java.util.UUID;
import com.guardian.util.IpUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {
    
    private final AuthService authService;
    private final EmailVerificationService emailVerification;
    private final PasswordRecoveryService passwords;
    private final ClientService clients;
    private final UserService users;
    private final JwtService jwt;
    @Value("${app.security.cookie-secure:true}") private boolean secureCookie;
    
    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {

        String ipAddress = IpUtil.getClientIpAddress(httpRequest);
        String userAgent = IpUtil.getUserAgent(httpRequest);

        PasswordRecoveryService.validatePassword(request.getPassword(), request.getConfirmPassword());
        clients.validateClient(request.getClientId(), request.getClientKey());
        emailVerification.consume(request.getChallengeId(), request.getEmail(), "USER_REGISTRATION", request.getClientId(), request.getOtp());

        var result = authService.register(
                request.getUsername(),
                request.getEmail(),
                request.getPassword(),
                request.getClientId(),
                request.getClientKey(),
                ipAddress,
                userAgent
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new LoginResponse(
                        result.accessToken(),
                        result.refreshToken(),
                        UserDTO.fromEntity(result.user())
                ));
    }


    
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        String ipAddress = IpUtil.getClientIpAddress(httpRequest);
        String userAgent = IpUtil.getUserAgent(httpRequest);

        var result = authService.login(
                request.getEmail(),
                request.getPassword(),
                request.getClientId(),
                request.getClientKey(),
                ipAddress,
                userAgent
        );

        return ResponseEntity.ok(new LoginResponse(
                result.accessToken(),
                result.refreshToken(),
                UserDTO.fromEntity(result.user())
        ));
    }

    @PostMapping("/login/admin")
    public ResponseEntity<AdminLoginResponse> loginAdmin(
            @Valid @RequestBody AdminLoginRequest request,
            HttpServletRequest httpRequest) {

        String ipAddress = IpUtil.getClientIpAddress(httpRequest);
        String userAgent = IpUtil.getUserAgent(httpRequest);

        var result = authService.loginAdmin(
                request.email(),
                request.password(),
                ipAddress,
                userAgent
        );

        String cookie = refreshCookie(result.getRefreshToken()).toString();
        // Browser clients explicitly choose HttpOnly delivery; retain body credentials
        // for existing confidential/native integrations that do not use this header.
        if ("true".equals(httpRequest.getHeader("X-Refresh-Request"))) result.setRefreshToken(null);
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie).body(result);
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refreshToken(
            @RequestBody(required = false) RefreshTokenRequest request,
            @CookieValue(name = "shield_refresh", required = false) String cookie,
            HttpServletRequest httpRequest) {
        
        String ipAddress = IpUtil.getClientIpAddress(httpRequest);
        String userAgent = IpUtil.getUserAgent(httpRequest);
        
        String presented = request == null ? null : request.refreshToken();
        String clientId = request == null ? null : request.clientId();
        boolean cookieRequest = presented == null || presented.isBlank();
        if (cookieRequest) {
            if (!"true".equals(httpRequest.getHeader("X-Refresh-Request")) || cookie == null)
                throw new org.springframework.security.authentication.BadCredentialsException("Invalid credentials");
            presented = cookie;
            if (!jwt.validateToken(presented)) throw new org.springframework.security.authentication.BadCredentialsException("Invalid credentials");
            clientId = jwt.extractClientId(presented);
        }
        var result = authService.refreshToken(
                presented,
                clientId,
                ipAddress,
                userAgent
        );
        
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, refreshCookie(result.refreshToken()).toString()).body(new TokenResponse(
                result.accessToken(),
                cookieRequest ? null : result.refreshToken()
        ));
    }
    
    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(
            @RequestHeader("Authorization") String authHeader,
            HttpServletRequest httpRequest) {
        
        if (!authHeader.startsWith("Bearer ")) throw new org.springframework.security.authentication.BadCredentialsException("Invalid credentials");
        String token = authHeader.substring(7);
        String ipAddress = IpUtil.getClientIpAddress(httpRequest);
        String userAgent = IpUtil.getUserAgent(httpRequest);
        
        authService.logout(token, ipAddress, userAgent);
        
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, ResponseCookie.from("shield_refresh", "")
                .httpOnly(true).secure(secureCookie).sameSite("Strict").path("/api/auth").maxAge(0).build().toString())
                .body(new MessageResponse("Logout successful"));
    }
    
    // Additional DTO classes needed
    public record AdminLoginRequest(
            @jakarta.validation.constraints.NotBlank(message = "Email is required")
            @jakarta.validation.constraints.Email(message = "Invalid email format")
            String email,
            @jakarta.validation.constraints.NotBlank(message = "Password is required")
            String password) {}
    public record RefreshTokenRequest(String refreshToken, String clientId) {}
    public record MessageResponse(String message) {}

    @GetMapping("/me")
    public UserDTO me(Authentication authentication) {
        return UserDTO.fromEntity(users.getUserById(UUID.fromString(authentication.getName())));
    }

    @GetMapping("/sessions")
    public java.util.List<SessionResponse> sessions(Authentication authentication) {
        return users.getActiveUserSessions(UUID.fromString(authentication.getName())).stream()
                .map(s -> new SessionResponse(s.getId(), s.getIpAddress(), s.getLocation(), s.getUserAgent(),
                        s.getCreatedAt(), s.getExpiresAt())).toList();
    }

    @PostMapping("/sessions/revoke-all")
    public MessageResponse revokeAll(Authentication authentication) {
        authService.revokeUser(UUID.fromString(authentication.getName()));
        return new MessageResponse("All sessions revoked. Sign in again.");
    }

    @PostMapping("/register/otp")
    public ChallengeResponse registrationOtp(@Valid @RequestBody RegistrationOtpRequest request) {
        clients.validateClient(request.clientId(), request.clientKey());
        return new ChallengeResponse(emailVerification.issue(request.email(), "USER_REGISTRATION", request.clientId()),
                "If the request is eligible, a verification email has been sent");
    }

    @PostMapping("/password/reset/request")
    public ChallengeResponse resetRequest(@Valid @RequestBody ResetRequest request) {
        return new ChallengeResponse(passwords.request(request.email()),
                "If the account is eligible, a verification email has been sent");
    }

    @PostMapping("/password/reset")
    public MessageResponse reset(@Valid @RequestBody ResetComplete request, HttpServletRequest http) {
        passwords.reset(request.email(), request.challengeId(), request.otp(), request.password(), request.confirmPassword(),
                IpUtil.getClientIpAddress(http), IpUtil.getUserAgent(http));
        return new MessageResponse("Password reset completed. Sign in again.");
    }

    @PostMapping("/password/change")
    public MessageResponse change(@Valid @RequestBody PasswordChange request, Authentication authentication, HttpServletRequest http) {
        passwords.change(UUID.fromString(authentication.getName()), request.currentPassword(), request.password(), request.confirmPassword(),
                IpUtil.getClientIpAddress(http), IpUtil.getUserAgent(http));
        return new MessageResponse("Password changed. Sign in again.");
    }

    private ResponseCookie refreshCookie(String token) {
        return ResponseCookie.from("shield_refresh", token).httpOnly(true).secure(secureCookie).sameSite("Strict")
                .path("/api/auth").maxAge(Math.max(0, jwt.getTimeUntilExpiration(token) / 1000)).build();
    }

    @PostMapping("/email/change/request")
    public ChallengeResponse requestEmailChange(@Valid @RequestBody EmailChangeRequest request, Authentication authentication) {
        return new ChallengeResponse(passwords.requestEmailChange(UUID.fromString(authentication.getName()),
                request.email(), request.currentPassword()), "Verification email sent");
    }

    @PostMapping("/email/change")
    public MessageResponse changeEmail(@Valid @RequestBody EmailChangeComplete request, Authentication authentication, HttpServletRequest http) {
        passwords.changeEmail(UUID.fromString(authentication.getName()), request.email(), request.challengeId(), request.otp(),
                request.currentPassword(), IpUtil.getClientIpAddress(http), IpUtil.getUserAgent(http));
        return new MessageResponse("Email changed. Sign in again.");
    }
    public record ChallengeResponse(UUID challengeId, String message) {}
    public record SessionResponse(UUID id, String ipAddress, String location, String userAgent,
            java.time.LocalDateTime createdAt, java.time.LocalDateTime expiresAt) {}
    public record RegistrationOtpRequest(@jakarta.validation.constraints.Email @jakarta.validation.constraints.NotBlank String email,
            @jakarta.validation.constraints.NotBlank String clientId, @jakarta.validation.constraints.NotBlank String clientKey) {}
    public record ResetRequest(@jakarta.validation.constraints.Email @jakarta.validation.constraints.NotBlank String email) {}
    public record ResetComplete(@jakarta.validation.constraints.Email @jakarta.validation.constraints.NotBlank String email,
            @jakarta.validation.constraints.NotNull UUID challengeId, @jakarta.validation.constraints.NotBlank String otp,
            @jakarta.validation.constraints.NotBlank String password, @jakarta.validation.constraints.NotBlank String confirmPassword) {}
    public record PasswordChange(@jakarta.validation.constraints.NotBlank String currentPassword,
            @jakarta.validation.constraints.NotBlank String password, @jakarta.validation.constraints.NotBlank String confirmPassword) {}
    public record EmailChangeRequest(@jakarta.validation.constraints.Email @jakarta.validation.constraints.NotBlank String email,
            @jakarta.validation.constraints.NotBlank String currentPassword) {}
    public record EmailChangeComplete(@jakarta.validation.constraints.Email @jakarta.validation.constraints.NotBlank String email,
            @jakarta.validation.constraints.NotBlank String currentPassword, @jakarta.validation.constraints.NotNull UUID challengeId,
            @jakarta.validation.constraints.NotBlank String otp) {}
}
