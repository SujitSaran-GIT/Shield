import { useEffect, useState, type FormEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { setUser, sessionExpired } from '../auth/authSlice';
import { setAccessToken } from '../../api/session';
import api, { errorMessage } from '../../api/axiosConfig';
import EmailChange from './components/EmailChange';
import AdminInvitations from './components/AdminInvitations';
import type { User } from '../../types';
interface Session { id: string; ipAddress: string; location: string; userAgent: string; createdAt: string; expiresAt: string }
export default function Settings() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState({ currentPassword: '', password: '', confirmPassword: '' });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionError, setSessionError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void api.get<Session[]>('/auth/sessions', { signal: controller.signal }).then(({ data }) => setSessions(data))
      .catch((failure: unknown) => { if (!controller.signal.aborted) setSessionError(errorMessage(failure)); });
    return () => controller.abort();
  }, []);
  const perform = async (key: string, operation: () => Promise<void>) => { setBusy(key); setError(''); setNotice(''); try { await operation(); } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(''); } };
  const rename = (event: FormEvent) => { event.preventDefault(); void perform('username', async () => { const { data } = await api.put<User>('/admin/profile/username', { username }); dispatch(setUser(data)); setNotice('Your username has been updated.'); }); };
  const changePassword = (event: FormEvent) => { event.preventDefault(); void perform('password', async () => { if (password.password !== password.confirmPassword) throw new Error('Passwords do not match.'); await api.post('/auth/password/change', password); setAccessToken(null); dispatch(sessionExpired()); }); };
  const revoke = () => { void perform('sessions', async () => { await api.post('/auth/sessions/revoke-all'); setAccessToken(null); dispatch(sessionExpired()); }); };
  return <div><div className="page-heading"><div><span className="eyebrow">Your account</span><h1>Account & security</h1><p>Manage your profile, credentials, and active sessions.</p></div></div>
    {error && <div className="form-error mb-5" role="alert">{error}</div>}{notice && <div className="status-note mb-5" role="status">{notice}</div>}
    <div className="settings-grid"><section className="section-card"><h2>Profile</h2><dl className="definition-list"><div><dt>Email address</dt><dd>{user?.email}</dd></div><div><dt>Account role</dt><dd>{user?.role.replaceAll('_', ' ')}</dd></div><div><dt>Status</dt><dd>{user?.status || 'Unavailable'}</dd></div></dl>
      <form className="form-stack" onSubmit={rename}><label htmlFor="profile-username">Username<input id="profile-username" value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={50} pattern="[A-Za-z0-9._-]+" /></label><button className="secondary-button" disabled={!!busy}>Save username</button></form>
    </section><section className="section-card"><h2>Change password</h2><p className="text-muted mt-2">Changing your password signs you out on every device.</p><form className="form-stack" onSubmit={changePassword}><label htmlFor="current-password">Current password<input id="current-password" type="password" autoComplete="current-password" required value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} /></label><label htmlFor="new-password">New password<input id="new-password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={password.password} onChange={(event) => setPassword({ ...password, password: event.target.value })} /></label><label htmlFor="confirm-password">Confirm new password<input id="confirm-password" type="password" autoComplete="new-password" required value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} /></label><button className="primary-button" disabled={!!busy}>Update password</button></form></section>
    <EmailChange />
    <section className="section-card"><div className="panel-heading"><h2>Active sessions</h2><button className="text-button" disabled={!!busy} onClick={revoke}>Sign out everywhere</button></div>{sessionError ? <p className="text-muted mt-4" role="alert">{sessionError}</p> : sessions.length ? <div className="table-scroll"><table className="simple-table"><thead><tr><th>Device & location</th><th>Expires</th></tr></thead><tbody>{sessions.map((session) => <tr key={session.id}><td>{session.userAgent || 'Unknown device'}<small>{session.ipAddress} · {session.location || 'Location unavailable'}</small></td><td>{new Date(session.expiresAt).toLocaleString()}</td></tr>)}</tbody></table></div> : <div className="empty-panel">No session information is available.</div>}</section>
    {(user?.role === 'SUPER_ADMIN' || user?.role === 'GUARDIAN_ADMIN') && <AdminInvitations />}
    </div>
  </div>;
}
