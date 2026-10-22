// src/features/dashboard/components/ClientDistribution.tsx
import React from 'react';
import { PieChart } from '../../../components';

interface ClientDistributionData {
  clientName: string;
  clientId: string;
  userCount: number;
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

interface ClientDistributionProps {
  data?: ClientDistributionData[];
}

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

const ClientDistribution: React.FC<ClientDistributionProps> = ({ data = [] }) => {
  const chartData: ChartDataItem[] = data.length > 0
    ? data.map((item, index) => ({
        name: item.clientName,
        value: item.userCount,
        color: COLORS[index % COLORS.length],
      }))
    : [];

  return (
    <PieChart
      data={chartData}
      height={300}
      innerRadius={60}
      outerRadius={100}
      showTooltip
      showLegend
      legendPosition="right"
    />
  );
};

export default ClientDistribution;
