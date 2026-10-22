package com.guardian.controller;

import com.guardian.dto.UserDTO;
import com.guardian.entity.Client;
import com.guardian.entity.User;
import com.guardian.entity.UserSession;
import com.guardian.repository.ClientRepository;
import com.guardian.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final ClientRepository clientRepository;
    
    @GetMapping
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<Page<UserDTO>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) User.UserStatus status,
            @RequestParam(required = false) User.UserRole role,
            @RequestParam(required = false) String clientName) {

        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("Page size must be 1 to 100 and page must be nonnegative");
        if (!java.util.Set.of("createdAt", "username", "email", "status", "role", "lastLoginAt").contains(sortBy))
            throw new IllegalArgumentException("Unsupported user sort field");
        if (!sortDir.equalsIgnoreCase("ASC") && !sortDir.equalsIgnoreCase("DESC")) throw new IllegalArgumentException("Invalid sort direction");

        Sort sort = sortDir.equalsIgnoreCase("ASC")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        Page<UserDTO> users = userService.getFilteredUsers(query, status, role, clientName, PageRequest.of(page, size, sort));

        return ResponseEntity.ok(users);
    }
    
    @GetMapping("/search")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<Page<UserDTO>> searchUsers(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<User> users = userService.searchUsers(query, PageRequest.of(page, size));

        List<UserDTO> userDTOs = users.getContent().stream()
                .map(user -> {
                    String clientName = user.getClientId(); // Default to clientId
                    try {
                        Optional<Client> clientOpt = clientRepository.findByClientId(user.getClientId());
                        if (clientOpt.isPresent()) {
                            clientName = clientOpt.get().getName();
                        }
                    } catch (Exception e) {
                        // If client lookup fails, use clientId as fallback
                    }
                    return UserDTO.fromEntityWithClientName(user, clientName);
                })
                .collect(java.util.stream.Collectors.toList());

        Page<UserDTO> userDTOPage = new org.springframework.data.domain.PageImpl<>(
                userDTOs, PageRequest.of(page, size), users.getTotalElements());

        return ResponseEntity.ok(userDTOPage);
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<UserDTO> getUserById(@PathVariable UUID id) {
        User user = userService.getVisibleUserById(id);
        String clientName = user.getClientId(); // Default to clientId
        try {
            Optional<Client> clientOpt = clientRepository.findByClientId(user.getClientId());
            if (clientOpt.isPresent()) {
                clientName = clientOpt.get().getName();
            }
        } catch (Exception e) {
            // If client lookup fails, use clientId as fallback
        }
        return ResponseEntity.ok(UserDTO.fromEntityWithClientName(user, clientName));
    }
    
    @GetMapping("/{id}/sessions")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<List<UserSession>> getUserSessions(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserSessions(id));
    }
    
    @PutMapping("/{id}/block")
    @PreAuthorize("hasAuthority('CLIENT_ADMIN')")
    public ResponseEntity<MessageResponse> blockUser(@PathVariable UUID id) {
        userService.blockUser(id);
        return ResponseEntity.ok(new MessageResponse("User blocked successfully"));
    }
    
    @PutMapping("/{id}/unblock")
    @PreAuthorize("hasAuthority('CLIENT_ADMIN')")
    public ResponseEntity<MessageResponse> unblockUser(@PathVariable UUID id) {
        userService.unblockUser(id);
        return ResponseEntity.ok(new MessageResponse("User unblocked successfully"));
    }
    
    public record MessageResponse(String message) {}

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CLIENT_ADMIN')")
    public ResponseEntity<MessageResponse> deleteUser(@PathVariable UUID id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(new MessageResponse("User deleted successfully"));
    }
}


