import { Activity, CheckCheck, ShieldAlert, CircleCheck } from 'lucide-react';
import type { AuditKPIsData } from '../auditSlice';
export default function AuditKPIs({kpis,loading,summary=false,error}:{kpis:AuditKPIsData|null;loading?:boolean;summary?:boolean;error?:string|null}){
 const stats=[{title:'Total events',value:kpis?.totalEvents.toLocaleString(),icon:Activity,tone:'neutral',note:'Retained audit records'},{title:'Successful events',value:kpis?.successfulEvents.toLocaleString(),icon:CheckCheck,tone:'success',note:'HTTP 2xx responses'},{title:'Failed events',value:kpis?.failedEvents.toLocaleString(),icon:ShieldAlert,tone:'failure',note:'HTTP 4xx / 5xx responses'},{title:'Success rate',value:kpis?`${kpis.successRate}%`:undefined,icon:CircleCheck,tone:'neutral',note:'Across all retained events'}];
 return <section className={summary?'audit-summary':'audit-analytics'} aria-label="Audit metrics" aria-busy={loading}>
  {!summary&&<div className="audit-section-heading"><div><span className="audit-eyebrow">The bigger picture</span><h2>Security at a glance</h2><p>All retained audit records in your authorized scope, independent of log filters.</p></div></div>}
  <dl className="audit-metrics">{stats.map(({title,value,icon:Icon,tone,note})=><div className={`audit-metric ${tone}`} key={title}><dt><Icon size={16}/>{title}</dt><dd>{loading?<span className="audit-skeleton"/>:value??'—'}</dd><small>{loading?'Loading metrics…':!kpis?'Metrics unavailable':note}</small></div>)}</dl>
  {error&&<p className="audit-metric-error">Metrics unavailable. Use Refresh to try again.</p>}
  {!summary&&kpis&&<div className="audit-outcome"><div><h3>Response outcomes</h3><p>Success means HTTP 2xx; failure means HTTP 4xx or 5xx. Other response codes may be included in the total.</p></div><div className="audit-outcome-rates"><span><i className="audit-dot success"/>Success <strong>{kpis.successRate}%</strong></span><span><i className="audit-dot failure"/>Failure <strong>{kpis.failureRate}%</strong></span></div><div className="audit-rate-bar" aria-label={`Success rate ${kpis.successRate} percent; failure rate ${kpis.failureRate} percent`}><span style={{width:`${Math.max(0,Math.min(100,kpis.successRate))}%`}}/><span style={{width:`${Math.max(0,Math.min(100,kpis.failureRate))}%`}}/></div><p className="audit-caption">Historical comparison is unavailable.</p></div>}
 </section>;
}

