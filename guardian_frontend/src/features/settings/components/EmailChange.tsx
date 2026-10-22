import { useState, type FormEvent } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import api, { errorMessage } from '../../../api/axiosConfig';
import { setAccessToken } from '../../../api/session';
import { sessionExpired } from '../../auth/authSlice';

export default function EmailChange() {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (challengeId) {
        await api.post('/auth/email/change', { email, currentPassword: password, challengeId, otp });
        setAccessToken(null); dispatch(sessionExpired());
      } else {
        const { data } = await api.post<{ challengeId: string }>('/auth/email/change/request', { email, currentPassword: password });
        setChallengeId(data.challengeId);
      }
    } catch (failure: unknown) { setError(errorMessage(failure)); } finally { setBusy(false); }
  };
  return <section className="section-card"><h2>Change email address</h2><p className="text-muted mt-2">Verify your new email address with a one-time code. Completing this change signs you out on every device.</p>
    {error && <p className="form-error mt-4" role="alert">{error}</p>}
    <form className="form-stack" onSubmit={(event) => { void submit(event); }}><label htmlFor="new-email">New email address<input id="new-email" type="email" autoComplete="email" required value={email} disabled={!!challengeId} onChange={(event) => setEmail(event.target.value)} /></label><label htmlFor="email-current-password">Current password<input id="email-current-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {challengeId && <><p className="status-note" role="status">Enter the code sent to {email}.</p><label htmlFor="email-code">Verification code<input id="email-code" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value)} /></label></>}
      <div className="flex flex-wrap gap-3"><button className="primary-button" disabled={busy}>{busy ? 'Working…' : challengeId ? 'Verify and change email' : 'Send verification code'}</button>{challengeId && <button type="button" className="secondary-button" disabled={busy} onClick={() => { setChallengeId(''); setOtp(''); setError(''); }}>Start again</button>}</div>
    </form></section>;
}
