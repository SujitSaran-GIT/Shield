import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import SystemStatus from './components/SystemStatus';
import HealthMetrics from './components/HealthMetrics';
import { healthApi } from '../../api/healthApi';
import type { PlatformMetrics, SystemMetrics, SystemStatusData } from '../../api/healthApi';

const Health = () => {
  const [status, setStatus] = useState<SystemStatusData | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);

  const loadHealthData = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    const [statusResult, metricsResult, platformResult] = await Promise.allSettled([
      healthApi.getStatus(), healthApi.getSystemMetrics(), healthApi.getPlatformMetrics(),
    ]);
    inFlight.current = false;
    if (!mounted.current) return;
    // Clear failed measurements so a previous healthy value cannot look current.
    setStatus(statusResult.status === 'fulfilled' ? statusResult.value.data : null);
    setMetrics(metricsResult.status === 'fulfilled' ? metricsResult.value.data : null);
    setPlatformMetrics(platformResult.status === 'fulfilled' ? platformResult.value.data : null);
    setErrors([
      ...(statusResult.status === 'rejected' ? ['System status is unavailable.'] : []),
      ...(metricsResult.status === 'rejected' ? ['Performance metrics are unavailable.'] : []),
      ...(platformResult.status === 'rejected' ? ['Platform metrics are unavailable.'] : []),
    ]);
    if ([statusResult, metricsResult, platformResult].some(result => result.status === 'fulfilled')) setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const initialLoad = setTimeout(() => { void loadHealthData(); }, 0);
    const interval = setInterval(() => { void loadHealthData(); }, 30000);
    return () => { mounted.current = false; clearTimeout(initialLoad); clearInterval(interval); };
  }, [loadHealthData]);

  const platformStats = [
    { title: 'Total Users', value: platformMetrics?.totalUsers },
    { title: 'Active Users', value: platformMetrics?.activeUsers },
    { title: 'Active Clients', value: platformMetrics?.activeClients },
    { title: 'Active Sessions', value: platformMetrics?.activeSessions },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Health Monitor</h1>
          <p className="text-gray-600 dark:text-gray-400">System health and measured performance, refreshed every 30 seconds</p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && <span className="text-sm text-gray-500 dark:text-gray-400">Last response: {lastUpdated.toLocaleTimeString()}</span>}
          <button onClick={() => { void loadHealthData(); }} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white disabled:opacity-50">
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      {errors.length > 0 && <div role="alert" className="p-4 rounded-lg bg-yellow-50 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200">{errors.join(' ')} Refresh to retry.</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {platformStats.map(stat => <div key={stat.title} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-sm text-gray-600 dark:text-gray-400">{stat.title}</h2>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stat.value?.toLocaleString() ?? 'Unavailable'}</p>
        </div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemStatus status={status} loading={loading} />
        <HealthMetrics metricsData={metrics} />
      </div>
    </motion.div>
  );
};
export default Health;
