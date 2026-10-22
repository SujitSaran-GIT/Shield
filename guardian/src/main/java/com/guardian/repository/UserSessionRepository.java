package com.guardian.repository;

import com.guardian.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {
    
    Optional<UserSession> findBySessionToken(String sessionToken);
    
    List<UserSession> findByUserId(UUID userId);
    
    List<UserSession> findByUserIdAndActiveTrue(UUID userId);
    
    @Query("SELECT COUNT(s) FROM UserSession s WHERE " +
           "s.active = true AND s.expiresAt > :now")
    long countActiveSessions(LocalDateTime now);
    
    @Query("SELECT COUNT(s) FROM UserSession s WHERE " +
           "s.userId = :userId AND s.active = true AND s.expiresAt > :now")
    long countActiveSessionsByUser(UUID userId, LocalDateTime now);
    
    @Modifying
    @Query("UPDATE UserSession s SET s.active = false WHERE s.userId = :userId")
    void deactivateAllUserSessions(UUID userId);

    @Modifying
    @Query("UPDATE UserSession s SET s.active = false WHERE s.clientId = :clientId")
    void deactivateAllClientSessions(String clientId);
    
    @Modifying
    @Query("UPDATE UserSession s SET s.active = false WHERE s.sessionToken = :sessionToken")
    void deactivateSession(String sessionToken);
    
    @Modifying
    @Query("DELETE FROM UserSession s WHERE s.expiresAt < :now")
    void deleteExpiredSessions(LocalDateTime now);
    
    @Query("SELECT s FROM UserSession s WHERE " +
           "s.userId = :userId AND s.active = true AND s.expiresAt > :now " +
           "ORDER BY s.lastActiveAt DESC")
    List<UserSession> findActiveSessionsByUser(UUID userId, LocalDateTime now);
}
