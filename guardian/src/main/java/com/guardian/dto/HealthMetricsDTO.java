package com.guardian.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HealthMetricsDTO {
    private long totalUsers;
    private long activeUsers;
    private long totalClients;
    private long activeClients;
    private long activeSessions;
    private Map<String, Object> auditKPIs;
}