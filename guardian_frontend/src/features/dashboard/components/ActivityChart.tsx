// src/features/dashboard/components/ActivityChart.tsx
import React from 'react';
import { LineChart } from '../../../components';
import type { ActivityData } from '../../../types';

interface ChartDataPoint {
  date: string;
  logins: number;
  registrations: number;
  failures: number;
}

interface ActivityChartProps {
  data?: ActivityData;
}

const ActivityChart: React.FC<ActivityChartProps> = ({ data }) => {
  // Transform backend data to match chart expectations
  const transformData = (backendData?: ActivityData): ChartDataPoint[] => {
    if (!backendData || !backendData.dailyActivities) {
      return [];
    }

    return backendData.dailyActivities.map(activity => ({
      date: new Date(activity.date).toLocaleDateString('en-US', { weekday: 'short' }),
      logins: activity.successfulEvents,
      registrations: activity.eventCount - activity.successfulEvents - activity.failedEvents, // Other events
      failures: activity.failedEvents,
    }));
  };

  const chartData = transformData(data);

  return (
    <LineChart
      data={chartData.map((point) => ({ ...point }))}
      lines={[
        { dataKey: 'logins', name: 'Successful Events', color: '#3b82f6' },
        { dataKey: 'registrations', name: 'Other Events', color: '#10b981' },
        { dataKey: 'failures', name: 'Failed Events', color: '#ef4444' },
      ]}
      xKey="date"
      height={300}
      showGrid
      showTooltip
      showLegend
      syncId={undefined}
    />
  );
};

export default ActivityChart;
