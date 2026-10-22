import type { AuditFiltersState } from '../auditSlice';
import { Button } from '../../../components';
import { useState } from 'react';
import { SlidersHorizontal, Info } from 'lucide-react';
import { auditDateError } from '../auditRequests';
import { eventTitle } from '../auditPresentation';
interface Props {filters:AuditFiltersState;onChange:(value:Partial<AuditFiltersState>)=>void;onClose:()=>void;clients:{id:string;name:string}[];eventTypeOptions:string[];isLoading?:boolean}
export default function AuditFilters({filters,onChange,onClose,clients,eventTypeOptions,isLoading}:Props){
 const [draft,setDraft]=useState(filters);
 const [error,setError]=useState('');
 const update=(value:Partial<AuditFiltersState>)=>{setDraft(current=>({...current,...value}));setError('');};
 return <form className="audit-filters" aria-label="Audit filters" onSubmit={event=>{event.preventDefault();const failure=auditDateError(draft);setError(failure);if(!failure)onChange(draft);}}><div className="audit-filter-heading"><SlidersHorizontal size={16}/><h3>Narrow your investigation</h3></div><div className="audit-filter-grid">
  <label>Application<select value={draft.clientId} onChange={event=>update({clientId:event.target.value})}><option value="">All authorized applications</option>{clients.map(client=><option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
  <label>Event type<select value={draft.eventType} onChange={event=>update({eventType:event.target.value})}><option value="">All event types</option>{eventTypeOptions.map(value=><option key={value} value={value}>{eventTitle(value)}</option>)}</select></label>
  <label>IP address<input placeholder="e.g. 198.51.100.9" value={draft.ipAddress} onChange={event=>update({ipAddress:event.target.value})}/></label>
  <label>From<input type="datetime-local" value={draft.startDate||''} onChange={event=>update({startDate:event.target.value||null})}/></label>
  <label>Until<input type="datetime-local" value={draft.endDate||''} onChange={event=>update({endDate:event.target.value||null})}/></label>
 </div><p className="audit-filter-note"><Info size={15}/><span>Dates use the platform server time zone. Applied filters without dates cover the last 30 days. Clear filters to view all retained events.</span></p>{error&&<p role="alert" className="audit-inline-error">{error}</p>}<div className="audit-filter-actions"><Button type="submit" loading={isLoading}>Apply filters</Button><Button variant="outline" onClick={onClose}>Close filters</Button></div></form>;
}
