package com.guardian.service;

import com.guardian.entity.AuditLog;
import com.guardian.entity.enums.EventType;
import com.guardian.repository.AuditLogRepository;
import com.guardian.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;
    private final HealthMonitorService healthMonitorService;
    private final DashboardService dashboardService;
    private final AuditLogRepository auditLogRepository;
    private final com.guardian.repository.UserSessionRepository userSessionRepository;

    @Scheduled(fixedDelayString = "${websocket.update-interval}")
    public void sendHealthUpdates() {
        try {
            var metrics = healthMonitorService.getHealthMetrics();
            messagingTemplate.convertAndSend("/topic/health", metrics);
        } catch (Exception e) {
            log.error("Failed to send health updates: {}", e.getMessage());
        }
    }

    @Scheduled(fixedDelayString = "${websocket.dashboard-update-interval:30000}")
    public void sendDashboardUpdates() {
        try {
            // Send real-time dashboard metrics
            var metrics = dashboardService.platformMetrics();
            messagingTemplate.convertAndSend("/topic/dashboard", Map.of(
                "metrics", metrics,
                "timestamp", LocalDateTime.now()
            ));

            // Send active sessions count
            long activeSessions = userSessionRepository.countActiveSessions(LocalDateTime.now());
            messagingTemplate.convertAndSend("/topic/sessions", Map.of(
                "activeSessions", activeSessions,
                "recentLogins", getRecentLogins()
            ));

        } catch (Exception e) {
            log.error("Failed to send dashboard updates: {}", e.getMessage());
        }
    }

    @Scheduled(fixedDelayString = "${websocket.alert-check-interval:60000}")
    public void sendSystemAlerts() {
        try {
            List<Map<String, Object>> alerts = checkForSystemAlerts();
            if (!alerts.isEmpty()) {
                messagingTemplate.convertAndSend("/topic/alerts", alerts);
            }
        } catch (Exception e) {
            log.error("Failed to send system alerts: {}", e.getMessage());
        }
    }

    public void sendAuditUpdate(Object auditLog) {
        try {
            messagingTemplate.convertAndSend("/topic/audit", auditLog);
        } catch (Exception e) {
            log.error("Failed to send audit update: {}", e.getMessage());
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void auditCommitted(AuditWriter.Persisted event) {
        sendAuditUpdate(com.guardian.dto.AuditDTO.fromEntity(event.audit()));
    }

    private List<Map<String, String>> getRecentLogins() {
        // Get logins from the last hour
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        List<AuditLog> recentAudits = auditLogRepository.findByFilters(null, EventType.LOGIN_SUCCESS, null,
                oneHourAgo, LocalDateTime.now(), PageRequest.of(0, 10, Sort.by("createdAt").descending())).getContent();

        return recentAudits.stream()
            .filter(audit -> EventType.LOGIN_SUCCESS == audit.getEventType())
            .limit(10)
            .map(audit -> Map.of(
                "user", audit.getUserEmail() != null ? audit.getUserEmail() : "Anonymous",
                "time", audit.getCreatedAt().toString(),
                "client", audit.getClientId() != null ? audit.getClientId() : "Unknown"
            ))
            .toList();
    }

    private List<Map<String, Object>> checkForSystemAlerts() {
        List<Map<String, Object>> alerts = new java.util.ArrayList<>();

        try {
            // Check for high failed login attempts
            long failedLoginsLastHour = auditLogRepository.findByFilters(
                null, EventType.LOGIN_FAILED, null,
                LocalDateTime.now().minusHours(1), LocalDateTime.now(), PageRequest.of(0, 1)
            ).getTotalElements();

            if (failedLoginsLastHour > 50) {
                Map<String, Object> alert = new HashMap<>();
                alert.put("id", "failed-logins-" + System.currentTimeMillis());
                alert.put("type", "warning");
                alert.put("message", "High number of failed login attempts detected: " + failedLoginsLastHour);
                alert.put("time", "Just now");
                alerts.add(alert);
            }

            // Check for high successful events (just an example alert)
            long successfulEventsLastHour = auditLogRepository.findByFilters(
                null, EventType.LOGIN_SUCCESS, null,
                LocalDateTime.now().minusHours(1), LocalDateTime.now(), PageRequest.of(0, 1)
            ).getTotalElements();

            if (successfulEventsLastHour > 100) {
                Map<String, Object> alert = new HashMap<>();
                alert.put("id", "high-activity-" + System.currentTimeMillis());
                alert.put("type", "info");
                alert.put("message", "High user activity detected: " + successfulEventsLastHour + " successful logins in the last hour");
                alert.put("time", "Just now");
                alerts.add(alert);
            }

        } catch (Exception e) {
            log.error("Error checking for system alerts: {}", e.getMessage());
        }

        return alerts;
    }
}
