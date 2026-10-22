import type { ReactNode } from 'react';

export interface Series { key?: string; dataKey: string; name?: string; color?: string; customColors?: string[] }
export interface ChartProps {
  data?: Record<string, unknown>[]; areas?: Series[]; bars?: Series[]; lines?: Series[]; radars?: Series[];
  xKey?: string; height?: number; showGrid?: boolean; showTooltip?: boolean; showLegend?: boolean;
  showXAxis?: boolean; showYAxis?: boolean; stacked?: boolean; gradient?: boolean; animation?: boolean;
  className?: string; barSize?: number; strokeWidth?: number; syncId?: string; showAngleAxis?: boolean; showRadiusAxis?: boolean;
}
export interface ChartTooltipProps {
  active?: boolean; label?: ReactNode;
  payload?: { color?: string; name?: string; value: string | number; payload: { subject?: string; name?: string; value: number; percent: number; color?: string } }[];
}
