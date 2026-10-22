import type { SystemMetrics } from '../../api/healthApi';

export function metricValue(metrics: SystemMetrics | null, name: string, statistic = 'VALUE'): number | null {
  const value = metrics?.[name]?.measurements?.find(measurement => measurement.statistic === statistic)?.value;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unavailable';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const exponent = Math.min(units.length - 1, Math.max(0, Math.floor(Math.log(bytes) / Math.log(1024))));
  return `${(bytes / 1024 ** exponent).toFixed(1)} ${units[exponent]}`;
}

export function formatPercentage(value: number): string {
  return Number.isFinite(value) && value >= 0 && value <= 1 ? `${(value * 100).toFixed(1)}%` : 'Unavailable';
}

export function formatUptime(seconds: number): string {
  return `${Math.floor(seconds / 86400)}d ${Math.floor(seconds % 86400 / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
}
