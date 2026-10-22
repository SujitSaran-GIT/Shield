import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAppSelector } from '../../app/hooks';
import api, { errorMessage } from '../../api/axiosConfig';
import type { DashboardMetrics, DailyActivity } from '../../types';
interface Distribution { clientName: string; clientId: string; userCount: number }
export default function Dashboard() {
  const user = useAppSelector((state) => state.auth.user);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [distribution, setDistribution] = useState<Distribution[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [days, setDays] = useState(7);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const config = { signal: controller.signal };
    void Promise.all([
      api.get<DashboardMetrics>('/dashboard/metrics', config),
      api.get<{ dailyActivities: DailyActivity[] }>('/dashboard/activity', { ...config, params: { days } }),
      api.get<{ distribution: Distribution[] }>('/dashboard/clients/distribution', config),
    ]).then(([overview, trend, clients]) => {
      setMetrics(overview.data); setActivity(trend.data.dailyActivities); setDistribution(clients.data.distribution); setUpdated(new Date()); setError('');
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setError(errorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [refresh, days, user?.id]);
  useEffect(() => { if (!autoRefresh) return; const timer = window.setInterval(() => setRefresh((current) => current + 1), 30000); return () => clearInterval(timer); }, [autoRefresh]);
  const totalMembers = distribution.reduce((sum, client) => sum + client.userCount, 0);
  return <div>
    <div className="page-heading"><div><span className="eyebrow">{user?.role === 'SUPER_ADMIN' ? 'Platform overview' : 'Workspace overview'}</span><h1>A clear view of your identities.</h1><p>Welcome back, {user?.username || 'administrator'}. Here’s your authentication activity.</p></div><button className="secondary-button" disabled={busy} onClick={() => { setBusy(true); setRefresh((current) => current + 1); }}><RefreshCw size={15} className={busy ? 'animate-spin' : ''} />Refresh</button></div>
    {error && <div className="form-error" role="alert">{error} {metrics && 'The last successful snapshot is shown.'}</div>}
    <div className="stat-strip">{[
      { label: 'Registered users', value: metrics?.totalUsers, note: 'Across authorized applications' },
      { label: 'Active applications', value: metrics?.activeClients, note: `${metrics?.totalClients ?? '—'} applications in total` },
      { label: 'Active users', value: metrics?.activeUsers, note: 'Accounts enabled for access' },
      { label: 'Authentication events', value: metrics?.totalEvents, note: 'Recorded by the audit service' },
    ].map((stat) => <div className="stat-item" key={stat.label}><span>{stat.label}</span><strong>{stat.value === undefined ? busy ? '…' : '—' : stat.value.toLocaleString()}</strong><small>{stat.note}</small></div>)}</div>
    <div className="dashboard-grid"><section className="section-card"><div className="chart-heading"><div><h2>Authentication activity</h2><p className="text-muted">Recorded successful and failed sign-ins</p></div><select aria-label="Activity period" value={days} onChange={(event) => { setBusy(true); setDays(Number(event.target.value)); }} className="secondary-button"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option></select></div>
      {activity.length ? <div className="activity-chart" role="img" aria-label={`Successful and failed sign-ins over the past ${days} days`}><ResponsiveContainer width="100%" height={240}><AreaChart data={activity}><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#dfe6e9" /><XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} axisLine={false} tickLine={false} fontSize={10} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} fontSize={10} width={35} /><Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} /><Area dataKey="successfulEvents" name="Successful sign-ins" stroke="#003049" fill="#669bbc" fillOpacity={.18} strokeWidth={2} isAnimationActive={false} /><Area dataKey="failedEvents" name="Failed sign-ins" stroke="#c1121f" fill="#c1121f" fillOpacity={.04} strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div> : <div className="empty-panel">{busy ? 'Loading recorded activity…' : 'No activity data is available.'}</div>}
    </section><section className="section-card"><div className="chart-heading"><div><h2>Your applications</h2><p className="text-muted">User distribution</p></div><Link to="/clients" aria-label="View applications"><ArrowUpRight size={18} /></Link></div>{distribution.length ? <div className="space-y-5">{distribution.slice(0, 6).map((client) => <div key={client.clientId}><div className="flex justify-between text-xs mb-2"><span>{client.clientName}</span><strong>{client.userCount.toLocaleString()}</strong></div><div className="h-1.5 bg-gray-100 rounded"><div className="h-full rounded" style={{ width: `${totalMembers ? client.userCount / totalMembers * 100 : 0}%`, background: '#669bbc' }} /></div></div>)}</div> : <div className="empty-panel"><ShieldCheck size={26} className="mx-auto" /><span>{busy ? 'Loading applications…' : 'Your applications will appear here.'}</span><Link className="text-button" to="/clients">Go to applications</Link></div>}</section></div>
    <section className="section-card" style={{ marginTop: 22 }}><div className="panel-heading"><div><h2>Access with accountability</h2><p className="text-muted">{user?.role === 'SUPER_ADMIN' ? 'Review platform security events and user records. Tenant administrators manage their own users.' : 'Manage your applications and users. Every permitted lifecycle change is recorded.'}</p></div><Link to="/audit" className="secondary-button">Review audit activity<ArrowUpRight size={16} /></Link></div><div className="flex flex-wrap justify-between gap-3 mt-5 text-xs text-gray-500"><span>{updated ? `REST snapshot · ${updated.toLocaleTimeString()}` : 'Awaiting the first successful snapshot'}</span><label className="flex items-center gap-2"><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />Refresh every 30 seconds</label></div></section>
  </div>;
}
