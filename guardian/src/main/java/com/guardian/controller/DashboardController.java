package com.guardian.controller;

import com.guardian.dto.dashboard.ActivityDataDTO;
import com.guardian.dto.dashboard.ClientDistributionDTO;
import com.guardian.dto.dashboard.DashboardMetricsDTO;
import com.guardian.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Slf4j
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/metrics")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<DashboardMetricsDTO> getMetrics() {
        log.info("Fetching dashboard metrics");
        DashboardMetricsDTO metrics = dashboardService.getMetrics();
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/activity")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<ActivityDataDTO> getActivityData(
            @RequestParam(defaultValue = "7") int days) {
        log.info("Fetching activity data for {} days", days);

        if (days <= 0 || days > 365) {
            days = 7; // Default to 7 days if invalid
        }

        ActivityDataDTO activityData = dashboardService.getActivityData(days);
        return ResponseEntity.ok(activityData);
    }

    @GetMapping("/clients/distribution")
    @PreAuthorize("hasAnyAuthority('SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN')")
    public ResponseEntity<ClientDistributionDTO> getClientDistribution() {
        log.info("Fetching client distribution");
        ClientDistributionDTO distribution = dashboardService.getClientDistribution();
        return ResponseEntity.ok(distribution);
    }
}

