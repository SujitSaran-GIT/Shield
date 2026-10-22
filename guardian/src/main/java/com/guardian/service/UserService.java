package com.guardian.service;

import com.guardian.dto.UserDTO;
import com.guardian.entity.Client;
import com.guardian.entity.User;
import com.guardian.entity.User.UserRole;
import com.guardian.entity.User.UserStatus;
import com.guardian.entity.UserSession;
import com.guardian.entity.enums.EventType;
import com.guardian.repository.ClientRepository;
import com.guardian.repository.UserRepository;
import com.guardian.repository.UserSessionRepository;
import com.guardian.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserService {
    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    /** Serialize credential issuance and revocation against account changes. */
    public void lockCredentials(User user) {
        entityManager.flush();
        entityManager.refresh(user, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
    }

    private final UserRepository userRepository;
    private final UserSessionRepository userSessionRepository;
    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;
    private final TenantAccess access;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditService audit;
    
    @Transactional
    public User registerUser(String username, String email, String password, String clientId) {
        validateIdentity(username, email, password);
        Client tenant = clientRepository.findByClientId(clientId).orElseThrow(() -> new IllegalArgumentException("Invalid client"));
        if (tenant.getStatus() != Client.ClientStatus.ACTIVE) throw new IllegalArgumentException("Invalid client");
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = User.builder()
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .clientId(clientId)
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .build();

        User savedUser = userRepository.save(user);
        log.info("User registered: {} for client: {}", email, clientId);

        return savedUser;
    }

    @Transactional
    public User registerAdminUser(String username, String email, String password, UserRole adminRole) {
        validateIdentity(username, email, password);
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = User.builder()
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .clientId("GUARDIAN_SYSTEM") // Admin users belong to the system client
                .role(adminRole)
                .status(UserStatus.ACTIVE)
                .build();

        User savedUser = userRepository.save(user);
        log.info("Admin user registered: {} with role: {}", email, adminRole);

        return savedUser;
    }
    
    @Transactional
    public User authenticateUser(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new org.springframework.security.authentication.BadCredentialsException("Invalid credentials"));
        
        lockCredentials(user);
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid credentials");
        }
        
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid credentials");
        }
        
        return user;
    }
    
    @Transactional
    public void updateLastLogin(UUID userId, String ipAddress, String location) {
        User user = getUserById(userId);
        user.setLastLoginAt(LocalDateTime.now());
        user.setLastLoginIp(ipAddress);
        user.setLastLoginLocation(location);
        userRepository.save(user);
    }
    
    @Transactional(readOnly = true)
    public User getUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
    
    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
    
    @Transactional(readOnly = true)
    public Page<User> getAllUsers(Pageable pageable) {
        if (access.isSuperAdmin()) return userRepository.findAll(pageable);
        access.requireClientAdmin();
        return userRepository.findByClientIdIn(access.authorizedClientIds(), pageable);
    }

    @Transactional(readOnly = true)
    public Page<UserDTO> getAllUsersWithClientNames(Pageable pageable) {
        return withClientNames(getAllUsers(pageable), pageable);
    }

    @Transactional(readOnly = true)
    public Page<UserDTO> getFilteredUsers(String query, UserStatus status, UserRole role, String clientName, Pageable pageable) {
        boolean global = access.isSuperAdmin();
        if (!global) access.requireClientAdmin();
        List<String> scope = global ? List.of() : access.authorizedClientIds();
        org.springframework.data.jpa.domain.Specification<User> spec = (root, criteria, cb) -> {
            java.util.List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();
            if (!global) predicates.add(root.get("clientId").in(scope));
            if (query != null && !query.isBlank()) {
                String pattern = searchPattern(query);
                predicates.add(cb.or(cb.like(cb.lower(root.get("username")), pattern, '\\'),
                        cb.like(cb.lower(root.get("email")), pattern, '\\')));
            }
            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            if (role != null) predicates.add(role == UserRole.SUPER_ADMIN
                    ? root.get("role").in(UserRole.SUPER_ADMIN, UserRole.GUARDIAN_ADMIN) : cb.equal(root.get("role"), role));
            if (clientName != null && !clientName.isBlank()) {
                var clientIds = criteria.subquery(String.class);
                var client = clientIds.from(Client.class);
                clientIds.select(client.get("clientId")).where(cb.like(cb.lower(client.get("name")), searchPattern(clientName), '\\'));
                predicates.add(root.get("clientId").in(clientIds));
            }
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        return withClientNames(userRepository.findAll(spec, pageable), pageable);
    }

    private static String searchPattern(String value) {
        return "%" + value.trim().toLowerCase(java.util.Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }

    private Page<UserDTO> withClientNames(Page<User> users, Pageable pageable) {

        List<UserDTO> userDTOs = users.getContent().stream()
                .map(user -> {
                    String clientName = user.getClientId(); // Default to clientId
                    try {
                        Client client = clientRepository.findByClientId(user.getClientId()).orElse(null);
                        if (client != null) {
                            clientName = client.getName();
                        }
                    } catch (Exception e) {
                        // If client lookup fails, use clientId as fallback
                        log.warn("Failed to lookup client name for clientId: {}", user.getClientId());
                    }
                    return UserDTO.fromEntityWithClientName(user, clientName);
                })
                .collect(Collectors.toList());

        return new PageImpl<>(userDTOs, pageable, users.getTotalElements());
    }
    
    @Transactional(readOnly = true)
    public Page<User> searchUsers(String search, Pageable pageable) {
        if (access.isSuperAdmin()) return userRepository.searchUsers(search, pageable);
        access.requireClientAdmin();
        return userRepository.searchUsersInClients(search, access.authorizedClientIds(), pageable);
    }
    
    @Transactional(readOnly = true)
    public Page<User> getUsersByClient(String clientId, Pageable pageable) {
        access.requireClientAccess(clientId);
        return userRepository.findByClientId(clientId, pageable);
    }
    
    @Transactional(readOnly = true)
    public List<UserSession> getUserSessions(UUID userId) {
        access.requireUserRead(getUserById(userId));
        return userSessionRepository.findByUserId(userId);
    }
    
    @Transactional(readOnly = true)
    public List<UserSession> getActiveUserSessions(UUID userId) {
        access.requireUserRead(getUserById(userId));
        return userSessionRepository.findActiveSessionsByUser(userId, LocalDateTime.now());
    }
    
    @Transactional
    public void blockUser(UUID id) {
        User user = getUserById(id);
        access.requireUserManagement(user);
        lockCredentials(user);
        if (user.getStatus() == UserStatus.DELETED) throw new IllegalArgumentException("Deleted users cannot be blocked");
        user.setStatus(UserStatus.BLOCKED);
        userRepository.save(user);
        
        // Deactivate all user sessions
        refreshTokenRepository.revokeAllUserTokens(id);
        userSessionRepository.deactivateAllUserSessions(id);
        auditUserStatusChange(user);
        
        log.info("User blocked: {}", user.getEmail());
    }
    
    @Transactional
    public void unblockUser(UUID id) {
        User user = getUserById(id);
        access.requireUserManagement(user);
        lockCredentials(user);
        if (user.getStatus() == UserStatus.DELETED) throw new IllegalArgumentException("Deleted users cannot be reactivated");
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
        auditUserStatusChange(user);
        log.info("User unblocked: {}", user.getEmail());
    }

    @Transactional
    public void deleteUser(UUID id) {
        User user = getUserById(id);
        access.requireUserManagement(user);
        lockCredentials(user);
        user.setStatus(UserStatus.DELETED);
        userRepository.save(user);
        refreshTokenRepository.revokeAllUserTokens(id);
        userSessionRepository.deactivateAllUserSessions(id);
        auditUserStatusChange(user);
    }
    
    @Transactional(readOnly = true)
    public long getTotalUsers() {
        return userRepository.count();
    }
    
    @Transactional(readOnly = true)
    public long getActiveUsers() {
        return userRepository.countActiveUsers();
    }
    
    @Transactional(readOnly = true)
    public long getUsersByClientCount(String clientId) {
        access.requireClientAccess(clientId);
        return userRepository.countByClientId(clientId);
    }

    public User getVisibleUserById(UUID id) {
        User user = getUserById(id);
        access.requireUserRead(user);
        return user;
    }

    private void validateIdentity(String username, String email, String password) {
        if (username == null || !username.matches("[A-Za-z0-9_.-]{3,50}")) throw new IllegalArgumentException("Username must contain 3 to 50 letters, digits, dots, dashes or underscores");
        if (email == null || !email.equals(email.trim().toLowerCase(java.util.Locale.ROOT)) || !email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) throw new IllegalArgumentException("Use a normalized valid email address");
        PasswordRecoveryService.validatePassword(password, password);
        if (userRepository.existsByUsernameIgnoreCase(username)) throw new IllegalArgumentException("Username unavailable");
    }

    private void auditUserStatusChange(User target) {
        User actor = access.currentUser();
        audit.logEvent(EventType.ADMIN_UPDATED, target.getClientId(), null, actor.getId(), actor.getEmail(),
                null, null, 200, "User " + target.getId() + " status changed to " + target.getStatus());
    }
}

