import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import api, { errorMessage } from '../../api/axiosConfig';

type Mode = 'enrollment' | 'bootstrap' | 'invitation' | 'reset';
const titles: Record<Mode, string> = { enrollment: 'Create your workspace account', bootstrap: 'Set up your Shield platform', invitation: 'Accept your administrator invitation', reset: 'Reset your password' };
export default function AccountFlow({ mode }: { mode: Mode }) {
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [enrollmentToken, setEnrollmentToken] = useState('');
  const [form, setForm] = useState({ email: '', username: '', password: '', confirmPassword: '', code: '', secret: '', invitationId: params.get('id') || '' });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setBusy(true);
    const headers = mode === 'bootstrap' ? { 'X-Bootstrap-Secret': form.secret } : {};
    try {
      if (step === 0) {
        if (mode === 'invitation') {
          const { data } = await api.post(`/admin/invitations/${encodeURIComponent(form.invitationId)}/verify`, { code: form.code });
          setEnrollmentToken(data.enrollmentToken);
        } else {
          const path = mode === 'reset' ? '/auth/password/reset/request' : `/admin/${mode}/request`;
          const { data } = await api.post(path, { email: form.email.trim() }, { headers });
          setChallengeId(data.challengeId);
        }
        setStep(1);
      } else {
        if (form.password !== form.confirmPassword) throw new Error('Passwords do not match.');
        const body = { email: form.email.trim(), username: form.username.trim(), password: form.password, confirmPassword: form.confirmPassword, challengeId, code: form.code, otp: form.code, enrollmentToken };
        const path = mode === 'reset' ? '/auth/password/reset' : mode === 'invitation' ? `/admin/invitations/${encodeURIComponent(form.invitationId)}/accept` : `/admin/${mode}/complete`;
        await api.post(path, body, { headers });
        setForm({ email: '', username: '', password: '', confirmPassword: '', code: '', secret: '', invitationId: '' });
        setEnrollmentToken(''); setStep(2);
      }
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  };
  return <main className="account-flow"><div className="flow-card"><Link to="/login" className="shield-brand"><span className="brand-mark"><ShieldCheck /></span><span>Shield</span></Link>
    <span className="eyebrow">{mode === 'bootstrap' ? 'Operator setup' : 'Secure account access'}</span><h1>{titles[mode]}</h1>
    {step === 2 ? <div className="flow-success" role="status"><CheckCircle2 size={30} /><h2>{mode === 'reset' ? 'Password updated' : 'Your account is ready'}</h2><p>You can now sign in with your email and password.</p><Link className="primary-button" to="/login">Continue to sign in <ArrowRight size={18} /></Link></div> : <>
      <p className="text-muted">{step === 1 ? mode === 'invitation' ? 'Choose your credentials. Your inviter must confirm the invitation before activation.' : 'Enter the code sent to your email and choose your password.' : mode === 'enrollment' ? 'Verify your email to start. Workspace enrollment follows your platform’s registration policy.' : mode === 'bootstrap' ? 'Use the one-time secret supplied by your deployment operator. Setup closes after the first administrator is created.' : mode === 'invitation' ? 'Use your invitation ID and the verification code sent to your email.' : 'We’ll send verification instructions if the account is eligible.'}</p>
      {error && <div className="form-error" role="alert">{error}</div>}
      <form onSubmit={submit} className="form-stack">
        {step === 0 && mode !== 'invitation' && <label htmlFor="flow-email">Email address<input id="flow-email" autoComplete="email" type="email" required value={form.email} onChange={(event) => update('email', event.target.value)} /></label>}
        {step === 0 && mode === 'bootstrap' && <label htmlFor="flow-secret">Bootstrap secret<input id="flow-secret" type="password" autoComplete="off" required value={form.secret} onChange={(event) => update('secret', event.target.value)} /></label>}
        {step === 0 && mode === 'invitation' && <label htmlFor="flow-invitation">Invitation ID<input id="flow-invitation" required value={form.invitationId} onChange={(event) => update('invitationId', event.target.value)} /></label>}
        {((step === 1 && mode !== 'invitation') || (step === 0 && mode === 'invitation')) && <label htmlFor="flow-code">Email verification code<input id="flow-code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={form.code} onChange={(event) => update('code', event.target.value)} /><small>Codes expire. Request a new code if this one is no longer valid.</small></label>}
        {step === 1 && <>
          {mode !== 'reset' && <label htmlFor="flow-username">Username<input id="flow-username" autoComplete="username" minLength={3} maxLength={64} pattern="[A-Za-z0-9._-]+" required={mode !== 'bootstrap'} value={form.username} onChange={(event) => update('username', event.target.value)} /></label>}
          <label htmlFor="flow-password">Password<input id="flow-password" autoComplete="new-password" type="password" required minLength={12} maxLength={128} value={form.password} onChange={(event) => update('password', event.target.value)} /><small>Use at least 12 characters with a mix of character types.</small></label>
          <label htmlFor="flow-confirm">Confirm password<input id="flow-confirm" autoComplete="new-password" type="password" required minLength={12} maxLength={128} value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} /></label>
        </>}
        <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : step === 0 ? mode === 'invitation' ? 'Verify invitation' : 'Send verification code' : mode === 'reset' ? 'Update password' : 'Create account'}<ArrowRight size={18} /></button>
        {step === 1 && mode !== 'invitation' && <button type="button" className="text-button" onClick={() => { setStep(0); setError(''); }}>Request a new verification code</button>}
      </form></>}
    <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
  </div></main>;
}
