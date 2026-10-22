import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchUserDetails, fetchUserSessions, blockUser, unblockUser, type UserSession } from '../usersSlice';
import type { User } from '../../../types';
import api, { errorMessage } from '../../../api/axiosConfig';
import { Modal, Button } from '../../../components';
import { formatDate, copyToClipboard } from '../../../utils/helpers';
import { exportCsv } from '../../../utils/export';

interface UserEvent { id: string; eventType: string; createdAt: string; details?: string; ipAddress?: string; location?: string }
export default function UserDetailsModal({user,onClose}: {user: User;onClose:()=>void}) {
  const dispatch=useAppDispatch();
  const canManage=useAppSelector(state=>state.auth.user?.role==='CLIENT_ADMIN') && user.role==='USER';
  const [tab,setTab]=useState('overview');
  const [details,setDetails]=useState(user);
  const [sessions,setSessions]=useState<UserSession[]>([]);
  const [events,setEvents]=useState<UserEvent[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let cancelled=false;
    const request=new AbortController();
    Promise.all([
      dispatch(fetchUserDetails(user.id)).unwrap(),
      dispatch(fetchUserSessions(user.id)).unwrap(),
      api.get<{content:UserEvent[]}>(`/users/${user.id}/activity`,{signal:request.signal}).then(response=>response.data.content),
    ]).then(([profile,history,activity])=>{if(!cancelled){setDetails(profile);setSessions(history);setEvents(activity);}})
      .catch(failure=>{if(!cancelled)setError(errorMessage(failure));})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;request.abort();};
  },[dispatch,user.id]);
  const toggleStatus=async()=>{
    setBusy(true);setError('');
    try {
      if(details.status==='ACTIVE') await dispatch(blockUser(user.id)).unwrap();
      else await dispatch(unblockUser(user.id)).unwrap();
      setDetails(await dispatch(fetchUserDetails(user.id)).unwrap());
      setSessions(await dispatch(fetchUserSessions(user.id)).unwrap());
    } catch(failure){setError(errorMessage(failure));} finally{setBusy(false);}
  };
  return <Modal isOpen onClose={onClose} title="User details" size="lg">
    <div className="space-y-5">
      <div><h2 className="text-xl font-semibold break-words">{details.username}</h2><p className="text-sm break-all">{details.email}</p><p className="text-sm">{details.role.replaceAll('_',' ')} · {details.status}</p></div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="User detail sections">{['overview','sessions','activity','security'].map(name=><button key={name} className="text-button" aria-pressed={tab===name} onClick={()=>setTab(name)}>{name[0].toUpperCase()+name.slice(1)}</button>)}</div>
      {error && <p role="alert" className="auth-error">{error}</p>}
      {message && <p role="status">{message}</p>}
      {loading ? <p role="status">Loading user records…</p> : <>
        {tab==='overview' && <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><dt>Application</dt><dd>{details.clientName || 'Unavailable'}</dd></div>
          <div><dt>Created</dt><dd>{formatDate(details.createdAt)}</dd></div>
          <div><dt>Last sign-in</dt><dd>{formatDate(details.lastLoginAt)}</dd></div>
          <div><dt>Last IP address</dt><dd>{details.lastLoginIp || 'Unavailable'}</dd></div>
          <div><dt>Approximate location</dt><dd>{details.lastLoginLocation || 'Unknown'}</dd></div>
          <div><dt>Active sessions</dt><dd>{sessions.filter(session=>session.active && new Date(session.expiresAt)>new Date()).length}</dd></div>
        </dl>}
        {tab==='sessions' && <div className="overflow-x-auto"><p className="text-sm mb-3">IP-derived locations are approximate.</p><table className="min-w-full text-sm"><thead><tr>{['Device','IP address','Location','Started','Status'].map(label=><th key={label} className="p-2 text-left">{label}</th>)}</tr></thead><tbody>{sessions.map(session=><tr key={session.id}><td className="p-2 break-words">{session.userAgent || 'Unknown'}</td><td className="p-2">{session.ipAddress || 'Unavailable'}</td><td className="p-2">{session.location || 'Unknown'}</td><td className="p-2">{formatDate(session.createdAt)}</td><td className="p-2">{session.active && new Date(session.expiresAt)>new Date()?'Active':'Ended'}</td></tr>)}</tbody></table>{sessions.length===0 && <p>No sessions recorded.</p>}</div>}
        {tab==='activity' && <div><p className="text-sm mb-3">Most recent 20 retained security events.</p>{events.length ? <ul className="space-y-3">{events.map(event=><li key={event.id} className="border-b pb-2"><strong>{event.eventType.replaceAll('_',' ')}</strong><p className="text-sm">{formatDate(event.createdAt)} · {event.ipAddress || 'IP unavailable'}</p><p className="text-sm">{event.details}</p></li>)}</ul>:<p>No retained activity is available.</p>}</div>}
        {tab==='security' && <div className="space-y-3 text-sm"><p>Blocking or deleting a user revokes their existing sessions. Reactivation requires a fresh sign-in.</p><p>Users change passwords using their current password or the email verification recovery flow. Password history and multi-factor enrollment data are unavailable.</p>{canManage && details.status!=='DELETED' && <Button onClick={()=>{void toggleStatus();}} loading={busy} variant="danger">{details.status==='ACTIVE'?'Block user':'Unblock user'}</Button>}</div>}
      </>}
      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button variant="outline" onClick={()=>{void copyToClipboard(details.id).then(ok=>setMessage(ok?'User ID copied.':'Clipboard unavailable.'));}}>Copy ID</Button>
        <Button variant="outline" onClick={()=>exportCsv('shield-user-sessions.csv',sessions.map(session=>({...session})))}>Export sessions</Button>
      </div>
    </div>
  </Modal>;
}
