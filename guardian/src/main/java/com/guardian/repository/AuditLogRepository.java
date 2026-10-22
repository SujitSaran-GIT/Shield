package com.guardian.repository;

import com.guardian.entity.AuditLog;
import com.guardian.entity.enums.EventType;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {
    @Query("select cast(a.createdAt as LocalDate), a.eventType, count(a) from AuditLog a where a.createdAt >= :start and (:global = true or a.clientId in :ids) group by cast(a.createdAt as LocalDate), a.eventType")
    List<Object[]> dailyScopedEvents(LocalDateTime start, boolean global, List<String> ids);

    @Query("select count(a) from AuditLog a where a.createdAt between :start and :end and (:global = true or a.clientId in :ids) and (:type is null or a.eventType = :type)")
    long countScopedEvents(LocalDateTime start, LocalDateTime end, boolean global, List<String> ids, EventType type);
    
    Page<AuditLog> findByClientId(String clientId, Pageable pageable);
    
    Page<AuditLog> findByEventType(EventType eventType, Pageable pageable);
    
    Page<AuditLog> findByIpAddress(String ipAddress, Pageable pageable);
    
    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:clientId IS NULL OR a.clientId = :clientId) AND " +
           "(:eventType IS NULL OR a.eventType = :eventType) AND " +
           "(:ipAddress IS NULL OR a.ipAddress = :ipAddress) AND " +
           "a.createdAt BETWEEN :startDate AND :endDate")
    Page<AuditLog> findByFilters(
        @Param("clientId") String clientId,
        @Param("eventType") EventType eventType,
        @Param("ipAddress") String ipAddress,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        Pageable pageable
    );
    
    @Query("SELECT COUNT(a) FROM AuditLog a WHERE " +
           "a.eventType IN ('LOGIN_SUCCESS', 'USER_REGISTRATION_SUCCESS')")
    long countSuccessfulEvents();
    
    @Query("SELECT COUNT(a) FROM AuditLog a WHERE " +
           "a.eventType IN ('LOGIN_FAILED', 'USER_REGISTRATION_FAILED', 'CLIENT_AUTH_FAILED')")
    long countFailedEvents();
    
    @Query("SELECT a FROM AuditLog a WHERE " +
           "a.createdAt >= :startDate " +
           "ORDER BY a.createdAt DESC")
    List<AuditLog> findRecentLogs(@Param("startDate") LocalDateTime startDate);
    
    @Query("SELECT DATE(a.createdAt) as date, COUNT(a) as count " +
           "FROM AuditLog a WHERE a.createdAt >= :startDate " +
           "GROUP BY DATE(a.createdAt) ORDER BY date")
    List<Object[]> getDailyEventCounts(@Param("startDate") LocalDateTime startDate);
    
    @Query("SELECT a.clientId, COUNT(a) as count " +
           "FROM AuditLog a WHERE a.createdAt >= :startDate " +
           "GROUP BY a.clientId")
    List<Object[]> getEventCountsByClient(@Param("startDate") LocalDateTime startDate);

    long deleteByCreatedAtBefore(LocalDateTime cutoff);
}
