package com.guardian.service;

import com.guardian.entity.*;
import com.guardian.repository.*;
import com.guardian.util.EncryptionUtil;
import org.junit.jupiter.api.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TenantAndCredentialTest {
 private ClientRepository repository;
 private TenantAccess access;
 private ClientService service;
 @BeforeEach void setup() {
  repository=mock(ClientRepository.class); access=mock(TenantAccess.class);
  service=new ClientService(repository,mock(EncryptionUtil.class),new BCryptPasswordEncoder(4),access,mock(AuditService.class),mock(RefreshTokenRepository.class),mock(UserSessionRepository.class));
 }
 @Test void creationPersistsOnlyHashAndReturnsSeparateOneTimeSecret() {
  UUID owner=UUID.randomUUID(); when(access.currentUser()).thenReturn(User.builder().id(owner).email("owner@example.com").build());
  when(repository.save(any(Client.class))).thenAnswer(i->i.getArgument(0));
  Client client=service.registerClient("Example","test",List.of("https://example.com"),1800);
  assertEquals(owner,client.getOwnerUserId()); assertTrue(client.getProvisionedSecret().startsWith("CLIENT_KEY_"));
  assertNotEquals(client.getProvisionedSecret(),client.getClientKey());
  assertTrue(new BCryptPasswordEncoder().matches(client.getProvisionedSecret(),client.getClientKey()));
 }
 @Test void rotateRevokesOldVerifier() {
  UUID id=UUID.randomUUID(); BCryptPasswordEncoder encoder=new BCryptPasswordEncoder(4);
  Client client=Client.builder().id(id).clientId("tenant").clientKey(encoder.encode("old-key")).build();
  when(repository.findById(id)).thenReturn(Optional.of(client)); when(repository.save(any(Client.class))).thenAnswer(i->i.getArgument(0));
  when(access.currentUser()).thenReturn(User.builder().id(UUID.randomUUID()).build());
  service.rotateSecret(id);
  assertFalse(encoder.matches("old-key",client.getClientKey())); assertTrue(encoder.matches(client.getProvisionedSecret(),client.getClientKey()));
 }
 @Test void otherTenantCredentialsCannotBeRotated() {
  UUID id=UUID.randomUUID(); when(repository.findById(id)).thenReturn(Optional.of(Client.builder().clientId("foreign").build()));
  doThrow(new AccessDeniedException("denied")).when(access).requireClientAccess("foreign");
  assertThrows(AccessDeniedException.class,()->service.rotateSecret(id)); verify(repository,never()).save(any());
 }
 @Test void originsRejectWildcardsPathsUserInfoAndRemoteHttp() {
  for(String origin:List.of("https://*.example.com","https://example.com/path","https://user@example.com","http://example.com","https://example.com?x=1","https://example.com/#fragment"))
   assertThrows(IllegalArgumentException.class,()->ClientService.validate("Example",List.of(origin),1800),origin);
  assertDoesNotThrow(()->ClientService.validate("Example",List.of("https://example.com","http://localhost:3000"),1800));
 }
 @Test void platformAdminCannotManageClientUser() {
  UserRepository users=mock(UserRepository.class); ClientRepository clients=mock(ClientRepository.class);
  User superAdmin=User.builder().id(UUID.randomUUID()).role(User.UserRole.SUPER_ADMIN).status(User.UserStatus.ACTIVE).build();
  org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(superAdmin.getId().toString(),null,List.of()));
  when(users.findById(superAdmin.getId())).thenReturn(Optional.of(superAdmin));
  TenantAccess scope=new TenantAccess(users,clients);
  assertThrows(AccessDeniedException.class,()->scope.requireUserManagement(User.builder().role(User.UserRole.USER).clientId("tenant").build()));
  org.springframework.security.core.context.SecurityContextHolder.clearContext();
 }
 @Test void clientAdministratorCannotReadForeignUser() {
  UserRepository users=mock(UserRepository.class); ClientRepository clients=mock(ClientRepository.class);
  User owner=User.builder().id(UUID.randomUUID()).role(User.UserRole.CLIENT_ADMIN).status(User.UserStatus.ACTIVE).build();
  org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(owner.getId().toString(),null,List.of()));
  when(users.findById(owner.getId())).thenReturn(Optional.of(owner));
  TenantAccess scope=new TenantAccess(users,clients);
  assertThrows(AccessDeniedException.class,()->scope.requireUserRead(User.builder().id(UUID.randomUUID()).role(User.UserRole.USER).clientId("foreign").build()));
  org.springframework.security.core.context.SecurityContextHolder.clearContext();
 }
}
