package com.guardian.repository;

import com.guardian.entity.User;
import com.guardian.entity.User.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;
import java.util.Collection;
import com.guardian.entity.User.UserRole;

@Repository
public interface UserRepository extends JpaRepository<User, UUID>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<User> {
    boolean existsByRoleIn(Collection<UserRole> roles);
    long countByClientIdInAndStatus(Collection<String> clientIds, UserStatus status);
    long countByCreatedAtBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);
    long countByClientIdInAndCreatedAtBetween(Collection<String> clientIds, java.time.LocalDateTime start, java.time.LocalDateTime end);
    Page<User> findByClientIdIn(Collection<String> clientIds, Pageable pageable);
    @Query("SELECT u FROM User u WHERE u.clientId IN :clientIds AND (LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> searchUsersInClients(String search, Collection<String> clientIds, Pageable pageable);
    
    Optional<User> findByEmail(String email);
    
    Optional<User> findByUsername(String username);
    
    boolean existsByEmail(String email);
    
    boolean existsByUsername(String username);
    boolean existsByUsernameIgnoreCase(String username);
    
    Page<User> findByClientId(String clientId, Pageable pageable);
    
    long countByStatus(UserStatus status);
    
    long countByClientId(String clientId);
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.status = 'ACTIVE'")
    long countActiveUsers();
    
    @Query("SELECT u FROM User u WHERE " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<User> searchUsers(String search, Pageable pageable);
}
