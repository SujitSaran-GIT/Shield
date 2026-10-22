import { CheckCircle, CircleHelp, XCircle } from 'lucide-react';
import type { SystemStatusData } from '../../../api/healthApi';

interface SystemStatusProps { status: SystemStatusData | null; loading: boolean }

export default function SystemStatus({ status, loading }: SystemStatusProps) {
  const healthy = status?.status === 'UP';
  const unavailable = !status || status.status === 'UNKNOWN';
  const Icon = unavailable ? CircleHelp : healthy ? CheckCircle : XCircle;
  const color = unavailable ? 'text-gray-500' : healthy ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  return <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">System Status</h2>
    <div className="flex items-center gap-3">
      <Icon className={`w-6 h-6 ${color}`} aria-hidden="true" />
      <span className={`font-semibold ${color}`}>{status?.status ?? (loading ? 'Loading...' : 'Unavailable')}</span>
    </div>
    <p className="text-gray-600 dark:text-gray-400 mt-4">{status?.message ?? 'No current dependency health report is available.'}</p>
  </section>;
}
