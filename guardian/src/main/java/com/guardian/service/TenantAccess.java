package com.guardian.service;

import com.guardian.entity.User;
import com.guardian.repository.ClientRepository;
import com.guardian.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TenantAccess {
    private final UserRepository users;
    private final ClientRepository clients;

    public User currentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) throw new AccessDeniedException("Authentication required");
        try {
            User user = users.findById(UUID.fromString(auth.getName())).orElseThrow(() -> new AccessDeniedException("Authentication required"));
            if (user.getStatus() != User.UserStatus.ACTIVE) throw new AccessDeniedException("Account unavailable");
            return user;
        } catch (IllegalArgumentException ex) { throw new AccessDeniedException("Authentication required"); }
    }

    public boolean isSuperAdmin() {
        var role = currentUser().getRole();
        return role == User.UserRole.SUPER_ADMIN || role == User.UserRole.GUARDIAN_ADMIN;
    }

    public List<String> authorizedClientIds() {
        User user = currentUser();
        if (isSuperAdmin()) return clients.findAll().stream().map(c -> c.getClientId()).toList();
        if (user.getRole() != User.UserRole.CLIENT_ADMIN) return List.of();
        return clients.findByOwnerUserId(user.getId()).stream().map(c -> c.getClientId()).toList();
    }

    public void requireClientAccess(String clientId) {
        if (isSuperAdmin()) return;
        User user = currentUser();
        if (user.getRole() != User.UserRole.CLIENT_ADMIN || !clients.existsByClientIdAndOwnerUserId(clientId, user.getId()))
            throw new AccessDeniedException("Client access denied");
    }

    public void requireClientAdmin() {
        if (currentUser().getRole() != User.UserRole.CLIENT_ADMIN) throw new AccessDeniedException("Client administrator required");
    }

    public void requireSuperAdmin() {
        if (!isSuperAdmin()) throw new AccessDeniedException("Platform administrator required");
    }

    public void requireUserRead(User target) {
        if (currentUser().getId().equals(target.getId()) || isSuperAdmin()) return;
        requireClientAdmin();
        if (target.getRole() != User.UserRole.USER) throw new AccessDeniedException("User access denied");
        requireClientAccess(target.getClientId());
    }

    public void requireUserManagement(User target) {
        requireClientAdmin();
        if (target.getRole() != User.UserRole.USER) throw new AccessDeniedException("User management denied");
        requireClientAccess(target.getClientId());
    }
}
