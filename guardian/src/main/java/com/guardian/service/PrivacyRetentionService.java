package com.guardian.service;

import com.guardian.repository.AuditLogRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PrivacyRetentionService {
    private final EntityManager entityManager;
    private final AuditLogRepository audits;
    @Value("${app.audit.retention-days:90}") private int auditDays = 90;
    @Value("${app.location.retention-days:30}") private int locationDays = 30;

    @Scheduled(cron = "0 30 2 * * *")
    @Transactional
    public void retain() {
        // Personal location metadata expires independently of security event history.
        if (locationDays < 1 || auditDays < locationDays) throw new IllegalStateException("Invalid privacy retention policy");
        LocalDateTime cutoff = LocalDateTime.now().minusDays(locationDays);
        entityManager.createQuery("UPDATE AuditLog a SET a.ipAddress = null, a.location = null, a.userAgent = null WHERE a.createdAt < :cutoff")
                .setParameter("cutoff", cutoff).executeUpdate();
        entityManager.createQuery("UPDATE UserSession s SET s.ipAddress = null, s.location = null, s.userAgent = null, s.deviceInfo = null WHERE s.createdAt < :cutoff")
                .setParameter("cutoff", cutoff).executeUpdate();
        entityManager.createQuery("UPDATE User u SET u.lastLoginIp = null, u.lastLoginLocation = null WHERE u.lastLoginAt < :cutoff")
                .setParameter("cutoff", cutoff).executeUpdate();
        audits.deleteByCreatedAtBefore(LocalDateTime.now().minusDays(auditDays));
        entityManager.createQuery("DELETE FROM EmailChallenge e WHERE e.expiresAt < :cutoff")
                .setParameter("cutoff", java.time.Instant.now().minusSeconds(86400)).executeUpdate();
    }
}
