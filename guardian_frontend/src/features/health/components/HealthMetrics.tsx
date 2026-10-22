import type { SystemMetrics } from '../../../api/healthApi';
import { metricValue, formatBytes, formatPercentage, formatUptime } from '../metrics';

interface HealthMetricsProps { metricsData: SystemMetrics | null }

export default function HealthMetrics({ metricsData }: HealthMetricsProps) {
  const cpu = metricValue(metricsData, 'system.cpu.usage');
  const memory = metricValue(metricsData, 'jvm.memory.used');
  const maxMemory = metricValue(metricsData, 'jvm.memory.max');
  const connections = metricValue(metricsData, 'hikaricp.connections.active');
  const uptime = metricValue(metricsData, 'process.uptime');
  const requests = metricValue(metricsData, 'http.server.requests', 'COUNT');
  const metrics = [
    { title: 'CPU Usage', value: cpu === null ? 'Unavailable' : formatPercentage(cpu) },
    { title: 'JVM Memory Used', value: memory === null ? 'Unavailable' : formatBytes(memory) },
    { title: 'JVM Maximum Memory', value: maxMemory === null ? 'Unavailable' : formatBytes(maxMemory) },
    { title: 'Active Database Connections', value: connections?.toLocaleString() ?? 'Unavailable' },
    { title: 'Process Uptime', value: uptime === null ? 'Unavailable' : formatUptime(uptime) },
    { title: 'HTTP Requests', value: requests?.toLocaleString() ?? 'Unavailable' },
  ];
  return <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Performance Metrics</h2>
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {metrics.map(metric => <div key={metric.title} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <dt className="text-sm text-gray-600 dark:text-gray-400">{metric.title}</dt>
        <dd className="text-xl font-semibold text-gray-900 dark:text-white mt-2">{metric.value}</dd>
      </div>)}
    </dl>
    <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Unavailable measurements are not reported by the server. Uptime and request counts cover the current process lifetime.</p>
  </section>;
}
