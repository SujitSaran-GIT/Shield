package com.guardian.controller;

import com.guardian.dto.HealthMetricsDTO;
import com.guardian.service.HealthMonitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.metrics.MetricsEndpoint;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/health")
@PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN')")
@RequiredArgsConstructor
public class HealthController {
    private final HealthMonitorService monitor;
    private final ObjectProvider<MetricsEndpoint> metrics;
    private final ObjectProvider<HealthEndpoint> health;

    @GetMapping("/metrics")
    public ResponseEntity<HealthMetricsDTO> getHealthMetrics() { return ResponseEntity.ok(monitor.getHealthMetrics()); }

    /** Omitted measurements are unavailable; no synthetic values are supplied. */
    @GetMapping("/system-metrics")
    public ResponseEntity<Map<String, Object>> getSystemMetrics() {
        MetricsEndpoint endpoint = metrics.getIfAvailable();
        if (endpoint == null) return ResponseEntity.status(503).body(Map.of("status", "UNAVAILABLE"));
        Map<String, Object> measurements = new LinkedHashMap<>();
        for (String name : List.of("system.cpu.usage", "jvm.memory.used", "jvm.memory.max",
                "hikaricp.connections.active", "process.uptime", "http.server.requests",
                "security.rate_limit.requests", "security.audit.write_failures")) {
            var metric = endpoint.metric(name, null);
            if (metric != null && !metric.getMeasurements().isEmpty()) measurements.put(name, Map.of("measurements", metric.getMeasurements()));
        }
        if (measurements.isEmpty()) return ResponseEntity.status(503).body(Map.of("status", "UNAVAILABLE"));
        return ResponseEntity.ok(measurements);
    }

    @GetMapping("/status")
    public ResponseEntity<StatusResponse> getStatus() {
        HealthEndpoint endpoint = health.getIfAvailable();
        String status = endpoint == null ? "UNKNOWN" : endpoint.health().getStatus().getCode();
        boolean up = "UP".equals(status);
        return ResponseEntity.status(up ? 200 : 503).body(new StatusResponse(status,
                up ? "Required dependencies are available" : "A dependency is unavailable or not verified"));
    }
    public record StatusResponse(String status, String message) {}
}
