import { useMemo, useState } from 'react';
import { Download, LoaderCircle, CalendarRange } from 'lucide-react';
import { ResponsiveContainer, LineChart,Line,BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,Legend } from 'recharts';
import type { AuditRecord } from '../auditSlice';
import { exportCsv } from '../../../utils/export';
interface Bucket {date:string;events:number;success:number;failures:number;users:number}
export default function TimelineChart({data,timeRange,onTimeRangeChange,loading}:{data:AuditRecord[];timeRange:string;onTimeRangeChange:(value:string)=>void;loading?:boolean}){
 const [chart,setChart]=useState('line');
 const [metric,setMetric]=useState('events');
 const points=useMemo(()=>{
  const buckets=new Map<string,{bucket:Bucket;users:Set<string>}>();
  for(const event of data){
   const day=event.createdAt.slice(0,10);
   if(!buckets.has(day))buckets.set(day,{bucket:{date:day,events:0,success:0,failures:0,users:0},users:new Set()});
   const entry=buckets.get(day)!;entry.bucket.events++;
   if(event.statusCode!==null&&event.statusCode>=200&&event.statusCode<300)entry.bucket.success++;
   if(event.statusCode!==null&&event.statusCode>=400)entry.bucket.failures++;
   if(event.userId)entry.users.add(event.userId);
   entry.bucket.users=entry.users.size;
  }
  return [...buckets.values()].map(entry=>entry.bucket).sort((a,b)=>a.date.localeCompare(b.date));
 },[data]);
 const names:Record<string,string>={events:'Events',success:'Successful events',failures:'Failed events',users:'Unique identified users'};
 return <section className="audit-timeline" aria-busy={loading}><div className="audit-section-heading"><span className="audit-eyebrow">Patterns over time</span><h2>Activity timeline</h2><p>Explore recent activity in your authorized scope. This period is independent of log filters.</p></div><div className="audit-timeline-controls">
  <label>Period<select value={timeRange} onChange={event=>onTimeRangeChange(event.target.value)}>{[1,7,30,90].map(days=><option key={days} value={`${days}d`}>Last {days} day{days>1?'s':''}</option>)}</select></label>
  <label>Metric<select value={metric} onChange={event=>setMetric(event.target.value)}>{Object.entries(names).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
  <label>Chart<select value={chart} onChange={event=>setChart(event.target.value)}><option value="line">Line</option><option value="bar">Bar</option></select></label>
  <button className="audit-view" disabled={!points.length||loading} onClick={()=>exportCsv('shield-audit-timeline.csv',points.map(point=>({...point})))}><Download size={15}/>Export timeline</button>
 </div><p className="audit-timeline-note">Daily aggregation of the most recent {data.length} records returned for this period (maximum 500). Missing days have no records in this sample; this is not a complete request-volume series.</p>
 {loading?<div role="status" className="audit-state"><LoaderCircle size={28} className="audit-spin"/><h3>Loading timeline…</h3></div>:points.length?<div style={{height:300,minWidth:0}} aria-label="Daily audit event chart"><ResponsiveContainer width="100%" height="100%">{chart==='line'?<LineChart data={points} margin={{top:15,right:12,left:-20,bottom:10}}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="date" tick={{fill:'var(--muted)'}} axisLine={false} tickLine={false} tickMargin={12}/><YAxis allowDecimals={false} tick={{fill:'var(--muted)'}} axisLine={false} tickLine={false}/><Tooltip/><Legend/><Line name={names[metric]} type="monotone" dataKey={metric} stroke="#669bbc" dot={{r:4,fill:'#669bbc',strokeWidth:2}} strokeWidth={2.5} isAnimationActive={false}/></LineChart>:<BarChart data={points} margin={{top:15,right:12,left:-20,bottom:10}}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="date" tick={{fill:'var(--muted)'}} axisLine={false} tickLine={false} tickMargin={12}/><YAxis allowDecimals={false} tick={{fill:'var(--muted)'}} axisLine={false} tickLine={false}/><Tooltip/><Legend/><Bar name={names[metric]} dataKey={metric} fill="#669bbc" maxBarSize={48} radius={[3,3,0,0]} isAnimationActive={false}/></BarChart>}</ResponsiveContainer></div>:<div className="audit-state"><CalendarRange size={30}/><h3>No activity for this period</h3><p>No retained events are available. Try selecting a longer period.</p></div>}
 </section>;
}
