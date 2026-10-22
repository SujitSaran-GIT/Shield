import { useEffect, useState } from 'react';
import { Activity, ShieldCheck, Download, RefreshCw, List, ChartNoAxesCombined, Clock3, SlidersHorizontal, ChevronDown, X, ShieldAlert } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { clientApi } from '../../api';
import { Button } from '../../components';
import AuditTable from './components/AuditTable';
import AuditFilters from './components/AuditFilters';
import AuditKPIs from './components/AuditKPIs';
import AuditDetails from './components/AuditDetails';
import TimelineChart from './components/TimelineChart';
import { fetchAudits,fetchFilteredAudits,fetchAuditKPIs,fetchRecentLogs,fetchAuditDetails,exportAudits,setFilters,clearFilters,clearSelectedAudit,resetAudit,AUDIT_EVENT_TYPES,type AuditFiltersState } from './auditSlice';
import { auditError, hasAuditFilters } from './auditRequests';
import { eventTitle } from './auditPresentation';
import './audit.css';

export default function Audit(){
 const dispatch=useAppDispatch();
 const user=useAppSelector(state=>state.auth.user);
 const [showFilters,setShowFilters]=useState(false);
 const [tab,setTab]=useState('logs');
 const [timeRange,setTimeRange]=useState('7d');
 const [page,setPage]=useState(0);
 const [size,setSize]=useState(20);
 const [refresh,setRefresh]=useState(0);
 const [clients,setClients]=useState<{id:string;name:string}[]>([]);
 const [clientError,setClientError]=useState('');
 const [detailId,setDetailId]=useState<string|null>(null);
 const [detailRefresh,setDetailRefresh]=useState(0);
 const {audits,recentLogs,kpis,selectedAudit,loading,loadingKPIs,loadingDetails,loadingRecent,exporting,error,kpiError,recentError,detailError,pagination,filters}=useAppSelector(state=>state.audit);
 useEffect(()=>{
  const params={...filters,page,size};
  const request=hasAuditFilters(filters) ? dispatch(fetchFilteredAudits(params)) : dispatch(fetchAudits({page,size,sortBy:filters.sortBy,sortDir:filters.sortDir}));
  return ()=>request.abort();
 },[dispatch,filters,page,size,refresh]);
 useEffect(()=>{const request=dispatch(fetchAuditKPIs());return ()=>request.abort();},[dispatch,refresh]);
 useEffect(()=>{const request=dispatch(fetchRecentLogs(Number(timeRange.replace('d',''))));return ()=>request.abort();},[dispatch,timeRange,refresh]);
 useEffect(()=>{
  let active=true;
  clientApi.getAllClients().then(({data}:{data:{clientId:string;name:string}[]})=>{if(active)setClients(data.map(client=>({id:client.clientId,name:client.name})));})
   .catch(failure=>{if(active)setClientError(auditError(failure));});
  return ()=>{active=false;dispatch(resetAudit());};
 },[dispatch]);
 const updateFilters=(value:Partial<AuditFiltersState>)=>{setPage(0);dispatch(setFilters(value));};
 const clear=()=>{setPage(0);dispatch(clearFilters());};
 useEffect(()=>{
  if(!detailId)return;
  const request=dispatch(fetchAuditDetails(detailId));
  return ()=>{request.abort();dispatch(clearSelectedAudit());};
 },[dispatch,detailId,detailRefresh]);
 const refreshDetails=()=>setDetailRefresh(value=>value+1);
 const activeFilters: {key:'clientId'|'eventType'|'ipAddress'|'startDate'|'endDate';label:string;value:string}[]=[
  {key:'clientId',label:'Application',value:clients.find(client=>client.id===filters.clientId)?.name||filters.clientId},
  {key:'eventType',label:'Event',value:filters.eventType?eventTitle(filters.eventType):''},
  {key:'ipAddress',label:'IP',value:filters.ipAddress},
  {key:'startDate',label:'From',value:filters.startDate?.replace('T',' ')||''},
  {key:'endDate',label:'Until',value:filters.endDate?.replace('T',' ')||''},
 ].filter(item=>item.value) as {key:'clientId'|'eventType'|'ipAddress'|'startDate'|'endDate';label:string;value:string}[];
 const errorPanel=(message:string,title:string)=><div role="alert" className="audit-error-state"><ShieldAlert size={28}/><h3>{title}</h3><p>{message}</p><button className="audit-view" onClick={()=>setRefresh(value=>value+1)}>Try again<RefreshCw size={14}/></button></div>;
 return <div className="audit-workspace">
  <header className="audit-page-heading"><div><span className="audit-eyebrow"><Activity size={14}/>Security intelligence</span><h1>Activity &amp; Audit<span className="audit-title-dot">.</span></h1><p>A clear view of every security event. Investigate with confidence.</p><span className="audit-scope"><ShieldCheck size={14}/>{user?.role==='SUPER_ADMIN'||user?.role==='GUARDIAN_ADMIN'?'Platform administrator scope':user?.role==='CLIENT_ADMIN'?'Application administrator scope':'Your authorized scope'}</span></div><div className="audit-header-actions"><Button variant="outline" icon={Download} loading={exporting} disabled={!audits.length} onClick={()=>{void dispatch(exportAudits({format:'csv'}));}}>Export page</Button><Button icon={RefreshCw} loading={loading||loadingKPIs||loadingRecent} onClick={()=>setRefresh(value=>value+1)}>Refresh</Button></div></header>
  <div className="audit-summary-caption"><span>Security overview</span><span>All retained events · independent of filters</span></div><AuditKPIs kpis={kpis} loading={loadingKPIs} error={kpiError} summary/>
  <section className="audit-explorer" aria-label="Audit explorer"><div className="audit-explorer-nav"><div role="group" aria-label="Audit sections" className="audit-tabs">{[{name:'logs',label:'Logs',icon:List},{name:'analytics',label:'Analytics',icon:ChartNoAxesCombined},{name:'timeline',label:'Timeline',icon:Clock3}].map(({name,label,icon:Icon})=><button key={name} aria-pressed={tab===name} onClick={()=>setTab(name)}><Icon size={16}/>{label}</button>)}</div><span className="audit-explorer-hint">Your security ledger</span></div>
  {tab==='logs'&&<><div className="audit-log-heading"><div><h2>Event explorer</h2><p>{hasAuditFilters(filters)?'Filtered events. Omitted dates default to the last 30 days.':'All retained events in your authorized scope.'}</p></div><button className={`audit-filter-toggle ${showFilters?'active':''}`} aria-expanded={showFilters} aria-controls="audit-filter-panel" onClick={()=>setShowFilters(value=>!value)}><SlidersHorizontal size={16}/>Filters{activeFilters.length>0&&<span>{activeFilters.length}</span>}<ChevronDown size={14} className={showFilters?'audit-chevron-open':''}/></button></div>
  {showFilters&&<div id="audit-filter-panel"><AuditFilters key={JSON.stringify(filters)} filters={filters} onChange={updateFilters} onClose={()=>setShowFilters(false)} clients={clients} eventTypeOptions={Object.values(AUDIT_EVENT_TYPES)} isLoading={loading}/>{clientError&&<p role="alert" className="audit-inline-error">Application choices unavailable. {clientError}</p>}</div>}
  {activeFilters.length>0&&<div className="audit-active-filters"><span>Applied</span>{activeFilters.map(({key,label,value})=><button key={key} aria-label={`Remove ${label} filter`} onClick={()=>updateFilters({[key]:key==='startDate'||key==='endDate'?null:''})}><span>{label}: <strong>{value}</strong></span><X size={13}/></button>)}<button className="audit-clear" onClick={clear}>Clear filters</button></div>}
  {error?errorPanel(error,'Unable to load events'):<AuditTable audits={audits} pagination={pagination} loading={loading} sortBy={filters.sortBy} sortDir={filters.sortDir} onPageChange={(next,nextSize)=>{setPage(next);if(nextSize)setSize(nextSize);}} onSortChange={(sortBy,sortDir)=>updateFilters({sortBy,sortDir:sortDir.toUpperCase()})} onRowClick={audit=>setDetailId(audit.id)} onExport={id=>{void dispatch(exportAudits({ids:[id],format:'json'}));}} selectedAuditId={detailId}/>}</>}
  {tab==='analytics'&&(kpiError?errorPanel(kpiError,'Metrics unavailable'):<AuditKPIs kpis={kpis} loading={loadingKPIs}/>)}
  {tab==='timeline'&&(recentError?errorPanel(recentError,'Timeline unavailable'):<TimelineChart data={recentLogs} timeRange={timeRange} onTimeRangeChange={setTimeRange} loading={loadingRecent}/>)}
  </section><p className="audit-page-note"><ShieldCheck size={14}/>Only events within your authorized scope are shown.</p>
  <AuditDetails audit={selectedAudit} isOpen={!!detailId} onClose={()=>{setDetailId(null);dispatch(clearSelectedAudit());}} loading={loadingDetails} error={detailError} onRefresh={refreshDetails}/>
 </div>;
}
