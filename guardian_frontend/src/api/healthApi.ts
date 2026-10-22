import axiosInstance from './axiosConfig';

export interface SystemStatusData { status: string; message: string }
export interface MetricMeasurement { statistic: string; value: number }
export type SystemMetrics = Record<string, { measurements: MetricMeasurement[] }>;
export interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  totalClients: number;
  activeClients: number;
  activeSessions: number;
  auditKPIs: Record<string, unknown>;
}

export const healthApi = {
  getSystemMetrics: () => axiosInstance.get<SystemMetrics>('/health/system-metrics'),
  getPlatformMetrics: () => axiosInstance.get<PlatformMetrics>('/health/metrics'),
  // An unhealthy dependency returns HTTP 503 with a usable status body.
  getStatus: () => axiosInstance.get<SystemStatusData>('/health/status', {
    validateStatus: status => (status >= 200 && status < 300) || status === 503,
  }),
};
