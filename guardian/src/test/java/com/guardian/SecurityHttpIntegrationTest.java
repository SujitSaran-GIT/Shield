package com.guardian;

import com.guardian.entity.*;
import com.guardian.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:http-security;MODE=PostgreSQL;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityHttpIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ClientRepository clients;
    @Autowired AuditLogRepository audits;
    private User platform, ownerA, ownerB, memberA, memberB;
    private Client appA, appB;

    @BeforeEach void fixtures() {
        String suffix = UUID.randomUUID().toString();
        platform = human("platform-" + suffix, User.UserRole.SUPER_ADMIN, "GUARDIAN_SYSTEM");
        ownerA = human("owner-a-" + suffix, User.UserRole.CLIENT_ADMIN, "GUARDIAN_SYSTEM");
        ownerB = human("owner-b-" + suffix, User.UserRole.CLIENT_ADMIN, "GUARDIAN_SYSTEM");
        appA = client("app-a-" + suffix, ownerA.getId()); appB = client("app-b-" + suffix, ownerB.getId());
        memberA = human("member-a-" + suffix, User.UserRole.USER, appA.getClientId());
        memberB = human("member-b-" + suffix, User.UserRole.USER, appB.getClientId());
    }
    private User human(String name, User.UserRole role, String tenant) {
        return users.saveAndFlush(User.builder().username(name).email(name + "@example.test")
                .passwordHash("test-only-noncredential-verifier").role(role).status(User.UserStatus.ACTIVE).clientId(tenant).build());
    }
    private Client client(String name, UUID owner) {
        return clients.saveAndFlush(Client.builder().clientId(name).clientKey("$2a$test-only-verifier")
                .ownerUserId(owner).name(name).allowedOrigins(List.of("https://app.example.test"))
                .idleTimeout(1800).status(Client.ClientStatus.ACTIVE).build());
    }
    private org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.UserRequestPostProcessor as(User u) {
        return user(u.getId().toString()).authorities(new SimpleGrantedAuthority(u.getRole().name()));
    }

    @Test void anonymousRequestsCannotReadProtectedDataOrDetailedMetrics() throws Exception {
        mvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
        mvc.perform(get("/actuator/metrics")).andExpect(status().isUnauthorized());
        mvc.perform(get("/actuator/health")).andExpect(jsonPath("$.components").doesNotExist());
    }
    @Test void memberCannotReadAdministratorLists() throws Exception {
        mvc.perform(get("/api/users").with(as(memberA))).andExpect(status().isForbidden());
        mvc.perform(get("/api/audits").with(as(memberA))).andExpect(status().isForbidden());
        mvc.perform(get("/api/health/system-metrics").with(as(memberA))).andExpect(status().isForbidden());
    }
    @Test void clientAdministratorListsOnlyOwnedTenantUsers() throws Exception {
        mvc.perform(get("/api/users").with(as(ownerA)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(memberA.getId().toString()));
        mvc.perform(get("/api/users/" + memberB.getId()).with(as(ownerA))).andExpect(status().isForbidden());
    }
    @Test void clientAdministratorCannotMutateAnotherTenant() throws Exception {
        mvc.perform(put("/api/users/" + memberB.getId() + "/block").with(as(ownerA))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/clients/" + appB.getId()).with(as(ownerA))).andExpect(status().isForbidden());
    }
    @Test void platformAdministratorCanReadButCannotPerformOrdinaryUserManagement() throws Exception {
        mvc.perform(get("/api/users/" + memberB.getId()).with(as(platform))).andExpect(status().isOk());
        mvc.perform(put("/api/users/" + memberB.getId() + "/block").with(as(platform))).andExpect(status().isForbidden());
    }
    @Test void ownerCanManageTheirOwnMember() throws Exception {
        mvc.perform(put("/api/users/" + memberA.getId() + "/block").with(as(ownerA))).andExpect(status().isOk());
        mvc.perform(put("/api/users/" + memberA.getId() + "/unblock").with(as(ownerA))).andExpect(status().isOk());
    }
    @Test void ordinaryClientResponsesNeverExposeStoredVerifier() throws Exception {
        mvc.perform(get("/api/admin/clients/" + appA.getId()).with(as(ownerA)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.clientKey").doesNotExist())
                .andExpect(jsonPath("$.provisionedSecret").doesNotExist()).andExpect(content().string(not(containsString("$2a$test"))));
    }
    @Test void auditsAreFilteredInDataAccessLayer() throws Exception {
        audits.saveAndFlush(AuditLog.builder().eventType(com.guardian.entity.enums.EventType.LOGIN_SUCCESS)
                .clientId(appA.getClientId()).statusCode(200).details("Owned event").build());
        audits.saveAndFlush(AuditLog.builder().eventType(com.guardian.entity.enums.EventType.LOGIN_SUCCESS)
                .clientId(appB.getClientId()).statusCode(200).details("Other tenant private event").build());
        mvc.perform(get("/api/audits").with(as(ownerA))).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1)).andExpect(content().string(not(containsString("Other tenant private event"))));
        mvc.perform(get("/api/audits/filter").param("clientId", appB.getClientId()).with(as(ownerA))).andExpect(status().isForbidden());
    }
    @Test void allAuditEndpointsRespectCredentialsAndReturnTheirScopedContracts() throws Exception {
        AuditLog event = audits.saveAndFlush(AuditLog.builder()
                .eventType(com.guardian.entity.enums.EventType.LOGIN_FAILED).clientId(appA.getClientId())
                .userId(memberA.getId()).userEmail(memberA.getEmail()).ipAddress("198.51.100.9")
                .statusCode(401).details("Audit endpoint contract fixture").build());
        for (String base : List.of("/api/audits", "/api/admin/audits")) {
            for (String suffix : List.of("", "/filter", "/kpis", "/recent", "/" + event.getId())) {
                mvc.perform(get(base + suffix)).andExpect(status().isUnauthorized());
                mvc.perform(get(base + suffix).header("Authorization", "Bearer invalid-test-token"))
                        .andExpect(status().isUnauthorized());
                mvc.perform(get(base + suffix).with(as(memberA))).andExpect(status().isForbidden());
            }
            mvc.perform(get(base).param("page", "0").param("size", "1").param("sortBy", "statusCode")
                            .param("sortDir", "ASC").with(as(ownerA)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1))
                    .andExpect(jsonPath("$.content[0].id").value(event.getId().toString()));
            mvc.perform(get(base + "/filter").param("clientId", appA.getClientId())
                            .param("eventType", "LOGIN_FAILED").param("ipAddress", "198.51.100.9")
                            .param("startDate", java.time.LocalDateTime.now().minusDays(1).toString())
                            .param("endDate", java.time.LocalDateTime.now().plusDays(1).toString()).with(as(ownerA)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").value(event.getId().toString()));
            mvc.perform(get(base + "/kpis").with(as(ownerA))).andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalEvents").value(1)).andExpect(jsonPath("$.failedEvents").value(1));
            mvc.perform(get(base + "/recent").param("days", "7").with(as(ownerA))).andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].id").value(event.getId().toString()));
            mvc.perform(get(base + "/" + event.getId()).with(as(ownerA))).andExpect(status().isOk())
                    .andExpect(jsonPath("$.statusCode").value(401));
            mvc.perform(get(base + "/" + event.getId()).with(as(ownerB))).andExpect(status().isNotFound());
            mvc.perform(get(base + "/recent").param("days", "91").with(as(ownerA))).andExpect(status().isBadRequest());
        }
    }
    @Test void unrestrictedPrivilegedRegistrationRemainsClosed() throws Exception {
        mvc.perform(post("/api/admin/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"attacker@example.test\",\"adminRole\":\"SUPER_ADMIN\"}"))
                .andExpect(status().isUnauthorized());
    }
    @Autowired PlatformBootstrapRepository bootstrapRepository;
    @Test void administratorLifecycleUsesRealStatusAndRejectsSelfAndTenantMutations() throws Exception {
        if (bootstrapRepository.findById(1).isEmpty()) {
            PlatformBootstrap state = new PlatformBootstrap(); state.setId(1);
            bootstrapRepository.saveAndFlush(state);
        }
        String path = "/api/admin/admins/" + ownerB.getId();
        mvc.perform(put(path + "/deactivate").with(as(ownerA))).andExpect(status().isForbidden());
        mvc.perform(put(path + "/activate")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/admin/admins/" + platform.getId() + "/deactivate").with(as(platform)))
                .andExpect(status().isBadRequest());
        mvc.perform(put(path + "/deactivate").with(as(platform))).andExpect(status().isOk());
        mvc.perform(get(path).with(as(platform))).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENDED"));
        mvc.perform(put(path + "/activate").with(as(platform))).andExpect(status().isOk());
        mvc.perform(get(path).with(as(platform))).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }
    @Test void disabledAdministratorOperationsRemainForbiddenForPlatformAdministrators() throws Exception {
        mvc.perform(put("/api/admin/admins/" + ownerA.getId() + "/role").with(as(platform))
                .contentType(MediaType.APPLICATION_JSON).content("{\"newAdminRole\":\"GUARDIAN_ADMIN\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/register").with(as(platform)).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
    }
    @Test void auditDetailsRemainTenantScopedAndRestrictedToAdministrators() throws Exception {
        AuditLog event = audits.saveAndFlush(AuditLog.builder().eventType(com.guardian.entity.enums.EventType.LOGIN_SUCCESS)
                .clientId(appA.getClientId()).statusCode(200).details("Tenant A event").build());
        String path = "/api/audits/" + event.getId();
        mvc.perform(get(path).with(as(ownerA))).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(event.getId().toString()));
        mvc.perform(get(path).with(as(platform))).andExpect(status().isOk());
        mvc.perform(get(path).with(as(ownerB))).andExpect(status().isNotFound());
        mvc.perform(get(path).with(as(memberA))).andExpect(status().isForbidden());
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
    }
    @Test void arbitraryOriginsCannotUseCredentialedCors() throws Exception {
        mvc.perform(options("/api/auth/refresh").header("Origin", "https://attacker.example")
                .header("Access-Control-Request-Method", "POST").header("Access-Control-Request-Headers", "X-Refresh-Request"))
                .andExpect(status().isForbidden());
    }

    @Autowired AdminInvitationRepository invitationRepository;
    @Test void userActivityRequiresTargetTenantAuthorization() throws Exception {
        audits.saveAndFlush(AuditLog.builder().eventType(com.guardian.entity.enums.EventType.LOGIN_SUCCESS)
                .userId(memberB.getId()).clientId(appB.getClientId()).statusCode(200).details("Tenant B sign-in").build());
        mvc.perform(get("/api/users/"+memberB.getId()+"/activity").with(as(ownerA))).andExpect(status().isForbidden());
        mvc.perform(get("/api/users/"+memberB.getId()+"/activity").with(as(platform)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].details").value("Tenant B sign-in"));
        mvc.perform(get("/api/users/"+memberB.getId()+"/activity").with(as(ownerB)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));
    }
    @Test void invitationStatusListRejectsTenantAdminsAndNeverExposesEnrollmentVerifier() throws Exception {
        AdminInvitation invite=new AdminInvitation();invite.setEmail("recipient@example.test");invite.setInvitedBy(platform.getId());
        invite.setCreatedAt(java.time.LocalDateTime.now());invite.setExpiresAt(java.time.LocalDateTime.now().plusHours(1));
        invite.setEnrollmentTokenHash("sensitive-enrollment-verifier");
        invitationRepository.saveAndFlush(invite);
        mvc.perform(get("/api/admin/invitations").with(as(ownerA))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/invitations").with(as(platform))).andExpect(status().isOk())
                .andExpect(content().string(not(containsString("sensitive-enrollment-verifier"))))
                .andExpect(jsonPath("$.content[0].emailVerified").value(false));
    }
    @Test void browserRateLimitResponsesKeepCorsHeadersAndIgnoreSpoofedForwardedIp() throws Exception {
        // A unique peer avoids consuming the other tests' local limiter window.
        for (int i = 0; i < 30; i++) {
            mvc.perform(post("/api/auth/not-existing").with(request -> {
                        request.setRemoteAddr("198.51.100.42"); return request;
                    }).header("Origin", "http://localhost:5173"))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/not-existing").with(request -> {
                    request.setRemoteAddr("198.51.100.42"); return request;
                }).header("Origin", "http://localhost:5173").header("X-Forwarded-For", "8.8.8.8"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.message").value("Too many requests; retry later"));
    }
}
