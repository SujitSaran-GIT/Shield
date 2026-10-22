package com.guardian.controller;

import com.guardian.dto.AuditDTO;
import com.guardian.entity.enums.EventType;
import com.guardian.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping({"/api/admin/audits", "/api/audits"})
@RequiredArgsConstructor
public class AuditController {
    
    private final AuditService auditService;

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<AuditDTO> getAuditDetails(@PathVariable UUID id) {
        return ResponseEntity.ok(AuditDTO.fromEntity(auditService.getAuditById(id)));
    }
    
    @GetMapping
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<Page<AuditDTO>> getAllAudits(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {
        
        if (page < 0 || size < 1 || size > 100 || !java.util.Set.of("createdAt", "eventType", "statusCode").contains(sortBy))
            throw new IllegalArgumentException("Invalid pagination or sort field");
        Sort sort = sortDir.equalsIgnoreCase("ASC")
                ? Sort.by(sortBy).ascending() 
                : Sort.by(sortBy).descending();
        
        Page<AuditDTO> audits = auditService.getAllAudits(PageRequest.of(page, size, sort))
                .map(AuditDTO::fromEntity);
        
        return ResponseEntity.ok(audits);
    }
    
    @GetMapping("/filter")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<Page<AuditDTO>> getFilteredAudits(
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) EventType eventType,
            @RequestParam(required = false) String ipAddress,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDir) {
        
        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("Invalid pagination");
        if (!java.util.Set.of("createdAt", "eventType", "statusCode").contains(sortBy)
                || !(sortDir.equalsIgnoreCase("ASC") || sortDir.equalsIgnoreCase("DESC")))
            throw new IllegalArgumentException("Invalid sort field or direction");
        if (startDate == null) startDate = LocalDateTime.now().minusDays(30);
        if (endDate == null) endDate = LocalDateTime.now();
        
        Page<AuditDTO> audits = auditService.getAuditsByFilters(
                        clientId, eventType, ipAddress, startDate, endDate,
                        PageRequest.of(page, size, Sort.by(Sort.Direction.fromString(sortDir), sortBy)))
                .map(AuditDTO::fromEntity);
        
        return ResponseEntity.ok(audits);
    }
    
    @GetMapping("/kpis")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<Map<String, Object>> getAuditKPIs() {
        return ResponseEntity.ok(auditService.getAuditKPIs());
    }
    
    @GetMapping("/recent")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<List<AuditDTO>> getRecentLogs(
            @RequestParam(defaultValue = "7") int days) {
        
        List<AuditDTO> audits = auditService.getRecentLogs(days).stream()
                .map(AuditDTO::fromEntity)
                .toList();
        
        return ResponseEntity.ok(audits);
    }
}
