package com.guardian.service;

import com.guardian.dto.HealthMetricsDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
@Slf4j
@RequiredArgsConstructor
public class HealthMonitorService {
    
    private final com.guardian.repository.UserRepository users;
    private final com.guardian.repository.ClientRepository clients;
    private final AuditService auditService;
    private final com.guardian.repository.UserSessionRepository userSessionRepository;
    private final com.guardian.repository.RefreshTokenRepository refreshTokenRepository;
    
    @Transactional(readOnly = true)
    public HealthMetricsDTO getHealthMetrics() {
        return HealthMetricsDTO.builder()
                .totalUsers(users.count())
                .activeUsers(users.countActiveUsers())
                .totalClients(clients.count())
                .activeClients(clients.countActiveClients())
                .activeSessions(userSessionRepository.countActiveSessions(LocalDateTime.now()))
                .auditKPIs(auditService.platformKPIs())
                .build();
    }
    
    @Scheduled(cron = "0 0 * * * *") // Every hour
    @Transactional
    public void cleanupExpiredSessions() {
        try {
            userSessionRepository.deleteExpiredSessions(LocalDateTime.now());
            log.info("Expired sessions cleaned up");
        } catch (Exception e) {
            log.error("Failed to cleanup expired sessions: {}", e.getMessage());
        }
    }
    
    @Scheduled(cron = "0 0 2 * * *") // Daily at 2 AM
    @Transactional
    public void cleanupExpiredTokens() {
        try {
            refreshTokenRepository.deleteExpiredTokens(LocalDateTime.now());
            log.info("Expired refresh tokens cleaned up");
        } catch (Exception e) {
            log.error("Failed to cleanup expired tokens: {}", e.getMessage());
        }
    }
}
