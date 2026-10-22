package com.guardian.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMetricsDTO {
    private long totalUsers;
    private long activeUsers;
    private long totalClients;
    private long activeClients;

    // Growth metrics (optional)
    private Long userGrowth;
    private Long clientGrowth;
    private Long totalEvents;
    private Long eventGrowth;
    private Integer successRate;
    private Integer successRateChange;

    // Chart data
    private List<DateCountData> loginData;
    private List<DateCountData> registrationData;
    private List<DateCountData> auditData;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DateCountData {
        private String date;
        private long count;
    }
}
