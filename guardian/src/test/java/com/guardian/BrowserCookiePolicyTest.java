package com.guardian;

import com.guardian.controller.AuthController;
import com.guardian.dto.AdminLoginResponse;
import com.guardian.service.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class BrowserCookiePolicyTest {
    private AuthService auth;
    private JwtService jwt;
    private AuthController controller;
    @BeforeEach void setup() {
        auth=mock(AuthService.class);jwt=mock(JwtService.class);
        controller=new AuthController(auth,mock(EmailVerificationService.class),mock(PasswordRecoveryService.class),
                mock(ClientService.class),mock(UserService.class),jwt);
        ReflectionTestUtils.setField(controller,"secureCookie",true);
        when(jwt.getTimeUntilExpiration(anyString())).thenReturn(60000L);
    }
    @Test void browserLoginDeliversRefreshCredentialOnlyThroughSecureHttpOnlyCookie() {
        MockHttpServletRequest request=new MockHttpServletRequest();request.addHeader("X-Refresh-Request","true");
        when(auth.loginAdmin(anyString(),anyString(),any(),any())).thenReturn(new AdminLoginResponse(
                UUID.randomUUID(),"admin@example.test","admin","access-token","refresh-credential","Signed in","SUPER_ADMIN"));
        var response=controller.loginAdmin(new AuthController.AdminLoginRequest("admin@example.test","test-password"),request);
        assertThat(response.getBody().getRefreshToken()).isNull();
        assertThat(response.getHeaders().getFirst("Set-Cookie")).contains("refresh-credential","HttpOnly","Secure","SameSite=Strict","Path=/api/auth");
    }
    @Test void cookieRefreshDoesNotCopyCredentialIntoJavascriptReadableBody() {
        MockHttpServletRequest request=new MockHttpServletRequest();request.addHeader("X-Refresh-Request","true");
        when(jwt.validateToken("old-cookie")).thenReturn(true);when(jwt.extractClientId("old-cookie")).thenReturn("GUARDIAN_SYSTEM");
        when(auth.refreshToken(eq("old-cookie"),eq("GUARDIAN_SYSTEM"),any(),any()))
                .thenReturn(new AuthService.TokenRefreshResult("new-access","new-refresh"));
        var response=controller.refreshToken(null,"old-cookie",request);
        assertThat(response.getBody().getAccessToken()).isEqualTo("new-access");
        assertThat(response.getBody().getRefreshToken()).isNull();
        assertThat(response.getHeaders().getFirst("Set-Cookie")).contains("new-refresh","HttpOnly");
    }
    @Test void explicitBodyRefreshPreservesConfidentialIntegrationContract() {
        MockHttpServletRequest request=new MockHttpServletRequest();
        when(auth.refreshToken(eq("body-token"),eq("client"),any(),any()))
                .thenReturn(new AuthService.TokenRefreshResult("new-access","new-refresh"));
        var response=controller.refreshToken(new AuthController.RefreshTokenRequest("body-token","client"),null,request);
        assertThat(response.getBody().getRefreshToken()).isEqualTo("new-refresh");
    }
}
