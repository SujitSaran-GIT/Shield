package com.guardian.service;

import com.guardian.entity.AuditLog;
import com.guardian.repository.AuditLogRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Successful events commit with the operation; denied operations survive the caller rollback. */
@Service
@RequiredArgsConstructor
public class AuditWriter {
    private final AuditLogRepository repository;
    private final ApplicationEventPublisher events;
    private final MeterRegistry meters;
    public record Persisted(AuditLog audit) {}

    @Transactional
    public void write(AuditLog entry) { persist(entry); }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void writeFailure(AuditLog entry) { persist(entry); }

    private void persist(AuditLog entry) {
        try { events.publishEvent(new Persisted(repository.saveAndFlush(entry))); }
        catch (RuntimeException ex) {
            meters.counter("security.audit.write_failures").increment();
            throw ex;
        }
    }
}
