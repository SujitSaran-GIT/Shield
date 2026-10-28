import { useCallback, useEffect, useState, type FormEvent } from 'react';
import api, { errorMessage } from '../../../api/axiosConfig';

interface Invitation {
  id: string; email: string; invitedBy: string; emailVerified: boolean; confirmed: boolean;
  expiresAt: string; acceptedAt: string | null; revokedAt: string | null;
}
interface InvitationPage { content: Invitation[]; number: number; totalPages: number; totalElements: number }
function status(invitation: Invitation) {
  if (invitation.revokedAt) return 'Revoked';
  if (invitation.acceptedAt) return 'Accepted';
  if (new Date(invitation.expiresAt).getTime() <= new Date().getTime()) return 'Expired';
  if (invitation.confirmed) return 'Ready to accept';
  return invitation.emailVerified ? 'Awaiting your confirmation' : 'Awaiting email verification';
}
export default function AdminInvitations() {
  const [email, setEmail] = useState('');
  const [page, setPage] = useState(0);
  const [invitations, setInvitations] = useState<InvitationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((current) => current + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    void api.get<InvitationPage>('/admin/invitations', { params: { page, size: 10 }, signal: controller.signal })
      .then(({ data }) => { setInvitations(data); setError(''); })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setError(errorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, revision]);
  const perform = async (key: string, operation: () => Promise<void>) => {
    setBusy(key); setError(''); setNotice('');
    try { await operation(); refresh(); } catch (failure: unknown) { setError(errorMessage(failure)); } finally { setBusy(''); }
  };
  const invite = (event: FormEvent) => {
    event.preventDefault();
    void perform('invite', async () => {
      await api.post('/admin/invitations', { email }); setEmail(''); setPage(0);
      setNotice('Invitation sent. Confirm after the recipient verifies their email.');
    });
  };
  return <section className="section-card">
    <div className="panel-heading"><h2>Platform administrator invitations</h2><button className="text-button" onClick={() => { setLoading(true); refresh(); }} disabled={loading || !!busy}>Refresh</button></div>
    <p className="text-muted mt-2">Recipients verify their email and create their own credentials. Confirm a verified invitation to allow enrollment.</p>
    <form className="form-stack" onSubmit={invite}><label htmlFor="invite-email">Administrator email<input id="invite-email" type="email" autoComplete="off" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="primary-button" disabled={!!busy}>Send invitation</button></form>
    {error && <p className="form-error mt-4" role="alert">{error}</p>}{notice && <p className="status-note mt-4" role="status">{notice}</p>}
    {loading ? <p role="status" className="text-muted mt-4">Loading invitations…</p> : invitations?.content.length ? <div className="table-scroll mt-4"><table className="simple-table"><thead><tr><th>Recipient</th><th>Status</th><th>Expires</th><th>Actions</th></tr></thead><tbody>{invitations.content.map((invitation) => {
      const closed = !!invitation.revokedAt || !!invitation.acceptedAt || new Date(invitation.expiresAt).getTime() <= new Date().getTime();
      return <tr key={invitation.id}><td>{invitation.invitedBy}<small>Invited by {invitation.email}</small></td><td>{status(invitation)}</td><td>{new Date(invitation.expiresAt).toLocaleString()}</td><td><div className="flex flex-wrap gap-2">{!closed && !invitation.confirmed && <button className="secondary-button" disabled={!!busy || !invitation.emailVerified} title={invitation.emailVerified ? 'Confirm verified invitation' : 'Recipient must verify their email first'} onClick={() => { void perform(invitation.id, async () => { await api.put(`/admin/invitations/${encodeURIComponent(invitation.id)}/confirm`); setNotice(`Invitation for ${invitation.email} confirmed.`); }); }}>Confirm</button>}{!closed && <button className="text-button" disabled={!!busy} onClick={() => { if (window.confirm(`Revoke the invitation for ${invitation.email}?`)) void perform(invitation.id, async () => { await api.delete(`/admin/invitations/${encodeURIComponent(invitation.id)}`); setNotice(`Invitation for ${invitation.email} revoked.`); }); }}>Revoke</button>}</div></td></tr>;
    })}</tbody></table></div> : !error && <div className="empty-panel">No administrator invitations.</div>}
    {invitations && invitations.totalPages > 1 && <div className="flex items-center justify-between gap-3 mt-4"><button className="secondary-button" disabled={loading || page === 0} onClick={() => { setLoading(true); setPage((current) => current - 1); }}>Previous</button><span>Page {page + 1} of {invitations.totalPages}</span><button className="secondary-button" disabled={loading || page >= invitations.totalPages - 1} onClick={() => { setLoading(true); setPage((current) => current + 1); }}>Next</button></div>}
  </section>;
}
