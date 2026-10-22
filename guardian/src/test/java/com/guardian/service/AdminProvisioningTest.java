package com.guardian.service;

import com.guardian.entity.*;
import com.guardian.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminProvisioningTest {
 private UserRepository users; private UserService userService; private TenantAccess access;
 private PlatformBootstrapRepository states; private AdminInvitationRepository invitations;
 private EmailVerificationService verification; private AdminService service; private AuthService auth;
 private final String secret="a-secure-operator-secret-with-at-least-32-bytes";
 @BeforeEach void setup() {
  users=mock(UserRepository.class); userService=mock(UserService.class); access=mock(TenantAccess.class);
  states=mock(PlatformBootstrapRepository.class); invitations=mock(AdminInvitationRepository.class); verification=mock(EmailVerificationService.class);
  auth=mock(AuthService.class);
  service=new AdminService(users,userService,mock(AuditService.class),access,states,invitations,mock(ClientRepository.class),verification,new BCryptPasswordEncoder(4),auth);
  ReflectionTestUtils.setField(service,"bootstrapSecret",secret);
 }
 @Test void bootstrapRequiresOperatorAuthorizationBeforeDatabaseOrOtp() {
  assertThrows(AccessDeniedException.class,()->service.requestBootstrap("invalid","owner@example.com"));
  verifyNoInteractions(states,verification,userService);
 }
 @Test void completedBootstrapCannotBeReopened() {
  PlatformBootstrap state=new PlatformBootstrap(); state.setId(1);state.setCompleted(true);
  when(states.lockState()).thenReturn(Optional.of(state));
  assertThrows(AccessDeniedException.class,()->service.requestBootstrap(secret,"owner@example.com")); verifyNoInteractions(verification,userService);
 }
 @Test void existingLegacyAdministratorClosesBootstrap() {
  PlatformBootstrap state=new PlatformBootstrap(); state.setId(1);
  when(states.lockState()).thenReturn(Optional.of(state)); when(users.existsByRoleIn(any())).thenReturn(true);
  assertThrows(AccessDeniedException.class,()->service.requestBootstrap(secret,"owner@example.com")); verifyNoInteractions(verification);
 }
 @Test void bootstrapRequiresMatchingPasswordsBeforeConsumingOtp() {
  PlatformBootstrap state=new PlatformBootstrap(); state.setId(1);when(states.lockState()).thenReturn(Optional.of(state));
  assertThrows(IllegalArgumentException.class,()->service.completeBootstrap(secret,"owner@example.com",null,"strong-password","different",UUID.randomUUID(),"123456"));
  verifyNoInteractions(verification,userService);
 }
 @Test void rolePayloadCannotCreateAdministrator() {
  assertThrows(AccessDeniedException.class,()->service.registerAdmin("attacker","attacker@example.com","some-password","SUPER_ADMIN",null,null));
  verifyNoInteractions(userService);
 }
 @Test void bootstrapRejectsPasswordsBeyondBcryptByteLimitBeforeConsumingProof() {
  PlatformBootstrap state=new PlatformBootstrap(); state.setId(1);when(states.lockState()).thenReturn(Optional.of(state));
  String password="\u00e9".repeat(37);
  assertThrows(IllegalArgumentException.class,()->service.completeBootstrap(secret,"owner@example.com",null,password,password,UUID.randomUUID(),"123456"));
  verifyNoInteractions(verification,userService);
 }
 @Test void suspendingAdministratorRevokesCredentialsBeforeReactivation() {
  User actor=User.builder().id(UUID.randomUUID()).role(User.UserRole.SUPER_ADMIN).build();
  User target=User.builder().id(UUID.randomUUID()).role(User.UserRole.SUPER_ADMIN).status(User.UserStatus.ACTIVE).build();
  when(access.currentUser()).thenReturn(actor);when(users.findById(target.getId())).thenReturn(Optional.of(target));
  when(states.lockState()).thenReturn(Optional.of(new PlatformBootstrap()));
  service.deactivateAdmin(target.getId());
  assertEquals(User.UserStatus.SUSPENDED,target.getStatus());verify(auth).revokeUser(target.getId());
  service.activateAdmin(target.getId());
  assertEquals(User.UserStatus.ACTIVE,target.getStatus());verify(auth,times(1)).revokeUser(target.getId());
 }
 @Test void publicClientAdminEnrollmentDisabledByDefault() {
  assertThrows(AccessDeniedException.class,()->service.requestEnrollment("owner@example.com")); verifyNoInteractions(verification);
 }
 @Test void acceptedAndExpiredInvitationsCannotReplay() {
  UUID id=UUID.randomUUID(); AdminInvitation invitation=new AdminInvitation(); invitation.setExpiresAt(LocalDateTime.now().plusMinutes(1)); invitation.setAcceptedAt(LocalDateTime.now());
  when(invitations.lockById(id)).thenReturn(Optional.of(invitation));
  assertThrows(IllegalArgumentException.class,()->service.verifyInvitation(id,"123456"));
  invitation.setAcceptedAt(null);invitation.setExpiresAt(LocalDateTime.now().minusMinutes(1));
  assertThrows(IllegalArgumentException.class,()->service.verifyInvitation(id,"123456"));verifyNoInteractions(verification);
 }
 @Test void onlyOriginalInviterCanConfirmVerifiedInvitation() {
  UUID id=UUID.randomUUID();AdminInvitation invitation=new AdminInvitation();invitation.setExpiresAt(LocalDateTime.now().plusMinutes(1));invitation.setInvitedBy(UUID.randomUUID()); invitation.setVerifiedAt(LocalDateTime.now());
  when(invitations.lockById(id)).thenReturn(Optional.of(invitation));when(access.currentUser()).thenReturn(User.builder().id(UUID.randomUUID()).build());
  assertThrows(AccessDeniedException.class,()->service.confirmInvitation(id)); verify(invitations,never()).save(any());
 }
}
