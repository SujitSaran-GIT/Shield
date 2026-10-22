import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal, Button } from '../../../components';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { adminApi } from '../../../api/adminApi';
import type { User } from '../../../types';
import { adminError, adminRoles, administratorAction, canManageAdministrator, roleUnavailable } from '../adminManagement';
import { administratorRefreshed } from '../usersSlice';
import { showSuccess } from '../../notification/notificationSlice';

export default function AdministratorModal({ user, onClose, onChanged }: { user: User; onClose: () => void; onChanged: () => void }) {
  const actor = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();
  const [record, setRecord] = useState(user);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [changed, setChanged] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    const request = new AbortController();
    void adminApi.get(user.id, request.signal).then(({ data }) => { setRecord(data); setLoading(false); })
      .catch(failure => { if (!request.signal.aborted) { setError(adminError(failure)); setLoading(false); } });
    return () => request.abort();
  }, [user.id]);
  const action = administratorAction(actor, record);
  const label = action === 'deactivate' ? 'Deactivate' : 'Activate';
  const submit = async () => {
    if (!action || !confirmed || pending.current || loading || error || changed) return;
    pending.current = true; setBusy(true); setError('');
    let applied = false;
    try {
      await adminApi[action](record.id);
      applied = true; setChanged(true);
      const { data } = await adminApi.get(record.id);
      setRecord(data); dispatch(administratorRefreshed(data));
      dispatch(showSuccess(`Administrator ${action === 'activate' ? 'activated' : 'deactivated'}.`));
      onChanged(); onClose();
    } catch (failure) {
      setError(applied ? 'The status change was saved, but the updated record could not be loaded. Close this dialog and refresh the directory before taking further action.' : adminError(failure));
      if (applied) onChanged();
    } finally { pending.current = false; setBusy(false); }
  };
  if (!canManageAdministrator(actor, record)) return null;
  return <Modal title="Manage administrator" onClose={onClose} preventClose={busy}>
    <div className="space-y-5" aria-busy={loading || busy}>
      <div className="break-words"><h3 className="font-semibold">{record.username}</h3><p className="break-all">{record.email}</p><p>Status: {record.status}</p></div>
      {loading && <p role="status">Loading administrator…</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <label className="form-stack">Administrator role<select value={record.role} disabled aria-describedby="role-unavailable">{adminRoles.map(role => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</select></label>
      <p id="role-unavailable" className="text-sm text-muted">{roleUnavailable} {!busy && <Link className="text-button" to="/settings" onClick={onClose}>Manage invitations</Link>}</p>
      {actor?.id === record.id && <p>You cannot change your own administrator status.</p>}
      {!loading && !error && action && <>
        <p>{action === 'deactivate' ? 'Deactivation suspends this account and revokes its existing sessions.' : 'Activation restores account access. The administrator must sign in again.'} Confirm {label.toLowerCase()} for {record.email}?</p>
        <label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />I confirm this administrator status change.</label>
      </>}
      <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>{action && <Button variant={action === 'deactivate' ? 'danger' : 'primary'} onClick={() => { void submit(); }} loading={busy} disabled={loading || !!error || !confirmed || changed}>{label} administrator</Button>}</div>
    </div>
  </Modal>;
}
