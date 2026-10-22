package com.guardian.service;

import com.guardian.entity.AuditLog;
import com.guardian.entity.enums.EventType;
import com.guardian.repository.AuditLogRepository;
import com.guardian.util.IpUtil;
import com.guardian.util.SensitiveDataRedactor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AuditService {
    private final AuditLogRepository auditLogRepository;
    private final GeoIpService geoIpService;
    private final TenantAccess access;
    private final AuditWriter writer;

    public void logEvent(EventType eventType, String clientId, String clientName, UUID userId,
                         String userEmail, String ipAddress, String userAgent, Integer statusCode, String details) {
        String ip = IpUtil.normalize(ipAddress);
        AuditLog event = AuditLog.builder().eventType(eventType).clientId(SensitiveDataRedactor.clean(clientId, 255))
                .clientName(SensitiveDataRedactor.clean(clientName, 255)).userId(userId)
                .userEmail(SensitiveDataRedactor.clean(userEmail, 255)).ipAddress(ip)
                .location(geoIpService.getLocation(ip)).userAgent(SensitiveDataRedactor.clean(userAgent, 1000))
                .statusCode(statusCode).details(SensitiveDataRedactor.clean(details, 2000)).build();
        if (statusCode != null && statusCode >= 400) writer.writeFailure(event);
        else writer.write(event);
    }

    private Specification<AuditLog> scope() {
        if (access.isSuperAdmin()) return (root, query, cb) -> cb.conjunction();
        access.requireClientAdmin();
        List<String> allowed = access.authorizedClientIds();
        return (root, query, cb) -> allowed.isEmpty() ? cb.disjunction() : root.get("clientId").in(allowed);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAllAudits(Pageable pageable) { return auditLogRepository.findAll(scope(), pageable); }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditsByClient(String clientId, Pageable pageable) {
        access.requireClientAccess(clientId);
        return auditLogRepository.findAll(scope().and((root, q, cb) -> cb.equal(root.get("clientId"), clientId)), pageable);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditsByEventType(EventType eventType, Pageable pageable) {
        return auditLogRepository.findAll(scope().and((root, q, cb) -> cb.equal(root.get("eventType"), eventType)), pageable);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditsByFilters(String clientId, EventType eventType, String ipAddress,
                                           LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        if (clientId != null) access.requireClientAccess(clientId);
        if (startDate == null || endDate == null || startDate.isAfter(endDate))
            throw new IllegalArgumentException("A valid date range is required");
        Specification<AuditLog> spec = scope().and((root, q, cb) -> cb.between(root.get("createdAt"), startDate, endDate));
        if (clientId != null) spec = spec.and((r, q, cb) -> cb.equal(r.get("clientId"), clientId));
        if (eventType != null) spec = spec.and((r, q, cb) -> cb.equal(r.get("eventType"), eventType));
        if (ipAddress != null) {
            String literal = IpUtil.normalize(ipAddress);
            if (literal == null) throw new IllegalArgumentException("Invalid IP address");
            spec = spec.and((r, q, cb) -> cb.equal(r.get("ipAddress"), literal));
        }
        return auditLogRepository.findAll(spec, pageable);
    }

    @Transactional(readOnly = true)
    public AuditLog getAuditById(UUID id) {
        return auditLogRepository.findOne(scope().and((r, q, cb) -> cb.equal(r.get("id"), id)))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Audit event not found"));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAuditKPIs() {
        Specification<AuditLog> spec = scope();
        long total = auditLogRepository.count(spec);
        long successful = auditLogRepository.count(spec.and((r, q, cb) -> cb.between(r.get("statusCode"), 200, 299)));
        long failed = auditLogRepository.count(spec.and((r, q, cb) -> cb.greaterThanOrEqualTo(r.get("statusCode"), 400)));
        return kpis(total, successful, failed);
    }

    // Internal monitoring has no request principal. Only protected health endpoints and scheduled jobs call this.
    Map<String, Object> platformKPIs() {
        return kpis(auditLogRepository.count(), auditLogRepository.countSuccessfulEvents(), auditLogRepository.countFailedEvents());
    }

    private Map<String, Object> kpis(long total, long successful, long failed) {
        return Map.of("totalEvents", total, "successfulEvents", successful, "failedEvents", failed,
                "successRate", total == 0 ? 0.0 : Math.round(successful * 10000.0 / total) / 100.0,
                "failureRate", total == 0 ? 0.0 : Math.round(failed * 10000.0 / total) / 100.0);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getRecentLogs(int days) {
        if (days < 1 || days > 90) throw new IllegalArgumentException("Days must be between 1 and 90");
        return getAuditsByFilters(null, null, null, LocalDateTime.now().minusDays(days), LocalDateTime.now(),
                PageRequest.of(0, 500, Sort.by("createdAt").descending())).getContent();
    }

    @Transactional(readOnly = true)
    public List<Object[]> getDailyEventCounts(int days) {
        access.requireSuperAdmin();
        return auditLogRepository.getDailyEventCounts(LocalDateTime.now().minusDays(Math.min(90, Math.max(1, days))));
    }

    @Transactional(readOnly = true)
    public List<Object[]> getEventCountsByClient(int days) {
        access.requireSuperAdmin();
        return auditLogRepository.getEventCountsByClient(LocalDateTime.now().minusDays(Math.min(90, Math.max(1, days))));
    }
}
