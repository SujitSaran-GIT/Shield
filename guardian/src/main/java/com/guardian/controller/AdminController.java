package com.guardian.controller;

import com.guardian.dto.UserDTO;
import com.guardian.entity.AdminInvitation;
import com.guardian.service.AdminService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
 private final AdminService adminService;
 @GetMapping("/invitations")
 @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','GUARDIAN_ADMIN')")
 public org.springframework.data.domain.Page<InvitationStatus> invitations(
         @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size) {
  if(page<0 || size<1 || size>100) throw new IllegalArgumentException("Invalid pagination");
  return adminService.listInvitations(org.springframework.data.domain.PageRequest.of(page,size,
          org.springframework.data.domain.Sort.by("createdAt").descending())).map(i -> new InvitationStatus(
          i.getId(),i.getEmail(),i.getInvitedBy(),i.getCreatedAt(),i.getExpiresAt(),
          i.getVerifiedAt()!=null,i.getConfirmedAt()!=null,i.getAcceptedAt(),i.getRevokedAt()));
 }
 @PostMapping("/register")
 public void registerAdmin() { throw new AccessDeniedException("Use verified bootstrap, enrollment or invitation provisioning"); }
 @PostMapping("/bootstrap/request")
 public Map<String,UUID> requestBootstrap(@RequestHeader("X-Bootstrap-Secret") String secret,@Valid @RequestBody EmailRequest r) {
  return Map.of("challengeId",adminService.requestBootstrap(secret,r.email()));
 }
 @PostMapping("/bootstrap/complete")
 public UserDTO completeBootstrap(@RequestHeader("X-Bootstrap-Secret") String secret,@Valid @RequestBody EnrollmentRequest r) {
  return UserDTO.fromEntity(adminService.completeBootstrap(secret,r.email(),r.username(),r.password(),r.confirmPassword(),r.challengeId(),r.code()));
 }
 @PostMapping("/enrollment/request")
 public Map<String,UUID> requestEnrollment(@Valid @RequestBody EmailRequest r) { return Map.of("challengeId",adminService.requestEnrollment(r.email())); }
 @PostMapping("/enrollment/complete")
 public UserDTO completeEnrollment(@Valid @RequestBody EnrollmentRequest r) {
  return UserDTO.fromEntity(adminService.completeEnrollment(r.email(),r.username(),r.password(),r.confirmPassword(),r.challengeId(),r.code()));
 }
 @PostMapping("/invitations")
 @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','GUARDIAN_ADMIN')")
 public InvitationResponse invite(@Valid @RequestBody EmailRequest r) {
  AdminInvitation i=adminService.invite(r.email());
  return new InvitationResponse(i.getId(),i.getEmail(),i.getChallengeId(),i.getExpiresAt());
 }
 @PostMapping("/invitations/{id}/verify")
 public Map<String,String> verify(@PathVariable UUID id,@Valid @RequestBody CodeRequest r) { return Map.of("enrollmentToken",adminService.verifyInvitation(id,r.code())); }
 @PutMapping("/invitations/{id}/confirm")
 @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','GUARDIAN_ADMIN')")
 public Map<String,String> confirm(@PathVariable UUID id) { adminService.confirmInvitation(id); return Map.of("message","Invitation confirmed"); }
 @PostMapping("/invitations/{id}/accept")
 public UserDTO accept(@PathVariable UUID id,@Valid @RequestBody AcceptanceRequest r) {
  return UserDTO.fromEntity(adminService.acceptInvitation(id,r.enrollmentToken(),r.username(),r.password(),r.confirmPassword()));
 }
 @DeleteMapping("/invitations/{id}")
 @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','GUARDIAN_ADMIN')")
 public Map<String,String> revoke(@PathVariable UUID id) { adminService.revokeInvitation(id); return Map.of("message","Invitation revoked"); }
 @PutMapping("/profile/username") @PreAuthorize("isAuthenticated()")
 public UserDTO username(@RequestBody Map<String,String> r) { return UserDTO.fromEntity(adminService.updateUsername(r.get("username"))); }
 @GetMapping("/admins/{id}") @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','GUARDIAN_ADMIN')")
 public UserDTO getAdmin(@PathVariable UUID id) { return UserDTO.fromEntity(adminService.getAdminById(id)); }
 @PutMapping("/admins/{id}/role") @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','GUARDIAN_ADMIN')")
 public UserDTO role(@PathVariable UUID id,@RequestBody Map<String,String> r) { return UserDTO.fromEntity(adminService.updateAdminRole(id,r.get("newAdminRole"))); }
 @PutMapping("/admins/{id}/deactivate") @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','GUARDIAN_ADMIN')")
 public Map<String,String> deactivate(@PathVariable UUID id) { adminService.deactivateAdmin(id); return Map.of("message","Administrator deactivated"); }
 @PutMapping("/admins/{id}/activate") @PreAuthorize("hasAnyAuthority('SUPER_ADMIN','GUARDIAN_ADMIN')")
 public Map<String,String> activate(@PathVariable UUID id) { adminService.activateAdmin(id); return Map.of("message","Administrator activated"); }
 public record EmailRequest(@NotBlank @Email String email) {}
 public record CodeRequest(@NotBlank String code) {}
 public record EnrollmentRequest(@NotBlank @Email String email,String username,@NotBlank String password,@NotBlank String confirmPassword,@NotNull UUID challengeId,@NotBlank String code) {}
 public record AcceptanceRequest(@NotBlank String username,@NotBlank String password,@NotBlank String confirmPassword,@NotBlank String enrollmentToken) {}
 public record InvitationResponse(UUID id,String email,UUID challengeId,LocalDateTime expiresAt) {}
 public record InvitationStatus(UUID id,String email,UUID invitedBy,LocalDateTime createdAt,LocalDateTime expiresAt,
                                boolean emailVerified,boolean confirmed,LocalDateTime acceptedAt,LocalDateTime revokedAt) {}
}
